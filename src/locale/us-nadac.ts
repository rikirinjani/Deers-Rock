/**
 * US drug acquisition cost from CMS NADAC (National Average Drug Acquisition Cost). Epic X M10.5c, pilot.
 *
 * Source: CMS, NADAC 2026 dataset, data.medicaid.gov (identifier fbb83258-11c7-47f5-8b18-5f8e79f7e704),
 * rates with as_of_date 2026-11-04, retrieved 2026-11-09 through the datastore query API
 * (docs/us-calibration-targets.md T-DRUG-1). NADAC is the average invoice price a retail pharmacy pays
 * per pricing unit; it excludes dispensing fees, hospital markup and rebates. The rate is the same for
 * every NDC of one description, so a description identifies one number.
 *
 * Pilot scope: ten oral solids priced per tablet or capsule (pricing unit EA). Every other drug still
 * uses the derived placeholder in us-prices.ts. The mapping to the simulator's drug is by name and
 * strength; where the strengths differ (aspirin 80 mg vs 81 mg) the nearest NADAC entry is used.
 *
 * Deterministic constants: no RNG, no clock.
 */
export interface NadacEntry {
  /** Engine drug code */
  code: string;
  /** NADAC `ndc_description` the rate was read from */
  ndcDescription: string;
  /** USD per pricing unit (NADAC `nadac_per_unit`) */
  perUnitUsd: number;
  /** NADAC pricing unit */
  unit: "EA";
  /** NADAC `as_of_date` */
  asOf: string;
}

const entry = (code: string, ndcDescription: string, perUnitUsd: number): NadacEntry =>
  ({ code, ndcDescription, perUnitUsd, unit: "EA", asOf: "2026-11-04" });

export const US_NADAC: readonly NadacEntry[] = [
  entry("MET", "METFORMIN HCL 500 MG TABLET", 0.01483),
  entry("ATR", "ATORVASTATIN 20 MG TABLET", 0.02858),
  entry("OMP", "OMEPRAZOLE DR 20 MG CAPSULE", 0.03045),
  entry("PRC", "ACETAMINOPHEN 500 MG TABLET", 0.03448),
  entry("AMX", "AMOXICILLIN 500 MG CAPSULE", 0.07925),
  entry("CIP", "CIPROFLOXACIN HCL 500 MG TAB", 0.12065),
  entry("AML", "AMLODIPINE BESYLATE 5 MG TAB", 0.01015),
  entry("ASP", "ASPIRIN 81 MG CHEWABLE TABLET", 0.02528),
  entry("LOS", "LOSARTAN POTASSIUM 50 MG TAB", 0.03316),
  entry("SIM", "SIMVASTATIN 20 MG TABLET", 0.03245),
];

export const US_NADAC_BY_CODE: ReadonlyMap<string, NadacEntry> = new Map(US_NADAC.map(e => [e.code, e]));
