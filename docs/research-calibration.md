# Research OC — Calibration Targets & Experiment Design

**Author:** Research OC
**Date:** 2026-06-28
**Status:** Proposal (awaiting Coordinator & Platform OC review)

---

## 1. Calibration Targets

The following real-world data would ground the simulation in empirically valid ranges:

| Target | Current Value | Plausible Range (Indonesia) | Source Needed |
|--------|--------------|---------------------------|---------------|
| High-risk mortality | 35% | 25-40% (sepsis IHM) | Indonesian ICU registry or RISKESDAS |
| Moderate-risk mortality | 10% | 5-15% (pneumonia IHM) | SIRS hospital reporting |
| Low-risk mortality | 2% | 0.5-2% (hypertension IHM) | SIRS hospital reporting |
| Avg length of stay | 4-12 ticks (4-12 min sim) | 4-7 days (5760-10080 ticks) | BPJS claims data |
| Bed occupancy | ~100% (saturated) | 60-90% typical, 95%+ for referral | Hospital profile SIRS |
| Drug allergy prevalence | 50% "None", ~3%/allergen | 5-15% any drug allergy | Indonesian pharmacovigilance |
| Admission rate | 1-3 per 15 ticks (4-12/hr) | Varies by hospital size | SIRS / BPJS |

### Priority Order for Calibration
1. **LOS distribution** — most impactful, currently most unrealistic (4 min vs days)
2. **Mortality by ICD tier** — directly affects the model's primary ethical output
3. **Bed occupancy** — determines whether the 100% saturation is an artifact or a feature

---

## 2. Proposed Experiments

### E1: Multi-Run Variance Analysis
**Purpose:** Determine whether single-run outcomes are reproducible or noise-dominated.

**Method:**
- Run `createWorld(100)` → `runWorld(w, 1000)` 10 times
- Record per-run: total deaths, improved/deteriorated split, bed occupancy time series, encounter count
- Compute mean, SD, 95% CI for each metric

**Success criterion:** 95% CI width < ±5% of mean for mortality rate.

**Implementation note:** Requires test infrastructure to seed RNG for reproducibility across runs.

### E2: Mortality Sensitivity Analysis
**Purpose:** Measure how responsive system-level mortality is to the tier risk parameters.

**Method:**
- Vary high-risk probability: [0.20, 0.25, 0.30, **0.35**, 0.40, 0.45, 0.50]
- Vary moderate-risk: [0.05, **0.10**, 0.15, 0.20]
- Vary low-risk: [0.01, **0.02**, 0.03, 0.05]
- Run 3 replicates per configuration
- Fit response surface

**Question:** Is mortality proportional to parameter changes, or are there threshold effects where small changes produce large swings?

### E3: Learning System Ablation
**Purpose:** Does the RL feedback loop improve outcomes vs static protocol execution?

**Method:**
- Control condition: normal simulation (learning active)
- Experimental condition: freeze learning weights at zero (no action re-ranking by past outcomes)
- Run both 10× at 1000 ticks
- Compare mortality rate, improvement rate

**Hypothesis:** With <5 encounters per diagnosis, the learning signal is too sparse to converge. Expect no statistically significant difference.

### E4: Protocol Coverage Ablation
**Purpose:** Quantify the hidden uniformity from vital-sign fallback.

**Method:**
- Run simulation with normal protocol fallback
- Run simulation where patients with uncovered ICD codes receive **zero** orders from AI Doctor
- Compare: which ICD codes get zero orders? How does mortality differ for those patients?

**Question:** How much of the model's clinical behavior is actually protocol-driven vs vital-sign-driven?

### E5: Time Scale Validation
**Purpose:** Verify that 60× speed + 1 tick/sec preserves relative clinical dynamics.

**Method:**
- Run simulation at 1×, 10×, 60×, 120× speed multipliers
- Compare: mortality rate, LOS distribution, bed occupancy trajectory
- Compute speedup artifacts (e.g., do shorter ticks cause event ordering changes?)

**Constraint:** The 1 tick = 1 min base rate means 60× speed = 1 simulated hour per real second. Event ordering within a tick is nondeterministic with respect to simulated time.

---

## 3. Validation Framework Requirements

To run these experiments, the platform needs:

1. **Seeded RNG** — all random draws must be reproducible given a seed
2. **Multi-run harness** — ability to run N simulations with different seeds and aggregate results
3. **Outcome recorder** — per-run CSV export of: deaths by ICD, LOS per encounter, bed occupancy per tick, actions taken per diagnosis
4. **Learning toggle** — ability to freeze/disable agent learning

These are not code features — they are **instrumentation** for scientific measurement.

---

## 4. Open Scientific Questions

1. **Is the simulation measuring what we think it measures?** The outcome tracker records "improved/deteriorated/deceased" per encounter. But what is the ground truth? Without real patient trajectories, we cannot validate that our improvement criterion matches clinical reality.

2. **Does diagnosis weighting produce realistic case mix?** The generator weights are set to match Tier A profiles. But without comparing against actual admission data from Makassar, we are assuming correctness.

3. **Are the escalation rules correctly specified?** qSOFA ≥ 2, HR > 120 + SBP < 90, SpO2 < 88 — these are evidence-based thresholds from international guidelines. But Indonesian clinical practice may differ. The Constitution encodes them as immutable (Article III §3.4), which may not reflect local standard of care.

4. **What is the counterfactual?** To measure "improvement" we need to know what would have happened without intervention. The current model has no untreated control group — every patient receives AI care. Mortality comparisons must reference external data, not internal baselines.
