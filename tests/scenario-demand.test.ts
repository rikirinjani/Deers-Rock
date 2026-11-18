import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { initDemand } from "../src/engine/scenario-demand.js";
import { generatePatient } from "../src/patient/generator.js";
import { createRng } from "../src/engine/clock.js";
import type { HospitalLayout } from "../src/engine/state-store.js";

const ward = (beds: number): HospitalLayout => ({
  wards: [{ ward: "General K3", roomClass: "kelas-3", specialties: "general", beds }],
});

function run(beds: number, ticks: number, demand: { arrivalsPerDay: number; waitLimitMinutes: number }, seed = 7) {
  return runWorld(createWorld(5, undefined, seed, ward(beds), demand), ticks).state;
}

// Since 12.2 payers are routed by class, "ample beds" must exist in every class a payer may use.
function runAmple(perClass: number, ticks: number, demand: { arrivalsPerDay: number; waitLimitMinutes: number }) {
  const layout: HospitalLayout = {
    wards: (["kelas-1", "kelas-2", "kelas-3"] as const).map((c) => ({ ward: `Gen ${c}`, roomClass: c, specialties: "general" as const, beds: perClass })),
  };
  return runWorld(createWorld(5, undefined, 7, layout, demand), ticks).state;
}

describe("Epic XII 12.1 demand stream and queue", () => {
  it("same seed gives the same demand under different layouts", () => {
    const cfg = { arrivalsPerDay: 120, waitLimitMinutes: 120 };
    const small = run(6, 900, cfg);
    const big = run(60, 900, cfg);
    expect(small._demand!.arrivalLog.length).toBeGreaterThan(10);
    expect(small._demand!.arrivalLog).toEqual(big._demand!.arrivalLog);
  });

  it("is deterministic for the same seed and layout", () => {
    const cfg = { arrivalsPerDay: 120, waitLimitMinutes: 120 };
    const a = run(8, 800, cfg);
    const b = run(8, 800, cfg);
    expect(a._demand!.divertedLog).toEqual(b._demand!.divertedLog);
    expect(a._demand!.admitted).toBe(b._demand!.admitted);
  });

  it("counts every arrival: arrived = admitted + diverted + still queued", () => {
    for (const beds of [4, 80]) {
      const d = run(beds, 900, { arrivalsPerDay: 150, waitLimitMinutes: 90 })._demand!;
      expect(d.arrived).toBe(d.admitted + d.diverted + d.queue.length);
    }
  });

  it("fewer beds divert more; ample beds divert nobody", () => {
    const cfg = { arrivalsPerDay: 150, waitLimitMinutes: 90 };
    const tight = run(3, 1200, cfg)._demand!;
    const ample = runAmple(150, 1200, cfg)._demand!;
    expect(tight.diverted).toBeGreaterThan(0);
    expect(tight.maxQueueLength).toBeGreaterThan(0);
    expect(ample.diverted).toBe(0);
    expect(ample.queue.length).toBe(0);
  });

  it("diverts a patient exactly one minute after the wait limit", () => {
    const d = run(1, 900, { arrivalsPerDay: 150, waitLimitMinutes: 30 })._demand!;
    expect(d.divertedLog.length).toBeGreaterThan(0);
    const arrivalTick = new Map(d.arrivalLog.map((a) => [a.patientId, a.tick]));
    for (const x of d.divertedLog) expect(x.tick - arrivalTick.get(x.patientId)!).toBe(31);
  });

  it("places patients first come first served", () => {
    // One free bed, three waiting: the oldest takes it, the others keep their order.
    const w = createWorld(5, undefined, 7, ward(1), { arrivalsPerDay: 0, waitLimitMinutes: 600 });
    const mk = (n: number) => {
      const patient = generatePatient(createRng(n).next);
      patient.id = `DEM-0-0000${n}`;
      return { patient, arrivalTick: 0, payer: "Self-pay" as const, stayMinutes: 5000 };
    };
    w.state._demand!.queue = [mk(1), mk(2), mk(3)];
    const after = runWorld(w, 1).state;
    expect(after._demand!.queue.map((q) => q.patient.id)).toEqual(["DEM-0-00002", "DEM-0-00003"]);
    expect([...after.encounters.values()].filter((e) => e.type === "inpatient").map((e) => e.patientId)).toEqual(["DEM-0-00001"]);
    expect(after._demand!.admitted).toBe(1);
  });

  it("scenario admissions use the pre-drawn payer and stay", () => {
    const s = run(60, 600, { arrivalsPerDay: 100, waitLimitMinutes: 120 });
    const byId = new Map(s._demand!.arrivalLog.map((a) => [a.patientId, a]));
    const encs = [...s.encounters.values()].filter((e) => e.type === "inpatient" && e.patientId.startsWith("DEM-"));
    expect(encs.length).toBeGreaterThan(5);
    for (const e of encs) expect(e.payer).toBe(byId.get(e.patientId)!.payer);
  });

  it("without a demand config the default path is used and no demand state exists", () => {
    const s = runWorld(createWorld(20, undefined, 7), 300).state;
    expect("_demand" in s).toBe(false);
  });

  it("rejects bad config", () => {
    expect(() => initDemand({ arrivalsPerDay: -1 })).toThrow();
    expect(() => initDemand({ waitLimitMinutes: NaN })).toThrow();
  });
});
