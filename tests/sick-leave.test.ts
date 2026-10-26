/**
 * Epic VI M6.1 — sick leave auto-replacement + agent health/fatigue alerts.
 *
 * Fixtures force agent health directly on a real createWorld() pool, then call
 * sickLeaveHandler / summarizeAgentHealth, so each case is deterministic.
 */
import { describe, it, expect } from "vitest";
import { createWorld, runWorld, type World } from "../src/engine/world.js";
import { createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { sickLeaveHandler, summarizeAgentHealth, FATIGUE_CRITICAL, type SickLeaveState } from "../src/agent/system.js";
import { apiRoutes } from "../src/api/rest.js";
import type { HospitalAgent, KeadaanKesehatan } from "../src/agent/types.js";
import type { HospitalState } from "../src/engine/state-store.js";

type Pool = { agents: Map<string, HospitalAgent>; assignments: Map<string, string> };
const pool = (s: HospitalState) => (s as unknown as { _agentState: { pool: Pool } })._agentState.pool;
const sick = (s: HospitalState) => (s as unknown as { _sickLeaveState: SickLeaveState })._sickLeaveState;

function setHealth(w: World, id: string, kesehatan: KeadaanKesehatan, kelelahan = 0): void {
  const a = pool(w.state).agents.get(id)!;
  pool(w.state).agents.set(id, { ...a, status: { ...a.status, kesehatan, kelelahan } });
}

/** All agents healthy, so replacement choice depends only on the fixture. */
function healthyWorld(): World {
  const w = createWorld(10, undefined, 7);
  for (const id of pool(w.state).agents.keys()) setHealth(w, id, "sehat", 0);
  return w;
}

function clockAt(tick: number) { const c = createClock(60, 1); c.tick = tick; return c; }

function nurses(w: World): HospitalAgent[] {
  return Array.from(pool(w.state).agents.values()).filter(a => a.role === "perawat").sort((a, b) => a.id < b.id ? -1 : 1);
}

describe("Epic VI M6.1 — sick leave", () => {
  it("opens a leave record for an agent already sakit_berat (state-based detection)", () => {
    const w = healthyWorld();
    const [n1] = nurses(w);
    setHealth(w, n1!.id, "sakit_berat");
    const s2 = sickLeaveHandler(w.state, clockAt(10), new EventQueue());
    const recs = Array.from(sick(s2).records.values());
    expect(recs).toHaveLength(1);
    expect(recs[0]!.agentId).toBe(n1!.id);
    expect(recs[0]!.recoveredTick).toBeNull();
    expect(recs[0]!.replacementAgentId).not.toBeNull();
    expect(recs[0]!.replacementAgentId).not.toBe(n1!.id);
    // Input state is not mutated (counter stays on the old object).
    expect(sick(w.state).counter).toBe(0);
    expect(sick(s2).counter).toBe(1);
  });

  it("does not open a second record while the agent is still on leave", () => {
    const w = healthyWorld();
    const [n1] = nurses(w);
    setHealth(w, n1!.id, "sakit_berat");
    const s2 = sickLeaveHandler(w.state, clockAt(10), new EventQueue());
    const s3 = sickLeaveHandler(s2, clockAt(20), new EventQueue());
    expect(sick(s3).records.size).toBe(1);
  });

  it("replacement is same role, fit for duty, and takes over the sick agent's encounters", () => {
    const w = healthyWorld();
    const [n1] = nurses(w);
    pool(w.state).assignments.set("ENC-NURSE-ENC-1", n1!.id);
    pool(w.state).assignments.set("ENC-NURSE-ENC-2", n1!.id);
    setHealth(w, n1!.id, "sakit_berat");
    const s2 = sickLeaveHandler(w.state, clockAt(10), new EventQueue());
    const rec = Array.from(sick(s2).records.values())[0]!;
    const rep = pool(s2).agents.get(rec.replacementAgentId!)!;
    expect(rep.role).toBe("perawat");
    expect(["sehat", "lelah"]).toContain(rep.status.kesehatan);
    expect(rec.reassignedEncounters).toBe(2);
    expect(pool(s2).assignments.get("ENC-NURSE-ENC-1")).toBe(rep.id);
    expect(pool(s2).assignments.get("ENC-NURSE-ENC-2")).toBe(rep.id);
    // Copy-on-write: the input world's assignments are untouched.
    expect(pool(w.state).assignments.get("ENC-NURSE-ENC-1")).toBe(n1!.id);
  });

  it("records an uncovered leave when no fit agent of that role exists", () => {
    const w = healthyWorld();
    for (const n of nurses(w)) setHealth(w, n.id, "sakit_ringan");
    const [n1] = nurses(w);
    setHealth(w, n1!.id, "sakit_berat");
    const s2 = sickLeaveHandler(w.state, clockAt(10), new EventQueue());
    const rec = Array.from(sick(s2).records.values())[0]!;
    expect(rec.replacementAgentId).toBeNull();
    expect(summarizeAgentHealth(s2).sickLeave.uncovered).toBe(1);
  });

  it("closes the record when the agent recovers (sakitTerhitung ≥ 120)", () => {
    const w = healthyWorld();
    const [n1] = nurses(w);
    setHealth(w, n1!.id, "sakit_berat");
    const s2 = sickLeaveHandler(w.state, clockAt(10), new EventQueue());
    const a = pool(s2).agents.get(n1!.id)!;
    pool(s2).agents.set(n1!.id, { ...a, status: { ...a.status, sakitTerhitung: 120 } });
    const s3 = sickLeaveHandler(s2, clockAt(130), new EventQueue());
    const rec = Array.from(sick(s3).records.values())[0]!;
    expect(rec.recoveredTick).toBe(130);
    expect(pool(s3).agents.get(n1!.id)!.status.kesehatan).toBe("lelah");
  });

  it("over a seeded run, every sakit_berat agent has exactly one open leave record", () => {
    const w = runWorld(createWorld(30, undefined, 42), 200);
    const s = sickLeaveHandler(w.state, clockAt(w.clock.tick), new EventQueue());
    const open = Array.from(sick(s).records.values()).filter(r => r.recoveredTick === null);
    const berat = Array.from(pool(s).agents.values()).filter(a => a.status.kesehatan === "sakit_berat");
    expect(berat.length).toBeGreaterThan(0);
    expect(new Set(open.map(r => r.agentId))).toEqual(new Set(berat.map(a => a.id)));
    expect(open.length).toBe(berat.length);
  });

  it("is deterministic: same seed gives identical leave records", () => {
    const w1 = runWorld(createWorld(30, undefined, 42), 200);
    const w2 = runWorld(createWorld(30, undefined, 42), 200);
    expect(sick(w1.state).records.size).toBeGreaterThan(0);
    expect(JSON.stringify(Array.from(sick(w2.state).records.entries()))).toBe(JSON.stringify(Array.from(sick(w1.state).records.entries())));
  });
});

describe("Epic VI M6.1 — agent health & fatigue alerts", () => {
  it("summarizes health mix, fatigue, and sorts critical alerts first", () => {
    const w = healthyWorld();
    const [n1, n2] = nurses(w);
    setHealth(w, n1!.id, "sakit_berat", 5);
    setHealth(w, n2!.id, "lelah", FATIGUE_CRITICAL + 3);
    const h = summarizeAgentHealth(w.state);
    expect(h.total).toBe(pool(w.state).agents.size);
    expect(h.byHealth.sakit_berat).toBe(1);
    expect(h.byHealth.lelah).toBe(1);
    expect(h.byHealth.sehat).toBe(h.total - 2);
    expect(h.fatigue.max).toBe(FATIGUE_CRITICAL + 3);
    expect(h.fatigue.overCritical).toBe(1);
    expect(h.alertCount).toEqual({ critical: 1, warning: 1 });
    expect(h.alerts[0]!.agentId).toBe(n1!.id);
    expect(h.alerts[0]!.level).toBe("critical");
    expect(h.alerts[1]!.level).toBe("warning");
    expect(h.available).toBe(h.total - 1);
  });

  it("caps the alert list", () => {
    const w = healthyWorld();
    for (const id of pool(w.state).agents.keys()) setHealth(w, id, "lelah", FATIGUE_CRITICAL);
    const h = summarizeAgentHealth(w.state, 5);
    expect(h.alerts).toHaveLength(5);
    expect(h.alertCount.warning).toBe(h.total);
  });

  it("GET /api/agents/health serves the summary", () => {
    const w = runWorld(createWorld(20, undefined, 42), 30);
    let body = "";
    const res: any = { statusCode: 200, setHeader: () => {}, end: (b?: string) => { body = b ?? ""; } };
    expect(apiRoutes({ method: "GET" } as any, res, w, new URL("http://localhost/api/agents/health"))).toBe(true);
    const j = JSON.parse(body);
    expect(j.total).toBeGreaterThan(0);
    expect(Object.keys(j.byHealth).sort()).toEqual(["lelah", "sakit_berat", "sakit_ringan", "sehat"]);
    expect(j.sickLeave).toHaveProperty("open");
    expect(Array.isArray(j.alerts)).toBe(true);
  });
});
