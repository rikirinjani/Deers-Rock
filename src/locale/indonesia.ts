/**
 * Indonesian locale: wraps the existing identity generator and referral
 * geography unchanged (Epic X M10.5a). Optional identity hooks are left out on
 * purpose: the patient generator's built-in Indonesian path stays authoritative.
 */
import type { IIdentityLocale, IReferralNetwork } from "./contracts.js";
import type { Gender, Identity, ReferralFacility } from "../identity/types.js";
import { generateIdentity, resetNikCounter } from "../identity/generator.js";
import { REFERRAL_FACILITIES } from "../identity/data.js";
import { facilityTier, isEligibleSender, distanceKm } from "../referral/geo.js";

export class IndonesiaIdentityLocale implements IIdentityLocale {
  config = { countryCode: "ID", displayName: "Indonesia" };
  identity(gender: Gender, rng?: () => number): Identity { return generateIdentity(gender, rng); }
  resetCounters(): void { resetNikCounter(); }
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
