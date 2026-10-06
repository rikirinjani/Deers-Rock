import { describe, it, expect } from "vitest";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { billingHandler, inpatientCashierHandler } from "../src/engine/finance.js";
import { appendCharge } from "../src/engine/charge-generator.js";
import { DRUG_PRICES, labPrice, radiologyPrice, surgeryPrice, dialysisPrice, radiotherapyPrice, edFee, specialtyConsultFee } from "../src/engine/price-tables.js";
import type { Encounter, RoomClass } from "../src/patient/schema.js";

const MS_PER_TICK = 60_000;
const DAY = 1440; // sim-ticks per sim-day (1 tick = 1 sim-minute)

function tickClock(tick: number) {
  const clock = createClock(60);
  clock.tick = tick;
  clock.hospitalTimeMs = tick * MS_PER_TICK;
  return clock;
}

function makeActiveEncounter(
  patientId: string,
  payer: Encounter["payer"] = "BPJS Kesehatan",
  roomClassAtAdmission?: RoomClass,
): Encounter {
  return {
    id: `ENC-${patientId}`, patientId, type: "inpatient",
    startTime: 0, endTime: null, status: "active", payer,
    ...(roomClassAtAdmission !== undefined ? { roomClassAtAdmission } : {}),
  };
}

function makeDischargedEncounter(
  patientId: string,
  payer: Encounter["payer"] = "BPJS Kesehatan",
  roomClassAtAdmission: RoomClass | undefined = "kelas-3",
  endTick = 2 * DAY,
): Encounter {
  return {
    id: `ENC-${patientId}`, patientId, type: "inpatient",
    startTime: 0, endTime: endTick * MS_PER_TICK, status: "discharged", payer,
    ...(roomClassAtAdmission !== undefined ? { roomClassAtAdmission } : {}),
  };
}

function roomCharges(state: { charges: Map<string, ReturnType<typeof Object>> } | any): any[] {
  return Array.from(state.charges.values()).filter((c: any) => c.category === "room");
}

describe("Finance — room billing per sim-day (ADR-015 D2, fixes F-A)", () => {
  it("bills room once per complete 1440-tick day; kelas-3 = 350k/day", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    state.encounters.set(encId, makeActiveEncounter(pid, "BPJS Kesehatan", "kelas-3"));

    // Day not yet complete at tick 1435 (billing cadence tick): no room charge.
    let s = billingHandler(state, tickClock(1435), new EventQueue());
    expect(roomCharges(s).length).toBe(0);

    // First complete day at tick 1440 → exactly one 350k charge.
    s = billingHandler(s, tickClock(DAY), new EventQueue());
    const day1 = roomCharges(s);
    expect(day1.length).toBe(1);
    expect(day1[0]!.amount).toBe(350000);
    expect(day1[0]!.paid).toBe(false);
    expect(day1[0]!.description).toContain("day 1");

    // Second complete day at tick 2880.
    s = billingHandler(s, tickClock(2 * DAY), new EventQueue());
    expect(roomCharges(s).length).toBe(2);

    // Idempotency: re-running the handler between anniversaries adds nothing.
    s = billingHandler(s, tickClock(2 * DAY + 5), new EventQueue());
    expect(roomCharges(s).length).toBe(2);
  });

  it("applies room-class multipliers to the daily rate (kelas-1 = 2×)", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const state = createState(patients);
    state.encounters.set(`ENC-${pid}`, makeActiveEncounter(pid, "BPJS Kesehatan", "kelas-1"));

    const s = billingHandler(state, tickClock(DAY), new EventQueue());
    const rooms = roomCharges(s);
    expect(rooms.length).toBe(1);
    expect(rooms[0]!.amount).toBe(700000);
  });

  it("charges one final partial day at discharge (min 1 day)", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    // Admitted tick 0, discharged at tick 500 — less than one full day.
    state.encounters.set(encId, makeDischargedEncounter(pid, "BPJS Kesehatan", "kelas-3", 500));

    const s = billingHandler(state, tickClock(505), new EventQueue());
    const rooms = roomCharges(s);
    // total days = max(1, ceil(500/1440)) = 1 → exactly one charge.
    expect(rooms.length).toBe(1);
    expect(rooms[0]!.amount).toBe(350000);

    // Later passes must not add more days (endTime caps the total).
    const s2 = billingHandler(s, tickClock(2 * DAY + 10), new EventQueue());
    expect(roomCharges(s2).length).toBe(1);
  });

  it("catches up on missed full days then bills the discharge remainder", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    const state = createState(patients);
    // Admitted tick 0, discharged at tick 3.5 days = 5040 ticks.
    state.encounters.set(encId, makeDischargedEncounter(pid, "BPJS Kesehatan", "kelas-3", 5040));

    // First billing pass happens long after discharge (e.g. handler was down).
    const s = billingHandler(state, tickClock(5045), new EventQueue());
    const rooms = roomCharges(s);
    // ceil(5040/1440) = 3.5 → 4 days billed in one pass: 3 full + 1 partial.
    expect(rooms.length).toBe(4);
    const total = rooms.reduce((sum: number, c: any) => sum + c.amount, 0);
    expect(total).toBe(4 * 350000);
  });

  it("never bills room charges for encounters without an admission bed stamp (outpatient/ED)", () => {
    const patients = generatePatientPool(1);
    const pid = patients[0]!.id;
    const state = createState(patients);
    // Active inpatient WITHOUT roomClassAtAdmission + an outpatient encounter:
    // neither may accrue room charges.
    state.encounters.set(`ENC-${pid}`, makeActiveEncounter(pid));
    const out: Encounter = {
      id: `ED-${pid}`, patientId: pid, type: "outpatient",
      startTime: 0, endTime: null, status: "active", payer: "BPJS Kesehatan",
    };
    state.encounters.set(out.id, out);

    const s = billingHandler(state, tickClock(3 * DAY), new EventQueue());
    expect(roomCharges(s).length).toBe(0);
    // Administration fee still applies (unchanged behavior).
    expect(Array.from(s.charges.values()).filter(c => c.category === "administration").length).toBe(2);
  });
});

describe("Pricing (ADR-015 D1)", () => {
  it("amount stays canonical: unitPrice × quantity, with additive fields", () => {
    const charges = appendCharge(new Map(), tickClock(10), "ENC-1", "PAT-1", "lab",
      "Lab test: Troponin I", undefined, { code: "TROP", unitPrice: 450000, quantity: 1 });
    const c = Array.from(charges.values())[0]!;
    expect(c.amount).toBe(450000);
    expect(c.unitPrice).toBe(450000);
    expect(c.quantity).toBe(1);
    expect(c.code).toBe("TROP");
    expect(c.paid).toBe(false);
  });

  it("legacy flat-rate calls are unchanged (no price triple → CHARGE_RATES)", () => {
    const charges = appendCharge(new Map(), tickClock(10), "ENC-1", "PAT-1", "administration", "Administration fee");
    const c = Array.from(charges.values())[0]!;
    expect(c.amount).toBe(150000);
    expect(c.code).toBeUndefined();
    expect(c.unitPrice).toBeUndefined();
    expect(c.quantity).toBeUndefined();
  });

  it("pharmacy prices are computed at module load: costIdr × 1.25", () => {
    // Paracetamol 500mg acquisition 200 IDR → billed 250 IDR.
    expect(DRUG_PRICES.get("PRC")).toBe(250);
    // Enoxaparin 40mg acquisition 30_000 → 37_500.
    expect(DRUG_PRICES.get("HEP")).toBe(37500);
  });

  it("table lookups fall back to flat CHARGE_RATES on unknown keys", () => {
    expect(labPrice("NOT-A-TEST")).toBe(250000);
    expect(radiologyPrice("Unknown study")).toBe(500000);
    expect(surgeryPrice("99999")).toBe(5000000);
    expect(dialysisPrice("unknown")).toBe(900000);
    expect(radiotherapyPrice("unknown")).toBe(800000);
    expect(edFee(9)).toBe(400000);
    expect(specialtyConsultFee("not_a_specialty")).toBe(150000);
  });

  it("known table entries return their concrete IDR prices", () => {
    expect(labPrice("TROP")).toBe(450000);
    expect(radiologyPrice("MRI Lumbar Spine without contrast")).toBe(2500000);
    expect(surgeryPrice("27130")).toBe(15000000);
    expect(dialysisPrice("hdf")).toBe(1100000);
    expect(radiotherapyPrice("imrt")).toBe(1200000);
    expect(edFee(1)).toBe(400000);
    expect(specialtyConsultFee("endoscopy")).toBe(350000);
  });
});

describe("Finance — claims & cashier", () => {
  it("creates insurance claims on discharge when charges exist", () => {
    const patients = generatePatientPool(1);
    // Pin the primary diagnosis to a code with a guaranteed INA-CBG mapping:
    // the claim's tariff lookup uses the PATIENT's active diagnosis
    // (finance.ts), while generatePatientPool draws diagnosis codes at
    // random (see finance-characterization.test.ts for the pinned divergence
    // behavior).
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    // Step 1: one complete inpatient day while active (tick 1440)
    state.encounters.set(encId, makeActiveEncounter(pid, "BPJS Kesehatan", "kelas-3"));
    state = billingHandler(state, tickClock(DAY), new EventQueue());
    expect(state.charges.size).toBe(2); // administration + room day 1

    // Step 2: Create coded medical chart so BPJS claim can be submitted
    state.medicalCharts.set(`CHART-${pid}`, {
      id: `CHART-${pid}`, encounterId: encId, patientId: pid, status: "coded",
      createdAt: 0, completedAt: DAY * MS_PER_TICK,
      diagnoses: [{ code: "A09", name: "Infectious gastroenteritis", type: "primary" }],
      procedures: [], coder: "AI Coder",
    });

    // Step 3: Discharge and run billing again (tick DAY+5: not a %15 tick, so
    // the claim stays "submitted" — adjudication fires only on %15 ticks).
    state.encounters.set(encId, makeDischargedEncounter(pid, "BPJS Kesehatan", "kelas-3", DAY + 10));
    state = billingHandler(state, tickClock(DAY + 5), new EventQueue());

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
    // claim at creation, which made this test pass vacuously.
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    state.encounters.set(encId, makeActiveEncounter(pid, "BPJS Kesehatan", "kelas-3"));
    state = billingHandler(state, tickClock(DAY), new EventQueue());

    state.encounters.set(encId, makeDischargedEncounter(pid, "BPJS Kesehatan", "kelas-3", DAY + 10));
    state.medicalCharts.set(`CHART-${pid}`, {
      id: `CHART-${pid}`, encounterId: encId, patientId: pid, status: "coded",
      createdAt: 0, completedAt: DAY * MS_PER_TICK,
      diagnoses: [{ code: "A09", name: "Infectious gastroenteritis", type: "primary" }],
      procedures: [], coder: "AI Coder",
    });
    state = billingHandler(state, tickClock(DAY + 5), new EventQueue());
    expect(state.insuranceClaims.size).toBeGreaterThanOrEqual(1);

    // Adjudication outcome is rolled (finance.ts: 85% paid, 10% returned for
    // coding issues, 5% denied). Keep driving 15-tick passes with ONE clock
    // (rng state persists) until terminal; P(unresolved after 20 passes)
    // ≤ 0.1^20. See the pre-ADR-015 CI flake note: a fresh clock per pass
    // would re-draw identical rolls within the same millisecond.
    let claim = Array.from(state.insuranceClaims.values())[0]!;
    const adjudicationClock = createClock(60);
    for (let tick = DAY + 30; claim.status !== "paid" && claim.status !== "denied" && tick <= DAY + 300; tick += 15) {
      adjudicationClock.tick = tick;
      adjudicationClock.hospitalTimeMs = tick * MS_PER_TICK;
      state = billingHandler(state, adjudicationClock, new EventQueue());
      claim = Array.from(state.insuranceClaims.values())[0]!;
    }

    expect(["paid", "denied"]).toContain(claim.status);
    expect(claim.resolvedAt).not.toBeNull();
  });

  it("cashier collects patient responsibility and flips linked charges to paid (ADR-015 D9)", () => {
    const patients = generatePatientPool(1);
    patients[0]!.diagnoses = [{ code: "A09", name: "Infectious gastroenteritis", active: true }];
    const pid = patients[0]!.id;
    const encId = `ENC-${pid}`;
    let state = createState(patients);

    // Self-pay outpatient encounter with one charge: patient responsibility
    // equals the full charge total, so the cashier path is exercised whenever
    // the claim reaches "paid".
    state.encounters.set(encId, {
      id: encId, patientId: pid, type: "inpatient",
      startTime: 0, endTime: (DAY + 10) * MS_PER_TICK, status: "discharged",
      payer: "Self-pay",
    });
    state.charges.set(`CHG-${pid}`, {
      id: `CHG-${pid}`, encounterId: encId, patientId: pid,
      category: "administration", description: "Administration fee",
      amount: 150000, billedAt: 0, paid: false,
    });
    // Tick DAY+5 (1445): %5 billing pass but NOT %15 — claim created, not yet adjudicated.
    state = billingHandler(state, tickClock(DAY + 5), new EventQueue());
    const claim0 = Array.from(state.insuranceClaims.values())[0]!;
    expect(claim0.status).toBe("submitted");
    expect(claim0.patientResponsibility).toBe(150000);

    let claim = claim0;
    const clock = createClock(60);
    for (let tick = DAY + 30; claim.status !== "paid" && claim.status !== "denied" && tick <= DAY + 300; tick += 15) {
      clock.tick = tick;
      clock.hospitalTimeMs = tick * MS_PER_TICK;
      state = billingHandler(state, clock, new EventQueue());
      claim = Array.from(state.insuranceClaims.values())[0]!;
    }
    expect(["paid", "denied"]).toContain(claim.status);

    state = inpatientCashierHandler(state, tickClock(DAY + 320), new EventQueue());

    if (claim.status === "paid") {
      expect(state.payments.size).toBe(1);
      const payment = Array.from(state.payments.values())[0]!;
      expect(payment.amount).toBe(150000);
      expect(["cash", "card"]).toContain(payment.type);
      // D9: the linked charge flipped to paid in the same pass.
      expect(state.charges.get(`CHG-${pid}`)!.paid).toBe(true);
    } else {
      // Denied claims never reach the cashier: charge stays unpaid.
      expect(state.payments.size).toBe(0);
      expect(state.charges.get(`CHG-${pid}`)!.paid).toBe(false);
    }
  });
});
