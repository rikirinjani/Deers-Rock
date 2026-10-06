/**
 * ADR-015 Phase 1 soak gate: seeded 1000-tick finance run.
 *
 * Runs createWorld(50, undefined, 42) for 1000 ticks and prints:
 *   - total charges, charge sum, claim count, paid claim count, paid charges
 *   - aggregate BPJS efficiency (computeBpjsEfficiency from report.ts)
 *   - MEDIAN per-claim cost-coverage ratio (CCR = actualCost / totalCharges)
 *     across PAID BPJS claims (for BPJS, totalCharges is the INA-CBG tariff)
 *   - if the median falls outside the 0.7-1.3 calibration band, the top
 *     over/under-charged categories (dominant-charge-category per claim).
 *
 * Deterministic: no Math.random / Date.now anywhere in the engine path.
 * Run: npx tsx scripts/finance-soak.mjs [ticks] [patients] [seed]
 */
import { createWorld, runWorld } from "../src/engine/world.js";
import { computeBpjsEfficiency } from "../src/engine/report.js";

const TICKS = Number(process.argv[2] ?? 1000);
const PATIENTS = Number(process.argv[3] ?? 50);
const SEED = Number(process.argv[4] ?? 42);

const fmtIDR = (n) => `IDR ${Math.round(n).toLocaleString("en-US")}`;

function median(sorted) {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const w = runWorld(createWorld(PATIENTS, undefined, SEED), TICKS);
const s = w.state;

const charges = Array.from(s.charges.values());
const claims = Array.from(s.insuranceClaims.values());
const payments = Array.from(s.payments.values());

const chargeSum = charges.reduce((a, c) => a + c.amount, 0);
const paidCharges = charges.filter((c) => c.paid).length;
const paidClaims = claims.filter((c) => c.status === "paid").length;
const deniedClaims = claims.filter((c) => c.status === "denied").length;

// Per-category volume/value mix (live charges).
const byCat = new Map();
for (const c of charges) {
  const e = byCat.get(c.category) ?? { count: 0, sum: 0 };
  e.count++; e.sum += c.amount;
  byCat.set(c.category, e);
}

// Median CCR across PAID BPJS claims.
const bpjsPaid = claims.filter((c) => c.payer === "BPJS Kesehatan" && c.status === "paid" && c.totalCharges > 0);
const ccrs = bpjsPaid.map((c) => c.actualCost / c.totalCharges).sort((a, b) => a - b);
const ccrMedian = median(ccrs);

// Dominant-charge-category CCR breakdown (category holding the largest charge
// sum on each paid-BPJS claim's encounter).
const chargesByEncounter = new Map();
for (const c of charges) {
  const m = chargesByEncounter.get(c.encounterId) ?? new Map();
  m.set(c.category, (m.get(c.category) ?? 0) + c.amount);
  chargesByEncounter.set(c.encounterId, m);
}
const catCcr = new Map();
for (const c of bpjsPaid) {
  const m = chargesByEncounter.get(c.encounterId);
  if (!m) continue;
  let dom = null, domSum = -1;
  for (const [cat, sum] of m) if (sum > domSum) { dom = cat; domSum = sum; }
  if (dom === null) continue;
  const list = catCcr.get(dom) ?? [];
  list.push(c.actualCost / c.totalCharges);
  catCcr.set(dom, list);
}
const catMedians = Array.from(catCcr.entries())
  .map(([cat, list]) => ({ category: cat, median: median(list.slice().sort((a, b) => a - b)), claims: list.length }))
  .sort((a, b) => b.median - a.median);

console.log("=== ADR-015 Phase 1 finance soak ===");
console.log(`config: patients=${PATIENTS} seed=${SEED} ticks=${TICKS}`);
console.log(`charges:        ${charges.length} (${paidCharges} paid)`);
console.log(`charge sum:     ${fmtIDR(chargeSum)}`);
console.log(`claims:         ${claims.length} (${paidClaims} paid, ${deniedClaims} denied)`);
console.log(`payments:       ${payments.length} (${fmtIDR(payments.reduce((a, p) => a + p.amount, 0))})`);
console.log(`encounters:     ${s.encounters.size} (inpatient ${Array.from(s.encounters.values()).filter(e => e.type === "inpatient").length})`);
const eff = computeBpjsEfficiency(claims);
console.log(`bpjsEfficiency: ${eff ? `ratio=${eff.ratio} atLoss=${eff.atLoss}/${bpjsPaid.length + claims.filter(c => c.payer === "BPJS Kesehatan").length} actual=${fmtIDR(eff.totalActual)} tariff=${fmtIDR(eff.totalTariff)}` : "null"}`);
console.log(`median CCR (paid BPJS, n=${ccrs.length}): ${ccrMedian !== null ? ccrMedian.toFixed(3) : "n/a"}`);

console.log("\n-- charge mix (live) --");
for (const [cat, e] of Array.from(byCat.entries()).sort((a, b) => b[1].sum - a[1].sum)) {
  console.log(`  ${cat.padEnd(14)} n=${String(e.count).padStart(5)}  ${fmtIDR(e.sum)}`);
}

if (ccrMedian !== null && (ccrMedian < 0.7 || ccrMedian > 1.3)) {
  console.log("\n!! median CCR OUTSIDE 0.7-1.3 band — top over/under-charged categories:");
  const over = catMedians.filter((x) => x.median > 1).slice(0, 3);
  const under = catMedians.filter((x) => x.median < 1).slice(-3).reverse();
  for (const x of over) console.log(`  OVER   ${x.category}: median CCR ${x.median.toFixed(2)} (${x.claims} claims)`);
  for (const x of under) console.log(`  UNDER  ${x.category}: median CCR ${x.median.toFixed(2)} (${x.claims} claims)`);
} else if (ccrMedian !== null) {
  console.log("\nmedian CCR within 0.7-1.3 band: PASS");
}
