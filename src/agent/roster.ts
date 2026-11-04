/**
 * Staff roster — Epic VI M6.1 (2026-10-27).
 *
 * 1 tick = 1 sim-minute; the calendar starts Monday 15 June 2026 18:00 WITA
 * (calendar.ts). Indonesian hospital pattern (calibrated 2026-10-27): pagi
 * 07–14 (7 h), siang 14–21 (7 h), malam 21–07 (10 h), as documented at RSUD
 * Dr. Soetomo and RSUD Sunan Kalijaga and described as the general rule.
 * A roster day starts at 07:00, so a malam shift belongs to the day it began.
 *
 * Patterns (deterministic, no rng):
 *  - rotating4: 24-hour roles in 4 teams. Team t on roster day d works shift
 *    (d + t) % 4, where 3 = libur: pagi, siang, malam in every four days
 *    (24 h per 4 days = 42 h/week; UU 6/2023 sets 40 h/week).
 *  - rotating3: 24-hour roles with 3 staff, so every shift stays covered (no
 *    libur day — an intentional simplification). Rotates backwards
 *    (pagi → malam → siang) so there are ≥ 7 h of rest between shifts; a
 *    forward 3-cycle would run malam straight into the next pagi (17 h).
 *  - oncall: 24-hour roles with < 3 staff (e.g. sopir_ambulans): always
 *    reachable, resting between calls, so no fatigue accrues.
 *  - day: office/specialist roles, pagi Monday–Saturday.
 */
import type { AgentRole, HospitalAgent, Shift } from "./types.js";
import { getShiftSchedule } from "../locale/registry.js";

export type RosterPattern = "rotating4" | "rotating3" | "oncall" | "day";

/** Shift lengths in ticks; the longest (malam, 10 h) bounds normal fatigue. */
export const SHIFT_TICKS = { pagi: 420, siang: 420, malam: 600 } as const;
export const LONGEST_SHIFT_TICKS = 600;

/** Roles staffed around the clock. Everything else works day shifts. */
const ROUND_THE_CLOCK: ReadonlySet<AgentRole> = new Set<AgentRole>([
  "dokter_umum", "perawat", "perawat_anestesi", "bidan",
  "apoteker", "asisten_apoteker", "analis_lab", "radiografer",
  "petugas_keamanan", "sopir_ambulans", "petugas_kebersihan",
]);

export function rosterPatternFor(role: AgentRole, headcount: number): RosterPattern {
  if (!ROUND_THE_CLOCK.has(role)) return "day";
  return headcount >= 4 ? "rotating4" : headcount === 3 ? "rotating3" : "oncall";
}

export interface ShiftSlot {
  /** Roster day index (day 0 = Monday 15 June 2026, starting 07:00). */
  rosterDay: number;
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: number;
  shift: Exclude<Shift, "libur">;
  shiftIndex: number;
  /** Minutes elapsed since the running shift began. */
  minuteInShift: number;
}

/** Which shift is running at a tick (active locale's schedule). */
export function shiftAt(tick: number): ShiftSlot {
  return getShiftSchedule().shiftAt(tick);
}

/** The shift an agent is rostered for on a roster day ("libur" = day off). */
export function rosteredShift(pattern: RosterPattern, team: number, rosterDay: number, dayOfWeek: number): Shift {
  return getShiftSchedule().rosteredShift(pattern, team, rosterDay, dayOfWeek);
}

/** Roster status for an agent at a tick. `onCall` agents are reachable but resting. */
export function rosterStatus(agent: HospitalAgent, tick: number): { shift: Shift; onDuty: boolean; onCall: boolean } {
  const now = shiftAt(tick);
  const pattern = agent.status.rosterPattern ?? rosterPatternFor(agent.role, 4);
  if (pattern === "oncall") return { shift: now.shift, onDuty: true, onCall: true };
  const team = agent.status.rosterTeam ?? 0;
  const shift = rosteredShift(pattern, team, now.rosterDay, now.dayOfWeek);
  const sched = getShiftSchedule();
  // Office (day) roles work a bounded workday inside the day shift (identical to the full shift in Indonesia).
  const withinHours = pattern !== "day" || now.minuteInShift < sched.officeMinutes;
  return { shift, onDuty: shift === now.shift && withinHours, onCall: false };
}

/**
 * Give every agent a pattern and team: within each role, agents (in ID
 * order) are dealt round-robin into teams so every team is staffed.
 */
export function assignRoster(agents: Map<string, HospitalAgent>): void {
  const byRole = new Map<AgentRole, HospitalAgent[]>();
  for (const a of agents.values()) {
    const list = byRole.get(a.role) ?? [];
    list.push(a);
    byRole.set(a.role, list);
  }
  for (const [role, list] of byRole) {
    list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const pattern = rosterPatternFor(role, list.length);
    const teams = pattern === "rotating4" ? 4 : pattern === "rotating3" ? 3 : 1;
    list.forEach((a, i) => {
      const rostered: HospitalAgent = { ...a, status: { ...a.status, rosterPattern: pattern, rosterTeam: i % teams } };
      const at0 = rosterStatus(rostered, 0);
      agents.set(a.id, { ...rostered, status: { ...rostered.status, shift: at0.shift, inShift: at0.onDuty } });
    });
  }
}
