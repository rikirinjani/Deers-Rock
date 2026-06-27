import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { HospitalState } from "./state-store.js";

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
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

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
  return new Map(arr) as Map<K, V>;
}

export function saveSnapshot(tick: number, state: HospitalState): void {
  if (!saveSnapStmt) return;
  const data = {
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
  };
  saveSnapStmt.run(tick, JSON.stringify(data));
}

export interface SnapshotInfo {
  tick: number;
  state: HospitalState | null;
}

export function loadNearestSnapshot(tick: number): SnapshotInfo {
  if (!loadSnapStmt) return { tick, state: null };
  const row = loadSnapStmt.get(tick) as { tick: number; state: string } | undefined;
  if (!row) return { tick, state: null };
  return { tick: row.tick, state: deserializeState(row.state) };
}

export function listSnapshots(): { tick: number; createdAt: string }[] {
  if (!listSnapsStmt) return [];
  const rows = listSnapsStmt.all() as { tick: number; created_at: string }[];
  return rows.map(r => ({ tick: r.tick, createdAt: r.created_at }));
}

export const SNAPSHOT_INTERVAL = 20;

function deserializeState(json: string): HospitalState {
  const d = JSON.parse(json);
  return {
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
    _agentState: { pool: { agents: new Map(), assignments: new Map() } },
    _referralState: { facilities: new Map(), letters: new Map(), incomingQueue: [] },
    _icdTop10: null,
    _doctorCaseMemory: new Map(),
    _nurseCaseMemory: new Map(),
    _outcomeRecords: [],
    _pharmacyCaseMemory: new Map(),
    _learningMemory: { byDiagnosis: new Map() },
    _outpatientVisits: new Map(),
    _calendarTicks: 0,
    morgue: [],
    morgueCapacity: 10,
  };
}

export function closeJournal(): void {
  if (db) { db.close(); db = null; insertStmt = null; stmt = null; saveSnapStmt = null; loadSnapStmt = null; listSnapsStmt = null; }
}
