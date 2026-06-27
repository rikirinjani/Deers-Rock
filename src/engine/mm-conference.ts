import type { HospitalState, CaseRecord, MorgueRecord } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { tickToDate, formatCalendarDate } from "./calendar.js";
import { ICD_PROTOCOLS, assessMortalityRisk, ESCALATION_TRIGGERS } from "./clinical-knowledge.js";

export interface MmTimelineEvent {
  tick: number;
  event: string;
  type: "admission" | "action" | "escalation" | "death";
}

export interface MmCase {
  patientId: string;
  encounterId: string;
  primaryDiagnosis: string;
  icdCode: string;
  age: number;
  gender: string;
  causeOfDeath: string;
  mortalityScore: number;
  preventabilityScore: number;
  preventabilityLabel: "preventable" | "potentially_preventable" | "non_preventable";
  actionsTaken: string[];
  missedActions: string[];
  escalationMissed: boolean;
  recommendations: string[];
  timeline: MmTimelineEvent[];
}

export interface MmConference {
  id: number;
  heldAtTick: number;
  date: string;
  totalDeathsSinceLast: number;
  reviewedCases: MmCase[];
  topPreventable: MmCase[];
  overallRecommendations: string[];
}

let conferenceIdCounter = 0;

function assessPreventability(
  morgueRecord: MorgueRecord,
  doctorCase: CaseRecord | undefined,
  icdProtocol: readonly { type: string; label: string }[],
): {
  score: number;
  label: "preventable" | "potentially_preventable" | "non_preventable";
  missedActions: string[];
  escalationMissed: boolean;
  recommendations: string[];
} {
  const missed: string[] = [];
  const taken = new Set(doctorCase?.actionsTaken ?? []);

  for (const proto of icdProtocol) {
    const key = `${proto.type}:${proto.label}`;
    if (!taken.has(key)) {
      missed.push(key);
    }
  }

  const actionsTakenCount = (doctorCase?.actionsTaken ?? []).length;
  const protocolCount = icdProtocol.length;
  const missRate = protocolCount > 0 ? missed.length / protocolCount : 0;

  const escMissed = ESCALATION_TRIGGERS.some(t => {
    const escKey = `${t.escalationAction.type}:${t.escalationAction.label}`;
    return !taken.has(escKey);
  });

  const ageFactor = morgueRecord.age < 50 ? 0.3 : morgueRecord.age < 70 ? 0.15 : 0;
  const mortFactor = morgueRecord.mortalityScore > 70 ? 0.1 : morgueRecord.mortalityScore > 50 ? 0.2 : 0.3;

  const rawScore = missRate * 60 + (escMissed ? 25 : 0) + ageFactor * 20 + mortFactor * 20;
  const score = Math.min(100, Math.round(rawScore));

  const label: "preventable" | "potentially_preventable" | "non_preventable" =
    score >= 60 ? "preventable" : score >= 30 ? "potentially_preventable" : "non_preventable";

  const recs: string[] = [];
  if (missed.length > 0) recs.push(`Review missed protocol actions: ${missed.slice(0, 3).join(", ")}`);
  if (escMissed) recs.push("Escalation trigger not acted upon — reinforce sepsis/ICU alert protocol");
  if (actionsTakenCount < 2) recs.push("Very few clinical actions ordered — consider earlier intervention");
  if (morgueRecord.age < 50) recs.push(`Death at age ${morgueRecord.age} — investigate for missed early warning signs`);
  if (recs.length === 0) recs.push("Standard of care followed; death likely non-preventable");

  return { score, label, missedActions: missed, escalationMissed: escMissed, recommendations: recs };
}

export function runMmConference(
  state: HospitalState,
  clock: Clock,
  _queue: EventQueue,
): { state: HospitalState; conference: MmConference | null } {
  const date = tickToDate(clock.tick);
  const isMondayMorning = date.dayOfWeek === 1 && date.hour === 8 && date.minute < 10;
  if (!isMondayMorning) return { state, conference: null };

  const lastMmTick = state._mmLastConferenceTick ?? 0;
  if (clock.tick - lastMmTick < 10080 * 0.5) return { state, conference: null };

  const morgue = state.morgue || [];
  const newDeaths = lastMmTick === 0 ? morgue : morgue.filter(m => m.deathTick > lastMmTick);
  if (newDeaths.length === 0) {
    return {
      state: { ...state, _mmLastConferenceTick: clock.tick, _mmConferences: state._mmConferences ?? [] },
      conference: { id: ++conferenceIdCounter, heldAtTick: clock.tick, date: formatCalendarDate(date), totalDeathsSinceLast: 0, reviewedCases: [], topPreventable: [], overallRecommendations: [] },
    };
  }

  const reviewed: MmCase[] = [];

  for (const m of newDeaths) {
    const caseKey = `CASE-${m.encounterId}`;
    const doctorCase = state._doctorCaseMemory.get(caseKey);
    const activeDx = [{ code: m.icdCode, name: m.primaryDiagnosis }];
    const icdProtocol = ICD_PROTOCOLS.filter(p => m.icdCode.startsWith(p.code));

    const protocolActions = icdProtocol.length > 0
      ? icdProtocol.flatMap(p => p.actions)
      : [{ type: "lab" as const, label: "Complete Blood Count", priority: 5 }];

  const pa = assessPreventability(m, doctorCase, protocolActions);
  const takenActions = doctorCase?.actionsTaken ?? [];

  const tl: MmTimelineEvent[] = [];
  tl.push({ tick: m.deathTick - 1, event: `Admitted with ${m.primaryDiagnosis}`, type: "admission" });
  for (const a of takenActions) {
    tl.push({ tick: m.deathTick - 1, event: a, type: "action" });
  }
  tl.push({ tick: m.deathTick, event: `Death — ${m.causeOfDeath}`, type: "death" });

  reviewed.push({
    patientId: m.patientId,
    encounterId: m.encounterId,
    primaryDiagnosis: m.primaryDiagnosis,
    icdCode: m.icdCode,
    age: m.age,
    gender: m.gender,
    causeOfDeath: m.causeOfDeath,
    mortalityScore: m.mortalityScore,
    preventabilityScore: pa.score,
    preventabilityLabel: pa.label,
    actionsTaken: takenActions,
    missedActions: pa.missedActions,
    escalationMissed: pa.escalationMissed,
    recommendations: pa.recommendations,
    timeline: tl,
  });
  }

  reviewed.sort((a, b) => b.preventabilityScore - a.preventabilityScore);
  const topPreventable = reviewed.slice(0, 5);

  const allRecs = new Set<string>();
  for (const c of topPreventable) {
    for (const r of c.recommendations) allRecs.add(r);
  }
  const overallRecommendations = Array.from(allRecs).slice(0, 5);

  const conference: MmConference = {
    id: ++conferenceIdCounter,
    heldAtTick: clock.tick,
    date: formatCalendarDate(date),
    totalDeathsSinceLast: newDeaths.length,
    reviewedCases: reviewed,
    topPreventable,
    overallRecommendations,
  };

  const conferences = [...(state._mmConferences ?? []), conference];

  return {
    state: {
      ...state,
      _mmLastConferenceTick: clock.tick,
      _mmConferences: conferences,
    },
    conference,
  };
}
