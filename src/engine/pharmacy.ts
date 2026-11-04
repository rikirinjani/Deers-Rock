import { getFormulary } from "../locale/registry.js";
import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { MedicationOrder } from "../patient/schema.js";
import { dispenseItem, getStock } from "./central-supply.js";
import { DRUG_CATALOG, activeCatalog, findDrug } from "./drug-catalog.js";
import { isClinicalVitalsEnabled } from "./config.js";
import { noteMedication } from "./treatment-effects.js";

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

type Medication = (typeof MEDICATIONS)[number];
const FORMULARY_VIEWS = new WeakMap<object, Medication[]>();

/**
 * The medications this hospital can order: the catalogue filtered by the
 * active formulary's availability, with its display names. MEDICATIONS (INN
 * names) stays the matching key for protocol labels. For the Indonesian
 * formulary the content equals MEDICATIONS, so random picks are unchanged.
 */
export function formularyMedications(): readonly Medication[] {
  const f = getFormulary();
  let v = FORMULARY_VIEWS.get(f);
  if (!v) {
    v = activeCatalog()
      .map(d => ({ code: d.code, name: d.innName, dose: d.dose, route: d.route }))
      .filter(m => f.isAvailable(m.code))
      .map(m => ({ ...m, name: f.displayName(m.code, m.name) }));
    FORMULARY_VIEWS.set(f, v);
  }
  return v;
}

const FREQUENCIES = ["QD", "BID", "TID", "QID", "PRN", "STAT"];

export function pharmacyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 5 !== 0) return state;

  const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
  const meds = formularyMedications();
  const med = meds[Math.floor(clock.rng() * meds.length)]!;

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
  const supplyCode = MED_MAP[med.code] ?? findDrug(med.code)?.supplyCode;
  if (supplyCode && getStock(state, supplyCode) > 0) {
    state = dispenseItem(state, supplyCode, 1, clock, order.id);
  }

  return { ...state, medicationOrders: newOrders };
}

export function medAdminHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newOrders = new Map(state.medicationOrders);
  const clinical = isClinicalVitalsEnabled();
  let encounters = state.encounters;
  for (const [id, order] of newOrders) {
    if (order.status === "ordered" && clock.rng() > 0.6) {
      newOrders.set(id, {
        ...order,
        status: "administered",
        administeredAt: clock.hospitalTimeMs,
      });
      // P-002 C: record the treatment on the encounter when it is given.
      if (clinical) encounters = noteMedication(encounters, state.encounters, order.encounterId, order.medication.code, clock.tick);
    }
  }
  return encounters === state.encounters ? { ...state, medicationOrders: newOrders } : { ...state, medicationOrders: newOrders, encounters };
}
