import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { createWorld, runWorld } from "../src/engine/world.js";
import { closeJournal, initJournal, listSnapshots, loadNearestSnapshot, saveSnapshot } from "../src/engine/journal.js";
import { createState, type HospitalState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { initAgentState } from "../src/agent/system.js";
import { initReferralState } from "../src/referral/system.js";

const DB = "test-snapshot.db";

describe("Snapshots", () => {
  beforeAll(() => {
    closeJournal();
    if (existsSync(DB)) { try { unlinkSync(DB); } catch { /* ok */ } }
  });

  afterAll(() => {
    closeJournal();
    try { if (existsSync(DB)) unlinkSync(DB); } catch { /* ok */ }
  });

  it("saves snapshots every 100 ticks during simulation", { timeout: 15000 }, () => {
    closeJournal();
    if (existsSync(DB)) { try { unlinkSync(DB); } catch { /* ebusy */ } }
    const w = createWorld(10, DB);
    runWorld(w, 210);
    const snaps = listSnapshots();
    expect(snaps.length).toBeGreaterThanOrEqual(2); // tick 100, 200
    const ticks = snaps.map(s => s.tick);
    expect(ticks).toContain(100);
    expect(ticks).toContain(200);
  });

  it("loadNearestSnapshot returns state at or before given tick", () => {
    const snap = loadNearestSnapshot(150);
    expect(snap.tick).toBe(100);
    expect(snap.state).not.toBeNull();
    expect(snap.state!.encounters.size).toBeGreaterThan(0);
  });

  it("returns snapshot at exact tick when available", () => {
    const snap = loadNearestSnapshot(100);
    expect(snap.tick).toBe(100);
  });

  it("saved snapshot has all state collections intact", () => {
    const snap = loadNearestSnapshot(200);
    expect(snap.state).not.toBeNull();
    const s = snap.state!;
    expect(s.patients.size).toBeGreaterThan(0);
    expect(s.beds.size).toBeGreaterThan(0);
    expect(s.wardCapacity).toBeDefined();
    expect(typeof s.waitingRoom).toBe("number");
    expect(s._agentState.pool.agents.size).toBeGreaterThanOrEqual(0);
    expect(s._agentState.pool.assignments.size).toBeGreaterThanOrEqual(0);
    expect(s._referralState.facilities.size).toBeGreaterThanOrEqual(0);
    expect(s._referralState.incomingQueue).toBeDefined();
  });

  it("returns null state when no snapshot exists before tick", () => {
    closeJournal();
    if (existsSync(DB)) { try { unlinkSync(DB); } catch { /* ebusy */ } }
    const snap = loadNearestSnapshot(5);
    expect(snap.state).toBeNull();
    expect(snap.tick).toBe(5);
  });

  it("can save and reload a manually created snapshot", () => {
    closeJournal();
    if (existsSync(DB)) { try { unlinkSync(DB); } catch { /* ebusy */ } }
    initJournal(DB);
    const state = createState(generatePatientPool(5));
    saveSnapshot(99, state);
    const snap = loadNearestSnapshot(100);
    expect(snap.tick).toBe(99);
    expect(snap.state).not.toBeNull();
    expect(snap.state!.patients.size).toBe(5);
    expect(snap.state!.beds.size).toBeGreaterThan(0);
  });

  it("preserves agent state and referral state across save/load round-trip", () => {
    closeJournal();
    if (existsSync(DB)) { try { unlinkSync(DB); } catch { /* ebusy */ } }
    initJournal(DB);
    const patients = generatePatientPool(3);
    const state = createState(patients);
    const agent = initAgentState();
    agent.pool.agents.set("dr-001", {
      id: "dr-001", identity: { name: "Dr. Test", gender: "male", age: 35 },
      specialty: "umum", license: { str: "123", sip: "456", skp: "789" },
      status: { shift: "pagi", inShift: true, shiftStartTick: 0, totalShiftTicks: 10,
        consecutiveTicks: 5, kelelahan: 5, kesehatan: "sehat", sakitTerhitung: 0,
        isHaids: false, haidCycleDay: 0, isHamil: false, hamilWeeks: 0,
        fatigue: 5, stressLevel: 10, performance: 90 },
      schedule: [], metrics: { totalCases: 5, avgOutcome: 0.8 },
    });
    agent.pool.assignments.set("enc-001", "dr-001");
    const ref = initReferralState();
    ref.incomingQueue.push({ letterId: "ltr-001", patientId: "pat-001", fromFacility: "puskesmas-a", tickArrived: 50 });
    const populated: HospitalState = {
      ...state,
      _agentState: agent,
      _referralState: ref,
    };
    saveSnapshot(50, populated);
    const snap = loadNearestSnapshot(50);
    expect(snap.state).not.toBeNull();
    const s = snap.state!;
    expect(s._agentState.pool.agents.size).toBe(1);
    expect(s._agentState.pool.agents.get("dr-001")).toBeDefined();
    expect(s._agentState.pool.agents.get("dr-001")!.identity.name).toBe("Dr. Test");
    expect(s._agentState.pool.assignments.size).toBe(1);
    expect(s._agentState.pool.assignments.get("enc-001")).toBe("dr-001");
    expect(s._referralState.facilities.size).toBe(35);
    expect(s._referralState.incomingQueue.length).toBe(1);
    expect(s._referralState.incomingQueue[0].letterId).toBe("ltr-001");
    expect(s._referralState.incomingQueue[0].fromFacility).toBe("puskesmas-a");
  });
});
