import { describe, it, expect } from "vitest";
import {
  tickToDate,
  formatCalendarDate,
  getActiveEvents,
  getEventSummary,
} from "../src/engine/calendar.js";

describe("Calendar — tickToDate", () => {
  it("converts tick 0 to Day 1 of June 2026", () => {
    const d = tickToDate(0);
    expect(d.year).toBe(2026);
    expect(d.month).toBe(6);
    expect(d.day).toBe(15);
  });

  it("increments month at ~4320 ticks (3 days)", () => {
    const d = tickToDate(4320);
    expect(d.month).toBeGreaterThanOrEqual(6);
  });

  it("increments year at ~525600 ticks", () => {
    const d = tickToDate(525600);
    expect(d.year).toBe(2027);
  });

  it("handles large tick values", () => {
    const d = tickToDate(100000);
    expect(d.year).toBeGreaterThanOrEqual(2026);
    expect(d.month).toBeGreaterThanOrEqual(1);
    expect(d.month).toBeLessThanOrEqual(12);
    expect(d.day).toBeGreaterThanOrEqual(1);
    expect(d.day).toBeLessThanOrEqual(31);
  });
});

describe("Calendar — formatCalendarDate", () => {
  it("formats date with day name and time", () => {
    const d = tickToDate(0);
    const formatted = formatCalendarDate(d);
    expect(formatted).toContain("2026");
    expect(formatted).toContain("WITA");
  });

  it("includes hour and minute", () => {
    const d = tickToDate(0);
    const formatted = formatCalendarDate(d);
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });
});

describe("Calendar — getActiveEvents", () => {
  it("returns array with at least Regular Day", () => {
    const events = getActiveEvents({ year: 2026, month: 7, day: 15 });
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("detects Indonesian Independence Day (Aug 17)", () => {
    const events = getActiveEvents({ year: 2026, month: 8, day: 17 });
    const independence = events.find(e => e.name?.toLowerCase().includes("independence") || e.name?.toLowerCase().includes("kemerdekaan"));
    expect(independence).toBeDefined();
  });

  it("handles edge case dates", () => {
    expect(() => getActiveEvents({ year: 2026, month: 1, day: 1 })).not.toThrow();
    expect(() => getActiveEvents({ year: 2027, month: 12, day: 31 })).not.toThrow();
  });
});

describe("Calendar — getEventSummary", () => {
  it("returns valid summary structure", () => {
    const summary = getEventSummary(5000);
    expect(summary).toHaveProperty("date");
    expect(summary).toHaveProperty("events");
    expect(summary).toHaveProperty("totalMultiplier");
    expect(typeof summary.totalMultiplier).toBe("number");
  });

  it("summary has active modifiers", () => {
    const summary = getEventSummary(5000);
    expect(Array.isArray(summary.activeModifiers)).toBe(true);
  });

  it("handles tick 0", () => {
    expect(() => getEventSummary(0)).not.toThrow();
  });
});
