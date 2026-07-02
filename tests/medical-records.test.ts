import { describe, it, expect } from "vitest";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { medicalRecordsHandler } from "../src/engine/medical-records.js";

describe("Medical Records", () => {
  it("creates charts for new encounters", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    state.encounters.set(encId, { id: encId, patientId: pid, type: "admission", startTime: 1000, endTime: null, status: "active" });
    const clock = createClock(60);
    const result = medicalRecordsHandler(state, clock, new EventQueue());

    expect(result.medicalCharts.size).toBe(1);
    const chart = Array.from(result.medicalCharts.values())[0]!;
    expect(chart.encounterId).toBe(encId);
    expect(chart.patientId).toBe(pid);
    expect(chart.status).toBe("open");
    expect(chart.coder).toBeNull();
    expect(chart.diagnoses.length).toBeGreaterThan(0);
    expect(chart.diagnoses[0]!.type).toBe("primary");
  });

  it("does not duplicate charts for the same encounter", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    state.encounters.set(encId, { id: encId, patientId: pid, type: "admission", startTime: 1000, endTime: null, status: "active" });
    const clock = createClock(60);
    const r1 = medicalRecordsHandler(state, clock, new EventQueue());
    const r2 = medicalRecordsHandler(r1, clock, new EventQueue());
    expect(r2.medicalCharts.size).toBe(1);
  });

  it("marks charts incomplete when encounter is discharged", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);
    state.encounters.set(encId, { id: encId, patientId: pid, type: "admission", startTime: 1000, endTime: null, status: "active" });
    const clock = createClock(60);

    state = medicalRecordsHandler(state, clock, new EventQueue());
    expect(Array.from(state.medicalCharts.values())[0]!.status).toBe("open");

    state.encounters.set(encId, { id: encId, patientId: pid, type: "admission", startTime: 1000, endTime: 2000, status: "discharged" });
    state = medicalRecordsHandler(state, clock, new EventQueue());
    expect(Array.from(state.medicalCharts.values())[0]!.status).toBe("incomplete");
  });

  it("codes incomplete charts every 12 ticks", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);
    state.encounters.set(encId, { id: encId, patientId: pid, type: "admission", startTime: 1000, endTime: 2000, status: "active" });
    const clock = createClock(60);

    // First pass: create the chart (encounter active → chart open)
    state = medicalRecordsHandler(state, clock, new EventQueue());
    expect(Array.from(state.medicalCharts.values())[0]!.status).toBe("open");

    // Discharge encounter
    state.encounters.set(encId, { id: encId, patientId: pid, type: "admission", startTime: 1000, endTime: 2000, status: "discharged" });

    // Second pass: discharge completes chart → incomplete
    state = medicalRecordsHandler(state, clock, new EventQueue());
    expect(Array.from(state.medicalCharts.values())[0]!.status).toBe("incomplete");

    // Third pass on tick 12: coder codes it
    clock.tick = 12;
    state = medicalRecordsHandler(state, clock, new EventQueue());
    const chart = Array.from(state.medicalCharts.values())[0]!;
    expect(chart.status).toBe("coded");
    expect(chart.coder).not.toBeNull();
  });
});
