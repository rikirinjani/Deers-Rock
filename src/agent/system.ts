import type { HospitalState } from "../engine/state-store.js";
import type { Clock } from "../engine/clock.js";
import { EventQueue } from "../engine/event-queue.js";
import type { HospitalAgent, AgentPool, KeadaanKesehatan } from "./types.js";
import { rosterStatus } from "./roster.js";

export interface AgentState {
  pool: AgentPool;
}

export function initAgentState(): AgentState {
  return { pool: { agents: new Map(), assignments: new Map() } };
}

// Epic VI M6.1: workforce health model, calibrated on Indonesian data 2026-10-27
// (ADR-029 Amendment 1). Target: 6 sick days per worker per year. Indonesian
// hospital WISN staffing studies record unplanned absence (sakit/izin) of
// 3 days (RSU Aulia policy; RSU Mitra Guray), 4 days (RS Paru Surabaya) and
// 12 days (RSUD Wamena ER, measured from the 2020 attendance register); 6 is
// the geometric middle of 3–12, the sensitivity band. Episodes: mild 2 days
// (izin sakit, off duty), 10% progressing to a 5-day severe episode, so
// ~2.4 days per episode and 2.5 episodes per person-year.
const TICKS_PER_YEAR = 365 * 1440;
export const SICK_DAYS_PER_YEAR_TARGET = 6;
export const MILD_EPISODES_PER_YEAR = 2.5;
export const MILD_ONSET_PER_TICK = MILD_EPISODES_PER_YEAR / TICKS_PER_YEAR;
export const MILD_RECOVERY_TICKS = 2 * 1440;
export const SEVERE_RECOVERY_TICKS = 5 * 1440;
export const SEVERE_PROGRESSION_PER_TICK = 1 - Math.pow(0.9, 1 / MILD_RECOVERY_TICKS);
/** Off-duty fatigue recovery per tick: a 10-h malam is shed in 5 h of rest. */
const FATIGUE_RECOVERY_PER_TICK = 2;

export function agentHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const agentState = (state as unknown as { _agentState?: AgentState })._agentState;
  if (!agentState) return state;

  const newAgents = new Map(agentState.pool.agents);
  const newDay = clock.tick > 0 && clock.tick % 1440 === 0;

  for (const [id, agent] of newAgents) {
    const st = agent.status;
    // Fixed draw count: exactly 2 draws per agent per tick, whatever the state.
    const onsetDraw = clock.rng();
    const progressionDraw = clock.rng();

    const roster = rosterStatus(agent, clock.tick);
    let kesehatan: KeadaanKesehatan = st.kesehatan;
    let sakitTerhitung = st.sakitTerhitung;

    // Illness course: onset, progression, recovery (sakitTerhitung = ticks in the current sick state).
    if (kesehatan === "sakit_berat") {
      sakitTerhitung++;
      if (sakitTerhitung >= SEVERE_RECOVERY_TICKS) { kesehatan = "sehat"; sakitTerhitung = 0; }
    } else if (kesehatan === "sakit_ringan") {
      sakitTerhitung++;
      if (progressionDraw < SEVERE_PROGRESSION_PER_TICK) { kesehatan = "sakit_berat"; sakitTerhitung = 0; }
      else if (sakitTerhitung >= MILD_RECOVERY_TICKS) { kesehatan = "sehat"; sakitTerhitung = 0; }
    } else if (onsetDraw < MILD_ONSET_PER_TICK) {
      kesehatan = "sakit_ringan"; sakitTerhitung = 0;
    }

    // Sick staff stay home: izin sakit (mild) or sick leave (severe).
    const inShift = roster.onDuty && kesehatan !== "sakit_berat" && kesehatan !== "sakit_ringan";
    const working = inShift && !roster.onCall;
    const consecutiveTicks = working ? st.consecutiveTicks + 1 : Math.max(0, st.consecutiveTicks - FATIGUE_RECOVERY_PER_TICK);
    const fatigue = consecutiveTicks;

    if (kesehatan === "sehat" && fatigue >= FATIGUE_WARN) kesehatan = "lelah";
    else if (kesehatan === "lelah" && fatigue < FATIGUE_WARN) kesehatan = "sehat";
    // Overtime beyond FATIGUE_CRITICAL (a double shift) can tip a tired agent into illness.
    if (kesehatan === "lelah" && fatigue >= FATIGUE_CRITICAL) { kesehatan = "sakit_ringan"; sakitTerhitung = 0; }

    let isHaids = st.isHaids;
    let haidCycleDay = st.haidCycleDay;
    let isHamil = st.isHamil;
    let hamilWeeks = st.hamilWeeks;

    // Cycle and gestation advance per sim-day / sim-minute (1 tick = 1 minute).
    if (agent.identity.gender === "female" && !isHamil && newDay) {
      haidCycleDay = (haidCycleDay + 1) % 28;
      isHaids = haidCycleDay < 5;
    }
    if (isHamil) {
      hamilWeeks = Math.min(42, hamilWeeks + 1 / (7 * 1440));
    }

    newAgents.set(id, {
      ...agent,
      status: {
        ...st,
        kelelahan: fatigue,
        kesehatan,
        shift: roster.shift,
        inShift,
        shiftStartTick: inShift && !st.inShift ? clock.tick : st.shiftStartTick,
        totalShiftTicks: inShift ? st.totalShiftTicks + 1 : st.totalShiftTicks,
        consecutiveTicks,
        sakitTerhitung,
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
  /** Encounter assignments handed over from the sick agent to the replacement. */
  reassignedEncounters?: number;
}

export interface SickLeaveState {
  records: Map<string, SickLeaveRecord>;
  counter: number;
}

export function initSickLeaveState(): SickLeaveState {
  return { records: new Map(), counter: 0 };
}

/** Fatigue = consecutive ticks on duty: "lelah" after 7 h (the end of a pagi or
 *  siang shift, and late in every 10-h malam); illness risk only past 12 h,
 *  i.e. beyond the longest scheduled shift. */
export const FATIGUE_WARN = 420;
export const FATIGUE_CRITICAL = 720;

function isFitForCover(a: HospitalAgent): boolean {
  return a.status.inShift && (a.status.kesehatan === "sehat" || a.status.kesehatan === "lelah");
}

/**
 * Pick a backup for a sick agent: same department + role first, then the same
 * role from any department (float pool). Prefers "sehat" over "lelah", then
 * lower fatigue, then agent ID — no rng, so replacement is deterministic.
 */
function pickReplacement(agents: Map<string, HospitalAgent>, sick: HospitalAgent, onLeave: Set<string>): HospitalAgent | null {
  const rank = (a: HospitalAgent, b: HospitalAgent): number =>
    (a.status.kesehatan === "sehat" ? 0 : 1) - (b.status.kesehatan === "sehat" ? 0 : 1)
    || a.status.kelelahan - b.status.kelelahan
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const pool = Array.from(agents.values()).filter(a => a.id !== sick.id && a.role === sick.role && !onLeave.has(a.id) && isFitForCover(a));
  const sameDept = pool.filter(a => a.department === sick.department).sort(rank);
  if (sameDept.length > 0) return sameDept[0]!;
  return pool.sort(rank)[0] ?? null;
}

export function sickLeaveHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const agentState = (state as unknown as { _agentState?: AgentState })._agentState;
  const sickState = (state as unknown as { _sickLeaveState?: SickLeaveState })._sickLeaveState;
  if (!agentState || !sickState) return state;

  const newAgents = new Map(agentState.pool.agents);
  const newRecords = new Map(sickState.records);
  let counter = sickState.counter;
  let assignments = agentState.pool.assignments;

  // Recovery is owned by agentHandler (SEVERE_RECOVERY_TICKS); this handler
  // only opens and closes leave records and arranges cover.

  // Close leave for agents no longer sakit_berat.
  const onLeave = new Set<string>();
  for (const [rid, rec] of newRecords) {
    if (rec.recoveredTick !== null) continue;
    const agent = newAgents.get(rec.agentId);
    if (!agent || agent.status.kesehatan !== "sakit_berat") {
      newRecords.set(rid, { ...rec, recoveredTick: clock.tick });
    } else {
      onLeave.add(rec.agentId);
    }
  }

  // Open leave for every sakit_berat agent without an open record. Detection is
  // state-based, not transition-based: health changes in agentHandler (every
  // tick) while this handler runs every 10 ticks, so a before/after diff
  // inside this handler never sees the transition.
  const sickIds = Array.from(newAgents.values())
    .filter(a => a.status.kesehatan === "sakit_berat" && !onLeave.has(a.id))
    .map(a => a.id)
    .sort();
  for (const id of sickIds) onLeave.add(id);
  for (const id of sickIds) {
    const agent = newAgents.get(id)!;
    const replacement = pickReplacement(newAgents, agent, onLeave);
    let reassigned = 0;
    if (replacement) {
      // Hand the sick agent's encounter assignments over to the backup.
      for (const [key, agentId] of assignments) {
        if (agentId !== id) continue;
        if (assignments === agentState.pool.assignments) assignments = new Map(assignments);
        assignments.set(key, replacement.id);
        reassigned++;
      }
    }
    newRecords.set(`SL-${String(counter++).padStart(4, "0")}`, {
      agentId: id, department: agent.department, role: agent.role,
      startedTick: clock.tick, recoveredTick: null,
      replacementAgentId: replacement?.id ?? null, reassignedEncounters: reassigned,
    });
  }

  const newPool = { agents: newAgents, assignments };
  const newState = Object.assign({}, state, {
    _agentState: { pool: newPool },
    _sickLeaveState: { records: newRecords, counter },
  }) as HospitalState;
  return newState;
}

export interface AgentHealthAlert {
  agentId: string;
  nama: string;
  role: string;
  department: string;
  kesehatan: KeadaanKesehatan;
  kelelahan: number;
  level: "critical" | "warning";
  reason: string;
}

export interface AgentHealthSummary {
  total: number;
  available: number;
  byHealth: Record<KeadaanKesehatan, number>;
  fatigue: { mean: number; max: number; overWarn: number; overCritical: number };
  sickLeave: { open: number; uncovered: number; total: number };
  alertCount: { critical: number; warning: number };
  alerts: AgentHealthAlert[];
}

/**
 * Epic VI M6.1: agent health + fatigue alerts for /api/agents/health and the
 * dashboard. Critical = sakit_berat; warning = fatigue at or above
 * FATIGUE_CRITICAL (the level where agentHandler degrades lelah → sakit_ringan).
 */
export function summarizeAgentHealth(state: HospitalState, maxAlerts: number = 20): AgentHealthSummary {
  const agents = Array.from((state as unknown as { _agentState?: AgentState })._agentState?.pool.agents.values() ?? []);
  const records = Array.from((state as unknown as { _sickLeaveState?: SickLeaveState })._sickLeaveState?.records.values() ?? []);
  const byHealth: Record<KeadaanKesehatan, number> = { sehat: 0, lelah: 0, sakit_ringan: 0, sakit_berat: 0 };
  let fatigueSum = 0, fatigueMax = 0, overWarn = 0, overCritical = 0;
  const alerts: AgentHealthAlert[] = [];
  for (const a of agents) {
    byHealth[a.status.kesehatan]++;
    const f = a.status.kelelahan;
    fatigueSum += f;
    if (f > fatigueMax) fatigueMax = f;
    if (f >= FATIGUE_WARN) overWarn++;
    if (f >= FATIGUE_CRITICAL) overCritical++;
    const base = { agentId: a.id, nama: a.nama, role: a.role, department: a.department, kesehatan: a.status.kesehatan, kelelahan: f };
    if (a.status.kesehatan === "sakit_berat") alerts.push({ ...base, level: "critical", reason: "sakit berat — on sick leave" });
    else if (f >= FATIGUE_CRITICAL) alerts.push({ ...base, level: "warning", reason: `fatigue ${f} ≥ ${FATIGUE_CRITICAL}` });
  }
  const open = records.filter(r => r.recoveredTick === null);
  alerts.sort((x, y) => (x.level === y.level ? 0 : x.level === "critical" ? -1 : 1) || y.kelelahan - x.kelelahan || (x.agentId < y.agentId ? -1 : 1));
  return {
    total: agents.length,
    available: agents.filter(a => a.status.inShift && a.status.kesehatan !== "sakit_berat" && a.status.kesehatan !== "sakit_ringan").length,
    byHealth,
    fatigue: { mean: agents.length > 0 ? Math.round((fatigueSum / agents.length) * 10) / 10 : 0, max: fatigueMax, overWarn, overCritical },
    sickLeave: { open: open.length, uncovered: open.filter(r => r.replacementAgentId === null).length, total: records.length },
    alertCount: { critical: alerts.filter(a => a.level === "critical").length, warning: alerts.filter(a => a.level === "warning").length },
    alerts: alerts.slice(0, maxAlerts),
  };
}
