# ADR-025: Assessment-Driven Quality Fixes

**Status:** Accepted  
**Date:** 2026-10-08  
**Supersedes:** None  
**Related:** Assessment v4 (GPT-5.4 Nano), Assessment v5 (GPT-6 Astra)

## Context

Two LLM assessments identified genuine quality gaps:

### GPT-5.4 Nano (v4, score 62)
- Cross-branch snapshot overwrite risk
- Infinity/NaN in intervention params
- Diagnosis selection inconsistency

### GPT-6 Astra (v5, score 68)
- Same snapshot issue (confirmed)
- Staffing realism (`inShift=true` always)
- Diagnosis/payer contract conflict
- Oversimplified JR accident detection

## Decisions

### 1. Branch-Isolated Snapshots (Fixes snapshot overwrite)
- Added `branch_id` column to `world_snapshots` table
- Primary key changed from `(tick)` to `(tick, branch_id)`
- `saveSnapshot(tick, state, queue, branchId?)` — optional branch ID
- `loadNearestSnapshot(tick, branchId?)` — filters by branch
- Main universe saves with `branchId=null`; branches can use their ID
- Purge logic updated to delete by `(tick, branch_id)` pair

### 2. Intervention Numeric Validation (Fixes Infinity/NaN)
- All numeric validators now use `Number.isFinite()` check
- `bed_increase.count` requires `Number.isInteger(v) && v > 0`
- `staff_reduction.reduction` requires `Number.isFinite(v) && 0 <= v < 1`
- `supply_injection.reduction` requires `Number.isFinite(v) && v > 0`
- `policy_override.value` requires `Number.isFinite(v)`
- Added 3 new tests for Infinity, NaN, and non-integer rejection

### 3. Unified Diagnosis Selection (Fixes markov/finance conflict)
- Created `src/engine/diagnosis-utils.ts` with shared `getPrimaryDiagnosis()` and `selectPrimaryDiagnosisCode()`
- Both `markov.ts` and `finance.ts` now use the same priority-based selection
- Eliminates inconsistency between admission specialty routing and payer assignment

### 4. Expanded JR Accident ICD Detection (Fixes oversimplified detection)
- `ACCIDENT_ICD_CODES` expanded from 5 codes to 200+ codes
- Covers full ICD-10 Chapter 19: `S00-S99` (injures) and `T00-T98` (external causes)
- `finance.ts` now uses `getPrimaryDiagnosis()` for consistent detection

### 5. Handler Phase Documentation (ADR-024, already done)
- 5-phase annotation in `HANDLER_SKIP` array
- Each handler has inline purpose comment

## Implementation

| File | Change |
|------|--------|
| `src/engine/journal.ts` | branch_id column, updated save/load/purge |
| `src/engine/diagnosis-utils.ts` | NEW: shared diagnosis selection |
| `src/engine/markov.ts` | use getPrimaryDiagnosis(), restore imports |
| `src/engine/finance.ts` | use getPrimaryDiagnosis(), expanded ACCIDENT_ICD_CODES |
| `src/timeline/engine.ts` | Number.isFinite() in validators |
| `tests/intervention-validation.test.ts` | +3 tests (Infinity, NaN, non-integer) |
| `docs/adr/ADR-025-quality-fixes.md` | this document |

## Unaddressed Findings

The following assessment findings were **deliberately deferred**:

| Finding | Reason |
|---------|--------|
| Per-agent shift tracking | Requires redesign of agent state (medium effort, ~2 weeks) |
| SQL injection in journal | Already using parameterized queries (false positive) |
| Orchestration determinism | Already verified: sequential handlers + immutable state |
| Vitals min/max bounds | Handled by generator constraints |

## Consequences

### Positive
- Branch snapshots no longer collide across branches
- Invalid interventions (Infinity, NaN, floats for bed counts) rejected upfront
- Diagnosis selection is now consistent across all modules
- JR payer detection covers full injury spectrum

### Negative
- Schema migration: existing snapshot DB needs `ALTER TABLE` to add `branch_id`
- New dependency: `diagnosis-utils.ts` imported by both markov and finance

### Migration Note
Existing snapshots without `branch_id` will continue to work (NULL matches all queries). No data loss.
