/**
 * Experiment tooling (2026-10-27): runSeed / writeExperimentOutputs split out
 * of runExperiment (parallel runs must reproduce the sequential format byte
 * for byte) and outcome metrics for multi-day baselines.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runExperiment, runSeed, runSeedWorld, writeExperimentOutputs } from "../src/experiment/runner.js";
import { outcomeMetrics } from "../src/experiment/outcomes.js";

let dir = "";
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dr-exp-")); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

const read = (p: string) => fs.readFileSync(p, "utf-8");

describe("experiment runner", () => {
  it("runSeed + writeExperimentOutputs reproduce runExperiment byte for byte", () => {
    runExperiment({ seedCount: 3, ticks: 120, patientCount: 15, outDir: path.join(dir, "a"), prefix: "x" });
    const results = [0, 1, 2].map(s => runSeed(s, 120, 15));
    writeExperimentOutputs(results, { ticks: 120, patientCount: 15, outDir: path.join(dir, "b"), prefix: "x" });
    const files = (d: string) => fs.readdirSync(path.join(dir, d)).sort();
    const [csvA, sumA] = files("a"), [csvB, sumB] = files("b");
    expect(read(path.join(dir, "b", csvB!))).toBe(read(path.join(dir, "a", csvA!)));
    expect(read(path.join(dir, "b", sumB!))).toBe(read(path.join(dir, "a", sumA!)));
  });
});

describe("outcome metrics", () => {
  it("are consistent with the world they summarize", () => {
    const w = runSeedWorld(4, 300, 20);
    const m = outcomeMetrics(w, 4);
    expect(m).toMatchObject({ seed: 4, ticks: 300, totalBeds: w.state.beds.size, deaths: w.state.morgue.length });
    const inpatient = w.state._outcomeRecords.filter(r => r.encounterId.startsWith("ENC-"));
    expect(m.inpatientDischarges).toBe(inpatient.length);
    expect(m.outcomes.improved + m.outcomes.deteriorated + m.outcomes.deceased).toBe(inpatient.length);
    expect(m.workforce.staffTotal).toBeGreaterThan(0);
    expect(m.referral.completed + m.referral.returned).toBeLessThanOrEqual(m.referral.letters);
  });

  it("compute mortality and length of stay from inpatient outcome records", () => {
    const w = runSeedWorld(1, 10, 5);
    w.state._outcomeRecords = [
      { patientId: "P1", encounterId: "ENC-1", primaryDiagnosis: "x", icdCode: "J15", outcome: "improved", losTicks: 3 * 1440, ordersCount: 1, dischargeTick: 1 },
      { patientId: "P2", encounterId: "ENC-2", primaryDiagnosis: "x", icdCode: "I21", outcome: "deceased", losTicks: 5 * 1440, ordersCount: 1, dischargeTick: 1 },
      { patientId: "P3", encounterId: "ED-3", primaryDiagnosis: "x", icdCode: "S06", outcome: "improved", losTicks: 30, ordersCount: 1, dischargeTick: 1 },
    ];
    w.state.morgue = [{ patientId: "P2", encounterId: "ENC-2", primaryDiagnosis: "x", icdCode: "I21", age: 60, gender: "male", causeOfDeath: "x", mortalityScore: 5, deathTick: 1 }];
    const m = outcomeMetrics(w, 1);
    expect(m.inpatientDischarges).toBe(2); // ED record excluded
    expect(m.inHospitalMortalityPct).toBe(50);
    expect(m.inpatientLosMeanDays).toBe(4);
    expect(m.inpatientLosMedianDays).toBe(4);
    expect(m.deathsByIcd).toEqual({ I21: 1 });
  });
});
