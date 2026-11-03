/**
 * ADR-015 D1/D7 — Item-level price lookups (Epic IX Phase 1).
 *
 * Epic X M10.4: the Indonesian tables moved to billing/indonesia-prices.ts and
 * every lookup now goes through the active IPriceBook (billing/registry.ts), so
 * a country adapter swaps the whole price list. A table miss falls back to the
 * active IChargePolicy flat rate (the old CHARGE_RATES behaviour for Indonesia).
 */
import { getChargePolicy, getPriceBook } from "./billing/registry.js";
import { PHARMACY_MARKUP } from "./billing/indonesia-charges.js";

export { PHARMACY_MARKUP };
export {
  DRUG_PRICES, LAB_PRICES, RAD_PRICES, SURGERY_PRICES, DIALYSIS_PRICES,
  RADIOTHERAPY_PRICES, ED_FEE_BY_ACUITY, SPECIALTY_CONSULT_FEES, RESPIRATORY_ACTIVATION_FEE,
} from "./billing/indonesia-prices.js";
export type { DialysisSessionType } from "./billing/indonesia-prices.js";

const fallback = (category: Parameters<ReturnType<typeof getChargePolicy>["baseRate"]>[0]) => getChargePolicy().baseRate(category);

export function labPrice(testCode: string): number {
  return getPriceBook().lab(testCode) ?? fallback("lab");
}

export function radiologyPrice(studyType: string): number {
  return getPriceBook().radiology(studyType) ?? fallback("radiology");
}

export function surgeryPrice(procedureCode: string): number {
  return getPriceBook().surgery(procedureCode) ?? fallback("surgery");
}

export function dialysisPrice(sessionType: string): number {
  return getPriceBook().dialysis(sessionType) ?? fallback("dialysis");
}

export function radiotherapyPrice(modality: string): number {
  return getPriceBook().radiotherapy(modality) ?? fallback("radiotherapy");
}

export function edFee(acuity: number): number {
  return getPriceBook().edFee(acuity) ?? fallback("emergency");
}

export function specialtyConsultFee(specialty: string): number {
  return getPriceBook().specialtyConsult(specialty) ?? fallback("consult");
}

export function respiratoryActivationFee(): number {
  return getPriceBook().respiratoryActivation();
}

export function ambulanceFee(tier: string, distanceKm: number): number {
  return getPriceBook().ambulance(tier, distanceKm);
}

/** Billed unit price of a drug code; flat pharmacy rate when it misses the formulary. */
export function drugPrice(drugCode: string): number {
  return getPriceBook().drug(drugCode) ?? fallback("pharmacy");
}
