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

  it("dispatches an ambulance and calculates cost/ETA", () => {
    const state = initAmbulanceState();
    const dispatchId = dispatchAmbulance(state, 73, 71, 25, "RJL-0001", 100);
    expect(dispatchId).toBeDefined();
    expect(dispatchId).toContain("DISP-");

    const dispatch = state.dispatches.get(dispatchId!);
    expect(dispatch).toBeDefined();
    expect(dispatch!.status).toBe("en-route");
    expect(dispatch!.distanceKm).toBe(25);
    // First dispatch gets ALS-001 (prioritized in fleet)
    expect(dispatch!.ambulanceId).toBe("AMB-ALS-001");
    // ALS cost: 500k base + 5k/km * 25km = 625k
    expect(dispatch!.costIdr).toBe(500000 + 5000 * 25);
    // ALS ETA: 25km / 80kmh * 60 ticks/h ≈ 19 ticks
    expect(dispatch!.etaTick).toBe(119);
  });

  it("dispatches second ambulance as BLS", () => {
    const state = initAmbulanceState();
    dispatchAmbulance(state, 73, 71, 20, "RJL-0001", 0); // takes ALS-001
    const dispatchId = dispatchAmbulance(state, 73, 71, 20, "RJL-0002", 0);
    const dispatch = state.dispatches.get(dispatchId!);
    expect(dispatch!.ambulanceId).toBe("AMB-BLS-001");
    // BLS cost: 200k base + 2k/km * 20km = 240k
    expect(dispatch!.costIdr).toBe(200000 + 2000 * 20);
    // BLS ETA: 20km / 60kmh * 60 = 20 ticks
    expect(dispatch!.etaTick).toBe(20);
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
