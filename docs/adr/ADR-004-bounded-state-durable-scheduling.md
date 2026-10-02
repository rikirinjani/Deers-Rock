# ADR-004: Bounded state and durable scheduling

- **Status:** APPROVED by owner 2026-10-02 (Oracle review lane down with context-overflow; grounded self-review with adversarial pass substituted and documented in-session)
- **Date:** 2026-10-02
- **Scope:** Deers-Rock engine only (`src/engine/*`). No public API changes. No tariff/clinical-semantics changes.
- **Supersedes/closes:** issue #2 items P1-8 (pruning) and ADR-003 (agent/referral persistence, whose premise is stale — see F4); answers GH issue #3 (EventQueue durability).
- **Prior constraint honored:** world-semantics changes go through the review cycle — this ADR *is* the review input, not the implementation.

## 1. Context

The Tencent co-host deployment (512 MB cap) crash-looped: `world-journal.db` grew 3 MB → 980 MB in ~8 h (tick ~12k), and boot-time snapshot `JSON.parse` exceeds the cap (V8 OOM in `JsonParser`, 17 restarts). The service is stopped by owner decision; the RAG co-tenant was unaffected (the cap contained every spike).

Incident triage surfaced a second, deeper defect: **scheduled future events do not survive restarts**. Post-restart, the live world showed 3422/3422 encounters `active`, zero discharged — a restarted sim never discharges anyone and never completes lab/radiology/surgery orders.

## 2. Ground findings (all code-referenced; no speculation)

- **F1 — Snapshots dominate the journal, not rows.** Snapshots fire every 100 ticks (`world.ts:328`) as full-state JSON; 5 are retained (`SNAPSHOT_RETENTION_COUNT = 5`, `journal.ts`). At tick ~12k the state is ~150–190 MB (265k charges plus notes/claims/orders), so 5 retained snapshots ≈ the observed 980 MB. Per-tick journal rows are already bounded (100-tick retention). **Conclusion: the design must bound STATE, not retention plumbing.**
- **F2 — Retention plumbing already works.** `journalPurge` runs every 50 ticks, deletes rows older than 100 ticks, trims snapshots to 5, and `incremental_vacuum` is effective (`auto_vacuum = INCREMENTAL` is set at DB creation, `journal.ts:41`). No changes needed here.
- **F3 — The queue gap is total.** `resumeWorld` returns `queue: new EventQueue()` (`world.ts`); the queue appears nowhere in `state-store.ts` and nowhere in `saveSnapshot`. Every `schedule()` call site (markov discharge, lab/rad/surgery/ed results) produces in-memory-only future events. Any restart — crash, deploy, `systemctl restart` — silently drops all of them.
- **F4 — The ADR-003 premise is stale.** Agent and referral state ARE serialized in snapshots (`journal.ts:290-299` serialize `agentState`/`referralState`; `:340-349` deserialize), as are `rngSeed`, outpatient visits, and case memories. What is needed is a **completeness audit** of remaining `_`-prefixed fields, not a new persistence subsystem.
- **F5 — Discharge/LOS is correct; investigated and cleared.** Discharge delay is 4320–10080 ticks (3–7 sim-days, `markov.ts`). A controlled 3000-tick run showing zero discharged is EXPECTED (earliest discharge lands at tick ≥ 4320). This rules out a units bug and isolates the durability gap.
- **F6 — Pruning enabler, verified.** Claims carry no charge-ID references (`finance.ts` aggregates by `encounterId`; amounts only). Charges are therefore prunable without breaking claim linkage — subject to a full reference audit in implementation (no other readers may assume charge immortality).
- **F7 — Interacting system.** `EXPORT_INTERVAL = 500` (`journal.ts:137`): the full-state export (Option D's ~0.6–0.9 s spike) shares the same serialization-cost class as snapshots. Coordinate with it; do not build a second serializer.
- **F8 — Precedent.** The morgue is already bounded by design (`morgueCapacity: 10`, `state-store.ts`).
- **F9 — Resume semantics are snapshot-only (pre-existing, constrains D1's claims).** Boot (`cli/index.ts:37-52`) loads the nearest snapshot and steps forward; `journalReplay` has **zero callers** in `src/` (dead in production), so rows newer than the snapshot are audit/export only, never replayed into state. Worse, resume **reseeds the RNG from the original seed** (`world.ts:93` stores the creation seed; `:380` rebuilds the RNG from it) — post-restart rolls repeat the early-run sequence. So trajectory-identity across restarts was never a property of this system, with or without the queue fix. D1 therefore restores *structural* fidelity (pending events exist and fire) without claiming trajectory identity; full continuity would additionally require persisting RNG draw-position — noted as a later option, explicitly out of this ADR.

## 3. Goals / non-goals

**Goals:** (a) bounded disk and RAM for indefinite runs under a 512 MB cap; (b) restart-safe scheduling — resume preserves pending events; (c) determinism preserved; (d) frozen research evidence remains reproducible byte-identically.
**Non-goals:** tariff/clinical semantics; Option D async export (separate track); public API changes; the adapter repos.

## 4. Design

### D1 — Queue durability. RECOMMENDED: A1 persist pending events in snapshots.
- Extend the snapshot payload with `queue: [...]` — the ordered pending-event list `{type, scheduledTick, data}` — and rebuild the `EventQueue` (re-enqueue in stored order) on the resume path.
- Add a snapshot format version field (`v: 1` → `v: 2`). Snapshots without `v`/`queue` resume with an empty queue plus one warning line — i.e., today's behavior, made explicit rather than silent.
- REJECTED A2 (rebuild queue by replaying journal rows): correctness would depend on every schedule site journaling its intent — audit-heavy with double-scheduling risk — for no benefit over A1.
- Determinism (scoped honestly per F9): queue order is insertion order, itself a deterministic function of history, so a resumed world deterministically contains the same pending events in the same order. It does **not** make post-restart trajectories identical to uninterrupted runs — RNG reseeds from the original seed and post-snapshot rows are not replayed (both pre-existing). What D1 guarantees: resume is *no worse than today* and structurally faithful (events due will fire); what it does not promise: trajectory identity (never a property; would need RNG draw-position persistence, out of scope).

### D2 — Bounded growth (state pruning).
- Snapshots: keep count at 5 (no change). Optional later: payload slimming for derivable caches — measure first, not assumed.
- Pruning rules, all **tick-threshold based, executed in-handler during `step()`** — never wall-clock, never a side process, seeded-neutral (no RNG consumed, none reordered):
  - **Charges:** prune only when the encounter is discharged AND all linked claims are terminal AND age exceeds N ticks. GATE: full reference audit first (F6 is necessary, not sufficient).
  - **Notes/orders** (nurse, physician, social, respiratory, diet, specialty): tick-TTL. Note the interaction: journal rows already preserve history as diffs, and row retention (100 ticks) is independent of state TTL — set TTLs above replay needs.
  - **Claims/payments:** terminal status plus age threshold; journaled summaries retained.
  - **Journal rows / snapshots:** unchanged (F2 — working).
- TTL magnitudes are NOT set here (open question OQ1): they come from pilot growth-rate measurements, not guesses.

### D3 — ADR-003 closure.
- Completeness audit of every `_`-prefixed state field against the save/deserialize pair; add what's missing (queue per D1; round-trip test for learning/case memories).
- No new persistence subsystem.

### D4 — Determinism and rollout (env-gated, research-safe).
- Flags `DR_BOUNDED_STATE=1` (pruning) and `DR_DURABLE_QUEUE=1` (queue persist/restore), following the established `DR_API_KEY` env-gated pattern. **Both default OFF** → behavior is byte-identical to today, so frozen evidence replays unchanged.
- Old-DB compat: snapshots without the new fields resume under today's semantics with a warning. No migration.
- Pruning ON changes trajectories BY DESIGN: verification compares against documented aggregate invariants and ceilings — never against frozen evidence.

### D5 — Verification plan.
- Unit/integration: resume-preserves-queue (schedule → snapshot → resume → pending events fire, exactly once, in order); per-collection pruning tests (terminal+aged pruned, live retained); snapshot round-trip incl. new fields.
- Determinism gates: OFF-mode replays frozen evidence byte-identically (existing suites + the P1-6 journal-diff protocol).
- Restart-kill test: `kill -9` mid-run → resume → assert discharges resume within one LOS window and no event fires twice.
- Long-run on Kaggle CPU (owner-authorized, no quota concern): 100k-tick bounded-growth validation — `scripts/kaggle-longrun/validate-bounded.mjs` asserts RSS ceiling, journal-size ceiling, discharge continuity, and charges-size ceiling, emitting a JSON report. Kernel template included; push on owner go.
- Live staging: redeploy with flags ON after gates pass; watch one full growth cycle against the ceilings.

## 5. Risks and open questions

- **R1:** pruning subtly shifts finance aggregates (e.g., paid-charge removal vs reporting). Mitigated by terminal+aged rule, reference audit, and aggregate-invariant tests — but the invariants must be written before the pruning, not after.
- **R2:** queue payload bloats snapshots. Non-issue by measurement: hundreds of pending events vs 265k charges.
- **R3:** old-snapshot resume semantics change. Mitigated: warning path, documented, no silent change.
- **OQ1:** TTL values — from pilot measurements (Kaggle long-run doubles as the measurement vehicle).
- **OQ2:** whether 100-tick row retention suffices for any future journal-rebuild fallback — moot under A1; kept as documented fallback only.
- **OQ3:** export cost with pruned state — re-measure; Option D may shrink to unnecessary.

## 6. Decision requested

Approve D1(A1) + D2–D4 as specified, with TTL values set from pilot measurements (OQ1). Implementation then proceeds under the world-semantics review cycle (implementer + independent verifier + determinism evidence, per standing rules).
