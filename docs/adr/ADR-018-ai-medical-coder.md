# ADR-018: AI Medical Coder Agent

**Status:** Accepted  
**Date:** 2026-10-08  
**Epics:** II (M2.5), IX (M9.1)  

## Context

The medical records system (`src/engine/medical-records.ts`) had basic coder assignment but no:
- ICD-10 code validation against the INA-CBG formulary
- DRG/CBG severity-aware assignment
- Chart completeness scoring
- Learning from coding outcomes

Claims were silently denied when `validateCbgCoding()` failed, with no feedback to improve coder accuracy.

## Decision

Build an **AI Medical Coder agent** with four capabilities:

### 1. ICD-10 Validator
- Cross-checks each diagnosis code against `INA_CBG` formulary
- Returns `{ valid, warning, suggestion }` for unknown codes
- Flags orphaned codes that would cause claim denial

### 2. DRG/CBG Assigner
- Uses existing `inferSeverity()` from `ina-cbg.ts`
- Factors in primary diagnosis + secondary CC/MCC + surgical procedures
- Returns CBG group, severity level (I/II/III), SEP score, tariff estimate
- Procedure boost: surgical cases get +1 SEP (up to max 4)

### 3. Chart Completeness Scorer
- Multi-point rubric (0–100):
  - Diagnoses: 0–30pts (primary required, secondary bonus)
  - Procedures: 10–20pts
  - Lab orders: 0–10pts (ratio-based)
  - Radiology: 0–5pts
  - Nurse notes: 0–5pts
  - Coder assigned: 0–10pts
- Reports gaps for incomplete charts

### 4. Coder Learning Engine
- 4 coder profiles with specialty bias:
  | Coder | Specialty | Base Accuracy | ICD Prefixes |
  |-------|-----------|---------------|--------------|
  | Alpha | Internal Med | 92% | I, E, N, R, J, K, G, F |
  | Beta | Surgery | 88% | S, T, M, V, W, X |
  | Gamma | Pediatrics | 90% | P, Q, R |
  | Delta | General | 85% | A, B, C, D, H, L, O, U, Z |
- Rolling 50-outcome accuracy window (70% historical + 30% recent)
- Clamped to 60–98% range
- Feeds back into `finance.ts` claim validation

## Consequences

### Positive
- Claim denial rate should decrease as coders learn from outcomes
- Revenue optimization via correct DRG severity assignment (SEP 0→4 = 90% tariff increase)
- Chart quality visibility via completeness scores
- Detectable coding drift (accuracy degradation alerts)

### Negative
- Additional state: `_coderLearningState` in `HospitalState`
- Coder profiles are module-level mutable state (not serialized in snapshots)
- ~300 lines of new code, ~60 lines of schema changes
- 12 new tests (65s runtime)

### Trade-offs
- **For:** Learning improves clinical documentation quality over simulation time
- **Against:** Module-level singleton profiles don't survive serialization; accuracy resets on restart
- **Mitigation:** Profiles re-initialize from base accuracy; learning resumes from scratch

## Implementation

| File | Lines | Purpose |
|------|-------|---------|
| `src/engine/ai-coder.ts` | 310 | Core: validator, assigner, scorer, learner |
| `src/patient/schema.ts` | +6 | MedicalChart extension fields |
| `src/engine/state-store.ts` | +4 | _coderLearningState initialization |
| `src/engine/medical-records.ts` | +5 | Import AI coder functions |
| `src/engine/world.ts` | +3 | aiCoderHandler every 3 ticks |
| `src/api/rest.ts` | +6 | /api/coders endpoint |
| `tests/ai-coder.test.ts` | 130 | 12 tests |

## References
- INA-CBG tariff table: Permenkes No. 28/2020
- ICD-10-WM: WHO adaptation for Indonesia
- DRG severity: SEP (Severity of Illness Points) 0–4
