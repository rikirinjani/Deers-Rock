/**
 * US transfer network (Epic X M10.5a): the US analogue of the Indonesian
 * tiered referral system. US transfers are not mandated by insurer tiering;
 * they are EMTALA-style transfers of stabilised or specialty-needing patients
 * from rural clinics, critical access and community hospitals to a higher
 * level of care, sent to the receiving regional medical center (tier 3, the
 * simulated hospital's own tier).
 *
 * Facilities are synthetic (no real hospital names). The home hospital sits in
 * Ohio (FIPS 39); eligible senders are Ohio and its neighbours, all reachable
 * by road, so no sea/air transfer is needed.
 *
 * CALIBRATION PENDING: facility mix, distances and transfer reasons are
 * placeholders; transfer rates and sources come from M10.5c.
 */
import type { ReferralFacility } from "../identity/types.js";
import type { IReferralNetwork } from "./contracts.js";

const TIER: Record<string, number> = {
  "Rural Health Clinic": 1, "Urgent Care": 1,
  "Critical Access Hospital": 2, "Community Hospital": 2,
  "Regional Medical Center": 3,
  "Tertiary Referral Center": 4,
  "Level I Trauma Center": 5,
};

/** Approximate road distance (km) from the home hospital to each neighbouring state's referral area. */
const DISTANCE_KM: Record<string, number> = { "39": 0, "18": 250, "26": 300, "21": 300, "54": 280, "42": 450 };

const fac = (id: string, name: string, type: ReferralFacility["type"], state: string, capacity: number, doctors: number, nurses: number, beds: number): ReferralFacility =>
  ({ id, name, type, provinceCode: state, regencyCode: "001", capacity, doctors, nurses, beds });

export const US_FACILITIES: ReferralFacility[] = [
  fac("RHC-001", "Maple Valley Rural Health Clinic", "Rural Health Clinic", "39", 40, 2, 4, 0),
  fac("RHC-002", "Cedar Creek Rural Health Clinic", "Rural Health Clinic", "21", 35, 2, 3, 0),
  fac("RHC-003", "Hillcrest Rural Health Clinic", "Rural Health Clinic", "54", 30, 1, 3, 0),
  fac("UC-001", "Riverside Urgent Care", "Urgent Care", "39", 60, 3, 6, 0),
  fac("UC-002", "Lakeshore Urgent Care", "Urgent Care", "26", 55, 3, 5, 0),
  fac("UC-003", "Crossroads Urgent Care", "Urgent Care", "18", 50, 2, 5, 0),
  fac("CAH-001", "Prairie View Critical Access Hospital", "Critical Access Hospital", "39", 25, 6, 20, 25),
  fac("CAH-002", "Ridge Valley Critical Access Hospital", "Critical Access Hospital", "21", 25, 5, 18, 25),
  fac("CAH-003", "Mill Town Critical Access Hospital", "Critical Access Hospital", "54", 20, 4, 15, 20),
  fac("CAH-004", "Oak Hollow Critical Access Hospital", "Critical Access Hospital", "42", 25, 5, 18, 25),
  fac("CH-001", "Fairmont Community Hospital", "Community Hospital", "39", 90, 20, 60, 90),
  fac("CH-002", "Brookside Community Hospital", "Community Hospital", "18", 85, 18, 55, 85),
  fac("CH-003", "Pinecrest Community Hospital", "Community Hospital", "26", 100, 22, 65, 100),
  fac("CH-004", "Stonebridge Community Hospital", "Community Hospital", "42", 95, 20, 62, 95),
  fac("RMC-001", "Capital Region Medical Center", "Regional Medical Center", "39", 300, 90, 250, 300),
  fac("RMC-002", "Great Lakes Regional Medical Center", "Regional Medical Center", "26", 320, 95, 260, 320),
  fac("RMC-003", "Tri-State Regional Medical Center", "Regional Medical Center", "21", 280, 80, 230, 280),
  fac("RMC-004", "Heartland Regional Medical Center", "Regional Medical Center", "18", 290, 85, 240, 290),
  fac("RMC-005", "Allegheny Regional Medical Center", "Regional Medical Center", "42", 310, 92, 255, 310),
  fac("RMC-006", "Kanawha Regional Medical Center", "Regional Medical Center", "54", 250, 70, 200, 250),
];

export class USReferralNetwork implements IReferralNetwork {
  config = { countryCode: "US", displayName: "United States (EMTALA transfers)" };
  facilities: readonly ReferralFacility[] = US_FACILITIES;
  /** Ohio FIPS. */
  homeRegionCode = 39;
  fallbackTarget = "RMC-001";
  reasons = [
    "Specialty care not available at sending facility",
    "Diagnosis unclear; advanced diagnostic workup needed",
    "Surgical intervention required",
    "Intensive care required",
    "Limited diagnostic imaging capability",
    "Complicated course; higher level of care required",
    "Stabilized patient; EMTALA transfer accepted by receiving physician",
    "Emergency condition exceeding the sending facility's capability",
  ] as const;
  diagnoses = ["I10", "E11", "J18", "N39", "I50", "J44", "M54", "K35", "S72", "I21"] as const;
  tier(type: string): number { return TIER[type] ?? 0; }
  isEligibleSender(regionCode: string): boolean { return regionCode in DISTANCE_KM; }
  distanceKm(regionCode: string): number { return DISTANCE_KM[regionCode] ?? 500; }
  reachableByRoad(regionCode: string): boolean { return regionCode in DISTANCE_KM; }
  letterNote(from: ReferralFacility, toFacility: string): string {
    return `Transferred from ${from.name} (${from.type}) to ${toFacility}`;
  }
}
