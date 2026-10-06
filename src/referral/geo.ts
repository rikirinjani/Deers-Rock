/**
 * ADR-016 D1: Geographic routing utilities for referral system.
 *
 * Pure functions — no rng, no state mutation. Called from referralHandler
 * and emergencyHandler at entity-creation time (D8 entity-creation draws).
 */

/**
 * Facility tier mapping. RS Tipe C (Deers-Rock) = tier 3.
 * Hierarchy: Puskesmas/Klinik → 1, RS D → 2, RS C → 3, RS B → 4, RS A → 5.
 */
export function facilityTier(type: string): number {
  switch (type) {
    case "Puskesmas":
    case "Klinik": return 1;
    case "RS Tipe D": return 2;
    case "RS Tipe C": return 3;
    case "RS Tipe B": return 4;
    case "RS Tipe A": return 5;
    default: return 0;
  }
}

/**
 * Catchment band relative to Deers-Rock (provinceCode "73", regencyCode "71").
 * - same-regency: "city"
 * - same-province: "province"
 * - eastern-indonesia: province codes 71, 72, 75, 63, 64, 65, 81, 91, 93
 * - national: everything else
 */
export function catchmentBand(provinceCode: string, regencyCode: string): string {
  if (provinceCode === "73" && regencyCode === "71") return "city";
  if (provinceCode === "73") return "province";
  const EASTERN_INDONESIA = new Set(["71", "72", "75", "63", "64", "65", "81", "91", "93"]);
  if (EASTERN_INDONESIA.has(provinceCode)) return "eastern-indonesia";
  return "national";
}

/**
 * Senders are restricted to Sulawesi (73) + eastern Indonesia per blocker decision.
 * Returns true if the facility's province is in the allowed sender set.
 */
const SENDER_PROVINCES = new Set(["73", "72", "71", "63", "64", "65", "81", "91", "93", "52", "53", "11", "62", "91", "81"]);
export function isEligibleSender(provinceCode: string): boolean {
  return SENDER_PROVINCES.has(provinceCode);
}

/**
 * Distance lookup table (km) between Deers-Rock (Makassar, 73/71) and other provinces.
 * Hand-set values per Oracle R1 — no rng.
 */
const DISTANCE_KM: Record<string, number> = {
  "73": 0,      // South Sulawesi (Makassar)
  "72": 250,    // Central Sulawesi (Palu)
  "71": 600,    // North Sulawesi (Manado)
  "63": 400,    // South Kalimantan (Banjarmasin)
  "64": 500,    // East Kalimantan (Samarinda)
  "65": 700,    // North Kalimantan (Tarakan)
  "52": 800,    // West Nusa Tenggara (Mataram)
  "53": 900,    // East Nusa Tenggara (Kupang)
  "11": 2500,   // Aceh
  "62": 1500,   // Central Kalimantan (Pahandut)
  "81": 1200,   // Maluku (Ambon)
  "91": 1800,   // Papua (Jayapura)
  "93": 2200,   // Papua Highland (Merauke)
  "31": 1200,   // DKI Jakarta (non-catchment, excluded)
  "35": 1000,   // East Java (Surabaya, non-catchment, excluded)
};
export function distanceKm(provinceCode: string): number {
  return DISTANCE_KM[provinceCode] ?? 1000;
}

/**
 * Travel time in ticks (1 tick = 1 sim-minute). Speeds: car 60 km/h, ambulance BLS 60 km/h, ALS 80 km/h.
 * Returns ticks until arrival.
 */
export function travelTicks(distanceKm_: number, speedKmh: number): number {
  return Math.ceil((distanceKm_ / speedKmh) * 60); // minutes → ticks
}
