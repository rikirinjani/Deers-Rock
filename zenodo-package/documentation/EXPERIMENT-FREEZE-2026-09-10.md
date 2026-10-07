# Deers Rock — Experiment Data Freeze Record

**Date:** 2026-09-10
**Status:** FROZEN — no reruns, no parameter changes, no seed changes
**Repository:** `github.com/rikirinjani/Deers-Rock`
**Git commit:** `5884ba39729768693bb91dfd796d8fe2e246ea68`

---

## Frozen study: E1 baseline (10 seeds × 1,000 ticks)

| Artifact | Bytes | SHA-256 |
|---|---|---|
| `experiment-results/experiment-2026-06-28T18-23-06-472Z-summary.json` | 5,452 | `FEF00F4737495A278084D641A45F057DFB22DB2C2E8D546235ED29058691DB33` |
| `experiment-results/experiment-2026-06-28T18-23-06-472Z.csv` | 1,068 | `C028183E5FA6F34DD8861B1757D5B187962715FA386626731489EFF8D1CCA3AC` |

## Configuration

- Seeds: 0–9 (10 runs)
- Duration: 1,000 ticks each (1 tick = 1 simulated minute)
- Initial patients: 50
- Hospital layout: the pre-`6947c57` default = **133 beds** (VVIP/VIP 12, Internal Medicine 30, Surgery 20, Pediatrics 10, OBGYN 10, ICU 10, Telemetry 15, Cardiology 10, Neurology 8, Pulmonology 8, NICU 6, PICU 6)
- Disaster scenario engine: stochastic (not forced)

## Frozen results

| Metric | Value |
|---|---|
| Mean length of stay | 82.9 ticks (SD 10.4; 95% CI ±6.4; range 67–103) |
| Mean deaths per run | 4.3 (SD 1.9; 95% CI ±1.2; range 1–7) |
| Mean peak bed occupancy | 130.9 of 133 beds (98%; SD 2.4; range 126–133) |
| Disaster-triggered runs | 2 of 10 (seeds 3, 7) |
| Deaths, disaster vs non-disaster | 5.5 vs 4.0 per run (descriptive, not controlled) |

## Statement

The artifacts above are the frozen reference evidence for the Deers Rock JAMIA manuscript. They were **not** regenerated, re-parameterised, or re-seeded. The historical 133-bed configuration is retained because it is the configuration that produced the reported E1 result; the current code's later 131-bed default is a subsequent drift and is not substituted.

**Note:** the frozen `docs/papers/dr-evidence-matrix.md` (C10) still records the superseded disaster figures (3/10; 6.0 vs 3.3); the manuscript and this freeze record use the E1-artifact-supported values (2/10; 5.5 vs 4.0). The evidence matrix was intentionally not modified.
