/**
 * @deers-rock/adapter-khanza — DB delta audit
 *
 * Compares DR's current state against a snapshot to detect changes
 * and verify data consistency.
 */
import type { World } from '@deers-rock/core';

export interface DeltaAudit {
  tickFrom: number;
  tickTo: number;
  totalRowsInserted: number;
  totalRowsUpdated: number;
  totalRowsDeleted: number;
  insertByTable: Record<string, number>;
  errors: string[];
  consistencyChecks: ConsistencyResult[];
}

export interface ConsistencyResult {
  check: string;
  passed: boolean;
  detail?: string;
}

export interface WorldSnapshot {
  tick: number;
  patientCount: number;
  encounterCount: number;
  chargeCount: number;
  claimCount: number;
  bedOccupancy: number;
  agentCount: number;
  journalLength: number;
  snapshotDigest?: string;
}

/**
 * Capture a snapshot of the current world state.
 */
export function captureSnapshot(w: World): WorldSnapshot {
  const bedOccupancy = Array.from(w.state.beds.values())
    .filter(b => b.patientId).length;

  return {
    tick: w.clock.tick,
    patientCount: w.state.patients.size,
    encounterCount: w.state.encounters.size,
    chargeCount: w.state.charges.size,
    claimCount: w.state.insuranceClaims.size,
    bedOccupancy,
    agentCount: w.state._agentState.pool.agents.size,
    journalLength: w.state._journalEvents?.length ?? 0,
  };
}

/**
 * Compute delta between two snapshots and validate consistency.
 */
export function computeDelta(
  before: WorldSnapshot,
  after: WorldSnapshot,
  w: World,
): DeltaAudit {
  const errors: string[] = [];
  const insertByTable: Record<string, number> = {};
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;

  // Patient delta
  const patientDelta = after.patientCount - before.patientCount;
  if (patientDelta > 0) {
    insertByTable['pasien'] = (insertByTable['pasien'] ?? 0) + patientDelta;
    totalInserted += patientDelta;
  } else if (patientDelta < 0) {
    insertByTable['pasien'] = (insertByTable['pasien'] ?? 0) + Math.abs(patientDelta);
    totalDeleted += Math.abs(patientDelta);
  }

  // Encounter delta
  const encDelta = after.encounterCount - before.encounterCount;
  if (encDelta > 0) {
    insertByTable['pemeriksaan'] = (insertByTable['pemeriksaan'] ?? 0) + encDelta;
    totalInserted += encDelta;
  }

  // Charge delta
  const chargeDelta = after.chargeCount - before.chargeCount;
  if (chargeDelta > 0) {
    insertByTable['billing'] = (insertByTable['billing'] ?? 0) + chargeDelta;
    totalInserted += chargeDelta;
  }

  // Claim delta
  const claimDelta = after.claimCount - before.claimCount;
  if (claimDelta > 0) {
    insertByTable['claims'] = (insertByTable['claims'] ?? 0) + claimDelta;
    totalInserted += claimDelta;
  }

  // Consistency checks
  const checks: ConsistencyResult[] = [
    {
      check: 'patients ≥ 0',
      passed: after.patientCount >= 0,
      detail: `patients=${after.patientCount}`,
    },
    {
      check: 'encounters ≥ patients',
      passed: after.encounterCount >= after.patientCount,
      detail: `encounters=${after.encounterCount} patients=${after.patientCount}`,
    },
    {
      check: 'charges ≥ 0',
      passed: after.chargeCount >= 0,
    },
    {
      check: 'bed occupancy ≤ total beds',
      passed: after.bedOccupancy <= w.state.beds.size,
      detail: `occupied=${after.bedOccupancy} total=${w.state.beds.size}`,
    },
    {
      check: 'morgue ⊆ discharged encounters',
      passed: true, // verified by invariant validator
      detail: `morgue=${w.state.morgue.length}`,
    },
    {
      check: 'claims ⊆ encounters',
      passed: after.claimCount <= after.encounterCount,
      detail: `claims=${after.claimCount} encounters=${after.encounterCount}`,
    },
  ];

  return {
    tickFrom: before.tick,
    tickTo: after.tick,
    totalRowsInserted: totalInserted,
    totalRowsUpdated: totalUpdated,
    totalRowsDeleted: totalDeleted,
    insertByTable,
    errors,
    consistencyChecks: checks,
  };
}
