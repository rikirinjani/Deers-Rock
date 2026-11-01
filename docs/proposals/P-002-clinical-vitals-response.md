# P-002 — Clinical realism for vital signs and outcomes

**Status:** DRAFT for owner review. Nothing in this document is implemented.
**Author:** Platform OC · **Date:** 2026-11-01
**Builds on:** ADR-028 Amendment 1 (vital-sign drift), `outcome-v2` baseline (`docs/experiments/EXPERIMENT-FREEZE-2026-11-01.md`)
**Would amend:** ADR-028 (mortality risk engine), ADR-006 (agent learning, indirectly), ADR-008 (new sub-stream keys)

---

## 1. Problem

The vital-sign drift fix removed an artefact, but vitals are still **decoration**. Verified in the code (2026-11-01):

| Fact | Evidence |
|---|---|
| Vitals fluctuate around a healthy baseline and never respond to the patient's diagnosis. A pneumonia patient keeps normal SpO₂. | `vitals-model.ts`: the only input is `baselineVitals` |
| No treatment changes any vital. Oxygen, antibiotics, fluids and antihypertensives are ordered, administered and charged, with no physiological effect. | `medAdminHandler` flips `ordered → administered`; `RespiratoryOrder` has no effect anywhere |
| Diagnoses never resolve (`active` is never set to false), and there is no clinical course. | no write to `Diagnosis.active` in `src/` |
| Death is rolled **once, at the scheduled discharge** (3–7 days), at 2 % / 10 % / 35 % by risk level. The roll does not depend on how the stay went. | `dischargeScheduledPatients` in `markov.ts` |
| Three terms of the risk score (SpO₂ < 90, SBP < 90, HR > 120 or < 50) can never fire, because vitals are clamped exactly at those values. | `vitals-model.ts` clamps vs `assessMortalityRisk` |
| Vitals-driven alerts (AI doctor, nurse, qSOFA) fire on random excursions: 3.6 % of readings, unrelated to who is sick. | measured on 400 patients × 10 days |

**Consequence.** The simulation cannot answer "what happens if we treat late, or not at all?", which is the question the
counterfactual-experiment mandate (Constitution §1.4) exists for. Mortality (3.70 %) is set by age, comorbidity count and
critical diagnosis; the vitals terms contribute almost nothing, which is why fixing the drift left it unchanged. "Improved"
(94.5 %) is simply "vitals within normal range at discharge", true of nearly everyone because nobody's vitals respond to illness.

## 2. Goals and non-goals

**Goals**
1. A patient's vitals reflect their illness and its course (onset, peak, resolution).
2. Treatment changes vitals and the course, so the AI doctor's orders have consequences.
3. Alerts fire for sick patients, not at random.
4. Discharge outcome and death **emerge** from the course, calibrated to Indonesian standards (GDR < 45 ‰, NDR < 25 ‰).
5. Stay deterministic: fixed draw counts, no shift of any existing rng stream, snapshot-safe, no slower in a way that matters.

**Non-goals.** Physiological differential-equation models; lab values; a full ICU model; changing how many patients arrive
or the length of stay (see decision D4).

## 3. Design

Four increments. Each is usable on its own and each is a declared seed break needing a re-freeze, so the plan is to
**ship A–D1 together** and re-freeze once (§7).

### A. Realistic clamps (S)

Widen the clamps to physiological limits so the risk score's unreachable terms can fire: HR 30–180, SBP 50–240,
DBP 30–140, temperature 33–42 °C, SpO₂ 60–100, RR 6–50. With only baseline noise these are almost never reached, so A on
its own changes little; it is what makes B–D observable.

### B. Illness model (M)

**Signature by diagnosis group.** The generator has 145 diagnoses; about 14 groups cover the weight that matters. A group
defines the **offset from the patient's baseline at full acuity**. Values below are order-of-magnitude clinical estimates,
**not yet sourced**: Research OC reviews and cites each before they are frozen.

| Group (examples) | Signature at full acuity |
|---|---|
| Lower respiratory infection (J15, J18, J14, J20, J10/11, U07, A15) | SpO₂ −6, RR +8, HR +18, temp +1.5 |
| Asthma / COPD exacerbation (J45, J44) | SpO₂ −5, RR +9, HR +20 |
| Sepsis and severe infection (A40, A49, P36, N10, L03) | HR +30, temp +1.5, SBP −25, RR +8 |
| Dengue (A91) | days 1–3 temp +1.8; days 4–6 critical phase HR +20, SBP −20 |
| Other febrile illness (A01, B50, A27, A95) | temp +1.6, HR +12 |
| Heart failure (I50) | SpO₂ −5, RR +6, HR +15 |
| Acute coronary / arrhythmia (I21, I48) | pain +6, HR +20, SBP −15 |
| Stroke, intracranial bleed (I63, I60, S06) | SBP +40 |
| Dehydration, gastroenteritis (A09, E86) | HR +22, SBP −15 |
| Acute abdomen, GI bleed (K35, K85, K56, K26) | pain +5, HR +20, temp +0.8, SBP −10 |
| Trauma, burns, envenomation, poisoning (S72, S22, T14, T20, T63, T39) | pain +5, HR +20 to +25, SBP −10 to −20 |
| Hypertensive disorders of pregnancy (O14, O15) | SBP +45, DBP +25 |
| Renal failure (N17, N18, N19) | SBP +20, RR +4 |
| Chronic and stable (E11, E78, M, G, F, H, C, Q, …) | none (stay at baseline) |

Only the **primary diagnosis** (`selectPrimaryDiagnosisCode`, ADR-021) sets the signature in v1.

**Grade.** Each encounter gets an `illnessGrade` of mild / moderate / severe (named to avoid the existing
`_severityAtClose` and ED acuity). It scales the signature (0.5 / 1.0 / 1.5) and is set at admission from the risk factors
already in the code (age, comorbidity count, critical diagnosis) plus **one draw from a dedicated sub-stream keyed on
(world seed, encounter id)**, the same technique as `injuryMechanism`. No existing stream moves.

**Course.** Vitals are pulled toward `baseline + grade × signature × course(t)` instead of toward the baseline, using the
existing mean-reverting model (so noise, clamps and the 7-draws-per-patient-per-minute contract are unchanged).
`course(t)` ramps to 1.0 over the first 6 hours, holds for 24 hours, then decays with a half-life of about 1.5 days when
treated and about 4.5 days when untreated. A small daily chance of **complication** (higher for severe grade and for
untreated patients) raises it to 1.5.

Illustration (moderate pneumonia, first 12 hours):

| Hour | 0 | 2 | 6 | 12 |
|---|---|---|---|---|
| SpO₂, untreated | 97 | 94 | 92 | 91 |
| SpO₂, oxygen started at hour 2 | 97 | 94 | 96 | 96 |

**Scope.** Inpatients and ED patients with an active encounter. Patients without one stay at baseline. Clinic visits are
short and get no illness model in v1.

### C. Treatment effects (M)

Orders become inputs. Effects are keyed by **drug class** (`DRUG_CATALOG` has 36 categories) and respiratory therapy:

| Treatment | Effect |
|---|---|
| Oxygen / CPAP / ventilator | removes 60 % / 80 % / 95 % of the SpO₂ deficit and part of the RR rise, while active |
| Antibiotic (infection groups) | halves the course half-life; if the first dose comes more than 6 h after admission, a chance of moving up one grade |
| Antipyretic | temperature −1.0 °C for about 6 h (transient) |
| Antihypertensive | SBP −15 to −25 for 8–12 h |
| Fluid / electrolyte (dehydration, sepsis) | corrects 70 % of the SBP and HR deficit over 2 h |
| Bronchodilator, corticosteroid | SpO₂ and RR relief in asthma / COPD |
| Diuretic | SpO₂ and RR relief in heart failure |
| Analgesic / opioid | pain −3 for 4–6 h |

**Design risk, decided up front.** `cleanup.ts` prunes order collections, so deriving treatment from retained orders would
silently decay (the same trap `encounter-insights.ts` documents for severity). Effects are therefore recorded on the
encounter **at administration time** as a small bounded ledger, not derived from orders later.

This closes the loop the AI doctor already assumes: a vitals trigger orders oxygen, oxygen changes SpO₂, the trigger stops
firing. It also makes a counterfactual branch ("no oxygen") meaningful in the timeline engine.

### D1. Outcomes follow the course (S–M)

Keep the one death roll at discharge, but base the risk score on the **worst vitals during the stay** (stored on the
encounter), not on the vitals at the moment of discharge. With A's clamps the unreachable terms become reachable, so a
severe, late-treated pneumonia patient scores high risk and an uncomplicated one does not. "Improved / deteriorated"
at discharge then reflects the vitals at discharge after a real recovery. The roll probabilities (2 / 10 / 35 %) are the
first calibration knob.

### D2. Physiological death (M–L, **not in this proposal**)

An hourly death hazard from sustained instability (e.g. SpO₂ < 80, SBP < 70), so patients can die mid-stay, free their bed
and appear in the M&M conference. A larger change to bed turnover and mortality timing; proposed as a follow-up after D1
is calibrated.

## 4. Effects on the rest of the system

- **AI doctor and nurse** will see real triggers, so orders, charges and claims change (more oxygen, antipyretics, labs
  for sick patients; fewer for well ones). Finance totals shift; the finance and claims tests need review.
- **Alerts** become informative. Expected property to test: the alert rate for acutely ill inpatients is several times that
  of chronic-stable ones.
- **Determinism.** Vitals draws unchanged (7 per patient per minute). New draws (grade, complication) come from dedicated
  sub-streams keyed on (seed, encounter, purpose), so no other handler's stream moves. Treatment ledger is data, not draws.
- **Snapshots.** Additive fields (`illnessGrade`, `treatmentLedger`, `worstVitals` on the encounter). Older snapshots
  resume with no illness (baseline vitals), as the baseline field already does.
- **Performance.** One patient → active-encounter lookup per tick and a table lookup per patient; the per-patient cost
  stays constant. Recompute the target vector every 10 minutes, not every minute.

## 5. Validation plan

1. **Unit tests per group** (direction and rough size of each signature), grade scaling, course shape, each treatment effect.
2. **Property tests**: with no treatment the course decays at the untreated rate; oxygen raises SpO₂ in a respiratory
   group and does nothing in an unrelated one; deterministic for a seed; draw counts fixed.
3. **Counterfactual test** through the timeline engine: branch "no oxygen" vs baseline on identical seeds; SpO₂ lower and
   mortality risk higher in the branch.
4. **Calibration runs** (10 seeds × 10 days, about 3 h each): gross and net death rate against GDR < 45 ‰ and NDR < 25 ‰
   (net death rate, deaths after 48 h, is not computed today and is added), grade mix, improved share, alert rate, order
   volume.
5. **Research OC review** of the signature and treatment tables before they are frozen.

## 6. Plan and size

| Step | Size | Notes |
|---|---|---|
| A. Clamps | S | independent; can land first |
| B. Illness model (+ tests) | M | table, grade, course, target-vector hook |
| C. Treatment effects (+ ledger) | M | depends on B |
| D1. Worst-vitals mortality risk, net death rate metric | S–M | depends on A, B |
| Calibration iterations | 3 h of compute per run | expect 2–3 rounds |
| Re-freeze (E1 + outcome) | 3 h | once, after calibration |

## 7. Decisions needed from the owner

1. **Scope:** A + B + C + D1 now (recommended), D2 later. Or include D2.
2. **Grade:** derived from existing risk factors plus one draw (recommended), or purely deterministic.
3. **Primary diagnosis only** sets the signature in v1 (recommended), or blend comorbid acute diagnoses.
4. **Length of stay:** keep the 3–7 day draw (recommended for now; bed occupancy and ALOS are a separate calibration), or
   discharge on clinical criteria (stable vitals for 24 h), which changes bed occupancy.
5. **Who supplies the numbers:** I draft the signature and treatment tables from clinical knowledge and flag every value
   as an estimate; Research OC sources them before the freeze. Agree, or provide a reference set.
6. **Re-freeze:** one re-freeze after calibration (recommended), not one per increment.
