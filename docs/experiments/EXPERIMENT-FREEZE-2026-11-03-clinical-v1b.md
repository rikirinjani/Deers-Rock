# Deers Rock — Experiment Data Freeze Record (`clinical-v1b`)

**Date:** 2026-11-03
**Status:** FROZEN as the baseline for the default configuration (`DR_CLINICAL_VITALS` on) **on `epic-x-international`**, after the age fix.
**Code commit:** `3bec864` (`fix: derive patient/agent age from birth year against a fixed reference year`), clean tree (runs came from a clean
clone of that commit; only `src/`, `package.json` and `tsconfig.json` were used).
**Reference year:** `SIM_REFERENCE_YEAR = 2026` (`src/identity/reference-year.ts`), a constant; no wall clock.
**Relation to other baselines:** `clinical-v1` and `vitals-v1` stay untouched as history. This record is named `-v1b` because `clinical-v2`
already exists on `epic-audit-vi-ix` (a different change set: age fix plus tiered death probability, dengue changes, arrival gate).
`clinical-v1b` is **not** comparable with that `clinical-v2`.

## What changed versus `clinical-v1`

**Only the age bug.** Indonesian patient and staff `age` was the constant 36: `birthDate.split("-")[2]` was applied to a dd/mm/yyyy date, and
the birth year used `new Date().getFullYear()`. Now age comes from the birth year against the fixed reference year. RNG draw counts are
unchanged. The Epic X seams (billing adapters, price book, US locale) are in the commit range but default to the Indonesian behaviour;
the golden finance hashes (`scripts/_finance_golden.ts`) are unchanged, so no other model change is included.

## Method

Seeds 0-9, 50 initial patients, 131 beds, no flags, stochastic disasters, Node 22. Same as `clinical-v1`.
Environment: pinned `tsx@4.22.4`, `typescript@5.9.3` (no lockfile in the repo).

| Study | Where it ran |
|---|---|
| E1 (10 seeds x 1,000 ticks), twice | local Windows machine |
| Outcome (10 seeds x 14,400 ticks) | seeds 0-3 local and on Kaggle; seeds 4-9 on Kaggle (private kernels `hoe-freeze-v1b-k0..k4`, 4 parallel workers each) |

The 10 per-seed files were merged with the repository's own runner (`parallel.ts`, resumable path) from a clean clone of `3bec864`.

## Study 1 — E1 configuration (10 seeds x 1,000 ticks)

Run twice: **byte-identical** (CSV `8f47760654dbe4a7...`, summary `441ff6aa300ffd29...`). Same as before: this horizon sees no inpatient
discharge, so it is a regression reference, not an outcome baseline.
Note: the E1 files carry the prefix `e1-clinical-v2` (runner label used during the run); the label has no effect on the contents.

## Study 2 — Outcome (10 seeds x 14,400 ticks)

```
npx tsx src/experiment/parallel.ts --seeds 10 --ticks 14400 --patients 50 --jobs 4 --out <dir> --prefix clinical-v1b
```

Artifacts and SHA-256: `freeze-2026-11-03-clinical-v1b/SHA256SUMS`.

| Metric | `clinical-v1b` | `clinical-v1` |
|---|---|---|
| **Pooled gross death rate** | **69.1 ‰** (132 deaths / 1,909 discharges) | 49.4 ‰ (94 / 1,902) |
| Per-seed GDR, mean (SD) | 69.5 ‰ (17.7) | 49.6 ‰ (16.5) |
| Deaths per run, mean (SD) | 13.2 (3.2) | 9.4 (3.0) |
| Discharged "improved" | 67.5 % (SD 4.3) | 85.1 % |
| Discharged "deteriorated" | 25.5 % (SD 4.5) | 9.9 % |
| Inpatient discharges per run | 190.9 | 190.2 |
| Inpatient LOS mean | 4.80 d | 4.80 d |
| Bed occupancy at day 10 | 99.8 % | 99.8 % |
| ED encounters / referral letters per run | 3,633.9 / 292.9 | 3,633.8 / 292.9 |

Per-seed GDR (‰): 52.1, 92.4, 52.6, 63.2, 43.5, 89.0, 74.5, 81.1, 87.6, 58.5.

**Reading.** Real ages (a seed-0 sample has mean 46 y and ages up to 86; before, all 36) move the case mix and the age-dependent risk:
deaths +40 %, "deteriorated" x2.6. Arrivals, referrals, LOS and occupancy are unchanged, so the effect is confined to outcomes. This is the
size of the effect, not a calibrated figure.

### Reproducibility

- **Cross-machine byte identity:** clinical seeds 0-3 computed locally and on Kaggle give the same per-seed result (`RunResult` +
  `OutcomeMetrics`, wall-clock field excluded; SHA-256 prefixes `7a2512f7`, `09ca48b5`, `171d1f7a`, `811d8642`).
- E1 run twice locally: byte-identical.
- No separate re-run of a single seed on the same machine; the cross-machine match stands in for it.

### Age check (seed 0, 50 patients, clean clone of `3bec864`)

Patients: 40 distinct ages, 1-86, mean 46.3, not all 36. Staff: 61 distinct ages in a 122-person pool.

## Caveats

- **Staff ages are not realistic.** Staff identities use the general population age mix, so a pool has ages 1-86. Staff age feeds only
  `tahunPengalaman = max(1, age - 24)`, which nothing in `src/` reads, so the outcomes are unaffected; the roster output is cosmetic. The
  `epic-audit-vi-ix` change (staff ages 22-65) fixes it; it is not included here to keep this a one-change freeze.
- The 45 ‰ GDR and 60-85 % BOR reference figures are unconfirmed example targets. The gross death rate is net until physiological death exists.
- Seed spread is wide (43.5-92.4 ‰ on 7-18 deaths per run); the pooled rate is known only to about +-12 ‰.
- Kaggle's Node version was not recorded in this record; identical seed results on 4 seeds show no drift there.
