# ADR-002: Snapshot and Journal Retention Strategy

**Status:** Proposed
**Date:** 2026-06-28
**Author:** Coordinator OC

## Context

HOE uses SQLite for persistent storage of simulation state via two mechanisms:

1. **Event Journal** (`world_journal`): Append-only log of every state transition, used for replay and debugging.
2. **Snapshots** (`world_snapshots`): Full state serialization every N ticks, used for restore after restart.

Without retention limits, both tables grow unboundedly. On Railway's 500MB volume, a single 24-hour run generated enough journal entries to trigger `SQLITE_FULL`. Two separate fixes were deployed (retain 200 ticks, then 100 ticks) before the current approach.

## Decision

### Journal Retention

| Parameter | Value |
|-----------|-------|
| `JOURNAL_RETENTION_TICKS` | 100 |
| `PURGE_INTERVAL` | 50 ticks |
| Pruning trigger | `currentTick - lastPurgeTick >= 50` |
| Vacuum trigger | `deleted.changes > 1000` |

- The journal retains the last 100 ticks of events at all times.
- Purge runs every 50 ticks to avoid per-tick overhead.
- After a large purge (>1000 rows deleted), incremental vacuum reclaims space.
- A `journalHardPurge()` function runs on startup to trim to 100 ticks unconditionally.

### Snapshot Retention

| Parameter | Value |
|-----------|-------|
| `SNAPSHOT_INTERVAL` | 20 ticks |
| `SNAPSHOT_RETENTION_COUNT` | 5 |
| Pruning | Oldest snapshots deleted when count exceeds 5 |

- Snapshots are saved every 20 simulated minutes.
- Only the 5 most recent snapshots are retained.
- This provides up to 100 ticks of replay granularity (5 × 20) while bounding storage.

### Why These Values

- **100 ticks** of journal = ~100 minutes of simulated time = sufficient for debugging without consuming excess space.
- **5 snapshots** × full state serialization = bounded restore points. A snapshot at tick ~1000 is ~200-300KB.
- **20-tick interval** balances restore granularity against write overhead.
- **PURGE_INTERVAL of 50** avoids SQLite lock contention while keeping retention tight.

## Consequences

- **Positive:** Storage is bounded. The database will not fill a 500MB volume during a 30-day real-time run.
- **Positive:** Replay can reconstruct any state within the last 100 ticks.
- **Positive:** Restore from snapshot is fast (single SQLite query, single JSON parse).
- **Negative:** Events older than 100 ticks are permanently lost. Long-term analytics cannot be done from the journal alone.
- **Negative:** Snapshot serialization/deserialization must be updated whenever `HospitalState` gains a new field. Missing fields default to empty/initial values (see ADR-003).
- **Neutral:** Incremental vacuum is not as space-efficient as full vacuum but avoids locking the database.

## Alternatives Considered

- **No pruning (journal grows unbounded):** Rejected — caused SQLITE_FULL on Railway.
- **Retain by count (keep N rows):** Rejected — not tied to simulation time, harder to reason about replay window.
- **Full vacuum on every purge:** Rejected — too expensive for 1-tick-per-second operation.

## Related

- Constitution Article IV §4.2 (Pruning): "The cleanup handler shall run every 10 ticks"
- Constitution Article IV §4.3 (Journaling): "When enabled, every state change shall be journaled"
- `journal.ts:122-148`
- ADR-003: Agent State Persistence Contract
