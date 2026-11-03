/**
 * Ambulance dispatch system — Epic IX M9.3 wave 2 (ADR-016 D8).
 *
 * Minimal dispatch state machine:
 * - Fleet of BLS/ALS ambulances
 * - Dispatch on incoming referral letters (by distance band) or ED transfers
 * - Cost calculation: price book ambulance(tier, km); Indonesian default BLS = 200k base + 2k/km; ALS = 500k base + 5k/km
 * - ETA based on speed: BLS 60 km/h, ALS 80 km/h
 * - Derived arrivalMode: "ambulance" iff dispatch exists
 *
 * Wired 2026-10-27: ambulanceHandler decides transport for each received
 * referral letter (transportNeed + road reachability), dispatches the needed
 * tier, sets the letter's arrivalTick, and posts the dispatch cost as an
 * "ambulance" charge once the arrived patient has an encounter.
 */
import { ambulanceFee } from "../engine/price-tables.js";

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
  /** Tier the case called for; differs from the vehicle's tier when the needed tier was busy. */
  neededTier?: AmbulanceTier;
  /** Charge posted on the arrival encounter (CHG-*), once. */
  chargeId?: string;
}

export interface AmbulanceState {
  fleet: Map<string, Ambulance>;
  dispatches: Map<string, AmbulanceDispatch>;
  counter: number;
}

// Domain constants from M9.3-BLOCKER-DECISIONS.md
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
  clockTick: number,
  preferTier?: AmbulanceTier
): string | null {
  // Preferred tier first (fleet order within a tier); otherwise any available vehicle.
  const free = Array.from(state.fleet.values()).filter(a => a.status === "available");
  const available = (preferTier ? free.find(a => a.tier === preferTier) : undefined) ?? free[0];
  if (!available) return null;

  // Fee comes from the active price book (IDR by default; see billing/registry.ts).
  const costIdr = ambulanceFee(available.tier, distanceKm);

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
    ...(preferTier ? { neededTier: preferTier } : {}),
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

// ── Referral transport (2026-10-27) ──────────────────────────────────────
export type TransportNeed = AmbulanceTier | "none";

/** Referral diagnoses that need monitored transport. Everything else travels by own means. */
const ALS_DX = new Set(["I21", "I50"]);              // acute MI, heart failure
const BLS_DX = new Set(["S72", "K35", "J15", "J44"]); // femur fracture, appendicitis, pneumonia, COPD

export function transportNeed(icd: string): TransportNeed {
  const cat = icd.substring(0, 3);
  return ALS_DX.has(cat) ? "ALS" : BLS_DX.has(cat) ? "BLS" : "none";
}

/** Road access to the home hospital from a region (Epic X M10.5a: from the active referral network). */
export function reachableByRoad(provinceCode: string): boolean {
  return getReferralNetwork().reachableByRoad(provinceCode);
}

/**
 * Epic IX M9.3 wave 2: ambulance tick handler.
 * Advances dispatches, decides transport for newly received referral letters
 * (dispatching where needed), and charges arrived dispatches to their
 * encounter. Copy-on-write; no rng.
 */
import type { HospitalState } from "../engine/state-store.js";
import type { Clock } from "../engine/clock.js";
import type { EventQueue } from "../engine/event-queue.js";
import type { ReferralLetter } from "../identity/types.js";
import type { ReferralState } from "./system.js";
import { getReferralNetwork } from "../locale/registry.js";
import { appendCharge } from "../engine/charge-generator.js";

export function ambulanceHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const ambState = (state as unknown as { _ambulanceState?: AmbulanceState })._ambulanceState;
  if (!ambState) return state;
  // Clone so dispatchAmbulance's in-place writes never touch the input state.
  const amb: AmbulanceState = advanceDispatches({ fleet: new Map(ambState.fleet), dispatches: new Map(ambState.dispatches), counter: ambState.counter }, clock.tick);

  const refState = (state as unknown as { _referralState?: ReferralState })._referralState;
  let letters: Map<string, ReferralLetter> | null = null;
  if (refState) {
    const pending = Array.from(refState.letters.values())
      .filter(l => l.status === "received" && l.transport === undefined)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const letter of pending) {
      const need = transportNeed(letter.diagnosis);
      const net = getReferralNetwork();
      const prov = refState.facilities.get(letter.fromFacility)?.provinceCode ?? String(net.homeRegionCode);
      let decided: Partial<ReferralLetter> | null;
      if (need === "none") {
        decided = { transport: "self", arrivalTick: clock.tick };
      } else if (!reachableByRoad(prov)) {
        decided = { transport: "sea_air", arrivalTick: clock.tick };
      } else {
        const id = dispatchAmbulance(amb, Number(prov), net.homeRegionCode, net.distanceKm(prov), letter.id, clock.tick, need);
        // Fleet all out: leave the letter undecided and retry on the next pass.
        decided = id ? { transport: "ambulance", dispatchId: id, arrivalTick: amb.dispatches.get(id)!.etaTick } : null;
      }
      if (decided) {
        if (letters === null) letters = new Map(refState.letters);
        letters.set(letter.id, { ...letter, ...decided });
      }
    }
  }

  // Charge each arrived dispatch once, on the encounter its patient arrived into.
  let charges = state.charges;
  const allLetters = letters ?? refState?.letters;
  for (const [id, d] of amb.dispatches) {
    if (d.status !== "arrived" || d.chargeId || !d.letterId) continue;
    const letter = allLetters?.get(d.letterId);
    if (!letter?.encounterId) continue;
    const enc = state.encounters.get(letter.encounterId);
    if (!enc) continue;
    if (charges === state.charges) charges = new Map(charges);
    const tier = amb.fleet.get(d.ambulanceId)?.tier ?? "BLS";
    const before = new Set(charges.keys());
    charges = appendCharge(charges, clock, enc.id, enc.patientId, "ambulance",
      `Ambulance ${tier} transfer ${d.distanceKm} km`, d.costIdr, { code: `AMB-${tier}`, unitPrice: d.costIdr, quantity: 1 });
    const chargeId = Array.from(charges.keys()).find(k => !before.has(k));
    amb.dispatches.set(id, { ...d, encounterId: enc.id, chargeId });
  }

  const next: Record<string, unknown> = { _ambulanceState: amb };
  if (letters !== null && refState) next._referralState = { ...refState, letters };
  if (charges !== state.charges) next.charges = charges;
  return Object.assign({}, state, next) as HospitalState;
}
