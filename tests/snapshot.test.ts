import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { createWorld, runWorld } from "../src/engine/world.js";
import { closeJournal, initJournal, listSnapshots, loadNearestSnapshot, saveSnapshot } from "../src/engine/journal.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";

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
    if (existsSync(DB)) unlinkSync(DB);
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
  });

  it("returns null state when no snapshot exists before tick", () => {
    closeJournal();
    if (existsSync(DB)) unlinkSync(DB);
    const snap = loadNearestSnapshot(5);
    expect(snap.state).toBeNull();
    expect(snap.tick).toBe(5);
  });

  it("can save and reload a manually created snapshot", () => {
    closeJournal();
    if (existsSync(DB)) unlinkSync(DB);
    initJournal(DB);
    const state = createState(generatePatientPool(5));
    saveSnapshot(99, state);
    const snap = loadNearestSnapshot(100);
    expect(snap.tick).toBe(99);
    expect(snap.state).not.toBeNull();
    expect(snap.state!.patients.size).toBe(5);
    expect(snap.state!.beds.size).toBeGreaterThan(0);
  });
});
