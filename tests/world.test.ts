import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { createWorld, step, runWorld, type World } from "../src/engine/world.js";
import { formatHospitalTime } from "../src/engine/clock.js";

describe("World", () => {
  it("creates a world with patients and beds", () => {
    const w = createWorld(10);
    expect(w.state.patients.size).toBe(10);
    expect(w.state.beds.size).toBeGreaterThan(0);
    expect(w.clock.tick).toBe(0);
    expect(w.journalPath).toBeNull();
  });

  it("advances on step", () => {
    const w = createWorld(5);
    const w2 = step(w);
    expect(w2.clock.tick).toBe(1);
  });

  it("processes admissions over multiple steps", () => {
    const w = createWorld(50);
    const result = runWorld(w, 20);
    expect(result.clock.tick).toBe(20);
    const totalEncounters = result.state.encounters.size;
    expect(totalEncounters).toBeGreaterThan(0);
  });

  it("formats time after running", () => {
    const w = createWorld(5);
    const result = runWorld(w, 60);
    const time = formatHospitalTime(result.clock);
    expect(time).toContain(":");
  });
});

// Structural invariants that must hold at EVERY tick boundary (each bed holds
// at most one patient; waitingRoom is clamped >= 0 by markov.ts; morgue is an
// array). Checked per chunk below, which strengthens the original
// tick-1000-only checks into checks at 125/250/.../1000 ticks.
function expectTickInvariants(w: World): void {
  const s = w.state;
  const totalBeds = s.beds.size;
  const occupiedBeds = Array.from(s.beds.values()).filter(b => b.patientId).length;
  expect(occupiedBeds).toBeLessThanOrEqual(totalBeds);
  expect(s.waitingRoom).toBeGreaterThanOrEqual(0);
  expect(s.morgue.length).toBeGreaterThanOrEqual(0);
}

// "runs 1000+ ticks without crash" — chunked into 8 x 125 ticks.
//
// Why chunked AND yielding (P0-1; the vitest-worker RPC failure this guards
// against is documented in vitest.config.ts):
//
// 1. The vitest worker RPC (birpc "onTaskUpdate" round-trips) has a
//    hard-coded, non-configurable 60s timeout. A monolithic 1000-tick
//    runWorld() is a single ~100s+ synchronous block (measured 100.2s clean,
//    ~150s+ under load), which both blocks the worker's event loop for the
//    whole run and keeps the file's total sync-dominated stretch far above
//    60s — the exact conditions under which the worker RPC timed out and
//    failed the suite with exit 1 despite all tests passing.
// 2. runWorld() is a step loop, so chaining runWorld(runWorld(w, 125), 125)...
//    is tick-for-tick identical to runWorld(w, 1000). Chunks keep every
//    synchronous block far below 60s (<= 24s for the heaviest chunk on this
//    machine), and the afterEach macrotask yield below lets the worker event
//    loop process pending RPC round-trips at every chunk boundary, so
//    in-flight calls settle immediately instead of aging toward the timeout.
//
// The world is built once and shared across the chunk tests (load hardening,
// P0-2: nothing here depends on a fresh world — it is one continuous
// endurance run; any chunk that throws fails its own test, strictly earlier
// than the original monolithic test could).
//
// Assertion strength is preserved and improved:
// - the full 1000 ticks still execute and each chunk asserts its tick
//   progress plus the structural invariants (checked at 125/250/.../1000
//   instead of only at 1000);
// - the final test keeps every assertion of the original tick-1000 check.
describe("World endurance — 1000+ ticks without crash (chunked)", () => {
  const TICKS_PER_CHUNK = 125;
  const TOTAL_TICKS = 8 * TICKS_PER_CHUNK; // 1000

  let w: World;

  beforeAll(() => {
    w = createWorld(100);
  });

  // Force one macrotask turn after every test so the worker processes
  // pending RPC responses between chunks (see comment above).
  afterEach(async () => {
    await new Promise<void>(resolve => setImmediate(resolve));
  });

  it("runs chunk 1/8 (ticks 1-125) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(1 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("runs chunk 2/8 (ticks 126-250) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(2 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("runs chunk 3/8 (ticks 251-375) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(3 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("runs chunk 4/8 (ticks 376-500) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(4 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("runs chunk 5/8 (ticks 501-625) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(5 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("runs chunk 6/8 (ticks 626-750) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(6 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("runs chunk 7/8 (ticks 751-875) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(7 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("runs chunk 8/8 (ticks 876-1000) without crash and maintains tick invariants", { timeout: 120_000 }, () => {
    w = runWorld(w, TICKS_PER_CHUNK);
    expect(w.clock.tick).toBe(8 * TICKS_PER_CHUNK);
    expectTickInvariants(w);
  });

  it("maintains all invariants in the final state after the full 1000 ticks", () => {
    expect(w.clock.tick).toBe(TOTAL_TICKS);
    const s = w.state;
    expect(s.patients.size).toBeGreaterThan(0);
    const totalBeds = s.beds.size;
    const occupiedBeds = Array.from(s.beds.values()).filter(b => b.patientId).length;
    expect(occupiedBeds).toBeLessThanOrEqual(totalBeds);
    expect(s.encounters.size).toBeGreaterThan(0);
    expect(s.waitingRoom).toBeGreaterThanOrEqual(0);
    const labs = s.labOrders.size;
    const meds = s.medicationOrders.size;
    const rads = s.radiologyOrders.size;
    const charges = s.charges.size;
    expect(labs + meds + rads + charges).toBeGreaterThan(0);
    const activeEncs = Array.from(s.encounters.values()).filter(e => e.status === "active");
    const activeInpatient = activeEncs.filter(e => e.type === "inpatient").length;
    const activeOutpatient = activeEncs.filter(e => e.type === "outpatient").length;
    expect(activeInpatient).toBeLessThanOrEqual(totalBeds);
    expect(activeOutpatient + activeInpatient).toBe(activeEncs.length);
    expect(s.morgue.length).toBeGreaterThanOrEqual(0);
    expect(s._outcomeRecords.length).toBeGreaterThan(0);
    const outcomes = s._outcomeRecords;
    const deceased = outcomes.filter(o => o.outcome === "deceased").length;
    const improved = outcomes.filter(o => o.outcome === "improved").length;
    const deteriorated = outcomes.filter(o => o.outcome === "deteriorated").length;
    expect(deceased + improved + deteriorated).toBe(outcomes.length);
    expect(s._doctorCaseMemory.size).toBeGreaterThan(0);
    expect(s._nurseCaseMemory.size).toBeGreaterThan(0);
    expect(s._pharmacyCaseMemory.size).toBeGreaterThan(0);
    expect(s._mmConferences.length).toBeGreaterThanOrEqual(0);
  });
});
