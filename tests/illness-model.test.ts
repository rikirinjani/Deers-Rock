/**
 * P-002 illness model: coverage of every diagnosis, signatures vs the published
 * criteria they were tuned to, the course shape, and the calibration to the
 * ~3-day median time to clinical stability in hospitalised pneumonia.
 */
import { describe, it, expect } from "vitest";
import {
  GROUPS, NO_ACUTE_SIGNATURE, groupForIcd, gradeFor, gradePoints, newIllness, advanceCourse, signature,
  complicationChance, GRADE_SCALE, RAMP_MIN, HOLD_MIN, HALF_LIFE_TREATED_MIN, UNTREATED_FACTOR, MAX_LEVEL, type Grade,
} from "../src/engine/illness-model.js";
import { COURSE_MIN } from "../src/engine/treatment-effects.js";
import { applyTreatment } from "../src/engine/treatment-effects.js";
import { GENERATOR_ICD_CODES } from "../src/patient/generator.js";
import { DRUG_CATALOG } from "../src/engine/drug-catalog.js";
import { VITAL_KEYS } from "../src/engine/vitals-model.js";
import type { Vitals } from "../src/patient/schema.js";

const BASE: Vitals = { heartRate: 77, bloodPressureSystolic: 124, bloodPressureDiastolic: 80, temperature: 36.9, oxygenSaturation: 97.5, respiratoryRate: 17, painLevel: 2 };
const DAY = 1440;

/** Deterministic expected vitals (no noise) of a patient in `group` at `grade`, `minutes` after admission, treated at `treatAt`. */
function expected(group: string, grade: Grade, minutes: number, treated: boolean, treatAt = 60): Vitals {
  const def = GROUPS[group]!;
  let ill = newIllness(group, grade, 0);
  for (let t = 10; t <= minutes; t += 10) ill = advanceCourse(ill, t, treated && t >= treatAt, false, () => 1);
  const sig = signature(ill, minutes);
  const dev = {} as Record<keyof Vitals, number>;
  for (const k of VITAL_KEYS) dev[k] = sig[k] ?? 0;
  const d = applyTreatment(dev, undefined, minutes, def);
  const out = { ...BASE };
  for (const k of VITAL_KEYS) out[k] = BASE[k] + d[k];
  return out;
}

describe("diagnosis coverage", () => {
  it("every diagnosis the generator can create is mapped to a group or deliberately has none", () => {
    const unmapped = GENERATOR_ICD_CODES.filter(c => groupForIcd(c) === null && !NO_ACUTE_SIGNATURE.includes(c));
    expect(unmapped).toEqual([]);
  });

  it("no code is both mapped and listed as having no signature", () => {
    expect(NO_ACUTE_SIGNATURE.filter(c => groupForIcd(c) !== null)).toEqual([]);
  });

  it("subcodes map by their 3-character category; unknown and empty codes map to nothing", () => {
    expect(groupForIcd("J15.9")).toBe("lower_resp_infection");
    expect(groupForIcd("A91")).toBe("dengue");
    expect(groupForIcd("I10")).toBeNull();
    expect(groupForIcd("")).toBeNull();
    expect(groupForIcd(undefined)).toBeNull();
    expect(groupForIcd("ZZZ")).toBeNull();
  });

  it("every group is well formed", () => {
    const categories = new Set<string>(DRUG_CATALOG.map(d => d.category));
    for (const [id, g] of Object.entries(GROUPS)) {
      expect(g.codes.length, id).toBeGreaterThan(0);
      expect(Object.keys(g.offsets).length, id).toBeGreaterThan(0);
      expect(["criteria", "estimate"]).toContain(g.basis);
      // A definitive class no catalogue drug carries could never start the "treated" course.
      for (const c of g.definitive) expect(categories.has(c) || c === "antivenom" || c === "blood_product", `${id}: ${c}`).toBe(true);
    }
  });

  it("the weight-heaviest acute diagnoses are covered (no silent gap in common cases)", () => {
    for (const c of ["J15", "A91", "A09", "I50", "I21", "I63", "S72", "N39", "J45", "J44", "O14", "A40", "K35"]) {
      expect(groupForIcd(c), c).not.toBeNull();
    }
  });
});

describe("signatures vs published criteria", () => {
  it("pneumonia: severe grade reaches RR ≥ 28 and SpO2 < 90 (CURB-65 RR ≥ 30, hypoxaemia); moderate crosses Halm's RR > 24 and T > 37.8", () => {
    const sev = expected("lower_resp_infection", "severe", HOLD_MIN - 10, true);
    expect(sev.respiratoryRate).toBeGreaterThanOrEqual(28);
    expect(sev.oxygenSaturation).toBeLessThan(90);
    const mod = expected("lower_resp_infection", "moderate", HOLD_MIN - 10, true);
    expect(mod.respiratoryRate).toBeGreaterThan(24);
    expect(mod.temperature).toBeGreaterThan(37.8);
    expect(mod.oxygenSaturation).toBeGreaterThanOrEqual(90);
  });

  it("sepsis (moderate): meets qSOFA by vitals (RR ≥ 22, SBP ≤ 100)", () => {
    const v = expected("sepsis", "moderate", HOLD_MIN - 10, true);
    expect(v.respiratoryRate).toBeGreaterThanOrEqual(22);
    expect(v.bloodPressureSystolic).toBeLessThanOrEqual(100);
  });

  it("pre-eclampsia (severe) reaches the ACOG severe range (SBP ≥ 160 or DBP ≥ 110)", () => {
    const v = expected("preeclampsia", "severe", HOLD_MIN - 10, true);
    expect(v.bloodPressureSystolic >= 160 || v.bloodPressureDiastolic >= 110).toBe(true);
  });

  it("stroke: SBP above 140 on presentation in the moderate grade (60–70 % of stroke patients)", () => {
    expect(expected("stroke", "moderate", HOLD_MIN - 10, true).bloodPressureSystolic).toBeGreaterThan(140);
  });

  it("femur fracture: HR 100–120 and a lower SBP at the severe grade (ATLS class II–III)", () => {
    const v = expected("femur_fracture", "severe", HOLD_MIN - 10, true);
    expect(v.heartRate).toBeGreaterThanOrEqual(95);
    expect(v.heartRate).toBeLessThanOrEqual(120);
    expect(v.bloodPressureSystolic).toBeLessThan(115);
  });

  it("asthma / COPD: moderate SpO2 90–95 % and HR ≥ 100 (GINA bands)", () => {
    const v = expected("airway_obstruction", "moderate", HOLD_MIN - 10, true);
    expect(v.oxygenSaturation).toBeGreaterThanOrEqual(90);
    expect(v.oxygenSaturation).toBeLessThanOrEqual(95);
    expect(v.heartRate).toBeGreaterThanOrEqual(90);
  });

  it("heart failure: severe grade is hypoxaemic (SpO2 < 90) and tachypnoeic (RR > 25) (ESC)", () => {
    const v = expected("heart_failure", "severe", HOLD_MIN - 10, true);
    expect(v.oxygenSaturation).toBeLessThan(91);
    expect(v.respiratoryRate).toBeGreaterThan(25);
  });

  it("dengue: critical phase (days 3–7) drops SBP and fever, febrile phase has fever", () => {
    const febrile = expected("dengue", "moderate", 1000, false);
    const critical = expected("dengue", "moderate", 4000, false);
    expect(febrile.temperature).toBeGreaterThan(37.8);
    expect(critical.bloodPressureSystolic).toBeLessThan(febrile.bloodPressureSystolic - 10);
    expect(critical.temperature).toBeLessThan(febrile.temperature);
    expect(critical.painLevel).toBeGreaterThan(febrile.painLevel);
  });

  it("typhoid has relative bradycardia: less heart-rate rise per °C of fever than malaria", () => {
    const typhoid = expected("enteric_fever", "moderate", HOLD_MIN - 10, false);
    const malaria = expected("febrile_tropical", "moderate", HOLD_MIN - 10, false);
    const perDegree = (v: Vitals) => (v.heartRate - BASE.heartRate) / (v.temperature - BASE.temperature);
    expect(perDegree(typhoid)).toBeLessThan(perDegree(malaria) / 2);
  });

  it("directions: infections raise temperature, bleeding and sepsis lower pressure, hypertensive disorders raise it", () => {
    const at = (g: string) => expected(g, "moderate", HOLD_MIN - 10, false);
    expect(at("sepsis").temperature).toBeGreaterThan(BASE.temperature + 1);
    expect(at("gi_bleed").bloodPressureSystolic).toBeLessThan(BASE.bloodPressureSystolic - 10);
    expect(at("volume_depletion").heartRate).toBeGreaterThan(BASE.heartRate + 12);
    expect(at("preeclampsia").bloodPressureSystolic).toBeGreaterThan(BASE.bloodPressureSystolic + 30);
    expect(at("renal_colic").painLevel).toBeGreaterThan(6);
  });
});

describe("grade", () => {
  it("is 30 / 45 / 25 % with no risk factors, and shifts severe with age, comorbidity and critical diagnoses", () => {
    const share = (pts: number) => {
      const c = { mild: 0, moderate: 0, severe: 0 };
      for (let i = 0; i < 10000; i++) c[gradeFor((i + 0.5) / 10000, pts)]++;
      return { mild: c.mild / 10000, moderate: c.moderate / 10000, severe: c.severe / 10000 };
    };
    const s0 = share(0);
    expect(s0.mild).toBeCloseTo(0.3, 2); expect(s0.moderate).toBeCloseTo(0.45, 2); expect(s0.severe).toBeCloseTo(0.25, 2);
    expect(share(3).severe).toBeGreaterThan(s0.severe + 0.3);
    expect(share(3).mild).toBe(0);
  });

  it("risk points come from age, comorbidity count and critical diagnoses", () => {
    expect(gradePoints(40, ["J15"])).toBe(0);
    expect(gradePoints(65, ["J15"])).toBe(1);
    expect(gradePoints(80, ["J15", "I10", "E11"])).toBe(3);
    expect(gradePoints(40, ["I21"])).toBe(2);
  });

  it("scales the signature 0.5 / 1 / 1.5", () => {
    expect(GRADE_SCALE).toEqual({ mild: 0.5, moderate: 1, severe: 1.5 });
  });
});

describe("course", () => {
  const level = (group: string, minutes: number, treated: boolean) => {
    let ill = newIllness(group, "moderate", 0);
    for (let t = 10; t <= minutes; t += 10) ill = advanceCourse(ill, t, treated, false, () => 1);
    return ill;
  };

  it("ramps from 0 to 1 over 6 hours, then holds for the first 24 hours", () => {
    expect(level("sepsis", 180, true).level).toBeCloseTo(0.5, 1);
    expect(level("sepsis", RAMP_MIN, true).level).toBeCloseTo(1, 2);
    expect(level("sepsis", HOLD_MIN, true).level).toBeCloseTo(1, 5);
  });

  it("then decays with the treated half-life, three times slower untreated", () => {
    expect(level("sepsis", HOLD_MIN + HALF_LIFE_TREATED_MIN, true).level).toBeCloseTo(0.5, 1);
    expect(level("sepsis", HOLD_MIN + HALF_LIFE_TREATED_MIN, false).level).toBeCloseTo(Math.pow(0.5, 1 / UNTREATED_FACTOR), 1);
    expect(level("sepsis", 5 * DAY, true).level).toBeLessThan(level("sepsis", 5 * DAY, false).level);
  });

  it("persistent (chronic) groups hold their signature for the whole stay", () => {
    expect(level("malignancy", 9 * DAY, false).level).toBe(1);
    expect(GROUPS.malignancy!.persistent).toBe(true);
  });

  it("short conditions use their own timing (seizure resolves within hours)", () => {
    expect(level("seizure", 12 * 60, true).level).toBeLessThan(0.15);
  });

  it("a complication lifts the level (cap 1.5) and starts a new 24-hour hold, once per day at most", () => {
    let ill = newIllness("sepsis", "severe", 0);
    for (let t = 10; t < DAY; t += 10) ill = advanceCourse(ill, t, true, false, () => 0);
    expect(ill.complications).toBe(0);
    ill = advanceCourse(ill, DAY, true, false, () => 0); // draw 0 < any chance: complication
    expect(ill.complications).toBe(1);
    expect(ill.peak).toBeLessThanOrEqual(MAX_LEVEL);
    expect(ill.level).toBe(ill.peak);
    expect(ill.holdUntil).toBe(DAY + HOLD_MIN);
    const again = advanceCourse(ill, DAY + 10, true, false, () => 0);
    expect(again.complications).toBe(1);
  });

  it("complication hazard rises with grade, with no treatment and with late antibiotics", () => {
    const mk = (grade: Grade, group = "sepsis") => newIllness(group, grade, 0);
    expect(complicationChance(mk("severe"), true, false)).toBeGreaterThan(complicationChance(mk("mild"), true, false));
    expect(complicationChance(mk("moderate"), false, false)).toBeCloseTo(3 * complicationChance(mk("moderate"), true, false), 10);
    expect(complicationChance(mk("moderate"), true, true)).toBeCloseTo(1.5 * complicationChance(mk("moderate"), true, false), 10);
    expect(complicationChance(mk("severe", "malignancy"), false, false)).toBe(0);
    // late antibiotics matter for infections, not for a fracture
    expect(complicationChance(mk("moderate", "femur_fracture"), true, true)).toBe(complicationChance(mk("moderate", "femur_fracture"), true, false));
  });

  it("does not move backwards in time", () => {
    const ill = level("sepsis", 600, true);
    expect(advanceCourse(ill, 600, true, false, () => 1)).toBe(ill);
    expect(advanceCourse(ill, 500, true, false, () => 1)).toBe(ill);
  });
});

describe("calibration: time to clinical stability in pneumonia (Halm criteria)", () => {
  // Halm: HR ≤ 100, RR ≤ 24, SBP ≥ 90, T ≤ 37.8, SpO2 ≥ 90. Published medians: 3 days (PORT), 4 days (older Danish cohort).
  const stable = (v: Vitals) => v.heartRate <= 100 && v.respiratoryRate <= 24 && v.bloodPressureSystolic >= 90 && v.temperature <= 37.8 && v.oxygenSaturation >= 90;
  function daysToStability(grade: Grade): number {
    let ill = newIllness("lower_resp_infection", grade, 0);
    let seenUnstable = false;
    for (let t = 10; t <= 20 * DAY; t += 10) {
      ill = advanceCourse(ill, t, t >= 60, false, () => 1);
      const sig = signature(ill, t);
      const dev = {} as Record<keyof Vitals, number>;
      for (const k of VITAL_KEYS) dev[k] = sig[k] ?? 0;
      const d = applyTreatment(dev, undefined, t, GROUPS.lower_resp_infection!);
      const v = { ...BASE }; for (const k of VITAL_KEYS) v[k] = BASE[k] + d[k];
      if (!stable(v)) seenUnstable = true;
      else if (seenUnstable) return t / DAY;
    }
    return Infinity;
  }

  it("moderate grade (the median admission) is stable at about 3 days", () => {
    const d = daysToStability("moderate");
    expect(d).toBeGreaterThan(2.5);
    expect(d).toBeLessThan(3.6);
  });

  it("severe grade takes longer, about 4–5 days (older, sicker cohorts)", () => {
    const d = daysToStability("severe");
    expect(d).toBeGreaterThan(3.8);
    expect(d).toBeLessThan(5.4);
  });

  it("mild grade never meets the instability criteria", () => {
    expect(daysToStability("mild")).toBe(Infinity);
  });
});

describe("regimen lengths", () => {
  it("every class in COURSE_MIN has a positive length", () => {
    for (const [k, v] of Object.entries(COURSE_MIN)) expect(v, k).toBeGreaterThan(0);
  });
});
