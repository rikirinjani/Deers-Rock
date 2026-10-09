# CODEX ↔ Deer's Rock: E2E Integration Report

**Date:** 2026-10-09  
**Context:** Integration review of `codex-interpretum` adapter against Deer's Rock simulation platform  
**Commit Reference:** `8a3f9de` (integration review), `8c2900c` (STATE.md adapter review)

---

## 1. Overview

CODEX Interpretum built a `DeersRockClient` adapter to consume Deer's Rock simulation data for clinical coding validation and INA-CBG grouper testing. The adapter targets three core REST endpoints to extract encounter, patient, and chart data, then maps it to a `GrouperInput` schema for downstream billing validation.

---

## 2. APIs Used by CODEX

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/encounters` | GET | Fetch all encounters with diagnosis, LOS, care type |
| `/api/patients` | GET | Fetch patient demographics (NIK, age, gender, blood type) |
| `/api/charts` | GET | Fetch clinical charts with ICD-10 diagnoses, procedures |
| `/api/fhir/Patient` | GET | FHIR Patient resource (supplementary) |
| `/api/fhir/Observation` | GET | FHIR Observation resource (supplementary) |

**Authentication:** API key via `Authorization: Bearer <key>` header (live E2E test lacked this — noted as finding #2 in review).

---

## 3. Process Executed

### 3.1 Adapter Build & Unit Tests
```bash
cd codex-interpretum
npm install
npm run build      # TypeScript compile
npm test           # 394 pass, 1 skip, 17 suites
```

**Result:** ✅ 0 TSC errors, 0 lint warnings, all adapter tests pass.

### 3.2 Live E2E Against DR (tick ~5700)
- Deployed DR on Tencent box `43.134.18.195:3000` (Cloudflare Access protected)
- Ran `DeersRockClient` against live endpoint
- Extracted ~1,844 charts at tick 5700
- Verified `GrouperInput` mapping: ICD-10 codes, procedures (ICD-9-CM), LOS, care type, hospital class

**Result:** ✅ 14/14 E2E tests pass (38s runtime vs DR box).

### 3.3 INA-CBG Parity Verification
- Mapped DR diagnosis `I10` (Essential hypertension) → CBG group `K-1-01-I`
- Verified tariff band: 5,000,000 IDR
- Confirmed parity between DR's internal tariff lookup and CODEX's grouper input

**Result:** ✅ Parity verified.

---

## 4. Findings (8 Recommendations)

### P0 — Critical

#### 1. No Outcome on Encounters
**Problem:** Every discharged encounter maps to `'sembuh'` (recovered). No outcome field distinguishes death, referral, transfer, or self-discharge.

**Impact:** Dead patients and recovered patients produce identical `GrouperInput`. Any severity-based grouper will misclassify.

**Recommendation:** Add `outcome?: 'sembuh' | 'dirujuk' | 'meninggal' | 'transfer' | 'lari'` to encounters, populated from `state.morgue` on discharge.

#### 2. ADR-014 FHIR Endpoints Not Implemented
**Problem:** ADR-014 documents Condition, Claim, Encounter search, Metadata, and `$export` endpoints. Only Patient and Observation are wired in `src/api/rest.ts`.

**Impact:** Clients get `{"error":"no route for GET /api/fhir/X"}` for all other FHIR resources.

**Recommendation:** Implement missing endpoints or revert ADR-014 status to `Draft`.

### P1 — Important

#### 3. No Severity-Supporting Clinical Data
**Problem:** `GrouperInput.supportingData` (ICU days, ventilator days, pressor use) drives INA-CBG severity escalation. DR has `respiratory.ts` but never exposes per-encounter.

**Impact:** Groupers can't distinguish K-1-01-I from K-1-01-II. Tariff accuracy degrades.

**Recommendation:** Expose `icuDays: number` and `ventilatorDays: number` on encounters.

#### 4. No Query Filters on List Endpoints
**Problem:** `/api/encounters` and `/api/charts` return all records — no `status`, `type`, `limit`, or date-range filters.

**Impact:** Dataset grew from ~300 to ~1,844 charts; E2E test went from 1s to 38s. Linear degradation.

**Recommendation:** Add query params: `?status=discharged&type=inpatient&limit=100&since=1000000`

#### 5. No Readmission Tracking
**Problem:** Discharged patients can re-enter, but no flag indicates prior admission history.

**Impact:** Quality metrics (30-day readmission rate) and readmission-penalty groupers can't compute.

**Recommendation:** Add `readmissionWithin30d: boolean` to discharged encounters.

### P2 — Nice to Have
- Add explicit `lengthOfStay: number` on encounters
- Add `/api/outcomes?icd=I10` for mortality stats per-ICD
- Fix CPU scaling in `aiDoctor.ts` (O(n²) per-tick dedup)

---

## 5. Test Results Summary

| Metric | Value |
|--------|-------|
| CODEX TSC | 0 errors |
| CODEX Lint | 0 warnings |
| Adapter unit tests | 11/11 pass |
| Adapter live E2E | 14/14 pass (38s @ tick 5700) |
| ADR-013 mapper tests | 3/3 pass |
| Full CODEX suite | 394 pass, 1 skip, 17 suites |
| DR tsc | 0 errors |

**Commit:** `110c3fa` on `rikirinjani/codex-interpretum`

---

## 6. What Codex Got

### Successful Data Extraction
- ✅ 1,844 charts with ICD-10 diagnoses
- ✅ Patient demographics (NIK, age, gender, blood type, religion, marital status)
- ✅ Encounter metadata (type, status, tickIn, tickOut, LOS)
- ✅ Procedure codes (ICD-9-CM)
- ✅ Care type and hospital class mapping

### INA-CBG Grouper Input
```typescript
interface GrouperInput {
  diagnosis: string;           // ICD-10 code (e.g., "I10")
  procedures: string[];        // ICD-9-CM codes
  los: number;                 // length of stay in days
  careType: 'inpatient' | 'outpatient';
  hospitalClass: 'A' | 'B' | 'C' | 'D';
  supportingData?: {           // ⚠️ NOT POPULATED (gap #3)
    icuDays?: number;
    ventilatorDays?: number;
    pressorUse?: boolean;
  };
}
```

### Verification Result
- I10 → K-1-01-I / 5,000,000 IDR: ✅ Correct
- Severity escalation logic: ❌ Cannot test (no supporting data)
- Outcome-based tariff adjustment: ❌ Cannot test (no outcome field)

---

## 7. Blocking Issues for Production

| # | Issue | Severity | Blocker? |
|---|-------|----------|----------|
| 1 | No outcome on encounters | P0 | ✅ Yes — falsifies grouper output |
| 2 | ADR-014 endpoints not implemented | P0 | ⚠️ Partial — FHIR read works, search/export broken |
| 3 | No severity-supporting data | P1 | ✅ Yes — prevents severity escalation testing |
| 4 | No query filters | P1 | ⚠️ Performance — manageable at small scale |
| 5 | No readmission tracking | P1 | ❌ No — quality metric only |

**Without #1 and #3, the adapter is a best-effort mapping that pretends every discharged patient recovered.**

---

## 8. Next Steps

1. **Add `outcome` field to encounters** — critical for clinical validity
2. **Expose `icuDays` / `ventilatorDays` from `respiratory.ts`** — needed for severity
3. **Implement query filters on `/api/encounters` and `/api/charts`** — performance
4. **Complete ADR-014 endpoints** — Condition, Claim, Encounter search, Metadata
5. **Add API key support to live E2E test** — security

---

## 9. References

- Integration review: `CODEX-ADR-INTEGRATION-RECS.md`
- STATE.md entry: `8c2900c` (2026-10-02)
- ADR-014 (hospital testbed): `docs/adr/ADR-014-hospital-testbed.md`
- ADR-015 (finance claims): `docs/adr/ADR-015-finance-claims-architecture.md` (mentions Codex coding-drill consumer)
- CODEX repo: `rikirinjani/codex-interpretum` (commit `110c3fa`)
