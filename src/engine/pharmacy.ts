import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { MedicationOrder } from "../patient/schema.js";
import { dispenseItem, getStock } from "./central-supply.js";
import { DRUG_CATALOG } from "./drug-catalog.js";

/** Drug acquisition costs in IDR (Indonesian e-catalogue, flat prices, no margin) */
export const DRUG_COSTS: Record<string, number> = Object.fromEntries(
  DRUG_CATALOG.map(d => [d.code, d.costIdr])
);

const MED_MAP: Record<string, string> = Object.fromEntries(
  DRUG_CATALOG.map(d => [d.code, d.supplyCode])
);

export const MEDICATIONS = DRUG_CATALOG.map(d => ({
  code: d.code,
  name: d.innName,
  dose: d.dose,
  route: d.route,
}));

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
