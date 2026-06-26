import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, InsuranceClaim, Payment, ChargeCategory } from "../patient/schema.js";

const PAYERS = ["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Private Insurance A", "Private Insurance B", "Self-pay"];

const CHARGE_RATES: Record<ChargeCategory, number> = {
  lab: 250000, radiology: 500000, pharmacy: 75000, surgery: 5000000,
  room: 350000, consult: 150000, emergency: 400000, respiratory: 200000, supply: 50000,
};

export function billingHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newCharges = new Map(state.charges);
  const newClaims = new Map(state.insuranceClaims);

  // Generate room charges for active encounters every 5 ticks
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

  // Generate insurance claims on discharge
  for (const enc of state.encounters.values()) {
    if (enc.status !== "discharged") continue;
    const claimId = `CLM-${enc.id}`;
    if (newClaims.has(claimId)) continue;

    const encCharges = Array.from(newCharges.values()).filter(c => c.encounterId === enc.id);
    const total = encCharges.reduce((s, c) => s + c.amount, 0);
    if (total === 0) continue;

    const payer = PAYERS[Math.floor(Math.random() * PAYERS.length)]!;
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

  // Process claims every 15 ticks
  if (clock.tick > 0 && clock.tick % 15 === 0) {
    for (const [id, claim] of newClaims) {
      if (claim.status === "submitted") {
        const adjudicated = Math.random() > 0.2 ? "paid" : "denied";
        newClaims.set(id, { ...claim, status: adjudicated, resolvedAt: clock.hospitalTimeMs });
        break;
      }
    }
  }

  return { ...state, charges: newCharges, insuranceClaims: newClaims };
}

export function cashierHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newPayments = new Map(state.payments);
  const newClaims = new Map(state.insuranceClaims);

  if (clock.tick % 10 !== 0) return { ...state, insuranceClaims: newClaims, payments: newPayments };

  for (const [id, claim] of newClaims) {
    if (claim.status === "paid" && claim.patientResponsibility > 0) {
      const payment: Payment = {
        id: `PAY-${clock.tick}-${claim.patientId}`,
        encounterId: claim.encounterId,
        patientId: claim.patientId,
        type: Math.random() > 0.5 ? "cash" : "card",
        amount: claim.patientResponsibility,
        paidAt: clock.hospitalTimeMs,
        note: `Patient responsibility for ${claim.id}`,
      };
      newPayments.set(payment.id, payment);
      break;
    }
  }

  return { ...state, insuranceClaims: newClaims, payments: newPayments };
}
