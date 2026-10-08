# Deer's Rock Assessment (v3)

## Score: **62/100**

## Summary
Overall the project shows strong engineering maturity: you have explicit ADRs for invariants/interventions and a large test suite with TypeScript compilation passing. However, the visible snippets and file boundaries suggest several *high-risk areas* around orchestration correctness (skip/handler ordering), SQL query construction, and determinism/semantics mismatches (priority vs insertion order; RNG contracts; payer assignment fallbacks).

## Strengths
- **Strong verification discipline**: *Tests:* **381/382 pass**, **TS compile: PASS**.
- **Architecture governance via ADRs**: explicit validation hooks:
  - **ADR-020** invariant validation (**5 invariants**, env-gated)
  - **ADR-022** intervention validation (**6 types**, schema-validated)
  - **ADR-021** diagnosis priority selection (priority-based selection)
- **Separation of concerns** implied by module structure (`engine/*`, `timeline/*`, `journal/*`, `api/*`), including domain typing (`patient/schema.ts`).
- **Calibration & performance tracking exist**: calibration benchmarks referenced in `docs/benchmarks/calibration-benchmarks.md`, and **~33s/100k ticks** indicates you measure runtime.

## Issues Found

### Critical (data corruption, crashes, security)
- **Potential SQL injection / invalid SQL construction** in `src/engine/journal.ts`  
  *Why critical:* if query filters are constructed via string interpolation anywhere in `journalQuery`, this can lead to data corruption or security issues.  
  *Evidence:* `journalQuery(...)` begins with `const where:` in the snippet, but the remainder was truncated—this is exactly the area that commonly becomes string-concatenated SQL.

- **Transaction / statement execution correctness risk** in `src/engine/journal.ts`  
  *Why critical:* if transaction helpers don’t consistently bind to the same connection/statement lifecycle, you can get partial writes, locked DB states, or silent corruption.  
  *Evidence:* snippet shows `journalBeginTransaction()` / `journalComm...` but is truncated before full correctness can be verified.

### Warnings (design flaws, missing features)
- **Handler orchestration + `HANDLER_SKIP` causality risk** (likely centralized in `src/engine/world.ts`)  
  *Why warning:* skipping handlers can break causality assumptions (e.g., diagnosis → coding → billing), and invariants/financial logic may assume handler execution order.  
  *Evidence:* review notes orchestration is likely centralized; file snippet ends mid-import so line-level citations can’t be completed.

- **Determinism/semantics mismatch in diagnosis selection (`selectPrimaryDiagnosisCode`)** in `src/engine/markov.ts`  
  *Why warning:* comment mentions “insertion order,” but implementation sorts by priority and tie-breaks by code lexical order. This changes semantics and can subtly bias results.

- **RNG contract ambiguity** in `src/engine/finance.ts`  
  *Why warning:* payer-mix rolling logic typically assumes `rng ∈ [0,1)`. If upstream ever provides `1` or NaN/∞, results can be skewed or fall through.

- **Clinical/financial simplification risk** in `assignPayer` when RNG draw is absent  
  *Why warning:* returning a fixed payer (e.g., `"BPJS Kesehatan"`) may be correct for one scenario but dangerous if callers expect true stochastic payer assignment.

### Minor (style, docs, optimization)
- **Truncated-module visibility** across several files (import blocks / mid-function cutoffs) reduces auditability.  
  *Why minor:* this is a documentation/process issue—static review can’t confirm critical control flow without full code context.
- **Schema validation coverage may be incomplete** in intervention validation (e.g., arrays validated only by `Array.isArray`, not per-element constraints).  
  *Evidence:* from the excerpt: `supply_injection.validators.drugs: (v) => Array.isArray(v)`.

## Top 5 Recommendations

1. **Harden `journalQuery` SQL construction with parameter binding**
   - Ensure all dynamic filters are applied using prepared statements (`?` placeholders) with bound parameters.
   - Add a regression test that attempts to pass quote-breaking / SQL-like strings in filter options and verifies query correctness + no exceptions.

2. **Add end-to-end journaling integrity tests under transaction failure modes**
   - Simulate crashes mid-transaction; verify atomicity (either fully committed or rolled back).
   - Validate DB invariants after rollback and after multiple concurrent transactions (if applicable).

3. **Resolve the diagnosis-selection semantics mismatch (ADR-021)**
   - Decide the correct tie-break behavior:
     - If the rule truly is “active diagnoses by insertion order,” tie-break should use original index (not code).
     - If the rule is “priority then deterministic tie-break,” update ADR/comments to match code.
   - Add a test with two active diagnoses sharing the same priority but different codes to lock behavior.

4. **Enforce RNG input contracts at module boundaries**
   - In `finance.ts` (and any other RNG consumers), clamp or validate RNG draws.
   - Add unit tests for edge values: `-0.1`, `0`, `0.999999`, `1`, `NaN`, `Infinity`.

5. **Introduce explicit orchestration order tests for `HANDLER_SKIP`**
   - Create a scenario test that asserts state transitions (before/after) when skipping each handler class.
   - Add invariants that fail fast when required upstream fields (diagnosis coding, billing inputs, totals) are missing due to skip logic.

## Verification Status
- **Tests:** **381/382 pass**
- **TS compile:** **PASS**
- **Invariant validation:** **ADR-020** (**5 invariants**, **env-gated**)
- **Intervention validation:** **ADR-022** (**6 types**, **schema-validated**)
- **Diagnosis priority:** **ADR-021** (**priority-based selection**)
- **Calibration:** see `docs/benchmarks/calibration-benchmarks.md`
- **Benchmark:** **~33s / 100k ticks**

## Sections
### src/engine/world.ts
I can’t assess concrete correctness/performance from the snippet you provided because it ends mid-import (`impor...`). I *can* still flag likely issues and architectural risks based on what’s visible—especially around orchestration, immutability, snapshot cadence, and the invariant-validation hook. Below is an assessment of the **visible section** (imports/bootstrapping wiring) and the **specific concerns you asked to check**.

> **Note:** For file:line citations, I need the rest of the file (an

### src/engine/markov.ts
Below is an assessment of the provided code section (only the portion you pasted). Where I can’t see the referenced logic in other files, I flag likely gaps and what to verify.

---

## 1) `selectPrimaryDiagnosisCode` (Priority-based diagnosis selection, ADR-021)

### What it does
- If `patient` is `undefined` → returns `"UNKNOWN"`.
- Filters `patient.diagnoses` to `active === true`.
- If no active diagnoses → falls back to `patient.diagnoses[0]` (or `"UNKNOWN"`).
- If there are active diagnoses

### src/engine/finance.ts
Below is an assessment of the provided TypeScript section (payer assignment / private tier selection / SEP generation / CBG coding validation). Because only a partial file is shown (it cuts off mid-line), I’ll focus on what’s visible and explicitly flag “cannot verify” where the missing portions likely contain the biggest risks (claim lifecycle + denial reasons + JR cap + admin charges).

---

## 1) `PAYER_MIX` + `rollPayerMix` + `assignPayer`

### Correctness bugs
- **Possible float/loop bounda

### src/engine/ai-coder.ts
[SKIP] 

### src/engine/discharge-planning.ts
[SKIP] 

### src/engine/journal.ts
I reviewed the provided journal/snapshot module code (SQLite-backed). Below are the main risks I see for correctness, architecture, clinical fidelity (indirect), test gaps, and performance.

> **Note:** The snippet ends partway through `journalQuery` (`const where:` ...). Some issues may be in the remaining code, but I can only cite what’s visible.

---

## 1) Correctness bugs / Data integrity risks

### 1.1 SQL injection / invalid SQL construction (likely)
**Severity: Critical** (if implemented

### src/timeline/engine.ts
Below is an assessment of the **timeline engine / counterfactual branching** code excerpt you provided, focusing on:

- **Correctness bugs**
- **Architecture quality**
- **Clinical fidelity**
- **Test gaps**
- **Performance issues**

I only see a **partial file** (types + intervention validation + in-memory maps). Lifecycle/outcome logic/avgLOS computation is not shown, so I’m marking the missing areas as likely risk areas rather than asserting concrete bugs.

---

## 1) Intervention param valid

### src/patient/schema.ts
Below is a targeted review of the code you provided (the file is an excerpt defining **Patient/Encounter domain types**). I’m focusing on **correctness bugs**, **architecture quality**, **clinical fidelity**, **test gaps**, and **performance issues** that could be inferred from these type definitions—then I’ll rate severity.

Because this is mainly type/interface code, the “correctness bugs” are mostly about **type-level mismatches, missing invariants, and ambiguity that can cause runtime logic 

### src/agent/system.ts
Below is a principal-engineer review of the code section you provided (agent state + sick-leave handler stub). I’ll focus on **correctness bugs**, **architecture quality**, **clinical fidelity**, **test gaps**, and **performance**. Where the exact file/line isn’t available from your snippet, I’ll reference the **approximate line region by function** (you can map these to exact file lines easily).

---

## 1) `agentHandler(...)` (agent fatigue/health/shift update)

### A) Correctness bugs
**Sever

### src/api/rest.ts
I can’t yet assess correctness/architecture/clinical fidelity/perf end-to-end from what you pasted—this looks like the *top-of-file* of the REST server entrypoint, and the actual route handlers (where most bugs live) aren’t included. However, based on the visible code, here are the key issues and what to verify next, with severity ratings.

## 1) CORS handling via `WeakMap` is fragile (potential incorrect headers)
**Where:** `corsApplied` + `json()` around `corsApplied.has(res)`  
**Risk:** **Wa

### ROADMAP.md
I can’t reliably “assess each code section” without the repository tree and concrete file:line mappings from the TypeScript sources. What I *can* do now is (1) audit the roadmap claims for internal consistency, (2) point out the highest-probability failure modes based on the features you listed, and (3) give you a targeted checklist of what to inspect and where; once you provide the file/paths (or paste the relevant sections), I’ll convert this into a true code-review with file:line citations an

### src/engine/invariant-validator.ts
[SKIP] 


Errors: 0, Sections: 12, Files loaded: 9/12