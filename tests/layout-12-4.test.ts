import { describe, it, expect } from "vitest";
import { layoutFor, runOne, type RunFile } from "../src/experiment/layout-12-4.js";
import { buildReport, crossing, pairRuns, sensitivityGrid } from "../src/experiment/layout-12-4-report.js";
import { INA_CBG } from "../src/engine/ina-cbg.js";

const DAY = 1440;
const dx = INA_CBG[0]!.icdCode;

/** A synthetic run: `n` admissions of one payer in one class, so deltas are easy to reason about. */
function synth(layout: "A" | "B", rate: number, seed: number, entries: { payer: string; cls: string; own: string }[], digest = "d"): RunFile {
  const bedsByClass = layout === "A" ? { "kelas-2": 20 } : { "kelas-2": 10, "kelas-3": 40 };
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
    expect(sensitivityGrid().length).toBe(3 * 3 * 2 * 2);
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
