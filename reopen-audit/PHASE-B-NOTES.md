# Phase B — Reproducibility & Counterfactual Infrastructure — Notes

**Commit:** (pending Phase B commit)
**Goal:** Eliminate same-process label nondeterminism, document rewind aliasing, add determinism tests, ensure dist built from source.

## 1. Counter Reset

**Problem:** ~16 module-global counters (`let XCounter = 0`) were never reset on `createWorld()`. Second world in same process received shifted IDs (PAT-0001 vs PAT-0167), causing byte-level nondeterminism while RNG dynamics were identical (label-stripped hashes identical).

**Fix:** Added `export function resetXCounter(): void { XCounter = 0; }` to each module:

- `src/patient/generator.ts` — `resetPatientCounter`
- `src/identity/generator.ts` — `resetNikCounter`
- `src/agent/generator.ts` — `resetAgentCounter`
- `src/engine/charge-generator.ts` — `resetChargeCounter`
- `src/engine/cssd.ts` — `resetCssdCounters` (cycle + tray)
- `src/engine/dialysis.ts` — `resetDialysisCounters`
- `src/engine/scenario.ts` — `resetScenarioCounter`
- `src/engine/blood-bank.ts` — `resetBloodBankCounters` (unit + tx)
- `src/engine/clinical-nutrition.ts` — `resetClinicalNutritionCounters`
- `src/engine/ipc.ts` — `resetIpcCounter`
- `src/engine/microbiology.ts` — `resetMicrobiologyCounter`
- `src/engine/pathology.ts` — `resetPathologyCounter`
- `src/engine/mm-conference.ts` — `resetMmConferenceCounter`
- `src/engine/radiotherapy.ts` — `resetRadiotherapyCounters`
- `src/engine/biomedical-engineering.ts` — `resetBiomedCounter`
- `src/engine/journal.ts` — `resetJournalPurgeTick`, `resetJournalExportTick`

`src/engine/world.ts:createWorld()` now calls all resets at entry before any generation. Preserves mulberry32 RNG behavior (counters are labels, not RNG). Verification: two sequential `createWorld(30,undefined,42)` now produce identical `PAT-0001..` IDs.

**Remaining counters intentionally not reset:** local loop `let i = 0` variables (e.g., world.ts:300, markov.ts:60) — these are function-scoped, not module-global.

## 2. Rewind-Point Aliasing

**Bug (Kronos Engine side):** `src/timeline/rewind-point.ts:createRewindPoint` stored `sectorStates[id] = record.state` **by reference**. Sector `tick()` mutates state in place (commit 8b30779: 4 sectors). Parent `run(world,20)` mutates the very object the rewind point references. Probe: RP climate `{year:2020,tickCount:0}` → `{2023,3}` after parent run. `forkBranch` then restores a corrupted baseline → branch runs from wrong state → diff mixes horizons.

**Fix location:** Kronos Engine `src/timeline/rewind-point.ts:66` (`sectorStates[id] = deepClone(record.state)`) and `world-engine.ts:142` deepClone at restore — already implemented in worktree `C:\Users\think\Project_v2\Kronos-Engine-remediation` (branch `reopen-remediation`, commit fix-1). Master still has the bug.

**DR side:** `src/engine/journal.ts:saveSnapshot` deep-serializes via JSON (Maps as arrays) — correct. No DR code change needed, but DR now exposes deterministic `createWorld` for Kronos to snapshot. Documented here as dependency: **Kronos master must merge the remediation fix before P-004 can be valid.** A helper `cloneHospitalState` could be added if Kronos needs explicit DR cloning, but JSON snapshot is sufficient.

## 3. Determinism Tests

New file `tests/determinism.test.ts` (7 tests):

- same seed in same process yields identical IDs after reset
- same seed + same ticks yields identical state (encounters, charges, labs)
- different seeds yield different trajectories
- sentinel independence: 3 derived seeds A!=B!=C
- perturbation of A (30→80 patients) leaves B unchanged
- local RNG isolation: throwaway world does not alter later world
- step determinism

All tests are fast (<200 ticks).

## 4. Build

`npm run build` (tsc) must be run after every source change before experiments. `dist/` is not committed; it is a build artifact. CI should run build before `vitest` and before any `tsx` experiment that imports from `dist/` (the Kronos adapter imports `../../../Deers-Rock/dist/index.js`). Documented as requirement.

## 5. Proven Properties Rechecked

- canonical mulberry32 — unchanged (clock.ts)
- per-sentinel seed derivation — unchanged, verified again
- sentinel A!=B!=C — still holds, now also holds in same process after fix
- local RNG isolation — still holds

## 6. Remaining Blockers Before Phase F

- Phase C: temporal contract (ticksPerDay 10 vs 1440)
- Phase D: primaryDiagnosis, supplyStress
- Phase E: admission_surge / staff_shortage consumption + validation
