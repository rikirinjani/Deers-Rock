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

  const admitablePatients = Array.from(state.patients.values())
    .filter(p => !activePatientIds.has(p.id))
    .sort((a, b) => {
      const la = getLastDischargeTick(state, a.id);
      const lb = getLastDischargeTick(state, b.id);
      return la - lb;
    });

  if (admitablePatients.length === 0) return state;

  const toAdmit = Math.min(availableBeds.length, Math.max(1, Math.floor(clock.rng() * 3)));
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
      payer: assignPayer(patient),
      primaryDiagnosis: selectPrimaryDiagnosisCode(patient),
    };
    newEncounters.set(encounter.id, encounter);

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
      newMorgue.push({
        patientId: toDischarge.patientId, encounterId: toDischarge.id,
        primaryDiagnosis: primaryDx.name, icdCode: primaryDx.code,
        age: patient.age, gender: patient.gender,
        causeOfDeath: cause, mortalityScore: mortality.score, deathTick: clock.tick,
      });
    }

    newEncounters.set(encounterId, { ...toDischarge, endTime: clock.hospitalTimeMs, status: "discharged" });

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

  return { ...state, beds: newBeds, encounters: newEncounters, waitingRoom: wr, morgue: newMorgue };
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
