# Deers Rock — Sentinel Output Audit

**Date:** 2026-08-31 · Method: code inspection (deers-rock-adapter.ts) + end-to-end probes.

## The output contract

`HospitalSentinelOutput` (deers-rock-adapter.ts:26-37): `{ tick, hospitalId, city, occupancyRate, icuOccupancyRate, mortalityPressure, diseasePrevalence, supplyStress, staffStress, admissionSurge }`

## Field-by-field audit

| Field | Definition (code) | Source | Calculation | Temporal aggregation | Baseline | Variance | Sensitivity to macro intervention |
|---|---|---|---|---|---|---|---|
| `occupancyRate` | occupied / total capacity | `extractOccupancy` (adapter:67-86): counts `state.beds.values()` where `bed.patientId` truthy | `occ.total / occ.capacity` (adapter:112); capacity = Σ wardCapacity | Point-in-time snapshot at end of world tick (after `ticksPerDay` DR steps) | Probe: 0.4046 (30 patients, tick 20) | Seed-dependent | **NONE** — byte-identical with/without EXTREME_WEATHER/WAR (probe: 0/20 ticks differ) |
| `icuOccupancyRate` | ICU+PICU+NICU occupied / capacity | same `extractOccupancy` (adapter:77-79, 83) | `occ.icu / occ.icuCapacity` (adapter:113) | point-in-time | Probe: 0 (no ICU patients in 200 DR ticks) | seed-dependent | NONE |
| `mortalityPressure` | `morgue.length` — a COUNT, not a rate | adapter:101 (`(state as any).morgue instanceof Array ? .length : 0`) | raw count | cumulative (morgue never drains during 20-tick runs) | 0 in probes | seed-dependent | NONE |
| `diseasePrevalence` | top-5 ICD counts over `state.encounters` | `extractDiseasePrevalence` (adapter:88-96) | `enc.primaryDiagnosis || "UNKNOWN"` per encounter, count, sort desc, top 5 | point-in-time | **ALWAYS `{UNKNOWN: n}`** — DR encounters never carry `primaryDiagnosis` (markov.ts:74-82 sets none) | constant shape | NONE — structurally dead output |
| `supplyStress` | **HARDCODED 0.3** | adapter:103 `const supplyStress = 0.3;` | constant | n/a | 0.3 always | ZERO variance by construction | **NONE** — not a measurement |
| `staffStress` | `min(1, activeEncounters / (wardCapacityKeys × 3))` | adapter:106 | formula on live encounter count | point-in-time | 1.0 in probes (encounters >> 3×wardKeys) | seed-dependent | NONE |
| `admissionSurge` | boolean: occupied > 90% capacity | adapter:118 (`occ.total > occ.capacity * 0.9`) | threshold on live occupancy | point-in-time | false in probes | seed-dependent | NONE |

## Output classification

| Output | Class | Evidence |
|---|---|---|
| `occupancyRate` | **operational proxy** — real state, no external validation | live formula, deterministic |
| `icuOccupancyRate` | operational proxy | live formula |
| `mortalityPressure` | **simulation-only metric** — a raw count masquerading as "pressure"; no denominator, no rate, not a clinical measure | morgue.length |
| `diseasePrevalence` | **broken** — always UNKNOWN due to missing primaryDiagnosis on encounters | adapter:91 + markov.ts:74-82 |
| `supplyStress` | **simulation-only constant** — not a measurement | adapter:103 |
| `staffStress` | operational proxy (raw formula, uncalibrated) | adapter:106 |
| `admissionSurge` | operational proxy (threshold boolean) | adapter:118 |

## Verdict

**No sentinel output is "clinically meaningful" or "clinically validated" — there is zero evidence of clinical validation.** Two are honest operational proxies (occupancy, ICU occupancy), two are formulas with arbitrary constants (staffStress, admissionSurge), one is a count mislabeled as a pressure (mortalityPressure), one is a hardcoded constant (supplyStress), and one is structurally broken (diseasePrevalence → always UNKNOWN). **None responds to macro interventions** — the adapter end-to-end probe showed byte-identical sentinel output across baseline / EXTREME_WEATHER / EXTREME_WEATHER+WAR runs.

The output contract is real; the outputs are either inert or unresponsive because the macro channel feeding them is inert.
