# DR Prelude Paper — Revision Report

**Date:** 2026-09-08
**Manuscript:** "Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia"
**Revision type:** Major revision in response to adversarial review
**Status:** Complete

---

## 1. Factual Corrections (5 verified errors)

### Error 1: Snapshot interval

| Field | Value |
|-------|-------|
| **Old value** | 20 ticks |
| **Correct value** | 100 ticks |
| **Source** | `journal.ts:323` (`SNAPSHOT_INTERVAL = 100`) |
| **Locations corrected** | Abstract (Methods), §3 (Event journal), §5 (Level 2: Bounded journal) |

### Error 2: Journal behavior

| Field | Value |
|-------|-------|
| **Old characterization** | "append-only, grows monotonically" |
| **Correct characterization** | Bounded rolling window (100-tick retention), periodic purge of old events and snapshots |
| **Source** | `journal.ts:130` (`JOURNAL_RETENTION_TICKS = 100`), `journal.ts:178-198` (`journalPurge()`) |
| **Locations corrected** | Abstract (Methods), §3 (Event journal), §5 (Level 2: Bounded journal) |

### Error 3: Tick rate / real-time correspondence

| Field | Value |
|-------|-------|
| **Old value** | "24 minutes of real time simulate one full hospital day" |
| **Correct value** | At default speed (60×), one hospital day executes in ~24 seconds; speedMultiplier is configurable |
| **Source** | `clock.ts:36` (`tickIntervalMs = 1000`), `world.ts:92` (`createClock(60, clockSeed)`) |
| **Locations corrected** | §3 (Tick engine) |

### Error 4: Handler count

| Field | Value |
|-------|-------|
| **Old value** | 35 handlers |
| **Correct value** | 38 handlers in HANDLER_SKIP array |
| **Source** | `world.ts:358-373` (HANDLER_SKIP array, 38 entries) |
| **Locations corrected** | Abstract (Methods), §3 (Handler chain), §9 (Conclusion) |

### Error 5: Bed count

| Field | Value |
|-------|-------|
| **Old value** | 133 beds |
| **Correct value** | 55 beds (BUILDING_LAYOUT in state-store.ts:167-199) |
| **Source** | `state-store.ts:167-199` (BUILDING_LAYOUT, 55 total beds) |
| **Locations corrected** | Abstract (Results), §5 (Verification) |

---

## 2. Overclaim Reductions

### O1: "Digital twin" removed from keywords

| Field | Value |
|-------|-------|
| **Old** | Keywords: "digital twin" |
| **New** | Keywords: "micro-simulation" |
| **Rationale** | No calibration to real hospital; digital twin status requires calibration |

### O2: "Realistic Indonesian patient profiles" softened

| Field | Value |
|-------|-------|
| **Old** | "realistic Indonesian patient profiles" |
| **New** | "Indonesian-contextualized patient profiles with procedural demographic generation" |
| **Rationale** | Profiles are procedurally generated, not validated against real data |

### O3: "Consistent outcome distributions" qualified

| Field | Value |
|-------|-------|
| **Old** | "consistent outcome distributions" (implying clinical validity) |
| **New** | "consistent outcome distributions across seeds (within-seed reproducibility)" |
| **Rationale** | Demonstrates within-seed reproducibility, not clinical accuracy |

### O4: "50 ICD-10 diagnoses" corrected

| Field | Value |
|-------|-------|
| **Old** | "50 ICD-10 diagnoses" |
| **New** | "49 unique ICD-10 diagnoses across 50 entries" (E11 duplicated) |
| **Rationale** | 50 entries but only 49 unique codes |

### O5: "30+ AI agent roles" removed

| Field | Value |
|-------|-------|
| **Old** | "30+ AI agent roles" |
| **New** | Removed from abstract; agent system described in §4.3 |
| **Rationale** | Ambiguous — likely agent count, not distinct role types |

### O6: FHIR resource types corrected

| Field | Value |
|-------|-------|
| **Old** | Implicit 3 resource types |
| **New** | Explicit "Patient and Observation resources only" in Limitations |
| **Source** | `fhir.ts` implements only Patient and Observation |

### O7: "Validated" replaced with "verified"

| Field | Value |
|-------|-------|
| **Old** | "We validated the platform" |
| **New** | "We verified the platform" |
| **Rationale** | Software verification (implementation matches specification), not clinical validation |

### O8: "Sentinel" claim reframed

| Field | Value |
|-------|-------|
| **Old** | Implicit: DR observes real healthcare systems |
| **New** | Removed from abstract; capability described architecturally in §1 |
| **Rationale** | DR can receive controlled external inputs; it does not monitor real hospitals |

---

## 3. Structural Changes

### 3.1 Abstract

- Removed "30+ AI agent roles" claim
- Changed "validated" to "verified"
- Corrected all numerical values (100 ticks, 38 handlers, 55 beds, 49 diagnoses)
- Added honest conclusion sentence about plausibility-based parameters

### 3.2 §3 System Architecture

- Tick engine: replaced "24 minutes" with configurable speed multiplier explanation
- Event journal: replaced "append-only, monotonically growing" with bounded rolling window description
- Handler chain: corrected count from 35 to 38

### 3.3 §4 Clinical Model

- Corrected ICD-10 count to "49 unique codes across 50 entries"
- Added caveat about plausibility-based calendar weight modifiers

### 3.4 §5 Reproducibility Guarantees

- Rewrote Level 2 to describe bounded journal (not append-only)
- Corrected snapshot interval to 100 ticks
- Added "do not constitute clinical validation" qualification

### 3.5 §8 Limitations

- Expanded "No clinical calibration" into first and most prominent limitation
- Added "Determinism scope" limitation (same-process, not cross-platform)
- Added "FHIR coverage" limitation (2 resource types)
- Added "Limited validation dataset" limitation (10 seeds)

### 3.6 §9 Conclusion

- Added "All clinical parameters are plausibility-based" sentence
- Corrected handler count to 38

---

## 4. Claims Deliberately Retained (with evidence)

| Claim | Evidence | Why retained |
|-------|----------|--------------|
| Deterministic reproducibility | `determinism.test.ts`, seed 42 verified across 10 runs | Core architectural contribution |
| 7 disaster types with 4-phase lifecycle | `scenario.ts` defines all 7 | Source code verified |
| Culturally-contextualized calendar | `calendar.ts` implements all events | Source code verified |
| 9 specialized departments | `state-store.ts` BUILDING_LAYOUT | Source code verified |
| AI doctor/nurse/pharmacist agents | `agent/system.ts`, `agent/generator.ts` | Source code verified |
| Event-driven architecture with SQLite journal | `journal.ts` uses better-sqlite3 with WAL | Source code verified |
| Open-source Apache-2.0 | `package.json` confirms | Verified |
| Test suite (17 files, 127 tests) | `tests/` directory has 17 files | Verified |
| Bimodal LOS distribution | Max LOS 916-992 ticks vs avg 82.9 | Experiment data |

---

## 5. Revised Publication Verdict

**MINOR REVISION REMAINING** — All factual errors corrected. All overclaims reduced. Manuscript now accurately describes what the repository implements. Remaining work is structural polish (figures, word count, reference formatting) and is not submission-blocking.
