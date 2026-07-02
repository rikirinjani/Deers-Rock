import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { InsuranceClaim, Payment, RoomClass } from "../patient/schema.js";
import { generateCharge, ROOM_CLASS_MULTIPLIER, CHARGE_RATES } from "./charge-generator.js";
import { lookupCbgTariff } from "./ina-cbg.js";

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

    const payer = PAYERS[Math.floor(clock.rng() * PAYERS.length)]!;

    // Look up INA-CBG tariff for BPJS claims
    const patient = state.patients.get(enc.patientId);
    const primaryDx = patient?.diagnoses.find(d => d.active) ?? patient?.diagnoses[0];
    const cbgEntry = primaryDx ? lookupCbgTariff(primaryDx.code) : undefined;

    let totalCharges = total;
    let coveredAmount: number;
    let patientResponsibility: number;

    if (payer === "BPJS Kesehatan" && cbgEntry) {
      // BPJS: all-inclusive tariff per INA-CBG. Patient pays nothing.
      totalCharges = cbgEntry.tariffIdr;
      coveredAmount = cbgEntry.tariffIdr;
      patientResponsibility = 0;
    } else if (payer === "BPJS Kesehatan") {
      // BPJS but no CBG mapping found — fallback to 90% coverage
      totalCharges = total;
      coveredAmount = Math.round(total * 0.9);
      patientResponsibility = total - coveredAmount;
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
      totalCharges,
      coveredAmount,
      patientResponsibility,
      status: "submitted",
      submittedAt: clock.hospitalTimeMs,
      resolvedAt: null,
    };
    newClaims.set(claim.id, claim);
  }

  if (clock.tick > 0 && clock.tick % 15 === 0) {
    for (const [id, claim] of newClaims) {
      if (claim.status === "submitted") {
        const adjudicated = clock.rng() > 0.2 ? "paid" : "denied";
        newClaims.set(id, { ...claim, status: adjudicated, resolvedAt: clock.hospitalTimeMs });
        break;
      }
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
