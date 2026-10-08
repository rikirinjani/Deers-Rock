# ADR-021: Primary Diagnosis Selection by Priority

**Status:** Accepted  
**Date:** 2026-10-08  
**Supersedes:** None  
**Related:** ADR-018 (AI Coder), Assessment v2 (2026-10-08)

## Context

The GPT-5.4 Nano assessment (v2, score 62/100) flagged:
> "Non-robust diagnosis selection based on array order"
> `selectPrimaryDiagnosisCode` in `src/engine/markov.ts` uses `patient.diagnoses.find(d => d.active)` which assumes "first active in array" matches the intended primary diagnosis.

Previous code selected the **first** active diagnosis in array order, which could drift if diagnoses are reordered during coding or learning updates.

## Decision

Add an explicit `priority` field to `Diagnosis` interface. Lower numbers = higher priority. Primary diagnosis selected by sorting active diagnoses by priority (ties broken by ICD code for determinism).

Generator assigns `priority = 100 - weight` so higher-prevalence conditions naturally rank higher.

## Implementation

| Change | File | Details |
|--------|------|---------|
| `priority?` field | `src/patient/schema.ts` | Optional number on Diagnosis |
| Priority assignment | `src/patient/generator.ts` | `priority: 100 - weight` |
| Selection by priority | `src/engine/markov.ts` | Sort active diagnoses, pick lowest priority |

## Consequences

### Positive
- Primary diagnosis is now deterministic and stable across re-sorting
- Clinically meaningful: higher-prevalence conditions are more likely primary
- Backward compatible: `priority` is optional, defaults to 99

### Negative
- Slight change in primary diagnosis distribution (may affect claim amounts)
- Generator changes affect all existing patient data (re-seeded runs may differ)
