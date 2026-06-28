# Proposed Roadmap Additions (Research OC → Coordinator)

**Handoff per Article VI §6.5**
**Date:** 2026-06-28

---

I propose the following additions to ROADMAP.md for Coordinator review:

## Add to Epic II — Clinical Depth

### Milestone 2.5: Model Calibration
- [ ] Document mortality risk factor weights with plausible clinical ranges (see ADR-004)
- [ ] Validate LOS distribution against real Indonesian hospital data (current: 4-12 ticks = 4-12 simulated min, unrealistic)
- [ ] Validate drug allergy prevalence rates against Indonesian pharmacovigilance data

### Milestone 2.6: Scientific Validation Infrastructure
- [ ] Add seeded RNG to enable reproducible multi-run experiments
- [ ] Add multi-run test harness (run N simulations, aggregate results)
- [ ] Add outcome recorder (per-run CSV export: deaths by ICD, LOS per encounter, bed occupancy time series)
- [ ] Add learning toggle (freeze/disable agent learning for control experiments)

## Add to Epic VI — Polish & Infrastructure

### Milestone 6.3: Experimental Instrumentation
- [ ] Add per-tick outcome snapshot for time-series analysis
- [ ] Expose action ranking distribution via API

---

## Rationale

1. **Milestone 2.5** addresses the two largest model artifacts identified by Research OC: unrealistically short LOS and undocumented mortality provenance. These are calibration tasks, not implementation features.

2. **Milestone 2.6** is the prerequisite for all statistical analysis. Without seeded RNG, multi-run experiments produce non-comparable results. This is instrumentation for science, not a code feature.

3. The existing Milestone 1.4 ("Tune admission/discharge rates so all 95 beds are not permanently saturated") should be re-evaluated: the root cause may be LOS (2.5), not admission/discharge rates.
