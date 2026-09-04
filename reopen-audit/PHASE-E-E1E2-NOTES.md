# Phase E — E1/E2 Consumer Implementation Notes

## Status: COMPLETE

### Files Changed

| File | Change |
|------|--------|
| `src/engine/state-store.ts` | Added `_supplyChainPressure: number` and `_activeMacroDisaster: string \| undefined` to `HospitalState`; initialized in `createState()` |
| `src/engine/world.ts` | Added `supply_chain_pressure` and `active_disaster` event handlers in `step()` switch |
| `src/engine/central-supply.ts` | Modified `centralSupplyHandler()` — adaptive restock threshold driven by `_supplyChainPressure` |
| `src/engine/scenario.ts` | Added `mapMacroDisasterToScenario()`; modified `scenarioHandler()` to activate mapped DR scenario from `_activeMacroDisaster` |
| `src/engine/journal.ts` | Added deserialization for `_supplyChainPressure` and `_activeMacroDisaster` |
| `tests/phase-e.test.ts` | Added 15 new tests (6 supplyChainPressure + 9 activeDisasterType) |
| `Kronos Engine/src/sectors/deers-rock-adapter.ts` | Added `supply_chain_pressure` and `active_disaster` event dispatch in adapter tick |

### Test Results

- Phase B: 7/7 ✓
- Phase C: 10/10 ✓
- Phase D: 16/16 ✓
- Phase E: 27/27 ✓ (was 12, now 27 with new tests)
- **Total: 60/60 ✓**
- TypeScript build: clean

---

## 1. `diagnosisWeightOverrides` — NOT PROVEN (UNSUPPORTED)

### Classification: **UNSUPPORTED**

### Why Unsupported

The adapter's `diagnosisWeightOverrides` field uses **ICD chapter ranges** (e.g., `"S00-T88"`, `"J00-J99"`, `"I00-I99"`). DR's scenario system uses **specific ICD codes** (e.g., `S72: 25`, `S06: 20`, `T14: 20`).

**Format mismatch:**
- Adapter: `Record<string, number>` where keys are ICD chapter ranges like `"S00-T88"`
- DR `icdWeights`: `Record<string, number>` where keys are specific ICD codes like `"S72"`

**Semantic mismatch:**
- Adapter chapters span hundreds of codes (e.g., `S00-T88` covers all injury codes)
- DR scenario weights target specific diagnoses (e.g., `S72` = femur fracture)

**No existing wiring path:**
- DR's `icdWeights` are consumed by `selectPrimaryDiagnosisCode()` in `markov.ts`, which uses weighted random selection over specific codes
- The adapter's chapter-range format cannot be mapped to this mechanism without inventing a new interpretation layer

**Decision:** Do not wire. Document as architectural mismatch between KE macro-level and DR micro-level diagnosis representations.

---

## 2. `supplyChainPressure` — PROVEN

### Classification: **PROVEN**

### Producer Semantics (traced in adapter)

- **Source:** `buildMacroPacket()` in `deers-rock-adapter.ts`
- **Range:** 0.0 to 1.0
- **Default:** 0.0 (no external pressure)
- **Produced by:**
  - `EXTREME_WEATHER` → `Math.max(supplyChainPressure, 0.4)`
  - `WAR_START` → `Math.max(supplyChainPressure, 0.5)`
  - `WAR_CASUALTIES` → `Math.min(1, supplyChainPressure + 0.1)`
- **Semantics:** Higher = more supply chain disruption from external events

### Causal Direction (defensible)

External events (weather, war) disrupt supply chains → hospital needs to restock more aggressively to buffer against potential disruptions. This is a **supply-chain resilience response**.

### Implementation

**Adapter dispatch:** Added `supply_chain_pressure` event when `pressure > 0`.

**DR consumer:** Modified `centralSupplyHandler()`:

```
effectiveMin = minStock + (maxStock - minStock) × supplyChainPressure
```

- `pressure = 0.0` → `effectiveMin = minStock` (baseline, unchanged behavior)
- `pressure = 0.5` → `effectiveMin = midpoint` (restock earlier)
- `pressure = 1.0` → `effectiveMin = maxStock` (always restock)

**Properties:**
- Deterministic (no `Math.random()`)
- Preserves existing inventory dynamics (same restock cadence, same maxStock target)
- Bounded (clamped to [0, 1])
- Explicit formula documented

### Causal Evidence

- `pressure=0` produces identical restock count as baseline (no intervention)
- `pressure=1.0` causes ALL items to restock to maxStock at tick 150
- Effect is deterministic under same seed

---

## 3. `activeDisasterType` — PROVEN

### Classification: **PROVEN**

### Producer Semantics (traced in adapter)

- **Source:** `buildMacroPacket()` in `deers-rock-adapter.ts`
- **Values produced:**
  - `EXTREME_WEATHER` → `"natural-disaster"`
  - `WAR_START` → undefined (not set)
- **Semantics:** Identifies the type of external disaster affecting the hospital

### Mapping to DR Scenario Types

```typescript
function mapMacroDisasterToScenario(disasterType: string): ScenarioType | undefined {
  switch (disasterType) {
    case "natural-disaster": return "earthquake";   // physical infrastructure damage
    case "mass-casualty": return "mass_casualty";    // trauma surge
    default: return undefined;                        // unknown: no activation
  }
}
```

**Rationale:**
- `"natural-disaster"` → `"earthquake"`: Both involve physical infrastructure damage, mass casualties, supply disruption
- `"mass-casualty"` → `"mass_casualty"`: Direct semantic match
- Unknown types: No activation (safe behavior, no silent side effects)

### Implementation

**Adapter dispatch:** Added `active_disaster` event when `disasterType` is defined.

**DR consumer:** Modified `scenarioHandler()`:
- When `_activeMacroDisaster` is set and no DR scenario is active → activate mapped DR scenario with fixed severity (0.6)
- When `_activeMacroDisaster` is set and DR scenario IS active → let existing scenario continue (no override)
- When `_activeMacroDisaster` is undefined → normal DR scenario spawning (unchanged)

### Causal Evidence

- Baseline (no disaster) differs from disaster intervention
- Same seed + same disaster reproduces exactly (deterministic)
- Different disasters produce different scenario types
- Unknown disaster type does not activate any scenario
- Active scenario produces observable effects via `getScenarioEffects()` (mortalityBoost > 0, surgeMultiplier > 1)
