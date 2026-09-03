// Phase C — Temporal Contract (v3, evidence-final)
//
// === VERDICT ================================================================
// One Kronos world tick = ONE SIMULATED YEAR. The documented premise
// "1 world tick = 1 day" (P-002 lines 36/60/109/111/114) is FALSE for the
// implemented Kronos engine. Therefore:
//   - adapter constant TICKS_PER_WORLD_TICK = 1440 is NOT full fidelity;
//   - the sentinel config field `ticksPerDay` is a MISNOMER — its actual
//     semantics are "DR ticks executed per Kronos world tick", i.e. a
//     SAMPLING WINDOW, not a day mapping;
//   - full temporal fidelity would be 365 x 1440 = 525,600 DR ticks per
//     world tick, which is computationally infeasible to execute literally
//     (see FEASIBILITY below).
//
// === EVIDENCE (source, not comments) =======================================
// Kronos sector sources:
//   climate.ts:93,121      cadence 1; per world tick: year += 1,
//                          co2 += emissionsToConcentration(annualEmissions)
//                          with annualEmissions default 37 (GtCO2/yr — a
//                          real ANNUAL physical quantity; each tick adds a
//                          year of emissions).
//   geopolitics.ts:128,185 cadence 1; year += 1 per world tick (wars
//                          carry s.year; P-003 era 1939 + 30 ticks -> 1969).
//   economy.ts:119,155     cadence 3; year += 1 per SECTOR tick.
//   technology.ts:73,110   cadence 5; year += 1 per SECTOR tick.
//   world-engine.ts:85-88  cadence gates sector execution only
//                          (nextTick % cadence === 0).
//   Rewind probe (audit): 3 world ticks moved climate {year:2020} -> {2023}.
// Kronos proposal (design intent, contradicted by code):
//   P-002:36,60,109 "CHRONOS ENGINE (macro, 1 tick = 1 day)";
//   P-002:114       `const TICKS_PER_WORLD_TICK = 1440; // 1 day of DR time`.
// Sentinel config (Kronos repo):
//   All 30 Indonesian sentinels: ticksPerDay: 10; heatmap: 5. Chat-archive
//   rationale: "for speed", "can use a small number for testing" — compute
//   placeholders, chosen AFTER the 1440 default proved too expensive.
//
// Sector-cadence note (Kronos-side observation, not DR's to fix): the
// cadence-1 sectors (climate, geopolitics) define canonical world time =
// 1 year/tick. economy (cadence 3) and technology (cadence 5) advance their
// LOCAL year counters once per sector tick, so those counters drift
// relative to canonical world time (economy's "year" runs at 1/3 speed).
// Cadence is an update granularity, not a time unit. Interpreting any
// macro state must use the canonical (cadence-1) clock.
//
// === THE FOUR LAYERS (explicitly separated) =================================
// 1. DR internal clock: 1 DR tick = 1 simulated minute; 1440 DR ticks = 1
//    hospital day (clock.ts, calendar.ts — UNCHANGED by this contract).
// 2. Adapter cadence config: `ticksPerDay` (misnomer) = DR ticks executed
//    per Kronos world tick. Default 1440 (false-day premise); configs use
//    10/5 (compute placeholders). Semantics redefined HERE as sample window.
// 3. Kronos world tick: 1 simulated year (canonical, cadence-1 sectors).
// 4. Sentinel configuration: declares the sample window per world year.
//
// === FEASIBILITY (measured on Mac Mini M4, commit 2f932f0, 5 patients,
//     seed 42; DR runtime cost grows WORSENING SUPERQUADRATICALLY with
//     accumulated state) ================================================
//    100 ticks -> 29 ms; 200 -> 110 ms; 400 -> 494 ms; 800 -> 3,483 ms
//    (per-doubling growth factor rises 3.8x -> 4.5x -> 7.1x; handlers copy
//    whole collections per tick and collections compound).
//    Full fidelity per world tick = 525,600 ticks -> days-to-weeks of wall
//    time per world tick -> impossible; multi-year multi-seed literal
//    fidelity is excluded outright.
//    => SEMANTIC time conversion (1 world tick = 1 year = 525,600 DR minutes)
//       is separated from COMPUTATIONAL execution strategy (bounded sampling
//       window per world tick). No fastForward mechanism exists in DR and
//       none is invented here.
//
// === THE CONTRACT ===========================================================
// Each Kronos world tick (1 simulated year), the sentinel advances the
// hospital by a DECLARED SAMPLE WINDOW of N DR ticks. Sentinel output is a
// SAMPLE of hospital state under that year's macro conditions — not a
// temporally aligned year of hospital operations. Every experiment must
// report N explicitly. Kronos-side field rename (ticksPerDay ->
// drTicksPerWorldTick) is recommended but out of scope for this repo.

export const DR_TICKS_PER_MINUTE = 1;
export const DR_TICKS_PER_HOUR = 60;
export const DR_TICKS_PER_DAY = 1440;
export const DR_MS_PER_TICK = 60_000; // 1000 ms * 60

/** Canonical Kronos world-tick semantics (proven from cadence-1 sector source). */
export const WORLD_TICK_SEMANTICS = "1 Kronos world tick = 1 simulated year" as const;
export const WORLD_YEARS_PER_TICK = 1;

/** Semantic (full-fidelity) conversion — NOT an execution strategy. */
export const DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY = DR_TICKS_PER_DAY * 365; // 525,600
export const DR_MINUTES_PER_WORLD_YEAR = DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY;

/** World years -> full-fidelity DR ticks (semantic only; do not execute). */
export function worldYearsToDrTicksFullFidelity(worldYears: number): number {
  return worldYears * DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY;
}

/**
 * Declared sample window: DR ticks the sentinel advances per Kronos world tick.
 * PRINCIPLED_DEFAULT is one hospital day sampled per world year (1440).
 * LEGACY_10 / LEGACY_5 are the historical compute-saving windows; any use
 * must be declared in the experiment specification.
 */
export const SAMPLE_WINDOW = {
  PRINCIPLED_DAY: DR_TICKS_PER_DAY, // 1440 — one hospital day per world year
  LEGACY_10: 10,                    // all 30 Indonesian sentinels (historical)
  LEGACY_5: 5,                      // heatmap experiment (historical)
} as const;

/** Executed DR ticks for a run: world ticks x declared sample window. */
export function worldTicksToDrTicks(worldTicks: number, drTicksPerWorldTick: number): number {
  return worldTicks * drTicksPerWorldTick;
}

/** DR ticks -> hospitalTimeMs (pure). */
export function drTicksToHospitalTimeMs(drTicks: number): number {
  return drTicks * DR_MS_PER_TICK;
}

/** DR ticks -> simulated hospital days (pure). */
export function drTicksToHospitalDays(drTicks: number): number {
  return Math.floor(drTicks / DR_TICKS_PER_DAY);
}

/**
 * Classify a sentinel cadence value under this contract so callers must
 * confront the sampling semantics explicitly.
 */
export function classifyCadence(drTicksPerWorldTick: number): {
  kind: "day-sample" | "legacy-test" | "custom" | "invalid";
  description: string;
} {
  if (!Number.isInteger(drTicksPerWorldTick) || drTicksPerWorldTick <= 0) {
    return { kind: "invalid", description: "sample window must be a positive integer" };
  }
  if (drTicksPerWorldTick === SAMPLE_WINDOW.PRINCIPLED_DAY) {
    return { kind: "day-sample", description: "one hospital day (1440 DR minutes) sampled per world year" };
  }
  if (drTicksPerWorldTick === 10 || drTicksPerWorldTick === 5) {
    return { kind: "legacy-test", description: `${drTicksPerWorldTick} DR minutes per world YEAR (historical compute placeholder) — must be declared in experiment specs` };
  }
  return {
    kind: "custom",
    description: `${drTicksPerWorldTick} DR minutes (${drTicksToHospitalDays(drTicksPerWorldTick)} hospital day(s)) sampled per world year — must be declared in experiment specs`,
  };
}
