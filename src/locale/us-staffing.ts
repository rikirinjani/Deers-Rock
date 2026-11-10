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
 * assistants have no roster role. M10.5c second pass added lab, records and coding, security, cleaning, social
 * work, physio and occupational therapy, nutrition, nurse anaesthetists, nurse midwives (CNMs only), dentists,
 * psychologists, billing clerks and office admin (medical secretaries + receptionists). Roles with no sourced
 * figure (sopir_ambulans, staf_keuangan, staf_inventaris) keep the Indonesian formula.
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
  // M10.5c support and allied roles (same series, retrieved 2026-11-10)
  clinicalLabTechnologists: 150_930,
  medicalRecordsSpecialists: 55_530,
  securityGuards: 54_830,
  janitors: 97_320,
  socialWorkers: 55_770,
  physicalTherapists: 71_920,
  occupationalTherapists: 42_970,
  dietitians: 22_750,
  nurseAnesthetists: 17_250,
  nurseMidwives: 1_890,
  dentists: 2_170,
  psychologists: 10_990,
  billingClerks: 37_680,
  medicalSecretaries: 236_300,
  receptionists: 35_630,
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
  analis_lab: E.clinicalLabTechnologists / US_STAFFED_BEDS_2024,
  // medical records specialists (SOC 29-2072) cover both roles; split 5:4 as the legacy ratios 40:50 imply (no source)
  rekam_medis: (E.medicalRecordsSpecialists * 5 / 9) / US_STAFFED_BEDS_2024,
  koder: (E.medicalRecordsSpecialists * 4 / 9) / US_STAFFED_BEDS_2024,
  petugas_keamanan: E.securityGuards / US_STAFFED_BEDS_2024,
  petugas_kebersihan: E.janitors / US_STAFFED_BEDS_2024,
  pekerja_sosial: E.socialWorkers / US_STAFFED_BEDS_2024,
  fisioterapis: E.physicalTherapists / US_STAFFED_BEDS_2024,
  okupasi_terapis: E.occupationalTherapists / US_STAFFED_BEDS_2024,
  nutrisionis: E.dietitians / US_STAFFED_BEDS_2024,
  perawat_anestesi: E.nurseAnesthetists / US_STAFFED_BEDS_2024,
  bidan: E.nurseMidwives / US_STAFFED_BEDS_2024,
  dokter_gigi: E.dentists / US_STAFFED_BEDS_2024,
  psikolog: E.psychologists / US_STAFFED_BEDS_2024,
  kasir: E.billingClerks / US_STAFFED_BEDS_2024,
  // general office roles: medical secretaries + receptionists (includes clinic front desks, an upper reference)
  admin: (E.medicalSecretaries + E.receptionists) / US_STAFFED_BEDS_2024,
};

export class USStaffing implements IStaffing {
  config = { countryCode: "US", displayName: "United States" };
  private readonly fallback = new IndonesiaStaffing();
  headcount(role: AgentRole, totalBeds: number): number {
    const perBed = US_STAFF_PER_BED[role];
    return perBed === undefined ? this.fallback.headcount(role, totalBeds) : Math.max(1, Math.round(totalBeds * perBed));
  }
}
