import { createWorld, runWorld } from "../engine/world.js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

export interface RunResult {
  seed: number;
  ticks: number;
  totalPatients: number;
  totalEncounters: number;
  totalDeaths: number;
  deathsByIcd: Record<string, number>;
  avgLosTicks: number;
  maxLosTicks: number;
  peakBedOccupancy: number;
  totalLabOrders: number;
  totalMedOrders: number;
  totalSurgeryOrders: number;
  totalCharges: number;
  disasterType: string | null;
  disasterTriggered: boolean;
}

function collectResult(world: import("../engine/world.js").World): RunResult {
  const state = world.state;
  const discharges = Array.from(state.encounters.values()).filter(e => e.status === "discharged");
  const losValues = discharges.map(e => (e.endTime ?? e.startTime) - e.startTime);
  const occupiedNow = Array.from(state.beds.values()).filter(b => b.patientId).length;
  const deaths = state.morgue.length;
  const deathsByIcd: Record<string, number> = {};
  for (const m of state.morgue) {
    const key = m.icdCode;
    deathsByIcd[key] = (deathsByIcd[key] ?? 0) + 1;
  }
  const scenario = state._scenario;
  return {
    seed: 0,
    ticks: world.clock.tick,
    totalPatients: state.patients.size,
    totalEncounters: state.encounters.size,
    totalDeaths: deaths,
    deathsByIcd,
    avgLosTicks: losValues.length > 0 ? Math.round((losValues.reduce((a, b) => a + b, 0) / losValues.length) / 60000) : 0,
    maxLosTicks: losValues.length > 0 ? Math.round(Math.max(...losValues) / 60000) : 0,
    peakBedOccupancy: occupiedNow,
    totalLabOrders: state.labOrders.size,
    totalMedOrders: state.medicationOrders.size,
    totalSurgeryOrders: state.surgeryOrders.size,
    totalCharges: state.charges.size,
    disasterType: scenario?.active?.type ?? null,
    disasterTriggered: scenario?.active !== null && scenario.active.phase !== "resolved",
  };
}

function runToCSV(results: RunResult[]): string {
  const headers = ["seed", "ticks", "totalPatients", "totalEncounters", "totalDeaths", "deathsByIcd", "avgLosTicks", "maxLosTicks", "peakBedOccupancy", "totalLabOrders", "totalMedOrders", "totalSurgeryOrders", "totalCharges", "disasterType", "disasterTriggered"];
  const rows = results.map(r => [
    r.seed, r.ticks, r.totalPatients, r.totalEncounters, r.totalDeaths,
    JSON.stringify(r.deathsByIcd),
    r.avgLosTicks, r.maxLosTicks, r.peakBedOccupancy,
    r.totalLabOrders, r.totalMedOrders, r.totalSurgeryOrders, r.totalCharges,
    r.disasterType ?? "", r.disasterTriggered,
  ].join(","));
  return headers.join(",") + "\n" + rows.join("\n");
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const sqDiffs = values.map(v => (v - avg) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function ci95(sd: number, n: number): number {
  if (n < 2) return 0;
  return 1.96 * (sd / Math.sqrt(n));
}

export function runExperiment(options: {
  seedCount: number;
  ticks: number;
  patientCount?: number;
  outDir?: string;
  prefix?: string;
  forceScenario?: import("../engine/scenario.js").ScenarioType;
}): RunResult[] {
  const count = options.seedCount;
  const ticks = options.ticks;
  const patients = options.patientCount ?? 50;
  const outDir = options.outDir ?? "experiment-results";
  const prefix = options.prefix ?? "experiment";

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const results: RunResult[] = [];

  for (let seed = 0; seed < count; seed++) {
    const world = createWorld(patients, undefined, seed);
    if (options.forceScenario) {
      world.state._scenario = {
        active: {
          id: `forced-${options.forceScenario}-${seed}`,
          type: options.forceScenario,
          name: options.forceScenario,
          severity: 0.8,
          startTick: 100,
          durationTicks: 200,
          phase: "sustained",
          currentSurge: 4,
          currentMortalityBoost: 0.15,
        },
        history: [],
        cooldownTicks: 0,
      };
    }
    const finalWorld = runWorld(world, ticks);
    const result = collectResult(finalWorld);
    result.seed = seed;
    results.push(result);
  }

  const csv = runToCSV(results);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = path.join(outDir, `${prefix}-${timestamp}.csv`);
  writeFileSync(filepath, csv, "utf-8");

  const summaryPath = path.join(outDir, `${prefix}-${timestamp}-summary.json`);
  const deathValues = results.map(r => r.totalDeaths);
  const losValues = results.map(r => r.avgLosTicks);
  const occValues = results.map(r => r.peakBedOccupancy);
  const deathMean = mean(deathValues);
  const losMean = mean(losValues);
  const occMean = mean(occValues);
  const deathSd = stdDev(deathValues, deathMean);
  const losSd = stdDev(losValues, losMean);
  const occSd = stdDev(occValues, occMean);
  const summary = {
    config: { seedCount: count, ticks, patientCount: patients },
    results: results.map(r => ({ ...r })),
    statistics: {
      deaths: { mean: +deathMean.toFixed(1), sd: +deathSd.toFixed(1), ci95: +ci95(deathSd, count).toFixed(1), min: Math.min(...deathValues), max: Math.max(...deathValues) },
      los: { mean: +losMean.toFixed(1), sd: +losSd.toFixed(1), ci95: +ci95(losSd, count).toFixed(1), min: Math.min(...losValues), max: Math.max(...losValues) },
      bedOccupancy: { mean: +occMean.toFixed(1), sd: +occSd.toFixed(1), ci95: +ci95(occSd, count).toFixed(1), min: Math.min(...occValues), max: Math.max(...occValues) },
    },
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`Experiment complete: ${count} runs x ${ticks} ticks`);
  console.log(`  CSV: ${filepath}`);
  console.log(`  Summary: ${summaryPath}`);
  console.log(`  Deaths: ${summary.statistics.deaths.mean} ± ${summary.statistics.deaths.ci95} (SD=${summary.statistics.deaths.sd}, range ${summary.statistics.deaths.min}-${summary.statistics.deaths.max})`);
  console.log(`  LOS: ${summary.statistics.los.mean} ± ${summary.statistics.los.ci95} ticks (SD=${summary.statistics.los.sd})`);
  console.log(`  Bed occupancy: ${summary.statistics.bedOccupancy.mean} ± ${summary.statistics.bedOccupancy.ci95}`);

  return results;
}

if (process.argv[1]?.endsWith("runner.ts") || process.argv[1]?.endsWith("runner.js")) {
  const seedCount = parseInt(process.argv[2] ?? "10", 10);
  const ticks = parseInt(process.argv[3] ?? "500", 10);
  runExperiment({ seedCount, ticks });
}
