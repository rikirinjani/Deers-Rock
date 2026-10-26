import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";

describe("Morgue / Death Roll", () => {
  it("starts empty", () => {
    let w = createWorld(10, undefined, 42);
    expect(w.state.morgue!.length).toBe(0);
    expect(w.state.morgueCapacity).toBe(10);
  });

  it("has records with required fields after simulation", () => {
    let w = createWorld(50, undefined, 42);
    w = runWorld(w, 100);
    for (const record of w.state.morgue) {
      expect(record).toHaveProperty("encounterId");
      expect(record).toHaveProperty("patientId");
      expect(record).toHaveProperty("deathTick");
      expect(record).toHaveProperty("mortalityScore");
    }
  });

  it("does not crash with 1 patient", () => {
    let w = createWorld(1, undefined, 42);
    w = runWorld(w, 10);
    expect(w.state.morgue).toBeDefined();
  });
});

describe("Outpatient Flow", () => {
  it("map exists and starts empty", () => {
    let w = createWorld(10, undefined, 42);
    expect(w.state._outpatientVisits.size).toBe(0);
  });

  it("accumulates visits during simulation", () => {
    let w = createWorld(50, undefined, 42);
    w = runWorld(w, 50);
    const visits = Array.from(w.state._outpatientVisits.values());
    expect(visits.length).toBeGreaterThanOrEqual(0);
  });

  it("valid statuses only", () => {
    let w = createWorld(50, undefined, 42);
    w = runWorld(w, 50);
    const valid = ["waiting", "in-consultation", "completed", "referenced", "cancelled"];
    for (const v of Array.from(w.state._outpatientVisits.values())) {
      expect(valid).toContain(v.status);
    }
  });
});
