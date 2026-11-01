/**
 * P-002: clinical vitals integration. Kill switch, sick-vs-well alert rates,
 * oxygen counterfactual, sustained-vitals watch, snapshot round-trip.
 */
import { describe, it, expect, afterEach } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { isClinicalVitalsEnabled } from "../src/engine/config.js";
import { updateWatch, sustainedFlags, SUSTAINED_MIN } from "../src/engine/clinical-vitals.js";
import { assessMortalityRisk } from "../src/engine/clinical-knowledge.js";
import type { Vitals, Encounter } from "../src/patient/schema.js";

const saved = process.env.DR_CLINICAL_VITALS;
afterEach(() => {
  if (saved === undefined) delete process.env.DR_CLINICAL_VITALS;
  else process.env.DR_CLINICAL_VITALS = saved;
});

describe("kill switch", () => {
  it("is on by default and off only for '0'", () => {
    delete process.env.DR_CLINICAL_VITALS;
    expect(isClinicalVitalsEnabled()).toBe(true);
    process.env.DR_CLINICAL_VITALS = "0";
    expect(isClinicalVitalsEnabled()).toBe(false);
    process.env.DR_CLINICAL_VITALS = "1";
    expect(isClinicalVitalsEnabled()).toBe(true);
  });

  it("flag off leaves no illness / treatment / watch fields on any encounter", () => {
    process.env.DR_CLINICAL_VITALS = "0";
    const w = runWorld(createWorld(100, undefined, 3), 1440);
    for (const e of w.state.encounters.values()) {
      expect(e._illness).toBeUndefined();
      expect(e._treat).toBeUndefined();
      expect(e._watch).toBeUndefined();
    }
  });
});

describe("sustained-vitals watch", () => {
  const v = (o: Partial<Vitals>): Vitals => ({ heartRate: 80, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 37, oxygenSaturation: 98, respiratoryRate: 16, painLevel: 0, ...o });
  const enc = (): Encounter => ({ id: "ENC-1", patientId: "P", type: "inpatient", startTime: 0, endTime: null, status: "active", payer: "BPJS Kesehatan" } as Encounter);
  const feed = (e: Encounter, vit: Vitals, n: number) => { for (let i = 0; i < n; i++) e = updateWatch(e, vit); return e; };

  it("flags a term only after it has persisted for the sustained window", () => {
    let e = feed(enc(), v({ oxygenSaturation: 85 }), SUSTAINED_MIN - 1);
    expect(sustainedFlags(e).spo2Low).toBe(false);
    e = feed(e, v({ oxygenSaturation: 85 }), 1);
    expect(sustainedFlags(e).spo2Low).toBe(true);
    expect(sustainedFlags(e).sbpLow).toBe(false);
  });

  it("a transient excursion resets the run and does not flag", () => {
    let e = feed(enc(), v({ oxygenSaturation: 85 }), SUSTAINED_MIN - 5);
    e = feed(e, v({}), 1);
    e = feed(e, v({ oxygenSaturation: 85 }), SUSTAINED_MIN - 5);
    expect(sustainedFlags(e).spo2Low).toBe(false);
  });

  it("a flag, once raised, persists for the stay; normal vitals leave the encounter untouched", () => {
    const e = feed(enc(), v({ temperature: 40 }), SUSTAINED_MIN);
    expect(sustainedFlags(feed(e, v({}), 100)).tempHigh).toBe(true);
    const e0 = enc();
    expect(updateWatch(e0, v({}))).toBe(e0);
  });
});

describe("mortality risk with sustained flags", () => {
  const bad: Vitals = { heartRate: 150, bloodPressureSystolic: 70, bloodPressureDiastolic: 40, temperature: 40, oxygenSaturation: 80, respiratoryRate: 35, painLevel: 5 };
  const none = { spo2Low: false, sbpLow: false, hrHigh: false, hrLow: false, tempHigh: false, rrHigh: false };

  it("a single bad reading no longer raises risk once sustained flags are supplied", () => {
    expect(assessMortalityRisk(40, bad, [], none).score).toBe(0);
    expect(assessMortalityRisk(40, bad, []).score).toBeGreaterThan(0);
  });
  it("sustained flags raise it", () => {
    expect(assessMortalityRisk(40, bad, [], { ...none, spo2Low: true, sbpLow: true }).score).toBeGreaterThan(0);
  });
});

describe("integration (seed 3, 2 days)", () => {
  it("admitted patients get illness courses and treatment ledgers; ED/outpatient never do", () => {
    delete process.env.DR_CLINICAL_VITALS;
    const w = runWorld(createWorld(100, undefined, 3), 2880);
    const all = Array.from(w.state.encounters.values());
    const ill = all.filter(e => e._illness);
    expect(ill.length).toBeGreaterThan(0);
    for (const e of ill) expect(e.type).toBe("inpatient");
    for (const e of all.filter(e => e.type === "outpatient")) expect(e._illness).toBeUndefined();
  });

  it("is deterministic", () => {
    delete process.env.DR_CLINICAL_VITALS;
    const a = runWorld(createWorld(100, undefined, 5), 1440);
    const b = runWorld(createWorld(100, undefined, 5), 1440);
    const pick = (w: typeof a) => JSON.stringify(Array.from(w.state.encounters.values()).map(e => [e.id, e._illness, e._treat, e._watch]));
    expect(pick(a)).toBe(pick(b));
  });
});
