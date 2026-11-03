# Deers Rock — Experiment Data Freeze Record (`vitals-v1b`)

**Date:** 2026-11-03
**Status:** FROZEN as the baseline for `DR_CLINICAL_VITALS=0` **on `epic-x-international`**, after the age fix.
**Code commit:** `3bec864`, clean tree (clean clone of that commit). Reference year `SIM_REFERENCE_YEAR = 2026`.
**Relation:** `vitals-v1` stays untouched as history. Named `-v1b` to avoid the `-v2` labels used on `epic-audit-vi-ix`.
**Change versus `vitals-v1`:** only the age bug (patient and staff age was the constant 36; now derived from birth year against a fixed
reference year). RNG draw counts are unchanged; no other model change. See [`EXPERIMENT-FREEZE-2026-11-03-clinical-v1b.md`](EXPERIMENT-FREEZE-2026-11-03-clinical-v1b.md)
for method, environment and caveats (including unrealistic staff ages, which do not reach the outcomes).

## Study 1 — E1 configuration (10 seeds x 1,000 ticks, `DR_CLINICAL_VITALS=0`)

Run **once** on Kaggle (kernel `hoe-freeze-v1b-k5`); not run twice, so byte identity is not verified for this study. Regression
reference only (no inpatient discharge in this horizon).

## Study 2 — Outcome (10 seeds x 14,400 ticks, `DR_CLINICAL_VITALS=0`)

```
DR_CLINICAL_VITALS=0 npx tsx src/experiment/parallel.ts --seeds 10 --ticks 14400 --patients 50 --jobs 4 --out <dir> --prefix outcome-vitals-v1b
```

All 10 seeds ran on Kaggle (kernels `hoe-freeze-v1b-k2`..`k4`) and were merged from a clean clone of `3bec864`.
Artifacts and SHA-256: `freeze-2026-11-03-vitals-v1b/SHA256SUMS`.

| Metric | `vitals-v1b` | `vitals-v1` |
|---|---|---|
| **Pooled gross death rate** | **46.6 ‰** (89 deaths / 1,909 discharges) | 36.8 ‰ (70 / 1,902) |
| Per-seed GDR, mean (SD) | 46.9 ‰ (18.7) | 37 ‰ |
| Deaths per run, mean (SD) | 8.9 (3.5) | 7.0 (2.5) |
| Discharged "improved" | 82.3 % (SD 2.6) | 94.5 % |
| Discharged "deteriorated" | 13.0 % (SD 2.3) | 1.8 % |
| Inpatient discharges per run | 190.9 | 190.2 |
| Inpatient LOS mean / bed occupancy day 10 | 4.80 d / 99.8 % | 4.80 d / 99.8 % |

Per-seed GDR (‰): 46.9, 76.1, 36.8, 42.1, 19.3, 62.8, 26.6, 48.6, 72.2, 37.2.

### Reproducibility

No same-machine or cross-machine re-run of a vitals seed was done. Determinism rests on the clinical seeds 0-3 cross-machine match
(same code path) and on the earlier E1 byte identity. Treat the vitals figures as not independently reproduced.
