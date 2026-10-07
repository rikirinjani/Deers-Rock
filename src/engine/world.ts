import { createClock, tick, cloneClockWithRng, createRng, type Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { createState, type HospitalState } from "./state-store.js";
import { admissionHandler, dischargeScheduledPatients, newPatientHandler, vitalsUpdateHandler } from "./markov.js";
import { cleanupHandler } from "./cleanup.js";
import { outcomeHandler } from "./outcome-tracker.js";
import { learningHandler } from "./agent-learning.js";
import { outpatientHandler } from "./outpatient.js";
import { runMmConference } from "./mm-conference.js";
import { icdTrackerHandler } from "./icd-tracker.js";
import { generatePatientPool } from "../patient/generator.js";
import { labHandler, labResultHandler } from "./lab.js";
import { medAdminHandler } from "./pharmacy.js";
import { aiClinicalPharmacyHandler, aiOutpatientPharmacyHandler } from "./ai-pharmacy.js";
import { aiNurseHandler } from "./ai-nurse.js";
import { orderCompleteHandler } from "./physician.js";
import { aiDoctorHandler } from "./ai-doctor.js";
import { radiologyHandler, radResultHandler } from "./radiology.js";
import { emergencyHandler, edDischargeHandler } from "./emergency.js";
import { surgeryHandler, surgeryResultHandler } from "./surgery.js";
import { respiratoryHandler } from "./respiratory.js";
import { dietaryHandler } from "./dietary.js";
import { socialWorkHandler } from "./social-work.js";
import { bloodBankHandler } from "./blood-bank.js";
import { microbiologyHandler } from "./microbiology.js";
import { pathologyHandler } from "./pathology.js";
import { cssdHandler } from "./cssd.js";
import { biomedHandler } from "./biomedical-engineering.js";
import { ipcHandler } from "./ipc.js";
import { clinicalNutritionHandler } from "./clinical-nutrition.js";
import { radiotherapyHandler } from "./radiotherapy.js";
import { dialysisHandler } from "./dialysis.js";
import { centralSupplyHandler } from "./central-supply.js";
import { medicalRecordsHandler } from "./medical-records.js";
import { specialtyHandler } from "./specialty.js";
import { edCashierHandler, inpatientCashierHandler, outpatientCashierHandler, billingHandler } from "./finance.js";
import { initJournal, journalAppend, saveSnapshot, journalPurge, journalExportAndPurge, journalBeginTransaction, journalCommitTransaction, getStashedSnapshotQueue, type SnapshotQueueEvent } from "./journal.js";
import { isDurableQueueEnabled } from "./config.js";
import { scenarioHandler } from "./scenario.js";
import { agentHandler, initAgentState } from "../agent/system.js";
import { referralHandler, initReferralState } from "../referral/system.js";
import { ambulanceHandler, initAmbulanceState } from "../referral/ambulance.js";
import { jrProvenanceHandler, initJrState } from "../referral/jr-provenance.js";
import { dischargePlanningHandler } from "./discharge-planning.js";
import { sickLeaveHandler, initSickLeaveState } from "../agent/system.js";
import { kamarJenazahHandler, initKamarJenazahState } from "./kamar-jenazah.js";
import { appointmentHandler, initAppointmentState } from "./appointment-scheduling.js";
import { generateAgentPool, resetAgentCounter } from "../agent/generator.js";
import { REFERRAL_FACILITIES } from "../identity/data.js";
import { resetPatientCounter } from "../patient/generator.js";
import { resetNikCounter } from "../identity/generator.js";
import { resetChargeCounter } from "./charge-generator.js";
import { resetCssdCounters } from "./cssd.js";
import { resetDialysisCounters } from "./dialysis.js";
import { resetScenarioCounter } from "./scenario.js";
import { resetBloodBankCounters } from "./blood-bank.js";
import { resetClinicalNutritionCounters } from "./clinical-nutrition.js";
import { resetIpcCounter } from "./ipc.js";
import { resetMicrobiologyCounter } from "./microbiology.js";
import { resetPathologyCounter } from "./pathology.js";
import { resetMmConferenceCounter } from "./mm-conference.js";
import { resetRadiotherapyCounters } from "./radiotherapy.js";
import { resetBiomedCounter } from "./biomedical-engineering.js";
import { resetJournalPurgeTick, resetJournalExportTick } from "./journal.js";
import { takeSnapshot as takeOutcomeSnapshot } from "./outcome-snapshot.js";

export interface World {
  clock: Clock;
  state: HospitalState;
  queue: EventQueue;
  handlers: ((state: HospitalState, clock: Clock, queue: EventQueue) => HospitalState)[];
  journalPath: string | null;
}

export function createWorld(patientCount: number = 100, journalPath?: string, seed?: number): World {
  // Phase B: reset all module-global ID counters for same-process determinism
  resetPatientCounter(); resetNikCounter(); resetAgentCounter();
  resetChargeCounter(); resetCssdCounters(); resetDialysisCounters();
  resetScenarioCounter(); resetBloodBankCounters(); resetClinicalNutritionCounters();
  resetIpcCounter(); resetMicrobiologyCounter(); resetPathologyCounter();
  resetMmConferenceCounter(); resetRadiotherapyCounters(); resetBiomedCounter();
  resetJournalPurgeTick(); resetJournalExportTick();

  const worldRng = seed !== undefined ? createRng(seed).next : undefined;
  const effectiveRng = worldRng;
  const patients = effectiveRng ? generatePatientPool(patientCount, effectiveRng) : generatePatientPool(patientCount);
  const jp = journalPath ?? null;

  const state = createState(patients, {}, effectiveRng);
  const totalBeds = state.beds.size;

  const initialAgentState = initAgentState();
  initialAgentState.pool = effectiveRng ? generateAgentPool(totalBeds, effectiveRng) : generateAgentPool(totalBeds);
  const initialReferralState = initReferralState();

  state._agentState = initialAgentState;
  state._referralState = initialReferralState;
  // Epic IX M9.3 wave 2: initialize ambulance fleet and JR provenance
  state._ambulanceState = initAmbulanceState();
  state._jrState = initJrState();
  // Epic VI: sick leave, kamar jenazah, appointment scheduling
  state._sickLeaveState = initSickLeaveState();
  state._kamarJenazahState = initKamarJenazahState();
  state._appointmentState = initAppointmentState();

  const clockSeed = seed ?? Date.now();
  const clock = createClock(60, clockSeed);
  state._rngSeed = clock.rngSeed;

  if (jp) {
    initJournal(jp);
    journalAppend(0, clock.hospitalTimeMs, "world.start", "world", "sim", {
      patientCount,
      agentCount: initialAgentState.pool.agents.size,
      referralFacilities: initialReferralState.facilities.size,
      journalPath: jp,
    });
  }

  return {
    clock,
    state,
    queue: new EventQueue(),
    journalPath: jp,
    handlers: buildHandlers(),
  };
}

function snapshotState(state: HospitalState) {
  return {
    encounterIds: new Set(state.encounters.keys()),
    encounterStatus: new Map(Array.from(state.encounters).map(([k, v]) => [k, v.status])),
    labIds: new Set(state.labOrders.keys()),
    labStatus: new Map(Array.from(state.labOrders).map(([k, v]) => [k, v.status])),
    medIds: new Set(state.medicationOrders.keys()),
    medStatus: new Map(Array.from(state.medicationOrders).map(([k, v]) => [k, v.status])),
    radIds: new Set(state.radiologyOrders.keys()),
    radStatus: new Map(Array.from(state.radiologyOrders).map(([k, v]) => [k, v.status])),
    surgIds: new Set(state.surgeryOrders.keys()),
    surgStatus: new Map(Array.from(state.surgeryOrders).map(([k, v]) => [k, v.status])),
    nurseSize: state.nurseNotes.size,
    physIds: new Set(state.physicianOrders.keys()),
    physStatus: new Map(Array.from(state.physicianOrders).map(([k, v]) => [k, v.status])),
    respIds: new Set(state.respiratoryOrders.keys()),
    dietIds: new Set(state.dietOrders.keys()),
    socialSize: state.socialWorkNotes.size,
    edIds: new Set(state.edTriages.keys()),
    edDisp: new Map(Array.from(state.edTriages).map(([k, v]) => [k, v.disposition ?? ""])),
    chartIds: new Set(state.medicalCharts.keys()),
    chartStatus: new Map(Array.from(state.medicalCharts).map(([k, v]) => [k, v.status])),
    chargeSize: state.charges.size,
    claimIds: new Set(state.insuranceClaims.keys()),
    claimStatus: new Map(Array.from(state.insuranceClaims).map(([k, v]) => [k, v.status])),
    paySize: state.payments.size,
    txnSize: state.stockTransactions.size,
    specIds: new Set(state.specialtyOrders.keys()),
    specStatus: new Map(Array.from(state.specialtyOrders).map(([k, v]) => [k, v.status])),
    agentCount: state._agentState.pool.agents.size,
    referralCount: state._referralState.letters.size,
  };
}

function logStateDiff(snap: ReturnType<typeof snapshotState>, state: HospitalState, tick: number, htime: number): void {
  const a = (type: string, etype: string, id: string, payload: unknown) => journalAppend(tick, htime, type, etype, id, payload);

  for (const [id, enc] of state.encounters) {
    if (!snap.encounterIds.has(id)) a("encounter.created", "encounter", id, { patientId: enc.patientId, type: enc.type });
    else {
      const oldStatus = snap.encounterStatus.get(id);
      if (oldStatus && oldStatus !== enc.status) a("encounter." + enc.status, "encounter", id, { patientId: enc.patientId, from: oldStatus });
    }
  }

  for (const [id, lab] of state.labOrders) {
    if (!snap.labIds.has(id)) a("lab.ordered", "lab", id, { testName: lab.testName, patientId: lab.patientId });
    else {
      const os = snap.labStatus.get(id);
      if (os && os !== lab.status) a("lab." + lab.status, "lab", id, { testName: lab.testName, result: lab.result });
    }
  }

  for (const [id, med] of state.medicationOrders) {
    if (!snap.medIds.has(id)) a("medication.ordered", "medication", id, { name: med.medication.name, patientId: med.patientId });
    else {
      const os = snap.medStatus.get(id);
      if (os && os !== med.status) a("medication." + med.status, "medication", id, { name: med.medication.name });
    }
  }

  for (const [id, rad] of state.radiologyOrders) {
    if (!snap.radIds.has(id)) a("radiology.ordered", "radiology", id, { study: rad.studyType, patientId: rad.patientId });
    else {
      const os = snap.radStatus.get(id);
      if (os && os !== rad.status) a("radiology." + rad.status, "radiology", id, { study: rad.studyType, impression: rad.impression });
    }
  }

  for (const [id, surg] of state.surgeryOrders) {
    if (!snap.surgIds.has(id)) a("surgery.scheduled", "surgery", id, { procedure: surg.procedureName, patientId: surg.patientId });
    else {
      const os = snap.surgStatus.get(id);
      if (os && os !== surg.status) a("surgery." + surg.status, "surgery", id, { procedure: surg.procedureName });
    }
  }

  if (state.nurseNotes.size > snap.nurseSize) {
    const newCount = state.nurseNotes.size - snap.nurseSize;
    const newNotes = Array.from(state.nurseNotes.values()).slice(-newCount);
    for (const n of newNotes) a("nurse.note", "nursing", n.id, { patientId: n.patientId, noteType: n.noteType, content: n.content });
  }

  for (const [id, po] of state.physicianOrders) {
    if (!snap.physIds.has(id)) a("physician.order", "physician", id, { desc: po.description, patientId: po.patientId });
    else {
      const os = snap.physStatus.get(id);
      if (os && os !== po.status) a("physician.order." + po.status, "physician", id, { desc: po.description });
    }
  }

  for (const [id, ro] of state.respiratoryOrders) {
    if (!snap.respIds.has(id)) a("respiratory.ordered", "respiratory", id, { therapy: ro.therapyType, patientId: ro.patientId });
  }

  for (const [id, d] of state.dietOrders) {
    if (!snap.dietIds.has(id)) a("diet.ordered", "diet", id, { dietType: d.dietType, patientId: d.patientId });
  }

  if (state.socialWorkNotes.size > snap.socialSize) {
    const newCount = state.socialWorkNotes.size - snap.socialSize;
    const newNotes = Array.from(state.socialWorkNotes.values()).slice(-newCount);
    for (const n of newNotes) a("social.note", "social", n.id, { patientId: n.patientId, noteType: n.noteType });
  }

  for (const [id, t] of state.edTriages) {
    if (!snap.edIds.has(id)) a("ed.triage", "emergency", id, { patientId: t.patientId, acuity: t.acuity, complaint: t.chiefComplaint });
    else {
      const os = snap.edDisp.get(id);
      if (os !== undefined && os === "" && t.disposition) a("ed.disposition", "emergency", id, { patientId: t.patientId, disposition: t.disposition });
      if (os !== undefined && os !== null && os !== t.disposition) a("ed.disposition", "emergency", id, { patientId: t.patientId, disposition: t.disposition });
    }
  }

  for (const [id, ch] of state.medicalCharts) {
    if (!snap.chartIds.has(id)) a("chart.created", "chart", id, { patientId: ch.patientId });
    else {
      const os = snap.chartStatus.get(id);
      if (os && os !== ch.status) a("chart." + ch.status, "chart", id, { coder: ch.coder });
    }
  }

  if (state.charges.size > snap.chargeSize) {
    const newCharges = Array.from(state.charges.values()).slice(0, state.charges.size - snap.chargeSize);
    for (const c of newCharges) a("charge.created", "charge", c.id, { patientId: c.patientId, category: c.category, amount: c.amount });
  }

  for (const [id, cl] of state.insuranceClaims) {
    if (!snap.claimIds.has(id)) a("claim.submitted", "claim", id, { patientId: cl.patientId, payer: cl.payer, total: cl.totalCharges });
    else {
      const os = snap.claimStatus.get(id);
      if (os && os !== cl.status) a("claim." + cl.status, "claim", id, { patientId: cl.patientId, payer: cl.payer });
    }
  }

  if (state.payments.size > snap.paySize) {
    const newPays = Array.from(state.payments.values()).slice(0, state.payments.size - snap.paySize);
    for (const p of newPays) a("payment.created", "payment", p.id, { patientId: p.patientId, amount: p.amount, type: p.type });
  }

  if (state.stockTransactions.size > snap.txnSize) {
    const newTxns = Array.from(state.stockTransactions.values()).slice(0, state.stockTransactions.size - snap.txnSize);
    for (const t of newTxns) a("supply." + t.type, "supply", t.id, { itemCode: t.itemCode, qty: t.quantity, ref: t.referenceId });
  }

  for (const [id, spec] of state.specialtyOrders) {
    if (!snap.specIds.has(id)) a("specialty.ordered", "specialty", id, { specialty: spec.specialty, service: spec.serviceName, patientId: spec.patientId });
    else {
      const os = snap.specStatus.get(id);
      if (os && os !== spec.status) a("specialty." + spec.status, "specialty", id, { specialty: spec.specialty, findings: spec.findings });
    }
  }

  if (state._referralState.letters.size > snap.referralCount) {
    a("referral.new", "referral", "batch", { total: state._referralState.letters.size });
  }
}

export function step(world: World): World {
  const newClock = tick(world.clock);
  const dueEvents = world.queue.dueEvents(newClock.tick);
  let state = world.state;
  const journaling = world.journalPath !== null;

  const snap = journaling ? snapshotState(state) : null;

  const scheduledDischarges = dueEvents.filter(e => e.type === "discharge").map(e => e.data as { patientId?: string; encounterId?: string });
  state = dischargeScheduledPatients(state, newClock, scheduledDischarges);

  for (const evt of dueEvents) {
    switch (evt.type) {
      case "lab_result": state = labResultHandler(state, newClock, world.queue); break;
      case "rad_result": state = radResultHandler(state, newClock, world.queue); break;
      case "ed_discharge": state = edDischargeHandler(state, newClock, world.queue); break;
      case "surgery_done": state = surgeryResultHandler(state, newClock, world.queue); break;
      // Phase E: macro→micro coupling — consume events from Kronos adapter
      case "admission_surge": {
        const multiplier = (evt.data as { multiplier?: number }).multiplier ?? 1.0;
        state = { ...state, _admissionMultiplier: multiplier };
        break;
      }
      case "staff_shortage": {
        const modifier = (evt.data as { modifier?: number }).modifier ?? 1.0;
        state = { ...state, _staffAvailabilityModifier: modifier };
        break;
      }
      case "supply_chain_pressure": {
        const pressure = (evt.data as { pressure?: number }).pressure ?? 0;
        state = { ...state, _supplyChainPressure: Math.min(1, Math.max(0, pressure)) };
        break;
      }
      case "active_disaster": {
        const disasterType = (evt.data as { disasterType?: string }).disasterType;
        state = { ...state, _activeMacroDisaster: disasterType };
        break;
      }
    }
  }

  for (const handler of world.handlers) {
    state = handler(state, newClock, world.queue);
  }

  state = medAdminHandler(state, newClock, world.queue);
  state = orderCompleteHandler(state, newClock, world.queue);

  const mmResult = runMmConference(state, newClock, world.queue);
  state = mmResult.state;

  state = { ...state, _calendarTicks: newClock.tick, _rngSeed: newClock.rngSeed };

  // Epic VII M7.3: per-tick outcome snapshot for time-series analysis
  takeOutcomeSnapshot(state, newClock.tick);

  if (snap && journaling) {
    journalBeginTransaction();
    logStateDiff(snap, state, newClock.tick, newClock.hospitalTimeMs);
    if (newClock.tick > 0 && newClock.tick % 100 === 0) {
      // ADR-004 D1 flag plumbing: thread the live queue through so the
      // snapshot can persist pending events. saveSnapshot itself gates on
      // DR_DURABLE_QUEUE, so OFF-mode bytes are unchanged.
      saveSnapshot(newClock.tick, state, world.queue);
    }
    journalCommitTransaction();
    if (newClock.tick > 0 && newClock.tick % 500 === 0) {
      journalExportAndPurge(newClock.tick);
    } else if (newClock.tick > 0 && newClock.tick % 100 === 0) {
      journalPurge(newClock.tick);
    }
  }

  return { ...world, clock: newClock, state };
}

export function runWorld(world: World, steps: number): World {
  let w = world;
  for (let i = 0; i < steps; i++) w = step(w);
  return w;
}

type HandlerFn = (state: HospitalState, clock: Clock, queue: EventQueue) => HospitalState;

/** Wrap handler to run only every N ticks. Returns state unchanged on skipped ticks. */
function everyN(fn: HandlerFn, n: number): HandlerFn {
  return (state, clock, queue) => {
    if (clock.tick > 0 && clock.tick % n !== 0) return state;
    return fn(state, clock, queue);
  };
}

const HANDLER_SKIP: [HandlerFn, number][] = [
  [admissionHandler, 1], [outpatientHandler, 3], [newPatientHandler, 15],
  [agentHandler, 1], [referralHandler, 15], [scenarioHandler, 5],
  [emergencyHandler, 1], [labHandler, 1], [aiClinicalPharmacyHandler, 2],
  [aiNurseHandler, 1], [aiDoctorHandler, 4],
  [radiologyHandler, 2], [surgeryHandler, 3], [respiratoryHandler, 2],
  [dietaryHandler, 3], [socialWorkHandler, 5],
  [bloodBankHandler, 5], [microbiologyHandler, 5], [pathologyHandler, 5],
  [cssdHandler, 5], [biomedHandler, 5],
  [ipcHandler, 5], [clinicalNutritionHandler, 3], [radiotherapyHandler, 5],
  [dialysisHandler, 5],
  [centralSupplyHandler, 3], [medicalRecordsHandler, 3], [specialtyHandler, 2],
  [billingHandler, 5], [edCashierHandler, 3], [inpatientCashierHandler, 5], [outpatientCashierHandler, 5],
  [vitalsUpdateHandler, 1], [icdTrackerHandler, 10], [outcomeHandler, 1],
  [learningHandler, 10], [cleanupHandler, 10], [aiOutpatientPharmacyHandler, 3],
  // Epic IX M9.3 wave 2: ambulance + JR provenance (every 5 ticks)
  [ambulanceHandler, 5], [jrProvenanceHandler, 5],
  // Epic VI: sick leave, kamar jenazah, appointment scheduling
  [sickLeaveHandler, 10], [kamarJenazahHandler, 60], [appointmentHandler, 3],
  // Epic VI M6.2: discharge planning / rujuk balik (every 10 ticks)
  [dischargePlanningHandler, 10],
];

export function buildHandlers(): HandlerFn[] {
  return HANDLER_SKIP.map(([fn, n]) => n > 1 ? everyN(fn, n) : fn);
}

export function resumeWorld(state: HospitalState, startTick: number, journalPath: string): World {
  const rngSeed = state._rngSeed || startTick + 1;
  const clock = cloneClockWithRng(createClock(60, rngSeed), rngSeed);
  clock.tick = startTick;
  clock.hospitalTimeMs = startTick * 1000 * 60;
  clock.running = false;
  // ADR-004 D1: rebuild the EventQueue in stored order on the resume path.
  // The ordered pending-event list travels on transient props attached by
  // deserializeState (stripped here so HospitalState shape is unchanged).
  const queue = new EventQueue();
  const stored = (state as unknown as { __durableQueue?: SnapshotQueueEvent[] }).__durableQueue;
  let snapshotV = (state as unknown as { __snapshotV?: unknown }).__snapshotV;
  delete (state as unknown as Record<string, unknown>).__durableQueue;
  delete (state as unknown as Record<string, unknown>).__snapshotV;
  // Load-path stripping (loadNearestSnapshot) stashes the payload for the
  // resume path — fall back to it when the props are already stripped.
  let storedQueue = stored;
  if (storedQueue === undefined) {
    const stashed = getStashedSnapshotQueue(state);
    if (stashed !== null) {
      storedQueue = stashed.queue;
      if (snapshotV === undefined) snapshotV = stashed.version;
    }
  }
  if (!isDurableQueueEnabled()) {
    // Flag OFF: today's behavior exactly (empty queue) — and exactly as quiet
    // as before: no legacy-snapshot warning on OFF resumes.
  } else if (snapshotV !== 2 || !Array.isArray(storedQueue)) {
    // Old-snapshot compat: today's behavior (empty queue), made explicit
    // with exactly ONE stderr warning line — never throw.
    console.warn("[deers-rock] snapshot has no durable queue (missing v/queue); resuming with empty queue");
  } else {
    // Insertion order preserved exactly; no re-sorting, no dedup.
    // No rng() consumed here; scheduling is tick-absolute, no Date.now.
    // A malformed entry can never abort a resume: count drops and emit ONE
    // summary warning (never per-event spam, never throw).
    let dropped = 0;
    for (const e of storedQueue) {
      try {
        queue.schedule(e.type, e.scheduledTick, e.data ?? {});
      } catch {
        dropped++;
      }
    }
    if (dropped > 0) {
      console.warn(`[deers-rock] dropped ${dropped} durable queue event(s) on resume; resuming with the remainder`);
    }
  }
  // Flag OFF + v2 snapshot: intentionally empty (byte-identical behavior).
  return {
    clock,
    state,
    queue,
    journalPath,
    handlers: buildHandlers(),
  };
}
