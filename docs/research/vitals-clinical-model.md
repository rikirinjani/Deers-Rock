# Clinical vitals model — sources and confidence (P-002)

**Date:** 2026-11-01 · **Status:** draft for Research OC review · **Code:** `src/engine/illness-model.ts`, `treatment-effects.ts`, `clinical-vitals.ts`

This document says what each number in the clinical vitals model rests on, and how far it should be trusted.
The model is **not** fitted to patient data. Nothing here is a measured population mean.

## Confidence levels

| Level | Meaning |
|---|---|
| **criteria** | The offset is set so vitals cross a *published clinical criterion* for that severity. The criterion is real; the exact offset is our choice. |
| **estimate** | A clinically plausible order of magnitude with no located source. Needs Research OC review before being relied on. |
| **assumption** | A modelling choice (shape of the course, calibration constants). Justified by the outcomes it must reproduce, not by literature. |

In `GROUPS`, 12 groups are `criteria` and 40 are `estimate`. The `criteria` groups are the high-volume, high-acuity ones.

## Group signatures

`criteria` groups and the criterion each is anchored to:

| Group | Anchor (published criterion) |
|---|---|
| Lower respiratory infection | CURB-65 (RR ≥ 30, SBP < 90 / DBP ≤ 60); Halm et al. clinical-stability criteria (HR ≤ 100, RR ≤ 24, SBP ≥ 90, SpO2 ≥ 90%, afebrile) |
| Sepsis | qSOFA (RR ≥ 22, SBP ≤ 100); SIRS (HR > 90, T > 38 °C) |
| Airway obstruction (asthma / COPD) | GINA severity (SpO2 < 90–92%, RR, HR > 120 in life-threatening attacks) |
| Respiratory failure | SpO2 < 90% on room air as the working definition |
| Volume depletion | WHO dehydration grading; hypotension with compensatory tachycardia |
| Dengue | WHO 2009 warning signs and shock (narrow pulse pressure, tachycardia); critical phase around days 3–7 |
| Heart failure | ESC acute-HF presentation (congestion, hypoxaemia, tachypnoea) |
| Stroke | Hypertension in acute stroke (SBP commonly > 160); antihypertensive cap per guideline practice |
| Pre-eclampsia / eclampsia | ACOG severe features (SBP ≥ 160 or DBP ≥ 110) |
| GI bleed | ATLS haemorrhage classes (tachycardia, narrowed pulse pressure, hypotension at class III) |
| Femur fracture | Pain and haemorrhage-related tachycardia; ATLS classes |

I located these as well-known published criteria from memory of the standard guidelines. I did **not** re-verify each number against the primary paper in this session. Treat the anchors as correct in kind and the thresholds as correct to within the usual guideline revisions.

## Treatment effects (`EFFECTS`, `COURSE_MIN`)

| Effect | Value | Confidence |
|---|---|---|
| Antipyretic temperature reduction | −0.8 °C | estimate (typical paracetamol effect is ~0.5–1.0 °C) |
| NSAID | −0.5 °C temperature, −1.5 pain | estimate |
| Non-opioid analgesic pain reduction | 1.5 points | **criteria**: the minimal clinically important difference on a 0–10 pain scale is commonly reported as 1.3–1.5 |
| Opioid pain reduction | 3.5 points | estimate |
| Antihypertensive | up to −20 mmHg systolic / −10 diastolic, excess only | estimate (single-agent effect size; never lowers a normal pressure) |
| Fever → heart rate | 8 bpm per °C | **criteria**: Liebermeister's rule, 8–10 bpm/°C. Typhoid uses a lower coupling (relative bradycardia is a recognised feature) |
| Oxygen | FiO2 ≈ 0.21 + 0.03 × L/min; fraction of hypoxaemia removed derived from it | assumption (standard rule of thumb, simplified) |
| Regimen duration per drug class | `COURSE_MIN` | assumption |

Treatments only ever relieve a deficit in the harmful direction. They cannot push a vital past the patient's baseline.

## Course shape

| Parameter | Value | Confidence |
|---|---|---|
| Ramp to full acuity | 6 h | assumption |
| Hold at full acuity | 24 h | assumption |
| Treated decay half-life | 3900 min (2.7 d) | assumption, **calibrated**: with these values a moderate pneumonia reaches Halm stability at ~3 days and a severe one at ~4.6 days, in line with the commonly reported median of ~3 days to clinical stability |
| Untreated slowdown | ×3 | assumption |
| Grade mix (no risk points) | 30% mild / 45% moderate / 25% severe | assumption; shifts toward severe with age and comorbidity (+0.12 per risk point) |
| Late-treatment complication hazard | rises if the first definitive dose is > 6 h after onset | assumption; direction is well supported for sepsis, magnitude is not |

## Outcome indicators used for calibration

| Indicator | Reference | Confidence |
|---|---|---|
| BOR 60–85% | Ministry of Health ideal range | confirmed |
| ALOS 6–9 days | Ministry of Health ideal range | confirmed |
| NDR (deaths ≥ 48 h after admission) < 25‰ | Ministry of Health standard; definition confirmed from sources | confirmed |
| GDR < 45‰ | Widely cited alongside NDR | **NOT confirmed.** Earlier searches did not locate a primary source. Treat as provisional. |

Until deaths can occur before discharge (P-002 D2), every simulated death occurs at discharge. NDR therefore equals GDR in current outputs.

## Known limitations

1. 40 of 52 group signatures are estimates.
2. ED encounters are typed `outpatient` with 2–7 tick stays. They never receive an illness course. Only inpatient admissions do.
3. There is no physiological death. Mortality is still rolled at discharge, now from *sustained* vitals rather than one reading.
4. The model has no validation against real patient vital-sign series. Calibration targets are aggregate indicators only.
5. Complication hazard magnitudes are not sourced.

## Requested of Research OC

- Review the 40 `estimate` groups, highest-volume first (see the per-group counts in the outcome files).
- Confirm or replace the GDR < 45‰ reference.
- Propose a real-data source for time-to-stability and for vitals trajectories under treatment.
