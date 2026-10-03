// Kaggle CPU long-run validation for ADR-004 (bounded state + durable scheduling).
//
// What it does (single deterministic run, flags ON):
//   1. Builds a world (seed 42), enables DR_BOUNDED_STATE=1 + DR_DURABLE_QUEUE=1.
//      Tuned defaults (Amendment 1): charges TTL 1000, snapshot retention 3
//      (both env-overridable, recorded in the report config).
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
//   - genuinely NEW discharges counted every tick after the crash-resume
//     (continuity proof; sample-time statusDist cannot observe discharges
//     once active encounters exceed MAX_ENCOUNTERS=500, because cleanup
//     deletes non-active encounters within <=10 ticks)
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
// Optional heap profiling (run with `node --expose-gc`): when PROFILE=1 the
// extra heap fields are attached and gc() is invoked before each sample; when
// unset, samples are byte-identical to the non-profiled run.
const PROFILE = process.env.PROFILE === "1";

const journalPath = path.join(repoRoot, "longrun-journal.db");
for (const f of [journalPath, `${journalPath}-wal`, `${journalPath}-shm`]) {
  try { fs.rmSync(f, { force: true }); } catch { /* fresh start */ }
}

process.env.DR_BOUNDED_STATE = "1";
process.env.DR_DURABLE_QUEUE = "1";
// ADR-004 Amendment 1 tuned defaults (env-overridable). Must be set BEFORE
// createWorld so the engine reads them at call time.
process.env.DR_PRUNE_TTL_CHARGES ??= "1000";
process.env.DR_SNAPSHOT_RETENTION ??= "3";
const PRUNE_TTL_CHARGES = process.env.DR_PRUNE_TTL_CHARGES;
const SNAPSHOT_RETENTION = process.env.DR_SNAPSHOT_RETENTION;

const samples = [];
let maxRssMb = 0;
let w = createWorld(PATIENTS, journalPath, SEED);
initJournal(journalPath);

// Discharge-continuity tracking: counted EVERY tick, not only at 1000-tick
// samples. cleanup.ts prunes non-active encounters once the map exceeds
// MAX_ENCOUNTERS=500, so a discharged encounter can exist for only a few
// ticks; sampling at 1000-tick intervals structurally can never observe it
// after active encounters alone exceed the cap (tick ~2000).
const dischargedEver = new Set();
let dischargedAfterResume = 0;

// Partial-report-on-crash: a mid-run death still yields the samples so far
// plus the error — exit code 2 = crash, 1 = gate FAIL, 0 = pass.
let crashed = null;
try {
  for (let t = 1; t <= TICKS; t++) {
    w = step(w);

    if (t === CRASH_AT) {
      // Simulated crash: persist snapshot through the real save path, then
      // resume exactly as the server boot path does (snapshot + journal replay).
      // FIDELITY: a real restart is a FRESH process — the pre-crash world no
      // longer exists when the boot parse begins. Release our reference first
      // so the harness never measures the impossible coexistence of the dead
      // world with the freshly parsed snapshot; V8 reclaims it under
      // parse-allocation pressure (an explicit gc() when --expose-gc is
      // available just makes the reclaim deterministic).
      console.error(`[longrun] CRASH-RESUME at tick ${t}`);
      saveSnapshot(w.clock.tick, w.state, w.queue);
      const crashTick = w.clock.tick;
      w = null;
      if (typeof global.gc === "function") global.gc();
      const snap = loadNearestSnapshot(crashTick);
      if (snap === null || snap === undefined) throw new Error("no snapshot at crash point");
      w = resumeWorld(snap.state, snap.tick, journalPath);
    }

    // Count discharges every tick. Encounter ids seen at/before the crash tick
    // (including those already discharged in the resumed snapshot) are marked
    // seen without incrementing, so only genuinely new post-resume discharges
    // satisfy the continuity gate.
    for (const enc of w.state.encounters.values()) {
      if (enc.status !== "discharged") continue;
      if (dischargedEver.has(enc.id)) continue;
      dischargedEver.add(enc.id);
      if (t > CRASH_AT) dischargedAfterResume++;
    }

    if (t % SAMPLE_EVERY === 0 || t === TICKS) {
      if (PROFILE && typeof global.gc === "function") global.gc();
      const rssMb = process.memoryUsage().rss / 1048576;
      maxRssMb = Math.max(maxRssMb, rssMb);
      let journalMb = 0;
      try { journalMb = fs.statSync(journalPath).size / 1048576; } catch { journalMb = -1; }
      const dist = {};
      for (const e of w.state.encounters.values()) dist[e.status] = (dist[e.status] ?? 0) + 1;
      const sample = {
        tick: w.clock.tick,
        rssMb: Math.round(rssMb * 10) / 10,
        journalMb: Math.round(journalMb * 10) / 10,
        charges: w.state.charges.size,
        encounters: w.state.encounters.size,
        statusDist: dist,
        queueLen: w.queue !== undefined && typeof w.queue.pending === "function" ? w.queue.pending() : null,
      };
      if (PROFILE) {
        const mu = process.memoryUsage();
        sample.heapUsedMb = Math.round(mu.heapUsed / 1048576 * 10) / 10;
        sample.heapTotalMb = Math.round(mu.heapTotal / 1048576 * 10) / 10;
        sample.externalMb = Math.round(mu.external / 1048576 * 10) / 10;
        sample.arrayBuffersMb = Math.round(mu.arrayBuffers / 1048576 * 10) / 10;
      }
      samples.push(sample);
      console.log(JSON.stringify(sample)); // progress line (kernel log)
    }
  }
} catch (e) {
  crashed = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
}

const last = samples[samples.length - 1];
const dischargedSeen = samples.some((s) => (s.statusDist.discharged ?? 0) > 0);
const finalJournalMb = last !== undefined ? last.journalMb : -1;
const finalCharges = last !== undefined ? last.charges : -1;
const midCharges = samples.length > 0 ? samples[Math.floor(samples.length / 2)].charges : -1;

const report = {
  config: {
    ticks: TICKS,
    seed: SEED,
    patients: PATIENTS,
    crashAt: CRASH_AT,
    pruneTtlCharges: PRUNE_TTL_CHARGES,
    snapshotRetention: SNAPSHOT_RETENTION,
  },
  ceilings: { rssMb: RSS_CEIL_MB, journalMb: JOURNAL_CEIL_MB },
  observed: { maxRssMb: Math.round(maxRssMb * 10) / 10, finalJournalMb, finalCharges, midCharges, dischargedSeen, dischargedAfterResume, crashed, lastTick: last !== undefined ? last.tick : 0 },
  gates: {
    rssCeiling: crashed === null && maxRssMb <= RSS_CEIL_MB,
    journalCeiling: crashed === null && finalJournalMb >= 0 && finalJournalMb <= JOURNAL_CEIL_MB,
    dischargeContinuity: crashed === null && dischargedAfterResume > 0,
    pruningEvidence: crashed === null && finalCharges >= 0 && finalCharges <= midCharges * 1.5,
  },
  samples,
};

const pass = crashed === null && Object.values(report.gates).every(Boolean);
report.verdict = crashed !== null ? "CRASH" : pass ? "PASS" : "FAIL";

fs.writeFileSync(path.join(repoRoot, "longrun-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, samples: `[${samples.length} samples]` }));
if (crashed !== null) process.exit(2);
if (!pass) process.exit(1);
