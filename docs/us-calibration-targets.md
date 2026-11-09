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

## What this first slice already shows against the 10-day simulator (Indonesian default, `clinical-v3`; the US feasibility runs gave the same length-of-stay and mortality shape)

- **Sepsis length of stay:** the target is 9.0 days; the simulator draws 3-7 days (mean 4.8) for every diagnosis, so the flat draw cannot reach it (confirms the need for the step E length-of-stay seam).
- **Sepsis in-hospital mortality:** target 14.2 %; the simulator's all-cause rate is 4.9 % pooled (per-diagnosis rates are too sparse to read at 130 discharges per run). M-A needs the tier-distribution measurement first.
- **Beds:** the simulator has 131 beds (hospital-scale); T-CAP rows give national totals for context only and are not directly tunable.

## TODO: sources identified, values not yet read

| ID | Target | Source | Why not yet |
|---|---|---|---|
| T-DRG-1 | MS-DRG relative weights, geometric and arithmetic mean length of stay per DRG | CMS FY 2026 IPPS final rule, Table 5 (ZIP of Excel). https://www.cms.gov/medicare/payment/prospective-payment-systems/acute-inpatient-pps/fy-2026-ipps-final-rule-home-page | Needs a file download; ask owner |
| T-DRG-2 | National operating and capital standardized amounts (replaces the placeholder base rate) | same page, Tables 1A-1E | Needs a file download; the Federal Register HTML addendum was not in the part of the page that I could read |
| T-DRG-3 | Average covered charges and payments by DRG | CMS Medicare Inpatient Hospitals by Provider and Service (data.cms.gov) | Not yet fetched |
| T-LOS-1 | All-stay mean length of stay and in-hospital mortality, by principal diagnosis (top 20) | HCUPnet / HCUP Fast Stats (free, interactive) | Interactive; needs a browser session |
| T-DEM-1 | Age distribution (under 5, under 18, 65+) | US Census Bureau QuickFacts / population estimates | QuickFacts returned HTTP 403; use the Census API or a data file |
| T-PAY-3 | Insured population mix (Medicare, Medicaid, private, uninsured) by age | KFF or Census ACS health insurance tables | Not yet fetched |
| T-OCC-1 | Occupancy rate | AHA (not in the Fast Facts page); CMS Hospital Cost Report | Not yet found |
| T-ED-1 | ED visits by age and disposition | CDC NHAMCS | Not yet fetched |
| T-DRUG-1 | Drug acquisition cost | CMS NADAC | Not yet fetched |
| T-WORK-1 | Nurse and physician workforce | BLS Occupational Employment | Not yet fetched |

## Notes

- HCUP statistical briefs report **in-hospital mortality per 100 stays**; the simulator's `grossDeathRatePerMille` is per 1,000 discharges (multiply by 10 to compare).
- Sepsis was chosen first because it has an HCUP brief with a payer split, length of stay, mortality and cost, all from one table set. It is also the first condition where the engine's flat length of stay is far off.
- Held-out rule: T-SEP-* are validation rows. When length of stay is tuned by DRG (step E), sepsis length of stay cannot also stay held out; the validation set must then move to a different diagnosis.
