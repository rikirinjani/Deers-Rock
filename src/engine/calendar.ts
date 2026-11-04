// Fixed start: Monday, June 15, 2026 18:00 WITA (Makassar)
// 1 tick = 1 simulated minute
// 1440 ticks = 1 day

import { getCalendar } from "../locale/registry.js";

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ...
  dayName: string;
  monthName: string;
  totalDays: number;
}

export interface InfluxModifier {
  icdCode: string;
  weightBoost: number;
  label: string;
}

export interface CalendarEvent {
  name: string;
  type: "holiday" | "seasonal" | "regular";
  influxMultiplier: number;
  influxModifiers: InfluxModifier[];
  emergencyComplaints: string[];
  description: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const START_YEAR = 2026;
const START_MONTH = 6; // June
const START_DAY = 15;  // Monday
const START_HOUR = 18;
const START_MINUTE = 0;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function totalDaysSinceStart(ticks: number): number {
  return Math.floor(ticks / 1440);
}

export function tickToDate(ticks: number): CalendarDate {
  let totalDays = totalDaysSinceStart(ticks);
  let year = START_YEAR;
  let month = START_MONTH;
  let day = START_DAY;

  while (totalDays > 0) {
    const dim = daysInMonth(year, month);
    const remaining = dim - day + 1;
    if (totalDays < remaining) {
      day += totalDays;
      totalDays = 0;
    } else {
      totalDays -= remaining;
      day = 1;
      month++;
      if (month > 12) { month = 1; year++; }
    }
  }

  const minuteOfDay = ticks % 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  const dayOfWeek = new Date(year, month - 1, day).getDay();

  return {
    year, month, day, hour, minute, dayOfWeek,
    dayName: DAYS[dayOfWeek],
    monthName: MONTHS[month - 1],
    totalDays: totalDaysSinceStart(ticks),
  };
}

export function formatCalendarDate(date: CalendarDate): string {
  return `${date.dayName}, ${date.day} ${date.monthName} ${date.year} ${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")} ${getCalendar().timeZoneLabel}`;
}

export function getActiveEvents(date: CalendarDate): CalendarEvent[] {
  return getCalendar().events(date);
}

export function getEventSummary(ticks: number): {
  date: CalendarDate;
  events: CalendarEvent[];
  totalMultiplier: number;
  activeModifiers: InfluxModifier[];
  emergencyPool: string[];
} {
  const date = tickToDate(ticks);
  const events = getActiveEvents(date).filter(e => e.type !== "regular");

  let totalMultiplier = 1;
  const allModifiers: InfluxModifier[] = [];
  const allComplaints: string[] = [];

  for (const ev of events) {
    totalMultiplier *= ev.influxMultiplier;
    allModifiers.push(...ev.influxModifiers);
    allComplaints.push(...ev.emergencyComplaints);
  }

  return {
    date,
    events,
    totalMultiplier,
    activeModifiers: allModifiers,
    emergencyPool: [...new Set(allComplaints)],
  };
}
