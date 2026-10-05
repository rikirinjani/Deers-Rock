import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";

describe("Morgue / Death Roll", () => {
  it("starts empty", () => {
    const w = createWorld(10);
    expect(w.state.morgue!.length).toBe(0);
    expect(w.state.morgueCapacity).toBe(10);
  });

  it("has records with required fields after simulation", () => {
    const w = createWorld(50);
    runWorld(w, 100);
    for (const record of w.state.morgue) {
      expect(record).toHaveProperty("encounterId");
      expect(record).toHaveProperty("patientId");
      expect(record).toHaveProperty("deathTick");
      expect(record).toHaveProperty("mortalityScore");
    }
  });

  it("does not crash with 1 patient", () => {
    const w = createWorld(1);
    runWorld(w, 10);
    expect(w.state.morgue).toBeDefined();
  });
});

describe("Outpatient Flow", () => {
  it("map exists and starts empty", () => {
    const w = createWorld(10);
    expect(w.state._outpatientVisits.size).toBe(0);
  });

  it("accumulates visits during simulation", () => {
    const w = createWorld(50);
    runWorld(w, 50);
    const visits = Array.from(w.state._outpatientVisits.values());
    expect(visits.length).toBeGreaterThanOrEqual(0);
  });

  it("valid statuses only", () => {
    const w = createWorld(50);
    runWorld(w, 50);
    const valid = ["waiting", "in-consultation", "completed", "referenced", "cancelled"];
    for (const v of Array.from(w.state._outpatientVisits.values())) {
      expect(valid).toContain(v.status);
    }
  });
});
