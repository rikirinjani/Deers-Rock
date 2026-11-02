/**
 * Illness model — P-002 (2026-11-01), owner-approved scope A+B+C+D1.
 *
 * A patient with an active inpatient/ED encounter has a diagnosis GROUP, a
 * GRADE (mild / moderate / severe) and a course LEVEL that rises over the
 * first hours, holds, then decays; faster once definitive treatment is given.
 * The vitals handler pulls each vital toward
 *
 *     baseline + grade × level × signature(group)  −  treatment relief
 *
 * (vitals-model.ts supplies the noise and mean reversion around that target).
 *
 * Every signature value carries a `basis`:
 *   "criteria"  — set so the vitals cross the published criterion for that
 *                 severity (CURB-65, Halm stability, qSOFA, ATLS, GINA, ACOG,
 *                 WHO dengue, ESC AHF), NOT a measured population mean;
 *   "estimate"  — a clinically plausible order of magnitude without a located
 *                 source. Research OC reviews these before they are relied on.
 * See docs/research/vitals-clinical-model.md for sources and confidence.
 */
import type { Vitals, IllnessState } from "../patient/schema.js";
import type { DrugCategory } from "./drug-catalog.js";
import { VITAL_KEYS } from "./vitals-model.js";

export type Grade = IllnessState["grade"];
export type Basis = "criteria" | "estimate";
export type Tag = "airway" | "cardiac" | "volume";
type Offsets = Partial<Record<keyof Vitals, number>>;

/** Compact offsets: heart rate, systolic, diastolic, temperature, SpO2, resp rate, pain. */
function o(v: { hr?: number; sbp?: number; dbp?: number; t?: number; o2?: number; rr?: number; pain?: number }): Offsets {
  const out: Offsets = {};
  if (v.hr !== undefined) out.heartRate = v.hr;
  if (v.sbp !== undefined) out.bloodPressureSystolic = v.sbp;
  if (v.dbp !== undefined) out.bloodPressureDiastolic = v.dbp;
  if (v.t !== undefined) out.temperature = v.t;
  if (v.o2 !== undefined) out.oxygenSaturation = v.o2;
  if (v.rr !== undefined) out.respiratoryRate = v.rr;
  if (v.pain !== undefined) out.painLevel = v.pain;
  return out;
}

export interface GroupDef {
  label: string;
  /** ICD-10 3-character categories. */
  codes: string[];
  /** Offset from the patient's baseline at full acuity, moderate grade. HR is the non-fever component. */
  offsets: Offsets;
  /** Heart-rate rise per °C of fever (Liebermeister, 8–10 bpm/°C); typhoid has relative bradycardia. Default 8. */
  feverHr?: number;
  /** Drug categories that start the "treated" course when administered. */
  definitive: DrugCategory[];
  /** Which symptomatic treatments act on this group. */
  tags?: Tag[];
  /** Infection: a late first definitive dose raises the complication hazard. */
  infection?: boolean;
  /** Chronic: the signature stays for the whole stay (no decay, no complications). */
  persistent?: boolean;
  /** Override the hold (minutes at full acuity) and treated half-life. */
  holdMin?: number;
  halfLifeMin?: number;
  /** Extra phase added on top of the signature (dengue critical phase). */
  critical?: { fromMin: number; toMin: number; offsets: Offsets };
  basis: Basis;
}

export const GROUPS: Record<string, GroupDef> = {
  lower_resp_infection: {
    label: "Lower respiratory infection (pneumonia, influenza, COVID-19, TB)",
    codes: ["J15", "J18", "J14", "J20", "J10", "J11", "U07", "A15", "J47", "J90", "J91", "A37"],
    // Moderate: RR 25 (> Halm ≤ 24), SpO2 91.5, T 38.4; severe: RR 29 (CURB-65 ≥ 30), SpO2 88.5 (< 90).
    offsets: o({ hr: 6, sbp: -4, dbp: -2, t: 1.5, o2: -6, rr: 8, pain: 1 }),
    definitive: ["antibiotic", "antiviral", "antituberculous"], infection: true, tags: ["airway"], basis: "criteria",
  },
  airway_obstruction: {
    label: "Asthma / COPD exacerbation",
    codes: ["J45", "J44"],
    // GINA: moderate SpO2 90–95 %, HR 100–120; severe < 92 %, RR ≥ 25.
    offsets: o({ hr: 18, t: 0.2, o2: -5, rr: 9, pain: 1 }),
    definitive: ["bronchodilator", "corticosteroid"], tags: ["airway"], basis: "criteria",
  },
  respiratory_failure: {
    label: "Acute respiratory failure",
    codes: ["J96"],
    offsets: o({ hr: 14, sbp: -4, t: 0.3, o2: -10, rr: 12 }),
    definitive: [], tags: ["airway"], basis: "criteria",
  },
  pulmonary_embolism: {
    label: "Pulmonary embolism",
    codes: ["I26"],
    offsets: o({ hr: 20, sbp: -10, dbp: -5, t: 0.3, o2: -7, rr: 10, pain: 4 }),
    definitive: ["anticoagulant"], basis: "estimate",
  },
  sepsis: {
    label: "Sepsis / severe systemic infection",
    codes: ["A40", "A49", "A39", "P36", "I33"],
    // qSOFA: RR ≥ 22 (17+8 = 25), SBP ≤ 100 (124−25 = 99).
    offsets: o({ hr: 12, sbp: -25, dbp: -15, t: 1.6, o2: -3, rr: 8 }),
    definitive: ["antibiotic", "antifungal", "antiviral"], infection: true, tags: ["volume"], basis: "criteria",
  },
  localised_infection: {
    label: "Localised infection (UTI, cellulitis, otitis, prostatitis)",
    codes: ["N39", "N41", "L03", "H66"],
    offsets: o({ hr: 4, sbp: -3, t: 1.2, rr: 1, pain: 2 }),
    definitive: ["antibiotic"], infection: true, basis: "estimate",
  },
  pyelonephritis: {
    label: "Acute pyelonephritis",
    codes: ["N10"],
    offsets: o({ hr: 8, sbp: -6, t: 1.6, rr: 2, pain: 3 }),
    definitive: ["antibiotic"], infection: true, tags: ["volume"], basis: "estimate",
  },
  dengue: {
    label: "Dengue",
    codes: ["A91"],
    // WHO 2009: febrile phase, then a critical phase around defervescence (days 3–7) with
    // plasma leakage: HR up, SBP down, abdominal pain, temperature falls.
    offsets: o({ hr: 4, sbp: -2, t: 1.8, rr: 1, pain: 2 }),
    critical: { fromMin: 2880, toMin: 7200, offsets: o({ hr: 12, sbp: -20, dbp: -4, t: -1.4, rr: 3, pain: 2 }) },
    definitive: ["fluid", "electrolyte", "antipyretic"], tags: ["volume"], basis: "criteria",
  },
  enteric_fever: {
    label: "Typhoid fever",
    codes: ["A01"],
    // Faget sign: relative bradycardia (fever HR coupling 2 bpm/°C instead of 8).
    offsets: o({ hr: 0, sbp: -4, t: 1.8, rr: 1, pain: 2 }), feverHr: 2,
    definitive: ["antibiotic"], infection: true, basis: "estimate",
  },
  febrile_tropical: {
    label: "Malaria, leptospirosis, chikungunya, fever of unknown origin",
    codes: ["B50", "A27", "A95", "R50"],
    offsets: o({ hr: 3, sbp: -5, t: 1.6, rr: 2, pain: 2 }),
    definitive: ["antimalarial", "antibiotic", "antipyretic"], infection: true, basis: "estimate",
  },
  heart_failure: {
    label: "Heart failure / cardiomyopathy / rheumatic heart disease",
    codes: ["I50", "I42", "I11", "I09", "I05"],
    // ESC: respiratory failure SpO2 < 90 %, RR > 25–30.
    offsets: o({ hr: 12, sbp: -2, o2: -5, rr: 7, pain: 1 }),
    definitive: ["diuretic"], tags: ["cardiac"], basis: "criteria",
  },
  acute_coronary: {
    label: "Acute myocardial infarction",
    codes: ["I21"],
    offsets: o({ hr: 14, sbp: -12, dbp: -5, t: 0.3, o2: -2, rr: 3, pain: 6 }),
    definitive: ["antiplatelet", "anticoagulant"], tags: ["cardiac"], basis: "estimate",
  },
  chest_pain: {
    label: "Chest pain, pericarditis",
    codes: ["R07", "I30"],
    offsets: o({ hr: 6, t: 0.4, rr: 1, pain: 3 }),
    definitive: ["nsaid", "analgesic"], basis: "estimate",
  },
  atrial_fibrillation: {
    label: "Atrial fibrillation (rapid ventricular rate)",
    codes: ["I48"],
    offsets: o({ hr: 40, sbp: -8, rr: 3, o2: -1 }),
    definitive: ["antiarrhythmic", "anticoagulant"], tags: ["cardiac"], basis: "estimate",
  },
  arrhythmia: {
    label: "Other cardiac arrhythmia",
    codes: ["I49"],
    offsets: o({ hr: 22, sbp: -4, rr: 2 }),
    definitive: ["antiarrhythmic"], basis: "estimate",
  },
  stroke: {
    label: "Stroke (ischaemic, subarachnoid haemorrhage)",
    codes: ["I63", "I60"],
    // Registry: ~60–70 % of stroke patients present with SBP > 140 (baseline 124 + 35 = 159).
    offsets: o({ hr: 4, sbp: 35, dbp: 18, t: 0.2, rr: 1, pain: 2 }),
    definitive: ["antihypertensive", "antiplatelet", "anticoagulant"], basis: "criteria",
  },
  head_injury: {
    label: "Intracranial injury",
    codes: ["S06"],
    offsets: o({ hr: -4, sbp: 20, dbp: 10, rr: 2, pain: 3 }),
    definitive: ["antihypertensive", "analgesic"], basis: "estimate",
  },
  volume_depletion: {
    label: "Dehydration / acute gastroenteritis",
    codes: ["A09", "E86"],
    offsets: o({ hr: 14, sbp: -15, dbp: -8, t: 0.3, rr: 3 }),
    definitive: ["fluid", "electrolyte"], tags: ["volume"], basis: "criteria",
  },
  acute_abdomen: {
    label: "Acute abdomen (appendicitis, pancreatitis, obstruction)",
    codes: ["K35", "K85", "K56", "R10"],
    offsets: o({ hr: 10, sbp: -8, t: 0.8, rr: 3, pain: 5 }),
    definitive: ["antibiotic", "fluid"], tags: ["volume"], infection: true, basis: "estimate",
  },
  biliary: {
    label: "Biliary colic / cholecystitis",
    codes: ["K80"],
    offsets: o({ hr: 4, sbp: -3, t: 0.6, pain: 4 }),
    definitive: ["antibiotic", "analgesic", "nsaid"], basis: "estimate",
  },
  gi_bleed: {
    label: "Duodenal ulcer with bleeding",
    codes: ["K26"],
    offsets: o({ hr: 22, sbp: -18, dbp: -8, rr: 4, pain: 3 }),
    definitive: ["ppi", "fluid", "blood_product"], tags: ["volume"], basis: "criteria",
  },
  dyspepsia: {
    label: "Gastritis / reflux",
    codes: ["K29", "K21"],
    offsets: o({ hr: 3, pain: 2 }),
    definitive: ["ppi", "h2blocker"], basis: "estimate",
  },
  renal_colic: {
    label: "Renal colic",
    codes: ["N20"],
    offsets: o({ hr: 10, sbp: 10, dbp: 5, rr: 2, pain: 6 }),
    definitive: ["nsaid", "analgesic", "opioid"], basis: "estimate",
  },
  femur_fracture: {
    label: "Femur fracture",
    codes: ["S72"],
    // ATLS class II–III blood loss: HR 100–120, narrowed pulse pressure.
    offsets: o({ hr: 14, sbp: -12, dbp: -6, rr: 3, pain: 6 }),
    definitive: ["opioid", "analgesic", "nsaid"], tags: ["volume"], basis: "criteria",
  },
  rib_fracture: {
    label: "Rib fracture",
    codes: ["S22"],
    offsets: o({ hr: 10, sbp: -4, o2: -3, rr: 7, pain: 6 }),
    definitive: ["opioid", "analgesic", "nsaid"], tags: ["airway"], basis: "estimate",
  },
  minor_trauma: {
    label: "Minor fracture / open wound",
    codes: ["S62", "T14"],
    offsets: o({ hr: 8, sbp: -3, pain: 4 }),
    definitive: ["analgesic", "nsaid"], basis: "estimate",
  },
  burn: {
    label: "Burns",
    codes: ["T20"],
    offsets: o({ hr: 20, sbp: -18, dbp: -8, t: 0.8, o2: -2, rr: 5, pain: 6 }),
    definitive: ["fluid", "opioid", "analgesic"], tags: ["volume"], basis: "estimate",
  },
  envenomation: {
    label: "Snake bite envenomation",
    codes: ["T63"],
    offsets: o({ hr: 18, sbp: -15, dbp: -6, t: 0.3, rr: 3, pain: 5 }),
    definitive: ["antivenom"], tags: ["volume"], basis: "estimate",
  },
  poisoning: {
    label: "Poisoning by analgesic",
    codes: ["T39"],
    offsets: o({ hr: 10, sbp: -4, t: 0.3, rr: 2, pain: 1 }),
    definitive: ["other"], basis: "estimate",
  },
  post_procedure: {
    label: "Complication following a procedure",
    codes: ["T81"],
    offsets: o({ hr: 4, sbp: -6, t: 1.0, rr: 2, pain: 3 }),
    definitive: ["antibiotic", "analgesic"], infection: true, basis: "estimate",
  },
  preeclampsia: {
    label: "Pre-eclampsia",
    codes: ["O14"],
    // ACOG severe range: SBP ≥ 160 or DBP ≥ 110 (baseline 124 + 40, 80 + 22 at the severe grade → 184/…).
    offsets: o({ hr: 4, sbp: 40, dbp: 22, rr: 1, pain: 2 }),
    definitive: ["antihypertensive", "anticonvulsant", "electrolyte"], basis: "criteria",
  },
  eclampsia: {
    label: "Eclampsia",
    codes: ["O15"],
    offsets: o({ hr: 10, sbp: 50, dbp: 28, o2: -2, rr: 4, pain: 4 }),
    definitive: ["anticonvulsant", "electrolyte", "antihypertensive"], basis: "criteria",
  },
  obstetric_bleeding: {
    label: "Threatened abortion",
    codes: ["O20"],
    offsets: o({ hr: 10, sbp: -8, dbp: -4, pain: 3 }),
    definitive: ["fluid"], tags: ["volume"], basis: "estimate",
  },
  labour: {
    label: "Labour and delivery",
    codes: ["O80"],
    offsets: o({ hr: 10, sbp: 6, rr: 2, pain: 3 }), holdMin: 720, halfLifeMin: 720,
    definitive: ["analgesic", "opioid"], basis: "estimate",
  },
  acute_kidney_injury: {
    label: "Acute kidney failure",
    codes: ["N17", "N19"],
    offsets: o({ hr: 6, sbp: 18, dbp: 10, o2: -1, rr: 4 }),
    definitive: ["diuretic", "fluid"], tags: ["cardiac", "volume"], basis: "estimate",
  },
  ckd: {
    label: "Chronic kidney disease",
    codes: ["N18", "I12"],
    offsets: o({ sbp: 10, dbp: 5, rr: 1 }), persistent: true,
    definitive: [], basis: "estimate",
  },
  sickle_crisis: {
    label: "Sickle cell crisis",
    codes: ["D57"],
    offsets: o({ hr: 14, t: 0.6, o2: -3, rr: 4, pain: 6 }),
    definitive: ["opioid", "analgesic", "fluid"], tags: ["volume"], basis: "estimate",
  },
  anaemia: {
    label: "Anaemia (haemolytic, unspecified)",
    codes: ["D64", "D55"],
    offsets: o({ hr: 8, sbp: -3, o2: -1, rr: 2 }), persistent: true,
    definitive: [], basis: "estimate",
  },
  thyrotoxicosis: {
    label: "Hyperthyroidism",
    codes: ["E05"],
    offsets: o({ hr: 22, sbp: 10, t: 0.6, rr: 2 }),
    definitive: ["endocrine"], basis: "estimate",
  },
  adrenal_crisis: {
    label: "Adrenal insufficiency",
    codes: ["E27"],
    offsets: o({ hr: 16, sbp: -20, dbp: -10, t: 0.4, rr: 2 }),
    definitive: ["corticosteroid", "fluid"], tags: ["volume"], basis: "estimate",
  },
  seizure: {
    label: "Epilepsy (post-ictal)",
    codes: ["G40"],
    offsets: o({ hr: 12, t: 0.3, o2: -2, rr: 3, pain: 1 }), holdMin: 60, halfLifeMin: 180,
    definitive: ["anticonvulsant"], basis: "estimate",
  },
  headache: {
    label: "Migraine / headache",
    codes: ["G43", "R51"],
    offsets: o({ hr: 4, sbp: 6, pain: 4 }), holdMin: 360, halfLifeMin: 360,
    definitive: ["analgesic", "nsaid"], basis: "estimate",
  },
  delirium: {
    label: "Delirium",
    codes: ["F06"],
    offsets: o({ hr: 12, sbp: 10, t: 0.4, rr: 3 }),
    definitive: ["antipsychotic"], basis: "estimate",
  },
  syncope: {
    label: "Syncope",
    codes: ["R55"],
    offsets: o({ hr: -8, sbp: -15, dbp: -8 }), holdMin: 60, halfLifeMin: 180,
    definitive: ["fluid"], tags: ["volume"], basis: "estimate",
  },
  vertigo: {
    label: "Vertigo (Ménière)",
    codes: ["H81"],
    offsets: o({ hr: 6, pain: 1 }), holdMin: 240, halfLifeMin: 240,
    definitive: ["antiemetic"], basis: "estimate",
  },
  malignancy: {
    label: "Malignancy",
    codes: ["C50", "C61", "C16", "C22", "C18", "C53", "C70", "C91", "C85", "C67"],
    offsets: o({ hr: 6, o2: -1, rr: 1, pain: 3 }), persistent: true,
    definitive: [], basis: "estimate",
  },
  lung_cancer: {
    label: "Lung cancer",
    codes: ["C34"],
    offsets: o({ hr: 8, o2: -3, rr: 3, pain: 3 }), persistent: true,
    definitive: [], tags: ["airway"], basis: "estimate",
  },
  hepatitis: {
    label: "Viral hepatitis",
    codes: ["B18", "B19"],
    offsets: o({ hr: 3, t: 0.4, pain: 1 }),
    definitive: ["antiviral"], infection: true, basis: "estimate",
  },
  cirrhosis: {
    label: "Cirrhosis",
    codes: ["K74"],
    offsets: o({ hr: 8, sbp: -8, rr: 2, pain: 1 }), persistent: true,
    definitive: ["diuretic"], tags: ["cardiac"], basis: "estimate",
  },
  upper_resp_infection: {
    label: "Upper respiratory infection",
    codes: ["J06"],
    offsets: o({ hr: 2, t: 0.8, o2: -1, rr: 1, pain: 1 }), holdMin: 720,
    definitive: ["antipyretic", "antiviral"], infection: false, basis: "estimate",
  },
  vascular: {
    label: "Phlebitis, venous embolism, peripheral vascular disease",
    codes: ["I80", "I82", "I73"],
    offsets: o({ hr: 8, t: 0.4, o2: -1, rr: 1, pain: 3 }),
    definitive: ["anticoagulant", "analgesic"], basis: "estimate",
  },
  hiv: {
    label: "HIV disease",
    codes: ["B20"],
    offsets: o({ hr: 4, t: 0.4 }), persistent: true,
    definitive: [], basis: "estimate",
  },
};

/**
 * Diagnoses deliberately WITHOUT an acute signature: chronic or stable
 * conditions whose vitals stay at the patient's baseline. Listed so a test can
 * prove every diagnosis the generator can create is either mapped or here.
 */
export const NO_ACUTE_SIGNATURE: string[] = [
  "I10", "E11", "E78", "E03", "E04", "E20", "E21", "E24", "M17", "M81", "M75", "G56", "G58", "G61",
  "F32", "F31", "F20", "F90", "F43", "F42", "F00", "H25", "H10", "B86", "A30", "A82", "D25", "D69",
  "N40", "K64", "Q36", "Q37", "R23", "R70", "R31", "I00", "I70", "I25", "I77", "P07", "P10", "P58",
  "Z00",
];

const GROUP_BY_ICD: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [id, g] of Object.entries(GROUPS)) for (const c of g.codes) {
    if (m.has(c)) throw new Error(`illness-model: ${c} is in two groups (${m.get(c)}, ${id})`);
    m.set(c, id);
  }
  return m;
})();

/** The acute diagnosis group of an ICD-10 code, or null for a chronic/stable one. */
export function groupForIcd(code: string | undefined): string | null {
  if (!code) return null;
  return GROUP_BY_ICD.get(code.substring(0, 3)) ?? null;
}

// ── Grade ─────────────────────────────────────────────────────────────────
export const GRADE_SCALE: Record<Grade, number> = { mild: 0.5, moderate: 1, severe: 1.5 };
// Mirrors assessMortalityRisk: dengue (A91) is not a blanket critical diagnosis.
const CRITICAL_DX = ["I21", "I50", "R57", "A41", "I63", "J84"];

/** Risk points from factors already in the mortality-risk score (age, comorbidity, critical diagnosis). */
export function gradePoints(age: number, diagnosisCodes: string[]): number {
  let pts = 0;
  if (age > 75) pts += 2; else if (age > 60) pts += 1;
  if (diagnosisCodes.length >= 3) pts += 1;
  if (CRITICAL_DX.some(c => diagnosisCodes.includes(c))) pts += 2;
  return pts;
}

/**
 * Grade from one uniform draw `u` (from a dedicated sub-stream keyed on the
 * encounter) and the risk points: each point shifts 0.12 of probability mass
 * toward the severe end. With no risk factors: 30 % mild, 45 % moderate, 25 %
 * severe, skewed sicker than a general population because these patients were
 * admitted (mild cases are mostly managed as outpatients).
 */
export function gradeFor(u: number, points: number): Grade {
  const v = u + 0.12 * points;
  return v < 0.3 ? "mild" : v < 0.75 ? "moderate" : "severe";
}

// ── Course ────────────────────────────────────────────────────────────────
export const RAMP_MIN = 360;          // onset: level 0 → 1 over 6 hours
export const HOLD_MIN = 1440;         // at full acuity for the first 24 hours
// Calibrated so a moderate-grade pneumonia patient reaches Halm clinical stability (HR ≤ 100, RR ≤ 24,
// SBP ≥ 90, T ≤ 37.8, SpO2 ≥ 90) at a median of 3 days: PORT cohort, 3 days (temperature, RR, SpO2); Danish
// cohort median age 75, 4 days. Severe grade (1.5×) then takes about 4.6 days. Tested in illness-model.test.ts.
export const HALF_LIFE_TREATED_MIN = 3900;   // 2.7 days
export const UNTREATED_FACTOR = 3;    // untreated decays at a third of the rate
export const COURSE_STEP_MIN = 10;    // the course advances every 10 ticks
const COMPLICATION_PER_DAY: Record<Grade, number> = { mild: 0.005, moderate: 0.02, severe: 0.06 };
export const MAX_LEVEL = 1.5;

/** Onset ramp: 6 hours, but never longer than the group's own hold (a seizure peaks at once). */
export function rampMinFor(def: GroupDef): number {
  return Math.min(RAMP_MIN, def.holdMin ?? HOLD_MIN);
}

export function newIllness(group: string, grade: Grade, t0: number): IllnessState {
  const def = GROUPS[group]!;
  return { group, grade, t0, level: 0, peak: 1, holdUntil: t0 + (def.holdMin ?? HOLD_MIN), at: t0, day: 0, complications: 0 };
}

/** Hazard of a complication in one day, before the daily draw. */
export function complicationChance(ill: IllnessState, treated: boolean, lateDefinitive: boolean): number {
  const def = GROUPS[ill.group]!;
  if (def.persistent) return 0;
  let p = COMPLICATION_PER_DAY[ill.grade];
  if (!treated) p *= 3;
  // Surviving Sepsis Campaign data: odds of death rise from 1.00 (< 1 h) to 1.52 (> 6 h) with antibiotic delay.
  if (def.infection && lateDefinitive) p *= 1.5;
  return Math.min(0.5, p);
}

/**
 * Advance the course to tick `now`. Pure. `draw` is called at most once, only
 * when a new whole day has begun, so its stream can be a dedicated one.
 */
export function advanceCourse(
  ill: IllnessState, now: number, treated: boolean, lateDefinitive: boolean, draw: () => number,
): IllnessState {
  if (now <= ill.at) return ill;
  const def = GROUPS[ill.group]!;
  const age = now - ill.t0;
  const dt = now - ill.at;
  let { level, peak, holdUntil, day, complications } = ill;

  const ramp = rampMinFor(def);
  if (def.persistent) {
    level = Math.min(1, age / ramp);
  } else {
    const newDay = Math.floor(age / 1440);
    if (newDay > day) {
      day = newDay;
      if (draw() < complicationChance(ill, treated, lateDefinitive)) {
        peak = Math.min(MAX_LEVEL, level + 0.5);
        level = peak;
        holdUntil = now + HOLD_MIN;
        complications++;
      }
    }
    if (age < ramp) level = Math.min(peak, age / ramp);
    else if (now <= holdUntil) level = peak;
    else {
      const half = (def.halfLifeMin ?? HALF_LIFE_TREATED_MIN) * (treated ? 1 : UNTREATED_FACTOR);
      level = level * Math.pow(0.5, dt / half);
    }
  }
  return { ...ill, level, peak, holdUntil, at: now, day, complications };
}

/** Signature at the current course level, grade-scaled, before treatment. Includes the dengue-style critical phase. */
export function signature(ill: IllnessState, now: number): Offsets {
  const def = GROUPS[ill.group]!;
  const g = GRADE_SCALE[ill.grade];
  const out: Offsets = {};
  for (const k of VITAL_KEYS) {
    const base = (def.offsets[k] ?? 0) * g * ill.level;
    out[k] = base;
  }
  if (def.critical) {
    const age = now - ill.t0;
    const { fromMin, toMin, offsets } = def.critical;
    const ramp = 360; // 6-hour shoulders
    const w = Math.max(0, Math.min(1, (age - fromMin) / ramp, (toMin - age) / ramp));
    if (w > 0) for (const k of VITAL_KEYS) out[k] = (out[k] ?? 0) + (offsets[k] ?? 0) * g * w;
  }
  return out;
}
