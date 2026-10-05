# ADR-014: Deer's Rock as Hospital App Test-bed — Epic IV Completion

**Status:** Approved  
**Author:** OC  
**Date:** 2026-10-05  
**Supersedes:** None  
**Related:** ADR-010, ADR-011, ADR-012, ADR-013

---

## 1. Vision

Deer's Rock is a **deterministic, reproducible synthetic hospital simulation** that other hospital information systems can integrate with and test against. Any hospital app (EMR, LIS, PACS, pharmacy system, BI dashboard) should be able to:

1. **Query DR's FHIR API** for patients, conditions, encounters, observations, claims
2. **Push data into DR** (e.g., lab results, medication orders) via FHIR write endpoints
3. **Run integration tests** against DR — either against the live box or a cloned local instance
4. **Export data** in standard formats (CSV, FHIR Bundle JSON) for offline analysis

This turns DR from a standalone simulation into a **test-bed platform** for Indonesian hospital interoperability.

---

## 2. Gap Analysis (Current vs Target)

| Capability | Current | Target | Gap |
|-----------|---------|--------|-----|
| FHIR Patient read | ✅ | ✅ | — |
| FHIR Observation read | ✅ | ✅ | — |
| FHIR Encounter search | ⚠️ Single ID only | ✅ Full search | Add list + search |
| FHIR Condition | ❌ | ✅ | New endpoint |
| FHIR Claim | ❌ | ✅ | New endpoint |
| FHIR Bundle export | ✅ (per encounter) | ✅ (full hospital) | Add `/fhir/$export` |
| FHIR Conformance Statement | ❌ | ✅ | Add `/metadata` |
| CSV export (encounters, patients, charges) | ❌ | ✅ | New endpoints |
| HTML-styled report pages | ❌ (JSON only) | ✅ | New routes |
| Blood type in report uses `patient.rhesus` | ❌ (random) | ✅ | Fix in report.ts |
| GitHub Actions CI | ❌ | ✅ | New workflow |
| FHIR R4 compliance tests | ❌ | ✅ | New test file |

---

## 3. Design

### 3.1 FHIR Endpoint Expansion

**New endpoints in `src/api/fhir.ts`:**

```typescript
// Condition search — returns all active conditions across encounters
conditionSearch(patientId?: string, code?: string): FhirResource[]

// Claim search — returns all insurance claims with CBG tariffs  
claimSearch(patientId?: string, status?: 'submitted'|'approved'|'denied'): FhirResource[]

// Encounter list — returns all encounters with filters
encounterList(status?: 'active'|'finished', type?: 'inpatient'|'outpatient'): FhirResource[]

// Full hospital export — FHIR Bundle with all resources
fullExport(): FhirBundle
```

**Conformance statement at `/api/fhir/metadata`:**
```json
{
  "resourceType": "CapabilityStatement",
  "status": "active",
  "kind": "instance",
  "fhirVersion": "4.0.1",
  "rest": [{
    "mode": "server",
    "resource": [
      { "type": "Patient", "searchParam": [{ "name": "name" }, { "name": "identifier" }] },
      { "type": "Observation", "searchParam": [{ "name": "subject" }] },
      { "type": "Condition", "searchParam": [{ "name": "patient" }, { "name": "code" }] },
      { "type": "Claim", "searchParam": [{ "name": "patient" }, { "name": "status" }] },
      { "type": "Encounter", "searchParam": [{ "name": "patient" }, { "name": "status" }] },
      { "type": "MedicationRequest", "searchParam": [{ "name": "patient" }] }
    ]
  }]
}
```

### 3.2 CSV Export

**Three export endpoints:**

| Route | Content | Columns |
|-------|---------|---------|
| `/api/export/patients.csv` | All patients | id,name,age,gender,bloodType,rhesus,allergies |
| `/api/export/encounters.csv` | All encounters | id,type,status,patientId,diagnosis,tickIn,tickOut |
| `/api/export/charges.csv` | All charges | id,encounterId,patientId,code,description,amount,timestamp |

Uses Node.js `Buffer` + `toString('utf8')` — no external dependencies. BOM prefix for Excel compatibility.

### 3.3 HTML Report Pages

**Two new routes:**
- `/report.html` — styled HTML version of `/api/report` with tables and summary stats
- `/sirs.html` — styled HTML version of SIRS report with RL form tables

Uses embedded CSS (no external CDN dependency for offline use). Dark theme matching dashboard.

### 3.4 Blood Type Fix

`report.ts` currently generates blood type distribution using `Math.random()`. Fix to use actual `patient.bloodType` and `patient.rhesus` from the patient pool.

### 3.5 FHIR R4 Compliance Tests

New test file `tests/fhir-compliance.test.ts` that validates:
- All resources have `resourceType` and `id`
- Patient has required fields (name, gender, birthDate)
- Observation has LOINC codes
- Condition has ICD-10 coding system
- Claim has CBG group and tariff
- Bundle has proper entry structure

### 3.6 GitHub Actions CI

New workflow `.github/workflows/ci.yml`:
- On push to main: run `npm install`, `npm run build`, `npm test`
- On pull request: same + security audit

---

## 4. Implementation Order

1. **FHIR endpoints** — Condition, Claim, Encounter search + Conformance
2. **CSV exports** — patients, encounters, charges
3. **Blood type fix** in report.ts
4. **HTML report pages** — /report.html, /sirs.html
5. **FHIR compliance tests**
6. **GitHub Actions CI**

---

## 5. Acceptance Criteria

- [ ] `/api/fhir/Condition` returns Condition resources with ICD-10 coding
- [ ] `/api/fhir/Claim` returns Claim resources with CBG tariff data
- [ ] `/api/fhir/Encounter` search returns filtered encounter list
- [ ] `/api/fhir/metadata` returns valid FHIR CapabilityStatement
- [ ] `/api/export/patients.csv` — valid CSV with BOM, correct columns
- [ ] `/api/export/encounters.csv` — valid CSV
- [ ] `/api/export/charges.csv` — valid CSV
- [ ] `/report.html` — serves styled HTML report
- [ ] Blood type in report matches actual patient data
- [ ] `tests/fhir-compliance.test.ts` passes
- [ ] GitHub Actions workflow file exists
- [ ] All existing 189 tests still pass
- [ ] TypeScript compiles clean
