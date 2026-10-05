import type { HospitalState } from "./state-store.js";
import type { Encounter } from "../patient/schema.js";

/**
 * Issue #5 — per-encounter derived API data.
 *
 * Everything in this module is a PURE function of HospitalState (plus the
 * encounter itself). Nothing here mutates engine state, consumes rng(), or
 * runs inside the tick loop, so simulation semantics stay output-neutral on
 * fixed seeds; the engine keeps its own truth (morgue, respiratory orders,
 * social-work dispositions) and these views are derived at serialization
 * time only.
 *
 * ── Time conventions (confirmed against engine sources) ──────────────────
 *  - 1 tick = 1 simulated minute: clock.ts uses tickIntervalMs=1000 ×
 *    speedMultiplier=60 → hospitalTimeMs = tick × 60_000.
 *  - 1440 ticks = 1 sim-day (src/engine/calendar.ts "1440 ticks = 1 day",
 *    temporal-contract.ts DR_TICKS_PER_DAY = 1440, and markov.ts discharge
 *    scheduling tick+4320..10080 for a 3–7 day LOS).
 */

/** hospital-time ms → tick (same conversion as outcome-tracker.ts / cleanup.ts). */
export const MS_PER_TICK = 60_000;
export const TICKS_PER_DAY = 1440;
/** Readmission window: 30 sim-days of ticks. */
export const READMISSION_WINDOW_TICKS = 30 * TICKS_PER_DAY;

export function tickFromMs(hospitalTimeMs: number): number {
  return Math.floor(hospitalTimeMs / MS_PER_TICK);
}

/** Indonesian discharge outcome vocabulary (issue #5 P0-1). */
export type EncounterOutcome = "sembuh" | "dirujuk" | "meninggal" | "transfer" | "lari";

/** Human-readable display strings (shared by the FHIR serializers). */
export const OUTCOME_DISPLAY: Record<EncounterOutcome, string> = {
  sembuh: "Sembuh (discharged well)",
  meninggal: "Meninggal (died)",
  dirujuk: "Dirujuk (referred onward)",
  transfer: "Transfer (moved to another facility)",
  lari: "Lari (left without being seen)",
};

/** FHIR code system for the derived encounter outcome (local, DR-owned). */
export const OUTCOME_CODE_SYSTEM = "http://rs-deers-rock.go.id/CodeSystem/encounter-outcome";

export interface EncounterInsights {
  outcome?: EncounterOutcome;
  icuDays: number;
  ventilatorDays: number;
  readmissionWithin30d: boolean;
  lengthOfStay?: number;
  lengthOfStayDays?: number;
}

/** Encounter plus the derived fields exposed by GET /api/encounters. */
export interface EncounterView extends Encounter {
  outcome?: EncounterOutcome;
  icuDays: number;
  ventilatorDays: number;
  readmissionWithin30d: boolean;
  lengthOfStay?: number;
  lengthOfStayDays?: number;
}

/**
 * Outcome mapping (engine truth, in precedence order):
 *  1. "meninggal" — a MorgueRecord exists whose encounterId matches this
 *     encounter (markov.ts dischargeScheduledPatients records deaths this
 *     way; the encounter itself is closed with status "discharged", so the
 *     morgue is the only death signal).
 *  2. undefined — encounter still active (outcome not yet known).
 *  3. "transfer" — encounter closed with status "transferred" (part of the
 *     Encounter schema; the current tick loop never sets it, so this is a
 *     forward-compatible mapping).
 *  4. "dirujuk" — a social-work note for this encounter carries a non-home
 *     disposition (rehab/SNF/hospice/psychiatric), i.e. the patient was
 *     referred onward to another facility. This is the only encounter-linked
 *     referral signal in the engine (referral/system.ts letters are incoming
 *     referrals for synthetic REF-PAT-* patients and never reference
 *     encounters).
 *  5. "sembuh" — encounter ended without any of the above.
 *
 * "lari" (ED walk-away / LWBS) is never emitted: the emergency module only
 * assigns disposition "admitted" | "discharged" — no walk-away status exists
 * in the engine to derive it from.
 */
export function deriveOutcome(state: HospitalState, enc: Encounter): EncounterOutcome | undefined {
  if ((state.morgue ?? []).some(m => m.encounterId === enc.id)) return "meninggal";
  if (enc.status === "active" || enc.endTime === null) return undefined;
  if (enc.status === "transferred") return "transfer";
  const referredOnward = Array.from(state.socialWorkNotes.values())
    .some(n => n.encounterId === enc.id && n.disposition !== null && n.disposition !== "home");
  if (referredOnward) return "dirujuk";
  return "sembuh";
}

/**
 * Engine truth for respiratory orders (src/engine/respiratory.ts): an order
 * is created with status "ordered" and is discontinued at the earlier of
 * (a) 2 ticks after ordering ("Therapy course completed") or (b) the end of
 * the encounter. So each order contributes at most RT_COURSE_TICKS of
 * therapy time, deterministically.
 */
const RT_COURSE_TICKS = 2;
/** Therapies counted as ventilation. */
const VENTILATOR_THERAPIES = new Set(["ventilator"]);
/** Critical-care therapies counted toward ICU days (ventilation + CPAP). */
const ICU_THERAPIES = new Set(["ventilator", "CPAP"]);

function respiratoryOrderTicks(enc: Encounter, orderedAtMs: number): number {
  const startTick = tickFromMs(orderedAtMs);
  const courseEndTick = startTick + RT_COURSE_TICKS;
  // Active encounter: the order will run its full course (or already did).
  const encounterEndTick = enc.endTime !== null ? tickFromMs(enc.endTime) : courseEndTick;
  return Math.max(0, Math.min(courseEndTick, encounterEndTick) - startTick);
}

/**
 * Ticks → sim-days, rounded UP to the next hundredth of a day (1 hundredth
 * = 14.4 ticks). Any non-zero therapy therefore registers as ≥ 0.01 day,
 * while whole-day courses aggregate naturally (1440 ticks = 1.00 day).
 */
export function ticksUpToDays(ticks: number): number {
  if (ticks <= 0) return 0;
  return Math.ceil((ticks / TICKS_PER_DAY) * 100) / 100;
}

export function deriveSeverity(state: HospitalState, enc: Encounter): { icuDays: number; ventilatorDays: number } {
  let ventilatorTicks = 0;
  let icuTicks = 0;
  for (const order of state.respiratoryOrders.values()) {
    if (order.encounterId !== enc.id) continue;
    const ticks = respiratoryOrderTicks(enc, order.orderedAt);
    if (VENTILATOR_THERAPIES.has(order.therapyType)) ventilatorTicks += ticks;
    if (ICU_THERAPIES.has(order.therapyType)) icuTicks += ticks;
  }
  return { icuDays: ticksUpToDays(icuTicks), ventilatorDays: ticksUpToDays(ventilatorTicks) };
}

/**
 * true when the same patient has a LATER encounter starting within 30
 * sim-days (READMISSION_WINDOW_TICKS) of this encounter's discharge tick.
 * Pure derivation over the encounters map (inclusive window bounds).
 */
export function deriveReadmission(state: HospitalState, enc: Encounter): boolean {
  if (enc.endTime === null) return false;
  const dischargeTick = tickFromMs(enc.endTime);
  for (const other of state.encounters.values()) {
    if (other.id === enc.id || other.patientId !== enc.patientId) continue;
    const otherStartTick = tickFromMs(other.startTime);
    if (otherStartTick >= dischargeTick && otherStartTick - dischargeTick <= READMISSION_WINDOW_TICKS) return true;
  }
  return false;
}

/** Explicit length of stay in ticks (ended encounters only), plus a day figure. */
export function deriveLengthOfStay(enc: Encounter): { lengthOfStay?: number; lengthOfStayDays?: number } {
  if (enc.endTime === null) return {};
  const losTicks = Math.max(0, tickFromMs(enc.endTime) - tickFromMs(enc.startTime));
  return { lengthOfStay: losTicks, lengthOfStayDays: Math.round((losTicks / TICKS_PER_DAY) * 100) / 100 };
}

/** All derived per-encounter fields (issue #5 P0-1, P1-3, P1-4 preamble, P1-5, P2-6). */
export function deriveEncounterInsights(state: HospitalState, enc: Encounter): EncounterInsights {
  const severity = deriveSeverity(state, enc);
  return {
    outcome: deriveOutcome(state, enc),
    icuDays: severity.icuDays,
    ventilatorDays: severity.ventilatorDays,
    readmissionWithin30d: deriveReadmission(state, enc),
    ...deriveLengthOfStay(enc),
  };
}

/** Encounter spread plus the derived fields — the object served by /api/encounters. */
export function buildEncounterView(state: HospitalState, enc: Encounter): EncounterView {
  return { ...enc, ...deriveEncounterInsights(state, enc) };
}

// ─── Per-ICD outcome statistics (issue #5 P2-7) ──────────────────────────

export interface IcdOutcomeStats {
  icd: string;
  total: number;
  sembuh: number;
  meninggal: number;
  dirujuk: number;
  lari: number;
  mortalityRate: number;
}

/** Aggregation cap for the un-filtered /api/outcomes listing. */
export const ICD_OUTCOMES_CAP = 50;

/**
 * Outcome stats grouped by the encounter's principal ICD-10 code
 * (encounter.primaryDiagnosis; "UNKNOWN" when absent). Only encounters with
 * a derived outcome (i.e. ended ones) are counted; `total` includes every
 * outcome class (so any future "transfer" rows still count toward total and
 * mortalityRate even though they have no dedicated bucket in the shape).
 * mortalityRate = Math.round(meninggal / total * 100), matching
 * outcome-tracker.ts computePerformanceStats.
 */
export function computeIcdOutcomeStats(state: HospitalState, icd?: string, cap: number = ICD_OUTCOMES_CAP): IcdOutcomeStats[] {
  const groups = new Map<string, { total: number; sembuh: number; meninggal: number; dirujuk: number; lari: number }>();
  for (const enc of state.encounters.values()) {
    const outcome = deriveOutcome(state, enc);
    if (outcome === undefined) continue;
    const code = enc.primaryDiagnosis ?? "UNKNOWN";
    if (icd !== undefined && code !== icd) continue;
    let g = groups.get(code);
    if (!g) { g = { total: 0, sembuh: 0, meninggal: 0, dirujuk: 0, lari: 0 }; groups.set(code, g); }
    g.total++;
    if (outcome === "sembuh") g.sembuh++;
    else if (outcome === "meninggal") g.meninggal++;
    else if (outcome === "dirujuk") g.dirujuk++;
    else if (outcome === "lari") g.lari++;
  }
  const rows: IcdOutcomeStats[] = Array.from(groups.entries()).map(([code, g]) => ({
    icd: code,
    total: g.total,
    sembuh: g.sembuh,
    meninggal: g.meninggal,
    dirujuk: g.dirujuk,
    lari: g.lari,
    mortalityRate: g.total > 0 ? Math.round((g.meninggal / g.total) * 100) : 0,
  }));
  rows.sort((a, b) => b.total - a.total || a.icd.localeCompare(b.icd));
  return icd === undefined ? rows.slice(0, cap) : rows;
}
