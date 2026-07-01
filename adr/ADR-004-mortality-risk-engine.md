# ADR-004: Mortality Risk Engine

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
