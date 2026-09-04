import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export type ScenarioType = "earthquake" | "forest_fire" | "sunken_ship" | "pandemic" | "industrial_accident" | "mass_casualty" | "tsunami";

/** Phase E: map adapter macro-disaster strings to DR scenario types. */
export function mapMacroDisasterToScenario(disasterType: string): ScenarioType | undefined {
  switch (disasterType) {
    case "natural-disaster": return "earthquake";  // physical infrastructure damage → closest match
    case "mass-casualty": return "mass_casualty";   // trauma surge → direct match
    default: return undefined;                       // unknown types: no activation (safe behavior)
  }
}

export interface ScenarioDefinition {
  type: ScenarioType;
  name: string;
  description: string;
  minTick: number;
  baseProbability: number;
  minDuration: number;
  maxDuration: number;
  icdWeights: Record<string, number>;
  surgeMin: number;
  surgeMax: number;
  mortalityBoost: number;
  affectedSupplies: string[];
  staffShortage: number;
  infrastructureDamage: number;
  powerOutage: boolean;
}

export interface ActiveScenario {
  id: string;
  type: ScenarioType;
  name: string;
  severity: number;
  startTick: number;
  durationTicks: number;
  phase: "ramping" | "sustained" | "recovering" | "resolved";
  currentSurge: number;
  currentMortalityBoost: number;
}

export interface ScenarioState {
  active: ActiveScenario | null;
  history: ActiveScenario[];
  cooldownTicks: number;
}

const SCENARIO_DEFS: ScenarioDefinition[] = [
  {
    type: "earthquake", name: "Gempa Bumi", description: "Large earthquake strikes Makassar — mass casualties with crush injuries and fractures",
    minTick: 200, baseProbability: 0.0008, minDuration: 60, maxDuration: 180,
    icdWeights: { S72: 25, S06: 20, T14: 20, S27: 10, S36: 10 },
    surgeMin: 3, surgeMax: 6, mortalityBoost: 0.15,
    affectedSupplies: ["SPLINT", "BANDAGE", "NS", "RL", "MORPHINE"],
    staffShortage: 0.2, infrastructureDamage: 0.3, powerOutage: true,
  },
  {
    type: "forest_fire", name: "Kebakaran Hutan", description: "Forest fires near Makassar — smoke inhalation and burn victims",
    minTick: 400, baseProbability: 0.0005, minDuration: 120, maxDuration: 300,
    icdWeights: { J68: 25, T20: 20, J45: 10, J44: 10, J18: 8 },
    surgeMin: 2, surgeMax: 4, mortalityBoost: 0.08,
    affectedSupplies: ["BANDAGE", "NS", "OXYGEN", "SALBUTAMOL", "MORPHINE"],
    staffShortage: 0.1, infrastructureDamage: 0.1, powerOutage: false,
  },
  {
    type: "sunken_ship", name: "Karamnya Kapal", description: "Passenger ferry sinks off Makassar strait — drowning, hypothermia, trauma",
    minTick: 600, baseProbability: 0.0004, minDuration: 80, maxDuration: 200,
    icdWeights: { T75: 25, T79: 15, T14: 15, S06: 8, S72: 8, J15: 8 },
    surgeMin: 3, surgeMax: 5, mortalityBoost: 0.12,
    affectedSupplies: ["NS", "RL", "BANDAGE", "OXYGEN", "WARMER"],
    staffShortage: 0.15, infrastructureDamage: 0.05, powerOutage: false,
  },
  {
    type: "pandemic", name: "Wabah Penyakit", description: "Novel respiratory virus outbreak — sustained patient surge over days",
    minTick: 1000, baseProbability: 0.0003, minDuration: 300, maxDuration: 600,
    icdWeights: { J12: 30, J15: 25, J18: 20, J44: 10, J45: 5, B20: 5 },
    surgeMin: 2, surgeMax: 4, mortalityBoost: 0.1,
    affectedSupplies: ["OXYGEN", "CEFTRIAXONE", "LEVOFLOXACIN", "NS", "PARACETAMOL"],
    staffShortage: 0.3, infrastructureDamage: 0.0, powerOutage: false,
  },
  {
    type: "industrial_accident", name: "Kecelakaan Industri", description: "Factory explosion in Makassar industrial zone — burns, trauma, chemical exposure",
    minTick: 300, baseProbability: 0.0006, minDuration: 60, maxDuration: 150,
    icdWeights: { T20: 20, T14: 15, S06: 12, S72: 10, J68: 10, T50: 8 },
    surgeMin: 2, surgeMax: 4, mortalityBoost: 0.1,
    affectedSupplies: ["BANDAGE", "NS", "MORPHINE", "OXYGEN", "RL"],
    staffShortage: 0.15, infrastructureDamage: 0.2, powerOutage: true,
  },
  {
    type: "tsunami", name: "Tsunami", description: "Coastal wave hits Makassar waterfront — massive trauma, drowning, displacement",
    minTick: 800, baseProbability: 0.0002, minDuration: 100, maxDuration: 250,
    icdWeights: { T75: 25, T14: 20, S06: 15, S72: 12, T79: 10, J15: 8 },
    surgeMin: 4, surgeMax: 7, mortalityBoost: 0.2,
    affectedSupplies: ["NS", "RL", "BANDAGE", "SPLINT", "MORPHINE", "OXYGEN"],
    staffShortage: 0.25, infrastructureDamage: 0.4, powerOutage: true,
  },
  {
    type: "mass_casualty", name: "Kecelakaan Massal", description: "Multi-vehicle highway collision — concentrated trauma surge",
    minTick: 150, baseProbability: 0.001, minDuration: 40, maxDuration: 120,
    icdWeights: { T14: 25, S06: 20, S72: 15, S27: 10, S36: 10, I21: 5 },
    surgeMin: 3, surgeMax: 5, mortalityBoost: 0.1,
    affectedSupplies: ["BANDAGE", "NS", "MORPHINE", "SPLINT", "RL"],
    staffShortage: 0.1, infrastructureDamage: 0.0, powerOutage: false,
  },
];

let scenarioCounter = 0;
export function resetScenarioCounter(): void { scenarioCounter = 0; }

export function initScenarioState(): ScenarioState {
  return { active: null, history: [], cooldownTicks: 0 };
}

function getPhase(scenario: ActiveScenario, currentTick: number): ActiveScenario["phase"] {
  const elapsed = currentTick - scenario.startTick;
  const pct = elapsed / scenario.durationTicks;
  if (pct <= 0) return "ramping";
  if (pct < 0.3) return "ramping";
  if (pct < 0.75) return "sustained";
  if (pct < 1) return "recovering";
  return "resolved";
}

function surgeForPhase(def: ScenarioDefinition, phase: ActiveScenario["phase"], severity: number): number {
  const base = def.surgeMin + (def.surgeMax - def.surgeMin) * severity;
  if (phase === "ramping") return base * 0.5;
  if (phase === "sustained") return base;
  if (phase === "recovering") return base * 0.3;
  return 0;
}

function mortalityForPhase(def: ScenarioDefinition, phase: ActiveScenario["phase"]): number {
  if (phase === "resolved") return 0;
  return def.mortalityBoost;
}

export function scenarioHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const sc = state._scenario ?? initScenarioState();
  let active = sc.active ? { ...sc.active } : null;
  const history = [...sc.history];
  let cooldown = sc.cooldownTicks;
  const macroDisaster = state._activeMacroDisaster;

  if (active) {
    const phase = getPhase(active, clock.tick);

    if (phase === "resolved") {
      history.push({ ...active, phase });
      active = null;
      cooldown = 0;
    } else {
      const def = SCENARIO_DEFS.find(d => d.type === active!.type)!;
      active = { ...active, phase, currentSurge: surgeForPhase(def, phase, active.severity), currentMortalityBoost: mortalityForPhase(def, phase) };
    }
  }

  if (!active) {
    // Phase E: macro-disaster override — activate mapped DR scenario deterministically
    if (macroDisaster) {
      const mappedType = mapMacroDisasterToScenario(macroDisaster);
      if (mappedType) {
        const def = SCENARIO_DEFS.find(d => d.type === mappedType);
        if (def) {
          scenarioCounter++;
          // Fixed severity for macro-disaster: deterministic, moderate (0.6)
          const severity = 0.6;
          const duration = def.minDuration + Math.floor((def.maxDuration - def.minDuration) * 0.5);
          active = {
            id: `SC-${scenarioCounter}`, type: def.type, name: def.name,
            severity, startTick: clock.tick, durationTicks: duration,
            phase: "ramping", currentSurge: 0, currentMortalityBoost: 0,
          };
          const p = getPhase(active, clock.tick);
          active.phase = p;
          active.currentSurge = surgeForPhase(def, p, severity);
          active.currentMortalityBoost = mortalityForPhase(def, p);
          cooldown = 0;
        }
      }
      // Unknown macro disaster types: no activation, no spawning (safe behavior)
    } else {
      // No macro disaster — normal DR scenario spawning
      cooldown++;

      for (const def of SCENARIO_DEFS) {
        if (clock.tick < def.minTick) continue;
        const prob = def.baseProbability * (1 + cooldown / 500);
        if (clock.rng() < prob) {
          scenarioCounter++;
          const severity = 0.3 + clock.rng() * 0.7;
          const duration = def.minDuration + Math.floor(clock.rng() * (def.maxDuration - def.minDuration));
          active = {
            id: `SC-${scenarioCounter}`, type: def.type, name: def.name,
            severity, startTick: clock.tick, durationTicks: duration,
            phase: "ramping", currentSurge: 0, currentMortalityBoost: 0,
          };
          const p = getPhase(active, clock.tick);
          active.phase = p;
          active.currentSurge = surgeForPhase(def, p, severity);
          active.currentMortalityBoost = mortalityForPhase(def, p);
          cooldown = 0;
          break;
        }
      }
    }
  }

  return { ...state, _scenario: { active, history, cooldownTicks: cooldown } };
}

export function getScenarioEffects(sc: ScenarioState): { surgeMultiplier: number; icdWeights: Record<string, number>; mortalityBoost: number; affectedSupplies: string[]; staffShortage: number; infrastructureDamage: number; powerOutage: boolean } {
  const empty = { surgeMultiplier: 1, icdWeights: {}, mortalityBoost: 0, affectedSupplies: [], staffShortage: 0, infrastructureDamage: 0, powerOutage: false };
  if (!sc.active) return empty;

  const def = SCENARIO_DEFS.find(d => d.type === sc.active!.type);
  if (!def) return empty;

  return {
    surgeMultiplier: def.surgeMin + (def.surgeMax - def.surgeMin) * sc.active.severity,
    icdWeights: { ...def.icdWeights },
    mortalityBoost: sc.active.currentMortalityBoost,
    affectedSupplies: [...def.affectedSupplies],
    staffShortage: sc.active.phase !== "resolved" ? def.staffShortage : 0,
    infrastructureDamage: sc.active.phase !== "resolved" ? def.infrastructureDamage : 0,
    powerOutage: sc.active.phase !== "resolved" && def.powerOutage,
  };
}

export { SCENARIO_DEFS };
