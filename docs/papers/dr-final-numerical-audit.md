# DR Prelude Paper — Final Numerical Consistency Audit

**Date:** 2026-09-08
**Status:** PASSED
**Auditor:** Coordinator

---

## Audit Method

Searched the entire manuscript for every numerical claim. Verified each against canonical source code. Checked for stale values from pre-revision versions.

---

## Numerical Values

| Value | Claimed | Source | Manuscript locations | Correct? |
|-------|---------|--------|---------------------|----------|
| Snapshot interval | 100 ticks | `journal.ts:323` (`SNAPSHOT_INTERVAL = 100`) | Abstract, §3, §5 | ✅ |
| Journal retention | 100 ticks | `journal.ts:130` (`JOURNAL_RETENTION_TICKS = 100`) | Abstract, §3, §5 | ✅ |
| Snapshot retention | 5 | `journal.ts:131` (`SNAPSHOT_RETENTION_COUNT = 5`) | §3, §5 | ✅ |
| Tick rate | ~24 sec/day at 60× | `clock.ts:36` (`tickIntervalMs = 1000`), `world.ts:92` (`createClock(60)`) | §3 | ✅ |
| Main-pipeline handlers | 38 | `world.ts:358-373` (HANDLER_SKIP, 38 entries) | Abstract, §3, §9 | ✅ |
| Beds | 55 | `state-store.ts:167-199` (BUILDING_LAYOUT sums to 55) | Abstract, §5 | ✅ |
| ICD-10 codes | 49 unique / 50 entries | `patient-generator.ts` (E11 duplicated) | Abstract, §1, §4.1 | ✅ |
| Drug formulary | 22 | Source code verified | Abstract, §1 | ✅ |
| Disaster types | 7 | `scenario.ts` | Abstract, §4.5 | ✅ |
| Departments | 9 | `state-store.ts` BUILDING_LAYOUT | Abstract, §4.2 | ✅ |
| E1 baseline runs | 10 × 1,000 ticks | `experiment-results/` | Abstract, §5, §6 | ✅ |
| Agent types | 3 | `agent/system.ts`, `agent/generator.ts` | §4.3 | ✅ |
| Specialty mapping | 14 | `agent/` types | §4.3 | ✅ |
| LOS average | 82.9 ticks (SD 10.4) | E1 experiment | Abstract, §5, §6 | ✅ |
| Deaths average | 4.3 (SD 1.9) | E1 experiment | Abstract, §5 | ✅ |
| Peak occupancy | 54.2/55 (99%) | E1 experiment | Abstract, §5 | ✅ |
| Disaster mortality | 82% higher (6.0 vs 3.3) | E1 experiment | Abstract, §6 | ✅ |
| Max LOS | 916–992 ticks | E1 experiment | §6 | ✅ |
| Encounters/run | ~780 | E1 experiment | §6 | ✅ |
| Lab orders | ~500 | E1 experiment | §6 | ✅ |
| Medication orders | ~500 | E1 experiment | §6 | ✅ |
| Surgery orders | ~100 | E1 experiment | §6 | ✅ |
| Source lines | 2,300+ | Codebase | §7 | ✅ |
| Modules | 54 | Codebase | §7 | ✅ |
| Test files | 17 | `tests/` | §7 | ✅ |
| Tests | 127 | `tests/` | §7 | ✅ |
| ADRs | 16 | `docs/` | §7 | ✅ |
| COD implausible | 19% | E1 experiment | §8 | ✅ |

---

## Stale Value Check

| Old value | Still present? | Corrected to |
|-----------|----------------|--------------|
| 20-tick snapshot | ❌ No | 100 ticks |
| 133 beds | ❌ No | 55 beds |
| 35 handlers | ❌ No | 38 handlers |
| 24 minutes/day | ❌ No | ~24 seconds/day at 60× |
| Append-only journal | ❌ No | Bounded rolling window |
| "50 ICD-10 diagnoses" | ❌ No | "49 unique codes across 50 entries" |
| "digital twin" | ❌ No | Removed |
| "30+ roles" | ❌ No | Removed |
| "realistic" | ❌ No | "contextualized" |

**No stale values remain in the manuscript.**

---

## Verdict: ALL NUMERICAL VALUES CONSISTENT AND CORRECT
