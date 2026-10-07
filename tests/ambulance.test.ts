/**
 * Epic IX M9.3 wave 2 — Ambulance dispatch tests (ADR-016 D8).
 */
import { describe, it, expect } from "vitest";
import { initAmbulanceState, dispatchAmbulance, advanceDispatches, getDispatchForLetter } from "../src/referral/ambulance.js";
import type { AmbulanceState } from "../src/referral/ambulance.js";

describe("Epic IX M9.3 wave 2 — Ambulance Dispatch", () => {
  it("init creates 3 ambulances (2 BLS, 1 ALS)", () => {
    const state = initAmbulanceState();
    expect(state.fleet.size).toBe(3);
    expect(state.dispatches.size).toBe(0);
    expect(state.counter).toBe(0);
  });

  it("dispatches BLS ambulance and calculates cost/ETA", () => {
    const state = initAmbulanceState();
    const dispatchId = dispatchAmbulance(state, 73, 71, 25, "RJL-0001", 100);
    expect(dispatchId).toBeDefined();
    expect(dispatchId).toContain("DISP-");

    const dispatch = state.dispatches.get(dispatchId!);
    expect(dispatch).toBeDefined();
    expect(dispatch!.status).toBe("en-route");
    expect(dispatch!.distanceKm).toBe(25);
    // BLS cost: 200k base + 2k/km * 25km = 250k
    expect(dispatch!.costIdr).toBe(200000 + 2000 * 25);
    // BLS ETA: 25km / 60kmh * 60 ticks/h = 25 ticks
    expect(dispatch!.etaTick).toBe(125);
  });

  it("dispatches ALS ambulance with higher cost/speed", () => {
    const state = initAmbulanceState();
    const dispatchId = dispatchAmbulance(state, 73, 71, 40, "RJL-0002", 200);
    expect(dispatchId).toBeDefined();
    const dispatch = state.dispatches.get(dispatchId!);
    // ALS cost: 500k base + 5k/km * 40km = 700k
    expect(dispatch!.costIdr).toBe(500000 + 5000 * 40);
    // ALS ETA: 40km / 80kmh * 60 = 30 ticks
    expect(dispatch!.etaTick).toBe(230);
  });

  it("returns null when no ambulance available", () => {
    const state = initAmbulanceState();
    // Dispatch all 3
    dispatchAmbulance(state, 73, 71, 10, "RJL-0001", 0);
    dispatchAmbulance(state, 73, 71, 10, "RJL-0002", 0);
    dispatchAmbulance(state, 73, 71, 10, "RJL-0003", 0);
    expect(dispatchAmbulance(state, 73, 71, 10, "RJL-0004", 0)).toBeNull();
  });

  it("advances dispatch to arrived and frees ambulance", () => {
    const state = initAmbulanceState();
    const dispatchId = dispatchAmbulance(state, 73, 71, 10, "RJL-0001", 0);
    expect(state.dispatches.get(dispatchId!)!.status).toBe("en-route");

    // Advance past ETA
    const updated = advanceDispatches(state, 100);
    expect(updated.dispatches.get(dispatchId!)!.status).toBe("arrived");
    // Ambulance should be available again
    const amb = updated.fleet.get("AMB-BLS-001");
    expect(amb!.status).toBe("available");
  });

  it("getDispatchForLetter finds by letterId", () => {
    const state = initAmbulanceState();
    dispatchAmbulance(state, 73, 71, 10, "RJL-TEST", 0);
    const found = getDispatchForLetter(state, "RJL-TEST");
    expect(found).toBeDefined();
    expect(found!.letterId).toBe("RJL-TEST");
  });
});
