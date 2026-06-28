# ADR-004: Mortality Risk Engine

**Status:** Proposed (drafted by Research OC)
**Date:** 2026-06-28
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

| Factor | Weight | Evidence Base |
|--------|--------|---------------|
| Age > 75 | +2 | Unspecified |
| Age > 60 | +1 | Unspecified |
| SpO2 < 90% | +2 | Unspecified |
| SBP < 90 mmHg | +2 | Unspecified |
| HR >120 or <50 | +1 | Unspecified |
| Fever > 39°C | +1 | Unspecified |
| RR > 24 | +1 | Unspecified |
| Critical diagnosis (I21, I50, R57, A41, I63, J84, A91) | +2 | Unspecified |
| ≥3 comorbidities | +1 | Unspecified |

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

**Option A (Recommended):** Document with plausible clinical ranges and mark as calibration targets
**Option B:** Leave undocumented (current state)
**Option C:** Remove and replace with evidence-based scoring from published Indonesian hospital mortality data

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
