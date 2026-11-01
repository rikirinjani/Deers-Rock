# ADR-028: Mortality Risk Engine

> **Formerly ADR-004** (`adr/ADR-004-mortality-risk-engine.md`). Renumbered 2026-10-27 because ADR-004 was also
> used by *Bounded state and durable scheduling* (`docs/adr/ADR-004-…`), which is cited throughout `src/` and keeps
> the number. Earlier documents that cite "ADR-004" for mortality risk mean this ADR. Content unchanged.

**Status:** Accepted
**Date:** 2026-07-01
**Owner:** Research OC → Coordinator (for approval)

---

## Context

The mortality risk engine (`assessMortalityRisk` in `clinical-knowledge.ts:502`) is the single most consequential model in the simulation. It determines the death probability for every discharged patient:

- High risk (score ≥5): 35% mortality
- Moderate risk (score ≥3): 10% mortality
- Low risk (score <3): 2% mortality

These probabilities directly encode the simulation's answer to "how often do patients die?" — the primary ethical output of the model.

## Current Design

The scoring function uses 9 factors with the following weights:

| Factor | Weight | Evidence Base | Calibration Priority |
|--------|--------|---------------|---------------------|
| Age > 75 | +2 | Unspecified | MEDIUM — affects geriatric subset only |
| Age > 60 | +1 | Unspecified | MEDIUM — broad population, low weight |
| SpO2 < 90% | +2 | Unspecified | HIGH — high weight, high prevalence |
| SBP < 90 mmHg | +2 | Unspecified | HIGH — high weight, shock-defining |
| HR >120 or <50 | +1 | Unspecified | MEDIUM — common but low weight |
| Fever > 39°C | +1 | Unspecified | LOW — low weight, narrow trigger range |
| RR > 24 | +1 | Unspecified | MEDIUM — common but low weight |
| Critical diagnosis (I21, I50, R57, A41, I63, J84, A91) | +2 | Unspecified | HIGH — high weight, directly maps to COD |
| ≥3 comorbidities | +1 | Unspecified | MEDIUM — common in elderly but low weight |

Risk tiers: high ≥5, moderate ≥3, low <3.

Death roll probabilities: high = 35%, moderate = 10%, low = 2%.

## Scientific Critique

### 1. No documented provenance

None of the factor weights or tier thresholds have cited sources. While the factors themselves are clinically defensible (they align with qSOFA + age + comorbidity adjustments), the specific weight values and tier cutoffs appear arbitrary.

### 2. Tier probabilities are plausible but unverifiable

- 35% for high risk aligns with published Indonesian sepsis IHM of 25-40%
- 10% for moderate aligns with pneumonia IHM of 5-15%
- 2% for low is at the high end of hypertension IHM (0.5-2%)

Without citations, these remain assumptions.

### 3. No sensitivity analysis has been performed

It is unknown whether system-level mortality is robust to small changes in tier probabilities or the factor weights.

## Decision

**Accepted** (2026-07-01) — Option A with condition.

**Condition:** Calibration Priority column added to factors table. Research OC to rank the HIGH-priority factors (SpO2, SBP, Critical diagnosis) for sensitivity analysis in E2.

**Rejected options:**
- Option B (leave undocumented) would violate Constitution §3.3
- Option C (replace with published data) is deferred — suitable published Eastern Indonesia mortality data is not yet in hand

## Consequences

If Option A:
- Each factor weight gets a "Plausible Range" annotation
- ADR-004 serves as the living document for future calibration
- Research OC will propose refinement targets as real-world data becomes available

If Option B:
- Model assumptions remain invisible to new OCs
- Future calibration has no baseline to compare against

## References

- Constitution Article III §3.3 (mortality probabilities)
- `src/engine/clinical-knowledge.ts:502-518`
- `src/engine/markov.ts:105-109`

## Amendment 1 — Vital-sign drift model (2026-10-31)

**Status:** Accepted by the owner, 2026-10-31.

**Problem.** The risk score reads current vitals (SpO₂ < 90, SBP < 90, HR > 120 or < 50, temperature, RR), but the only
thing that ever changed vitals, `vitalsUpdateHandler`, moved each by `floor(rng·6) − 3` per minute: a biased walk
(mean −0.5/min) with no pull back. Within one simulated hour the pool's mean HR fell 76 → 57, systolic BP 124 → 97 and
SpO₂ 97.8 → 92.3 %, and patients sat on the clamps (HR 50, SBP 90, SpO₂ 90 %). Mortality risk and the AI doctor's vitals
triggers therefore ran on an artefact, and 93.5 % of inpatients were discharged "deteriorated" (outcome-v1, finding 1).
(Correction, 2026-11-01: the risk score's own SpO₂ < 90, SBP < 90 and HR > 120 / < 50 terms were never affected, because
vitals are clamped at SpO₂ 90, SBP 90, HR 50–120 and the thresholds are strict; see "Open" below.)

**Decision** (`src/engine/vitals-model.ts`). Each vital is a discrete Ornstein–Uhlenbeck process around the patient's own
baseline (`Patient.baselineVitals`, a copy of the generated vitals; no extra rng draw): `next = round(x + k·(baseline − x) + u)`
with u uniform and symmetric. Unbiased; per-vital pull k (30 min for HR and BP, 20 min for RR, 10 min for SpO₂, pain and
temperature) and noise set so the stationary SD is HR 6, SBP 8, DBP 5, temperature 0.25 °C, SpO₂ 1, RR 2, pain 1.
Hard clamps unchanged. Seven draws per patient per minute, as before.

**Evidence.** 400 patients × 10 simulated days: means stay on baseline (HR 76.9 → 76.7); 98.4 % of observations pass the
"≥ 5 of 7 normal" check; none sit at a clamp; vitals-rule triggers fire in 3.6 % of observations. Patient generation is
byte-identical to before. `tests/vitals-model.test.ts` (12); 5 of them fail if the old formula is restored.

**Not modelled.** Vitals still do not respond to diagnosis, severity or treatment (a pneumonia patient keeps normal SpO₂).
That is the next step for clinical realism and a Research OC item; this amendment only removes the artefact.

**Consequence.** Declared seed break: every trajectory differs from before 2026-10-31. Measured effect
(`outcome-v1` → `outcome-v2`, 10 seeds × 10 days): discharged "improved" 2.9 % → 94.5 %, "deteriorated" 93.5 % → 1.8 %;
mortality unchanged (3.62 % → 3.70 %, inside the CI). Baselines re-frozen as `vitals-v1`.

**Open (found while measuring the effect).** The risk score's SpO₂ < 90, SBP < 90 and HR > 120 / < 50 terms are structurally
unreachable: the clamps (SpO₂ ≥ 90, SBP ≥ 90, HR 50–120) coincide with the strict thresholds, before and after this
amendment. Only the temperature and respiratory-rate terms can fire. Widening the clamps is a separate decision; it matters
once vitals respond to illness.

## Amendment 2 — Clinical vitals response (2026-11-01, owner-approved P-002 A+B+C+D1)

**Problem.** After Amendment 1 vitals were unbiased but still decoration: a pneumonia patient kept normal SpO₂, treatment
changed nothing, and the risk score's SpO₂/SBP/HR terms could not fire (clamps coincided with thresholds).

**Decision.**
- **A. Physiological limits.** Vitals are clamped to physiological ranges (HR 30–180, SBP 50–240, DBP 30–140, temperature
  33–42 °C, SpO₂ 60–100, RR 6–50, pain 0–10) instead of the legacy clamps, so the risk thresholds are reachable.
- **B. Illness model** (`illness-model.ts`, `clinical-vitals.ts`). An inpatient admission gets a diagnosis group, a severity
  grade (mild / moderate / severe, drawn from a dedicated keyed stream `illness-grade:<encId>`; older and comorbid patients
  skew severe) and a course level (6 h ramp, 24 h hold, then decay; faster once definitive treatment is given, slower
  without). Vitals are pulled toward `baseline + grade × level × signature(group) − treatment relief`. Complications use a
  per-day keyed stream `illness-compl:<encId>`. No existing stream shifts.
- **C. Treatment effects** (`treatment-effects.ts`). Administering a drug or ordering oxygen/nebuliser records it on the
  encounter (`_treat`, copy-on-write). Effects relieve deficits in the harmful direction only (oxygen, antipyretics,
  analgesics, antihypertensives, fluids, bronchodilators, diuretics).
- **D1. Sustained vitals.** A vital must stay beyond its threshold for ≥ 30 min (`_watch`) to count in the risk score at
  discharge; sustained flags replace the instantaneous terms. `assessMortalityRisk` takes an optional 4th argument; omitted,
  behaviour is unchanged.

**Compatibility.** All new encounter fields are optional and underscore-prefixed; the `Vitals` type is unchanged. Apps that
ignore them see no difference except that vitals now move with illness. **Kill switch:** `DR_CLINICAL_VITALS=0` restores
vitals-v1 behaviour. Verified byte-identical against commit `01a0e2f` (seeds 0 and 3, 3 simulated days, full patient /
encounter / morgue / outcome state hash).

**Provenance.** Signature values are `criteria` (12 groups) or `estimate` (40 groups) — see
`docs/research/vitals-clinical-model.md`. They are not fitted to patient data.

**Consequence.** Declared seed break for the clinical-vitals-on configuration (flag-off is unchanged). Baselines to be
re-frozen as `clinical-v1`.

**Still open.** D2 (physiological death before discharge, so NDR can differ from GDR); GDR < 45‰ reference unconfirmed.
