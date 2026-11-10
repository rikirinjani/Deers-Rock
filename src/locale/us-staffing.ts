/**
 * US hospital staffing (Epic X M10.5c): clinical headcount per staffed bed from BLS OEWS hospital employment.
 *
 * Source: BLS OEWS 2025 national industry employment, NAICS 622000 (all hospitals), via the BLS Public Data API
 * (docs/us-calibration-targets.md T-WORK-3, retrieved 2026-11-10), divided by 907,216 staffed beds of all US
 * hospitals (AHA 2024, T-CAP-1). The years differ and employment also covers outpatient and ED staff, so the
 * per-bed figure is an upper reference for ward staffing; employed physicians exclude self-employed and most
 * contracted hospital physicians, so the physician figure is a lower bound.
 *
 * Role mapping (mine, for Research OC review): perawat = RNs + LPN/LVNs; physicians (SOC 29-1210) are split
 * between dokter_spesialis and dokter_umum 9:5 as in the legacy roster (no source for the split); apoteker =
 * pharmacists, asisten_apoteker = pharmacy technicians, radiografer = radiologic technologists. Nursing
 * assistants have no roster role. Every other role (midwives, anaesthesia nurses, lab, therapists, records,
 * support staff) keeps the Indonesian formula until it has a sourced figure.
 *
 * Deterministic constants: no RNG, no clock.
 */
import type { IStaffing } from "./contracts.js";
import type { AgentRole } from "../agent/types.js";
import { IndonesiaStaffing } from "./indonesia.js";

export const US_STAFFED_BEDS_2024 = 907_216;

/** BLS OEWS 2025, NAICS 622000 employment. */
export const US_HOSPITAL_EMPLOYMENT_2025 = {
  registeredNurses: 2_020_230,
  licensedPracticalNurses: 105_790,
  physicians: 210_810,
  pharmacists: 102_470,
  pharmacyTechnicians: 85_080,
  radiologicTechnologists: 138_130,
} as const;

const E = US_HOSPITAL_EMPLOYMENT_2025;
/** Staff per staffed bed by roster role. */
export const US_STAFF_PER_BED: Readonly<Partial<Record<AgentRole, number>>> = {
  perawat: (E.registeredNurses + E.licensedPracticalNurses) / US_STAFFED_BEDS_2024,
  dokter_spesialis: (E.physicians * 9 / 14) / US_STAFFED_BEDS_2024,
  dokter_umum: (E.physicians * 5 / 14) / US_STAFFED_BEDS_2024,
  apoteker: E.pharmacists / US_STAFFED_BEDS_2024,
  asisten_apoteker: E.pharmacyTechnicians / US_STAFFED_BEDS_2024,
  radiografer: E.radiologicTechnologists / US_STAFFED_BEDS_2024,
};

export class USStaffing implements IStaffing {
  config = { countryCode: "US", displayName: "United States" };
  private readonly fallback = new IndonesiaStaffing();
  headcount(role: AgentRole, totalBeds: number): number {
    const perBed = US_STAFF_PER_BED[role];
    return perBed === undefined ? this.fallback.headcount(role, totalBeds) : Math.max(1, Math.round(totalBeds * perBed));
  }
}
