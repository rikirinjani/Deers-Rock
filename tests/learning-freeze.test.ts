import { describe, it, expect, afterEach } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { isLearningFrozen } from "../src/engine/config.js";
import { getActionRanking, getDeteriorationRate } from "../src/engine/agent-learning.js";

describe("Epic II / Milestone 2.6 — Learning Freeze Toggle", () => {
  const originalEnv = process.env.DR_FREEZE_LEARNING;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DR_FREEZE_LEARNING;
    else process.env.DR_FREEZE_LEARNING = originalEnv;
  });

  it("isLearningFrozen returns false by default", () => {
    delete process.env.DR_FREEZE_LEARNING;
    expect(isLearningFrozen()).toBe(false);
  });

  it("isLearningFrozen returns true when DR_FREEZE_LEARNING=1", () => {
    process.env.DR_FREEZE_LEARNING = "1";
    expect(isLearningFrozen()).toBe(true);
  });

  it("getActionRanking returns uniform 0.5 scores when frozen", () => {
    process.env.DR_FREEZE_LEARNING = "1";
    const memory = { byDiagnosis: new Map() };
    const actions = [
      { actionLabel: "med:paracetamol", actionType: "medication" },
      { actionLabel: "physician:assess", actionType: "physician" },
    ];
    const result = getActionRanking(memory, "I10", actions);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(0.5);
    expect(result[1].score).toBe(0.5);
  });

  it("getDeteriorationRate returns null when frozen", () => {
    process.env.DR_FREEZE_LEARNING = "1";
    const memory = { byDiagnosis: new Map() };
    expect(getDeteriorationRate(memory, "I10")).toBeNull();
  });

  it("same seed + frozen learning produces identical trajectories", () => {
    process.env.DR_FREEZE_LEARNING = "1";
    const w1 = createWorld(30, undefined, 42);
    for (let i = 0; i < 200; i++) runWorld(w1, 1);
    const state1 = {
      tick: w1.clock.tick,
      patients: w1.state.patients.size,
      encounters: w1.state.encounters.size,
      physicianOrders: w1.state.physicianOrders.size,
      morgue: w1.state.morgue.length,
      learningMemoryKeys: w1.state._learningMemory?.byDiagnosis.size ?? 0,
    };

    const w2 = createWorld(30, undefined, 42);
    for (let i = 0; i < 200; i++) runWorld(w2, 1);
    const state2 = {
      tick: w2.clock.tick,
      patients: w2.state.patients.size,
      encounters: w2.state.encounters.size,
      physicianOrders: w2.state.physicianOrders.size,
      morgue: w2.state.morgue.length,
      learningMemoryKeys: w2.state._learningMemory?.byDiagnosis.size ?? 0,
    };

    expect(state1).toEqual(state2);
  });

  it("frozen learning does not accumulate memory across runs", () => {
    process.env.DR_FREEZE_LEARNING = "1";
    const w = createWorld(30, undefined, 42);
    for (let i = 0; i < 200; i++) runWorld(w, 1);
    const memorySize = w.state._learningMemory?.byDiagnosis.size ?? 0;
    expect(memorySize).toBe(0);
  });

  it("unfrozen learning does not crash (regression guard)", () => {
    delete process.env.DR_FREEZE_LEARNING;
    const w = createWorld(50, undefined, 42);
    for (let i = 0; i < 1000; i++) runWorld(w, 1);
    // Learning handler should not throw; memory may or may not accumulate
    // depending on outcome density — the guard is that it runs without error.
    expect(() => w.state._learningMemory).not.toThrow();
  });
});
