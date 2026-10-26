/**
 * Kamar Jenazah & Forensik Workflow — Epic VI M6.2 (ADR-017)
 *
 * Handles post-mortem processes:
 * - Body registration in the mortuary (kamar jenazah)
 * - Forensic case flagging for suspicious/unnatural deaths
 * - Death certificate tracking
 * - Release to family (or auto-release after the storage cap)
 *
 * Workflow (deterministic, tick-threshold based — no rng):
 *   natural death:   received → stored (+INTAKE) → certified (+CERTIFY)
 *                    → released to family (+FAMILY_RELEASE)
 *   unnatural death: received → stored, forensicFlag legal_hold (awaiting the
 *                    police visum et repertum request) → autopsy_required
 *                    (+LEGAL_HOLD) → autopsy_done + certified (+AUTOPSY)
 *                    → released (+FAMILY_RELEASE after autopsy)
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
// Workflow durations in ticks (1 tick = 1 sim-minute), measured from admittedTick.
export const KJ_INTAKE_TICKS = 60;          // registration + cold storage
export const KJ_CERTIFY_TICKS = 120;        // surat keterangan kematian signed
export const KJ_FAMILY_RELEASE_TICKS = 720; // family collects the body (~12 h)
export const KJ_LEGAL_HOLD_TICKS = 240;     // police request for visum et repertum
export const KJ_AUTOPSY_TICKS = 1440;       // forensic autopsy completed (~1 day)

// Suspicious death triggers per Indonesian forensic protocol
const SUSPICIOUS_ICDS = new Set(["X85", "X90", "Y87", "Y35", "S00", "S01", "S02", "T00", "T07", "T74", "T75"]);

/** Unnatural death (mati tidak wajar): injury/poisoning (S, T) or external cause (V–Y) chapters. */
export function isUnnaturalDeath(icdCode: string): boolean {
  return SUSPICIOUS_ICDS.has(icdCode.substring(0, 3)) || /^[STVWXY]/.test(icdCode);
}

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

  const isSuspicious = isUnnaturalDeath(morgueRecord.icdCode);
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
    const next = advanceBody(rec, currentTick);
    if (next !== rec) newRecords.set(id, next);
  }

  return Object.assign({}, state, {
    _kamarJenazahState: { records: newRecords, counter: kujState.counter },
  }) as HospitalState;
}

/** Advance one body through the workflow as far as currentTick allows. */
export function advanceBody(rec: KamarJenazahRecord, currentTick: number): KamarJenazahRecord {
  const age = currentTick - rec.admittedTick;
  let r = rec;
  if (r.status === "received" && age >= KJ_INTAKE_TICKS) {
    r = { ...r, status: "stored", forensicFlag: r.forensicFlag === "suspicious" ? "legal_hold" : r.forensicFlag };
  }
  if (r.forensicFlag === "none") {
    if (r.status === "stored" && !r.causeOfDeathCertified && age >= KJ_CERTIFY_TICKS) r = { ...r, causeOfDeathCertified: true };
    if (r.status === "stored" && r.causeOfDeathCertified && age >= KJ_FAMILY_RELEASE_TICKS) r = { ...r, status: "released", releasedTick: currentTick };
  } else {
    if (r.forensicFlag === "legal_hold" && age >= KJ_LEGAL_HOLD_TICKS) {
      r = { ...r, forensicFlag: "autopsy_required" };
    }
    if (r.forensicFlag === "autopsy_required" && r.status === "stored" && age >= KJ_LEGAL_HOLD_TICKS + KJ_AUTOPSY_TICKS) {
      r = { ...r, status: "autopsy_done", causeOfDeathCertified: true };
    }
    if (r.status === "autopsy_done" && age >= KJ_LEGAL_HOLD_TICKS + KJ_AUTOPSY_TICKS + KJ_FAMILY_RELEASE_TICKS) {
      r = { ...r, status: "released", releasedTick: currentTick };
    }
  }
  // Storage cap: unclaimed bodies are released after STORAGE_DAYS_MAX.
  if (r.status !== "released" && age >= AUTO_RELEASE_TICKS) r = { ...r, status: "released", releasedTick: currentTick };
  return r;
}

export function getKamarJenazahRecords(state: HospitalState): Map<string, KamarJenazahRecord> {
  return (state as unknown as { _kamarJenazahState?: KamarJenazahState })._kamarJenazahState?.records ?? new Map();
}
