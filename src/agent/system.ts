import type { HospitalState } from "../engine/state-store.js";
import type { Clock } from "../engine/clock.js";
import { EventQueue } from "../engine/event-queue.js";
import type { HospitalAgent, AgentPool, Shift, KeadaanKesehatan } from "./types.js";

export interface AgentState {
  pool: AgentPool;
}

export function initAgentState(): AgentState {
  return { pool: { agents: new Map(), assignments: new Map() } };
}

export function agentHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const agentState = (state as unknown as { _agentState?: AgentState })._agentState;
  if (!agentState) return state;

  const newAgents = new Map(agentState.pool.agents);

  for (const [id, agent] of newAgents) {
    const fatigue = agent.status.consecutiveTicks;

    const shift: Shift = clock.tick % 24 < 8 ? "pagi" : clock.tick % 24 < 16 ? "siang" : "malam";
    const inShift = true;

    let kesehatan: KeadaanKesehatan = agent.status.kesehatan;
    if (fatigue > 20 && kesehatan === "sehat") kesehatan = "lelah";
    if (fatigue > 40 && kesehatan === "lelah") kesehatan = "sakit_ringan";
    if (clock.rng() > 0.995 && (kesehatan === "sehat" || kesehatan === "lelah")) kesehatan = "sakit_ringan";
    if (kesehatan === "sakit_ringan" && clock.rng() > 0.998) kesehatan = "sakit_berat";

    const consecutiveTicks = inShift ? agent.status.consecutiveTicks + 1 : 0;

    let isHaids = agent.status.isHaids;
    let haidCycleDay = agent.status.haidCycleDay;
    let isHamil = agent.status.isHamil;
    let hamilWeeks = agent.status.hamilWeeks;

    if (agent.identity.gender === "female" && !isHamil) {
      haidCycleDay = (haidCycleDay + 1) % 28;
      isHaids = haidCycleDay < 5;
    }
    if (isHamil) {
      hamilWeeks = Math.min(42, hamilWeeks + 1 / (24 * 7));
    }

    newAgents.set(id, {
      ...agent,
      status: {
        ...agent.status,
        kelelahan: fatigue,
        kesehatan,
        shift,
        inShift,
        shiftStartTick: agent.status.shiftStartTick,
        totalShiftTicks: inShift ? agent.status.totalShiftTicks + 1 : agent.status.totalShiftTicks,
        consecutiveTicks,
        sakitTerhitung: kesehatan === "sakit_berat" ? agent.status.sakitTerhitung + 1 : agent.status.sakitTerhitung,
        isHaids,
        haidCycleDay,
        isHamil,
        hamilWeeks,
      },
    });
  }

  const newPool: AgentPool = { agents: newAgents, assignments: agentState.pool.assignments };
  const newAgentState: AgentState = { pool: newPool };

  return Object.assign({}, state, { _agentState: newAgentState }) as HospitalState;
}

export function getAvailableAgents(state: HospitalState, department: string): HospitalAgent[] {
  const agentState = (state as unknown as { _agentState?: AgentState })._agentState;
  if (!agentState) return [];
  return Array.from(agentState.pool.agents.values())
    .filter(a => a.department === department && a.status.inShift && a.status.kesehatan !== "sakit_berat");
}

// Epic VI M6.1: Sick leave replacement — auto-assign backups when agents are sick
export interface SickLeaveRecord {
  agentId: string;
  department: string;
  role: string;
  startedTick: number;
  recoveredTick: number | null;
  replacementAgentId: string | null;
}

export interface SickLeaveState {
  records: Map<string, SickLeaveRecord>;
  counter: number;
}

export function initSickLeaveState(): SickLeaveState {
  return { records: new Map(), counter: 0 };
}

export function sickLeaveHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const agentState = (state as unknown as { _agentState?: AgentState })._agentState;
  const sickState = (state as unknown as { _sickLeaveState?: SickLeaveState })._sickLeaveState;
  if (!agentState || !sickState) return state;

  const newAgents = new Map(agentState.pool.agents);
  const newRecords = new Map(sickState.records);

  for (const [id, agent] of newAgents) {
    const st = agent.status;
    // Check recovery: sakit_berat recovers after 120 ticks, sakit_ringan after 48 ticks
    if (st.kesehatan === "sakit_berat") {
      if (st.sakitTerhitung >= 120) {
        newAgents.set(id, { ...agent, status: { ...st, kesehatan: "lelah", sakitTerhitung: 0 } });
      }
    } else if (st.kesehatan === "sakit_ringan") {
      if (st.sakitTerhitung >= 48) {
        newAgents.set(id, { ...agent, status: { ...st, kesehatan: "sehat", sakitTerhitung: 0 } });
      }
    }
  }

  // Find agents who became sick this tick and record sick leave with replacement
  for (const [id, agent] of newAgents) {
    const origAgent = agentState.pool.agents.get(id);
    if (!origAgent) continue;
    if (origAgent.status.kesehatan !== "sakit_berat" && agent.status.kesehatan === "sakit_berat") {
      // Agent just became sick — find replacement from same dept+role pool
      const replacements = Array.from(newAgents.values())
        .filter(a => a.department === agent.department && a.role === agent.role
          && a.id !== id && a.status.kesehatan === "sehat" && a.status.inShift);
      const replacementId = replacements.length > 0 ? replacements[0]!.id : null;
      const record: SickLeaveRecord = {
        agentId: id, department: agent.department, role: agent.role,
        startedTick: clock.tick, recoveredTick: null, replacementAgentId: replacementId,
      };
      newRecords.set(`SL-${String(sickState.counter++).padStart(4, "0")}`, record);
    }
    // Recovery: mark recovered tick
    if (agent.status.kesehatan === "sehat" || agent.status.kesehatan === "lelah") {
      for (const [rid, rec] of newRecords) {
        if (rec.agentId === id && rec.recoveredTick === null) {
          newRecords.set(rid, { ...rec, recoveredTick: clock.tick });
        }
      }
    }
  }

  const newPool = { agents: newAgents, assignments: agentState.pool.assignments };
  const newState = Object.assign({}, state, {
    _agentState: { pool: newPool },
    _sickLeaveState: { records: newRecords, counter: sickState.counter },
  }) as HospitalState;
  return newState;
}
