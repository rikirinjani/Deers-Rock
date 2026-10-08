/**
 * Diagnosis selection utility — shared between markov.ts and finance.ts
 * Avoids circular dependency by extracting the common logic.
 */
import type { Patient } from "../patient/schema.js";

/**
 * Select primary diagnosis code using priority-based selection (ADR-021).
 * Lower priority number = higher importance. Ties broken by ICD code alphabetically.
 */
export function selectPrimaryDiagnosisCode(patient: Patient | undefined): string {
  if (!patient) return "UNKNOWN";
  const activeDx = patient.diagnoses.filter(d => d.active);
  if (activeDx.length === 0) {
    const fallback = patient.diagnoses[0];
    return fallback ? fallback.code : "UNKNOWN";
  }
  // Sort by priority (default 99 if not set), then by code for determinism
  activeDx.sort((a, b) => {
    const pa = a.priority ?? 99;
    const pb = b.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
  return activeDx[0]!.code;
}

/**
 * Get the primary diagnosis object (for finance/payer logic).
 * Accepts partial patient objects (only needs diagnoses + identity).
 */
export function getPrimaryDiagnosis(patient: { diagnoses: { code: string; name?: string; active: boolean; priority?: number }[] } | undefined): { code: string; name: string } | null {
  if (!patient) return null;
  const activeDx = patient.diagnoses.filter(d => d.active);
  if (activeDx.length === 0) {
    const fallback = patient.diagnoses[0];
    return fallback ? { code: fallback.code, name: fallback.name ?? fallback.code } : null;
  }
  activeDx.sort((a, b) => {
    const pa = a.priority ?? 99;
    const pb = b.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
  const primary = activeDx[0]!;
  return { code: primary.code, name: primary.name ?? primary.code };
}
