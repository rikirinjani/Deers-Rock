import { describe, it, expect } from "vitest";
import { createClock, tick, formatHospitalTime } from "../src/engine/clock.js";

describe("Clock", () => {
  it("creates a clock at tick 0", () => {
    const clock = createClock();
    expect(clock.tick).toBe(0);
    expect(clock.running).toBe(false);
  });

  it("advances tick correctly", () => {
    const clock = createClock(60);
    const next = tick(clock);
    expect(next.tick).toBe(1);
    expect(next.hospitalTimeMs).toBe(60000);
  });

  it("formats hospital time", () => {
    const clock = createClock(60);
    const after10 = tick(clock);
    expect(formatHospitalTime(after10)).toBe("00:01");
  });
});
