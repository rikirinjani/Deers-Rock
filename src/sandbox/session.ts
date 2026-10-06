/**
 * Sandbox session lifecycle — productization layer (Phase G).
 *
 * ADDITIVE: this module imports only the DR public API. It does NOT modify the
 * scientific core, its state-transition logic, the research journal, or snapshots.
 *
 * D-1: single active session (enforced by the registry below).
 * D-2: ephemeral — sessions are created WITHOUT a journal path (never touch the research journal).
 * D-3: an explicit integer seed is required; no Date.now() fallback; no wall-clock auto-advance.
 */
import { createWorld, step, type World } from "../engine/world.js";
import { formatHospitalTime } from "../engine/clock.js";

export interface SandboxSessionConfig {
  seed: number;
  patients?: number;
}

export interface SandboxSession {
  id: string;
  seed: number;
  patients: number;
  world: World;
  ticks: number;
}

export interface SandboxStatus {
  sessionId: string;
  seed: number;
  patients: number;
  tick: number;
  hospitalTime: string;
  patientsTotal: number;
  activeEncounters: number;
  bedsAvailable: number;
}

let counter = 0;

/** Create an ephemeral, deterministically-seeded DR world. */
export function createSession(config: SandboxSessionConfig): SandboxSession {
  if (!Number.isInteger(config.seed)) {
    throw new Error("seed is required and must be an integer (no wall-clock fallback)");
  }
  const patients = config.patients ?? 50;
  if (!Number.isInteger(patients) || patients <= 0) {
    throw new Error("patients must be a positive integer");
  }
  counter++;
  // Ephemeral: journalPath is undefined => no journal file is created.
  // Explicit seed => deterministic patient pool, agents, and clock.
  const world = createWorld(patients, undefined, config.seed);
  return { id: `sbx-${counter}`, seed: config.seed, patients, world, ticks: 0 };
}

/** Advance the session deterministically by `ticks` DR ticks. */
export function stepSession(session: SandboxSession, ticks: number): void {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new Error("ticks must be a non-negative integer");
  }
  let w = session.world;
  for (let i = 0; i < ticks; i++) w = step(w);
  session.world = w;
  session.ticks += ticks;
}

/**
 * Reset = recreate the world from the SAME seed/config.
 * This is NOT a restore of an arbitrary historical snapshot; it returns the
 * session to its reproducible initial state (tick 0).
 */
export function resetSession(session: SandboxSession): void {
  session.world = createWorld(session.patients, undefined, session.seed);
  session.ticks = 0;
}

export function sessionStatus(session: SandboxSession): SandboxStatus {
  const st = session.world.state;
  return {
    sessionId: session.id,
    seed: session.seed,
    patients: session.patients,
    tick: session.world.clock.tick,
    hospitalTime: formatHospitalTime(session.world.clock),
    patientsTotal: st.patients.size,
    activeEncounters: Array.from(st.encounters.values()).filter((e) => e.status === "active").length,
    bedsAvailable: Array.from(st.beds.values()).filter((b) => !b.patientId).length,
  };
}

// --- single-active-session registry (D-1) -----------------------------------
let active: SandboxSession | null = null;

export function getActiveSession(): SandboxSession | null {
  return active;
}

export function setActiveSession(session: SandboxSession | null): void {
  active = session;
}
