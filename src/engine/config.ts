/**
 * ADR-004 D4 — env-gated rollout flags (research-safe).
 *
 * Both flags default OFF so behavior is byte-identical to today and frozen
 * evidence replays unchanged. Read `process.env` at call time so tests can
 * toggle per-case without module reload.
 */
export function isDurableQueueEnabled(): boolean {
  return process.env.DR_DURABLE_QUEUE === "1";
}

export function isBoundedStateEnabled(): boolean {
  return process.env.DR_BOUNDED_STATE === "1";
}
