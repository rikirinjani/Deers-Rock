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
| T-DRUG-1 | Pharmacy acquisition cost per unit, 10 oral solids (USD per tablet/capsule): metformin 500 mg 0.01483, atorvastatin 20 mg 0.02858, omeprazole DR 20 mg 0.03045, acetaminophen 500 mg 0.03448, amoxicillin 500 mg 0.07925, ciprofloxacin 500 mg 0.12065, amlodipine 5 mg 0.01015, aspirin 81 mg chewable 0.02528, losartan 50 mg 0.03316, simvastatin 20 mg 0.03245 | rates as of 2026-11-04 | CMS NADAC 2026 dataset, data.medicaid.gov, identifier fbb83258-11c7-47f5-8b18-5f8e79f7e704, datastore query API, retrieved 2026-11-09; descriptions in `src/locale/us-nadac.ts` | C (acquisition cost) |
| T-PRICE-1 | National average cost-to-charge ratio, "Drugs and Cellular Therapies" cost center | 0.177 (charges = cost / 0.177, a factor of about 5.65); for context in the same list: Routine Days 0.394, Intensive Days 0.335, Supplies & Equipment 0.297, Laboratory 0.098, Radiology 0.123, Operating Room 0.153, Emergency Room 0.139 | FY 2026 final rule, computed from the March 2025 update of FY 2023 HCRIS cost reports | CMS-1833-F (IPPS FY 2026 final rule), the 19 national average CCRs (Federal Register 90 FR 36536, Aug 4 2025; the table is an image in the Federal Register text, so the values were read from the American College of Radiology summary of the rule, https://edge.sitecorecloud.io/americancoldf5f-acrorgf92a-productioncb02-3650/media/ACR/Files/Medicare-Medicaid/HIPPS/FY-2026-IPPS-Final-Rule-Summary.pdf; **secondary source, verify against the CMS rule tables before release**) | C (pharmacy markup); the other CCRs are candidates for lab, radiology, OR and ED charges |
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
| T-LOS-1 | All-stay mean length of stay and in-hospital mortality, by principal diagnosis (top 20) | HCUPnet / HCUP Fast Stats (free, interactive) | Interactive; needs a browser session |
| T-DEM-1 | Age distribution (under 5, under 18, 65+) | US Census Bureau QuickFacts / population estimates | QuickFacts returned HTTP 403; use the Census API or a data file |
| T-PAY-3 | Insured population mix (Medicare, Medicaid, private, uninsured) by age | KFF or Census ACS health insurance tables | Not yet fetched |
| T-OCC-1 | Occupancy rate | AHA (not in the Fast Facts page); CMS Hospital Cost Report | Not yet found |
| T-ED-1 | ED visits by age and disposition | CDC NHAMCS | Not yet fetched |
| T-WORK-1 | Nurse and physician workforce | BLS Occupational Employment | Not yet fetched |

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
- **Still placeholder:** family 131/132 (cleft repair, Q36/Q37): no DRG of that number in FY 2026, and the v43.0 MDC 03 section has no cleft or cranial/facial DRG; the correct v43 assignment was not found.
- Severity split structure (MCC/CC/none per family) and the missing CC-exclusion logic are unchanged; real payment also depends on wage index, DSH, IME and outliers.
- **2026-11-09, payer mix (T-PAY-3):** `US_PAYER_MIX_UNDER_65` in `src/engine/billing/us-payer.ts` is now derived in code from the Census constants: Private 68.1 %, Medicaid 18.3 %, Self-pay 9.6 %, TRICARE 2.8 %, VA 1.2 % (was 60 / 25 / 9 / 4 / 2). The derivation is a primary-payer partition (private first, then public-only, then uninsured) because coverage types overlap in the source; TRICARE and VA use all-age shares as the report has no under-65 split. Medicare stays age-driven (65+, no draw); the 1.0 % uninsured aged 65+ is not modelled. Hospital-stay payer shares (T-PAY-1) are a validation target and are not tuned.
- **2026-11-09, drug costs, pilot of 10 (T-DRUG-1):** `src/locale/us-nadac.ts` holds the ten NADAC rates; `US_DRUG_PRICES` uses rate x 3 (markup) for them and keeps the Indonesian-derived placeholder for the other drugs. Billed unit price before -> after (USD): metformin 0.22 -> 0.04, atorvastatin 0.75 -> 0.09, omeprazole 0.38 -> 0.09, acetaminophen 0.15 -> 0.10, amoxicillin 0.38 -> 0.24, ciprofloxacin 1.50 -> 0.36, amlodipine 0.38 -> 0.03, aspirin 0.08 -> 0.08, losartan 1.13 -> 0.10, simvastatin 0.60 -> 0.10. The old derived values were 1 to 12 times higher than NADAC x 3 for the same tablet.
- **Finding (not fixed):** the 3x pharmacy markup is an unsourced placeholder. Real US chargemaster markups on generic tablets are far higher than 3x, so billed pharmacy charges are now unrealistically low for these drugs. The markup needs its own target (hospital price transparency files or HCUP cost-to-charge ratios) before the pilot is extended to the other ~165 drugs. Aspirin uses the 81 mg NADAC entry for the simulator's 80 mg tablet. Prices stay in whole cents.
- **2026-11-09, pharmacy markup (T-PRICE-1):** `US_PHARMACY_MARKUP` is now 1 / 0.177 = 5.65 (was 3), defined from the cited CCR in `src/engine/billing/us-prices.ts`. It applies to every US drug price, so billed drug prices rise: the ten NADAC drugs now bill at metformin 0.08, atorvastatin 0.16, omeprazole 0.17, acetaminophen 0.19, amoxicillin 0.45, ciprofloxacin 0.68, amlodipine 0.06, aspirin 0.14, losartan 0.19, simvastatin 0.18 (USD per tablet); the other drugs keep the derived placeholder cost times the new markup (about 1.9x higher than before).
- **Reading of the number:** the CCR divides total pharmacy department cost (acquisition plus pharmacy labour and overhead) by charges, so charges over pure acquisition cost are at least 5.65x. The markup is therefore a lower bound; real generic tablets are often billed several dollars. The other CCRs in T-PRICE-1 can drive lab, radiology, OR and ED charges the same way when those price lists are calibrated.
