# CODEX ↔ Deers-Rock Integration Review — Recommendations

**Author:** Agnes (Sapiens AI)  
**Date:** 2026-10-05  
**Context:** After building `DeersRockClient` adapter and running it against expanded DR (ADR-010–013, ~1,844 charts at tick 5700)

---

## Summary

The adapter works cleanly on the three endpoints it targets (`/api/encounters`, `/api/patients`, `/api/charts`). The data model maps well: diagnosis codes, ICD-9-CM procedures, LOS, care type, and hospital class all transfer correctly. INACBG parity verified (I10 → K-1-01-I / 5,000,000).

However, the integration reveals **five gaps** that make the adapter clinically incomplete and break any downstream grouper that relies on outcomes or severity data.

---

## Gaps & Recommendations

### P0 — Critical (adapter produces clinically false data)

#### 1. No outcome on encounters

**Problem:** Every discharged encounter maps to `'sembuh'` (recovered). There is no `outcome` field on the encounter record. DR tracks mortality in `state.morgue` and `experiment/runner.ts` computes `totalDeaths`, but individual encounters never know whether the patient died, was referred, recovered, or transferred.

**Impact:** A dead patient and a walked-out patient produce identical `GrouperInput`. Any grouper consuming this data will misclassify severity and potentially tariff.

**Recommendation:** Add an `outcome` field to encounters, populated from `morgue` on discharge:
```ts
interface DeersRockEncounter {
  // ... existing fields ...
  outcome?: 'sembuh' | 'dirujuk' | 'meninggal' | 'transfer' | 'lari';
}
```
In `engine/outcome-tracker.ts` or similar, write the outcome back to the encounter record (or a lookup map) when a patient dies or is discharged non-fatal.

---

#### 2. ADR-014 FHIR endpoints documented but not implemented

**Problem:** `docs/adr/ADR-014-hospital-testbed.md` describes Condition, Claim, Encounter search, Metadata, and `$export` endpoints. Only Patient and Observation are wired up in `src/api/rest.ts`. Every other endpoint returns `{"error":"no route for GET /api/fhir/X"}`.

**Impact:** The "hospital app testbed" claim in the ADR is false. Any client relying on these endpoints will get 404s.

**Recommendation:** Either implement the missing endpoints per ADR-014 spec, or revert the ADR status to `Draft` until they are wired. Prioritize Condition and Metadata at minimum — Claim requires finance data that may still be evolving.

---

### P1 — Important (severely limits adapter usefulness)

#### 3. No severity-supporting clinical data

**Problem:** `GrouperInput` has a `supportingData?` field (ICU days, ventilator days, pressor use) that drives INA-CBG severity escalation. DR has `respiratory.ts` with ventilator settings, but this never surfaces per-encounter. Multi-diagnosis charts that should escalate severity produce identical grouper output to single-diagnosis charts of the same primary code.

**Impact:** INACBG group can't distinguish K-1-01-I from K-1-01-II because the grouper can't see supportive care. Tariff accuracy degrades.

**Recommendation:** Expose `icuDays: number` and `ventilatorDays: number` on encounters or charts. Populate from `respiratory.ts` and nursing knowledge when applicable.

#### 4. No query filters on list endpoints

**Problem:** `/api/encounters` and `/api/charts` return all records — no `status`, `type`, `limit`, or date-range filters. Dataset grew from ~300 charts (Oct 2) to ~1,844 (Oct 5) with no bounds. Live E2E test went from 1s to 38s.

**Impact:** Clients can't scope queries. Performance degrades linearly with run time. Tests are fragile.

**Recommendation:** Add optional query params:
```
GET /api/encounters?status=discharged&type=inpatient&limit=100&since=1000000
GET /api/charts?encounterId=E1&limit=50
```

#### 5. No readmission tracking

**Problem:** Discharged patients can re-enter, but there's no flag indicating prior admission history on the encounter record.

**Impact:** Quality metrics (30-day readmission rate) and groupers that penalize readmissions can't be computed.

**Recommendation:** Add `readmissionWithin30d: boolean` (or similar) to discharged encounters. Track via patient-level admission history in `stateStore`.

---

### P2 — Nice to have

| # | Recommendation | Rationale |
|---|---------------|-----------|
| 6 | Add explicit `lengthOfStay: number` on encounters | Avoids client-side `ceil(spanMs/86400000)` derivation; one source of truth |
| 7 | Add `/api/outcomes?icd=I10` returning mortality stats per-ICD | Currently only accessible via experiment runner CSV — no REST endpoint |
| 8 | Fix issue #4 (CPU scaling in aiDoctor dedup) | O(n²) per-tick cost makes long runs impractical; ADR-004 validation already flagged it |

---

## Test Results (2026-10-05)

| Metric | Value |
|--------|-------|
| CODEX TSC | 0 errors |
| CODEX Lint | 0 warnings |
| Adapter unit tests | 11/11 pass |
| Adapter live E2E | 14/14 pass (38s vs DR box at tick 5700) |
| ADR-013 mapper tests (new) | 3/3 pass |
| Full CODEX suite | 394 pass, 1 skip, 17 suites |
| DR tsc | 0 errors |

**Commit:** `110c3fa` on `rikirinjani/codex-interpretum`

---

## What the Adapter Needs (for full clinical validity)

1. **`outcome` on encounters** — non-negotiable for any grouper that cares about severity
2. **`icuDays` / `ventilatorDays` on encounters or charts** — needed for severity escalation
3. **Query filters on list endpoints** — needed for performance and test stability
4. **ADR-014 endpoints wired up** — needed for the "test-bed" claim to be true
5. **Readmission flag** — needed for quality metrics

Without #1, the adapter is a best-effort mapping that pretends every discharged patient recovered. Everything else is incremental.
