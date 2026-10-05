import type { HospitalState } from "./state-store.js";
import type { Encounter } from "../patient/schema.js";

/**
 * Issue #5 — per-encounter derived API data (Oracle rework of the 4f0210a
 * candidate).
 *
 * Everything in this module is a PURE function of HospitalState (plus the
 * encounter itself); the ONE engine-side write it defines
 * (computeSeveritySnapshot at encounter-close time, called from
 * markov/emergency/outpatient) consumes no rng and only adds state.
 *
 * ── Derivation-source stability (Oracle F1/F2/F3) ────────────────────────
 * Cleanup prunes most collections (e.g. respiratoryOrders MAX_RESP=50 with
 * ~400-tick steady-state retention vs LOS 4320+; socialWorkNotes MAX_SOCIAL
 * + TTL; encounters MAX_ENCOUNTERS=500). Anything derived at serialization
 * time from a prunable collection silently decays over poll time. Therefore:
 *  - severity (icuDays/ventilatorDays): the engine snapshots it ONCE at
 *    close time onto the encounter (`_severityAtClose`); live derivation is
 *    only a fallback when no snapshot exists (fresh hand-built fixtures).
 *  - outcome: derived only from append-only or encounter-local truth (the
 *    morgue array and the encounter's own status). socialWorkNotes are NOT
 *    a referral signal (4/6 dispositions are random non-home
 *    placement-EVALUATION notes and the collection is pruned — Oracle F2),
 *    so "dirujuk" no longer exists in the vocabulary.
 *  - /api/outcomes byIcd: computed from `_outcomeRecords` (append-only,
 *    all-time — same store outcome-tracker.ts uses) instead of the pruned
 *    rolling encounters window (Oracle F3).
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

/**
 * Indonesian discharge outcome vocabulary (issue #5 P0-1, Oracle F2).
 * "dirujuk" was removed: its only candidate signal (socialWorkNotes
 * dispositions) is a pruned collection of placement-evaluation notes, not
 * referral events — it fabricated and then un-fabricated outcomes over poll
 * time. "lari" never existed (the ED module has no walk-away disposition).
 */
export type EncounterOutcome = "sembuh" | "meninggal" | "transfer";

/** Human-readable display strings (shared by the FHIR serializers). */
export const OUTCOME_DISPLAY: Record<EncounterOutcome, string> = {
  sembuh: "Sembuh (discharged well)",
  meninggal: "Meninggal (died)",
  transfer: "Transfer (moved to another facility)",
};

/** FHIR code system for the derived encounter outcome (local, DR-owned). */
export const OUTCOME_CODE_SYSTEM = "http://rs-deers-rock.go.id/CodeSystem/encounter-outcome";

export interface SeveritySnapshot {
  icuDays: number;
  ventilatorDays: number;
}

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
 * Encounter ids present in the morgue, built ONCE per bulk pass (Oracle F9)
 * so per-encounter outcome derivation is O(1) instead of re-scanning the
 * morgue array for every encounter.
 */
export function morgueEncounterIds(state: HospitalState): Set<string> {
  return new Set((state.morgue ?? []).map(m => m.encounterId));
}

/**
 * Outcome mapping (engine truth, in precedence order; Oracle F2/F7):
 *  1. undefined — encounter not closed yet: an outcome only exists when
 *     `status !== "active" && endTime !== null`. (ED-admitted encounters
 *     carry an endTime while status stays "active" — the ED episode ends but
 *     the admission continues — so they correctly have NO outcome yet. The
 *     same guard governs lengthOfStay(+Days), keeping key presence aligned.)
 *  2. "meninggal" — a MorgueRecord exists whose encounterId matches this
 *     encounter (markov.ts dischargeScheduledPatients records deaths this
 *     way; the morgue is append-only, never pruned → stable signal).
 *  3. "transfer" — encounter closed with status "transferred".
 *  4. "sembuh" — encounter closed any other way.
 */
export function deriveOutcome(
  state: HospitalState,
  enc: Encounter,
  morgueIds: Set<string> = morgueEncounterIds(state),
): EncounterOutcome | undefined {
  if (enc.status === "active" || enc.endTime === null) return undefined;
  if (morgueIds.has(enc.id)) return "meninggal";
  if (enc.status === "transferred") return "transfer";
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

/**
 * Ticks → sim-days, rounded UP to the next hundredth of a day (1 hundredth
 * = 14.4 ticks). Any non-zero therapy therefore registers as ≥ 0.01 day,
 * while whole-day courses aggregate naturally (1440 ticks = 1.00 day).
 */
export function ticksUpToDays(ticks: number): number {
  if (ticks <= 0) return 0;
  return Math.ceil((ticks / TICKS_PER_DAY) * 100) / 100;
}

/**
 * Oracle F1: severity computed from the respiratoryOrders that still exist
 * at close time, with every order's course capped at `closeTick` (orders
 * still "ordered" at close are discontinued AT close by respiratory.ts).
 * Called ONCE per encounter by the close sites (markov/emergency/outpatient)
 * and stored on the encounter as `_severityAtClose`. Pure: no rng, no state
 * mutation — the caller attaches the result additively.
 */
export function computeSeveritySnapshot(state: HospitalState, enc: Encounter, closeTick: number): SeveritySnapshot {
  let ventilatorTicks = 0;
  let icuTicks = 0;
  for (const order of state.respiratoryOrders.values()) {
    if (order.encounterId !== enc.id) continue;
    const startTick = tickFromMs(order.orderedAt);
    const ticks = Math.max(0, Math.min(startTick + RT_COURSE_TICKS, closeTick) - startTick);
    if (VENTILATOR_THERAPIES.has(order.therapyType)) ventilatorTicks += ticks;
    if (ICU_THERAPIES.has(order.therapyType)) icuTicks += ticks;
  }
  return { icuDays: ticksUpToDays(icuTicks), ventilatorDays: ticksUpToDays(ventilatorTicks) };
}

/**
 * Live severity derivation — FALLBACK ONLY (Oracle F1). Used when no
 * `_severityAtClose` snapshot exists (hand-built test fixtures; encounters
 * closed before this rework). For ended encounters this equals the snapshot
 * the engine would have taken at close time, given the orders still present
 * now — it decays as cleanup evicts old orders, which is exactly why the
 * snapshot path takes precedence whenever it exists.
 */
export function deriveSeverity(state: HospitalState, enc: Encounter): SeveritySnapshot {
  const capTick = enc.endTime !== null ? tickFromMs(enc.endTime) : Number.MAX_SAFE_INTEGER;
  return computeSeveritySnapshot(state, enc, capTick);
}

/**
 * Severity as served by the API: the discharge-time snapshot when present,
 * else the live fallback (Oracle F1).
 */
export function severityFor(state: HospitalState, enc: Encounter): SeveritySnapshot {
  return enc._severityAtClose ?? deriveSeverity(state, enc);
}

/**
 * true when the same patient has a LATER INPATIENT encounter starting within
 * 30 sim-days (READMISSION_WINDOW_TICKS) of this encounter's discharge tick
 * (inclusive window bounds). Only `type === "inpatient"` later encounters
 * count (Oracle F6): payer readmission semantics — an outpatient/ED revisit
 * is a new visit, not a readmission. Pure derivation over the encounters
 * map.
 */
export function deriveReadmission(state: HospitalState, enc: Encounter): boolean {
  if (enc.endTime === null) return false;
  const dischargeTick = tickFromMs(enc.endTime);
  for (const other of state.encounters.values()) {
    if (other.id === enc.id || other.patientId !== enc.patientId || other.type !== "inpatient") continue;
    const otherStartTick = tickFromMs(other.startTime);
    if (otherStartTick >= dischargeTick && otherStartTick - dischargeTick <= READMISSION_WINDOW_TICKS) return true;
  }
  return false;
}

/**
 * Explicit length of stay in ticks (ended encounters only), plus a day
 * figure. Guard is aligned with deriveOutcome (Oracle F7): the keys exist
 * exactly when `status !== "active" && endTime !== null`. When not
 * applicable the keys are ABSENT (never null) — JSON.stringify drops
 * undefined-valued keys, and consumers should test key presence, not
 * null-ness. Fixes ED-admitted encounters (endTime set, status "active")
 * showing LOS but no outcome, and vice versa.
 */
export function deriveLengthOfStay(enc: Encounter): { lengthOfStay?: number; lengthOfStayDays?: number } {
  if (enc.status === "active" || enc.endTime === null) return {};
  const losTicks = Math.max(0, tickFromMs(enc.endTime) - tickFromMs(enc.startTime));
  return { lengthOfStay: losTicks, lengthOfStayDays: Math.round((losTicks / TICKS_PER_DAY) * 100) / 100 };
}

/** All derived per-encounter fields (issue #5 P0-1, P1-3, P1-4 preamble, P1-5, P2-6). */
export function deriveEncounterInsights(state: HospitalState, enc: Encounter, morgueIds?: Set<string>): EncounterInsights {
  return {
    outcome: deriveOutcome(state, enc, morgueIds),
    ...severityFor(state, enc),
    readmissionWithin30d: deriveReadmission(state, enc),
    ...deriveLengthOfStay(enc),
  };
}

/** Encounter spread plus the derived fields — the object served by /api/encounters. */
export function buildEncounterView(state: HospitalState, enc: Encounter, morgueIds?: Set<string>): EncounterView {
  return { ...enc, ...deriveEncounterInsights(state, enc, morgueIds) };
}

// ─── Per-ICD outcome statistics (issue #5 P2-7, Oracle F3/F4) ────────────

export interface IcdOutcomeStats {
  icd: string;
  total: number;
  sembuh: number;
  meninggal: number;
  mortalityRate: number;
}

export interface IcdOutcomeStatsResult {
  /** Aggregate rows (single filtered row when `icd` is given). */
  byIcd: IcdOutcomeStats[];
  /** Distinct ICD codes in the all-time record set (reported when truncated). */
  totalDistinct: number;
  /** true when `byIcd` was capped and omits some rows. */
  truncated: boolean;
}

/** Aggregation cap for the un-filtered /api/outcomes byIcd listing. */
export const ICD_OUTCOMES_CAP = 50;

/**
 * Per-ICD outcome stats computed from `_outcomeRecords` (Oracle F3) — the
 * append-only, all-time store written by outcome-tracker.ts — joined with
 * the (equally append-only) morgue for meninggal counts. Both inputs are
 * stable, so `byIcd`, `records` and `total` in one /api/outcomes payload now
 * share the same denominator instead of mixing an all-time record set with
 * the pruned ~500-encounter rolling window.
 *
 * TWO VOCABULARIES, deliberately (documented in the API response via
 * `_vocab`): `records[].outcome` is the vitals-based tracker vocabulary
 * {improved, deteriorated, deceased} (deceased = morgue-linked), while
 * `byIcd[]` uses the Indonesian discharge vocabulary: meninggal = died
 * (record deceased or morgue-joined), sembuh = discharged alive (tracker
 * improved + deteriorated collapsed together), transfer would be counted in
 * total but has no separate bucket. mortalityRate = round(meninggal/total*100).
 *
 * Shape (Oracle F4): always returns `byIcd`; `?icd=X` filters to that
 * single row (zeroed row for an unknown code).
 */
export function computeIcdOutcomeStats(state: HospitalState, icd?: string, cap: number = ICD_OUTCOMES_CAP): IcdOutcomeStatsResult {
  const records = state._outcomeRecords ?? [];
  const morgueIds = morgueEncounterIds(state);
  const groups = new Map<string, { total: number; meninggal: number }>();
  for (const r of records) {
    let g = groups.get(r.icdCode);
    if (!g) { g = { total: 0, meninggal: 0 }; groups.set(r.icdCode, g); }
    g.total++;
    if (r.outcome === "deceased" || morgueIds.has(r.encounterId)) g.meninggal++;
  }

  const row = (code: string, g?: { total: number; meninggal: number }): IcdOutcomeStats => {
    const total = g?.total ?? 0;
    const meninggal = g?.meninggal ?? 0;
    return {
      icd: code,
      total,
      sembuh: total - meninggal,
      meninggal,
      mortalityRate: total > 0 ? Math.round((meninggal / total) * 100) : 0,
    };
  };

  if (icd !== undefined) {
    return { byIcd: [row(icd, groups.get(icd))], totalDistinct: groups.size, truncated: false };
  }

  const rows = Array.from(groups.entries())
    .map(([code, g]) => row(code, g))
    .sort((a, b) => b.total - a.total || a.icd.localeCompare(b.icd));
  return { byIcd: rows.slice(0, cap), totalDistinct: rows.length, truncated: rows.length > cap };
}
