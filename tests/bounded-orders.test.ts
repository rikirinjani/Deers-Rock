/**
 * ADR-004 D2 — bounded growth: orders pruning (cleanup.ts).
 *
 * New file (does not modify any existing test). Covers:
 *  - OFF mode: aged physicianOrders + socialWorkNotes retained (today's behavior)
 *  - ON mode: aged pruned, young retained (per collection)
 *  - TTL boundary (age == TTL retained, age == TTL+1 pruned)
 *  - cadence gating (bounded pass runs at most every 100 ticks)
 *  - scope rule: nurseNotes and charges are NOT touched by the new pass,
 *    even when aged (nurseNotes already capped; charges live in finance.ts)
 *  - determinism: same input -> same output
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createClock, type Clock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState, type HospitalState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { cleanupHandler } from "../src/engine/cleanup.js";
import type { PhysicianOrder, SocialWorkNote } from "../src/patient/schema.js";

const MS_PER_TICK = 60_000;
const PRUNE_TICK = 100; // cleanup runs (100 % 10 === 0); bounded pass runs (100 % 100 === 0)

function tickClock(tick: number): Clock {
  const clock = createClock(60);
  clock.tick = tick;
  clock.hospitalTimeMs = tick * MS_PER_TICK;
  return clock;
}

function makeOrder(id: string, ageTicks: number, nowTick: number, status: PhysicianOrder["status"] = "completed"): PhysicianOrder {
  return {
    id, encounterId: "ENC-x", patientId: "PAT-x",
    orderType: "lab", description: "Repeat lab work in AM",
    status,
    orderedAt: nowTick * MS_PER_TICK - ageTicks * MS_PER_TICK,
    completedAt: status === "completed" ? nowTick * MS_PER_TICK - ageTicks * MS_PER_TICK : null,
  };
}

function makeNote(id: string, ageTicks: number, nowTick: number): SocialWorkNote {
  return {
    id, encounterId: "ENC-x", patientId: "PAT-x",
    noteType: "assessment", content: "Family meeting held",
    timestamp: nowTick * MS_PER_TICK - ageTicks * MS_PER_TICK,
    disposition: "home",
  };
}

function setupState(orders: PhysicianOrder[], notes: SocialWorkNote[]): HospitalState {
  const patients = generatePatientPool(1);
  const state = createState(patients);
  for (const o of orders) state.physicianOrders.set(o.id, o);
  for (const n of notes) state.socialWorkNotes.set(n.id, n);
  return state;
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

describe("ADR-004 D2 orders pruning (cleanup.ts)", () => {
  it("OFF mode: aged orders and notes are retained (today's behavior exactly)", () => {
    const state = setupState([makeOrder("DR-old", 9000, PRUNE_TICK)], [makeNote("SW-old", 9000, PRUNE_TICK)]);
    const result = cleanupHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.physicianOrders.has("DR-old")).toBe(true);
    expect(result.socialWorkNotes.has("SW-old")).toBe(true);
  });

  it("ON mode: aged physicianOrders pruned, young retained", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const state = setupState(
      [makeOrder("DR-old", 9000, PRUNE_TICK), makeOrder("DR-young", 10, PRUNE_TICK)],
      [],
    );
    const result = cleanupHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.physicianOrders.has("DR-old")).toBe(false);
    expect(result.physicianOrders.has("DR-young")).toBe(true);
  });

  it("ON mode: aged socialWorkNotes pruned, young retained", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const state = setupState(
      [],
      [makeNote("SW-old", 9000, PRUNE_TICK), makeNote("SW-young", 10, PRUNE_TICK)],
    );
    const result = cleanupHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.socialWorkNotes.has("SW-old")).toBe(false);
    expect(result.socialWorkNotes.has("SW-young")).toBe(true);
  });

  it("ON mode: aged ACTIVE physicianOrders are pruned (pure age rule, no status gate)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const state = setupState([makeOrder("DR-active-old", 9000, PRUNE_TICK, "active")], []);
    const result = cleanupHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.physicianOrders.has("DR-active-old")).toBe(false);
  });

  it("TTL boundary: age == TTL retained, age == TTL+1 pruned (per collection)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    process.env.DR_PRUNE_TTL_ORDERS = "50";
    const state = setupState(
      [makeOrder("DR-edge", 50, PRUNE_TICK), makeOrder("DR-over", 51, PRUNE_TICK)],
      [makeNote("SW-edge", 50, PRUNE_TICK), makeNote("SW-over", 51, PRUNE_TICK)],
    );
    const result = cleanupHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.physicianOrders.has("DR-edge")).toBe(true);
    expect(result.physicianOrders.has("DR-over")).toBe(false);
    expect(result.socialWorkNotes.has("SW-edge")).toBe(true);
    expect(result.socialWorkNotes.has("SW-over")).toBe(false);
  });

  it("cadence gating: cleanup runs every 10 ticks but the bounded pass fires at most every 100", () => {
    process.env.DR_BOUNDED_STATE = "1";
    // Tick 110: cleanupHandler runs, bounded pass gated off -> aged entries survive.
    const off = setupState([makeOrder("DR-old", 9000, 110)], [makeNote("SW-old", 9000, 110)]);
    const offResult = cleanupHandler(off, tickClock(110), new EventQueue());
    expect(offResult.physicianOrders.has("DR-old")).toBe(true);
    expect(offResult.socialWorkNotes.has("SW-old")).toBe(true);
    // Tick 200: same eligibility, bounded pass fires.
    const on = setupState([makeOrder("DR-old", 9000, 200)], [makeNote("SW-old", 9000, 200)]);
    const onResult = cleanupHandler(on, tickClock(200), new EventQueue());
    expect(onResult.physicianOrders.has("DR-old")).toBe(false);
    expect(onResult.socialWorkNotes.has("SW-old")).toBe(false);
  });

  it("scope rule: aged nurseNotes survive the ON-mode pass (excluded collection)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const patients = generatePatientPool(1);
    const state = createState(patients);
    state.nurseNotes.set("NN-old", {
      id: "NN-old", encounterId: "ENC-x", patientId: "PAT-x",
      noteType: "assessment", content: "old note",
      timestamp: PRUNE_TICK * MS_PER_TICK - 9000 * MS_PER_TICK,
    });
    const result = cleanupHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.nurseNotes.has("NN-old")).toBe(true);
  });

  it("scope rule: aged unpaid charges survive cleanupHandler ON (charges prune lives in finance.ts)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const patients = generatePatientPool(1);
    const state = createState(patients);
    state.charges.set("CHG-old", {
      id: "CHG-old", encounterId: "ENC-x", patientId: "PAT-x",
      category: "room", description: "Room", amount: 350000,
      billedAt: PRUNE_TICK * MS_PER_TICK - 9000 * MS_PER_TICK,
      paid: false,
    });
    const result = cleanupHandler(state, tickClock(PRUNE_TICK), new EventQueue());
    expect(result.charges.has("CHG-old")).toBe(true);
  });

  it("handler output is a pure function of input (deterministic, no hidden state)", () => {
    process.env.DR_BOUNDED_STATE = "1";
    const mk = () => setupState(
      [makeOrder("DR-a", 9000, PRUNE_TICK), makeOrder("DR-b", 5, PRUNE_TICK)],
      [makeNote("SW-a", 9000, PRUNE_TICK), makeNote("SW-b", 5, PRUNE_TICK)],
    );
    const ra = cleanupHandler(mk(), tickClock(PRUNE_TICK), new EventQueue());
    const rb = cleanupHandler(mk(), tickClock(PRUNE_TICK), new EventQueue());
    expect(Array.from(ra.physicianOrders.keys()).sort()).toEqual(Array.from(rb.physicianOrders.keys()).sort());
    expect(Array.from(ra.socialWorkNotes.keys()).sort()).toEqual(Array.from(rb.socialWorkNotes.keys()).sort());
  });
});
