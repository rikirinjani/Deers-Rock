/**
 * Epic XII 12.3: money model and per-class report for a finished layout scenario.
 *
 * Pure function of the final state (no engine change, no rng): it reads encounters,
 * beds and `state._demand`. Scenario path only; the default path never calls it.
 *
 * What it counts (per layout, inside the window after warm-up):
 *  - Room revenue by class for payers NOT on an INA-CBG package (private insurance, self-pay,
 *    Jasa Raharja): list room price x class multiplier x bed-days (pro-rated by minute).
 *  - BPJS package revenue: the INA-CBG tariff of the encounter, once at discharge, for the
 *    CBG payers. A package is all-inclusive, so BPJS room days earn nothing separately.
 *  - Spilled-up BPJS (placed above the payer's own class): `spillRule` decides.
 *      "hospital-absorbs": no extra revenue (the hospital bears the upgrade).
 *      "patient-pays-difference": the patient pays the room price difference per day.
 *  - Cost: cost per OCCUPIED bed-day by class, plus a one-off refit cost.
 * Ancillary revenue and cost (lab, drugs, procedures) are excluded: the same patients
 * generate them whatever the layout, so they cancel when two layouts are compared.
 *
 * Every number marked UNSOURCED below is an input with no source. Results are scenarios,
 * not forecasts (design doc sections 1 and 7).
 */
import type { HospitalState } from "./state-store.js";
import type { RoomClass } from "../patient/schema.js";
import { getChargePolicy } from "./billing/registry.js";
import { inferSeverity, lookupCbgTariff } from "./ina-cbg.js";

export type SpillRule = "hospital-absorbs" | "patient-pays-difference";

export interface MoneyConfig {
  /** Ticks (minutes) at the start of the run that are dropped from every figure. Default 7 days. */
  warmupTicks?: number;
  /** Cost per occupied bed-day by class (IDR). Missing classes use costRatioOfListRate. UNSOURCED. */
  costPerBedDayIdr?: Partial<Record<RoomClass, number>>;
  /** Fallback cost = ratio x list room price of the class. Default 0.6. UNSOURCED. */
  costRatioOfListRate?: number;
  /** Spilled-up BPJS rule. Default "hospital-absorbs". ASSUMPTION. */
  spillRule?: SpillRule;
  /** Share of BPJS package value actually paid (claim denials, delays). Default 1. UNSOURCED. */
  bpjsClaimPaidShare?: number;
  /** Payers paid by INA-CBG package. Default the two BPJS payers. */
  cbgPayers?: string[];
  /** One-off refit cost (IDR), subtracted from margin. Default 0. UNSOURCED. */
  refitCostIdr?: number;
}

/** Every input with no source behind it; always printed with the report. */
export const UNSOURCED_INPUTS: readonly string[] = [
  "costPerBedDayIdr / costRatioOfListRate (default 0.6 of the list room price): no hospital cost data",
  "spillRule default hospital-absorbs: Indonesian rules on temporary placement in a higher class are not verified",
  "bpjsClaimPaidShare default 1: denial and delay rates are not applied",
  "refitCostIdr and closure windows: no renovation cost source",
  "routing table (scenario-routing.ts DEFAULT_ROUTING): BPJS entitlement by member tier, KRIS reform, upgrade rules unverified",
  "arrivalsPerDay default 19 and waitLimitMinutes default 1440: calibration comment only, not hospital data",
  "room list price (350000 IDR x class multiplier) and INA-CBG tariffs: engine tables, not checked against current Kemenkes tariffs",
  "stay length 3-7 days regardless of class: not calibrated",
];

export interface ClassReport {
  beds: number;
  admitted: number;
  occupiedBedDays: number;
  /** occupiedBedDays / (beds x window days). */
  occupancy: number;
  roomRevenueIdr: number;
  costIdr: number;
}

export interface ScenarioReport {
  windowStartTick: number;
  windowEndTick: number;
  windowDays: number;
  byClass: Record<string, ClassReport>;
  arrived: number;
  admitted: number;
  diverted: number;
  divertedByPayer: Record<string, number>;
  stillQueued: number;
  spilledUp: number;
  revenue: { roomIdr: number; bpjsPackageIdr: number; spillDifferenceIdr: number; totalIdr: number };
  cost: { bedDaysIdr: number; refitIdr: number; totalIdr: number };
  marginIdr: number;
  /** CBG-payer encounters discharged in the window with no tariff for the diagnosis (earn 0). */
  bpjsWithoutTariff: number;
  spillRule: SpillRule;
  unsourcedInputs: readonly string[];
}

const MIN_PER_DAY = 1440;

export function scenarioReport(state: HospitalState, cfg: MoneyConfig = {}): ScenarioReport {
  const d = state._demand;
  if (!d) throw new Error("scenarioReport needs a scenario world (state._demand is missing)");
  const warmup = cfg.warmupTicks ?? 7 * MIN_PER_DAY;
  const endTick = state._calendarTicks;
  const spillRule = cfg.spillRule ?? "hospital-absorbs";
  const paidShare = cfg.bpjsClaimPaidShare ?? 1;
  const cbgPayers = new Set(cfg.cbgPayers ?? ["BPJS Kesehatan", "BPJS Ketenagakerjaan"]);
  const policy = getChargePolicy();
  const listPrice = (rc: string) => Math.round(policy.baseRate("room") * policy.roomClassMultiplier(rc));
  const costPerDay = (rc: RoomClass) =>
    cfg.costPerBedDayIdr?.[rc] ?? Math.round(listPrice(rc) * (cfg.costRatioOfListRate ?? 0.6));
  const windowDays = Math.max(0, endTick - warmup) / MIN_PER_DAY;

  const byClass: Record<string, ClassReport> = {};
  for (const b of state.beds.values()) {
    const c = (byClass[b.roomClass] ??= { beds: 0, admitted: 0, occupiedBedDays: 0, occupancy: 0, roomRevenueIdr: 0, costIdr: 0 });
    c.beds++;
  }

  let roomIdr = 0, bpjsPackageIdr = 0, spillDifferenceIdr = 0, bpjsWithoutTariff = 0;
  for (const e of state.encounters.values()) {
    if (e.type !== "inpatient" || !e.roomClassAtAdmission) continue;
    const rc = e.roomClassAtAdmission;
    const startTick = e.startTime / 60000;
    const stopTick = e.endTime !== null ? e.endTime / 60000 : endTick;
    const overlap = Math.max(0, Math.min(stopTick, endTick) - Math.max(startTick, warmup));
    const days = overlap / MIN_PER_DAY;
    const cls = (byClass[rc] ??= { beds: 0, admitted: 0, occupiedBedDays: 0, occupancy: 0, roomRevenueIdr: 0, costIdr: 0 });
    if (startTick >= warmup) cls.admitted++;
    cls.occupiedBedDays += days;
    cls.costIdr += days * costPerDay(rc);

    const payer = e.payer ?? "BPJS Kesehatan";
    if (cbgPayers.has(payer)) {
      // Package paid once, at discharge inside the window.
      if (e.status === "discharged" && stopTick >= warmup && stopTick <= endTick) {
        const patient = state.patients.get(e.patientId);
        const dx = e.primaryDiagnosis ?? "UNKNOWN";
        const codes = patient ? [dx, ...patient.diagnoses.map((x) => x.code).filter((c) => c !== dx)] : [dx];
        const tariff = lookupCbgTariff(dx, inferSeverity(codes).level)?.tariffIdr;
        if (tariff === undefined) bpjsWithoutTariff++;
        else bpjsPackageIdr += tariff * paidShare;
      }
      // Spilled-up case: placed above the payer's own class.
      const own = (d.routing.eligible[payer] ?? d.routing.defaultClasses)[0];
      if (spillRule === "patient-pays-difference" && own && own !== rc) {
        const diff = Math.max(0, listPrice(rc) - listPrice(own));
        spillDifferenceIdr += diff * days;
      }
    } else {
      const rev = days * listPrice(rc);
      cls.roomRevenueIdr += rev;
      roomIdr += rev;
    }
  }
  for (const c of Object.values(byClass)) {
    c.occupancy = c.beds > 0 && windowDays > 0 ? c.occupiedBedDays / (c.beds * windowDays) : 0;
  }

  const diverted = d.divertedLog.filter((x) => x.tick >= warmup);
  const divertedByPayer: Record<string, number> = {};
  for (const x of diverted) divertedByPayer[x.payer] = (divertedByPayer[x.payer] ?? 0) + 1;
  const inWindow = d.arrivalLog.filter((a) => a.tick >= warmup);
  const admittedInWindow = Object.values(byClass).reduce((s, c) => s + c.admitted, 0);

  const bedDaysCost = Object.values(byClass).reduce((s, c) => s + c.costIdr, 0);
  const refit = cfg.refitCostIdr ?? 0;
  const revenueTotal = roomIdr + bpjsPackageIdr + spillDifferenceIdr;
  const round = (n: number) => Math.round(n);
  for (const c of Object.values(byClass)) { c.roomRevenueIdr = round(c.roomRevenueIdr); c.costIdr = round(c.costIdr); }

  return {
    windowStartTick: warmup, windowEndTick: endTick, windowDays,
    byClass,
    arrived: inWindow.length, admitted: admittedInWindow, diverted: diverted.length, divertedByPayer,
    stillQueued: d.queue.length, spilledUp: d.spilledUp,
    revenue: { roomIdr: round(roomIdr), bpjsPackageIdr: round(bpjsPackageIdr), spillDifferenceIdr: round(spillDifferenceIdr), totalIdr: round(revenueTotal) },
    cost: { bedDaysIdr: round(bedDaysCost), refitIdr: refit, totalIdr: round(bedDaysCost + refit) },
    marginIdr: round(revenueTotal - bedDaysCost - refit),
    bpjsWithoutTariff, spillRule, unsourcedInputs: UNSOURCED_INPUTS,
  };
}
