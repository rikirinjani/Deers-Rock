import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export interface InfectionCase {
  id: string; encounterId: string; patientId: string;
  infectionType: string; organism: string;
  ward: string; detectedAt: number;
  isOutbreak: boolean; contained: boolean;
  ipcNurseId: string | null;
}

export interface IpcState {
  cases: InfectionCase[];
  handHygieneCompliance: number;
  isolationBedsInUse: number;
}

const INFECTION_TYPES = [
  "CAUTI", "CLABSI", "VAP", "SSI", "HAI_pneumonia", "HAI_UTI", "MDRO_colonization",
];

const OUTBREAK_ORGANISMS = ["MRSA", "VRE", "CRE", "ESBL", "C. difficile", "Carbapenemase producer"];

let caseCounter = 0;

export function initIpcState(rng?: () => number): IpcState {
  const rand = rng ?? Math.random;
  return { cases: [], handHygieneCompliance: 70 + Math.floor(rand() * 20), isolationBedsInUse: 0 };
}

export function ipcHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const ipc = state._ipc ?? initIpcState();
  const newCases = [...ipc.cases];

  let ipcNurseId: string | null = null;
  const agentPool = state._agentState?.pool;
  if (agentPool) {
    const staff = Array.from(agentPool.agents.values())
      .filter(a => (a.role === "perawat" || a.role === "dokter_umum") && a.status.inShift);
    if (staff.length > 0) ipcNurseId = staff[Math.floor(clock.rng() * staff.length)]!.id;
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;
    const infectionRisk = patient.diagnoses.some(d => ["J15", "J12", "A09", "N39", "K35", "A91", "J44", "E10"].includes(d.code));
    if (infectionRisk && clock.rng() > 0.98) {
      caseCounter++;
      newCases.push({
        id: `IPC-${caseCounter}`, encounterId: enc.id, patientId: enc.patientId,
        infectionType: INFECTION_TYPES[Math.floor(clock.rng() * INFECTION_TYPES.length)]!,
        organism: OUTBREAK_ORGANISMS[Math.floor(clock.rng() * OUTBREAK_ORGANISMS.length)]!,
        ward: "General Ward",
        detectedAt: clock.hospitalTimeMs,
        isOutbreak: clock.rng() > 0.95,
        contained: clock.rng() > 0.3,
        ipcNurseId,
      });
    }
  }

  const hh = Math.min(100, Math.max(50, ipc.handHygieneCompliance + (clock.rng() > 0.5 ? 0.5 : -0.5)));
  const recentActive = newCases.filter(c => !c.contained).slice(-5);
  const isolationBeds = recentActive.length;

  return { ...state, _ipc: { cases: newCases, handHygieneCompliance: hh, isolationBedsInUse: isolationBeds } };
}
