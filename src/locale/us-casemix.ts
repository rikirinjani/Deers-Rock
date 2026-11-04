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
 * - Categories absent from the pool but central to US practice (opioid
 *   overdose, alcohol use disorder, obesity, firearm injury) need illness
 *   groups and protocols first: deferred to the next 10.5b slice.
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

export const US_DIAGNOSES: readonly ICDMapping[] = ICD10_DIAGNOSES
  .filter(d => !US_EXCLUDED_CODES.includes(d.code))
  .map(d => (US_WEIGHT[d.code] !== undefined ? { ...d, weight: US_WEIGHT[d.code]! } : d));

export class USCaseMix implements ICaseMix {
  config = { countryCode: "US", displayName: "United States" };
  diagnoses = US_DIAGNOSES;
  /** Hip fracture skews elderly in the US; nothing else is age-scaled yet. */
  ageWeight(code: string, age: number): number {
    return code === "S72" ? (age >= 65 ? 4 : 0.5) : 1;
  }
}
