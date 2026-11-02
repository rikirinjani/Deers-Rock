# clinical-v2 diagnostics: occupancy, dengue, deteriorated ablation

Date 2026-11-02, Research OC. Logging copy of `src/` (patch: `clinical-v2-diagnostics.patch`); no repo `src/` change. Seeds 0-3, 14,400 ticks.
The instrumented runs reproduced the frozen `clinical-v2` deaths and discharges exactly (10/166, 5/171, 6/172, 7/164), so logging did not disturb the model.
Scripts: `clinical-v2-diagnostics.mjs`, `clinical-v2-diagnostics-run-seed.ts`. Four seeds; rates are indicative.

## 1. Why occupancy is ~90 % and not 70 %

The Bernoulli arrival gate (p = 0.0033) is **bypassed whenever `surge` is true** (calendar event multiplier > 1.3 or scenario surge). Surge ticks are 11-17 % of
all ticks (1,575-2,445 of 14,400), and on those ticks the handler admits every minute.

| Seed | Admit events | of which surge | Admitted per day | Target per day |
|---|---|---|---|---|
| 0 | 81 | 61 | 30.8 | ~19 |
| 1 | 88 | 72 | 33.6 | ~19 |
| 2 | 84 | 64 | 32.3 | ~19 |
| 3 | 88 | 57 | 29.6 | ~19 |

About three quarters of admission events come from surge ticks, giving 30-34 admissions per day, not ~19. Beds reach 128-131 by day 2-3 and stay near full (the existing
85 % occupancy gate, which blocks 6,300-7,500 calls, only thins admissions). The Bernoulli gate itself works: it blocks 5,200-6,400 calls. The initial 50 patients are not the cause.
**Proposed fix (not applied):** apply the arrival probability on surge ticks too, scaled by the surge multiplier, instead of bypassing it. This is a seed break.

## 2. Dengue

18 dengue (A91) discharges across 4 seeds, 1 death (case fatality 5.6 %, expected from the death probabilities 1.7). The sample is far too small to compare with the 0.6 % reference
(the 95 % interval is wide, roughly 1-26 %).

| | clinical-v1 (4 seeds) | clinical-v2 (4 seeds) |
|---|---|---|
| Dengue in high tier | 13 of 20 (65 %) | 5 of 18 (28 %) |
| Dengue in low tier | 5 of 20 | 8 of 18 (44 %) |
| All patients in high tier | 3.4 % | 5.9 % |
| Mean dengue age | 36 | 34.2 (real cohort 19) |

Removing A91 as a blanket critical diagnosis cut the high-tier share from 65 % to 28 %. It is still about five times the all-patient rate, driven by the dengue vitals signature (RR > 24 in
10 of 18, fever > 39 in 11, SBP < 90 in 7). A real dengue cohort is young (mean 19, 2.3 % DHF III-IV); the model's dengue patients are middle-aged adults, because ages come from the general population
draw. A dengue-specific age distribution would be a separate change.

## 3. Why "deteriorated" rose

Age fix only (clinical-v1 model, `varA`, seeds 0-3) against the frozen runs:

| | deteriorated % (pooled, seeds 0-3) |
|---|---|
| clinical-v1 | 10.7 % (81 / 756) |
| clinical-v1 + age fix only | **24.9 %** (188 / 756) |
| clinical-v2 | 27.8 % (187 / 673) |

The age fix alone accounts for essentially the whole rise (10.7 % to 24.9 %); the v2 changes add little on top. Real ages put 29 % of patients over 60, which adds risk points to illness grading and
the vitals response. Whether 25 % deteriorated is realistic is unvalidated; the split has no real-data reference.
