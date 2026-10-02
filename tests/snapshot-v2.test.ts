/**
 * ADR-004 D1+D3 — snapshot format v2 round-trip, old-snapshot compat, flags-OFF.
 *
 * New file (does not modify any existing test). Covers:
 *  - snapshot round-trip incl. new fields (v, queue, Phase-E macro scalars)
 *  - old-snapshot compat (no v/queue → empty queue + exactly ONE stderr warning, no throw)
 *  - flags-OFF behavior unchanged (no v/queue bytes written; resume yields empty queue)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { createWorld, resumeWorld } from "../src/engine/world.js";
import {
  closeJournal,
  initJournal,
  loadNearestSnapshot,
  saveSnapshot,
} from "../src/engine/journal.js";

let tmpDir = "";
let dbPath = "";

function readRawSnapshotState(dbFile: string, tick: number): Record<string, unknown> {
  const db = new Database(dbFile, { readonly: true });
  try {
    const row = db.prepare("SELECT state FROM world_snapshots WHERE tick = ?").get(tick) as { state: string } | undefined;
    if (!row) throw new Error(`no snapshot at tick ${tick}`);
    return JSON.parse(row.state) as Record<string, unknown>;
  } finally {
    db.close();
  }
}

beforeEach(() => {
  closeJournal();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-sv2-"));
  dbPath = path.join(tmpDir, "world-journal.db");
});

afterEach(() => {
  delete process.env.DR_DURABLE_QUEUE;
  delete process.env.DR_BOUNDED_STATE;
  closeJournal();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
});

describe("ADR-004 snapshot v2", () => {
  it("round-trips v, queue, and Phase-E macro scalars", () => {
    process.env.DR_DURABLE_QUEUE = "1";
    const w = createWorld(5, dbPath, 42);
    w.state._admissionMultiplier = 1.7;
    w.state._staffAvailabilityModifier = 0.8;
    w.state._supplyChainPressure = 0.3;
    w.state._activeMacroDisaster = "flood";
    w.queue.schedule("discharge", 5000, { patientId: "P1", encounterId: "E1", bedId: "B1" });
    w.queue.schedule("lab_result", 3, { labOrderId: "LAB-9" });
    saveSnapshot(w.clock.tick, w.state, w.queue);

    const raw = readRawSnapshotState(dbPath, w.clock.tick);
    expect(raw.v).toBe(2);
    expect(Array.isArray(raw.queue)).toBe(true);
    const queue = raw.queue as { type: string; scheduledTick: number; data: Record<string, unknown> }[];
    expect(queue).toHaveLength(2);
    // Ordered pending-event shape only: no ids, insertion order kept.
    expect(queue[0]).toEqual({ type: "discharge", scheduledTick: 5000, data: { patientId: "P1", encounterId: "E1", bedId: "B1" } });
    expect(queue[1]).toEqual({ type: "lab_result", scheduledTick: 3, data: { labOrderId: "LAB-9" } });
    expect(raw.admissionMultiplier).toBe(1.7);
    expect(raw.staffAvailabilityModifier).toBe(0.8);
    expect(raw.supplyChainPressure).toBe(0.3);
    expect(raw.activeMacroDisaster).toBe("flood");

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    expect(snap.state!._admissionMultiplier).toBe(1.7);
    expect(snap.state!._staffAvailabilityModifier).toBe(0.8);
    expect(snap.state!._supplyChainPressure).toBe(0.3);
    expect(snap.state!._activeMacroDisaster).toBe("flood");

    const resumed = resumeWorld(snap.state!, snap.tick, dbPath);
    expect(resumed.queue.pending()).toBe(2);
  });

  it("old snapshot without v/queue resumes with empty queue + exactly ONE warning, never throws", () => {
    // Write a legacy-format snapshot with flags OFF (no v/queue keys).
    delete process.env.DR_DURABLE_QUEUE;
    initJournal(dbPath);
    const w = createWorld(5, undefined, 42);
    closeJournal();
    initJournal(dbPath);
    saveSnapshot(0, w.state);
    const raw = readRawSnapshotState(dbPath, 0);
    expect("v" in raw).toBe(false);
    expect("queue" in raw).toBe(false);

    // Resume with flags ON: compat path must not throw.
    process.env.DR_DURABLE_QUEUE = "1";
    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    expect(snap.state).not.toBeNull();

    const warn = console.warn;
    const calls: unknown[][] = [];
    console.warn = (...args: unknown[]) => { calls.push(args); };
    let resumed;
    try {
      resumed = resumeWorld(snap.state!, snap.tick, dbPath);
    } finally {
      console.warn = warn;
    }
    expect(resumed.queue.pending()).toBe(0);
    expect(calls).toHaveLength(1);
    expect(String(calls[0]![0])).toMatch(/no durable queue/i);
  });

  it("flags OFF writes no v/queue keys and resume yields an empty queue", () => {
    delete process.env.DR_DURABLE_QUEUE;
    delete process.env.DR_BOUNDED_STATE;
    const w = createWorld(5, dbPath, 42);
    w.queue.schedule("lab_result", 10, { labOrderId: "LAB-A" });
    saveSnapshot(w.clock.tick, w.state, w.queue);

    const raw = readRawSnapshotState(dbPath, w.clock.tick);
    expect("v" in raw).toBe(false);
    expect("queue" in raw).toBe(false);
    // D3 gap fields stay unwritten when OFF (byte-identical to legacy).
    expect("admissionMultiplier" in raw).toBe(false);

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    const warn = console.warn;
    console.warn = () => {};
    try {
      const resumed = resumeWorld(snap.state!, snap.tick, dbPath);
      expect(resumed.queue.pending()).toBe(0);
    } finally {
      console.warn = warn;
    }
  });
});
