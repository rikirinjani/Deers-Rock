/**
 * Vital-sign drift — mean-reverting around each patient's own baseline
 * (owner-approved fix, 2026-10-31).
 *
 * Before: every vital moved by `floor(rng·6) − 3` per minute (mean −0.5) with no
 * pull back, so within one simulated hour the whole patient pool was
 * bradycardic, hypotensive and hypoxic and sat on the clamps (HR 50, SBP 90,
 * SpO₂ 90 %). 93.5 % of inpatients were discharged "deteriorated" and the
 * mortality-risk score and AI-doctor triggers ran on artefactual vitals.
 *
 * Now each vital is an Ornstein–Uhlenbeck process in discrete time, one
 * minute per step:
 *
 *     next = round( x + k·(baseline − x) + u ),   u ~ Uniform(−a, +a)
 *
 * - unbiased: u is symmetric, and the pull toward the baseline is the only
 *   drift, so the long-run mean equals the baseline;
 * - k is the pull per minute; a displacement relaxes with time constant 1/k
 *   (30 min for HR and BP, 20 min for RR, 10 min for SpO₂, pain and
 *   temperature);
 * - a is set per vital so the stationary SD is `sd` (step SD = sd·√(2k), and
 *   a uniform's half-width is √3 × its SD). Rounding to the stored precision
 *   is applied to the sum, so the continuous noise dithers it. Coarse
 *   vitals (SpO₂ and pain, 1 unit; temperature, 0.1 °C) use a faster pull so
 *   the noise spans at least the rounding step: with a slow pull their noise
 *   was smaller than the step and pain never moved at all.
 *
 * Exactly one rng draw per vital per call (7 per patient), as before, so the
 * draw count stays a pure function of the patient count.
 */
import type { Vitals } from "../patient/schema.js";

interface Param {
  /** Stationary standard deviation around the baseline. */
  sd: number;
  /** Pull toward the baseline per minute. */
  k: number;
  /** Rounding step of the stored value. */
  step: number;
  min: number;
  max: number;
}

/** Hard physiological clamps are unchanged from the original handler. */
export const VITALS_PARAMS: Record<keyof Vitals, Param> = {
  heartRate: { sd: 6, k: 1 / 30, step: 1, min: 50, max: 120 },
  bloodPressureSystolic: { sd: 8, k: 1 / 30, step: 1, min: 90, max: 180 },
  bloodPressureDiastolic: { sd: 5, k: 1 / 30, step: 1, min: 60, max: 120 },
  temperature: { sd: 0.25, k: 1 / 10, step: 0.1, min: 35, max: 39.5 },
  oxygenSaturation: { sd: 1, k: 1 / 10, step: 1, min: 90, max: 100 },
  respiratoryRate: { sd: 2, k: 1 / 20, step: 1, min: 10, max: 30 },
  painLevel: { sd: 1, k: 1 / 10, step: 1, min: 0, max: 10 },
};

const KEYS = Object.keys(VITALS_PARAMS) as (keyof Vitals)[];

/** Half-width of the per-minute uniform noise that gives each vital its stationary SD. */
export function noiseHalfWidth(key: keyof Vitals): number {
  const { sd, k } = VITALS_PARAMS[key];
  return sd * Math.sqrt(2 * k) * Math.sqrt(3);
}

/** One minute of drift. Draw order is fixed: heartRate … painLevel. */
export function driftVitals(vitals: Vitals, baseline: Vitals, rng: () => number): Vitals {
  const next = { ...vitals };
  for (const key of KEYS) {
    const { k, step, min, max } = VITALS_PARAMS[key];
    const a = noiseHalfWidth(key);
    const u = (rng() * 2 - 1) * a;
    const x = vitals[key];
    const moved = x + k * (baseline[key] - x) + u;
    const rounded = Math.round(moved / step) * step;
    next[key] = +Math.max(min, Math.min(max, rounded)).toFixed(step < 1 ? 1 : 0);
  }
  return next;
}
