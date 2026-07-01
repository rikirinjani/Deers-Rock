import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { MedicationOrder } from "../patient/schema.js";
import { dispenseItem, getStock } from "./central-supply.js";
import { generateCharge } from "./charge-generator.js";
import { checkDrugAllergy, checkDiagnosisContraindication, checkDrugInteraction, getDoseRange } from "./pharmacy-knowledge.js";
import { getDeteriorationRate } from "./agent-learning.js";

const MED_TO_SUPPLY: Record<string, string> = {
  "ACE": "MED-ACE", "MET": "MED-MET", "ATR": "MED-ATR", "OMP": "MED-OMP",
  "LVF": "MED-LVF", "PRC": "MED-PRC", "HEP": "MED-HEP", "SAL": "MED-SAL",
  "FUR": "MED-FUR", "DIA": "MED-DIA",
  "AMX": "MED-AMX", "CTR": "MED-CTR", "MTZ": "MED-MTZ", "CIP": "MED-CIP",
  "AML": "MED-AML", "BIS": "MED-BIS", "ASP": "MED-ASP", "INS": "MED-INS",
  "OND": "MED-OND", "MOR": "MED-MOR", "KCL": "MED-KCL", "RL": "MED-RL",
};

export interface PharmacistCaseRecord {
  encounterId: string;
  patientId: string;
  pharmacistId: string;
  ordersReviewed: number;
  warningsIssued: number;
  dosesDispensed: number;
  interventionsCount: number;
  lastReviewTick: number;
}

/** 24/7 clinical pharmacy: review + dispense for ED/inpatient. Skips outpatient orders. */
export function aiClinicalPharmacyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  return processPharmacyOrders(state, clock, "inpatient");
}

/** Outpatient pharmacy (8am-8pm): dispense for poli encounters only */
export function aiOutpatientPharmacyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const hour = Math.floor((clock.tick % 1440) / 60);
  if (hour < 8 || hour >= 20) return state;
  return processPharmacyOrders(state, clock, "outpatient");
}

function processPharmacyOrders(state: HospitalState, clock: Clock, mode: "inpatient" | "outpatient"): HospitalState {
  if (clock.tick % 2 !== 0) return state;

  const newMedOrders = new Map(state.medicationOrders);
  const pharmacyMemory = new Map(state._pharmacyCaseMemory ?? []);
  let stateMut = state;

  const pharmacistAgents = Array.from(state._agentState?.pool?.agents?.values() ?? [])
    .filter(a => a.role === "apoteker" && a.status.inShift && a.status.kesehatan !== "sakit_berat");

  const orderedMeds = Array.from(newMedOrders.values())
    .filter(o => o.status === "ordered")
    .filter(o => {
      if (mode === "inpatient") {
        const enc = stateMut.encounters.get(o.encounterId);
        return enc && enc.type !== "outpatient";
      }
      if (mode === "outpatient") {
        const enc = stateMut.encounters.get(o.encounterId);
        return enc && enc.type === "outpatient";
      }
      return true;
    });

  for (const order of orderedMeds) {
    const patient = stateMut.patients.get(order.patientId);
    if (!patient) continue;

    const pharmacist = pharmacistAgents[Math.floor(clock.rng() * pharmacistAgents.length)];
    const pharmacistId = pharmacist?.id ?? "SYS-PHARM";

    const drugCode = order.medication.code;
    const warnings: string[] = [];

    const allergyWarning = checkDrugAllergy(drugCode, patient.allergies);
    if (allergyWarning) warnings.push(allergyWarning);

    const contraCheck = checkDiagnosisContraindication(drugCode, patient.diagnoses);
    warnings.push(...contraCheck.warnings);

    const existingMeds = patient.medications.filter(m => m.code !== drugCode);
    const interaction = checkDrugInteraction(order.medication, existingMeds);
    if (interaction.severity === "contraindicated" || interaction.severity === "major") {
      warnings.push(interaction.description!);
    } else if (interaction.severity === "moderate") {
      warnings.push(interaction.description! + " — caution advised");
    }

    const doseInfo = getDoseRange(drugCode);
    if (doseInfo) {
      const doseVal = parseFloat(order.dose);
      if (!isNaN(doseVal) && doseVal > doseInfo.maxMg) {
        warnings.push(`Dose ${doseVal}${doseInfo.unit} exceeds max single dose ${doseInfo.maxMg}${doseInfo.unit}`);
      }
    }

    const primaryDx = patient.diagnoses.filter(d => d.active)[0];
    const deteriorationRate = primaryDx && stateMut._learningMemory ? getDeteriorationRate(stateMut._learningMemory, primaryDx.code) : null;
    if (deteriorationRate !== null && deteriorationRate > 0.5) {
      warnings.push(`Learning: ${primaryDx!.name} has ${(deteriorationRate * 100).toFixed(0)}% historical deterioration — verify therapy appropriateness`);
    }

    const supplyCode = MED_TO_SUPPLY[drugCode];
    const stockAvailable = supplyCode ? getStock(stateMut, supplyCode) > 0 : true;
    if (!stockAvailable) {
      warnings.push(`Insufficient stock for ${order.medication.name} (${supplyCode})`);
    }

    const hasWarning = warnings.length > 0;

    if (hasWarning) {
      newMedOrders.set(order.id, {
        ...order,
        status: "ordered",
      });
    } else {
      newMedOrders.set(order.id, {
        ...order,
        status: "dispensed",
        administeredAt: clock.hospitalTimeMs,
      });

      if (supplyCode) {
        stateMut = dispenseItem(stateMut, supplyCode, 1, clock, order.id);
      }
      stateMut = { ...stateMut, charges: generateCharge(stateMut.charges ?? new Map(), clock, order.encounterId, order.patientId, "pharmacy", `Dispensed: ${order.medication.name}`) };
    }

    const caseKey = `PHARM-${order.encounterId}`;
    const existing = pharmacyMemory.get(caseKey);
    pharmacyMemory.set(caseKey, {
      encounterId: order.encounterId,
      patientId: order.patientId,
      pharmacistId,
      ordersReviewed: (existing?.ordersReviewed ?? 0) + 1,
      warningsIssued: (existing?.warningsIssued ?? 0) + (hasWarning ? 1 : 0),
      dosesDispensed: (existing?.dosesDispensed ?? 0) + (hasWarning ? 0 : 1),
      interventionsCount: (existing?.interventionsCount ?? 0) + (hasWarning ? 1 : 0),
      lastReviewTick: clock.tick,
    });
  }

  return { ...stateMut, medicationOrders: newMedOrders, _pharmacyCaseMemory: pharmacyMemory };
}
