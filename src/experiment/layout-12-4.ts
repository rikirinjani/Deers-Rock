/**
 * Epic XII 12.4: the friend's example. SCENARIO AND SENSITIVITY RUN, NOT A FORECAST.
 *
 * Reading of the example (owner chose beds per room on 2026-11-17):
 *   A: 10 Kelas 2 rooms x 2 beds                          = 20 K2 beds
 *   B:  5 Kelas 2 rooms x 2 beds + 10 Kelas 3 rooms x 4   = 10 K2 beds + 40 K3 beds
 * Each layout is a standalone general ward (it serves every specialty); the rest of the
 * hospital is not simulated. Same demand (own rng stream per seed and arrival rate), so the
 * two layouts are paired by seed and rate.
 *
 * One process = one (layout, rate, seed) run; it writes its RunRecord as JSON when finished,
 * so a timeout keeps the runs that completed. Long runs are heavy: Kaggle or a VPS, never the
 * laptop (owner rule).
 *
 * CLI: npx tsx src/experiment/layout-12-4.ts <A|B> <arrivalsPerDay> <seed> <days> <outDir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createWorld, runWorld } from "../engine/world.js";
import type { HospitalLayout } from "../engine/state-store.js";
import { runRecord, type RunRecord } from "../engine/scenario-money.js";

export type LayoutKey = "A" | "B";

export const BEDS_PER_ROOM = { "kelas-2": 2, "kelas-3": 4 } as const;

export function layoutFor(key: LayoutKey): HospitalLayout {
  const room = (rooms: number, cls: "kelas-2" | "kelas-3") => rooms * BEDS_PER_ROOM[cls];
  return key === "A"
    ? { name: "A: 10 K2 rooms", wards: [{ ward: "General K2", roomClass: "kelas-2", specialties: "general", beds: room(10, "kelas-2"), bedsPerRoom: 2 }] }
    : { name: "B: 5 K2 + 10 K3 rooms", wards: [
        { ward: "General K2", roomClass: "kelas-2", specialties: "general", beds: room(5, "kelas-2"), bedsPerRoom: 2 },
        { ward: "General K3", roomClass: "kelas-3", specialties: "general", beds: room(10, "kelas-3"), bedsPerRoom: 4 },
      ] };
}

/** Arrivals per day: with about 5-day stays, beds demanded is about 5 x rate (A has 20 beds, B has 50). */
export const RATES = [2, 4, 6, 8, 10, 14];
export const WAIT_LIMIT_MINUTES = 1440;
export const WARMUP_DAYS = 7;

export interface RunFile {
  layout: LayoutKey;
  arrivalsPerDay: number;
  seed: number;
  days: number;
  waitLimitMinutes: number;
  wallSeconds: number;
  record: RunRecord;
}

export function runOne(layout: LayoutKey, arrivalsPerDay: number, seed: number, days: number, onDay?: (d: number, wallS: number) => void): RunFile {
  const t0 = Date.now();
  let w = createWorld(5, undefined, seed, layoutFor(layout), { arrivalsPerDay, waitLimitMinutes: WAIT_LIMIT_MINUTES });
  for (let d = 1; d <= days; d++) {
    w = runWorld(w, 1440);
    onDay?.(d, (Date.now() - t0) / 1000);
  }
  return { layout, arrivalsPerDay, seed, days, waitLimitMinutes: WAIT_LIMIT_MINUTES, wallSeconds: (Date.now() - t0) / 1000, record: runRecord(w.state) };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("layout-12-4.ts")) {
  const [key, rate, seed, days, outDir] = process.argv.slice(2);
  if (!key || !rate || !seed || !days || !outDir || (key !== "A" && key !== "B")) {
    console.error("usage: layout-12-4.ts <A|B> <arrivalsPerDay> <seed> <days> <outDir>");
    process.exit(2);
  }
  const f = runOne(key, Number(rate), Number(seed), Number(days), (d, s) => console.error(`${key} rate=${rate} seed=${seed} day ${d}/${days} wall ${s.toFixed(0)}s`));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${key}_r${rate}_s${seed}.json`), JSON.stringify(f));
  console.error(`done ${key} r${rate} s${seed} in ${f.wallSeconds.toFixed(0)}s, admitted ${f.record.ledger.length}`);
}
