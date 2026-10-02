import { describe, it, expect } from "vitest";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { billingHandler, inpatientCashierHandler } from "../src/engine/finance.js";
import type { Encounter } from "../src/patient/schema.js";

function makeActiveEncounter(patientId: string, payer: Encounter["payer"] = "BPJS Kesehatan"): Encounter {
  return { id: `ENC-${patientId}`, patientId, type: "inpatient", startTime: 1000, endTime: null, status: "active", payer };
}

function makeDischargedEncounter(patientId: string, payer: Encounter["payer"] = "BPJS Kesehatan"): Encounter {
  return { id: `ENC-${patientId}`, patientId, type: "inpatient", startTime: 1000, endTime: 2000, status: "discharged", payer };
}

describe("Finance", () => {
  it("generates room charges for active encounters every 5 ticks", () => {
    const patients = generatePatientPool(2);
    const state = createState(patients);
    state.encounters.set(`ENC-${patients[0]!.id}`, makeActiveEncounter(patients[0]!.id));
    state.encounters.set(`ENC-${patients[1]!.id}`, makeDischargedEncounter(patients[1]!.id));

    const clock = createClock(60);
    clock.tick = 5;
    const result = billingHandler(state, clock, new EventQueue());
    expect(result.charges.size).toBe(2);
    const charges = Array.from(result.charges.values());
    const roomCharge = charges.find(c => c.category === "room")!;
    expect(roomCharge).toBeDefined();
    expect(roomCharge.amount).toBe(350000);
    expect(roomCharge.paid).toBe(false);
  });

  it("does not generate room charges on non-5 ticks", () => {
    const patients = generatePatientPool(1);
    const state = createState(patients);
    state.encounters.set(`ENC-${patients[0]!.id}`, makeActiveEncounter(patients[0]!.id));
    const clock = createClock(60);
    clock.tick = 3;
    const result = billingHandler(state, clock, new EventQueue());
    const roomCharges = Array.from(result.charges.values()).filter(c => c.category === "room");
    expect(roomCharges.length).toBe(0);
  });

  it("creates insurance claims on discharge when charges exist", () => {
    const patients = generatePatientPool(1);
    // Pin the primary diagnosis to a code with a guaranteed INA-CBG mapping:
    // the claim's tariff lookup uses the PATIENT's active diagnosis
    // (finance.ts), while generatePatientPool draws diagnosis codes at
    // random. An unmapped code created the claim as denied
    // ("mismatched_icd_cbg") at submission, so the submitted/sepNumber
    // assertions below failed probabilistically (observed as CI flake).
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    // Step 1: Generate room charge while encounter is active (tick 5)
    state.encounters.set(encId, makeActiveEncounter(pid));
    const clock5 = createClock(60);
    clock5.tick = 5;
    state = billingHandler(state, clock5, new EventQueue());
    expect(state.charges.size).toBe(2);

    // Step 2: Create coded medical chart so BPJS claim can be submitted
    state.medicalCharts.set(`CHART-${pid}`, {
      id: `CHART-${pid}`, encounterId: encId, patientId: pid, status: "coded",
      createdAt: 1000, completedAt: 2000,
      diagnoses: [{ code: "A09", name: "Infectious gastroenteritis", type: "primary" }],
      procedures: [], coder: "AI Coder",
    });

    // Step 3: Discharge and run billing again (tick 10)
    state.encounters.set(encId, makeDischargedEncounter(pid));
    const clock10 = createClock(60);
    clock10.tick = 10;
    state = billingHandler(state, clock10, new EventQueue());

    expect(state.insuranceClaims.size).toBeGreaterThanOrEqual(1);
    const claim = Array.from(state.insuranceClaims.values())[0]!;
    expect(claim.encounterId).toBe(encId);
    expect(claim.status).toBe("submitted");
    expect(claim.payer).toBe("BPJS Kesehatan");
    expect(claim.sepNumber).not.toBeNull();
    expect(claim.totalCharges).toBeGreaterThan(0);
    expect(claim.coveredAmount + claim.patientResponsibility).toBe(claim.totalCharges);
  });

  it("processes submitted claims every 15 ticks", () => {
    const patients = generatePatientPool(1);
    // Same INA-CBG pin as above: an unmapped patient diagnosis denied the
    // claim at creation, which made this test pass vacuously (no submitted
    // claim was ever adjudicated). Pinning guarantees the adjudication path
    // is actually exercised.
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    state.encounters.set(encId, makeActiveEncounter(pid));
    const clock5 = createClock(60);
    clock5.tick = 5;
    state = billingHandler(state, clock5, new EventQueue());

    state.encounters.set(encId, makeDischargedEncounter(pid));
    state.medicalCharts.set(`CHART-${pid}`, {
      id: `CHART-${pid}`, encounterId: encId, patientId: pid, status: "coded",
      createdAt: 1000, completedAt: 2000,
      diagnoses: [{ code: "A09", name: "Infectious gastroenteritis", type: "primary" }],
      procedures: [], coder: "AI Coder",
    });
    const clock10 = createClock(60);
    clock10.tick = 10;
    state = billingHandler(state, clock10, new EventQueue());
    expect(state.insuranceClaims.size).toBeGreaterThanOrEqual(1);

    const clock15 = createClock(60);
    clock15.tick = 15;
    state = billingHandler(state, clock15, new EventQueue());

    // Adjudication outcome is rolled (finance.ts: 85% paid, 10% returned for
    // coding issues, 5% denied). A "returned" roll is immediately
    // auto-resubmitted in the same pass when the chart is coded
    // (returned-processing loop), leaving status "submitted" with
    // resolvedAt null — indistinguishable from an unadjudicated claim and
    // unreachable as a final state. Asserting only the first pass's outcome
    // therefore failed ~10% of runs (observed red on CI run 36945203014).
    // The contract under test is that tick-%-15 passes adjudicate submitted
    // claims until they reach a terminal state, so keep driving 15-tick
    // passes; each re-rolls with p(terminal) = 0.9, and
    // P(still unresolved after 20 passes) <= 0.1^20 ~ 1e-20.
    let claim = Array.from(state.insuranceClaims.values())[0]!;
    // One clock, advanced tick-by-tick: the rng STATE persists across passes,
    // so every adjudication re-rolls independently. (A fresh createClock per
    // pass would re-seed from Date.now() — the whole loop finishes within one
    // millisecond, so every pass would draw the identical roll and P(fail)
    // would remain ~10%, the very flake this guards against. Verified
    // empirically: 2/30 runs failed before hoisting the clock.)
    const adjudicationClock = createClock(60);
    for (let tick = 30; claim.status !== "paid" && claim.status !== "denied" && tick <= 300; tick += 15) {
      adjudicationClock.tick = tick;
      state = billingHandler(state, adjudicationClock, new EventQueue());
      claim = Array.from(state.insuranceClaims.values())[0]!;
    }

    expect(["paid", "denied"]).toContain(claim.status);
    expect(claim.resolvedAt).not.toBeNull();
  });

  it("cashier collects patient responsibility for paid claims", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    // Tick 5: generate room charge while active
    state.encounters.set(encId, makeActiveEncounter(pid));
    const clock5 = createClock(60);
    clock5.tick = 5;
    state = billingHandler(state, clock5, new EventQueue());

    // Tick 10: discharge encounter, generate claim
    state.encounters.set(encId, makeDischargedEncounter(pid));
    const clock10 = createClock(60);
    clock10.tick = 10;
    state = billingHandler(state, clock10, new EventQueue());

    // Tick 15: billing processes the claim (15 % 15 === 0)
    const clock15 = createClock(60);
    clock15.tick = 15;
    state = billingHandler(state, clock15, new EventQueue());

    // Tick 20: cashier runs (20 % 10 === 0) and creates payment for paid claims
    const clock20 = createClock(60);
    clock20.tick = 20;
    state = inpatientCashierHandler(state, clock20, new EventQueue());

    const paidClaims = Array.from(state.insuranceClaims.values()).filter(c => c.status === "paid" && c.patientResponsibility > 0);
    if (paidClaims.length > 0) {
      expect(state.payments.size).toBeGreaterThan(0);
      const payment = Array.from(state.payments.values())[0]!;
      expect(payment.amount).toBeGreaterThan(0);
      expect(["cash", "card"]).toContain(payment.type);
    }
  });
});
