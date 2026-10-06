import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { EdTriage } from "../patient/schema.js";
import { getEventSummary } from "./calendar.js";
import { assignPayer } from "./finance.js";
import { appendCharge } from "./charge-generator.js";
import { edFee } from "./price-tables.js";
import { selectPrimaryDiagnosisCode } from "./markov.js";
import { computeSeveritySnapshot, tickFromMs } from "./encounter-insights.js";

const COMPLAINTS = [
  "Chest pain", "Abdominal pain", "Shortness of breath", "Headache", "Fever", "Trauma from fall",
  "Motor vehicle accident", "Dizziness", "Nausea and vomiting", "Back pain", "Altered mental status",
  "Seizure", "Bleeding", "Allergic reaction", "Syncope",
];

const ARRIVAL_MODES = ["walk-in", "walk-in", "ambulance", "ambulance", "transfer"] as const;

function assignAcuity(complaint: string): EdTriage["acuity"] {
  if (["Chest pain", "Shortness of breath", "Altered mental status", "Seizure", "Motor vehicle accident"].includes(complaint)) return 1;
  if (["Abdominal pain", "Fever", "Bleeding", "Syncope", "Allergic reaction"].includes(complaint)) return 2;
  if (["Headache", "Trauma from fall", "Dizziness", "Nausea and vomiting"].includes(complaint)) return 3;
  return 4 as EdTriage["acuity"];
}

export function emergencyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick % 3 !== 0) return state;

  const eventCtx = getEventSummary(state._calendarTicks);
  const eventPool = eventCtx.emergencyPool;
  const complaint = eventPool.length > 0 && clock.rng() > 0.5
    ? eventPool[Math.floor(clock.rng() * eventPool.length)]!
    : COMPLAINTS[Math.floor(clock.rng() * COMPLAINTS.length)]!;
  const acuity = assignAcuity(complaint);
  const arrivalMode = ARRIVAL_MODES[Math.floor(clock.rng() * ARRIVAL_MODES.length)];

  const patientsArr = Array.from(state.patients.values());
  const patient = patientsArr[Math.floor(clock.rng() * patientsArr.length)]!;

  const encounterId = `ED-${clock.tick}-${patient.id}`;
  const encounter = {
    id: encounterId,
    patientId: patient.id,
    type: "outpatient" as const,
    startTime: clock.hospitalTimeMs,
    endTime: null,
    status: "active" as const,
      payer: assignPayer(patient, clock.rng),
    // Phase D: ED visits carry the patient's principal problem-list diagnosis
    // (deterministic; no ED-complaint→ICD mapping exists in DR and none is invented).
    primaryDiagnosis: selectPrimaryDiagnosisCode(patient),
  };

  const triage: EdTriage = {
    id: `TRIAGE-${clock.tick}-${patient.id}`,
    encounterId,
    patientId: patient.id,
    acuity,
    chiefComplaint: complaint,
    arrivalMode,
    disposition: null,
    triagedAt: clock.hospitalTimeMs,
    dischargedAt: null,
  };

  const newEncounters = new Map(state.encounters);
  newEncounters.set(encounter.id, encounter);

  const newTriages = new Map(state.edTriages);
  newTriages.set(triage.id, triage);

  const edStay = 2 + Math.floor(clock.rng() * 6);
  // KNOWN MODELING CHOICE: 2-7 tick ED LOS is unrealistically short (real ED: 1-6 hours).
  // This 2-7 tick window abstracts triage+treatment as a quick disposal step,
  // not a full ED simulation. Escalation to realistic 60-180 tick LOS requires
  // an ED capacity model (beds, nurse staffing, waiting room queue).
  // See: docs/integration-depth-ledger.md § Emergency Department, docs/MODULE-CONTRACTS.md § emergency.ts
  _queue.schedule("ed_discharge", clock.tick + edStay, { encounterId, triageId: triage.id, patientId: patient.id });

  return { ...state, encounters: newEncounters, edTriages: newTriages };
}

export function edDischargeHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newTriages = new Map(state.edTriages);
  for (const [id, t] of newTriages) {
    if (t.disposition === null) {
      const admitted = t.acuity <= 2 || clock.rng() > 0.5;
      newTriages.set(id, {
        ...t,
        disposition: admitted ? "admitted" : "discharged",
        dischargedAt: clock.hospitalTimeMs,
      });

      const newEncounters = new Map(state.encounters);
      const enc = newEncounters.get(t.encounterId);
      if (enc) {
        // Issue #5 (Oracle F1): snapshot severity only when the encounter
        // actually CLOSES here (non-admitted ED patients). The admitted
        // branch keeps status "active" — the encounter continues as an
        // inpatient stay and markov.ts snapshots it at the real close.
        // Pure computation: no rng, no tick-loop behavior change (additive).
        newEncounters.set(t.encounterId, admitted
          ? { ...enc, endTime: clock.hospitalTimeMs, status: "active" }
          : {
              ...enc,
              endTime: clock.hospitalTimeMs,
              status: "discharged",
              _severityAtClose: computeSeveritySnapshot(state, enc, tickFromMs(clock.hospitalTimeMs)),
            });
      }

      // ADR-015 D7: ED fee by acuity, billed ONCE per encounter at
      // disposition. The disposition===null gate above makes this path
      // one-shot per triage, but guard defensively against an "emergency"
      // charge already existing for the encounter (same pattern as the
      // admin-fee guard in finance.ts). No rng.
      let newCharges = state.charges;
      if (enc && !Array.from(state.charges.values()).some(c => c.encounterId === t.encounterId && c.category === "emergency")) {
        const unitPrice = edFee(t.acuity);
        newCharges = appendCharge(new Map(state.charges), clock, t.encounterId, t.patientId,
          "emergency", `ED visit (acuity ${t.acuity})`, undefined,
          { code: `ED-P${t.acuity}`, unitPrice, quantity: 1 });
      }

      return { ...state, edTriages: newTriages, encounters: newEncounters, charges: newCharges };
    }
  }
  return state;
}
