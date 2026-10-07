import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { HospitalState, LearningMemory } from "./state-store.js";
import type { EventQueue } from "./event-queue.js";
import { isDurableQueueEnabled } from "./config.js";
import { initBloodBank } from "./blood-bank.js";
import { initMicroState } from "./microbiology.js";
import { initPathoState } from "./pathology.js";
import { initCssdState } from "./cssd.js";
import { initBiomedState } from "./biomedical-engineering.js";
import { initIpcState } from "./ipc.js";
import { initNutritionState } from "./clinical-nutrition.js";
import { initRtState } from "./radiotherapy.js";
import { initDialysisState } from "./dialysis.js";
import { initScenarioState } from "./scenario.js";

let db: Database.Database | null = null;
let insertStmt: Database.Statement | null = null;
let stmt: ((tick: number, htime: number, type: string, entityType: string, entityId: string, payload: string) => void) | null = null;
let saveSnapStmt: Database.Statement | null = null;
let loadSnapStmt: Database.Statement | null = null;
let listSnapsStmt: Database.Statement | null = null;

export interface JournalRow {
  id: number;
  tick: number;
  timestamp: number;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: string;
  created_at: string;
}

export function initJournal(dbPath?: string): void {
  if (db) closeJournal();
  const dir = dbPath ? path.dirname(dbPath) : ".";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(dbPath ?? "world-journal.db", {});
  db.pragma("journal_mode = DELETE");
  db.pragma("synchronous = NORMAL");
  db.pragma("auto_vacuum = INCREMENTAL");
  db.pragma("page_size = 4096");

  db.exec(`
    CREATE TABLE IF NOT EXISTS world_journal (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tick       INTEGER NOT NULL,
      timestamp  INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL DEFAULT '',
      entity_id  TEXT NOT NULL DEFAULT '',
      payload    TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_journal_tick ON world_journal(tick);
    CREATE INDEX IF NOT EXISTS idx_journal_type ON world_journal(event_type);
    CREATE INDEX IF NOT EXISTS idx_journal_entity ON world_journal(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS world_snapshots (
      tick       INTEGER PRIMARY KEY,
      state      TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  insertStmt = db.prepare(
    "INSERT INTO world_journal (tick, timestamp, event_type, entity_type, entity_id, payload) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt = (tick, htime, type, entityType, entityId, payload) => {
    insertStmt!.run(tick, htime, type, entityType, entityId, payload);
  };

  saveSnapStmt = db.prepare("INSERT OR REPLACE INTO world_snapshots (tick, state) VALUES (?, ?)");
  loadSnapStmt = db.prepare("SELECT tick, state FROM world_snapshots WHERE tick <= ? ORDER BY tick DESC LIMIT 1");
  listSnapsStmt = db.prepare("SELECT tick, created_at FROM world_snapshots ORDER BY tick ASC");
}

export function journalBeginTransaction(): void {
  if (db) db.exec("BEGIN TRANSACTION");
}

export function journalCommitTransaction(): void {
  if (db) db.exec("COMMIT");
}

export function journalAppend(
  tick: number, hospitalTimeMs: number,
  eventType: string,
  entityType: string,
  entityId: string,
  payload: unknown
): void {
  if (stmt) stmt(tick, hospitalTimeMs, eventType, entityType, entityId, JSON.stringify(payload));
}

export function journalQuery(options: {
  limit?: number;
  offset?: number;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  tickMin?: number;
  tickMax?: number;
} = {}): JournalRow[] {
  if (!db) return [];
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.eventType) { where.push("event_type = ?"); params.push(options.eventType); }
  if (options.entityType) { where.push("entity_type = ?"); params.push(options.entityType); }
  if (options.entityId) { where.push("entity_id = ?"); params.push(options.entityId); }
  if (options.tickMin !== undefined) { where.push("tick >= ?"); params.push(options.tickMin); }
  if (options.tickMax !== undefined) { where.push("tick <= ?"); params.push(options.tickMax); }
  const w = where.length > 0 ? "WHERE " + where.join(" AND ") : "";
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;
  return db.prepare(`SELECT * FROM world_journal ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as JournalRow[];
}

export function journalStats(): { total: number; byType: Record<string, number>; firstTick: number | null; lastTick: number | null } {
  if (!db) return { total: 0, byType: {}, firstTick: null, lastTick: null };
  const total = (db.prepare("SELECT COUNT(*) as c FROM world_journal").get() as { c: number }).c;
  const rows = db.prepare("SELECT event_type, COUNT(*) as c FROM world_journal GROUP BY event_type ORDER BY c DESC").all() as { event_type: string; c: number }[];
  const byType: Record<string, number> = {};
  for (const r of rows) byType[r.event_type] = r.c;
  const first = (db.prepare("SELECT MIN(tick) as t FROM world_journal").get() as { t: number | null }).t;
  const last = (db.prepare("SELECT MAX(tick) as t FROM world_journal").get() as { t: number | null }).t;
  return { total, byType, firstTick: first, lastTick: last };
}

const JOURNAL_RETENTION_TICKS = 100;
const DEFAULT_SNAPSHOT_RETENTION_COUNT = 5;

/**
 * ADR-004 Amendment 1: snapshot retention is env-tunable for the 512 MB
 * co-host target, where 5 retained full-state JSON snapshots dominate the
 * journal file. `DR_SNAPSHOT_RETENTION` overrides the default of 5 when it
 * parses as a finite positive number (floored); otherwise 5. Read at call
 * time so tests can toggle it, and unset env is byte-identical to the
 * previous hard-coded constant.
 */
export function snapshotRetentionCount(): number {
  const raw = Number(process.env.DR_SNAPSHOT_RETENTION);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_SNAPSHOT_RETENTION_COUNT;
}

const PURGE_INTERVAL = 50;
let lastPurgeTick = 0;
export function resetJournalPurgeTick(): void { lastPurgeTick = 0; }

const EXPORT_INTERVAL = 500;
let lastExportTick = 0;
export function resetJournalExportTick(): void { lastExportTick = 0; }
let exportDir = "exports";

export function setExportDir(dir: string): void {
  exportDir = dir;
}

export function listExports(): { filename: string; tick: number; sizeBytes: number }[] {
  const dir = exportDir;
  if (!fs.existsSync(dir)) return [];
  try {
    const files = fs.readdirSync(dir).filter(f => f.startsWith("journal-") && f.endsWith(".json")).sort();
    return files.map(f => {
      const tickMatch = f.match(/journal-(\d+)\.json/);
      const tick = tickMatch ? parseInt(tickMatch[1]!, 10) : 0;
      try {
        const stat = fs.statSync(path.join(dir, f));
        return { filename: f, tick, sizeBytes: stat.size };
      } catch { return { filename: f, tick, sizeBytes: 0 }; }
    });
  } catch { return []; }
}

export function journalExportAll(currentTick: number): string | null {
  if (!db) return null;
  try {
    const rows = db.prepare("SELECT * FROM world_journal ORDER BY id ASC").all() as JournalRow[];
    if (rows.length === 0) return null;
    const dir = exportDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `journal-${currentTick}.json`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, JSON.stringify(rows, null, 1));
    return filepath;
  } catch {
    return null;
  }
}

export function journalPurge(currentTick: number): void {
  if (!db) return;
  if (currentTick - lastPurgeTick < PURGE_INTERVAL) return;
  lastPurgeTick = currentTick;
  const cutoff = currentTick - JOURNAL_RETENTION_TICKS;
  if (cutoff > 0) {
    try {
      const deleted = db.prepare("DELETE FROM world_journal WHERE tick < ?").run(cutoff);
      const allSnaps = db.prepare("SELECT tick FROM world_snapshots ORDER BY tick ASC").all() as { tick: number }[];
      const retention = snapshotRetentionCount();
      if (allSnaps.length > retention) {
        const toRemove = allSnaps.slice(0, allSnaps.length - retention);
        for (const s of toRemove) {
          db.prepare("DELETE FROM world_snapshots WHERE tick = ?").run(s.tick);
        }
      }
      if (deleted.changes > 1000) {
        db.pragma("incremental_vacuum");
      }
    } catch { }
  }
}

export function journalExportAndPurge(currentTick: number): void {
  if (!db) return;
  if (currentTick - lastExportTick < EXPORT_INTERVAL) return;
  lastExportTick = currentTick;
  journalExportAll(currentTick);
  journalPurge(currentTick);
}

export function journalHardPurge(): void {
  if (!db) return;
  try {
    const row = db.prepare("SELECT MAX(tick) as t FROM world_journal").get() as { t: number | null } | undefined;
    if (!row || row.t === null) return;
    const cutoff = row.t - 100;
    if (cutoff > 0) {
      db.prepare("DELETE FROM world_journal WHERE tick < ?").run(cutoff);
      db.pragma("incremental_vacuum");
    }
  } catch { }
}

export function journalReplay(tickMax: number, eventTypes?: string[]): JournalRow[] {
  if (!db) return [];
  let sql = "SELECT * FROM world_journal WHERE tick <= ?";
  const params: unknown[] = [tickMax];
  if (eventTypes && eventTypes.length > 0) {
    sql += " AND event_type IN (" + eventTypes.map(() => "?").join(",") + ")";
    params.push(...eventTypes);
  }
  sql += " ORDER BY id ASC";
  return db.prepare(sql).all(...params) as JournalRow[];
}

function mapToArr<K extends string, V>(map: Map<K, V>): [string, V][] {
  return Array.from(map.entries());
}

function arrToMap<K extends string, V>(arr: [string, V][]): Map<K, V> {
  if (!Array.isArray(arr)) return new Map();
  return new Map(arr) as Map<K, V>;
}

function serializeLearning(l: LearningMemory): { byDiagnosis: [string, unknown][] } {
  return {
    byDiagnosis: Array.from(l.byDiagnosis.entries()).map(([code, dx]) => [code, { ...dx, actions: Array.from(dx.actions.entries()) }]),
  };
}

function deserializeLearning(d: { byDiagnosis?: [string, unknown][] } | null): LearningMemory {
  if (!d) return { byDiagnosis: new Map() };
  return {
    byDiagnosis: new Map((d.byDiagnosis ?? []).map(([code, dx]: [string, any]) => [code, { ...dx, actions: new Map(dx.actions ?? []) }])),
  };
}

export function saveSnapshot(tick: number, state: HospitalState, queue?: EventQueue | SnapshotQueueEvent[]): void {
  if (!saveSnapStmt) return;
  const durable = isDurableQueueEnabled();
  const data: Record<string, unknown> = {
    p: mapToArr(state.patients), b: mapToArr(state.beds), e: mapToArr(state.encounters),
    wc: state.wardCapacity, wr: state.waitingRoom,
    lo: mapToArr(state.labOrders), mo: mapToArr(state.medicationOrders),
    nn: mapToArr(state.nurseNotes), po: mapToArr(state.physicianOrders),
    ro: mapToArr(state.radiologyOrders), so: mapToArr(state.surgeryOrders),
    rpo: mapToArr(state.respiratoryOrders), d: mapToArr(state.dietOrders),
    sw: mapToArr(state.socialWorkNotes), et: mapToArr(state.edTriages),
    mc: mapToArr(state.medicalCharts), ch: mapToArr(state.charges),
    ic: mapToArr(state.insuranceClaims), py: mapToArr(state.payments),
    inv: mapToArr(state.inventory), st: mapToArr(state.stockTransactions),
    spec: mapToArr(state.specialtyOrders),
    morgue: state.morgue, morgueCap: state.morgueCapacity,
    mmConf: state._mmConferences, mmLastTick: state._mmLastConferenceTick,
    bloodBank: state._bloodBank,
    micro: { orders: mapToArr(state._microbiology.orders) },
    patho: { orders: mapToArr(state._pathology.orders) },
    cssd: state._cssd,
    biomed: state._biomed,
    ipc: state._ipc,
    nut: state._clinicalNutrition,
    rt: state._radiotherapy,
    dialysis: state._dialysis,
    scenario: state._scenario,
    outcomes: state._outcomeRecords,
    docMem: mapToArr(state._doctorCaseMemory),
    nurseMem: mapToArr(state._nurseCaseMemory),
    pharmMem: mapToArr(state._pharmacyCaseMemory),
    learning: serializeLearning(state._learningMemory),
    opVisits: mapToArr(state._outpatientVisits),
    calTicks: state._calendarTicks,
    icdTop: state._icdTop10,
    rngSeed: state._rngSeed ?? 0,
    agentState: {
      pool: {
        agents: mapToArr(state._agentState.pool.agents),
        assignments: mapToArr(state._agentState.pool.assignments),
      }
    },
    referralState: {
      facilities: mapToArr(state._referralState.facilities),
      letters: mapToArr(state._referralState.letters),
      incomingQueue: state._referralState.incomingQueue,
    },
    // Epic IX M9.3 wave 2: ambulance fleet + dispatches
    ambulanceState: {
      fleet: mapToArr((state as unknown as { _ambulanceState?: { fleet: Map<string, unknown> } })._ambulanceState?.fleet ?? new Map()),
      dispatches: mapToArr((state as unknown as { _ambulanceState?: { dispatches: Map<string, unknown> } })._ambulanceState?.dispatches ?? new Map()),
      counter: (state as unknown as { _ambulanceState?: { counter: number } })._ambulanceState?.counter ?? 0,
    },
    jrState: {
      incidents: mapToArr((state as unknown as { _jrState?: { incidents: Map<string, unknown> } })._jrState?.incidents ?? new Map()),
      counter: (state as unknown as { _jrState?: { counter: number } })._jrState?.counter ?? 0,
    },
  };
  if (durable) {
    // ADR-004 D1: snapshot format version + ordered pending-event list.
    // Insertion order preserved exactly; no re-sorting, no dedup.
    data.v = 2;
    data.queue = extractQueueEvents(queue);
    // ADR-004 D3: plain-data Phase-E macro-coupling fields. Deserialize
    // already reads these keys with defaults; they were simply never
    // written. Scalars only — trivially safe, no semantics change.
    data.admissionMultiplier = state._admissionMultiplier ?? 1.0;
    data.staffAvailabilityModifier = state._staffAvailabilityModifier ?? 1.0;
    data.supplyChainPressure = state._supplyChainPressure ?? 0;
    if (state._activeMacroDisaster !== undefined) {
      data.activeMacroDisaster = state._activeMacroDisaster;
    }
  }
  saveSnapStmt.run(tick, JSON.stringify(data));
}

/** Ordered pending-event entry persisted in v2 snapshots (no ids). */
export interface SnapshotQueueEvent {
  type: string;
  scheduledTick: number;
  data: Record<string, unknown>;
}

/**
 * Read pending events in stored (insertion) order without consuming them.
 * Works on the live EventQueue (via its runtime `events` array) or on a
 * pre-extracted array (tests). Never re-sorts, never dedups, never throws.
 */
function extractQueueEvents(queue?: EventQueue | SnapshotQueueEvent[]): SnapshotQueueEvent[] {
  if (!queue) return [];
  const raw: unknown = Array.isArray(queue)
    ? queue
    : (queue as unknown as { events?: unknown }).events;
  if (!Array.isArray(raw)) return [];
  const out: SnapshotQueueEvent[] = [];
  for (const e of raw as unknown[]) {
    const evt = e as { type?: unknown; scheduledTick?: unknown; data?: unknown };
    if (typeof evt?.type !== "string") continue;
    if (typeof evt?.scheduledTick !== "number" || !Number.isFinite(evt.scheduledTick)) continue;
    const data = (evt.data !== null && typeof evt.data === "object" && !Array.isArray(evt.data))
      ? evt.data as Record<string, unknown>
      : {};
    out.push({ type: evt.type, scheduledTick: evt.scheduledTick, data });
  }
  return out;
}

/**
 * Validate a deserialized queue payload. Returns the ordered event list
 * (possibly empty). Never throws on missing/malformed input — old snapshots
 * without `v`/`queue` yield an empty list.
 */
function extractStoredQueue(d: unknown): SnapshotQueueEvent[] {
  if (!d || typeof d !== "object") return [];
  const raw = (d as { queue?: unknown }).queue;
  if (!Array.isArray(raw)) return [];
  return extractQueueEvents(raw as SnapshotQueueEvent[]);
}

export interface SnapshotInfo {
  tick: number;
  state: HospitalState | null;
}

export function loadNearestSnapshot(tick: number): SnapshotInfo {
  if (!loadSnapStmt) return { tick, state: null };
  const row = loadSnapStmt.get(tick) as { tick: number; state: string } | undefined;
  if (!row) return { tick, state: null };
  const state = deserializeState(row.state);
  // ADR-004 review follow-up: strip the transient durable-queue props here
  // (right after deserialize) so NO reader except the resume path ever sees
  // them (API/export/snapshot readers get a clean HospitalState). The payload
  // is stashed in a WeakMap keyed by the state object for resumeWorld to
  // consume; resumeWorld keeps its own stripping as belt-and-braces.
  const rec = state as unknown as Record<string, unknown>;
  const queued = rec.__durableQueue as SnapshotQueueEvent[] | undefined;
  const version = rec.__snapshotV;
  delete rec.__durableQueue;
  delete rec.__snapshotV;
  if (Array.isArray(queued)) stashedQueueByState.set(state, queued);
  stashedVersionByState.set(state, version);
  return { tick: row.tick, state };
}

// Transient durable-queue payload stashed by loadNearestSnapshot for the
// resume path (see above). WeakMap: no lifetime impact, invisible to
// enumeration/spread/JSON — only an explicit accessor can retrieve it.
const stashedQueueByState = new WeakMap<object, SnapshotQueueEvent[]>();
const stashedVersionByState = new WeakMap<object, unknown>();

/**
 * Retrieve the stashed durable-queue payload for a state object returned by
 * loadNearestSnapshot. Returns null when the state did not come from
 * loadNearestSnapshot. Never throws. Idempotent (entry is kept, so repeated
 * resumes of the same snapshot behave identically).
 */
export function getStashedSnapshotQueue(state: HospitalState): { queue: SnapshotQueueEvent[]; version: unknown } | null {
  const q = stashedQueueByState.get(state);
  if (q === undefined) return null;
  return { queue: q, version: stashedVersionByState.get(state) };
}

export function listSnapshots(): { tick: number; createdAt: string }[] {
  if (!listSnapsStmt) return [];
  const rows = listSnapsStmt.all() as { tick: number; created_at: string }[];
  return rows.map(r => ({ tick: r.tick, createdAt: r.created_at }));
}

export const SNAPSHOT_INTERVAL = 100;

function deserializeState(json: string): HospitalState {
  const d = JSON.parse(json);

  const state = {
    patients: arrToMap(d.p), beds: arrToMap(d.b), encounters: arrToMap(d.e),
    wardCapacity: d.wc, waitingRoom: d.wr,
    labOrders: arrToMap(d.lo), medicationOrders: arrToMap(d.mo),
    nurseNotes: arrToMap(d.nn), physicianOrders: arrToMap(d.po),
    radiologyOrders: arrToMap(d.ro), surgeryOrders: arrToMap(d.so),
    respiratoryOrders: arrToMap(d.rpo), dietOrders: arrToMap(d.d),
    socialWorkNotes: arrToMap(d.sw), edTriages: arrToMap(d.et),
    medicalCharts: arrToMap(d.mc), charges: arrToMap(d.ch),
    insuranceClaims: arrToMap(d.ic), payments: arrToMap(d.py),
    inventory: arrToMap(d.inv), stockTransactions: arrToMap(d.st),
    specialtyOrders: arrToMap(d.spec ?? []),
    _agentState: {
      pool: {
        agents: arrToMap(d.agentState?.pool?.agents ?? []),
        assignments: arrToMap(d.agentState?.pool?.assignments ?? []),
      }
    },
    _referralState: {
      facilities: arrToMap(d.referralState?.facilities ?? []),
      letters: arrToMap(d.referralState?.letters ?? []),
      incomingQueue: d.referralState?.incomingQueue ?? [],
    },
    // Epic IX M9.3 wave 2: additive fields — safe for pre-wave snapshots
    _ambulanceState: {
      fleet: arrToMap(d.ambulanceState?.fleet ?? []),
      dispatches: arrToMap(d.ambulanceState?.dispatches ?? []),
      counter: d.ambulanceState?.counter ?? 0,
    },
    _jrState: {
      incidents: arrToMap(d.jrState?.incidents ?? []),
      counter: d.jrState?.counter ?? 0,
    },
    _icdTop10: d.icdTop ?? null,
    _doctorCaseMemory: arrToMap(d.docMem ?? []),
    _nurseCaseMemory: arrToMap(d.nurseMem ?? []),
    _outcomeRecords: d.outcomes ?? [],
    _pharmacyCaseMemory: arrToMap(d.pharmMem ?? []),
    _learningMemory: deserializeLearning(d.learning),
    _outpatientVisits: arrToMap(d.opVisits ?? []),
    _calendarTicks: d.calTicks ?? 0,
    morgue: d.morgue ?? [],
    morgueCapacity: d.morgueCap ?? 10,
    _mmConferences: d.mmConf ?? [],
    _mmLastConferenceTick: d.mmLastTick ?? 0,
    _bloodBank: d.bloodBank ?? initBloodBank(),
    _microbiology: d.micro ? { orders: arrToMap(d.micro.orders ?? []) } : initMicroState(),
    _pathology: d.patho ? { orders: arrToMap(d.patho.orders ?? []) } : initPathoState(),
    _cssd: d.cssd ?? initCssdState(),
    _biomed: d.biomed ?? initBiomedState(),
    _ipc: d.ipc ?? initIpcState(),
    _clinicalNutrition: d.nut ?? initNutritionState(),
    _radiotherapy: d.rt ?? initRtState(),
    _dialysis: d.dialysis ?? initDialysisState(),
    _scenario: d.scenario ?? initScenarioState(),
    _admissionMultiplier: d.admissionMultiplier ?? 1.0,
    _staffAvailabilityModifier: d.staffAvailabilityModifier ?? 1.0,
    _supplyChainPressure: d.supplyChainPressure ?? 0,
    _activeMacroDisaster: d.activeMacroDisaster ?? undefined,
    _rngSeed: d.rngSeed ?? 0,
  } as HospitalState & { __durableQueue: SnapshotQueueEvent[]; __snapshotV: unknown };
  // ADR-004 D1: carry the ordered pending-event list + format version on the
  // deserialized state for the resume path (resumeWorld consumes and strips
  // these transient props). Old snapshots without `v`/`queue` yield an empty
  // list here — never throw. The ONE stderr warning fires in resumeWorld, so
  // read-only snapshot loads (API/export) stay quiet.
  (state as { __durableQueue: SnapshotQueueEvent[] }).__durableQueue = extractStoredQueue(d);
  (state as { __snapshotV: unknown }).__snapshotV = (d as { v?: unknown }).v;
  return state;
}

export function closeJournal(): void {
  if (db) { db.close(); db = null; insertStmt = null; stmt = null; saveSnapStmt = null; loadSnapStmt = null; listSnapsStmt = null; }
}
