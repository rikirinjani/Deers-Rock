import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, InsuranceClaim, Payment } from "../patient/schema.js";

const MAX_LAB = 200;
const MAX_MED = 200;
const MAX_RAD = 200;
const MAX_PHYSICIAN = 200;
const MAX_SURG = 50;
const MAX_RESP = 50;
const MAX_DIET = 50;
const MAX_ED = 100;
const MAX_CHART = 100;
const MAX_SPEC = 100;
const MAX_STOCK = 100;
const MAX_SOCIAL = 100;
/** Constitution IV §4.2 */
const MAX_NURSING = 300;
const MAX_CHARGES = 100;
const MAX_CLAIMS = 100;
const MAX_PAYMENTS = 50;

function pruneOldest<K, V>(map: Map<K, V>, max: number, predicate: (v: V) => boolean, sortKey: (v: V) => number): Map<K, V> {
  if (map.size <= max) return map;
  const candidates = Array.from(map.entries()).filter(([, v]) => predicate(v));
  if (candidates.length === 0) return map;
  candidates.sort((a, b) => sortKey(a[1]) - sortKey(b[1]));
  const toRemove = candidates.slice(0, Math.min(candidates.length, map.size - max));
  const r = new Map(map);
  for (const [k] of toRemove) r.delete(k);
  return r;
}

export function cleanupHandler(state: HospitalState, _clock: Clock, _queue: EventQueue): HospitalState {
  return {
    ...state,
    labOrders: pruneOldest(state.labOrders, MAX_LAB, o => o.status === "resulted", o => o.orderedAt),
    medicationOrders: pruneOldest(state.medicationOrders, MAX_MED, o => o.status === "administered" || o.status === "discontinued", o => o.orderedAt),
    radiologyOrders: pruneOldest(state.radiologyOrders, MAX_RAD, o => o.status === "resulted", o => o.orderedAt),
    physicianOrders: pruneOldest(state.physicianOrders, MAX_PHYSICIAN, o => o.status === "completed", o => o.orderedAt),
    surgeryOrders: pruneOldest(state.surgeryOrders, MAX_SURG, o => o.status === "completed" || o.status === "cancelled", o => o.scheduledAt),
    respiratoryOrders: pruneOldest(state.respiratoryOrders, MAX_RESP, o => o.status === "discontinued", o => o.orderedAt),
    dietOrders: pruneOldest(state.dietOrders, MAX_DIET, o => o.status === "discontinued", o => o.orderedAt),
    edTriages: pruneOldest(state.edTriages, MAX_ED, o => o.disposition !== null, o => o.triagedAt),
    medicalCharts: pruneOldest(state.medicalCharts, MAX_CHART, o => o.status === "completed" || o.status === "coded", o => o.createdAt),
    specialtyOrders: pruneOldest(state.specialtyOrders, MAX_SPEC, o => o.status === "completed", o => o.orderedAt),
    socialWorkNotes: pruneOldest(state.socialWorkNotes, MAX_SOCIAL, () => true, o => o.timestamp),
    stockTransactions: pruneOldest(state.stockTransactions, MAX_STOCK, () => true, o => o.timestamp),
    nurseNotes: pruneOldest(state.nurseNotes, MAX_NURSING, () => true, o => o.timestamp),
    charges: pruneOldest(state.charges, MAX_CHARGES, (o: Charge) => o.paid, o => o.billedAt),
    insuranceClaims: pruneOldest(state.insuranceClaims, MAX_CLAIMS, (o: InsuranceClaim) => o.status === "paid" || o.status === "denied", o => o.submittedAt),
    payments: pruneOldest(state.payments, MAX_PAYMENTS, () => true, o => o.paidAt),
  };
}
