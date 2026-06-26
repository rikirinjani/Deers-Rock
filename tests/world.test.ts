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
});
