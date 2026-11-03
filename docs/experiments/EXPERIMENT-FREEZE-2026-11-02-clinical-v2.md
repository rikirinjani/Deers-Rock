# Deers Rock — Experiment Data Freeze Record (`clinical-v2`)

**Date:** 2026-11-02 (outcome run 10:5x to 16:23 UTC; E1 and reproducibility checks follow)
**Status:** FROZEN as the new baseline for the default configuration. Supersedes `clinical-v1` for the default config.
**Code commit:** `67a5f0c` on `epic-audit-vi-ix` (plus the age fix `9eb0c9c`), clean tree.
**Relation to earlier freezes:** `clinical-v1` and `vitals-v1` stay as history; `clinical-v2` is a declared seed break and is not
comparable run for run. Method is identical to `clinical-v1` (seeds 0-9, 50 initial patients, 131 beds, no flags, stochastic disasters).

## What changed since `clinical-v1` (all deliberate model changes, not bug-free tuning)

| Change | Where | Why |
|---|---|---|
| Patient age parsed correctly (was always `currentYear - 1990`, i.e. 36) | `src/patient/generator.ts:278` | defect, F1 |
| Staff age folded into 22-65 (same defect) | `src/agent/generator.ts` | defect, F1; working-age range chosen for realism |
| Death probability by tier and age: high 0.25, moderate 0.06, low 0.004 (+0.003 age>60, +0.006 age>75, +0.002 if >=2 diagnoses) | `inpatientDeathProbability` in `src/engine/markov.ts` | flat 0.02 low tier caused 60 % of deaths (F2) |
| Dengue (A91) no longer a blanket critical diagnosis in risk score and grading | `clinical-knowledge.ts`, `illness-model.ts` | 65 % of dengue was high tier (F3) |
| Inpatient arrivals gated per minute (p = 0.0033, `DR_ADMISSION_PROB`; 1 restores old behaviour) | `markov.ts` | BOR 99.8 % (F5) |

**The death probabilities and the arrival rate were set toward the Kemenkes 2025 example targets (GDR < 45 permille, BOR 70 %), which
are unconfirmed examples, not measured standards. The resulting GDR is therefore a calibration outcome, not independent evidence that the
model is right.** The original freeze brief said not to tune the model; these changes were requested explicitly by the owner.

## Study 1 — E1 configuration (10 seeds x 1,000 ticks)

| Artifact (`freeze-2026-11-02-clinical-v2/`) | Bytes | SHA-256 |
|---|---|---|
| `e1-clinical-v2-2026-11-02T17-03-50-638Z.csv` | 893 | `0f98554cd1ccee00fcbb3459f125406269f36d6b17653d255ea51bebab7d2288` |
| `e1-clinical-v2-2026-11-02T17-03-50-638Z-summary.json` | 5,674 | `cf3c13e309d974d7da9df953e292e03b1ff48f5959e7bbb04063261b3954027e` |

```
npx tsx src/experiment/parallel.ts --seeds 10 --ticks 1000 --patients 50 --jobs 2 --out <dir> --prefix e1-clinical-v2
```

Run twice: **byte-identical** (CSV and summary). 0 deaths and no inpatient discharge in any seed at this horizon (a regression
reference, not an outcome baseline). Day-1000 bed occupancy ranges 6-117 of 131 across seeds.

## Study 2 — Outcome baseline (10 seeds x 10 simulated days = 14,400 ticks)

| Artifact | Bytes | SHA-256 |
|---|---|---|
| `clinical-v2-2026-11-02T16-23-58-236Z.csv` | 1,431 | `38e81f6db7dd878df633ae221c8941602a8d7893665e5abf934cde9fbce5d7c0` |
| `clinical-v2-2026-11-02T16-23-58-236Z-summary.json` | 6,866 | `62967f4ddfd7f10826bcaff1f3164867bd0f8ddeb8fce7c6a1f3b9263dfc67dd` |
| `clinical-v2-outcomes.json` | 12,337 | `ddf69275cf87c80936026c9006af48a07b2cf461ffe6ca30a09964f051ad73fb` |

```
npx tsx src/experiment/parallel.ts --seeds 10 --ticks 14400 --patients 50 --jobs 4 --out <dir> --prefix clinical-v2
```

Runtime 12,406 s (3 h 27 min) on 4 cores.

### Results (mean across 10 seeds)

| Metric | `clinical-v2` | `clinical-v1` | Reference (unconfirmed examples) |
|---|---|---|---|
| **Pooled gross death rate** (68 deaths / 1,655 discharges) | **41.1 permille** (bootstrap 95 % CI over seeds 34.7-47.6) | 49.4 | GDR < 45 permille (example target) |
| Per-seed GDR, mean | 41.1 (SD 10.9; range 27.4-60.2) | 49.6 | |
| In-hospital mortality | 4.11 % | 4.96 % | |
| Deaths per run | 6.8 | 9.4 | |
| Discharged "improved" | **69.9 %** (SD 2.4; 65.7-73.1) | 85.1 % | |
| Discharged "deteriorated" | **26.0 %** (SD 3.0; 21.9-30.8) | 9.9 % | |
| Inpatient discharges per run | 165.5 (SD 9.8; 146-184) | 190.2 | |
| Inpatient LOS mean / median | 4.82 d (SD 0.10) / 4.71 d | 4.80 / 4.75 | example target 3-7 d |
| **Bed occupancy at day 10** | **118.2 / 131 = 90 %** (SD 10; 98-130) | 99.8 % | example target 70 % |
| ED + clinic encounters | 3,634 | 3,634 | |
| Referral letters / completed; ambulance dispatches | 292.9 / 291.6; 72.9 | same | |

Per-seed GDR (permille): 60.2, 29.2, 34.9, 42.7, 50.0, 27.4, 50.0, 38.0, 30.1, 48.2.
Deaths by ICD across 68 deaths: I50 7, J15 6, N39 5, I10 4, J10 3, J18 3, then <= 2 each. Dengue (A91) accounts for 1 death (it was 18 of 94
in `clinical-v1`).

### Reproducibility

**Seed 3 re-run: identical.** Re-run alone from tick 0 on the same commit (3,853 s), its full per-seed result (`RunResult` +
`OutcomeMetrics`, 1,203 bytes serialised) matches the frozen batch result byte for byte. One-off script, not committed.

## Honest caveats

- **GDR 41.1 permille is a calibration outcome**, set against an unconfirmed reference (see above). Do not present it as validation.
- **NDR equals GDR** until physiological death (D2) exists; no NDR is reported. Deaths still occur only at discharge.
- **Occupancy is still ~90 %, not 70 %.** The arrival gate cut it from 99.8 % but missed the target; I have not worked out why
  (candidates: initial 50 patients, ED-originated admissions, discharge timing). Open item, not tuned further.
- **Deteriorated rose from 9.9 % to 26.0 % and improved fell from 85.1 % to 69.9 %.** Most likely from real ages now adding risk terms
  (age fix); not verified by an ablation on the full 10 seeds. Neither split has been validated against real data.
- **Dengue case fatality was not measured** (this run logs no risk tiers). One dengue death across 10 seeds is consistent with the intended
  change but is not evidence of calibration to the 0.6 % reference.
- Discharges fell from 190 to 165 per run (fewer arrivals), so the pooled GDR rests on 1,655 discharges and 68 deaths; the CI is wide.
- The scratch-copy sensitivity runs (`docs/research/analysis-2026-11-02/variants-age-fix.md`) used 2 seeds only.
