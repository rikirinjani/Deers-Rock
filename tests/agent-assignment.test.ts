/**
 * Epic VI M6.1 — Agent-Patient Assignment Tests
 */
import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";

describe("Epic VI M6.1 — Agent-Patient Assignment", () => {
  it("assigns doctors to admitted patients", () => {
    let w = createWorld(30, undefined, 42);
    for (let i = 0; i < 100; i++) w = runWorld(w, 1);
    const assignments = w.state._agentState.pool.assignments;
    expect(assignments.size).toBeGreaterThan(0);
    // All keys should be encounter IDs or nurse assignment keys
    for (const key of assignments.keys()) {
      expect(typeof key).toBe("string");
    }
  });

  it("assigns both doctor and nurse per encounter", () => {
    let w = createWorld(30, undefined, 42);
    for (let i = 0; i < 200; i++) w = runWorld(w, 1);
    const assignments = w.state._agentState.pool.assignments;
    // Should have both ENC-* (doctor) and ENC-NURSE-ENC-* (nurse) entries
    const doctorAssignments = Array.from(assignments.keys()).filter(k => k.startsWith("ENC-") && !k.startsWith("ENC-NURSE-"));
    const nurseAssignments = Array.from(assignments.keys()).filter(k => k.startsWith("ENC-NURSE-"));
    expect(doctorAssignments.length).toBeGreaterThan(0);
    expect(nurseAssignments.length).toBeGreaterThan(0);
  });

  it("assignment count is non-zero after sufficient ticks", () => {
    let w = createWorld(30, undefined, 42);
    for (let i = 0; i < 200; i++) w = runWorld(w, 1);
    const assignments = w.state._agentState.pool.assignments.size;
    expect(assignments).toBeGreaterThan(0);
  });

  it("deterministic: same seed produces same assignments", () => {
    const w1 = (() => { let w = createWorld(20, undefined, 99); for (let i = 0; i < 100; i++) w = runWorld(w, 1); return w; })();
    const w2 = (() => { let w = createWorld(20, undefined, 99); for (let i = 0; i < 100; i++) w = runWorld(w, 1); return w; })();
    const ids1 = Array.from(w1.state._agentState.pool.assignments.keys()).sort();
    const ids2 = Array.from(w2.state._agentState.pool.assignments.keys()).sort();
    expect(ids1).toEqual(ids2);
  });
});
