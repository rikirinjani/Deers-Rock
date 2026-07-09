# Healthcare Data Source Integration Depth Ledger

> Canonical registry of all external healthcare data sources, their integration depth, and coverage gaps.
> Format adapted from CQM's Tsotchke integration map.
> Last updated: 2026-07-09

## Depth Legend

| Depth | Meaning | Example |
|-------|---------|---------|
| **deep** | Parsed into core simulation logic, used in hot paths (per-tick or per-encounter) | INA-CBG tariffs, payer assignment |
| **wired** | Used in simulation but not per-tick (lookups, event handlers, clinical knowledge) | Drug contra-indications, nursing protocols |
| **harvest** | One-time extraction from source, static reference data | Province database, SIRS templates |
| **fenced** | Documented or partially implemented, not yet integrated into simulation | Severity Level II/III, Special CMG |

## All Data Sources

### Deep (14 sources)

| # | Source | Regulation | Entries | File(s) | Used By | Notes |
|---|--------|-----------|---------|---------|---------|-------|
| 1 | INA-CBG tariff table | PMK 28/2020 RS Tipe A | 71 ICD codes → 71 CBG groups | `ina-cbg.ts` | `billingHandler` in finance.ts | All-inclusive tariff per episode. Every claim checks against this. |
| 2 | ICD clinical protocols | Clinical guidelines | 70 codes | `clinical-knowledge.ts` | `aiDoctorHandler`, `aiNurseHandler` | Maps diagnosis → actions (labs, meds, imaging, consults) |
| 3 | Payer assignment rules | BPJS/Jasa Raharja law | 5 payer types | `finance.ts:24-27`, `emergency.ts` | `admissionHandler` in markov.ts | Default BPJS; accident ICDs (S06,S72,T14,T20,T63) → Jasa Raharja; foreigners → self-pay |
| 4 | BPJS claim adjudication | BPJS regulation | 85/10/5 split | `finance.ts:177` | `billingHandler` | 85% approve, 10% returned for coding, 5% deny |
| 5 | Jasa Raharja rules | State accident insurance | 30-day cap | `finance.ts:9,132` | `billingHandler` | Auto-approve up to 30-day cap (43,200 ticks) |
| 6 | Building layout | Hospital floor plan | 4 buildings, 13 wards, 131 beds | `state-store.ts:159-191` | `admissionHandler`, bed assignment | VVIP Pavilion (12), Main Building (50), Mother & Child (40), Critical Care (29) |
| 7 | Drug acquisition costs | e-catalogue (flat, no margin) | 22 drugs | `pharmacy.ts:8-15` | `pharmacyHandler` | Prices in IDR: ACE 500, LVF 5000, HEP 30000, SAL 50000 |
| 8 | Charge category rates | Hospital tariff schedule | 10 categories | `charge-generator.ts:7-11` | Every action handler | lab 250K, radiology 500K, surgery 5M, room 350K, etc. |
| 9 | Room class multipliers | Hospital class pricing | 9 room classes | `charge-generator.ts:16-20` | `billingHandler` | vvip 4x, vip 3x, kelas-1 2x, kelas-3 1x, icu 3.5x |
| 10 | LOS distributions | Clinical LOS norms | 2 distributions | `markov.ts`, `emergency.ts` | `admissionHandler`, `emergencyHandler` | Inpatient 3-7d (4320-10080 tick). Emergency handler uses `edStay = 2 + rng()*6` ticks (~2-7 min) — **🔴 unrealistically short, not 1-3 days** |
| 11 | Cultural calendar | Indonesian holidays | 7 events (6 holidays + 1 seasonal) | `calendar.ts` | `admissionHandler` influx | School holidays, Ramadhan, Lebaran, Independence Day, New Year, Christmas, Imlek. Each event has weighted ICD modifiers. |
| 12 | Agent roles & salaries | Hospital HR structure | 25+ roles | `agent/types.ts`, `generator.ts` | All agent handlers | dokter_spesialis, perawat, apoteker, etc. with gajiPokok |
| 13 | Specialty → ward mapping | Hospital organization | 17 mapped (19 defined) | `markov.ts:11-19`, `specialty.ts:18-22` | `admissionHandler` | `SPECIALTY_TO_WARD` maps 17 specialties to wards; `SPECIALTY_TYPE` defines 19. `internal_medicine` and `emergency` have no ward mapping (fall through to first available bed). |
| 14 | Nursing clinical protocols | Nursing care standards | 32 protocols | `nursing-knowledge.ts:19-116` | `aiNurseHandler` | Per-ICD-group: monitoring frequency, interventions, assessment. Covers 50+ ICD codes across 32 protocol groups. |

### Wired (8 sources)

| # | Source | Regulation | Entries | File(s) | Used By | Notes |
|---|--------|-----------|---------|---------|---------|-------|
| 15 | Referral facilities | Referral system network | 35 facilities | `identity/data.ts` | `referralHandler` | Puskesmas, Klinik, RS Tipe D/C/B. Network topology for tiered referral. |
| 16 | Drug contra-indications | Clinical pharmacology | 22 entries | `pharmacy-knowledge.ts:28-47` | `aiPharmacyHandler` | Drug-diagnosis interactions (ACE + CKD, Metformin + renal, etc.) |
| 17 | Drug dose ranges | Clinical pharmacology | 22 drugs | `pharmacy-knowledge.ts:49-68` | `aiPharmacyHandler` | min/max/maxDaily per drug |
| 18 | Medication allergen map | Clinical pharmacology | 22 drugs | `pharmacy-knowledge.ts:3-26` | `aiPharmacyHandler` | Drug → allergen group mapping |
| 19 | Department codes | Hospital organization | 35 departments | `agent/types.ts:3-10` | Agent assignment | IGD, LAB, RAD, FARMASI, BEDAH, etc. |
| 20 | AI Coder agent | Coding standards | 4 coders | `medical-records.ts` | `aiCoderHandler` | By specialty: surgical, medical, OBGYN, general. Accuracy 0.75-0.85 |
| 21 | Procedure professional fees | Doctor/nurse fee schedule | 6 procedures | `finance.ts:52-59` | AI Doctor/AI Nurse actions | doctor_round 150K, surgery_major 15M, minor 5M |
| 22 | Service catalog per specialty | Clinical service list | 19 specialties × 3-4 services (72 total) | `specialty.ts:24-44` | `specialtyHandler` | cardiology→Echo/ECG/stress/Holter, etc. 3 specialties have 3 services (anesthesiology, hemodialysis, internal_medicine); rest have 4. |

### Harvest (3 sources)

| # | Source | Regulation | Entries | File(s) | Notes |
|---|--------|-----------|---------|---------|-------|
| 23 | Province/regency/district data | Indonesian administrative divisions | 38 provinces, ~100 regencies | `identity/data.ts` | Census reference data for patient identity generation. Not used in simulation logic. |
| 24 | SIRS RL hospital identity | Permenkes 1171/2011 | 1 hospital | `sirs-report.ts:4-22` | RSD Rusa (Deer's Rock Hospital) identity: name, address, accreditation, ownership |
| 25 | SIRS RL reporting templates | Permenkes 1171/2011 | 6 forms | `sirs-report.ts` | RL1 (hospital profile), RL2a (SDM), RL2b (patient service), RL3 (morbidity), RL4a (surgery), RL4b (delivery) |

### Fenced (6 sources)

| # | Source | Regulation | Gap | Unblock Criteria | Priority |
|---|--------|-----------|-----|------------------|----------|
| 26 | INA-CBG severity Level II/III | PMK 3/2023 | Only Level I (w/o CC) implemented; tariffs missing +30-60% (II) and +80-200% (III) | Add severity field to CbgEntry; expand CC list beyond 16 codes; wire into billingHandler | High |
| 27 | Full INA-CBG table (1,075 groups) | PMK 28/2020 | Only 71 of ~1,075 groups implemented; current coverage ~7% | Manual data entry from regulation or BPJS data dump | Low (current 71 covers common codes) |
| 28 | Special CMG top-ups | PMK 3/2023 | Special drugs (albumin, chemo), procedures (hemodialysis, PCI), prosthesis (stents) not tracked | Add top-up calculation to INA-CBG billing; track special items per encounter | Medium |
| 29 | ICD-9-CM procedure codes in workflow | Clinical coding | `ICD9_PROCEDURES` defined but never written to `MedicalChart.procedures` during clinical workflow | Wire surgery/procedure handlers to populate chart.procedures | Medium |
| 30 | Proper CC list severity inference | PMK 26/2021 | Current is count-based (1 diagnosis=I, 2=II, 3+=III) instead of actual CC list classification | Implement proper mild/major CC classification from ICD codes present | Medium |
| 31 | Mortality risk calibration | Real-world data | Current assessMortalityRisk has HIGH threshold (0.20-0.50) with no detectable effect | Compare simulation mortality rates against Indonesian hospital data | Low (deferred to JAMIA) |

## Coverage Summary

| Depth | Count | % of Total |
|-------|-------|-----------|
| Deep | 14 | 45% |
| Wired | 8 | 26% |
| Harvest | 3 | 10% |
| Fenced | 6 | 19% |
| **Total** | **31** | **100%** |

Wired fraction (non-fenced working): **25/31 = 0.81**

## When Regulations Change

Use this table to assess impact when a regulation is updated:

| Regulation | Affected Sources | Impact |
|------------|-----------------|--------|
| PMK 28/2020 (INA-CBG) | #1 (deep), #26, #27 (fenced) | Tariff values change. Update INA_CBG array. |
| PMK 3/2023 (severity) | #26, #28, #30 (fenced) | Severity levels and special CMG rules. |
| BPJS claim rules | #3, #4 (deep) | Adjudication split or SEP format changes. |
| Jasa Raharja cap | #5 (deep) | Treatment cap in ticks. |
| e-catalogue prices | #7 (deep) | Drug cost values. |
| Minimum wage (UMK) | #21 (wired) | Procedure fees adjust with UMK/regional index. |
| Permenkes 1171/2011 (SIRS) | #24, #25 (harvest) | Reporting form structure. |
| Clinical guidelines | #2 (deep), #14, #16-18 (wired) | Protocol content, drug interactions. |
