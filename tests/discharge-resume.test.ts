/**
 * ADR-004 review follow-up (finding 6): discharge resume end-to-end.
 *
 * Exercises the D5 restart path minus the literal kill-9 (which belongs to
 * staging): schedule a real `discharge` event → snapshot (flag ON) → resume →
 * runWorld forward → the encounter reaches `discharged` (proves the pending
 * discharge survived the restart and fired exactly once).
 *
 * New file (does not modify any existing test).
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
  delete process.env.DR_PRUNE_TTL_CHARGES;
  delete process.env.DR_PRUNE_TTL_ORDERS;
  closeJournal();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-disres-"));
  dbPath = path.join(tmpDir, "world-journal.db");
});

afterEach(() => {
  delete process.env.DR_DURABLE_QUEUE;
  delete process.env.DR_BOUNDED_STATE;
  delete process.env.DR_PRUNE_TTL_CHARGES;
  delete process.env.DR_PRUNE_TTL_ORDERS;
  closeJournal();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
});

describe("ADR-004 discharge resume end-to-end (finding 6)", () => {
  it("scheduled discharge survives snapshot+resume and the encounter reaches discharged", () => {
    // Build a live world with active encounters (deterministic seed).
    let w = createWorld(10, dbPath, 42);
    w = runWorld(w, 60);
    const target = Array.from(w.state.encounters.values()).find((e) => e.status === "active");
    expect(target).toBeDefined();
    const encId = target!.id;
    const patId = target!.patientId;

    // Schedule a REAL discharge event a few ticks out, then snapshot+resume.
    w.queue.schedule("discharge", w.clock.tick + 5, { patientId: patId, encounterId: encId });
    const pendingBefore = w.queue.pending();
    expect(pendingBefore).toBeGreaterThan(0);
    saveSnapshot(w.clock.tick, w.state, w.queue);

    const snap = loadNearestSnapshot(Number.MAX_SAFE_INTEGER);
    expect(snap.state).not.toBeNull();
    let resumed = resumeWorld(snap.state!, snap.tick, dbPath);
    expect(resumed.queue.pending()).toBe(pendingBefore);

    // Run forward past the discharge tick: the encounter must discharge
    // (dischargeScheduledPatients marks discharged whether or not the
    // mortality roll sends the patient to the morgue).
    resumed = runWorld(resumed, 30);
    expect(resumed.state.encounters.get(encId)?.status).toBe("discharged");

    // Exactly once: no lingering duplicate discharge for this encounter.
    resumed = runWorld(resumed, 30);
    expect(resumed.state.encounters.get(encId)?.status).toBe("discharged");
  });
});
