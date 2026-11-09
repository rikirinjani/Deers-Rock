/**
 * US case mix (Epic X M10.5b, first slice): the disease pool for a US
 * hospital, built from the engine's existing ICD-10 categories (ICD-10-CM
 * shares the 3-character categories, so illness courses and protocols keyed
 * by category keep working).
 *
 * - Tropical / endemic-only diseases drop out of the pool (dengue, typhoid,
 *   malaria, leptospirosis, rabies exposure, chikungunya, leprosy, scabies,
 *   G6PD haemolysis). Rheumatic heart disease and TB stay at the minimum
 *   weight (imported / rare, not absent).
 * - Chronic and acute-care categories typical of US inpatient and ED volume
 *   (hypertension, diabetes, heart failure, COPD, CKD, AF, MI, stroke,
 *   sepsis, chest/abdominal pain) are weighted up; hip fracture is
 *   age-weighted towards the elderly.
 * - US-central categories the engine's pool lacks (alcohol and opioid use
 *   disorder, opioid overdose, obesity, alcoholic liver disease) are added
 *   below with illness groups, DRG families and protocols. Firearm injury
 *   is deferred (an external cause, not a diagnosis category).
 *
 * CALIBRATION: 18 HCUP groups fitted (see US_WEIGHT); the rest are unsourced placeholders. Calibrating
 * the remainder to HCUP / CDC NHAMCS volumes continues in M10.5c.
 */
import type { ICaseMix } from "./contracts.js";
import { ICD10_DIAGNOSES, type ICDMapping } from "../patient/icd-pool.js";

/** Endemic-only in the US: removed from the pool. */
export const US_EXCLUDED_CODES: readonly string[] = ["A91", "A01", "B50", "A27", "A82", "A95", "A30", "B86", "D55"];

/**
 * Weight overrides (absent codes keep the engine weight). Codes of the 18 modelled HCUP groups are FITTED (M10.5c):
 * `scripts/us-casemix-fit.ts` iterates one multiplier per group until the share of principal diagnoses in a
 * 40,000-patient US sample matches HCUP SB#277 (2018, docs/us-calibration-targets.md T-CASE-1); the fitted values
 * are rounded to 0.5. The other overrides below stay unsourced placeholders.
 */
const US_WEIGHT: Record<string, number> = {
  // placeholders (not in a fitted group)
  I10: 16, K85: 3, S72: 4, R07: 8, R10: 8, U07: 3, J10: 4, J11: 3,
  I05: 1, I09: 1, I00: 1, A15: 1, T63: 1,
  // fitted to HCUP 2018 principal-diagnosis shares
  A40: 7.5, A49: 7.5, I50: 22.5, M17: 22.5, J14: 1.5, J15: 4, J18: 4, E11: 9, I21: 14.5, I48: 8, I49: 5,
  J44: 9.5, J47: 3, N17: 3.5, N19: 3.5, I63: 12.5, L03: 5.5, F32: 7.5, N39: 5, J96: 5, F20: 6, I25: 7.5,
  K80: 7.5, E86: 4.5, N18: 5,
};

/**
 * US-central categories the Indonesian pool lacks. Each has an illness group
 * (or a no-acute-signature entry), an MS-DRG family and a protocol. Firearm
 * injury is not here: it is an external cause on top of an injury diagnosis,
 * which the engine cannot model yet.
 */
export const US_EXTRA_DIAGNOSES: readonly ICDMapping[] = [
  { code: "F10", name: "Alcohol use disorder", minAge: 18, maxAge: 80, genders: ["male", "female"], weight: 6 },
  { code: "F11", name: "Opioid use disorder", minAge: 15, maxAge: 70, genders: ["male", "female"], weight: 3 },
  { code: "T40", name: "Opioid overdose", minAge: 15, maxAge: 70, genders: ["male", "female"], weight: 2 },
  { code: "E66", name: "Obesity", minAge: 18, maxAge: 80, genders: ["male", "female"], weight: 6 },
  { code: "K70", name: "Alcoholic liver disease", minAge: 25, maxAge: 80, genders: ["male", "female"], weight: 2 },
];

export const US_DIAGNOSES: readonly ICDMapping[] = ICD10_DIAGNOSES
  .filter(d => !US_EXCLUDED_CODES.includes(d.code))
  .map(d => (US_WEIGHT[d.code] !== undefined ? { ...d, weight: US_WEIGHT[d.code]! } : d))
  .concat(US_EXTRA_DIAGNOSES);

export class USCaseMix implements ICaseMix {
  config = { countryCode: "US", displayName: "United States" };
  diagnoses = US_DIAGNOSES;
  /** Hip fracture skews elderly in the US; nothing else is age-scaled yet. */
  ageWeight(code: string, age: number): number {
    return code === "S72" ? (age >= 65 ? 4 : 0.5) : 1;
  }
}
