# Research OC — Experiment Proposal

**Date:** 2026-06-28
**Status:** Proposed
**Handoff:** Platform OC reviews feasibility; Coordinator OC approves before execution

---

## E1: Mortality Rate Calibration

**Hypothesis:** The current 35/10/2% death roll overestimates mortality for low-risk patients.

**Method:**
1. Run 10 independent simulations of 1000 ticks each
2. Record death rate stratified by mortality risk (high/moderate/low)
3. Compare against known Indonesian in-hospital mortality data (when obtained)

**Acceptance:** Low-risk mortality should not exceed 1% (target 0.5-1%).

**Dependency:** ADR-004 (Mortality Risk Engine) to document source ranges.

---

## E2: Length of Stay Parameter Sensitivity

**Hypothesis:** The current 4-12 tick LOS causes 100% bed saturation. Increasing to clinically realistic values (240-360 ticks) will produce dynamic occupancy.

**Method:**
1. Run simulation at current LOS (4-12 ticks) — baseline
2. Run at 60 ticks, 120 ticks, 240 ticks, 360 ticks
3. At each setting, record: bed occupancy %, waiting room size, admission rejection rate, mortality

**Acceptance:** Identify LOS value where occupancy stabilizes at 70-90% with non-zero waiting room.

**Dependency:** Platform OC adjusts `dischargeHandler` scheduling parameters.

---

## E3: Admission-Discharge Equilibrium

**Hypothesis:** The admission burst rate (1-3 patients per 15 ticks = 4-12/hr) exceeds discharge capacity at current LOS, causing permanent saturation. This is mathematically inevitable.

**Method:**
1. Model the system as a queuing system: arrival rate λ, service rate μ, servers = 95 beds
2. Calculate theoretical saturation point
3. Compare with simulation runs
4. Test at multiple arrival rates: 2/hr, 4/hr, 6/hr, 8/hr, 12/hr

**Acceptance:** Simulation matches queuing theory prediction within 5%.

---

## E4: Pharmacy Allergy Detection Sensitivity

**Hypothesis:** The 50% "None" allergy pool + 3% per-allergen rate means ~1.5% of patients trigger allergy checks, making pharmacy allergy detection behavior statistically invisible.

**Method:**
1. Count allergy-triggered blocks over 1000 ticks
2. Artificially increase allergy rate to 50% for one run — count blocks
3. Compare detection rates

**Acceptance:** At current rates, minimum 5000+ ticks needed to observe 1 allergy block. Recommend increasing non-"None" allergy probability to 20-30%.

---

## E5: Protocol Coverage Gap Analysis

**Hypothesis:** ~20 ICD codes in the generator lack specific protocols in clinical-knowledge.ts, falling through to vitals-based defaults. This creates unequal care quality by diagnosis.

**Method:**
1. Enumerate all 58 ICD codes in patient generator
2. For each, check existence of protocol in clinical-knowledge.ts
3. For uncovered codes, audit what actions ai-doctor.ts generates (vitals-only fallback)
4. Calculate action volume difference: covered vs uncovered codes

**Acceptance:** All 58 codes should have at least one lab, one medication, and one imaging order per Constitution §3.2.

---

## Execution Priority

| Priority | Experiment | Why Now |
|----------|------------|---------|
| P0 | E2 (LOS) | Unblocks all throughput work; 100% saturation blocks E3-E5 |
| P0 | E5 (Protocols) | Clinical quality gap, Constitution compliance |
| P1 | E1 (Mortality) | Scientific validity of core model parameter |
| P2 | E3 (Queue Model) | Validates E2 analytically |
| P3 | E4 (Allergy) | Low impact on current simulation behavior |
