# Age-fix and death-floor variants (seeds 0 and 1, scratch copies)

Date 2026-11-02, Research OC. 376 discharges per arm, so every rate is indicative. `compare-variants.mjs` reproduces the table
from the per-seed logs (not committed; regenerate with `run-seed.ts`).

| Arm | Deaths / discharges | GDR | Low / moderate / high | Mean age | Age >= 60 | Dengue deaths |
|---|---|---|---|---|---|---|
| Baseline (clinical-v1) | 19 / 376 | 50.5 permille | 87% / 9% / 4% | 36 (all) | 0% | 2 of 12 |
| Age fix | 27 / 376 | 71.8 permille | 78% / 17% / 5% | 46 | 29% | 2 of 10 |
| Age fix + low-tier roll 0.02 -> 0.01 | 22 / 376 | 58.5 permille | same | 46 | 29% | 2 of 10 |

Findings: real ages activate the "Age > 60 / > 75" score terms and move ~8% of patients out of the low tier, so the gross rate
rises. A 0.01 floor halves the low-tier rate (3.7% -> 2.0%) but stays above the 45 permille example target. LOS (4.77 d) is unchanged.
Dengue stays mostly high tier (6/10). The age fix is a seed break (discharges 193->192, 183->184).

Status: the patient age fix is applied in `src/patient/generator.ts` (commit following this note); the death-floor change is NOT applied.
Staff age (`src/agent/generator.ts:78`) is unchanged; recommended: a working-age range (22-65), not the generated 1-87 age.
