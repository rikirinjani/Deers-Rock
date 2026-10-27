# ADR-001: Handler Pipeline Architecture

**Status:** Proposed
**Date:** 2026-06-28
**Author:** Coordinator OC

## Context

The simulation tick processes state through an ordered pipeline of handlers. The current design has 35 handlers executing in a fixed sequence per tick, plus three special-case functions (`medAdminHandler`, `orderCompleteHandler`, `runMmConference`) called outside the handler loop.

The order matters because:
- Admission and patient inflow must run before clinical handlers (doctors need patients to assess)
- Pharmacy must review orders before nurses administer them
- Billing must run after clinical services produce charges
- Cleanup must run last to avoid interfering with other handlers

## Decision

1. **Handlers execute in a fixed, documented order** as defined in `buildHandlers()` (`world.ts:293-304`).
2. **`medAdminHandler`, `orderCompleteHandler`, and `runMmConference` remain outside the handler array** — they are not per-patient handlers but global lifecycle operations that must run after all per-patient handlers complete. This is an explicit design choice, not an oversight.
3. **The handler order is governed by these dependency rules:**
   - Patient sourcing before clinical assessment
   - Clinical assessment before treatment/diagnostics
   - Treatment before billing
   - Everything before cleanup
4. **New handlers must be added at the appropriate position** in the pipeline, respecting upstream/downstream dependencies.

## Handler Order Rationale

| Position | Handler | Depends On | Required By |
|----------|---------|------------|-------------|
| 1 | admissionHandler | — | All subsequent clinical handlers |
| 2 | outpatientHandler | — | — |
| 3 | newPatientHandler | — | admissionHandler |
| 4 | agentHandler | — | aiDoctorHandler, aiNurseHandler |
| 5 | referralHandler | — | admissionHandler |
| 6 | scenarioHandler | — | admissionHandler, emergencyHandler |
| 7 | emergencyHandler | — | admissionHandler |
| 8 | labHandler | admissionHandler | — |
| 9 | aiPharmacyHandler | admissionHandler | aiNurseHandler (needs reviewed orders) |
| 10 | aiNurseHandler | aiPharmacyHandler | — |
| 11 | aiDoctorHandler | admissionHandler | all diagnostic/treatment handlers |
| 12 | radiologyHandler | aiDoctorHandler | — |
| 13 | surgeryHandler | aiDoctorHandler | — |
| 14 | respiratoryHandler | aiDoctorHandler | — |
| 15 | dietaryHandler | aiDoctorHandler | — |
| 16 | socialWorkHandler | — | — |
| 17-21 | bloodBank, micro, patho, cssd, biomed | admissionHandler | — |
| 22 | ipcHandler | admissionHandler | — |
| 23 | clinicalNutritionHandler | admissionHandler | — |
| 24 | radiotherapyHandler | aiDoctorHandler | — |
| 25 | dialysisHandler | aiDoctorHandler | — |
| 26 | centralSupplyHandler | — | — |
| 27 | medicalRecordsHandler | all clinical handlers | — |
| 28 | specialtyHandler | aiDoctorHandler | — |
| 29-30 | billingHandler, cashierHandler | all clinical handlers | — |
| 31 | vitalsUpdateHandler | — | — |
| 32 | icdTrackerHandler | all clinical handlers | — |
| 33 | outcomeHandler | dischargeHandler (via event queue) | learningHandler |
| 34 | learningHandler | outcomeHandler | — |
| 35 | cleanupHandler | everything | — |

## Consequences

- **Positive:** Deterministic, debuggable pipeline. Easy to reason about state at each tick.
- **Positive:** Adding a new handler is mechanical — write the function, insert at the correct position, done.
- **Negative:** The pipeline is strictly sequential — no parallelism. At scale (>500 encounters), total tick time will be the sum of all handler latencies.
- **Neutral:** `medAdminHandler`, `orderCompleteHandler`, `mmConference` are special cases that must be remembered when reasoning about the full tick lifecycle.

## Related

- Constitution Article IV: Data Integrity (state immutability between handlers)
