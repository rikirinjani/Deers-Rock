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
}
