# ADR-009: Timeline Engine — Counterfactual Experimentation

**Status:** Accepted
**Date:** 2026-10-07
**Supersedes:** P-001A (draft proposal)
**Related:** ADR-004 (snapshots), ADR-008 (seeded RNG), ADR-015 (finance)

---

## Context

Deer's Rock is a deterministic, seeded hospital simulation. Every run with the same seed produces identical output. Snapshots persist full state to SQLite. This makes **counterfactual experimentation** possible: run the same hospital from the same starting point, change one variable, compare outcomes.

The platform currently supports:
- Deterministic replay (`createWorld(50, db, 42)` → identical trajectory)
- Snapshot save/load (`saveSnapshot`, `loadNearestSnapshot`)
- Resume from snapshot (`resumeWorld`)
- Multi-seed ensembles (`src/experiment/runner.ts`)

What it does **not** yet support:
- Branching: "At tick 500, double ICU beds, run 1000 more ticks, compare to baseline"
- Intervention catalog: structured way to declare "what changed"
- Branch comparison: statistical delta between baseline and intervention
- Standard scenarios: frozen seed+tick+intervention triples for reproducibility

## Decision

Introduce a **Timeline Engine** that treats snapshots as **Points of Rewind** from which branches diverge. The engine is generic (not hospital-specific) but first implemented for healthcare.

### Core Abstractions

```typescript
interface UniverseID {
  id: string;              // "U-2026-0001"
  rngSeed: number;         // PRNG seed
  parent: string | null;   // null for primordial, "U-2026-0000" for children
  rewindTick: number | null; // tick this branch diverged from parent
  intervention: string | null; // human-readable description
  created: string;         // ISO timestamp
  label: string;           // "TSunami vs baseline"
}

interface Branch {
  id: string;              // "br-001"
  universeId: string;
  parentSnapshotTick: number;
  intervention: Intervention;
  result: BranchResult | null;
}

interface Intervention {
  type: "bed_increase" | "staff_reduction" | "supply_injection" | "scenario_activate" | "policy_override" | "custom";
  params: Record<string, unknown>;
}

interface BranchResult {
  ticksRun: number;
  finalTick: number;
  outcomes: OutcomeDelta; // see below
  journalPath: string;
}

interface OutcomeDelta {
  deaths: { baseline: number; intervention: number; delta: number };
  LOS: { baseline: number; intervention: number; delta: number };
  occupancy: { baseline: number; intervention: number; delta: number };
  charges: { baseline: number; intervention: number; delta: number };
}
```

### Architecture

```
Client
  │
  ├─ POST /api/branch/create
  │    body: { universeId, parentSnapshotTick, intervention }
  │    → creates Branch record, forks journal namespace
  │
  ├─ POST /api/branch/:id/run
  │    body: { ticks }
  │    → resumes from parentSnapshotTick with intervention applied
  │    → runs N ticks, stores result
  │
  ├─ GET /api/branch/:id
  │    → returns Branch + BranchResult
  │
  ├─ GET /api/branch/:id/compare?otherId=br-002
  │    → returns OutcomeDelta (statistical delta)
  │
  └─ GET /api/universes/:id/branches
       → list all branches for a universe
```

**Journal isolation:** Each branch gets its own SQLite journal file (`branch-{id}.db`) sharing the same snapshot database. This ensures clean separation while allowing shared snapshot reads.

**Intervention application:** Interventions are applied as mutations to the resumed world state before running. The `Intervention` interface is extensible — new types can be added without breaking existing branches.

## Consequences

### Positive
- Enables controlled counterfactual experiments (the core value proposition)
- Deterministic by construction: same seed + same intervention + same ticks = same outcome
- Journal isolation prevents cross-branch contamination
- Extensible intervention types

### Negative
- Adds complexity: branch lifecycle management, intervention application, comparison logic
- Storage grows with each branch (full state snapshots per branch)
- Comparison requires running both baseline and intervention (no analytical shortcut)

### Neutral
- Universe ID scheme (`U-YYYY-NNNN`) is human-designed; could be auto-generated
- Standard scenarios (M3.5) are convenience, not core

## Migration Path

1. **Phase 1 (this sprint):** ADR-009 + `POST /api/branch/create` + `POST /api/branch/:id/run`
2. **Phase 2:** Standard scenarios + `GET /api/branch/:id/compare`
3. **Phase 3:** CLI `deers-rock branch` + DOT export

## Related

- ADR-004: Snapshot/Journal persistence (foundation)
- ADR-008: Seeded RNG (determinism guarantee)
- P-001A: Original proposal (superseded)
