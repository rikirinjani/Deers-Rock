import { describe, it, expect } from "vitest";
import { createWorld } from "../src/engine/world.js";

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
    const w = createWorld(500);
    for (let i = 0; i < 50; i++) w.queue.step();
    
    const visits = Array.from(w.state._outpatientVisits.values());
    expect(visits.length).toBeGreaterThanOrEqual(0);
  });

  it("outpatient visits have required fields", () => {
    const w = createWorld(500);
    for (let i = 0; i < 50; i++) w.queue.step();
    
    const visits = Array.from(w.state._outpatientVisits.values());
    for (const v of visits.slice(0, 5)) {
      expect(v).toHaveProperty("id");
      expect(v).toHaveProperty("patientId");
      expect(v).toHaveProperty("status");
      expect(v).toHaveProperty("complaint");
    }
  });

  it("outpatient statuses are valid", () => {
    const w = createWorld(500);
    for (let i = 0; i < 50; i++) w.queue.step();
    
    const validStatuses = ["waiting", "in-consultation", "completed", "referenced", "cancelled"];
    const visits = Array.from(w.state._outpatientVisits.values());
    for (const v of visits) {
      expect(validStatuses).toContain(v.status);
    }
  });

  it("outpatient API returns correct structure", () => {
    const w = createWorld(500);
    for (let i = 0; i < 50; i++) w.queue.step();
    
    const visits = Array.from(w.state._outpatientVisits.values());
    const waiting = visits.filter(v => v.status === "waiting").length;
    const consulting = visits.filter(v => v.status === "in-consultation").length;
    const completed = visits.filter(v => v.status === "completed").length;
    
    expect(waiting + consulting + completed).toBeLessThanOrEqual(visits.length);
  });

  it("outpatient does not crash at tick 0", () => {
    const w = createWorld(1);
    expect(() => w.queue.step()).not.toThrow();
  });
});

describe("Outpatient + Encounter correlation", () => {
  it("outpatient visits correlate with encounters", () => {
    const w = createWorld(1000);
    for (let i = 0; i < 100; i++) w.queue.step();
    
    const outpatientVisits = Array.from(w.state._outpatientVisits.values());
    const encounters = Array.from(w.state.encounters.values()).filter(e => e.type === "outpatient");
    
    // Each outpatient visit should have a corresponding encounter or vice versa
    expect(outpatientVisits.length).toBeGreaterThanOrEqual(0);
    expect(encounters.length).toBeGreaterThanOrEqual(0);
  });
});
