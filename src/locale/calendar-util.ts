/** Shared calendar helper for locale event tables. */
import type { CalendarDate } from "../engine/calendar.js";

export function isInRange(date: CalendarDate, month: number, startDay: number, endMonth: number, endDay: number): boolean {
  const d = date.month * 100 + date.day;
  const s = month * 100 + startDay;
  const e = endMonth * 100 + endDay;
  if (s <= e) return d >= s && d <= e;
  return d >= s || d <= e; // wraps around year (e.g., Christmas to New Year)
}
