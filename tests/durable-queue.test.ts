/**
 * ADR-004 D1 — durable queue: resume preserves pending events.
 *
 * New file (does not modify any existing test). Covers:
 *  - resume-preserves-queue (schedule → snapshot → resume → fire exactly once, in order)
 *  - insertion order preserved exactly (no re-sort, no dedup), incl. same-tick ties
 *  - resumed events flow through step() and never refire
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createWorld, runWorld, resumeWorld } from "../src/engine/world.js";
import {
  closeJournal,
  loadNearestSnapshot,
  saveSnapshot,
} from "../src/engine/journal.js";

let tmpDir = "";
let dbPath = "";

beforeEach(() => {
  process.env.DR_DURABLE_QUEUE = "1";
  delete process.env.DR_BOUNDED_STATE;
  closeJournal();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-dq-"));
  dbPath = path.join(tmpDir, "world-journal.db");
});

afterEach(() => {
  delete process.env.DR_DURABLE_QUEUE;
  delete process.env.DR_BOUNDED_STATE;
  closeJournal();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
});

describe("ADR-004 D1 durable queue", () => {
  it("resume preserves pending events in order and fires them exactly once", () => {
    const w = createWorld(5, dbPath, 42);
    w.queue.schedule("lab_result", 10, { labOrderId: "LAB-A" });
    w.queue.schedule("lab_result", 11, { labOrderId: "LAB-B" });
    w.queue.schedule("surgery_done", 12, { surgeryId: "OR-C" });
    expect(w.queue.pending()).toBe(3);

    saveSnapshot(w.clock.tick, w.state, w.queue);
    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    expect(snap.state).not.toBeNull();

    // Silence the compat warning for v2 snapshots: none expected here.
    const warn = console.warn;
    let warnings = 0;
    console.warn = () => { warnings++; };
    let resumed;
    try {
      resumed = resumeWorld(snap.state!, snap.tick, dbPath);
    } finally {
      console.warn = warn;
    }
    expect(warnings).toBe(0);
    expect(resumed.queue.pending()).toBe(3);

    const due = resumed.queue.dueEvents(12);
    expect(due.map((e) => (e.data as { labOrderId?: string; surgeryId?: string }).labOrderId ?? (e.data as { surgeryId?: string }).surgeryId))
      .toEqual(["LAB-A", "LAB-B", "OR-C"]);
    expect(due.map((e) => e.type)).toEqual(["lab_result", "lab_result", "surgery_done"]);
    // Exactly once: already consumed.
    expect(resumed.queue.dueEvents(12)).toHaveLength(0);
    expect(resumed.queue.pending()).toBe(0);
  });

  it("preserves insertion order exactly for same-tick events (no re-sort, no dedup)", () => {
    const w = createWorld(5, dbPath, 7);
    w.queue.schedule("lab_result", 20, { labOrderId: "X" });
    w.queue.schedule("lab_result", 20, { labOrderId: "Y" });
    w.queue.schedule("lab_result", 20, { labOrderId: "X" }); // duplicate payload stays duplicated
    saveSnapshot(w.clock.tick, w.state, w.queue);

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    const resumed = resumeWorld(snap.state!, snap.tick, dbPath);
    const due = resumed.queue.dueEvents(20);
    expect(due).toHaveLength(3);
    expect(due.map((e) => (e.data as { labOrderId: string }).labOrderId)).toEqual(["X", "Y", "X"]);
  });

  it("resumed events flow through step() and never refire", () => {
    const w = createWorld(5, dbPath, 42);
    w.queue.schedule("admission_surge", 5, { multiplier: 2.0 });
    w.queue.schedule("admission_surge", 6, { multiplier: 3.0 });
    saveSnapshot(w.clock.tick, w.state, w.queue);

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    let resumed = resumeWorld(snap.state!, snap.tick, dbPath);
    resumed = runWorld(resumed, 10);
    // Both surges fired in order; last write wins.
    expect(resumed.state._admissionMultiplier).toBe(3.0);
    // No refire on further ticks.
    resumed = runWorld(resumed, 10);
    expect(resumed.state._admissionMultiplier).toBe(3.0);
  });
});
