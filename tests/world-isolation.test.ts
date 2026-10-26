import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { getAllCoderProfiles } from "../src/engine/ai-coder.js";

// Regression for the 2026-10-26 determinism failure: CODER_PROFILES is
// module-global and mutated by coder learning, so without a reset in
// createWorld a throwaway world shifted the next world's AI-coder draws.
describe("World isolation (module-global state reset)", () => {
  it("createWorld restores AI coder profiles to base accuracy", () => {
    runWorld(createWorld(30, undefined, 555), 120);
    createWorld(5, undefined, 1);
    for (const p of getAllCoderProfiles()) {
      expect(p.accuracy).toBe(p.baseAccuracy);
      expect(p.casesProcessed).toBe(0);
      expect(p.correctAssignments).toBe(0);
    }
  });

  it("same seed after a throwaway world yields identical charges and chart statuses", () => {
    const fp = (w: ReturnType<typeof createWorld>) => JSON.stringify({
      charges: Array.from(w.state.charges.values()).map(c => [c.id, c.description, c.amount]).sort(),
      charts: Array.from(w.state.medicalCharts.values()).map(c => [c.id, c.status, c.coder ?? null]).sort(),
    });
    const a = fp(runWorld(createWorld(30, undefined, 999), 60));
    runWorld(createWorld(10, undefined, 555), 50);
    const b = fp(runWorld(createWorld(30, undefined, 999), 60));
    expect(b).toBe(a);
  });
});
