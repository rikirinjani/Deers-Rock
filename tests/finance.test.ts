import { describe, it, expect } from "vitest";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { billingHandler, cashierHandler } from "../src/engine/finance.js";
import type { Encounter } from "../src/patient/schema.js";

function makeActiveEncounter(patientId: string): Encounter {
  return { id: `ENC-${patientId}`, patientId, type: "admission", startTime: 1000, endTime: null, status: "active" };
}

function makeDischargedEncounter(patientId: string): Encounter {
  return { id: `ENC-${patientId}`, patientId, type: "admission", startTime: 1000, endTime: 2000, status: "discharged" };
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
    expect(result.charges.size).toBe(1);
    const charge = Array.from(result.charges.values())[0]!;
    expect(charge.category).toBe("room");
    expect(charge.amount).toBe(350000);
    expect(charge.paid).toBe(false);
  });

  it("does not generate charges on non-5 ticks", () => {
    const patients = generatePatientPool(1);
    const state = createState(patients);
    state.encounters.set(`ENC-${patients[0]!.id}`, makeActiveEncounter(patients[0]!.id));
    const clock = createClock(60);
    clock.tick = 3;
    const result = billingHandler(state, clock, new EventQueue());
    expect(result.charges.size).toBe(0);
  });

  it("creates insurance claims on discharge when charges exist", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    // Step 1: Generate room charge while encounter is active (tick 5)
    state.encounters.set(encId, makeActiveEncounter(pid));
    const clock5 = createClock(60);
    clock5.tick = 5;
    state = billingHandler(state, clock5, new EventQueue());
    expect(state.charges.size).toBe(1);

    // Step 2: Discharge and run billing again (tick 10)
    state.encounters.set(encId, makeDischargedEncounter(pid));
    const clock10 = createClock(60);
    clock10.tick = 10;
    state = billingHandler(state, clock10, new EventQueue());

    expect(state.insuranceClaims.size).toBeGreaterThanOrEqual(1);
    const claim = Array.from(state.insuranceClaims.values())[0]!;
    expect(claim.encounterId).toBe(encId);
    expect(claim.status).toBe("submitted");
    expect(["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Private Insurance A", "Private Insurance B", "Self-pay"]).toContain(claim.payer);
    expect(claim.totalCharges).toBeGreaterThan(0);
    expect(claim.coveredAmount + claim.patientResponsibility).toBe(claim.totalCharges);
  });

  it("processes submitted claims every 15 ticks", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    state.encounters.set(encId, makeActiveEncounter(pid));
    const clock5 = createClock(60);
    clock5.tick = 5;
    state = billingHandler(state, clock5, new EventQueue());

    state.encounters.set(encId, makeDischargedEncounter(pid));
    const clock10 = createClock(60);
    clock10.tick = 10;
    state = billingHandler(state, clock10, new EventQueue());

    const clock15 = createClock(60);
    clock15.tick = 15;
    state = billingHandler(state, clock15, new EventQueue());

    expect(state.insuranceClaims.size).toBeGreaterThanOrEqual(1);
    const claim = Array.from(state.insuranceClaims.values())[0]!;
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
    state = cashierHandler(state, clock20, new EventQueue());

    const paidClaims = Array.from(state.insuranceClaims.values()).filter(c => c.status === "paid" && c.patientResponsibility > 0);
    if (paidClaims.length > 0) {
      expect(state.payments.size).toBeGreaterThan(0);
      const payment = Array.from(state.payments.values())[0]!;
      expect(payment.amount).toBeGreaterThan(0);
      expect(["cash", "card"]).toContain(payment.type);
    }
  });
});
