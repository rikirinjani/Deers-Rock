import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export interface IcdFrequency {
  code: string;
  name: string;
  count: number;
}

export interface IcdPeriodData {
  period: number;
  tick: number;
  top10: IcdFrequency[];
}

export function icdTrackerHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  if (clock.tick % 5 !== 0) return state;

  const freq = new Map<string, { code: string; name: string; count: number }>();

  for (const patient of state.patients.values()) {
    for (const dx of patient.diagnoses) {
      if (!dx.active) continue;
      const key = dx.code;
      const existing = freq.get(key);
      if (existing) {
        existing.count++;
      } else {
        freq.set(key, { code: dx.code, name: dx.name, count: 1 });
      }
    }
  }

  const sorted = Array.from(freq.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  const period = Math.floor(clock.tick / 5);

  const data: IcdPeriodData = { period, tick: clock.tick, top10: sorted };

  return { ...state, _icdTop10: data };
}
