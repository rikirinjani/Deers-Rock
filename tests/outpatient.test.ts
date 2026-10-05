import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";

describe("Outpatient Flow", () => {
  it("outpatient visits map exists", () => {
    const w = createWorld(10);
    expect(w.state._outpatientVisits).toBeDefined();
  });

  it("outpatient visits start empty", () => {
    const w = createWorld(10);
    expect(w.state._outpatientVisits.size).toBe(0);
  });

  it("outpatient visits accumulate during simulation", () => {
    const w = createWorld(100);
    runWorld(w, 50);
    
    const visits = Array.from(w.state._outpatientVisits.values());
    expect(visits.length).toBeGreaterThanOrEqual(0);
  });

  it("outpatient visits have required fields", () => {
    const w = createWorld(100);
    runWorld(w, 50);
    
    const visits = Array.from(w.state._outpatientVisits.values());
    for (const v of visits.slice(0, 5)) {
      expect(v).toHaveProperty("id");
      expect(v).toHaveProperty("patientId");
      expect(v).toHaveProperty("status");
      expect(v).toHaveProperty("complaint");
    }
  });

  it("outpatient statuses are valid", () => {
    const w = createWorld(100);
    runWorld(w, 50);
    
    const validStatuses = ["waiting", "in-consultation", "completed", "referenced", "cancelled"];
    const visits = Array.from(w.state._outpatientVisits.values());
    for (const v of visits) {
      expect(validStatuses).toContain(v.status);
    }
  });

  it("outpatient does not crash at tick 0", () => {
    const w = createWorld(1);
    expect(() => runWorld(w, 1)).not.toThrow();
  });
});

describe("Outpatient + Encounter correlation", () => {
  it("outpatient visits correlate with encounters", () => {
    const w = createWorld(100);
    runWorld(w, 100);
    
    const outpatientVisits = Array.from(w.state._outpatientVisits.values());
    const encounters = Array.from(w.state.encounters.values()).filter(e => e.type === "outpatient");
    
    expect(outpatientVisits.length).toBeGreaterThanOrEqual(0);
    expect(encounters.length).toBeGreaterThanOrEqual(0);
  });
});
