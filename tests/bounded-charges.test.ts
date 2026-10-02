/**
 * ADR-004 D2 — bounded growth: charges pruning (finance.ts).
 *
 * New file (does not modify any existing test). Covers:
 *  - OFF mode: eligible charges retained (today's behavior exactly)
 *  - ON mode: terminal+aged pruned; live/young/non-terminal/claim-pending retained
 *  - TTL boundary (age == TTL retained, age == TTL+1 pruned)
 *  - cadence gating (prune runs at most every 100 ticks)
 *  - aggregate invariants: coveredAmount + patientResponsibility == totalCharges
 *    per claim after pruning; claim creation intact with flag ON
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

function makeDischargedEncounter(patientId: string, id = `ENC-${patientId}`): Encounter {
  return { id, patientId, type: "inpatient", startTime: 1000, endTime: 2000, status: "discharged", payer: "BPJS Kesehatan" };
}

function makeActiveEncounter(patientId: string, id = `ENC-${patientId}`): Encounter {
  return { id, patientId, type: "inpatient", startTime: 1000, endTime: null, status: "active", payer: "BPJS Kesehatan" };
}

function makeCharge(id: string, encounterId: string, patientId: string, ageTicks: number, nowTick: number): Charge {
  return {
    id, encounterId, patientId,
    category: "room", description: "Room (kelas-3)",
    amount: 350000,
    billedAt: nowTick * MS_PER_TICK - ageTicks * MS_PER_TICK,
    paid: false,
  };
}

function makeClaim(encounterId: string, patientId: string, status: InsuranceClaim["status"]): InsuranceClaim {
  return {
    id: `CLM-${encounterId}`, encounterId, patientId,
    payer: "BPJS Kesehatan", sepNumber: "SEP-1",
    actualCost: 700000, totalCharges: 700000,
    coveredAmount: 700000, patientResponsibility: 0,
    status, denialReason: null,
    submittedAt: 1000, resolvedAt: status === "paid" || status === "denied" ? 2000 : null,
  };
}

/** Minimal world: discharged encounter + one claim + caller-supplied charges. */
function setupWorld(claimStatus: InsuranceClaim["status"] | null, charges: Charge[]): { state: HospitalState; pid: string; encId: string } {
  const patients = generatePatientPool(1);
  const pid = patients[0]!.id;
  const encId = `ENC-${pid}`;
  const state = createState(patients);
  state.encounters.set(encId, makeDischargedEncounter(pid, encId));
  if (claimStatus !== null) {
    const claim = makeClaim(encId, pid, claimStatus);
    state.insuranceClaims.set(claim.id, claim);
  }
  for (const c of charges) state.charges.set(c.id, { ...c, encounterId: encId, patientId: pid });
  return { state, pid, encId };
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

describe("ADR-004 D2 charges pruning (finance.ts)", () => {
  it("OFF mode: terminal + aged charges are retained (today's behavior exactly)", () => {
    const { state, pid, encId } = setupWorld("paid", [makeCharge("CHG-old", "ENC-x", "PAT-x", 5000, PRUNE_TICK)]);
    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(true);
  });

  it("ON mode: discharged + terminal-claim + aged charges are pruned", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const { state, pid, encId } = setupWorld("paid", [
      makeCharge("CHG-old", "ENC-x", "PAT-x", 5000, PRUNE_TICK),
      makeCharge("CHG-young", "ENC-x", "PAT-x", 10, PRUNE_TICK),
    ]);
    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(false);
    expect(result.charges.has("CHG-young")).toBe(true);
  });

  it("ON mode: denied claims count as terminal", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const { state, pid, encId } = setupWorld("denied", [makeCharge("CHG-old", "ENC-x", "PAT-x", 5000, PRUNE_TICK)]);
    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(false);
  });

  it("ON mode: non-terminal claims (submitted/returned/adjudicated) retain charges", () => {
    process.env.DR_BOUNDED_STATE = "1";
    for (const status of ["submitted", "returned", "adjudicated"] as const) {
      const { state } = setupWorld(status, [makeCharge(`CHG-${status}`, "ENC-x", "PAT-x", 5000, PRUNE_TICK)]);
      const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
      expect(result.charges.has(`CHG-${status}`)).toBe(true);
    }
  });

  it("ON mode: active encounters retain aged charges", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    state.encounters.set(encId, makeActiveEncounter(pid, encId));
    const claim = makeClaim(encId, pid, "paid");
    state.insuranceClaims.set(claim.id, claim);
    state.charges.set("CHG-old", { ...makeCharge("CHG-old", "ENC-x", "PAT-x", 5000, PRUNE_TICK), encounterId: encId, patientId: pid });
    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(true);
  });

  it("ON mode: discharged encounter with no claim yet retains charges (claim totals need them)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    // BPJS without a coded chart => billingHandler creates NO claim this pass.
    const { state, pid, encId } = setupWorld(null, [makeCharge("CHG-old", "ENC-x", "PAT-x", 5000, PRUNE_TICK)]);
    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(true);
  });

  it("TTL boundary: age == TTL retained, age == TTL+1 pruned", () => {
    process.env.DR_BOUNDED_STATE = "1";
    process.env.DR_PRUNE_TTL_CHARGES = "10";
    const { state, pid, encId } = setupWorld("paid", [
      makeCharge("CHG-edge", "ENC-x", "PAT-x", 10, PRUNE_TICK),
      makeCharge("CHG-over", "ENC-x", "PAT-x", 11, PRUNE_TICK),
    ]);
    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-edge")).toBe(true);
    expect(result.charges.has("CHG-over")).toBe(false);
  });

  it("cadence gating: eligible charges survive off-cadence ticks, pruned on cadence ticks", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const mk = () => setupWorld("paid", [makeCharge("CHG-old", "ENC-x", "PAT-x", 5000, 150)]);
    // Tick 150: billing runs (150 % 5 === 0) but prune is gated (150 % 100 !== 0).
    const off = mk();
    const offResult = billingHandler(off.state, tickClock(150), new EventQueue());
    expect(offResult.charges.has("CHG-old")).toBe(true);
    // Tick 200: same eligibility, prune fires.
    const on = setupWorld("paid", [makeCharge("CHG-old", "ENC-x", "PAT-x", 5000, 200)]);
    const onResult = billingHandler(on.state, tickClock(200), new EventQueue());
    expect(onResult.charges.has("CHG-old")).toBe(false);
  });

  it("aggregate invariant: coveredAmount + patientResponsibility == totalCharges per claim after pruning", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const { state, pid, encId } = setupWorld("paid", [
      makeCharge("CHG-a", "ENC-x", "PAT-x", 5000, PRUNE_TICK),
      makeCharge("CHG-b", "ENC-x", "PAT-x", 6000, PRUNE_TICK),
    ]);
    const result = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-a")).toBe(false);
    expect(result.charges.has("CHG-b")).toBe(false);
    for (const claim of result.insuranceClaims.values()) {
      expect(claim.coveredAmount + claim.patientResponsibility).toBe(claim.totalCharges);
    }
  });

  it("claim creation still works with flag ON (young charges fund the totals)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const patients = generatePatientPool(1);
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);
    state.encounters.set(encId, makeActiveEncounter(pid, encId));
    state = billingHandler(state, tickClock(5), new EventQueue());
    expect(state.charges.size).toBeGreaterThan(0);
    state.medicalCharts.set(`CHART-${pid}`, {
      id: `CHART-${pid}`, encounterId: encId, patientId: pid, status: "coded",
      createdAt: 1000, completedAt: 2000,
      diagnoses: [{ code: "A09", name: "Infectious gastroenteritis", type: "primary" }],
      procedures: [], coder: "AI Coder",
    });
    state.encounters.set(encId, makeDischargedEncounter(pid, encId));
    state = billingHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    const claim = state.insuranceClaims.get(`CLM-${encId}`)!;
    expect(claim).toBeDefined();
    expect(claim.coveredAmount + claim.patientResponsibility).toBe(claim.totalCharges);
  });

  it("handler output is a pure function of input (deterministic, no hidden state)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const mk = () => setupWorld("paid", [
      makeCharge("CHG-a", "ENC-x", "PAT-x", 5000, PRUNE_TICK),
      makeCharge("CHG-b", "ENC-x", "PAT-x", 5, PRUNE_TICK),
    ]);
    const a = mk();
    const b = mk();
    const ra = billingHandler(a.state, tickClock(PRUNE_TICK), new EventQueue());
    const rb = billingHandler(b.state, tickClock(PRUNE_TICK), new EventQueue());
    expect(Array.from(ra.charges.keys()).sort()).toEqual(Array.from(rb.charges.keys()).sort());
    expect(ra.charges.size).toBe(rb.charges.size);
  });
});
