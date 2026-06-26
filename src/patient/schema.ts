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

export interface LabOrder {
  id: string;
  encounterId: string;
  patientId: string;
  testName: string;
  testCode: string;
  status: "ordered" | "collected" | "processing" | "resulted";
  result: string | null;
  referenceRange: string;
  unit: string;
  orderedAt: number;
  resultedAt: number | null;
}

export interface MedicationOrder {
  id: string;
  encounterId: string;
  patientId: string;
  medication: Medication;
  status: "ordered" | "dispensed" | "administered" | "discontinued";
  dose: string;
  route: string;
  frequency: string;
  orderedAt: number;
  administeredAt: number | null;
}

export interface NurseNote {
  id: string;
  encounterId: string;
  patientId: string;
  noteType: "assessment" | "round" | "procedure" | "observation";
  content: string;
  timestamp: number;
}

export interface PhysicianOrder {
  id: string;
  encounterId: string;
  patientId: string;
  orderType: "medication" | "lab" | "imaging" | "consult" | "discharge";
  description: string;
  status: "active" | "completed" | "cancelled";
  orderedAt: number;
  completedAt: number | null;
}

export interface RadiologyOrder {
  id: string;
  encounterId: string;
  patientId: string;
  studyType: string;
  status: "ordered" | "scheduled" | "completed" | "resulted";
  finding: string | null;
  orderedAt: number;
  resultedAt: number | null;
}
