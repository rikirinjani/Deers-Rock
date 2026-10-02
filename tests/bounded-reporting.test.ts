/**
 * ADR-004 review follow-up (finding 4): ON-mode reporting semantics.
 *
 * Live-report totals sum over LIVE charges (as report.ts / bi.ts / sirs-report
 * finance sections do) and therefore undercount the frozen per-claim totals
 * (actualCost / totalCharges, fixed at claim creation) BY DESIGN once pruning
 * removes settled, aged charges. This test proves the drift equals EXACTLY the
 * pruned-charges sum (bounded, explainable — not arbitrary), and that the
 * per-claim `coveredAmount + patientResponsibility == totalCharges` invariant
 * is unaffected (pruning never rewrites claims).
 *
 * New file (does not modify any existing test).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createClock, type Clock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState, type HospitalState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { billingHandler } from "../src/engine/finance.js";
import type { Charge, Encounter, InsuranceClaim } from "../src/patient/schema.js";

const MS_PER_TICK = 60_000;
const PRUNE_TICK = 100; // divisible by 5 (billing cadence) and 100 (prune cadence)

function tickClock(tick: number): Clock {
  const clock = createClock(60);
  clock.tick = tick;
  clock.hospitalTimeMs = tick * MS_PER_TICK;
  return clock;
}

function makeDischargedEncounter(patientId: string, id: string): Encounter {
  return { id, patientId, type: "inpatient", startTime: 1000, endTime: 2000, status: "discharged", payer: "BPJS Kesehatan" };
}

function makeCharge(id: string, amount: number, ageTicks: number, nowTick: number): Charge {
  return {
    id, encounterId: "ENC-x", patientId: "PAT-x",
    category: "room", description: "Room (kelas-3)",
    amount,
    billedAt: nowTick * MS_PER_TICK - ageTicks * MS_PER_TICK,
    paid: false,
  };
}

/** Frozen claim totals equal the FULL pre-prune charge sum (as claim creation computes them). */
function makeFrozenClaim(encounterId: string, patientId: string, frozenTotal: number): InsuranceClaim {
  return {
    id: `CLM-${encounterId}`, encounterId, patientId,
    payer: "BPJS Kesehatan", sepNumber: "SEP-1",
    actualCost: frozenTotal, totalCharges: frozenTotal,
    coveredAmount: frozenTotal, patientResponsibility: 0,
    status: "paid", denialReason: null,
    submittedAt: 1000, resolvedAt: 2000,
  };
}

/** Live-report style total: sum over LIVE charges only (report.ts/bi.ts/sirs-report pattern). */
function liveChargeTotal(state: HospitalState, encounterId: string): number {
  let sum = 0;
  for (const c of state.charges.values()) {
    if (c.encounterId === encounterId) sum += c.amount;
  }
  return sum;
}

beforeEach(() => {
  delete process.env.DR_DURABLE_QUEUE;
  delete process.env.DR_BOUNDED_STATE;
  delete process.env.DR_PRUNE_TTL_CHARGES;
  delete process.env.DR_PRUNE_TTL_ORDERS;
});

afterEach(() => {
  delete process.env.DR_DURABLE_QUEUE;
  delete process.env.DR_BOUNDED_STATE;
  delete process.env.DR_PRUNE_TTL_CHARGES;
  delete process.env.DR_PRUNE_TTL_ORDERS;
});

describe("ADR-004 reporting semantics (finding 4)", () => {
  it("ON mode: live-report drift equals EXACTLY the pruned-charges sum", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    state.encounters.set(encId, makeDischargedEncounter(pid, encId));
    // Full pre-prune set: 350k + 250k (aged, prunable) + 100k (young, retained).
    const charges = [
      { ...makeCharge("CHG-old1", 350000, 5000, PRUNE_TICK), encounterId: encId, patientId: pid },
      { ...makeCharge("CHG-old2", 250000, 6000, PRUNE_TICK), encounterId: encId, patientId: pid },
      { ...makeCharge("CHG-young", 100000, 10, PRUNE_TICK), encounterId: encId, patientId: pid },
    ];
    for (const c of charges) state.charges.set(c.id, c);
    const prePruneTotal = charges.reduce((s, c) => s + c.amount, 0);
    expect(prePruneTotal).toBe(700000);
    state.insuranceClaims.set(`CLM-${encId}`, makeFrozenClaim(encId, pid, prePruneTotal));

    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());

    // Exactly the two aged charges are gone; the young one survives.
    expect(result.charges.has("CHG-old1")).toBe(false);
    expect(result.charges.has("CHG-old2")).toBe(false);
    expect(result.charges.has("CHG-young")).toBe(true);

    const prunedSum = 350000 + 250000;
    const liveTotal = liveChargeTotal(result, encId);
    expect(liveTotal).toBe(100000);
    // Drift is bounded and explainable: frozen total minus live total equals
    // EXACTLY the pruned-charges sum — not an arbitrary amount.
    const claim = result.insuranceClaims.get(`CLM-${encId}`)!;
    expect(claim.totalCharges - liveTotal).toBe(prunedSum);
    expect(claim.actualCost - liveTotal).toBe(prunedSum);
    expect(prunedSum + liveTotal).toBe(prePruneTotal);
  });

  it("ON mode: per-claim covered+responsibility==total is unaffected by pruning", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    state.encounters.set(encId, makeDischargedEncounter(pid, encId));
    const charge = { ...makeCharge("CHG-old", 350000, 5000, PRUNE_TICK), encounterId: encId, patientId: pid };
    state.charges.set(charge.id, charge);
    state.insuranceClaims.set(`CLM-${encId}`, makeFrozenClaim(encId, pid, 350000));

    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(false);
    for (const c of result.insuranceClaims.values()) {
      expect(c.coveredAmount + c.patientResponsibility).toBe(c.totalCharges);
    }
  });

  it("OFF mode: no drift — live-report total matches the frozen claim total", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    state.encounters.set(encId, makeDischargedEncounter(pid, encId));
    const charge = { ...makeCharge("CHG-old", 350000, 5000, PRUNE_TICK), encounterId: encId, patientId: pid };
    state.charges.set(charge.id, charge);
    state.insuranceClaims.set(`CLM-${encId}`, makeFrozenClaim(encId, pid, 350000));

    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(true);
    expect(liveChargeTotal(result, encId)).toBe(350000);
  });
});
