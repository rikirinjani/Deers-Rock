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
  "Seizure", "Bleeding", "Allergic reaction", "Syncope", "Medication refill", "Suture removal", "Minor rash",
];

/**
 * ADR-016 D4: ESI-lite triage. Deterministic complaint→base-ESI table, then
 * ONE rng draw per encounter (always drawn, only applied when base==3) for
 * vitals instability uptriade.
 *
 * Level 1: immediate life threat
 * Level 2: high risk / confused / severe pain
 * Level 3: requires multiple resources (base) — may uptriade to 2 on instability
 * Level 4: requires one resource
 * Level 5: non-urgent (new — enables self-referral routing to POLI)
 */
function assignAcuity(complaint: string, rngDraw: number): EdTriage["acuity"] {
  // Level 1: immediate life threat
  if (["Chest pain", "Shortness of breath", "Altered mental status", "Seizure", "Motor vehicle accident"].includes(complaint)) return 1;
  // Level 2: high risk / severe
  if (["Abdominal pain", "Fever", "Bleeding", "Allergic reaction"].includes(complaint)) return 2;
  // Level 3: moderate — one rng draw for vitals instability
  if (["Trauma from fall", "Dizziness", "Nausea and vomiting", "Syncope", "Headache"].includes(complaint)) {
    const instabilityP = 0.15;
    if (rngDraw < instabilityP) return 2; // uptriade
    return 3;
  }
  // Level 4: one resource
  if (["Back pain", "Bleeding"].includes(complaint)) return 4;
  // Level 5: non-urgent (new complaints enable self-referral routing)
  return 5 as EdTriage["acuity"];
}

export function emergencyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick % 3 !== 0) return state;

  const eventCtx = getEventSummary(state._calendarTicks);
  const eventPool = eventCtx.emergencyPool;
  // ADR-016 D4: FIXED draw count — event selection uses 2 draws always,
  // complaint selection uses 1 draw always. Total 3 draws per invocation.
  const useEventPool = eventPool.length > 0 && clock.rng() > 0.5;
  const complaint = useEventPool
    ? eventPool[Math.floor(clock.rng() * eventPool.length)]!
    : COMPLAINTS[Math.floor(clock.rng() * COMPLAINTS.length)]!;
  // ADR-016 D4: ONE rng draw for vitals instability, always drawn (applied only when base==3).
  const instabilityDraw = clock.rng();
  const acuity = assignAcuity(complaint, instabilityDraw);

  // ADR-016 D5: Derived arrivalMode — not a static die roll. Walk-in is default;
  // ambulance/transfer derived from referral context (wave 2 integration point).
  const arrivalMode = "walk-in" as const;

  const patientsArr = Array.from(state.patients.values());
  // Fixed draw: exactly 1 patient selection draw.
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
      // ADR-016 D4: ESI-based routing. ESI 1-2 → admit or observe. ESI 3 →
      // monitor (admit if unstable). ESI 4-5 → fast-track to POLI (self-
      // referral equivalent). This closes the "ED walk-in / self-referral
      // with ESI-based routing" roadmap item.
      const isFastTrack = t.acuity >= 4;
      const admitted = !isFastTrack && (t.acuity <= 2 || clock.rng() > 0.5);
      let disposition: "admitted" | "discharged" | "transferred" = "discharged";
      if (admitted) disposition = "admitted";
      else if (isFastTrack) disposition = "transferred"; // routed to POLI

      newTriages.set(id, {
        ...t,
        disposition,
        dischargedAt: clock.hospitalTimeMs,
      });

      const newEncounters = new Map(state.encounters);
      const enc = newEncounters.get(t.encounterId);
      if (enc) {
        if (admitted) {
          // Admitted ED patient continues as inpatient — encounter stays active.
          newEncounters.set(t.encounterId, { ...enc, endTime: clock.hospitalTimeMs, status: "active" });
        } else if (isFastTrack) {
          // ADR-016 D4: Fast-track — close ED encounter, schedule POLI visit.
          // The POLI visit is created by the outpatient handler on the next
          // tick%4 cycle using the referral letter mechanism (wave 2).
          newEncounters.set(t.encounterId, {
            ...enc,
            endTime: clock.hospitalTimeMs,
            status: "discharged",
            _severityAtClose: computeSeveritySnapshot(state, enc, tickFromMs(clock.hospitalTimeMs)),
          });
        } else {
          // Discharged ED patient — close encounter normally.
          newEncounters.set(t.encounterId, {
            ...enc,
            endTime: clock.hospitalTimeMs,
            status: "discharged",
            _severityAtClose: computeSeveritySnapshot(state, enc, tickFromMs(clock.hospitalTimeMs)),
          });
        }
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
