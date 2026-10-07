/**
 * Epic VI M6.2+M6.3 — Discharge Planning & Department Consumption Tests
 */
import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { requiresFollowUp, recordDischargePlan, getFollowUpStats } from "../src/engine/discharge-planning.js";
import { recordConsumption, getConsumptionByDept, resetConsumption, checkReorderAlerts } from "../src/engine/dept-consumption.js";

describe("Epic VI M6.2 — Discharge Planning (Rujuk Balik)", () => {
  it("identifies chronic conditions needing follow-up", () => {
    expect(requiresFollowUp({ primaryDiagnosis: "I10" } as any)).toBe(true);
    expect(requiresFollowUp({ primaryDiagnosis: "E11" } as any)).toBe(true);
    expect(requiresFollowUp({ primaryDiagnosis: "J45" } as any)).toBe(true);
    expect(requiresFollowUp({ primaryDiagnosis: "I50" } as any)).toBe(true);
    expect(requiresFollowUp({ primaryDiagnosis: "J06" } as any)).toBe(false); // acute URI
    expect(requiresFollowUp({ primaryDiagnosis: "A09" } as any)).toBe(false); // gastroenteritis
  });

  it("creates discharge plan for chronic discharge", () => {
    const state = { _dischargePlans: new Map() } as any;
    const encounter = { id: "ENC-1-PAT-001", patientId: "PAT-001", primaryDiagnosis: "I10" };
    const planId = recordDischargePlan(state, encounter as any, 100);
    expect(planId).toBeDefined();
    expect(planId).toContain("DP-");
    expect(state._dischargePlans.size).toBe(1);
    const plan = state._dischargePlans.get(planId);
    expect(plan.reason).toContain("Hipertensi");
    expect(plan.status).toBe("scheduled");
  });

  it("returns null for non-chronic conditions", () => {
    const state = { _dischargePlans: new Map() } as any;
    const encounter = { id: "ENC-1-PAT-001", patientId: "PAT-001", primaryDiagnosis: "J06" };
    const planId = recordDischargePlan(state, encounter as any, 100);
    expect(planId).toBeNull();
  });

  it("produces follow-up stats", () => {
    const state = { _dischargePlans: new Map() } as any;
    recordDischargePlan(state, { id: "ENC-1", patientId: "P1", primaryDiagnosis: "I10" } as any, 100);
    recordDischargePlan(state, { id: "ENC-2", patientId: "P2", primaryDiagnosis: "E11" } as any, 100);
    const stats = getFollowUpStats(state);
    expect(stats.scheduled).toBe(2);
    expect(stats.attended).toBe(0);
  });
});

describe("Epic VI M6.3 — Department Consumption", () => {
  it("records and retrieves consumption by department", () => {
    const state = { _deptConsumption: new Map() } as any;
    recordConsumption(state, "INTERNAL_MEDICINE", "BED_DAY", 5, 100);
    recordConsumption(state, "INTERNAL_MEDICINE", "BED_DAY", 3, 200);
    recordConsumption(state, "PEDIATRICS", "BED_DAY", 2, 150);
    const byDept = getConsumptionByDept(state);
    expect(byDept["INTERNAL_MEDICINE"]).toBe(8);
    expect(byDept["PEDIATRICS"]).toBe(2);
  });

  it("resets consumption tracker", () => {
    const state = { _deptConsumption: new Map() } as any;
    recordConsumption(state, "LAB", "TEST Kits", 10, 100);
    expect(getConsumptionByDept(state)["LAB"]).toBe(10);
    resetConsumption(state);
    expect(getConsumptionByDept(state)).toEqual({});
  });

  it("generates reorder alerts when threshold exceeded", () => {
    const state = { _deptConsumption: new Map() } as any;
    recordConsumption(state, "SURGERY", "Sutures", 15, 100);
    const alerts = checkReorderAlerts(state, 10);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toContain("SURGERY");
    expect(alerts[0]).toContain("Sutures");
  });
});

describe("Epic VI Integration — End-to-End", () => {
  it("state fields exist and are serializable", () => {
    const w = createWorld(20, undefined, 42);
    expect(w.state._dischargePlans).toBeInstanceOf(Map);
    expect(w.state._deptConsumption).toBeInstanceOf(Map);
    expect(w.state._dischargePlans.size).toBe(0);
    expect(w.state._deptConsumption.size).toBe(0);
  });

  it("deterministic: same seed produces same initial state", () => {
    const w1 = createWorld(20, undefined, 77);
    const w2 = createWorld(20, undefined, 77);
    expect(w1.state._dischargePlans.size).toBe(w2.state._dischargePlans.size);
    expect(w1.state._deptConsumption.size).toBe(w2.state._deptConsumption.size);
  });
});
