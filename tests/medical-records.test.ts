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

    // Third pass on tick 12: the coder codes the chart.
    //
    // Coding is gated by an accuracy roll in medical-records.ts
    // (`isAccurate = clock.rng() < coder.accuracy`, accuracy 0.85-0.92), and
    // clock.rng() falls back to a Date.now() seed (clock.ts:31), so a single
    // pass can legitimately leave the chart "incomplete". Asserting "coded"
    // after exactly one pass made this test fail ~8% of runs (measured 1/12),
    // which would have put `npm test` in CI at a ~1-in-12 false-red rate.
    //
    // The claim under test is "incomplete charts get coded", not "on the first
    // roll", so retry a bounded number of passes. P(uncoded after 20 passes)
    // <= 0.15^20 ~ 3e-17.
    clock.tick = 12;
    let chart = Array.from(state.medicalCharts.values())[0]!;
    let passes = 0;
    while (chart.status !== "coded" && passes < 20) {
      state = medicalRecordsHandler(state, clock, new EventQueue());
      chart = Array.from(state.medicalCharts.values())[0]!;
      passes++;
    }
    expect(passes).toBeGreaterThan(0); // the tick-12 pass really ran
    expect(chart.status).toBe("coded");
    expect(chart.coder).not.toBeNull();
  });
});
