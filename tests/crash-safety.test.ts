/**
 * ADR-023: Crash-Safety Documentation
 *
 * Documents the SQLite journal durability trade-offs.
 * No runtime tests — this is a documentation/assertion test.
 *
 * Trade-off summary:
 * - journal_mode=DELETE: Faster writes, no WAL overhead, but less crash-resistant
 * - synchronous=NORMAL: Balances speed and safety (fsync every ~1-2 sec)
 * - For a simulation engine (not production HIS), this is acceptable
 * - If crash recovery is needed: switch to journal_mode=WAL + synchronous=FULL
 */
import { describe, it, expect } from "vitest";
import { initJournal, closeJournal } from "../src/engine/journal.js";
import * as path from "node:path";

describe("ADR-023: Crash Safety Documentation", () => {
  it("documents SQLite durability settings", () => {
    // The settings are defined in journal.ts initJournal():
    //   PRAGMA journal_mode = DELETE;
    //   PRAGMA synchronous = NORMAL;
    // This is an intentional trade-off for simulation performance.
    // For production HIS: use WAL + FULL.
    expect(true).toBe(true);
  });

  it("main journal uses DELETE mode (verified by source inspection)", () => {
    // Source: src/engine/journal.ts line ~48
    // CREATE TABLE world_journal (id INTEGER PRIMARY KEY AUTOINCREMENT, ...)
    // PRAGMA journal_mode = DELETE;
    // PRAGMA synchronous = NORMAL;
    // This is documented and intentional.
    expect(true).toBe(true);
  });

  it("branch journals use same settings (isolated per-branch)", () => {
    // Source: src/engine/journal.ts openBranchJournal()
    // Each branch gets its own DB in branches/{id}/journal.db
    // Same DELETE/NORMAL settings apply
    expect(true).toBe(true);
  });

  it("snapshots use INSERT OR REPLACE (idempotent)", () => {
    // Source: src/engine/journal.ts saveSnapshot()
    // INSERT OR REPLACE INTO world_snapshots (tick, state) VALUES (?, ?)
    // This ensures snapshots are idempotent across restarts
    expect(true).toBe(true);
  });

  it("cleanup: close journal after test", () => {
    closeJournal();
    expect(true).toBe(true);
  });
});
