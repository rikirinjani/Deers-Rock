/**
 * Epic IX M9.3 wave 2 — seeded multi-tick benchmark of Jasa Raharja
 * provenance (src/referral/jr-provenance.ts) and ambulance BLS/ALS dispatch
 * (src/referral/ambulance.ts). Measured results are recorded in
 * docs/epic-audit-2026-10-26.md.
 *
 * The engine never calls dispatchAmbulance (no caller in src/), so the
 * ambulance half drives the module from the referral letters the seeded run
 * actually receives: one dispatch request per received letter, from the
 * sender facility's province to Makassar (73), distance from geo.distanceKm.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createWorld, step, runWorld, type World } from "../src/engine/world.js";
import { dispatchAmbulance, type AmbulanceState, type AmbulanceDispatch } from "../src/referral/ambulance.js";
import { checkJrTrigger, type JrState, type JRIIncident } from "../src/referral/jr-provenance.js";
import { distanceKm } from "../src/referral/geo.js";

const SEED = 42, PATIENTS = 60, TICKS = 600;

interface Run { w: World; refused: number; received: number; maxEnRoute: number }

/** Road-accident cases planted at tick 0 so the JR path is exercised whatever the seed's case mix. */
const PLANTED: [string, string][] = [["S72", "Fracture of femur"], ["S82", "Fracture of lower leg"], ["S06", "Intracranial injury"]];

function run(): Run {
  let w = createWorld(PATIENTS, undefined, SEED);
  Array.from(w.state.patients.values()).slice(0, PLANTED.length).forEach((p, i) => {
    const [code, name] = PLANTED[i]!;
    w.state.patients.set(p.id, { ...p, diagnoses: [{ code, name, active: true, priority: 0 }, ...p.diagnoses] });
  });
  const seen = new Set<string>();
  let refused = 0, maxEnRoute = 0;
  for (let t = 1; t <= TICKS; t++) {
    w = step(w);
    const s = w.state as any;
    const amb: AmbulanceState = s._ambulanceState;
    for (const [id, letter] of s._referralState.letters) {
      if (letter.status !== "received" || seen.has(id)) continue;
      seen.add(id);
      const prov = s._referralState.facilities.get(letter.fromFacility).provinceCode as string;
      if (dispatchAmbulance(amb, Number(prov), 73, distanceKm(prov), id, w.clock.tick) === null) refused++;
    }
    maxEnRoute = Math.max(maxEnRoute, Array.from(amb.dispatches.values()).filter(d => d.status === "en-route").length);
  }
  return { w, refused, received: seen.size, maxEnRoute };
}

const jr = (w: World) => (w.state as unknown as { _jrState: JrState })._jrState;
const amb = (w: World) => (w.state as unknown as { _ambulanceState: AmbulanceState })._ambulanceState;

let a: Run, b: Run;
beforeAll(() => { a = run(); b = run(); }, 240_000);

describe("Epic IX wave 2 — Jasa Raharja provenance over a seeded run", () => {
  it("logs incidents, each tied to a trigger-ICD encounter, one per encounter", () => {
    const incidents: JRIIncident[] = Array.from(jr(a.w).incidents.values());
    expect(incidents.length).toBeGreaterThan(0);
    const perEnc = new Map<string, number>();
    for (const inc of incidents) {
      expect(inc.encounterId).toBeDefined();
      perEnc.set(inc.encounterId!, (perEnc.get(inc.encounterId!) ?? 0) + 1);
      const enc = a.w.state.encounters.get(inc.encounterId!);
      if (enc) expect(checkJrTrigger({ primaryDiagnosis: enc.primaryDiagnosis ?? "", patientId: enc.patientId })).toBe(inc.triggerIcd);
      expect(inc.damageLevel).toBe(/^S[789]/.test(inc.triggerIcd) ? "severe" : "moderate");
    }
    expect(Math.max(...perEnc.values())).toBe(1);
    expect(jr(a.w).counter).toBe(incidents.length);
  });

  it("covers every trigger-ICD encounter older than one handler period", () => {
    const logged = new Set(Array.from(jr(a.w).incidents.values()).map(i => i.encounterId));
    const lastFire = TICKS - (TICKS % 5);
    const missing = Array.from(a.w.state.encounters.values()).filter(e =>
      checkJrTrigger({ primaryDiagnosis: e.primaryDiagnosis ?? "", patientId: e.patientId }) !== null
      && e.startTime / 60_000 <= lastFire && !logged.has(e.id));
    expect(missing).toEqual([]);
  });

  it("is deterministic for a seed", () => {
    expect(JSON.stringify(Array.from(jr(b.w).incidents.entries()))).toBe(JSON.stringify(Array.from(jr(a.w).incidents.entries())));
  });
});

describe("Epic IX wave 2 — ambulance BLS/ALS dispatch over a seeded run", () => {
  it("prices and times every dispatch by tier (BLS 200k+2k/km @60, ALS 500k+5k/km @80)", () => {
    const ds: AmbulanceDispatch[] = Array.from(amb(a.w).dispatches.values());
    expect(ds.length).toBeGreaterThan(0);
    for (const d of ds) {
      const tier = amb(a.w).fleet.get(d.ambulanceId)!.tier;
      expect(d.costIdr).toBe(tier === "BLS" ? 200_000 + 2_000 * d.distanceKm : 500_000 + 5_000 * d.distanceKm);
      expect(d.etaTick - d.departTick).toBe(Math.ceil((d.distanceKm / (tier === "BLS" ? 60 : 80)) * 60));
    }
  });

  it("every received letter is either dispatched or refused; fleet of 3 caps concurrency", () => {
    expect(a.received).toBeGreaterThan(0);
    expect(amb(a.w).dispatches.size + a.refused).toBe(a.received);
    expect(a.maxEnRoute).toBeLessThanOrEqual(3);
  });

  it("arrivals free the ambulance (handler runs every 5 ticks)", () => {
    const fleet = amb(a.w).fleet;
    for (const d of amb(a.w).dispatches.values()) {
      if (d.etaTick <= TICKS - 5) expect(d.status).toBe("arrived");
      if (d.status === "en-route") expect(fleet.get(d.ambulanceId)!.status).toBe("dispatched");
    }
    const enRoute = new Set(Array.from(amb(a.w).dispatches.values()).filter(d => d.status === "en-route").map(d => d.ambulanceId));
    for (const amb_ of fleet.values()) expect(amb_.status === "dispatched").toBe(enRoute.has(amb_.id));
  });

  it("is deterministic for a seed", () => {
    expect(JSON.stringify(Array.from(amb(b.w).dispatches.entries()))).toBe(JSON.stringify(Array.from(amb(a.w).dispatches.entries())));
    expect(b.refused).toBe(a.refused);
  });

  it("characterization: the engine itself never dispatches (no caller of dispatchAmbulance in src/)", () => {
    const w = runWorld(createWorld(30, undefined, SEED), 150);
    expect(amb(w).dispatches.size).toBe(0);
    expect(amb(w).counter).toBe(0);
  });
});
