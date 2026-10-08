# Deer's Rock Assessment (v3)

## Score: 68/100

## Summary
The reported implementation has a solid testing and TypeScript baseline, but significant concerns remain around staffing realism, diagnosis consistency, financial eligibility, and intervention validation. Persistence isolation and orchestration correctness remain unverified because the supplied material consists of truncated assessments rather than complete source code. This score is provisional and reflects both reported defects and verification gaps.

## Strengths
- **Strong baseline verification:** Reported results of 381/382 passing tests and a clean TypeScript compilation suggest broad implementation consistency, although the remaining failure needs investigation.
- **Explicit correctness contracts:** ADR-020, ADR-021, and ADR-022 establish identifiable contracts for invariants, diagnosis selection, and interventions.
- **Centralized intervention validation:** `src/timeline/engine.ts` provides a validation boundary for intervention inputs. The supplied assessment specifically reports that `staff_reduction` bounds reject non-finite and out-of-range values.
- **Persistence foundation:** `src/engine/journal.ts` provides SQLite-backed journal and snapshot storage—a useful basis for replay and recovery, subject to isolation and restoration verification.
- **Deployment-aware asset resolution:** `src/api/rest.ts` resolves `publicDir` relative to the module rather than the working directory, reducing dependence on launch location.

## Issues Found

### Critical (data corruption, crashes, security)
**No unconditional Critical defect is established by the supplied evidence.** Two risks warrant urgent verification:

- **Potential cross-branch snapshot overwrite:** The reported journal schema lacks run/branch identifiers and keys snapshots solely by tick. If branches share a database without external isolation, one branch can replace another branch’s snapshot or restore the wrong state.  
  **Reference:** `src/engine/journal.ts`, reported excerpt lines 47–65, 75–76.
- **Potential numerical state corruption:** Intervention validation reportedly accepts values such as `Infinity` for bed increases and `NaN` for policy overrides. Whether these reach mutable simulation state is not shown.  
  **Reference:** `src/timeline/engine.ts`, reported excerpt lines 35–39.

### Warnings (design flaws, missing features)
- **Staffing availability is unrealistic:** Reported use of `inShift = true` and replacement of individual shifts with the current global shift makes non-severely-ill staff continuously available. This is a high-impact simulation-validity defect, rather than demonstrated crash or security behavior.  
  **Reference:** `src/agent/system.ts`, reported excerpt lines 23–24, 53–57, 77.
- **Diagnosis-selection contracts conflict:** Documentation, ADR commentary, and implementation reportedly disagree on active status, priority, and tie-breaking. Finance independently uses the first active diagnosis, creating additional inconsistency.  
  **References:** `src/engine/markov.ts`, diagnosis-selection logic; `src/engine/finance.ts`, `assignPayer()`.
- **Payer eligibility is oversimplified:** `assignPayer()` reportedly ignores later diagnoses, misses injury subcodes, and treats injury codes as proxies for Jasa Raharja eligibility without establishing accident circumstances.  
  **Reference:** `src/engine/finance.ts`, reported excerpt lines 55–69.
- **Lifecycle semantics are ambiguous:** The `morgueId` comment conflates death with morgue placement; downstream misuse could misclassify deceased patients awaiting assignment. Such misuse is not demonstrated.  
  **Reference:** `src/patient/schema.ts`, `Patient.morgueId`.
- **Important execution paths remain unverified:** `HANDLER_SKIP`, due-event handling, snapshot restoration, branch execution, API authentication, and sick-leave recovery are absent from the reviewed portions.

### Minor (style, docs, optimization)
- **Fatigue update may lag one tick:** Fatigue reportedly uses the previous consecutive-work count; confirm the intended timing.  
  **Reference:** `src/agent/system.ts`, fatigue update.
- **Broad transport-layer coupling:** Numerous domain imports in `src/api/rest.ts` suggest a maintainability concern, not a proven runtime defect.
- **Assessment traceability is weak:** Truncated sections and snippet-relative references hinder reproduction; complete source references are needed.

## Top 5 Recommendations
1. **Harden intervention validation:** Require finite numbers, positive safe-integer bed counts, supported policies, and policy-specific bounds; test rejection before state mutation.
2. **Prove branch isolation:** Enforce separate databases or branch-scoped keys and queries; test same-tick snapshots across branches and restoration.
3. **Implement individual staff rosters:** Separate assigned shifts from global time and verify availability, rest, fatigue, and sick-leave recovery.
4. **Unify diagnosis and payer rules:** Establish one ADR-021 selection contract; evaluate payer eligibility separately using appropriate accident information.
5. **Close verification gaps:** Investigate the failing test, run invariants in CI, and review complete orchestration, recovery, and API security paths.

## Verification Status
*Reported status only; no tests, compilation, or benchmarks were independently executed for this assessment.*

- Tests: 381/382 pass — remaining failure unspecified.
- TS compile: PASS
- Invariant validation: ADR-020 (5 invariants, env-gated)
- Intervention validation: ADR-022 (6 types, schema-validated) — reported numeric-validation gaps remain.
- Diagnosis priority: ADR-021 (priority-based selection) — contract inconsistencies reported.
- Calibration: see `docs/benchmarks/calibration-benchmarks.md` — contents not supplied.
- Benchmark: ~33s/100k ticks — hardware and workload details not supplied.

## Sections
### src/engine/world.ts
## Assessment

**The supplied excerpt contains only imports and ends mid-token (`impor`).** It does not include the orchestration loop, `HANDLER_SKIP`, snapshot scheduling, or invariant hook. Consequently, **no runtime correctness bug can be confirmed from this excerpt**.

The passing tests and clean compilation are positive signals, but do not establish orchestration correctness, clinical fidelity, or branching isolation. References below use excerpt line numbers; the source filename was not su

### src/engine/markov.ts
## Assessment scope

The supplied code ends midway through `admissionHandler`, at construction of `deceasedIds`. **Discharge, `deathRoll`, morgue registration, rujuk balik, and agent assignment are not visible**, so their correctness cannot be established from this excerpt or from the passing-test count.

References below use `snippet:<line>` because no filename was supplied.

**Overall:** Two substantial concerns are visible: inconsistent primary-diagnosis selection semantics and a surge gate t

### src/engine/finance.ts
## Scope and overall assessment

**The visible code is readable and mostly deterministic, but payer eligibility and diagnosis selection need attention before the financial outputs can be trusted clinically.** No Critical defect is established from this excerpt.

References below use **snippet-relative line numbers** because no filename was supplied. The excerpt ends mid-expression at `return cbgEntry !== unde`; I treat that as truncation, not a compilation defect.

The 381 passing tests and clea

### src/engine/ai-coder.ts
[SKIP] 

### src/engine/discharge-planning.ts
[SKIP] 

### src/engine/journal.ts
## Assessment scope

The excerpt ends at `journalQuery`’s incomplete `const where:` declaration. Snapshot serialization/restoration, export, purge, and `closeJournal()` are not shown. They cannot be assessed as implemented.

References below use **`journal.ts` as an assumed filename**, with lines counted from the supplied excerpt. The passing tests and clean compilation are useful baseline evidence, but do not establish crash recovery or branch isolation.

**Verdict:** A straightforward SQLite p

### src/timeline/engine.ts
## Assessment

**No confirmed Critical issues in the supplied excerpt.** The main confirmed problems are incomplete intervention validation. Lifecycle integrity and outcome correctness remain **unverified**: the excerpt declares their types and stores, but does not include branch creation/execution, comparison, or LOS calculation.

References below use **`<timeline-excerpt>:line`**, counting the opening comment as line 1.

### 1. Intervention validation — ADR-022

**Warning — Non-finite and frac

### src/patient/schema.ts
## Assessment

**No Critical defect is demonstrated by this excerpt.** The main concerns are ambiguous lifecycle state, diagnosis-selection contract drift, and invariants that TypeScript does not enforce.

The passing tests and clean compilation are positive signals, but they do not establish clinical correctness or runtime data validity. This excerpt contains declarations, not implementations, so several findings require verification against handlers and ADR-020 validation.

**References below 

### src/agent/system.ts
## Overall assessment

**The visible agent model has a critical staffing-model defect and several significant health-state issues.** Passing tests and clean compilation establish implementation consistency, but not clinical correctness.

Most importantly, **`sickLeaveHandler` is truncated before its recovery and replacement logic**. The requested **48-/120-tick recovery behavior cannot be verified** from this excerpt.

References below use `snippet:Lx` because no filename was supplied; line 1 is

### src/api/rest.ts
## Assessment scope

The excerpt contains imports and utility functions—not the server callback, route handlers, authentication initialization, polyfills, or CSV exporters. Consequently, **endpoint coverage and KEY-before-polyfill ordering cannot be verified**.

References below use `snippet:<line>` because no filename was supplied. The 381 passing tests and clean compilation are positive signals, but do not establish HTTP security, export correctness, or clinical fidelity.

**No confirmed Criti

### ROADMAP.md
## Assessment summary

**The roadmap supports a claim of substantial implementation progress, but not verified reliability or clinical validation.** Its strongest visible issues are inconsistent calibration claims, ambiguous LOS/tick semantics, and completion markers that conflate implementation with validation.

Only a **truncated roadmap** was supplied—not TypeScript source, test output, or benchmark artifacts. Consequently:

- **381 passing tests and clean TypeScript compilation:** supplied f

### src/engine/invariant-validator.ts
[SKIP] 


Errors: 0, Sections: 12, Files loaded: 9/12