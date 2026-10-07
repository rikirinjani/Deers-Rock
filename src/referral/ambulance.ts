/**
 * Ambulance dispatch system — Epic IX M9.3 wave 2 (ADR-016 D8).
 *
 * Minimal dispatch state machine:
 * - Fleet of BLS/ALS ambulances
 * - Dispatch on incoming referral letters (by distance band) or ED transfers
 * - Cost calculation: BLS = 200k base + 2k/km; ALS = 500k base + 5k/km
 * - ETA based on speed: BLS 60 km/h, ALS 80 km/h
 * - Derived arrivalMode: "ambulance" iff dispatch exists
 */
export type AmbulanceTier = "BLS" | "ALS";
export type AmbulanceStatus = "available" | "dispatched" | "at-hospital";
export type DispatchStatus = "en-route" | "arrived" | "cancelled";

export interface Ambulance {
  id: string;
  tier: AmbulanceTier;
  status: AmbulanceStatus;
  location: { provinceCode: number; regencyCode: number };
  speedKmh: number;
}

export interface AmbulanceDispatch {
  id: string;
  ambulanceId: string;
  letterId?: string;
  encounterId?: string;
  fromProvinceCode: number;
  toProvinceCode: number;
  distanceKm: number;
  departTick: number;
  etaTick: number;
  costIdr: number;
  status: DispatchStatus;
}

export interface AmbulanceState {
  fleet: Map<string, Ambulance>;
  dispatches: Map<string, AmbulanceDispatch>;
  counter: number;
}

// Domain constants from M9.3-BLOCKER-DECISIONS.md
const BLS_BASE_COST = 200000;
const BLS_PER_KM = 2000;
const ALS_BASE_COST = 500000;
const ALS_PER_KM = 5000;
const BLS_SPEED_KMH = 60;
const ALS_SPEED_KMH = 80;
const TICKS_PER_HOUR = 60; // 1 tick = 1 min

export function initAmbulanceState(): AmbulanceState {
  return {
    fleet: new Map([
      ["AMB-ALS-001", { id: "AMB-ALS-001", tier: "ALS", status: "available", location: { provinceCode: 73, regencyCode: 71 }, speedKmh: ALS_SPEED_KMH }],
      ["AMB-BLS-001", { id: "AMB-BLS-001", tier: "BLS", status: "available", location: { provinceCode: 73, regencyCode: 71 }, speedKmh: BLS_SPEED_KMH }],
      ["AMB-BLS-002", { id: "AMB-BLS-002", tier: "BLS", status: "available", location: { provinceCode: 73, regencyCode: 71 }, speedKmh: BLS_SPEED_KMH }],
    ]),
    dispatches: new Map(),
    counter: 0,
  };
}

/**
 * Dispatch an ambulance for a referral letter.
 * Returns the dispatch ID if successful, null if no ambulance available.
 */
export function dispatchAmbulance(
  state: AmbulanceState,
  fromProvinceCode: number,
  toProvinceCode: number,
  distanceKm: number,
  letterId: string,
  clockTick: number
): string | null {
  // Find available BLS or ALS
  const available = Array.from(state.fleet.values()).find(a => a.status === "available");
  if (!available) return null;

  const costIdr = available.tier === "BLS"
    ? BLS_BASE_COST + BLS_PER_KM * distanceKm
    : ALS_BASE_COST + ALS_PER_KM * distanceKm;

  // ETA in ticks: distance / speed * 60 ticks/hour
  const etaTicks = Math.ceil((distanceKm / available.speedKmh) * TICKS_PER_HOUR);

  state.counter++;
  const dispatchId = `DISP-${String(state.counter).padStart(4, "0")}`;

  const dispatch: AmbulanceDispatch = {
    id: dispatchId,
    ambulanceId: available.id,
    letterId,
    fromProvinceCode,
    toProvinceCode,
    distanceKm,
    departTick: clockTick,
    etaTick: clockTick + etaTicks,
    costIdr,
    status: "en-route",
  };

  state.dispatches.set(dispatchId, dispatch);
  state.fleet.set(available.id, { ...available, status: "dispatched" });

  return dispatchId;
}

/**
 * Advance dispatches to completion. Called by ambulance handler every tick.
 */
export function advanceDispatches(state: AmbulanceState, clockTick: number): AmbulanceState {
  const newFleet = new Map(state.fleet);
  const newDispatches = new Map(state.dispatches);

  for (const [id, dispatch] of newDispatches) {
    if (dispatch.status !== "en-route") continue;
    if (clockTick >= dispatch.etaTick) {
      newDispatches.set(id, { ...dispatch, status: "arrived" });
      // Free the ambulance
      const amb = newFleet.get(dispatch.ambulanceId)!;
      newFleet.set(dispatch.ambulanceId, { ...amb, status: "available" });
    }
  }

  return { ...state, fleet: newFleet, dispatches: newDispatches };
}

/**
 * Check if a dispatch exists for a letter (determines arrivalMode).
 */
export function getDispatchForLetter(state: AmbulanceState, letterId: string): AmbulanceDispatch | undefined {
  for (const d of state.dispatches.values()) {
    if (d.letterId === letterId) return d;
  }
  return undefined;
}

/**
 * Epic IX M9.3 wave 2: ambulance tick handler.
 * Advances dispatches and returns updated state.
 */
import type { HospitalState } from "../engine/state-store.js";
import type { Clock } from "../engine/clock.js";
import type { EventQueue } from "../engine/event-queue.js";

export function ambulanceHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const ambState = (state as unknown as { _ambulanceState?: AmbulanceState })._ambulanceState;
  if (!ambState) return state;
  const updated = advanceDispatches(ambState, clock.tick);
  return Object.assign({}, state, { _ambulanceState: updated }) as HospitalState;
}
