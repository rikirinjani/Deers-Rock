# ADR-008: Seeded Random Number Generation

**Status:** Accepted
**Date:** 2026-06-28
**Author:** Coordinator OC (design decision), Platform OC (implementation)

## Context

Deterministic replay (Constitution §1.3) requires that every `Math.random()` call produces the same sequence across replay runs. Currently, randomness is spread across ~30 handler files with no centralized seeding mechanism. This breaks replay determinism.

## Decision

1. **A seeded PRNG shall be tagged onto the `Clock` object.** It is not part of Clock's timekeeping logic but shares Clock's lifecycle — saved, restored, and advanced with the same snapshot.
2. **The PRNG shall be a mulberry32 or similar 32-bit seeded generator** — simple, fast, deterministic, good distribution.
3. **Clock gains two new fields:**
   - `rng: () => number` — the callable function returning [0, 1)
   - `rngSeed: number` — the current seed (for snapshot serialization)
4. **On snapshot save:** `rngSeed` is serialized alongside tick and hospitalTimeMs.
5. **On snapshot restore:** A new PRNG is seeded from the saved `rngSeed`, then advanced to the correct internal state (or re-seeded from a counter derived from ticks elapsed since snapshot).
6. **Every `Math.random()` call in handlers shall be replaced with `clock.rng()`.**

## Why Not Separate RNG State

- Coupling RNG lifetime to Clock lifetime eliminates a class of desynchronization bugs — one snapshot field captures both time and randomness.
- Replay path is identical to live path: restore Clock → everything is correct.
- Avoids adding a fourth parameter to the handler pipeline.

## Consequences

- **Positive:** One-shot migration of all `Math.random()` → `clock.rng()`
- **Positive:** Snapshot restore automatically restores RNG state
- **Positive:** Seed fixed simulation runs (e.g., `createWorld(100, { seed: 42 })`) for reproducible experiments (Research OC requirement)
- **Negative:** Clock now carries non-timekeeping state (abstraction impurity)
- **Negative:** ~30 files need mechanical edits to replace `Math.random()` calls
- **Neutral:** PRNG function is lightweight (~100 bytes, no dependencies)

## Implementation Priority

High — blocks Milestone 2.6 (Scientific Validation Infrastructure) and all Research OC experiments.

## Related

- Constitution §1.3 (Determinism)
- Constitution §1.4 (Auditability — snapshots)
- ROADMAP.md Milestone 2.6 (Scientific Validation Infrastructure)
- Research OC experiments E1-E5
