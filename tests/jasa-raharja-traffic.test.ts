/**
 * Jasa Raharja = traffic accidents only (owner decision 2026-10-31).
 * Replaces ADR-025's "every S/T code" payer rule and the six-code provenance
 * trigger (M9.3-BLOCKER-DECISIONS §5), so payer and incident use one rule.
 */
import { describe, it, expect } from "vitest";
import { assignPayer, injuryMechanism, P_TRAFFIC_GIVEN_INJURY } from "../src/engine/finance.js";
import { createWorld, runWorld } from "../src/engine/world.js";
import { getIncidentForEncounter, type JrState } from "../src/referral/jr-provenance.js";
import type { Patient } from "../src/patient/schema.js";

const patient = (id: string, code: string, extra: Partial<Patient> = {}) =>
  ({ id, diagnoses: [{ code, name: code, active: true, priority: 0 }], ...extra }) as unknown as Patient;
const never = () => { throw new Error("payer mix must not be rolled"); };

describe("injury mechanism", () => {
  it("transport-accident codes (V01–V99) are always traffic", () => {
    expect(injuryMechanism(patient("P1", "V23.4"), "V23.4", 1)).toBe("traffic");
    expect(injuryMechanism(patient("P1", "V89"), "V89", undefined)).toBe("traffic");
  });

  it("burns, poisonings, toxic effects and complications of care are not traffic injuries", () => {
    for (const code of ["T20", "T31", "T40", "T63", "T81", "T88"]) {
      expect(injuryMechanism(patient("P1", code, { injuryMechanism: "traffic" }), code, 1), code).toBeNull();
    }
  });

  it("non-injury codes have no mechanism", () => {
    expect(injuryMechanism(patient("P1", "I10"), "I10", 1)).toBeNull();
    expect(injuryMechanism(patient("P1", "J15"), "J15", 1)).toBeNull();
  });

  it("an explicit mechanism wins over the derived one", () => {
    expect(injuryMechanism(patient("P1", "S72", { injuryMechanism: "other" }), "S72", 1)).toBe("other");
    expect(injuryMechanism(patient("P1", "S72", { injuryMechanism: "traffic" }), "S72", 1)).toBe("traffic");
  });

  it("is stable per (world seed, patient) and varies across patients and seeds", () => {
    const m = (id: string, seed: number) => injuryMechanism(patient(id, "S06"), "S06", seed);
    expect(m("PAT-0007", 42)).toBe(m("PAT-0007", 42));
    const ids = Array.from({ length: 200 }, (_, i) => `PAT-${i}`);
    expect(new Set(ids.map(id => m(id, 42))).size).toBe(2);
    expect(ids.map(id => m(id, 42)).join()).not.toBe(ids.map(id => m(id, 43)).join());
  });

  it("about P_TRAFFIC_GIVEN_INJURY of trauma injuries are traffic", () => {
    const n = 5000;
    const traffic = Array.from({ length: n }, (_, i) => injuryMechanism(patient(`PAT-${i}`, "S82"), "S82", 7)).filter(x => x === "traffic").length;
    expect(Math.abs(traffic / n - P_TRAFFIC_GIVEN_INJURY)).toBeLessThan(0.03);
  });

  it("without a world seed or patient id, a trauma injury is not assumed to be traffic", () => {
    expect(injuryMechanism(patient("P1", "S72"), "S72", undefined)).toBe("other");
    expect(injuryMechanism({ diagnoses: [{ code: "S72", active: true }] }, "S72", 1)).toBe("other");
  });
});

describe("payer assignment", () => {
  it("traffic accidents go to Jasa Raharja without rolling the payer mix", () => {
    expect(assignPayer(patient("P1", "S72", { injuryMechanism: "traffic" }), never, 1)).toBe("Jasa Raharja");
    expect(assignPayer(patient("P1", "V43"), never, 1)).toBe("Jasa Raharja");
  });

  it("other injuries, burns and T81 roll the normal payer mix", () => {
    expect(assignPayer(patient("P1", "S72", { injuryMechanism: "other" }), () => 0.1, 1)).toBe("BPJS Kesehatan");
    expect(assignPayer(patient("P1", "T20"), () => 0.1, 1)).toBe("BPJS Kesehatan");
    expect(assignPayer(patient("P1", "T81"), () => 0.1, 1)).toBe("BPJS Kesehatan");
  });

  it("foreign nationals stay self-pay even after a traffic accident", () => {
    expect(assignPayer(patient("P1", "V43", { identity: { nationality: "WNA" } } as Partial<Patient>), never, 1)).toBe("Self-pay");
  });
});

describe("Jasa Raharja over a seeded run", () => {
  it("a traffic patient is JR-paid with an incident; the same injury from a fall is neither", () => {
    const w = createWorld(40, undefined, 42);
    const [a, b] = Array.from(w.state.patients.values());
    w.state.patients.set(a!.id, { ...a!, injuryMechanism: "traffic", diagnoses: [{ code: "S72", name: "Fracture of femur", active: true, priority: 0 }, ...a!.diagnoses] });
    w.state.patients.set(b!.id, { ...b!, injuryMechanism: "other", diagnoses: [{ code: "S72", name: "Fracture of femur", active: true, priority: 0 }, ...b!.diagnoses] });
    const r = runWorld(w, 400);
    const jr = (r.state as unknown as { _jrState: JrState })._jrState;
    const encsOf = (pid: string) => Array.from(r.state.encounters.values()).filter(e => e.patientId === pid && e.primaryDiagnosis === "S72");
    const traffic = encsOf(a!.id), fall = encsOf(b!.id);
    expect(traffic.length).toBeGreaterThan(0);
    expect(fall.length).toBeGreaterThan(0);
    for (const e of traffic) { expect(e.payer).toBe("Jasa Raharja"); expect(getIncidentForEncounter(jr, e.id)).toBeDefined(); }
    for (const e of fall) { expect(e.payer).not.toBe("Jasa Raharja"); expect(getIncidentForEncounter(jr, e.id)).toBeUndefined(); }
    // Every incident in the run belongs to a Jasa Raharja encounter.
    for (const inc of jr.incidents.values()) for (const id of inc.encounterIds ?? []) {
      const e = r.state.encounters.get(id);
      if (e) expect(e.payer).toBe("Jasa Raharja");
    }
  });
});
