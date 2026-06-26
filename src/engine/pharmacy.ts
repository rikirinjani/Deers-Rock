import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { MedicationOrder } from "../patient/schema.js";
import { dispenseItem, getStock } from "./central-supply.js";

const MED_MAP: Record<string, string> = {
  "ACE": "MED-ACE", "MET": "MED-MET", "ATR": "MED-ATR", "OMP": "MED-OMP",
  "LVF": "MED-LVF", "PRC": "MED-PRC", "HEP": "MED-HEP", "SAL": "MED-SAL",
  "FUR": "MED-FUR", "DIA": "MED-DIA",
};

const MEDS = [
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
];

const FREQUENCIES = ["QD", "BID", "TID", "QID", "PRN", "STAT"];

export function pharmacyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 5 !== 0) return state;

  const encounter = activeEncounters[Math.floor(Math.random() * activeEncounters.length)]!;
  const med = MEDS[Math.floor(Math.random() * MEDS.length)]!;

  const order: MedicationOrder = {
    id: `MED-${clock.tick}-${encounter.patientId}-${med.code}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    medication: { code: med.code, name: med.name, dose: med.dose, route: med.route },
    status: "ordered",
    dose: med.dose,
    route: med.route,
    frequency: FREQUENCIES[Math.floor(Math.random() * FREQUENCIES.length)]!,
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
    if (order.status === "ordered" && Math.random() > 0.6) {
      newOrders.set(id, {
        ...order,
        status: "administered",
        administeredAt: clock.hospitalTimeMs,
      });
    }
  }
  return { ...state, medicationOrders: newOrders };
}
