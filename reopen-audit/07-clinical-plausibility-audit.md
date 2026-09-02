# Deers Rock — Clinical Plausibility Audit

**Date:** 2026-08-31 · Purpose: separate CLINICAL REALISM from SIMULATION CONSISTENCY.

## Principle

A simulation can be internally deterministic without being clinically valid. Every major
DR mechanism is assessed on: real-world basis, calibration, direction plausibility,
magnitude plausibility, external reference data.

## Mechanism-by-mechanism

| Mechanism | Real-world basis | Calibrated? | Direction plausible? | Magnitude plausible? | External reference data? | Category |
|---|---|---|---|---|---|---|
| Patient generation (demographics/identity) | NIK/Indonesian identity, age ranges | No — ADR-004: weights "arbitrary" | Broadly | Unverified; age uses wall-clock `getFullYear()` | None cited in code | **Synthetic** |
| Admission/discharge Markov process | ED→inpatient flow pattern | No; LOS 4320-10080 ticks (3-7 days) is a chosen constant | Yes | ED stay 1-3 days vs inpatient 3-7 days plausible | None in code; Kaggle dataset noted as deferred (git 85b3119) | **Synthetic, direction-plausible** |
| Diagnosis generation | Closed ICD-10 list (generator.ts:20-71) | No | — | — | None | **Synthetic** |
| Medication orders | Pharmacy formulary + AI pharmacy review | No | Yes | Unverified | None | **Synthetic** |
| Laboratory orders/results | Lab panels with result generation | No | Yes | Unverified | None | **Synthetic** |
| Mortality risk (assessMortalityRisk) | ADR-004 cites Indonesian sepsis IHM 25-40% (high), pneumonia 5-15% (mod), hypertension 0.5-2% (low) | **Partially** — thresholds aligned to cited ranges but NOT fitted; E2 sensitivity test found NO monotonic response to risk parameter (all CIs overlap) | Yes | Aligned to cited literature ranges by hand | ADR-004 literature ranges only; no validation dataset | **Synthetic with literature-anchored thresholds** |
| Disaster scenario effects | Surge multipliers, mortalityBoost, supply/staff shortages | No — SCENARIO_DEFS constants chosen by hand | Yes | Unverified; scenario death roll 0.02-0.35 arbitrary | None | **Synthetic** |
| CSSD/sterilization cycles | Real process (surgical instrument reprocessing) | No | Yes | Unverified; 5-tick cadence chosen | None | **Synthetic, operationally-shaped** |
| Dialysis sessions | Real renal replacement scheduling | No | Yes | Unverified | None | **Synthetic** |
| Supply chain stress | Real procurement/replenishment | No | Yes | Unverified | None | **Synthetic** |
| ICU occupancy | Real intensive care model | No; ICU capacity derived from wardCapacity sums | Yes | Probe: 0 ICU patients in 200 ticks — ICU rarely populated | None | **Synthetic** |
| Disease prevalence (sentinel) | Should reflect circulating diagnoses | **BROKEN** — always {UNKNOWN:n}; encounters never carry primaryDiagnosis | ❌ no | n/a | None | **Broken output** |

## Headline questions (brief §11)

1. **Is there a real-world basis?** Only mortality thresholds (ADR-004 literature ranges) and the Indonesian identity/context. Everything else is hand-chosen constants.
2. **Is the relationship calibrated?** No. The only calibration attempt (E2 mortality sensitivity) found the parameter insensitive; the calibration reference file flags gaps OPEN; the Kaggle dataset is deferred.
3. **Is it merely synthetic?** Yes — the simulation is an internally consistent rules engine, not a data-fitted model.
4. **Direction plausible?** Mostly yes (disasters increase admissions, etc.) — but untestable at the macro channel because the adapter is inert.
5. **Magnitude plausible?** Unverified everywhere; several magnitudes are arbitrary by admission (e.g., scenario death-roll probabilities).
6. **External reference data?** None wired into code. ADR-004 cites literature ranges for mortality only.

## Verdict

**DR is a simulation-consistent synthetic model, NOT a clinically validated one.**

- **Clinical realism:** not established for any mechanism beyond hand-alignment of mortality thresholds to literature ranges. Cannot claim "realistic hospital."
- **Simulation consistency:** established — deterministic, internally coherent dynamics.
- The likely scientific claim is architectural (see 06-scientific-claim-audit.md): a standalone
  deterministic healthcare microsimulation participating in a macro environment through an
  explicit adapter. The evidence supports that claim **as a systems/architecture claim**,
  NOT as a clinical or predictive claim.

## Required honesty in any paper

- Label every mechanism "synthetic/heuristic; not calibrated to external data."
- Remove all distributional claims (LOS, deaths, occupancy rates) as model outputs unless
  explicitly framed as simulation-internal statistics, not empirical predictions.
- State plainly: "no clinical validation was performed; no external dataset was used."
