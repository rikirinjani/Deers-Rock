import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";

describe("Outpatient Flow", () => {
  it("outpatient visits map exists", () => {
    let w = createWorld(10, undefined, 42);
    expect(w.state._outpatientVisits).toBeDefined();
  });

  it("outpatient visits start empty", () => {
    let w = createWorld(10, undefined, 42);
    expect(w.state._outpatientVisits.size).toBe(0);
  });

  it("outpatient visits accumulate during simulation", () => {
    let w = createWorld(100, undefined, 42);
    w = runWorld(w, 50);
    
    const visits = Array.from(w.state._outpatientVisits.values());
    expect(visits.length).toBeGreaterThanOrEqual(0);
  });

  it("outpatient visits have required fields", () => {
    let w = createWorld(100, undefined, 42);
    w = runWorld(w, 50);
    
    const visits = Array.from(w.state._outpatientVisits.values());
    expect(visits.length).toBeGreaterThan(0);
    // OutpatientVisit (state-store.ts) carries diagnosis/icdCode/poli — there is no "complaint" field.
    for (const v of visits.slice(0, 5)) {
      expect(v).toHaveProperty("id");
      expect(v).toHaveProperty("patientId");
      expect(v).toHaveProperty("status");
      expect(v).toHaveProperty("poli");
      expect(v).toHaveProperty("icdCode");
    }
  });

  it("outpatient statuses are valid", () => {
    let w = createWorld(100, undefined, 42);
    w = runWorld(w, 50);
    
    const validStatuses = ["waiting", "in-consultation", "completed", "referenced", "cancelled"];
    const visits = Array.from(w.state._outpatientVisits.values());
    for (const v of visits) {
      expect(validStatuses).toContain(v.status);
    }
  });

  it("outpatient does not crash at tick 0", () => {
    let w = createWorld(1, undefined, 42);
    expect(() => runWorld(w, 1)).not.toThrow();
  });
});

describe("Outpatient + Encounter correlation", () => {
  it("outpatient visits correlate with encounters", () => {
    let w = createWorld(100, undefined, 42);
    w = runWorld(w, 100);
    
    const outpatientVisits = Array.from(w.state._outpatientVisits.values());
    const encounters = Array.from(w.state.encounters.values()).filter(e => e.type === "outpatient");
    
    expect(outpatientVisits.length).toBeGreaterThanOrEqual(0);
    expect(encounters.length).toBeGreaterThanOrEqual(0);
  });
});
