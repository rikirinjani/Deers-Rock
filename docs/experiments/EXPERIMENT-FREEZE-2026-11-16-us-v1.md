# Deers Rock — Experiment Data Freeze Record (`us-v1`)

**Date:** 2026-11-16
**Status:** FROZEN as the first US baseline (Epic X M10.5c step F). **Calibrated to public sources in part; clinical outcomes only partly calibrated; not a validated US hospital model.** Read the three lists below before quoting any number.
**Code commit:** `059214f` on branch `epic-x-international` (run from `git archive HEAD src package.json tsconfig.json`, so the tree is clean by construction). The engine and locale code are identical to `2e626c3`; `059214f` only adds scenario windows and discharge ticks to the `us-baseline` output.
**Relation to the Indonesian baselines:** `clinical-v1`/`vitals-v1` (and later) are untouched and remain the legacy regression reference; the Indonesian default is byte-identical (E1 and finance golden hashes verified at `2e626c3`; the only later code change is the output of `src/experiment/us-baseline.ts`).

## Method

10 seeds (80-89), 28,800 ticks (20 simulated days), 50 initial patients, 131 beds, US locale with every M10.5c seam (US case mix, staffing with 520 agents, ED arrival model, US billing adapter with NADAC drug prices and CMS weights, stay-outcomes seam), stochastic scenarios on. Worker: `npx tsx src/experiment/us-baseline.ts --seed N --ticks 28800 --patients 50 --result out.json`. Compute: Kaggle (kernels `hoe-udscen-k0..k2`, dataset `hoe-src-059214f`), 3 to 4 seeds in parallel per kernel, 3,265 to 6,787 s per seed. 20 days instead of the 10 used elsewhere, to cut right-censoring of long stays (outcome records exist only for stays that closed inside the run).

Pre-run gates on this commit: `tsc --noEmit` clean; `vitest run` **726 passed, 3 skipped** (85 files).

## Artifacts (`freeze-2026-11-16-us-v1/`)

Ten per-seed result files `us-28800-seed-80.json` … `us-28800-seed-89.json` and `SHA256SUMS` (hashes match those Kaggle wrote beside the outputs). Each file holds per-ICD stays, length of stay, deaths, the scenario windows and every discharge `[tick, died]`.

## Reproducibility

The same 10 seeds were run twice, in separate Kaggle kernels, at commits `2e626c3` and `059214f`: **per-seed stays, deaths, ED encounters, occupancy, per-ICD results and claim payer samples are identical for all 10 seeds.** (The two runs differ only in the output fields added by `059214f`.) This is a repeat on the same platform family, not a different CPU architecture.

## Results (mean over 10 seeds; SD; range)

| Metric | Simulator | Target / reference |
|---|---|---|
| Inpatient stays per run | 374.0 (SD 20.9; 351-421) | none (volume is not a target) |
| Mean length of stay, all stays | 4.11 d | 4.55 d expected from the HCUP means at the simulator's own mix (T-LOS-2); 5.1 d all-stay national (T-LOS-1) is **not** a test, no newborn or delivery stays in US proportion |
| Deaths per run | 11.2 (SD 3.9; 5-17); 112 in 3,740 stays = 29.9 per mille overall | 57.7 deaths expected at HCUP rates for the same stays |
| Deaths **outside scenario windows** | 52 in 3,247 stays (1.6 %) | about 50 expected; **matches** |
| Deaths **inside scenario windows** | 60 in 493 stays; the scenario boost alone adds about 53 | scenario boost kept as a deliberate surge effect (owner, 2026-11-16) |
| End-of-run occupancy | 122.6 of 131 beds (93.6 %) | T-OCC-1: 75 % national (validation, day-20 snapshot, not steady state) |
| ED + clinic encounter records per run | 814.5 (SD 23.1) = 40.7 a day | T-ED-1, T-ED-4 (calibrated, 10-day record count not comparable) |

Per-diagnosis length of stay is within about 0.1 to 0.5 days of HCUP for most common diagnoses (knee osteoarthritis 2.29 vs 2.4, hypertension 2.67 vs 2.6, UTI 3.96 vs 4.3, heart failure 5.55 vs 5.8); septicemia (6.1 vs 7.5), depression (5.6 vs 6.8) and cerebral infarction (4.8 vs 5.7) read low, attributed to censoring. Deaths are scaled from the HCUP rate by risk tier relative to the diagnosis mean tier (`us-tier-mix.ts`, measured on seeds 70-79).

### Case mix (share of closed stays, %, simulator vs T-CASE-1)

Septicemia (A40+A49) 4.4 vs 8.0; heart failure 2.2 vs 4.1; osteoarthritis 5.9 vs 4.1; pneumonia (J14, J15, J18) 3.2 vs 2.7; UTI 2.2 vs 1.8; acute MI 1.2 vs 2.4; COPD 1.4 vs 2.0; cerebral infarction 1.2 vs 1.9.

**This is worse than the stay-level fit validated on seeds 20-29** (septicemia 6.7, heart failure 3.7, osteoarthritis 3.2, MI 2.8). Two things changed since: stays are now diagnosis-length (long-stay diagnoses such as septicemia and heart failure occupy beds longer and close later, so they are under-represented among closed stays) and runs are 20 days. Not tuned; flagged for Research OC (a refit on the new stay lengths would be the next iteration).

## What is calibrated, validated, placeholder

**Calibrated (C, tuned to a cited target):** MS-DRG weights and Medicare base rate (T-DRG-1..3); payer mix under 65 (T-PAY-1, T-PAY-3); 94 NADAC oral-solid acquisition costs and pharmacy markup (T-DRUG-1, T-PRICE-1); US population age mix (T-DEM-1); ED arrival volume (T-ED-1, T-ED-4, T-ED-5); staffing level and mix (T-WORK-1, -3, -4); shift length and federal-holiday calendar (T-SHIFT-1, T-CAL-1); mean length of stay and in-hospital death rate per principal diagnosis (T-LOS-2, C part); case-mix weights fitted to T-CASE-1 at pool level (see the caveat above: T-CASE-1 is labelled V but was used for the fit, so it is **not** held out for the weights).

**Validated (V, held out, reported as found):** T-SEP-1..4 sepsis mortality, length of stay, cost, by age (**caveat:** sepsis length of stay and death rate now come from the HCUP CCSR septicemia group, T-LOS-2, so T-SEP-1 and T-SEP-2 are no longer held out; the validation set should move to another diagnosis); T-PAY-2; T-ED-2, T-ED-3 (not tuned); T-OCC-1 (not tuned, snapshot); the case-mix refit on seeds 20-29.

**Still placeholder or unsourced:** lab, imaging and ED charge levels (CLFS is behind the AMA licence; owner decision: on hold); injectable, topical and inhaler prices and 20 oral drugs without a NADAC match; hospital price lists for non-drug items; support and allied workforce and lab headcount gaps; the shape of the length-of-stay distribution (group mean x (0.6 + 0.8u)); the suppressed-death assumption (0 for categories HCUPnet suppresses); the hand mapping of 3-character ICD codes to CCSR categories (for Research OC review); newborn, delivery and spondylopathy/complication-of-care case mix; holiday ED effect sources.

## Honest caveats

- **Deaths occur only at discharge** (a single roll from the risk tier, scaled by the HCUP diagnosis rate); there is no death during the stay and no physiological death (M-B, M-C deferred). Mortality is net of other causes until those exist.
- **Scenario boost.** The engine adds the active scenario's `mortalityBoost` (0.08 to 0.20) to the death roll; scenarios covered about 12.5 % of ticks in these runs. HCUP comparisons are made outside scenario windows; the all-discharge figure (29.9 per mille) is 1.9 times the HCUP expectation for that reason.
- **Right censoring.** Outcome records exist for closed stays only; long-stay diagnoses read short and are under-represented even at 20 days.
- **Seed spread is wide.** Deaths per run range 5-17; 112 deaths pin the all-discharge rate to roughly +-5 per mille.
- **No claim of US validity.** Paper OC must not describe this model as validated for US hospitals. Per the `10.6` plan the US package stays private and labelled "uncalibrated" until Research OC has reviewed the mapping, the case-mix refit and the scenario treatment.
- Per-seed results here were produced on Kaggle, not on the owner's machines; the repeat is across kernels, not across CPU architectures.
