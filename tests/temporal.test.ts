// Phase C — Temporal contract tests (bounded).
//
// Design rule: the temporal contract is validated ARITHMETICALLY (pure
// functions, no simulation) plus ONE bounded runtime cross-check of <= 200
// DR ticks. Heavy 1440-tick runWorld() validation was removed deliberately:
// DR runtime cost grows superlinearly with accumulated state (measured on
// Mac Mini M4: 100 ticks = 29 ms, 200 = 110 ms, 400 = 494 ms, 800 ~ 2 s;
// a 1440-tick run costs seconds-to-minutes and proved nothing the pure
// math cannot). See src/engine/temporal-contract.ts for the full contract.
import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { tickToDate } from "../src/engine/calendar.js";
import {
  DR_TICKS_PER_DAY,
  DR_MS_PER_TICK,
  DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY,
  WORLD_TICK_SEMANTICS,
  WORLD_YEARS_PER_TICK,
  SAMPLE_WINDOW,
  worldYearsToDrTicksFullFidelity,
  worldTicksToDrTicks,
  drTicksToHospitalTimeMs,
  drTicksToHospitalDays,
  classifyCadence,
} from "../src/engine/temporal-contract.js";

describe("Temporal contract — Kronos world tick semantics (pure)", () => {
  it("one Kronos world tick is one simulated year (canonical, cadence-1 sectors)", () => {
    // Evidence: climate.ts:121 + geopolitics.ts:185 advance year += 1 per world
    // tick at cadence 1; climate adds a full year of emissions (annualEmissions
    // ~ 37 GtCO2) per tick; P-003 era 1939 + 30 ticks -> 1969.
    expect(WORLD_TICK_SEMANTICS).toBe("1 Kronos world tick = 1 simulated year");
    expect(WORLD_YEARS_PER_TICK).toBe(1);
  });

  it("full-fidelity semantic conversion is 525,600 DR minutes per world tick", () => {
    expect(DR_TICKS_PER_DAY).toBe(1440);
    expect(DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY).toBe(1440 * 365);
    expect(DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY).toBe(525_600);
    expect(worldYearsToDrTicksFullFidelity(1)).toBe(525_600);
    expect(worldYearsToDrTicksFullFidelity(20)).toBe(10_512_000);
  });

  it("the documented '1 world tick = 1 day' premise is refuted (contract supersedes it)", () => {
    // P-002:36/60/109 claims 1 world tick = 1 day = 1440 DR ticks. Sector code
    // proves 1 world tick = 1 year, so 1440 is NOT full fidelity — it is 1/365
    // of a world year. The contract encodes the correction.
    expect(DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY / 1440).toBe(365);
  });
});

describe("Temporal contract — sampling window arithmetic (pure)", () => {
  it("executed DR ticks = world ticks x declared sample window", () => {
    // Historical Indonesian sentinel shape: 20 world ticks x 10 = 200 DR ticks.
    expect(worldTicksToDrTicks(20, 10)).toBe(200);
    // Principled day-sample shape: 20 world ticks x 1440 = 28,800 DR ticks.
    expect(worldTicksToDrTicks(20, SAMPLE_WINDOW.PRINCIPLED_DAY)).toBe(28_800);
    // Full fidelity (semantic only, not executable in practice): 20 world years.
    expect(worldTicksToDrTicks(20, DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY)).toBe(10_512_000);
    expect(worldTicksToDrTicks(0, 1440)).toBe(0);
  });

  it("P-004's historical horizon: 20 world ticks at cadence 10 = 200 DR minutes (~3.33 h), not 20 days", () => {
    const executed = worldTicksToDrTicks(20, 10);
    expect(executed).toBe(200);
    expect(drTicksToHospitalTimeMs(executed)).toBe(12_000_000); // 200 minutes
    expect(drTicksToHospitalDays(executed)).toBe(0); // not even one hospital day
    // Under the false 'day' premise, 20 world ticks were believed to be 20
    // days (28,800 DR minutes). Actual: 200. Ratio documents the error.
    expect(drTicksToHospitalTimeMs(28_800) / drTicksToHospitalTimeMs(executed)).toBe(144);
  });

  it("classifies cadence values under the sampling contract", () => {
    expect(classifyCadence(1440).kind).toBe("day-sample");
    expect(classifyCadence(10).kind).toBe("legacy-test");
    expect(classifyCadence(5).kind).toBe("legacy-test");
    expect(classifyCadence(300).kind).toBe("custom");
    expect(classifyCadence(0).kind).toBe("invalid");
    expect(classifyCadence(-1).kind).toBe("invalid");
    expect(classifyCadence(2.5).kind).toBe("invalid");
  });
});

describe("Temporal contract — DR clock arithmetic (pure)", () => {
  it("DR tick -> hospitalTimeMs", () => {
    expect(DR_MS_PER_TICK).toBe(60_000);
    expect(drTicksToHospitalTimeMs(1)).toBe(60_000);
    expect(drTicksToHospitalTimeMs(1440)).toBe(86_400_000); // one hospital day
    expect(drTicksToHospitalTimeMs(525_600)).toBe(31_536_000_000); // one hospital year
  });

  it("DR tick -> calendar day boundary (pure tickToDate)", () => {
    expect(tickToDate(0).totalDays).toBe(0);
    expect(tickToDate(1439).totalDays).toBe(0);
    expect(tickToDate(1440).totalDays).toBe(1);
    expect(tickToDate(28_800).totalDays).toBe(20);
    expect(tickToDate(525_600).totalDays).toBe(365);
    // Origin day is Monday 2026-06-15; +1440 minutes crosses to June 16.
    expect(tickToDate(0).day).toBe(15);
    expect(tickToDate(1440).day).toBe(16);
  });

  it("START_HOUR=18 is dead config: tick 0 resolves to MIDNIGHT, not 18:00 (recorded finding)", () => {
    // calendar.ts declares START_HOUR = 18 ("Fixed start: Monday, June 15,
    // 2026 18:00 WITA") but tickToDate never uses it: minuteOfDay = ticks %
    // 1440, so tick 0 = 00:00. This is a PRE-EXISTING DR-internal
    // inconsistency, unrelated to the Kronos world-tick contract. It is
    // pinned here so any future change is deliberate. See
    // reopen-audit/PHASE-C-NOTES.md (separate finding, not fixed in Phase C).
    expect(tickToDate(0).hour).toBe(0);
    expect(tickToDate(0).minute).toBe(0);
    expect(tickToDate(1080).hour).toBe(18); // 1080 min = 18:00 under current math
    expect(tickToDate(480).hour).toBe(8); // mm-conference 'Monday 8am' gate
  });
});

describe("Temporal contract — bounded runtime cross-check (<= 200 DR ticks)", () => {
  it("runWorld advances clock exactly as the arithmetic model predicts", { timeout: 30_000 }, () => {
    const PATIENTS = 5;
    const SEED = 42;
    const WINDOW = 200; // bounded: ~110 ms on Mac Mini M4
    const w = createWorld(PATIENTS, undefined, SEED);
    const r = runWorld(w, WINDOW);
    expect(r.clock.tick).toBe(WINDOW);
    expect(r.clock.hospitalTimeMs).toBe(drTicksToHospitalTimeMs(WINDOW)); // 12,000,000 ms
    // Calendar consistency for the executed window: 200 min = day 0, 03:20.
    const d = tickToDate(r.clock.tick);
    expect(d.totalDays).toBe(drTicksToHospitalDays(WINDOW));
    expect(d.hour).toBe(3);
    expect(d.minute).toBe(20);
    // Sentinel-window shape: 20 world ticks at legacy cadence 10 executes
    // exactly this many DR ticks — the adapter loop's arithmetic equivalent.
    expect(worldTicksToDrTicks(20, 10)).toBe(WINDOW);
  });
});
