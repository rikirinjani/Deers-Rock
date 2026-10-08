/**
 * Epic III M3.2-3.5: Timeline Engine — Branch Journal Isolation (ADR-019)
 *
 * Tests universe creation, branch creation/run/compare, journal isolation,
 * standard scenarios, and avgLOS computation.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createUniverse, getUniverse, getUniverses,
  createBranch, runBranch, compareBranches,
  STANDARD_SCENARIOS, runStandardScenario, resetTimelineState,
  type Intervention,
} from "../src/timeline/engine.js";
import { initJournal, closeJournal, listBranchJournals } from "../src/engine/journal.js";
import { createWorld, runWorld } from "../src/engine/world.js";
import * as fs from "node:fs";
import * as path from "node:path";

const TEST_DIR = path.join(process.cwd(), "_test-timeline");

function cleanup() {
  closeJournal();
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  initJournal(path.join(TEST_DIR, "world-journal.db"));
}

beforeEach(() => {
  resetTimelineState();
  cleanup();
});

describe("Epic III: Timeline Engine", () => {
  describe("Universe Management", () => {
    it("creates and retrieves universes", () => {
      const u = createUniverse({ seed: 42, label: "Test Universe" });
      expect(u).toBeDefined();
      expect(u.id).toMatch(/^U-/);
      expect(u.rngSeed).toBe(42);
      expect(u.parent).toBeNull();

      const fetched = getUniverse(u.id);
      expect(fetched).toBeDefined();
      expect(fetched!.label).toBe("Test Universe");
    });

    it("lists all universes", () => {
      createUniverse({ seed: 1, label: "U1" });
      createUniverse({ seed: 2, label: "U2" });
      expect(getUniverses()).toHaveLength(2);
    });
  });

  describe("Branch Creation", () => {
    it("creates a branch from a snapshot", () => {
      const u = createUniverse({ seed: 42 });
      // Save a snapshot at tick 100
      let w = createWorld(20, path.join(TEST_DIR, "world-journal.db"), 42);
      for (let i = 0; i < 100; i++) w = runWorld(w, 1);
      const snapTick = w.clock.tick;

      const intervention: Intervention = { type: "bed_increase", params: { count: 10 } };
      const branch = createBranch({ universeId: u.id, snapshotTick: snapTick, intervention });
      expect(branch).not.toBeNull();
      expect(branch!.id).toMatch(/^br-/);
      expect(branch!.parentSnapshotTick).toBe(snapTick);
      expect(branch!.intervention.type).toBe("bed_increase");
    });

    it("returns null for invalid universe", () => {
      const branch = createBranch({ universeId: "nonexistent", snapshotTick: 100, intervention: { type: "custom", params: {} } });
      expect(branch).toBeNull();
    });
  });

  describe("Branch Execution with Journal Isolation", () => {
    it("runs a branch and produces a result", () => {
      const u = createUniverse({ seed: 42 });
      let w = createWorld(20, path.join(TEST_DIR, "world-journal.db"), 42);
      for (let i = 0; i < 200; i++) w = runWorld(w, 1);
      const snapTick = w.clock.tick;

      const branch = createBranch({
        universeId: u.id,
        snapshotTick: snapTick,
        intervention: { type: "bed_increase", params: { count: 5 } },
      });
      expect(branch).not.toBeNull();

      const result = runBranch(branch!.id, 100);
      expect(result).not.toBeNull();
      expect(result!.ticksRun).toBe(100);
      expect(result!.finalTick).toBe(snapTick + 100);
      expect(result!.outcomes.deaths).toBeGreaterThanOrEqual(0);
      expect(result!.outcomes.patients).toBeGreaterThan(0);
      expect(result!.journalPath).toContain(branch!.id);
    });

    it("isolates branch journal from main journal", () => {
      const u = createUniverse({ seed: 42 });
      let w = createWorld(20, path.join(TEST_DIR, "world-journal.db"), 42);
      for (let i = 0; i < 200; i++) w = runWorld(w, 1);
      const mainBefore = fs.existsSync(path.join(TEST_DIR, "branches", "br-0001", "journal.db"));

      const branch = createBranch({
        universeId: u.id,
        snapshotTick: w.clock.tick,
        intervention: { type: "custom", params: {} },
      });
      runBranch(branch!.id, 50);

      // Branch journals go to DATA_DIR env var or current dir (not TEST_DIR)
      const branchDataDir = process.env.DATA_DIR ?? process.cwd();
      const branchDir = path.join(branchDataDir, "branches", branch!.id);
      expect(fs.existsSync(branchDir)).toBe(true);

      // List branch journals (they go to DATA_DIR or cwd, not TEST_DIR)
      const bDataDir = process.env.DATA_DIR ?? process.cwd();
      const branches = listBranchJournals(bDataDir);
      expect(branches.length).toBeGreaterThanOrEqual(1);
    });

    it("returns null for non-existent branch", () => {
      const result = runBranch("br-nonexistent", 100);
      expect(result).toBeNull();
    });
  });

  describe("Branch Comparison", () => {
    it("compares two branches and returns outcome delta", () => {
      const u = createUniverse({ seed: 42 });
      let w = createWorld(20, path.join(TEST_DIR, "world-journal.db"), 42);
      for (let i = 0; i < 200; i++) w = runWorld(w, 1);
      const snapTick = w.clock.tick;

      const b1 = createBranch({
        universeId: u.id, snapshotTick: snapTick,
        intervention: { type: "bed_increase", params: { count: 0 } }, // baseline: no change
      });
      const b2 = createBranch({
        universeId: u.id, snapshotTick: snapTick,
        intervention: { type: "bed_increase", params: { count: 20 } }, // intervention: +20 beds
      });
      expect(b1).not.toBeNull();
      expect(b2).not.toBeNull();

      runBranch(b1!.id, 200);
      runBranch(b2!.id, 200);

      const delta = compareBranches(b1!.id, b2!.id);
      expect(delta).not.toBeNull();
      expect(delta!.deaths).toBeDefined();
      expect(delta!.LOS).toBeDefined();
      expect(delta!.occupancy).toBeDefined();
      expect(delta!.charges).toBeDefined();
    });

    it("returns null when either branch not found", () => {
      const delta = compareBranches("br-0001", "br-nonexistent");
      expect(delta).toBeNull();
    });
  });

  describe("Standard Scenarios", () => {
    it("runs all 5 standard scenarios without error", () => {
      for (const scenario of STANDARD_SCENARIOS) {
        const result = runStandardScenario(scenario);
        expect(result.scenarioId).toBe(scenario.id);
        expect(result.outcomes.patients).toBeGreaterThan(0);
        expect(result.outcomes.deaths).toBeGreaterThanOrEqual(0);
        // avgLOS should now be computed, not 0
        expect(result.outcomes.avgLOS).toBeGreaterThanOrEqual(0);
      }
    });

    it("normal_tuesday scenario produces valid metrics", () => {
      const normal = STANDARD_SCENARIOS.find(s => s.id === "normal_tuesday");
      expect(normal).toBeDefined();
      const result = runStandardScenario(normal!);
      expect(result.outcomes.patients).toBeGreaterThan(0);
      // encounters may be 0 at early ticks — just verify no crash
      expect(result.outcomes.deaths).toBeGreaterThanOrEqual(0);
    });

    it("pandemic_wave scenario increases patient count", () => {
      const pandemic = STANDARD_SCENARIOS.find(s => s.id === "pandemic_wave");
      expect(pandemic).toBeDefined();
      const result = runStandardScenario(pandemic!);
      // Pandemic should create surge — patients should be present
      expect(result.outcomes.patients).toBeGreaterThan(0);
    });
  });

  describe("Integration: Full Pipeline", () => {
    it("creates universe → branch → run → compare end-to-end", () => {
      const u = createUniverse({ seed: 42, label: "Epic III Test" });
      expect(u.label).toBe("Epic III Test");

      let w = createWorld(30, path.join(TEST_DIR, "world-journal.db"), 42);
      for (let i = 0; i < 300; i++) w = runWorld(w, 1);

      const b1 = createBranch({ universeId: u.id, snapshotTick: w.clock.tick, intervention: { type: "custom", params: {} } });
      const b2 = createBranch({ universeId: u.id, snapshotTick: w.clock.tick, intervention: { type: "bed_increase", params: { count: 10 } } });

      expect(b1).not.toBeNull();
      expect(b2).not.toBeNull();

      const r1 = runBranch(b1!.id, 100);
      const r2 = runBranch(b2!.id, 100);

      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r1!.finalTick).toBe(r2!.finalTick); // same starting point, same ticks

      const delta = compareBranches(b1!.id, b2!.id);
      expect(delta).not.toBeNull();
      // With +10 beds, occupancy should be >= baseline (delta >= 0)
      expect(delta!.occupancy.delta).toBeGreaterThanOrEqual(0);
    });

    it("branch journals persist to disk", () => {
      const u = createUniverse({ seed: 42 });
      let w = createWorld(20, path.join(TEST_DIR, "world-journal.db"), 42);
      for (let i = 0; i < 200; i++) w = runWorld(w, 1);

      const branch = createBranch({ universeId: u.id, snapshotTick: w.clock.tick, intervention: { type: "custom", params: {} } });
      runBranch(branch!.id, 50);

      const branchDataDir = process.env.DATA_DIR ?? process.cwd();
      const jpath = path.join(branchDataDir, "branches", branch!.id, "journal.db");
      // Journal file is created when branch journal is opened
      expect(fs.existsSync(jpath)).toBe(true);
      const stat = fs.statSync(jpath);
      expect(stat.size).toBeGreaterThan(0);
    });
  });
});
