/**
 * Epic VII M7.3 — learning cursor (each outcome learned once) and the
 * action-ranking distribution API.
 */
import { describe, it, expect, afterEach } from "vitest";
import { createWorld, runWorld, type World } from "../src/engine/world.js";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { learningHandler, getActionRankingDistribution } from "../src/engine/agent-learning.js";
import { apiRoutes } from "../src/api/rest.js";
import type { HospitalState, OutcomeRecord, CaseRecord, LearningMemory } from "../src/engine/state-store.js";

const rec = (enc: string, icd: string, outcome: OutcomeRecord["outcome"]): OutcomeRecord => ({
  patientId: "PAT-" + enc, encounterId: enc, primaryDiagnosis: icd + " dx", icdCode: icd,
  outcome, losTicks: 10, ordersCount: 1, dischargeTick: 5,
});
const docCase = (enc: string, actions: string[]): CaseRecord => ({
  encounterId: enc, patientId: "PAT-" + enc, primaryDiagnosis: "x", actionsTaken: actions,
  outcome: "discharged", tickStarted: 0, tickEnded: 5, attendingDoctorId: null, attendingSpesialisasi: null,
});
const clock = () => createClock(60, 1);

function withOutcomes(s: HospitalState, records: OutcomeRecord[], cases: CaseRecord[] = []): HospitalState {
  const mem = new Map(s._doctorCaseMemory);
  for (const c of cases) mem.set(`CASE-${c.encounterId}`, c);
  return { ...s, _outcomeRecords: [...(s._outcomeRecords ?? []), ...records], _doctorCaseMemory: mem };
}
const cases = (m: LearningMemory) => Array.from(m.byDiagnosis.values()).reduce((n, d) => n + d.totalCases, 0);

describe("Epic VII — learning handler cursor", () => {
  afterEach(() => { delete process.env.DR_FREEZE_LEARNING; });

  it("learns each outcome exactly once across repeated passes", () => {
    let s = withOutcomes(createWorld(5, undefined, 1).state, [rec("E1", "I10", "improved"), rec("E2", "I10", "deteriorated"), rec("E3", "J15", "improved")]);
    s = learningHandler(s, clock(), new EventQueue());
    s = learningHandler(s, clock(), new EventQueue());
    s = learningHandler(s, clock(), new EventQueue());
    expect(cases(s._learningMemory)).toBe(3);
    expect(s._learningMemory.byDiagnosis.get("I10")!.totalCases).toBe(2);
    expect(s._learningMemory.learnedOutcomes).toBe(3);
    s = learningHandler(withOutcomes(s, [rec("E4", "I10", "improved")]), clock(), new EventQueue());
    expect(s._learningMemory.byDiagnosis.get("I10")!.totalCases).toBe(3);
    expect(s._learningMemory.byDiagnosis.get("I10")!.improved).toBe(2);
  });

  it("does not mutate the previous memory (copy-on-write)", () => {
    const s1 = learningHandler(withOutcomes(createWorld(5, undefined, 1).state, [rec("E1", "I10", "improved")], [docCase("E1", ["med:Amlodipine"])]), clock(), new EventQueue());
    const before = JSON.stringify(Array.from(s1._learningMemory.byDiagnosis.get("I10")!.actions.values()));
    learningHandler(withOutcomes(s1, [rec("E2", "I10", "deteriorated")], [docCase("E2", ["med:Amlodipine"])]), clock(), new EventQueue());
    expect(s1._learningMemory.byDiagnosis.get("I10")!.totalCases).toBe(1);
    expect(JSON.stringify(Array.from(s1._learningMemory.byDiagnosis.get("I10")!.actions.values()))).toBe(before);
  });

  it("over a seeded run, learned cases equal outcome records", () => {
    const w = runWorld(createWorld(40, undefined, 42), 400);
    const outcomes = w.state._outcomeRecords.length;
    expect(outcomes).toBeGreaterThan(0);
    // learningHandler runs every 10 ticks; at tick 400 the last pass consumed everything up to tick 400.
    expect(w.state._learningMemory.learnedOutcomes).toBe(outcomes);
    expect(cases(w.state._learningMemory)).toBe(outcomes);
  });
});

describe("Epic VII M7.3 — action ranking distribution", () => {
  afterEach(() => { delete process.env.DR_FREEZE_LEARNING; });

  function learned(): HospitalState {
    const recs: OutcomeRecord[] = [], cs: CaseRecord[] = [];
    // med:A on I10 — 4 successes / 1 failure; lab:B — 1 observation (neutral prior)
    for (let i = 0; i < 5; i++) { recs.push(rec("A" + i, "I10", i < 4 ? "improved" : "deteriorated")); cs.push(docCase("A" + i, ["med:A"])); }
    recs.push(rec("B0", "I10", "improved")); cs.push(docCase("B0", ["lab:B"]));
    recs.push(rec("C0", "J15", "deteriorated")); cs.push(docCase("C0", ["med:C"]));
    recs.push(rec("C1", "J15", "deteriorated")); cs.push(docCase("C1", ["med:C"]));
    return learningHandler(withOutcomes(createWorld(5, undefined, 1).state, recs, cs), clock(), new EventQueue());
  }

  it("scores actions with the same formula the AI doctor uses", () => {
    const d = getActionRankingDistribution(learned()._learningMemory);
    expect(d.frozen).toBe(false);
    const i10 = d.diagnoses.find(x => x.icdCode === "I10")!;
    expect(i10.totalCases).toBe(6);
    expect(i10.actions.map(a => a.actionLabel)).toEqual(["med:A", "lab:B"]);
    // rate 0.8, confidence 5/10 → 0.8*0.5 + 0.5*0.5 = 0.65
    expect(i10.actions[0]!.score).toBeCloseTo(0.65, 10);
    expect(i10.actions[0]!.successes).toBe(4);
    expect(i10.actions[0]!.failures).toBe(1);
    expect(i10.actions[1]!.score).toBe(0.5);
    // J15 med:C: rate 0, confidence 0.2 → 0.4
    expect(d.diagnoses.find(x => x.icdCode === "J15")!.actions[0]!.score).toBeCloseTo(0.4, 10);
    expect(d.totalPairs).toBe(3);
    expect(d.neutralPairs).toBe(1);
    expect(d.histogram.reduce((n, b) => n + b.count, 0)).toBe(3);
    expect(d.histogram[6]!.count).toBe(1); // 0.65
    expect(d.histogram[5]!.count).toBe(1); // 0.5
    expect(d.histogram[4]!.count).toBe(1); // 0.4
  });

  it("filters by ICD and reports uniform scores when learning is frozen", () => {
    const mem = learned()._learningMemory;
    expect(getActionRankingDistribution(mem, "J15").diagnoses.map(d => d.icdCode)).toEqual(["J15"]);
    process.env.DR_FREEZE_LEARNING = "1";
    const d = getActionRankingDistribution(mem);
    expect(d.frozen).toBe(true);
    expect(d.diagnoses.flatMap(x => x.actions).every(a => a.score === 0.5)).toBe(true);
  });

  it("GET /api/learning/action-ranking serves the distribution with ?icd and ?top", () => {
    const w: World = { ...createWorld(5, undefined, 1) };
    w.state = learned();
    let body = "";
    const res: any = { statusCode: 200, setHeader: () => {}, end: (b?: string) => { body = b ?? ""; } };
    expect(apiRoutes({ method: "GET" } as any, res, w, new URL("http://localhost/api/learning/action-ranking?icd=I10&top=1"))).toBe(true);
    const j = JSON.parse(body);
    expect(j.diagnoses).toHaveLength(1);
    expect(j.diagnoses[0].actions).toHaveLength(1);
    expect(j.diagnoses[0].actions[0].actionLabel).toBe("med:A");
    expect(j.histogram).toHaveLength(10);
  });
});
