import type { HospitalState, MorgueRecord } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { generatePatient } from "../patient/generator.js";
import type { Patient } from "../patient/schema.js";
import { getEventSummary } from "./calendar.js";
import { assessMortalityRisk, mapIcdToTerminalEvent } from "./clinical-knowledge.js";
import { mapIcdToSpecialty } from "./clinical-knowledge.js";
import { getScenarioEffects } from "./scenario.js";
import { assignPayer } from "./finance.js";
import { computeSeveritySnapshot, tickFromMs } from "./encounter-insights.js";
import type { HospitalAgent } from "../agent/types.js";
import { recordDischargePlan } from "./discharge-planning.js";
import { recordConsumption } from "./dept-consumption.js";
import { registerBody } from "./kamar-jenazah.js";

/**
 * Phase D: deterministic principal-diagnosis selection for an encounter.
 * Rule: first ACTIVE diagnosis of the patient's problem list (insertion
 * order = generation order); fallback first diagnosis; "UNKNOWN" only when
 * the patient carries no diagnosis at all (the generator always assigns at
 * least one, so that branch is a safety net). No RNG involved.
 */
export function selectPrimaryDiagnosisCode(patient: Patient | undefined): string {
  if (!patient) return "UNKNOWN";
  const active = patient.diagnoses.find(d => d.active);
  const chosen = active ?? patient.diagnoses[0];
  return chosen ? chosen.code : "UNKNOWN";
}

const SPECIALTY_TO_WARD: Record<string, string> = {
  cardiology: "Cardiology", neurology: "Neurology", pulmonology: "Pulmonology",
  pediatrics: "Pediatrics", obgyn: "OBGYN", psychiatry: "Internal Medicine",
  rehab_medik: "Internal Medicine", anesthesiology: "ICU", hemodialysis: "Internal Medicine",
  endoscopy: "Internal Medicine", pathology_anatomy: "Internal Medicine",
  forensic: "Internal Medicine", ophthalmology: "Internal Medicine",
  ent: "Internal Medicine", dermatology: "Internal Medicine", dentistry: "Internal Medicine",
  surgery: "ICU",
};

export type StateHandler = (state: HospitalState, clock: Clock, queue: EventQueue) => HospitalState;

export function admissionHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const availableBeds = Array.from(state.beds.values()).filter(b => b.patientId === null);
  const occupancyRate = 1 - (availableBeds.length / state.beds.size);

  const eventCtx = getEventSummary(state._calendarTicks);
  const scenarioEff = getScenarioEffects(state._scenario ?? { active: null, history: [], cooldownTicks: 0 });
  const surge = eventCtx.totalMultiplier > 1.3 || scenarioEff.surgeMultiplier > 1.5;
  if (occupancyRate >= 0.85 && !surge && clock.rng() > 0.3) {
    return state;
  }
  if (surge) {
    const extraBeds = Math.floor(availableBeds.length * (scenarioEff.surgeMultiplier > 2 ? 0.2 : 0.1));
    if (extraBeds <= 0) {
      return { ...state, waitingRoom: state.waitingRoom + Math.round(scenarioEff.surgeMultiplier) };
    }
  }

  const activePatientIds = new Set(
    Array.from(state.encounters.values())
      .filter(e => e.status === "active")
      .map(e => e.patientId)
  );
  // Epic VI M6.2: exclude deceased patients (morgueId !== null)
  const deceasedIds = new Set(
    Array.from(state.patients.values())
      .filter(p => p.morgueId !== null)
      .map(p => p.id)
  );

  const admitablePatients = Array.from(state.patients.values())
    .filter(p => !activePatientIds.has(p.id) && !deceasedIds.has(p.id))
    .sort((a, b) => {
      const la = getLastDischargeTick(state, a.id);
      const lb = getLastDischargeTick(state, b.id);
      return la - lb;
    });

  if (admitablePatients.length === 0) return state;

  // Phase E: macro→micro coupling — admission_surge multiplier from Kronos adapter.
  // Epic I M1.4 throughput balance: base count is 1-3 (min 1 admission per tick when
  // beds are available) and the total scales with DR_ADMISSION_RATE (default 2.0)
  // so occupancy reaches meaningful levels. Unset/invalid env falls back to 2.0.
  const baseAdmit = Math.floor(clock.rng() * 3) + 1; // min 1 admission per tick when beds available
  const admissionRate = Number(process.env.DR_ADMISSION_RATE) || 2.0;
  const scaledAdmit = Math.floor(baseAdmit * state._admissionMultiplier * admissionRate);
  const toAdmit = Math.min(availableBeds.length, Math.max(1, scaledAdmit));
  let newBeds = new Map(state.beds);
  let newEncounters = new Map(state.encounters);

  for (let i = 0; i < toAdmit && i < admitablePatients.length; i++) {
    const patient = admitablePatients[i]!;

    const primaryDx = patient.diagnoses.find(d => d.active);
    const targetSpecialty = primaryDx ? mapIcdToSpecialty(primaryDx.code) : undefined;
    const targetWard = targetSpecialty ? SPECIALTY_TO_WARD[targetSpecialty] : undefined;
    let freeBed = targetWard
      ? Array.from(newBeds.values()).find(b => b.patientId === null && b.ward === targetWard)
      : undefined;
    if (!freeBed) freeBed = Array.from(newBeds.values()).find(b => b.patientId === null);
    if (!freeBed) break;

    newBeds.set(freeBed.id, { ...freeBed, patientId: patient.id });

    const encounter = {
      id: `ENC-${clock.tick}-${patient.id}`,
      patientId: patient.id,
      type: "inpatient" as const,
      startTime: clock.hospitalTimeMs,
      endTime: null as number | null,
      status: "active" as const,
      payer: assignPayer(patient, clock.rng),
      primaryDiagnosis: selectPrimaryDiagnosisCode(patient),
      // ADR-015 D2: stamp the room class ONCE at bed assignment. Per-day room
      // billing (finance.ts) reads this stamp; absent on outpatient/ED
      // encounters, which gates them out of room charges. No rng.
      roomClassAtAdmission: freeBed.roomClass,
    };
    newEncounters.set(encounter.id, encounter);

    // Epic VI M6.1: Assign attending doctor based on specialty
    const agentState = (state as unknown as { _agentState?: { pool: { agents: Map<string, HospitalAgent>; assignments: Map<string, string> } } })._agentState;
    if (agentState) {
      const dept = targetSpecialty ? (targetSpecialty === "pulmonology" ? "PARU" : targetSpecialty === "pediatrics" ? "ANAK" : targetSpecialty === "obgyn" ? "OBGYN" : targetSpecialty === "neurology" ? "SARAF" : targetSpecialty === "cardiology" ? "JANTUNG" : "PENYAKIT_DALAM") : "DOKTER";
      const candidates = Array.from(agentState.pool.agents.values())
        .filter(a => a.department === dept && a.status.inShift && a.status.kesehatan !== "sakit_berat" && a.status.kesehatan !== "sakit_ringan")
        .sort((a, b) => {
          const countA = Array.from(agentState.pool.assignments.values()).filter(v => v === a.id).length;
          const countB = Array.from(agentState.pool.assignments.values()).filter(v => v === b.id).length;
          return countA - countB;
        });
      if (candidates.length > 0) {
        agentState.pool.assignments.set(encounter.id, candidates[0]!.id);
      }
      // Assign a nurse
      const nurseCandidates = Array.from(agentState.pool.agents.values())
        .filter(a => a.department === "KEPERAWATAN" && a.status.inShift && a.status.kesehatan !== "sakit_berat" && a.status.kesehatan !== "sakit_ringan")
        .sort((a, b) => {
          const countA = Array.from(agentState.pool.assignments.values()).filter(v => v === a.id).length;
          const countB = Array.from(agentState.pool.assignments.values()).filter(v => v === b.id).length;
          return countA - countB;
        });
      if (nurseCandidates.length > 0) {
        const nurseId = nurseCandidates[0]!.id;
        const nurseAssignKey = `ENC-NURSE-${encounter.id}`;
        agentState.pool.assignments.set(nurseAssignKey, nurseId);
      }
    }

    const dischargeDelay = 4320 + Math.floor(clock.rng() * 5760);  // 3-7 days (avg 5)
    queue.schedule("discharge", clock.tick + dischargeDelay, { patientId: patient.id, encounterId: encounter.id, bedId: freeBed.id });
  }

  return { ...state, beds: newBeds, encounters: newEncounters };
}

export function dischargeScheduledPatients(state: HospitalState, clock: Clock, scheduled: { patientId?: string; encounterId?: string }[]): HospitalState {
  if (scheduled.length === 0) return state;
  let newEncounters = new Map(state.encounters);
  let newBeds = new Map(state.beds);
  let newMorgue = [...(state.morgue || [])];
  let newPatients = new Map(state.patients);

  for (const evt of scheduled) {
    const encounterId = evt.encounterId;
    if (!encounterId) continue;
    const toDischarge = newEncounters.get(encounterId);
    if (!toDischarge || toDischarge.status !== "active") continue;

    const patient = state.patients.get(toDischarge.patientId);
    const mortality = patient ? assessMortalityRisk(patient.age, patient.vitals, patient.diagnoses) : { score: 0, risk: "low" as const, factors: [] as string[] };
    const scenarioEff = getScenarioEffects(state._scenario ?? { active: null, history: [], cooldownTicks: 0 });
    const deathRoll = mortality.risk === "high" ? 0.35 : mortality.risk === "moderate" ? 0.1 : 0.02;
    const dies = clock.rng() < (deathRoll + scenarioEff.mortalityBoost);

    if (dies && patient) {
      const activeDx = patient.diagnoses.filter(d => d.active);
      const primaryDx = activeDx[0] || { code: "Z00.0", name: "General examination" };
      const terminalEvent = mapIcdToTerminalEvent(primaryDx.code, clock.rng);
      const cause = mortality.factors.length > 0 ? mortality.factors.join("; ") : (terminalEvent ?? `${primaryDx.name} complication`);
      const morgueRecord: MorgueRecord = {
        patientId: toDischarge.patientId, encounterId: toDischarge.id,
        primaryDiagnosis: primaryDx.name, icdCode: primaryDx.code,
        age: patient.age, gender: patient.gender,
        causeOfDeath: cause, mortalityScore: mortality.score, deathTick: clock.tick,
      };
      newMorgue.push(morgueRecord);
      // Register body in kamar jenazah
      registerBody(state, morgueRecord, clock.tick);
      // Mark patient as deceased — permanently excluded from admission
      const deceasedPatient = newPatients.get(toDischarge.patientId);
      if (deceasedPatient) {
        const morgueId = `MORG-${String(newMorgue.length).padStart(4, "0")}`;
        newPatients.set(toDischarge.patientId, { ...deceasedPatient, morgueId });
      }
    }

    newEncounters.set(encounterId, {
      ...toDischarge,
      endTime: clock.hospitalTimeMs,
      status: "discharged",
      // Issue #5 (Oracle F1): freeze severity ONCE at close time from the
      // respiratoryOrders still present (cleanup.ts prunes discontinued ones,
      // MAX_RESP=50 — live derivation would decay toward 0 over poll time).
      // Pure computation: no rng, no tick-loop behavior change (additive).
      _severityAtClose: computeSeveritySnapshot(state, toDischarge, tickFromMs(clock.hospitalTimeMs)),
    });

    // Epic VI M6.2: Rujuk balik — ONLY for living patients with chronic conditions
    if (!dies) {
      recordDischargePlan(state, toDischarge, clock.tick);
    }

    // Epic VI M6.3: Record department consumption for charged items
    const los = toDischarge.endTime ? Math.floor((toDischarge.endTime - toDischarge.startTime) / 60000) : 0;
    if (toDischarge.roomClassAtAdmission) {
      recordConsumption(state, toDischarge.roomClassAtAdmission.replace(/-/g, "_").toUpperCase(), "BED_DAY", los, clock.tick);
    }

    for (const [bid, bed] of newBeds) {
      if (bed.patientId === toDischarge.patientId) {
        newBeds.set(bid, { ...bed, patientId: null });
        break;
      }
    }
  }

  let wr = state.waitingRoom;
  if (wr > 0 && scheduled.length > 0) {
    const newlyFree = Array.from(newBeds.values()).filter(b => b.patientId === null).length - Array.from(state.beds.values()).filter(b => b.patientId === null).length;
    wr = Math.max(0, wr - newlyFree);
  }

  return { ...state, beds: newBeds, encounters: newEncounters, waitingRoom: wr, morgue: newMorgue, patients: newPatients };
}

export function newPatientHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick > 0 && clock.tick % 15 === 0) {
    const newCount = 1 + Math.floor(clock.rng() * 3);
    let newPatients = new Map(state.patients);
    for (let i = 0; i < newCount; i++) {
      const fresh = generatePatient(clock.rng);
      fresh.id = `PAT-${clock.tick}-${String(Math.floor(clock.rng() * 9999)).padStart(4, "0")}`;
      newPatients.set(fresh.id, fresh);
    }
    return { ...state, patients: newPatients };
  }
  return state;
}

export function vitalsUpdateHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newPatients = new Map(state.patients);
  for (const [id, patient] of newPatients) {
    const drift = () => Math.floor(clock.rng() * 6) - 3;
    const tempDrift = (clock.rng() * 0.4) - 0.2;
    newPatients.set(id, {
      ...patient,
      vitals: {
        heartRate: Math.max(50, Math.min(120, patient.vitals.heartRate + drift())),
        bloodPressureSystolic: Math.max(90, Math.min(180, patient.vitals.bloodPressureSystolic + drift() * 2)),
        bloodPressureDiastolic: Math.max(60, Math.min(120, patient.vitals.bloodPressureDiastolic + drift())),
        temperature: Math.max(35, Math.min(39.5, +(patient.vitals.temperature + tempDrift).toFixed(1))),
        oxygenSaturation: Math.max(90, Math.min(100, patient.vitals.oxygenSaturation + drift())),
        respiratoryRate: Math.max(10, Math.min(30, patient.vitals.respiratoryRate + drift())),
        painLevel: Math.max(0, Math.min(10, patient.vitals.painLevel + (clock.rng() > 0.5 ? 1 : -1))),
      },
    });
  }
  return { ...state, patients: newPatients };
}

function getLastDischargeTick(state: HospitalState, patientId: string): number {
  let last = 0;
  for (const e of state.encounters.values()) {
    if (e.patientId === patientId && e.endTime !== null) {
      const tick = Math.floor(e.endTime / 60000);
      if (tick > last) last = tick;
    }
  }
  return last;
}
