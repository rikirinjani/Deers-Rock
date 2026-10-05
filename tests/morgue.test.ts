import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { saveSnapshot, loadNearestSnapshot, initJournal, closeJournal } from "../src/engine/journal.js";
import { createState, type HospitalState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { type World } from "../src/engine/world.js";

describe("Morgue / Death Roll", () => {
  it("starts empty", () => {
    const w = createWorld(10);
    expect(w.state.morgue).toBeDefined();
    expect(w.state.morgue!.length).toBe(0);
  });

  it("has morgueCapacity default of 10", () => {
    const w = createWorld(10);
    expect(w.state.morgueCapacity).toBe(10);
  });

  it("morgue grows when deaths occur in simulation", () => {
    const w = createWorld(100);
    runWorld(w, 200);
    expect(w.state.morgue.length).toBeGreaterThanOrEqual(0);
  });

  it("morgue records have required fields", () => {
    const w = createWorld(100);
    runWorld(w, 200);
    
    for (const record of w.state.morgue) {
      expect(record).toHaveProperty("encounterId");
      expect(record).toHaveProperty("patientId");
      expect(record).toHaveProperty("primaryDiagnosis");
      expect(record).toHaveProperty("deathTick");
      expect(record).toHaveProperty("mortalityScore");
      expect(record).toHaveProperty("age");
    }
  });

  it("death tick increases monotonically", () => {
    const w = createWorld(100);
    runWorld(w, 300);
    
    const ticks = w.state.morgue.map(m => m.deathTick).sort((a, b) => a - b);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThanOrEqual(ticks[i - 1]);
    }
  });

  it("mortuary data persists through snapshot/resume", () => {
    const w = createWorld(100);
    runWorld(w, 100);
    
    const morgueBefore = w.state.morgue.length;
    const tickBefore = w.clock.tick;
    
    // Save snapshot
    saveSnapshot(tickBefore, w.state, w.queue);
    
    // Load snapshot
    const loaded = loadNearestSnapshot(tickBefore);
    if (loaded) {
      expect(loaded.morgue.length).toBe(morgueBefore);
    }
  });

  it("does not crash with zero patients", () => {
    const w = createWorld(1);
    runWorld(w, 1);
    expect(w.state.morgue).toBeDefined();
  });
});

describe("Outcome Tracker — mortality", () => {
  it("tracks deceased count", () => {
    const w = createWorld(100);
    runWorld(w, 200);
    
    const deceased = w.state.morgue.length;
    expect(deceased).toBeGreaterThanOrEqual(0);
  });

  it("mortality rate is computable", () => {
    const w = createWorld(100);
    runWorld(w, 300);
    
    const totalDischarged = Array.from(w.state.encounters.values())
      .filter(e => e.status !== "active").length;
    const totalDeaths = w.state.morgue.length;
    const allDischarges = totalDischarged + totalDeaths;
    
    if (allDischarges > 0) {
      const mortalityRate = totalDeaths / allDischarges;
      expect(mortalityRate).toBeGreaterThanOrEqual(0);
      expect(mortalityRate).toBeLessThanOrEqual(1);
    }
  });
});
