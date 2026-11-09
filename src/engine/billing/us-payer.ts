/**
 * US payer assignment (ADR-027). Epic X M10.3.
 *
 * Medicare is age-driven (65+), so it takes no roll. Everyone else rolls the
 * under-65 mix ONCE (ADR-015 D8 draw discipline): the draw count is a pure
 * function of the patient (0 at 65+, otherwise 1 when an rng is supplied).
 *
 * CALIBRATED (M10.5c, docs/us-calibration-targets.md T-PAY-3): the under-65 mix is derived from the
 * Census Bureau 2024 coverage table (below). The mix is the PRIMARY payer of the population, so the
 * hospital-stay mix (HCUP T-PAY-1, a validation target) emerges from age and is not tuned. Medicare
 * disability and ESRD eligibility below 65, CHIP/Medicaid for children, and the 1 % uninsured aged 65+
 * are not modelled.
 */
import type { PayerType } from "../../patient/schema.js";
import type { IPayerAssigner, PayerPatientFacts } from "./contracts.js";

/**
 * Census Bureau, Health Insurance Coverage in the United States: 2024 (P60-288), Table A-1, "Under 65 years",
 * percent of people (CPS ASEC, 2024): private coverage (employer, direct purchase or TRICARE) 70.9,
 * public 22.4, uninsured 9.6, any coverage 90.4. TRICARE 2.8 % and VA/CHAMPVA 1.2 % of all ages: report text
 * (no under-65 split published there). Coverage types overlap, so this is a primary-payer partition:
 * private first, then the rest of the insured are public-only (Medicaid and VA), then uninsured.
 */
export const CENSUS_2024_UNDER_65 = { privateIncludingTricare: 70.9, anyCoverage: 90.4, uninsured: 9.6, tricareAllAges: 2.8, vaAllAges: 1.2 } as const;

const C = CENSUS_2024_UNDER_65;
const pct = (x: number) => Math.round(x * 10) / 1000;

export const US_PAYER_MIX_UNDER_65: [PayerType, number][] = [
  ["Private Insurance", pct(C.privateIncludingTricare - C.tricareAllAges)],
  ["Medicaid", pct(C.anyCoverage - C.privateIncludingTricare - C.vaAllAges)],
  ["Self-pay", pct(C.uninsured)],
  ["TRICARE", pct(C.tricareAllAges)],
  ["VA", pct(C.vaAllAges)],
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
