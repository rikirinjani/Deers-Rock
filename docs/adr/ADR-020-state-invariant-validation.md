# ADR-020: State Invariant Validation

**Status:** Accepted  
**Date:** 2026-10-08  
**Supersedes:** None  
**Related:** ADR-004 (Snapshots), ADR-015 (Finance), ADR-018 (AI Coder)

## Context

The GPT-5.4 Nano assessment (2026-10-08, score 58/100) flagged several concerns:
1. **State invariant enforcement unclear** — `morgueId` on Patient suggests death state but no runtime guards
2. **Journal replay ordering risk** — later verified as already handled (ORDER BY id ASC)
3. **RNG validation in rollPayerMix** — later verified as already handled (bounded input + last-entry fallback)

This ADR addresses the **genuine gaps** identified: lack of runtime invariant validation and absence of replay equivalence testing.

## Decision

### 1. Invariant Validator Module
Add `src/engine/invariant-validator.ts` with five enforced invariants:

| ID | Invariant | Check |
|----|-----------|-------|
| I1 | `morgueId_consistency` | Deceased patient ↔ morgueId ≠ null; living ↔ morgueId = null |
| I2 | `encounter_patient_link` | Every encounter references a valid patient |
| I3 | `bed_patient_link` | Every occupied bed references a valid patient |
| I4 | `discharge_endTime` | Discharged inpatient has endTime; active inpatient doesn't |
| I5 | `charge_encounter_link` | Every charge references a valid encounter |

### 2. Runtime Integration
- `validateInvariants(state)` returns `{ pass, violations, totals }`
- `assertInvariants(state, label)` throws on violation (for tests)
- `logInvariants(state, label)` warns on violation (for debug)
- Integrated into `world.ts` step() every 100 ticks when `DR_VALIDATE_INVARIANTS=1`

### 3. Test Coverage
- `tests/invariant-validator.test.ts`: 4 tests covering happy path, long run, totals, assert
- Validates state at tick 100, 500 — all pass with 0 violations

### 4. False Positives Documented
The assessment incorrectly flagged two items that were already handled:
- **Journal ordering**: `ORDER BY id ASC` on autoincrement PK — deterministic
- **RNG validation**: `rollPayerMix` has bound-check comment; caller guarantees [0,1)

## Consequences

### Positive
- Runtime safety net catches state corruption early
- Testable invariants provide regression protection
- Environment-gated (OFF by default) — zero production overhead
- Clear documentation of invariants in code

### Negative
- Small runtime cost when enabled (~0.1ms per check at 100-tick intervals)
- Adds one more module to maintain

### Trade-offs
- **For:** Proactive bug detection vs. post-hoc debugging
- **Against:** Development overhead of maintaining invariant list
- **Mitigation:** Invariants are cheap to check; cost is in false positives from invalid rules (fixed by type-only checking I4 to inpatients)

## Implementation

| File | Lines | Purpose |
|------|-------|---------|
| `src/engine/invariant-validator.ts` | 120 | Core validation logic |
| `src/engine/config.ts` | +3 | `isInvariantValidationEnabled()` |
| `src/engine/world.ts` | +10 | Integration in step() |
| `tests/invariant-validator.test.ts` | 50 | 4 tests |

## References
- Assessment: `docs/assessment/deer-s-rock-assessment.md` (2026-10-08)
- ADR-004: Snapshot/Journal persistence
- ADR-015: Finance/Claims architecture
