import { describe, it, expect } from "vitest";
import { DEFAULT_ROUTING, routeBed, type RoutingPolicy } from "../src/engine/scenario-routing.js";
import { createWorld, runWorld } from "../src/engine/world.js";
import { specialtyOf } from "../src/engine/markov.js";
import { generatePatient } from "../src/patient/generator.js";
import { createRng } from "../src/engine/clock.js";
import type { Bed, Patient, RoomClass } from "../src/patient/schema.js";
import type { HospitalLayout } from "../src/engine/state-store.js";

const beds = (spec: [string, RoomClass, number][]): Map<string, Bed> => {
  const m = new Map<string, Bed>();
  let i = 1;
  for (const [ward, roomClass, n] of spec)
    for (let k = 0; k < n; k++) { const id = `${ward}-${i++}`; m.set(id, { id, ward, building: "", roomClass, patientId: null }); }
  return m;
};
const fill = (m: Map<string, Bed>, cls: RoomClass) => {
  for (const [id, b] of m) if (b.roomClass === cls) m.set(id, { ...b, patientId: "X" });
};
const anyPatient = (): Patient => generatePatient(createRng(5).next);
const patientOf = (specialty: string): Patient => {
  const rng = createRng(11).next;
  for (let i = 0; i < 4000; i++) { const p = generatePatient(rng); if (specialtyOf(p) === specialty) return p; }
  throw new Error("no patient with specialty " + specialty);
};

describe("Epic XII 12.2 routing", () => {
  it("places a payer in its own class first, then spills up", () => {
    const m = beds([["W", "kelas-3", 1], ["W", "kelas-2", 1], ["W", "kelas-1", 1]]);
    const p = anyPatient();
    expect(routeBed(m, p, "BPJS Kesehatan", DEFAULT_ROUTING, undefined)).toMatchObject({ roomClass: "kelas-3", rank: 0 });
    fill(m, "kelas-3");
    expect(routeBed(m, p, "BPJS Kesehatan", DEFAULT_ROUTING, undefined)).toMatchObject({ roomClass: "kelas-2", rank: 1 });
    fill(m, "kelas-2");
    expect(routeBed(m, p, "BPJS Kesehatan", DEFAULT_ROUTING, undefined)).toMatchObject({ roomClass: "kelas-1", rank: 2 });
    fill(m, "kelas-1");
    expect(routeBed(m, p, "BPJS Kesehatan", DEFAULT_ROUTING, undefined)).toBeUndefined();
  });

  it("never goes down a class the table does not list", () => {
    const m = beds([["W", "kelas-3", 3]]);
    expect(routeBed(m, anyPatient(), "Private Insurance", DEFAULT_ROUTING, undefined)).toBeUndefined();
  });

  it("never falls back into VIP, VVIP, ICU, HCU, NICU or PICU, for any payer", () => {
    const m = beds([["X", "vvip", 2], ["X", "vip", 2], ["X", "icu", 2], ["X", "hcu", 2], ["X", "nicu", 2], ["X", "picu", 2]]);
    for (const payer of ["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Jasa Raharja", "Private Insurance", "Self-pay", "Medicare", "Unknown payer"])
      expect(routeBed(m, anyPatient(), payer, DEFAULT_ROUTING, undefined)).toBeUndefined();
  });

  it("honours a custom table (no spillover means wait)", () => {
    const strict: RoutingPolicy = { eligible: { "BPJS Kesehatan": ["kelas-3"] }, defaultClasses: ["kelas-3"] };
    const m = beds([["W", "kelas-3", 1], ["W", "kelas-2", 5]]);
    fill(m, "kelas-3");
    expect(routeBed(m, anyPatient(), "BPJS Kesehatan", strict, undefined)).toBeUndefined();
  });

  it("prefers a ward that serves the specialty inside the class; a general ward serves anyone", () => {
    const layout: HospitalLayout = {
      wards: [
        { ward: "Heart", roomClass: "kelas-2", specialties: ["cardiology"], beds: 1 },
        { ward: "Lung", roomClass: "kelas-2", specialties: ["pulmonology"], beds: 1 },
        { ward: "Gen", roomClass: "kelas-2", specialties: "general", beds: 1 },
      ],
    };
    const m = beds([["Lung", "kelas-2", 1], ["Heart", "kelas-2", 1], ["Gen", "kelas-2", 1]]);
    const heart = patientOf("cardiology");
    expect(routeBed(m, heart, "Private Insurance", DEFAULT_ROUTING, layout)!.bed.ward).toBe("Heart");
    // Heart bed taken: the general ward is preferred over the lung ward (it serves cardiology).
    for (const [id, b] of m) if (b.ward === "Heart") m.set(id, { ...b, patientId: "X" });
    expect(routeBed(m, heart, "Private Insurance", DEFAULT_ROUTING, layout)!.bed.ward).toBe("Gen");
    // Everything serving cardiology is taken: any free bed of the class is still used.
    for (const [id, b] of m) if (b.ward === "Gen") m.set(id, { ...b, patientId: "X" });
    expect(routeBed(m, heart, "Private Insurance", DEFAULT_ROUTING, layout)!.bed.ward).toBe("Lung");
  });

  it("is deterministic (same inputs, same bed)", () => {
    const m = beds([["W", "kelas-3", 4]]);
    const p = anyPatient();
    expect(routeBed(m, p, "Self-pay", DEFAULT_ROUTING, undefined)!.bed.id).toBe(routeBed(m, p, "Self-pay", DEFAULT_ROUTING, undefined)!.bed.id);
  });
});

describe("Epic XII 12.2 in the scenario world", () => {
  const layout = (k2: number, k3: number): HospitalLayout => ({
    wards: [
      { ward: "General K2", roomClass: "kelas-2", specialties: "general", beds: k2 },
      { ward: "General K3", roomClass: "kelas-3", specialties: "general", beds: k3 },
      { ward: "Executive", roomClass: "vip", specialties: "general", beds: 5 },
      { ward: "ICU", roomClass: "icu", specialties: ["anesthesiology"], beds: 5 },
    ],
  });
  const strictBpjs: RoutingPolicy = {
    eligible: { ...DEFAULT_ROUTING.eligible, "BPJS Kesehatan": ["kelas-3"], "Self-pay": ["kelas-3"], "Jasa Raharja": ["kelas-3"] },
    defaultClasses: ["kelas-3"],
  };
  const run = (k2: number, k3: number, routing?: RoutingPolicy) =>
    runWorld(createWorld(5, undefined, 9, layout(k2, k3), { arrivalsPerDay: 150, waitLimitMinutes: 180, routing }), 1500).state._demand!;

  it("counters add up and VIP and ICU beds stay empty", () => {
    const w = runWorld(createWorld(5, undefined, 9, layout(6, 6), { arrivalsPerDay: 150, waitLimitMinutes: 180 }), 1500);
    const d = w.state._demand!;
    expect(d.arrived).toBe(d.admitted + d.diverted + d.queue.length);
    expect(Object.values(d.admittedByClass).reduce((a, b) => a + b, 0)).toBe(d.admitted);
    expect(Object.values(d.admittedByPayerClass).reduce((a, b) => a + b, 0)).toBe(d.admitted);
    expect(Object.values(d.spilledByPath).reduce((a, b) => a + b, 0)).toBe(d.spilledUp);
    expect(Object.values(d.divertedByPayer).reduce((a, b) => a + b, 0)).toBe(d.diverted);
    expect(d.admittedByClass["vip"] ?? 0).toBe(0);
    expect(d.admittedByClass["icu"] ?? 0).toBe(0);
    expect([...w.state.beds.values()].filter((b) => (b.roomClass === "vip" || b.roomClass === "icu") && b.patientId).length).toBe(0);
  });

  it("with the same demand, swapping beds from Kelas 2 to Kelas 3 diverts fewer BPJS patients", () => {
    const a = run(10, 4, strictBpjs);
    const b = run(5, 9, strictBpjs);
    expect(a.arrivalLog).toEqual(b.arrivalLog);
    const bpjsDiverted = (d: typeof a) => d.divertedByPayer["BPJS Kesehatan"] ?? 0;
    expect(bpjsDiverted(b)).toBeLessThan(bpjsDiverted(a));
  });

  it("spillover lets BPJS patients use Kelas 2 when Kelas 3 is full", () => {
    const withSpill = run(10, 2);
    expect(withSpill.spilledUp).toBeGreaterThan(0);
    expect(Object.keys(withSpill.spilledByPath).some((k) => k.startsWith("BPJS Kesehatan|kelas-3->kelas-2"))).toBe(true);
    const noSpill = run(10, 2, strictBpjs);
    expect(noSpill.spilledUp).toBeLessThan(withSpill.spilledUp);
  });
});
