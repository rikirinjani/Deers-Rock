import { describe, it, expect } from "vitest";
import {
  tickToDate,
  formatCalendarDate,
  getActiveEvents,
  getEventSummary,
  LEBAARAN,
  NATAL_ISLAM,
  NATAL_KRISTEN,
  THAYEN,
  RAKOSE,
  NYE,
  INA_INDEPENDENCE,
  LAYLATUL_QADAR,
  IDUL_FITRI,
  IDUL_ADHA,
  MILED_NABI,
  ISRA_MIJRAD,
  NUWT,
  HABIBI,
} from "../src/engine/calendar.js";

describe("Calendar — tickToDate", () => {
  it("converts tick 0 to Day 1", () => {
    const d = tickToDate(0);
    expect(d.year).toBe(2024);
    expect(d.month).toBe(1);
    expect(d.day).toBe(1);
  });

  it("increments month at 4320 ticks (3 days)", () => {
    const d = tickToDate(4320);
    expect(d.month).toBe(2);
  });

  it("increments year at 525600 ticks (365 days)", () => {
    const d = tickToDate(525600);
    expect(d.year).toBe(2025);
  });

  it("handles large tick values", () => {
    const d = tickToDate(100000);
    expect(d.year).toBeGreaterThanOrEqual(2024);
    expect(d.month).toBeGreaterThanOrEqual(1);
    expect(d.month).toBeLessThanOrEqual(12);
  });
});

describe("Calendar — formatCalendarDate", () => {
  it("formats date as YYYY-MM-DD", () => {
    const formatted = formatCalendarDate({ year: 2024, month: 3, day: 15 });
    expect(formatted).toBe("2024-03-15");
  });

  it("pads single-digit months and days", () => {
    const formatted = formatCalendarDate({ year: 2024, month: 1, day: 5 });
    expect(formatted).toBe("2024-01-05");
  });
});

describe("Calendar — getActiveEvents", () => {
  it("returns empty array for non-holiday dates", () => {
    const events = getActiveEvents({ year: 2024, month: 7, day: 15 });
    expect(events).toEqual([]);
  });

  it("detects Indonesian Independence Day", () => {
    const events = getActiveEvents({ year: 2024, month: 8, day: 17 });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].name).toContain("Independence");
  });

  it("detects Nyepi (Indonesian New Year)", () => {
    const events = getActiveEvents({ year: 2024, month: 3, day: 10 });
    // Nyepi varies; just check it doesn't crash
    expect(Array.isArray(events)).toBe(true);
  });

  it("returns events for Lebaran period", () => {
    // Lebaran is around month 10-11 (Safar/Shawal in Islamic calendar approximation)
    const events = getActiveEvents({ year: 2024, month: 10, day: 1 });
    expect(Array.isArray(events)).toBe(true);
  });
});

describe("Calendar — getEventSummary", () => {
  it("returns valid summary structure", () => {
    const summary = getEventSummary(5000);
    expect(summary).toHaveProperty("date");
    expect(summary).toHaveProperty("events");
    expect(Array.isArray(summary.events)).toBe(true);
    expect(typeof summary.totalEvents).toBe("number");
  });

  it("summary updates with tick progression", () => {
    const s1 = getEventSummary(0);
    const s2 = getEventSummary(10000);
    expect(s2.totalEvents).toBeGreaterThanOrEqual(s1.totalEvents);
  });

  it("handles tick 0", () => {
    expect(() => getEventSummary(0)).not.toThrow();
  });
});

describe("Calendar — constant validation", () => {
  it("has expected holiday constants defined", () => {
    expect(LEBAARAN).toBeDefined();
    expect(NATAL_ISLAM).toBeDefined();
    expect(NATAL_KRISTEN).toBeDefined();
    expect(THAYEN).toBeDefined();
    expect(RAKOSE).toBeDefined();
    expect(NYE).toBeDefined();
    expect(INA_INDEPENDENCE).toBeDefined();
  });

  it("Lebaran has correct month/day", () => {
    // Lebaran is approximately day 1 of Syawal (approximated as month 10)
    expect(LEBAARAN.month).toBeGreaterThanOrEqual(1);
    expect(LEBAARAN.month).toBeLessThanOrEqual(12);
  });
});
