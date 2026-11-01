# Deers Rock — Experiment Data Freeze Record (`vitals-v1`)

**Date:** 2026-11-01 (runs 2026-10-31 22:13 to 2026-11-01 01:11 UTC)
**Status:** FROZEN — current reference baselines
**Approved by:** owner, 2026-10-31 ("do it": fix the vital-sign drift, then re-freeze both baselines)
**Code commit:** `01a0e2f`, run from a fresh `git clone` of the pushed branch `epic-audit-vi-ix` (clean tree; dependencies shared via a
symlinked `node_modules`).
**Supersedes, as reference baselines:** the `substream-v1` E1 freeze and the `outcome-v1` baseline in
[`EXPERIMENT-FREEZE-2026-10-27.md`](EXPERIMENT-FREEZE-2026-10-27.md) (pinned to `30d441f`, kept as history), and nothing else:
the 2026-09-10 JAMIA / Zenodo freeze stays read-only and is still that manuscript's evidence.

## What changed since `30d441f`

1. **Jasa Raharja = traffic accidents only** (owner decision 2026-10-31, `5ba1aad`; `finance.ts injuryMechanism`).
2. **Unbiased, mean-reverting vital-sign drift** (owner-approved fix, `01a0e2f`; `src/engine/vitals-model.ts`, ADR-028 Amendment 1).

Both are declared seed breaks. The old baselines no longer reproduce on this code.

## Study 1 — E1 configuration (10 seeds × 1,000 ticks)

| Artifact (`freeze-2026-11-01-vitals-v1/`) | Bytes | SHA-256 |
|---|---|---|
| `e1-substream-v2-2026-10-31T22-13-59-705Z.csv` | 901 | `372b037d0cc8c869b45cb7c4fa4b03563279fb1d31ba0644bd4b13031300b63e` |
| `e1-substream-v2-2026-10-31T22-13-59-705Z-summary.json` | 5,676 | `d1c5a9d5405fdb9fe631c0196c2c07c9ff39362b3eaa54dfe0692725db2ae9bb` |

Seeds 0–9, 1,000 ticks, 50 patients, 131 beds, no flags. Run twice from the clone: **byte-identical**. Via
`src/experiment/parallel.ts --seeds 10 --ticks 1000 --patients 50 --jobs 4 --prefix e1-substream-v2`.
Result: 0 deaths in every seed, discharged LOS 4.8 ticks, bed occupancy 131/131. As before, this horizon sees no inpatient
discharge, so it is a **deterministic regression reference, not an outcome baseline** (see the 2026-10-27 record).

## Study 2 — Outcome baseline (10 seeds × 10 simulated days = 14,400 ticks)

| Artifact (`freeze-2026-11-01-vitals-v1/`) | Bytes | SHA-256 |
|---|---|---|
| `outcome-v2-2026-11-01T01-11-36-645Z.csv` | 1,505 | `46d2bc0e6dcae327785e96656ed8d453bd645f7c763aba58fb06562ec7e09f06` |
| `outcome-v2-2026-11-01T01-11-36-645Z-summary.json` | 7,030 | `3d9934b52da7831a24ac3c5b6a2f27af4d7d6d81305e4c794e3e0b208c97c1cc` |
| `outcome-v2-outcomes.json` | 11,193 | `65c2b728ca21892da7fb2cbb91947022411d1f3bc0526b9e4e9c5d5200d805ff` |

```
npx tsx src/experiment/parallel.ts --seeds 10 --ticks 14400 --patients 50 --jobs 4 --prefix outcome-v2
```

Seeds 0–9, 50 initial patients, 131 beds, no flags, stochastic disasters. Runtime 2 h 57 min on 4 cores, one uninterrupted
run (detached from the tool's 2-hour limit; no resume needed).

### Results (mean across 10 seeds; SD, 95% CI, range) and change from `outcome-v1`

| Metric | `outcome-v2` | `outcome-v1` | Indonesian reference (Depkes RI) |
|---|---|---|---|
| Discharged "improved" | **94.5 %** (SD 1.8; ±1.1; 91.7–97.1) | 2.9 % | — |
| Discharged "deteriorated" | **1.8 %** (SD 0.95; ±0.6; 0.6–3.2) | 93.5 % | — |
| In-hospital mortality | **3.70 %** (SD 1.33; ±0.82; 1.94–5.73) = 37 ‰ | 3.62 % | GDR < 45 ‰; NDR < 25 ‰ |
| Deaths per run | 7.0 (SD 2.5; ±1.5; 4–11) | 6.9 | — |
| Inpatient discharges per run | 190.2 (SD 6.6; ±4.1; 183–206) | 191.6 | — |
| Inpatient length of stay, mean / median | **4.80** (±0.06) / 4.75 days | 4.79 / 4.75 | ALOS 6–9 days |
| Bed occupancy at day 10 | **99.8 %** (98.5–100) | 99.7 % | BOR 60–85 % |
| ED + clinic encounters held | 3,634 (SD 29) | 3,634 | — |
| Referral letters / completed | 292.9 / 291.6 | same | — |
| Ambulance dispatches / charged | 72.9 / 62.1 M IDR | same | — |
| Kontrol booked / completed | 166.2 / 0 | 167.6 / 0 | due after day 10 by design |
| Sick-leave episodes (122 staff) | 0.8 | 0.8 | ~0.8 expected |
| **Jasa Raharja incidents / claims** | **24.4 / 14.6** | 50.3 / 32.0 | — |
| Jasa Raharja claims with an incident | **100 %** | 54.7 % | — |

Deaths by ICD across all 70 deaths: I10 hypertension 7, A91 dengue 5, K80, J96, E11, I26 3 each, the rest ≤ 2.
Per-seed mortality: 2.59, 5.46, 4.74, 3.16, 1.94, 4.17, 2.14, 3.83, 5.73, 3.23 %.

### Reading the change

- **Discharge outcomes are now meaningful.** The "deteriorated" artefact is gone: it came from the biased vitals walk
  (mean HR 76 → 57 in the first hour). Referrals, ambulance, kontrol, staffing, bed occupancy and length of stay are
  unchanged to within noise, as expected: nothing in them reads vitals.
- **Mortality did not move (3.62 % → 3.70 %, well inside the confidence interval), and this corrects an earlier claim.**
  The 2026-10-27 record said mortality "is also shaped by this artefact". That was wrong for the risk score. See finding 1.
- **Jasa Raharja halves** (traffic accidents only) and every claim now has its incident.

### Reproducibility

**Seed 3 re-run: pending** (started 01:12 UTC; this line is updated when it completes).

## Findings still open (reported, not fixed — each changes outcomes, owner's call)

1. **Three terms of the mortality-risk score can never fire.** `assessMortalityRisk` adds risk for SpO₂ < 90, SBP < 90 and
   HR > 120 or < 50 (strict), but vitals are clamped to SpO₂ ≥ 90, SBP ≥ 90 and HR 50–120, so those terms are unreachable,
   before and after the drift fix. Only the temperature (> 39) and respiratory-rate (> 24) terms can fire. That is why
   fixing the drift left mortality unchanged. Widening the clamps to physiological limits (for example SpO₂ 70–100,
   SBP 60–220, HR 30–180) is small, but it only matters once vitals can respond to illness (finding 2). **S**.
2. **Vitals still do not respond to diagnosis, severity or treatment.** A pneumonia patient keeps normal oxygen levels. The
   vitals only fluctuate around a healthy baseline, so alerts fire at random (3.6 % of readings) rather than for sick
   patients. This is the next step for clinical realism and a Research OC item. **M**.
3. **The hospital is saturated** (BOR 99.8 % vs the 60–85 % standard) and **stays are short** (4.8 vs 6–9 days).
   Research OC calibration of admission rate, bed count and LOS. **M**.
4. **Hypertension (I10) is the leading recorded cause of death** (7 of 70). Death records carry the primary-diagnosis code,
   not a clinical cause. **S–M**.
5. Net death rate (deaths after 48 h) is not computed; only the gross rate (37 ‰ vs the GDR < 45 ‰ standard). **S**.
