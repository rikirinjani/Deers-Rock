/**
 * ADR-004 D4 — env-gated rollout flags (research-safe).
 *
 * Both flags default OFF so behavior is byte-identical to today and frozen
 * evidence replays unchanged. Read process.env at call time so tests can
 * toggle per-case without module reload.
 */
export function isDurableQueueEnabled(): boolean {
  return process.env.DR_DURABLE_QUEUE === "1";
}

export function isBoundedStateEnabled(): boolean {
  return process.env.DR_BOUNDED_STATE === "1";
}

/**
 * Epic II Milestone 2.6 — learning freeze flag.
 *
 * When DR_FREEZE_LEARNING=1:
 * - learningHandler is skipped every tick (no memory updates)
 * - getActionRanking returns uniform 0.5 scores (no learned bias)
 * - getDeteriorationRate returns null (no learned rate)
 *
 * This enables controlled experiments where agent behavior is
 * deterministic and identical across runs with the same seed.
 */
export function isLearningFrozen(): boolean {
  return process.env.DR_FREEZE_LEARNING === "1";
}
