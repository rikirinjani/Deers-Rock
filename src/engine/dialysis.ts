import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export interface DialysisMachine {
  id: string; name: string; type: "hd" | "hdf" | "pd";
  status: "available" | "in_use" | "under_maintenance";
  lastUsedTick: number;
}

export interface DialysisSession {
  id: string; encounterId: string; patientId: string;
  machineId: string; type: "hd" | "hdf" | "pd";
  durationMinutes: number; ultrafiltrationMl: number;
  status: "scheduled" | "in_progress" | "completed";
  scheduledAt: number; startedAt: number | null; completedAt: number | null;
  complication: string | null;
  nephrologistId: string | null; nurseId: string | null;
}

export interface DialysisState {
  machines: DialysisMachine[];
  sessions: DialysisSession[];
}

let sessionCounter = 0;

const DIALYSIS_DX = ["N18", "N17", "N19", "E10", "E11", "I12", "M10"];

export function initDialysisState(): DialysisState {
  return {
    machines: [
      { id: "HD-01", name: "Fresenius 5008S", type: "hd", status: "available", lastUsedTick: 0 },
      { id: "HD-02", name: "Fresenius 5008S", type: "hd", status: "available", lastUsedTick: 0 },
      { id: "HD-03", name: "B. Braun Dialog+", type: "hd", status: "available", lastUsedTick: 0 },
      { id: "HD-04", name: "B. Braun Dialog+", type: "hd", status: "available", lastUsedTick: 0 },
      { id: "HDF-01", name: "Gambro AK 200", type: "hdf", status: "available", lastUsedTick: 0 },
      { id: "PD-01", name: "Baxter HomeChoice", type: "pd", status: "available", lastUsedTick: 0 },
    ],
    sessions: [],
  };
}

export function dialysisHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const d = state._dialysis ?? initDialysisState();
  const newMachines = [...d.machines];
  const newSessions = [...d.sessions];

  let nephrologistId: string | null = null;
  let nurseId: string | null = null;
  const agentPool = state._agentState?.pool;
  if (agentPool) {
    const nephros = Array.from(agentPool.agents.values()).filter(a => a.role === "dokter_spesialis" && a.status.inShift && a.spesialisasi === "Penyakit Dalam");
    if (nephros.length > 0) nephrologistId = nephros[Math.floor(clock.rng() * nephros.length)]!.id;
    const nurses = Array.from(agentPool.agents.values()).filter(a => a.role === "perawat" && a.status.inShift);
    if (nurses.length > 0) nurseId = nurses[Math.floor(clock.rng() * nurses.length)]!.id;
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;
    const needsDialysis = patient.diagnoses.some(dx => DIALYSIS_DX.includes(dx.code));
    if (!needsDialysis) continue;
    const hasActiveSession = newSessions.some(s => s.patientId === enc.patientId && s.status !== "completed");
    if (hasActiveSession) continue;
    if (clock.rng() > 0.6) continue;

    const availMachine = newMachines.find(m => m.status === "available");
    if (!availMachine) continue;

    sessionCounter++;
    const mi = newMachines.indexOf(availMachine);
    newMachines[mi] = { ...availMachine, status: "in_use", lastUsedTick: clock.tick };

    newSessions.push({
      id: `HD-${sessionCounter}`, encounterId: enc.id, patientId: enc.patientId,
      machineId: availMachine.id,
      type: availMachine.type,
      durationMinutes: availMachine.type === "pd" ? 480 : 240,
      ultrafiltrationMl: 1000 + Math.floor(clock.rng() * 2000),
      status: "scheduled",
      scheduledAt: clock.hospitalTimeMs, startedAt: null, completedAt: null,
      complication: null, nephrologistId, nurseId,
    });
  }

  for (const [si, s] of newSessions.entries()) {
    if (s.status === "scheduled" && clock.tick % 2 === 0) {
      newSessions[si] = { ...s, status: "in_progress", startedAt: clock.hospitalTimeMs };
    }
    if (s.status === "in_progress" && clock.tick % 5 === 0) {
      const complication = clock.rng() > 0.9 ? (["Hypotension", "Muscle cramps", "Nausea", "Access site bleeding", "Chest pain"].sort(() => clock.rng() - 0.5)[0] ?? null) : null;
      const mi = newMachines.findIndex(m => m.id === s.machineId);
      if (mi !== -1) newMachines[mi] = { ...newMachines[mi]!, status: "available" };
      newSessions[si] = { ...s, status: "completed", completedAt: clock.hospitalTimeMs, complication };
    }
  }

  for (const [mi, m] of newMachines.entries()) {
    if (m.status === "available" && clock.tick - m.lastUsedTick > 96 && clock.rng() > 0.9) {
      newMachines[mi] = { ...m, status: "under_maintenance" };
    }
    if (m.status === "under_maintenance" && clock.tick % 8 === 0) {
      newMachines[mi] = { ...m, status: "available" };
    }
  }

  return { ...state, _dialysis: { machines: newMachines, sessions: newSessions } };
}
