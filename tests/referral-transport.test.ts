/**
 * Epic IX M9.3 (2026-10-27) — referral transport, ambulance charge,
 * letter ↔ visit back-link, and Jasa Raharja incident ↔ claim link.
 * Hand-built letters on a real createWorld() so each case is deterministic.
 */
import { describe, it, expect } from "vitest";
import { createWorld, type World } from "../src/engine/world.js";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import {
  ambulanceHandler, transportNeed, reachableByRoad, dispatchAmbulance, initAmbulanceState, type AmbulanceState,
} from "../src/referral/ambulance.js";
import { jrProvenanceHandler, getIncidentForEncounter, type JrState } from "../src/referral/jr-provenance.js";
import { referralHandler, type ReferralState } from "../src/referral/system.js";
import { outpatientHandler } from "../src/engine/outpatient.js";
import type { ReferralLetter } from "../src/identity/types.js";
import type { HospitalState } from "../src/engine/state-store.js";
import type { Encounter } from "../src/patient/schema.js";

const q = () => new EventQueue();
function clockAt(tick: number) { const c = createClock(60, 1); c.tick = tick; c.hospitalTimeMs = tick * 60_000; return c; }
const refOf = (s: HospitalState) => (s as unknown as { _referralState: ReferralState })._referralState;
const ambOf = (s: HospitalState) => (s as unknown as { _ambulanceState: AmbulanceState })._ambulanceState;
const jrOf = (s: HospitalState) => (s as unknown as { _jrState: JrState })._jrState;

function letter(id: string, fromFacility: string, diagnosis: string): ReferralLetter {
  return {
    id, patientId: `PAT-REF-${id}`, fromFacility, fromType: "Puskesmas", toFacility: "RSC-001",
    reason: "x", diagnosis, referralDate: 0, status: "received", notes: "",
  };
}

function withLetters(w: World, ...ls: ReferralLetter[]): HospitalState {
  const r = refOf(w.state);
  return { ...w.state, _referralState: { ...r, letters: new Map(ls.map(l => [l.id, l])) } } as HospitalState;
}

describe("transport decision", () => {
  it("maps referral diagnoses to ALS / BLS / own transport", () => {
    expect(transportNeed("I21")).toBe("ALS");
    expect(transportNeed("I50.9")).toBe("ALS");
    expect(transportNeed("S72")).toBe("BLS");
    expect(transportNeed("K35")).toBe("BLS");
    expect(transportNeed("I10")).toBe("none");
    expect(transportNeed("E11")).toBe("none");
  });

  it("only Sulawesi senders are reachable by road", () => {
    for (const p of ["71", "72", "73", "74", "75", "76"]) expect(reachableByRoad(p)).toBe(true);
    for (const p of ["63", "81", "91", "53"]) expect(reachableByRoad(p)).toBe(false);
  });

  it("dispatchAmbulance prefers the needed tier and falls back to the other", () => {
    const s = initAmbulanceState();
    const bls = dispatchAmbulance(s, 72, 73, 250, "L1", 0, "BLS")!;
    expect(s.fleet.get(s.dispatches.get(bls)!.ambulanceId)!.tier).toBe("BLS");
    const als = dispatchAmbulance(s, 72, 73, 250, "L2", 0, "ALS")!;
    expect(s.fleet.get(s.dispatches.get(als)!.ambulanceId)!.tier).toBe("ALS");
    const fallback = dispatchAmbulance(s, 72, 73, 250, "L3", 0, "ALS")!; // ALS busy → remaining BLS
    expect(s.fleet.get(s.dispatches.get(fallback)!.ambulanceId)!.tier).toBe("BLS");
    expect(s.dispatches.get(fallback)!.neededTier).toBe("ALS");
    expect(dispatchAmbulance(s, 72, 73, 250, "L4", 0, "BLS")).toBeNull();
  });

  it("ambulanceHandler dispatches road referrals, never sea/air ones, and leaves its input untouched", () => {
    const w = createWorld(5, undefined, 1);
    const s = withLetters(w,
      letter("RJL-A", "PUSK-015", "S72"),  // Palu, road, BLS
      letter("RJL-B", "PUSK-007", "I21"),  // Ambon, sea → not modelled
      letter("RJL-C", "PUSK-003", "I10"),  // Makassar, own transport
    );
    const s2 = ambulanceHandler(s, clockAt(10), q());
    const L = refOf(s2).letters;
    expect(L.get("RJL-A")!.transport).toBe("ambulance");
    const d = ambOf(s2).dispatches.get(L.get("RJL-A")!.dispatchId!)!;
    expect(d.distanceKm).toBe(250);
    expect(d.neededTier).toBe("BLS");
    expect(L.get("RJL-A")!.arrivalTick).toBe(d.etaTick);
    expect(L.get("RJL-B")!.transport).toBe("sea_air");
    expect(L.get("RJL-B")!.dispatchId).toBeUndefined();
    expect(L.get("RJL-C")!).toMatchObject({ transport: "self", arrivalTick: 10 });
    expect(ambOf(s).dispatches.size).toBe(0);
    expect(refOf(s).letters.get("RJL-A")!.transport).toBeUndefined();
  });

  it("with the fleet all out, the letter waits and is dispatched on a later pass", () => {
    const w = createWorld(5, undefined, 1);
    let s = withLetters(w, letter("L1", "PUSK-015", "S72"), letter("L2", "PUSK-015", "K35"), letter("L3", "PUSK-015", "J15"), letter("L4", "PUSK-015", "J44"));
    s = ambulanceHandler(s, clockAt(5), q());
    expect(refOf(s).letters.get("L4")!.transport).toBeUndefined();
    s = ambulanceHandler(s, clockAt(5 + 260), q()); // 250 km at 60 km/h = 250 ticks: vehicles back
    expect(refOf(s).letters.get("L4")!.transport).toBe("ambulance");
  });
});

describe("arrival, letter back-link and ambulance charge", () => {
  function arrive(): { s: HospitalState; at: number } {
    const w = createWorld(5, undefined, 1);
    let s = ambulanceHandler(withLetters(w, letter("RJL-A", "PUSK-015", "S72")), clockAt(4), q());
    const at = refOf(s).letters.get("RJL-A")!.arrivalTick!;
    return { s, at };
  }

  it("no visit until the patient arrives; then a real patient carrying the referral diagnosis", () => {
    const { s, at } = arrive();
    const before = outpatientHandler(s, clockAt(at - (at % 12) - 12 > 0 ? at - (at % 12) - 12 : 12), q());
    expect(Array.from(before._outpatientVisits.values()).some(v => v.referralId === "RJL-A")).toBe(false);
    const t = at + (12 - (at % 12)); // next tick that is both %3 (cadence) and %4 (arrivals)
    const s2 = outpatientHandler(s, clockAt(t), q());
    const visit = Array.from(s2._outpatientVisits.values()).find(v => v.referralId === "RJL-A")!;
    expect(visit).toBeDefined();
    expect(visit.poli).toBe("POLI-BEDAH");
    expect(visit.icdCode).toBe("S72");
    const L = refOf(s2).letters.get("RJL-A")!;
    expect(L.status).toBe("completed");
    expect(L.placeholderPatientId).toBe("PAT-REF-RJL-A");
    expect(L.patientId).toBe(visit.patientId);
    expect(L.encounterId).toBe(visit.encounterId);
    const pat = s2.patients.get(visit.patientId)!;
    expect(pat.diagnoses[0]).toMatchObject({ code: "S72", priority: 0 });
    expect(s2.encounters.get(visit.encounterId)!.payer).toBe("Jasa Raharja");
    expect(s.patients.has(visit.patientId)).toBe(false); // input state not mutated
  });

  it("posts the ambulance charge once, at the dispatch cost, on the arrival encounter", () => {
    const { s, at } = arrive();
    const t = at + (12 - (at % 12));
    let s2 = outpatientHandler(s, clockAt(t), q());
    s2 = ambulanceHandler(s2, clockAt(t + 5), q());
    s2 = ambulanceHandler(s2, clockAt(t + 10), q());
    const encId = refOf(s2).letters.get("RJL-A")!.encounterId!;
    const amb = Array.from(s2.charges.values()).filter(c => c.category === "ambulance");
    expect(amb).toHaveLength(1);
    const d = ambOf(s2).dispatches.get(refOf(s2).letters.get("RJL-A")!.dispatchId!)!;
    expect(amb[0]).toMatchObject({ encounterId: encId, amount: 200_000 + 2_000 * 250, code: "AMB-BLS" });
    expect(d.chargeId).toBe(amb[0]!.id);
    expect(d.encounterId).toBe(encId);
  });

  it("letters in transit do not age out; age counts from arrival", () => {
    const w = createWorld(5, undefined, 1);
    const inTransit = { ...letter("L1", "PUSK-015", "S72"), transport: "ambulance" as const, arrivalTick: 900 };
    let s = withLetters(w, inTransit);
    s = referralHandler(s, clockAt(700), q());
    expect(refOf(s).letters.get("L1")!.status).toBe("received");
    s = referralHandler(s, clockAt(1300), q());
    expect(refOf(s).letters.get("L1")!.status).toBe("received");
    s = referralHandler(s, clockAt(1450), q());
    expect(refOf(s).letters.get("L1")!.status).toBe("returned");
  });
});

describe("Jasa Raharja incident per accident, linked to letter and claim", () => {
  function enc(id: string, patientId: string, tick: number, dx = "S72"): Encounter {
    return { id, patientId, type: "inpatient", startTime: tick * 60_000, endTime: null, status: "active", payer: "Jasa Raharja", primaryDiagnosis: dx };
  }

  it("re-presentations within 30 days join the first incident; later ones open a new incident", () => {
    const w = createWorld(5, undefined, 1);
    const encounters = new Map([
      ["E1", enc("E1", "P1", 10)], ["E2", enc("E2", "P1", 400)], ["E3", enc("E3", "P2", 20)],
      ["E4", enc("E4", "P1", 10 + 31 * 1440)], ["E5", enc("E5", "P3", 30, "I10")],
    ]);
    const s = jrProvenanceHandler({ ...w.state, encounters }, clockAt(50_000), q());
    const incs = Array.from(jrOf(s).incidents.values());
    expect(incs).toHaveLength(3);
    expect(getIncidentForEncounter(jrOf(s), "E2")!.id).toBe(getIncidentForEncounter(jrOf(s), "E1")!.id);
    expect(getIncidentForEncounter(jrOf(s), "E4")!.id).not.toBe(getIncidentForEncounter(jrOf(s), "E1")!.id);
    expect(getIncidentForEncounter(jrOf(s), "E5")).toBeUndefined();
    // A second pass adds nothing.
    expect(jrProvenanceHandler(s, clockAt(50_005), q())._jrState.incidents.size).toBe(3);
  });

  it("records the referral letter and ambulance dispatch the patient arrived by", () => {
    const w = createWorld(5, undefined, 1);
    const r = refOf(w.state);
    const l = { ...letter("RJL-Z", "PUSK-015", "S72"), status: "completed" as const, encounterId: "E9", dispatchId: "DISP-0001" };
    const s = jrProvenanceHandler({
      ...w.state, encounters: new Map([["E9", enc("E9", "P9", 10)]]),
      _referralState: { ...r, letters: new Map([[l.id, l]]) },
    } as HospitalState, clockAt(20), q());
    expect(getIncidentForEncounter(jrOf(s), "E9")).toMatchObject({ letterId: "RJL-Z", dispatchId: "DISP-0001", patientId: "P9" });
  });
});
