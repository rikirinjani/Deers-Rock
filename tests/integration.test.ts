import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { createWorld, runWorld } from "../src/engine/world.js";
import { closeJournal, loadNearestSnapshot } from "../src/engine/journal.js";
import type { HospitalState } from "../src/engine/state-store.js";

/**
 * Epic IV M4.3 — end-to-end integration tests.
 *
 * These exercise the world as a whole (boot -> tick loop -> persistence)
 * rather than any single handler. Each test builds a fresh world so they
 * are order-independent and self-contained. Determinism relies on the
 * same-process counter resets performed by createWorld (Phase B).
 *
 * Bed count invariant: createState with no custom wardCapacity lays out
 * BUILDING_LAYOUT (state-store.ts): Executive Pavilion 12, Internal
 * Medicine 30, Neurology 8, Pulmonology 8, Pediatrics 10, OBGYN 10,
 * NICU 6, PICU 6, Cardiology 10, ICU 16, HCU 15 = 131 beds.
 */
describe("Integration (Epic IV M4.3)", () => {
  const SNAPSHOT_DB = "test-integration-journal.db";

  beforeAll(() => {
    closeJournal();
  });

  afterAll(() => {
    closeJournal();
    try { if (existsSync(SNAPSHOT_DB)) unlinkSync(SNAPSHOT_DB); } catch { /* EBUSY on some platforms */ }
  });

  function occupiedBedCount(state: HospitalState): number {
    return Array.from(state.beds.values()).filter(b => b.patientId !== null).length;
  }

  /**
   * Order-independent structural fingerprint of the state. Only JSON-safe
   * scalar projections are compared so the fingerprint is identical for a
   * live in-memory state and a journal round-tripped one (where `undefined`
   * optional fields are absent rather than present-with-undefined).
   */
  function stateFingerprint(s: HospitalState): string {
    const byId = <T>(entries: [string, T][], project: (v: T) => Record<string, unknown>) =>
      entries
        .map(([id, v]) => ({ id, ...project(v) }))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const sortedIds = (m: Map<string, unknown>) => Array.from(m.keys()).sort();
    return JSON.stringify({
      patientIds: sortedIds(s.patients),
      encounters: byId(Array.from(s.encounters.entries()), e => ({
        patientId: e.patientId, type: e.type, status: e.status,
        startTime: e.startTime, endTime: e.endTime,
      })),
      charges: byId(Array.from(s.charges.entries()), c => ({
        encounterId: c.encounterId, patientId: c.patientId,
        category: c.category, amount: c.amount, paid: c.paid,
      })),
      beds: byId(Array.from(s.beds.entries()), b => ({ patientId: b.patientId })),
      labOrderIds: sortedIds(s.labOrders),
      medicationOrderIds: sortedIds(s.medicationOrders),
      radiologyOrderIds: sortedIds(s.radiologyOrders),
      claimIds: sortedIds(s.insuranceClaims),
      paymentIds: sortedIds(s.payments),
      waitingRoom: s.waitingRoom,
      morgueSize: s.morgue.length,
      outcomeRecordCount: s._outcomeRecords.length,
    });
  }

  it("world boots and produces initial state", { timeout: 15_000 }, () => {
    const w = createWorld(50, undefined, 42);
    expect(w.clock.tick).toBe(0);
    expect(w.state.patients.size).toBe(50);
    expect(w.state.beds.size).toBe(131);
    expect(w.state.encounters.size).toBe(0);
    expect(w.journalPath).toBeNull();
    expect(w.clock.rngSeed).toBe(42);
  });

  it("100 ticks produces admissions and encounters", { timeout: 15_000 }, () => {
    const result = runWorld(createWorld(50, undefined, 42), 100);
    expect(result.clock.tick).toBe(100);
    expect(result.state.encounters.size).toBeGreaterThan(0);
    expect(occupiedBedCount(result.state)).toBeGreaterThan(0);
  });

  it("deterministic replay: same seed produces identical state after 200 ticks", { timeout: 15_000 }, () => {
    const runA = runWorld(createWorld(50, undefined, 42), 200);
    const runB = runWorld(createWorld(50, undefined, 42), 200);
    expect(runA.clock.tick).toBe(200);
    expect(runB.clock.tick).toBe(200);
    expect(stateFingerprint(runA.state)).toBe(stateFingerprint(runB.state));
  });

  it("snapshot round-trip preserves state", { timeout: 15_000 }, () => {
    closeJournal();
    try { if (existsSync(SNAPSHOT_DB)) unlinkSync(SNAPSHOT_DB); } catch { /* ok */ }
    // Journaling worlds auto-save a snapshot every 100 ticks (step()).
    const w = runWorld(createWorld(50, SNAPSHOT_DB, 42), 100);
    expect(w.clock.tick).toBe(100);
    const snap = loadNearestSnapshot(100);
    expect(snap.tick).toBe(100);
    expect(snap.state).not.toBeNull();
    // Snapshot preserves structural invariants; patient count may differ if
    // DR_ADMISSION_RATE generates new patients during the run — compare fingerprints.
    expect(snap.state!.beds.size).toBe(131);
    expect(stateFingerprint(snap.state!)).toBe(stateFingerprint(w.state));
  });
});
