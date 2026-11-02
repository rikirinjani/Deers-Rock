/**
 * US payer assignment (ADR-027). Epic X M10.3.
 *
 * Medicare is age-driven (65+), so it takes no roll. Everyone else rolls the
 * under-65 mix ONCE (ADR-015 D8 draw discipline): the draw count is a pure
 * function of the patient (0 at 65+, otherwise 1 when an rng is supplied).
 *
 * CALIBRATION PENDING (Research OC, M10.5c): shares are the ADR-027 2024
 * hospital benchmarks renormalised for under-65 patients. Medicare disability
 * and ESRD eligibility below 65, and CHIP/Medicaid for children, are not
 * modelled yet.
 */
import type { PayerType } from "../../patient/schema.js";
import type { IPayerAssigner, PayerPatientFacts } from "./contracts.js";

export const US_PAYER_MIX_UNDER_65: [PayerType, number][] = [
  ["Private Insurance", 0.60],
  ["Medicaid", 0.25],
  ["Self-pay", 0.09],
  ["TRICARE", 0.04],
  ["VA", 0.02],
];

export const MEDICARE_AGE = 65;

export class USPayerAssigner implements IPayerAssigner {
  config = { countryCode: "US", currency: "USD", displayName: "United States (Medicare/MS-DRG)", currencyMinorUnits: 2 };

  payerMix(): [PayerType, number][] {
    return [["Medicare", 0], ...US_PAYER_MIX_UNDER_65];
  }

  assign(patient: PayerPatientFacts, rngDraw?: () => number): PayerType {
    if ((patient.age ?? 0) >= MEDICARE_AGE) return "Medicare";
    if (!rngDraw) return "Private Insurance";
    let r = rngDraw();
    for (const [payer, share] of US_PAYER_MIX_UNDER_65) {
      if (r < share) return payer;
      r -= share;
    }
    return US_PAYER_MIX_UNDER_65[US_PAYER_MIX_UNDER_65.length - 1]![0];
  }
}
