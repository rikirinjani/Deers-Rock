# Research OC — External evidence and model critique (`clinical-v1`)

**Date:** 2026-11-02 · **Author role:** Research OC · **Status:** draft for Coordinator / Platform OC review
**Model under test:** commit `354d1be` (P-002 on, `DR_CLINICAL_VITALS` default), frozen baseline `clinical-v1`
(`docs/experiments/EXPERIMENT-FREEZE-2026-11-01-clinical-v1.md`).
**Scope:** compare `clinical-v1` with outside evidence for an Indonesian mid-size (class C) hospital, and list what to validate next.
No model parameter was changed and no production code was edited.

## 1. Bottom line

| Aspect | Verdict | Why |
|---|---|---|
| Length of stay (4.80 d mean) | **Plausible** | Inside the 3-7 d example target of the Kemenkes 2025 guideline; local reports show 4.1-4.2 d. |
| Bed occupancy (99.8 %) | **Not realistic** | Example target 70 %; observed Indonesian hospitals ~47-70 %. Admission/bed supply needs calibration. |
| Gross death rate (49.4 permille, 10 seeds; 46.3 in the 4 seeds below) | **Unverified, probably high** | Above the 45 permille example target; the few real figures found are 26-34 permille. No national distribution exists in the sources we have. |
| Dengue deaths | **Probably too high** | Model 15 % (3/20, 95 % CI 5-36 %) vs 0.6 % (INA-RESPOND) and 7.9 % (one hospital). Driven by tiering, see F3. |
| Patient age | **Broken** | Every patient is 36 (F1). |
| Net death rate | **Not available** | NDR = GDR because deaths happen only at discharge (3.2-6.8 d). |

## 2. What the analysis did

A copy of `src/` was patched only to **log** each discharge decision (risk score, tier, age, diagnosis, outcome) after the existing
rng call, so no random draw changes (`analysis-2026-11-02/markov-logging.patch`). Seeds 0-3, 10 simulated days, 50 patients,
exactly as the freeze. **The patched run reproduced the frozen death and discharge counts for all four seeds**
(deaths 7/12/10/6, discharges 193/183/190/190), so the logging did not disturb the model. 756 inpatient discharges, 35 deaths
(46.3 permille). Scripts and raw output are in `docs/research/analysis-2026-11-02/`. Four seeds is a small sample; treat
every rate below as indicative.

## 3. Evidence gathered

Status key: **primary** = read in the document; **snippet** = seen only in a search-result summary, not opened (verify before citing).

| Fact | Value | Source | Status |
|---|---|---|---|
| Example quality targets | BOR 70 %, LOS 3-7 d, NDR < 25 permille, GDR < 45 permille | Kemenkes RI, *Pedoman Tata Kelola RS, Buku 2 Pelayanan Medik* (2025), Lampiran 3.1 "Contoh Indikator Mutu", items 75, 82-84 (printed p. 179; PDF p. 188) | primary. The table is titled "examples"; no derivation is given. |
| Ideal BOR band | 70-85 % for flagship wards | same, Table 6.2 (printed p. 161) | primary |
| Hospital mandatory quality indicators | 13 (hand hygiene ... patient satisfaction); none on mortality, BOR or LOS | Permenkes 30/2022, hospital indicator article | primary (scanned PDF, partly garbled OCR) |
| Dengue case fatality, national | 2021 0.96 %, 2022 0.86 % (1,237/143,266), 2023 0.78 % (894/114,720), 2024 ~0.57 %, 2025 0.41 % (703/170,798); "high" is above 1 % | Profil Kesehatan Indonesia 2023 and 2025 | primary. Reported cases, not only inpatients. |
| Hospital beds | 1.38 (2023) and 1.40 (2025) per 1,000 people; WHO reference 1 | Profil Kesehatan 2023, 2025 | primary |
| Hospital class mix 2023 | C 53 %, D/D-Pratama 30 %, B 14 %, A 2 % | Profil Kesehatan 2023 | primary |
| Dengue inpatients (8 referral hospitals, 7 cities incl. Makassar) | 468 patients, 3 deaths (0.6 %); DF 40 %, DHF I-II 57.7 %, DHF III-IV 2.3 %; mean age 19 +- 12.4; 32 % of febrile admissions (34 % Makassar); 2 of 3 deaths with comorbidity (leukemia, COPD) | Utama et al., PLoS NTD 2019;13(10):e0007785 | primary |
| Dengue inpatient case fatality, one hospital | 7.88 % (138 inpatients, Brebes) | J Health Educ 2024 | snippet |
| Provincial hospital indicators, Central Sulawesi 2023 | BOR 55.0 %, TOI 3 d, GDR 26 permille, NDR 12 permille | provincial health profile | snippet |
| Net death rate, one academic hospital | 34.1 permille (2022) | UGM thesis record | snippet |
| 27 hospitals, Sleman | BOR 47.1 %, ALOS 4.17 d, BTO 40.0 | district health office | snippet |
| Referral hospitals A/B, 2019-2023 | mean BOR 69.4 % | Kemenkes SIRS time-series study | snippet |
| NEWS2 AUROC for in-hospital mortality | 0.66 (emergency pneumonia) to 0.82 (Yogyakarta COVID-19) to 0.94 (prehospital) | several studies | snippet |

**Not found / unverified:** the Kepmenkes 129/2008 figures (deaths after 48 h <= 0.24 %, ED deaths within 24 h <= 2 permille) come
from secondary tables only. Profil Kesehatan 2023, 2024 and 2025 contain **no** BOR, LOS, GDR or NDR (searched the text layer;
image-only tables would be missed). There is no national distribution of hospital GDR/NDR in any source gathered.

## 4. Findings

### F1. Every patient and staff member is 36 years old (defect, Platform OC)
`src/patient/generator.ts:278` and `src/agent/generator.ts:78` compute `age = currentYear - parseInt(birthDate.split("-")[2] ?? "1990")`,
but `birthDate` is generated as `DD/MM/YYYY` (`src/identity/generator.ts:100`, e.g. `04/11/1964`). Splitting on `-` yields no third
element, so the fallback 1990 is used and age is `currentYear - 1990`. Check: 200 generated patients all have age 36; all 756
logged discharges have age 36. The correctly drawn age (1-87, `identity/generator.ts`) is thrown away.
Consequences: the risk score's age terms (`> 60`, `> 75`) can never fire; no paediatric or geriatric case mix; dengue patients
are never young (real mean age 19); age-based vitals and illness grading are uniform. It also makes results depend on the wall-clock
year (age = 36 in 2026, 37 in 2027), a determinism hazard for frozen baselines.
**Proposed fix (S):** use the generated `age` from the identity, or split on `/`. It is a seed break and moves every outcome
(age feeds vitals, risk and grading), so it needs the owner's decision and a re-freeze. Not changed here.

### F2. Most deaths come from a flat 2 % roll, not from disease (modeling, Research OC)
`markov.ts` rolls death at discharge with probability 0.35 / 0.10 / 0.02 by risk tier. Observed:

| Tier | Discharges | Deaths | Rate | Share of all deaths |
|---|---|---|---|---|
| low | 664 (87.8 %) | 21 | 3.2 % | **60 %** |
| moderate | 66 (8.7 %) | 7 | 10.6 % | 20 % |
| high | 26 (3.4 %) | 7 | 26.9 % | 20 % |

The tiers alone predict 29.0 deaths; 35 were seen (scenario boosts and chance). So the gross death rate has a floor of about
20 permille that no clinical input can lower, and 60 % of deaths are unrelated to illness severity. This is why the headline rate
barely reacts to P-002. Real deaths concentrate in the sick.

### F3. Dengue is placed in the high tier, which inflates its death rate (modeling)
Dengue (A91): 20 discharges (2.6 %), 3 deaths, case fatality 15.0 % (Wilson 95 % CI about 5-36 %). **13 of 20 dengue
patients (65 %) land in the high-risk tier**, against 3.4 % of all patients. With a 0.35 roll for the high tier, dengue is
effectively treated as severe dengue. Real inpatient data: 2.3 % of cases are DHF III-IV; case fatality 0.6 %. Three events is a
weak estimate, but the tier distribution is not subtle. Hypothesis: the P-002 dengue signature (critical-phase vitals) crosses the
risk-score thresholds for most patients. Test: vary the dengue offsets and check the share in the high tier.

### F4. Risk-score validation is circular
The score's AUROC for death is **0.656** (bootstrap 95 % CI 0.56-0.75), low in the NEWS2 range of 0.66-0.94. But death is *drawn from*
the tier derived from the score, so this measures the score against its own random output, not against reality. Real validation
needs an independent outcome: for example, recorded deterioration events or real cohort data. Do not cite the AUROC as validation.
Also: "RR > 24" fires in 36 % of discharges and "3 or more comorbidities" in 31 %; SpO2 < 90 % in 1.5 %. Respiratory rate is the
main contributor, which is worth checking against clinical expectation.

### F5. Occupancy is saturated
BOR 99.8 % against a 70 % example target and 47-70 % observed. Beds are not scarce nationally (1.40 per 1,000). Admission rate,
bed count or discharge timing is miscalibrated. Calibrating this will change queueing, referral and death rates together.

### F6. Reference status
The 45 and 25 permille figures are in a current Kemenkes document, but as example targets, not measured standards, and the
sources disagree on the provenance of the 6-9 d stay target (the 2025 guideline says 3-7 d). Report GDR/NDR against them as
"example target", not "national standard". Net death rate is still not computable (F7).

### F7. No deaths before day 3
All 35 deaths occurred after 3.2-6.8 days; none before 2 days. In the real cohort 2 of 3 dengue deaths were on day 3, and
early deaths (ED, first 24 h) are a distinct standard. Until physiological death (D2) exists, NDR = GDR and early deaths are
absent by construction.

## 5. Validation tasks (Research OC)

1. **V1 (blocks others)** fix patient age (F1) behind the owner's decision; re-run and re-freeze as `clinical-v2` or similar.
2. **V2** replace or complement the flat 0.02 floor: make baseline death risk depend on diagnosis group and age; target GDR 25-40 permille.
3. **V3** dengue sub-study: diagnose why 65 % are high tier; target 0.6-3 % case fatality and a young age mix.
4. **V4** calibrate admission rate and beds toward BOR 60-75 %; re-measure LOS and deaths.
5. **V5** independent risk-score validation (not circular), for example against event-level deterioration labels.
6. **V6** obtain primary Kepmenkes 129/2008 text and a South Sulawesi provincial profile (BOR, LOS, GDR, NDR per hospital class).
7. **V7** verify the snippet-only rows in section 3 before any publication.

## 6. Handoff entries (format from AGENTS.md)

`memory.txt` is referenced by AGENTS.md but is **not in this checkout**, so the entries are kept here, ready to paste.

```
## [question 2026-11-02 11:00] Research OC → Platform OC: Patient age is always 36 — fix?
src/patient/generator.ts:278 and src/agent/generator.ts:78 parse birthDate with split("-")[2] but identity/generator.ts:100 emits DD/MM/YYYY, so the 1990 fallback is used and every patient/staff age = currentYear - 1990 (36 in 2026). Risk-score age terms never fire; results change with the wall-clock year. Proposed: use the generated age (or split on "/"). It is a seed break. Can Platform OC scope it and propose the re-freeze plan? Evidence: docs/research/calibration-evidence-2026-11-02.md F1.

## [question 2026-11-02 11:00] Research OC → Coordinator OC: Status of the 45/25 permille references and next baseline
The GDR < 45 and NDR < 25 values appear in Kemenkes (2025) Pedoman Tata Kelola RS Buku 2, Lampiran 3.1, as "examples" of quality indicators, not as measured national standards. Real provincial figures found are 26-34 permille. Should clinical-v1 documents call them "example targets", and should the next baseline wait for the age fix (F1) and a death-model change (F2)?
```

## 7. Limitations

Web material was read through search summaries; only the files committed under `docs/` were read in full. Four seeds, 20 dengue
discharges and 35 deaths give wide intervals. The class C match rests on the model's roadmap tier, not on a checked bed-count rule.
