# ADR-010: Clinical Fidelity Expansion — Formulary, ICD-10, INA-CBG

**Status:** Draft  
**Author:** OC  
**Date:** 2026-10-05  
**Replaces:** None  
**Supersedes:** Milestone 2.1-2.5 of Epic II (ROADMAP)

---

## 1. Problem Statement

The current clinical simulation has three coverage gaps that limit its fidelity for controlled experiments:

| Layer | Current | Target | Gap |
|-------|---------|--------|-----|
| Formulary (generic drugs) | 22 | ~50 | Missing classes: antihypertensives (ARBs, CCBs, thiazides), antidiabetics (SULFAs, SGLT2, GLP-1), antiarrhythmics, antiepileptics, PPIs beyond omeprazole, antipsychotics, anticoagulants (DOACs), antituberculous, antimalarials, antivirals, analgesics (NSAIDs, tramadol) |
| ICD-10 diagnosis generator | 52 unique codes | ~150 | Missing entire chapters: neoplasms (C00-C75), endocrine (E00-E07), blood (D50-D89), mental (F00-F99), nervous (G00-G99), eye (H00-H59), ear (H60-H83), genitourinary (N00-N99), congenital (Q00-Q99), perinatal (P00-P96), injury (S00-S99, excluding 7), external causes (V01-Y98), symptoms (R00-R99) |
| INA-CBG tariff mapping | 71 entries | ~150 | Every generator code needs a CBG entry; severity inference (CC/MCC) incomplete; no procedure-coded SEPs |

Without full-coverage protocols, AI doctors default to `mapIcdToActions` returning empty → no medication orders for uncovered diagnoses → patients receive no treatment → outcomes are flat (zero mortality on live box at tick 840).

---

## 2. Design

### 2.1 Formulary Expansion — `src/engine/drug-catalog.ts` (new)

**Naming convention:** Each drug gets a stable 3-letter generic-code AND a canonical Indonesian INN name. The existing 4-letter `MED-*` supply codes are preserved as-is (no breaking change).

```ts
export interface DrugEntry {
  code: string;           // 3-letter generic code, e.g. "LOS"
  innName: string;        // Indonesian INN: "Losartan 50mg"
  category: DrugCategory;
  dose: string;           // "50 mg"
  route: Route;           // "PO" | "IV" | "IM" | "SC" | "INH"
  supplyCode: string;     // "MED-LOS" (central-supply key)
  costIdr: number;        // acquisition cost per unit
  allergens: string[];    // for allergy checking
}

export type DrugCategory =
  | "antihypertensive" | "antidiabetic" | "antibiotic" | "antiviral"
  | "antifungal" | "anticoagulant" | "antiplatelet" | "statin"
  | "analgesic" | "antipyretic" | "nsaid" | "opioid"
  | "anticonvulsant" | "anxiolytic" | "antipsychotic" | "antidepressant"
  | "bronchodilator" | "corticosteroid" | "diuretic"
  | "antiemetic" | "ppi" | "h2blocker"
  | "antimalarial" | "antituberculous" | "antivenom" | "vaccine"
  | "electrolyte" | "fluid" | "blood_product" | "other";

export type Route = "PO" | "IV" | "IM" | "SC" | "INH" | "PR" | "SL" | "TOP";
```

**Expansion target — 50 drugs across 20+ categories:**

| Category | New Drugs (code — INN) |
|----------|----------------------|
| Antihypertensives | LOS — Losartan 50mg, HCT — Hydrochlorothiazide 25mg, NIF — Nifedipine 10mg, LAB — Labetalol 100mg, ISO — Isosorbide dinitrate 5mg |
| Antidiabetics | GLP — Glipizide 5mg, PIO — Pioglitazone 30mg, CAN — Canagliflozin 100mg, DIA — Sitagliptin 100mg, PCA — Insulin NPH 40U |
| Antibiotics (oral) | DOX — Doxycycline 100mg, CLI — Clarithromycin 250mg, TIN — Tinidazole 500mg, CPM — Cefixime 200mg |
| Antibiotics (IV) | MEM — Meropenem 500mg, VAN — Vancomycin 500mg, AMG — Amikacin 250mg |
| Antivirals | ACT — Acyclovir 400mg, TDF — Tenofovir 300mg, 3TC — Lamivudine 150mg |
| Antifungals | FLC — Fluconazole 200mg |
| Anticoagulants | WAF — Warfarin 5mg, RIV — Rivaroxaban 20mg |
| Antiplatelets | CLO — Clopidogrel 75mg |
| Statins | SIM — Simvastatin 20mg, ROS — Rosuvastatin 10mg |
| Analgesics | IBU — Ibuprofen 400mg, NEC — Diclofenac 50mg, TRM — Tramadol 50mg |
| Antipyretic | PRC — Paracetamol (existing) |
| Opioids | MOR — Morphine (existing), CODE — Codeine 30mg |
| Anticonvulsants | PHT — Phenytoin 100mg, VAL — Valproate 200mg, LEV — Levetiracetam 500mg |
| Anxiolytic | DIA — Diazepam (existing) |
| Antipsychotics | OLA — Olanzapine 5mg, HAL — Haloperidol 5mg |
| Antidepressants | SER — Sertraline 50mg, ESC — Escitalopram 10mg |
| Bronchodilators | SAL — Salbutamol (existing), IPR — Ipratropium bromide |
| Corticosteroids | PRED — Prednisone 5mg, DEX — Dexamethasone 4mg, HYD — Hydrocortisone 100mg |
| Diuretics | FUR — Furosemide (existing), SPIO — Spironolactone 25mg |
| PPIs | OMP — Omeprazole (existing), PNT — Pantoprazole 40mg |
| Antiemetics | OND — Ondansetron (existing), MET — Metoclopramide 10mg |
| Electrolytes | KCL — KCl (existing), CA — Calcium gluconate 1g |
| Fluids | RL — Ringer's Lactate (existing), NS — NaCl 0.9% 500ml |
| Antimalarials | ART — Artemether-lumefantrine (6-tab), PRQ — Primaquine 15mg |
| Antituberculous | H — Isoniazid 100mg, R — Rifampicin 150mg, Z — Pyrazinamide 500mg, E — Ethambutol 400mg |
| Antivenom | POL — Polyvalent antivenom (existing) |
| Vaccine | RAB — Rabies vaccine (existing) |

**Migration plan:**
1. Create `drug-catalog.ts` with all 50 entries (22 existing + 28 new)
2. Keep `MEDICATIONS` array in `pharmacy.ts` as a compatibility view (computed from catalog)
3. Update `MED_MAP` → `supplyCode` lookup on catalog
4. Update `DRUG_COSTS` → pulled from catalog
5. Update `getDoseRange` → pulled from catalog
6. Update `MED_ALLERGEN_MAP` → pulled from catalog
7. Update `DRUG_DIAGNOSIS_CONTRA` → extended for new drugs
8. Update `INTERACTIONS` → extend for new drug pairs (focus on clinically significant ones)
9. Add 28 new `MED-*` entries to `central-supply.ts` CATALOG

### 2.2 ICD-10 Generator Expansion — `src/patient/generator.ts`

**Current:** 52 unique ICD-10 codes, all in chapters A-J, M, N, O, P, Q, S, T, Z.

**Target:** ~150 codes spanning all clinically relevant chapters for a RS Tipe C hospital in Indonesia.

**Coverage by chapter (target):**

| Chapter | Current | Target | Notes |
|---------|---------|--------|-------|
| A — Infectious | 8 | 15 | Add: MERS, COVID-19, Chikungunya, Diphtheria, Tetanus, Cholera, Pertussis |
| B — Viral/parasitic | 3 | 5 | Add: Hepatitis B, Hepatitis C |
| C — Neoplasms | 2 | 12 | Add: lung, stomach, liver, colorectal, cervix, thyroid, leukemia, lymphoma |
| D — Blood | 2 | 5 | Add: hemophilia, ITP, sickle cell |
| E — Endocrine | 4 | 8 | Add: hypothyroidism, Cushing's, Addison's, hypo-/hypercalcemia |
| F — Mental | 2 | 8 | Add: bipolar, schizophrenia, ADHD, PTSD, OCD, dementia |
| G — Nervous | 1 | 4 | Add: migraine, Bell's palsy, neuropathy |
| H — Eye/ear | 1 | 4 | Add: cataract, conjunctivitis, Meniere's |
| I — Circulatory | 4 | 8 | Add: TIA, peripheral vascular disease, arrhythmia other, valvular other |
| J — Respiratory | 4 | 6 | Add: bronchiectasis, pleural effusion, lung nodule |
| K — Digestive | 4 | 8 | Add: GERD, hemorrhoids, pancreatitis, liver cirrhosis, bowel obstruction |
| M — MSK | 2 | 3 | Add: rotator cuff, carpal tunnel |
| N — GU | 3 | 6 | Add: prostate cancer, renal failure acute, urethritis |
| O — Obstetric | 2 | 3 | Add: pre-eclampsia, eclampsia |
| P — Perinatal | 2 | 3 | Add: birth trauma, neonatal jaundice severe |
| Q — Congenital | 1 | 2 | Add: cleft lip/palate |
| S — Injury | 3 | 6 | Add: rib fracture, hand fracture, concussion |
| T — External | 2 | 3 | Add: poisoning (oral), complication of care |
| R — Symptoms | 0 | 5 | Add: fever unspecified, chest pain, syncope, headache, abnormal labs |

**Total target: ~150 codes** (up from 52).

Each entry extends the existing `ICDMapping` interface — no structural change:
```ts
{ code: "E03", name: "Hypothyroidism", minAge: 18, maxAge: 99, genders: ["female","male"], weight: 4 }
```

### 2.3 ICD Protocol Expansion — `src/engine/clinical-knowledge.ts`

Every new ICD-10 code needs a corresponding `IcdProtocol` entry with:
- `specialty`: mapped via `mapIcdToSpecialty`
- `actions[]`: lab/imaging/medication/consult/diet/respiratory/surgery/discharge

**Medication actions must use codes from the expanded formulary** (section 2.1). Example for new code `E03`:
```ts
{ code: "E03", name: "Hypothyroidism", specialty: "endocrinology",
  actions: [
    { type: "medication", label: "Levothyroxine 100mcg", priority: 9, detail: "Thyroid replacement" },
    { type: "lab", label: "TSH", priority: 9, detail: "TSH" },
    { type: "lab", label: "Free T4", priority: 8, detail: "FT4" },
    { type: "consult", label: "Penyakit Dalam", priority: 6, detail: "internal_medicine" },
  ] },
```

**Existing 71 protocols are preserved.** Only new codes get new entries. The `mapIcdToActions` function already handles missing codes gracefully (returns `[]`).

### 2.4 INA-CBG Tariff Expansion — `src/engine/ina-cbg.ts`

**Current:** 71 entries (covers all 71 protocol codes).

**Target:** ~150 entries matching the expanded generator.

**New entries added per ICD-10 code** using PMK 28/2020 tariff ranges, adjusted for RS Tipe C pricing (0.7× Tipe A baseline):

Severity inference algorithm (already implemented in `inferSeverity`) uses:
- `CC_LIST`: mild CC tags (Level II)
- Unclassified codes with ≥2 secondary diagnoses → Level II
- No upgrade path to Level III without explicit major-CC tagging

**Add to `CC_LIST`:**
```ts
// New mild CCs
"E03": "mild",       // Hypothyroidism
"F32": "mild",      // Depression (already partially covered)
"N18": "mild",      // CKD (already present)
// ... etc for all new codes that have known CCs

// New major CCs  
"I21": "major",     // AMI (already present)
"R57": "major",     // Septic shock (already present)
// Add: G40 (status epilepticus), I63 (stroke with deficit), etc.
```

**ADD NEW DRUG → INA-CBG TARIFF INTERACTION:**
The `lookupCbgTariff` function returns the base tariff. The finance module (`finance.ts:billingHandler`) uses it to set `totalCharges` and `coveredAmount`. When an ICD code has no CBG match, the claim is denied with `mismatched_icd_cbg`. **Every generator code must have a CBG entry** to avoid automatic denial.

### 2.5 Drug-ICD-Algorithms Integration

The following cross-cutting tables need updating:

| Table | File | Current | Target |
|-------|------|---------|--------|
| `MED_ALLERGEN_MAP` | `pharmacy-knowledge.ts` | 22 drugs | 50 drugs |
| `DRUG_DIAGNOSIS_CONTRA` | `pharmacy-knowledge.ts` | 18 rules | ~50 rules |
| `INTERACTIONS` | `pharmacy-knowledge.ts` | ~15 pairs | ~60 pairs (focused on high-severity) |
| `getDoseRange` | `pharmacy-knowledge.ts` | 22 drugs | 50 drugs |
| `DRUG_COSTS` | `pharmacy.ts` | 22 drugs | 50 drugs |
| `MED_MAP` | `pharmacy.ts` | 22 drugs | 50 drugs |
| `ICD_PROTOCOLS` | `clinical-knowledge.ts` | 71 codes | ~150 codes |
| `TERMINAL_EVENTS` | `clinical-knowledge.ts` | 43 codes | ~100 codes |
| `ICD10_DIAGNOSES` | `generator.ts` | 52 codes | ~150 codes |
| `INA_CBG` | `ina-cbg.ts` | 71 codes | ~150 codes |
| `CC_LIST` | `ina-cbg.ts` | 16 codes | ~40 codes |
| Central supply | `central-supply.ts` | 22 MED-* | 50 MED-* |

---

## 3. Implementation Strategy

### Phase A: Data Foundation (parallelizable)
1. Create `drug-catalog.ts` with all 50 entries — pure data, no logic
2. Expand `ICD10_DIAGNOSES` in `generator.ts` — pure data
3. Expand `INA_CBG` in `ina-cbg.ts` — pure data
4. Expand `CC_LIST` in `ina-cbg.ts` — pure data

### Phase B: Protocol Wiring
5. Expand `ICD_PROTOCOLS` in `clinical-knowledge.ts` with actions referencing new drug codes
6. Expand `TERMINAL_EVENTS` for new ICD codes
7. Update `mapIcdToSpecialty` default if needed

### Phase C: Pharmacy Integration
8. Update `pharmacy-knowledge.ts`: allergens, contraindications, interactions, dose ranges for new drugs
9. Update `pharmacy.ts`: `MEDICATIONS`, `MED_MAP`, `DRUG_COSTS`
10. Update `ai-pharmacy.ts`: `MED_TO_SUPPLY`
11. Update `central-supply.ts`: 28 new `MED-*` entries

### Phase D: Validation
12. Run full test suite — determinism check (all new data is static, no RNG changes)
13. Run 10k validation — verify discharge counts, RSS, journal growth unchanged
14. Run 100 tick smoke test — verify all 150 ICD codes can be generated and treated

---

## 4. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Determinism break from new data | Low | All new entries are static constants; no RNG path changes |
| New drug interactions missed | Medium | Focus on high-severity interactions only; document gaps |
| CBG tariff mismatch → claim denial spike | Medium | Ensure every generator ICD has a CBG entry before enabling |
| Formulary bloat → AI doctor decision fatigue | Low | Priority scoring caps at 10; only top-N actions per protocol |
| Supply chain strain from 50 drugs | Low | Central supply auto-restocks every 50 ticks; min/max per item |

---

## 5. Open Questions

1. **New drug names:** Should we use Indonesian INN exclusively, or keep bilingual labels? (INN recommended for scientific reproducibility)
2. **Antipsychotics/antidepressants:** These are high-complexity drugs with significant interaction profiles. Include in Phase A or defer to a later phase?
3. **SEPs (Severity of Illness Points):** INA-CBG Phase II uses SEPs for risk adjustment. Implement simplified SEP scores or defer?
4. **Procedure coding:** Current `ICD9_PROCEDURES` has 21 entries. Expand to cover surgical ICD codes?

---

## 6. Acceptance Criteria

- [ ] 50 drugs in `drug-catalog.ts`, all with costs, doses, routes, supply codes
- [ ] 150 ICD-10 codes in generator, covering all major hospital diagnosis chapters
- [ ] 150 ICD protocols in `clinical-knowledge.ts`, each with ≥2 actions
- [ ] 150 INA-CBG tariff entries, zero `mismatched_icd_cbg` denials on generated data
- [ ] `DRUG_DIAGNOSIS_CONTRA` covers all 50 drugs (no unguarded drug → diagnosis paths)
- [ ] `INTERACTIONS` covers all new drug pairs that are clinically significant
- [ ] Test suite passes (determinism preserved)
- [ ] 10k validation PASS 4/4 (rss, journal, discharges, no-crash)
- [ ] Live box: all 150 ICD codes produce at least one treated encounter in 10k ticks
