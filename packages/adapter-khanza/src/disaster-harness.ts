/**
 * @deers-rock/adapter-khanza — Disaster stress test harness
 *
 * Runs DR through disaster scenarios and measures impact on:
 * - Patient admission surge
 * - Mortality rate
 * - Bed occupancy
 * - Supply consumption
 * - Referral volume
 */
import type { World } from '@deers-rock/core';

export interface DisasterResult {
  scenario: string;
  tickTriggered: number;
  tickDuration: number;
  preState: Snapshot;
  postState: Snapshot;
  impact: ImpactMetrics;
}

export interface Snapshot {
  tick: number;
  patients: number;
  occupiedBeds: number;
  totalBeds: number;
  deaths: number;
  referrals: number;
  charges: number;
  activeScenarios: string[];
}

export interface ImpactMetrics {
  patientsAdmitted: number;
  patientsDead: number;
  patientsReferrals: number;
  bedOccupancyChange: number;
  chargeIncrease: number;
  supplyShortage: string[];
  scenarioResolved: boolean;
}

/**
 * Capture a world snapshot for before/after comparison.
 */
export function captureSnapshot(w: World): Snapshot {
  const occupiedBeds = Array.from(w.state.beds.values())
    .filter(b => b.patientId).length;

  return {
    tick: w.clock.tick,
    patients: w.state.patients.size,
    occupiedBeds,
    totalBeds: w.state.beds.size,
    deaths: w.state.morgue.length,
    referrals: w.state._referralState.letters.size,
    charges: w.state.charges.size,
    activeScenarios: w.state._scenario?.activeScenarios?.map((s: any) => s.type) ?? [],
  };
}

/**
 * Run a disaster scenario and measure impact.
 */
export function runDisasterTest(
  w: World,
  scenarioType: string,
  durationTicks: number = 1000,
): DisasterResult {
  const pre = captureSnapshot(w);
  const triggerTick = w.clock.tick;

  // Trigger the scenario
  w.state._scenario?.triggerScenario(scenarioType);

  // Run simulation for duration
  const { runWorld } = require('./world.js') as typeof import('@deers-rock/core');
  for (let i = 0; i < durationTicks; i++) {
    runWorld(w, 1);
  }

  const post = captureSnapshot(w);

  // Compute impact
  const impact: ImpactMetrics = {
    patientsAdmitted: post.patients - pre.patients,
    patientsDead: post.deaths - pre.deaths,
    patientsReferrals: post.referrals - pre.referrals,
    bedOccupancyChange: post.occupiedBeds - pre.occupiedBeds,
    chargeIncrease: post.charges - pre.charges,
    supplyShortage: detectSupplyShortages(w),
    scenarioResolved: !post.activeScenarios.includes(scenarioType),
  };

  return {
    scenario: scenarioType,
    tickTriggered: triggerTick,
    tickDuration: durationTicks,
    preState: pre,
    postState: post,
    impact,
  };
}

/**
 * Detect supply shortages from central supply data.
 */
function detectSupplyShortages(w: World): string[] {
  const shortages: string[] = [];
  for (const [code, item] of w.state.inventory) {
    if (item.stock <= item.minStock) {
      shortages.push(`${item.itemName} (stock: ${item.stock}, min: ${item.minStock})`);
    }
  }
  return shortages;
}
