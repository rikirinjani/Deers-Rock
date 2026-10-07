# DR Prelude Paper — Claim/Evidence Matrix (Revised)

**Date:** 2026-09-08
**Status:** FROZEN (revision 2)
**Paper:** "Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia"
**Revision:** Major revision — all factual errors corrected, overclaims reduced

---

## Claim Categories

| Category | Definition | Evidence Standard |
|----------|-----------|-------------------|
| **PROVEN** | Architectural fact, verified in code | Code inspection + build verification |
| **SUPPORTED** | Empirical result with statistical backing | Experiment data with CI |
| **OBSERVED** | Single-seed or limited-sample finding | Single experiment, not replicated |
| **STRUCTURAL** | Design property, not outcome claim | Architecture inspection |
| **NOT VALIDATED** | Absent evidence, explicitly acknowledged | No data available |
| **EXCLUDED** | Out of scope for this paper | Explicit boundary |

---

## Claim Matrix

### C1: Deterministic Reproducibility

| Field | Value |
|-------|-------|
| **Claim** | Same seed + same input = same output trajectory |
| **Category** | PROVEN |
| **Evidence** | Seed 42 verified across 10 runs of 1000 ticks — identical trajectories |
| **Source** | `experiment-results/` seed-42 runs |
| **Verification** | Code inspection: mulberry32 PRNG, Clock object carries PRNG state |
| **Limitation** | Same-process determinism only; cross-platform not tested |

### C2: Consistent Outcome Distributions

| Field | Value |
|-------|-------|
| **Claim** | Platform produces consistent outcome distributions across seeds |
| **Category** | SUPPORTED |
| **Evidence** | 10 seeds × 1000 ticks: LOS 82.9 (SD 10.4, 95% CI ±6.4), deaths 4.3 (SD 1.9, 95% CI ±1.2) |
| **Source** | E1 experiment, `experiment-results/` |
| **Verification** | Multi-run harness with descriptive statistics |
| **Limitation** | 10 seeds only; does not constitute clinical validation; no real-data comparison |

### C3: Modular Composability

| Field | Value |
|-------|-------|
| **Claim** | 38 independent handlers compose into a single tick pipeline |
| **Category** | PROVEN |
| **Evidence** | `world.ts:358-373` HANDLER_SKIP array defines 38 handlers; each is a pure function |
| **Source** | `src/engine/world.ts` |
| **Verification** | Code inspection: handlers share state only through HospitalState object |
| **Limitation** | Handler order is fixed; reordering not tested |

### C4: Culturally-Contextualized Patient Generation

| Field | Value |
|-------|-------|
| **Claim** | Calendar engine generates patient influx tied to Indonesian holidays |
| **Category** | PROVEN |
| **Evidence** | Ramadan: +5 dehydration, +4 gastritis, +3 hypoglycemia. Lebaran: 1.6× surge, +6 burns, +4 fractures |
| **Source** | `src/engine/calendar.ts`, `src/engine/patient-generator.ts` |
| **Verification** | Code inspection: weight modifiers applied per calendar event |
| **Limitation** | Weight modifiers are plausibility-based, not validated against real data |

### C5: AI Agent Experimentation

| Field | Value |
|-------|-------|
| **Claim** | Three AI agent types operate under clinical constitution with learning loop |
| **Category** | PROVEN |
| **Evidence** | Doctor rounds every 4 ticks, nurse monitors vitals, pharmacist reviews orders |
| **Source** | `src/agent/`, `src/engine/handlers/agent.ts` |
| **Verification** | Code inspection + test suite (17 tests) |
| **Limitation** | Agents are rule-based heuristics; no RL/LLM integration yet |

### C6: FHIR R4 Interoperability

| Field | Value |
|-------|-------|
| **Claim** | FHIR R4 adapter exposes Patient and Observation resources |
| **Category** | IMPLEMENTED |
| **Evidence** | `fhir.ts` implements Patient and Observation resource types |
| **Source** | `src/api/fhir.ts` |
| **Verification** | Code inspection |
| **Limitation** | Only 2 resource types; no Encounter, MedicationRequest, or DiagnosticReport |

### C7: Disaster Scenario Engine

| Field | Value |
|-------|-------|
| **Claim** | 7 disaster types with 4-phase lifecycle affecting surge, mortality, supply, infrastructure |
| **Category** | PROVEN |
| **Evidence** | Earthquake, tsunami, pandemic, etc. each with ramping/sustaining/recovering/resolved phases |
| **Source** | `src/engine/scenario-engine.ts` |
| **Verification** | Code inspection + experiment results (3/10 runs triggered disasters) |
| **Limitation** | Disaster parameters are plausibility-based, not calibrated to real events |

### C8: Bed Occupancy at Capacity

| Field | Value |
|-------|-------|
| **Claim** | Peak bed occupancy averaged 54.2/55 (99%) |
| **Category** | OBSERVED |
| **Evidence** | E1 experiment, 10 seeds |
| **Source** | `experiment-results/` |
| **Verification** | Multi-run harness |
| **Limitation** | May reflect admission rate tuning rather than realistic saturation; no real-data comparison |

### C9: Bimodal LOS Distribution

| Field | Value |
|-------|-------|
| **Claim** | Average LOS reflects bimodal distribution (ED fast-track + inpatient) |
| **Category** | STRUCTURAL |
| **Evidence** | Max LOS 916-992 ticks confirms inpatient delays; avg 82.9 pulled down by ED volume |
| **Source** | E1 experiment |
| **Verification** | Distribution analysis |
| **Limitation** | Average LOS not validated against real hospital data |

### C10: Disaster Mortality Increase

| Field | Value |
|-------|-------|
| **Claim** | Disaster-triggered runs showed 82% higher mortality |
| **Category** | OBSERVED |
| **Evidence** | 3/10 runs had disasters; mean 6.0 vs 3.3 deaths |
| **Source** | E1 experiment |
| **Verification** | Natural experiment (stochastic disaster triggering) |
| **Limitation** | Small sample (3 disaster runs); not controlled intervention |

### C11: Clinical Validity

| Field | Value |
|-------|-------|
| **Claim** | None — explicitly NOT CLAIMED |
| **Category** | NOT VALIDATED |
| **Evidence** | No calibration against real hospital data |
| **Source** | Limitations section |
| **Verification** | Absence of evidence acknowledged |
| **Limitation** | Clinical validation is future work |

### C12: Population Representativeness

| Field | Value |
|-------|-------|
| **Claim** | None — explicitly NOT CLAIMED |
| **Category** | NOT VALIDATED |
| **Evidence** | No comparison with real hospital populations |
| **Source** | Limitations section |
| **Verification** | Absence of evidence acknowledged |
| **Limitation** | Represents a single synthetic facility, not a real population |

---

## Evidence Gaps

| Gap | Impact | Mitigation |
|-----|--------|------------|
| No real hospital calibration | LOS, mortality, occupancy may not reflect reality | Acknowledged in Limitations; calibration is ongoing work |
| Only 10 seeds | Distribution estimates have wide CIs | Acknowledged; longer experiments planned |
| Cause-of-death attribution | 19% implausible COD | Use aggregated categories (infectious vs NCD) |
| Single hospital | No multi-facility federation | Future work direction |
| No RL/LLM agents | Current agents are heuristic baselines | Architecture supports extension |
| Cross-platform determinism not tested | Only verified on single platform | Acknowledged in Limitations |

---

## Frozen Evidence Sources

| Source | Location | Status |
|--------|----------|--------|
| E1 baseline (10×1000 ticks) | `experiment-results/` | FROZEN |
| Architecture spec | `docs/papers/deers-rock-platform-paper.md` | FROZEN |
| Code inspection | `src/` (54 modules) | FROZEN |
| Test suite | `tests/` (17 files, 127 tests) | FROZEN |
| DR paper boundary | `docs/papers/dr-paper-boundary.md` | FROZEN |
| Adversarial review | `docs/papers/dr-adversarial-review.md` | FROZEN |
| Revision report | `docs/papers/dr-revision-report.md` | FROZEN |

---

## Freeze Record

- **Original frozen:** 2026-09-08T04:45:00Z
- **Revised:** 2026-09-08 (major revision — factual errors corrected, overclaims reduced)
- **By:** Coordinator
- **Reason:** Adversarial review identified 5 factual errors and ~10 overclaims; all corrected
- **Immutable until:** Paper submission or explicit revision
