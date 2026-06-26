import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export type StateHandler = (state: HospitalState, clock: Clock, queue: EventQueue) => HospitalState;

export function admissionHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const availableBeds = Array.from(state.beds.values()).filter(b => b.patientId === null);
  if (availableBeds.length === 0) {
    return { ...state, waitingRoom: state.waitingRoom + 1 };
  }

  const unencounteredPatients = Array.from(state.patients.values()).filter(
    p => !Array.from(state.encounters.values()).some(e => e.patientId === p.id)
  );

  if (unencounteredPatients.length === 0) return state;

  const patient = unencounteredPatients[0]!;
  const bed = availableBeds[0]!;

  const newBeds = new Map(state.beds);
  newBeds.set(bed.id, { ...bed, patientId: patient.id });

  const encounter: import("../patient/schema.js").Encounter = {
    id: `ENC-${clock.tick}-${patient.id}`,
    patientId: patient.id,
    type: Math.random() > 0.7 ? "emergency" : "admission",
    startTime: clock.hospitalTimeMs,
    endTime: null,
    status: "active",
  };

  const newEncounters = new Map(state.encounters);
  newEncounters.set(encounter.id, encounter);

  const dischargeDelay = 5 + Math.floor(Math.random() * 20);
  queue.schedule("discharge", clock.tick + dischargeDelay, { patientId: patient.id, encounterId: encounter.id, bedId: bed.id });

  return {
    ...state,
    beds: newBeds,
    encounters: newEncounters,
  };
}

export function dischargeHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0) return state;

  const toDischarge = activeEncounters[Math.floor(Math.random() * activeEncounters.length)]!;

  const newEncounters = new Map(state.encounters);
  newEncounters.set(toDischarge.id, { ...toDischarge, endTime: clock.hospitalTimeMs, status: "discharged" });

  const newBeds = new Map(state.beds);
  for (const [id, bed] of newBeds) {
    if (bed.patientId === toDischarge.patientId) {
      newBeds.set(id, { ...bed, patientId: null });
      break;
    }
  }

  return { ...state, beds: newBeds, encounters: newEncounters };
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
      },
    });
  }
  return { ...state, patients: newPatients };
}
