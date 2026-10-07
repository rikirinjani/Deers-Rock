# DR Prelude Paper — Factual Reconciliation (Handler Count)

**Date:** 2026-09-08
**Status:** RESOLVED
**Auditor:** Coordinator

---

## 1. Handler Count Discrepancy

### Source of discrepancy

| Report | Claimed count | Counting rule |
|--------|---------------|---------------|
| Adversarial review | 42 | "39 in chain + 3 post-chain" |
| Revision report | 38 | HANDLER_SKIP entries only |
| Manuscript | 38 | "38 handler functions" in main pipeline |

### Independent count from canonical source

**Source:** `world.ts:358-373`, HANDLER_SKIP array

PowerShell regex count of `[\w+Handler, \d+]` patterns in HANDLER_SKIP: **38 entries**.

Verified by manual enumeration:

| # | Handler | Skip |
|---|---------|------|
| 1 | admissionHandler | 1 |
| 2 | outpatientHandler | 3 |
| 3 | newPatientHandler | 15 |
| 4 | agentHandler | 1 |
| 5 | referralHandler | 15 |
| 6 | scenarioHandler | 5 |
| 7 | emergencyHandler | 1 |
| 8 | labHandler | 1 |
| 9 | aiClinicalPharmacyHandler | 2 |
| 10 | aiNurseHandler | 1 |
| 11 | aiDoctorHandler | 4 |
| 12 | radiologyHandler | 2 |
| 13 | surgeryHandler | 3 |
| 14 | respiratoryHandler | 2 |
| 15 | dietaryHandler | 3 |
| 16 | socialWorkHandler | 5 |
| 17 | bloodBankHandler | 5 |
| 18 | microbiologyHandler | 5 |
| 19 | pathologyHandler | 5 |
| 20 | cssdHandler | 5 |
| 21 | biomedHandler | 5 |
| 22 | ipcHandler | 5 |
| 23 | clinicalNutritionHandler | 3 |
| 24 | radiotherapyHandler | 5 |
| 25 | dialysisHandler | 5 |
| 26 | centralSupplyHandler | 3 |
| 27 | medicalRecordsHandler | 3 |
| 28 | specialtyHandler | 2 |
| 29 | billingHandler | 5 |
| 30 | edCashierHandler | 3 |
| 31 | inpatientCashierHandler | 5 |
| 32 | outpatientCashierHandler | 5 |
| 33 | vitalsUpdateHandler | 1 |
| 34 | icdTrackerHandler | 10 |
| 35 | outcomeHandler | 1 |
| 36 | learningHandler | 10 |
| 37 | cleanupHandler | 10 |
| 38 | aiOutpatientPharmacyHandler | 3 |

### Post-chain handlers (outside main pipeline)

| # | Handler | Location |
|---|---------|----------|
| 39 | medAdminHandler | world.ts:317 |
| 40 | orderCompleteHandler | world.ts:318 |
| 41 | runMmConference | world.ts:320 |

### Event-dispatch handlers (triggered by queue events, not in pipeline)

| # | Handler | Trigger |
|---|---------|---------|
| 42 | labResultHandler | "lab_result" event |
| 43 | radResultHandler | "rad_result" event |
| 44 | edDischargeHandler | "ed_discharge" event |
| 45 | surgeryResultHandler | "surgery_done" event |

### Adversarial review error

The adversarial review claimed "39 entries" in HANDLER_SKIP. The actual count is **38**. The review miscounted by 1, then added 3 post-chain to get 42. The correct figures are:
- HANDLER_SKIP: **38**
- Post-chain: **3**
- Event-dispatch: **4**
- Total distinct handler functions: **45**

### Correct count for manuscript

The manuscript describes the **main tick pipeline** — the handlers that execute in order every tick via `for (const handler of world.handlers)` (world.ts:313-314). This is the HANDLER_SKIP array. The correct count is **38**.

Post-chain and event-dispatch handlers are separate execution paths. They are not part of the pipeline described in the manuscript. Including them would conflate different architectural concepts.

---

## 2. Verification of Other 4 Factual Corrections

| Fact | Manuscript claim | Source verification | Status |
|------|------------------|---------------------|--------|
| Snapshot interval | 100 ticks | `journal.ts:323` (`SNAPSHOT_INTERVAL = 100`) | ✅ CORRECT |
| Journal behavior | Bounded rolling window, 100-tick retention | `journal.ts:130` (`JOURNAL_RETENTION_TICKS = 100`), `journal.ts:178-198` (`journalPurge()`) | ✅ CORRECT |
| Tick rate | ~24 seconds/day at 60×, configurable | `clock.ts:36` (`tickIntervalMs = 1000`), `world.ts:92` (`createClock(60, clockSeed)`) | ✅ CORRECT |
| Bed count | 55 | `state-store.ts:167-199` (BUILDING_LAYOUT sums to 55) | ✅ CORRECT |

All 5 factual corrections are verified against canonical source.

---

## 3. Files Requiring Correction

**None.** The manuscript already uses "38 handler functions" consistently. The adversarial review's "42" was based on a miscount of HANDLER_SKIP (claimed 39, actual 38) plus inclusion of post-chain handlers not in the main pipeline.

---

## 4. Consistency Check Across Artifacts

| Artifact | Handler count | Consistent? |
|----------|---------------|-------------|
| Manuscript (dr-prelude-draft.md) | "38 handler functions" (§3), "38 domain handlers" (Abstract), "38 independent handlers" (§9) | ✅ |
| Evidence matrix (dr-evidence-matrix.md) | "38 independent handlers" (C3) | ✅ |
| Revision report (dr-revision-report.md) | "38 handlers in HANDLER_SKIP array" | ✅ |
| Post-revision audit (dr-post-revision-audit.md) | "38 handlers in HANDLER_SKIP" | ✅ |

All artifacts are consistent.

---

## 5. Final Statement

**The DR manuscript is now factually consistent.** All 5 corrections from the original adversarial review are verified against canonical source:

1. ✅ Snapshot interval = 100 ticks
2. ✅ Journal = bounded rolling retention (100 ticks)
3. ✅ Clock ≈ 24 seconds/day at 60×, configurable
4. ✅ Handler count = 38 (HANDLER_SKIP entries in main pipeline)
5. ✅ Beds = 55

The handler count discrepancy (38 vs 42) is resolved: the manuscript correctly counts the 38 handlers in the main tick pipeline. The adversarial review's "42" included post-chain and event-dispatch handlers that are architecturally distinct from the pipeline described in the paper.

**The DR manuscript is frozen and factually correct.**
