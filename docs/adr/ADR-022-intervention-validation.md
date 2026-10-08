# ADR-022: Intervention Param Validation

**Status:** Accepted  
**Date:** 2026-10-08  
**Supersedes:** None  
**Related:** ADR-009 (Timeline Engine), Assessment v2 (2026-10-08)

## Context

The GPT-5.4 Nano assessment flagged:
> "Weak validation of intervention payloads"
> `params: Record<string, unknown>` without per-type schema validation increases chances of silently wrong application of interventions.

## Decision

Add per-type schema validation for all intervention types. Validate at branch creation time (fail fast).

## Schema Definition

```typescript
const INTERVENTION_SCHEMAS: Record<InterventionType, InterventionSchema> = {
  bed_increase:     { required: ["count"],      validators: { count: (v) => typeof v === "number" && v > 0 } },
  staff_reduction:  { required: ["reduction"],  validators: { reduction: (v) => typeof v === "number" && v >= 0 && v < 1 } },
  supply_injection: { required: ["drugs","reduction"], validators: { drugs: Array.isArray, reduction: (v) => typeof v === "number" && v > 0 } },
  scenario_activate:{ required: ["type"],       validators: { type: (v) => typeof v === "string" } },
  policy_override:  { required: ["policy","value"], validators: { policy: (v) => typeof v === "string", value: (v) => typeof v === "number" } },
  custom:           { required: [] },
};
```

## Implementation

- `validateIntervention(intervention)` throws on invalid params
- Called in `createBranch()` — invalid interventions fail at creation, not execution
- 14 unit tests covering all types and edge cases

## Consequences

### Positive
- Fail-fast: invalid interventions caught immediately
- Clear error messages for debugging
- Self-documenting: schema is the source of truth for params

### Negative
- Slightly more code to maintain
- Breaking change: previously silent invalid params now throw
