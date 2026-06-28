# Proposed Constitution Amendments (Research OC)

**Per Article V §5.1 — Amendment Authority**
**Date:** 2026-06-28
**Author:** Research OC
**Status:** Proposed (awaiting human approval)

---

## Amendment A: Article III §3.3 — Mortality

### Current Text
```
**3.3 — Mortality**
- Death shall only occur via the death roll in `dischargeHandler`
- Death probability: high risk = 35%, moderate = 10%, low = 2%
- Every death must be recorded in `morgue` with cause, diagnosis, and score
- No cap on total deaths (morgueCapacity is 10 but overflow shall be silently accepted)
```

### Proposed Text
```
**3.3 — Mortality**
- Death shall only occur via the death roll in `dischargeHandler`
- Death probability: high risk = 35%, moderate = 10%, low = 2%
- These probabilities must have documented provenance (references to published literature or local hospital data) in ADR-004
- Every death must be recorded in `morgue` with cause, diagnosis, and score
- No cap on total deaths (morgueCapacity is 10 but overflow shall be silently accepted)
```

### Rationale
Adds a documentation requirement for mortality probabilities, which are the model's most consequential ethical output. Current values are enshrined as law without sources.

---

## Amendment B: New Article VII — Model Assumptions & Calibration

### Current Text
No Article VII exists.

### Proposed Text
```
## Article VII — Model Assumptions & Calibration

**7.1 — Assumption Transparency**
Every model parameter that materially affects clinical outcomes shall have documented provenance or a defined calibration target. Parameters include but are not limited to: mortality probabilities, length of stay distributions, diagnosis weights, and drug allergy prevalence.

**7.2 — Calibration Requirement**
Model outputs shall be periodically compared against real-world reference data (Indonesian hospital statistics, BPJS claims data, or published literature). Discrepancies exceeding clinically meaningful thresholds shall be documented as calibration gaps.

**7.3 — Experimentation**
The simulation may be run in experimental configurations (alternative parameter sets, frozen learning systems) for validation purposes. Results shall be clearly labeled as experimental and not conflated with baseline model outputs.

**7.4 — Assumption Review**
At each major release, Research OC shall review all documented model assumptions and flag any that are no longer supported by available evidence.
```

### Rationale
Formalizes the scientific governance of model assumptions. Without this Article, there is no mechanism to track which parameters are calibrated vs assumed vs arbitrary.

---

## Amendment C: Article III §3.2 — Protocol Coverage

### Current Text
```
- Every diagnosis in `ICD10_DIAGNOSES` shall have a corresponding protocol in `ICD_PROTOCOLS` or a default protocol shall apply
```

### Proposed Text
```
- Every diagnosis in `ICD10_DIAGNOSES` shall have a corresponding protocol in `ICD_PROTOCOLS` or a default protocol shall apply
- When a default protocol applies, this shall be logged as a "protocol gap" for scientific audit
- The fraction of encounters using default protocols shall be reported in the hospital statistics report
```

### Rationale
The current rule allows silent fallback to defaults, which hides the protocol coverage gap. This amendment makes the gap visible and measurable.
