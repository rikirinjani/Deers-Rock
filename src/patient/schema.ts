export type Gender = "male" | "female";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  vitals: Vitals;
  diagnoses: Diagnosis[];
  medications: Medication[];
}

export interface Vitals {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  oxygenSaturation: number;
}

export interface Diagnosis {
  code: string;
  name: string;
  active: boolean;
}

export interface Medication {
  code: string;
  name: string;
  dose: string;
  route: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  type: "admission" | "outpatient" | "emergency";
  startTime: number;
  endTime: number | null;
  status: "active" | "discharged" | "transferred";
}

export interface Bed {
  id: string;
  ward: string;
  patientId: string | null;
}
