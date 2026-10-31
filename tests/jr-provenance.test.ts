/**
 * Epic IX M9.3 wave 2 — Jasa Raharja provenance tests (ADR-016 D6).
 */
import { describe, it, expect } from "vitest";
import { initJrState, checkJrTrigger, createJrIncident } from "../src/referral/jr-provenance.js";
import type { JrState } from "../src/referral/jr-provenance.js";
import type { AmbulanceDispatch } from "../src/referral/ambulance.js";

describe("Epic IX M9.3 wave 2 — Jasa Raharja Provenance", () => {
  // Owner decision 2026-10-31: Jasa Raharja is traffic accidents only. An
  // encounter is an incident exactly when finance gave it the JR payer.
  it("triggers on a Jasa Raharja (traffic accident) encounter", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "S72.0", patientId: "PAT-003", payer: "Jasa Raharja" })).toBe("S72");
    expect(checkJrTrigger({ primaryDiagnosis: "S06", patientId: "PAT-006", payer: "Jasa Raharja" })).toBe("S06");
  });

  it("does not trigger on the same injury when it was not a traffic accident", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "S72.0", patientId: "PAT-003", payer: "BPJS Kesehatan" })).toBeNull();
  });

  it("no longer triggers on burns or toxic effects (T20, T63)", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "T20.0", patientId: "PAT-001", payer: "BPJS Kesehatan" })).toBeNull();
    expect(checkJrTrigger({ primaryDiagnosis: "T63.4", patientId: "PAT-002" })).toBeNull();
  });

  it("does not trigger on I10 (hypertension)", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "I10", patientId: "PAT-004" })).toBeNull();
  });

  it("does not trigger on J15 (pneumonia)", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "J15.9", patientId: "PAT-005" })).toBeNull();
  });

  it("creates incident and returns ID", () => {
    const state: JrState = initJrState();
    const dispatch: AmbulanceDispatch | null = null;
    const id = createJrIncident(state, "ENC-001", null, dispatch, "T20", 500);
    expect(id).toBeDefined();
    expect(id).toContain("JRINC-");
    expect(state.incidents.size).toBe(1);
  });

  it("does not create duplicate incident for same encounter", () => {
    const state: JrState = initJrState();
    createJrIncident(state, "ENC-001", null, null, "T20", 500);
    const second = createJrIncident(state, "ENC-001", null, null, "T20", 501);
    expect(second).toBeNull();
    expect(state.incidents.size).toBe(1);
  });

  it("links to dispatch when provided", () => {
    const state: JrState = initJrState();
    const dispatch: AmbulanceDispatch = {
      id: "DISP-0001", ambulanceId: "AMB-BLS-001", fromProvinceCode: 73, toProvinceCode: 71,
      distanceKm: 15, departTick: 100, etaTick: 125, costIdr: 230000, status: "en-route",
    };
    const id = createJrIncident(state, "ENC-002", null, dispatch, "S72", 600);
    const inc = Array.from(state.incidents.values())[0];
    expect(inc).toBeDefined();
    expect(inc!.dispatchId).toBe("DISP-0001");
    expect(inc!.damageLevel).toBe("severe"); // S72 = fracture = severe
  });

  it("classifies damage level correctly", () => {
    const state: JrState = initJrState();
    createJrIncident(state, "ENC-A", null, null, "T20", 100);
    createJrIncident(state, "ENC-B", null, null, "S72", 101);
    const incidents = Array.from(state.incidents.values());
    expect(incidents[0]!.damageLevel).toBe("moderate"); // T20
    expect(incidents[1]!.damageLevel).toBe("severe"); // S72
  });
});
