/**
 * Kamar Jenazah & Forensik Workflow — Epic VI M6.2 (ADR-017)
 *
 * Handles post-mortem processes:
 * - Body registration in the mortuary (kamar jenazah)
 * - Forensic case flagging for suspicious/unnatural deaths
 * - Death certificate tracking
 * - Auto-release after storage period
 */
import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import type { EventQueue } from "./event-queue.js";
import type { MorgueRecord } from "./state-store.js";

export type ForensicFlag = "none" | "suspicious" | "legal_hold" | "autopsy_required";
export type BodyStatus = "received" | "stored" | "autopsy_done" | "released";

export interface KamarJenazahRecord {
  id: string;
  morgueRecordId: string;
  patientId: string;
  encounterId: string;
  admittedTick: number;
  releasedTick: number | null;
  status: BodyStatus;
  forensicFlag: ForensicFlag;
  forensicReason?: string;
  causeOfDeathCertified: boolean;
}

export interface KamarJenazahState {
  records: Map<string, KamarJenazahRecord>;
  counter: number;
}

const STORAGE_DAYS_MAX = 30; // max days a body is stored before auto-release
const TICKS_PER_DAY = 1440;
const AUTO_RELEASE_TICKS = STORAGE_DAYS_MAX * TICKS_PER_DAY;

// Suspicious death triggers per Indonesian forensic protocol
const SUSPICIOUS_ICDS = new Set(["X85", "X90", "Y87", "Y35", "S00", "S01", "S02", "T00", "T07", "T74", "T75"]);

export function initKamarJenazahState(): KamarJenazahState {
  return { records: new Map(), counter: 0 };
}

export function registerBody(
  state: HospitalState,
  morgueRecord: MorgueRecord,
  clockTick: number
): string {
  const kujState = (state as unknown as { _kamarJenazahState?: KamarJenazahState })._kamarJenazahState;
  if (!kujState) return "";

  const icdPrefix = morgueRecord.icdCode.substring(0, 3);
  const isSuspicious = SUSPICIOUS_ICDS.has(icdPrefix);
  const recordId = `KJ-${String(kujState.counter++).padStart(4, "0")}`;

  kujState.records.set(recordId, {
    id: recordId,
    morgueRecordId: morgueRecord.encounterId,
    patientId: morgueRecord.patientId,
    encounterId: morgueRecord.encounterId,
    admittedTick: clockTick,
    releasedTick: null,
    status: "received" as BodyStatus,
    forensicFlag: isSuspicious ? "suspicious" : "none",
    forensicReason: isSuspicious ? `ICD ${morgueRecord.icdCode} triggers forensic review` : undefined,
    causeOfDeathCertified: false,
  });

  return recordId;
}

export function kamarJenazahHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const kujState = (state as unknown as { _kamarJenazahState?: KamarJenazahState })._kamarJenazahState;
  if (!kujState) return state;

  const newRecords = new Map(kujState.records);
  const currentTick = clock.tick;

  for (const [id, rec] of newRecords) {
    if (rec.status === "released") continue;
    const storageTicks = currentTick - rec.admittedTick;
    if (storageTicks >= AUTO_RELEASE_TICKS) {
      newRecords.set(id, { ...rec, status: "released" as BodyStatus, releasedTick: currentTick });
    }
  }

  return Object.assign({}, state, {
    _kamarJenazahState: { records: newRecords, counter: kujState.counter },
  }) as HospitalState;
}

export function getKamarJenazahRecords(state: HospitalState): Map<string, KamarJenazahRecord> {
  return (state as unknown as { _kamarJenazahState?: KamarJenazahState })._kamarJenazahState?.records ?? new Map();
}
