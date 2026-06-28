import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, InsuranceClaim, Payment, ChargeCategory } from "../patient/schema.js";

const PAYERS = ["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Private Insurance A", "Private Insurance B", "Self-pay"];

const CHARGE_RATES: Record<ChargeCategory, number> = {
  lab: 250000, radiology: 500000, pharmacy: 75000, surgery: 5000000,
  room: 350000, consult: 150000, emergency: 400000, respiratory: 200000, supply: 50000,
};

const MAX_CHARGES = 100;
const MAX_CLAIMS = 100;
const MAX_PAYMENTS = 50;

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

  if (newCharges.size > MAX_CHARGES) {
    const sorted = Array.from(newCharges.entries()).sort((a, b) => a[1].billedAt - b[1].billedAt);
    const toRemove = sorted.slice(0, newCharges.size - MAX_CHARGES);
    for (const [id] of toRemove) newCharges.delete(id);
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

  if (newClaims.size > MAX_CLAIMS) {
    const sorted = Array.from(newClaims.entries()).sort((a, b) => (a[1].submittedAt ?? 0) - (b[1].submittedAt ?? 0));
    const toRemove = sorted.slice(0, newClaims.size - MAX_CLAIMS);
    for (const [id] of toRemove) newClaims.delete(id);
  }

  return { ...state, charges: newCharges, insuranceClaims: newClaims };
}

export function cashierHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let newPayments = new Map(state.payments);
  const newClaims = new Map(state.insuranceClaims);

  if (clock.tick % 10 !== 0) return { ...state, insuranceClaims: newClaims, payments: newPayments };

  for (const [id, claim] of newClaims) {
    if (claim.status === "paid" && claim.patientResponsibility > 0) {
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
  }

  if (newPayments.size > MAX_PAYMENTS) {
    const sorted = Array.from(newPayments.entries()).sort((a, b) => a[1].paidAt - b[1].paidAt);
    const toRemove = sorted.slice(0, newPayments.size - MAX_PAYMENTS);
    for (const [id] of toRemove) newPayments.delete(id);
  }

  return { ...state, insuranceClaims: newClaims, payments: newPayments };
}
