/**
 * Epic XII 12.3: run a layout scenario over several seeds and compare two layouts on the
 * same demand. Scenario path only. A run is `ticks` minutes of simulated time per seed, so
 * long runs are heavy: run them on Kaggle or a VPS, not the laptop (owner rule).
 *
 * CLI (small smoke run): npx tsx src/experiment/scenario-compare.ts
 */
import { createWorld, runWorld } from "../engine/world.js";
import type { HospitalLayout } from "../engine/state-store.js";
import type { DemandConfig } from "../engine/scenario-demand.js";
import { scenarioReport, type MoneyConfig, type ScenarioReport } from "../engine/scenario-money.js";

export interface ScenarioSpec {
  name: string;
  layout: HospitalLayout;
  demand: DemandConfig;
  money?: MoneyConfig;
  /** Simulated minutes per run (warm-up is dropped inside the report). */
  ticks: number;
}

export interface Range { min: number; median: number; max: number; mean: number }

export function range(xs: number[]): Range {
  if (xs.length === 0) return { min: 0, median: 0, max: 0, mean: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return {
    min: s[0]!, max: s[s.length - 1]!,
    median: s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2,
    mean: xs.reduce((a, b) => a + b, 0) / xs.length,
  };
}

export function runScenario(spec: ScenarioSpec, seed: number): ScenarioReport {
  const w = createWorld(5, undefined, seed, spec.layout, spec.demand);
  return scenarioReport(runWorld(w, spec.ticks).state, spec.money);
}

const METRICS: Record<string, (r: ScenarioReport) => number> = {
  marginIdr: (r) => r.marginIdr,
  revenueTotalIdr: (r) => r.revenue.totalIdr,
  diverted: (r) => r.diverted,
  admitted: (r) => r.admitted,
  spilledUp: (r) => r.spilledUp,
  bpjsDiverted: (r) => r.divertedByPayer["BPJS Kesehatan"] ?? 0,
};

export interface MultiSeedResult {
  name: string;
  seeds: number[];
  perSeed: ScenarioReport[];
  summary: Record<string, Range>;
}

export function runAcrossSeeds(spec: ScenarioSpec, seeds: number[]): MultiSeedResult {
  const perSeed = seeds.map((s) => runScenario(spec, s));
  const summary: Record<string, Range> = {};
  for (const [k, f] of Object.entries(METRICS)) summary[k] = range(perSeed.map(f));
  return { name: spec.name, seeds, perSeed, summary };
}

export interface Comparison {
  a: MultiSeedResult;
  b: MultiSeedResult;
  /** b minus a, paired by seed (same demand), per metric. */
  delta: Record<string, Range>;
}

export function compareLayouts(a: ScenarioSpec, b: ScenarioSpec, seeds: number[]): Comparison {
  const ra = runAcrossSeeds(a, seeds);
  const rb = runAcrossSeeds(b, seeds);
  const delta: Record<string, Range> = {};
  for (const [k, f] of Object.entries(METRICS)) delta[k] = range(seeds.map((_, i) => f(rb.perSeed[i]!) - f(ra.perSeed[i]!)));
  return { a: ra, b: rb, delta };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scenario-compare.ts")) {
  // Smoke run only: tiny horizon, two seeds. Real comparisons need 20+ simulated days.
  const mk = (name: string, k2: number, k3: number): ScenarioSpec => ({
    name, ticks: 3 * 1440, demand: { arrivalsPerDay: 60, waitLimitMinutes: 720 }, money: { warmupTicks: 1440 },
    layout: { wards: [
      { ward: "General K2", roomClass: "kelas-2", specialties: "general", beds: k2 },
      { ward: "General K3", roomClass: "kelas-3", specialties: "general", beds: k3 },
    ] },
  });
  const c = compareLayouts(mk("10xK2 + 4xK3", 10, 4), mk("5xK2 + 9xK3", 5, 9), [1, 2]);
  console.log(JSON.stringify({ delta: c.delta, unsourced: c.a.perSeed[0]!.unsourcedInputs }, null, 1));
}
