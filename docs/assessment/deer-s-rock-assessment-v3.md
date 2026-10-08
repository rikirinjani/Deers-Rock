# Deer's Rock Assessment (v3)

## Score: 72/100

## Summary
The project shows strong verification maturity and architectural intent (ADR-020/021/022), with high test coverage and successful TypeScript compilation. However, several core “orchestration/persistence/engine” files appear only partially visible (snippets are truncated), and there are likely correctness risks around event/handler ordering, data integrity boundaries, and clinical-selection tie/consistency semantics.

## Strengths
- **Robust verification pipeline**: `Tests: 381/382 pass` and `TS compile: PASS` indicates strong baseline correctness.
- **Explicit invariant & intervention validation contracts**:
  - `Invariant validation: ADR-020 (5 invariants, env-gated)`
  - `Intervention validation: ADR-022 (6 types, schema-validated)`
- **Deterministic clinical selection design**:
  - `Diagnosis priority: ADR-021 (priority-based selection)` with tie-breaking logic (based on what’s visible in `src/engine/markov.ts`).
- **Performance is broadly acceptable**:
  - `Benchmark: ~33s/100k ticks` (appears workable for simulation throughput).
- **Snapshot/persistence discipline appears present**:
  - `Calibration` and `journal`/timeline machinery suggest replayability and audit trails.

## Issues Found

### Critical (data corruption, crashes, security)
- **Incomplete/truncated code review preventing full correctness guarantees**
  - Multiple files appear cut off mid-function/line (e.g., `src/engine/world.ts`, `src/engine/finance.ts`, `src/engine/ai-coder.ts` as `[SKIP]`, and `src/engine/journal.ts`).
  - This blocks verification of end-to-end invariants like “no double-discharge/double-charge”, terminal event idempotency, and persistence/replay correctness.
- **High-risk orchestration nondeterminism**
  - In “main simulation orchestration” style modules (e.g., `world.ts` importing many handlers), correctness often depends on strict ordering and single-responsibility routing.
  - Without an explicit ordering contract, multiple handlers can react to the same event, causing **state corruption** (e.g., duplicate financial postings, duplicate discharge, missed terminal transitions).
- **Likely runtime state propagation errors in agent progression**
  - In `src/agent/system.ts`, `inShift` is hardcoded `true`, and menstrual/HAID/hamil-related state transitions appear fragile if initial values are out of range—risking propagation of `NaN` / invalid cycles when arithmetic is performed on undefined.
  - Even if not currently failing tests, this is a classic crash/data-integrity risk in simulation loops.

### Warnings (design flaws, missing features)
- **Diagnosis tie-breaker semantics may not match clinical intent**
  - `src/engine/markov.ts`: tie-breaking by `code` lexicographically can change outcomes when priorities match.
  - If tests validate only “some deterministic output” rather than “clinically consistent output,” the model can be deterministically wrong.
- **Schema linkage gaps**
  - `src/patient/schema.ts`: `Encounter.primaryDiagnosis` is a free `string` and may not be enforced to match the selected `Diagnosis.code`.
  - This can violate invariants at runtime unless explicitly checked elsewhere (only “invariant env-gated” was mentioned).
- **Journal/query correctness not fully assessable**
  - `src/engine/journal.ts` snippet is truncated mid-query construction.
  - The journal/persistence layer is a top-tier risk area; any mistake in where-clauses, branch IDs, or purge/export semantics can silently corrupt history.
- **CORS behavior relies on caller discipline**
  - `src/api/rest.ts`: `WeakMap`-based origin echoing means if a response path doesn’t set the map consistently, CORS headers might be missing or inconsistent.
  - Security risk is probably low (it’s permissive by default on the first seen path, but “empty string” disables header), yet it’s operationally fragile.

### Minor (style, docs, optimization)
- **Code presentation constraints**
  - Many modules are only assessable as truncated excerpts; this is a documentation/inspection problem that increases review and debugging time.
- **Potential micro-issues in file initialization**
  - `src/engine/journal.ts`: directory creation logic around `path.dirname(dbPath)` may behave unexpectedly for certain caller inputs (mostly mitigated by calling contract, but worth hardening).

## Top 5 Recommendations
1. **Add/verify a strict event routing + handler ordering contract**
   - Define a single “source of truth” for terminal events (admission/discharge/death) and ensure handlers are either idempotent or gated behind explicit state transitions.
   - Add tests asserting “exactly once” effects per event type (e.g., discharge posts outcome once).
2. **Make persistence/replay correctness testable end-to-end**
   - Add a “record → replay → byte/semantic compare” harness for branches (timeline/journal).
   - Focus on: snapshot cadence, journal export, purge semantics, and deterministic RNG across branches.
3. **Harden agent state transitions against invalid/undefined inputs**
   - In `src/agent/system.ts`, ensure haid/hamil cycle math can’t produce `NaN`.
   - Replace hardcoded `inShift = true` with derived logic or document why it must be constant.
4. **Enforce schema linkage invariants between `Encounter` and selected diagnoses**
   - Add an invariant (non-env-gated if feasible) that `Encounter.primaryDiagnosis` must match the chosen `Diagnosis.code`, or be `"UNKNOWN"` only under empty diagnosis lists.
5. **Revisit diagnosis tie-breaking strategy under ADR-021**
   - Replace lexicographic tie-breaker with a clinically/mathematically meaningful deterministic rule (e.g., stable insertion order, severity score, DRG mapping, or explicit “secondary priority”).
   - Ensure tests validate expected tie behavior, not only determinism.

## Verification Status
- Tests: **381/382 pass**
- TS compile: **PASS**
- Invariant validation: **ADR-020 (5 invariants, env-gated)**
- Intervention validation: **ADR-022 (6 types, schema-validated)**
- Diagnosis priority: **ADR-021 (priority-based selection)**
- Calibration: see **docs/benchmarks/calibration-benchmarks.md**
- Benchmark: **~33s/100k ticks**

## Sections
### src/engine/world.ts
I can’t fully assess this snippet as-is because it’s **truncated** at the end (`impor...`). Still, based on what *is visible*, here’s a review aligned to your requested checks (handler orchestration, state immutability, throughput, snapshot cadence, invariant validation hook) plus likely risks that stem from this “main simulation orchestration” file pattern.

## 1) Handler orchestration (integration correctness)
**Observed:** This file imports a large set of handlers (clock/tick, event queue, ma

### src/engine/markov.ts
Below is an assessment of the **shown** TypeScript section (it appears to be the main “simulation step”/hospital flow module). I’ll focus on the areas you requested: **admission/discharge flow, mortality (deathRoll), morgue handling, rujuk balik (re-admission/return), agent assignment, and ADR-021 primary diagnosis selection**—plus architecture, clinical fidelity, test gaps, and performance.

> **Note:** The snippet you provided is truncated mid–`deceasedIds`. I can only reliably cite and assess

### src/engine/finance.ts
I can’t fully assess this yet because the pasted snippet is **cut off mid-line**:

```ts
return cbgEntry !== unde
```

So I can’t see the rest of the file (claim lifecycle, denial reasons, charge logic, etc.). If you paste the remainder (or the specific sections you want reviewed), I can do a true section-by-section audit with file:line references.

That said, based on what you *did* paste, here’s an initial principal-engineer review focused on **correctness bugs, architecture quality, clinical 

### src/engine/ai-coder.ts
[SKIP] 

### src/engine/discharge-planning.ts
[SKIP] 

### src/engine/journal.ts
Below is a focused principal-engineer review of the **journal/snapshot persistence** code section you cited. I’m treating it as the “persistence spine” for branch isolation, export, purge, and replay correctness.

Because your snippet cuts off mid-function (`journalQuery options ... { ... const where:`), I can’t fully validate query correctness, export/purge, or branch comparison semantics end-to-end—but I can still flag several high-risk issues observable from what’s shown.

---

## 1) Correctn

### src/timeline/engine.ts
Below is a focused review of the provided Timeline Engine module, specifically on **universe/branch lifecycle**, **intervention param validation (ADR-022)**, **outcome comparison**, and **avgLOS computation**. Because only the header/import/type portion is shown, I can assess the code that’s present with high confidence, and I’ll flag lifecycle/outcome/avgLOS items as **Unknown** unless the corresponding implementation is visible.

---

## 1) Universe / Branch lifecycle

### What’s present
- In-

### src/patient/schema.ts
Below is an assessment of the provided TypeScript section (entity/DTO definitions for `Patient` and `Encounter`). Since you asked to “assess each code section,” I’m limited to this excerpt only.

## 1) Correctness bugs

### 1.1 `Encounter.primaryDiagnosis` + `Diagnosis.code` type mismatch risk
- **Where:** `Encounter.primaryDiagnosis?: string;` vs `Diagnosis { code: string; ... }`
- **Risk:** **Minor/Warning**
- **Why:** Both are `string`, so TS compiles, but the *clinical correctness* depends o

### src/agent/system.ts
Below is an assessment of the provided TypeScript section (agent state progression + sick-leave scaffold). Since you only pasted part of `sickLeaveHandler`, I’m grading that portion *as-is* and calling out the likely missing logic.

---

## 1) `agentHandler` (agent shift/health progression)

**File/lines:** (approx. based on the snippet)
- `agentHandler` starts around line **29** (after `initAgentState`).
- Core logic inside the loop is roughly **45–110**.

### A. Correctness bugs / likely logic

### src/api/rest.ts
I can review it, but I need the *rest of the file* (endpoints + auth/CORS + CSV handlers). Right now you’ve only provided the import block plus the first ~120 lines, so I can only assess what’s visible: setup/auth helpers, basic CORS/json behavior, and some utility functions. Below is that limited review.

## 1) `json()` + CORS behavior (file you pasted)
### What I see
```ts
const corsApplied = new WeakMap<http.ServerResponse, string>();

function json(res: http.ServerResponse, data: unknown) {


### ROADMAP.md
I can assess the code sections *only if you provide file paths + line ranges (or the repo/patch).* Right now, your prompt includes only the roadmap text and no cited code. So I can’t truthfully do “file:line” correctness/architecture/clinical/perf reviews.

That said, I *can* do two useful things now:
1) **Flag the most likely risk areas** based on the milestones/ADRs you list (and known failure modes for this kind of platform).
2) **List the exact code sections/tests I would inspect** and what 

### src/engine/invariant-validator.ts
[SKIP] 


Errors: 0, Sections: 12, Files loaded: 9/12