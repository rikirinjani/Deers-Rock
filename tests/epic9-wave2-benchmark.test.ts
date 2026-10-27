/**
 * Epic IX M9.3 wave 2 — seeded multi-tick benchmark of Jasa Raharja
 * provenance (src/referral/jr-provenance.ts) and referral transport /
 * ambulance BLS/ALS dispatch (src/referral/ambulance.ts), as wired into the
 * engine on 2026-10-27. Measured results are recorded in
 * docs/epic-audit-2026-10-26.md.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createWorld, runWorld, type World } from "../src/engine/world.js";
import { reachableByRoad, transportNeed, type AmbulanceState, type AmbulanceDispatch } from "../src/referral/ambulance.js";
import { checkJrTrigger, type JrState, type JRIIncident } from "../src/referral/jr-provenance.js";
import type { ReferralState } from "../src/referral/system.js";

const SEED = 42, PATIENTS = 60, TICKS = 900;

/** Road-accident cases planted at tick 0 so the JR path is exercised whatever the seed's case mix. */
const PLANTED: [string, string][] = [["S72", "Fracture of femur"], ["S82", "Fracture of lower leg"], ["S06", "Intracranial injury"]];

function run(): World {
  const w = createWorld(PATIENTS, undefined, SEED);
  Array.from(w.state.patients.values()).slice(0, PLANTED.length).forEach((p, i) => {
    const [code, name] = PLANTED[i]!;
    w.state.patients.set(p.id, { ...p, diagnoses: [{ code, name, active: true, priority: 0 }, ...p.diagnoses] });
  });
  return runWorld(w, TICKS);
}

const jr = (w: World) => (w.state as unknown as { _jrState: JrState })._jrState;
const amb = (w: World) => (w.state as unknown as { _ambulanceState: AmbulanceState })._ambulanceState;
const ref = (w: World) => (w.state as unknown as { _referralState: ReferralState })._referralState;

let a: World, b: World;
beforeAll(() => { a = run(); b = run(); }, 300_000);

describe("Epic IX wave 2 — Jasa Raharja provenance over a seeded run", () => {
  it("logs incidents tied to trigger-ICD encounters, consistent damage levels and counter", () => {
    const incidents: JRIIncident[] = Array.from(jr(a).incidents.values());
    expect(incidents.length).toBeGreaterThan(0);
    for (const inc of incidents) {
      expect(inc.encounterIds?.length).toBeGreaterThan(0);
      expect(inc.encounterIds![0]).toBe(inc.encounterId);
      for (const id of inc.encounterIds!) {
        const enc = a.state.encounters.get(id);
        if (enc) expect(checkJrTrigger({ primaryDiagnosis: enc.primaryDiagnosis ?? "", patientId: enc.patientId })).not.toBeNull();
      }
      expect(inc.damageLevel).toBe(/^S[789]/.test(inc.triggerIcd) ? "severe" : "moderate");
    }
    expect(jr(a).counter).toBe(incidents.length);
  });

  it("files every trigger-ICD encounter older than one handler period under exactly one incident", () => {
    const owners = new Map<string, number>();
    for (const inc of jr(a).incidents.values()) for (const e of inc.encounterIds ?? []) owners.set(e, (owners.get(e) ?? 0) + 1);
    const lastFire = TICKS - (TICKS % 5);
    for (const e of a.state.encounters.values()) {
      if (checkJrTrigger({ primaryDiagnosis: e.primaryDiagnosis ?? "", patientId: e.patientId }) === null) continue;
      if (e.startTime / 60_000 > lastFire) continue;
      expect(owners.get(e.id), e.id).toBe(1);
    }
  });

  it("one accident is one incident: no patient has two incidents inside the 30-day window", () => {
    const byPatient = new Map<string, number[]>();
    for (const inc of jr(a).incidents.values()) byPatient.set(inc.patientId!, [...(byPatient.get(inc.patientId!) ?? []), inc.tick]);
    for (const ticks of byPatient.values()) {
      ticks.sort((x, y) => x - y);
      for (let i = 1; i < ticks.length; i++) expect(ticks[i]! - ticks[i - 1]!).toBeGreaterThan(30 * 1440);
    }
  });

  it("Jasa Raharja claims for incident encounters carry the incidentRef", () => {
    const owner = new Map<string, string>();
    for (const inc of jr(a).incidents.values()) for (const e of inc.encounterIds ?? []) owner.set(e, inc.id);
    const jrClaims = Array.from(a.state.insuranceClaims.values()).filter(c => c.payer === "Jasa Raharja");
    for (const c of jrClaims) if (owner.has(c.encounterId)) expect(c.incidentRef).toBe(owner.get(c.encounterId));
    for (const c of a.state.insuranceClaims.values()) if (c.payer !== "Jasa Raharja") expect(c.incidentRef).toBeUndefined();
  });

  it("is deterministic for a seed", () => {
    expect(JSON.stringify(Array.from(jr(b).incidents.entries()))).toBe(JSON.stringify(Array.from(jr(a).incidents.entries())));
  });
});

describe("Epic IX wave 2 — referral transport and ambulance dispatch over a seeded run", () => {
  it("decides transport for every received letter, by diagnosis and road reachability", () => {
    const { letters, facilities } = ref(a);
    const decided = Array.from(letters.values()).filter(l => l.transport !== undefined);
    expect(decided.length).toBeGreaterThan(0);
    for (const l of decided) {
      const prov = facilities.get(l.fromFacility)!.provinceCode;
      const need = transportNeed(l.diagnosis);
      if (need === "none") expect(l.transport).toBe("self");
      else if (!reachableByRoad(prov)) expect(l.transport).toBe("sea_air");
      else expect(l.transport).toBe("ambulance");
      if (l.transport === "ambulance") expect(amb(a).dispatches.get(l.dispatchId!)?.letterId).toBe(l.id);
      else expect(l.dispatchId).toBeUndefined();
    }
  });

  it("prices and times every dispatch by tier (BLS 200k+2k/km @60, ALS 500k+5k/km @80)", () => {
    const ds: AmbulanceDispatch[] = Array.from(amb(a).dispatches.values());
    expect(ds.length).toBeGreaterThan(0);
    for (const d of ds) {
      const tier = amb(a).fleet.get(d.ambulanceId)!.tier;
      expect(d.costIdr).toBe(tier === "BLS" ? 200_000 + 2_000 * d.distanceKm : 500_000 + 5_000 * d.distanceKm);
      expect(d.etaTick - d.departTick).toBe(Math.ceil((d.distanceKm / (tier === "BLS" ? 60 : 80)) * 60));
      expect(d.neededTier).toBe(transportNeed(ref(a).letters.get(d.letterId!)!.diagnosis));
    }
  });

  it("arrived referrals become visits for real patients; the letter is completed and linked", () => {
    const completed = Array.from(ref(a).letters.values()).filter(l => l.status === "completed");
    expect(completed.length).toBeGreaterThan(0);
    for (const l of completed) {
      expect(l.patientId.startsWith("PAT-REF-")).toBe(false);
      expect(l.placeholderPatientId?.startsWith("PAT-REF-")).toBe(true);
      expect(a.state.patients.has(l.patientId)).toBe(true);
      expect(l.arrivalTick).toBeDefined();
      const visit = Array.from(a.state._outpatientVisits.values()).find(v => v.referralId === l.id);
      if (visit) { expect(visit.patientId).toBe(l.patientId); expect(visit.encounterId).toBe(l.encounterId); }
    }
  });

  it("charges each arrived ambulance once, on the arrival encounter, at the dispatch cost", () => {
    for (const d of amb(a).dispatches.values()) {
      if (!d.chargeId) continue;
      expect(d.status).toBe("arrived");
      const c = a.state.charges.get(d.chargeId);
      if (!c) continue; // charge pruned by cleanup
      expect(c.category).toBe("ambulance");
      expect(c.amount).toBe(d.costIdr);
      expect(c.encounterId).toBe(d.encounterId);
    }
    expect(Array.from(amb(a).dispatches.values()).filter(d => d.chargeId).length).toBeGreaterThan(0);
    const ambCharges = Array.from(a.state.charges.values()).filter(c => c.category === "ambulance");
    expect(new Set(ambCharges.map(c => c.encounterId)).size).toBe(ambCharges.length);
  });

  it("fleet of 3 caps concurrency and arrivals free the vehicle", () => {
    const fleet = amb(a).fleet;
    const enRoute = Array.from(amb(a).dispatches.values()).filter(d => d.status === "en-route");
    expect(enRoute.length).toBeLessThanOrEqual(3);
    for (const d of amb(a).dispatches.values()) if (d.etaTick <= TICKS - 5) expect(d.status).toBe("arrived");
    const busy = new Set(enRoute.map(d => d.ambulanceId));
    for (const v of fleet.values()) expect(v.status === "dispatched").toBe(busy.has(v.id));
  });

  it("is deterministic for a seed", () => {
    expect(JSON.stringify(Array.from(amb(b).dispatches.entries()))).toBe(JSON.stringify(Array.from(amb(a).dispatches.entries())));
    expect(JSON.stringify(Array.from(ref(b).letters.entries()))).toBe(JSON.stringify(Array.from(ref(a).letters.entries())));
  });
});
