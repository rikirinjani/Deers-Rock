/**
 * Epic VI M6.1 (2026-10-27) — staff roster and workforce health model.
 * Before: inShift was hard-coded true and fatigue never reset, so every
 * agent was sick by tick 50 (seed 42) and none were available.
 */
import { describe, it, expect } from "vitest";
import { createWorld } from "../src/engine/world.js";
import { createClock, createRng, withSubStream } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { generateAgentPool } from "../src/agent/generator.js";
import { shiftAt, rosterStatus, rosteredShift, rosterPatternFor, SHIFT_TICKS } from "../src/agent/roster.js";
import { agentHandler, FATIGUE_WARN, MILD_ONSET_PER_TICK, MILD_RECOVERY_TICKS } from "../src/agent/system.js";
import type { HospitalAgent, AgentRole } from "../src/agent/types.js";
import type { HospitalState } from "../src/engine/state-store.js";

const H = 60, DAY = 1440;
const agentsOf = (s: HospitalState) => (s as unknown as { _agentState: { pool: { agents: Map<string, HospitalAgent> } } })._agentState.pool.agents;

/** Run only agentHandler for n ticks, as world.ts would (own sub-stream per tick). */
function runAgents(state: HospitalState, from: number, n: number, seed = 42, each?: (s: HospitalState, t: number) => void): HospitalState {
  const base = createClock(60, seed);
  let s = state;
  for (let t = from + 1; t <= from + n; t++) {
    s = agentHandler(s, withSubStream({ ...base, tick: t, hospitalTimeMs: t * 60_000 }, "agentHandler"), new EventQueue());
    each?.(s, t);
  }
  return s;
}

describe("roster — shift clock", () => {
  it("maps ticks to shifts from the 18:00 Monday start", () => {
    expect(shiftAt(0)).toMatchObject({ shift: "siang", rosterDay: 0, dayOfWeek: 0 });      // Mon 18:00
    expect(shiftAt(5 * H)).toMatchObject({ shift: "malam", rosterDay: 0 });                // Mon 23:00
    expect(shiftAt(13 * H - 1)).toMatchObject({ shift: "malam", rosterDay: 0 });           // Tue 06:59 still Monday's night
    expect(shiftAt(13 * H)).toMatchObject({ shift: "pagi", rosterDay: 1, dayOfWeek: 1 });  // Tue 07:00
    expect(shiftAt(21 * H)).toMatchObject({ shift: "siang", rosterDay: 1 });               // Tue 15:00
    expect(shiftAt(13 * H + 5 * DAY)).toMatchObject({ dayOfWeek: 6 });                     // Sunday
  });

  it("day roles work pagi Monday–Saturday only; rotating roles get one libur day in four", () => {
    for (let d = 0; d < 7; d++) expect(rosteredShift("day", 0, d, d)).toBe(d === 6 ? "libur" : "pagi");
    const week = Array.from({ length: 8 }, (_, d) => rosteredShift("rotating4", 1, d, d % 7));
    expect(week.filter(s => s === "libur")).toHaveLength(2);
    expect(new Set(week)).toEqual(new Set(["pagi", "siang", "malam", "libur"]));
    const r3 = Array.from({ length: 6 }, (_, d) => rosteredShift("rotating3", 0, d, d));
    expect(r3.includes("libur")).toBe(false);
    // Backward rotation: a malam is never followed by the next day's pagi.
    for (let d = 0; d < 5; d++) if (r3[d] === "malam") expect(r3[d + 1]).not.toBe("pagi");
  });

  it("picks rotating3 for three staff and on-call below that", () => {
    expect(rosterPatternFor("perawat", 44)).toBe("rotating4");
    expect(rosterPatternFor("apoteker", 3)).toBe("rotating3");
    expect(rosterPatternFor("sopir_ambulans", 2)).toBe("oncall");
    expect(rosterPatternFor("dokter_spesialis", 9)).toBe("day");
  });
});

describe("roster — coverage of a generated pool", () => {
  const pool = generateAgentPool(131, createRng(7).next).agents;
  const agents = Array.from(pool.values());
  const roundTheClock: AgentRole[] = ["dokter_umum", "perawat", "bidan", "apoteker", "analis_lab", "radiografer", "sopir_ambulans"];

  it("every agent gets a pattern and team", () => {
    for (const a of agents) {
      expect(a.status.rosterPattern).toBeDefined();
      expect(a.status.rosterTeam).toBeGreaterThanOrEqual(0);
    }
  });

  it("every 24-hour role has someone on duty in every shift for two weeks", () => {
    for (let d = 0; d < 14; d++) {
      for (const offset of [0, 8 * H, 16 * H]) { // pagi 07:00, siang 15:00, malam 23:00 of roster day d
        const t = 13 * H + d * DAY + offset;     // 07:00 of roster day d is tick 13 h + d days
        for (const role of roundTheClock) {
          const onDuty = agents.filter(a => a.role === role && rosterStatus(a, t).onDuty).length;
          expect(onDuty, `${role} day ${d} at ${shiftAt(t).shift}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("weekly hours sit near the 40-hour contract (rotating4 ≈ 42 h)", () => {
    const nurse = agents.find(a => a.role === "perawat")!;
    let ticks = 0;
    for (let t = 13 * H; t < 13 * H + 28 * DAY; t += 60) if (rosterStatus(nurse, t).onDuty) ticks += 60;
    const perWeek = ticks / 60 / 4;
    expect(perWeek).toBeGreaterThanOrEqual(40);
    expect(perWeek).toBeLessThanOrEqual(44);
  });

  it("at any moment only a fraction of the workforce is on duty", () => {
    const share = agents.filter(a => rosterStatus(a, 13 * H + 2 * H).onDuty).length / agents.length; // Tue 09:00
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.75);
  });
});

describe("workforce health model", () => {
  it("fatigue builds on shift and recovers off shift; no one is exhausted after two days", () => {
    const w = createWorld(20, undefined, 42);
    let maxFatigue = 0;
    const s = runAgents(w.state, 0, 2 * DAY, 42, st => {
      for (const a of agentsOf(st).values()) maxFatigue = Math.max(maxFatigue, a.status.kelelahan);
    });
    expect(maxFatigue).toBeLessThanOrEqual(SHIFT_TICKS + 30);
    expect(maxFatigue).toBeGreaterThanOrEqual(FATIGUE_WARN);
    const all = Array.from(agentsOf(s).values());
    expect(all.filter(a => a.status.kesehatan === "sakit_ringan" || a.status.kesehatan === "sakit_berat").length).toBeLessThan(all.length * 0.1);
    expect(all.some(a => a.status.inShift)).toBe(true);
    expect(all.some(a => !a.status.inShift)).toBe(true);
  });

  it("sickness absence over 30 days lands near the ~2.7% calibration target", () => {
    const w = createWorld(20, undefined, 11);
    let sickAgentTicks = 0, agentTicks = 0, onsets = 0;
    const prev = new Map<string, string>();
    runAgents(w.state, 0, 30 * DAY, 11, (st, t) => {
      if (t % 10 !== 0) return;
      for (const a of agentsOf(st).values()) {
        agentTicks++;
        if (a.status.kesehatan === "sakit_ringan" || a.status.kesehatan === "sakit_berat") sickAgentTicks++;
        if (prev.get(a.id) !== "sakit_ringan" && a.status.kesehatan === "sakit_ringan") onsets++;
        prev.set(a.id, a.status.kesehatan);
      }
    });
    const absence = sickAgentTicks / agentTicks;
    expect(absence).toBeGreaterThan(0.01);
    expect(absence).toBeLessThan(0.05);
    const n = agentsOf(w.state).size;
    const expectedOnsets = n * 30 * DAY * MILD_ONSET_PER_TICK;
    expect(onsets).toBeGreaterThan(expectedOnsets * 0.4);
    expect(onsets).toBeLessThan(expectedOnsets * 1.8);
  }, 120_000);

  it("mild illness recovers after MILD_RECOVERY_TICKS", () => {
    const w = createWorld(10, undefined, 3);
    const [id, a] = Array.from(agentsOf(w.state).entries())[0]!;
    agentsOf(w.state).set(id, { ...a, status: { ...a.status, kesehatan: "sakit_ringan", sakitTerhitung: MILD_RECOVERY_TICKS - 1 } });
    const s = runAgents(w.state, 0, 1, 3);
    // Either recovered, or (rarely) progressed to severe on this tick.
    expect(["sehat", "lelah", "sakit_berat"]).toContain(agentsOf(s).get(id)!.status.kesehatan);
  });

  it("pregnancy advances one week per 7 sim-days, not per 7 sim-hours", () => {
    const w = createWorld(10, undefined, 3);
    const [id, a] = Array.from(agentsOf(w.state).entries())[0]!;
    agentsOf(w.state).set(id, { ...a, status: { ...a.status, isHamil: true, hamilWeeks: 10 } });
    const s = runAgents(w.state, 0, DAY, 3);
    expect(agentsOf(s).get(id)!.status.hamilWeeks).toBeCloseTo(10 + 1 / 7, 6);
  });

  it("is deterministic for a seed", () => {
    const fp = (s: HospitalState) => JSON.stringify(Array.from(agentsOf(s).values()).map(a => [a.id, a.status.kesehatan, a.status.kelelahan, a.status.inShift]));
    expect(fp(runAgents(createWorld(10, undefined, 5).state, 0, 600, 5))).toBe(fp(runAgents(createWorld(10, undefined, 5).state, 0, 600, 5)));
  });
});
