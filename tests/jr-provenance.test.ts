/**
 * Epic IX M9.3 wave 2 — Jasa Raharja provenance tests (ADR-016 D6).
 */
import { describe, it, expect } from "vitest";
import { initJrState, checkJrTrigger, createJrIncident } from "../src/referral/jr-provenance.js";
import type { JrState } from "../src/referral/jr-provenance.js";
import type { AmbulanceDispatch } from "../src/referral/ambulance.js";

describe("Epic IX M9.3 wave 2 — Jasa Raharja Provenance", () => {
  it("triggers on T20 (burns)", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "T20.0", patientId: "PAT-001" })).toBe("T20");
  });

  it("triggers on T63 (toxic effect)", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "T63.4", patientId: "PAT-002" })).toBe("T63");
  });

  it("triggers on S72 (femur fracture)", () => {
    expect(checkJrTrigger({ primaryDiagnosis: "S72.0", patientId: "PAT-003" })).toBe("S72");
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
