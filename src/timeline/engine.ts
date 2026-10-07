/**
 * Timeline Engine — Counterfactual Branching (ADR-009)
 *
 * Supports:
 * - Universe IDs with genealogy
 * - Branch creation from snapshots
 * - Branch execution with interventions
 * - Branch comparison (outcome delta)
 * - Standard scenarios (frozen seed+tick+intervention)
 */

import { createWorld, runWorld, resumeWorld } from "../engine/world.js";
import { loadNearestSnapshot, saveSnapshot, listSnapshots } from "../engine/journal.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ── Types ──────────────────────────────────────────────────────────────────

export type InterventionType =
  | "bed_increase"
  | "staff_reduction"
  | "supply_injection"
  | "scenario_activate"
  | "policy_override"
  | "custom";

export interface Intervention {
  type: InterventionType;
  params: Record<string, unknown>;
}

export interface UniverseID {
  id: string;
  rngSeed: number;
  parent: string | null;
  rewindTick: number | null;
  intervention: string | null;
  created: string;
  label: string;
}

export interface BranchResult {
  ticksRun: number;
  finalTick: number;
  outcomes: OutcomeMetrics;
  journalPath: string;
}

export interface OutcomeMetrics {
  patients: number;
  encounters: number;
  deaths: number;
  avgLOS: number;
  peakOccupancy: number;
  totalCharges: number;
  activeEncounters: number;
}

export interface Branch {
  id: string;
  universeId: string;
  parentSnapshotTick: number;
  intervention: Intervention;
  result: BranchResult | null;
  created: string;
}

export interface OutcomeDelta {
  deaths: { baseline: number; intervention: number; delta: number; pctChange: number };
  LOS: { baseline: number; intervention: number; delta: number; pctChange: number };
  occupancy: { baseline: number; intervention: number; delta: number; pctChange: number };
  charges: { baseline: number; intervention: number; delta: number; pctChange: number };
}

// ── In-memory store (replace with DB for production) ───────────────────────

const universes = new Map<string, UniverseID>();
const branches = new Map<string, Branch>();
const branchResults = new Map<string, BranchResult>();

// ── Standard Scenarios (M3.5) ──────────────────────────────────────────────

export interface StandardScenario {
  id: string;
  label: string;
  seed: number;
  ticks: number;
  patients: number;
  intervention: Intervention;
  description: string;
}

export const STANDARD_SCENARIOS: StandardScenario[] = [
  {
    id: "normal_tuesday",
    label: "Normal Tuesday",
    seed: 101,
    ticks: 1000,
    patients: 50,
    intervention: { type: "scenario_activate", params: { type: "none" } },
    description: "Baseline patient flow, no disasters",
  },
  {
    id: "lebaran_burns",
    label: "Lebaran Burns Surge",
    seed: 202,
    ticks: 800,
    patients: 80,
    intervention: { type: "scenario_activate", params: { type: "fire" } },
    description: "Post-holiday surge in burn victims",
  },
  {
    id: "tsunami_evac",
    label: "Tsunami Evacuation",
    seed: 303,
    ticks: 1200,
    patients: 150,
    intervention: { type: "scenario_activate", params: { type: "tsunami" } },
    description: "Mass casualty event, supply chain disruption",
  },
  {
    id: "pandemic_wave",
    label: "Pandemic Wave",
    seed: 404,
    ticks: 2000,
    patients: 100,
    intervention: { type: "scenario_activate", params: { type: "pandemic" } },
    description: "3x patient influx, ventilator shortage",
  },
  {
    id: "drug_shortage",
    label: "Drug Shortage",
    seed: 505,
    ticks: 1500,
    patients: 50,
    intervention: { type: "supply_injection", params: { drugs: [], reduction: 0.7 } },
    description: "Formulary stockout on Day 2",
  },
];

// ── Universe Management ────────────────────────────────────────────────────

export function createUniverse(options: {
  seed?: number;
  label?: string;
  parent?: string;
}): UniverseID {
  const id = `U-${new Date().getFullYear()}-${String(universes.size + 1).padStart(4, "0")}`;
  const universe: UniverseID = {
    id,
    rngSeed: options.seed ?? Math.floor(Math.random() * 2147483647),
    parent: options.parent ?? null,
    rewindTick: null,
    intervention: null,
    created: new Date().toISOString(),
    label: options.label ?? "Unnamed",
  };
  universes.set(id, universe);
  return universe;
}

export function getUniverse(id: string): UniverseID | undefined {
  return universes.get(id);
}

export function getUniverses(): UniverseID[] {
  return Array.from(universes.values());
}

// ── Branch Creation ─────────────────────────────────────────────────────────

export function createBranch(options: {
  universeId: string;
  snapshotTick: number;
  intervention: Intervention;
  label?: string;
}): Branch | null {
  const universe = universes.get(options.universeId);
  if (!universe) return null;

  const snap = loadNearestSnapshot(options.snapshotTick);
  if (!snap.state) return null;

  const id = `br-${String(branches.size + 1).padStart(4, "0")}`;
  const branch: Branch = {
    id,
    universeId: options.universeId,
    parentSnapshotTick: options.snapshotTick,
    intervention: options.intervention,
    result: null,
    created: new Date().toISOString(),
  };
  branches.set(id, branch);
  return branch;
}

// ── Branch Execution ────────────────────────────────────────────────────────

/**
 * Apply an intervention to a world state before running.
 * This is the core extension point for new intervention types.
 */
function applyIntervention(world: ReturnType<typeof createWorld>, intervention: Intervention): void {
  const state = world.state;

  switch (intervention.type) {
    case "bed_increase": {
      const increase = Number(intervention.params.count ?? 10);
      // Add beds to the state
      const currentBeds = Array.from(state.beds.values());
      for (let i = 0; i < increase; i++) {
        const newId = `BED-EXT-${String(currentBeds.length + i + 1).padStart(4, "0")}`;
        state.beds.set(newId, {
          id: newId,
          patientId: null,
          ward: "internal-medicine",
          building: "",
          roomClass: "kelas-3" as const,
        });
      }
      break;
    }

    case "staff_reduction": {
      const pct = Number(intervention.params.percent ?? 0.5);
      // Reduce agent pool by percentage
      const agents = Array.from((state as any)._agentState?.pool?.agents?.values() ?? []);
      const keep = Math.floor(agents.length * (1 - pct));
      const toKeep = agents.slice(0, keep);
      const newPool = {
        agents: new Map(toKeep.map((a: any) => [a.id, a])),
        assignments: new Map(),
      };
      (state as any)._agentState.pool = newPool;
      break;
    }

    case "supply_injection": {
      const reduction = Number(intervention.params.reduction ?? 0.5);
      // Reduce central supply inventory
      const inventory = state.inventory;
      for (const [code, item] of inventory) {
        inventory.set(code, { ...item, stock: Math.floor(item.stock * (1 - reduction)) });
      }
      break;
    }

    case "scenario_activate": {
      const scenarioType = String(intervention.params.type ?? "none");
      if (scenarioType !== "none") {
        state._scenario = {
          active: {
            id: `interv-${scenarioType}`,
            type: scenarioType as any,
            name: scenarioType,
            severity: 0.8,
            startTick: world.clock.tick,
            durationTicks: 500,
            phase: "sustained",
            currentSurge: 3,
            currentMortalityBoost: 0.15,
          },
          history: [],
          cooldownTicks: 0,
        };
      }
      break;
    }

    case "policy_override": {
      // Example: override LOS range
      const losMin = Number(intervention.params.losMin ?? 360);
      const losMax = Number(intervention.params.losMax ?? 1440);
      (world as any)._losRange = [losMin, losMax];
      break;
    }

    case "custom": {
      // Extensible: caller provides mutation function via params
      const mutate = intervention.params.mutate as ((w: any) => void) | undefined;
      if (mutate) mutate(world);
      break;
    }
  }
}

export function runBranch(branchId: string, ticks: number): BranchResult | null {
  const branch = branches.get(branchId);
  if (!branch) return null;

  const universe = universes.get(branch.universeId);
  if (!universe) return null;

  // Load snapshot at parent tick
  const snap = loadNearestSnapshot(branch.parentSnapshotTick);
  if (!snap.state) return null;

  // Resume world from snapshot
  let world = resumeWorld(snap.state, snap.tick, "");

  // Apply intervention
  applyIntervention(world, branch.intervention);

  // Run specified ticks
  const startTick = world.clock.tick;
  for (let i = 0; i < ticks; i++) {
    world = runWorld(world, 1);
  }

  // Collect outcomes
  const result = collectBranchResult(world, ticks, startTick);
  branch.result = result;
  branchResults.set(branchId, result);

  return result;
}

function collectBranchResult(world: ReturnType<typeof createWorld>, ticksRun: number, startTick: number): BranchResult {
  const state = world.state;
  const discharges = Array.from(state.encounters.values()).filter(e => e.status === "discharged");
  const losValues = discharges.map(e => (e.endTime ?? e.startTime) - e.startTime);
  const activePatients = Array.from(state.encounters.values()).filter(e => e.status === "active");

  return {
    ticksRun,
    finalTick: world.clock.tick,
    outcomes: {
      patients: state.patients.size,
      encounters: state.encounters.size,
      deaths: state.morgue.length,
      avgLOS: losValues.length > 0 ? losValues.reduce((a, b) => a + b, 0) / losValues.length : 0,
      peakOccupancy: Array.from(state.beds.values()).filter(b => b.patientId).length,
      totalCharges: state.charges.size,
      activeEncounters: activePatients.length,
    },
    journalPath: "",
  };
}

// ── Branch Comparison ───────────────────────────────────────────────────────

export function compareBranches(branchId1: string, branchId2: string): OutcomeDelta | null {
  const r1 = branchResults.get(branchId1);
  const r2 = branchResults.get(branchId2);
  if (!r1 || !r2) return null;

  const o1 = r1.outcomes;
  const o2 = r2.outcomes;

  const delta = (a: number, b: number) => {
    const d = b - a;
    const pct = a !== 0 ? (d / a) * 100 : 0;
    return { baseline: a, intervention: b, delta: d, pctChange: pct };
  };

  return {
    deaths: delta(o1.deaths, o2.deaths),
    LOS: delta(o1.avgLOS, o2.avgLOS),
    occupancy: delta(o1.peakOccupancy, o2.peakOccupancy),
    charges: delta(o1.totalCharges, o2.totalCharges),
  };
}

// ── Standard Scenario Runner ────────────────────────────────────────────────

export interface ScenarioResult {
  scenarioId: string;
  seed: number;
  ticks: number;
  outcomes: OutcomeMetrics;
  intervention: Intervention;
}

export function runStandardScenario(scenario: StandardScenario): ScenarioResult {
  const world = createWorld(scenario.patients, undefined, scenario.seed);
  applyIntervention(world, scenario.intervention);

  for (let i = 0; i < scenario.ticks; i++) {
    runWorld(world, 1);
  }

  return {
    scenarioId: scenario.id,
    seed: scenario.seed,
    ticks: scenario.ticks,
    outcomes: {
      patients: world.state.patients.size,
      encounters: world.state.encounters.size,
      deaths: world.state.morgue.length,
      avgLOS: 0, // simplified
      peakOccupancy: Array.from(world.state.beds.values()).filter(b => b.patientId).length,
      totalCharges: world.state.charges.size,
      activeEncounters: Array.from(world.state.encounters.values()).filter(e => e.status === "active").length,
    },
    intervention: scenario.intervention,
  };
}

// ── API Helpers (for rest.ts wiring) ────────────────────────────────────────

export function getBranchesForUniverse(universeId: string): Branch[] {
  return Array.from(branches.values()).filter(b => b.universeId === universeId);
}

export function getAllBranches(): Branch[] {
  return Array.from(branches.values());
}
