import type { OutcomeRecord, CaseRecord, HospitalState, LearningMemory } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export function learnFromOutcome(
  memory: LearningMemory,
  outcome: OutcomeRecord,
  doctorCase: CaseRecord | undefined,
): LearningMemory {
  const byDiagnosis = new Map(memory.byDiagnosis);
  const dx = byDiagnosis.get(outcome.icdCode) ?? {
    icdCode: outcome.icdCode, diagnosisName: outcome.primaryDiagnosis,
    totalCases: 0, improved: 0, deteriorated: 0, actions: new Map(),
  };
  dx.totalCases++;
  if (outcome.outcome === "improved") dx.improved++;
  else dx.deteriorated++;

  if (doctorCase) {
    for (const action of doctorCase.actionsTaken) {
      const a = dx.actions.get(action) ?? { actionLabel: action, actionType: action.split(":")[0] ?? "", successes: 0, failures: 0, lastUsedTick: 0 };
      if (outcome.outcome === "improved") a.successes++;
      else a.failures++;
      a.lastUsedTick = outcome.dischargeTick;
      dx.actions.set(action, a);
    }
  }

  byDiagnosis.set(outcome.icdCode, dx);
  return { byDiagnosis };
}

export function getActionRanking(
  memory: LearningMemory,
  icdCode: string,
  candidateActions: { actionLabel: string; actionType: string }[],
): { actionLabel: string; actionType: string; score: number }[] {
  const dx = memory.byDiagnosis.get(icdCode);
  if (!dx) return candidateActions.map(a => ({ ...a, score: 0.5 }));

  return candidateActions.map(ca => {
    const learned = dx.actions.get(ca.actionLabel);
    if (!learned || (learned.successes + learned.failures < 2)) return { ...ca, score: 0.5 };
    const rate = learned.successes / (learned.successes + learned.failures);
    const confidence = Math.min(1, (learned.successes + learned.failures) / 10);
    return { ...ca, score: rate * confidence + 0.5 * (1 - confidence) };
  });
}

export function getDeteriorationRate(memory: LearningMemory, icdCode: string): number | null {
  const dx = memory.byDiagnosis.get(icdCode);
  if (!dx || dx.totalCases < 2) return null;
  return dx.deteriorated / dx.totalCases;
}

export function learningHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let lMemory = state._learningMemory ?? { byDiagnosis: new Map() };

  for (const outcome of state._outcomeRecords ?? []) {
    const caseKey = `CASE-${outcome.encounterId}`;
    const doctorCase = state._doctorCaseMemory.get(caseKey);
    lMemory = learnFromOutcome(lMemory, outcome, doctorCase);
  }

  return { ...state, _learningMemory: lMemory };
}
