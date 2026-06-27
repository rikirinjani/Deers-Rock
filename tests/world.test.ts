import { describe, it, expect } from "vitest";
import { createWorld, step, runWorld } from "../src/engine/world.js";
import { formatHospitalTime } from "../src/engine/clock.js";

describe("World", () => {
  it("creates a world with patients and beds", () => {
    const w = createWorld(10);
    expect(w.state.patients.size).toBe(10);
    expect(w.state.beds.size).toBeGreaterThan(0);
    expect(w.clock.tick).toBe(0);
    expect(w.journalPath).toBeNull();
  });

  it("advances on step", () => {
    const w = createWorld(5);
    const w2 = step(w);
    expect(w2.clock.tick).toBe(1);
  });

  it("processes admissions over multiple steps", () => {
    const w = createWorld(50);
    const result = runWorld(w, 20);
    expect(result.clock.tick).toBe(20);
    const totalEncounters = result.state.encounters.size;
    expect(totalEncounters).toBeGreaterThan(0);
  });

  it("formats time after running", () => {
    const w = createWorld(5);
    const result = runWorld(w, 60);
    const time = formatHospitalTime(result.clock);
    expect(time).toContain(":");
  });

  it("runs 1000+ ticks without crash and maintains invariants", { timeout: 120000 }, () => {
    const w = createWorld(100);
    const result = runWorld(w, 1000);
    expect(result.clock.tick).toBe(1000);
    const s = result.state;
    expect(s.patients.size).toBeGreaterThan(0);
    const totalBeds = s.beds.size;
    const occupiedBeds = Array.from(s.beds.values()).filter(b => b.patientId).length;
    expect(occupiedBeds).toBeLessThanOrEqual(totalBeds);
    expect(s.encounters.size).toBeGreaterThan(0);
    expect(s.waitingRoom).toBeGreaterThanOrEqual(0);
    const labs = s.labOrders.size;
    const meds = s.medicationOrders.size;
    const rads = s.radiologyOrders.size;
    const charges = s.charges.size;
    expect(labs + meds + rads + charges).toBeGreaterThan(0);
    const activeEncs = Array.from(s.encounters.values()).filter(e => e.status === "active").length;
    expect(activeEncs).toBeLessThanOrEqual(totalBeds);
    expect(s.morgue.length).toBeLessThanOrEqual(s.morgueCapacity);
    expect(s._outcomeRecords.length).toBeGreaterThan(0);
    const outcomes = s._outcomeRecords;
    const deceased = outcomes.filter(o => o.outcome === "deceased").length;
    const improved = outcomes.filter(o => o.outcome === "improved").length;
    const deteriorated = outcomes.filter(o => o.outcome === "deteriorated").length;
    expect(deceased + improved + deteriorated).toBe(outcomes.length);
    expect(s._doctorCaseMemory.size).toBeGreaterThan(0);
    expect(s._nurseCaseMemory.size).toBeGreaterThan(0);
    expect(s._pharmacyCaseMemory.size).toBeGreaterThan(0);
    expect(s._mmConferences.length).toBeGreaterThanOrEqual(0);
  });
});
