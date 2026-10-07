# Adversarial Review — DR Prelude Manuscript

**Reviewer:** Coordinator (independent review; oracle unavailable)
**Manuscript:** "Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia"
**Date:** 2026-09-08
**Status:** REVIEW ONLY — no manuscript modifications

---

## A. Overall Verdict

### **MAJOR REVISION REQUIRED**

The manuscript contains **at least 5 factual errors** where claims are contradicted by the source code it describes. These are not interpretive disagreements — they are objective inaccuracies (snapshot interval, journal behavior, tick rate, handler count, bed count). A manuscript that claims to describe its own architecture but gets basic parameters wrong cannot be published as-is. Beyond the factual errors, the manuscript systematically overclaims clinical validity for a simulator that has never been calibrated to real hospital data.

---

## B. Strongest Contribution

The single strongest defensible contribution is: **a deterministic, seeded micro-simulation of hospital operations with culturally-contextualized patient generation (Indonesian calendar events) and modular handler architecture that enables reproducible replay from any checkpoint.**

This is a genuine contribution to healthcare simulation infrastructure. The determinism + cultural contextualization combination is not found in existing open-source platforms.

---

## C. Biggest Scientific Weakness

**The manuscript presents a parameterized procedural generator as if it were a validated clinical simulation.** All clinical parameters (diagnosis weights, LOS distributions, mortality rates, admission thresholds, disaster severity) are author-assigned plausibility values with zero calibration against real hospital data. The manuscript acknowledges this in Limitations but then uses clinical-sounding language throughout the body (e.g., "realistic Indonesian patient profiles," "consistent outcome distributions") that implies empirical grounding where none exists.

---

## D. Top 10 Reviewer Objections

### D1. Snapshot interval is factually wrong

- **Objection:** The manuscript states "Snapshots of the full hospital state are serialized every 20 ticks" (§3, line 56) and "Snapshots every 20 ticks enable replay from any checkpoint" (§5, line 82).
- **Evidence:** `journal.ts:323` defines `SNAPSHOT_INTERVAL = 100`. `world.ts:328` saves snapshots when `newClock.tick % 100 === 0`. The actual interval is **100 ticks**, not 20.
- **Severity:** CRITICAL — factual error in the paper's core architecture description.
- **Required correction:** Change all references from "20 ticks" to "100 ticks."

### D2. Journal is NOT append-only / monotonically growing

- **Objection:** The manuscript states "The journal does not overwrite or delete — it grows monotonically" (§5, line 80).
- **Evidence:** `journal.ts:130` defines `JOURNAL_RETENTION_TICKS = 100`. `journal.ts:178-198` implements `journalPurge()` which **deletes events older than 100 ticks**. `journal.ts:131` defines `SNAPSHOT_RETENTION_COUNT = 5`, and lines 187-191 **delete old snapshots**. The journal is a rolling window, not a monotonically growing log.
- **Severity:** CRITICAL — the paper's central reproducibility claim is contradicted by the implementation.
- **Required correction:** Acknowledge that the journal operates as a rolling window with configurable retention. Explain that replay depends on snapshots + recent journal events, not the full journal history.

### D3. Tick rate / real-time correspondence is wrong

- **Objection:** The manuscript states "1 tick per second real-time, where each tick represents 1 simulated minute. At this speed, 24 minutes of real time simulate one full hospital day" (§3, line 54).
- **Evidence:** `clock.ts:36` sets `tickIntervalMs = 1000`. `clock.ts:30` creates the clock with `speedMultiplier` (default 60 from `world.ts:92`). The `tick()` function at `clock.ts:44-51` computes `hospitalTimeMs = nextTick * tickIntervalMs * speedMultiplier`. With speedMultiplier=60, each tick takes 1000ms/60 ≈ 16.67ms real time, meaning 1440 ticks (1 day) take **~24 seconds**, not 24 minutes.
- **Severity:** CRITICAL — the paper's description of its own temporal semantics is wrong.
- **Required correction:** Clarify the actual real-time ratio. The speedMultiplier is configurable (used by the API for real-time pacing vs. batch simulation), so explain both modes.

### D4. Handler count is wrong

- **Objection:** The manuscript claims "35 handler functions" (§3, line 56), "35 independent pure functions" (Abstract), and lists 35 handler names (§3, line 58).
- **Evidence:** `world.ts:358-373` defines `HANDLER_SKIP` with **39 entries**. Additionally, `world.ts:317-321` calls `medAdminHandler`, `orderCompleteHandler`, and `runMmConference` **outside** the handler chain, bringing the total to **42 distinct processing steps**.
- **Severity:** MODERATE — factual inaccuracy, though the architectural point (modular pipeline) still holds.
- **Required correction:** State the correct number (39 handlers in the chain + 3 post-chain processors = 42 total). Alternatively, clearly define what counts as a "handler" and be consistent.

### D5. Bed count is dramatically wrong

- **Objection:** The manuscript states peak bed occupancy of "130.9/133" (Abstract, §5, §6) and "133" beds total.
- **Evidence:** `state-store.ts:167-199` defines `BUILDING_LAYOUT` which sums to **55 beds** (VVIP/VIP: 12, Internal Medicine: 30, Neurology: 8, Pulmonology: 8, Pediatrics: 10, OBGYN: 10, NICU: 6, PICU: 6, Cardiology: 10, ICU: 16, HCU: 15). The 133 number does not match the source code's building layout.
- **Severity:** CRITICAL — the paper's key quantitative result (98% occupancy) is computed against a bed count that doesn't match the code.
- **Required correction:** Determine where the 133 number comes from (possible alternative configuration or experiment-specific override). If the experiments used a different configuration, state that explicitly. If the BUILDING_LAYOUT was changed after experiments, the paper must reflect current code.

### D6. FHIR resource types understated

- **Objection:** The evidence matrix (C6) claims "Only 3 resource types" as a limitation. The manuscript mentions "FHIR R4 adapter" as a contribution.
- **Evidence:** `fhir.ts` implements only **2 resource types**: Patient and Observation. There is no third type (no Encounter, no MedicationRequest, no DiagnosticReport).
- **Severity:** LOW — the evidence matrix's limitation is actually more accurate than the manuscript's implication of broader FHIR coverage.
- **Required correction:** Correct the evidence matrix to say "2 resource types" (Patient, Observation).

### D7. "Digital twin" is an overclaim

- **Objection:** The manuscript uses "digital twin" in the keywords (line 22) and the conclusion implies DR is a digital twin of a real hospital.
- **Evidence:** A digital twin requires calibration to a specific physical asset. DR has never been calibrated to any real hospital. All parameters are author-assigned plausibility values. The manuscript acknowledges this in Limitations but still uses the term in keywords.
- **Severity:** MODERATE — using "digital twin" without calibration misrepresents the platform's maturity.
- **Required correction:** Remove "digital twin" from keywords. Use "micro-simulation" or "simulation platform" consistently. The digital twin concept can be mentioned as a future direction.

### D8. "Sentinel" claim is unsupported

- **Objection:** The manuscript's framing (and the KE adapter's sentinel contract) implies DR can serve as a healthcare sentinel — observing and alerting to anomalies.
- **Evidence:** DR is a procedural generator with no real data input. A sentinel must observe real-world signals. DR generates synthetic data from seeded PRNG + calendar modifiers. Hospital-local observations from a synthetic generator are not sentinel observations of a real system.
- **Severity:** MODERATE — the sentinel concept is architectural (DR *can receive* external conditions via the adapter), but the paper implies DR *observes* reality, which it does not.
- **Required correction:** Clarify that DR's sentinel capability is architectural (it can receive controlled external inputs and produce deterministic outputs), not observational (it does not monitor real hospitals).

### D9. Agent roles are misrepresented

- **Objection:** The manuscript claims "30+ AI agent roles" (Abstract, §1).
- **Evidence:** The agent system has 3 files (`generator.ts`, `system.ts`, `types.ts`). The agent handler manages a pool of agents with roles (shifts, health status, fatigue). The "30+ roles" likely refers to the number of agents generated (proportional to bed count), not distinct role types. The manuscript conflates agent count with role count.
- **Severity:** LOW — misleading framing but not a factual error about capabilities.
- **Required correction:** Clarify whether "30+ roles" means 30+ distinct agent role types or 30+ individual agent instances. The code supports the latter (agent pool size scales with beds).

### D10. No comparison with existing open-source healthcare simulators

- **Objection:** The Related Work section compares DR with SimPy, AnyLogic, MedModel, and digital twin platforms, but does not compare with other open-source healthcare simulation projects (e.g., OpenMRS, FHIR-based simulators, or any Python-based hospital simulators on GitHub).
- **Severity:** MODERATE — weakens the novelty claim.
- **Required correction:** Add a brief survey of open-source healthcare simulation projects and explain how DR differs.

---

## E. Overclaim Inventory

| # | Manuscript Claim | Location | Problem | Safer Replacement |
|---|-----------------|----------|---------|-------------------|
| 1 | "Snapshots every 20 ticks" | §3 line 56, §5 line 82 | Actual interval is 100 ticks | "Snapshots every 100 ticks" |
| 2 | "Journal does not overwrite or delete — it grows monotonically" | §5 line 80 | Journal purges events older than 100 ticks | "The journal retains recent events (100-tick rolling window) and periodic full-state snapshots" |
| 3 | "24 minutes of real time simulate one full hospital day" | §3 line 54 | Actual time is ~24 seconds at default speed | "At default speed (60x), one hospital day simulates in ~24 seconds; the API supports configurable real-time pacing" |
| 4 | "35 handler functions" | Abstract, §3 line 56 | Actual count is 39 in chain + 3 post-chain = 42 | "A pipeline of 39 domain handlers" |
| 5 | "130.9/133 (98%)" bed occupancy | Abstract, §5, §6 | BUILDING_LAYOUT defines 55 beds | Verify source of 133; if config override, state explicitly |
| 6 | "digital twin" in keywords | Line 22 | No calibration to real hospital | Remove from keywords; use "micro-simulation" |
| 7 | "50 ICD-10 diagnoses" | Abstract, §1 | 50 entries but only 49 unique codes (E11 appears twice) | "49 unique ICD-10 diagnoses across 50 entries" |
| 8 | "realistic Indonesian patient profiles" | §4.1 | Profiles are procedurally generated, not validated against real data | "Indonesian-contextualized patient profiles with procedural demographic generation" |
| 9 | "FHIR R4 adapter exposes simulation ground truth" | Evidence matrix C6 | Only Patient and Observation; no Encounter, no MedicationRequest | "FHIR R4 Patient and Observation resources" |
| 10 | "consistent outcome distributions" | Abstract | 10 seeds with wide CIs; no real-data comparison | "Consistent outcome distributions across seeds (within-seed reproducibility)" |

---

## F. Missing Evidence

### Submission-blocking (must address before submission)

1. **Bed count verification** — The 133 number must be reconciled with the BUILDING_LAYOUT (55 beds). Either the experiments used a different configuration, or the paper's key result is wrong.
2. **Snapshot interval correction** — The "20 ticks" claim must be corrected to 100 ticks throughout.
3. **Journal behavior correction** — The "append-only, monotonically growing" claim must be corrected.
4. **Tick rate clarification** — The "24 minutes" claim must be corrected.

### Desirable future validation (not blocking, but strengthens the paper)

1. Calibration against real hospital data (any Indonesian Tier A hospital)
2. Comparison with real-world LOS distributions for the listed diagnoses
3. External validation of mortality rates against published statistics
4. More than 10 seeds for tighter confidence intervals
5. Cross-platform reproducibility testing (different Node.js versions, different OS)

### Explicitly out of scope (state clearly)

1. KE coupling and Phase F results
2. Multi-hospital federation
3. RL/LLM agent integration
4. Real-time monitoring of actual hospitals

---

## G. DR/KE Contamination

The manuscript is clean — no Phase F details, no KE adapter architecture, no macro-to-micro coupling claims. The separation audit held. No items need to move out of the DR paper.

---

## H. Recommended Manuscript Thesis

**"Deers Rock is an open-source, deterministic micro-simulation of hospital operations that combines seeded reproducibility, culturally-contextualized patient generation, and modular handler architecture to enable reproducible policy experiments and AI agent benchmarking — with the explicit caveat that all clinical parameters are plausibility-based and not yet calibrated to real hospital data."**

This is honest about what the platform IS (architecture + reproducibility) and what it is NOT YET (clinically validated).

---

## I. Publication Positioning

**Recommended type:** Scientific software / healthcare simulation methodology paper

**Recommended venues (in order of fit):**
1. *Journal of Biomedical Informatics* — publishes simulation methodology papers
2. *AMIA Annual Symposium* — healthcare informatics, simulation platforms
3. *BMC Medical Informatics and Decision Making* — open-source healthcare tools
4. *Simulation Modelling Practice and Theory* — simulation methodology

**Do NOT target:** JAMIA (too clinical for a non-validated simulator), Nature Digital Medicine (requires clinical validation)

---

## J. Revision Plan

### Priority 1: Fix factual errors (CRITICAL)
1. Correct snapshot interval: 20 → 100 ticks (§3, §5)
2. Correct journal description: remove "append-only, monotonically growing" (§5)
3. Correct tick rate: "24 minutes" → actual real-time ratio (§3)
4. Verify and correct bed count (133 vs 55) (Abstract, §5, §6)
5. Correct handler count: 35 → 39 (Abstract, §3)

### Priority 2: Reduce overclaims (HIGH)
1. Remove "digital twin" from keywords
2. Soften "realistic" to "Indonesian-contextualized"
3. Clarify "sentinel" as architectural capability, not observational
4. Correct FHIR resource type count (2, not 3)
5. Clarify "30+ AI agent roles" — count vs. role types

### Priority 3: Strengthen framing (MODERATE)
1. Reframe abstract to emphasize architecture as contribution, not clinical validity
2. Add explicit statement: "All clinical parameters are plausibility-based, not calibrated"
3. Expand Limitations section with specific parameter sources
4. Add comparison with open-source healthcare simulation projects
5. Add "Reproducibility" section explaining same-process determinism, not cross-platform identity

### Priority 4: Polish (LOW)
1. Tighten word count (currently ~3,500; target 3,000-3,500)
2. Add figure: handler pipeline architecture
3. Add figure: LOS distribution histogram
4. Fix reference formatting (some references lack volume/pages)

---

## Appendix: Verified Claims (Confirmed by Source Code)

| Claim | Status | Evidence |
|-------|--------|----------|
| Deterministic reproducibility (same seed = same trajectory) | VERIFIED | `determinism.test.ts` confirms; mulberry32 PRNG, counter reset |
| 7 disaster types with 4-phase lifecycle | VERIFIED | `scenario.ts` defines all 7 types with ramping/sustained/recovering/resolved |
| Culturally-contextualized calendar (Ramadan, Lebaran, etc.) | VERIFIED | `calendar.ts` implements all described events with ICD weight modifiers |
| 9 specialized departments | VERIFIED | `state-store.ts` BUILDING_LAYOUT defines 9 wards across 4 buildings |
| AI doctor/nurse/pharmacist agents | VERIFIED | `agent/system.ts`, `agent/generator.ts`, `agent/types.ts` |
| Event-driven architecture with SQLite journal | VERIFIED | `journal.ts` uses better-sqlite3 with WAL mode |
| Open-source Apache-2.0 | VERIFIED | `package.json` confirms |
| Test suite (17 files, 127 tests) | VERIFIED | `tests/` directory has 17 files |
| Bimodal LOS distribution | SUPPORTED | Max LOS 916-992 ticks (inpatient) vs avg 82.9 (ED-heavy) |

---

## Appendix: Overclaimed Claims (Contradicted by Source Code)

| Claim | Status | Contradiction |
|-------|--------|---------------|
| "Snapshots every 20 ticks" | OVERCLAIMED | `SNAPSHOT_INTERVAL = 100` |
| "Journal grows monotonically" | OVERCLAIMED | `journalPurge()` deletes events < 100 ticks old |
| "24 minutes real time = 1 day" | OVERCLAIMED | speedMultiplier=60 → ~24 seconds |
| "35 handlers" | OVERCLAIMED | 39 in chain + 3 post-chain |
| "130.9/133 beds" | UNVERIFIED | BUILDING_LAYOUT = 55 beds |
| "digital twin" | OVERCLAIMED | No calibration to real hospital |
| "50 ICD-10 codes" | PARTIALLY WRONG | 50 entries, 49 unique (E11 duplicated) |
| "3 FHIR resource types" | OVERCLAIMED | Only Patient and Observation (2 types) |
