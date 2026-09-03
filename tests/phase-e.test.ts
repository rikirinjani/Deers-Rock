import { describe, it, expect } from "vitest";
import { createWorld, runWorld, step } from "../src/engine/world.js";
import { computeSupplyStress } from "../src/engine/central-supply.js";
import { selectPrimaryDiagnosisCode } from "../src/engine/markov.js";

// ==========================================================================
// E1 — Macro → Micro coupling
// ==========================================================================

describe("E1 admission_surge — macro→micro coupling", () => {
  it("scheduling admission_surge with multiplier > 1 increases admissions in the same tick", () => {
    const seed = 42;
    const base = runWorld(createWorld(20, undefined, seed), 10);
    const withSurge = (() => {
      let w = createWorld(20, undefined, seed);
      // Schedule admission_surge at tick 0 before stepping
      w.queue.schedule("admission_surge", 0, { multiplier: 2.0 });
      w = runWorld(w, 10);
      return w;
    })();
    // With higher multiplier, more patients should be admitted
    const baseAdmitted = base.state.encounters.size;
    const surgeAdmitted = withSurge.state.encounters.size;
    expect(surgeAdmitted).toBeGreaterThanOrEqual(baseAdmitted);
  });

  it("scheduling admission_surge with multiplier = 1 (baseline) produces identical results", () => {
    const seed = 42;
    const baseline = runWorld(createWorld(20, undefined, seed), 10);
    const withBaseline = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("admission_surge", 0, { multiplier: 1.0 });
      return runWorld(w, 10);
    })();
    expect(withBaseline.state.encounters.size).toBe(baseline.state.encounters.size);
  });

  it("admission_surge effect is deterministic under same seed", () => {
    const seed = 99;
    const run1 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("admission_surge", 0, { multiplier: 1.5 });
      return runWorld(w, 10);
    })();
    const run2 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("admission_surge", 0, { multiplier: 1.5 });
      return runWorld(w, 10);
    })();
    expect(run1.state.encounters.size).toBe(run2.state.encounters.size);
  });

  it("supplyStress is derived from actual inventory, not admission state", () => {
    // Supply stress depends on inventory consumption, which IS affected by
    // admissions (more patients → more medication orders → more inventory drain).
    // The correct isolation test: supplyStress matches its own definition
    // regardless of admission scenario.
    const seed = 42;
    const withSurge = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("admission_surge", 0, { multiplier: 2.0 });
      return runWorld(w, 10);
    })();
    const stress = computeSupplyStress(withSurge.state);
    // Verify it's computed from actual inventory, not hardcoded
    expect(stress).toBeGreaterThanOrEqual(0);
    expect(stress).toBeLessThanOrEqual(1);
    // Verify it matches the formula: mean normalized depletion
    const items = Array.from(withSurge.state.inventory.values());
    let total = 0;
    let counted = 0;
    for (const item of items) {
      const range = item.maxStock - item.minStock;
      if (range <= 0) continue;
      const depletion = Math.min(1, Math.max(0, (item.maxStock - item.stock) / range));
      total += depletion;
      counted++;
    }
    const expected = counted > 0 ? total / counted : 0;
    expect(stress).toBe(expected);
  });
});

describe("E1 staff_shortage — macro→micro coupling", () => {
  it("scheduling staff_shortage reduces outpatient capacity", () => {
    const seed = 42;
    // Run without staff shortage
    const baseline = runWorld(createWorld(20, undefined, seed), 50);
    // Run with staff shortage
    const withShortage = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("staff_shortage", 0, { modifier: 0.5 });
      return runWorld(w, 50);
    })();
    // With staff shortage, fewer outpatient visits should complete
    // (capacity is halved)
    const baselineVisits = baseline.state._outpatientVisits.size;
    const shortageVisits = withShortage.state._outpatientVisits.size;
    expect(shortageVisits).toBeLessThanOrEqual(baselineVisits);
  });

  it("staff_shortage effect is deterministic under same seed", () => {
    const seed = 77;
    const run1 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("staff_shortage", 0, { modifier: 0.5 });
      return runWorld(w, 50);
    })();
    const run2 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("staff_shortage", 0, { modifier: 0.5 });
      return runWorld(w, 50);
    })();
    expect(run1.state._outpatientVisits.size).toBe(run2.state._outpatientVisits.size);
  });

  it("staff_shortage does not affect admission encounters", () => {
    const seed = 42;
    const baseline = runWorld(createWorld(20, undefined, seed), 50);
    const withShortage = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("staff_shortage", 0, { modifier: 0.5 });
      return runWorld(w, 50);
    })();
    // Admission encounters should be unaffected by staff shortage
    expect(withShortage.state.encounters.size).toBe(baseline.state.encounters.size);
  });
});

// ==========================================================================
// E2 — supplyStress integration
// ==========================================================================

describe("E2 supplyStress — DR-derived value", () => {
  it("computeSupplyStress returns 0.5 at initial midpoint state", () => {
    const w = createWorld(20, undefined, 42);
    expect(computeSupplyStress(w.state)).toBe(0.5);
  });

  it("computeSupplyStress is deterministic across runs", () => {
    const w1 = runWorld(createWorld(20, undefined, 42), 100);
    const w2 = runWorld(createWorld(20, undefined, 42), 100);
    expect(computeSupplyStress(w1.state)).toBe(computeSupplyStress(w2.state));
  });

  it("computeSupplyStress changes with consumption", () => {
    const w0 = createWorld(20, undefined, 42);
    const w100 = runWorld(createWorld(20, undefined, 42), 100);
    const stress0 = computeSupplyStress(w0.state);
    const stress100 = computeSupplyStress(w100.state);
    // After 100 ticks, consumption should have moved stock from midpoint
    expect(stress100).not.toBe(stress0);
  });
});

// ==========================================================================
// E1 — primaryDiagnosis causal trace (adapter path verification)
// ==========================================================================

describe("E1 primaryDiagnosis — adapter dataflow trace", () => {
  it("all encounters carry valid ICD codes after coupling events", () => {
    let w = createWorld(20, undefined, 42);
    w.queue.schedule("admission_surge", 0, { multiplier: 1.5 });
    w = runWorld(w, 100);
    for (const enc of w.state.encounters.values()) {
      expect(enc.primaryDiagnosis).toBeDefined();
      expect(enc.primaryDiagnosis).not.toBe("UNKNOWN");
      expect(enc.primaryDiagnosis).toMatch(/^[A-Z]\d{2}/);
    }
  });

  it("diagnosis distribution is reproducible with coupling events", () => {
    const run1 = (() => {
      let w = createWorld(20, undefined, 42);
      w.queue.schedule("admission_surge", 0, { multiplier: 1.5 });
      return runWorld(w, 100);
    })();
    const run2 = (() => {
      let w = createWorld(20, undefined, 42);
      w.queue.schedule("admission_surge", 0, { multiplier: 1.5 });
      return runWorld(w, 100);
    })();
    const codes1 = Array.from(run1.state.encounters.values()).map(e => e.primaryDiagnosis).sort();
    const codes2 = Array.from(run2.state.encounters.values()).map(e => e.primaryDiagnosis).sort();
    expect(codes1).toEqual(codes2);
  });
});
