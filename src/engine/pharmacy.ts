import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { MedicationOrder } from "../patient/schema.js";
import { dispenseItem, getStock } from "./central-supply.js";

/** Drug acquisition costs in IDR (Indonesian e-catalogue, flat prices, no margin) */
export const DRUG_COSTS: Record<string, number> = {
  ACE: 500, MET: 300, ATR: 1000, OMP: 500,
  LVF: 5000, PRC: 200, HEP: 30000, SAL: 50000,
  FUR: 500, DIA: 300,
  AMX: 500, CTR: 15000, MTZ: 2000, CIP: 2000,
  AML: 500, BIS: 500, ASP: 100, INS: 20000,
  OND: 5000, MOR: 5000, KCL: 3000, RL: 15000,
};

const MED_MAP: Record<string, string> = {
  "ACE": "MED-ACE", "MET": "MED-MET", "ATR": "MED-ATR", "OMP": "MED-OMP",
  "LVF": "MED-LVF", "PRC": "MED-PRC", "HEP": "MED-HEP", "SAL": "MED-SAL",
  "FUR": "MED-FUR", "DIA": "MED-DIA",
  "AMX": "MED-AMX", "CTR": "MED-CTR", "MTZ": "MED-MTZ", "CIP": "MED-CIP",
  "AML": "MED-AML", "BIS": "MED-BIS", "ASP": "MED-ASP", "INS": "MED-INS",
  "OND": "MED-OND", "MOR": "MED-MOR", "KCL": "MED-KCL", "RL": "MED-RL",
};

export const MEDICATIONS = [
  { code: "ACE", name: "Enalapril 5mg", dose: "5 mg", route: "PO" },
  { code: "MET", name: "Metformin 500mg", dose: "500 mg", route: "PO" },
  { code: "ATR", name: "Atorvastatin 20mg", dose: "20 mg", route: "PO" },
  { code: "OMP", name: "Omeprazole 20mg", dose: "20 mg", route: "PO" },
  { code: "LVF", name: "Levofloxacin 500mg", dose: "500 mg", route: "IV" },
  { code: "PRC", name: "Paracetamol 500mg", dose: "500 mg", route: "PO" },
  { code: "HEP", name: "Enoxaparin 40mg", dose: "40 mg", route: "SC" },
  { code: "SAL", name: "Salbutamol Inhaler", dose: "100 mcg", route: "INH" },
  { code: "FUR", name: "Furosemide 40mg", dose: "40 mg", route: "IV" },
  { code: "DIA", name: "Diazepam 5mg", dose: "5 mg", route: "PO" },
  { code: "AMX", name: "Amoxicillin 500mg", dose: "500 mg", route: "PO" },
  { code: "CTR", name: "Ceftriaxone 1g", dose: "1 g", route: "IV" },
  { code: "MTZ", name: "Metronidazole 500mg", dose: "500 mg", route: "IV" },
  { code: "CIP", name: "Ciprofloxacin 500mg", dose: "500 mg", route: "PO" },
  { code: "AML", name: "Amlodipine 5mg", dose: "5 mg", route: "PO" },
  { code: "BIS", name: "Bisoprolol 5mg", dose: "5 mg", route: "PO" },
  { code: "ASP", name: "Aspirin 80mg", dose: "80 mg", route: "PO" },
  { code: "INS", name: "Insulin Regular 10U", dose: "10 U", route: "SC" },
  { code: "OND", name: "Ondansetron 4mg", dose: "4 mg", route: "IV" },
  { code: "MOR", name: "Morphine 10mg", dose: "10 mg", route: "IV" },
  { code: "KCL", name: "KCl 20mEq", dose: "20 mEq", route: "IV" },
  { code: "RL", name: "Ringer's Lactate IV", dose: "1000 mL", route: "IV" },
];

const FREQUENCIES = ["QD", "BID", "TID", "QID", "PRN", "STAT"];

export function pharmacyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 5 !== 0) return state;

  const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
  const med = MEDICATIONS[Math.floor(clock.rng() * MEDICATIONS.length)]!;

  const order: MedicationOrder = {
    id: `MED-${clock.tick}-${encounter.patientId}-${med.code}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    medication: { code: med.code, name: med.name, dose: med.dose, route: med.route },
    status: "ordered",
    dose: med.dose,
    route: med.route,
    frequency: FREQUENCIES[Math.floor(clock.rng() * FREQUENCIES.length)]!,
    orderedAt: clock.hospitalTimeMs,
    administeredAt: null,
  };

  const newOrders = new Map(state.medicationOrders);
  newOrders.set(order.id, order);

  // Dispense from central pharmacy stock
  const supplyCode = MED_MAP[med.code];
  if (supplyCode && getStock(state, supplyCode) > 0) {
    state = dispenseItem(state, supplyCode, 1, clock, order.id);
  }

  return { ...state, medicationOrders: newOrders };
}

export function medAdminHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newOrders = new Map(state.medicationOrders);
  for (const [id, order] of newOrders) {
    if (order.status === "ordered" && clock.rng() > 0.6) {
      newOrders.set(id, {
        ...order,
        status: "administered",
        administeredAt: clock.hospitalTimeMs,
      });
    }
  }
  return { ...state, medicationOrders: newOrders };
}
