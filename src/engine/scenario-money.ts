/**
 * Epic XII 12.3/12.4: money model and per-class report for a finished layout scenario.
 *
 * Pure function of a RunRecord (no engine change, no rng). The record is taken from the final
 * state once (`runRecord`) and can be saved as JSON, so every money setting can be recomputed
 * later without re-running the simulation. Scenario path only; the default path never calls it.
 *
 * What it counts (per layout, inside the window after warm-up):
 *  - Room revenue by class for payers NOT on an INA-CBG package (private insurance, self-pay,
 *    Jasa Raharja): list room price x class multiplier x bed-days (pro-rated by minute).
 *  - BPJS package revenue: the INA-CBG tariff of the admission, once at discharge, for the CBG
 *    payers. A package is all-inclusive, so BPJS room days earn nothing separately.
 *  - Spilled-up BPJS (placed above the payer's own class): `spillRule` decides.
 *      "hospital-absorbs": no extra revenue (the hospital bears the upgrade).
 *      "patient-pays-difference": the patient pays the room price difference per day.
 *  - Cost: cost per OCCUPIED bed-day by class, one-off refit cost, and an optional non-room
 *    cost per admission.
 *  - Optional non-room revenue per admission for non-package payers.
 * CAUTION: the two layouts do not admit the same patients (more beds in one class admit more
 * BPJS patients), so ancillary revenue and cost do NOT cancel. A package payer earns the whole
 * package against only a bed-day cost unless `nonRoomCostPerAdmissionIdr` is set. That tilts
 * margin toward the layout that admits more package patients. Report the sign of the paired
 * margin delta across the sensitivity grid (scenario-compare.ts), not one point.
 *
 * Every number marked UNSOURCED below is an input with no source. Results are scenarios,
 * not forecasts (design doc sections 1 and 7).
 */
import type { HospitalState } from "./state-store.js";
import type { RoomClass } from "../patient/schema.js";
import type { AdmissionEntry } from "./scenario-demand.js";
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
  /** Non-room cost (drugs, lab, procedures, staff) per admission started in the window. Default 0. UNSOURCED. */
  nonRoomCostPerAdmissionIdr?: number;
  /** Non-room revenue per admission for payers NOT on a package (billed on top of the room). Default 0. UNSOURCED. */
  nonRoomRevenuePerNonPackageAdmissionIdr?: number;
}

/** Every input with no source behind it; always printed with the report. */
export const UNSOURCED_INPUTS: readonly string[] = [
  "costPerBedDayIdr / costRatioOfListRate (default 0.6 of the list room price): no hospital cost data",
  "nonRoomCostPerAdmissionIdr (default 0) and nonRoomRevenuePerNonPackageAdmissionIdr (default 0): no source; they decide whether a BPJS package admission pays",
  "spillRule default hospital-absorbs: Indonesian rules on temporary placement in a higher class are not verified",
  "bpjsClaimPaidShare default 1: denial and delay rates are not applied",
  "refitCostIdr and closure windows: no renovation cost source",
  "routing table (scenario-routing.ts DEFAULT_ROUTING): BPJS entitlement by member tier, KRIS reform, upgrade rules unverified",
  "arrivalsPerDay default 19 and waitLimitMinutes default 1440: calibration comment only, not hospital data",
  "beds per room by class (rooms to beds): no source",
  "room list price (350000 IDR x class multiplier) and INA-CBG tariffs: engine tables, not checked against current Kemenkes tariffs",
  "stay length 3-7 days regardless of class: not calibrated",
];

/** Everything a report needs from a finished run; JSON-safe. */
export interface RunRecord {
  endTick: number;
  bedsByClass: Record<string, number>;
  ledger: AdmissionEntry[];
  /** Routing table's own class per payer is already in each ledger entry; kept for the report header. */
  arrivalTicks: number[];
  /** Digest of the arrival log (tick, payer, diagnosis, stay), to assert paired layouts saw the same demand. */
  arrivalDigest: string;
  divertedLog: { tick: number; payer: string }[];
  stillQueued: number;
}

function digest(parts: string[]): string {
  let h = 5381;
  for (const p of parts) for (let i = 0; i < p.length; i++) h = (Math.imul(h, 33) ^ p.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export function runRecord(state: HospitalState): RunRecord {
  const d = state._demand;
  if (!d) throw new Error("runRecord needs a scenario world (state._demand is missing)");
  const bedsByClass: Record<string, number> = {};
  for (const b of state.beds.values()) bedsByClass[b.roomClass] = (bedsByClass[b.roomClass] ?? 0) + 1;
  return {
    endTick: state._calendarTicks,
    bedsByClass,
    ledger: d.ledger,
    arrivalTicks: d.arrivalLog.map((a) => a.tick),
    arrivalDigest: digest(d.arrivalLog.map((a) => `${a.tick}|${a.payer}|${a.primaryDiagnosis}|${a.stayMinutes}`)),
    divertedLog: d.divertedLog.map((x) => ({ tick: x.tick, payer: x.payer })),
    stillQueued: d.queue.length,
  };
}

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
  /** Hospital-wide: occupied bed-days / (all beds x window days). */
  occupancy: number;
  arrived: number;
  admitted: number;
  diverted: number;
  divertedByPayer: Record<string, number>;
  stillQueued: number;
  /** Admissions started in the window placed above the payer's own class. */
  spilledUp: number;
  revenue: { roomIdr: number; bpjsPackageIdr: number; spillDifferenceIdr: number; nonRoomIdr: number; totalIdr: number };
  cost: { bedDaysIdr: number; nonRoomIdr: number; refitIdr: number; totalIdr: number };
  marginIdr: number;
  /** CBG-payer discharges in the window with no tariff for the diagnosis (earn 0). */
  bpjsWithoutTariff: number;
  spillRule: SpillRule;
  unsourcedInputs: readonly string[];
}

const MIN_PER_DAY = 1440;

export function reportFromRecord(rec: RunRecord, cfg: MoneyConfig = {}): ScenarioReport {
  const warmup = cfg.warmupTicks ?? 7 * MIN_PER_DAY;
  const endTick = rec.endTick;
  const spillRule = cfg.spillRule ?? "hospital-absorbs";
  const paidShare = cfg.bpjsClaimPaidShare ?? 1;
  const cbgPayers = new Set(cfg.cbgPayers ?? ["BPJS Kesehatan", "BPJS Ketenagakerjaan"]);
  const policy = getChargePolicy();
  const listPrice = (rc: string) => Math.round(policy.baseRate("room") * policy.roomClassMultiplier(rc));
  const costPerDay = (rc: string) =>
    cfg.costPerBedDayIdr?.[rc as RoomClass] ?? Math.round(listPrice(rc) * (cfg.costRatioOfListRate ?? 0.6));
  const windowDays = Math.max(0, endTick - warmup) / MIN_PER_DAY;

  const byClass: Record<string, ClassReport> = {};
  for (const [rc, n] of Object.entries(rec.bedsByClass)) {
    byClass[rc] = { beds: n, admitted: 0, occupiedBedDays: 0, occupancy: 0, roomRevenueIdr: 0, costIdr: 0 };
  }

  let roomIdr = 0, bpjsPackageIdr = 0, spillDifferenceIdr = 0, bpjsWithoutTariff = 0;
  let nonRoomRev = 0, nonRoomCost = 0, spilledUp = 0, admittedInWindow = 0;
  const nrCost = cfg.nonRoomCostPerAdmissionIdr ?? 0;
  const nrRev = cfg.nonRoomRevenuePerNonPackageAdmissionIdr ?? 0;
  for (const e of rec.ledger) {
    const rc = e.roomClass;
    const startTick = e.tick;
    const dischargeTick = e.tick + e.stayMinutes;
    const stopTick = Math.min(dischargeTick, endTick);
    const overlap = Math.max(0, stopTick - Math.max(startTick, warmup));
    const days = overlap / MIN_PER_DAY;
    const cls = (byClass[rc] ??= { beds: 0, admitted: 0, occupiedBedDays: 0, occupancy: 0, roomRevenueIdr: 0, costIdr: 0 });
    const started = startTick >= warmup;
    if (started) { cls.admitted++; admittedInWindow++; nonRoomCost += nrCost; }
    cls.occupiedBedDays += days;
    cls.costIdr += days * costPerDay(rc);

    const isPackage = cbgPayers.has(e.payer);
    if (isPackage) {
      if (dischargeTick <= endTick && dischargeTick >= warmup) {
        const tariff = lookupCbgTariff(e.primaryDiagnosis, inferSeverity(e.diagnosisCodes).level)?.tariffIdr;
        if (tariff === undefined) bpjsWithoutTariff++;
        else bpjsPackageIdr += tariff * paidShare;
      }
      if (spillRule === "patient-pays-difference" && e.ownClass !== rc) {
        spillDifferenceIdr += Math.max(0, listPrice(rc) - listPrice(e.ownClass)) * days;
      }
    } else {
      const rev = days * listPrice(rc);
      cls.roomRevenueIdr += rev;
      roomIdr += rev;
      if (started) nonRoomRev += nrRev;
    }
    if (started && e.ownClass !== rc) spilledUp++;
  }
  let allBeds = 0, allOcc = 0;
  for (const c of Object.values(byClass)) {
    c.occupancy = c.beds > 0 && windowDays > 0 ? c.occupiedBedDays / (c.beds * windowDays) : 0;
    allBeds += c.beds; allOcc += c.occupiedBedDays;
  }

  const diverted = rec.divertedLog.filter((x) => x.tick >= warmup);
  const divertedByPayer: Record<string, number> = {};
  for (const x of diverted) divertedByPayer[x.payer] = (divertedByPayer[x.payer] ?? 0) + 1;
  const arrived = rec.arrivalTicks.filter((t) => t >= warmup).length;

  const bedDaysCost = Object.values(byClass).reduce((s, c) => s + c.costIdr, 0);
  const refit = cfg.refitCostIdr ?? 0;
  const revenueTotal = roomIdr + bpjsPackageIdr + spillDifferenceIdr + nonRoomRev;
  const costTotal = bedDaysCost + nonRoomCost + refit;
  const round = (n: number) => Math.round(n);
  for (const c of Object.values(byClass)) { c.roomRevenueIdr = round(c.roomRevenueIdr); c.costIdr = round(c.costIdr); }

  return {
    windowStartTick: warmup, windowEndTick: endTick, windowDays,
    byClass,
    occupancy: allBeds > 0 && windowDays > 0 ? allOcc / (allBeds * windowDays) : 0,
    arrived, admitted: admittedInWindow, diverted: diverted.length, divertedByPayer,
    stillQueued: rec.stillQueued, spilledUp,
    revenue: { roomIdr: round(roomIdr), bpjsPackageIdr: round(bpjsPackageIdr), spillDifferenceIdr: round(spillDifferenceIdr), nonRoomIdr: round(nonRoomRev), totalIdr: round(revenueTotal) },
    cost: { bedDaysIdr: round(bedDaysCost), nonRoomIdr: round(nonRoomCost), refitIdr: refit, totalIdr: round(costTotal) },
    marginIdr: round(revenueTotal - costTotal),
    bpjsWithoutTariff, spillRule, unsourcedInputs: UNSOURCED_INPUTS,
  };
}

/** Report straight from a finished scenario state. */
export function scenarioReport(state: HospitalState, cfg: MoneyConfig = {}): ScenarioReport {
  return reportFromRecord(runRecord(state), cfg);
}
