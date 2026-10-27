/**
 * ADR-008 sub-streams: each handler draws from its own (seed, tick, stream)
 * rng, so one handler's data-dependent draw count cannot re-roll the others.
 */
import { describe, it, expect } from "vitest";
import { createWorld, runWorld, buildHandlers, HANDLER_NAMES, type World } from "../src/engine/world.js";
import { subStreamRng, streamId, withSubStream, createClock } from "../src/engine/clock.js";

const draws = (rng: () => number, n = 5) => Array.from({ length: n }, () => rng());

describe("ADR-008 rng sub-streams", () => {
  it("are deterministic per (seed, tick, stream) and distinct across each", () => {
    expect(draws(subStreamRng(42, 10, 3))).toEqual(draws(subStreamRng(42, 10, 3)));
    expect(draws(subStreamRng(42, 10, 3))).not.toEqual(draws(subStreamRng(42, 11, 3)));
    expect(draws(subStreamRng(42, 10, 3))).not.toEqual(draws(subStreamRng(42, 10, 4)));
    expect(draws(subStreamRng(42, 10, 3))).not.toEqual(draws(subStreamRng(43, 10, 3)));
    for (const v of draws(subStreamRng(1, 0, 0), 200)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });

  it("streams look independent (no shared prefix, roughly uniform)", () => {
    const firsts = HANDLER_NAMES.map(n => subStreamRng(42, 7, streamId(n))());
    expect(new Set(firsts).size).toBe(firsts.length);
    const xs = draws(subStreamRng(9, 3, streamId("x")), 4000);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.02);
  });

  it("withSubStream keeps the clock's time fields and ignores the parent rng's state", () => {
    const c = createClock(60, 42); c.tick = 9; c.hospitalTimeMs = 9 * 60_000;
    const a = withSubStream(c, "labHandler");
    c.rng(); c.rng(); // consuming the parent stream changes nothing
    const b = withSubStream(c, "labHandler");
    expect(a.tick).toBe(9);
    expect(a.hospitalTimeMs).toBe(9 * 60_000);
    expect(draws(a.rng)).toEqual(draws(b.rng));
  });

  it("every handler has a unique stream name", () => {
    expect(HANDLER_NAMES.length).toBe(buildHandlers().length);
    expect(new Set(HANDLER_NAMES).size).toBe(HANDLER_NAMES.length);
  });

  it("an extra handler that burns draws does not change any other handler's results", () => {
    const fp = (w: World) => JSON.stringify({
      enc: Array.from(w.state.encounters.keys()).sort(),
      charges: Array.from(w.state.charges.values()).map(c => [c.id, c.amount]).sort(),
      labs: Array.from(w.state.labOrders.keys()).sort(),
    });
    const base = runWorld(createWorld(25, undefined, 42), 80);
    const w = createWorld(25, undefined, 42);
    // Prepended handler draws a state-dependent number of times from the step clock,
    // which was the shared stream before sub-streams existed.
    const burner = (s: World["state"], c: World["clock"]) => { for (let i = 0; i < s.encounters.size + 3; i++) c.rng(); return s; };
    const perturbed = runWorld({ ...w, handlers: [burner, ...w.handlers] }, 80);
    expect(fp(perturbed)).toBe(fp(base));
  });
});
