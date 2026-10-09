/**
 * State Invariant Validator — ADR-020
 *
 * Runtime validation of critical invariants across the simulation state.
 * Called periodically (every 100 ticks) in debug builds, and in all tests.
 *
 * Invariants enforced:
 * 1. morgueId consistency: deceased patients have non-null morgueId, living have null
 * 2. Encounter-patient linkage: every encounter references a valid patient
 * 3. Bed-patient consistency: occupied beds reference valid patients
 * 4. Discharge consistency: discharged encounters have endTime set
 * 5. Charge-encounter linkage: every charge references a valid encounter
 */
import type { HospitalState } from "./state-store.js";
import { logInvariantViolation } from "./config.js";

export interface InvariantViolation {
  invariant: string;
  entity: string;
  detail: string;
}

export interface InvariantReport {
  pass: boolean;
  violations: InvariantViolation[];
  totals: {
    patients: number;
    encounters: number;
    beds: number;
    charges: number;
    morgue: number;
  };
}

/** Check all invariants and return report */
export function validateInvariants(state: HospitalState): InvariantReport {
  const violations: InvariantViolation[] = [];
  const patients = Array.from(state.patients.values());
  const encounters = Array.from(state.encounters.values());
  const beds = Array.from(state.beds.values());
  const charges = Array.from(state.charges.values());

  const totals = {
    patients: patients.length,
    encounters: encounters.length,
    beds: beds.length,
    charges: charges.length,
    morgue: state.morgue.length,
  };

  // ── I1: morgueId consistency ───────────────────────────────────────────────
  for (const p of patients) {
    const isDeceased = state.morgue.some(m => m.patientId === p.id);
    if (isDeceased && p.morgueId === null) {
      violations.push({
        invariant: "morgueId_consistency",
        entity: `Patient ${p.id}`,
        detail: "Patient in morgue but morgueId is null",
      });
    }
    if (!isDeceased && p.morgueId !== null) {
      violations.push({
        invariant: "morgueId_consistency",
        entity: `Patient ${p.id}`,
        detail: `Patient has morgueId="${p.morgueId}" but not in morgue`,
      });
    }
  }

  // ── I2: Encounter-patient linkage ──────────────────────────────────────────
  const patientIds = new Set(patients.map(p => p.id));
  for (const enc of encounters) {
    if (!patientIds.has(enc.patientId)) {
      violations.push({
        invariant: "encounter_patient_link",
        entity: `Encounter ${enc.id}`,
        detail: `References non-existent patient ${enc.patientId}`,
      });
    }
  }

  // ── I3: Bed-patient consistency ────────────────────────────────────────────
  for (const bed of beds) {
    if (bed.patientId !== null && !patientIds.has(bed.patientId)) {
      violations.push({
        invariant: "bed_patient_link",
        entity: `Bed ${bed.id}`,
        detail: `Occupied by non-existent patient ${bed.patientId}`,
      });
    }
  }

  // ── I4: Discharge consistency ──────────────────────────────────────────────
  // Note: ED/outpatient encounters may have endTime set while still "active"
  // (e.g., after treatment but before formal discharge). Only flag inpatients.
  for (const enc of encounters) {
    if (enc.type === "inpatient") {
      if (enc.status === "discharged" && enc.endTime === null) {
        violations.push({
          invariant: "discharge_endTime",
          entity: `Encounter ${enc.id}`,
          detail: "Discharged inpatient but endTime is null",
        });
      }
      if (enc.status === "active" && enc.endTime !== null) {
        violations.push({
          invariant: "discharge_endTime",
          entity: `Encounter ${enc.id}`,
          detail: "Active inpatient but has endTime set",
        });
      }
    }
  }

  // ── I5: Charge-encounter linkage ───────────────────────────────────────────
  const encounterIds = new Set(encounters.map(e => e.id));
  for (const chg of charges) {
    if (!encounterIds.has(chg.encounterId)) {
      violations.push({
        invariant: "charge_encounter_link",
        entity: `Charge ${chg.id}`,
        detail: `References non-existent encounter ${chg.encounterId}`,
      });
    }
  }

  return {
    pass: violations.length === 0,
    violations,
    totals,
  };
}

/** Assert invariants — throws on failure (for tests) */
export function assertInvariants(state: HospitalState, label = "state"): void {
  const report = validateInvariants(state);
  if (!report.pass) {
    const lines = report.violations.map(v =>
      `  [${v.invariant}] ${v.entity}: ${v.detail}`
    );
    throw new Error(
      `Invariant violation in ${label} (${lines.length} issues):\n${lines.join("\n")}`
    );
  }
}

/** Log invariants (for debug builds) — uses audit log + optional fail-fast */
export function logInvariants(state: HospitalState, label = "state", tick?: number): void {
  const report = validateInvariants(state);
  if (!report.pass) {
    for (const v of report.violations) {
      logInvariantViolation({ ...v, tick });
    }
  }
}
