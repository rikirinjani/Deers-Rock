/**
 * Indonesian locale: wraps the existing identity generator and referral
 * geography (Epic X M10.5a). Name and phone hooks are left out on purpose: the
 * patient generator's built-in Indonesian lists stay authoritative.
 */
import type { IIdentityLocale, IReferralNetwork, ICaseMix, ICalendar, IFormulary, IProtocolSet, IShiftSchedule } from "./contracts.js";
import { ICD10_DIAGNOSES, dengueAgeFactor } from "../patient/icd-pool.js";
import type { CalendarDate, CalendarEvent } from "../engine/calendar.js";
import type { DrugEntry } from "../engine/drug-catalog.js";
import type { ClinicalAction } from "../engine/clinical-knowledge.js";
import type { RosterPattern, ShiftSlot } from "../agent/roster.js";
import type { Shift } from "../agent/types.js";
import { indonesiaShiftAt, indonesiaRosteredShift } from "./indonesia-shifts.js";
import { indonesiaEvents } from "./indonesia-calendar.js";
import type { Gender, Identity, ReferralFacility } from "../identity/types.js";
import { generateIdentity, resetNikCounter } from "../identity/generator.js";
import { ageFromBirthDate } from "../identity/reference-year.js";
import { REFERRAL_FACILITIES } from "../identity/data.js";
import { facilityTier, isEligibleSender, distanceKm } from "../referral/geo.js";

export class IndonesiaIdentityLocale implements IIdentityLocale {
  config = { countryCode: "ID", displayName: "Indonesia" };
  identity(gender: Gender, rng?: () => number): Identity { return generateIdentity(gender, rng); }
  resetCounters(): void { resetNikCounter(); }
  ageOf(identity: Identity): number { return ageFromBirthDate(identity.birthDate); }
}

/**
 * Sulawesi provinces linked to Makassar by the Trans-Sulawesi road. Senders
 * elsewhere (Kalimantan, Nusa Tenggara, Maluku, Papua) need a sea or air
 * transfer, which is not modelled: no road ambulance is sent.
 */
const ROAD_PROVINCES = new Set(["71", "72", "73", "74", "75", "76"]);

export class IndonesiaReferralNetwork implements IReferralNetwork {
  config = { countryCode: "ID", displayName: "Indonesia (Sistem Rujukan Berjenjang)" };
  facilities: readonly ReferralFacility[] = REFERRAL_FACILITIES;
  homeRegionCode = 73;
  fallbackTarget = "RSC-001";
  reasons = [
    "Kasus memerlukan penanganan spesialis",
    "Diagnosis masih belum jelas, diperlukan pemeriksaan lanjutan",
    "Membutuhkan tindakan bedah",
    "Perawatan intensif diperlukan",
    "Keterbatasan fasilitas penunjang diagnostik",
    "Pasien dengan komplikasi",
    "Rujukan berdasarkan Sistem Rujukan Berjenjang",
    "Kasus kegawatdaruratan yang memerlukan penanganan lebih lanjut",
  ] as const;
  diagnoses = ["I10", "E11", "J15", "N39", "I50", "J44", "M54", "K35", "S72", "I21"] as const;
  tier(type: string): number { return facilityTier(type); }
  isEligibleSender(regionCode: string): boolean { return isEligibleSender(regionCode); }
  distanceKm(regionCode: string): number { return distanceKm(regionCode); }
  reachableByRoad(regionCode: string): boolean { return ROAD_PROVINCES.has(regionCode); }
  letterNote(from: ReferralFacility, toFacility: string): string {
    return `Dirujuk dari ${from.name} (${from.type}) ke ${toFacility}`;
  }
}

/** Indonesian case mix: the original pool; only dengue (A91) is age-weighted. */
export class IndonesiaCaseMix implements ICaseMix {
  config = { countryCode: "ID", displayName: "Indonesia" };
  diagnoses = ICD10_DIAGNOSES;
  ageWeight(code: string, age: number): number { return code === "A91" ? dengueAgeFactor(age) : 1; }
}

export class IndonesiaCalendar implements ICalendar {
  config = { countryCode: "ID", displayName: "Indonesia" };
  timeZoneLabel = "WITA";
  events(date: CalendarDate): CalendarEvent[] { return indonesiaEvents(date); }
}

/** Indonesian formulary: the whole catalogue, INN names as-is. */
export class IndonesiaFormulary implements IFormulary {
  config = { countryCode: "ID", displayName: "Indonesia" };
  isAvailable(_code: string): boolean { return true; }
  displayName(_code: string, innName: string): string { return innName; }
  extraDrugs: readonly DrugEntry[] = [];
  substitute(_code: string): string | undefined { return undefined; }
  extraInteractions = {};
  extraContraindications = [];
}

/** Indonesian protocol set: the shared protocols, no overrides. */
export class IndonesiaProtocolSet implements IProtocolSet {
  config = { countryCode: "ID", displayName: "Indonesia" };
  overrides(_code: string): readonly ClinicalAction[] | undefined { return undefined; }
}

/** Indonesian schedule: pagi/siang/malam (7/7/10 h). */
export class IndonesiaShiftSchedule implements IShiftSchedule {
  config = { countryCode: "ID", displayName: "Indonesia" };
  fatigueCriticalTicks = 720;
  fatigueWarnTicks = 420;
  officeMinutes = 420;
  officeOffDays: readonly number[] = [6];
  shiftAt(tick: number): ShiftSlot { return indonesiaShiftAt(tick); }
  rosteredShift(pattern: RosterPattern, team: number, rosterDay: number, dayOfWeek: number): Shift {
    return indonesiaRosteredShift(pattern, team, rosterDay, dayOfWeek);
  }
}
