// Phase D — sentinel output semantics: primaryDiagnosis + supplyStress.
//
// Test discipline: CAUSAL dependencies, not cosmetics. Every claim below
// ties the output to the underlying state that produces it. All runtime
// tests are bounded (<= 200 DR ticks, ~110 ms each on Mac Mini M4).
import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { selectPrimaryDiagnosisCode } from "../src/engine/markov.js";
import { computeSupplyStress, centralSupplyInit } from "../src/engine/central-supply.js";
import type { Patient } from "../src/patient/schema.js";
import type { HospitalState } from "../src/engine/state-store.js";

function syntheticPatient(diagnoses: { code: string; name: string; active: boolean }[]): Patient {
  return {
    id: "PAT-TEST", name: "Test", age: 50, gender: "male",
    identity: undefined as never,
    vitals: { heartRate: 80, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 36.5, oxygenSaturation: 98, respiratoryRate: 16, painLevel: 0 },
    diagnoses, medications: [],
  } as unknown as Patient;
}

function syntheticState(inventoryOverrides: Record<string, number> = {}): HospitalState {
  const inventory = centralSupplyInit();
  for (const [code, stock] of Object.entries(inventoryOverrides)) {
    const item = inventory.get(code);
    if (item) inventory.set(code, { ...item, stock });
  }
  return { inventory } as unknown as HospitalState;
}

// ==========================================================================
// D1 — primaryDiagnosis
// ==========================================================================
describe("D1 primaryDiagnosis — deterministic selection from patient state", () => {
  it("selects the FIRST ACTIVE diagnosis of the problem list", () => {
    const p = syntheticPatient([
      { code: "I10", name: "Hypertension", active: false },
      { code: "E11", name: "T2DM", active: true },
      { code: "J15", name: "Pneumonia", active: true },
    ]);
    expect(selectPrimaryDiagnosisCode(p)).toBe("E11");
  });

  it("falls back to the first diagnosis when none are active", () => {
    const p = syntheticPatient([
      { code: "I10", name: "Hypertension", active: false },
      { code: "E11", name: "T2DM", active: false },
    ]);
    expect(selectPrimaryDiagnosisCode(p)).toBe("I10");
  });

  it("returns UNKNOWN only for a diagnosis-free (or missing) patient — the safety net", () => {
    expect(selectPrimaryDiagnosisCode(syntheticPatient([]))).toBe("UNKNOWN");
    expect(selectPrimaryDiagnosisCode(undefined)).toBe("UNKNOWN");
  });

  it("causal: changing the underlying problem list changes the selected diagnosis", () => {
    const withPneumonia = syntheticPatient([{ code: "J15", name: "Pneumonia", active: true }]);
    const withIhd = syntheticPatient([{ code: "I21", name: "AMI", active: true }]);
    const a = selectPrimaryDiagnosisCode(withPneumonia);
    const b = selectPrimaryDiagnosisCode(withIhd);
    expect(a).toBe("J15");
    expect(b).toBe("I21");
    expect(a).not.toBe(b);
  });
});

describe("D1 primaryDiagnosis — live encounters (bounded 200-tick run)", () => {
  const run = () => runWorld(createWorld(5, undefined, 42), 200).state;

  const diagnosisArray = (s: ReturnType<typeof run>) =>
    Array.from(s.encounters.values()).map(e => e.primaryDiagnosis ?? "(none)").sort();

  it("every encounter carries a valid ICD-shaped, non-UNKNOWN primaryDiagnosis", () => {
    const s = run();
    expect(s.encounters.size).toBeGreaterThan(0);
    for (const e of s.encounters.values()) {
      expect(e.primaryDiagnosis).toBeDefined();
      expect(e.primaryDiagnosis).not.toBe("UNKNOWN");
      expect(e.primaryDiagnosis).toMatch(/^[A-Z]\d{2}/); // ICD-10 category shape
    }
  });

  it("distribution is not collapsed: multiple distinct codes appear", () => {
    const s = run();
    const distinct = new Set(diagnosisArray(s));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });

  it("deterministic: same seed reproduces the identical diagnosis multiset (same process)", () => {
    expect(diagnosisArray(run())).toEqual(diagnosisArray(run()));
  });

  it("deterministic under interleaving: a throwaway world does not contaminate the diagnosis array", () => {
    const first = diagnosisArray(run());
    runWorld(createWorld(10, undefined, 7), 50); // unrelated perturbation
    expect(diagnosisArray(run())).toEqual(first);
  });

  it("causal at population level: a different seed yields a different diagnosis distribution", () => {
    const a = diagnosisArray(runWorld(createWorld(5, undefined, 42), 200).state);
    const b = diagnosisArray(runWorld(createWorld(5, undefined, 99), 200).state);
    expect(a).not.toEqual(b);
  });
});

// ==========================================================================
// D2 — supplyStress
// ==========================================================================
describe("D2 supplyStress — pure causal function of inventory state", () => {
  it("empty inventory returns 0 (guard)", () => {
    expect(computeSupplyStress({ inventory: new Map() } as unknown as HospitalState)).toBe(0);
  });

  it("causal anchors: all-at-max = 0, all-at-min = 1, initial midpoint state = exactly 0.5", () => {
    const full = syntheticState();
    for (const [code, item] of full.inventory) full.inventory.set(code, { ...item, stock: item.maxStock });
    expect(computeSupplyStress(full)).toBe(0);

    const empty = syntheticState();
    for (const [code, item] of empty.inventory) empty.inventory.set(code, { ...item, stock: item.minStock });
    expect(computeSupplyStress(empty)).toBe(1);

    // centralSupplyInit() stocks every item at (min+max)/2 — the real initial state.
    expect(computeSupplyStress(syntheticState())).toBe(0.5);
  });

  it("causal: draining one item raises the stress; refilling lowers it (monotone response)", () => {
    const base = computeSupplyStress(syntheticState());
    const drained = syntheticState({ "MED-PRC": 500 }); // paracetamol: min 500, max 5000, midpoint 2750
    const stressDrained = computeSupplyStress(drained);
    expect(stressDrained).toBeGreaterThan(base);
    const restored = syntheticState({ "MED-PRC": 5000 });
    expect(computeSupplyStress(restored)).toBeLessThan(base);
  });

  it("causal isolation: unrelated state changes do not alter supplyStress", () => {
    const a = syntheticState();
    const stressA = computeSupplyStress(a);
    const b = syntheticState();
    (b as unknown as Record<string, unknown>).waitingRoom = 17;
    (b as unknown as Record<string, unknown>).morgue = [1, 2, 3];
    expect(computeSupplyStress(b)).toBe(stressA);
  });
});

describe("D2 supplyStress — live dynamics (bounded 200-tick run)", () => {
  const run = () => runWorld(createWorld(5, undefined, 42), 200).state;

  it("initial state yields exactly 0.5; after 200 ticks consumption has moved real stock", () => {
    const w = createWorld(5, undefined, 42);
    expect(computeSupplyStress(w.state)).toBe(0.5); // initial inventory is the midpoint state
    const s = run();
    const moved = Array.from(s.inventory.values()).filter(i => i.stock !== (i.minStock + i.maxStock) / 2);
    expect(moved.length).toBeGreaterThan(0); // dispensing/restock genuinely acted on stock
  });

  it("value is deterministic across same-seed reruns (and invariant to interleaving)", () => {
    const a = computeSupplyStress(run());
    runWorld(createWorld(10, undefined, 7), 50); // unrelated world in between
    const b = computeSupplyStress(run());
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("is consistent with its own definition: recomputing from the run's inventory matches", () => {
    const s = run();
    const items = Array.from(s.inventory.values()).filter(i => i.maxStock > i.minStock);
    const manual = items.reduce((acc, i) => acc + Math.min(1, Math.max(0, (i.maxStock - i.stock) / (i.maxStock - i.minStock))), 0) / items.length;
    expect(computeSupplyStress(s)).toBe(manual);
  });
});
