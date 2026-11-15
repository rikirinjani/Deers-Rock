/**
 * US inpatient stay outcomes (Epic X M10.5c step E): length of stay and in-hospital death by principal diagnosis.
 *
 * Source: HCUP National Inpatient Sample 2023 by CCSR category (src/locale/us-hcup-ccsr.ts, docs/us-calibration-targets.md
 * T-LOS-1 and T-LOS-2). The engine's 3-character ICD-10 categories are mapped to CCSR categories by hand below
 * (MY MAPPING, for Research OC review; CCSR is defined on full ICD-10-CM codes, so a 3-character category can span
 * several CCSR categories and the nearest one is used).
 *
 * Length of stay: the engine draws one uniform u per admission; the US stay is the group mean x (0.6 + 0.8u), the same
 * +-40 % spread as the default 3-7 day stay around its 5 day mean. The shape is NOT calibrated (real stays are right
 * skewed); only the mean per diagnosis is sourced.
 *
 * Death: the HCUP group rate scaled by the patient's engine risk-tier probability relative to the mean tier probability
 * of that diagnosis in a US world (us-tier-mix.ts, measured, shrunk toward the global mean for rare diagnoses), so a
 * diagnosis averages its HCUP rate while sicker patients (age, vitals, critical diagnosis) die more often, capped at 0.95.
 * HCUPnet suppresses death rates under 11 deaths or high relative error; those groups use 0 (deaths negligible), an
 * assumption. Unmapped codes keep the engine's tier probability.
 *
 * Deterministic constants: no RNG, no clock.
 */
import type { IStayOutcomes } from "./contracts.js";
import { US_HCUP_CCSR_2023 } from "./us-hcup-ccsr.js";
import { US_TIER_BY_ICD, US_TIER_GLOBAL } from "./us-tier-mix.js";

/** All-stay national mean length of stay 2023 (HCUPnet overall, docs T-LOS-1); used for unmapped codes. */
export const US_MEAN_LOS_DAYS_2023 = 5.1;

/** Engine ICD-10 category -> CCSR category (nearest; approximate for categories that span several). */
export const US_ICD_TO_CCSR: Readonly<Record<string, string>> = {
  I10: "CIR007", E11: "END003", J15: "RSP002", J14: "RSP002", J18: "RSP002", N39: "GEN004", J45: "RSP009", K29: "DIG007",
  I50: "CIR019", A09: "DIG001", E78: "END010", N18: "GEN003", J44: "RSP008", G40: "NVS009", M17: "MUS006", F32: "MBD002",
  O80: "PRG029", O20: "PRG009", N20: "GEN005", I21: "CIR009", S72: "INJ006", P07: "PNL002", H66: "EAR001", J20: "RSP005",
  K35: "DIG009", N40: "GEN012", C50: "NEO030", C61: "NEO039", D25: "NEO073", K80: "DIG017", M81: "MUS013", E05: "END001",
  I63: "CIR020", A15: "INF001", B20: "INF006", L03: "SKN001", S06: "INJ008", T14: "INJ027", E86: "END011", D64: "BLD001",
  T20: "INJ019", T63: "INJ021", P36: "PNL009", I05: "CIR001", U07: "INF012", A37: "INF003", A40: "INF002", A41: "INF002", A49: "INF002",
  A39: "INF003", B18: "INF007", B19: "INF007", C34: "NEO022", C16: "NEO013", C22: "NEO017", C18: "NEO015", C53: "NEO032",
  C70: "NEO050", C91: "NEO059", C85: "NEO058", C67: "NEO043", D69: "BLD006", D57: "BLD005", E03: "END001", E04: "END001",
  E20: "END015", E24: "END015", E27: "END015", E21: "END015", F31: "MBD003", F20: "MBD001", F90: "MBD014", F43: "MBD007",
  F42: "MBD006", F00: "NVS011", F06: "NVS011", G43: "NVS010", G58: "NVS015", G61: "NVS017", H25: "EYE002", H10: "EYE001",
  H81: "EAR003", I60: "CIR021", I70: "CIR026", I48: "CIR017", I09: "CIR001", I25: "CIR011", J47: "RSP008", J90: "RSP011",
  R23: "SYM017", K21: "DIG004", K64: "DIG014", K85: "DIG020", K74: "DIG019", K56: "DIG012", K26: "DIG005", M75: "MUS009",
  G56: "NVS017", N17: "GEN002", N19: "GEN002", N41: "GEN013", N10: "GEN004", O14: "PRG020", O15: "PRG020", P10: "PNL008",
  P58: "PNL007", Q36: "MAL006", Q37: "MAL006", S22: "INJ003", S62: "INJ004", T39: "INJ022", T81: "INJ037", R50: "SYM002",
  R07: "CIR012", R55: "SYM001", R70: "SYM017", I73: "CIR026", I80: "CIR033", I82: "CIR033", I11: "CIR008", I12: "CIR008",
  I00: "CIR002", I33: "CIR004", I30: "CIR006", I49: "CIR017", I42: "CIR005", I26: "CIR013", I77: "CIR026", J06: "RSP006",
  J10: "RSP003", J11: "RSP003", J96: "RSP012", J91: "RSP011", R31: "GEN009", R10: "SYM006", R51: "NVS010",
  F10: "MBD017", F11: "MBD018", T40: "INJ022", E66: "END009", K70: "DIG019",
};

function cat(icd: string) {
  const code = US_ICD_TO_CCSR[icd.slice(0, 3)];
  return code === undefined ? undefined : US_HCUP_CCSR_2023[code];
}

/** Mean length of stay in days for a principal diagnosis; undefined when unmapped or suppressed. */
export function usMeanLosDays(icd: string): number | undefined {
  return cat(icd)?.los ?? undefined;
}

/** In-hospital death probability (0-1) for a principal diagnosis; undefined when unmapped. Suppressed rates are 0. */
export function usDeathRate(icd: string): number | undefined {
  const c = cat(icd);
  return c === undefined ? undefined : (c.deathPct ?? 0) / 100;
}

/** Shrinkage weight (discharges) pulling a diagnosis's measured mean tier probability toward the all-diagnosis mean. */
const TIER_SHRINK_N = 20;
const MAX_DEATH_PROBABILITY = 0.95;

/** Mean engine risk-tier death probability for a diagnosis in a US world (measured, shrunk toward the global mean). */
export function usMeanTierProbability(icd: string): number {
  const m = US_TIER_BY_ICD[icd.slice(0, 3)];
  const n = m?.[0] ?? 0, mean = m?.[1] ?? US_TIER_GLOBAL.mean;
  return (n * mean + TIER_SHRINK_N * US_TIER_GLOBAL.mean) / (n + TIER_SHRINK_N);
}

export class USStayOutcomes implements IStayOutcomes {
  config = { countryCode: "US", displayName: "United States" };

  dischargeDelayMinutes(icd: string, u: number): number {
    const mean = usMeanLosDays(icd) ?? US_MEAN_LOS_DAYS_2023;
    return Math.max(60, Math.round(mean * 1440 * (0.6 + 0.8 * u)));
  }

  deathProbability(icd: string, tierProbability: number, _risk: "low" | "moderate" | "high"): number {
    const rate = usDeathRate(icd);
    if (rate === undefined) return tierProbability;
    return Math.min(MAX_DEATH_PROBABILITY, rate * tierProbability / usMeanTierProbability(icd));
  }
}
