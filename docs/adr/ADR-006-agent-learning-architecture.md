# ADR-006: Agent Learning Architecture

**Status:** Accepted
**Date:** 2026-10-07
**Origin:** Codified from commit `21e99c8` — feat(engine): learning freeze toggle (Epic II.6) — DR_FREEZE_LEARNING=1
**Scope:** Agent reinforcement-learning subsystem (`src/engine/agent-learning.ts`, `learningHandler`). No changes to agent fatigue/health/shift simulation.

---

## Context

Deers-Rock's AI agents (doctor, nurse, pharmacist) learn from outcomes via reinforcement learning. Each tick, `outcomeHandler` produces outcome records and `learningHandler` (pipeline position 34, immediately downstream — ADR-001) folds them into `_learningMemory` — per-diagnosis action scores and deterioration rates. Learned values then bias future agent decisions: `getActionRanking()` orders candidate actions, and `getDeteriorationRate()` adjusts deterioration probabilities.

This creates an experimental-control problem: any experiment comparing interventions must be able to hold agent learning constant, or the learning signal drifts the very behavior under study. Uncontrolled learning also compounds across runs — two runs with identical seeds but different learning exposure produce different agent behavior — breaking the reproducibility the platform exists to provide.

## Decision

Learning is controlled by the **`DR_FREEZE_LEARNING=1`** environment variable (commit `21e99c8`, Epic II M2.6). When set:

- `learningHandler` is skipped every tick — no memory updates, no side effects (`isLearningFrozen()` short-circuit).
- `getActionRanking()` returns uniform 0.5 scores — no learned bias in action selection.
- `getDeteriorationRate()` returns `null` — agents use default (non-learned) deterioration rates.

That is: **agent performance metrics are still computed by `outcomeHandler`, but they are never applied to future decisions.** The learning loop is severed between outcome production and decision input; the world still records what happened, agents just do not adapt to it.

Separately and deliberately **not** frozen: **agent state (fatigue, health, shifts) IS persisted in snapshots** (ADR-004 F4 — `agentState` is serialized in the snapshot payload). Fatigue and shift dynamics are physiology/rostering simulation, not learning; freezing them would falsify the operational model, and they are already deterministic given a seed.

## Consequences

- **Positive:** Frozen learning enables reproducible experiments — same seed + frozen learning ⇒ identical agent behavior across runs and across restarts. This is the configuration under which frozen research baselines are produced.
- **Positive:** The toggle is env-gated following the established `DR_*` pattern (ADR-004 D4); unset means today's behavior, so frozen evidence replays unchanged.
- **Negative:** Unfrozen learning introduces non-determinism *relative to run history* even with a fixed seed — because memory depends on the full outcome stream. Any unfrozen-learning experiment must control this via explicit seeding (ADR-008) and declared baselines; results without a declared learning posture are not comparable.
- **Neutral:** `getDeteriorationRate()` requires ≥ 2 cases per diagnosis before returning a learned rate; frozen mode short-circuits before that threshold logic, so sparse-diagnosis behavior is unchanged either way.

## Related

- ADR-008 — Seeded random number generation (the determinism backbone for both frozen and unfrozen learning)
- ADR-004 — Bounded state / durable scheduling (`agentState` + learning memory snapshot persistence, F4/D3)
- ADR-001 — Handler pipeline (`outcomeHandler` → `learningHandler` ordering)
- Epic II M2.6 — learning freeze toggle milestone
