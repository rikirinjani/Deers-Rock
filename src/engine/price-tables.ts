/**
 * ADR-015 D1/D7 — Item-level price tables (Epic IX Phase 1).
 *
 * Same pattern as INA_CBG in ina-cbg.ts: concrete, deterministic IDR constants
 * in TypeScript data modules. No RNG, no clock dependency, no Date.now.
 *
 * Every previously-billed category migrates to a real item price here; the
 * flat CHARGE_RATES in charge-generator.ts are retained ONLY as fallbacks for
 * lookups that miss a table (unknown test code, unmapped study, etc.).
 *
 * Calibration source: Indonesian RS Tipe C regional tariff bands (2023-2025
 * ranges); values are first-pass calibration guesses isolated in this single
 * module so recalibration is data-only, never code.
 */

import { DRUG_CATALOG } from "./drug-catalog.js";
import { CHARGE_RATES } from "./charge-generator.js";

// ─── Pharmacy (D1): price computed at module load ───────────────────────────

/** Uniform pharmacy markup over acquisition cost (e-catalogue). */
export const PHARMACY_MARKUP = 1.25;

/** Fallback when a medication order's drug code misses the catalog. */
export const PHARMACY_FALLBACK_PRICE = CHARGE_RATES.pharmacy;

/** code → Math.round(costIdr × PHARMACY_MARKUP), computed once at module load. */
export const DRUG_PRICES: ReadonlyMap<string, number> = new Map(
  DRUG_CATALOG.map(d => [d.code, Math.round(d.costIdr * PHARMACY_MARKUP)]),
);

// ─── Laboratory (by test code; see lab.ts LAB_TESTS) ────────────────────────

/** Basic panels ~150k; immunoassay / HPLC-class tests 300-450k. */
export const LAB_PRICES: Record<string, number> = {
  CBC: 150_000,        // Complete Blood Count (basic hematology)
  BMP: 150_000,        // Basic Metabolic Panel
  TROP: 450_000,       // Troponin I (immunoassay)
  CRP: 200_000,        // C-Reactive Protein
  "PT-INR": 200_000,   // Coagulation panel
  LFT: 250_000,        // Liver Function Test
  UA: 150_000,         // Urinalysis (basic)
  HBA1C: 300_000,      // Hemoglobin A1C (HPLC)
};

// ─── Radiology (by study type; see radiology.ts RAD_STUDIES) ────────────────

export const RAD_PRICES: Record<string, number> = {
  "Chest X-ray PA & Lateral": 250_000,
  "Extremity X-ray Left Ankle": 250_000,
  "Abdominal Ultrasound": 350_000,
  "CT Head without contrast": 1_200_000,
  "CT Abdomen with contrast": 1_400_000,
  "MRI Lumbar Spine without contrast": 2_500_000,
};

// ─── Surgery (by CPT procedure code; see surgery.ts PROCEDURES) ─────────────
// Minor/endoscopic ~2.5-4M; intermediate 7.5-9M; major arthroplasty/resection 12-15M.

export const SURGERY_PRICES: Record<string, number> = {
  "47562": 12_000_000, // Laparoscopic Cholecystectomy
  "44970": 9_000_000,  // Laparoscopic Appendectomy
  "49505": 7_500_000,  // Inguinal Hernia Repair
  "27130": 15_000_000, // Total Hip Arthroplasty
  "27447": 15_000_000, // Total Knee Arthroplasty
  "44140": 14_000_000, // Partial Colectomy
  "43239": 2_500_000,  // Upper GI Endoscopy with Biopsy
  "45380": 2_500_000,  // Colonoscopy with Biopsy
  "38500": 3_000_000,  // Lymph Node Biopsy
  "19120": 4_000_000,  // Breast Mass Excision
};

// ─── Dialysis (D7: per completed session, by machine/session type) ──────────

export type DialysisSessionType = "hd" | "hdf" | "pd";

export const DIALYSIS_PRICES: Record<DialysisSessionType, number> = {
  hd: 900_000,   // Conventional hemodialysis
  hdf: 1_100_000, // Hemodiafiltration
  pd: 700_000,   // Peritoneal dialysis session
};

// ─── Radiotherapy (D7: per delivered fraction, by modality) ─────────────────

export const RADIOTHERAPY_PRICES: Record<string, number> = {
  external_beam: 800_000,
  imrt: 1_200_000,
  brachytherapy: 1_500_000,
  stereotactic: 1_400_000,
  electron: 800_000,
};

// ─── Emergency (D7: ED fee by acuity, billed once at disposition) ───────────

export const ED_FEE_BY_ACUITY: Record<number, number> = {
  1: 400_000,
  2: 300_000,
  3: 200_000,
  4: 100_000,
  5: 100_000,
};

// ─── Specialty consults (D7: fee on order completion, by specialty) ─────────
// Base specialist visit ~150k; procedural / organ-specialty tiers up to 350k.

export const SPECIALTY_CONSULT_FEES: Record<string, number> = {
  cardiology: 250_000,
  neurology: 200_000,
  ophthalmology: 150_000,
  ent: 150_000,
  dermatology: 150_000,
  psychiatry: 150_000,
  pediatrics: 150_000,
  obgyn: 200_000,
  pulmonology: 175_000,
  rehab_medik: 175_000,
  anesthesiology: 200_000,
  dentistry: 175_000,
  hemodialysis: 200_000,
  endoscopy: 350_000,
  pathology_anatomy: 150_000,
  forensic: 200_000,
  internal_medicine: 150_000,
  surgery: 250_000,
  emergency: 200_000,
};

// ─── Respiratory therapy (D7: per-order activation fee) ─────────────────────

export const RESPIRATORY_ACTIVATION_FEE = 200_000;

// ─── Lookup helpers (table first, CHARGE_RATES flat rate as fallback) ───────

export function labPrice(testCode: string): number {
  return LAB_PRICES[testCode] ?? CHARGE_RATES.lab;
}

export function radiologyPrice(studyType: string): number {
  return RAD_PRICES[studyType] ?? CHARGE_RATES.radiology;
}

export function surgeryPrice(procedureCode: string): number {
  return SURGERY_PRICES[procedureCode] ?? CHARGE_RATES.surgery;
}

export function dialysisPrice(sessionType: string): number {
  return DIALYSIS_PRICES[sessionType as DialysisSessionType] ?? CHARGE_RATES.dialysis;
}

export function radiotherapyPrice(modality: string): number {
  return RADIOTHERAPY_PRICES[modality] ?? CHARGE_RATES.radiotherapy;
}

export function edFee(acuity: number): number {
  return ED_FEE_BY_ACUITY[acuity] ?? CHARGE_RATES.emergency;
}

export function specialtyConsultFee(specialty: string): number {
  return SPECIALTY_CONSULT_FEES[specialty] ?? CHARGE_RATES.consult;
}
