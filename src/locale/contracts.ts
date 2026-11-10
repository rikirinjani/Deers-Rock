/**
 * Locale contracts (Epic X M10.5a): the country-specific parts of patient
 * identity and of the referral/transfer network, behind interfaces so the
 * engine does not hard-code Indonesian geography. Engine-side for now; they
 * move into packages/core with the rest of the adapter packaging in M10.6.
 *
 * Determinism: implementations draw only from the rng they are given and use
 * no wall clock. Draw counts are a pure function of inputs.
 */
import type { Identity, Gender, ReferralFacility } from "../identity/types.js";
import type { ICDMapping } from "../patient/icd-pool.js";
import type { CalendarDate, CalendarEvent } from "../engine/calendar.js";
import type { DrugEntry } from "../engine/drug-catalog.js";
import type { ClinicalAction } from "../engine/clinical-knowledge.js";
import type { RosterPattern, ShiftSlot } from "../agent/roster.js";
import type { Shift, AgentRole } from "../agent/types.js";

export interface ILocaleConfig {
  countryCode: string;
  displayName: string;
}

export interface IIdentityLocale {
  config: ILocaleConfig;
  /** Build a patient/staff identity (national ID slot, address, demographics). */
  identity(gender: Gender, rng?: () => number): Identity;
  /** Reset per-world counters (NIK serial, MRN). */
  resetCounters(): void;
  /** Age in whole years of a generated identity (fixed reference year, no wall clock). */
  ageOf(identity: Identity): number;
  /**
   * Optional hooks. When absent the patient generator uses its built-in
   * Indonesian name list and phone format (kept for the frozen baselines).
   */
  patientName?(gender: Gender, rng?: () => number): string;
  phone?(rng?: () => number): string;
  /** Staff licence number (one rng draw, taken before the name to keep the Indonesian draw order). */
  staffLicence?(role: string, rng?: () => number): string;
  /** Staff display name incl. title/credentials (two rng draws). */
  staffName?(role: string, gender: Gender, rng?: () => number): string;
}

export interface IReferralNetwork {
  config: ILocaleConfig;
  facilities: readonly ReferralFacility[];
  /** Hierarchy level of a facility type (1 = lowest; the home hospital is the receiving tier). */
  tier(type: string): number;
  /** Whether letters may originate from this region code. */
  isEligibleSender(regionCode: string): boolean;
  /** Distance in km from the home hospital to a region. */
  distanceKm(regionCode: string): number;
  /** Whether a road ambulance can reach the home hospital from this region. */
  reachableByRoad(regionCode: string): boolean;
  /** Region code of the home hospital (numeric, as used by dispatch records). */
  homeRegionCode: number;
  /** Receiving facility used when no higher-tier target exists. */
  fallbackTarget: string;
  /** Reasons for referral/transfer (one is chosen per letter). */
  reasons: readonly string[];
  /** Diagnoses (ICD-10 categories) a letter can carry. */
  diagnoses: readonly string[];
  letterNote(from: ReferralFacility, toFacility: string): string;
}

/**
 * Case mix (Epic X M10.5b): which diagnoses a generated patient can carry, how
 * often, and how selection weight scales with age. Every code must be one the
 * illness model and clinical knowledge can handle (tests enforce it).
 */
export interface ICaseMix {
  config: ILocaleConfig;
  /** Disease pool (ICD-10 categories) with age/sex eligibility and base selection weight. */
  diagnoses: readonly ICDMapping[];
  /** Multiplier on a diagnosis' base weight for a patient of this age (1 = none). */
  ageWeight(code: string, age: number): number;
}

/** Event calendar (Epic X M10.5b): holidays and seasons that move ED volume and case mix. */
export interface ICalendar {
  config: ILocaleConfig;
  /** Suffix of the formatted clock time (WITA, ET). */
  timeZoneLabel: string;
  /** Active events for a date; element 0 is always the "regular" baseline. */
  events(date: CalendarDate): CalendarEvent[];
}

/**
 * Drug formulary (Epic X M10.5b slice 3): which catalogue drugs a hospital
 * stocks and how they are named on orders. Protocols still reference the
 * engine's drug codes and Indonesian INN labels for matching; the formulary
 * only gates availability and changes the display name stored on the order.
 */
export interface IFormulary {
  config: ILocaleConfig;
  /** Whether the drug is on this hospital's formulary (regulatory availability). */
  isAvailable(code: string): boolean;
  /** Name shown on the order (e.g. USAN "Acetaminophen" for INN "Paracetamol"). */
  displayName(code: string, innName: string): string;
  /** Drugs this formulary adds to the base catalogue (US-only products, substitutes). */
  extraDrugs: readonly DrugEntry[];
  /** Substitute (a code in the base catalogue or extraDrugs) for an unavailable drug, if any. */
  substitute(code: string): string | undefined;
  /** Interactions involving extraDrugs: newDrug -> existing drug -> severity (list both directions). */
  extraInteractions: Readonly<Record<string, Readonly<Record<string, { severity: "minor" | "moderate" | "major" | "contraindicated"; desc: string }>>>>;
  /** Diagnosis contraindications for extraDrugs. */
  extraContraindications: readonly { drugCode: string; diagCodes: string[]; rationale: string }[];
}

/**
 * Clinical protocol set (Epic X M10.5b slice 5): per-category order-set
 * overrides. A category with no override uses the shared protocol.
 */
export interface IProtocolSet {
  config: ILocaleConfig;
  /** The order set replacing the shared protocol for this ICD-10 category, or undefined to keep it. */
  overrides(code: string): readonly ClinicalAction[] | undefined;
}

/**
 * Shift schedule (Epic X M10.5b slice 6): which shift runs at a tick and who
 * is rostered when. The Shift identifiers are engine-wide ("pagi" = day,
 * "malam" = night, "siang" = the Indonesian middle shift).
 */
export interface IShiftSchedule {
  config: ILocaleConfig;
  /** Consecutive on-duty ticks past which a tired agent can fall ill (beyond the longest shift). */
  fatigueCriticalTicks: number;
  /** Consecutive on-duty ticks after which an agent counts as tired ("lelah"). */
  fatigueWarnTicks: number;
  /** Length of the office (day-role) workday in minutes, at most the day shift. */
  officeMinutes: number;
  /** Days of the week (0 = Monday ... 6 = Sunday) office roles are off and clinics are closed. */
  officeOffDays: readonly number[];
  shiftAt(tick: number): ShiftSlot;
  rosteredShift(pattern: RosterPattern, team: number, rosterDay: number, dayOfWeek: number): Shift;
}

/**
 * Hospital staffing (Epic X M10.5c): how many staff of each role a hospital of a given bed count employs.
 * The agent roster draws one agent per head, in the generator's fixed role order, so changing a count
 * changes the random stream; the Indonesian default reproduces the original formulas exactly.
 */
export interface IStaffing {
  config: ILocaleConfig;
  /** Staff headcount of one role for a hospital with this many beds. */
  headcount(role: AgentRole, totalBeds: number): number;
}

/**
 * Emergency department demand (Epic X M10.5c): how often a patient arrives at the ED for a hospital of a given
 * bed count. The ED handler runs every tick and admits one arrival when the tick is a multiple of the interval;
 * the Indonesian default is 3 (the original fixed cadence), so the random stream is unchanged there.
 */
export interface IEdDemand {
  config: ILocaleConfig;
  /** Ticks between ED arrivals (at least 1) for a hospital with this many beds. */
  arrivalIntervalTicks(totalBeds: number): number;
}
