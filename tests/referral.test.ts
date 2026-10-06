/**
 * ADR-016 wave 1: referral system tests.
 */
import { describe, it, expect } from "vitest";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createState } from "../src/engine/state-store.js";
import { generatePatientPool } from "../src/patient/generator.js";
import { referralHandler, initReferralState } from "../src/referral/system.js";
import { facilityTier, catchmentBand, distanceKm, isEligibleSender } from "../src/referral/geo.js";
import { REFERRAL_FACILITIES } from "../src/identity/data.js";
import type { HospitalState } from "../src/engine/state-store.js";

const MS_PER_TICK = 60_000;

function tickClock(tick: number) {
  const clock = createClock(60);
  clock.tick = tick;
  clock.hospitalTimeMs = tick * MS_PER_TICK;
  return clock;
}

describe("ADR-016 wave 1 — referral system", () => {
  it("draw count is invariant: exactly 6 draws per fire, regardless of gate outcome", () => {
    // Gate-pass case
    const clock1 = tickClock(15);
    const draws1: number[] = [];
    const origRng1 = clock1.rng;
    clock1.rng = () => {
      const v = origRng1();
      draws1.push(v);
      return v;
    };
    const state1 = createState(generatePatientPool(5));
    state1._referralState = initReferralState();
    referralHandler(state1, clock1, new EventQueue());
    expect(draws1.length).toBe(6);

    // Gate-fail case — still consumes all 6 draws
    const clock2 = tickClock(30);
    const draws2: number[] = [];
    const origRng2 = clock2.rng;
    clock2.rng = () => {
      const v = origRng2();
      draws2.push(v);
      return v;
    };
    const state2 = createState(generatePatientPool(5));
    state2._referralState = initReferralState();
    referralHandler(state2, clock2, new EventQueue());
    expect(draws2.length).toBe(6);
  });

  it("IDs are counter-based, not rng-derived (no REF-PAT-* or variable-length RJL-*)", () => {
    const state = createState(generatePatientPool(5));
    state._referralState = initReferralState();
    const clock = tickClock(15);
    // Force gate pass on first draw
    let drawCount = 0;
    clock.rng = () => {
      drawCount++;
      if (drawCount === 1) return 0.2; // gate passes
      return 0.5;
    };
    const result = referralHandler(state, clock, new EventQueue());
    const letters = Array.from(result._referralState.letters.values());
    expect(letters.length).toBeGreaterThan(0);
    const letter = letters[0]!;
    expect(letter.id).toMatch(/^RJL-\d{4}$/);
    expect(letter.patientId).toMatch(/^PAT-REF-\d{5}$/);
  });

  it("slot budget limits processed letters per %5 fire to 5", () => {
    const state = createState(generatePatientPool(5));
    state._referralState = initReferralState();
    const clock = tickClock(5);
    // Pre-seed 10 letters in 'active' status
    for (let i = 0; i < 10; i++) {
      const lid = `RJL-${String(i).padStart(4, "0")}`;
      state._referralState.letters.set(lid, {
        id: lid,
        patientId: `PAT-REF-${String(i).padStart(5, "0")}`,
        fromFacility: "PUSK-001",
        fromType: "Puskesmas",
        toFacility: "RSC-001",
        reason: "Test referral",
        diagnosis: "I10",
        referralDate: 0,
        status: "active" as const,
        notes: "",
      });
      state._referralState.incomingQueue.push({
        letterId: lid,
        patientId: `PAT-REF-${String(i).padStart(5, "0")}`,
        fromFacility: "PUSK-001",
        tickArrived: clock.tick,
      });
    }
    referralHandler(state, clock, new EventQueue());
    const received = Array.from(state._referralState.letters.values())
      .filter(l => l.status === "received").length;
    expect(received).toBeLessThanOrEqual(5);
  });

  it("age-out: received letters beyond 500 ticks move to returned", () => {
    const state = createState(generatePatientPool(5));
    state._referralState = initReferralState();
    const clock = tickClock(600);
    state._referralState.letters.set("RJL-0001", {
      id: "RJL-0001",
      patientId: "PAT-REF-00001",
      fromFacility: "PUSK-001",
      fromType: "Puskesmas",
      toFacility: "RSC-001",
      reason: "Test",
      diagnosis: "I10",
      referralDate: 0,
      status: "received",
      notes: "",
    });
    state._referralState.incomingQueue.push({
      letterId: "RJL-0001",
      patientId: "PAT-REF-00001",
      fromFacility: "PUSK-001",
      tickArrived: 0,
    });
    const result = referralHandler(state, clock, new EventQueue());
    const letter = result._referralState.letters.get("RJL-0001");
    expect(letter?.status).toBe("returned");
  });

  it("tier() returns correct values for all facility types", () => {
    expect(facilityTier("Puskesmas")).toBe(1);
    expect(facilityTier("Klinik")).toBe(1);
    expect(facilityTier("RS Tipe D")).toBe(2);
    expect(facilityTier("RS Tipe C")).toBe(3);
    expect(facilityTier("RS Tipe B")).toBe(4);
    expect(facilityTier("RS Tipe A")).toBe(5);
    expect(facilityTier("Unknown")).toBe(0);
  });

  it("catchmentBand() classifies correctly relative to Deers-Rock (73/71)", () => {
    expect(catchmentBand("73", "71")).toBe("city");
    expect(catchmentBand("73", "72")).toBe("province");
    expect(catchmentBand("72", "71")).toBe("eastern-indonesia");
    expect(catchmentBand("31", "74")).toBe("national");
  });

  it("eligible senders: only Sulawesi + eastern Indonesia provinces", () => {
    const eligible = REFERRAL_FACILITIES.filter(f => isEligibleSender(f.provinceCode));
    // Should exclude non-eastern (Jakarta 31, Surabaya 35)
    const nonEastern = REFERRAL_FACILITIES.filter(f => f.provinceCode === "31" || f.provinceCode === "35");
    for (const f of nonEastern) {
      expect(eligible.some(e => e.id === f.id)).toBe(false);
    }
    // Should include Sulawesi (73)
    expect(eligible.some(e => e.provinceCode === "73")).toBe(true);
  });

  it("distanceKm returns known values for major provinces", () => {
    expect(distanceKm("73")).toBe(0); // Makassar
    expect(distanceKm("72")).toBe(250); // Palu
    expect(distanceKm("91")).toBe(1800); // Jayapura
    expect(distanceKm("31")).toBe(1200); // Jakarta
  });

  it("RS C facilities are eligible senders (tier 3 included)", () => {
    const rsC = REFERRAL_FACILITIES.filter(f => f.type === "RS Tipe C");
    const eligible = rsC.filter(f => isEligibleSender(f.provinceCode));
    expect(eligible.length).toBeGreaterThan(0);
  });
});
