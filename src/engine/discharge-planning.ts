/**
 * Discharge Planning with Rujuk Balik — Epic VI M6.2 (ADR-017)
 *
 * When patients are discharged, chronic-condition patients are referred back
 * to a Puskesmas for follow-up care, completing the Indonesian referral chain.
 */
import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { EventQueue } from "./event-queue.js";
import type { Encounter } from "../patient/schema.js";

/**
 * ICD-10 codes that warrant follow-up at a Puskesmas (chronic conditions).
 * Based on Indonesian Ministry of Health chronic disease program.
 */
const CHRONIC_ICDS = new Set([
  // Hypertension
  "I10", "I11", "I12", "I15",
  // Diabetes
  "E10", "E11", "E12", "E13", "E14",
  // Asthma/COPD
  "J45", "J44", "J21", "J20",
  // Coronary disease
  "I20", "I21", "I25",
  // Heart failure
  "I50",
  // Stroke
  "I60", "I61", "I63", "I64",
  // Renal disease
  "N18", "N19", "N03",
  // Epilepsy
  "G40",
  // Mental health
  "F32", "F33", "F41", "F46",
  // Cancer (post-treatment follow-up)
  "C34", "C50", "C18", "C19", "C20",
]);

/**
 * Puskesmas facilities available for rujuk balik.
 * In production this would come from _referralState.facilities.
 */
const PUSKESMAS_FACILITIES = [
  { id: "PUSK-MKK-01", name: "Puskesmas Makassar Pusat", provinceCode: 73, regencyCode: 71 },
  { id: "PUSK-MKK-02", name: "Puskesmas Mariso", provinceCode: 73, regencyCode: 71 },
  { id: "PUSK-MKK-03", name: "Puskesmas Biringkanaya", provinceCode: 73, regencyCode: 71 },
  { id: "PUSK-SUL-01", name: "Puskesmas Palopo", provinceCode: 73, regencyCode: 72 },
  { id: "PUSK-SUL-02", name: "Puskesmas Watampone", provinceCode: 73, regencyCode: 73 },
];

export interface DischargePlan {
  encounterId: string;
  patientId: string;
  targetFacilityId: string;
  targetFacilityName: string;
  reason: string;
  scheduledTick: number;
  status: "scheduled" | "attended" | "missed" | "cancelled";
}

let counter = 0;

/**
 * Determine if a discharge warrants rujuk balik.
 */
export function requiresFollowUp(encounter: Encounter): boolean {
  const dx = encounter.primaryDiagnosis;
  if (!dx) return false;
  const prefix = dx.substring(0, 3);
  return CHRONIC_ICDS.has(prefix);
}

/**
 * Record a discharge plan for rujuk balik.
 * Returns the plan ID if created, null if no follow-up needed.
 */
export function recordDischargePlan(
  state: HospitalState,
  encounter: Encounter,
  clockTick: number
): string | null {
  if (!requiresFollowUp(encounter)) return null;

  // Get state's discharge plans map
  const plans = getDischargePlans(state);

  // Check if already planned
  for (const plan of plans.values()) {
    if (plan.encounterId === encounter.id) return null;
  }

  // Select nearest Puskesmas (simplified: random from available)
  const facility = PUSKESMAS_FACILITIES[Math.floor(Math.random() * PUSKESMAS_FACILITIES.length)];

  // Schedule follow-up in 7-14 days (10080-20160 ticks)
  const followUpTicks = 10080 + Math.floor(clockTick % 10080);

  counter++;
  const planId = `DP-${String(counter).padStart(4, "0")}`;
  const reason = getFollowUpReason(encounter.primaryDiagnosis ?? "UNKNOWN");

  plans.set(planId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    targetFacilityId: facility.id,
    targetFacilityName: facility.name,
    reason,
    scheduledTick: clockTick + followUpTicks,
    status: "scheduled",
  });

  return planId;
}

/**
 * Check if a discharge plan's follow-up time has arrived.
 * Returns plans that are due.
 */
export function getDueFollowUps(state: HospitalState, clockTick: number): DischargePlan[] {
  const plans = getDischargePlans(state);
  return Array.from(plans.values())
    .filter(p => p.status === "scheduled" && p.scheduledTick <= clockTick);
}

/**
 * Mark a follow-up as attended or missed.
 */
export function updateFollowUpStatus(
  state: HospitalState,
  planId: string,
  status: "attended" | "missed"
): void {
  const plans = getDischargePlans(state);
  const plan = plans.get(planId);
  if (plan) {
    plan.status = status;
  }
}

/**
 * Get all discharge plans (for API/reporting).
 */
export function getDischargePlans(state: HospitalState): Map<string, DischargePlan> {
  return (state as unknown as { _dischargePlans?: Map<string, DischargePlan> })._dischargePlans ?? new Map();
}

/**
 * Get discharge plan count by status.
 */
export function getFollowUpStats(state: HospitalState): Record<string, number> {
  const plans = getDischargePlans(state);
  const stats = { scheduled: 0, attended: 0, missed: 0, cancelled: 0 };
  for (const p of plans.values()) {
    stats[p.status]++;
  }
  return stats;
}

function getFollowUpReason(icd: string): string {
  const reasons: Record<string, string> = {
    "I10": "Hipertensi — kontrol tekanan darah rutin",
    "E11": "Diabetes tipe 2 — kontrol gula darah",
    "J45": "Asma — evaluasi inhaler dan kontrol pernapasan",
    "I50": "Gagal jantung — monitor berat badan dan edema",
    "I63": "Stroke iskemik — rehabilitasi lanjutan",
    "N18": "Penyakit ginjal kronis — monitoring fungsi ginjal",
  };
  const prefix = icd.substring(0, 3);
  return reasons[prefix] ?? `Follow-up untuk ${prefix} — kontrol rutin di Puskesmas`;
}

/**
 * Tick handler: check for due follow-ups and resolve them.
 */
export function dischargePlanningHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const duePlans = getDueFollowUps(state, clock.tick);
  if (duePlans.length === 0) return state;

  const plans = getDischargePlans(state);
  for (const plan of duePlans) {
    // Simulate: 80% attend, 20% miss (based on Indonesian rural health stats)
    const attended = clock.rng() > 0.2;
    // Find and update the plan
    let found = false;
    for (const [id, p] of plans) {
      if (p.encounterId === plan.encounterId) {
        p.status = attended ? "attended" : "missed";
        found = true;
        break;
      }
    }
    if (!found) {
      // Fallback: mark by scheduledTick match
      for (const [id, p] of plans) {
        if (p.scheduledTick === plan.scheduledTick && p.status === "scheduled") {
          p.status = attended ? "attended" : "missed";
          break;
        }
      }
    }
  }

  return state;
}
