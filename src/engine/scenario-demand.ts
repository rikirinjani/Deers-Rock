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
 * Placement (12.2): payer-to-class routing with spillover up and no fallback into classes
 * the policy does not list (see scenario-routing.ts). A patient with no eligible free bed waits.
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
import { admitPatientToBed, selectPrimaryDiagnosisCode, specialtyOf } from "./markov.js";
import { DEFAULT_ROUTING, routeBed, routingKey, closedBedIds, type RoutingPolicy, type Closure } from "./scenario-routing.js";

export interface DemandConfig {
  /** Mean inpatient arrivals per day (one Bernoulli per minute, as the default path). Default 19. */
  arrivalsPerDay?: number;
  /** Minutes a patient may wait for a bed before counting as diverted. Default 1440 (24 h). */
  waitLimitMinutes?: number;
  /** Payer-to-class routing table (12.2). Default: DEFAULT_ROUTING (an assumption, see scenario-routing.ts). */
  routing?: RoutingPolicy;
  /** Refit works that take free beds out of service for a time window (12.3). */
  closures?: Closure[];
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
  /** Routing key at arrival (payer, or "BPJS Kesehatan|<tier class>" under rule-aware routing). */
  routeKey: string;
}

/**
 * One admission, written at placement (12.4). Money is computed from this ledger, not from
 * state.encounters, because cleanupHandler prunes old encounters on long runs. The discharge
 * tick is fixed at admission: tick + stayMinutes.
 */
export interface AdmissionEntry {
  patientId: string;
  tick: number;
  payer: string;
  /** Class actually used. */
  roomClass: string;
  /** The payer's own class under the routing table in force. */
  ownClass: string;
  primaryDiagnosis: string;
  /** Primary diagnosis first, then the patient's other diagnosis codes. */
  diagnosisCodes: string[];
  stayMinutes: number;
  /** Routing key (see ArrivalRecord). */
  routeKey: string;
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
  divertedLog: { tick: number; patientId: string; payer: string; routeKey: string }[];
  /** 12.2: routing table in force. */
  routing: RoutingPolicy;
  /** 12.4: every admission, for money and reports on long runs. */
  ledger: AdmissionEntry[];
  /** 12.3: refit closures in force. */
  closures: Closure[];
  /** 12.2: admissions by class actually used. */
  admittedByClass: Record<string, number>;
  /** 12.2: admissions by "payer|class". */
  admittedByPayerClass: Record<string, number>;
  /** 12.2: admissions placed above the payer's own class. */
  spilledUp: number;
  /** 12.2: spill-ups by "payer|ownClass->usedClass". */
  spilledByPath: Record<string, number>;
  /** 12.2: diversions by payer. */
  divertedByPayer: Record<string, number>;
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
    routing: cfg.routing ?? DEFAULT_ROUTING, closures: cfg.closures ?? [], ledger: [],
    admittedByClass: {}, admittedByPayerClass: {}, spilledUp: 0, spilledByPath: {}, divertedByPayer: {},
  };
}

/** One tick of the scenario path: arrivals, then expiry, then placement. */
export function scenarioDemandStep(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const d = state._demand!;
  const queued = d.queue.slice();
  const arrivalLog = d.arrivalLog.slice();
  const divertedLog = d.divertedLog.slice();
  const ledger = d.ledger.slice();
  let { arrived, admitted, diverted, waitMinutesAdmitted, maxQueueLength, spilledUp } = d;
  const admittedByClass = { ...d.admittedByClass };
  const admittedByPayerClass = { ...d.admittedByPayerClass };
  const spilledByPath = { ...d.spilledByPath };
  const divertedByPayer = { ...d.divertedByPayer };

  // 1. Arrivals (one Bernoulli per tick; the stream is the handler's own).
  const p = Math.min(1, d.arrivalsPerDay / 1440);
  if (p > 0 && clock.rng() < p) {
    const patient = generatePatient(clock.rng);
    patient.id = `DEM-${clock.tick}-${String(arrived + 1).padStart(5, "0")}`;
    const payer = assignPayer(patient, clock.rng, clock.rngSeed);
    const dx = selectPrimaryDiagnosisCode(patient);
    const stayMinutes = getStayOutcomes().dischargeDelayMinutes(dx, clock.rng());
    queued.push({ patient, arrivalTick: clock.tick, payer, stayMinutes });
    arrivalLog.push({ tick: clock.tick, patientId: patient.id, payer, primaryDiagnosis: dx, stayMinutes, routeKey: routingKey(d.routing, payer, patient.id) });
    arrived++;
  }

  // 2. Expiry: waited longer than the limit counts as diverted.
  const waiting: QueuedArrival[] = [];
  for (const q of queued) {
    if (clock.tick - q.arrivalTick > d.waitLimitMinutes) {
      diverted++;
      divertedByPayer[q.payer] = (divertedByPayer[q.payer] ?? 0) + 1;
      divertedLog.push({ tick: clock.tick, patientId: q.patient.id, payer: q.payer, routeKey: routingKey(d.routing, q.payer, q.patient.id) });
    } else waiting.push(q);
  }

  // 3. Placement, FIFO, by payer-to-class routing (no rng, no fallback outside the table).
  //    A patient with no eligible free bed stays queued; later patients may still be placed.
  let beds = state.beds;
  let encounters = state.encounters;
  let patients = state.patients;
  const stillWaiting: QueuedArrival[] = [];
  if (waiting.length > 0) {
    beds = new Map(state.beds);
    encounters = new Map(state.encounters);
    patients = new Map(state.patients);
    const closed = closedBedIds(beds, d.closures, clock.tick);
    for (const q of waiting) {
      const rkey = routingKey(d.routing, q.payer, q.patient.id);
      const route = routeBed(beds, q.patient, rkey, d.routing, state._layout, closed);
      if (!route) { stillWaiting.push(q); continue; }
      const bed = route.bed;
      patients.set(q.patient.id, q.patient);
      admitPatientToBed(state, beds, encounters, q.patient, bed, specialtyOf(q.patient), clock, queue,
        { payer: q.payer, dischargeDelay: q.stayMinutes });
      admitted++;
      {
        const dx = selectPrimaryDiagnosisCode(q.patient);
        ledger.push({
          patientId: q.patient.id, tick: clock.tick, payer: q.payer, roomClass: route.roomClass,
          ownClass: (d.routing.eligible[rkey] ?? d.routing.defaultClasses)[0] ?? route.roomClass,
          primaryDiagnosis: dx,
          diagnosisCodes: [dx, ...q.patient.diagnoses.map((x) => x.code).filter((c) => c !== dx)],
          stayMinutes: q.stayMinutes, routeKey: rkey,
        });
      }
      admittedByClass[route.roomClass] = (admittedByClass[route.roomClass] ?? 0) + 1;
      const pc = `${q.payer}|${route.roomClass}`;
      admittedByPayerClass[pc] = (admittedByPayerClass[pc] ?? 0) + 1;
      if (route.rank > 0) {
        spilledUp++;
        const own = (d.routing.eligible[rkey] ?? d.routing.defaultClasses)[0]!;
        const path = `${q.payer}|${own}->${route.roomClass}`;
        spilledByPath[path] = (spilledByPath[path] ?? 0) + 1;
      }
      waitMinutesAdmitted += clock.tick - q.arrivalTick;
    }
  }
  maxQueueLength = Math.max(maxQueueLength, stillWaiting.length);

  const next: DemandState = {
    ...d, queue: stillWaiting, arrived, admitted, diverted, waitMinutesAdmitted, maxQueueLength, arrivalLog, divertedLog,
    admittedByClass, admittedByPayerClass, spilledUp, spilledByPath, divertedByPayer, ledger,
  };
  return { ...state, beds, encounters, patients, _demand: next };
}
