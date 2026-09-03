# Phase C — Temporal Contract Notes (evidence and decision record)

**Status:** COMPLETE (pending commit) · **Execution host:** Mac Mini (`~/Project_v2/Deers-Rock`)
**Scope guard:** No changes to DR engine (`clock.ts`, `calendar.ts`, `world.ts`), RNG, adapter consumption, sentinel outputs, or rewind logic. Kronos repo untouched.

## 1. Current temporal dataflow (as implemented)

```
Kronos world tick (tick() in world-engine.ts:77)
  -> sector cadence gate (nextTick % cadence === 0, world-engine.ts:85-88)
  -> macro sectors advance: climate/geopolitics year += 1 (cadence 1);
     economy year += 1 every 3rd tick; technology year += 1 every 5th tick
  -> deers-rock-adapter tick (deers-rock-adapter.ts:201-204)
     ticksPerDay = s.config.ticksPerDay ?? TICKS_PER_WORLD_TICK (1440)
  -> for (i < ticksPerDay) { step(world) }   // N DR ticks per world tick
  -> DR clock: hospitalTimeMs = tick * 1000 * 60 (clock.ts:49)
  -> DR calendar: tickToDate(ticks) — day = floor(ticks/1440), time-of-day = ticks % 1440
```

## 2. Actual Kronos world-tick semantics: ONE YEAR

Primary evidence (code, not comments):
- `climate.ts:93,121` — cadence 1; each world tick: `year += 1`, `co2Concentration += emissionsToConcentration(annualEmissions)` with `annualEmissions` default **37 GtCO₂** — a real-world ANNUAL quantity. Each tick literally adds one year of global emissions.
- `geopolitics.ts:128,185` — cadence 1; `year += 1` per world tick; wars carry `s.year`.
- Era arithmetic: P-003 rewind probe moved climate `{year:2020, tickCount:0}` → `{year:2023, tickCount:3}` after 3 world ticks; the WWII-era experiment spans 1939 + 30 ticks → 1969.
- `world-engine.ts:85-88` — cadence gates execution frequency only; the time unit lives in the sectors.

Contradicting documentation: **P-002 lines 36/60/109/111/114** state "CHRONOS ENGINE (macro, 1 tick = 1 day)" and `TICKS_PER_WORLD_TICK = 1440 // 1 day of DR time`. This premise is refuted by the sector code. The proposal's day premise is the origin of both the 1440 default and the `ticksPerDay` field name.

Sector-cadence drift (Kronos-side observation, recorded not fixed): economy (cadence 3) and technology (cadence 5) advance their LOCAL `year` once per sector tick, so their year counters run at 1/3 and 1/5 canonical speed. Canonical world time = the cadence-1 sectors. Any macro-state interpretation must use the canonical clock.

## 3. Actual DR cadence semantics

- DR internal: 1 tick = 1 minute; 1440 = 1 hospital day (unchanged, proven).
- Effective coupling as configured: `ticksPerDay: 10` → **10 DR minutes per Kronos world YEAR**. P-004's 20 world ticks executed 200 DR minutes (≈3.33 h) while the world advanced 20 years. No temporal alignment existed.

## 4. Meaning/status of `ticksPerDay`

**D — legacy misnomer requiring redefinition** (with B and C as history):
- B: born from the erroneous day premise (1440 default);
- C: set to 10 as an explicit compute placeholder ("for speed", "can use a small number for testing" — chat archive);
- D: its true semantics are "DR ticks executed per Kronos world tick" = **sampling window per world year**. Kronos-side rename to `drTicksPerWorldTick` is recommended (out of scope for this repo; recorded as a Phase E/F dependency).

## 5. Is 525,600 DR ticks/year semantically relevant?

Yes — as the **semantic full-fidelity conversion** (1 world tick = 1 year = 365 × 1440 DR minutes). It is the honest answer to "what would temporal alignment mean". It is NOT an execution target.

## 6. Computational feasibility (Mac Mini M4, commit 2f932f0, 5 patients, seed 42; MEASURED)

| DR ticks | wall time | growth over previous doubling |
|---|---|---|
| 100 | 29 ms | — |
| 200 | 110 ms | 3.8× (p≈1.9) |
| 400 | 494 ms | 4.5× (p≈2.2) |
| 800 | **3,483 ms** | 7.1× (p≈2.8) |

Cost is **worsening superquadratic**: per-doubling growth factor rises from ~3.8× to ~7.1× (handlers copy whole collections per tick; collections compound as state accumulates). Extrapolation to 1,440 ticks ≈ **10–40 s** (p between 2 and 2.8). Extrapolation to 525,600 ticks is **days-to-weeks per world tick** — impossible; multi-seed multi-year literal fidelity is excluded outright. **Semantic conversion is therefore separated from execution strategy**: the contract mandates a declared sampling window per world tick. No fastForward mechanism exists in DR and none was invented.

Note for Phase F planning: cumulative state growth spans the whole coupled run (the sentinel world persists across world ticks). A 1440-window × 20 world-tick experiment costs ≈ one 28,800-tick run — under the measured worsening growth this is **minutes-to-hours per seed**; 30 seeds may be impractical. A smaller declared window (e.g., 360 = one hospital day-shift sample) is dramatically cheaper. The window choice belongs to the Phase F experiment spec and must be declared there.

## 7. START_HOUR finding (separate, NOT fixed)

`calendar.ts:38` defines `START_HOUR = 18` and the header documents "Fixed start: Monday, June 15, 2026 18:00 WITA", but `tickToDate` computes `minuteOfDay = ticks % 1440` — **tick 0 resolves to midnight**, and START_HOUR is never referenced. Consequences: the mm-conference "Monday 8am" gate and the ai-pharmacy 8am–8pm gate run on the midnight-anchored clock. This is a DR-internal inconsistency **unrelated to the Kronos world-tick contract**. Recorded here and pinned by a test in `tests/temporal.test.ts`; fixing it would shift every time-of-day behavior and must be a deliberate, separately authorized change.

## 8. Why the previous validation hung

The first `tests/temporal.test.ts` (now replaced) executed two 1,440-tick `runWorld()` runs inside vitest. On Windows (Node 22/x64) each exceeded 150 s; vitest's worker timed out and the run appeared to hang. Root cause was the superlinear runtime, not a `runWorld` defect (a 100-tick probe passed throughout). Fix: pure-arithmetic assertions + one bounded ≤200-tick runtime cross-check. Timeouts were not extended.

## 9. Temporal correction implemented (DR side, minimum necessary)

1. `src/engine/temporal-contract.ts` (new): canonical constants (`WORLD_TICK_SEMANTICS`, `DR_TICKS_PER_WORLD_TICK_FULL_FIDELITY = 525,600`), declared sample-window model (`SAMPLE_WINDOW`, `classifyCadence`), pure conversions (`worldYearsToDrTicksFullFidelity`, `worldTicksToDrTicks`, `drTicksToHospitalTimeMs`, `drTicksToHospitalDays`), full evidence citations, feasibility data.
2. `tests/temporal.test.ts` (new, bounded): 12 tests — world-tick semantics, full-fidelity math, premise refutation, sampling-window arithmetic (incl. P-004 horizon documentation), cadence classification, DR clock arithmetic, calendar day boundaries, START_HOUR dead-config pin, one ≤200-tick runtime cross-check.
3. No numeric change to any cadence: `ticksPerDay` values (Kronos-side) are neither changed to 1440 nor 525,600. The correction is **definitional** (rename/redefine semantics), exactly as required.

## 10. Cross-platform divergence (recorded limitation)

Same commit/seed/config/run → Windows (Node 22, x64): enc=62, hash `ff37e809…`; Mac (Node 26, arm64): enc=59, hash `c9e8b130…`. Same-platform determinism proven on both (7/7 suite). All Phase F arms must run on the Mac Mini; trajectory-level comparison across machines is invalid.

## 11. Remaining blockers (unchanged by Phase C)

- Phase D: `primaryDiagnosis` always absent (`{UNKNOWN:n}`); `supplyStress` hardcoded 0.3.
- Phase E: `admission_surge`/`staff_shortage` dropped by DR dispatcher; 3/5 packet fields unread; no malformed-packet validation.
- Phase F: requires new experiment spec (declared sample window, seeds, paired stats, FDR/Bonferroni) + Kronos-side dependencies (rewind deep-clone fix in master; recommended `ticksPerDay` rename).
