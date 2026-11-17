/**
 * Epic XII 12.1: demand stream and queue for layout scenarios.
 *
 * Scenario path only. Without `state._demand` nothing here runs and the default
 * admission path is untouched.
 *
 * Design (docs/ward-class-scenario-design.md section 9):
 *  1. Arrivals come from the handler's own rng sub-stream, which depends only on
 *     (world seed, tick, handler), never on bed count. Payer and stay length are
 *     drawn at arrival from the same stream and stored, so the same seed gives the
 *     same demand under every layout.
 *  2. A patient who cannot be placed waits in a FIFO queue. After `waitLimitMinutes`
 *     the patient counts as diverted (left, not admitted).
 *  3. Stay length is the unchanged locale stay model (layout is the only variable).
 *  4. Arrivals are new patients from `generatePatient`, not the recurring pool.
 *
 * Placement in 12.1 reuses the default rule (specialty ward first, else any free bed).
 * Class routing, spillover and the no-fallback-into-VIP/ICU rule are 12.2.
 * Limit: later events (deaths, ancillary orders) still draw from their own sub-streams
 * per tick, so "same demand" means same arrivals, payer, diagnosis and stay length,
 * not identical clinical course across layouts.
 */
import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { EventQueue } from "./event-queue.js";
import type { Patient } from "../patient/schema.js";
import { generatePatient } from "../patient/generator.js";
import { assignPayer } from "./finance.js";
import { getStayOutcomes } from "../locale/registry.js";
import { admitPatientToBed, selectPrimaryDiagnosisCode, specialtyOf, specialtyWardFor } from "./markov.js";

export interface DemandConfig {
  /** Mean inpatient arrivals per day (one Bernoulli per minute, as the default path). Default 19. */
  arrivalsPerDay?: number;
  /** Minutes a patient may wait for a bed before counting as diverted. Default 1440 (24 h). */
  waitLimitMinutes?: number;
}

export interface QueuedArrival {
  patient: Patient;
  arrivalTick: number;
  payer: ReturnType<typeof assignPayer>;
  stayMinutes: number;
}

export interface ArrivalRecord {
  tick: number;
  patientId: string;
  payer: string;
  primaryDiagnosis: string;
  stayMinutes: number;
}

export interface DemandState {
  arrivalsPerDay: number;
  waitLimitMinutes: number;
  /** FIFO: oldest first. */
  queue: QueuedArrival[];
  arrived: number;
  admitted: number;
  diverted: number;
  /** Sum of minutes waited by admitted patients. */
  waitMinutesAdmitted: number;
  maxQueueLength: number;
  /** Every arrival, in order (shows that demand is layout independent). */
  arrivalLog: ArrivalRecord[];
  divertedLog: { tick: number; patientId: string; payer: string }[];
}

export function initDemand(cfg: DemandConfig = {}): DemandState {
  const arrivalsPerDay = cfg.arrivalsPerDay ?? 19;
  const waitLimitMinutes = cfg.waitLimitMinutes ?? 1440;
  if (!Number.isFinite(arrivalsPerDay) || arrivalsPerDay < 0) throw new Error("arrivalsPerDay must be a non-negative number");
  if (!Number.isFinite(waitLimitMinutes) || waitLimitMinutes < 0) throw new Error("waitLimitMinutes must be a non-negative number");
  return {
    arrivalsPerDay, waitLimitMinutes, queue: [],
    arrived: 0, admitted: 0, diverted: 0, waitMinutesAdmitted: 0, maxQueueLength: 0,
    arrivalLog: [], divertedLog: [],
  };
}

/** One tick of the scenario path: arrivals, then expiry, then placement. */
export function scenarioDemandStep(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const d = state._demand!;
  const queued = d.queue.slice();
  const arrivalLog = d.arrivalLog.slice();
  const divertedLog = d.divertedLog.slice();
  let { arrived, admitted, diverted, waitMinutesAdmitted, maxQueueLength } = d;

  // 1. Arrivals (one Bernoulli per tick; the stream is the handler's own).
  const p = Math.min(1, d.arrivalsPerDay / 1440);
  if (p > 0 && clock.rng() < p) {
    const patient = generatePatient(clock.rng);
    patient.id = `DEM-${clock.tick}-${String(arrived + 1).padStart(5, "0")}`;
    const payer = assignPayer(patient, clock.rng, clock.rngSeed);
    const dx = selectPrimaryDiagnosisCode(patient);
    const stayMinutes = getStayOutcomes().dischargeDelayMinutes(dx, clock.rng());
    queued.push({ patient, arrivalTick: clock.tick, payer, stayMinutes });
    arrivalLog.push({ tick: clock.tick, patientId: patient.id, payer, primaryDiagnosis: dx, stayMinutes });
    arrived++;
  }

  // 2. Expiry: waited longer than the limit counts as diverted.
  const waiting: QueuedArrival[] = [];
  for (const q of queued) {
    if (clock.tick - q.arrivalTick > d.waitLimitMinutes) {
      diverted++;
      divertedLog.push({ tick: clock.tick, patientId: q.patient.id, payer: q.payer });
    } else waiting.push(q);
  }

  // 3. Placement, FIFO. A patient who finds no bed stays queued; later patients may still
  //    take a bed (specialty ward else any free bed), as the default rule does.
  let beds = state.beds;
  let encounters = state.encounters;
  let patients = state.patients;
  const stillWaiting: QueuedArrival[] = [];
  if (waiting.length > 0) {
    beds = new Map(state.beds);
    encounters = new Map(state.encounters);
    patients = new Map(state.patients);
    for (const q of waiting) {
      const wardName = specialtyWardFor(q.patient);
      let bed = wardName ? Array.from(beds.values()).find(b => b.patientId === null && b.ward === wardName) : undefined;
      if (!bed) bed = Array.from(beds.values()).find(b => b.patientId === null);
      if (!bed) { stillWaiting.push(q); continue; }
      patients.set(q.patient.id, q.patient);
      admitPatientToBed(state, beds, encounters, q.patient, bed, specialtyOf(q.patient), clock, queue,
        { payer: q.payer, dischargeDelay: q.stayMinutes });
      admitted++;
      waitMinutesAdmitted += clock.tick - q.arrivalTick;
    }
  }
  maxQueueLength = Math.max(maxQueueLength, stillWaiting.length);

  const next: DemandState = {
    ...d, queue: stillWaiting, arrived, admitted, diverted, waitMinutesAdmitted, maxQueueLength, arrivalLog, divertedLog,
  };
  return { ...state, beds, encounters, patients, _demand: next };
}
