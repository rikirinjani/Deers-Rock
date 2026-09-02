# A Deterministic Healthcare Microsimulation as a Sentinel in a Macro-Scale World Model: Architecture, Boundary Isolation, and an Honest Negative Counterfactual Result

**Status:** DRAFT v1 — reopening audit manuscript (2026-08-31). Not submitted. All claims verified against executable evidence; see companion `PAPER-NOTES.md` and the `../reopen-audit/` evidence files.

---

## Abstract

**Background.** Multi-scale simulation architectures couple macro-scale world models (economy, climate, geopolitics) with micro-scale domain simulations (e.g., a hospital). A central design question is whether a micro-scale simulation can function as a *standalone sentinel* — deterministic, independently reproducible, isolated from world state — while participating in the macro environment through an explicit adapter boundary.

**Objective.** We re-audited Deers Rock, a TypeScript micro-scale healthcare simulation, and its documented integration with the Kronos Engine world simulator, to determine which architectural claims the implementation actually supports.

**Methods.** Adversarial evidence audit: source inspection, full-state SHA-256 determinism probes across processes and seeds, a three-sentinel independence experiment with perturbation, a macro-adapter penetration test, failure injection (11 cases), temporal-scale verification, regeneration of the committed counterfactual experiment, and full multiplicity-aware recomputation of its statistics.

**Findings.** Cross-process determinism holds: identical seeds in separate processes produce byte-identical full state for seeds 42, 0, and 7 (200 ticks), backed by a genuine mulberry32 PRNG. Per-sentinel seeds derive from the documented golden-ratio hash `worldSeed ^ (hospitalId × 2654435761) >>> 0`. Three sentinels from one world seed yield distinct trajectories (A≠B≠C); each reproduces byte-identically in fresh processes; perturbing one sentinel changes neither of the others — local autonomy is verified. However, the macro→micro channel is **inert**: the adapter computes a five-field MacroConditionPacket but DR's tick dispatcher drops the only two scheduled events (`admission_surge`, `staff_shortage`) and never reads the other three fields; sentinel output is byte-identical with and without extreme-weather and war events over 20 world ticks. The micro→macro channel is **dead**: `health.*` events have zero subscribers. The committed COVID-19 counterfactual (30 seeds, "14/156 significant", Cohen-style d from −2.71 to +0.58) does **not** regenerate (fresh build yields 515 metrics/42 flags; the committed values require the unseeded pre-fix build, which is itself run-to-run non-reproducible). After multiplicity correction (FDR→9, Bonferroni→8 survivors) and artifact removal (71% of the "significant" set are duplicates or degenerate), no defensible macro→micro effect remains; the top effect (CSSD cycles, d=−2.71, t=−10.5) is a structural baseline-corruption artifact of a by-reference rewind-point bug.

**Conclusions.** The evidence supports a narrow architectural claim — a standalone deterministic healthcare microsimulation functioning as an independent sentinel within a macro-scale world model through an explicit adapter boundary, with verified local autonomy and scale separation — and does **not** support claims of macro-condition penetration, hospital-to-world feedback, counterfactual healthcare experimentation, or clinical prediction. We report the counterfactual as a negative result and specify the engineering changes required to test the coupling claim.

---

## 1. Introduction

Simulation research increasingly couples models across scales: global or national world models (climate, economy, geopolitics, energy) with fine-grained domain simulations (hospitals, supply chains, populations). The promise is counterfactual experimentation — "what if" questions that require both a world and a local system that respond to it.

Two failure modes plague such integrations. First, **coupling by leakage**: the macro model reads the micro model's internals (or vice versa), destroying the local simulation's independence and making results irreproducible. Second, **coupling by fiction**: the interface exists in types and documentation, but the signal does not actually change downstream behavior — the adapter is a write-only pipe, and reported "effects" are artifacts of nondeterminism or baseline corruption rather than of the intervention.

This paper reports a formal reopening audit of **Deers Rock** (DR), a micro-scale healthcare simulation in TypeScript, and its documented integration with the **Kronos Engine** (KE), a macro-scale deterministic world simulator. The audit was commissioned to determine whether the system supports a formal publication. Following the governance principle that previous results are not sacred, every prior claim — determinism, adapter behavior, sentinel output, and a committed COVID-19 counterfactual experiment — was re-derived or refuted from executable evidence.

**Contribution.** We provide (1) an evidence matrix mapping 30 documented claims to implemented/tested reality; (2) executable verification of determinism, seed derivation, and sentinel independence; (3) a demonstration that the documented macro→micro and micro→macro channels are, respectively, inert and dead; (4) a corrected, multiplicity-aware statistical analysis of the committed counterfactual showing its "significant" results are artifacts; and (5) a narrowly-scoped architectural claim that the evidence supports.

## 2. Problem Definition

The design brief for Deers Rock states two architectural principles:

> "The world does not reach into the hospital. It knocks on the adapter's door and waits for the signal."

and

> Kronos → MacroConditionPacket → adapter → Deers Rock; Deers Rock → HospitalSentinelOutput → adapter → Kronos.

The scientific question is whether a standalone micro-scale healthcare simulation can participate in a macro-scale counterfactual environment through a controlled adapter interface — with local autonomy (no direct world-state access), deterministic reproducibility, and scale separation (1 world tick = 1 day; 1 DR tick = 1 minute).

The formal claims to be tested:
- **C1** DR is deterministic: same seed + configuration + initial state ⇒ same trajectory.
- **C2** DR is independently reproducible as a standalone sentinel.
- **C3** DR consumes macro conditions through the adapter without direct world-state access.
- **C4** Macro conditions produce measurable hospital-level changes.
- **C5** Hospital outputs aggregate into macro signals (feedback).
- **C6** The adapter preserves scale separation.
- **C7** The system supports counterfactual healthcare experimentation.

## 3. Deers Rock Simulation

Deers Rock (`version 0.5.0`, Apache-2.0, TypeScript/ESM, `better-sqlite3` journaling) is a minute-tick hospital microsimulation: patient generation, admission/discharge Markov flow, diagnoses (closed ICD-10 list), medications, laboratory, radiology, surgery, dialysis, CSSD/sterile supply, nursing/doctor/pharmacy "AI" handlers, finance, and a probabilistic Scenario Engine (earthquake, forest_fire, sunken_ship, pandemic, industrial_accident, mass_casualty, tsunami).

**Tick semantics (verified).** One tick = 1 simulated minute (`tickIntervalMs=1000 × speedMultiplier=60 = 60,000 ms`); 1440 ticks = 1 day (`hospitalTimeMs = 86,400,000` at tick 1440; calendar day boundary verified). There is no `fastForward()` function; headless runs use a plain `runWorld()` loop. Handler cadence: admissions every tick, scenario every 5, new patients every 15; **no handler fires specifically at the 1440-tick day boundary** (the boundary is a derived lookup), and exactly one handler (`aiOutpatientPharmacyHandler`) depends on absolute time-of-day (`clock.tick % 1440` — pharmacy hours).

**Deterministic execution.** The PRNG (`src/engine/clock.ts:createRng`) is a genuine **mulberry32** — empirically bit-identical to the canonical bryc implementation for the first 100,000 outputs across seeds 42, 0, 7, 12345 (the source is algebraically equivalent but cosmetically rewritten). With an explicit seed, patient pool, agent pool, and clock all derive from it. Two caveats were verified:
1. **Same-process, cross-`createWorld` determinism fails at the ID-label level.** ~20 module-level global counters (patient, agent, NIK, charge, CSSD-cycle, dialysis-session, scenario counters) are never reset, so a second world created in the same process receives shifted ID labels (`DOKT-0001` vs `DOKT-0123`). Label-stripped full-state hashes are identical — RNG dynamics are deterministic; labels are not. This is a reproducibility limitation for in-process multi-world runs and any artifact that embeds IDs.
2. **Seedless default runs** use `Date.now()` for the clock seed and `Math.random()` fallbacks for the patient pool — nondeterministic. Determinism holds only when a seed is passed (the experiment path always passes one).

**Calibration.** DR is a *synthetic* model. No mechanism is calibrated to an external dataset; ADR-004 admits the factor weights are "arbitrary" (only mortality-risk thresholds are hand-aligned to cited Indonesian in-hospital mortality literature ranges), the Kaggle healthcare dataset noted for future calibration is deferred, and the disease-prevalence output is structurally broken (see §7). **DR makes no clinical prediction claim in this paper.**

## 4. Macro/Micro Scale Architecture

The documented scale mapping is: **1 world tick = 1 day; 1 DR tick = 1 minute; 1 world tick = 1440 DR ticks.**

Verified reality: the constant `TICKS_PER_WORLD_TICK = 1440` exists in the adapter, but **all 30 shipped Indonesian sentinel configs override `ticksPerDay: 10`**, so the actual runtime coupling is **1 world tick = 10 DR ticks = 10 simulated minutes**. The P-004 "20-tick" counterfactual therefore spans ~200 DR ticks ≈ 3.3 simulated hours, not 20 days. The documented 1440 mapping is a default that never executes in practice.

The world side (Kronos) is a separate deterministic engine: mulberry32-seeded, `1 world tick = 1 day`, sector/cadence/event architecture with cross-sector events. This audit does not re-litigate Kronos's own integrity (its rewind-point hashing was found vacuous and its rewind baseline aliased in a companion audit; fixes exist only in a remediation worktree, not in master — see §10).

## 5. Sentinel Adapter

The adapter (`Kronos Engine/src/sectors/deers-rock-adapter.ts`) is the **only** coupling point. It translates world events into a `MacroConditionPacket`:

```
{ admissionMultiplier, diagnosisWeightOverrides, supplyChainPressure,
  staffAvailabilityModifier, activeDisasterType? }
```

and computes a `HospitalSentinelOutput`:

```
{ occupancyRate, icuOccupancyRate, mortalityPressure, diseasePrevalence,
  supplyStress, staffStress, admissionSurge }
```

**Macro→micro (verified inert).** The adapter schedules exactly two events into DR's queue: `admission_surge` (if admissionMultiplier ≠ 1.0) and `staff_shortage` (if staffAvailabilityModifier < 1.0). DR's tick dispatcher (`world.ts:260-267`) handles only `discharge`, `lab_result`, `rad_result`, `ed_discharge`, `surgery_done` — **`admission_surge` and `staff_shortage` are silently dropped**. The other three packet fields (`diagnosisWeightOverrides`, `supplyChainPressure`, `activeDisasterType`) are computed and **never read** by any code. End-to-end probe: sentinel output was byte-identical across baseline / EXTREME_WEATHER / EXTREME_WEATHER+WAR_START runs over 20 world ticks (0 of 20 trajectory ticks differ). **Macro conditions have zero measured effect on DR.**

**Micro→macro (verified dead).** The adapter publishes `health.pressure/mortality/supply-crisis/surge/down` events, but **no sector subscribes to any `health.*` type**; the adapter's handler registry is empty. Forced emission of 22 health events (occupancy 1.0) and direct injection of all five types produced **zero change in any world sector** (world-only vs +sentinel differ only because adding a sector perturbs the shared world RNG stream — a structural artifact, not signal). The event bus is never cleared, accumulating events unboundedly.

**Boundary compliance.** DR has no import of any Kronos module; it cannot read GDP, war, climate, or other world state (verified by grep and by construction). Per-sentinel RNG seeds derive via `getHospitalSeed(worldSeed, hospitalId) = (worldSeed ^ (hospitalId × 2654435761)) >>> 0` with `hospitalId` the absolute djb2 hash of the sentinel id — verified distinct for (42,1),(42,2),(42,3),(43,1),(0,1). **Soft violations**: the adapter reads DR internals directly (importing `dist/engine/state-store.js` `HospitalState`) and reads `bed.patientId` / `encounters.primaryDiagnosis` / `morgue` to compute occupancy/prevalence/mortality — patient identity is transiently visible, though only aggregates propagate upward, and the "no patient data" invariant is documentation-only (its gate check is skipped without `rg`).

**Sentinel output audit (per-field).**

| Field | Source | Class |
|---|---|---|
| occupancyRate | occupied/capacity (live) | operational proxy |
| icuOccupancyRate | ICU+PICU+NICU occupied/capacity (live) | operational proxy |
| mortalityPressure | `morgue.length` — a **count**, not a rate | simulation-only |
| diseasePrevalence | top-5 ICD counts, but **always `{UNKNOWN: n}`** (encounters carry no `primaryDiagnosis`) | **broken** |
| supplyStress | **hardcoded 0.3** | constant, not a measurement |
| staffStress | `min(1, encounters/(wardKeys×3))` | operational proxy (uncalibrated) |
| admissionSurge | occupied > 90% capacity | operational proxy |

**No output is clinically validated; none responds to macro interventions** (§5, byte-identical probe).

## 6. Deterministic Execution (experimental verification)

**Probe A — same-seed full-state determinism.** `createWorld(50, undefined, seed)`, `runWorld 200 ticks`, full-state SHA-256:

| seed | run A | run B (separate process) | identical |
|---|---|---|---|
| 42 | 665e2fd2… | 665e2fd2… | **YES** |
| 0 | cce3830f… | cce3830f… | **YES** |
| 7 | 6dcad7e8… | 6dcad7e8… | **YES** |

Two worlds in one process differ only in ID labels (label-stripped hashes identical, `32cbad6f…`). **Cross-process determinism holds.**

**Probe B — seed derivation.** `getHospitalSeed` verified; distinct seeds; `createWorld(seed)` uses the seed for both patient pool and clock.

**Probe C — sentinel independence (full experiment, §12 of the audit brief).** Three sentinels from the same world seed 42: A≠B≠C (raw, label-stripped, and trajectory hashes pairwise distinct). Sentinel B recreates **byte-identically** across fresh processes (`0c6109b0…` vs `713e33`-suffix run). **Perturbing sentinel A** (patients 30→80 + forced earthquake) changed **neither B nor C** (trajectory hashes `f10e0fe3…` / `d56b31f7…` identical in-process and vs fresh-process baseline). A prior throwaway world in-process does not alter a later world's trajectory (RNG isolation: `7ce2c367…`/`067d5a91…` identical). Residual same-process coupling: ID-label shifts plus two inert display attributes (blood-bank rhesus `unitCounter%8`, micro specimen `orderCounter%6`) whose consumers have zero callers.

**Verdict: C1 (deterministic), C2 (independently reproducible), and the RNG-isolation half of C3 are PROVEN.**

## 7. Experimental Design

- **Adapter penetration:** baseline vs EXTREME_WEATHER vs EXTREME_WEATHER+WAR_START, 20 world ticks × `ticksPerDay:10`, sentinel output + full DR state compared (byte-identical — §5).
- **Sentinel independence:** 3 sentinels, perturbation of one, in-process and cross-process comparisons (§6).
- **Failure injection (11 cases):** malformed packet; extreme admission multiplier (×1000); zero staff availability; extreme supply pressure; unknown diagnosis code; missing field; invalid disaster type; corrupted snapshot; zero/negative `ticksPerDay`; sentinel restart; seed mismatch.
- **Temporal scale:** tick/day math, day boundary, `% 1440` scan, fastForward absence (§3).
- **Counterfactual regeneration:** the committed P-004 artifacts re-run with (a) current deterministic build, (b) reconstructed pre-fix build, (c) twice for run-to-run reproducibility.
- **Statistics:** full recomputation of all 156 committed metrics from per-run data with t-statistics, FDR, Bonferroni, duplicate/degeneracy/artifact analysis, and power.

## 8. Counterfactual Experiment (P-004) — Honest Negative Result

The committed artifact (`experiment-results/dr-counterfactual/p004-30seeds-*`): 30 seeds (42–71), 20 ticks, 156 metrics, 14 flagged "significant", effect sizes CSSD d=−2.71, dialysis d=+1.11, diseasePrevalence.UNKNOWN d=+0.91, occupancy d=+0.70, outcomeRecords d=+0.58.

**Regeneration:**

| Source | Metrics | Significant |
|---|---|---|
| Committed artifact | 156 | 14 |
| Current deterministic build | 515 | 42 |
| Pre-fix build, run 1 | 532 | 31 |
| Pre-fix build, run 2 | 530 | 41 |

Only the intervention constant (`annualEmissionsNoise = −0.18`) matches. The committed values are **unreproducible**. Three causes: (1) the metric surface changed with the engine (commit 8b30779 added paths); (2) the experiment hardcodes `worldSeed=42`, so with a deterministic build **all 30 runs produce identical DR state and every DR metric has d=0** — the committed seed-varying DR values can only arise from the unseeded `Math.random()` in the pre-fix build; (3) a **rewind-point aliasing bug**: `createRewindPoint` stores sector state by reference and sectors mutate in place, so the branch restores a parent-corrupted baseline (probe: RP climate state mutated from `{year:2020, tickCount:0}` to `{year:2023, tickCount:3}` by the parent run). A no-intervention branch already diverges from parent — divergence comes from the rewind/restore mechanics, not the climate intervention.

**Corrected statistics (recomputed from committed per-run data; flags reproduced 156/156, set exact):**

- Expected false positives at α=0.05 for 156 tests: **7.8**. Observed: 14 (1.79× noise floor).
- **BH-FDR q=0.05 → 9 survivors; Bonferroni → 8.** Dropped by all corrections: occupancyRate (p=0.016), outcomeRecords (p=0.033), RUS.unemploymentRate (p=0.036), RUS.patents (p=0.024).
- **71% of the "significant" set is artifacts:** 6 duplicate flags (3 exact `world.state.*` ↔ `lastTickState.*` pairs — 13 duplicate pairs total, 16.7% of all paths), 3 zero-SD constants (`wars.length` Δ≡+1 with zero-width CI), 1 floating-point artifact (`annualEmissionsNoise` d=−9.02e15, sd≈2.8e-17). The 14 flags contain only 11 distinct quantities.
- **Ragged capture:** 148/156 metrics appear in fewer than 30 runs (n as low as 1).
- **Horizon:** no child tick recorded in any committed artifact — parent/child horizon equality is unverifiable; if mismatched, all 28 DR metrics are confounded.
- **Cohen's d in the committed pipeline is not a two-group effect size:** `cohensD(values.map(()=>0), values)` is a one-sample standardized mean scaled √2, not comparable to literature d.
- **Power (n/group, 80%, α=0.05):** d=2.71→3, d=1.11→13, d=0.91→19, d=0.70→33, d=0.58→47. n=30 is inadequate for the two smallest (the very two that fail multiplicity control).

**Interpretation.** For the CSSD "halving" (d=−2.71, t=−10.5, parent 9.97 → branch 5.00) to be a real intervention effect, all of the following must hold: the adapter ingests macro events (it does not — events dropped, 3/5 fields unused); the rewind baseline is a clean copy (it is not — by-reference aliasing); parent/child horizons match (unverifiable); seed variance is genuine simulation noise (it is not — hardcoded worldSeed + stale nondeterminism). **The data are fully consistent with an inert adapter plus a corrupted rewind baseline; there is no defensible statistical evidence of macro→micro penetration. C4 and C7 are REFUTED for the current implementation.**

## 9. Failure/Boundary Testing

11 failure-injection cases (adapter + DR):

| Class | Cases | Mechanism |
|---|---|---|
| **Silent ignore** (5) | malformed/unknown events; `admission_surge` ×1000; `staff_shortage` mod 0; `ticksPerDay` ≤ 0; **seed mismatch** | no default case in switch; events dropped by dispatcher; no drift guard; no seed-consistency validation |
| **Clamp** (1) | extreme supply pressure → clamps at 1 (float artifact 0.9999999999999999 at 10 increments) | `Math.min(1,…)`; field never consumed anyway |
| **Crash** (2) | invalid disaster type ("meteor") → TypeError `surgeMin` at tick 5 (unvalidated non-null assertion); corrupted snapshot → uncaught `JSON.parse` SyntaxError | scenario.ts:145; journal.ts:324 |
| **Deterministic propagate** (1) | sentinel restart: byte-identical across fresh processes; ID labels shift in-process | module counters |
| **Graceful** (2) | unknown ICD (counted as-is; but sentinel prevalence always UNKNOWN — contract bug); missing `data` field (no crash) | icd-tracker; adapter reads type only |

**Verdict:** the adapter never rejects malformed input; everything degrades to baseline. The circuit breaker (rollback to `lastTickState` + `health.down`) is the only genuinely defensive mechanism, but it retry-spams on persistent failure. The most dangerous class is silent-ignore — **seed mismatch and cadence drift produce plausible-looking but wrong trajectories with no error.**

## 10. Discussion

**What is demonstrated.** A standalone, deterministic, boundary-isolated micro-scale healthcare simulation with per-sentinel seeded RNG and verified local autonomy. These are engineering facts with executable evidence: byte-identical cross-process state, genuine mulberry32, correct golden-ratio seed derivation, A≠B≠C sentinel independence with perturbation isolation.

**What is not demonstrated.** Any causal coupling between the macro world and the hospital. The adapter boundary exists but is a write-only pipe; the documented feedback channel is dead code. The committed counterfactual — the flagship integration experiment — is unreproducible and its "significant" results are statistical artifacts. On the Kronos side, the companion audit found the rewind-point baseline aliasing bug and vacuous state hashing in master (remediated only in an unmerged worktree), compounding the P-004 invalidity.

**Why the negative result matters.** The "adapter with types but no behavior" failure mode is precisely the fiction the audit brief warned against. The committed effect sizes and "14/156 significant" claim, if published, would mislead: they are nondeterminism noise and baseline corruption wearing the costume of a dose-response. Reporting them as a negative result — and specifying the fix — is the honest scientific outcome.

**Alternative interpretations.** Could the P-004 CSSD effect be real despite the inert adapter? The adapter drops the only scheduled events, so there is no causal pathway from macro events to CSSD cycles. The only remaining pathway would be direct world-state reads, which are forbidden and absent. The effect must therefore be an artifact. Could DR's determinism be an artifact of the specific seeds tested? The mulberry32 verification (100k outputs, 4 seeds) and cross-process byte-identity make seed-dependent behavior implausible; the same-process label shift is the only nondeterminism found.

**Required engineering changes to test the coupling claim** (not implemented here):
1. Implement DR handlers for `admission_surge` and `staff_shortage` (or a genuine packet-consumption path) so macro conditions actually alter admissions/staffing.
2. Use `ticksPerDay: 1440` (or validate the 10-tick cadence) to honor the documented scale separation.
3. Fix the rewind-point baseline (deep-clone) so counterfactual branches start from an identical, immutable state; record parent/child horizons in artifacts.
4. Replace one-sample zero-control effect sizes with proper paired/two-group statistics; report FDR/Bonferroni-corrected counts and the noise-floor comparison; collapse duplicate `world.state`/`lastTickState` paths.
5. Give encounters a real `primaryDiagnosis` so `diseasePrevalence` is meaningful; replace hardcoded `supplyStress`.
6. Reset module-global counters per `createWorld` (or document same-process ID-label shift as a reproducibility boundary).
7. Either implement `health.*` consumers or state plainly that the system is world→hospital only (and currently inert).

## 11. Limitations

1. **No clinical validity.** DR is a synthetic, uncalibrated model; no output is a clinical prediction. Mortality thresholds are literature-anchored but not fitted; the calibration reference flags the casualty/GDP gaps OPEN; no external dataset is used.
2. **Same-process determinism boundary.** ID labels shift across in-process re-instantiation; artifacts embedding IDs are not reproducible in-process.
3. **Wall-clock residue.** FHIR exports, SIRS `generatedAt`, experiment output filenames, journal `created_at`, and age computation use `Date.now()`/`getFullYear()` — simulation dynamics are wall-clock-free; exported artifacts are not.
4. **Stale shipped build.** DR `dist/` was not committed; the Kronos integration imported a stale pre-fix build for some period, which is run-to-run non-reproducible. Reproducibility requires building from the pinned source.
5. **Soft boundary violations.** The adapter reads DR internals and transiently reads patient identity for occupancy/prevalence.
6. **Kronos master integrity.** The companion audit found rewind-aliasing and vacuous hashing in master; fixes are unmerged.
7. **Small horizon.** The counterfactual spans ~200 DR ticks (≈3.3 h); short-horizon and ramp effects are unexamined.
8. **Single-node determinism scope.** Determinism was verified on one machine/node version; cross-platform RNG (Math.imul semantics, float determinism) is not verified.

## 12. Reproducibility

- **DR:** version 0.5.0, commit `85b3119` (main). `npm run build` then `npx tsx src/experiment/runner.ts <seeds> <ticks>`.
- **Determinism probe:** `createWorld(50, undefined, seed)` + `runWorld(world, 200)` + full-state SHA-256; see audit `08-experiment-reports.md` and probe scripts.
- **Kronos integration:** `Kronos Engine` (master), `src/experiment/experiments/run-dr-counterfactual.ts` (30 seeds, seeds 42–71).
- **Critical caveat:** the committed P-004 artifacts do **not** regenerate from current source; any reproduction must state which build produced which numbers. Dist is not committed; always build from source.
- All probe scripts and evidence files from this audit are catalogued in the audit package (`reopen-audit/`); raw experiment artifacts are preserved in `experiment-results/` (DR) and `experiment-results/dr-counterfactual/` (Kronos).

## 13. Conclusion

A formal reopening audit of Deers Rock and its Kronos integration, conducted adversarially and from executable evidence, establishes the following: the microsimulation is **deterministic across processes**, **independently reproducible as a sentinel**, and **boundary-isolated** from world state, with verified per-sentinel seed derivation and local autonomy. It equally establishes that the documented coupling — macro conditions changing hospital behavior and hospital outputs feeding the world — is **not implemented**: the macro→micro adapter is inert, the micro→macro channel is dead, and the committed counterfactual experiment is unreproducible with statistically meaningless "significant" results.

The defensible claim is architectural:

> A standalone deterministic healthcare microsimulation can function as an independent sentinel within a macro-scale world model through an explicit adapter boundary, with per-sentinel seeded RNG, verified local autonomy, and scale separation — while the macro→micro and micro→macro coupling channels remain to be demonstrated.

This paper does not claim a realistic hospital, clinical prediction, or a validated counterfactual. It reports what the system actually does, what it does not yet do, and exactly what must change before the coupling claim can be tested.

## 14. Data and Code Availability

- Deers Rock source: https://github.com/vierm2606-bangtan/Deers-Rock (Apache-2.0).
- Kronos Engine: sibling repository (master) — integration point `src/sectors/deers-rock-adapter.ts`.
- Audit package (this manuscript, evidence files, matrices, statistics): `reopen-audit/` in the DR repository working tree.
- No DOI is assigned; archival (Zenodo) is pending release publication and human authorization.
- No patient data: all simulation-generated synthetic records.

## References

1. bryc, *mulberry32 — 32-bit seeded PRNG* (public domain reference implementation), https://github.com/bryc/code (verified bit-identical to DR's `createRng`).
2. Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: a practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B*, 57(1), 289–300.
3. Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.). Erlbaum.
4. World Health Organization. *International Statistical Classification of Diseases and Related Health Problems, 10th Revision (ICD-10)*.
5. HL7. *FHIR Release 4 (R4)* specification, https://hl7.org/fhir/R4/.
6. Cockcroft, D. W., & Gault, M. H. (1976). Prediction of creatinine clearance from serum creatinine. *Nephron*, 16(1), 31–41. *(cited in DR calibration notes only; not used in this analysis)*

---

*Draft v1 — reopening audit manuscript. Every quantitative claim traces to the audit evidence files (`reopen-audit/01-08`); see `PAPER-NOTES.md` for the claim→evidence map and excluded prior claims.*
