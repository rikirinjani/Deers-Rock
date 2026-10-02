import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, InsuranceClaim, Payment } from "../patient/schema.js";
import { isBoundedStateEnabled } from "./config.js";

const MAX_LAB = 500;
const MAX_MED = 500;
const MAX_RAD = 500;
const MAX_PHYSICIAN = 500;
const MAX_SURG = 100;
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
/** Performance: prune completed encounters (main driver of per-tick latency) */
const MAX_ENCOUNTERS = 500;

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

export function cleanupHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick > 0 && clock.tick % 10 !== 0) return state;
  const pruned: HospitalState = {
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
    encounters: pruneOldest(state.encounters, MAX_ENCOUNTERS, o => o.status !== "active" && o.endTime !== null, o => o.endTime ?? o.startTime),
  };
  // ADR-004 D2 — bounded growth: TTL pruning for the two slow-growing
  // clinical collections (flag-gated; no-op when OFF or off-cadence).
  // Charges are pruned in finance.ts, NOT here; every other collection keeps
  // exactly the MAX-cap behavior above (scope rule: encounters/charts/patients
  // and the already-capped notes/orders are excluded).
  return pruneAgedOrders(pruned, clock);
}

/**
 * ADR-004 D2 — bounded growth: prune physicianOrders + socialWorkNotes older
 * than TTL ticks (pure age rule — no status gate; socialWorkNotes have no
 * status, and aged active orders are stale documentation, not live work).
 *
 * Age is derived deterministically from `clock` (orderedAt/timestamp are
 * hospital-time ms; 1 tick = tickIntervalMs * speedMultiplier ms) — never
 * wall-clock. No rng() is consumed, none reordered. Flags OFF (or an
 * off-cadence tick) returns the input state UNTOUCHED (same reference).
 *
 * PERFORMANCE: these scans run at most every PRUNE_EVERY_TICKS ticks — never
 * an O(n) scan per tick (cleanupHandler itself already runs every 10 ticks;
 * the bounded pass inside it is further gated to every 100).
 *
 * Steady-state sizing: physicianOrders grow sub-linearly (~330 over 5k ticks
 * in the seed-42 pilot) and socialWorkNotes ~80 over 5k ticks; TTL 5000 ticks
 * bounds each collection near one TTL window of arrivals.
 */
const PRUNE_EVERY_TICKS = 100;
const DEFAULT_ORDERS_TTL_TICKS = 5000;

function ordersTtlTicks(): number {
  const raw = Number(process.env.DR_PRUNE_TTL_ORDERS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_ORDERS_TTL_TICKS;
}

/** Hospital-time ms → tick, same convention as respiratory.ts/dietary.ts. */
function ticksFromMs(hospitalTimeMs: number, msPerTick: number): number {
  return Math.floor(hospitalTimeMs / msPerTick);
}

function pruneAgedOrders(state: HospitalState, clock: Clock): HospitalState {
  if (!isBoundedStateEnabled()) return state;
  if (clock.tick <= 0 || clock.tick % PRUNE_EVERY_TICKS !== 0) return state;
  if (state.physicianOrders.size === 0 && state.socialWorkNotes.size === 0) return state;

  const ttl = ordersTtlTicks();
  const msPerTick = clock.tickIntervalMs * clock.speedMultiplier;
  if (!(msPerTick > 0)) return state;
  const nowTick = ticksFromMs(clock.hospitalTimeMs, msPerTick);

  let physicianOrders = state.physicianOrders;
  let socialWorkNotes = state.socialWorkNotes;

  const agedPhys = Array.from(physicianOrders.entries())
    .filter(([, o]) => nowTick - ticksFromMs(o.orderedAt, msPerTick) > ttl);
  if (agedPhys.length > 0) {
    physicianOrders = new Map(physicianOrders);
    for (const [id] of agedPhys) physicianOrders.delete(id);
  }

  const agedSocial = Array.from(socialWorkNotes.entries())
    .filter(([, n]) => nowTick - ticksFromMs(n.timestamp, msPerTick) > ttl);
  if (agedSocial.length > 0) {
    socialWorkNotes = new Map(socialWorkNotes);
    for (const [id] of agedSocial) socialWorkNotes.delete(id);
  }

  if (physicianOrders === state.physicianOrders && socialWorkNotes === state.socialWorkNotes) return state;
  return { ...state, physicianOrders, socialWorkNotes };
}
