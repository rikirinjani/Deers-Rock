/**
 * ADR-020: State Invariant Validator
 *
 * Tests for the invariant validation system that enforces:
 * 1. morgueId consistency (deceased ↔ non-null, alive ↔ null)
 * 2. Encounter-patient linkage
 * 3. Bed-patient consistency
 * 4. Discharge endTime consistency
 * 5. Charge-encounter linkage
 */
import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { validateInvariants, assertInvariants } from "../src/engine/invariant-validator.js";

describe("ADR-020: Invariant Validator", () => {
  it("passes on healthy state at tick 100", () => {
    let w = createWorld(20, undefined, 42);
    for (let i = 0; i < 100; i++) w = runWorld(w, 1);
    const report = validateInvariants(w.state);
    expect(report.pass).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it("passes after long run (tick 500)", () => {
    let w = createWorld(20, undefined, 42);
    for (let i = 0; i < 500; i++) w = runWorld(w, 1);
    const report = validateInvariants(w.state);
    expect(report.pass).toBe(true);
    expect(report.violations).toHaveLength(0);
    console.log(`  Tick 500: ${report.totals.patients} patients, ${report.totals.encounters} encs, ${report.totals.morgue} morgue`);
  });

  it("reports correct totals", () => {
    let w = createWorld(20, undefined, 42);
    for (let i = 0; i < 200; i++) w = runWorld(w, 1);
    const report = validateInvariants(w.state);
    expect(report.totals.patients).toBeGreaterThan(0);
    expect(report.totals.encounters).toBeGreaterThan(0);
    expect(report.totals.beds).toBeGreaterThan(0);
    expect(report.totals.charges).toBeGreaterThan(0);
  });

  it("assertInvariants passes on valid state", () => {
    let w = createWorld(20, undefined, 42);
    for (let i = 0; i < 100; i++) w = runWorld(w, 1);
    // Should not throw
    expect(() => assertInvariants(w.state, "test")).not.toThrow();
  });
});
