/**
 * Treatment effects — P-002 step C (2026-11-01).
 *
 * Treatments are recorded ON THE ENCOUNTER at the moment they are
 * administered (`encounter._treat`), not derived from orders later, because
 * cleanup.ts prunes order collections and a derived effect would silently
 * decay (the trap encounter-insights.ts documents for severity).
 *
 * The engine administers each order once, so an administered order is treated
 * as the START OF A REGIMEN with a class-specific length (COURSE_MIN): a
 * single paracetamol order stands for scheduled paracetamol for three days,
 * not one dose that wears off after six hours. Oxygen, CPAP and ventilator
 * support last for the rest of the stay (the engine's respiratory orders are
 * two-minute events; weaning is implicit because the effect only removes an
 * existing deficit).
 *
 * Effects relieve DEFICITS in the harmful direction only: oxygen cannot raise
 * SpO₂ above baseline, an antihypertensive cannot lower a normal pressure, and
 * so on. A treatment given to a patient without the matching deficit does
 * nothing. Magnitudes are estimates unless noted (docs/research/vitals-clinical-model.md).
 */
import type { Encounter, TreatmentLedger, Vitals } from "../patient/schema.js";
import { DRUG_BY_CODE, type DrugCategory } from "./drug-catalog.js";
import type { GroupDef } from "./illness-model.js";

const DAY = 1440;

/** Regimen length per drug class, in ticks (sim-minutes). */
export const COURSE_MIN: Partial<Record<DrugCategory, number>> = {
  antibiotic: 7 * DAY, antiviral: 5 * DAY, antifungal: 7 * DAY, antimalarial: 3 * DAY, antituberculous: 180 * DAY,
  antivenom: DAY, antipyretic: 3 * DAY, nsaid: 3 * DAY, analgesic: 3 * DAY, opioid: 2 * DAY,
  antihypertensive: 7 * DAY, diuretic: 5 * DAY, bronchodilator: 5 * DAY, corticosteroid: 5 * DAY,
  fluid: 180, electrolyte: 360, blood_product: 240, anticonvulsant: 7 * DAY, antiarrhythmic: 7 * DAY,
  anticoagulant: 7 * DAY, antiplatelet: 7 * DAY, ppi: 7 * DAY, h2blocker: 7 * DAY, endocrine: 7 * DAY,
  antiemetic: 2 * DAY, antipsychotic: 5 * DAY, other: 3 * DAY,
};
const DEFAULT_COURSE_MIN = 3 * DAY;

/** Fraction of a deficit removed, per class, scaled by onset. */
interface Effect {
  onsetMin: number;
  /** Temperature excess removed, °C. */
  temp?: number;
  /** Pain excess removed, points (0–10). */
  pain?: number;
  /** Systolic / diastolic excess removed, mmHg. */
  sbpAbs?: number; dbpAbs?: number;
  /** Fraction of the SpO2 deficit / RR excess / HR excess removed, for groups carrying `tag`. */
  tag?: "airway" | "cardiac" | "volume";
  o2Frac?: number; rrFrac?: number; hrFrac?: number;
  /** Fraction of a systolic/diastolic DEFICIT (hypotension) removed, for `tag` groups. */
  sbpFrac?: number;
}

export const EFFECTS: Partial<Record<DrugCategory, Effect>> = {
  antipyretic: { onsetMin: 60, temp: 0.8 },
  nsaid: { onsetMin: 60, temp: 0.5, pain: 1.5 },
  analgesic: { onsetMin: 30, pain: 1.5 },
  opioid: { onsetMin: 20, pain: 3.5 },
  // Captopril 25 mg lowers SBP 16–25 % in about a third of hypertensive urgencies; guidance is not to
  // lower by more than 10–25 % in the first hour, so the effect is capped at 20 mmHg.
  antihypertensive: { onsetMin: 90, sbpAbs: 20, dbpAbs: 10 },
  diuretic: { onsetMin: 60, tag: "cardiac", o2Frac: 0.4, rrFrac: 0.4, hrFrac: 0.2 },
  bronchodilator: { onsetMin: 20, tag: "airway", o2Frac: 0.5, rrFrac: 0.4 },
  corticosteroid: { onsetMin: 240, tag: "airway", o2Frac: 0.2, rrFrac: 0.2 },
  fluid: { onsetMin: 30, tag: "volume", hrFrac: 0.5, sbpFrac: 0.6 },
  electrolyte: { onsetMin: 60, tag: "volume", hrFrac: 0.25, sbpFrac: 0.3 },
};

/** Oxygen support: fraction of the SpO2 deficit and RR excess removed. FiO2 for nasal cannula ≈ 0.21 + 0.03 × L/min. */
export function oxygenSupport(therapyType: string, settings: string): { frac: number; rrFrac: number } | null {
  if (therapyType === "ventilator") return { frac: 0.98, rrFrac: 0.7 };
  if (therapyType === "CPAP") return { frac: 0.9, rrFrac: 0.5 };
  if (therapyType !== "oxygen") return null;
  const s = settings.toLowerCase();
  if (s.includes("nrb") || s.includes("non-rebreather")) return { frac: 0.9, rrFrac: 0.4 };
  if (s.includes("face mask") || s.includes("40%")) return { frac: 0.8, rrFrac: 0.35 };
  const flow = /(\d+(?:\.\d+)?)\s*l/.exec(s);
  const lpm = flow ? Number(flow[1]) : 3;
  return { frac: Math.min(0.75, 0.3 + 0.1 * lpm), rrFrac: Math.min(0.3, 0.05 * lpm) };
}

/** Record a medication given to the encounter. Returns the same object if nothing changes. Copy-on-write. */
export function recordMedication(enc: Encounter, category: DrugCategory, tick: number): Encounter {
  const len = COURSE_MIN[category] ?? DEFAULT_COURSE_MIN;
  const ledger: TreatmentLedger = enc._treat ?? {};
  const prev = ledger.fx?.[category];
  const until = tick + len;
  if (prev && prev.until >= until) return enc;
  return { ...enc, _treat: { ...ledger, fx: { ...ledger.fx, [category]: { from: prev?.from ?? tick, until } } } };
}

/**
 * Record an administered medication on its encounter inside a working copy of
 * the encounters map. Copy-on-write: `encounters` is mutated only if it is
 * already a private copy (!== `original`); otherwise a copy is made. Only
 * inpatient admissions carry an illness, so only they keep a ledger.
 */
export function noteMedication(
  encounters: Map<string, Encounter>, original: Map<string, Encounter>,
  encounterId: string, drugCode: string, tick: number,
): Map<string, Encounter> {
  const enc = encounters.get(encounterId);
  if (!enc || enc.status !== "active" || enc.type !== "inpatient") return encounters;
  const category = DRUG_BY_CODE.get(drugCode)?.category;
  if (!category) return encounters;
  const next = recordMedication(enc, category, tick);
  if (next === enc) return encounters;
  const out = encounters === original ? new Map(encounters) : encounters;
  out.set(encounterId, next);
  return out;
}

/** Same for a respiratory therapy order. */
export function noteRespiratory(
  encounters: Map<string, Encounter>, original: Map<string, Encounter>,
  encounterId: string, therapyType: string, settings: string, tick: number,
): Map<string, Encounter> {
  const enc = encounters.get(encounterId);
  if (!enc || enc.status !== "active" || enc.type !== "inpatient") return encounters;
  const next = recordRespiratory(enc, therapyType, settings, tick);
  if (next === enc) return encounters;
  const out = encounters === original ? new Map(encounters) : encounters;
  out.set(encounterId, next);
  return out;
}

/** Record a respiratory therapy order for the encounter. */
export function recordRespiratory(enc: Encounter, therapyType: string, settings: string, tick: number): Encounter {
  if (therapyType === "nebulizer") {
    return recordMedication(enc, /budesonide/i.test(settings) ? "corticosteroid" : "bronchodilator", tick);
  }
  const sup = oxygenSupport(therapyType, settings);
  if (!sup) return enc;
  const ledger: TreatmentLedger = enc._treat ?? {};
  const cur = ledger.o2;
  if (cur && cur.frac >= sup.frac) return enc;
  return { ...enc, _treat: { ...ledger, o2: { from: cur?.from ?? tick, frac: sup.frac, rrFrac: sup.rrFrac } } };
}

/** Has any of the group's definitive drug classes been started, and was the first dose late? */
export function definitiveStatus(ledger: TreatmentLedger | undefined, group: GroupDef, t0: number): { treated: boolean; late: boolean } {
  let first = Infinity;
  for (const cat of group.definitive) {
    const e = ledger?.fx?.[cat];
    if (e && e.from < first) first = e.from;
  }
  if (group.definitive.length === 0) {
    // Groups needing respiratory support rather than a drug: oxygen counts.
    if (ledger?.o2) first = ledger.o2.from;
  }
  if (!Number.isFinite(first)) return { treated: false, late: false };
  return { treated: true, late: first - t0 > 360 };
}

type Dev = Record<keyof Vitals, number>;

/** Onset ramp 0..1 and whether the regimen is still running at `now`. */
function active(e: { from: number; until: number } | undefined, now: number, onsetMin: number): number {
  if (!e || now >= e.until || now < e.from) return 0;
  return Math.min(1, (now - e.from + 1) / Math.max(1, onsetMin));
}

/**
 * Apply treatment to the illness deviation (target − baseline) and add the
 * fever-driven heart-rate rise. Returns a new deviation; never worsens a vital.
 */
export function applyTreatment(dev: Dev, ledger: TreatmentLedger | undefined, now: number, group: GroupDef): Dev {
  const d: Dev = { ...dev };
  const tags = group.tags ?? [];
  const fx = ledger?.fx;

  // 1. Temperature first (fever drives heart rate).
  let tempRelief = 0;
  for (const cat of ["antipyretic", "nsaid"] as DrugCategory[]) {
    const e = EFFECTS[cat]!; tempRelief = Math.max(tempRelief, (e.temp ?? 0) * active(fx?.[cat], now, e.onsetMin));
  }
  if (d.temperature > 0) d.temperature = Math.max(0, d.temperature - tempRelief);
  d.heartRate += (group.feverHr ?? 8) * Math.max(0, d.temperature);

  // 2. Oxygen, then drug classes acting on SpO2 / RR / HR.
  let o2Frac = 0, rrFrac = 0, hrFrac = 0;
  if (ledger?.o2 && now >= ledger.o2.from) {
    const on = Math.min(1, (now - ledger.o2.from + 1) / 5);
    o2Frac = ledger.o2.frac * on; rrFrac = ledger.o2.rrFrac * on;
  }
  let sbpFrac = 0;
  for (const [cat, e] of Object.entries(EFFECTS) as [DrugCategory, Effect][]) {
    if (!e.tag || !tags.includes(e.tag)) continue;
    const a = active(fx?.[cat], now, e.onsetMin);
    if (a === 0) continue;
    o2Frac = 1 - (1 - o2Frac) * (1 - (e.o2Frac ?? 0) * a);
    rrFrac = 1 - (1 - rrFrac) * (1 - (e.rrFrac ?? 0) * a);
    hrFrac = 1 - (1 - hrFrac) * (1 - (e.hrFrac ?? 0) * a);
    sbpFrac = 1 - (1 - sbpFrac) * (1 - (e.sbpFrac ?? 0) * a);
  }
  if (d.oxygenSaturation < 0) d.oxygenSaturation *= 1 - o2Frac;
  if (d.respiratoryRate > 0) d.respiratoryRate *= 1 - rrFrac;
  if (d.heartRate > 0) d.heartRate *= 1 - hrFrac;
  if (d.bloodPressureSystolic < 0) d.bloodPressureSystolic *= 1 - sbpFrac;
  if (d.bloodPressureDiastolic < 0) d.bloodPressureDiastolic *= 1 - sbpFrac;

  // 3. Antihypertensives remove a bounded part of a pressure excess.
  const ah = EFFECTS.antihypertensive!;
  const ahOn = active(fx?.antihypertensive, now, ah.onsetMin);
  if (ahOn > 0) {
    if (d.bloodPressureSystolic > 0) d.bloodPressureSystolic = Math.max(0, d.bloodPressureSystolic - ah.sbpAbs! * ahOn);
    if (d.bloodPressureDiastolic > 0) d.bloodPressureDiastolic = Math.max(0, d.bloodPressureDiastolic - ah.dbpAbs! * ahOn);
  }

  // 4. Analgesia.
  let painRelief = 0;
  for (const cat of ["analgesic", "nsaid", "opioid"] as DrugCategory[]) {
    const e = EFFECTS[cat]!; painRelief = Math.max(painRelief, (e.pain ?? 0) * active(fx?.[cat], now, e.onsetMin));
  }
  if (d.painLevel > 0) d.painLevel = Math.max(0, d.painLevel - painRelief);
  return d;
}
