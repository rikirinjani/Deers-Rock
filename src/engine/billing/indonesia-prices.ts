/**
 * Indonesian item price list (IDR). Epic X M10.4: the tables that used to live
 * in price-tables.ts, behind IPriceBook. Values unchanged.
 *
 * Same pattern as INA_CBG in ina-cbg.ts: concrete, deterministic IDR constants.
 * No RNG, no clock dependency, no Date.now. Calibration source: Indonesian RS
 * Tipe C regional tariff bands (2023-2025 ranges); first-pass calibration
 * guesses isolated here so recalibration is data-only, never code.
 */
import { DRUG_CATALOG } from "../drug-catalog.js";
import { PHARMACY_MARKUP } from "./indonesia-charges.js";
import type { IPriceBook } from "./contracts.js";

/** code → Math.round(costIdr × PHARMACY_MARKUP), computed once at module load. */
export const DRUG_PRICES: ReadonlyMap<string, number> = new Map(
  DRUG_CATALOG.map(d => [d.code, Math.round(d.costIdr * PHARMACY_MARKUP)]),
);

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

export const RAD_PRICES: Record<string, number> = {
  "Chest X-ray PA & Lateral": 250_000,
  "Extremity X-ray Left Ankle": 250_000,
  "Abdominal Ultrasound": 350_000,
  "CT Head without contrast": 1_200_000,
  "CT Abdomen with contrast": 1_400_000,
  "MRI Lumbar Spine without contrast": 2_500_000,
};

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

/** D7: per completed session, by machine/session type. */
export type DialysisSessionType = "hd" | "hdf" | "pd";

export const DIALYSIS_PRICES: Record<DialysisSessionType, number> = {
  hd: 900_000,   // Conventional hemodialysis
  hdf: 1_100_000, // Hemodiafiltration
  pd: 700_000,   // Peritoneal dialysis session
};

/** D7: per delivered fraction, by modality. */
export const RADIOTHERAPY_PRICES: Record<string, number> = {
  external_beam: 800_000,
  imrt: 1_200_000,
  brachytherapy: 1_500_000,
  stereotactic: 1_400_000,
  electron: 800_000,
};

/** D7: ED fee by acuity, billed once at disposition. */
export const ED_FEE_BY_ACUITY: Record<number, number> = {
  1: 400_000,
  2: 300_000,
  3: 200_000,
  4: 100_000,
  5: 100_000,
};

/** D7: fee on order completion, by specialty. Base ~150k; organ-specialty tiers up to 350k. */
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

/** D7: per-order activation fee. */
export const RESPIRATORY_ACTIVATION_FEE = 200_000;

/** Epic IX M9.3: BLS = 200k base + 2k/km; ALS = 500k base + 5k/km. */
export const AMBULANCE_FEES = { BLS: { base: 200_000, perKm: 2_000 }, ALS: { base: 500_000, perKm: 5_000 } } as const;

export class IndonesiaPriceBook implements IPriceBook {
  config = { countryCode: "ID", currency: "IDR", displayName: "Indonesia (BPJS/INA-CBG)", currencyMinorUnits: 0 };
  lab(testCode: string) { return LAB_PRICES[testCode]; }
  radiology(studyType: string) { return RAD_PRICES[studyType]; }
  surgery(procedureCode: string) { return SURGERY_PRICES[procedureCode]; }
  dialysis(sessionType: string) { return DIALYSIS_PRICES[sessionType as DialysisSessionType]; }
  radiotherapy(modality: string) { return RADIOTHERAPY_PRICES[modality]; }
  edFee(acuity: number) { return ED_FEE_BY_ACUITY[acuity]; }
  specialtyConsult(specialty: string) { return SPECIALTY_CONSULT_FEES[specialty]; }
  respiratoryActivation() { return RESPIRATORY_ACTIVATION_FEE; }
  ambulance(tier: string, distanceKm: number) {
    const f = tier === "ALS" ? AMBULANCE_FEES.ALS : AMBULANCE_FEES.BLS;
    return f.base + f.perKm * distanceKm;
  }
  drug(drugCode: string) { return DRUG_PRICES.get(drugCode); }
}
