# ADR-019: Timeline Engine — Branch Journal Isolation

**Status:** Accepted  
**Date:** 2026-10-08  
**Supersedes:** None  
**Related:** ADR-009 (Timeline Engine), ADR-004 (Snapshots/Journal)

## Context

ADR-009 defined the Timeline Engine with journal isolation as a key consequence:
> "Each branch gets its own SQLite journal file (`branch-{id}.db`) sharing the same snapshot database."

Current implementation (`src/timeline/engine.ts`) shares the global journal across all branches. This means:
- Branch runs append events to the main journal, contaminating the baseline
- `resumeWorld()` loads from the main journal, not an isolated branch journal
- Outcome comparisons are invalid because baseline and intervention share event history

## Decision

### 1. Per-Branch Journal Files
Each branch gets a dedicated SQLite journal in `data/branches/{branchId}/journal.db`.
The main journal is read-only for branch operations (only snapshots are shared).

### 2. Branch Journal Interface
Add to `src/engine/journal.ts`:
- `openBranchJournal(branchId, snapshotDbPath)` — opens isolated journal for a branch
- `closeBranchJournal(branchId)` — closes and persists
- `getBranchJournalPath(branchId)` — returns path for API/export

### 3. Snapshot Sharing
Branches share the **main snapshot database** (read-only). Each branch writes to its own journal.
This matches ADR-009: "sharing the same snapshot database" but separate event logs.

### 4. avgLOS Fix
`runStandardScenario()` currently hardcodes `avgLOS: 0`. Compute from discharged inpatients.

## Implementation Plan

| Step | File | Change |
|------|------|--------|
| 1 | `src/engine/journal.ts` | Add `openBranchJournal`, `closeBranchJournal`, `getBranchJournalPath` |
| 2 | `src/timeline/engine.ts` | Wire branch journals into `runBranch` |
| 3 | `tests/timeline.test.ts` | Add 8+ tests for create/run/compare/isolation |
| 4 | `ROADMAP.md` | Mark M3.2-3.5 complete |
| 5 | Kaggle kernel v7 | Include all changes |

## Consequences

### Positive
- Branch outcomes are statistically valid (no event contamination)
- Can run multiple branches concurrently without cross-talk
- Matches ADR-009 design intent exactly
- avgLOS now accurate for scenario reporting

### Negative
- Storage grows per branch (journal file per branch)
- Slightly more complex lifecycle management (open/close branch journals)

### Trade-offs
- **For:** Correct counterfactual experimentation requires isolated event logs
- **Against:** Added complexity in journal management
- **Mitigation:** Branch journals auto-closed on completion; only active branches hold handles
