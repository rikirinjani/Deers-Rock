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
  /**
   * Rule-aware routing (12.4 follow-up): BPJS Kesehatan patients are split by entitlement tier
   * (PBI counted in Kelas 3) using this mix, and routed under the key "BPJS Kesehatan|<tier class>".
   * The tier is a zero-rng hash of the patient id, so the same patient has the same tier in every
   * layout. The mix is UNSOURCED.
   */
  bpjsTierMix?: { "kelas-3": number; "kelas-2": number; "kelas-1": number };
}

/** Key under which a payer is looked up in `eligible` (BPJS Kesehatan splits by tier when a mix is set). */
export function routingKey(policy: RoutingPolicy, payer: string, patientId: string): string {
  if (!policy.bpjsTierMix || payer !== "BPJS Kesehatan") return payer;
  const m = policy.bpjsTierMix;
  const total = m["kelas-3"] + m["kelas-2"] + m["kelas-1"];
  let h = 5381;
  for (let i = 0; i < patientId.length; i++) h = (Math.imul(h, 33) ^ patientId.charCodeAt(i)) | 0;
  const u = ((h >>> 0) % 100000) / 100000 * total;
  const tier: RoomClass = u < m["kelas-3"] ? "kelas-3" : u < m["kelas-3"] + m["kelas-2"] ? "kelas-2" : "kelas-1";
  return `BPJS Kesehatan|${tier}`;
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

/**
 * Strict variant of DEFAULT_ROUTING (12.4 sensitivity): each payer may use ONLY its own class
 * (the first class of its default list), no spillover up. A payer whose own class has no bed in
 * the layout is never placed and ends diverted.
 */
export const STRICT_ROUTING: RoutingPolicy = {
  eligible: Object.fromEntries(Object.entries(DEFAULT_ROUTING.eligible).map(([k, v]) => [k, [v[0]!]])),
  defaultClasses: [DEFAULT_ROUTING.defaultClasses[0]!],
};

/**
 * Rule-aware routing (12.4 follow-up). BPJS Kesehatan members are routed by entitlement tier:
 * each tier uses its own class first and is moved ONE class up when that class is full (forced
 * upgrade, the hospital absorbs the cost; K3 -> K2, K2 -> K1, K1 stays in K1: no VIP). Voluntary
 * upgrade is out of scope. Other payers follow DEFAULT_ROUTING.
 * The rules come from secondary sources (news), not primary text; see the design doc KRIS note.
 * `mix` (share of BPJS Kesehatan members in Kelas 3 incl. PBI, Kelas 2, Kelas 1) is UNSOURCED.
 */
export function ruleAwareRouting(mix: { "kelas-3": number; "kelas-2": number; "kelas-1": number }): RoutingPolicy {
  const eligible: Record<string, RoomClass[]> = { ...DEFAULT_ROUTING.eligible };
  delete eligible["BPJS Kesehatan"];
  eligible["BPJS Kesehatan|kelas-3"] = ["kelas-3", "kelas-2"];
  eligible["BPJS Kesehatan|kelas-2"] = ["kelas-2", "kelas-1"];
  eligible["BPJS Kesehatan|kelas-1"] = ["kelas-1"];
  return { eligible, defaultClasses: DEFAULT_ROUTING.defaultClasses, bpjsTierMix: mix };
}

/**
 * Refit works (12.3): `beds` free beds of `roomClass` are out of service from `fromTick`
 * (inclusive) to `toTick` (exclusive). They are the last beds of that class in bed order.
 * A bed already occupied is not evicted; it just can not be re-let until the works end.
 */
export interface Closure { roomClass: RoomClass; beds: number; fromTick: number; toTick: number }

/** Bed ids closed at this tick (empty set when there are no closures). */
export function closedBedIds(beds: Map<string, Bed>, closures: Closure[] | undefined, tick: number): Set<string> {
  const out = new Set<string>();
  if (!closures || closures.length === 0) return out;
  for (const c of closures) {
    if (tick < c.fromTick || tick >= c.toTick) continue;
    const ofClass = [...beds.values()].filter((b) => b.roomClass === c.roomClass);
    for (const b of ofClass.slice(Math.max(0, ofClass.length - c.beds))) out.add(b.id);
  }
  return out;
}

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
  closed?: ReadonlySet<string>,
): RouteResult | undefined {
  const classes = policy.eligible[payer] ?? policy.defaultClasses;
  for (let rank = 0; rank < classes.length; rank++) {
    const cls = classes[rank]!;
    let first: Bed | undefined;
    for (const b of beds.values()) {
      if (b.patientId !== null || b.roomClass !== cls || closed?.has(b.id)) continue;
      if (wardServes(b, patient, layout)) return { bed: b, roomClass: cls, rank };
      if (!first) first = b;
    }
    if (first) return { bed: first, roomClass: cls, rank };
  }
  return undefined;
}
