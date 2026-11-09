/**
 * US baseline worker (Epic X M10.5c): one seeded world under the full US locale and US billing adapter,
 * writing per-ICD inpatient stays, length of stay and deaths so the simulator's case mix can be compared
 * with the HCUP targets in docs/us-calibration-targets.md (T-CASE-1, T-LOS-1).
 *
 *   npx tsx src/experiment/us-baseline.ts --seed 0 --ticks 14400 --patients 50 --result out.json
 *
 * Reads outcome records (append-only, one per closed inpatient encounter), so cleanup pruning does not bias them.
 * Does not change the default (Indonesian) world; locale is set only inside this process.
 */
import { writeFileSync } from "node:fs";
import { createWorld, runWorld } from "../engine/world.js";
import { useUSLocale } from "../locale/us-locale.js";
import { useUSAdapter } from "../engine/billing/us-adapter.js";

const TICKS_PER_DAY = 1440;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1]! : fallback;
}

const seed = Number(arg("seed", "0"));
const ticks = Number(arg("ticks", "14400"));
const patients = Number(arg("patients", "50"));
const file = arg("result", "us-baseline.json");

useUSLocale();
useUSAdapter();
const started = Date.now();
const world = runWorld(createWorld(patients, undefined, seed), ticks);
const s = world.state;

const records = (s._outcomeRecords ?? []).filter(r => r.encounterId.startsWith("ENC-"));
const byIcd: Record<string, { stays: number; losDaysSum: number; deaths: number; label: string }> = {};
for (const r of records) {
  const e = (byIcd[r.icdCode] ??= { stays: 0, losDaysSum: 0, deaths: 0, label: r.primaryDiagnosis });
  e.stays += 1;
  e.losDaysSum += r.losTicks / TICKS_PER_DAY;
  if (r.outcome === "deceased") e.deaths += 1;
}
const claims = Array.from(s.insuranceClaims.values());
const payerClaims: Record<string, number> = {};
for (const c of claims) payerClaims[c.payer] = (payerClaims[c.payer] ?? 0) + 1;

writeFileSync(file, JSON.stringify({
  seed, ticks, patients, simDays: ticks / TICKS_PER_DAY,
  inpatientStays: records.length,
  deaths: records.filter(r => r.outcome === "deceased").length,
  edEncounters: Array.from(s.encounters.values()).filter(e => e.id.startsWith("ED-")).length,
  totalBeds: s.beds.size,
  bedsOccupiedEnd: Array.from(s.beds.values()).filter(b => b.patientId).length,
  byIcd,
  // claims are pruned (MAX_CLAIMS), so this is a sample of the latest claims, not the run total
  prunedClaimSamplePayers: payerClaims,
  wallSeconds: Math.round((Date.now() - started) / 1000),
}));
