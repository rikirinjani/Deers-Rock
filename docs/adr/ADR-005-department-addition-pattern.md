# ADR-005: Department Addition Pattern

**Status:** Accepted
**Date:** 2026-10-07
**Origin:** Coordinator OC — codify the repeated department-onboarding pattern (dialysis, radiotherapy, blood bank, microbiology, pathology, CSSD, biomedical engineering precedents)
**Scope:** New clinical departments added under `src/engine/` (e.g., hematology, oncology). Documentation of an existing pattern, not a new mechanism.

---

## Context

Deers-Rock has onboarded clinical departments in an ad-hoc but converging way. Dialysis (`src/engine/dialysis.ts`), radiotherapy, blood bank, microbiology, pathology, CSSD, and biomedical engineering each arrived as a module with state types, a tick handler, and a registration in the `world.ts` handler chain — but the pattern was never written down. Each new department (hematology and oncology are next on the roadmap) re-derives the steps from source archaeology, and reviewers re-litigate the same questions: where does domain data live, how is state attached, how does the handler join the pipeline.

The engine's architecture (ADR-001 handler pipeline, ADR-004 bounded state) already constrains the answer. This ADR records it so future additions are mechanical.

## Decision

New clinical departments follow a **5-file pattern**:

1. **`src/engine/{dept}.ts` — handler + state types.** The module defines its state interface (e.g., `DialysisState`), an `init{Dept}State()` constructor, and the tick handler. State is attached to `HospitalState` under a `_`-prefixed namespace (e.g., `state._dialysis`) and **must be serializable** — plain maps/arrays/scalars that survive the snapshot serialize/deserialize pair in `journal.ts` (ADR-004 D3 completeness audit applies to every new `_` field).
2. **`src/engine/{dept}-knowledge.ts` — domain rules/data.** Static clinical knowledge (protocol tables, price constants, diagnosis mappings) lives in a separate `{dept}-knowledge.ts` file, following the `clinical-knowledge.ts` / `nursing-knowledge.ts` / `pharmacy-knowledge.ts` precedent. Knowledge files contain no rng and no state mutation — they are data the handler consults.
3. **`src/engine/{dept}-handler.ts` — tick handler, when extracted.** The handler may be inline in `{dept}.ts` (dialysis precedent) or extracted to a dedicated `{dept}-handler.ts` when the module grows. Either way the handler **must be pure**: it receives `(state, clock, queue)` and returns a new state object (`Object.assign({}, state, { _{dept}: newState })`) — never mutates the input state (Constitution Article IV; ADR-001).
4. **`tests/{dept}.test.ts` — behavior tests.** At minimum: state round-trip through snapshot serialize/deserialize, handler purity (input state unchanged), and the department's core clinical behavior.
5. **Update `src/engine/world.ts` `HANDLER_SKIP`.** Register the handler in the `HANDLER_SKIP: [HandlerFn, number][]` array as a `[handler, n]` tuple, where `n` is the run-every-N-ticks cadence (`buildHandlers()` wraps `n > 1` in `everyN()`). Choose the cadence from the operation's real-world frequency (lab = 1, radiology = 2, dialysis = 5). Position in the array must respect ADR-001 dependency rules: clinical departments after `aiDoctorHandler` (which generates their orders), before billing/cleanup.

## Consequences

- **Positive:** Adding a department is a checklist, not a design exercise. Review of a new department reduces to checking the five items.
- **Positive:** Serializable state + pure handlers keep snapshots, determinism, and the ADR-004 bounded-state guarantees intact by construction.
- **Negative:** Every department addition touches `world.ts` (the `HANDLER_SKIP` chain) — a shared-file merge point. This is accepted: the centralized chain is what makes tick order deterministic and documented (ADR-001).
- **Negative:** The knowledge-file split means domain data lives away from its consumer; discoverability depends on naming convention (`{dept}-knowledge.ts`).
- **Neutral:** Departments needing scheduled follow-ups (e.g., oncology treatment cycles) use the `EventQueue` rather than their own timers, per the ADR-004 D1 durable-queue design.

## Related

- ADR-001 — Handler pipeline architecture (ordering, dependency rules, `HANDLER_SKIP` chain)
- ADR-004 — Bounded state and durable scheduling (serializable `_`-state, snapshot round-trip, pruning)
- `docs/MODULE-CONTRACTS.md` — per-module contract documentation
