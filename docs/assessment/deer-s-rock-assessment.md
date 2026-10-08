# Deer's Rock Assessment

## Score: 58/100

## Summary
Based on the excerpts you provided, the project has solid modular structure (pure functions/types in some places) and strong baseline quality signals (TS compile PASS, 377/378 tests passing, and documented calibration/benchmarking). However, many critical correctness risks can’t be ruled out because the key orchestration/scheduler and journal/reconstruction logic were truncated; the remaining visible code suggests several warning-level issues around determinism, state lifecycle invariants, and data/journal ordering.

## Strengths
- **Type-level clarity in domain model**: `src/patient/schema.ts` defines explicit fields like `morgueId: string | null` which is helpful for preventing “stringly-typed” state and makes invariants easier to enforce.
- **Reasonable purity in selection logic**: `src/engine/markov.ts` → `selectPrimaryDiagnosisCode(patient)` behaves like a deterministic/pure function and safely handles empty/undefined diagnosis lists (per the visible logic).
- **Baseline engineering maturity**: your verification indicates **TS compile: PASS** and **377/378 tests pass**, plus the presence of calibration/bench documentation and a tick benchmark (`~33s/100k ticks`), which is a good sign the system is at least operational and measurable.

## Issues Found

### Critical (data corruption, crashes, security)
- **Unverified orchestration determinism (cannot be confirmed from truncation)**  
  The most important correctness surface—tick loop / handler invocation / `HANDLER_SKIP` logic / state update pattern—was not included (e.g., `src/engine/world.ts` and part of the timeline engine orchestration). Without this, you cannot guarantee:
  - snapshot → journal replay equivalence,
  - consistent “who gets processed when” across ticks,
  - absence of race-like ordering differences (even in single-threaded code, ordering bugs can exist).
  - **Severity rationale:** these are the typical sources of “silent divergence” in simulation engines.

- **Journal reconstruction ordering risk (likely)**  
  In `src/engine/journal.ts`, schema highlights `world_journal` and `world_snapshots` but the excerpts don’t show a definitive ordering key guaranteeing replay semantics (e.g., monotonic insertion id / strict ordering constraints). This can lead to incorrect reconstruction if multiple events share the same tick/timestamp or if queries order unexpectedly.
  - **Severity:** Critical *if* replay assumes deterministic ordering based on tick alone.

### Warnings (design flaws, missing features)
- **Global singleton state risk in timeline branching**  
  In `src/timeline/engine.ts`, module-level maps like `universes`, `branches`, `branchResults` are visible. Unless lifecycle isolation is enforced strictly, this can cause:
  - cross-run contamination,
  - memory growth,
  - nondeterminism under concurrent or repeated usage,
  - brittle test ordering dependencies.
  - **Severity:** Warning (Critical if concurrency/multi-request usage exists).

- **Input validation for RNG draws**  
  In `src/engine/finance.ts`, `rollPayerMix(rng)` appears to assume `rng ∈ [0,1)`. If any RNG source can return values outside that range (or NaN), payer assignment can become systematically wrong.
  - **Severity:** Warning.

- **State invariant enforcement is unclear**
  In `src/patient/schema.ts` (e.g., `morgueId: string | null`), the model suggests the existence of death state, but from the excerpts it’s not clear that invariants are centrally enforced (e.g., deceased implies morgueId non-null; alive implies null).
  - **Severity:** Warning.

### Minor (style, docs, optimization)
- **Documentation/test traceability gaps due to partial code visibility**
  Multiple assessments note truncation mid-function/import. This makes it hard to confidently attribute behavior and increases the chance of missing a subtle edge-case.
  - **Severity:** Minor (process/visibility issue, but it blocks correctness assurance).

## Top 5 Recommendations
1. **Paste/include the full tick orchestration + handler dispatch code (world/timeline).**  
   Specifically: handler invocation order per tick, `HANDLER_SKIP` conditions, and the state update strategy (mutate vs immutable, copy-on-write, etc.). This is required to assess divergence/crash risks accurately.

2. **Make journal replay ordering explicit and test it.**  
   - Ensure `world_journal` has a deterministic ordering key (e.g., autoincrement `id` used in all replay queries).
   - Add an automated test: “simulate N ticks → snapshot+journal → replay → state hash matches”.

3. **Enforce lifecycle invariants with runtime guards + invariants tests.**  
   Examples:
   - If `Patient.isDeceased` (or equivalent death indicator) then `morgueId !== null`.
   - If alive then `morgueId === null`.
   - If discharged, ensure it is not simultaneously “admitted” in the state graph.
   Put these in a single validation function and run it in tests and/or debug builds.

4. **Harden RNG assumptions.**  
   In `rollPayerMix`, clamp/validate `rng`:
   - reject NaN,
   - clamp to `[0, 1-ε)` or normalize with `rng = ((rng % 1) + 1) % 1`.
   Add a unit test that passes out-of-range values.

5. **Eliminate or strictly scope global timeline state.**  
   Convert module-level maps into per-run contexts or ensure `resetTimelineState()` is called in all entrypoints. Add a test that runs two simulations sequentially and asserts no cross-contamination.

## Verification Status
- **Tests:** 377/378 pass  
- **TS compile:** PASS  
- **Calibration:** see `docs/benchmarks/calibration-benchmarks.md`  
- **Benchmark:** ~33s / 100k ticks  

--- 

If you want, paste these missing sections and I’ll produce a truly line-cited severity audit:
- `src/engine/world.ts` (full main loop + `HANDLER_SKIP` + snapshot/journal hooks)
- `src/engine/journal.ts` (complete `journalQuery` + any export/purge/replay code)
- `src/timeline/engine.ts` (entrypoints that create/reset per request/run + replay/branch merge logic)
- the remainder of `src/engine/markov.ts` and `src/engine/finance.ts` beyond the truncated points.

## Sections
### src/engine/world.ts
I can’t actually assess the “code sections” from what you provided because the excerpt ends mid-import (`import { r...`) and I don’t have any of the orchestration logic to review for **correctness bugs, architecture quality, clinical fidelity, test gaps, performance issues**, nor do you provide the **file:line** ranges for the sections you want assessed.

What I *can* do right now:

1) **Flag the likely risk areas** that match your checklist (“HANDLER_SKIP orchestration, state immutability, thro

### src/engine/markov.ts
I can’t reliably do the file:line-by-line review you asked for because you only provided the top portion of **one file** (and it ends mid-comment). I can still assess what’s visible for the **admission/discharge, mortality, morgue handling, rujuk balik, agent assignment, and deceased exclusion**—but for deeper correctness/performance/test-gap review I’d need the rest of this file (and where the death roll / discharge / morgue logic lives).

Below is an assessment of the code section you shared, 

### src/engine/finance.ts
I can only assess what’s actually shown in your snippet. The text cuts off mid-line at:

- `return cbgEntry !== unde`

So I **cannot** verify the rest of the module (claim lifecycle, denial reasons, admin charges, etc.). Below is an assessment of the visible sections only, with the requested dimensions (correctness, architecture, clinical fidelity, test gaps, performance). If you paste the remainder (from the cutoff onward, plus the “Check: INA-CBG tariff lookup, claim lifecycle…” sections), I c

### src/engine/ai-coder.ts
[SKIP] 

### src/engine/discharge-planning.ts
[SKIP] 

### src/engine/journal.ts
## Scope note
You only provided a *partial* file (the `journalQuery` function is truncated mid–`where:`). I’ll still review what’s visible, and I’ll flag any correctness/architecture/perf/test gaps that are likely in the missing portion based on common failure modes (snapshot I/O, branch isolation, export/purge). If you paste the rest of the module, I can give precise line-level findings for export/purge as well.

---

## 1) Journal init / schema

### Code references
- `initJournal(...)` (top-le

### src/timeline/engine.ts
I can assess this section’s *logic and likely failure modes*, but I can’t reliably do true “file:line” citation because you only provided a snippet without line numbers. If you paste the file with line numbers (or tell me the exact path + line ranges), I’ll re-grade with precise citations.

That said, below is a section-by-section review of the code you shared.

---

## 1) Counterfactual branching design + in-memory stores (correctness & architecture)

### Findings
- **Global singleton state (`u

### src/patient/schema.ts
Below is an assessment **of the code section you provided** (a TS domain model / types file). Because it’s only type definitions, I’m focusing on **correctness/type safety risks**, **clinical fidelity of the documented rules**, **test gaps implied by the model**, and **performance impacts (mostly none here)**.

> **Cited file/line references:** I can’t provide exact *file:line* numbers because the snippet doesn’t include them. If you paste the file header or line numbers (or the file path), I’ll

### src/agent/system.ts
Below is an assessment of the shown TypeScript section (agent state + sick leave handler). I’m judging against the requirements you gave: correctness bugs, architecture quality, clinical fidelity, test gaps, and performance. **Line references** are approximate because you provided the snippet without stable line numbers; I’ll cite by **function/block** so you can map quickly.

---

## 1) `initAgentState()` / data shape

**Location:** `initAgentState(): AgentState` block

- **Correctness bugs:** 

### src/api/rest.ts
Below is an assessment of the code section you provided (imports + CORS/json helper + credential checking + small utility + start of query-param helpers). I’m focusing on the specific “Check: endpoint coverage, auth polyfill ORDER (KEY before polyfill!), CSV exports, error handling” item plus the broader concerns you listed: correctness, architecture, clinical fidelity, test gaps, performance.

> **Note:** I can’t cite file:line ranges precisely because you didn’t include line numbers. I’ll refe

### ROADMAP.md
I can do the assessment, but I **can’t** yet meet your request as stated because you haven’t provided the actual code sections/files (only the roadmap summary + a request to “Cite file:line references”). Without repository contents (or at least the relevant file excerpts with line numbers), I can’t truthfully:

- identify correctness bugs,
- judge architecture quality with evidence,
- evaluate clinical fidelity with implementation-level detail,
- find performance issues with measured hotspots,
-


Errors: 0, Sections: 11, Files loaded: 9/11