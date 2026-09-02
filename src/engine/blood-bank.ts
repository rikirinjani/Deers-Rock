import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { BloodType, Rhesus } from "../patient/schema.js";

export interface BloodUnit {
  id: string;
  bloodType: BloodType;
  rhesus: Rhesus;
  status: "available" | "crossmatched" | "issued" | "transfused" | "expired" | "wasted";
  collectedAt: number;
  expiresAt: number;
  patientId: string | null;
  encounterId: string | null;
}

export interface TransfusionRecord {
  id: string;
  encounterId: string;
  patientId: string;
  bloodType: string;
  rhesus: string;
  unitCount: number;
  indication: string;
  orderedAt: number;
  transfusedAt: number | null;
  reaction: boolean;
}

export interface BloodBankState {
  units: BloodUnit[];
  transfusionRecords: TransfusionRecord[];
}

const BLOOD_TYPES: BloodType[] = ["A", "B", "AB", "O"];
const RHESUS: Rhesus[] = ["+", "-"];
const RESTOCK_INTERVAL = 20;
const EXPIRY_TICKS = 240;
const UNITS_PER_RESTOCK = 4;

let unitCounter = 0;
let txCounter = 0;
export function resetBloodBankCounters(): void { unitCounter = 0; txCounter = 0; }

export function initBloodBank(): BloodBankState {
  const units: BloodUnit[] = [];
  for (let i = 0; i < 3; i++) {
    for (const bt of BLOOD_TYPES) {
      for (const rh of RHESUS) {
        unitCounter++;
        units.push({
          id: `BLD-${String(unitCounter).padStart(4, "0")}`,
          bloodType: bt, rhesus: rh,
          status: "available",
          collectedAt: 0, expiresAt: EXPIRY_TICKS,
          patientId: null, encounterId: null,
        });
      }
    }
  }
  return { units, transfusionRecords: [] };
}

export function bloodBankHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick % RESTOCK_INTERVAL !== 0) return state;

  const bb = state._bloodBank ?? initBloodBank();
  const newUnits = [...bb.units];

  for (let i = 0; i < UNITS_PER_RESTOCK; i++) {
    unitCounter++;
    const bt = BLOOD_TYPES[unitCounter % 4]!;
    const rh = unitCounter % 8 < 4 ? "+" : "-";
    newUnits.push({
      id: `BLD-${String(unitCounter).padStart(4, "0")}`,
      bloodType: bt as BloodType,
      rhesus: rh as Rhesus,
      status: "available",
      collectedAt: clock.hospitalTimeMs,
      expiresAt: clock.tick + EXPIRY_TICKS,
      patientId: null, encounterId: null,
    });
  }

  const expired: string[] = [];
  for (const u of newUnits) {
    if (u.status === "available" && clock.tick > u.expiresAt) {
      expired.push(u.id);
    }
  }

  return {
    ...state,
    _bloodBank: { units: newUnits, transfusionRecords: bb.transfusionRecords },
  };
}

function isCompatible(donorBloodType: BloodType, donorRhesus: Rhesus, recipientBloodType: BloodType, recipientRhesus: Rhesus): boolean {
  if (recipientRhesus === "-" && donorRhesus === "+") return false;
  if (donorBloodType === "O") return true;
  if (donorBloodType === "A") return recipientBloodType === "A" || recipientBloodType === "AB";
  if (donorBloodType === "B") return recipientBloodType === "B" || recipientBloodType === "AB";
  if (donorBloodType === "AB") return recipientBloodType === "AB";
  return false;
}

export function findCompatibleUnits(bb: BloodBankState, patientBloodType: BloodType, patientRhesus: Rhesus, count: number = 1): BloodUnit[] {
  const available = bb.units.filter(u => u.status === "available" && isCompatible(u.bloodType, u.rhesus, patientBloodType, patientRhesus));
  return available.slice(0, count);
}

export function issueBlood(state: HospitalState, patientId: string, encounterId: string, units: BloodUnit[]): HospitalState {
  const bb = state._bloodBank;
  if (!bb) return state;
  const unitIds = new Set(units.map(u => u.id));
  const newUnits = bb.units.map(u => unitIds.has(u.id)
    ? { ...u, status: "issued" as const, patientId, encounterId }
    : u);
  return { ...state, _bloodBank: { ...bb, units: newUnits } };
}

export function recordTransfusion(state: HospitalState, encounterId: string, patientId: string, bloodType: string, rhesus: string, unitCount: number, indication: string, clock: Clock): HospitalState {
  const bb = state._bloodBank;
  if (!bb) return state;
  txCounter++;
  const rec: TransfusionRecord = {
    id: `TX-${String(txCounter).padStart(4, "0")}`,
    encounterId, patientId, bloodType, rhesus, unitCount, indication,
    orderedAt: clock.hospitalTimeMs,
    transfusedAt: clock.hospitalTimeMs,
    reaction: false,
  };
  return { ...state, _bloodBank: { ...bb, transfusionRecords: [...bb.transfusionRecords, rec] } };
}

export function getBloodBankSummary(bb: BloodBankState): { total: number; byType: Record<string, number>; available: number } {
  const byType: Record<string, number> = {};
  let available = 0;
  for (const u of bb.units) {
    const key = `${u.bloodType}${u.rhesus}`;
    byType[key] = (byType[key] ?? 0) + 1;
    if (u.status === "available") available++;
  }
  return { total: bb.units.length, byType, available };
}
