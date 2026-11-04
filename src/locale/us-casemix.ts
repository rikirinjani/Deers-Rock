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
 * CALIBRATION PENDING: every weight is an unsourced placeholder. Calibrating
 * to HCUP / CDC NHAMCS volumes is M10.5c.
 */
import type { ICaseMix } from "./contracts.js";
import { ICD10_DIAGNOSES, type ICDMapping } from "../patient/icd-pool.js";

/** Endemic-only in the US: removed from the pool. */
export const US_EXCLUDED_CODES: readonly string[] = ["A91", "A01", "B50", "A27", "A82", "A95", "A30", "B86", "D55"];

/** Weight overrides (absent codes keep the engine weight). */
const US_WEIGHT: Record<string, number> = {
  I10: 16, E11: 14, I50: 7, J44: 6, N18: 5, I48: 5, I21: 4, I63: 4,
  J18: 6, J15: 6, N39: 7, A40: 3, A49: 3, K85: 3, S72: 4, R07: 8, R10: 8,
  F32: 5, U07: 3, J10: 4, J11: 3,
  I05: 1, I09: 1, I00: 1, A15: 1, T63: 1,
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
