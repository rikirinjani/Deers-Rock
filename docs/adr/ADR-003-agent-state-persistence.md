# ADR-003: Agent State Persistence Contract

**Status:** Approved (2026-07-02) — implemented by Platform OC (commit 8afc0fe)
**Date:** 2026-06-28
**Author:** Coordinator OC

## Context

`HospitalState` contains two sub-states that are currently **not persisted** across snapshot save/restore cycles:

### 1. Agent State (`_agentState`)

```typescript
_agentState: {
  pool: {
    agents: Map<string, Agent>;      // 60+ agents with fatigue, health, shift
    assignments: Map<string, string>; // agentId → encounterId
  }
}
```

Tracks:
- Agent fatigue level (per tick)
- Agent health degradation (sehat → lelah → sakit_ringan → sakit_berat)
- Shift schedules (pagi/siang/malam)
- Female agent physiology (menstruation cycle, pregnancy)
- License information (STR/SIP/SKP)
- Encounter assignments (which doctor/nurse is assigned to which patient)

### 2. Referral State (`_referralState`)

```typescript
_referralState: {
  facilities: Map<string, Facility>;
  letters: Map<string, ReferralLetter>;
  incomingQueue: ReferralLetter[];
}
```

Tracks:
- 30 referral facilities (Puskesmas, Klinik, RS Tipe D/C)
- Active referral letters in transit
- Referral pipeline statuses (active → received → completed/returned)

### Current Behavior

In `journal.ts:270-271`, both states are hardcoded to empty defaults on deserialization:

```typescript
_agentState: { pool: { agents: new Map(), assignments: new Map() } },
_referralState: { facilities: new Map(), letters: new Map(), incomingQueue: [] },
```

This means after any snapshot restore, all agent fatigue, health degradation, shift states, and referral pipelines are reset to initial conditions.

## Decision

### Principle

All state within `HospitalState` shall be persisted across snapshot save/restore cycles unless explicitly excluded for a documented reason.

### Implementation Path

1. **Serialize agent state**: Add `_agentState` to the snapshot payload in `saveSnapshot()`.
2. **Serialize referral state**: Add `_referralState` to the snapshot payload.
3. **Deserialize both**: Restore from saved data instead of hardcoded defaults.

### Serialization Strategy

Both `_agentState` and `_referralState` contain nested `Map` objects, which must be converted to arrays for JSON serialization (same pattern used for all other Map-based collections):

```typescript
// Save
agentState: {
  pool: {
    agents: mapToArr(state._agentState.pool.agents),
    assignments: mapToArr(state._agentState.pool.assignments),
  }
}

// Restore
_agentState: {
  pool: {
    agents: arrToMap(d.agentState?.pool?.agents ?? []),
    assignments: arrToMap(d.agentState?.pool?.assignments ?? []),
  }
}
```

### Backward Compatibility

- Old snapshots without agent/referral state must still load.
- Use optional chaining and default to initial state when fields are missing.
- This matches the pattern used for all optional departments (microbiology, pathology, etc.).

## Consequences

- **Positive:** Agents retain fatigue, health, and shift state across simulation restarts.
- **Positive:** Referral pipelines are not lost on restart.
- **Positive:** Consistent with the existing serialization pattern for all other state collections.
- **Negative:** Snapshot size increases by ~5-10KB (agent data for 60+ agents).
- **Negative:** Snapshot schema changes require a migration path for existing snapshots.
- **Neutral:** Agent and referral state were likely omitted initially because they were added later (identity/referral overhaul) and the snapshot code wasn't updated.

## Related

- Constitution Article IV §4.1 (State Immutability)
- `journal.ts:270-271` — current hardcoded defaults
- `journal.ts:200-231` — saveSnapshot serialization
- `journal.ts:255-295` — deserializeState deserialization
- `tests/snapshot.test.ts` — would need updating to verify agent/referral state round-trip
