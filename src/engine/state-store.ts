import type { Patient, Bed, Encounter, LabOrder, MedicationOrder, NurseNote, PhysicianOrder, RadiologyOrder, SurgeryOrder, RespiratoryOrder, DietOrder, SocialWorkNote, EdTriage, MedicalChart, Charge, InsuranceClaim, Payment, InventoryItem, StockTransaction } from "../patient/schema.js";
import { centralSupplyInit } from "./central-supply.js";

export interface HospitalState {
  patients: Map<string, Patient>;
  beds: Map<string, Bed>;
  encounters: Map<string, Encounter>;
  wardCapacity: Record<string, number>;
  waitingRoom: number;
  labOrders: Map<string, LabOrder>;
  medicationOrders: Map<string, MedicationOrder>;
  nurseNotes: Map<string, NurseNote>;
  physicianOrders: Map<string, PhysicianOrder>;
  radiologyOrders: Map<string, RadiologyOrder>;
  surgeryOrders: Map<string, SurgeryOrder>;
  respiratoryOrders: Map<string, RespiratoryOrder>;
  dietOrders: Map<string, DietOrder>;
  socialWorkNotes: Map<string, SocialWorkNote>;
  edTriages: Map<string, EdTriage>;
  medicalCharts: Map<string, MedicalChart>;
  charges: Map<string, Charge>;
  insuranceClaims: Map<string, InsuranceClaim>;
  payments: Map<string, Payment>;
  inventory: Map<string, InventoryItem>;
  stockTransactions: Map<string, StockTransaction>;
}

export function createState(patients: Patient[], wardCapacity: Record<string, number> = {}): HospitalState {
  const patientMap = new Map<string, Patient>();
  for (const p of patients) patientMap.set(p.id, p);

  const defaultCapacity = { "Internal Medicine": 30, "Surgery": 20, "Pediatrics": 10, "OBGYN": 10, "ICU": 10, "Telemetry": 15 };
  const capacity = { ...defaultCapacity, ...wardCapacity };

  const beds = new Map<string, Bed>();
  for (const [ward, count] of Object.entries(capacity)) {
    for (let i = 1; i <= count; i++) {
      const bedId = `${ward.replace(/\s+/g, "-")}-${String(i).padStart(2, "0")}`;
      beds.set(bedId, { id: bedId, ward, patientId: null });
    }
  }

  return {
    patients: patientMap, beds, encounters: new Map(), wardCapacity: capacity, waitingRoom: 0,
    labOrders: new Map(), medicationOrders: new Map(), nurseNotes: new Map(),
    physicianOrders: new Map(), radiologyOrders: new Map(), surgeryOrders: new Map(),
    respiratoryOrders: new Map(), dietOrders: new Map(), socialWorkNotes: new Map(),
    edTriages: new Map(),     medicalCharts: new Map(), charges: new Map(), insuranceClaims: new Map(), payments: new Map(),
    inventory: centralSupplyInit(), stockTransactions: new Map(),
  };
}
