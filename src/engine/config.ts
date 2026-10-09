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

/** ADR-020: Enable runtime invariant validation (every 100 ticks) */
export function isInvariantValidationEnabled(): boolean {
  // Production mode: force invariants ON regardless of env var
  if (process.env.NODE_ENV === "production") return true;
  return process.env.DR_VALIDATE_INVARIANTS === "1";
}

/** ADR-025: Check if we should fail-fast on invariant violations (prod/default) */
export function isInvariantFailFast(): boolean {
  // Always fail-fast in production; opt-out only with explicit flag
  if (process.env.NODE_ENV === "production") return true;
  return process.env.DR_INVARIANT_FAIL_FAST !== "0";
}

/** Log an invariant violation audit event */
export function logInvariantViolation(violation: { invariant: string; entity: string; detail: string; tick?: number }): void {
  const msg = `[INVARIANT VIOLATION] tick=${violation.tick ?? "?"} inv=${violation.invariant} entity=${violation.entity}: ${violation.detail}`;
  if (isInvariantFailFast()) {
    console.error(msg);
    throw new Error(msg);
  }
  console.warn(msg);
}
