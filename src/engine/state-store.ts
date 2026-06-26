import type { Patient, Bed, Encounter } from "../patient/schema.js";

export interface HospitalState {
  patients: Map<string, Patient>;
  beds: Map<string, Bed>;
  encounters: Map<string, Encounter>;
  wardCapacity: Record<string, number>;
  waitingRoom: number;
}

export function createState(patients: Patient[], wardCapacity: Record<string, number> = {}): HospitalState {
  const patientMap = new Map<string, Patient>();
  for (const p of patients) {
    patientMap.set(p.id, p);
  }

  const defaultCapacity = { "Internal Medicine": 20, "Surgery": 15, "Pediatrics": 10, "OBGYN": 10, "ICU": 5 };
  const capacity = { ...defaultCapacity, ...wardCapacity };

  const beds = new Map<string, Bed>();
  for (const [ward, count] of Object.entries(capacity)) {
    for (let i = 1; i <= count; i++) {
      const bedId = `${ward.replace(/\s+/g, "-")}-${String(i).padStart(2, "0")}`;
      beds.set(bedId, { id: bedId, ward, patientId: null });
    }
  }

  return {
    patients: patientMap,
    beds,
    encounters: new Map(),
    wardCapacity: capacity,
    waitingRoom: 0,
  };
}
