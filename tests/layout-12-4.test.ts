import { describe, it, expect } from "vitest";
import { layoutFor, runOne, type RunFile } from "../src/experiment/layout-12-4.js";
import { buildReport, crossing, pairRuns, sensitivityGrid } from "../src/experiment/layout-12-4-report.js";
import { INA_CBG } from "../src/engine/ina-cbg.js";

const DAY = 1440;
const dx = INA_CBG[0]!.icdCode;

/** A synthetic run: `n` admissions of one payer in one class, so deltas are easy to reason about. */
function synth(layout: "A" | "B" | "C", rate: number, seed: number, entries: { payer: string; cls: string; own: string }[], digest = "d"): RunFile {
  const bedsByClass = layout === "A" ? { "kelas-2": 20 } : layout === "C" ? { "kelas-2": 10, "kelas-3": 10 } : { "kelas-2": 10, "kelas-3": 40 };
  return {
    layout, arrivalsPerDay: rate, seed, days: 28, waitLimitMinutes: 1440, wallSeconds: 1,
    record: {
      endTick: 28 * DAY, bedsByClass,
      ledger: entries.map((e, i) => ({
        patientId: `P${i}`, tick: 8 * DAY + i * 60, payer: e.payer, roomClass: e.cls, ownClass: e.own,
        primaryDiagnosis: dx, diagnosisCodes: [dx], stayMinutes: 5 * DAY,
      })),
      arrivalTicks: [], arrivalDigest: digest, divertedLog: [], stillQueued: 0,
    },
  };
}

describe("Epic XII 12.4 layouts and report", () => {
  it("builds the two layouts from rooms x beds per room", () => {
    const a = layoutFor("A").wards, b = layoutFor("B").wards;
    expect(a.map((w) => [w.roomClass, w.beds])).toEqual([["kelas-2", 20]]);
    expect(b.map((w) => [w.roomClass, w.beds])).toEqual([["kelas-2", 10], ["kelas-3", 40]]);
    // C is bed-matched to A (same 20 beds), so the class mix is the only difference.
    expect(layoutFor("C").wards.reduce((n, w) => n + w.beds, 0)).toBe(20);
    expect(layoutFor("C").wards.map((w) => [w.roomClass, w.beds])).toEqual([["kelas-2", 10], ["kelas-3", 10]]);
  });

  it("report for the bed-matched variant is labelled and pairs A with C", () => {
    const mk = (l: "A" | "C", seed: number) => synth(l, 4, seed, [{ payer: "Self-pay", cls: "kelas-2", own: "kelas-3" }]);
    const md = buildReport([mk("A", 1), mk("C", 1), mk("A", 2), mk("C", 2)], "C");
    expect(md).toMatch(/bed-matched/);
    expect(md).toMatch(/C minus A/);
    expect(() => buildReport([mk("A", 1), mk("A", 2)], "C")).toThrow();
  });

  it("finds the rate where the median difference crosses zero", () => {
    expect(crossing([2, 4, 6], [-10, -2, 6])).toBeCloseTo(4.5);
    expect(crossing([2, 4, 6], [1, 2, 3])).toBeNull();
    expect(crossing([2, 4, 6], [-1, -2, -3])).toBeNull();
  });

  it("refuses to pair runs whose demand differs", () => {
    const a = synth("A", 6, 1, [], "x");
    const b = synth("B", 6, 1, [], "y");
    expect(() => pairRuns([a, b])).toThrow(/not paired/);
    expect(pairRuns([a, synth("B", 6, 1, [], "x")]).length).toBe(1);
  });

  it("report carries the scenario label, assumptions and the sensitivity table", () => {
    const files: RunFile[] = [];
    for (const seed of [1, 2]) {
      for (const rate of [2, 8]) {
        // B admits more BPJS (kelas-3) than A at the higher rate; both identical at the low rate.
        const n = rate === 8 ? 12 : 3;
        files.push(synth("A", rate, seed, Array.from({ length: 3 }, () => ({ payer: "BPJS Kesehatan", cls: "kelas-2", own: "kelas-3" }))));
        files.push(synth("B", rate, seed, Array.from({ length: n }, () => ({ payer: "BPJS Kesehatan", cls: "kelas-3", own: "kelas-3" }))));
      }
    }
    const md = buildReport(files);
    expect(md).toMatch(/NOT A FORECAST/);
    expect(md).toMatch(/unsourced inputs/i);
    expect(md).toMatch(/Sensitivity/);
    expect(md).toMatch(/10 Kelas 2 rooms x 2 beds/);
    expect(md.split("\n").filter((l) => l.startsWith("| cost ")).length).toBe(sensitivityGrid().length);
    expect(sensitivityGrid().length).toBe(5 * 3 * 2 * 2);
    expect(sensitivityGrid("rule-70-20-10").length).toBe(5 * 3 * 2);
    expect(sensitivityGrid().some((g) => g.name.startsWith("cost flat"))).toBe(true);
  });

  it("smoke: one simulated day of one run writes a usable record", { timeout: 120_000 }, () => {
    const f = runOne("B", 14, 1, 1);
    expect(f.record.endTick).toBe(DAY);
    expect(f.record.bedsByClass).toEqual({ "kelas-2": 10, "kelas-3": 40 });
    expect(f.record.arrivalDigest.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(f)).record.endTick).toBe(DAY);
  });
});

import { createLiteScenarioWorld } from "../src/experiment/scenario-lite.js";
import { createWorld, runWorld } from "../src/engine/world.js";
import { runRecord } from "../src/engine/scenario-money.js";

describe("Epic XII 12.4 lite scenario world", () => {
  const tiny = { wards: [{ ward: "K3", roomClass: "kelas-3" as const, specialties: "general" as const, beds: 3 }] };
  const demand = { arrivalsPerDay: 150, waitLimitMinutes: 60 };

  it("gives the same admissions, diversions and demand as the full world (half a day)", { timeout: 120_000 }, () => {
    const full = runRecord(runWorld(createWorld(5, undefined, 5, tiny, demand), 720).state);
    const lite = runRecord(runWorld(createLiteScenarioWorld(5, tiny, demand), 720).state);
    expect(lite.arrivalDigest).toBe(full.arrivalDigest);
    expect(lite.ledger).toEqual(full.ledger);
    expect(lite.divertedLog).toEqual(full.divertedLog);
    expect(full.divertedLog.length).toBeGreaterThan(0);
  });

  it("still frees beds at discharge: more admissions than beds over 12 days", () => {
    const w = runWorld(createLiteScenarioWorld(5, tiny, { arrivalsPerDay: 6, waitLimitMinutes: 1440 }), 12 * 1440);
    const rec = runRecord(w.state);
    expect(rec.ledger.length).toBeGreaterThan(3);
    // never more than 3 patients in the 3 beds at once
    const occ = [...w.state.beds.values()].filter((b) => b.patientId).length;
    expect(occ).toBeLessThanOrEqual(3);
  });
});

import { STRICT_ROUTING, DEFAULT_ROUTING as DR, routeBed as route } from "../src/engine/scenario-routing.js";
import { generatePatient as gp } from "../src/patient/generator.js";
import { createRng as cr } from "../src/engine/clock.js";

describe("Epic XII 12.4 strict routing", () => {
  it("strict table lets each payer use only its own class", () => {
    expect(STRICT_ROUTING.eligible["BPJS Kesehatan"]).toEqual(["kelas-3"]);
    expect(STRICT_ROUTING.eligible["Private Insurance"]).toEqual(["kelas-2"]);
    expect(STRICT_ROUTING.defaultClasses).toEqual(["kelas-3"]);
    const m = new Map([["x", { id: "x", ward: "W", building: "", roomClass: "kelas-2" as const, patientId: null }]]);
    const p = gp(cr(2).next);
    expect(route(m, p, "BPJS Kesehatan", DR, undefined)).toBeDefined(); // spill-allowed: placed in K2
    expect(route(m, p, "BPJS Kesehatan", STRICT_ROUTING, undefined)).toBeUndefined(); // strict: waits
    expect(route(m, p, "Private Insurance", STRICT_ROUTING, undefined)).toBeDefined();
  });

  it("pairRuns keeps spill and strict runs apart", () => {
    const sp = synth("A", 4, 1, []), spB = synth("C", 4, 1, []);
    const stA = { ...synth("A", 4, 1, []), routing: "strict" as const }, stC = { ...synth("C", 4, 1, []), routing: "strict" as const };
    expect(pairRuns([sp, spB, stA, stC], "C", "spill").length).toBe(1);
    expect(pairRuns([sp, spB, stA, stC], "C", "strict").length).toBe(1);
    expect(() => pairRuns([sp, spB], "C", "strict").length).not.toThrow();
    expect(pairRuns([sp, spB], "C", "strict").length).toBe(0);
    expect(buildReport([stA, stC], "C", "strict")).toMatch(/STRICT ROUTING/);
  });
});

import { ruleAwareRouting, routingKey } from "../src/engine/scenario-routing.js";
import { routingFor, parseRoutingMode } from "../src/experiment/layout-12-4.js";

describe("Epic XII 12.4 rule-aware routing", () => {
  const pol = ruleAwareRouting({ "kelas-3": 70, "kelas-2": 20, "kelas-1": 10 });
  const bed = (id: string, cls: "kelas-1" | "kelas-2" | "kelas-3" | "vip") => [id, { id, ward: "W", building: "", roomClass: cls, patientId: null as string | null }] as const;
  const p = gp(cr(9).next);

  it("splits BPJS Kesehatan by tier with a zero-rng hash and keeps other payers unchanged", () => {
    expect(routingKey(pol, "Self-pay", "DEM-1-00001")).toBe("Self-pay");
    expect(routingKey(pol, "BPJS Kesehatan", "DEM-1-00001")).toBe(routingKey(pol, "BPJS Kesehatan", "DEM-1-00001"));
    const n = { "kelas-3": 0, "kelas-2": 0, "kelas-1": 0 };
    for (let i = 0; i < 4000; i++) n[routingKey(pol, "BPJS Kesehatan", `DEM-${i}-${String(i).padStart(5, "0")}`).split("|")[1] as keyof typeof n]++;
    expect(n["kelas-3"] / 4000).toBeGreaterThan(0.65);
    expect(n["kelas-3"] / 4000).toBeLessThan(0.75);
    expect(n["kelas-1"] / 4000).toBeGreaterThan(0.06);
    expect(n["kelas-1"] / 4000).toBeLessThan(0.14);
  });

  it("each tier is moved at most one class up, and K1 never goes to VIP", () => {
    const only = (cls: "kelas-1" | "kelas-2" | "kelas-3" | "vip") => new Map([bed("b", cls)]);
    const k3 = "BPJS Kesehatan|kelas-3", k2 = "BPJS Kesehatan|kelas-2", k1 = "BPJS Kesehatan|kelas-1";
    expect(route(only("kelas-2"), p, k3, pol, undefined)).toMatchObject({ roomClass: "kelas-2", rank: 1 }); // K3 -> K2
    expect(route(only("kelas-1"), p, k3, pol, undefined)).toBeUndefined(); // not two classes up
    expect(route(only("kelas-1"), p, k2, pol, undefined)).toMatchObject({ roomClass: "kelas-1", rank: 1 }); // K2 -> K1
    expect(route(only("kelas-3"), p, k2, pol, undefined)).toBeUndefined(); // never down
    expect(route(only("vip"), p, k1, pol, undefined)).toBeUndefined(); // K1 -> VIP not allowed
  });

  it("mode labels round-trip, and report pairing keeps rule modes apart", () => {
    expect(routingFor("rule-70-20-10")!.bpjsTierMix).toEqual({ "kelas-3": 70, "kelas-2": 20, "kelas-1": 10 });
    expect(routingFor("spill")).toBeUndefined();
    expect(parseRoutingMode()).toBe("rule-70-20-10-r");
    expect(parseRoutingMode("spill")).toBe("spill");
    expect(parseRoutingMode("strict")).toBe("strict");
    expect(parseRoutingMode("rule-85-10-5")).toBe("rule-85-10-5");
    expect(() => parseRoutingMode("rule-x")).toThrow();
    const a = { ...synth("A", 4, 1, []), routing: "rule-70-20-10" as const }, c = { ...synth("C", 4, 1, []), routing: "rule-70-20-10" as const };
    const md = buildReport([a, c, synth("A", 4, 1, []), synth("C", 4, 1, [])], "C", "rule-70-20-10");
    expect(md).toMatch(/RULE-AWARE ROUTING/);
    expect(md).toMatch(/UNSOURCED placeholder mix/);
    expect(pairRuns([a, c, synth("A", 4, 1, []), synth("C", 4, 1, [])], "C", "spill").length).toBe(1);
  });

  it("end to end in the lite world: a K3-tier patient lands in K2 when K3 does not exist", { timeout: 60_000 }, () => {
    const f = runOne("A", 6, 3, 6, undefined, "rule-70-20-10");
    expect(f.routing).toBe("rule-70-20-10");
    const spilled = f.record.ledger.filter((e) => e.payer === "BPJS Kesehatan" && e.ownClass === "kelas-3" && e.roomClass === "kelas-2");
    expect(spilled.length).toBeGreaterThan(0);
    // no BPJS tier-1 patient is ever admitted to a ward without Kelas 1
    expect(f.record.ledger.every((e) => !(e.ownClass === "kelas-1"))).toBe(true);
  });
});

import { LAYOUT_KEYS, TIER_MIXES, STANDARD_MODE } from "../src/experiment/layout-12-4.js";

describe("Epic XII 12.4 K1 ward and reserved Kelas 1", () => {
  it("builds A1, B1, C1 as A, B, C plus an identical 4-bed Kelas 1 ward", () => {
    expect(LAYOUT_KEYS).toEqual(["A", "B", "C", "A1", "B1", "C1"]);
    for (const k of ["A", "B", "C"] as const) {
      const base = layoutFor(k).wards, withK1 = layoutFor(`${k}1` as "A1" | "B1" | "C1").wards;
      expect(withK1.slice(0, base.length)).toEqual(base);
      expect(withK1[withK1.length - 1]).toMatchObject({ roomClass: "kelas-1", beds: 4, bedsPerRoom: 2 });
    }
  });

  it("standard mode is rule-aware with Kelas 1 reserved, across three mixes", () => {
    expect(STANDARD_MODE).toBe("rule-70-20-10-r");
    expect(TIER_MIXES.length).toBe(3);
    const pol = routingFor("rule-70-20-10-r")!;
    const k1 = new Map([["k1", { id: "k1", ward: "W", building: "", roomClass: "kelas-1" as const, patientId: null as string | null }]]);
    const p = gp(cr(4).next);
    expect(route(k1, p, "BPJS Kesehatan|kelas-1", pol, undefined)).toMatchObject({ roomClass: "kelas-1" });
    for (const key of ["BPJS Kesehatan|kelas-2", "BPJS Kesehatan|kelas-3", "Private Insurance", "BPJS Ketenagakerjaan", "Self-pay", "Jasa Raharja", "Medicare"])
      expect(route(k1, p, key, pol, undefined)).toBeUndefined();
    // not reserved: K2-tier BPJS and Private may still spill into K1
    const open = routingFor("rule-70-20-10")!;
    expect(route(k1, p, "BPJS Kesehatan|kelas-2", open, undefined)).toBeDefined();
    expect(route(k1, p, "Private Insurance", open, undefined)).toBeDefined();
  });

  it("with no Kelas 1 beds in the layout, reserving K1 changes nothing", { timeout: 120_000 }, () => {
    const a = runOne("A", 8, 2, 6, undefined, "rule-70-20-10").record;
    const b = runOne("A", 8, 2, 6, undefined, "rule-70-20-10-r").record;
    expect(b.ledger).toEqual(a.ledger);
    expect(b.divertedLog).toEqual(a.divertedLog);
  });

  it("records the routing key per arrival and diversion, and closures", { timeout: 60_000 }, () => {
    const r = runOne("A1", 14, 1, 8, undefined, "rule-70-20-10-r").record;
    expect(r.arrivalKeys!.length).toBe(r.arrivalTicks.length);
    expect(r.arrivalKeys!.some((k) => k.startsWith("BPJS Kesehatan|"))).toBe(true);
    expect(r.divertedLog.every((x) => typeof x.routeKey === "string")).toBe(true);
    expect(r.closures).toEqual([]);
    // reserved ward: only the K1 tier is ever placed in Kelas 1
    expect(r.ledger.filter((e) => e.roomClass === "kelas-1").every((e) => e.routeKey === "BPJS Kesehatan|kelas-1")).toBe(true);
  });
});
