/**
 * Indonesian payer assignment (ADR-015 D5, Jasa Raharja rule of 2026-10-31).
 * Epic X M10.2: moved out of finance.ts behind IPayerAssigner; logic and rng
 * discipline unchanged (at most one PAYER_MIX draw; injury mechanism from a
 * dedicated per-patient sub-stream).
 */
import { subStreamRng, streamId } from "../clock.js";
import { getPrimaryDiagnosis } from "../diagnosis-utils.js";
import type { PayerType } from "../../patient/schema.js";
import type { IPayerAssigner, PayerPatientFacts } from "./contracts.js";

/**
 * Jasa Raharja eligibility: traffic accidents only (owner decision 2026-10-31).
 * Covers road-traffic victims and public-transport passengers (UU 33 & 34/1964).
 * The simulation records injuries, not causes, so a trauma injury gets a
 * mechanism: traffic with P_TRAFFIC_GIVEN_INJURY, drawn ONCE per patient from a
 * dedicated sub-stream keyed on (world seed, patient id). Burns, poisonings and
 * complications of care (T15-T98) are not traffic injuries.
 */
const TRANSPORT_ACCIDENT = /^V\d\d/;           // ICD-10 V01-V99: transport accidents
const TRAUMA_INJURY = /^(S\d\d|T0\d|T1[0-4])/; // S00-S99, T00-T14

/** Share of trauma injuries caused by traffic (Riskesdas; calibration target). */
export const P_TRAFFIC_GIVEN_INJURY = 0.45;

export type InjuryMechanism = "traffic" | "other";

/**
 * Mechanism of a patient's injury, or null when the code is not an injury.
 * An explicit `patient.injuryMechanism` wins; V codes are traffic by
 * definition; trauma codes draw once per (world seed, patient).
 */
export function injuryMechanism(
  patient: { id?: string; injuryMechanism?: InjuryMechanism },
  code: string,
  worldSeed?: number,
): InjuryMechanism | null {
  if (TRANSPORT_ACCIDENT.test(code)) return "traffic";
  if (!TRAUMA_INJURY.test(code)) return null;
  if (patient.injuryMechanism) return patient.injuryMechanism;
  if (worldSeed === undefined || patient.id === undefined) return "other";
  return subStreamRng(worldSeed, 0, streamId(`injury-mechanism:${patient.id}`))() < P_TRAFFIC_GIVEN_INJURY ? "traffic" : "other";
}

/**
 * ADR-015 D5 payer mix: BPJS Kesehatan 82%, BPJS Ketenagakerjaan 8% (billed
 * like BPJS Kesehatan in wave 1; JKK accident workflow deferred, D10),
 * Private Insurance 7%, Self-pay 3%. Non-WNI -> Self-pay and traffic injuries
 * -> Jasa Raharja are overrides with no roll.
 */
export const PAYER_MIX: [PayerType, number][] = [
  ["BPJS Kesehatan", 0.82],
  ["BPJS Ketenagakerjaan", 0.08],
  ["Private Insurance", 0.07],
  ["Self-pay", 0.03],
];

function rollPayerMix(rng: number): PayerType {
  // Bound check: last entry takes the remainder (guards float drift).
  for (const [payer, share] of PAYER_MIX) {
    if (rng < share) return payer;
    rng -= share;
  }
  return PAYER_MIX[PAYER_MIX.length - 1]![0];
}

export class IndonesiaPayerAssigner implements IPayerAssigner {
  config = { countryCode: "ID", currency: "IDR", displayName: "Indonesia (BPJS/INA-CBG)", currencyMinorUnits: 0 };

  payerMix(): [PayerType, number][] { return PAYER_MIX; }

  assign(patient: PayerPatientFacts, rngDraw?: () => number, worldSeed?: number): PayerType {
    if (patient.nationality && patient.nationality !== "WNI") return "Self-pay";
    const primaryDiag = getPrimaryDiagnosis(patient);
    if (primaryDiag && injuryMechanism(patient, primaryDiag.code, worldSeed) === "traffic") return "Jasa Raharja";
    if (rngDraw) return rollPayerMix(rngDraw());
    return "BPJS Kesehatan";
  }
}
