/**
 * Epic XII 12.2: payer-to-class routing for layout scenarios (scenario path only).
 *
 * Replaces the 12.1 placement rule ("specialty ward, else any free bed"). Draws no random
 * numbers, so seeds stay comparable across layouts. Rules:
 *  1. Eligible classes come from a policy table: payer -> classes in order of preference.
 *     The first class is the payer's own class; later ones are spillover (up to a higher
 *     class). A payer with no entry uses `defaultClasses`.
 *  2. Inside a class, prefer a ward that serves the patient's specialty (a "general" ward
 *     serves everyone), else any free bed of that class.
 *  3. No eligible class has a free bed: the patient waits; the 12.1 wait limit then
 *     diverts them. There is NO fallback into a class the table does not list. By default
 *     that excludes VIP, VVIP, ICU, HCU, NICU and PICU (today's default path takes any
 *     free bed in the hospital).
 *
 * THE DEFAULT TABLE IS AN ASSUMPTION, not a verified rule. BPJS class entitlement by
 * member tier, the KRIS single-room reform (Perpres 59/2024) and temporary placement in
 * a higher class when a class is full are unverified (design doc section 5). Inputs, so
 * an owner or hospital finance officer can correct the table without code changes.
 */
import type { Bed, Patient, RoomClass } from "../patient/schema.js";
import type { HospitalLayout } from "./state-store.js";
import { specialtyOf, specialtyWardFor } from "./markov.js";

export interface RoutingPolicy {
  /** payer -> eligible classes, most preferred first (first = own class, rest = spillover up). */
  eligible: Record<string, RoomClass[]>;
  /** Used for a payer with no entry in `eligible`. */
  defaultClasses: RoomClass[];
}

export const DEFAULT_ROUTING: RoutingPolicy = {
  eligible: {
    "BPJS Kesehatan": ["kelas-3", "kelas-2", "kelas-1"],
    "BPJS Ketenagakerjaan": ["kelas-2", "kelas-1"],
    "Jasa Raharja": ["kelas-3", "kelas-2", "kelas-1"],
    "Private Insurance": ["kelas-2", "kelas-1"],
    "Self-pay": ["kelas-3", "kelas-2", "kelas-1"],
  },
  defaultClasses: ["kelas-3", "kelas-2", "kelas-1"],
};

export interface RouteResult {
  bed: Bed;
  /** Class actually used. */
  roomClass: RoomClass;
  /** 0 = the payer's own class; >0 = spilled up. */
  rank: number;
}

function wardServes(bed: Bed, patient: Patient, layout: HospitalLayout | undefined): boolean {
  const sp = specialtyOf(patient);
  if (layout) {
    const spec = layout.wards.find((w) => w.ward === bed.ward && w.roomClass === bed.roomClass);
    if (!spec) return false;
    return spec.specialties === "general" || (sp !== undefined && spec.specialties.includes(sp));
  }
  // Default building layout carries no specialty list: use the existing specialty-to-ward map.
  return specialtyWardFor(patient) === bed.ward;
}

/** Pick a free bed for this patient under the policy, or undefined (wait). No rng. */
export function routeBed(
  beds: Map<string, Bed>, patient: Patient, payer: string,
  policy: RoutingPolicy, layout: HospitalLayout | undefined,
): RouteResult | undefined {
  const classes = policy.eligible[payer] ?? policy.defaultClasses;
  for (let rank = 0; rank < classes.length; rank++) {
    const cls = classes[rank]!;
    let first: Bed | undefined;
    for (const b of beds.values()) {
      if (b.patientId !== null || b.roomClass !== cls) continue;
      if (wardServes(b, patient, layout)) return { bed: b, roomClass: cls, rank };
      if (!first) first = b;
    }
    if (first) return { bed: first, roomClass: cls, rank };
  }
  return undefined;
}
