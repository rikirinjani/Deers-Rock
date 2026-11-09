/**
 * US charge policy and chargemaster price list (USD). Epic X M10.4.
 *
 * Chargemaster = the hospital's gross list prices, which are what claims are
 * billed at; payers then pay the MS-DRG amount (us-drg.ts), not the charges.
 * US gross charges run several times Medicare payment, so these are set at
 * "list price" scale.
 *
 * CALIBRATION PENDING: every number is an unsourced placeholder. M10.5c
 * replaces them with sourced targets (CMS Hospital Price Transparency files,
 * HCUP cost-to-charge ratios). The drug list reuses the engine's drug codes
 * (derived from the Indonesian acquisition cost, converted to USD) because the
 * clinical protocols are keyed to them; the real FDA formulary arrives with
 * the US clinical content in M10.5b.
 */
import type { ChargeCategory, RoomClass } from "../../patient/schema.js";
import { DRUG_CATALOG, findDrug } from "../drug-catalog.js";
import { US_NADAC_BY_CODE } from "../../locale/us-nadac.js";
import type { IChargePolicy, IPriceBook } from "./contracts.js";

const CONFIG = { countryCode: "US", currency: "USD", displayName: "United States (Medicare/MS-DRG)", currencyMinorUnits: 2 };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Flat fallbacks used when an item misses the price list. */
export const US_CHARGE_RATES: Record<ChargeCategory, number> = {
  lab: 90, radiology: 900, pharmacy: 150, surgery: 25_000,
  room: 2_500, consult: 350, emergency: 2_000, respiratory: 250, supply: 120,
  administration: 0, dialysis: 1_200, radiotherapy: 1_500, ambulance: 1_200,
};

/** Maps the engine's room classes onto US accommodation tiers (ward = 1.0). */
export const US_ROOM_CLASS_MULTIPLIER: Record<RoomClass, number> = {
  vvip: 2.5, vip: 2, "kelas-1": 1.5, "kelas-2": 1.2, "kelas-3": 1,
  icu: 2.5, hcu: 1.6, nicu: 3, picu: 3,
};

/**
 * National average cost-to-charge ratio of the "Drugs and Cellular Therapies" cost center, FY 2026 IPPS final rule
 * (CMS-1833-F, 19 national average CCRs from the March 2025 update of FY 2023 HCRIS cost reports; docs/us-calibration-targets.md
 * T-PRICE-1). CCR = cost / charges, so charges are cost / CCR. Cost here is the pharmacy department's total cost, which is
 * at least the acquisition cost, so the markup over acquisition is a lower bound on the real chargemaster markup.
 */
export const US_DRUGS_CCR = 0.177;
/** Billed drug price = acquisition cost x chargemaster markup (1 / CCR, about 5.65). */
export const US_PHARMACY_MARKUP = 1 / US_DRUGS_CCR;
/** Placeholder: US acquisition cost as a multiple of the Indonesian e-catalogue cost. */
export const US_ACQUISITION_FACTOR = 4;
export const IDR_PER_USD = 16_000;

export class USChargePolicy implements IChargePolicy {
  config = CONFIG;
  baseRate(category: string): number { return US_CHARGE_RATES[category as ChargeCategory]; }
  roomClassMultiplier(roomClass: string): number { return US_ROOM_CLASS_MULTIPLIER[roomClass as RoomClass] ?? 1; }
  drugMarkup(): number { return US_PHARMACY_MARKUP; }
}

export const US_LAB_PRICES: Record<string, number> = {
  CBC: 60, BMP: 90, TROP: 150, CRP: 85, "PT-INR": 70, LFT: 120, UA: 50, HBA1C: 90,
};

export const US_RAD_PRICES: Record<string, number> = {
  "Chest X-ray PA & Lateral": 450,
  "Extremity X-ray Left Ankle": 400,
  "Abdominal Ultrasound": 900,
  "CT Head without contrast": 2_800,
  "CT Abdomen with contrast": 3_500,
  "MRI Lumbar Spine without contrast": 4_500,
};

/** Keyed by the engine's procedure ids (no CPT descriptors are shipped; see ADR-027 Amendment 1). */
export const US_SURGERY_PRICES: Record<string, number> = {
  "47562": 28_000, "44970": 24_000, "49505": 18_000, "27130": 55_000, "27447": 55_000,
  "44140": 45_000, "43239": 6_500, "45380": 6_500, "38500": 7_500, "19120": 12_000,
};

export const US_DIALYSIS_PRICES: Record<string, number> = { hd: 1_200, hdf: 1_500, pd: 900 };

export const US_RADIOTHERAPY_PRICES: Record<string, number> = {
  external_beam: 1_200, imrt: 2_500, brachytherapy: 3_000, stereotactic: 4_000, electron: 1_300,
};

/** ED facility fee by acuity (ESI 1 highest). */
export const US_ED_FEE_BY_ACUITY: Record<number, number> = { 1: 3_500, 2: 2_800, 3: 2_000, 4: 1_200, 5: 800 };

export const US_SPECIALTY_CONSULT_FEES: Record<string, number> = {
  cardiology: 450, neurology: 400, ophthalmology: 300, ent: 300, dermatology: 300, psychiatry: 350,
  pediatrics: 300, obgyn: 400, pulmonology: 400, rehab_medik: 350, anesthesiology: 450, dentistry: 300,
  hemodialysis: 400, endoscopy: 600, pathology_anatomy: 300, forensic: 400, internal_medicine: 350,
  surgery: 500, emergency: 400,
};

export const US_RESPIRATORY_ACTIVATION_FEE = 250;

/** Ground ambulance: base + per-km mileage (placeholder). */
export const US_AMBULANCE_FEES = { BLS: { base: 1_200, perKm: 15 }, ALS: { base: 2_000, perKm: 20 } } as const;

/** code -> USD billed price, computed once at module load. */
/**
 * Billed unit price. Drugs with a CMS NADAC rate (locale/us-nadac.ts, M10.5c pilot) use the real acquisition cost
 * x US_PHARMACY_MARKUP (the markup itself is still an unsourced placeholder); the rest keep the placeholder derived
 * from the Indonesian cost. Prices stay in whole cents (the price-book invariant), so a one-tablet generic bills at
 * a few cents; the 3x markup is the unsourced part (US chargemaster markups on generics are far higher).
 */
export const US_DRUG_PRICES: ReadonlyMap<string, number> = new Map(
  DRUG_CATALOG.map(d => {
    const nadac = US_NADAC_BY_CODE.get(d.code);
    return [d.code, nadac
      ? round2(nadac.perUnitUsd * US_PHARMACY_MARKUP)
      : round2((d.costIdr / IDR_PER_USD) * US_ACQUISITION_FACTOR * US_PHARMACY_MARKUP)] as [string, number];
  }),
);

export class USPriceBook implements IPriceBook {
  config = CONFIG;
  lab(testCode: string) { return US_LAB_PRICES[testCode]; }
  radiology(studyType: string) { return US_RAD_PRICES[studyType]; }
  surgery(procedureCode: string) { return US_SURGERY_PRICES[procedureCode]; }
  dialysis(sessionType: string) { return US_DIALYSIS_PRICES[sessionType]; }
  radiotherapy(modality: string) { return US_RADIOTHERAPY_PRICES[modality]; }
  edFee(acuity: number) { return US_ED_FEE_BY_ACUITY[acuity]; }
  specialtyConsult(specialty: string) { return US_SPECIALTY_CONSULT_FEES[specialty]; }
  respiratoryActivation() { return US_RESPIRATORY_ACTIVATION_FEE; }
  ambulance(tier: string, distanceKm: number) {
    const f = tier === "ALS" ? US_AMBULANCE_FEES.ALS : US_AMBULANCE_FEES.BLS;
    return round2(f.base + f.perKm * distanceKm);
  }
  drug(drugCode: string) {
    const base = US_DRUG_PRICES.get(drugCode);
    if (base !== undefined) return base;
    const cost = findDrug(drugCode)?.costUsd;   // US-only extension drugs price from USD acquisition cost
    return cost === undefined ? undefined : round2(cost * US_PHARMACY_MARKUP);
  }
}
