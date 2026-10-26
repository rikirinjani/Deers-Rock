import type { OutcomeRecord, CaseRecord, HospitalState, LearningMemory } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { isLearningFrozen } from "./config.js";

export function learnFromOutcome(
  memory: LearningMemory,
  outcome: OutcomeRecord,
  doctorCase: CaseRecord | undefined,
): LearningMemory {
  const byDiagnosis = new Map(memory.byDiagnosis);
  // Copy-on-write: earlier memories (snapshots, timeline branches) share these objects.
  const prev = byDiagnosis.get(outcome.icdCode);
  const dx = prev ? { ...prev, actions: new Map(prev.actions) } : {
    icdCode: outcome.icdCode, diagnosisName: outcome.primaryDiagnosis,
    totalCases: 0, improved: 0, deteriorated: 0, actions: new Map(),
  };
  dx.totalCases++;
  if (outcome.outcome === "improved") dx.improved++;
  else if (outcome.outcome === "deceased") dx.deteriorated++;
  else dx.deteriorated++;

  if (doctorCase) {
    for (const action of doctorCase.actionsTaken) {
      const prevA = dx.actions.get(action);
      const a = prevA ? { ...prevA } : { actionLabel: action, actionType: action.split(":")[0] ?? "", successes: 0, failures: 0, lastUsedTick: 0 };
      if (outcome.outcome === "improved") a.successes++;
      else a.failures++;
      a.lastUsedTick = outcome.dischargeTick;
      dx.actions.set(action, a);
    }
  }

  byDiagnosis.set(outcome.icdCode, dx);
  return { ...memory, byDiagnosis };
}

export function getActionRanking(
  memory: LearningMemory,
  icdCode: string,
  candidateActions: { actionLabel: string; actionType: string }[],
): { actionLabel: string; actionType: string; score: number }[] {
  // When learning is frozen, return uniform scores so agent behavior
  // is deterministic and identical across seeded runs.
  if (isLearningFrozen()) {
    return candidateActions.map(a => ({ ...a, score: 0.5 }));
  }
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

export interface ActionRankingEntry {
  actionLabel: string; actionType: string;
  successes: number; failures: number; score: number;
}

export interface ActionRankingDistribution {
  frozen: boolean;
  diagnoses: { icdCode: string; diagnosisName: string; totalCases: number; actions: ActionRankingEntry[] }[];
  /** Histogram of scores over every learned (diagnosis, action) pair: [0,0.1), …, [0.9,1.0]. */
  histogram: { from: number; to: number; count: number }[];
  /** Pairs with < 2 observations score the neutral 0.5 prior. */
  neutralPairs: number;
  totalPairs: number;
}

/**
 * Epic VII M7.3: the learned action-ranking distribution, scored with
 * getActionRanking itself so the API shows exactly what the AI doctor sees.
 * Optional icdCode filter; actions sorted by score desc, then label.
 */
export function getActionRankingDistribution(memory: LearningMemory, icdCode?: string): ActionRankingDistribution {
  const histogram = Array.from({ length: 10 }, (_, i) => ({ from: i / 10, to: (i + 1) / 10, count: 0 }));
  let neutralPairs = 0, totalPairs = 0;
  const diagnoses: ActionRankingDistribution["diagnoses"] = [];
  const codes = Array.from(memory.byDiagnosis.keys()).filter(c => !icdCode || c === icdCode).sort();
  for (const code of codes) {
    const dx = memory.byDiagnosis.get(code)!;
    const learned = Array.from(dx.actions.values());
    const scored = getActionRanking(memory, code, learned.map(a => ({ actionLabel: a.actionLabel, actionType: a.actionType })));
    const actions = scored.map((r, i) => ({ ...r, successes: learned[i]!.successes, failures: learned[i]!.failures }))
      .sort((a, b) => b.score - a.score || (a.actionLabel < b.actionLabel ? -1 : a.actionLabel > b.actionLabel ? 1 : 0));
    for (const a of actions) {
      totalPairs++;
      if (a.successes + a.failures < 2) neutralPairs++;
      histogram[Math.min(9, Math.floor(a.score * 10))]!.count++;
    }
    diagnoses.push({ icdCode: code, diagnosisName: dx.diagnosisName, totalCases: dx.totalCases, actions });
  }
  return { frozen: isLearningFrozen(), diagnoses, histogram, neutralPairs, totalPairs };
}

export function getDeteriorationRate(memory: LearningMemory, icdCode: string): number | null {
  // When learning is frozen, return null so agents use default rates.
  if (isLearningFrozen()) return null;
  const dx = memory.byDiagnosis.get(icdCode);
  if (!dx || dx.totalCases < 2) return null;
  return dx.deteriorated / dx.totalCases;
}

export function learningHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  // Skip entirely when learning is frozen — no memory updates, no side effects.
  if (isLearningFrozen()) return state;

  let lMemory = state._learningMemory ?? { byDiagnosis: new Map() };
  const records = state._outcomeRecords ?? [];
  // Learn each outcome once. _outcomeRecords is append-only; before the
  // cursor every 10-tick pass re-learned all records (431 outcomes counted
  // as 53,856 cases by tick 2500, seed 42).
  const from = lMemory.learnedOutcomes ?? 0;
  if (from >= records.length) return state;

  for (let i = from; i < records.length; i++) {
    const outcome = records[i]!;
    const caseKey = `CASE-${outcome.encounterId}`;
    const doctorCase = state._doctorCaseMemory.get(caseKey);
    lMemory = learnFromOutcome(lMemory, outcome, doctorCase);
  }

  return { ...state, _learningMemory: { ...lMemory, learnedOutcomes: records.length } };
}
