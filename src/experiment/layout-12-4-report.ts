/**
 * Epic XII 12.4: turn the run files of layout-12-4.ts into a markdown results page.
 * SCENARIO AND SENSITIVITY, NOT A FORECAST. Pure function of the JSON run files, so any money
 * setting can be recomputed without re-running the simulation.
 *
 * CLI: npx tsx src/experiment/layout-12-4-report.ts <runDir> <outFile.md>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reportFromRecord, UNSOURCED_INPUTS, type MoneyConfig, type ScenarioReport } from "../engine/scenario-money.js";
import { range, type Range } from "./scenario-compare.js";
import { BEDS_PER_ROOM, WARMUP_DAYS, type RunFile } from "./layout-12-4.js";

export const DEFAULT_MONEY: MoneyConfig = { warmupTicks: WARMUP_DAYS * 1440 };

export interface Setting { name: string; cfg: MoneyConfig }

/** Money settings re-evaluated from the same runs: does the sign of the paired margin delta survive? */
export function sensitivityGrid(): Setting[] {
  const out: Setting[] = [];
  for (const costRatio of [0.4, 0.6, 0.8])
    for (const nonRoomCost of [0, 1_000_000, 3_000_000])
      for (const nonRoomRev of [0, 1_000_000])
        for (const spill of ["hospital-absorbs", "patient-pays-difference"] as const)
          out.push({
            name: `cost ${costRatio} / non-room cost ${nonRoomCost / 1e6}M / non-room rev ${nonRoomRev / 1e6}M / ${spill === "hospital-absorbs" ? "absorb" : "pay-diff"}`,
            cfg: { ...DEFAULT_MONEY, costRatioOfListRate: costRatio, nonRoomCostPerAdmissionIdr: nonRoomCost, nonRoomRevenuePerNonPackageAdmissionIdr: nonRoomRev, spillRule: spill },
          });
  return out;
}

interface Pair { rate: number; seed: number; a: RunFile; b: RunFile }

export type Variant = "B" | "C";

export function pairRuns(files: RunFile[], variant: Variant = "B"): Pair[] {
  const key = (f: RunFile) => `${f.arrivalsPerDay}|${f.seed}`;
  const a = new Map(files.filter((f) => f.layout === "A").map((f) => [key(f), f]));
  const pairs: Pair[] = [];
  for (const b of files.filter((f) => f.layout === variant)) {
    const fa = a.get(key(b));
    if (!fa) continue;
    if (fa.record.arrivalDigest !== b.record.arrivalDigest || fa.days !== b.days)
      throw new Error(`demand differs between layouts at rate ${b.arrivalsPerDay}, seed ${b.seed}: runs are not paired`);
    pairs.push({ rate: b.arrivalsPerDay, seed: b.seed, a: fa, b });
  }
  return pairs;
}

const M = (n: number) => (n / 1e6).toFixed(1);
const R = (r: Range, f: (n: number) => string = (n) => n.toFixed(1)) => `${f(r.median)} (${f(r.min)} to ${f(r.max)})`;

/** Linear interpolation of the rate where a series of median deltas crosses zero; null = no crossing. */
export function crossing(rates: number[], medians: number[]): number | null {
  for (let i = 0; i + 1 < rates.length; i++) {
    const y0 = medians[i]!, y1 = medians[i + 1]!;
    if (y0 === 0) return rates[i]!;
    if ((y0 < 0) !== (y1 < 0) && y1 !== 0) return rates[i]! + ((rates[i + 1]! - rates[i]!) * (0 - y0)) / (y1 - y0);
    if (y1 === 0) return rates[i + 1]!;
  }
  return null;
}

export function buildReport(files: RunFile[], variant: Variant = "B"): string {
  const pairs = pairRuns(files, variant);
  if (pairs.length === 0) throw new Error("no paired A/B runs found");
  const rates = [...new Set(pairs.map((p) => p.rate))].sort((x, y) => x - y);
  const seeds = [...new Set(pairs.map((p) => p.seed))].sort((x, y) => x - y);
  const days = pairs[0]!.a.days;
  const L: string[] = [];
  const add = (s = "") => L.push(s);

  add(variant === "B" ? "# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example)" : "# Epic XII 12.4 sensitivity: bed-matched comparison (same 20 beds)");
  add();
  add("> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.");
  add();
  add("## Reading of the example");
  add(`- **A:** 10 Kelas 2 rooms x ${BEDS_PER_ROOM["kelas-2"]} beds = 20 Kelas 2 beds.`);
  if (variant === "B") {
    add(`- **B:** 5 Kelas 2 rooms x ${BEDS_PER_ROOM["kelas-2"]} + 10 Kelas 3 rooms x ${BEDS_PER_ROOM["kelas-3"]} = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.`);
  } else {
    add("- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds = 20 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)");
  }
  add("- Each layout is a standalone general ward; the rest of the hospital is not simulated.");
  add(`- ${days} simulated days per run, the first ${WARMUP_DAYS} dropped as warm-up; ${seeds.length} seeds (${seeds.join(", ")}); arrival rates ${rates.join(", ")} per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).`);
  add(`- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are ${variant} minus A.`);
  add(`- Routing: DEFAULT_ROUTING (BPJS and Self-pay start in Kelas 3; Private Insurance in Kelas 2; spill up allowed). With layout A (no Kelas 3), BPJS and Self-pay patients are placed in Kelas 2 as spillover.`);
  add();
  add("## Assumptions and unsourced inputs (read first)");
  for (const u of UNSOURCED_INPUTS) add(`- ${u}`);
  add("- Ancillary revenue and cost do NOT cancel between layouts (they admit different patients). A package payer earns the whole INA-CBG tariff against only a bed-day cost unless a non-room cost per admission is set; that tilts margin toward the layout admitting more package patients. The sensitivity section varies it.");
  add("- Default money settings for the main table: cost = 0.6 x list room price per occupied bed-day, no non-room cost or revenue, spilled-up BPJS absorbed by the hospital, all BPJS claims paid.");
  add();

  add("## Results at default money settings (median, min to max across seeds)");
  add();
  add("| rate/day | layout | occupancy | admitted | diverted | BPJS diverted | spilled up | revenue (M IDR) | margin (M IDR) |");
  add("|---|---|---|---|---|---|---|---|---|");
  const rep = (f: RunFile, cfg: MoneyConfig) => reportFromRecord(f.record, cfg);
  for (const rate of rates) {
    const ps = pairs.filter((p) => p.rate === rate);
    for (const side of ["a", "b"] as const) {
      const rs = ps.map((p) => rep(side === "a" ? p.a : p.b, DEFAULT_MONEY));
      const col = (f: (r: ScenarioReport) => number) => range(rs.map(f));
      add(`| ${rate} | ${side === "a" ? "A" : variant} | ${R(col((r) => r.occupancy * 100))}% | ${R(col((r) => r.admitted), (n) => n.toFixed(0))} | ${R(col((r) => r.diverted), (n) => n.toFixed(0))} | ${R(col((r) => r.divertedByPayer["BPJS Kesehatan"] ?? 0), (n) => n.toFixed(0))} | ${R(col((r) => r.spilledUp), (n) => n.toFixed(0))} | ${R(col((r) => r.revenue.totalIdr), M)} | ${R(col((r) => r.marginIdr), M)} |`);
    }
  }
  add();
  add(`## Paired difference ${variant} minus A at default money settings`);
  add();
  add("| rate/day | margin (M IDR) | diverted | BPJS diverted | occupancy (points) |");
  add("|---|---|---|---|---|");
  const medMargin: number[] = [];
  for (const rate of rates) {
    const ps = pairs.filter((p) => p.rate === rate);
    const d = (f: (r: ScenarioReport) => number) => range(ps.map((p) => f(rep(p.b, DEFAULT_MONEY)) - f(rep(p.a, DEFAULT_MONEY))));
    const dm = d((r) => r.marginIdr);
    medMargin.push(dm.median);
    add(`| ${rate} | ${R(dm, M)} | ${R(d((r) => r.diverted), (n) => n.toFixed(0))} | ${R(d((r) => r.divertedByPayer["BPJS Kesehatan"] ?? 0), (n) => n.toFixed(0))} | ${R(d((r) => r.occupancy * 100))} |`);
  }
  add();
  add("With few seeds and a few dozen arrivals per run, lean on the min-to-max range, not on the median.");
  add();

  add("## Sensitivity: does the sign of the margin difference survive the unsourced inputs?");
  add();
  add(`Cell = median paired margin difference ${variant} minus A in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.`);
  add();
  add(`| setting | ${rates.map((r) => `rate ${r}`).join(" | ")} | break-even rate |`);
  add(`|---|${rates.map(() => "---").join("|")}|---|`);
  let flipRows = 0, rows = 0;
  const signs = new Set<string>();
  for (const s of sensitivityGrid()) {
    const meds: number[] = [];
    const cells = rates.map((rate) => {
      const ds = pairs.filter((p) => p.rate === rate).map((p) => rep(p.b, s.cfg).marginIdr - rep(p.a, s.cfg).marginIdr);
      const r = range(ds);
      meds.push(r.median);
      signs.add(r.median > 0 ? `${variant} better` : r.median < 0 ? "A better" : "tie");
      const mixed = ds.some((x) => x > 0) && ds.some((x) => x < 0);
      return `${M(r.median)}${mixed ? "*" : ""}`;
    });
    const x = crossing(rates, meds);
    rows++;
    if (x !== null) flipRows++;
    add(`| ${s.name} | ${cells.join(" | ")} | ${x === null ? "none in range" : x.toFixed(1) + "/day"} |`);
  }
  add();
  add(`**Reading:** ${flipRows} of ${rows} settings show a sign change of the median margin difference inside the tested rate range; sign set seen across all cells: ${[...signs].join(", ")} (positive = ${variant} better).`);
  const x0 = crossing(rates, medMargin);
  add(`**Break-even at default settings:** ${x0 === null ? "no crossing in the tested range" : `about ${x0.toFixed(1)} arrivals/day`}. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.`);
  add();
  add("## Not covered");
  add("- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.");
  add("- Refit cost and downtime during the conversion (supported by the engine, set to zero here).");
  add("- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.");
  return L.join("\n") + "\n";
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("layout-12-4-report.ts")) {
  const [dir, out, v] = process.argv.slice(2);
  if (!dir || !out) { console.error("usage: layout-12-4-report.ts <runDir> <outFile.md> [B|C]"); process.exit(2); }
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && /^[ABC]_r/.test(f)).map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")) as RunFile);
  writeFileSync(out, buildReport(files, v === "C" ? "C" : "B"));
  console.error(`wrote ${out} from ${files.length} runs`);
}
