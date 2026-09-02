# Deers Rock — Scientific Claim Audit

**Date:** 2026-08-31 · Method: claims from all prior papers/READMEs/signals tested against regenerated evidence.

| # | Proposed Claim | Evidence | Strength | Keep? |
|---|---|---|---|---|
| C1 | DR is deterministic (same seed + config + state → same trajectory) | Probe A: cross-process SHA-256 identical (seeds 42/0/7, 200 ticks); mulberry32 bit-identical; label-stripped in-process identical | **PROVEN** (cross-process) | ✅ YES, exact wording: "cross-process deterministic; same-process re-instantiation shifts ID labels" |
| C2 | DR is independently reproducible | 3-sentinel experiment: B byte-identical across fresh processes; A≠B≠C from same world seed | **PROVEN** | ✅ YES |
| C3 | DR can consume macro conditions without direct world-state access | Boundary matrix: DR has no KE import; packet is only input surface | PARTIAL — boundary clean, but consumption is inert (events dropped, 3/5 fields dead) | ⚠️ REWORD: "DR receives macro conditions through an adapter boundary" (structural) — NOT "macro conditions change DR" |
| C4 | Macro conditions produce measurable hospital-level changes | Adapter probe: sentinel output byte-identical with/without EXTREME_WEATHER/WAR (0/20 ticks differ); P-004 effects are artifacts | **UNSUPPORTED** | ❌ NO — remove unless adapter consumption path is implemented |
| C5 | Hospital outputs can be aggregated into macro signals | health.* events published; ZERO subscribers; handlers array empty | **UNSUPPORTED** | ❌ NO — reverse channel is dead code |
| C6 | The adapter preserves scale separation | 1 min vs 1 day mapping exists (1440 constant) BUT all 30 sentinels use ticksPerDay:10 → actual 10 min/world-tick; no fastForward; adapter inert | PARTIAL | ⚠️ REWORD honestly: "scale separation is designed (1 min DR tick) but the world↔DR cadence in practice is 10 DR ticks per world tick" |
| C7 | The system supports counterfactual healthcare experimentation | P-004 unreproducible (156/14 vs 515/42 vs 532/31); effects = stale-build noise + rewind aliasing; stats invalid (10/14 artifacts, FDR→9, Bonferroni→8) | **UNSUPPORTED** | ❌ NO — must be redesigned with fixed adapter + matched baseline + corrected stats |
| C8 | DR is "a realistic hospital that predicts healthcare" | No calibration to external data; ADR-004 admits arbitrary weights; diseasePrevalence broken; mortalityPressure is a count | **UNSUPPORTED** | ❌ NO — never claim clinical prediction |
| C9 | Architectural claim: "A standalone healthcare microsimulation functioning as a deterministic sentinel within a macro-scale counterfactual world model through an explicit adapter boundary" | C1+C2+C3-structural verified; adapter boundary exists but is inert; counterfactual world model (Kronos) independently has its own bugs (rewind aliasing, vacuous hashing — remediated only in worktree) | **DEFENSIBLE with narrow wording** | ✅ YES if scoped: "deterministic standalone sentinel; explicit adapter boundary; macro→micro and micro→macro coupling NOT yet demonstrated" |
| C10 | RNG isolation: world and hospital RNG independent; derived seed formula | Probe B: getHospitalSeed verified; 3-sentinel experiment: perturbing A changes neither B nor C; local autonomy proven | **PROVEN** | ✅ YES |
| C11 | Previous specific numbers (d=−2.71, +1.11, +0.91, +0.70, +0.58; 14/156) | Reproduction shows all unreproducible; recomputation shows artifacts dominate | **FALSE/ARTIFACTS** | ❌ NO — replace with corrected analysis or drop |
| C12 | "Byte-for-byte reproducible P-004" (prior audit) | Regeneration: 156/14 committed vs 515/42 fresh vs 532/31+530/41 stale | **FALSE** | ❌ NO |
| C13 | No patient data leakage | Adapter reads bed.patientId, encounters.primaryDiagnosis, morgue — patient identity transiently read; invariant doc-only | PARTIAL (soft violation) | ⚠️ REWORD: "only aggregates flow upward; patient identity is read transiently in occupancy/prevalence extraction" |
| C14 | Wall-clock independence | Sim loop wall-clock-free; but FHIR exports, SIRS generatedAt, experiment filenames, journal created_at, and age computation use Date.now()/getFullYear | PARTIAL | ⚠️ Declare scope: "simulation dynamics are wall-clock-free; exported artifacts embed timestamps" |

## Retained claim set (defensible, evidence-backed)

1. **Deterministic execution:** same seed + config in a fresh process → byte-identical trajectory. (C1)
2. **Independent reproducibility of sentinels:** per-sentinel derived seeds; A≠B≠C; each reproduces in fresh processes; perturbation of one leaves others unchanged. (C2, C10)
3. **Boundary isolation (DR side):** DR has no direct access to world state; the adapter is the only input surface. (C3-structural)
4. **Scale separation (designed):** 1 DR tick = 1 simulated minute; 1440/day conversion exists. (C6-honest)
5. **Adapter boundary exists but coupling is not yet demonstrated:** macro→micro inert, micro→macro dead. (negative result — report as finding, not claim)

## Rejected claims

- Macro conditions produce measurable hospital changes (C4) — refuted by byte-identical probe.
- Hospital→world feedback (C5) — dead channel.
- Counterfactual healthcare experimentation (C7) — unreproducible artifacts.
- Clinical prediction/validity (C8) — no calibration.
- Previous effect sizes & "14/156" (C11, C12) — artifacts.

## Positioning (per brief §19)

**Adopt the narrow architectural claim:**

> "A standalone deterministic healthcare microsimulation (Deers Rock) functions as an
> independent sentinel within a macro-scale world simulation (Kronos) through an explicit
> adapter boundary, with per-sentinel seeded RNG, verified local autonomy, and scale
> separation — while the macro→micro and micro→macro coupling channels remain to be
> demonstrated."

This is defensible from the evidence. The P-004 experiment is reported as an exploratory
pipeline demonstration with corrected statistics, or deferred until the adapter is fixed.
