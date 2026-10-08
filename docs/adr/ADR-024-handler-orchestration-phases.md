/**
 * ADR-024: Handler Orchestration Phases
 *
 * Documents the 5-phase handler execution model in world.ts.
 */
# ADR-024: Handler Orchestration Phases

**Status:** Accepted  
**Date:** 2026-10-08  
**Supersedes:** None  
**Related:** ADR-009 (Timeline), Assessment v3 (2026-10-08)

## Context

The GPT-5.4 Nano assessment (v3, score 72/100) flagged:
> "High-risk orchestration nondeterminism"
> "Without an explicit ordering contract... correctness often depends on strict ordering and single-responsibility routing."

Previously, `HANDLER_SKIP` was a flat array with no documentation of execution phases. While the order was deterministic (array iteration), there was no explicit contract documenting *why* handlers were ordered as they were.

## Decision

Add explicit phase annotations to `HANDLER_SKIP` in `src/engine/world.ts`:

| Phase | Name | Handlers | Purpose |
|-------|------|----------|---------|
| 1 | Patient Lifecycle | admission, newPatient, agent, vitals, emergency, outpatient | Create/update patients and agents |
| 2 | Clinical Departments | lab, pharmacy, radiology, surgery, etc. (15 handlers) | Clinical treatment workflows |
| 3 | Support & Supply | centralSupply, referral, ambulance, JR | Support services |
| 4 | Finance & Records | billing, cashier, medicalRecords, aiCoder, icdTracker | Financial processing |
| 5 | Meta & Cleanup | dischargePlanning, sickLeave, kamarJenazah, scenario, outcome, learning, cleanup | Post-processing |

## Implementation

- Added phase comments to `HANDLER_SKIP` array (lines 393-450 of world.ts)
- Each handler has an inline comment describing its purpose
- Phase grouping is documented in the module-level JSDoc

## Consequences

### Positive
- Explicit ordering contract documented in code
- New developers can understand handler execution flow
- Assessment can reference specific phases for correctness reasoning
- No runtime behavior change (order unchanged)

### Negative
- Slightly larger source file (comments only)
- Phase boundaries are soft — handlers within a phase still run sequentially

### Trade-offs
- **For:** Documentation-as-contract reduces ambiguity in correctness reasoning
- **Against:** Comments can drift from reality if handlers are added/removed without updating
- **Mitigation:** Handler addition requires updating both the array AND the phase comment
