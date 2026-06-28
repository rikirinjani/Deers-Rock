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
  const headers = ["seed", "ticks", "totalPatients", "totalEncounters", "totalDeaths", "avgLosTicks", "maxLosTicks", "peakBedOccupancy", "totalLabOrders", "totalMedOrders", "totalSurgeryOrders", "totalCharges", "disasterType", "disasterTriggered"];
  const rows = results.map(r => [
    r.seed, r.ticks, r.totalPatients, r.totalEncounters, r.totalDeaths,
    r.avgLosTicks, r.maxLosTicks, r.peakBedOccupancy,
    r.totalLabOrders, r.totalMedOrders, r.totalSurgeryOrders, r.totalCharges,
    r.disasterType ?? "", r.disasterTriggered,
  ].join(","));
  return headers.join(",") + "\n" + rows.join("\n");
}

export function runExperiment(options: {
  seedCount: number;
  ticks: number;
  patientCount?: number;
  outDir?: string;
  prefix?: string;
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
  const summary = {
    config: { seedCount: count, ticks, patientCount: patients },
    results: results.map(r => ({ ...r, deathsByIcd: undefined })),
    totals: {
      totalDeaths: results.reduce((s, r) => s + r.totalDeaths, 0),
      avgDeaths: Math.round(results.reduce((s, r) => s + r.totalDeaths, 0) / count),
      avgLos: Math.round(results.reduce((s, r) => s + r.avgLosTicks, 0) / count),
    },
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`Experiment complete: ${count} runs x ${ticks} ticks`);
  console.log(`  CSV: ${filepath}`);
  console.log(`  Summary: ${summaryPath}`);
  console.log(`  Total deaths: ${summary.totals.totalDeaths} (avg ${summary.totals.avgDeaths}/run)`);
  console.log(`  Avg LOS: ${summary.totals.avgLos} ticks`);

  return results;
}

if (process.argv[1]?.endsWith("runner.ts") || process.argv[1]?.endsWith("runner.js")) {
  const seedCount = parseInt(process.argv[2] ?? "10", 10);
  const ticks = parseInt(process.argv[3] ?? "500", 10);
  runExperiment({ seedCount, ticks });
}
