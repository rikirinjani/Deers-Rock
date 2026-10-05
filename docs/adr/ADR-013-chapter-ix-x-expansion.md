# ADR-013: ICD Chapter IX (Circulatory) & X (Respiratory) Expansion

**Status:** Draft  
**Author:** OC  
**Date:** 2026-10-05  
**Supersedes:** None  
**Related:** ADR-010, ADR-011, ADR-012

---

## 1. Problem Statement

Current ICD-10 protocol coverage is strong in infectious diseases (A), neoplasms (C), and endocrine (E), but has gaps in **Chapter IX (Circulatory, I00-I99)** and **Chapter X (Respiratory, J00-J99)** — the two highest-volume chapters in any Tier A hospital. These gaps mean:

- Patients with peripheral vascular disease, DVT, valvular heart disease, pneumonia subtypes, and respiratory failure receive no targeted protocol
- BI dashboard under-reports cardiovascular and respiratory case mixes
- Revenue capture via INA-CBG misses high-tariff circulatory cases

### Current Coverage Gaps

**Chapter IX — Circulatory (10 generator codes, need ~20):**
| Code | Name | Status | Priority |
|------|------|--------|----------|
| I70 | Atherosclerosis | ✅ Protocol + CBG | — |
| I83 | Varicose veins | ✅ Protocol + CBG | — |
| — | Peripheral vascular disease (I73) | ❌ | P0 |
| — | Deep vein thrombosis (I80/I82) | ❌ | P0 |
| — | Hypertensive heart disease (I11) | ❌ | P1 |
| — | Hypertensive renal disease (I12) | ❌ | P1 |
| — | Acute rheumatic fever (I00-I02) | ❌ | P1 |
| — | Endocarditis (I33) | ❌ | P1 |
| — | Pericarditis (I30) | ❌ | P2 |
| — | Cardiac arrhythmia NOS (I49) | ❌ | P2 |
| — | Cardiomyopathy (I42) | ❌ | P2 |
| — | Pulmonary embolism (I26) | ❌ | P0 |
| — | Heart murmur (I36) | ❌ | P2 |
| — | Vasculitis (I77) | ❌ | P2 |

**Chapter X — Respiratory (11 generator codes, need ~15):**
| Code | Name | Status | Priority |
|------|------|--------|----------|
| J15 | Bacterial pneumonia | ✅ | — |
| J18 | Pneumonia unspecified | ✅ | — |
| J44 | COPD | ✅ | — |
| J45 | Asthma | ✅ | — |
| — | Acute upper respiratory infection (J06) | ❌ | P0 |
| — | Influenza (J10/J11) | ❌ | P0 |
| — | Bronchiectasis (already J47) | ✅ | — |
| — | Pleurisy (J pleura) | ❌ | P1 |
| — | Respiratory failure (J96) | ❌ | P0 |
| — | Sleep apnea (G47/J96) | ❌ | P2 |
| — | Epistaxis (R04) | ❌ | P2 |
| — | Hemothysis (R04) | ❌ | P2 |

**Additional gaps (high-yield):**
| Chapter | Code | Name | Priority |
|---------|------|------|----------|
| N (GU) | N19 | Renal failure NOS | P1 |
| N (GU) | N25 | Other disorder of prostate | P2 |
| R (Symptoms) | R31 | Hematuria | P1 |
| R (Symptoms) | R10 | Abdominal pain | P1 |
| E (Endocrine) | E20 | Hypoparathyroidism | P1 |

---

## 2. Design

### 2.1 Generator Expansion (`src/patient/generator.ts`)

Add ~35 new ICD-10 codes across chapters I, J, R, N, E:

```ts
// Chapter I — Circulatory (NEW)
{ code: "I73", name: "Peripheral vascular disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 4 },
{ code: "I80", name: "Phlebitis and thrombophlebitis", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 3 },
{ code: "I82", name: "Other venous embolism and thrombosis", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 2 },
{ code: "I11", name: "Hypertensive heart disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 4 },
{ code: "I12", name: "Hypertensive renal disease", minAge: 40, maxAge: 99, genders: ["male", "female"], weight: 3 },
{ code: "I00", name: "Rheumatic fever without heart involvement", minAge: 5, maxAge: 40, genders: ["male", "female"], weight: 2 },
{ code: "I33", name: "Acute endocarditis", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 2 },
{ code: "I30", name: "Acute pericarditis", minAge: 10, maxAge: 99, genders: ["male", "female"], weight: 2 },
{ code: "I49", name: "Other cardiac arrhythmias", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 3 },
{ code: "I42", name: "Cardiomyopathy", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 3 },
{ code: "I26", name: "Pulmonary embolism", minAge: 30, maxAge: 99, genders: ["male", "female"], weight: 3 },
{ code: "I36", name: "Nonrheumatic tricuspid valve disorders", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 2 },
{ code: "I77", name: "Other disorders of arteries and arterioles", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 2 },

// Chapter J — Respiratory (NEW)
{ code: "J06", name: "Acute upper respiratory infection", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 8 },
{ code: "J10", name: "Influenza due to identified influenza virus", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 5 },
{ code: "J11", name: "Influenza unspecified", minAge: 0, maxAge: 99, genders: ["male", "female"], weight: 4 },
{ code: "J96", name: "Respiratory failure", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 4 },
{ code: "J91", name: "Pleural effusion in conditions classified elsewhere", minAge: 10, maxAge: 99, genders: ["male", "female"], weight: 2 },
{ code: "R04", name: "Hemorrhage from respiratory organs", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 2 },

// Chapter R — Symptoms (NEW)
{ code: "R31", name: "Hematuria", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 3 },
{ code: "R10", name: "Abdominal and pelvic pain", minAge: 5, maxAge: 99, genders: ["male", "female"], weight: 6 },

// Chapter N — GU (NEW)
{ code: "N19", name: "Unspecified renal failure", minAge: 1, maxAge: 99, genders: ["male", "female"], weight: 3 },
{ code: "N25", name: "Other disorders resulting from impaired renal tubular function", minAge: 20, maxAge: 99, genders: ["male", "female"], weight: 1 },

// Chapter E — Endocrine (NEW)
{ code: "E20", name: "Hypoparathyroidism", minAge: 10, maxAge: 80, genders: ["male", "female"], weight: 1 },
```

### 2.2 Clinical Protocol Expansion (`src/engine/clinical-knowledge.ts`)

Each new code gets a full protocol with lab/imaging/medication/consult actions. Key new drugs required:

| New Protocol | New Drug Needed | Code | INN |
|-------------|----------------|------|-----|
| I73 PVD | Cilostazol | CSZ | Cilostazol 100mg |
| I80/I82 DVT | Rivaroxaban (already RIV) | — | — |
| I11 HTN heart | Nebivolol | NBL | Nebivolol 5mg |
| I33 Endocarditis | Vancomycin (already VAN) | — | — |
| I26 PE | Tenecteplase | TNK | Tenecteplase 30mg |
| J06 URI | Paracetamol (already PRC) | — | — |
| J10/J11 Flu | Oseltamivir | OSL | Oseltamivir 75mg |
| J96 Resp failure | None new | — | — |
| R10 Abdominal pain | Hyoscine butylbromide | HYS | Hyoscine 20mg |
| R31 Hematuria | None new | — | — |

**New drugs needed: 3** (Cilostazol, Nebivolol, Oseltamivir, Tenecteplase, Hyoscine)

### 2.3 INA-CBG Expansion

Add ~20 new CBG entries for the new ICD codes with appropriate SEP scoring.

### 2.4 Runner Sync

All runners auto-sync via:
- `ai-doctor.ts`: `mapIcdToActions` → `ICD_PROTOCOLS` (auto-covers new protocols)
- `finance.ts`: `lookupCbgTariff` → `INA_CBG` (auto-covers new tariffs)
- `ai-pharmacy.ts`: `MED_TO_SUPPLY` → `DRUG_CATALOG` (auto-covers new drugs)
- `pharmacy.ts`: `MEDICATIONS` → derived from `DRUG_CATALOG` (auto-covers new drugs)

---

## 3. Implementation Plan

### Phase 1: Data
1. Add 25 new ICD codes to `generator.ts`
2. Add 25 new protocols to `clinical-knowledge.ts`
3. Add 5 new drugs to `drug-catalog.ts` (CSZ, NBL, OSL, TNK, HYS)
4. Add 5 new supply entries to `central-supply.ts`
5. Add 20 new CBG entries to `ina-cbg.ts`

### Phase 2: Pharmacy Integration
6. Add allergens/contraindications/doses/interactions for 5 new drugs
7. Update `pharmacy.ts` MEDICATIONS (auto-derived)

### Phase 3: Validation
8. Run test suite
9. Deploy to live box
10. Verify outcomes increase, especially cardiovascular/respiratory

---

## 4. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Determinism break | Low | All static data; no RNG changes |
| New drug interactions missed | Medium | Focus on high-severity only |
| CBG tariff mismatch | Low | Every generator code gets CBG entry |

---

## 5. Acceptance Criteria

- [ ] 150+ ICD codes in generator (up from 126)
- [ ] 165+ protocols in clinical-knowledge.ts (up from 144)
- [ ] 173 drugs in catalog (up from 168)
- [ ] 165+ CBG entries (up from 144)
- [ ] Test suite passes (determinism preserved)
- [ ] Live box: cardiovascular + respiratory outcomes visible in BI dashboard
- [ ] Zero `mismatched_icd_cbg` denials for new codes
