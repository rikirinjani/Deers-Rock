# Epic X, M10.5c: US calibration and baseline freeze — plan

**Status:** plan, not started. **Branch:** `epic-x-international`. **Depends on:** 10.5a, 10.5b (done, placeholder values).
**Goal:** replace the unsourced placeholders in the US pack with sourced targets, then freeze a US baseline the way `clinical-v1b` was frozen, so US output can be called "calibrated to X" and, for held-out metrics, "compared with Y". Until then Paper OC must not claim US validity (scoping doc, risk 3).

## 1. What is placeholder today (12 files marked `CALIBRATION PENDING`)

| Area | Files | What is unsourced |
|---|---|---|
| Billing | `us-claims`, `us-drg`, `us-payer`, `us-prices` | deductibles, denial/allowed-ratio terms, MS-DRG weights and base rate, payer multipliers and mix, chargemaster, drug prices (`costUsd`, and the derived-from-IDR rest) |
| Demographics | `us-identity`, `us-geography`, `us-network` | age mix, state populations, facility mix, transfer distances |
| Clinical | `us-casemix`, `us-calendar`, `us-drugs`, `us-formulary`, `us-shifts` (+ `us-protocols`, interaction table) | disease weights, holiday multipliers/boosts, drug availability, shift rotation; order sets and interaction severities need clinical review |

## 2. Targets to collect (public sources only; no CPT)

Each target is one row in `docs/us-calibration-targets.md`: metric, value, year, population, source (document and table), URL, retrieval date, owner. **No number enters the repo without a citation**; values from memory are not accepted.

- **Payment:** CMS IPPS final rule tables (MS-DRG relative weights, base rate), CMS Medicare Provider Utilization and Payment data (DRG volumes, average covered charges), CMS hospital price-transparency files (chargemaster scale), MedPAC data book (payer-to-cost ratios, Medicare/Medicaid/commercial payment-to-cost).
- **Case mix and volume:** HCUPnet (free national statistics: top principal diagnoses, LOS, mortality, charges by diagnosis and payer), CDC NHAMCS (ED visits by reason, age, arrival, disposition), CDC NCHS Health, United States.
- **Population:** US Census (age, state), AHA Annual Survey summaries (bed counts, occupancy), KFF or CMS enrollment (payer mix).
- **Drugs:** CMS NADAC (acquisition cost), FDA Orange Book (availability; replaces the author-knowledge availability list).
- **Workforce:** BLS Occupational Employment (roles, hours), published nurse-staffing ratios and schedule surveys.

Access notes: HCUP's record-level files (NIS, NEDS) need a data-use agreement and a fee; plan on HCUPnet summary tables, which are free. Anything needing a DUA is an owner decision.

## 3. Method

1. **Targets file first** (Research OC fills, Platform OC reviews format). Split targets into **calibration** (tuned to) and **validation** (held out, never tuned to). Without a held-out set the freeze can only say "calibrated", not "validated".
2. **Replace placeholders by area**, each with a test that the value comes from the targets file (a single source of truth: one data module per area reading cited constants), smallest first: demographics, payer mix and prices, DRG weights/base rate, drug costs and availability, case mix, calendar, workforce.
3. **Run a US world** (same method as the Indonesian baselines: 10 seeds, 14,400 ticks, 50 patients, clean clone, Kaggle for compute) and print model-vs-target tables with tolerances. Tune only calibration targets; report validation targets as found.
4. **Freeze** as `us-v1` with the same record format as `clinical-v1b`: exact commit, clean tree, SHA-256 per artifact, one seed re-run (cross-machine), the effect of calibration, and an explicit list of what is calibrated, what is validated, and what is still placeholder.

## 4. Likely engine work (this is the main scope risk)

Locale data alone may not reach the targets. Three shared-engine behaviours look Indonesian and need a decision before calibration:
- **Length of stay (code-verified):** discharge is scheduled at admission as a uniform 3 to 7 day draw (`markov.ts`, `4320 + rng * 5760` minutes), independent of diagnosis and locale. That is why every Indonesian run shows a mean near 4.8 days. DRG-level length-of-stay targets (HCUP) therefore cannot be met by data alone; they need a diagnosis-dependent length-of-stay model (engine change, step E).
- **Capacity regime:** the `clinical-v1b` runs ended at 99.8 % occupancy, but they predate the merge of the audit branch, whose arrival gate (about 19 admissions a day) targets roughly 70 % occupancy for 131 beds. Whether the merged tree reaches that, in the Indonesian and the US world, is part of step A.
- **Mortality:** gross death rate is net of other causes until physiological death exists (existing caveat); US in-hospital mortality by diagnosis (HCUP) is the natural validation target but depends on the same model.

Proposal: spend the first day on a feasibility check of these three in a US world, then decide whether 10.5c includes the engine changes or stops at "calibrated demographics, payment and drug data, with clinical outcomes explicitly uncalibrated".

## 5. Order and size

| Step | Output | Size |
|---|---|---|
| A. Feasibility check (LOS, occupancy, mortality in a US world) | short findings note, scope decision | S |
| B. Targets file, calibration/validation split | `docs/us-calibration-targets.md` with citations | M (research-bound) |
| C. Demographics, payer mix, prices, DRG | sourced constants plus tests | M |
| D. Drugs, formulary, case mix, calendar, workforce | sourced constants plus tests | M |
| E. Engine changes if approved (LOS, arrivals/capacity) | tests, default byte-identical | L, optional |
| F. Run, compare, tune, freeze `us-v1` | freeze record, model-vs-target tables | M |

## 6. Decisions needed from the owner

1. **Calibration owner:** Research OC for B and F? (open decision 4 in the scoping doc)
2. **Data access:** public summary sources only, or is a paid or DUA source (HCUP NIS/NEDS) acceptable?
3. **Scope of calibration:** stop at demographics, payment and drug data, or include the engine changes in step E?
4. **Target client or date:** does a deadline decide how much of B is done by hand? (open decision 3)

## 7. Definition of done

Every US constant is sourced or explicitly listed as still placeholder; the targets file has citations; a US 10-seed baseline is frozen with a model-vs-target table; the Indonesian default stays byte-identical throughout; nothing claims US validity beyond the validation targets actually held out.

## 8. Step A findings (feasibility, merged tree, 2 seeds each, 14,400 ticks, 50 patients)

- **Occupancy:** US and Indonesian trajectories are nearly identical (ramp 15-26 % to 72-97 % by day 10): capacity is set by the shared arrival gate, not by locale. No engine change needed for the regime; steady state needs a longer run to confirm.
- **Length of stay:** mean 4.7-4.9 d, median 4.5-4.9, range 3.0-7.0, SD about 1.1 in both locales: flat uniform draw confirmed. Diagnosis-level LOS targets need the engine change (step E).
- **Mortality:** 2.3-7.7 % in-hospital over about 130 discharges per run; seed noise dominates. More seeds needed before comparing with any target.
- **ED volume:** US 2,951-3,001 vs Indonesia 3,622-3,678 encounters (case mix and arrival effects not yet separated).
- **Payer mix (open bug, not US-specific):** the first 100 claims are 96-99 % Self-pay in the US runs; the Indonesian runs show Private 50 %, BPJS 1 %. Claim count is exactly 100 in all four runs, so claims are capped or sampled early. Cause not yet investigated; fix before any payer calibration.
- **Indonesian residue in the US world:** ambulance charges still in IDR; kontrol follow-ups booked but 0 completed (both locales).
- Mean patient age: US 40, Indonesia 47-48.
