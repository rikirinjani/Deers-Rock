/**
 * Epic X M10.5b slice 6: US 12-hour shifts. The rotation is a coverage-parity
 * placeholder (see us-shifts.ts); these tests pin the shift clock, coverage,
 * rest, and that fatigue illness does not trigger at the end of a normal shift.
 */
import { describe, it, expect, afterEach } from "vitest";
import { usShiftAt, usRosteredShift, USShiftSchedule } from "../src/locale/us-shifts.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { getShiftSchedule } from "../src/locale/registry.js";
import { shiftAt, rosteredShift, rosterStatus } from "../src/agent/roster.js";
import { FATIGUE_CRITICAL } from "../src/agent/system.js";
import { generateAgentPool, resetAgentCounter } from "../src/agent/generator.js";
import type { Shift } from "../src/agent/types.js";

const H = 60, DAY = 1440;
const lcg = (seed: number) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
afterEach(() => { resetLocale(); resetAgentCounter(); });

describe("US shift clock", () => {
  it("maps ticks to a 07-19 day and 19-07 night from the 18:00 Monday start", () => {
    expect(usShiftAt(0)).toMatchObject({ shift: "pagi", rosterDay: 0, dayOfWeek: 0 });      // Mon 18:00 still day
    expect(usShiftAt(H - 1)).toMatchObject({ shift: "pagi" });                             // Mon 18:59
    expect(usShiftAt(H)).toMatchObject({ shift: "malam", rosterDay: 0 });                  // Mon 19:00
    expect(usShiftAt(13 * H - 1)).toMatchObject({ shift: "malam", rosterDay: 0 });         // Tue 06:59 still Monday's night
    expect(usShiftAt(13 * H)).toMatchObject({ shift: "pagi", rosterDay: 1, dayOfWeek: 1 }); // Tue 07:00
    expect(usShiftAt(13 * H + 5 * DAY)).toMatchObject({ dayOfWeek: 6 });                   // Sunday
    const shifts = new Set(Array.from({ length: 3 * DAY }, (_, t) => usShiftAt(t).shift));
    expect(shifts).toEqual(new Set(["pagi", "malam"]));
  });

  it("tracks the minute within the shift", () => {
    expect(usShiftAt(0).minuteInShift).toBe(11 * H);        // Mon 18:00 is 11 h into the day shift
    expect(usShiftAt(H).minuteInShift).toBe(0);              // 19:00 night starts
    expect(usShiftAt(13 * H).minuteInShift).toBe(0);         // 07:00 day starts
    expect(usShiftAt(13 * H - 1).minuteInShift).toBe(12 * H - 1);
  });

  it("both shifts last 12 hours", () => {
    let day = 0, night = 0;
    for (let t = 0; t < 2 * DAY; t++) (usShiftAt(t).shift === "pagi" ? day++ : night++);
    expect(day).toBe(24 * H);
    expect(night).toBe(24 * H);
  });
});

describe("US rotation", () => {
  const week = (pattern: "rotating4" | "rotating3", team: number, days = 12): Shift[] =>
    Array.from({ length: days }, (_, d) => usRosteredShift(pattern, team, d, d % 7));

  it("every shift of every day is covered by exactly one team (4 teams) and by one agent (3 staff)", () => {
    for (let d = 0; d < 20; d++) {
      for (const [pattern, teams] of [["rotating4", 4], ["rotating3", 3]] as const) {
        const on = Array.from({ length: teams }, (_, t) => usRosteredShift(pattern, t, d, d % 7));
        expect(on.filter(s => s === "pagi")).toHaveLength(1);
        expect(on.filter(s => s === "malam")).toHaveLength(1);
        expect(on.filter(s => s === "siang")).toHaveLength(0);
      }
    }
  });

  it("a night shift is never followed by the next day's day shift", () => {
    for (const pattern of ["rotating4", "rotating3"] as const) {
      for (let team = 0; team < (pattern === "rotating4" ? 4 : 3); team++) {
        const w = week(pattern, team, 40);
        for (let d = 0; d < 39; d++) if (w[d] === "malam") expect(w[d + 1]).not.toBe("pagi");
      }
    }
  });

  it("rotating4 gives one day, one night and two days off in four; day roles work Monday-Friday", () => {
    const w = week("rotating4", 2, 8);
    expect(w.filter(s => s === "libur")).toHaveLength(4);
    for (let d = 0; d < 7; d++) expect(usRosteredShift("day", 0, d, d)).toBe(d >= 5 ? "libur" : "pagi");   // Monday-Friday
  });
});

describe("locale selection and fatigue", () => {
  it("the engine's roster follows the active schedule; reset restores Indonesia", () => {
    expect(shiftAt(0).shift).toBe("siang");
    expect(getShiftSchedule().fatigueCriticalTicks).toBe(FATIGUE_CRITICAL);
    useUSLocale();
    expect(getShiftSchedule().config.countryCode).toBe("US");
    expect(shiftAt(0).shift).toBe("pagi");
    expect(rosteredShift("rotating4", 0, 0, 0)).toBe("pagi");
    resetLocale();
    expect(shiftAt(0).shift).toBe("siang");
    expect(rosteredShift("rotating4", 0, 0, 0)).toBe("pagi");
  });

  it("office (day) roles work 8 hours inside the day shift in the US, the whole pagi in Indonesia", () => {
    const office = { role: "dokter_spesialis", status: { rosterPattern: "day", rosterTeam: 0 } } as never;
    const tue = (h: number, m = 0) => 13 * H + (h - 7) * H + m;    // Tuesday hh:mm
    expect(rosterStatus(office, tue(10)).onDuty).toBe(true);
    expect(rosterStatus(office, tue(13, 30)).onDuty).toBe(true);    // Indonesian pagi ends 14:00
    expect(rosterStatus(office, tue(15, 30)).onDuty).toBe(false);   // siang
    useUSLocale();
    expect(rosterStatus(office, tue(10)).onDuty).toBe(true);
    expect(rosterStatus(office, tue(14, 59)).onDuty).toBe(true);
    expect(rosterStatus(office, tue(15, 1)).onDuty).toBe(false);    // office day over at 15:00
    expect(rosterStatus(office, tue(17)).onDuty).toBe(false);
  });

  it("fatigue thresholds: US warns after 10 h and falls ill past 14 h; Indonesia keeps 7 h and 12 h", () => {
    const us = new USShiftSchedule();
    expect(us.fatigueWarnTicks).toBe(10 * H);
    expect(us.fatigueCriticalTicks).toBe(14 * H);
    expect(getShiftSchedule().fatigueWarnTicks).toBe(7 * H);
    expect(getShiftSchedule().fatigueCriticalTicks).toBe(12 * H);
  });

  it("the fatigue-illness threshold sits above a 12-hour shift (no illness at the end of a normal shift)", () => {
    expect(new USShiftSchedule().fatigueCriticalTicks).toBeGreaterThan(12 * H);
  });

  it("a US pool is on duty in both shifts and no agent works past 12 consecutive hours", () => {
    useUSLocale();
    const pool = generateAgentPool(131, lcg(5));
    const nurses = Array.from(pool.agents.values()).filter(a => a.role === "perawat");
    let maxRun = 0;
    for (const a of nurses) {
      let run = 0;
      for (let t = 0; t < 8 * DAY; t++) {
        const s = rosterStatus(a, t);
        if (s.onDuty && !s.onCall) { run++; maxRun = Math.max(maxRun, run); } else run = 0;
      }
    }
    expect(maxRun).toBe(12 * H);
    for (const t of [10 * H, 20 * H, 3 * DAY + 2 * H, 3 * DAY + 14 * H]) {
      expect(nurses.filter(a => rosterStatus(a, t).onDuty).length, `tick ${t}`).toBeGreaterThan(5);
    }
  });
});
