/**
 * Clinical vitals orchestration — P-002 (2026-11-01).
 *
 * Glue between an encounter and the vitals handler (markov.ts):
 *  - assign an illness (group + grade) to an active encounter, lazily;
 *  - advance its course every COURSE_STEP_MIN ticks;
 *  - compute the vitals TARGET the patient is pulled toward (illness and
 *    treatment), which replaces the plain baseline;
 *  - watch for SUSTAINED abnormal vitals, which feed the mortality-risk score.
 *
 * Everything is copy-on-write: encounters are shared with snapshots and
 * timeline branches (ADR-019), so a changed encounter is a new object and an
 * unchanged one is returned as is.
 *
 * Randomness: the grade is one draw from a sub-stream keyed on
 * (world seed, encounter id); a complication is one draw per encounter per
 * day from a sub-stream keyed on (seed, encounter, day). Neither touches any
 * existing stream, and neither depends on how many other encounters exist.
 */
import type { Encounter, Patient, Vitals, VitalsWatch } from "../patient/schema.js";
import { subStreamRng, streamId } from "./clock.js";
import { VITAL_KEYS } from "./vitals-model.js";
import {
  GROUPS, groupForIcd, gradePoints, gradeFor, newIllness, advanceCourse, signature, COURSE_STEP_MIN,
} from "./illness-model.js";
import { applyTreatment, definitiveStatus } from "./treatment-effects.js";

/** Minutes a vital must stay beyond its threshold to count in the mortality-risk score
 *  (the cardiogenic-shock definition uses SBP < 90 for at least 30 minutes). */
export const SUSTAINED_MIN = 30;

/** Mortality-risk terms watched, in `VitalsWatch.run` order. */
export const WATCH_TERMS = ["spo2Low", "sbpLow", "hrHigh", "hrLow", "tempHigh", "rrHigh"] as const;
export type WatchTerm = typeof WATCH_TERMS[number];

function beyond(v: Vitals): boolean[] {
  return [
    v.oxygenSaturation < 90,
    v.bloodPressureSystolic < 90,
    v.heartRate > 120,
    v.heartRate < 50,
    v.temperature > 39,
    v.respiratoryRate > 24,
  ];
}

/** Update the sustained-vitals watch. Returns the same encounter object if nothing changed. */
export function updateWatch(enc: Encounter, vitals: Vitals): Encounter {
  const b = beyond(vitals);
  const prev = enc._watch;
  if (!prev && !b.some(Boolean)) return enc;
  const run = (prev?.run ?? [0, 0, 0, 0, 0, 0]).slice();
  let flags = prev?.flags ?? 0;
  let changed = !prev;
  for (let i = 0; i < b.length; i++) {
    const next = b[i] ? run[i]! + 1 : 0;
    if (next !== run[i]) { run[i] = next; changed = true; }
    if (next >= SUSTAINED_MIN && !(flags & (1 << i))) { flags |= 1 << i; changed = true; }
  }
  if (!changed) return enc;
  const watch: VitalsWatch = { run, flags };
  return { ...enc, _watch: watch };
}

/** Which risk terms were sustained during the stay, as flags for assessMortalityRisk. */
export function sustainedFlags(enc: Encounter | undefined): Record<WatchTerm, boolean> {
  const f = enc?._watch?.flags ?? 0;
  return {
    spo2Low: !!(f & 1), sbpLow: !!(f & 2), hrHigh: !!(f & 4), hrLow: !!(f & 8), tempHigh: !!(f & 16), rrHigh: !!(f & 32),
  };
}

/** Assign an illness to an encounter that has none. Null when the diagnosis is chronic/stable. */
export function assignIllness(enc: Encounter, patient: Patient, seed: number, tick: number): Encounter {
  if (enc._illness) return enc;
  const code = enc.primaryDiagnosis ?? patient.diagnoses.find(d => d.active)?.code ?? patient.diagnoses[0]?.code;
  const group = groupForIcd(code);
  if (!group) return enc;
  const u = subStreamRng(seed, 0, streamId(`illness-grade:${enc.id}`))();
  const grade = gradeFor(u, gradePoints(patient.age, patient.diagnoses.map(d => d.code)));
  return { ...enc, _illness: newIllness(group, grade, Math.min(tick, Math.floor(enc.startTime / 60_000))) };
}

/** Advance the course if COURSE_STEP_MIN ticks have passed. Same object if not. */
export function stepIllness(enc: Encounter, seed: number, tick: number): Encounter {
  const ill = enc._illness;
  if (!ill || tick - ill.at < COURSE_STEP_MIN) return enc;
  const def = GROUPS[ill.group]!;
  const { treated, late } = definitiveStatus(enc._treat, def, ill.t0);
  const day = Math.floor((tick - ill.t0) / 1440);
  const draw = () => subStreamRng(seed, day, streamId(`illness-compl:${enc.id}`))();
  const next = advanceCourse(ill, tick, treated, late, draw);
  return next === ill ? enc : { ...enc, _illness: next };
}

/** The vitals a patient with this encounter is pulled toward at `tick`. */
export function targetFor(baseline: Vitals, enc: Encounter | undefined, tick: number): Vitals {
  const ill = enc?._illness;
  if (!ill) return baseline;
  const sig = signature(ill, tick);
  const dev = {} as Record<keyof Vitals, number>;
  for (const k of VITAL_KEYS) dev[k] = sig[k] ?? 0;
  const treated = applyTreatment(dev, enc!._treat, tick, GROUPS[ill.group]!);
  const out = { ...baseline };
  for (const k of VITAL_KEYS) out[k] = baseline[k] + treated[k];
  return out;
}
