import { describe, it, expect } from "vitest";
import { createState, type HospitalLayout, type HospitalState } from "../src/engine/state-store.js";
import { initDemand } from "../src/engine/scenario-demand.js";
import { scenarioReport, reportFromRecord, runRecord, UNSOURCED_INPUTS } from "../src/engine/scenario-money.js";
import { closedBedIds } from "../src/engine/scenario-routing.js";
import { createWorld, runWorld } from "../src/engine/world.js";
import { compareLayouts, range, type ScenarioSpec } from "../src/experiment/scenario-compare.js";
import { INA_CBG } from "../src/engine/ina-cbg.js";
import { DEFAULT_ROUTING } from "../src/engine/scenario-routing.js";

const MIN = 1440;
const layout: HospitalLayout = {
  wards: [
    { ward: "K2", roomClass: "kelas-2", specialties: "general", beds: 2 },
    { ward: "K3", roomClass: "kelas-3", specialties: "general", beds: 2 },
  ],
};

/** A hand-built final state with an admission ledger: every figure can be checked by arithmetic. */
function build(end: number, encs: { id: string; payer: string; rc: "kelas-2" | "kelas-3"; startTick: number; endTick: number | null; dx?: string }[]): HospitalState {
  const s = createState([], {}, undefined, layout);
  s._demand = initDemand({});
  s._calendarTicks = end;
  for (const e of encs) {
    const dx = e.dx ?? INA_CBG[0]!.icdCode;
    s._demand.ledger.push({
      patientId: `P-${e.id}`, tick: e.startTick, payer: e.payer, roomClass: e.rc,
      ownClass: (DEFAULT_ROUTING.eligible[e.payer] ?? DEFAULT_ROUTING.defaultClasses)[0]!,
      primaryDiagnosis: dx, diagnosisCodes: [dx],
      stayMinutes: e.endTick === null ? 10 * end : e.endTick - e.startTick,
    });
  }
  return s;
}

describe("Epic XII 12.3 money model", () => {
  it("self-pay room revenue, cost and margin by arithmetic", () => {
    const s = build(5 * MIN, [{ id: "a", payer: "Self-pay", rc: "kelas-3", startTick: MIN, endTick: 3 * MIN }]);
    const r = scenarioReport(s, { warmupTicks: 0 });
    expect(r.byClass["kelas-3"]!.occupiedBedDays).toBeCloseTo(2);
    expect(r.revenue.roomIdr).toBe(2 * 350000);
    expect(r.cost.bedDaysIdr).toBe(Math.round(2 * 350000 * 0.6));
    expect(r.marginIdr).toBe(700000 - 420000);
    expect(r.byClass["kelas-3"]!.occupancy).toBeCloseTo(2 / (2 * 5));
  });

  it("class multiplier applies (kelas-2 = 1.5 x)", () => {
    const s = build(5 * MIN, [{ id: "a", payer: "Private Insurance", rc: "kelas-2", startTick: 0, endTick: 2 * MIN }]);
    expect(scenarioReport(s, { warmupTicks: 0 }).byClass["kelas-2"]!.roomRevenueIdr).toBe(2 * 525000);
  });

  it("drops the warm-up: only the part of a stay inside the window counts", () => {
    const s = build(5 * MIN, [{ id: "a", payer: "Self-pay", rc: "kelas-3", startTick: 0, endTick: 4 * MIN }]);
    const r = scenarioReport(s, { warmupTicks: 3 * MIN });
    expect(r.byClass["kelas-3"]!.occupiedBedDays).toBeCloseTo(1);
    expect(r.byClass["kelas-3"]!.admitted).toBe(0); // admitted before the window
    expect(r.revenue.roomIdr).toBe(350000);
  });

  it("BPJS earns the INA-CBG package once at discharge, and no separate room revenue", () => {
    const tariff = INA_CBG[0]!.tariffIdr;
    const s = build(6 * MIN, [{ id: "a", payer: "BPJS Kesehatan", rc: "kelas-3", startTick: MIN, endTick: 3 * MIN, dx: INA_CBG[0]!.icdCode }]);
    const r = scenarioReport(s, { warmupTicks: 0 });
    expect(r.revenue.roomIdr).toBe(0);
    expect(r.revenue.bpjsPackageIdr).toBe(tariff);
    expect(r.bpjsWithoutTariff).toBe(0);
    // Still in hospital at the end of the run: no package yet.
    const active = build(6 * MIN, [{ id: "b", payer: "BPJS Kesehatan", rc: "kelas-3", startTick: MIN, endTick: null }]);
    expect(scenarioReport(active, { warmupTicks: 0 }).revenue.bpjsPackageIdr).toBe(0);
    // A package discharged inside the warm-up is not counted.
    expect(scenarioReport(s, { warmupTicks: 4 * MIN }).revenue.bpjsPackageIdr).toBe(0);
  });

  it("counts BPJS discharges whose diagnosis has no tariff, and earns nothing for them", () => {
    const s = build(6 * MIN, [{ id: "a", payer: "BPJS Kesehatan", rc: "kelas-3", startTick: 0, endTick: 2 * MIN, dx: "ZZ99.9" }]);
    const r = scenarioReport(s, { warmupTicks: 0 });
    expect(r.bpjsWithoutTariff).toBe(1);
    expect(r.revenue.bpjsPackageIdr).toBe(0);
  });

  it("applies the claim-paid share to BPJS packages", () => {
    const s = build(6 * MIN, [{ id: "a", payer: "BPJS Kesehatan", rc: "kelas-3", startTick: 0, endTick: 2 * MIN }]);
    expect(scenarioReport(s, { warmupTicks: 0, bpjsClaimPaidShare: 0.5 }).revenue.bpjsPackageIdr).toBe(Math.round(INA_CBG[0]!.tariffIdr * 0.5));
  });

  it("spilled-up BPJS: absorbed by default, difference paid when set", () => {
    // BPJS Kesehatan's own class is kelas-3 (DEFAULT_ROUTING); this one is in kelas-2 for 2 days.
    const s = build(6 * MIN, [{ id: "a", payer: "BPJS Kesehatan", rc: "kelas-2", startTick: 0, endTick: 2 * MIN }]);
    const absorb = scenarioReport(s, { warmupTicks: 0 });
    expect(absorb.spillRule).toBe("hospital-absorbs");
    expect(absorb.revenue.spillDifferenceIdr).toBe(0);
    const pays = scenarioReport(s, { warmupTicks: 0, spillRule: "patient-pays-difference" });
    expect(pays.revenue.spillDifferenceIdr).toBe(2 * (525000 - 350000));
    // The hospital still bears the cost of the higher class bed either way.
    expect(pays.cost.bedDaysIdr).toBe(absorb.cost.bedDaysIdr);
    expect(pays.marginIdr - absorb.marginIdr).toBe(350000);
  });

  it("cost per bed-day input overrides the ratio; refit cost is subtracted", () => {
    const s = build(5 * MIN, [{ id: "a", payer: "Self-pay", rc: "kelas-3", startTick: 0, endTick: 2 * MIN }]);
    const r = scenarioReport(s, { warmupTicks: 0, costPerBedDayIdr: { "kelas-3": 100000 }, refitCostIdr: 50000 });
    expect(r.cost.bedDaysIdr).toBe(200000);
    expect(r.cost.refitIdr).toBe(50000);
    expect(r.marginIdr).toBe(700000 - 200000 - 50000);
  });

  it("non-room inputs: cost per admission and non-room revenue for non-package payers", () => {
    const s = build(9 * MIN, [
      { id: "a", payer: "Self-pay", rc: "kelas-3", startTick: 0, endTick: 2 * MIN },
      { id: "b", payer: "BPJS Kesehatan", rc: "kelas-3", startTick: 0, endTick: 2 * MIN },
    ]);
    const base = scenarioReport(s, { warmupTicks: 0 });
    const r = scenarioReport(s, { warmupTicks: 0, nonRoomCostPerAdmissionIdr: 1_000_000, nonRoomRevenuePerNonPackageAdmissionIdr: 400_000 });
    expect(r.cost.nonRoomIdr).toBe(2_000_000); // both admissions
    expect(r.revenue.nonRoomIdr).toBe(400_000); // self-pay only
    expect(r.marginIdr - base.marginIdr).toBe(400_000 - 2_000_000);
  });

  it("counts spill-ups and hospital-wide occupancy inside the window only", () => {
    const s = build(4 * MIN, [
      { id: "a", payer: "BPJS Kesehatan", rc: "kelas-2", startTick: 0, endTick: 2 * MIN },
      { id: "b", payer: "BPJS Kesehatan", rc: "kelas-2", startTick: 2 * MIN, endTick: 4 * MIN },
    ]);
    const r = scenarioReport(s, { warmupTicks: MIN });
    expect(r.spilledUp).toBe(1); // only the one admitted after the warm-up
    expect(r.occupancy).toBeCloseTo((1 + 2) / (4 * 3));
  });

  it("a record survives JSON, so money can be recomputed without a rerun", () => {
    const s = build(5 * MIN, [{ id: "a", payer: "Self-pay", rc: "kelas-3", startTick: 0, endTick: 2 * MIN }]);
    const rec = JSON.parse(JSON.stringify(runRecord(s)));
    expect(reportFromRecord(rec, { warmupTicks: 0, costRatioOfListRate: 0.3 }).cost.bedDaysIdr).toBe(Math.round(2 * 350000 * 0.3));
    expect(rec.arrivalDigest).toBe(runRecord(s).arrivalDigest);
  });

  it("always lists the unsourced inputs, and refuses a default-path state", () => {
    const s = build(MIN, []);
    expect(scenarioReport(s, { warmupTicks: 0 }).unsourcedInputs).toBe(UNSOURCED_INPUTS);
    expect(UNSOURCED_INPUTS.length).toBeGreaterThanOrEqual(7);
    expect(() => scenarioReport(createState([]), {})).toThrow();
  });
});

describe("Epic XII 12.3 refit closures", () => {
  it("closes the last N beds of a class inside the window only", () => {
    const beds = createState([], {}, undefined, layout).beds;
    const ids = [...beds.values()].filter((b) => b.roomClass === "kelas-3").map((b) => b.id);
    const c = [{ roomClass: "kelas-3" as const, beds: 1, fromTick: 100, toTick: 200 }];
    expect([...closedBedIds(beds, c, 99)]).toEqual([]);
    expect([...closedBedIds(beds, c, 100)]).toEqual([ids[1]]);
    expect([...closedBedIds(beds, c, 199)]).toEqual([ids[1]]);
    expect([...closedBedIds(beds, c, 200)]).toEqual([]);
  });

  it("a fully closed class admits nobody and diverts instead", () => {
    const only: HospitalLayout = { wards: [{ ward: "K3", roomClass: "kelas-3", specialties: "general", beds: 4 }] };
    const closed = runWorld(createWorld(5, undefined, 4, only, {
      arrivalsPerDay: 150, waitLimitMinutes: 60, closures: [{ roomClass: "kelas-3", beds: 4, fromTick: 0, toTick: 1e9 }],
    }), 700).state._demand!;
    expect(closed.admitted).toBe(0);
    expect(closed.diverted).toBeGreaterThan(0);
  });
});

describe("Epic XII 12.3 seeds and comparison", () => {
  it("range gives min, median, max and mean", () => {
    expect(range([3, 1, 2])).toEqual({ min: 1, median: 2, max: 3, mean: 2 });
    expect(range([1, 2, 3, 4]).median).toBe(2.5);
    expect(range([])).toEqual({ min: 0, median: 0, max: 0, mean: 0 });
  });

  it("compares two layouts on identical demand, paired by seed", { timeout: 120_000 }, () => {
    const mk = (name: string, k2: number, k3: number): ScenarioSpec => ({
      name, ticks: 600, demand: { arrivalsPerDay: 150, waitLimitMinutes: 120 }, money: { warmupTicks: 0 },
      layout: { wards: [
        { ward: "K2", roomClass: "kelas-2", specialties: "general", beds: k2 },
        { ward: "K3", roomClass: "kelas-3", specialties: "general", beds: k3 },
      ] },
    });
    const c = compareLayouts(mk("a", 10, 4), mk("b", 5, 9), [1, 2]);
    expect(c.a.perSeed.map((r) => r.arrived)).toEqual(c.b.perSeed.map((r) => r.arrived));
    expect(Object.keys(c.delta)).toEqual(expect.arrayContaining(["marginIdr", "diverted", "bpjsDiverted"]));
    expect(c.a.perSeed[0]!.byClass["kelas-3"]!.beds).toBe(4);
    expect(c.b.perSeed[0]!.byClass["kelas-3"]!.beds).toBe(9);
  });
});
