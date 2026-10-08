/**
 * ADR-024: Handler Orchestration Determinism Test
 *
 * Verifies that handler execution order is deterministic and stable.
 */
import { describe, it, expect } from "vitest";
import { buildHandlers } from "../src/engine/world.js";

describe("ADR-024: Handler Orchestration Determinism", () => {
  it("buildHandlers returns deterministic order", () => {
    const h1 = buildHandlers();
    const h2 = buildHandlers();
    // Same number of handlers
    expect(h1.length).toBe(h2.length);
    // Same handler names (wrapper functions are recreated, but underlying handlers are stable)
    for (let i = 0; i < h1.length; i++) {
      expect(h1[i].name).toBe(h2[i].name);
    }
  });

  it("has expected number of handlers (~45)", () => {
    const handlers = buildHandlers();
    // Should have all handlers from HANDLER_SKIP
    expect(handlers.length).toBeGreaterThan(30);
    expect(handlers.length).toBeLessThan(60);
  });

  it("handler count is stable across calls", () => {
    const counts = [];
    for (let i = 0; i < 5; i++) {
      counts.push(buildHandlers().length);
    }
    // All calls should return same count
    expect(counts.every(c => c === counts[0])).toBe(true);
  });
});
