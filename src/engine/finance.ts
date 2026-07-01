import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, InsuranceClaim, Payment, ChargeCategory } from "../patient/schema.js";

const PAYERS = ["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Private Insurance A", "Private Insurance B", "Self-pay"];

const CHARGE_RATES: Record<ChargeCategory, number> = {
  lab: 250000, radiology: 500000, pharmacy: 75000, surgery: 5000000,
  room: 350000, consult: 150000, emergency: 400000, respiratory: 200000, supply: 50000,
};

/** Professional fees per action type (IDR). Used by AI Doctor/AI Nurse when performing actions. */
export const PROCEDURE_COSTS: Record<string, number> = {
  "doctor_round": 150000,
  "specialist_consult": 300000,
  "nursing_procedure": 50000,
  "surgery_major": 15000000,
  "surgery_intermediate": 10000000,
  "surgery_minor": 5000000,
};

let chargeCounter = 0;

/** Generate a single charge and return updated charges map. Used by multiple handlers. */
export function addCharge(
  state: HospitalState, clock: Clock,
  encounterId: string, patientId: string,
  category: ChargeCategory, description: string, amount?: number
): Map<string, Charge> {
  chargeCounter++;
  const newCharges = new Map(state.charges);
  newCharges.set(`CHG-${chargeCounter}-${patientId}`, {
    id: `CHG-${chargeCounter}-${patientId}`,
    encounterId, patientId,
    category,
    description,
    amount: amount ?? CHARGE_RATES[category],
    billedAt: clock.hospitalTimeMs,
    paid: false,
  });
  return newCharges;
}

export function billingHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let newCharges = new Map(state.charges);
  const newClaims = new Map(state.insuranceClaims);

  if (clock.tick % 5 === 0) {
    const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
    for (const enc of activeEncounters) {
      const charge: Charge = {
        id: `CHG-${clock.tick}-${enc.patientId}`,
        encounterId: enc.id,
        patientId: enc.patientId,
        category: "room",
        description: `Room charge - tick ${clock.tick}`,
        amount: CHARGE_RATES.room,
        billedAt: clock.hospitalTimeMs,
        paid: false,
      };
      newCharges.set(charge.id, charge);
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
    const coverageRate = payer === "BPJS Kesehatan" ? 0.9 : payer === "Self-pay" ? 0 : 0.7;
    const claim: InsuranceClaim = {
      id: claimId,
      encounterId: enc.id,
      patientId: enc.patientId,
      payer,
      totalCharges: total,
      coveredAmount: Math.round(total * coverageRate),
      patientResponsibility: Math.round(total * (1 - coverageRate)),
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
  return processCashier(state, clock, "emergency");
}

export function inpatientCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "admission");
}

export function outpatientCashierHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  return processCashier(state, clock, "outpatient");
}
