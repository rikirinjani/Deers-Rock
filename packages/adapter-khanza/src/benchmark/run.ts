/**
 * Benchmark runner: runs DR through N ticks, produces Khanza export + reports
 */
import { createWorld, runWorld } from '../../core/src/engine/world.js';
import { transformWorldToKhanza } from './transformer.js';
import { runAccountingCycle } from './accounting.js';
import { checkClaimParity } from './claim-parity.js';
import { captureSnapshot, computeDelta } from './delta-audit.js';
import { captureSnapshot as capSnap, runDisasterTest } from './disaster-harness.js';
import type { BenchmarkReport, KhanzaExportBundle } from './types.js';

interface Checkpoint {
  tick: number;
  snapshot: any;
  khanzaExport: KhanzaExportBundle;
  accounting: any;
  parity: any;
  delta?: any;
}

export async function runBenchmark(options: {
  patients?: number;
  seed?: number;
  targetTicks?: number;
  checkpointInterval?: number;
  runDisasters?: boolean;
  disasterTypes?: string[];
}): Promise<{ report: BenchmarkReport; checkpoints: Checkpoint[] }> {
  const {
    patients = 200,
    seed = 42,
    targetTicks = 100000,
    checkpointInterval = 10000,
    runDisasters = true,
    disasterTypes = ['earthquake', 'tsunami', 'forest_fire'],
  } = options;

  console.log(`[Benchmark] Creating world: ${patients} patients, seed=${seed}`);
  const w = createWorld(patients, undefined, seed);
  const checkpoints: Checkpoint[] = [];
  let prevSnapshot = captureSnapshot(w);
  let disasterResults: any[] = [];

  console.log(`[Benchmark] Target: ${targetTicks} ticks`);
  const startTime = Date.now();

  for (let tick = 1; tick <= targetTicks; tick++) {
    runWorld(w, 1);

    // Run disasters at specific tick thresholds
    if (runDisasters && [20000, 50000, 80000].includes(tick)) {
      const dType = disasterTypes[Math.floor(Math.random() * disasterTypes.length)];
      console.log(`[Benchmark] Triggering ${dType} at tick ${tick}`);
      try {
        const result = runDisasterTest(w, dType, 5000);
        disasterResults.push(result);
      } catch (e) {
        console.warn(`[Benchmark] Disaster ${dType} failed: ${e}`);
      }
    }

    // Checkpoint
    if (tick % checkpointInterval === 0 || tick === targetTicks) {
      const snap = captureSnapshot(w);
      const delta = computeDelta(prevSnapshot, snap, w);
      const khanza = transformWorldToKhanza(w);
      const accounting = runAccountingCycle(w);
      const parity = checkClaimParity(w);

      checkpoints.push({ tick, snapshot: snap, khanzaExport: khanza, accounting, parity, delta });
      prevSnapshot = snap;

      if (tick % (checkpointInterval * 5) === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const msPerTick = ((Date.now() - startTime) / tick).toFixed(3);
        console.log(`[Benchmark] Tick ${tick}/${targetTicks} (${elapsed}s, ${msPerTick}ms/tick) ` +
          `patients=${snap.patientCount} enc=${snap.encounterCount} charges=${snap.chargeCount}`);
      }
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  const lastCP = checkpoints[checkpoints.length - 1];

  const report: BenchmarkReport = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    tick: w.clock.tick,
    dr_metrics: {
      patients: lastCP.snapshot.patientCount,
      encounters: lastCP.snapshot.encounterCount,
      charges: lastCP.snapshot.chargeCount,
      claims: lastCP.snapshot.claimCount,
      morgue: lastCP.snapshot.deaths,
      activeScenario: lastCP.snapshot.activeScenarios[0],
    },
    khanza_metrics: {
      pasien_count: lastCP.khanzaExport.pasien.length,
      ralan_count: lastCP.khanzaExport.pemeriksaan_ralan.length,
      ranap_count: lastCP.khanzaExport.pemeriksaan_ranap.length,
      jurnal_entries: lastCP.khanzaExport.jurnal.length,
      billing_total: lastCP.khanzaExport.billing.reduce((s: number, b: any) => s + b.total_biaya, 0),
      claims_total: lastCP.khanzaExport.claims.length,
      inventory_items: lastCP.khanzaExport.inventory.length,
      agents_count: lastCP.khanzaExport.agents.length,
      beds_total: lastCP.khanzaExport.beds.length,
      beds_occupied: lastCP.khanzaExport.beds.filter((b: any) => b.status === 'Terisi').length,
    },
    claim_parities: {
      total_compared: lastCP.parity.totalCompared,
      matches: lastCP.parity.matches,
      mismatches: lastCP.parity.mismatches,
      mismatches_detail: lastCP.parity.details.slice(0, 20),
    },
    db_delta: {
      total_rows_inserted: checkpoints.reduce((s: number, c: any) => s + (c.delta?.totalRowsInserted ?? 0), 0),
      total_rows_updated: checkpoints.reduce((s: number, c: any) => s + (c.delta?.totalRowsUpdated ?? 0), 0),
      total_rows_deleted: checkpoints.reduce((s: number, c: any) => s + (c.delta?.totalRowsDeleted ?? 0), 0),
      insert_by_table: checkpoints.reduce((acc: any, c: any) => {
        for (const [tbl, cnt] of Object.entries(c.delta?.insertByTable ?? {})) {
          acc[tbl] = (acc[tbl] ?? 0) + (cnt as number);
        }
        return acc;
      }, {}),
      errors: checkpoints.flatMap((c: any) => c.delta?.errors ?? []),
    },
    accounting_summary: lastCP.accounting.summary,
    disaster_results: disasterResults.map((d: any) => ({
      scenario: d.scenario,
      tick_triggered: d.tickTriggered,
      tick_duration: d.tickDuration,
      patients_admitted: d.impact.patientsAdmitted,
      patients_dead: d.impact.patientsDead,
      patients_referrals: d.impact.patientsReferrals,
      supply_shortage: d.impact.supplyShortage,
      bed_occupancy_before: d.preState.occupiedBeds,
      bed_occupancy_after: d.postState.occupiedBeds,
    })),
  };

  console.log(`\n[Benchmark] Complete in ${elapsed.toFixed(1)}s`);
  console.log(`  Ticks/sec: ${(targetTicks / elapsed).toFixed(1)}`);
  console.log(`  ms/tick: ${((elapsed * 1000) / targetTicks).toFixed(3)}`);
  console.log(`  Patients: ${report.dr_metrics.patients}`);
  console.log(`  Encounters: ${report.dr_metrics.encounters}`);
  console.log(`  Claims: ${report.dr_metrics.claims}`);
  console.log(`  Accounting balance: ${report.accounting_summary.balanceCheck ? 'OK' : 'MISMATCH'}`);
  console.log(`  Claim parity: ${report.claim_parities.matches}/${report.claim_parities.total_compared} (${(report.claim_parities.matches/report.claim_parities.total_compared*100).toFixed(1)}%)`);

  return { report, checkpoints };
}
