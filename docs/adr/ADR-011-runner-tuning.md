# ADR-011: Runner Tuning — Drug Formulary Coverage

**Status:** Draft  
**Author:** OC  
**Date:** 2026-10-05  
**Supersedes:** None  
**Related:** ADR-010 (clinical fidelity expansion)

---

## 1. Problem Statement

After ADR-010 expanded the formulary to 73 drugs and ICD-10 generator to 146 codes, a gap analysis reveals **27 protocol drug references are unmapped** in the catalog. This means AI doctors generate orders for drugs that don't exist in the system — orders are silently dropped, and patients receive no treatment.

Additionally, **3 dosing variants** (e.g., "Morphine 5mg" vs "Morphine 10mg") need resolution.

### Current Coverage
- **Protocol drug labels:** 57 unique
- **Catalog INN names:** 73
- **Matched:** 30 (53%)
- **Missing:** 27 (47%)

### Impact
- New ICD codes (E03, F00, F20, F90, G43, H81, I60, etc.) generate protocols with drug actions that cannot be fulfilled
- Outcomes remain flat (zero mortality at tick 2941) because critical drugs (antibiotics, antihypertensives, psychotropics) are missing
- BI dashboard shows 386 outcomes but clinical fidelity is low — many conditions have no pharmacological treatment path

---

## 2. Design

### 2.1 Missing Drugs to Add

| Code | INN Name | Category | Cost IDR | Allergens | Notes |
|------|----------|----------|----------|-----------|-------|
| AZM | Azithromycin 250mg | antibiotic | 3000 | [] | Pertussis, atypical pneumonia |
| BET | Betahistine 16mg | other | 8000 | [] | Meniere's disease |
| DAP | Dapsone 100mg | antibiotic | 1000 | ["sulfone"] | Leprosy, PCP prophylaxis |
| DON | Donepezil 10mg | other | 25000 | [] | Alzheimer's |
| FOL | Folic acid 1mg | electrolyte | 200 | [] | Sickle cell, pregnancy |
| KET | Ketoconazole 200mg | antifungal | 4000 | [] | Cushing's, systemic fungal |
| LVT | Levothyroxine 100mcg | other | 1500 | [] | Hypothyroidism |
| MAG | Magnesium sulfate 1g | electrolyte | 5000 | [] | Eclampsia, pre-eclampsia |
| MPH | Methylphenidate 10mg | other | 15000 | [] | ADHD |
| METO | Metoprolol 50mg | antihypertensive | 500 | [] | Ischemic heart disease, HF |
| NAC | N-acetylcysteine 600mg | antidote | 8000 | [] | Acetaminophen poisoning |
| NIM | Nimodipine 60mg | antihypertensive | 12000 | [] | SAH vasospasm prophylaxis |
| PCN | Penicillin G 1MU | antibiotic | 2000 | ["penicillin"] | Sepsis, meningitis |
| PRA | Prazosin 1mg | antihypertensive | 1000 | [] | PTSD nightmares |
| PTU | Propylthiouracil 100mg | other | 3000 | [] | Hyperthyroidism |
| SUM | Sumatriptan 50mg | other | 20000 | [] | Migraine |
| VALA | Valacyclovir 500mg | antiviral | 15000 | [] | Herpes, Bell's palsy |
| TOB | Tobramycin eye drops | other | 12000 | [] | Conjunctivitis |
| PREDN | Prednisolone eye drops | corticosteroid | 10000 | [] | Ocular inflammation |

**Total new drugs: 19** → **New catalog total: 92**

### 2.2 Dosing Variant Resolution

| Protocol Label | Current Catalog | Fix |
|---------------|-----------------|-----|
| "Morphine 5mg" | "Morphine 10mg" (MOR) | Add MOR5 = Morphine 5mg |
| "Artemisinin-combination therapy" | "Artemether-lumefantrine 6-tab" (ART) | Alias: use ART |
| "Polyvalent antivenom" | Already in catalog (POL) | ✓ Already covered |
| "Rabies immunoglobulin" | Not in catalog | Add RIG (rare, low priority) |
| "Rabies vaccine" | Not in catalog | Add RABV (rare, low priority) |

### 2.3 Non-Drug Treatment Resolution

These are procedures/treatments, not medications — keep as-is, skip drug lookup:
- "Phototherapy" → neonatal jaundice treatment (non-pharmacological)
- "Suppository hemorrhoid" → topical treatment (would need SUPP code)
- "Permethrin 5% cream" → scabicide (would need PERM code)
- "Tobramycin eye drops" → ADD to catalog (see 2.1)
- "Prednisolone eye drops" → ADD to catalog (see 2.1)

### 2.4 Implementation Plan

**Phase 1: Drug Catalog Expansion**
1. Add 19 new drugs to `drug-catalog.ts`
2. Add 2 dosing variants (MOR5) to `drug-catalog.ts`
3. Update `central-supply.ts` with 21 new MED-* entries
4. Regenerate derived tables in `pharmacy.ts` (MEDICATIONS, MED_MAP, DRUG_COSTS)
5. Update `pharmacy-knowledge.ts`:
   - Add allergens for new drugs
   - Add contraindication rules
   - Add dose ranges
   - Add interaction rules (focus on high-severity)

**Phase 2: Protocol Alignment**
6. Update clinical protocols to use correct drug labels (or add alias mapping)
7. Add `labelToDrugCode` mapping function in `ai-doctor.ts` as fallback
8. Update `ai-pharmacy.ts` MED_TO_SUPPLY if needed

**Phase 3: Validation**
9. Run full test suite
10. Run 10k validation on Kaggle CPU
11. Verify outcome counts increase (expect >386 outcomes at equivalent tick)

---

## 3. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Determinism break from new drugs | Low | All entries are static constants; no RNG changes |
| New drug interactions missed | Medium | Focus on high-severity pairs; document gaps |
| Supply chain strain from 92 drugs | Low | Central supply auto-restocks; min/max per item |
| Protocol label mismatch persists | Medium | Add label→code alias mapping as safety net |

---

## 4. Acceptance Criteria

- [ ] 92 drugs in `drug-catalog.ts`, all with costs, doses, routes, supply codes
- [ ] 0 unmapped protocol drug labels (via catalog entries or alias mapping)
- [ ] `DRUG_DIAGNOSIS_CONTRA` covers all new drugs
- [ ] `INTERACTIONS` covers high-severity new drug pairs
- [ ] Test suite passes (determinism preserved)
- [ ] 10k validation: outcomes increase vs baseline (target: >600 at tick 3000)
- [ ] Live box: new ICD codes (E03, F20, G43, etc.) produce medication orders
