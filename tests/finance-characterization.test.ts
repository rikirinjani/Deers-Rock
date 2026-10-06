/**
 * ADR-015 Phase 0/1 characterization tests.
 *
 * These pin CURRENT engine behavior as a diff baseline for later phases:
 *  1. Tariff lookup follows the PATIENT's active dx, NOT the chart's primary
 *     dx (the D4 divergence bug — fixed in Phase 2). Severity, meanwhile, is
 *     already inferred from the CHART dx, so the two inputs diverge in one
 *     claim: pinned here end-to-end.
 *  2. Chart status "completed" is never set by the engine (dead enum; D4
 *     activates it in Phase 2).
 *  3. Claim status "adjudicated" is never reached (dead enum; D3 activates
 *     it in Phase 3).
 *  4. charge.paid flips AFTER a payment is created (ADR-015 D9 — fixed in
 *     Phase 1 by processCashier; asserted post-change, both directions).
 */
import { describe, it, expect } from "vitest";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { billingHandler, outpatientCashierHandler } from "../src/engine/finance.js";
import { createWorld, runWorld } from "../src/engine/world.js";
import type { HospitalState } from "../src/engine/state-store.js";
import type { Charge, InsuranceClaim } from "../src/patient/schema.js";

const MS_PER_TICK = 60_000;

function tickClock(tick: number) {
  const clock = createClock(60);
  clock.tick = tick;
  clock.hospitalTimeMs = tick * MS_PER_TICK;
  return clock;
}

describe("Characterization — finance/claims behavior pinned for ADR-015 phases 2-3", () => {
  it("tariff follows the PATIENT's active dx while severity follows the CHART dx (D4 divergence, unfixed)", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;

    // Patient problem list: A09 (active) — tariff source per finance.ts:110-111.
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];

    const state = createState(patients);
    // Discharged outpatient-style encounter (room billing irrelevant here).
    state.encounters.set(encId, {
      id: encId, patientId: pid, type: "outpatient",
      startTime: 0, endTime: 100 * MS_PER_TICK, status: "discharged",
      payer: "BPJS Kesehatan",
    });
    // Non-zero charge total so a claim is created.
    const charge: Charge = {
      id: `CHG-${pid}`, encounterId: encId, patientId: pid,
      category: "administration", description: "Administration fee",
      amount: 150000, billedAt: 0, paid: false,
    };
    state.charges.set(charge.id, charge);

    // Coded chart whose PRIMARY dx differs from the patient's active dx, and
    // carries a major CC secondary (I50) that elevates severity to Level II.
    state.medicalCharts.set(`CHART-${pid}`, {
      id: `CHART-${pid}`, encounterId: encId, patientId: pid, status: "coded",
      createdAt: 0, completedAt: 100 * MS_PER_TICK,
      diagnoses: [
        { code: "I10", name: "Essential hypertension", type: "primary" },
        { code: "I50", name: "Heart failure", type: "secondary" },
      ],
      procedures: [], coder: "AI Coder",
    });

    // Tick 155: a %5 billing pass but NOT %15 — the claim is created and stays
    // "submitted" (adjudication fires only on %15 ticks), keeping this pin
    // deterministic regardless of the rng roll.
    const result = billingHandler(state, tickClock(155), new EventQueue());
    const claim = result.insuranceClaims.get(`CLM-${encId}`);
    expect(claim).toBeDefined();
    expect(claim!.status).toBe("submitted");

    // CURRENT behavior (pinned):
    //   severity = Level II (from CHART dx: I10 primary + I50 major CC → SEP 2)
    //   tariff code = A09 (from PATIENT active dx, NOT chart primary I10)
    // A09 @ Level II = round(3_100_000 × 1.35) = 4_185_000.
    // If Phase 2 (D4) moves grouping to the chart, this becomes I10 @ II =
    // round(3_500_000 × 1.35) = 4_725_000 and this pin must be updated.
    expect(claim!.totalCharges).toBe(4_185_000);
    expect(claim!.coveredAmount).toBe(4_185_000);
    expect(claim!.patientResponsibility).toBe(0);
  });

  it("chart status 'completed' is never set by the engine (dead enum until D4)", () => {
    const w = runWorld(createWorld(30, undefined, 7), 300);
    const charts = Array.from(w.state.medicalCharts.values());
    expect(charts.length).toBeGreaterThan(0);
    const statuses = new Set(charts.map(c => c.status));
    for (const s of statuses) {
      expect(["open", "incomplete", "coded"]).toContain(s);
    }
    expect(charts.some(c => c.status === "completed")).toBe(false);
  });

  it("claim status 'adjudicated' is never reached today (dead enum until D3)", () => {
    const w = runWorld(createWorld(30, undefined, 7), 300);
    const claims = Array.from(w.state.insuranceClaims.values());
    const statuses = new Set(claims.map(c => c.status));
    for (const s of statuses) {
      expect(["submitted", "paid", "denied", "returned"]).toContain(s);
    }
    expect(claims.some(c => c.status === "adjudicated")).toBe(false);
  });

  it("charge.paid flips only after a Payment exists (D9, fixed in Phase 1) — world-level invariants", () => {
    const w = runWorld(createWorld(30, undefined, 7), 300);
    const s = w.state;
    const paymentsByEncounter = new Set(Array.from(s.payments.values()).map(p => p.encounterId));

    // Every payment's linked charges were flipped to paid by the cashier.
    // (A charge appended AFTER the cashier ran is allowed to remain unpaid —
    // it must then be billed strictly later than the payment.)
    for (const p of s.payments.values()) {
      const linked = Array.from(s.charges.values()).filter(c => c.encounterId === p.encounterId);
      expect(linked.length).toBeGreaterThan(0);
      expect(linked.some(c => c.paid)).toBe(true);
      for (const c of linked) {
        if (!c.paid) expect(c.billedAt).toBeGreaterThan(p.paidAt);
      }
    }
    // Converse: no charge is marked paid unless its encounter received a payment.
    for (const c of s.charges.values()) {
      if (c.paid) expect(paymentsByEncounter.has(c.encounterId)).toBe(true);
    }
  });

  it("charge.paid flips after payment — driven cashier path (deterministic, both terminal branches)", () => {
    const patients = generatePatientPool(1);
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state: HospitalState = createState(patients);

    state.encounters.set(encId, {
      id: encId, patientId: pid, type: "outpatient",
      startTime: 0, endTime: 100 * MS_PER_TICK, status: "discharged",
      payer: "Self-pay",
    });
    state.charges.set(`CHG-${pid}`, {
      id: `CHG-${pid}`, encounterId: encId, patientId: pid,
      category: "emergency", description: "ED visit (acuity 3)",
      amount: 200000, billedAt: 0, paid: false,
    });

    // Tick 155: %5 billing pass, NOT %15 → claim created, not yet adjudicated.
    state = billingHandler(state, tickClock(155), new EventQueue());
    let claim: InsuranceClaim | undefined = Array.from(state.insuranceClaims.values())[0];
    expect(claim).toBeDefined();
    expect(claim!.patientResponsibility).toBe(200000);

    // Drive adjudication to a terminal state with one persistent clock.
    const clock = createClock(60);
    for (let tick = 165; claim!.status !== "paid" && claim!.status !== "denied" && tick <= 450; tick += 15) {
      clock.tick = tick;
      clock.hospitalTimeMs = tick * MS_PER_TICK;
      state = billingHandler(state, clock, new EventQueue());
      claim = Array.from(state.insuranceClaims.values())[0];
    }
    expect(["paid", "denied"]).toContain(claim!.status);

    state = outpatientCashierHandler(state, tickClock(460), new EventQueue());

    if (claim!.status === "paid") {
      expect(state.payments.size).toBe(1);
      expect(state.charges.get(`CHG-${pid}`)!.paid).toBe(true);
    } else {
      expect(state.payments.size).toBe(0);
      expect(state.charges.get(`CHG-${pid}`)!.paid).toBe(false);
    }
  });
});
