import { describe, it, expect } from "vitest";
import {
  zeroCrossings, interpAt, crossingAnalysis, breakEvenFixedCost, paybackDays, closedBedsForConversion,
  buildCells, curvesAtFixedCost, median, percentile, type Pair,
} from "../src/experiment/layout-12-4-breakeven.js";
import { reportFromRecord } from "../src/engine/scenario-money.js";
import type { RunFile } from "../src/experiment/layout-12-4.js";

const rates = [2, 4, 6, 8];

describe("crossing finder", () => {
  it("interpolates a single crossing", () => {
    const z = zeroCrossings(rates, [-10, -2, 6, 20]);
    expect(z.length).toBe(1);
    expect(z[0]!.x).toBeCloseTo(4.5);
    expect([z[0]!.lo, z[0]!.hi]).toEqual([1, 2]);
  });
  it("finds none when the sign never changes, and counts multiple crossings", () => {
    expect(zeroCrossings(rates, [1, 2, 3, 4])).toEqual([]);
    expect(zeroCrossings(rates, [-1, -2, -3, -4])).toEqual([]);
    expect(zeroCrossings(rates, [-5, 5, -5, 5]).length).toBe(3);
  });
  it("handles exact zeros: a crossing through zero counts once, a touch does not", () => {
    const through = zeroCrossings(rates, [-4, 0, 4, 8]);
    expect(through.length).toBe(1);
    expect(through[0]!.x).toBe(4);
    expect(zeroCrossings(rates, [3, 0, 3, 5])).toEqual([]);
    expect(zeroCrossings(rates, [-3, 0, 0, 5]).length).toBe(1);
    expect(zeroCrossings(rates, [0, 0, 0, 0])).toEqual([]);
  });
  it("interpolates a curve at a point and clamps outside", () => {
    expect(interpAt(rates, [0, 10, 20, 30], 5)).toBeCloseTo(15);
    expect(interpAt(rates, [0, 10, 20, 30], 1)).toBe(0);
    expect(interpAt(rates, [0, 10, 20, 30], 99)).toBe(30);
  });
});

describe("reliability rule (fixed in code before any result)", () => {
  // 10 seeds. Clean: every seed is negative at 4 and positive at 6.
  const clean = Array.from({ length: 10 }, (_, s) => [-30 - s, -10 - s, 10 + s, 30 + s]);
  it("clean crossing is reliable and has a tight bootstrap interval", () => {
    const r = crossingAnalysis(rates, clean);
    expect(r.status).toBe("single");
    expect(r.reliable).toBe(true);
    expect(r.rate!).toBeGreaterThan(4);
    expect(r.rate!).toBeLessThan(6);
    expect(r.agreement).toEqual([1, 1]);
    expect(r.seedRange!.n).toBe(10);
    expect(r.bootstrap!.shareSingle).toBe(1);
    expect(r.bootstrap!.lo).toBeLessThanOrEqual(r.rate!);
    expect(r.bootstrap!.hi).toBeGreaterThanOrEqual(r.rate!);
  });
  it("seeds that disagree at a bracketing rate give no reliable crossing (agreement below 80 percent)", () => {
    // 6 of 10 seeds positive at 6, 4 negative: the median crosses, but only 60 percent agree.
    const noisy = Array.from({ length: 10 }, (_, s) => [-30, -10, s < 6 ? 8 : -8, 30]);
    const r = crossingAnalysis(rates, noisy);
    expect(r.status).toBe("single");
    expect(r.reliable).toBe(false);
    expect(r.reason).toMatch(/seeds disagree/);
  });
  it("exactly 80 percent agreement passes, 70 percent fails", () => {
    const mk = (nPos: number) => Array.from({ length: 10 }, (_, s) => [-30, -10, s < nPos ? 8 : -8, 30]);
    expect(crossingAnalysis(rates, mk(8)).reliable).toBe(true);
    expect(crossingAnalysis(rates, mk(7)).reliable).toBe(false);
  });
  it("a seed with a difference of exactly zero counts as disagreeing", () => {
    const cs = Array.from({ length: 10 }, (_, s) => [-30, -10, s < 7 ? 8 : 0, 30]);
    expect(crossingAnalysis(rates, cs).reliable).toBe(false); // 70 percent agree
  });
  it("no crossing: says so and records which side is ahead", () => {
    const r = crossingAnalysis(rates, Array.from({ length: 5 }, () => [10, 20, 30, 40]));
    expect(r.status).toBe("none");
    expect(r.reliable).toBe(false);
    expect(r.signs).toEqual({ low: "+", high: "+" });
  });
  it("multiple crossings are never reliable", () => {
    const r = crossingAnalysis(rates, Array.from({ length: 10 }, () => [-5, 5, -5, 5]));
    expect(r.status).toBe("multiple");
    expect(r.reliable).toBe(false);
    expect(r.reason).toMatch(/3 crossings/);
  });
  it("is deterministic", () => {
    expect(crossingAnalysis(rates, clean)).toEqual(crossingAnalysis(rates, clean));
  });
});

describe("fixed cost, payback and helpers", () => {
  it("break-even fixed cost is delta / extra bed-days, and undefined for equal-bed pairs", () => {
    expect(breakEvenFixedCost(630_000, 630)).toBe(1000);
    expect(breakEvenFixedCost(-50_000, 100)).toBe(-500); // variant already worse at zero fixed cost
    expect(breakEvenFixedCost(123, 0)).toBeNull();
  });
  it("payback adds the downtime loss, and is never when the daily gain is not positive", () => {
    expect(paybackDays(100_000_000, 0, 0, 0, 2_000_000).days).toBe(50);
    expect(paybackDays(100_000_000, 30, 10, 50_000, 2_000_000).days).toBe((100_000_000 + 30 * 10 * 50_000) / 2_000_000);
    expect(paybackDays(1, 1, 1, 1, 0).days).toBe("never");
    expect(paybackDays(1, 1, 1, 1, -5).days).toBe("never");
    expect(paybackDays(100, 10, 5, -1000, 10).days).toBe(10); // a negative contribution never shortens the payback
  });
  it("counts the beds converted when one layout becomes another", () => {
    expect(closedBedsForConversion({ "kelas-2": 20 }, { "kelas-2": 10, "kelas-3": 40 })).toBe(10);
    expect(closedBedsForConversion({ "kelas-2": 20 }, { "kelas-2": 10, "kelas-3": 10 })).toBe(10);
    expect(closedBedsForConversion({ "kelas-2": 10 }, { "kelas-2": 20 })).toBe(0);
  });
  it("median and percentile", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.25)).toBe(2.5);
  });
});

/** Two synthetic runs whose margin we can compute exactly. */
function run(layout: "A" | "C", beds: Record<string, number>, n: number): RunFile {
  return {
    layout, routing: "rule-70-20-10-r", arrivalsPerDay: 4, seed: 1, days: 28, waitLimitMinutes: 1440, wallSeconds: 1,
    record: {
      endTick: 28 * 1440, bedsByClass: beds,
      ledger: Array.from({ length: n }, (_, i) => ({
        patientId: `P${i}`, tick: 8 * 1440 + i * 10, payer: "Self-pay", roomClass: "kelas-2", ownClass: "kelas-3",
        primaryDiagnosis: "I10", diagnosisCodes: ["I10"], stayMinutes: 5 * 1440, routeKey: "Self-pay",
      })),
      arrivalTicks: [], arrivalDigest: "d", divertedLog: [], stillQueued: 0,
    },
  };
}

describe("fixed cost linearity against the money model", () => {
  it("margin difference at F equals delta(0) - F x dAvail, exactly as reportFromRecord computes it", () => {
    const a = run("A", { "kelas-2": 20 }, 6), b = run("C", { "kelas-2": 10, "kelas-3": 30 }, 6);
    const pair: Pair = { rate: 4, seed: 1, a, b };
    const cells = buildCells([pair], { warmupTicks: 7 * 1440 });
    const F = 25_000;
    const viaModel = reportFromRecord(b.record, { warmupTicks: 7 * 1440, fixedCostPerAvailableBedDayIdr: F }).marginIdr
      - reportFromRecord(a.record, { warmupTicks: 7 * 1440, fixedCostPerAvailableBedDayIdr: F }).marginIdr;
    expect(curvesAtFixedCost(cells, F)[0]![0]).toBeCloseTo(viaModel, 0);
    expect(cells[0]!.dAvail).toBeCloseTo((40 - 20) * 21); // 20 extra beds over a 21-day window
    expect(cells[0]!.closedBeds).toBe(10);
    // break-even F makes the two layouts equal
    const fStar = breakEvenFixedCost(cells[0]!.delta0[0]!, cells[0]!.dAvail)!;
    expect(curvesAtFixedCost(cells, fStar)[0]![0]).toBeCloseTo(0, 3);
  });
  it("equal-bed pair: fixed cost cancels", () => {
    const a = run("A", { "kelas-2": 20 }, 6), b = run("C", { "kelas-2": 10, "kelas-3": 10 }, 3);
    const cells = buildCells([{ rate: 4, seed: 1, a, b }], { warmupTicks: 7 * 1440 });
    expect(cells[0]!.dAvail).toBe(0);
    expect(curvesAtFixedCost(cells, 0)[0]![0]).toBe(curvesAtFixedCost(cells, 500_000)[0]![0]);
    expect(breakEvenFixedCost(cells[0]!.delta0[0]!, cells[0]!.dAvail)).toBeNull();
  });
});
