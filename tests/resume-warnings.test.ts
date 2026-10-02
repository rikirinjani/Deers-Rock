/**
 * ADR-004 review follow-ups (findings 1-3): resume-path warning behavior and
 * transient-prop hygiene.
 *
 * - Finding 1: OFF-mode resumes are exactly as quiet as before (no
 *   legacy-snapshot stderr warning when the durable-queue flag is OFF).
 * - Finding 2: loadNearestSnapshot strips `__durableQueue` / `__snapshotV`
 *   so no reader except the resume path ever sees them — while resumeWorld
 *   still rebuilds the queue (side channel, belt-and-braces stripping kept).
 * - Finding 3: a valid v2 resume emits no per-event spam and no drop-count
 *   warning (the drop summary fires only when entries are actually dropped).
 *
 * New file (does not modify any existing test).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createWorld, resumeWorld } from "../src/engine/world.js";
import {
  closeJournal,
  initJournal,
  loadNearestSnapshot,
  saveSnapshot,
} from "../src/engine/journal.js";

let tmpDir = "";
let dbPath = "";

function captureWarnings(): { calls: unknown[][]; restore: () => void } {
  const calls: unknown[][] = [];
  const orig = console.warn;
  console.warn = (...args: unknown[]) => { calls.push(args); };
  return { calls, restore: () => { console.warn = orig; } };
}

beforeEach(() => {
  delete process.env.DR_DURABLE_QUEUE;
  delete process.env.DR_BOUNDED_STATE;
  closeJournal();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-resw-"));
  dbPath = path.join(tmpDir, "world-journal.db");
});

afterEach(() => {
  delete process.env.DR_DURABLE_QUEUE;
  delete process.env.DR_BOUNDED_STATE;
  closeJournal();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
});

describe("ADR-004 resume warnings + transient hygiene (findings 1-3)", () => {
  it("finding 1: OFF-mode resume of a legacy snapshot emits zero warnings", () => {
    delete process.env.DR_DURABLE_QUEUE;
    initJournal(dbPath);
    const w = createWorld(5, undefined, 42);
    closeJournal();
    initJournal(dbPath);
    saveSnapshot(0, w.state);

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    expect(snap.state).not.toBeNull();
    const { calls, restore } = captureWarnings();
    try {
      const resumed = resumeWorld(snap.state!, snap.tick, dbPath);
      expect(resumed.queue.pending()).toBe(0);
    } finally {
      restore();
    }
    expect(calls).toHaveLength(0);
  });

  it("finding 2: snapshot readers see no transient props, but resume still rebuilds the queue", () => {
    process.env.DR_DURABLE_QUEUE = "1";
    const w = createWorld(5, dbPath, 42);
    w.queue.schedule("lab_result", 10, { labOrderId: "LAB-A" });
    w.queue.schedule("lab_result", 11, { labOrderId: "LAB-B" });
    saveSnapshot(w.clock.tick, w.state, w.queue);

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    expect(snap.state).not.toBeNull();
    const rec = snap.state as unknown as Record<string, unknown>;
    expect("__durableQueue" in snap.state!).toBe(false);
    expect("__snapshotV" in snap.state!).toBe(false);
    expect(rec.__durableQueue).toBeUndefined();
    expect(rec.__snapshotV).toBeUndefined();
    expect(Object.keys(snap.state!).some((k) => k.startsWith("__"))).toBe(false);

    const { calls, restore } = captureWarnings();
    try {
      const resumed = resumeWorld(snap.state!, snap.tick, dbPath);
      expect(resumed.queue.pending()).toBe(2);
      // No reader-facing leak survives the resume either.
      expect("__durableQueue" in resumed.state).toBe(false);
    } finally {
      restore();
    }
    expect(calls).toHaveLength(0);
  });

  it("finding 3: valid v2 resume emits no per-event spam and no drop summary", () => {
    process.env.DR_DURABLE_QUEUE = "1";
    const w = createWorld(5, dbPath, 42);
    w.queue.schedule("lab_result", 10, { labOrderId: "LAB-A" });
    w.queue.schedule("lab_result", 11, { labOrderId: "LAB-B" });
    w.queue.schedule("surgery_done", 12, { surgeryId: "OR-C" });
    saveSnapshot(w.clock.tick, w.state, w.queue);

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    const { calls, restore } = captureWarnings();
    try {
      const resumed = resumeWorld(snap.state!, snap.tick, dbPath);
      expect(resumed.queue.pending()).toBe(3);
    } finally {
      restore();
    }
    expect(calls).toHaveLength(0);
  });
});
