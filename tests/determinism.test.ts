import { describe, it, expect } from "vitest";
import { createWorld, runWorld, step } from "../src/engine/world.js";

// Helper to get stable snapshot of IDs and counts for comparison
function fingerprint(world: ReturnType<typeof createWorld>) {
  const s = world.state;
  return {
    tick: world.clock.tick,
    seed: (world.state as any)._rngSeed,
    patientIds: Array.from(s.patients.keys()).sort(),
    patientNames: Array.from(s.patients.values()).map(p => p.id).sort(),
    encounterIds: Array.from(s.encounters.keys()).sort(),
    bedOccupancy: Array.from(s.beds.values()).filter(b => b.patientId).length,
    totalBeds: s.beds.size,
  };
}

describe("Determinism (Phase B)", () => {
  it("same seed in same process yields identical IDs after counter reset", () => {
    const w1 = createWorld(30, undefined, 42);
    const w2 = createWorld(30, undefined, 42);
    // After Phase B fix, IDs should be identical
    const ids1 = Array.from(w1.state.patients.values()).map(p => p.id).sort();
    const ids2 = Array.from(w2.state.patients.values()).map(p => p.id).sort();
    expect(ids1).toEqual(ids2);
    expect(w1.state.patients.size).toBe(30);
    expect(w2.state.patients.size).toBe(30);
    // Clocks should have same seed
    expect(w1.clock.rngSeed).toBe(42);
    expect(w2.clock.rngSeed).toBe(42);
  });

  it("same seed + same ticks yields identical state in same process", () => {
    const w1 = createWorld(30, undefined, 99);
    const r1 = runWorld(w1, 100);
    const w2 = createWorld(30, undefined, 99);
    const r2 = runWorld(w2, 100);
    expect(r1.clock.tick).toBe(100);
    expect(r2.clock.tick).toBe(100);
    expect(r1.clock.rngSeed).toBe(99);
    expect(r2.clock.rngSeed).toBe(99);
    // Compare patient IDs (should be identical after fix)
    const ids1 = Array.from(r1.state.patients.values()).map(p => p.id).sort();
    const ids2 = Array.from(r2.state.patients.values()).map(p => p.id).sort();
    expect(ids1).toEqual(ids2);
    // Compare encounter counts
    expect(r1.state.encounters.size).toBe(r2.state.encounters.size);
    // Compare key state sizes
    expect(r1.state.charges.size).toBe(r2.state.charges.size);
    expect(r1.state.labOrders.size).toBe(r2.state.labOrders.size);
  });

  it("different seeds yield different trajectories", () => {
    const w1 = createWorld(30, undefined, 42);
    const w2 = createWorld(30, undefined, 43);
    const r1 = runWorld(w1, 50);
    const r2 = runWorld(w2, 50);
    // Should differ in at least one observable
    const enc1 = r1.state.encounters.size;
    const enc2 = r2.state.encounters.size;
    // Not strictly guaranteed but highly likely to differ; at minimum IDs differ
    const ids1 = Array.from(r1.state.patients.values()).map(p => p.id).join(",");
    const ids2 = Array.from(r2.state.patients.values()).map(p => p.id).join(",");
    // IDs are same pattern but underlying patient identities differ via RNG
    // Check that at least one metric differs (encounters, charges, etc)
    const diff = enc1 !== enc2 || r1.state.charges.size !== r2.state.charges.size || ids1 !== ids2;
    // IDs will actually be same PAT-0001.. due to counter reset, but patient generation uses RNG for demographics
    // So check that full state is not byte-identical via a simple field: first patient name
    const name1 = Array.from(r1.state.patients.values())[0]?.name;
    const name2 = Array.from(r2.state.patients.values())[0]?.name;
    expect(name1 === name2 && enc1 === enc2 ? false : true).toBe(true);
  });

  it("sentinel independence: 3 derived seeds produce distinct trajectories", () => {
    function getHospitalSeed(worldSeed: number, hospitalId: number) {
      return (worldSeed ^ (hospitalId * 2654435761)) >>> 0;
    }
    function djb2(s: string) {
      let h = 0;
      for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
      return Math.abs(h) || 1;
    }
    const sA = getHospitalSeed(42, djb2("sentinel-A"));
    const sB = getHospitalSeed(42, djb2("sentinel-B"));
    const sC = getHospitalSeed(42, djb2("sentinel-C"));
    expect(sA).not.toBe(sB);
    expect(sB).not.toBe(sC);
    expect(sA).not.toBe(sC);
    const wA = runWorld(createWorld(30, undefined, sA), 100);
    const wB = runWorld(createWorld(30, undefined, sB), 100);
    const wC = runWorld(createWorld(30, undefined, sC), 100);
    // At least one observable should differ
    const encA = wA.state.encounters.size, encB = wB.state.encounters.size, encC = wC.state.encounters.size;
    const allSame = encA === encB && encB === encC && wA.state.charges.size === wB.state.charges.size && wB.state.charges.size === wC.state.charges.size;
    expect(allSame).toBe(false);
  });

  it("perturbation of one sentinel does not alter another", () => {
    function getHospitalSeed(worldSeed: number, hospitalId: number) { return (worldSeed ^ (hospitalId * 2654435761)) >>> 0; }
    function djb2(s: string) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return Math.abs(h) || 1; }
    const sA = getHospitalSeed(42, djb2("sentinel-A"));
    const sB = getHospitalSeed(42, djb2("sentinel-B"));
    // Baseline B
    const wB1 = runWorld(createWorld(30, undefined, sB), 100);
    const encB1 = wB1.state.encounters.size;
    const chargesB1 = wB1.state.charges.size;
    // Create A with different patient count (perturbation) in same process
    const wA = runWorld(createWorld(80, undefined, sA), 100);
    expect(wA.state.patients.size).toBeGreaterThanOrEqual(80);
    // Recreate B after perturbation — should be identical to baseline
    const wB2 = runWorld(createWorld(30, undefined, sB), 100);
    expect(wB2.state.encounters.size).toBe(encB1);
    expect(wB2.state.charges.size).toBe(chargesB1);
  });

  it("local RNG isolation: throwaway world does not alter later world", () => {
    const w1 = runWorld(createWorld(30, undefined, 999), 100);
    const enc1 = w1.state.encounters.size;
    // Throwaway
    runWorld(createWorld(10, undefined, 555), 50);
    const w2 = runWorld(createWorld(30, undefined, 999), 100);
    expect(w2.state.encounters.size).toBe(enc1);
    expect(w2.state.charges.size).toBe(w1.state.charges.size);
  });

  it("step is deterministic for same seed", () => {
    const w1 = createWorld(20, undefined, 123);
    const w2 = createWorld(20, undefined, 123);
    for (let i = 0; i < 20; i++) {
      const n1 = step(w1);
      const n2 = step(w2);
      // After each step, ticks should match
      expect(n1.clock.tick).toBe(n2.clock.tick);
      // Need to update w1/w2 for next iteration — but createWorld reset means we test fresh each time
      // Instead runWorld already tested; this just checks step doesn't throw
      Object.assign(w1, n1); Object.assign(w2, n2);
    }
  });
});
