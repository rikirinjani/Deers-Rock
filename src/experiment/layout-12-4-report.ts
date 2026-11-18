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
import { BEDS_PER_ROOM, WARMUP_DAYS, K1_WARD_BEDS, parseRoutingMode, type RoutingMode, type RunFile } from "./layout-12-4.js";
import {
  buildCells, breakEvenFixedCost, crossingAnalysis, curvesAtFixedCost, interpAt, median, paybackDays,
  type Pair,
} from "./layout-12-4-breakeven.js";

export const DEFAULT_MONEY: MoneyConfig = { warmupTicks: WARMUP_DAYS * 1440 };

export interface Setting { name: string; cfg: MoneyConfig }

/**
 * Money settings re-evaluated from the same runs: does the sign of the paired margin delta survive?
 * Cost modes include FLAT cost per bed-day (same for every class): with a ratio of the list price
 * a Kelas 2 bed costs more than a Kelas 3 bed, which alone moves margin between bed-matched layouts.
 */
export function sensitivityGrid(routing: RoutingMode = "spill"): Setting[] {
  const costModes: { name: string; cfg: MoneyConfig }[] = [
    { name: "cost 0.4 x list", cfg: { costRatioOfListRate: 0.4 } },
    { name: "cost 0.6 x list", cfg: { costRatioOfListRate: 0.6 } },
    { name: "cost 0.8 x list", cfg: { costRatioOfListRate: 0.8 } },
    { name: "cost flat 250k", cfg: { costPerBedDayIdr: { "kelas-2": 250_000, "kelas-3": 250_000 } } },
    { name: "cost flat 350k", cfg: { costPerBedDayIdr: { "kelas-2": 350_000, "kelas-3": 350_000 } } },
  ];
  const out: Setting[] = [];
  for (const cm of costModes)
    for (const nonRoomCost of [0, 1_000_000, 3_000_000])
      for (const nonRoomRev of [0, 1_000_000])
        // Rule-aware routing: a forced upgrade costs the member nothing, so the pay-difference rule does not apply.
        for (const spill of (routing.startsWith("rule-") ? ["hospital-absorbs"] : ["hospital-absorbs", "patient-pays-difference"]) as ("hospital-absorbs" | "patient-pays-difference")[])
          out.push({
            name: `${cm.name} / non-room cost ${nonRoomCost / 1e6}M / non-room rev ${nonRoomRev / 1e6}M / ${spill === "hospital-absorbs" ? "absorb" : "pay-diff"}`,
            cfg: { ...DEFAULT_MONEY, ...cm.cfg, nonRoomCostPerAdmissionIdr: nonRoomCost, nonRoomRevenuePerNonPackageAdmissionIdr: nonRoomRev, spillRule: spill },
          });
  return out;
}

export type Variant = "B" | "C" | "B1" | "C1";
/** Baseline layout of a variant: A (no Kelas 1 beds) or A1 (with the small Kelas 1 ward). */
export const baseOf = (v: Variant): "A" | "A1" => (v.endsWith("1") ? "A1" : "A");
/** Effective routing label of a run file. Reserving Kelas 1 changes nothing in a layout with no Kelas 1 beds, so older non-reserved rule-aware runs of A, B, C count as the reserved mode. */
export function effectiveRouting(f: RunFile): RoutingMode {
  const r = f.routing ?? "spill";
  if (r.startsWith("rule-") && !r.endsWith("-r") && !f.layout.endsWith("1")) return `${r}-r` as RoutingMode;
  return r;
}

const routingLabel = (r: RoutingMode) => (r === "spill" ? " - SPILL-ALLOWED ROUTING (sensitivity)" : r === "strict" ? " - STRICT ROUTING (sensitivity)" : ` - RULE-AWARE ROUTING (BPJS tier mix K3/K2/K1 = ${r.slice(5).replace(/-r$/, "").replace(/-/g, "/")}${r.endsWith("-r") ? ", Kelas 1 reserved for the K1 tier" : ""})`);

export function pairRuns(files: RunFile[], variant: Variant = "B", routing: RoutingMode = "spill"): Pair[] {
  files = files.filter((f) => effectiveRouting(f) === routing);
  const key = (f: RunFile) => `${f.arrivalsPerDay}|${f.seed}`;
  const a = new Map(files.filter((f) => f.layout === baseOf(variant)).map((f) => [key(f), f]));
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

export function buildReport(files: RunFile[], variant: Variant = "B", routing: RoutingMode = "spill"): string {
  const pairs = pairRuns(files, variant, routing);
  if (pairs.length === 0) throw new Error("no paired A/B runs found");
  const rates = [...new Set(pairs.map((p) => p.rate))].sort((x, y) => x - y);
  const seeds = [...new Set(pairs.map((p) => p.seed))].sort((x, y) => x - y);
  const days = pairs[0]!.a.days;
  const L: string[] = [];
  const add = (s = "") => L.push(s);

  const base = baseOf(variant);
  const k1 = variant.endsWith("1");
  add((variant.startsWith("B") ? "# Epic XII 12.4: Kelas 2 vs Kelas 2 + Kelas 3 layout comparison (as in the example)" : "# Epic XII 12.4 sensitivity: bed-matched comparison (same capacity)") + (k1 ? " - WITH A SMALL KELAS 1 WARD" : "") + routingLabel(routing));
  add();
  add("> **SCENARIO AND SENSITIVITY OUTPUT, NOT A FORECAST.** The model is not validated against any real hospital. Read the assumptions below before any number.");
  add();
  add("## Reading of the example");
  add(`- **${base}:** 10 Kelas 2 rooms x ${BEDS_PER_ROOM["kelas-2"]} beds = 20 Kelas 2 beds${k1 ? ` + ${K1_WARD_BEDS} Kelas 1 beds` : ""}.`);
  if (k1) add(`- **Kelas 1 ward (ASSUMPTION, owner request 2026-11-18):** every layout (A1, B1, C1) carries the same ${K1_WARD_BEDS} Kelas 1 beds (2 rooms x 2 beds) so the K1 entitlement tier of BPJS Kesehatan can be placed. Kelas 1 beds are reserved for that tier (no other payer or tier spills into them), so the ward is the same neutral addition in every layout. Without it (layouts A, B, C) the K1 tier is never placed.`);
  if (variant.startsWith("B")) {
    add(`- **B:** 5 Kelas 2 rooms x ${BEDS_PER_ROOM["kelas-2"]} + 10 Kelas 3 rooms x ${BEDS_PER_ROOM["kelas-3"]} = 10 Kelas 2 beds + 40 Kelas 3 beds. **B has 2.5 times A's beds**, so this comparison mixes the class mix with extra capacity; the bed-matched variant (results for C) isolates the mix.`);
  } else {
    add("- **C (bed-matched):** 10 Kelas 2 beds + 10 Kelas 3 beds = 20 beds, the same capacity as A. Only the class mix differs from A. (Not the owner's example; a sensitivity run.)");
  }
  add("- Each layout is a standalone general ward; the rest of the hospital is not simulated.");
  add(`- ${days} simulated days per run, the first ${WARMUP_DAYS} dropped as warm-up; ${seeds.length} seeds (${seeds.join(", ")}); arrival rates ${rates.join(", ")} per day. With about 5-day stays, beds demanded is about 5 x the rate (A has 20 beds, B has 50).`);
  add(`- Same demand in both layouts, paired by seed and rate (checked: arrival digests are identical). Deltas are ${variant} minus ${base}.`);
  if (routing.startsWith("rule-")) {
    const mix = routing.slice(5).replace(/-r$/, "").replace(/-/g, "/");
    add(`- Routing: RULE-AWARE. BPJS Kesehatan members are split by entitlement tier, K3 (PBI included) / K2 / K1 = ${mix} percent (**UNSOURCED placeholder mix**; tier = zero-rng hash of the patient id). Each tier uses its own class first and is moved ONE class up when its class is full (K3 to K2, K2 to K1, K1 stays in K1, no VIP), the hospital absorbs the cost. Voluntary upgrade is out of scope. Other payers follow DEFAULT_ROUTING. The rules come from secondary sources (news), not primary text. No layout has Kelas 1 beds, so the K1 tier (a share of BPJS Kesehatan demand) is placed nowhere and is diverted in every layout: it removes demand equally from A, B and C. In layout A (no Kelas 3) the K3 tier is placed in K2 as a forced upgrade.`);
  } else if (routing === "strict") {
    add("- Routing: STRICT. Each payer may use only its own class (BPJS Kesehatan, Jasa Raharja and Self-pay: Kelas 3; Private Insurance and BPJS Ketenagakerjaan: Kelas 2); no spillover. A payer whose own class has no bed in the layout is never placed and ends diverted. Layout A has no Kelas 3, so it cannot place BPJS Kesehatan, Jasa Raharja or Self-pay patients at all: this is a deliberately harsh reading of the owner's premise (more BPJS inpatients), not a tuned one.");
  } else {
    add("- Routing: DEFAULT_ROUTING (BPJS and Self-pay start in Kelas 3; Private Insurance in Kelas 2; spill up allowed). With layout A (no Kelas 3), BPJS and Self-pay patients are placed in Kelas 2 as spillover.");
  }
  add();
  add("## Assumptions and unsourced inputs (read first)");
  for (const u of UNSOURCED_INPUTS) add(`- ${u}`);
  add("- Ancillary revenue and cost do NOT cancel between layouts (they admit different patients). A package payer earns the whole INA-CBG tariff against only a bed-day cost unless a non-room cost per admission is set; that tilts margin toward the layout admitting more package patients. The sensitivity section varies it.");
  add(routing.startsWith("rule-")
    ? "- **Rule-aware routing page.** Compare with the spill-allowed and strict pages; the tier mix is a placeholder, see the three mixes run."
    : routing === "strict"
    ? "- **Strict routing page.** Compare with the spill-allowed pages: the truth for a real hospital lies between the two, depending on what BPJS may actually use when its own class is full (unverified)."
    : "- **Routing is held fixed** at DEFAULT_ROUTING, which lets BPJS and Self-pay patients spill up into Kelas 2. Findings about the class mix are conditional on that. A strict-routing page (no spill) exists as a separate file.");
  add("- Money settings that change margin most: cost per bed-day by class (ratio of the list price or flat) and the spilled-up BPJS rule. Non-room cost and revenue per admission are second order here.");
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
      add(`| ${rate} | ${side === "a" ? base : variant} | ${R(col((r) => r.occupancy * 100))}% | ${R(col((r) => r.admitted), (n) => n.toFixed(0))} | ${R(col((r) => r.diverted), (n) => n.toFixed(0))} | ${R(col((r) => r.divertedByPayer["BPJS Kesehatan"] ?? 0), (n) => n.toFixed(0))} | ${R(col((r) => r.spilledUp), (n) => n.toFixed(0))} | ${R(col((r) => r.revenue.totalIdr), M)} | ${R(col((r) => r.marginIdr), M)} |`);
    }
  }
  add();
  add(`## Paired difference ${variant} minus ${base} at default money settings`);
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
  add(`Cell = median paired margin difference ${variant} minus ${base} in M IDR; * = seeds disagree on the sign. Rows are money settings recomputed from the same runs.`);
  add();
  add(`| setting | ${rates.map((r) => `rate ${r}`).join(" | ")} | break-even rate |`);
  add(`|---|${rates.map(() => "---").join("|")}|---|`);
  // Flip counts are split by spill rule. "any" = the median crosses zero at all; "material" = it is
  // above +5M IDR in some cell and below -5M IDR in another (small crossings of a million or two do not count).
  const MATERIAL = 5_000_000;
  const tally: Record<string, { rows: number; any: number; material: number }> = {};
  const signs = new Set<string>();
  for (const s of sensitivityGrid(routing)) {
    const meds: number[] = [];
    const cells = rates.map((rate) => {
      const ds = pairs.filter((p) => p.rate === rate).map((p) => rep(p.b, s.cfg).marginIdr - rep(p.a, s.cfg).marginIdr);
      const r = range(ds);
      meds.push(r.median);
      signs.add(r.median > 0 ? `${variant} better` : r.median < 0 ? `${base} better` : "tie");
      const mixed = ds.some((x) => x > 0) && ds.some((x) => x < 0);
      return `${M(r.median)}${mixed ? "*" : ""}`;
    });
    const x = crossing(rates, meds);
    const t = (tally[s.cfg.spillRule ?? "hospital-absorbs"] ??= { rows: 0, any: 0, material: 0 });
    t.rows++;
    if (x !== null) t.any++;
    if (meds.some((m) => m > MATERIAL) && meds.some((m) => m < -MATERIAL)) t.material++;
    add(`| ${s.name} | ${cells.join(" | ")} | ${x === null ? "none in range" : x.toFixed(1) + "/day"} |`);
  }
  add();
  const tallyText = Object.entries(tally).map(([k, t]) => `${k}: ${t.any} of ${t.rows} settings cross zero, ${t.material} materially (above +5M and below -5M IDR in different rates)`).join("; ");
  add(`**Reading:** ${tallyText}. Sign set seen across all cells: ${[...signs].join(", ")} (positive = ${variant} better).${routing.startsWith("rule-") ? " Pay-difference rows are not run for rule-aware routing (a forced upgrade costs the member nothing)." : ""}`);
  const x0 = crossing(rates, medMargin);
  add(`**Break-even at default settings:** ${x0 === null ? "no crossing in the tested range" : `about ${x0.toFixed(1)} arrivals/day`}. Where a crossing exists, compare it with the occupancy columns above: A's occupancy near the crossing is the occupancy at which the two layouts earn the same.`);
  add();
  // ---------------------------------------------------------------- break-even analysis
  const cells = buildCells(pairs, DEFAULT_MONEY);
  const nSeeds = cells[0]!.delta0.length;
  const k = (n: number) => (n / 1000).toFixed(0);
  const equalBeds = cells.every((c) => Math.abs(c.dAvail) < 1e-9);
  add("## Break-even analysis (scenario and sensitivity)");
  add();
  add(`Money settings are the defaults of this page; the **fixed cost per available bed-day F** (staffing, utilities and upkeep of beds that exist whether occupied or not) is UNSOURCED, varied here and zero in the tables above. ${nSeeds} paired seeds; margin difference = ${variant} minus ${base}; margin(F) = margin(0) - F x open bed-days.`);
  add();
  add("### 1. Break-even fixed cost per available bed-day");
  add();
  if (equalBeds) {
    add(`**None by construction:** ${variant} and ${base} have the same number of open bed-days, so fixed cost cancels and the margin difference does not depend on F.`);
  } else {
    add("F* = margin difference at F = 0 divided by the extra open bed-days of the variant. Above F* the variant earns less than the baseline at that arrival rate; a negative F* means the variant is already behind with free beds.");
    add();
    add("| rate/day | extra open bed-days | margin diff at F=0 (M IDR) | F* (k IDR per bed-day), median (min to max) |");
    add("|---|---|---|---|");
    for (const c of cells) {
      const fs = c.delta0.map((d) => breakEvenFixedCost(d, c.dAvail)!).filter((x) => Number.isFinite(x));
      add(`| ${c.rate} | ${c.dAvail.toFixed(0)} | ${R({ min: Math.min(...c.delta0), median: median(c.delta0), max: Math.max(...c.delta0), mean: 0 }, M)} | ${k(median(fs))} (${k(Math.min(...fs))} to ${k(Math.max(...fs))}) |`);
    }
  }
  add();
  add("### 2. Break-even demand (arrivals per day where the two layouts earn the same margin)");
  add();
  add("Linear interpolation of the median paired margin difference between the tested rates. **Reliability rule:** reported as reliable only if the median curve has exactly one zero crossing and at least 80 percent of seeds have the median's sign at both bracketing rates; otherwise \"no reliable crossing\". The bootstrap resamples whole seeds (all rates together) 1000 times. The crossing falls inside one bracket of the rate grid, so read the rate to the grid's resolution only.");
  add();
  const Fs = equalBeds ? [0] : [0, 50_000, 100_000, 200_000];
  add("| F (k IDR per bed-day) | result | crossing (arrivals/day) | bracket | seeds agreeing at bracket | per-seed crossing min / median / max (n of seeds) | bootstrap 95% (share of resamples with one crossing) | occupancy at crossing: " + base + " / " + variant + " | ahead below / above |");
  add("|---|---|---|---|---|---|---|---|---|");
  for (const F of Fs) {
    const cr = crossingAnalysis(rates, curvesAtFixedCost(cells, F));
    const ahead = (s: string) => (s === "+" ? variant : s === "-" ? base : "tie");
    if (cr.status !== "single") {
      add(`| ${k(F)} | ${cr.reliable ? "reliable" : "**no reliable crossing**: " + cr.reason} | - | - | - | - | - | - | ${ahead(cr.signs.low)} / ${ahead(cr.signs.high)} |`);
      continue;
    }
    const occA = interpAt(rates, cells.map((c) => median(c.occA)), cr.rate!) * 100;
    const occB = interpAt(rates, cells.map((c) => median(c.occB)), cr.rate!) * 100;
    add(`| ${k(F)} | ${cr.reliable ? "reliable" : "**no reliable crossing**: " + cr.reason} | ${cr.rate!.toFixed(2)} | ${cr.bracket!.join(" to ")} | ${Math.round(cr.agreement![0] * 100)}% / ${Math.round(cr.agreement![1] * 100)}% | ${cr.seedRange ? `${cr.seedRange.min.toFixed(1)} / ${cr.seedRange.median.toFixed(1)} / ${cr.seedRange.max.toFixed(1)} (${cr.seedRange.n} of ${cr.seedRange.of})` : "none"} | ${cr.bootstrap ? `${cr.bootstrap.lo.toFixed(2)} to ${cr.bootstrap.hi.toFixed(2)} (${Math.round(cr.bootstrap.shareSingle * 100)}%)` : "none"} | ${occA.toFixed(0)}% / ${occB.toFixed(0)}% | ${ahead(cr.signs.low)} / ${ahead(cr.signs.high)} |`);
  }
  add();
  add("### 3. Refit payback (days to recover the refit)");
  add();
  add(`Payback = (refit cost + downtime loss) / daily margin gain of ${variant} over ${base}, per seed at the arrival rate shown; "never" where the gain is zero or negative. **Refit cost and downtime are UNSOURCED placeholders** (refit cost 50, 150, 300M IDR; downtime 14, 30, 60 days). The downtime loss is arithmetic (beds converted x downtime days x ${base}'s contribution per open bed-day), not a simulated closure; converted beds = ${cells[0]!.closedBeds}. Central case = 150M IDR and 30 days, at the median daily gain, with the range over seeds; the last column is the range over the whole placeholder grid at the median gain.`);
  add();
  add("| rate/day | F (k IDR) | daily gain (M IDR), median (min to max) | payback central, median (min to max over seeds) | payback over placeholder grid (median gain) |");
  add("|---|---|---|---|---|");
  const fmtD = (d: number | "never") => (d === "never" || d === Infinity ? "never" : d.toFixed(0));
  for (const F of equalBeds ? [0] : [0, 100_000]) {
    for (const c of cells) {
      const gain = c.delta0.map((d) => (d - F * c.dAvail) / c.windowDays);
      const contrib = median(c.contribA);
      const central = gain.map((g) => paybackDays(150e6, 30, c.closedBeds, contrib, g).days);
      // "never" counts as infinity, so the median is "never" when most seeds never recover the cost.
      const vals = central.map((x) => (x === "never" ? Infinity : x));
      const nNever = vals.filter((x) => x === Infinity).length;
      const centralTxt = `${fmtD(median(vals))} (${fmtD(Math.min(...vals))} to ${fmtD(Math.max(...vals))})${nNever > 0 ? `; never in ${nNever} of ${vals.length} seeds` : ""}`;
      const mg = median(gain);
      const grid: (number | "never")[] = [];
      for (const rc of [50e6, 150e6, 300e6]) for (const dt of [14, 30, 60]) grid.push(paybackDays(rc, dt, c.closedBeds, contrib, mg).days);
      const gn = grid.filter((x): x is number => x !== "never");
      const gridTxt = gn.length === 0 ? "never" : `${fmtD(Math.min(...gn))} to ${fmtD(Math.max(...gn))}`;
      add(`| ${c.rate} | ${k(F)} | ${R({ min: Math.min(...gain), median: mg, max: Math.max(...gain), mean: 0 }, M)} | ${centralTxt} | ${gridTxt} |`);
    }
  }
  add();
  add("## Not covered");
  add("- Break-even results hold only for the stated placeholders; the fixed cost per bed-day, refit cost and downtime have no source, and the arrival grid is coarse (the crossing sits inside one bracket).");
  add("- Real tariffs, real costs, real BPJS entitlement; only the engine's tables and placeholder inputs above.");
  add("- Under the pay-difference rule, A's lead comes from every spilled-up BPJS patient paying the difference in a ward that has no Kelas 3.");
  add("- Break-even rates printed above come from a median crossing; where seeds disagree on the sign around the crossing (marked *), treat it as no reliable crossing.");
  add("- Refit cost and downtime during the conversion (supported by the engine, set to zero here).");
  add("- Anything outside this ward: referrals, ICU, the wider hospital's specialty mix.");
  return L.join("\n") + "\n";
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("layout-12-4-report.ts")) {
  const [dir, out, v, r] = process.argv.slice(2);
  if (!dir || !out) { console.error("usage: layout-12-4-report.ts <runDir> <outFile.md> [B|C]"); process.exit(2); }
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && /^[ABC]1?_r/.test(f)).map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")) as RunFile);
  writeFileSync(out, buildReport(files, (["B", "C", "B1", "C1"].includes(v ?? "") ? v : "B") as Variant, parseRoutingMode(r)));
  console.error(`wrote ${out} from ${files.length} runs`);
}
