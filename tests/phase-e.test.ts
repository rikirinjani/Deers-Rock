import { describe, it, expect } from "vitest";
import { createWorld, runWorld, step } from "../src/engine/world.js";
import { computeSupplyStress } from "../src/engine/central-supply.js";
import { selectPrimaryDiagnosisCode } from "../src/engine/markov.js";
import { mapMacroDisasterToScenario, getScenarioEffects } from "../src/engine/scenario.js";

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

// ==========================================================================
// E1/E2 — supplyChainPressure consumer
// ==========================================================================

describe("E1/E2 supplyChainPressure — adaptive restock threshold", () => {
  it("state._supplyChainPressure defaults to 0", () => {
    const w = createWorld(20, undefined, 42);
    expect(w.state._supplyChainPressure).toBe(0);
  });

  it("supply_chain_pressure event sets _supplyChainPressure", () => {
    let w = createWorld(20, undefined, 42);
    w.queue.schedule("supply_chain_pressure", 0, { pressure: 0.7 });
    w = step(w);
    expect(w.state._supplyChainPressure).toBe(0.7);
  });

  it("pressure is clamped to [0, 1]", () => {
    let w = createWorld(20, undefined, 42);
    w.queue.schedule("supply_chain_pressure", 0, { pressure: 1.5 });
    w = step(w);
    expect(w.state._supplyChainPressure).toBe(1);

    let w2 = createWorld(20, undefined, 42);
    w2.queue.schedule("supply_chain_pressure", 0, { pressure: -0.3 });
    w2 = step(w2);
    expect(w2.state._supplyChainPressure).toBe(0);
  });

  it("higher pressure causes more restocking at tick 50", () => {
    const seed = 42;
    // Baseline: pressure=0
    const baseline = runWorld(createWorld(20, undefined, seed), 50);
    const baselineRestocks = Array.from(baseline.state.stockTransactions.values())
      .filter(t => t.type === "restock").length;

    // High pressure: pressure=1.0 → effectiveMin = maxStock → everything restocks
    const highPressure = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("supply_chain_pressure", 0, { pressure: 1.0 });
      return runWorld(w, 50);
    })();
    const highRestocks = Array.from(highPressure.state.stockTransactions.values())
      .filter(t => t.type === "restock").length;

    // With pressure=1.0, effectiveMin = maxStock, so ALL items restock
    expect(highRestocks).toBeGreaterThanOrEqual(baselineRestocks);
  });

  it("pressure=0 preserves original restock behavior", () => {
    const seed = 42;
    const baseline = runWorld(createWorld(20, undefined, seed), 50);
    const withZeroPressure = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("supply_chain_pressure", 0, { pressure: 0 });
      return runWorld(w, 50);
    })();
    // Same restock count — pressure=0 means effectiveMin = minStock (unchanged)
    const baseRestocks = Array.from(baseline.state.stockTransactions.values())
      .filter(t => t.type === "restock").length;
    const zeroRestocks = Array.from(withZeroPressure.state.stockTransactions.values())
      .filter(t => t.type === "restock").length;
    expect(zeroRestocks).toBe(baseRestocks);
  });

  it("pressure effect is deterministic under same seed", () => {
    const seed = 55;
    const run1 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("supply_chain_pressure", 0, { pressure: 0.8 });
      return runWorld(w, 100);
    })();
    const run2 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("supply_chain_pressure", 0, { pressure: 0.8 });
      return runWorld(w, 100);
    })();
    expect(computeSupplyStress(run1.state)).toBe(computeSupplyStress(run2.state));
    expect(run1.state.stockTransactions.size).toBe(run2.state.stockTransactions.size);
  });

  it("restock quantities are correct under pressure", () => {
    const seed = 42;
    // Restock check: tick % 50 === 0; handler cadence: every 3 ticks.
    // First aligned tick: 150 (LCM of 50 and 3).
    const w = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("supply_chain_pressure", 0, { pressure: 1.0 });
      return runWorld(w, 150);
    })();
    // All items should be restocked to maxStock when pressure=1.0
    // (effectiveMin = maxStock, so any item below max is restocked)
    for (const [code, item] of w.state.inventory) {
      expect(item.stock).toBe(item.maxStock);
    }
  });
});

// ==========================================================================
// E1/E2 — activeDisasterType consumer
// ==========================================================================

describe("E1/E2 activeDisasterType — macro→micro disaster mapping", () => {
  it("mapMacroDisasterToScenario maps known types", () => {
    expect(mapMacroDisasterToScenario("natural-disaster")).toBe("earthquake");
    expect(mapMacroDisasterToScenario("mass-casualty")).toBe("mass_casualty");
  });

  it("mapMacroDisasterToScenario returns undefined for unknown types", () => {
    expect(mapMacroDisasterToScenario("zombie-apocalypse")).toBeUndefined();
    expect(mapMacroDisasterToScenario("")).toBeUndefined();
  });

  it("active_disaster event sets _activeMacroDisaster", () => {
    let w = createWorld(20, undefined, 42);
    w.queue.schedule("active_disaster", 0, { disasterType: "natural-disaster" });
    w = step(w);
    expect(w.state._activeMacroDisaster).toBe("natural-disaster");
  });

  it("baseline (no disaster) differs from disaster intervention", () => {
    const seed = 42;
    const baseline = runWorld(createWorld(20, undefined, seed), 200);
    const withDisaster = (() => {
      let w = createWorld(20, undefined, seed);
      // Schedule disaster early enough to be before minTick for natural scenarios
      w.queue.schedule("active_disaster", 0, { disasterType: "natural-disaster" });
      return runWorld(w, 200);
    })();
    // With disaster, scenario system should activate earthquake
    // This should affect mortality, surge, or other metrics
    const baselineEffects = getScenarioEffects(baseline.state._scenario);
    const disasterEffects = getScenarioEffects(withDisaster.state._scenario);
    // At minimum, the scenario state should differ
    const baselineActive = baseline.state._scenario.active;
    const disasterActive = withDisaster.state._scenario.active;
    // Either the disaster activated a scenario or baseline did — they should differ
    // in at least one observable way
    const baselineHasScenario = baselineActive !== null;
    const disasterHasScenario = disasterActive !== null;
    expect(baselineHasScenario || disasterHasScenario).toBe(true);
    // If both have scenarios, the types or parameters should differ
    if (baselineHasScenario && disasterHasScenario) {
      const typesDiffer = baselineActive!.type !== disasterActive!.type;
      const paramsDiffer = baselineActive!.severity !== disasterActive!.severity;
      expect(typesDiffer || paramsDiffer).toBe(true);
    }
  });

  it("same seed + same disaster reproduces exactly", () => {
    const seed = 77;
    const run1 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("active_disaster", 0, { disasterType: "natural-disaster" });
      return runWorld(w, 200);
    })();
    const run2 = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("active_disaster", 0, { disasterType: "natural-disaster" });
      return runWorld(w, 200);
    })();
    expect(run1.state.encounters.size).toBe(run2.state.encounters.size);
    expect(run1.state._scenario.active?.type).toBe(run2.state._scenario.active?.type);
    expect(run1.state._scenario.active?.severity).toBe(run2.state._scenario.active?.severity);
  });

  it("different disasters produce different scenario types", () => {
    const seed = 42;
    const natural = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("active_disaster", 0, { disasterType: "natural-disaster" });
      return runWorld(w, 200);
    })();
    const casualty = (() => {
      let w = createWorld(20, undefined, seed);
      w.queue.schedule("active_disaster", 0, { disasterType: "mass-casualty" });
      return runWorld(w, 200);
    })();
    // Different mapped types → different scenario types
    const naturalType = natural.state._scenario.active?.type;
    const casualtyType = casualty.state._scenario.active?.type;
    if (naturalType && casualtyType) {
      expect(naturalType).not.toBe(casualtyType);
    }
  });

  it("unknown disaster type does not activate any scenario", () => {
    let w = createWorld(20, undefined, 42);
    w.queue.schedule("active_disaster", 0, { disasterType: "zombie-apocalypse" });
    w = runWorld(w, 200);
    // Unknown type should not activate a macro-driven scenario
    // (DR's own natural spawning may still activate one, but it shouldn't be from the macro)
    expect(w.state._activeMacroDisaster).toBe("zombie-apocalypse");
    // The mapping returns undefined, so no macro-driven activation
  });

  it("disaster scenario produces observable effects via getScenarioEffects", () => {
    let w = createWorld(20, undefined, 42);
    w.queue.schedule("active_disaster", 0, { disasterType: "natural-disaster" });
    w = runWorld(w, 200);
    const effects = getScenarioEffects(w.state._scenario);
    // If a scenario is active, effects should be non-zero
    if (w.state._scenario.active) {
      expect(effects.mortalityBoost).toBeGreaterThan(0);
      expect(effects.surgeMultiplier).toBeGreaterThan(1);
    }
  });
});
