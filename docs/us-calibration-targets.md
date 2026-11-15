# US calibration targets (Epic X, M10.5c step B)

**Status:** first slice, 2026-11-09. **Owner:** Research OC (fills and reviews); Platform OC reviews format.
**Rule:** no number enters the simulator without a row here. Every row has a value, year, population, source (document and table or figure), URL, retrieval date and a split: **C** = calibration (tuned to), **V** = validation (held out, never tuned to). Numbers were read from the cited document on the retrieval date; none comes from memory. Rows marked `TODO` have no value yet.

Retrieved 2026-11-09 unless stated.

## Sourced targets

| ID | Metric | Value | Year / population | Source | Split |
|---|---|---|---|---|---|
| T-CAP-1 | Staffed beds, all US hospitals | 907,216 | 2024 AHA Annual Survey, all hospitals | AHA, Fast Facts on U.S. Hospitals, 2026 edition. https://www.aha.org/statistics/fast-facts-us-hospitals | C (context for bed count) |
| T-CAP-2 | Admissions, all US hospitals | 35,658,583 | 2024, all hospitals | same | C |
| T-CAP-3 | Number of US hospitals (community hospitals) | 6,100 (5,121) | 2024 | same | context |
| T-CAP-4 | Staffed beds, community hospitals / admissions | 775,297 / 33,553,725 | 2024 | same | context |
| T-SEP-1 | Sepsis, in-hospital mortality (principal diagnosis) | 14.2 per 100 stays (13.0 without COVID-19) | 2022, all payers, all ages | HCUP Statistical Brief #306 addendum (June 2025), Figure 1. https://hcup-us.ahrq.gov/reports/statbriefs/sb306-overview-sepsis-2016-2022-addendum.pdf | V |
| T-SEP-2 | Sepsis, mean length of stay (principal diagnosis) | 9.0 days (8.6 without COVID-19); adults 65+ 8.4; adults 18-64 10.0 | 2022 | same, Table 1 | V |
| T-SEP-3 | Sepsis, mean total hospital cost per stay | $28,600 ($27,400 without COVID-19); adults 65+ $25,300; adults 18-64 $33,600 | 2022 dollars | same, Table 1 | V |
| T-SEP-4 | Sepsis, in-hospital mortality by age | 65+ nonmaternal 16.1; 18-64 nonmaternal 11.5 (per 100 stays) | 2022 | same, Figure 2 (values read from the chart labels, not a table) | V |
| T-PAY-1 | Share of aggregate hospital costs, all inpatient stays, by expected primary payer | Medicare 46.9 %, Medicaid 19.4 %, private 27.2 %, self-pay/no charge 3.4 %, other 3.1 % | 2016-2019 average, all stays | same brief, Figure 5 (row "All stays, 2016-2019"). **Share of costs, not of stays.** | C (payer mix, converted with care) |
| T-PAY-2 | Sepsis, share of aggregate cost by payer | Medicare 58.5 %, Medicaid 18.7 %, private 17.2 %, self-pay 2.9 %, other 2.7 % | 2022 | same, Figure 5 | V |
| T-PAY-3 | Health insurance coverage, people under 65: private (employer, direct purchase or TRICARE) / public / uninsured | 70.9 % / 22.4 % / 9.6 % (any coverage 90.4 %); 65+: 99.0 % covered, 94.1 % public, 1.0 % uninsured. All ages: employer 53.8 %, Medicare 19.1 %, Medicaid 17.6 %, direct purchase 10.7 %, TRICARE 2.8 %, VA/CHAMPVA 1.2 % | 2024, CPS ASEC, US population | Census Bureau, Health Insurance Coverage in the United States: 2024 (P60-288), Table A-1 (age rows) and report text (subtypes). https://www2.census.gov/library/publications/2025/demo/p60-288.pdf | C (population payer mix) |
| T-DRUG-1 | Pharmacy acquisition cost per unit, 94 oral solids (10 listed here; all 94 with NADAC description and rate in `src/locale/us-nadac.ts`) (USD per tablet/capsule): metformin 500 mg 0.01483, atorvastatin 20 mg 0.02858, omeprazole DR 20 mg 0.03045, acetaminophen 500 mg 0.03448, amoxicillin 500 mg 0.07925, ciprofloxacin 500 mg 0.12065, amlodipine 5 mg 0.01015, aspirin 81 mg chewable 0.02528, losartan 50 mg 0.03316, simvastatin 20 mg 0.03245 | rates as of 2026-11-04 | CMS NADAC 2026 dataset, data.medicaid.gov, identifier fbb83258-11c7-47f5-8b18-5f8e79f7e704, datastore query API, retrieved 2026-11-09; descriptions in `src/locale/us-nadac.ts` | C (acquisition cost) |
| T-PRICE-1 | National average cost-to-charge ratio, "Drugs and Cellular Therapies" cost center | 0.177 (charges = cost / 0.177, a factor of about 5.65); for context in the same list: Routine Days 0.394, Intensive Days 0.335, Supplies & Equipment 0.297, Laboratory 0.098, Radiology 0.123, Operating Room 0.153, Emergency Room 0.139 | FY 2026 final rule, computed from the March 2025 update of FY 2023 HCRIS cost reports | CMS-1833-F (IPPS FY 2026 final rule), the 19 national average CCRs (Federal Register 90 FR 36536, Aug 4 2025; the table is an image in the Federal Register text, so the values were read from the American College of Radiology summary of the rule, https://edge.sitecorecloud.io/americancoldf5f-acrorgf92a-productioncb02-3650/media/ACR/Files/Medicare-Medicaid/HIPPS/FY-2026-IPPS-Final-Rule-Summary.pdf; **secondary source, verify against the CMS rule tables before release**) | C (pharmacy markup); the other CCRs are candidates for lab, radiology, OR and ED charges |
| T-DEM-1 | US resident population by age band, both sexes | 0-17: 72,021,348 (21.07 %); 18-44: 123,821,921 (36.23 %); 45-64: 81,324,500 (23.79 %); 65+: 64,617,088 (18.91 %); total 341,784,857 | July 1 2025 estimate | Census Bureau, National Population by Characteristics 2020-2025, file `nc-est2025-agesex-res.csv`, column POPESTIMATE2025, SEX 0, summed over single years (https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/national/asrh/nc-est2025-agesex-res.csv, file SHA-256 prefix `6436d4f6972d415c`, retrieved 2026-11-09) | C (population age mix) |
| T-CASE-1 | Top 20 principal diagnoses of nonmaternal, nonneonatal inpatient stays: percent of stays / mean cost per stay | Septicemia 8.0 % / $18,700; heart failure 4.1 % / $12,800; osteoarthritis 4.1 % / $16,000; pneumonia except TB 2.7 % / $10,500; diabetes with complication 2.4 % / $11,600; acute MI 2.4 % / $22,300; cardiac dysrhythmias 2.2 % / $12,100; COPD and bronchiectasis 2.0 % / $9,200; acute and unspecified renal failure 2.0 % / $9,600; cerebral infarction 1.9 % / $14,900; skin and subcutaneous infections 1.9 % / $7,600; depressive disorders 1.9 % / $5,400; spondylopathies 1.9 % / $24,000; urinary tract infections 1.8 % / $7,500; respiratory failure 1.8 % / $17,900; schizophrenia spectrum 1.4 % / $9,300; coronary atherosclerosis 1.3 % / $24,400; biliary tract disease 1.3 % / $13,000; fluid and electrolyte disorders 1.3 % / $7,600; complication of care 1.2 % / $17,700. Top 20 together 47.6 % of 27,833,500 stays, mean cost $14,500 for all such stays | 2018, all payers, ages all | HCUP Statistical Brief #277 (July 2021), Table 1, 2018 NIS, CCSR categories. https://hcup-us.ahrq.gov/reports/statbriefs/sb277-Top-Reasons-Hospital-Stays-2018.pdf | V (case mix of inpatient stays; mean costs, in 2018 dollars, are a validation reference for charges) |
| T-ED-1 | US emergency department visits per year / visit rate per 100 persons | 155.4 million visits; 47.3 per 100 persons (data brief rounds to 47). Injury-related 43.5 million | 2022, all US ED visits (sample 16,025 visits) | CDC NCHS, NHAMCS 2022 National Summary Tables (tables 1, 3, 15, 23) via FastStats https://cdc.gov/nchs/fastats/emergency-department.htm and Data Brief No. 503 https://www.cdc.gov/nchs/products/databriefs/db503.htm, retrieved 2026-11-10 | C (ED arrival volume, per-capita) |
| T-ED-2 | ED visit rate by age, per 100 persons | under 1: 99; 1-17: 41; 18-44: 47; 45-64: 44; 65-74: 46; 75+: 76 | 2022 | Data Brief No. 503, Table 1 | V (age profile of ED arrivals) |
| T-ED-3 | ED visit disposition | admitted to hospital 11.5 % (17.8 million visits); admitted to critical care 3.1 million visits; transferred to another hospital 2.4 %; seen in under 15 minutes 40.6 % | 2022 | FastStats, tables 1, 3, 15, 23 | V (not tuned) |
| T-ED-4 | ED visits per staffed bed, average metropolitan hospital | 93.4 visits a day, 192.1 staffed beds (about 178 per bed per year); all EDs 67.6 a day, 136.5 beds | 2003-04 | CDC NCHS Advance Data No. 376, table at a glance | C (order-of-magnitude cross-check of T-ED-1 / T-CAP-1; old, by bed-size categories not published there) |
| T-ED-5 | Mean cost to produce a treat-and-release ED visit (cost, not charge) | $750 per visit (107.4 million visits, $80.3 billion); by payer Medicare 1,040, Medicaid 600, private 790, self-pay 610 | 2021 | HCUP Statistical Brief #311, Costs of Treat-and-Release ED Visits in the US, 2021 (Sept 2024); values read from a secondary summary, the brief itself was not opened | C (ED fee level, rough) |
| T-OCC-1 | Average hospital occupancy (census / staffed beds), national | 75 % (May 2023 to April 2024); about 64 % before the pandemic (2009-2019 average reported as 63.9 %) | 2020-2024 | Leuchter et al., JAMA Netw Open 2025;8(2):e2460645 (doi 10.1001/jamanetworkopen.2024.60645), values read from the UCLA release and press coverage, not the paper | V (not tuned; simulator figure is a day-10 snapshot, not steady state) |
| T-CAL-1 | US federal holidays 2026 (11): New Year (Jan 1), MLK (Jan 19), Washington's Birthday (Feb 16), Memorial Day (May 25), Juneteenth (Jun 19), Independence Day (observed Jul 3), Labor Day (Sep 7), Columbus Day (Oct 12), Veterans Day (Nov 11), Thanksgiving (Nov 26), Christmas (Dec 25) | dates | 2026 | OPM federal holiday schedule (5 U.S.C. 6103), dates cross-checked in several listings; opm.gov table not read directly | C (calendar coverage) |
| T-SHIFT-1 | Share of hospital staff nurses working 12-hour shifts | 65-85 % (Stimpfel and Aiken 2013, 22,275 hospital staff RNs); more than half of hospital staff nurses worked 12 or more hours a day (Am J Nurs 2006, pubmed 16575241); newly licensed nurses average 39.4 hours a week (NYU Rory Meyers study) | 2006-2019 | read from search summaries; papers not opened | C (shift length) |
| T-WORK-4 | Hospital employment, NAICS 622000, support and allied occupations | clinical laboratory technologists and technicians 150,930; phlebotomists 50,700; surgical technologists 83,590; medical and clinical records specialists 55,530; security guards 54,830; janitors and cleaners 97,320; social workers 55,770; physical therapists 71,920; occupational therapists 42,970; dietitians 22,750; nurse anesthetists 17,250; nurse midwives 1,890; dentists 2,170; psychologists 10,990; billing and posting clerks 37,680; medical secretaries 236,300; receptionists 35,630; office and administrative support (all) 683,580; management 284,660; medical assistants 139,070; nursing orderlies 44,870; EMTs 35,980; paramedics 17,900 | 2025 annual (OEWS) | BLS Public Data API v1, same series pattern as T-WORK-3, retrieved 2026-11-10 | C (staffing per bed) |
| T-WORK-1 | Registered nurses employed in the US / share employed in hospitals (state, local and private) | 3,465,400 jobs; 59 % in hospitals (derived: about 2.04 million hospital RNs); median pay $97,550 | 2025 | BLS Occupational Outlook Handbook, Registered Nurses, Quick Facts and "largest employers" list. https://www.bls.gov/ooh/healthcare/registered-nurses.htm, retrieved 2026-11-10 | C (nurse staffing level) |
| T-WORK-2 | Physicians and surgeons employed in the US | 862,800 jobs; median pay $275,930. No hospital share on the page | 2025 | BLS OOH, Physicians and Surgeons, Quick Facts. https://www.bls.gov/ooh/healthcare/physicians-and-surgeons.htm, retrieved 2026-11-10 | context (all settings; upper bound for hospital physicians) |
| T-WORK-3 | Hospital employment by occupation, NAICS 622000 (all hospitals) / 622100 (general medical and surgical) | All occupations 6,712,760 / 6,151,560; RNs 2,020,230 / 1,902,960; nurse practitioners 79,530 / 73,610; LPN/LVN 105,790 / 89,620; nursing assistants 479,330 / 442,820; physicians (SOC 29-1210) 210,810 / 201,360; surgeons (29-1240) 13,120 / not published; pharmacists 102,470; pharmacy technicians 85,080; radiologic technologists 138,130; respiratory therapists 112,130; physical therapists 71,920; medical and public health social workers 55,770; medical records specialists 55,530. Clinical laboratory technologists: no value returned | 2025 annual (OEWS), wage and salary jobs in the industry; excludes self-employed and most contracted physicians | BLS Public Data API v1, OEWS national industry series OEUN0000000{industry}{SOC}01 (e.g. OEUN000000062210029114101), https://api.bls.gov/publicAPI/v1/timeseries/data/, retrieved 2026-11-10 | C (staffing per bed) |
| T-DRG-1 | MS-DRG relative weight, geometric mean LOS, arithmetic mean LOS per DRG (772 DRGs) | e.g. DRG 871 (sepsis w MCC): weight 1.9425, GMLOS 4.8, AMLOS 6.4; DRG 872: 1.0233, 3.4, 4.2; DRG 193 (pneumonia w MCC): 1.3144, 3.9, 4.9 | FY 2026 (discharges 2025-10-01 to 2026-09-30), Medicare | CMS-1833-F Table 5 (file `CMS-1833-F Table 5.txt`, from https://www.cms.gov/files/zip/fy2026-ipps-fr-table-5.zip, zip SHA-256 `14dba6b8f06ab819...` (prefix)). Full comparison with the simulator: `docs/us-drg-table5-comparison.csv` | C (weights, DRG-level LOS) |
| T-DRG-2 | National adjusted operating standardized amount (full update, quality data submitted, meaningful EHR user) | labor $4,456.72 + nonlabor $2,295.89 = $6,752.61 (wage index > 1, 66.0 % labor); $4,186.62 + $2,565.99 = $6,752.61 (wage index <= 1, 62 % labor) | FY 2026 | CMS-1833-F Tables 1A and 1B (https://www.cms.gov/files/zip/fy2026-ipps-fr-table-1a-1e.zip, zip SHA-256 `3ef3177ea313e505...` (prefix)) | C (base rate) |
| T-DRG-3 | National capital standard federal payment rate | $524.15 | FY 2026 | CMS-1833-F Table 1D (same file) | C |

## What this first slice already shows against the 10-day simulator (Indonesian default, `clinical-v3`; the US feasibility runs gave the same length-of-stay and mortality shape)

- **Sepsis length of stay:** the target is 9.0 days; the simulator draws 3-7 days (mean 4.8) for every diagnosis, so the flat draw cannot reach it (confirms the need for the step E length-of-stay seam).
- **Sepsis in-hospital mortality:** target 14.2 %; the simulator's all-cause rate is 4.9 % pooled (per-diagnosis rates are too sparse to read at 130 discharges per run). M-A needs the tier-distribution measurement first.
- **Beds:** the simulator has 131 beds (hospital-scale); T-CAP rows give national totals for context only and are not directly tunable.

## Result of the first DRG comparison (CMS Table 5 vs the simulator's `us-drg.ts`)

- 212 of the 220 simulator DRGs match a FY 2026 Table 5 entry; 8 do not (778, 131, 132, 341, 342, 343, 247, 248), which need review or removal.
- The placeholder weights are close to CMS: median ratio simulator/CMS weight 0.94 (10th to 90th percentile 0.74 to 1.11); mean 1.17 vs 1.31 across these DRGs (unweighted).
- The placeholder base rate is $7,000 against the $6,752.61 operating standardized amount (T-DRG-2); capital ($524.15) is paid separately, and real Medicare payment adds wage index, DSH, IME and outlier terms that the simulator does not model.
- Mean length of stay by DRG (unweighted over the simulator's DRGs): geometric 3.37 d, arithmetic 4.42 d; the simulator draws a flat mean of 4.8 d. Per-DRG values range widely (sepsis w MCC 4.8 / 6.4; heart failure w/o CC/MCC 2.1 / 2.5), which is what the length-of-stay seam must reproduce.
- Medicare AMLOS for sepsis w MCC (6.4 d) differs from the all-payer HCUP sepsis mean (9.0 d, T-SEP-2): HCUP includes the mechanical-ventilation DRGs and non-Medicare stays. Use both and state which one a tolerance refers to.

## TODO: sources identified, values not yet read

| ID | Target | Source | Why not yet |
|---|---|---|---|
| T-DRG-4 | Average covered charges and payments by DRG | CMS Medicare Inpatient Hospitals by Provider and Service (data.cms.gov) | Not yet fetched |
| T-LOS-1 | All-stay mean length of stay, national | 5.2 days (2022), 5.1 days (2023; 95 % CI 5.0 to 5.2) | 2022-2023 | HCUPnet (AHRQ), National Inpatient Sample, all stays, export owner-supplied 2026-11-14 (HCUPnet_Analysis_National_IP_All-Stays_Data.xlsx) | C (stay length) |
| T-LOS-2 | Mean length of stay and in-hospital death rate by principal diagnosis, 420 CCSR categories | table in `docs/us-hcup-ccsr-2022-2023.csv` (discharges, mean LOS, deaths N, death %); 2023 examples: septicemia 7.5 d / 8.66 %, heart failure 5.8 d / 2.67 %, MI 4.4 d / 4.53 %, stroke 5.7 d / 3.76 %, respiratory failure 6.0 d / 7.34 %, knee osteoarthritis 2.4 d / 0.09 % | 2022-2023 | HCUPnet (AHRQ), National Inpatient Sample, principal diagnosis, CCSR; four exports owner-supplied 2026-11-14 (discharges N, mean LOS, in-hospital deaths N and %), merged | C and V (per-diagnosis stay and death) |
| T-PAY-3 | Insured population mix (Medicare, Medicaid, private, uninsured) by age | KFF or Census ACS health insurance tables | Not yet fetched |

## Notes

- HCUP statistical briefs report **in-hospital mortality per 100 stays**; the simulator's `grossDeathRatePerMille` is per 1,000 discharges (multiply by 10 to compare).
- Sepsis was chosen first because it has an HCUP brief with a payer split, length of stay, mortality and cost, all from one table set. It is also the first condition where the engine's flat length of stay is far off.
- Held-out rule: T-SEP-* are validation rows. When length of stay is tuned by DRG (step E), sepsis length of stay cannot also stay held out; the validation set must then move to a different diagnosis.

## Applied to the simulator

- **2026-11-09, base rate:** `MEDICARE_BASE_RATE` in `src/engine/billing/us-drg.ts` changed from the placeholder 7,000 to 7,276.76 = operating 6,752.61 (T-DRG-2) + capital 524.15 (T-DRG-3). Two exported constants carry the cited values, and `tests/us-tariff.test.ts` pins them. US payments fall about 4 % for the same DRG. Indonesian default unaffected (US-only file); full suite 705 passed, 3 skipped.
- **2026-11-09, weights and DRG mapping (T-DRG-1):** 94 of the 95 simulator DRG families now carry the FY 2026 Table 5 weights (10 % cap applied; 217 of 219 simulator DRGs matched). `docs/us-drg-table5-comparison.csv` is regenerated and a test checks every row (simulator weight equals Table 5). Three retired or mismatched families were remapped:
  - appendectomy 341-343 -> 397-399 "Appendix procedures" (CMS MS-DRG v43.0 Definitions Manual, MDC 06, https://www.cms.gov/icd10m/FY2026-fr-v43-fullcode-cms/fullcode_cms/P0009.html);
  - percutaneous stent 247/248 -> 321/322 "Percutaneous cardiovascular procedures with intraluminal device" (same manual, MDC 05, P0008.html; the drug-eluting split no longer exists);
  - threatened abortion 778 (deleted) -> folded into the 831-833 antepartum family. **Source is a third-party aggregator (icdlist.com), not the official manual, which only lists category titles; verify against the manual's code-assignment page before release.**
- **Cleft family (131/132): resolved 2026-11-13**, see the cleft section at the end of this file.
- Severity split structure (MCC/CC/none per family) and the missing CC-exclusion logic are unchanged; real payment also depends on wage index, DSH, IME and outliers.
- **2026-11-09, payer mix (T-PAY-3):** `US_PAYER_MIX_UNDER_65` in `src/engine/billing/us-payer.ts` is now derived in code from the Census constants: Private 68.1 %, Medicaid 18.3 %, Self-pay 9.6 %, TRICARE 2.8 %, VA 1.2 % (was 60 / 25 / 9 / 4 / 2). The derivation is a primary-payer partition (private first, then public-only, then uninsured) because coverage types overlap in the source; TRICARE and VA use all-age shares as the report has no under-65 split. Medicare stays age-driven (65+, no draw); the 1.0 % uninsured aged 65+ is not modelled. Hospital-stay payer shares (T-PAY-1) are a validation target and are not tuned.
- **2026-11-09, drug costs, pilot of 10 (T-DRUG-1):** `src/locale/us-nadac.ts` holds the ten NADAC rates; `US_DRUG_PRICES` uses rate x 3 (markup) for them and keeps the Indonesian-derived placeholder for the other drugs. Billed unit price before -> after (USD): metformin 0.22 -> 0.04, atorvastatin 0.75 -> 0.09, omeprazole 0.38 -> 0.09, acetaminophen 0.15 -> 0.10, amoxicillin 0.38 -> 0.24, ciprofloxacin 1.50 -> 0.36, amlodipine 0.38 -> 0.03, aspirin 0.08 -> 0.08, losartan 1.13 -> 0.10, simvastatin 0.60 -> 0.10. The old derived values were 1 to 12 times higher than NADAC x 3 for the same tablet.
- **Finding (not fixed):** the 3x pharmacy markup is an unsourced placeholder. Real US chargemaster markups on generic tablets are far higher than 3x, so billed pharmacy charges are now unrealistically low for these drugs. The markup needs its own target (hospital price transparency files or HCUP cost-to-charge ratios) before the pilot is extended to the other ~165 drugs. Aspirin uses the 81 mg NADAC entry for the simulator's 80 mg tablet. Prices stay in whole cents.
- **2026-11-09, pharmacy markup (T-PRICE-1):** `US_PHARMACY_MARKUP` is now 1 / 0.177 = 5.65 (was 3), defined from the cited CCR in `src/engine/billing/us-prices.ts`. It applies to every US drug price, so billed drug prices rise: the ten NADAC drugs now bill at metformin 0.08, atorvastatin 0.16, omeprazole 0.17, acetaminophen 0.19, amoxicillin 0.45, ciprofloxacin 0.68, amlodipine 0.06, aspirin 0.14, losartan 0.19, simvastatin 0.18 (USD per tablet); the other drugs keep the derived placeholder cost times the new markup (about 1.9x higher than before).
- **Reading of the number:** the CCR divides total pharmacy department cost (acquisition plus pharmacy labour and overhead) by charges, so charges over pure acquisition cost are at least 5.65x. The markup is therefore a lower bound; real generic tablets are often billed several dollars. The other CCRs in T-PRICE-1 can drive lab, radiology, OR and ED charges the same way when those price lists are calibrated.
- **2026-11-09, drug costs extended to 94 oral solids (T-DRUG-1):** 84 more drugs were matched to NADAC by name and strength (plain tablet or capsule, rate per unit, median where several descriptions match; as_of 2026-11-04) and reviewed by hand. Two wrong auto-matches were dropped (N-acetylcysteine matched a brand gabapentin tablet; methylphenidate matched an extended-release capsule).
- **Left on the derived placeholder (20 oral drugs):** canagliflozin, valproate, rifampicin, betahistine, hyoscine (no NADAC entry), cefixime, rivaroxaban, primaquine, propylthiouracil, nimodipine, digoxin, nitroglycerin, sucralfate, theophylline, folic acid 5 mg, colchicine, bismuth subsalicylate (no clean tablet or capsule match), artemether-lumefantrine (a pack, not a unit), N-acetylcysteine, methylphenidate. Injectables (IV, IM and SC, 72), topicals, inhalers and sublingual products other than buprenorphine are also not yet priced from NADAC: they need a billed-unit conversion (per mL or per vial against the simulator's per-dose billing).
- **Outliers to be aware of** (real NADAC values for uncommon strengths, kept as published): sitagliptin 100 mg 3.85, cyclosporine 100 mg 7.40, tinidazole 500 mg 2.47, isoniazid 100 mg 1.73, moxifloxacin 400 mg 1.42, pyrazinamide 500 mg 1.31 USD per unit. Mixed-form matches (median used, spread documented in the entry text): doxycycline, diclofenac, lithium, topiramate, lamotrigine.

## Lab, imaging and ED charges: sources tried (2026-11-09), no value applied

- **CMS OPPS Addendum A/B (APC payment rates) and the Clinical Laboratory Fee Schedule public file:** the download links go through the AMA CPT click-through licence (`cms.gov/apps/ama/license.asp`). Owner declined to accept the licence (ADR-027 keeps CPT out of the project unless a client asks), so these were not downloaded.
- **CMS Medicare Outpatient Hospitals by Provider and Service (data.cms.gov, average submitted charge per APC, no CPT needed):** the data API returned `Access Denied` / HTTP 403 to command-line and fetch-tool requests (server bot protection). Not worked around. A manual browser download of the dataset by the owner would unblock it.
- **Candidate licence-free alternatives not yet tried:** HCUP statistical briefs (mean ED charge per treat-and-release visit, aggregate, not by acuity); the CMS outpatient final-rule text; hospital price-transparency files of a single public hospital (not national).
- **Planned use of the sourced cost-to-charge ratios once cost data exists (T-PRICE-1):** laboratory 0.098, radiology 0.123, emergency room 0.139, operating room 0.153, supplies 0.297, routine days 0.394, intensive days 0.335.
- **Mapping caveat for ED:** sim ESI acuity 1-5 would map to facility ED visit levels 5-1 only by assumption (ESI and ED facility levels are different scales); record this before applying any ED fee.
- **Follow-up (2026-11-09):** the owner also gets `Access Denied` on data.cms.gov. A second attempt with a browser-style user agent was refused by the tool's own policy (bot-check circumvention) and not repeated. In addition, from CY2015 the CMS outpatient charge file only lists about 25-28 comprehensive-APC groups, so it probably does not contain the ED visit or imaging levels even if reachable (to be confirmed against the data dictionary). Kaggle holds no mirror of this dataset (searched). Conclusion: lab, imaging and ED charges stay placeholders until a CPT licence (client demand) or a reachable APC charge source exists.
- **2026-11-09, age mix (T-DEM-1):** `AGE_BANDS` in `src/locale/us-identity.ts` is now derived from the Census counts above (cumulative 0.2107 / 0.5730 / 0.8109 / 1; was 0.22 / 0.58 / 0.83 / 1). The draw count is unchanged, so the random stream keeps its position; only which band a draw lands in moves slightly (fewer 45-64, more 65+). A test pins the counts and shares. Hospital-stay age distribution (HCUP) is to emerge from the age-dependent disease weights and is a validation target, not tuned. The 65+ band is drawn 65-95 while the source runs to 100+.

## Diagnosis-level length of stay and mortality: what was found (2026-11-09)

- **Usable now (read):** sepsis 2022 (T-SEP-1 to T-SEP-4) and the 2018 top-20 mix and cost (T-CASE-1). Brief #277 gives no length of stay or mortality per diagnosis.
- **Dated candidates, not yet read (found through search summaries, verify in the brief before use):** HCUP Statistical Brief #81 (end-of-life hospitalizations, 2007 NIS: death rate by principal diagnosis, septicemia about 17 %); Brief #26 (circulatory conditions, older data: in-hospital death rate acute MI 7.2 %, cerebrovascular 10.7 %, heart failure 4.0 %); Brief #38 (mortality trends, older). These are 15 or more years old and predate large mortality improvements, so they would serve as bounds, not targets.
- **HCUP Fast Stats and HCUPnet** are the free sources for current diagnosis-level length of stay and mortality, but both were unreachable for the fetch tool (403). If the owner can export the HCUPnet table for the top 20 principal diagnoses (national, all payers, latest year: stays, mean length of stay, in-hospital mortality), it can be dropped into this file as T-LOS-1.
- **Case-mix comparison deferred to the US baseline run:** T-CASE-1 shares need the simulator's inpatient principal-diagnosis distribution from a US world run (cloud, 10 seeds). The ICD-10-CM to CCSR grouping (septicemia = A40/A41; pneumonia = J12-J18, etc.) is mapped by me and must be reviewed by Research OC before the comparison counts.

## US baseline run: case mix versus T-CASE-1 (2026-11-09)

Run: commit `3e78cdd`, US locale and US billing adapter, seeds 0-9, 50 initial patients, 14,400 ticks (10 days), Kaggle kernels `hoe-usbase-k0..k2` (dataset `hoe-src-3e78cdd`), worker `src/experiment/us-baseline.ts`. Source: append-only outcome records of closed inpatient stays.

- **Totals:** 1,261 inpatient stays (126.1 per run), 57 deaths (gross death rate 45.2 per mille), mean length of stay 4.80 days, end-of-run occupancy 80 %, 2,962 ED encounters per run, 134 distinct principal ICD codes. These match the Indonesian legacy reference (125.4 stays, 49.4 per mille, 4.79 days, 79.5 %), as expected: admission volume, length of stay and death rolls do not depend on locale.
- **Case mix (validation, V):** the 19 listed HCUP groups cover 30.3 % of simulator stays versus about 47 % in HCUP; ICD-to-group mapping is mine and needs Research OC review. Small sample (1,261 stays), so shares under about 1 % are noisy.

| Group (ICD-10 prefixes, my mapping) | Simulator share % | HCUP 2018 share % |
|---|---|---|
| Septicemia (A40, A41) | 2.1 | 8.0 |
| Heart failure (I50) | 1.2 | 4.1 |
| Osteoarthritis (M15-M19) | 0.2 | 4.1 |
| Pneumonia (J12-J18) | 5.6 | 2.7 |
| Diabetes (E10, E11, E13) | 3.7 | 2.4 |
| Acute MI (I21, I22) | 1.7 | 2.4 |
| Cardiac dysrhythmias (I47-I49) | 1.3 | 2.2 |
| COPD (J41-J44, J47) | 2.5 | 2.0 |
| Renal failure (N17, N19) | 1.5 | 2.0 |
| Cerebral infarction (I63) | 0.6 | 1.9 |
| Skin infections (L02, L03, L08) | 0.8 | 1.9 |
| Depressive disorders (F32, F33) | 1.0 | 1.9 |
| Spondylopathies (M45-M51) | 0.0 | 1.9 |
| Urinary tract infection (N30, N39) | 4.2 | 1.8 |
| Respiratory failure (J96) | 1.4 | 1.8 |
| Schizophrenia (F20, F25) | 0.4 | 1.4 |
| Coronary atherosclerosis (I25) | 0.2 | 1.3 |
| Biliary tract disease (K80-K83) | 0.9 | 1.3 |
| Fluid and electrolyte (E86, E87) | 1.0 | 1.3 |

- **Reading:** over-represented: pneumonia (5.6 vs 2.7), urinary tract infection (4.2 vs 1.8), diabetes (3.7 vs 2.4). Under-represented: septicemia (2.1 vs 8.0), heart failure (1.2 vs 4.1), osteoarthritis (0.2 vs 4.1), spondylopathies (0 vs 1.9), cerebral infarction, coronary atherosclerosis, schizophrenia. The largest HCUP categories are elective orthopaedic and chronic cardiac stays that the disease list barely covers; the simulator is rich in acute and infectious conditions (gastroenteritis, upper respiratory infection, chest or abdominal pain, conjunctivitis).
- **Not tuned.** Per the discipline above this is a finding, not a fit. Next: case-mix weights are a Research OC decision (the disease weights file is shared with the Indonesian pack, so a US-only weight table sits behind the case-mix seam).
- **Length of stay and mortality per diagnosis** are flat across diagnoses in the simulator (4.1-5.6 days, all codes), so T-LOS-1 (owner export pending) will show the gap directly.

## US case-mix weights fitted to T-CASE-1 (2026-11-09)

- **What changed:** `src/locale/us-casemix.ts` weights of 25 codes in 18 HCUP groups now come from `scripts/us-casemix-fit.ts` (one multiplier per group, iterated until principal-diagnosis shares match T-CASE-1; rounded to 0.5). The Indonesian pool is untouched (finance golden hashes unchanged, full suite 710 passed, 3 skipped).
- **Method (C/V split):** the fit uses a 40,000-patient US sample (seed 101, calibration C); shares were then measured on a different sample (seed 202, validation V). Principal diagnosis follows the engine rule (lowest priority = 100 - weight among 1-3 drawn codes), so weight and share are not proportional, which is why the fit is iterative. Septicemia group = A40 + A49 (A41 is not in the pool; A49 is a sepsis code in the simulator, not CCSR septicemia).
- **Result on the validation sample (share of principal diagnoses, %):** septicemia 8.2 (target 8.0), heart failure 3.9 (4.1), osteoarthritis 4.2 (4.1), pneumonia 2.7 (2.7), diabetes 2.3 (2.4), acute MI 2.5 (2.4), dysrhythmias 2.3 (2.2), COPD 2.0 (2.0), renal failure 1.9 (2.0), cerebral infarction 1.9 (1.9), skin infections 1.7 (1.9), depression 2.1 (1.9), UTI 1.7 (1.8), respiratory failure 1.8 (1.8), schizophrenia 1.3 (1.4), coronary atherosclerosis 1.1 (1.3), biliary 1.4 (1.3), fluid and electrolyte 1.7 (1.3). Covered share rose from 30.5 % to 44.7 % of 47.6 % (spondylopathies, 1.9 %, has no code in the pool).
- **Side effects to know:** the pool also feeds ED and outpatient mix, so hypertension, hyperlipidaemia and acute upper respiratory infection lose share; large weights for heart failure, osteoarthritis and acute MI (14.5-22.5) are a consequence of the 'heaviest drawn code is principal' rule, not a claim about prevalence. A fit on the pool is not yet a fit on simulated stays: the full-simulator check (seeds 10-19, not used to fit) is the next run.
- **Still open:** spondylopathies (needs an illness group, DRG family and protocol), per-diagnosis length of stay and mortality (T-LOS-1, owner export pending), the review of my ICD-to-group mapping by Research OC.

## US case-mix fit: full-simulator validation, seeds 10-19 (2026-11-09)

Run: commit `c19e78a` (fitted weights), US locale and billing, seeds 10-19 (not used in the fit), 50 initial patients, 14,400 ticks, Kaggle kernels `hoe-usval-k0..k2`. Same worker and group mapping as the baseline run, with the fit's groups (septicemia = A40 + A49, pneumonia = J12/J14/J15/J18).

- **Totals:** 1,181 stays (118.1 per run), 70 deaths (59.3 per mille; baseline 45.2), mean length of stay 4.72 days, end occupancy 84.5 %. More sepsis, acute MI and heart failure raise the high-risk tier, so deaths rise; seed noise is large (about 7 deaths per run), so only the direction is informative.
- **Case mix (share of stays %, simulator vs HCUP vs pool-level fit):** septicemia 5.2 vs 8.0 (fit 8.2), heart failure 3.3 vs 4.1 (3.9), osteoarthritis 1.4 vs 4.1 (4.2), pneumonia 4.1 vs 2.7 (2.7), diabetes 2.4 vs 2.4, acute MI 2.7 vs 2.4, dysrhythmias 1.9 vs 2.2, COPD 2.5 vs 2.0, renal failure 3.0 vs 2.0, cerebral infarction 1.1 vs 1.9, skin infections 1.0 vs 1.9, depression 1.0 vs 1.9, UTI 3.5 vs 1.8, respiratory failure 1.0 vs 1.8, schizophrenia 1.1 vs 1.4, coronary atherosclerosis 1.3 vs 1.3, biliary 0.8 vs 1.3, fluid and electrolyte 1.4 vs 1.3. Covered share 38.7 % (baseline 30.3 %; pool-level fit 44.7 %; HCUP 47.6 %).
- **Reading:** the fit moved the simulated stays most of the way (30.3 to 38.7 %), but not all of it: stays carry less septicemia and osteoarthritis than the pool does, and more UTI and pneumonia. The pool-to-stay gap comes from how patients reach a bed (admission takes the least recently discharged patient from a small, recurring patient pool, deaths remove patients, and patients arriving through the ED carry their own draws), none of which the pool-level fit models. Samples are small (about 1,200 stays), so shares under 2 % carry roughly +-0.3 points of noise.
- **Options (Research OC decision):** (a) accept the pool-level fit as the documented calibration and treat the stay-level gap as a known limit; (b) refit on simulated stays (run, adjust weights by the stay-level ratio, re-validate on new seeds; costs one Kaggle round of about 1.5-3.5 hours per iteration); (c) change how admission selects patients (engine change, touches the Indonesian default unless behind a seam).

## US case-mix: stay-level refit validated on seeds 20-29 (2026-11-10)

Run: commit `d0e1b02` (weights corrected once on the stays of seeds 10-19), US locale and billing, seeds 20-29 (unseen), 50 initial patients, 14,400 ticks, Kaggle kernels `hoe-usval2-k0..k2`. Validation (V).

- **Totals:** 1,277 stays (127.7 per run), 78 deaths (61.1 per mille), mean length of stay 4.82 days, end occupancy 77 %.
- **Case mix (share of stays %, simulator vs HCUP):** septicemia 6.7 vs 8.0, heart failure 3.7 vs 4.1, osteoarthritis 3.2 vs 4.1, pneumonia 3.5 vs 2.7, diabetes 2.7 vs 2.4, acute MI 2.8 vs 2.4, dysrhythmias 1.7 vs 2.2, COPD 2.3 vs 2.0, renal failure 2.0 vs 2.0, cerebral infarction 1.7 vs 1.9, skin infections 1.8 vs 1.9, depression 1.6 vs 1.9, UTI 2.4 vs 1.8, respiratory failure 1.6 vs 1.8, schizophrenia 0.7 vs 1.4, coronary atherosclerosis 0.6 vs 1.3, biliary 1.2 vs 1.3, fluid and electrolyte 1.6 vs 1.3. Covered share 41.9 % of the 44.5 % HCUP holds in these 18 groups (baseline 30.3 %, first fit 38.7 %). Largest remaining gaps: septicemia -1.3, osteoarthritis -0.9, schizophrenia -0.7, coronary atherosclerosis -0.7, pneumonia +0.8, UTI +0.6. Groups with fewer than 15 stays per 1,277 are noisy (+-0.3 points).
- **Decision:** stop correcting here. A third round would chase noise at this sample size. The case mix is documented as calibrated at stay level (V) to within about 1 point per group; spondylopathies (1.9 %) and complication of care (1.2 %) are not modelled.
- **Finding for step E (mortality):** the death rate is 45 to 61 per mille across the three US runs (legacy Indonesian reference 49.4), against a US all-stay in-hospital mortality that is not yet sourced here (T-LOS-1 export pending; no number from memory). The simulator's rate is high for general hospital stays, but it needs that target before it counts as a gap. The simulator's death roll depends on the risk tier, not the diagnosis, so heavier sepsis, MI and heart-failure mix raises it. Mortality parameters (M-A) are the lever.

## ED volume: simulator versus T-ED-1 (2026-11-10)

- **Simulator (US runs, seeds 20-29):** 2,962 ED encounters per 10 days = 296 per day, about 108,000 per year, for 131 beds (825 per staffed bed per year).
- **US reference (derived, mixed years, treat as an order of magnitude):** T-ED-1 155.4 million visits (2022) over T-CAP-1 907,216 staffed beds (2024) = about 171 ED visits per staffed bed per year. The simulator is about 4.8 times that. The average includes small hospitals and the beds counted include non-ED hospitals, so a busy urban 131-bed hospital would sit above the mean, but nowhere near 5 times is established. A per-hospital source (T-ED-4) is needed before this counts as a gap.
- **Not comparable yet:** ED admission share (T-ED-3, 11.5 %). In the simulator inpatient admissions are drawn from the patient pool, not from ED encounters, so the share of ED visits that end in admission is not an output. That link is an engine question for step E, not a weight to tune.
- **Applied to the simulator:** nothing. ED arrival volume is shared engine behaviour; changing it for the US would need a seam.

## Workforce: simulator versus T-WORK-1 (2026-11-10)

- **Simulator staffing (US world, seed 0, 50 initial patients):** 122 staff for 131 beds: nurse-type roles 50 (perawat 44, nurse anaesthetists 2, midwives 4), physicians 14 (specialists 9, general 5) plus 2 dentists, 7 pharmacy, 7 imaging and laboratory, rest support. Headcount is fixed by the agent roster, the same for the Indonesian and US worlds.
- **US reference (derived, mixed years, order of magnitude):** hospital RNs about 2.04 million (T-WORK-1, 3,465,400 x 59 %) over 907,216 staffed beds (T-CAP-1) = about 2.2 RNs per staffed bed. The simulator has about 0.38 nurse-type staff per bed, roughly 6 times fewer. Physicians: 862,800 in all settings over the same beds is at most about 0.95 per bed, against 0.11 in the simulator (about 8 times fewer, and the US number is an upper bound for hospitals). The employed RN count includes outpatient departments and part-time work (headcount, not full-time equivalents), so the ratio overstates bedside staffing; the direction (the simulator is thinly staffed for a US hospital) is not in doubt.
- **Why it matters with T-ED-1:** the same simulated hospital sees about 4.8 times the US average ED volume per bed with about one sixth of the nurses per bed. Any US run of the staffing, wait-time or burnout behaviour inherits this.
- **Applied to the simulator:** nothing. Raising US headcount is a roster change behind a US seam (the Indonesian roster and its golden hashes must stay identical); hospital-only role counts (T-WORK-3) should be sourced first.

## Workforce per staffed bed: simulator versus T-WORK-3 (2026-11-10)

US per staffed bed = T-WORK-3 (NAICS 622000, all hospitals, 2025) divided by T-CAP-1 (907,216 staffed beds, 2024); the years differ and employment covers outpatient and ED staff as well as inpatient wards, so read it as an upper reference. Simulator = US world, seed 0, 131 beds, 122 staff (roster fixed, same in the Indonesian world).

| Role group | US employed (622000) | US per bed | Simulator staff | Simulator per bed |
|---|---|---|---|---|
| All occupations | 6,712,760 | 7.40 | 122 | 0.93 |
| Registered nurses (sim: perawat + nurse anaesthetists + midwives) | 2,020,230 | 2.23 | 50 | 0.38 |
| Physicians (sim: specialists + general) | 210,810 | 0.23 | 14 | 0.11 |
| Pharmacists / pharmacy technicians (sim: apoteker / asisten apoteker) | 102,470 / 85,080 | 0.11 / 0.09 | 3 / 4 | 0.02 / 0.03 |
| Radiologic technologists (sim: radiografer) | 138,130 | 0.15 | 3 | 0.02 |
| Medical records specialists (sim: rekam medis + koder) | 55,530 | 0.06 | 6 | 0.05 |

- **Reading:** this replaces the cruder estimate above: with hospital-only headcount the physician gap is about 2 times (0.11 vs 0.23, employed physicians only; contracted and self-employed hospital physicians are not counted, so the true US figure is higher), the nurse gap about 6 times, pharmacy and imaging about 5 to 8 times, records staff about at par. Overall the simulator has about one eighth of the US hospital staff per staffed bed. Nursing assistants (0.53 per bed) have no counterpart role in the simulator roster.
- **Caveat on the comparison:** a bed ratio over-states ward staffing because hospital employment also serves outpatient clinics and EDs; with the simulator's ED volume at about 4.8 times the US average per bed (T-ED-1), its demand per staff member is far above US practice either way.
- **Applied to the simulator:** nothing. A US roster is a seam in `src/agent/generator.ts` (roster headcounts), scaled per bed; the Indonesian roster and golden hashes must stay identical. Role mapping above is mine and needs Research OC review.

## Applied: US staffing seam (2026-11-10)

- **Seam:** `IStaffing` (`src/locale/contracts.ts`), registry `getStaffing/useStaffing/resetStaffing`, Indonesian default `IndonesiaStaffing` (the original `max(min, round(beds / ratio))` formulas, moved to `INDONESIA_STAFF_RULES`), US pack `USStaffing` in `src/locale/us-staffing.ts`, selected by `useUSLocale()`. `generateAgentPool` now asks the seam for each role's headcount; role order and draw order are unchanged.
- **US headcounts (131 beds):** nurses (RN + LPN/LVN) 44 to 307, specialists 9 to 20 and general physicians 5 to 11 (BLS physician total split 9:5 as in the legacy roster; the split itself is unsourced), pharmacists 3 to 15, pharmacy technicians 4 to 12, radiologic technologists 3 to 20. All other roles keep the legacy count (no sourced per-bed figure yet). Agents in the US world: 122 to 439. Per bed this closes the nurse and clinical gaps of the table above; total staff per bed stays about 3.4 against the US reference of 7.4 until support roles are sourced.
- **Regression gates (Indonesian default):** E1 CSV `084024be6e8b9661...` and summary `068b07b2238ecd55...` unchanged; finance golden `6f25fe37ac62a6a4`, `a5e2afe343457617`, `05e3e2568db1179f` unchanged; full suite 713 passed, 3 skipped. A test pins the legacy headcounts (122 staff) and the US counts.
- **Cost:** a US world of 2,000 ticks runs in about 21 s locally with 439 agents. Earlier US baselines (seeds 0-29) used the old 122-staff roster, so their stay-level numbers predate this change; the next US run re-measures occupancy, deaths and sick leave.
- **Not yet done:** US staffing does not yet change behaviour that depends on staff load (waiting times, burnout) beyond what the engine already models with more nurses; whether it changes admissions, deaths or ED handling must come from the next run, not from assumption.


## US baseline with staffing seam (2026-11-10)

Run: commit `77ed070` (US locale, US billing adapter, US staffing: 439 agents instead of 122), seeds 30-39, 14,400 ticks, 50 initial patients, Kaggle kernels `hoe-usstaff-k0..k2` (dataset `hoe-src-77ed070`).

| Metric | Seeds 20-29 (122 agents) | Seeds 30-39 (439 agents) |
|---|---|---|
| Inpatient stays | 1,277 (127.7 per run) | 1,229 (122.9 per run) |
| Deaths per 1,000 stays | 61.1 | 56.1 (69 deaths) |
| Mean length of stay (days) | 4.82 | 4.81 |
| End-of-run occupancy | 77 % | 81 % |
| HCUP group coverage | 41.9 % of 44.5 % | 40.6 % |

- **Reading:** the staffing change has no measurable effect on stays, length of stay or deaths. Differences are inside seed noise (10 runs, about 70 deaths). Expected: admission, length of stay and the death roll do not depend on headcount; staff only affect task throughput. Seeds differ between the two runs, so this is not a paired comparison.
- **Runtime:** 3,700-9,100 s per seed (about 3x slower than with 122 agents), so a 10-seed US run costs about 3x more Kaggle time.
- **Finding:** more staff does not change patient outcomes in the current engine. Staffing is calibrated to headcount only, not to effect, until the length-of-stay and mortality seams (step E) let staffing matter.

## ED volume: per-hospital source and ED arrival seam (2026-11-10)

- **T-ED-4 sourced (cross-check only):** CDC NCHS Advance Data No. 376 (NHAMCS 2003-04, 2006) gives the average metropolitan ED 93.4 visits a day and 192.1 staffed beds, about 178 visits per bed per year; all EDs 67.6 visits a day and 136.5 beds, about 181. This is two decades old, but it agrees with the 2022/2024 national ratio (171 per bed), so about 170-180 ED visits per staffed bed per year is a stable US figure. It is a mean per hospital; the report gives no split by bed-size class, so a 131-bed hospital is not separately targeted.
- **Correction to the earlier ED comparison:** the engine admits one ED arrival every 3 ticks, 480 a day (verified: 100 ED encounters in 300 ticks). The 296 a day in the section above counted only encounters that survived pruning (`MAX_ENCOUNTERS = 500`), so it understated the volume. Real simulator rate: 480 a day for 131 beds = 3.66 per bed per day, about 1,340 per bed per year, **about 7.8 times** the US figure (not 4.8). The `edEncounters` field in `us-baseline.ts` stays a surviving-record count, not a volume.
- **Applied: ED arrival seam.** `IEdDemand.arrivalIntervalTicks(totalBeds)`; `emergencyHandler` runs on ticks divisible by it. Indonesian default is 3 at any size (byte-identical: E1 CSV `084024be6e8b9661`, summary `068b07b2238ecd55`, finance golden hashes unchanged). US: T-ED-1 / T-CAP-1 = 171.3 visits per staffed bed per year, so 131 beds gives one arrival every 23 ticks (about 63 a day).
- **Effects to expect in US runs:** ED encounters, ED charges and ED staff load fall by about 7.8x; inpatient admissions are drawn from the patient pool and should not move. ED length of stay (2-7 ticks) stays far below real ED visit duration (about 3 hours in NCHS 2003-04); that is a separate engine question.
- **Not done:** re-run on Kaggle to confirm the US ED volume and the finance side effects.

## US baseline with ED arrival seam (2026-11-10)

Run: commit `828c343` (US locale, billing, staffing, ED arrival every 23 ticks), seeds 40-49, 14,400 ticks, 50 initial patients, Kaggle kernels `hoe-used-k0..k2` (dataset `hoe-src-828c343`).

| Metric | Seeds 30-39 (ED every 3 ticks) | Seeds 40-49 (ED every 23 ticks) |
|---|---|---|
| Inpatient stays per run | 122.9 | 118.2 |
| Deaths per 1,000 stays | 56.1 (69 deaths) | 40.6 (48 deaths) |
| Mean length of stay (days) | 4.81 | 4.78 |
| End-of-run occupancy | 81 % | 82 % |
| Surviving ED encounter records per run | 2,964 | 380 |
| Wall time per seed | 3,700-9,100 s | 470-1,170 s |

- **ED volume:** the surviving-record count (capped by pruning, `MAX_ENCOUNTERS = 500`) fell 7.8x, matching the ratio of cadences (23/3 = 7.7), but it is a floor and not the true volume; expected true volume is about 63 a day (about 630 per 10 days). Not independently counted.
- **Speed:** a US run is about 7x faster, since most of the engine load was ED work.
- **Stays and length of stay:** unchanged within noise. Admissions are drawn from the patient pool, as expected.
- **Deaths:** 40.6 against 56.1 per mille (48 against 69 deaths). Each set is only about 50-70 deaths, so this is borderline and not established as an effect; there is no mechanism in the code linking ED volume to the death roll. Treat the US death rate as 40-60 per mille until T-LOS-1 (owner export) supplies the target.

## Verification: O20 mapping and drug cost-to-charge ratio (2026-11-10)

- **O20 to DRG 831-833 (verified against CMS).** The CMS ICD-10-CM/PCS MS-DRG v43.0 Definitions Manual (https://www.cms.gov/icd10m/FY2026-fr-v43-fullcode-cms/fullcode_cms/P0312.html) defines MS-DRGs 831, 832 and 833 (other antepartum diagnoses without O.R. procedure, with MCC, with CC, without CC/MCC) and lists O20.0 (threatened abortion) among the principal diagnoses. This replaces the aggregator source noted earlier. Only O20.0 was read on that page; the simulator maps the whole O20 category, and O20.8 and O20.9 and the O14 and O15 mappings were not individually confirmed.
- **CCR 0.177 (partly verified).** The official final-rule text (90 FR 36536, Federal Register 2025-14681) prints the 19 national average CCRs as an image (TR04AU25.134), so the value cannot be read there. The value 0.177 (Drugs and Cellular Therapies) agrees between the ACR summary used before and a second listing of the Table 5 CCRs (Routine Days 0.394, Intensive Days 0.335, Drugs 0.177, Supplies and Equipment 0.297). Both are secondary; the CMS final-rule PDF (cms-1833-f.pdf) was not read. Status: two independent secondary sources, official table not read.

## NADAC extension: 36 dose-priced drugs (2026-11-10)

- **Source:** the same NADAC dataset as T-DRUG-1 (data.medicaid.gov, current rows as_of 2026-11-11), queried per drug name through the datastore API and read in memory.
- **Applied:** `US_NADAC_DOSES` in `src/locale/us-nadac.ts`: 94 + 36 = 130 of 214 active US drugs now bill at NADAC x markup. The new entries are 7 vials priced per vial (ceftriaxone 1 g, vancomycin 500 mg, ertapenem 1 g, colistimethate 150 mg, pantoprazole 40 mg, hydrocortisone 100 mg, glucagon 1 mg), 21 injectables priced per mL x the dose volume in the NADAC description (furosemide 40 mg = 4 mL, labetalol 100 mg = 20 mL, propofol 20 mL, enoxaparin 40 mg = 0.4 mL, ...) and 8 oral solids. Examples (billed, USD): ceftriaxone 1 g 8.23, vancomycin 500 mg 13.02, ertapenem 1 g 266.70, furosemide 40 mg 5.98, morphine 10 mg 13.23, enoxaparin 40 mg 16.89.
- **Caveat:** NADAC is a retail-pharmacy acquisition price; hospital contract prices for injectables differ, so treat the injectable values as order of magnitude. Unmatched (strength, form or concentration differs, stale row, or no row): meropenem 500 mg, cefazolin 2 g, rocuronium, primaquine, insulins, inhalers, topicals, vaccines, antineoplastics, iron sucrose, calcium and magnesium salts, IV fluids, adenosine, epinephrine, pethidine, nimodipine, colchicine, folic acid 5 mg, propylthiouracil, rivaroxaban 20 mg, apixaban, empagliflozin, canagliflozin. 84 drugs still bill at the derived placeholder.
- **Not changed:** the Indonesian price book. US billed drug prices moved (US only).

## Staffing: support and allied roles (2026-11-10)

- **Applied:** `US_STAFF_PER_BED` extended from T-WORK-4: lab technologists, records specialists (split 5:4 between records and coding, my assumption), security, cleaning, social work, physical and occupational therapy, nutrition, nurse anaesthetists, nurse midwives (CNMs only), dentists, psychologists, billing clerks and office admin (medical secretaries + receptionists, includes clinic front desks, so an upper reference). Roles still on the Indonesian formula: ambulance drivers, finance staff, inventory staff.
- **131-bed US hospital:** 520 agents (439 after the first pass, 122 originally): lab 22, records 4, coding 4, security 8, cleaning 14, social work 8, physio 10, occupational therapy 6, nutrition 3, nurse anaesthetists 2, midwives 1 (was 4), dentists 1, psychologists 2, billing 5, admin 39.
- **Unmapped sources (no roster role):** nursing assistants (479,330), phlebotomists, surgical technologists, medical assistants, orderlies, EMTs and paramedics.
- **Expect:** about 18 % more agents per US world, so US runs get somewhat slower; midwives drop from 4 to 1 because OEWS counts certified nurse-midwives only (delivery nursing sits in the RN count).

## Occupancy, calendar and shifts versus targets (2026-11-10)

- **Occupancy (T-OCC-1):** simulator end-of-run occupancy 77-82 % across the US runs against 75 % national (64 % before the pandemic). In range for the post-pandemic level, but the simulator number is a day-10 snapshot after a 50-patient start, and admissions are drawn at a fixed rate, so it is not a calibrated steady state. Not tuned.
- **Calendar (T-CAL-1):** the US calendar models 6 of the 11 federal holidays (New Year, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas), with dates that match the 2026 OPM list. Not modelled: MLK Day, Washington's Birthday, Juneteenth, Columbus Day, Veterans Day. It also models Halloween (not federal). The holiday influx multipliers (1.1-1.4) and seasonal boosts remain unsourced placeholders; no sourced holiday ED volume target was found, so none is applied.
- **Shifts (T-SHIFT-1):** the US pattern is 12-hour day and night shifts, consistent with 65-85 % of hospital staff nurses. The simulator's rotating4 roster averages 42 hours a week against 36 for a three-shift week and about 39 for newly licensed nurses, a slight over-count of hours. Not changed.


## US baseline with all M10.5c seams (2026-11-11)

Run: commit `a1da104` (US locale, billing, case mix, staffing with 520 agents, ED arrival every 23 ticks, NADAC dose prices), seeds 50-59, 14,400 ticks, 50 initial patients, Kaggle kernels `hoe-usfull-k0..k2` (dataset `hoe-src-a1da104`).

| Metric | Seeds 40-49 (439 agents) | Seeds 50-59 (520 agents) |
|---|---|---|
| Inpatient stays per run | 118.2 | 118.5 |
| Deaths per 1,000 stays | 40.6 (48 deaths) | 59.1 (70 deaths) |
| Mean length of stay (days) | 4.78 | 4.77 |
| End-of-run occupancy | 82 % | 79 % |
| Surviving ED encounter records per run | 380 | 391 |
| Wall time per seed | 470-1,170 s | 630-1,000 s |

- **Deaths:** the 40.6 per mille in seeds 40-49 was noise. Across the four US runs since the case-mix refit the rate has been 61.1, 56.1, 40.6 and 59.1 per mille. The simulator's rate is therefore about 40-60 per mille, and it moves with seed, not with staffing or ED volume. T-LOS-1 (owner export pending) will supply the target.
- **Everything else:** stays, length of stay, occupancy and run time are unchanged within noise. The extra 81 agents added no measurable run time.
- **Reading:** none of the M10.5c seams (case mix, staffing, ED volume, drug prices) moves inpatient volume, length of stay or mortality. The levers for those are the length-of-stay seam and the mortality parameters in step E.

## Cleft lip and palate DRGs, and the eight unmatched DRGs (2026-11-13)

- **State of the eight unmatched DRGs:** the list of eight (778, 131, 132, 341, 342, 343, 247, 248) is from the first comparison run. Six were already remapped on 2026-11-09 (341-343 to 397-399, 247-248 to 321-322, 778 into 831-833). The last two, the cleft family 131/132, are fixed now. The simulator's 225 DRG rows all match a FY 2026 Table 5 entry, with weight equal to Table 5 (median simulator/CMS ratio 1.00).
- **Source (CMS ICD-10-CM/PCS MS-DRG v43.0 Definitions Manual, https://www.cms.gov/icd10m/FY2026-fr-v43-fullcode-cms/fullcode_cms/):** (a) principal diagnoses Q35, Q36 and Q37 (cleft palate and cleft lip) are listed under MDC 03 MS-DRGs 157-159 Dental and Oral Diseases (page P0096.html; they are not on the 154-156 pages); (b) the Procedure Code/MS-DRG Index (page P1901.html) lists the lip repairs 0CQ00ZZ and 0CQ10ZZ (and the 3 and X approaches 0CQ03ZZ, 0CQ13ZZ) under MDC 03 MS-DRGs 137-138 Mouth Procedures, and the palate repairs 0CQ20ZZ, 0CQ30ZZ (and 3, X approaches) under MDC 03 MS-DRGs 143-145 Other Ear, Nose, Mouth and Throat O.R. Procedures. The old 131/132 "Cranial and facial procedures" family does not exist in v43 for this use.
- **Applied (`src/engine/billing/us-drg.ts`):** no repair on the chart: 157-159 (weights 1.7168 / 0.9098 / 0.7085, Table 5); Q36 with a procedure: 137-138 (1.4932 / 0.8862); Q37 with a procedure: 143-145 (3.7466 / 1.7329 / 1.2023). Placeholder weights (2.10, 1.40) are gone.
- **Assumptions to review:** Q37 (palate with lip) is priced as a palate repair, since the surgical hierarchy for a combined lip and palate repair was not read; the simulator carries one principal code per stay, not the specific Q35-Q37 sub-code, so the lip, palate and combined cases are not separated beyond Q36 versus Q37; Q35 (isolated cleft palate) is not generated by the simulator.
- **Effect:** cleft stays are rare in the simulator; the change is US-only and does not touch the Indonesian default.

## Optional items: federal holidays, ED charge level, lab and imaging (2026-11-13)

- **Federal holidays (applied):** the five missing federal holidays are in `src/locale/us-calendar.ts` as neutral events (multiplier 1, no modifiers, no complaints): MLK Day (Jan 18, 2027 observance), Washington's Birthday (Feb 15, 2027), Juneteenth (Jun 19), Columbus Day (Oct 12), Veterans Day (Nov 11). The calendar now covers all 11 OPM federal holidays (T-CAL-1) and has no sourced ED effect for the new five; nothing about volume or case mix changes. The calendar has no year, so the January and February holidays use the 2027 dates, which fall inside the run horizon after the 2026-06-15 start.
- **ED charge level (finding, not applied):** an ED encounter bills only the ED fee in the simulator (`emergencyHandler` posts one `ED-P{acuity}` charge). With the complaint mix and the 15 % instability upgrade, the mean placeholder fee is about 2,380 USD (derived: 5 of 18 complaints at 3,500, 4.75 at 2,800, 4.25 at 2,000, 1 at 1,200, 3 at 800). T-ED-5 gives a mean cost of 750 USD per treat-and-release visit; dividing by the Emergency Room CCR 0.139 (T-PRICE-1) gives a charge equivalent of about 5,400 USD (5,396), so the simulator's ED bill is about 0.44 of the charge-equivalent. The comparison is rough: the real visit cost includes ancillary lab and imaging, which the simulator's ED visit does not bill, the CCR is a national average over all ER costs, and T-ED-5 is a secondary-source figure. No change made.
- **Lab and imaging charges (blocked):** no CPT-free public source was found. The Medicare Clinical Laboratory Fee Schedule and the Physician Fee Schedule are keyed by CPT/HCPCS code; hospital price-transparency files are too. The repository forbids CPT content and the AMA licence is not accepted, so tests cannot be priced by code lookup without a decision from the owner (for example: derive prices outside the repo from the fee schedule and store only test names and dollar values, with no code numbers). The sourced CCRs (laboratory 0.098, radiology 0.123) exist but need a cost per test or study to be applied.
- **Update 2026-11-14 (license gate):** the CY 2026 CLFS file (26CLABQ4, 2,243 records) is served through a CMS page that routes the download via the AMA CPT licence screen (`cms.gov/apps/ama/license.asp`). Per the standing rule the licence was not accepted, and no direct link around the gate was used, so nothing was downloaded. Lab and imaging charges stay placeholders. The owner can accept the licence personally and place the file outside the repository; the codes would then be used only to look up dollar values, and only test names and dollars would be stored in the repo.

## Step E: stay-outcomes seam, length of stay and in-hospital death by diagnosis (2026-11-14)

- **Data (T-LOS-1, T-LOS-2):** four HCUPnet exports (owner-supplied) merged into `docs/us-hcup-ccsr-2022-2023.csv`: 420 CCSR principal-diagnosis categories, 2022 and 2023, with discharges, mean length of stay, in-hospital deaths and death percent. The discharge-weighted mean of the category LOS values is 5.12 days (2022) and 5.01 days (2023), consistent with the overall 5.2 and 5.1 (T-LOS-1). 2023 total 33.1 million discharges. COVID-19 is the fourth largest category in 2022 (822,820 discharges, 7.24 % deaths) and drops out of the 2023 top 20, so 2023 is the target year.
- **Suppression:** HCUPnet suppresses cells with fewer than 11 discharges or deaths or a relative standard error over 0.30. In 2023, 13.8 % of discharges sit in categories with a suppressed death figure (mostly pregnancy, psychiatric and low-mortality categories). The pooled death rate of the unsuppressed categories (2.10 % in 2023) is therefore a floor and is not used as a target.
- **Seam (`IStayOutcomes`, `src/locale/us-stay-outcomes.ts`):** the Indonesian default keeps the 3-7 day uniform stay (one RNG draw) and the risk-tier death probability, byte-identical (gates below). The US locale uses the HCUP mean length of stay per principal diagnosis (group mean x (0.6 + 0.8 u), the same +-40 % spread as the default; the shape is not calibrated) and, for death, the HCUP group rate for the low risk tier and the larger of the group rate and the tier probability for the moderate and high tiers. Suppressed death rates are taken as 0 (assumption); unmapped codes use the all-stay mean (5.1 days) and the tier probability.
- **Mapping (my mapping, for Research OC review):** the engine's 3-character ICD-10 categories map to CCSR categories by hand (`US_ICD_TO_CCSR`, every code of the US pool). CCSR is defined on full ICD-10-CM codes, so a 3-character category that spans several CCSR categories uses the nearest one (for example D64 to nutritional anemia, Q36 and Q37 to cleft lip or palate, A49 and A40 to septicemia as in the T-CASE-1 fit).
- **Known limits:** the simulator draws inpatients from a pool without newborns or obstetric delivery stays in the proportion of the US (liveborn is 10 % of US discharges), so the simulator's overall mean length of stay is not expected to equal 5.1 days; compare per diagnosis instead. The mixed tier-and-group death rule is my choice and has not been fitted.

## Step E run: stay outcomes versus HCUP (seeds 60-69, 2026-11-16)

- **Run:** Kaggle, 10 seeds, 14,400 ticks (10 days), 50 starting patients, US locale with all seams and the stay-outcomes seam (commit 58abf4a). 1,420 stays (142 per run), 58 deaths, end occupancy 77 %. Mapped stays: 99.1 % of stays.
- **Length of stay (per diagnosis): close, biased low.** Most common diagnoses are within 0.1 to 0.5 days of the HCUP mean (knee osteoarthritis 2.33 vs 2.4, chest pain 2.05 vs 2.1, UTI 4.08 vs 4.3, cerebral infarction 5.56 vs 5.7). The simulated overall mean is 3.79 days against 4.35 days expected from the HCUP means at the simulator's own case mix. Long-stay diagnoses are most affected (septicemia 5.2 and 6.5 vs 7.5, heart failure 4.6 vs 5.8, depression 5.1 vs 6.8). Cause (not fixed): the outcome records hold only stays that closed within the 10-day run, so long stays that start late are cut off (right censoring), and the 50 starting patients are discharged early. A longer run would remove most of it; no change was made to the seam.
- **Deaths: the mixed rule overshoots.** 58 simulated deaths (40.8 per mille) against 21.3 expected at HCUP rates for the same stays (15 per mille). Heart failure shows it: 9 deaths in 28 stays against an HCUP rate of 2.67 %. The excess comes from the moderate and high risk tiers, which keep the tier probability (6 % and 25 %) when it is larger than the group rate, and the tier score flags heart failure, MI, sepsis and stroke as critical diagnoses. This is a finding, not tuned.
- **Options for the death rule (owner / Research OC decision):** (1) group rate only, tier ignored for the roll (about 21 deaths, loses the vitals and age effect); (2) group rate scaled by the tier relative to the mean tier probability of the same diagnosis (keeps ranking, matches the group rate on average, needs a measurement of the tier mix); (3) keep as is. Option 2 is the one I would implement.
- **Not covered:** the simulator has no newborn or delivery stays in US proportion, so the overall mean (5.1 days, T-LOS-1) is not a test of this seam.
