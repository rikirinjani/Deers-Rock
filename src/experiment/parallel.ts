/**
 * Parallel multi-seed runner (2026-10-27): one child process per seed, N at
 * a time, so long-horizon baselines finish in reasonable wall time. Each
 * seed is a deterministic, independent world; results are merged in seed
 * order, so output is identical whatever the job count.
 *
 *   npx tsx src/experiment/parallel.ts --seeds 10 --ticks 14400 --patients 50 \
 *     --jobs 4 --out experiment-results --prefix outcome-v1
 *
 * Writes the runExperiment CSV + summary (E1 format) plus <prefix>-outcomes.json
 * (OutcomeMetrics per seed).
 */
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSeedWorld, collectResult, writeExperimentOutputs, type RunResult } from "./runner.js";
import { outcomeMetrics, type OutcomeMetrics } from "./outcomes.js";

const SELF = fileURLToPath(import.meta.url);

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1]! : fallback;
}

/** Child: run one seed and write { result, outcomes } as JSON. */
function worker(): void {
  const seed = Number(arg("seed", "0"));
  const ticks = Number(arg("ticks", "1000"));
  const patients = Number(arg("patients", "50"));
  const file = arg("result", "");
  const started = Date.now();
  const world = runSeedWorld(seed, ticks, patients);
  const result: RunResult = { ...collectResult(world), seed };
  const outcomes = outcomeMetrics(world, seed);
  writeFileSync(file, JSON.stringify({ result, outcomes, wallSeconds: Math.round((Date.now() - started) / 1000) }));
}

function runChild(seed: number, ticks: number, patients: number, file: string, logDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, SELF, "--worker",
      "--seed", String(seed), "--ticks", String(ticks), "--patients", String(patients), "--result", file], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", d => { err += String(d); });
    child.on("exit", code => {
      if (code === 0) resolve();
      else { writeFileSync(path.join(logDir, `seed-${seed}.err.log`), err); reject(new Error(`seed ${seed} exited ${code}`)); }
    });
  });
}

async function main(): Promise<void> {
  const seeds = Number(arg("seeds", "10"));
  const ticks = Number(arg("ticks", "14400"));
  const patients = Number(arg("patients", "50"));
  const jobs = Math.max(1, Number(arg("jobs", "4")));
  const outDir = arg("out", "experiment-results");
  const prefix = arg("prefix", "outcome");
  const partDir = path.join(outDir, `${prefix}-parts`);
  if (!existsSync(partDir)) mkdirSync(partDir, { recursive: true });

  const queue = Array.from({ length: seeds }, (_, i) => i);
  const startedAll = Date.now();
  const runners = Array.from({ length: Math.min(jobs, seeds) }, async () => {
    for (let seed = queue.shift(); seed !== undefined; seed = queue.shift()) {
      const file = path.join(partDir, `seed-${seed}.json`);
      if (existsSync(file)) { console.log(`seed ${seed}: cached`); continue; } // resumable
      await runChild(seed, ticks, patients, file, partDir);
      console.log(`seed ${seed}: done after ${Math.round((Date.now() - startedAll) / 1000)}s`);
    }
  });
  await Promise.all(runners);

  const parts = Array.from({ length: seeds }, (_, seed) =>
    JSON.parse(readFileSync(path.join(partDir, `seed-${seed}.json`), "utf-8")) as { result: RunResult; outcomes: OutcomeMetrics; wallSeconds: number });
  const { filepath, summaryPath } = writeExperimentOutputs(parts.map(p => p.result), { ticks, patientCount: patients, outDir, prefix });
  const outcomesPath = path.join(outDir, `${prefix}-outcomes.json`);
  writeFileSync(outcomesPath, JSON.stringify({ config: { seedCount: seeds, ticks, patientCount: patients }, outcomes: parts.map(p => p.outcomes) }, null, 2));
  console.log(`Done: ${seeds} seeds x ${ticks} ticks in ${Math.round((Date.now() - startedAll) / 1000)}s`);
  console.log(`  CSV: ${filepath}\n  Summary: ${summaryPath}\n  Outcomes: ${outcomesPath}`);
}

if (process.argv[1] === SELF) {
  if (process.argv.includes("--worker")) worker();
  else main().catch(e => { console.error(e); process.exit(1); });
}
