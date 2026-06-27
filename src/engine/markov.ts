import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { generatePatient } from "../patient/generator.js";
import { getEventSummary } from "./calendar.js";

export type StateHandler = (state: HospitalState, clock: Clock, queue: EventQueue) => HospitalState;

export function admissionHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const availableBeds = Array.from(state.beds.values()).filter(b => b.patientId === null);
  const occupancyRate = 1 - (availableBeds.length / state.beds.size);

  if (availableBeds.length === 0) {
    return { ...state, waitingRoom: state.waitingRoom + 1 };
  }

  const eventCtx = getEventSummary(state._calendarTicks);
  const surge = eventCtx.totalMultiplier > 1.3;
  if (occupancyRate >= 0.85 && !surge && Math.random() > 0.3) {
    return state;
  }
  if (surge) {
    const extraBeds = Math.floor(availableBeds.length * 0.1);
    if (extraBeds <= 0) {
      return { ...state, waitingRoom: state.waitingRoom + 2 };
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

  const toAdmit = Math.min(availableBeds.length, Math.max(1, Math.floor(Math.random() * 3)));
  let newBeds = new Map(state.beds);
  let newEncounters = new Map(state.encounters);

  for (let i = 0; i < toAdmit && i < admitablePatients.length; i++) {
    const patient = admitablePatients[i]!;
    const freeBed = Array.from(newBeds.values()).find(b => b.patientId === null);
    if (!freeBed) break;

    newBeds.set(freeBed.id, { ...freeBed, patientId: patient.id });

    const encounter = {
      id: `ENC-${clock.tick}-${patient.id}`,
      patientId: patient.id,
      type: (Math.random() > 0.7 ? "emergency" : "admission") as "admission" | "emergency",
      startTime: clock.hospitalTimeMs,
      endTime: null as number | null,
      status: "active" as const,
    };
    newEncounters.set(encounter.id, encounter);

    const dischargeDelay = 4 + Math.floor(Math.random() * 8);
    queue.schedule("discharge", clock.tick + dischargeDelay, { patientId: patient.id, encounterId: encounter.id, bedId: freeBed.id });
  }

  return { ...state, beds: newBeds, encounters: newEncounters };
}

export function dischargeHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values())
    .filter(e => e.status === "active")
    .sort((a, b) => {
      const pa = state.patients.get(a.patientId);
      const pb = state.patients.get(b.patientId);
      return (pa?.age ?? 0) - (pb?.age ?? 0);
    });

  if (activeEncounters.length === 0) return state;

  const dischargeCount = Math.min(activeEncounters.length, Math.max(1, Math.floor(activeEncounters.length * 0.15)));
  let newEncounters = new Map(state.encounters);
  let newBeds = new Map(state.beds);

  for (let i = 0; i < dischargeCount; i++) {
    const idx = Math.floor(Math.random() * activeEncounters.length);
    const toDischarge = activeEncounters[idx]!;

    newEncounters.set(toDischarge.id, {
      ...toDischarge,
      endTime: clock.hospitalTimeMs,
      status: "discharged",
    });

    for (const [bid, bed] of newBeds) {
      if (bed.patientId === toDischarge.patientId) {
        newBeds.set(bid, { ...bed, patientId: null });
        break;
      }
    }
    activeEncounters.splice(idx, 1);
  }

  let wr = state.waitingRoom;
  if (wr > 0) {
    const newlyFree = Array.from(newBeds.values()).filter(b => b.patientId === null).length - Array.from(state.beds.values()).filter(b => b.patientId === null).length;
    wr = Math.max(0, wr - newlyFree);
  }

  return { ...state, beds: newBeds, encounters: newEncounters, waitingRoom: wr };
}

export function newPatientHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick > 0 && clock.tick % 15 === 0) {
    const newCount = 1 + Math.floor(Math.random() * 3);
    let newPatients = new Map(state.patients);
    for (let i = 0; i < newCount; i++) {
      const fresh = generatePatient();
      fresh.id = `PAT-${clock.tick}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
      newPatients.set(fresh.id, fresh);
    }
    return { ...state, patients: newPatients };
  }
  return state;
}

export function vitalsUpdateHandler(state: HospitalState, _clock: Clock, _queue: EventQueue): HospitalState {
  const newPatients = new Map(state.patients);
  for (const [id, patient] of newPatients) {
    const drift = () => Math.floor(Math.random() * 6) - 3;
    const tempDrift = (Math.random() * 0.4) - 0.2;
    newPatients.set(id, {
      ...patient,
      vitals: {
        heartRate: Math.max(50, Math.min(120, patient.vitals.heartRate + drift())),
        bloodPressureSystolic: Math.max(90, Math.min(180, patient.vitals.bloodPressureSystolic + drift() * 2)),
        bloodPressureDiastolic: Math.max(60, Math.min(120, patient.vitals.bloodPressureDiastolic + drift())),
        temperature: Math.max(35, Math.min(39.5, +(patient.vitals.temperature + tempDrift).toFixed(1))),
        oxygenSaturation: Math.max(90, Math.min(100, patient.vitals.oxygenSaturation + drift())),
        respiratoryRate: Math.max(10, Math.min(30, patient.vitals.respiratoryRate + drift())),
        painLevel: Math.max(0, Math.min(10, patient.vitals.painLevel + (Math.random() > 0.5 ? 1 : -1))),
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
