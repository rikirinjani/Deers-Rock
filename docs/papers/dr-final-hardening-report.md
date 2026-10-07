# DR Prelude Paper — Final Scientific Language Hardening Report

**Date:** 2026-09-08
**Status:** READY FOR SUBMISSION
**Manuscript:** `dr-prelude-draft.md` v4.0

---

## Scope

This pass hardened the manuscript against reviewer objections caused by claims that exceed the evidence. No code was modified, no experiments were run, no parameters were changed, no new references were added. The evidence boundary remains frozen at E1 baseline (10 × 1,000 ticks).

---

## Changes by instruction area

### 1. Unsupported universal claims

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| Abstract Background | "lacks open-source platforms that combine..." | "vary in the degree to which they combine..." | Avoids proving a global negative |
| §2 Hospital platforms | "None of these platforms embed AI agents..." | "These platforms emphasize different subsets of capabilities; none combines all five properties..." | Comparative, not exclusionary |
| §2 Open-source simulators | "The gap remains: no open-source platform combines..." | "To our knowledge, no open-source platform combines..." | Scoped claim |
| §2 The gap | "No existing platform combines..." + "Deers Rock provides all five." | "The reviewed platforms emphasize different subsets of these capabilities. To our knowledge, no single open-source platform integrates..." | Replaced universal negative with scoped claim |
| §3 Event journal | "Every state transition is recorded" | "State transitions are recorded" | Removes absolute quantifier |
| §1 Introduction | "indispensable for policy analysis, AI agent development, and health information system validation" | "widely used for policy analysis, rule-based agent development, and health information system prototyping" | Softened scope |

### 2. Reproducibility language

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| Abstract Objective | "guarantees seed-based reproducibility" | "provides verified deterministic replay within a fixed execution environment" | Scoped to tested environment |
| Abstract Methods | "enabling replay from any checkpoint" | "and the most recent 5 snapshots are retained. Replay from any surviving checkpoint reconstructs state from the nearest snapshot plus subsequent journaled events" | Reflects bounded retention |
| §1 Introduction | "Every state transition is recorded. Every simulation can be replayed from any checkpoint." | "State transitions are recorded in the journal. Simulations can be replayed from the nearest surviving snapshot and subsequent journal entries." | Reflects bounded retention |
| §5 header | "Reproducibility Guarantees" | "Reproducibility Mechanisms" | "Guarantees" implies unconditional promise |
| §5 Level 1 | "Seed 42 always produces identical trajectories" | "Within the same process and platform, seed 42 always produces identical trajectories" | Scoped determinism |
| §5 Level 3 | "A specific tick can be restored by loading the nearest surviving snapshot" | "A surviving snapshot allows restoring the hospital state at that tick" | Removes implication of arbitrary tick restoration |
| §5 Verification | "within-seed reproducibility" | "within-environment reproducibility" | Consistent terminology |
| §8 Determinism | "Deterministic replay is guaranteed within the same process" | "Deterministic replay is verified within the same process" | "Verified" not "guaranteed" |
| §9 Conclusion | "every trajectory is reproducible, and every simulation can be rewound and branched" | "trajectories are reproducible within the retention window, and simulations can be rewound from surviving snapshots" | Reflects bounded retention |

### 3. "Natural experiment" removed

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| Abstract Results | "Disaster-triggered runs showed 82% higher mortality (mean 6.0 vs. 3.3)" | "Three of the ten demonstration runs activated a disaster scenario; these runs had a higher mean number of deaths than the seven non-disaster runs (6.0 vs. 3.3 deaths per run). This descriptive comparison illustrates the intended operation of the disaster mechanism and is not a controlled estimate of disaster-associated mortality." | Reframed as descriptive comparison |
| §6 Reproducibility | "creating a natural experiment" + "82% higher mortality" | Same descriptive comparison language as Abstract | Removed "natural experiment" and "82%" |

### 4. "Pure functions" corrected

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| §3 Handler chain | "Handlers are pure functions" | "Handlers are modular state-transition functions" | Technically accurate without implying functional purity |

### 5. 99% occupancy interpretation

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| §5 Verification | No qualification | "The near-capacity occupancy is an observed property of the current parameterization, not evidence of realistic hospital utilization, as the model has not been calibrated against facility data." | Prevents reviewer inference of realistic utilization |

### 6. Cultural contextualization reframed

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| §4.6 | "These culturally-contextualized patterns are the platform's strongest differentiator" | "These culturally-contextualized patterns are an architectural capability of the platform: an explicit mechanism for locale-specific contextual modifiers" | Capability claim, not empirical claim |

### 7. AI terminology tightened

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| §4.3 heading | "AI clinical agents" | "Rule-based clinical agents" | Accurate description of current implementation |
| §4.3 body | "The AI doctor/nurse/pharmacist" | "The doctor agent/nurse agent/pharmacist agent" | Neutral terminology |
| §4.3 closing | No architecture note | "The architecture permits future RL or LLM-based agent extensions." | Preserves future direction |
| §4.4 | "The AI doctor ranks" | "The doctor agent ranks. This mechanism is a simple heuristic; the architecture permits integration with RL or LLM-based learning." | Accurate description |
| §8 Limitations | "The three AI agents are rule-based" | "The three clinical agents are rule-based" | Consistent terminology |
| §9 Conclusion | "AI agent benchmarking" | "rule-based agent benchmarking" | Accurate |
| §9 five properties | "native AI agent experimentation" | "rule-based clinical agent experimentation" | Accurate |

### 8. HIS validation implication removed

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| §9 Conclusion | "health information system validation" | "health information system prototyping and interoperability testing" | Defensible given evidence |
| §1 Introduction | "health information system validation" | "health information system prototyping" | Consistent |

### 9. Limitations preserved

All seven limitations sections remain unchanged:
- No clinical calibration ✓
- Cause-of-death attribution ✓
- Single-hospital scope ✓
- Agent capabilities ✓
- Determinism scope ✓
- FHIR coverage ✓
- Limited validation dataset ✓

### 10. Contribution preserved

Manuscript positions Deers Rock as a deterministic, inspectable healthcare micro-simulation architecture. No drift toward clinical validation, digital twin, or epidemiological model claims.

### 11. Related Work language

| Location | Old | New | Rationale |
|----------|-----|-----|-----------|
| §2 Hospital platforms | "None of these platforms embed AI agents, model culturally-contextualized patient generation, or expose FHIR-compliant data" | "These platforms emphasize different subsets of capabilities" | Comparative framing |
| §2 Open-source | "though none combine the properties of Deers Rock" | Removed | Unnecessary |
| §2 AI/RL | "Deers Rock differs by embedding AI agents" | "Deers Rock embeds rule-based clinical agents within a persistent, multi-department hospital, with an architecture that permits future RL or LLM-based extensions" | Accurate + future direction |
| §2 Digital twin | "Deers Rock is designed as an open-source, generalizable platform" | "Deers Rock is designed as an open-source reference implementation that ships with a locale-specific parameter pack" | More precise |

### 12. Evidence unchanged

All numerical values verified consistent: 38 handlers, 55 beds, 49 unique ICD-10, 22-drug formulary, 7 disaster types, 9 departments, 100-tick retention, 100-tick snapshots, 5 retained snapshots, ~24 sec/day at 60×, 10 seeds × 1,000 ticks, LOS 82.9 ± 10.4, deaths 4.3 ± 1.9, peak occupancy 54.2/55, disaster comparison 6.0 vs 3.3.

### 13. No scope expansion

Confirmed: no source code modified, no tests modified, no KE modified, no Phase F modified, no experiments added, no seeds added, no statistical tests added, no clinical validity claims added, no new features, no DR/KE boundary reopened.

---

## Claims deliberately left unchanged

| Claim | Why unchanged |
|-------|---------------|
| "9 specialized departments" | Directly counted from source |
| "49 unique ICD-10 diagnoses" | Directly counted from source |
| "22-drug formulary" | Directly counted from source |
| "7 disaster scenario types" | Directly counted from source |
| "38 handler functions" | Directly counted from HANDLER_SKIP |
| "55 beds" | Directly counted from BUILDING_LAYOUT |
| "100-tick journal retention" | Directly read from source constant |
| "Snapshots every 100 ticks" | Directly read from source constant |
| "5 retained snapshots" | Directly read from source constant |
| "~24 seconds per day at 60×" | Directly calculated from source |
| "LOS 82.9 (SD 10.4)" | Frozen experiment result |
| "Deaths 4.3 (SD 1.9)" | Frozen experiment result |
| "Peak occupancy 54.2/55" | Frozen experiment result |
| "6.0 vs 3.3 deaths" | Frozen experiment result |
| "19% implausible COD" | Frozen experiment result |
| "127 tests across 17 files" | Directly counted |
| "54 modules" | Directly counted |
| "16 ADRs" | Directly counted |

---

## Final audits

### A. Claim audit

Every substantive claim classified:

| Claim | Category | Status |
|-------|----------|--------|
| Deterministic replay | Directly demonstrated | ✅ |
| Consistent distributions | Directly demonstrated | ✅ |
| 38 modular handlers | Architectural | ✅ |
| Cultural calendar mechanism | Architectural | ✅ |
| Rule-based clinical agents | Architectural | ✅ |
| FHIR R4 Patient/Observation | Architectural | ✅ |
| 7 disaster types | Architectural | ✅ |
| 99% occupancy | Descriptive observation | ✅ |
| Bimodal LOS | Descriptive observation | ✅ |
| Disaster mortality comparison | Descriptive observation | ✅ |
| Clinical validity | NOT CLAIMED | ✅ |
| Population representativeness | NOT CLAIMED | ✅ |
| Digital twin status | NOT CLAIMED | ✅ |
| Universal platform superiority | NOT CLAIMED | ✅ |

No language upgrades one category into another.

### B. Numerical audit

All 35+ numerical values verified against frozen manuscript/evidence. No stale values.

### C. Boundary audit

Manuscript is a standalone Deers Rock paper. No KE macro model, Phase F causal coupling, or macro-to-micro results enter the scientific contribution. The only KE reference is §9's single sentence noting the companion paper exists.

---

## Verdict

**READY FOR SUBMISSION**

All scientific and factual work is complete. The manuscript is hardened against reviewer objections from universal claims, overclaiming, and mischaracterization of evidence. Limitations are preserved and prominent. The contribution is accurately positioned as a reference implementation of a deterministic healthcare micro-simulation architecture.
