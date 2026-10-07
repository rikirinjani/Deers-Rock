/**
 * Agent-Encounter Assignment System — Epic VI M6.1 (ADR-017)
 *
 * Links agents to encounters based on specialty → ward mapping.
 * When a patient is admitted, an appropriate doctor and nurse are assigned.
 */
import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { EventQueue } from "./event-queue.js";
import type { HospitalAgent } from "../agent/types.js";

export interface AgentAssignment {
  id: string;
  agentId: string;
  encounterId: string;
  role: "attending" | "nursing" | "pharmacy" | "lab" | "radiology" | "surgery" | "other";
  assignedTick: number;
}

// Specialty → department mapping (matches SPECIALTY_TO_WARD in markov.ts)
const SPECIALTY_TO_DEPT: Record<string, string> = {
  cardiology: "PENYAKIT_DALAM",
  neurology: "PENYAKIT_DALAM",
  pulmonology: "PARU",
  pediatrics: "ANAK",
  obgyn: "OBGYN",
  psychiatry: "JIWA",
  anesthesiology: "ANESTESI",
  surgery: "PENYAKIT_DALAM",
  hematology: "PENYAKIT_DALAM",
  oncology: "PENYAKIT_DALAM",
  dermatology: "PENYAKIT_DALAM",
  dentistry: "GIGI_MULUT",
  ophthalmology: "PENYAKIT_DALAM",
  ent: "PENYAKIT_DALAM",
  rehabilitation: "REHAB_MEDIK",
  nutrition: "GIZI_KLINIK",
  radiology: "RAD",
  laboratory: "LAB",
  social_work: "PEKERJA_SOSIAL",
  nursing: "KEPERAWATAN",
};

/**
 * Find an available agent for a given department and role.
 * Returns null if no agent is available.
 */
function findAvailableAgent(
  state: HospitalState,
  department: string,
  roleFilter?: string
): HospitalAgent | null {
  const pool = (state as unknown as { _agentState?: { pool: { agents: Map<string, HospitalAgent> } } })._agentState?.pool;
  if (!pool) return null;

  const candidates = Array.from(pool.agents.values()).filter(a => {
    if (a.department !== department) return false;
    if (a.status.kesehatan === "sakit_berat" || a.status.kesehatan === "sakit_ringan") return false;
    if (roleFilter && a.role !== roleFilter) return false;
    return a.status.inShift;
  });

  // Prefer agents with fewer current assignments (load balancing)
  candidates.sort((a, b) => {
    const countA = countAssignments(state, a.id);
    const countB = countAssignments(state, b.id);
    return countA - countB;
  });

  return candidates[0] ?? null;
}

function countAssignments(state: HospitalState, agentId: string): number {
  const assignments = (state as unknown as { _agentAssignments?: Map<string, AgentAssignment> })._agentAssignments;
  if (!assignments) return 0;
  return Array.from(assignments.values()).filter(a => a.agentId === agentId).length;
}

/**
 * Assign a doctor to an encounter based on the encounter's specialty/ward.
 */
export function assignDoctorToEncounter(state: HospitalState, encounterId: string, ward: string, clockTick: number): string | null {
  const dept = SPECIALTY_TO_DEPT[ward.toLowerCase().replace(/[^a-z]/g, "")] ?? "PENYAKIT_DALAM";
  const agent = findAvailableAgent(state, dept, "dokter_spesialis");
  if (!agent) {
    // Fallback to general practitioner
    const gp = findAvailableAgent(state, "DOKTER", "dokter_umum");
    if (!gp) return null;
    return createAssignment(state, gp.id, encounterId, "attending", clockTick);
  }
  return createAssignment(state, agent.id, encounterId, "attending", clockTick);
}

/**
 * Assign a nurse to an encounter.
 */
export function assignNurseToEncounter(state: HospitalState, encounterId: string, ward: string, clockTick: number): string | null {
  // Match nurse department to ward
  const deptMap: Record<string, string> = {
    "internal-medicine": "PENYAKIT_DALAM",
    "cardiology": "PENYAKIT_DALAM",
    "neurology": "PENYAKIT_DALAM",
    "pulmonology": "PARU",
    "pediatrics": "ANAK",
    "obgyn": "OBGYN",
    "icu": "KEPERAWATAN",
    "hcu": "KEPERAWATAN",
    "nicu": "ANAK",
    "picu": "ANAK",
    "emergency": "IGD",
  };
  const dept = deptMap[ward.toLowerCase()] ?? "KEPERAWATAN";
  const agent = findAvailableAgent(state, dept, "perawat");
  if (!agent) return null;
  return createAssignment(state, agent.id, encounterId, "nursing", clockTick);
}

/**
 * Create an assignment record and add it to state.
 */
function createAssignment(state: HospitalState, agentId: string, encounterId: string, role: AgentAssignment["role"], tick: number): string | null {
  const assignments = (state as unknown as { _agentAssignments?: Map<string, AgentAssignment> })._agentAssignments;
  if (!assignments) return null;

  // Check if already assigned
  for (const a of assignments.values()) {
    if (a.encounterId === encounterId && a.role === role) return a.id;
  }

  const id = `ASM-${String(assignments.size + 1).padStart(4, "0")}`;
  assignments.set(id, { id, agentId, encounterId, role, assignedTick: tick });
  return id;
}

/**
 * Get all assignments for an encounter.
 */
export function getEncounterAssignments(state: HospitalState, encounterId: string): AgentAssignment[] {
  const assignments = (state as unknown as { _agentAssignments?: Map<string, AgentAssignment> })._agentAssignments;
  if (!assignments) return [];
  return Array.from(assignments.values()).filter(a => a.encounterId === encounterId);
}

/**
 * Get all assignments for an agent.
 */
export function getAgentAssignments(state: HospitalState, agentId: string): AgentAssignment[] {
  const assignments = (state as unknown as { _agentAssignments?: Map<string, AgentAssignment> })._agentAssignments;
  if (!assignments) return [];
  return Array.from(assignments.values()).filter(a => a.agentId === agentId);
}

/**
 * Tick handler: run assignment cleanup (remove completed encounter assignments).
 */
export function assignmentCleanupHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const assignments = (state as unknown as { _agentAssignments?: Map<string, AgentAssignment> })._agentAssignments;
  if (!assignments) return state;

  const encounterIds = new Set(Array.from((state as unknown as { encounters: Map<string, { id: string; status: string }> }).encounters.values())
    .filter(e => e.status === "active")
    .map(e => e.id));

  // Remove assignments for discharged encounters
  for (const [id, assignment] of assignments) {
    if (!encounterIds.has(assignment.encounterId)) {
      assignments.delete(id);
    }
  }

  return state;
}
