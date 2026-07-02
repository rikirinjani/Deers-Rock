import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { InsuranceClaim, Payment, RoomClass, PayerType, ClaimDenialReason } from "../patient/schema.js";
import { generateCharge, ROOM_CLASS_MULTIPLIER, CHARGE_RATES } from "./charge-generator.js";
import { lookupCbgTariff, inferSeverity } from "./ina-cbg.js";

const ACCIDENT_ICD_CODES = new Set(["S06", "S72", "T14", "T20", "T63"]);
const JR_TICK_CAP = 30 * 24 * 60; // 30-day Jasa Raharja treatment cap (in ticks / minutes)

/**
 * Assign payer at encounter start.
 * Rules per Coordinator design brief:
 * - Default: BPJS Kesehatan
 * - Accident ICD codes → Jasa Raharja (state traffic accident insurance)
 * - Foreigners (nationality !== "WNI") → Self-pay
 */
export function assignPayer(patient: { diagnoses: { code: string; active: boolean }[]; identity?: { nationality?: string } }): PayerType {
  if (patient.identity?.nationality && patient.identity.nationality !== "WNI") {
    return "Self-pay";
  }
  const activeDx = patient.diagnoses.find(d => d.active);
  if (activeDx && ACCIDENT_ICD_CODES.has(activeDx.code)) {
    return "Jasa Raharja";
  }
  return "BPJS Kesehatan";
}

/**
 * Generate a BPJS SEP (Surat Elegibilitas Peserta) number.
 * Format: SEP + timestamp + sequential (simplified).
 */
function generateSepNumber(clock: Clock): string {
  return `SEP-${clock.tick}-${Math.floor(clock.rng() * 9000) + 1000}`;
}

/**
 * Check if the claim's ICD codes match the INA-CBG tariff group.
 * Returns true if valid, false if mismatched.
 */
function validateCbgCoding(enc: { id: string }, patient: { diagnoses: { code: string; active: boolean }[] } | undefined): boolean {
  if (!patient) return false;
  const primaryDx = patient.diagnoses.find(d => d.active) ?? patient.diagnoses[0];
  if (!primaryDx) return false;
  const cbgEntry = lookupCbgTariff(primaryDx.code);
  return cbgEntry !== undefined;
}

const PAYERS = ["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Private Insurance A", "Private Insurance B", "Self-pay"];

/** Professional fees per action type (IDR). Used by AI Doctor/AI Nurse when performing actions. */
export const PROCEDURE_COSTS: Record<string, number> = {
  "doctor_round": 150000,
  "specialist_consult": 300000,
  "nursing_procedure": 50000,
  "surgery_major": 15000000,
  "surgery_intermediate": 10000000,
  "surgery_minor": 5000000,
};

export function billingHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let newCharges = new Map(state.charges);
  const newClaims = new Map(state.insuranceClaims);
  const billedAdmin = new Set(Array.from(newCharges.values()).filter(c => c.category === "administration").map(c => c.encounterId));

  // Admin tariff: once per encounter (both inpatient and outpatient)
  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    if (billedAdmin.has(enc.id)) continue;
    newCharges = generateCharge(newCharges, clock, enc.id, enc.patientId, "administration", "Administration fee");
    billedAdmin.add(enc.id);
  }

  // Room tariff: only for inpatients with beds
  if (clock.tick % 5 === 0) {
    const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active" && e.type === "inpatient");
    for (const enc of activeEncounters) {
      const bed = Array.from(state.beds.values()).find(b => b.patientId === enc.patientId);
      const rc: RoomClass = bed?.roomClass ?? "kelas-3";
      const rate = Math.round(CHARGE_RATES.room * (ROOM_CLASS_MULTIPLIER[rc] ?? 1));
      newCharges = generateCharge(newCharges, clock, enc.id, enc.patientId, "room", `Room (${rc}) - tick ${clock.tick}`, rate);
    }
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "discharged") continue;
    const claimId = `CLM-${enc.id}`;
    if (newClaims.has(claimId)) continue;

    const encCharges = Array.from(newCharges.values()).filter(c => c.encounterId === enc.id);
    const total = encCharges.reduce((s, c) => s + c.amount, 0);
    if (total === 0) continue;

    const payer = enc.payer ?? "BPJS Kesehatan";

    // BPJS claims require coded chart before submission
    const patient = state.patients.get(enc.patientId);
    const chart = Array.from(state.medicalCharts.values()).find(c => c.encounterId === enc.id);
    const chartStatus = chart?.status ?? "open";

    // Only submit BPJS claims when chart is coded
    if (payer === "BPJS Kesehatan" && chartStatus !== "coded") {
      continue;
    }

    // Compute severity from chart diagnoses
    const chartDxCodes = chart?.diagnoses.map(d => d.code) ?? [];
    const severity = inferSeverity(chartDxCodes);
    const primaryDx = patient?.diagnoses.find(d => d.active) ?? patient?.diagnoses[0];
    const cbgEntry = primaryDx ? lookupCbgTariff(primaryDx.code, severity) : undefined;

    let totalCharges = total;
    let coveredAmount: number;
    let patientResponsibility: number;
    let sepNumber: string | null = null;
    let denialReason: ClaimDenialReason = null;

    if (payer === "BPJS Kesehatan") {
      // BPJS: all-inclusive tariff per INA-CBG
      if (cbgEntry) {
        totalCharges = cbgEntry.tariffIdr;
        coveredAmount = cbgEntry.tariffIdr;
        patientResponsibility = 0;
        sepNumber = generateSepNumber(clock);
      } else {
        // No CBG mapping — deny with mismatched_icd_cbg
        totalCharges = total;
        coveredAmount = 0;
        patientResponsibility = total;
        denialReason = "mismatched_icd_cbg";
      }
    } else if (payer === "Jasa Raharja") {
      // JR: full coverage for accident cases, capped at 30 days
      const encounterDurationTicks = (enc.endTime && enc.startTime)
        ? Math.round((enc.endTime - enc.startTime) / 60000)
        : 0;
      const jrCapRatio = encounterDurationTicks > JR_TICK_CAP
        ? JR_TICK_CAP / encounterDurationTicks
        : 1;
      totalCharges = total;
      coveredAmount = Math.round(total * jrCapRatio);
      patientResponsibility = total - coveredAmount;
      sepNumber = generateSepNumber(clock);
    } else if (payer === "Self-pay") {
      totalCharges = total;
      coveredAmount = 0;
      patientResponsibility = total;
    } else {
      // Private insurance: 70% coverage
      totalCharges = total;
      coveredAmount = Math.round(total * 0.7);
      patientResponsibility = total - coveredAmount;
    }

    const claim: InsuranceClaim = {
      id: claimId,
      encounterId: enc.id,
      patientId: enc.patientId,
      payer,
      sepNumber,
      actualCost: total,
      totalCharges,
      coveredAmount,
      patientResponsibility,
      status: denialReason ? "denied" : (payer === "Jasa Raharja" ? "paid" : "submitted"),
      denialReason,
      submittedAt: clock.hospitalTimeMs,
      resolvedAt: denialReason ? clock.hospitalTimeMs : (payer === "Jasa Raharja" ? clock.hospitalTimeMs : null),
    };
    newClaims.set(claim.id, claim);
  }

  // Adjudicate submitted claims every 15 ticks
  if (clock.tick > 0 && clock.tick % 15 === 0) {
    for (const [id, claim] of newClaims) {
      if (claim.status === "submitted") {
        // BPJS: 85% approve, 10% returned for coding issues, 5% deny
        const roll = clock.rng();
        let newStatus: InsuranceClaim["status"];
        let denialReason: ClaimDenialReason = null;

        if (roll < 0.85) {
          newStatus = "paid";
        } else if (roll < 0.95) {
          newStatus = "returned";
          denialReason = "incomplete_coding";
        } else {
          newStatus = "denied";
          denialReason = "missing_documents";
        }

        newClaims.set(id, { ...claim, status: newStatus, denialReason, resolvedAt: clock.hospitalTimeMs });
        break;
      }
    }
  }

  // Process returned claims: resubmit if coding is now complete
  for (const [id, claim] of newClaims) {
    if (claim.status !== "returned") continue;
    const chart = Array.from(state.medicalCharts.values()).find(c => c.encounterId === claim.encounterId);
    if (chart?.status === "coded") {
      newClaims.set(id, { ...claim, status: "submitted", denialReason: null, resolvedAt: null });
    }
  }

  return { ...state, charges: newCharges, insuranceClaims: newClaims };
}

function processCashier(state: HospitalState, clock: Clock, encounterType: string): HospitalState {
  let newPayments = new Map(state.payments);
  const newClaims = new Map(state.insuranceClaims);

  for (const [id, claim] of newClaims) {
    if (claim.status !== "paid" || claim.patientResponsibility <= 0) continue;
    const enc = state.encounters.get(claim.encounterId);
    if (!enc || enc.type !== encounterType) continue;

    const payment: Payment = {
      id: `PAY-${clock.tick}-${claim.patientId}`,
      encounterId: claim.encounterId,
      patientId: claim.patientId,
      type: clock.rng() > 0.5 ? "cash" : "card",
      amount: claim.patientResponsibility,
      paidAt: clock.hospitalTimeMs,
      note: `Patient responsibility for ${claim.id}`,
    };
    newPayments.set(payment.id, payment);
    break;
  }

  return { ...state, insuranceClaims: newClaims, payments: newPayments };
}

export function edCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "outpatient");
}

export function inpatientCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "inpatient");
}

export function outpatientCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "outpatient");
}
