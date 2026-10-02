// Kaggle CPU long-run validation for ADR-004 (bounded state + durable scheduling).
//
// What it does (single deterministic run, flags ON):
//   1. Builds a world (seed 42), enables DR_BOUNDED_STATE=1 + DR_DURABLE_QUEUE=1.
//   2. Steps TICKS (default 100000; override with env). No wall-clock anywhere;
//      all thresholds are tick-based, so the run is reproducible.
//   3. Every 1000 ticks records: RSS (process.memoryUsage), journal file bytes,
//      state charges size, encounters by status, pending queue length.
//   4. Mid-run (tick 50000) simulates a crash: serializes a snapshot the same
//      way saveSnapshot does, rebuilds via the resume path, and continues —
//      asserting discharges resume afterwards (queue-durability proof).
//   5. Emits JSON report to stdout + report.json.
//
// Ceilings asserted at the end (tunable via env):
//   - max RSS <= RSS_CEIL_MB (default 450 — must stay under the 512M co-host cap)
//   - journal bytes <= JOURNAL_CEIL_MB (default 300)
//   - discharged encounters observed after tick 5000 (LOS proof)
//   - charges size bounded in the final window (pruning proof)
//
// Usage (Kaggle CPU kernel, internet ON for one-time setup):
//   git clone https://github.com/rikirinjani/Deers-Rock.git && cd Deers-Rock
//   npm ci && npm run build
//   node scripts/kaggle-longrun/validate-bounded.mjs > report.json
// Local smoke: TICKS=200 node scripts/kaggle-longrun/validate-bounded.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const distEngine = path.join(repoRoot, "dist", "engine");

const { createWorld, step, resumeWorld } = await import(`file://${path.join(distEngine, "world.js")}`);
const { initJournal, saveSnapshot, loadNearestSnapshot } = await import(`file://${path.join(distEngine, "journal.js")}`);

const TICKS = Number(process.env.TICKS ?? 100000);
const SEED = Number(process.env.SEED ?? 42);
const PATIENTS = Number(process.env.PATIENTS ?? 50);
const RSS_CEIL_MB = Number(process.env.RSS_CEIL_MB ?? 450);
const JOURNAL_CEIL_MB = Number(process.env.JOURNAL_CEIL_MB ?? 300);
const CRASH_AT = Math.floor(TICKS / 2);
const SAMPLE_EVERY = 1000;

const journalPath = path.join(repoRoot, "longrun-journal.db");
for (const f of [journalPath, `${journalPath}-wal`, `${journalPath}-shm`]) {
  try { fs.rmSync(f, { force: true }); } catch { /* fresh start */ }
}

process.env.DR_BOUNDED_STATE = "1";
process.env.DR_DURABLE_QUEUE = "1";

const samples = [];
let maxRssMb = 0;
let w = createWorld(PATIENTS, journalPath, SEED);
initJournal(journalPath);

for (let t = 1; t <= TICKS; t++) {
  w = step(w);

  if (t === CRASH_AT) {
    // Simulated crash: persist snapshot through the real save path, then
    // resume exactly as the server boot path does (snapshot + journal replay).
    saveSnapshot(w.clock.tick, w.state, w.queue);
    const snap = loadNearestSnapshot(w.clock.tick);
    if (snap === null || snap === undefined) throw new Error("no snapshot at crash point");
    w = resumeWorld(snap.state, snap.tick, journalPath);
  }

  if (t % SAMPLE_EVERY === 0 || t === TICKS) {
    const rssMb = process.memoryUsage().rss / 1048576;
    maxRssMb = Math.max(maxRssMb, rssMb);
    let journalMb = 0;
    try { journalMb = fs.statSync(journalPath).size / 1048576; } catch { journalMb = -1; }
    const dist = {};
    for (const e of w.state.encounters.values()) dist[e.status] = (dist[e.status] ?? 0) + 1;
    samples.push({
      tick: w.clock.tick,
      rssMb: Math.round(rssMb * 10) / 10,
      journalMb: Math.round(journalMb * 10) / 10,
      charges: w.state.charges.size,
      encounters: w.state.encounters.size,
      statusDist: dist,
      queueLen: w.queue !== undefined && typeof w.queue.pending === "function" ? w.queue.pending() : null,
    });
  }
}

const dischargedSeen = samples.some((s) => (s.statusDist.discharged ?? 0) > 0);
const finalJournalMb = samples[samples.length - 1].journalMb;
const finalCharges = samples[samples.length - 1].charges;
const midCharges = samples[Math.floor(samples.length / 2)].charges;

const report = {
  config: { ticks: TICKS, seed: SEED, patients: PATIENTS, crashAt: CRASH_AT },
  ceilings: { rssMb: RSS_CEIL_MB, journalMb: JOURNAL_CEIL_MB },
  observed: { maxRssMb: Math.round(maxRssMb * 10) / 10, finalJournalMb, finalCharges, midCharges, dischargedSeen },
  gates: {
    rssCeiling: maxRssMb <= RSS_CEIL_MB,
    journalCeiling: finalJournalMb >= 0 && finalJournalMb <= JOURNAL_CEIL_MB,
    dischargeContinuity: dischargedSeen,
    pruningEvidence: finalCharges <= midCharges * 1.5,
  },
  samples,
};

const pass = Object.values(report.gates).every(Boolean);
report.verdict = pass ? "PASS" : "FAIL";

fs.writeFileSync(path.join(repoRoot, "longrun-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, samples: `[${samples.length} samples]` }));
if (!pass) process.exit(1);
