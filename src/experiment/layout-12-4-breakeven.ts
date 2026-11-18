/**
 * Epic XII 12.4: break-even analysis for a pair of layouts (baseline A versus a variant), from the
 * stored run files. SCENARIO AND SENSITIVITY, NOT A FORECAST. Pure functions, no simulation.
 *
 * Margin is linear in the fixed cost F per available bed-day:
 *   margin(F) = margin(0) - F x availableBedDays
 * so for a pair (variant minus baseline) the margin difference is
 *   delta(F) = delta(0) - F x dAvail,   dAvail = variant bed-days - baseline bed-days.
 * Break-even fixed cost is F* = delta(0) / dAvail. When the two layouts have the same number of
 * open bed-days (equal-bed pairs) fixed cost cancels and there is no break-even fixed cost by
 * construction. Break-even demand for a given F is where the paired margin difference crosses
 * zero as a function of arrivals per day.
 *
 * RELIABILITY RULE (fixed before looking at results, tested in tests/layout-12-4-breakeven.test.ts):
 * a crossing is reported as reliable only if (1) the median curve has exactly one zero crossing,
 * and (2) at the two nodes that bracket it, at least 80 percent of seeds have the same strict sign
 * as the median (a seed with a difference of exactly zero counts as disagreeing). Otherwise the
 * result is "no reliable crossing" with the reason: none, multiple, or seeds disagree.
 * The bootstrap resamples WHOLE seeds (all rates together), because the arrival draw of a seed is
 * shared across rates.
 */
import { reportFromRecord, type MoneyConfig, type ScenarioReport } from "../engine/scenario-money.js";
import { createRng } from "../engine/clock.js";
import type { RunFile } from "./layout-12-4.js";

export interface Pair { rate: number; seed: number; a: RunFile; b: RunFile }

export const AGREEMENT_THRESHOLD = 0.8;
export const BOOTSTRAP_RESAMPLES = 1000;

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((x, y) => x - y);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo]! + (s[hi]! - s[lo]!) * (i - lo);
}

const sgn = (y: number) => (y > 0 ? 1 : y < 0 ? -1 : 0);

/**
 * Zero crossings of a piecewise-linear curve through (xs[i], ys[i]). A node at exactly zero counts
 * as one crossing only if the nearest non-zero neighbours on its two sides have opposite signs
 * (a touch that returns to the same sign is not a crossing). Returns crossing positions and, for
 * each, the indexes of the bracketing non-zero nodes.
 */
export function zeroCrossings(xs: number[], ys: number[]): { x: number; lo: number; hi: number }[] {
  const out: { x: number; lo: number; hi: number }[] = [];
  const nz: number[] = [];
  for (let i = 0; i < ys.length; i++) if (sgn(ys[i]!) !== 0) nz.push(i);
  for (let k = 0; k + 1 < nz.length; k++) {
    const i = nz[k]!, j = nz[k + 1]!;
    if (sgn(ys[i]!) === sgn(ys[j]!)) continue;
    // zero nodes strictly between i and j (all of them are exactly zero): crossing at the first one
    if (j - i > 1) { out.push({ x: xs[i + 1]!, lo: i, hi: j }); continue; }
    out.push({ x: xs[i]! + ((xs[j]! - xs[i]!) * (0 - ys[i]!)) / (ys[j]! - ys[i]!), lo: i, hi: j });
  }
  return out;
}

/** Linear interpolation of a curve at x (clamped to the end nodes). */
export function interpAt(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]!) return ys[0]!;
  for (let i = 0; i + 1 < xs.length; i++) {
    if (x <= xs[i + 1]!) return ys[i]! + ((ys[i + 1]! - ys[i]!) * (x - xs[i]!)) / (xs[i + 1]! - xs[i]!);
  }
  return ys[ys.length - 1]!;
}

export interface CrossingResult {
  status: "none" | "multiple" | "single";
  reliable: boolean;
  /** Why the crossing is not reliable (or "reliable"). */
  reason: string;
  /** Crossing rate of the median curve (single only). */
  rate?: number;
  /** Rates of the bracketing nodes (single only). */
  bracket?: [number, number];
  /** Share of seeds with the median's sign at each bracketing node (single only). */
  agreement?: [number, number];
  /** Crossing rate of each seed's own curve when it has exactly one crossing: min / median / max, and how many seeds. */
  seedRange?: { min: number; median: number; max: number; n: number; of: number };
  /** Bootstrap over whole seeds: 2.5 and 97.5 percentiles of the crossing rate, and the share of resamples with exactly one crossing. */
  bootstrap?: { lo: number; hi: number; shareSingle: number };
  /** Which layout is ahead below the crossing / above it, or on the whole range when there is none: "+" variant ahead, "-" baseline ahead. */
  signs: { low: string; high: string };
}

/**
 * Crossing analysis for paired margin differences. `curves[s][r]` = variant minus baseline margin
 * for seed s at rates[r]. Deterministic (the bootstrap uses a fixed seed).
 */
export function crossingAnalysis(rates: number[], curves: number[][]): CrossingResult {
  const nSeeds = curves.length;
  const med = (cs: number[][]) => rates.map((_, r) => median(cs.map((c) => c[r]!)));
  const m = med(curves);
  const cross = zeroCrossings(rates, m);
  const signs = { low: m[0]! > 0 ? "+" : m[0]! < 0 ? "-" : "0", high: m[m.length - 1]! > 0 ? "+" : m[m.length - 1]! < 0 ? "-" : "0" };
  if (cross.length === 0) return { status: "none", reliable: false, reason: "no crossing in the tested range", signs };
  if (cross.length > 1) return { status: "multiple", reliable: false, reason: `${cross.length} crossings of the median curve: no reliable crossing`, signs };
  const c = cross[0]!;
  const agree = (idx: number) => curves.filter((cv) => sgn(cv[idx]!) === sgn(m[idx]!)).length / nSeeds;
  const ag: [number, number] = [agree(c.lo), agree(c.hi)];
  const reliable = ag[0] >= AGREEMENT_THRESHOLD && ag[1] >= AGREEMENT_THRESHOLD;
  const seedX: number[] = [];
  for (const cv of curves) { const z = zeroCrossings(rates, cv); if (z.length === 1) seedX.push(z[0]!.x); }
  const rng = createRng(12345).next;
  const boot: number[] = [];
  for (let b = 0; b < BOOTSTRAP_RESAMPLES; b++) {
    const sample = Array.from({ length: nSeeds }, () => curves[Math.floor(rng() * nSeeds)]!);
    const z = zeroCrossings(rates, med(sample));
    if (z.length === 1) boot.push(z[0]!.x);
  }
  return {
    status: "single", reliable,
    reason: reliable ? "reliable" : `seeds disagree at the bracketing rates (${Math.round(ag[0] * 100)}% and ${Math.round(ag[1] * 100)}% agree with the median sign, need ${AGREEMENT_THRESHOLD * 100}%): no reliable crossing`,
    rate: c.x, bracket: [rates[c.lo]!, rates[c.hi]!], agreement: ag,
    seedRange: seedX.length ? { min: Math.min(...seedX), median: median(seedX), max: Math.max(...seedX), n: seedX.length, of: nSeeds } : undefined,
    bootstrap: boot.length ? { lo: percentile(boot, 0.025), hi: percentile(boot, 0.975), shareSingle: boot.length / BOOTSTRAP_RESAMPLES } : undefined,
    signs,
  };
}

/** Break-even fixed cost per available bed-day: F* = delta(0) / dAvail. Undefined by construction when dAvail is 0. */
export function breakEvenFixedCost(delta0: number, dAvail: number): number | null {
  if (Math.abs(dAvail) < 1e-9) return null;
  return delta0 / dAvail;
}

export interface Payback {
  /** Days to recover refit cost plus downtime loss; "never" when the daily gain is zero or negative. */
  days: number | "never";
}

/**
 * Refit payback in days = (refit cost + downtime loss) / daily margin gain. The downtime loss is
 * ARITHMETIC (closed beds x downtime days x the old layout's contribution per available bed-day),
 * not a simulated closure. "never" when the daily gain is zero or negative.
 */
export function paybackDays(refitCostIdr: number, downtimeDays: number, closedBeds: number, contributionPerBedDayIdr: number, dailyGainIdr: number): Payback {
  if (!(dailyGainIdr > 0)) return { days: "never" };
  const downtimeLoss = downtimeDays * closedBeds * Math.max(0, contributionPerBedDayIdr);
  return { days: (refitCostIdr + downtimeLoss) / dailyGainIdr };
}

/** Beds that would have to be converted: baseline beds of a class that the variant no longer has. */
export function closedBedsForConversion(bedsA: Record<string, number>, bedsB: Record<string, number>): number {
  let n = 0;
  for (const [c, k] of Object.entries(bedsA)) n += Math.max(0, k - (bedsB[c] ?? 0));
  return n;
}

export interface RateCell {
  rate: number;
  /** variant minus baseline at F = 0, per seed. */
  delta0: number[];
  dAvail: number;
  occA: number[];
  occB: number[];
  /** baseline contribution per available bed-day excluding fixed cost, per seed. */
  contribA: number[];
  windowDays: number;
  closedBeds: number;
}

/** Build per-rate cells from paired runs (money settings in `cfg`, fixed cost forced to 0). */
export function buildCells(pairs: Pair[], cfg: MoneyConfig): RateCell[] {
  const rates = [...new Set(pairs.map((p) => p.rate))].sort((x, y) => x - y);
  return rates.map((rate) => {
    const ps = pairs.filter((p) => p.rate === rate).sort((x, y) => x.seed - y.seed);
    const c0 = { ...cfg, fixedCostPerAvailableBedDayIdr: 0 };
    const ra: ScenarioReport[] = ps.map((p) => reportFromRecord(p.a.record, c0));
    const rb: ScenarioReport[] = ps.map((p) => reportFromRecord(p.b.record, c0));
    return {
      rate,
      delta0: ps.map((_, i) => rb[i]!.marginIdr - ra[i]!.marginIdr),
      dAvail: median(ps.map((_, i) => rb[i]!.availableBedDays - ra[i]!.availableBedDays)),
      occA: ra.map((r) => r.occupancy), occB: rb.map((r) => r.occupancy),
      contribA: ra.map((r) => (r.availableBedDays > 0 ? r.marginIdr / r.availableBedDays : 0)),
      windowDays: ra[0]?.windowDays ?? 0,
      closedBeds: closedBedsForConversion(ps[0]!.a.record.bedsByClass, ps[0]!.b.record.bedsByClass),
    };
  });
}

/** Per-seed margin-difference curves at fixed cost F: curves[s][r]. */
export function curvesAtFixedCost(cells: RateCell[], F: number): number[][] {
  const nSeeds = cells[0]!.delta0.length;
  return Array.from({ length: nSeeds }, (_, s) => cells.map((c) => c.delta0[s]! - F * c.dAvail));
}
