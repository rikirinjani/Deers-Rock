import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

let db: Database.Database | null = null;
let insertStmt: Database.Statement | null = null;
let stmt: ((tick: number, htime: number, type: string, entityType: string, entityId: string, payload: string) => void) | null = null;

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
  `);

  insertStmt = db.prepare(
    "INSERT INTO world_journal (tick, timestamp, event_type, entity_type, entity_id, payload) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt = (tick, htime, type, entityType, entityId, payload) => {
    insertStmt!.run(tick, htime, type, entityType, entityId, payload);
  };
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

export function closeJournal(): void {
  if (db) { db.close(); db = null; insertStmt = null; stmt = null; }
}
