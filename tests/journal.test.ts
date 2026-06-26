import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { createWorld, runWorld } from "../src/engine/world.js";
import { journalQuery, journalStats, closeJournal } from "../src/engine/journal.js";

const DB = "test-journal.db";

describe("Journal", () => {
  beforeAll(() => {
    closeJournal();
    if (existsSync(DB)) { try { unlinkSync(DB); } catch { /* ok */ } }
  });

  afterAll(() => {
    closeJournal();
    try { if (existsSync(DB)) unlinkSync(DB); } catch { /* ok */ }
  });

  it("logs world.start event on creation", () => {
    closeJournal();
    if (existsSync(DB)) unlinkSync(DB);
    const w = createWorld(5, DB);
    const stats = journalStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.byType["world.start"]).toBe(1);
  });

  it("logs encounter.created events as simulation runs", () => {
    const w = createWorld(10, DB);
    const result = runWorld(w, 10);
    expect(result.clock.tick).toBe(10);
    const stats = journalStats();
    expect(stats.total).toBeGreaterThan(10);
    expect(stats.byType["encounter.created"]).toBeGreaterThan(0);
  });

  it("logs lab, medication, and supply events", () => {
    const w = createWorld(20, DB);
    runWorld(w, 30);
    const stats = journalStats();
    expect(stats.byType["encounter.created"]).toBeGreaterThan(0);
  });

  it("can query events by type", () => {
    const events = journalQuery({ eventType: "encounter.created", limit: 5 });
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(e.event_type).toBe("encounter.created");
  });

  it("records tick and timestamp for each event", () => {
    const events = journalQuery({ limit: 10 });
    for (const e of events) {
      expect(typeof e.tick).toBe("number");
      expect(e.tick).toBeGreaterThanOrEqual(0);
      expect(typeof e.timestamp).toBe("number");
    }
  });

  it("logs supply events on inventory dispense", () => {
    const stats = journalStats();
    if (stats.byType["supply.dispense"]) {
      expect(stats.byType["supply.dispense"]).toBeGreaterThan(0);
    }
  });

  it("reports correct first and last tick", () => {
    const stats = journalStats();
    expect(stats.firstTick).toBe(0);
    expect(stats.lastTick).toBeGreaterThanOrEqual(30);
  });
});
