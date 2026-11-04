/**
 * US shift schedule (Epic X M10.5b slice 6): 12-hour day (07:00-19:00) and
 * night (19:00-07:00) shifts. The engine's shift identifiers are kept:
 * "pagi" is the day shift, "malam" the night shift, "siang" never occurs.
 *
 * Patterns (deterministic, no rng), mirroring the Indonesian rotation's
 * coverage (one team on each shift, a quarter of the staff on duty per shift):
 *  - rotating4: team t on roster day d works slot (d + t) % 4:
 *    day, night, off, off (24 h per 4 days, 42 h per week). A night is
 *    followed by two days off before the next day shift.
 *  - rotating3: slot (d + t) % 3: day, night, off, so every shift stays
 *    covered with three staff; night is followed by a day off.
 *  - oncall is unchanged. Day (office) roles work Monday-Friday, 07:00-15:00:
 *    8 hours inside the 12-hour day shift (officeMinutes).
 *
 * CALIBRATION PENDING: US nurses typically work three 12-hour shifts per
 * week (36 h) and rotate by unit policy; this pattern is a coverage-parity
 * placeholder, not a surveyed schedule (M10.5c).
 */
import type { IShiftSchedule } from "./contracts.js";
import type { RosterPattern, ShiftSlot } from "../agent/roster.js";
import type { Shift } from "../agent/types.js";

const TICKS_PER_DAY = 1440;
const START_MINUTE_OF_DAY = 18 * 60; // calendar.ts START_HOUR 18:00
const DAY_START = 7 * 60;
const NIGHT_START = 19 * 60;

export function usShiftAt(tick: number): ShiftSlot {
  const minute = START_MINUTE_OF_DAY + tick;
  const minuteOfDay = ((minute % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
  const rosterDay = Math.floor((minute - DAY_START) / TICKS_PER_DAY);
  const day = minuteOfDay >= DAY_START && minuteOfDay < NIGHT_START;
  const minuteInShift = ((minuteOfDay - (day ? DAY_START : NIGHT_START)) % TICKS_PER_DAY + TICKS_PER_DAY) % TICKS_PER_DAY;
  return { rosterDay, dayOfWeek: ((rosterDay % 7) + 7) % 7, shift: day ? "pagi" : "malam", shiftIndex: day ? 0 : 2, minuteInShift };
}

export function usRosteredShift(pattern: RosterPattern, team: number, rosterDay: number, dayOfWeek: number): Shift {
  if (pattern === "day") return dayOfWeek >= 5 ? "libur" : "pagi";
  if (pattern === "rotating3") {
    const slot = (((rosterDay + team) % 3) + 3) % 3;
    return slot === 0 ? "pagi" : slot === 1 ? "malam" : "libur";
  }
  const slot = (((rosterDay + team) % 4) + 4) % 4;
  return slot === 0 ? "pagi" : slot === 1 ? "malam" : "libur";
}

export class USShiftSchedule implements IShiftSchedule {
  config = { countryCode: "US", displayName: "United States" };
  /** Longest shift is 12 h, so illness risk from fatigue starts past 14 h (overtime). */
  fatigueCriticalTicks = 840;
  /** Tired after 10 h of a 12-h shift (the Indonesian 7 h would flag everyone for most of the shift). */
  fatigueWarnTicks = 600;
  /** Office roles work an 8-hour day (07:00-15:00), not the full 12-hour day shift. */
  officeMinutes = 480;
  /** US clinics and office roles: Monday-Friday. */
  officeOffDays: readonly number[] = [5, 6];
  shiftAt(tick: number): ShiftSlot { return usShiftAt(tick); }
  rosteredShift(pattern: RosterPattern, team: number, rosterDay: number, dayOfWeek: number): Shift {
    return usRosteredShift(pattern, team, rosterDay, dayOfWeek);
  }
}
