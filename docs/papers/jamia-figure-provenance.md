# DR Figure Provenance

**Date:** 2026-09-10
**Manuscript:** `jamia-dr-submission.md` (Deers Rock)
**Statement:** No new experiment was performed to produce any figure. All values are already established in the manuscript or its cited E1 artifact.

| Figure | Manuscript section | Source data / evidence | Type | Generation method |
|---|---|---|---|---|
| 1. System architecture | §3 | Architecture described in §3 (tick engine, journal, 38-handler pipeline, snapshots/replay) | Schematic | Mermaid `flowchart TD` (`figures/figure-1-architecture.mmd`) |
| 2. Handler pipeline | §3 | 38-handler main pipeline vs post-chain vs event-dispatch (§3) | Schematic | Mermaid `flowchart LR` (`figures/figure-2-handler-pipeline.mmd`) |
| 3. Cultural calendar modifiers | §4.6 | Ramadan (+5, +4, +3) and Lebaran (burns +6, fractures +4); Lebaran 1.6× surge noted in caption only | Empirical (fixed model modifiers) | Mermaid `xychart-beta` (`figures/figure-3-calendar-modifiers.mmd`) |
| 4. Per-seed mean LOS | §5/§6 | E1 artifact `experiment-results/experiment-2026-06-28T18-23-06-472Z-summary.json`: per-seed `avgLosTicks` = 78, 67, 85, 81, 80, 78, 74, 88, 95, 103 | Empirical | Mermaid `xychart-beta` (`figures/figure-4-per-seed-los.mmd`) |

## Excluded legacy artifacts

| File | Reason for exclusion |
|---|---|
| `fig1-architecture.svg` | Stale labels: "35 handlers per tick" (correct = 38) and FHIR "Patient, Observation, Encounter" (correct = Patient + Observation only) |
| `fig2-los-histogram.png`, `fig2_los_histogram.py` | Fabricated: LOS values synthesized with `np.random` (exponential + uniform), not actual E1 records |
| `fig3-bed-occupancy.png`, `fig3_bed_occupancy.py` | Fabricated: occupancy synthesized as a logistic curve with `np.random` noise, not an actual E1 trajectory |

## Figure 4 data lock

The ten E1 per-seed mean LOS values (78, 67, 85, 81, 80, 78, 74, 88, 95, 103) are preserved exactly from the E1 artifact. They were not recomputed or replaced.

## Caption/body consistency

Figure numbers, captions, and in-text references agree (Figures 1–4 all referenced; no placeholders remain).
