/**
 * Indonesian shift schedule: pagi 07-14, siang 14-21, malam 21-07 (RSUD pattern, Epic VI M6.1),
 * moved verbatim from agent/roster.ts so the locale seam can default to it without an import cycle.
 */
import type { RosterPattern, ShiftSlot } from "../agent/roster.js";
import type { Shift } from "../agent/types.js";

const TICKS_PER_DAY = 1440;
const START_MINUTE_OF_DAY = 18 * 60; // calendar.ts START_HOUR 18:00
const PAGI_START = 7 * 60;
const SIANG_START = 14 * 60;
const MALAM_START = 21 * 60;
const WORK_SHIFTS: Exclude<Shift, "libur">[] = ["pagi", "siang", "malam"];

/** Which shift is running at a tick. */
export function indonesiaShiftAt(tick: number): ShiftSlot {
  const minute = START_MINUTE_OF_DAY + tick;
  const minuteOfDay = ((minute % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
  const rosterDay = Math.floor((minute - PAGI_START) / TICKS_PER_DAY);
  const shiftIndex = minuteOfDay >= PAGI_START && minuteOfDay < SIANG_START ? 0
    : minuteOfDay >= SIANG_START && minuteOfDay < MALAM_START ? 1 : 2;
  const startOfShift = shiftIndex === 0 ? PAGI_START : shiftIndex === 1 ? SIANG_START : MALAM_START;
  const minuteInShift = ((minuteOfDay - startOfShift) % TICKS_PER_DAY + TICKS_PER_DAY) % TICKS_PER_DAY;
  return { rosterDay, dayOfWeek: ((rosterDay % 7) + 7) % 7, shift: WORK_SHIFTS[shiftIndex]!, shiftIndex, minuteInShift };
}

/** The shift an agent is rostered for on a roster day ("libur" = day off). */
export function indonesiaRosteredShift(pattern: RosterPattern, team: number, rosterDay: number, dayOfWeek: number): Shift {
  if (pattern === "day") return dayOfWeek === 6 ? "libur" : "pagi";
  if (pattern === "rotating3") return WORK_SHIFTS[(((team - rosterDay) % 3) + 3) % 3]!;
  const slot = (((rosterDay + team) % 4) + 4) % 4; // pagi → siang → malam → libur
  return slot === 3 ? "libur" : WORK_SHIFTS[slot]!;
}
