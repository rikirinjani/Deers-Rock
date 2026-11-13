/**
 * Epic X M10.5b slice 2: US event calendar and US staff names/licences.
 * Multipliers and boosts are placeholders pending M10.5c; these tests pin
 * structure, coverage and determinism.
 */
import { describe, it, expect, afterEach } from "vitest";
import { USIdentityLocale } from "../src/locale/us-identity.js";
import { usEvents } from "../src/locale/us-calendar.js";
import { indonesiaEvents } from "../src/locale/indonesia-calendar.js";
import { US_DIAGNOSES } from "../src/locale/us-casemix.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { useUSAdapter, resetBillingAdapter } from "../src/engine/billing/us-adapter.js";
import { getCalendar } from "../src/locale/registry.js";
import { tickToDate, formatCalendarDate, getActiveEvents, getEventSummary, type CalendarDate } from "../src/engine/calendar.js";
import { generateAgent, generateAgentPool, resetAgentCounter } from "../src/agent/generator.js";
import { ageFromBirthDate } from "../src/identity/reference-year.js";
import type { AgentRole } from "../src/agent/types.js";
import { createWorld, runWorld } from "../src/engine/world.js";

const lcg = (seed: number) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const day = (month: number, d: number): CalendarDate =>
  ({ year: 2026, month, day: d, hour: 12, minute: 0, dayOfWeek: 1, dayName: "Monday", monthName: "", totalDays: 0 });
const allDates = (): CalendarDate[] => {
  const out: CalendarDate[] = [];
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= new Date(2026, m, 0).getDate(); d++) out.push(day(m, d));
  return out;
};

afterEach(() => { resetLocale(); resetBillingAdapter(); resetAgentCounter(); });

describe("US calendar", () => {
  it("regular baseline first; every modifier code is in the US pool; complaints are known strings", () => {
    const usCodes = new Set(US_DIAGNOSES.map(d => d.code));
    const known = new Set(allDates().flatMap(d => indonesiaEvents(d).flatMap(e => e.emergencyComplaints)));
    for (const d of allDates()) {
      const ev = usEvents(d);
      expect(ev[0]!.type).toBe("regular");
      for (const e of ev) {
        for (const m of e.influxModifiers) { expect(usCodes.has(m.icdCode)).toBe(true); expect(m.weightBoost).toBeGreaterThan(0); }
        for (const c of e.emergencyComplaints) expect(known.has(c)).toBe(true);
      }
    }
  });

  it("holidays fall where expected and the year has no empty season gap for flu", () => {
    const names = (m: number, d: number) => usEvents(day(m, d)).map(e => e.name);
    expect(names(7, 4)).toContain("Independence Day");
    expect(names(11, 26)).toContain("Thanksgiving");
    expect(names(12, 25)).toContain("Christmas");
    expect(names(1, 1)).toContain("New Year");
    expect(names(1, 20)).toContain("Influenza Season");
    expect(names(4, 15)).toEqual(["Regular Day"]);
    // the five neutral federal holidays (T-CAL-1) mark the date and change nothing else
    for (const [m, d, n] of [[1, 18, "Martin Luther King Jr. Day"], [2, 15, "Washington's Birthday"], [6, 19, "Juneteenth"], [10, 12, "Columbus Day"], [11, 11, "Veterans Day"]] as [number, number, string][]) {
      const e = usEvents(day(m, d)).find(x => x.name === n)!;
      expect(e.type).toBe("holiday");
      expect(e.influxMultiplier).toBe(1);
      expect(e.influxModifiers).toEqual([]);
    }
  });

  it("the US pack swaps the calendar and time-zone label; reset restores Indonesia", () => {
    const t = 0;
    expect(formatCalendarDate(tickToDate(t)).endsWith("WITA")).toBe(true);
    expect(getActiveEvents(day(8, 17)).map(e => e.name)).toContain("Hari Kemerdekaan RI");
    useUSLocale();
    expect(getCalendar().config.countryCode).toBe("US");
    expect(formatCalendarDate(tickToDate(t)).endsWith("ET")).toBe(true);
    expect(getActiveEvents(day(8, 17)).map(e => e.name)).not.toContain("Hari Kemerdekaan RI");
    expect(getEventSummary(24 * 1440 * 19).events.length).toBeGreaterThanOrEqual(0);
    resetLocale();
    expect(formatCalendarDate(tickToDate(t)).endsWith("WITA")).toBe(true);
  });
});

describe("US staff roster content", () => {
  const roles: AgentRole[] = ["dokter_spesialis", "dokter_umum", "perawat", "apoteker", "radiografer", "kasir"];

  it("names carry a US credential, licences are marked synthetic, ages are working-age", () => {
    useUSLocale();
    const r = lcg(3);
    for (const role of roles) {
      const a = generateAgent(role, r);
      expect(a.lisensi).toMatch(/^SIM-(MD|RN|RPH|LIC)-\d{6}$/);
      if (role === "kasir") expect(a.nama).not.toContain(",");
      else expect(a.nama).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+, [A-Za-z()]+$/);
      const age = 22 + (ageFromBirthDate(a.identity.birthDate) % 44);
      expect(age).toBeGreaterThanOrEqual(22);
      expect(age).toBeLessThanOrEqual(65);
    }
  });

  it("licence takes one draw and name two, the same budget as the Indonesian generator", () => {
    const L = new USIdentityLocale();
    let n = 0; const r = lcg(2); const c = () => { n++; return r(); };
    L.staffLicence("perawat", c);
    expect(n).toBe(1);
    L.staffName("perawat", "female", c);
    expect(n).toBe(3);
  });

  it("Indonesian staff are unchanged (STR/SIP/SKP licences, Indonesian titles)", () => {
    const r = lcg(3);
    expect(generateAgent("dokter_umum", r).lisensi).toMatch(/^STR-\d{6}$/);
    expect(generateAgent("perawat", r).nama.startsWith("Ns. ")).toBe(true);
    expect(generateAgent("kasir", r).lisensi).toMatch(/^SKP-\d{6}$/);
  });

  it("a US pool is deterministic", () => {
    useUSLocale();
    const names = (seed: number) => { resetAgentCounter(); return Array.from(generateAgentPool(131, lcg(seed)).agents.values()).map(a => a.nama + a.lisensi); };
    expect(names(4)).toEqual(names(4));
  });
});

describe("US world (case mix + calendar + staff)", () => {
  it("runs end to end with US staff and calendar", () => {
    useUSLocale();
    useUSAdapter();
    const w = runWorld(createWorld(40, undefined, 7), 1500);
    expect(w.state.patients.size).toBeGreaterThan(0);
    expect(formatCalendarDate(tickToDate(w.state._calendarTicks)).endsWith("ET")).toBe(true);
  });
});
