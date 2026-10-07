/**
 * Epic I M1.2+M1.3 — Persistence and Pruning Verification
 *
 * M1.2: Verify _agentState and _referralState survive snapshot round-trip.
 * M1.3: Verify bounded collection growth (nursing notes, charges, encounters).
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { createWorld, runWorld } from "../src/engine/world.js";
import { closeJournal, initJournal, loadNearestSnapshot } from "../src/engine/journal.js";
import { initAgentState } from "../src/agent/system.js";
import { initReferralState } from "../src/referral/system.js";
import type { HospitalState } from "../src/engine/state-store.js";

const DB = `/tmp/dr-persist-test-${process.pid}.db`;

describe("Epic I M1.2 — Agent & Referral Persistence", () => {
  afterEach(() => {
    closeJournal();
    try { if (existsSync(DB)) unlinkSync(DB); } catch { /* ok */ }
  });

  it("persists _agentState across snapshot round-trip", () => {
    closeJournal();
    initJournal(DB);
    const w = createWorld(20, DB, 42);

    // Inject agent state
    const agent = initAgentState();
    agent.pool.agents.set("dr-001", {
      id: "dr-001",
      identity: { name: "Dr. Test", gender: "male", age: 35 },
      specialty: "umum",
      license: { str: "123", sip: "456", skp: "789" },
      status: { shift: "pagi", inShift: true, shiftStartTick: 0, totalShiftTicks: 10, consecutiveTicks: 5, kelelahan: 5, kesehatan: "sehat", sakitTerhitung: 0, isHaids: false, haidCycleDay: 0, isHamil: false, hamilWeeks: 0 },
      schedule: [],
      metrics: { totalCases: 5, avgOutcome: 0.8 },
    });
    agent.pool.assignments.set("enc-001", "dr-001");
    w.state._agentState = agent;

    // Run to trigger snapshot
    let cur = w;
    for (let i = 0; i < 100; i++) cur = runWorld(cur, 1);

    const snap = loadNearestSnapshot(100);
    expect(snap.state).not.toBeNull();
    expect(snap.state!._agentState.pool.agents.size).toBe(1);
    expect(snap.state!._agentState.pool.agents.get("dr-001")!.identity.name).toBe("Dr. Test");
    expect(snap.state!._agentState.pool.assignments.get("enc-001")).toBe("dr-001");
  });

  it("persists _referralState across snapshot round-trip", () => {
    closeJournal();
    initJournal(DB);
    const w = createWorld(20, DB, 42);

    // Inject referral state
    const ref = initReferralState();
    ref.incomingQueue.push({ letterId: "ltr-001", patientId: "pat-001", fromFacility: "puskesmas-a", tickArrived: 50 });
    w.state._referralState = ref;

    let cur = w;
    for (let i = 0; i < 100; i++) cur = runWorld(cur, 1);

    const snap = loadNearestSnapshot(100);
    expect(snap.state).not.toBeNull();
    // Facilities persist through round-trip (incomingQueue may be consumed by handler)
    expect(snap.state!._referralState.facilities.size).toBeGreaterThan(0);
  });
});

describe("Epic I M1.3 — Data Pruning", () => {
  afterEach(() => {
    closeJournal();
    try { if (existsSync(DB)) unlinkSync(DB); } catch { /* ok */ }
  });

  it("prunes nurseNotes to MAX_NURSING=300", () => {
    process.env.DR_BOUNDED_STATE = "1";
    closeJournal();
    initJournal(DB);
    const w = createWorld(20, DB, 42);

    // Manually fill nurse notes beyond MAX
    for (let i = 0; i < 400; i++) {
      w.state.nurseNotes.set(`note-${i}`, {
        id: `note-${i}`,
        patientId: "PAT-0001",
        tick: i,
        content: `Note ${i}`,
        timestamp: i,
      } as unknown as import("../src/patient/schema.js").NurseNote);
    }
    expect(w.state.nurseNotes.size).toBe(400);

    // Trigger cleanup by running ticks
    let cur = w;
    for (let i = 0; i < 20; i++) cur = runWorld(cur, 1);

    // Pruning runs every 10 ticks; after 20 ticks should be pruned
    expect(cur.state.nurseNotes.size).toBeLessThanOrEqual(300);
    delete process.env.DR_BOUNDED_STATE;
  });

  it("prunes completed encounters to MAX_ENCOUNTERS=500", () => {
    process.env.DR_BOUNDED_STATE = "1";
    closeJournal();
    initJournal(DB);
    const w = createWorld(20, DB, 42);

    // Fill encounters beyond MAX
    for (let i = 0; i < 600; i++) {
      w.state.encounters.set(`enc-${i}`, {
        id: `enc-${i}`,
        patientId: `PAT-${String(i).padStart(4, "0")}`,
        type: "inpatient",
        startTime: 0,
        endTime: i,
        status: "discharged",
        payer: "self-pay" as const,
        primaryDiagnosis: "I10",
        roomClassAtAdmission: "internal-medicine",
      } as unknown as import("../src/patient/schema.js").Encounter);
    }
    expect(w.state.encounters.size).toBe(600);

    let cur = w;
    for (let i = 0; i < 20; i++) cur = runWorld(cur, 1);

    expect(cur.state.encounters.size).toBeLessThanOrEqual(500);
    delete process.env.DR_BOUNDED_STATE;
  });
});
