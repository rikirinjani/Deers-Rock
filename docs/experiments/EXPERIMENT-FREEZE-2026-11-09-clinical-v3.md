# Deers Rock — Experiment Data Freeze Record (`clinical-v3`, `vitals-v3`)

**Date:** 2026-11-09
**Status:** FROZEN as the **legacy regression reference for the Indonesian default** (owner decision 2026-11-09: Indonesia is the frozen reference; Epic X is US-first, see `ROADMAP.md`). Default configuration: Indonesian locale and billing, `DR_CLINICAL_VITALS` on (`clinical-v3`) or off (`vitals-v3`).
**Code commit:** `5170e6c` on `epic-x-international` (merge of `epic-audit-vi-ix` plus Epic X 10.1-10.5b), clean tree for tracked files. Runs used a source archive built with `git archive HEAD src package.json tsconfig.json`.
**Supersedes as reference:** `clinical-v1b` / `vitals-v1b` (pre-merge code `3bec864`, no audit-branch changes) and `clinical-v2` (audit branch only, no Epic X; its E1 hash no longer reproduces on the merged tree). All older records stay as history.

## What differs from earlier baselines

The merged tree contains the audit branch's arrival gate (`DR_ADMISSION_PROB`, about 19 admissions a day), age fix, tiered death probability and dengue changes, plus the Epic X seams (all defaulting to Indonesian behaviour). Versus `clinical-v1b`: inpatient discharges per run fall from 190.9 to 125.4, end-of-run occupancy from 99.8 % to 79.5 %, and the death rate from 69.1 to 49.4 per mille. These come from the audit branch, not from Epic X.

## Method

Seeds 0-9, 50 initial patients, 131 beds, 14,400 ticks (10 days), stochastic disasters, Node 22, pinned `tsx@4.22.4`, `typescript@5.9.3`. 20 seed jobs ran on Kaggle (private kernels `hoe-freeze-v3-k0..k4`, 4 jobs each, dataset `hoe-src-5170e6c`) and were merged with the repository's own runner (`parallel.ts`, resumable path). E1 (10 seeds x 1,000 ticks) ran twice locally. Artifacts and SHA-256: `freeze-2026-11-09-clinical-v3/SHA256SUMS`, `freeze-2026-11-09-vitals-v3/SHA256SUMS`.

## Regression gates on this commit (Indonesian default)

| Check | Result |
|---|---|
| E1, two runs | byte-identical: CSV `084024be6e8b9661...`, summary `068b07b2238ecd55...` |
| `scripts/_finance_golden.ts`, 3 seeds | `6f25fe37ac62a6a4`, `a5e2afe343457617`, `05e3e2568db1179f` (unchanged) |

## Study 1 — `clinical-v3` (default, clinical vitals model on)

| Metric | Value |
|---|---|
| **Pooled gross death rate** | **49.4 ‰** (62 deaths / 1,254 discharges) |
| Per-seed GDR, mean (SD) | 48.2 ‰ (22.7) |
| Deaths per run, mean (SD) | 6.2 (3.6) |
| Discharged "improved" / "deteriorated" | 67.0 % (SD 4.0) / 28.2 % |
| Inpatient discharges per run | 125.4 |
| Inpatient LOS mean | 4.79 d |
| Bed occupancy at day 10 | 79.5 % |
| ED encounters / referral letters per run | 3,635 / 292.9 |

Per-seed GDR (‰), seeds 0-9: 65.0, 30.3, 59.7, 34.8, 44.4, 25.0, 35.7, 100.7, 53.1, 33.1. Hashes: CSV `a6b54b32152c...`, summary `981b71c8d785...`.

## Study 2 — `vitals-v3` (`DR_CLINICAL_VITALS=0`)

| Metric | Value |
|---|---|
| **Pooled gross death rate** | **27.1 ‰** (34 deaths / 1,254 discharges) |
| Per-seed GDR, mean (SD) | 26.7 ‰ (15.4) |
| Deaths per run, mean (SD) | 3.4 (2.3) |
| Discharged "improved" / "deteriorated" | 83.1 % (SD 2.7) / 14.3 % |
| Discharges per run, LOS, occupancy, ED, letters | same as `clinical-v3` |

Per-seed GDR (‰): 40.7, 7.6, 22.4, 17.4, 14.8, 25.0, 26.8, 60.4, 35.4, 16.5. Hashes: CSV `ccb67e17a6d2...`, summary `ad58b0aadfcd...`.

## Limits

- **No cross-machine seed re-run** was done for this freeze (no single seed repeated on a second machine). The only reproducibility checks are the E1 pair and the finance golden above. Add one seed re-run before using this record as evidence of cross-machine determinism.
- Deaths occur only at discharge (a single roll) and are net of other causes; length of stay is a flat 3-7 day draw. The 45 per-mille mortality and 70 % occupancy figures are unconfirmed example targets.
- 10 days at 50 initial patients: occupancy is still ramping up in this horizon; per-seed death counts are small (SD of GDR about half the mean).
- Staff ages are bounded to working age 22-65 (merge `9645a28`); patient ages come from the fixed reference year 2026.
