# Deers Rock — Experiment Data Freeze Record (`clinical-v1`)

**Date:** 2026-11-01 (outcome run 03:35 to 05:39 UTC; E1 and reproducibility check follow)
**Status:** FROZEN as the baseline for the default configuration (`DR_CLINICAL_VITALS` on). Number checks are in the table.
**Code commit:** `354d1be` (includes P-002 implementation `a840bfd`), clean tree on branch `epic-audit-vi-ix`.
**Relation to `vitals-v1`:** `vitals-v1` ([`EXPERIMENT-FREEZE-2026-11-01.md`](EXPERIMENT-FREEZE-2026-11-01.md)) stays the reference for
`DR_CLINICAL_VITALS=0`. `clinical-v1` is the declared seed break from P-002 (illness courses, treatment effects,
sustained-vitals mortality risk); the two are not comparable run for run.

Method is identical to `vitals-v1` (seeds 0-9, 50 initial patients, 131 beds, no flags, stochastic disasters). Environment: 4 cores,
`pnpm install --no-lockfile --config.node-linker=hoisted`; `better-sqlite3` had to be built by hand (`node-gyp rebuild`) because
pnpm skipped its build script. Pre-run checks: `tsc --noEmit` clean, `vitest run` 587 passed / 3 skipped.

## Study 1 — E1 configuration (10 seeds x 1,000 ticks)

| Artifact (`freeze-2026-11-01-clinical-v1/`) | Bytes | SHA-256 |
|---|---|---|
| `e1-clinical-v1-2026-11-01T05-42-10-022Z.csv` | 901 | `507fdb2a7b3cae1cad67fef5ddb6f3902b4bd94178b16029016321f224c6e3ed` |
| `e1-clinical-v1-2026-11-01T05-42-10-022Z-summary.json` | 5,676 | `75cf60f6e3480c6b4a32151306ea9a5fbf6397821d534b7b4845506ff4bc62c4` |

```
npx tsx src/experiment/parallel.ts --seeds 10 --ticks 1000 --patients 50 --jobs 3 --out <dir> --prefix e1-clinical-v1
```

Run twice: **byte-identical** (CSV and summary). Result: 0 deaths in every seed, 500 encounters per seed, discharged LOS 4-5 ticks,
bed occupancy 131/131 (peak). As before, this horizon sees no inpatient discharge: a **deterministic regression reference,
not an outcome baseline**.

## Study 2 — Outcome baseline (10 seeds x 10 simulated days = 14,400 ticks)

| Artifact (`freeze-2026-11-01-clinical-v1/`) | Bytes | SHA-256 |
|---|---|---|
| `clinical-v1-2026-11-01T05-39-47-641Z.csv` | 1,596 | `a408de53f127b68b47ef846a9c07a32b678f3d234e3b1d2770c6c6580bcd8894` |
| `clinical-v1-2026-11-01T05-39-47-641Z-summary.json` | 7,231 | `7899acc856c37e5ea280157b9dd47f2cdf4c23060797e0fdde792759973db9ba` |
| `clinical-v1-outcomes.json` | 12,715 | `9efdd2af0f449663c73ace407fc139c3efa13979d27ef43e3c67678f5a8181d4` |

Sums are also in `SHA256SUMS`.

```
npx tsx src/experiment/parallel.ts --seeds 10 --ticks 14400 --patients 50 --jobs 4 --out <dir> --prefix clinical-v1
```

Runtime 7,502 s (2 h 05 min) on 4 cores, one uninterrupted run (launched detached with `setsid nohup`; no resume needed).

### Results (mean across 10 seeds; SD, 95% CI = t-interval, range)

| Metric | `clinical-v1` | `vitals-v1` | Indonesian reference (Depkes RI) |
|---|---|---|---|
| **Pooled gross death rate** (94 deaths / 1,902 discharges) | **49.4 ‰** (bootstrap 95% CI over seeds 39.6-59.1) | 37 ‰ | GDR < 45 ‰ (unconfirmed, see below) |
| Per-seed GDR, mean | 49.6 ‰ (SD 16.5; ±11.8; 26.7-67.7) | 37 ‰ | |
| In-hospital mortality | 4.96 % (SD 1.65; ±1.18; 2.67-6.77) | 3.70 % | |
| Deaths per run | 9.4 (SD 3.0; ±2.2; 5-13) | 7.0 | |
| Discharged "improved" | **85.1 %** (SD 2.4; ±1.7; 81.4-89.8) | 94.5 % | |
| Discharged "deteriorated" | **9.9 %** (SD 1.9; ±1.3; 7.5-13.2) | 1.8 % | |
| Inpatient discharges per run | 190.2 (SD 6.6; ±4.7; 183-206) | 190.2 | |
| Inpatient LOS mean / median | **4.80** d (±0.07) / 4.75 d | 4.80 / 4.75 | ALOS 6-9 d |
| Bed occupancy at day 10 | **99.8 %** (98.5-100) | 99.8 % | BOR 60-85 % |
| ED + clinic encounters held | 3,634 (SD 29) | 3,634 | |
| Referral letters / completed | 292.9 / 291.6 | 292.9 / 291.6 | |
| Ambulance dispatches / charged | 72.9 / 62.1 M IDR | 72.9 / 62.1 M IDR | |
| Kontrol booked / completed | 164.2 / 0 | 166.2 / 0 | due after day 10 by design |
| Sick-leave episodes (122 staff) | 0.8 | 0.8 | |
| Jasa Raharja incidents / claims | 24.4 / 14.6 | 24.4 / 14.6 | |

Per-seed GDR (‰): 36.3, 65.6, 52.6, 31.6, 34.0, 67.7, 26.7, 65.6, 67.7, 48.4. The mean-of-seeds and pooled values differ slightly
because seeds have different discharge counts. The seed spread is wide (about 7x between 26.7 and 67.7 on a handful of deaths per
run), so the CI is wide; with 94 deaths the pooled rate is only known to about +-10 ‰.

Deaths by ICD across all 94: A91 dengue 18, I10 7, J15 4, I26 4, K80 / J18 / J96 / E11 3 each, the rest <= 2. Dengue is now the
leading recorded cause (it was 5 of 70 under `vitals-v1`). The cause is the recorded primary diagnosis, not a clinical cause of death.
The P-002 courses plausibly push infectious illness towards deterioration; that is a Research OC hypothesis, not a finding.

### Reproducibility

**Seed 3 re-run: identical.** Re-run alone from tick 0 on the same commit (05:41-06:15 UTC, 2,035 s), its full per-seed result
(`RunResult` + `OutcomeMetrics`, 1,205 bytes serialised) matches the frozen batch result byte for byte (wall-clock field excluded).
Script: a 20-line one-off calling `runSeedWorld(3, 14400, 50)`, `collectResult`, `outcomeMetrics` and comparing the JSON; not committed.

## Honest caveats

- **GDR < 45 ‰ is an UNCONFIRMED reference.** The Depkes RI figures quoted here have not been re-verified against a primary source.
  Do not describe 49.4 ‰ as "above standard" or "failing" in any paper until the reference is confirmed.
- **NDR equals GDR** (`netDeathRatePerMille` = `grossDeathRatePerMille` in the output) until physiological death (D2) exists. The
  net rate (deaths after 48 h) is not computed. Do not report an NDR from this freeze.
- Pooled GDR 49.4 ‰ is inside the 25-60 ‰ sanity band set for this freeze; nothing looked broken, so no draft flag. It is above
  the `vitals-v1` 37 ‰, which is expected: sustained-vitals mortality risk now fires. The 4-seed x 7-day pilot gave about 53 ‰, consistent.
- **Improved/deteriorated moved from 94.5/1.8 to 85.1/9.9.** This is the intended effect of vitals that respond to illness, but the
  split has not been validated against real data.
- The hospital is still saturated (BOR 99.8 %) and stays are short (4.8 d); P-002 did not touch either (`vitals-v1` findings 3-5 open).
- No model tuning was done for this freeze.
