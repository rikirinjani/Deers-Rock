import { describe, it, expect, vi, afterEach } from "vitest";
import http from "node:http";
import { AddressInfo } from "node:net";
import { createSimControl, type SimEvent } from "../src/engine/sim-control.js";
import { createRestServer, apiRoutes } from "../src/api/rest.js";
import { createWorld, type World } from "../src/engine/world.js";

/**
 * Epic V M5.2: the dashboard's pause/speed controls now act on the simulation
 * loop (before, they only changed the browser's poll interval and the world
 * kept stepping), and /api/stream pushes one event per tick.
 * M5.1: /api/encounters?q= matches patient ID or patient name.
 */

afterEach(() => { vi.useRealTimers(); });

describe("createSimControl", () => {
  it("steps on the base interval, stops while paused, resumes", () => {
    vi.useFakeTimers();
    let ticks = 0;
    const c = createSimControl(() => ++ticks, 1000);
    vi.advanceTimersByTime(3000);
    expect(ticks).toBe(3);
    c.pause();
    vi.advanceTimersByTime(5000);
    expect(ticks).toBe(3);
    expect(c.status().paused).toBe(true);
    c.resume();
    vi.advanceTimersByTime(2000);
    expect(ticks).toBe(5);
    c.stop();
  });

  it("speed divides the wall-clock period and rejects other values", () => {
    vi.useFakeTimers();
    let ticks = 0;
    const c = createSimControl(() => ++ticks, 1000);
    expect(c.setSpeed(5)).toBe(true);
    expect(c.status().tickMs).toBe(200);
    vi.advanceTimersByTime(1000);
    expect(ticks).toBe(5);
    expect(c.setSpeed(3)).toBe(false);
    expect(c.status().speed).toBe(5);
    c.stop();
  });

  it("notifies subscribers of ticks and state changes, and survives a throwing subscriber", () => {
    vi.useFakeTimers();
    const c = createSimControl(() => 7, 1000);
    const seen: SimEvent[] = [];
    c.subscribe(() => { throw new Error("bad subscriber"); });
    const off = c.subscribe(ev => seen.push(ev));
    vi.advanceTimersByTime(1000);
    c.pause();
    off();
    c.resume();
    expect(seen.map(e => e.kind)).toEqual(["tick", "state"]);
    expect(seen[0]!.status.tick).toBe(7);
    expect(seen[1]!.status.paused).toBe(true);
    c.stop();
  });
});

function listen(server: ReturnType<typeof createRestServer>): Promise<number> {
  // RestServer.listen does not expose the bound port; bind to an ephemeral port via a probe.
  return new Promise(resolve => {
    const probe = http.createServer().listen(0, "127.0.0.1", () => {
      const port = (probe.address() as AddressInfo).port;
      probe.close(() => { server.listen(port, "127.0.0.1"); setTimeout(() => resolve(port), 50); });
    });
  });
}

describe("REST run control (/api/sim, /api/stream)", () => {
  it("pauses, resumes and sets speed over HTTP; rejects bad input; 503 without a controller", async () => {
    const w = createWorld(5, undefined, 42);
    let ticks = 0;
    const control = createSimControl(() => ++ticks, 60_000);
    const server = createRestServer(() => w, control);
    const port = await listen(server);
    const base = `http://127.0.0.1:${port}`;
    try {
      expect((await (await fetch(`${base}/api/sim`)).json()).paused).toBe(false);
      const p = await fetch(`${base}/api/sim/pause`, { method: "POST" });
      expect((await p.json()).paused).toBe(true);
      expect(control.status().paused).toBe(true);
      expect((await fetch(`${base}/api/sim/pause`)).status).toBe(405);
      const s = await fetch(`${base}/api/sim/speed?x=2`, { method: "POST" });
      expect((await s.json()).speed).toBe(2);
      expect((await fetch(`${base}/api/sim/speed?x=9`, { method: "POST" })).status).toBe(400);
      const r = await fetch(`${base}/api/sim/resume`, { method: "POST" });
      expect((await r.json()).paused).toBe(false);
    } finally {
      control.stop();
      server.close();
    }
    const bare = createRestServer(() => w);
    const port2 = await listen(bare);
    try {
      expect((await fetch(`http://127.0.0.1:${port2}/api/sim`)).status).toBe(503);
    } finally { bare.close(); }
  });

  it("streams an initial state event and a tick event", async () => {
    const w = createWorld(5, undefined, 42);
    const control = createSimControl(() => 42, 60_000);
    const server = createRestServer(() => w, control);
    const port = await listen(server);
    const ac = new AbortController();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/stream`, { signal: ac.signal });
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let text = dec.decode((await reader.read()).value);
      expect(text).toContain("event: state");
      control.setSpeed(2); // emits a state event without waiting for a tick
      text += dec.decode((await reader.read()).value);
      expect(text.match(/event: state/g)!.length).toBe(2);
      expect(text).toContain('"speed":2');
    } finally {
      ac.abort();
      control.stop();
      server.close();
    }
  });
});

describe("/api/encounters?q= (Epic V M5.1)", () => {
  function get(w: World, q: string): any[] {
    let body = "";
    const res: any = { statusCode: 200, setHeader: () => {}, end: (b?: string) => { body = b ?? ""; } };
    apiRoutes({ method: "GET" } as any, res, w, new URL(`/api/encounters?q=${encodeURIComponent(q)}`, "http://localhost"));
    return JSON.parse(body);
  }

  it("matches the patient ID or the patient's name, case-insensitively", () => {
    const w = createWorld(10, undefined, 42);
    // A fresh world has no encounters yet: hand-construct two (as api-encounters.test.ts does).
    const [p1, p2] = Array.from(w.state.patients.values());
    p1!.name = "Siti Rahmawati";
    p2!.name = "Budi Santoso";
    for (const [id, pid] of [["ENC-Q1", p1!.id], ["ENC-Q2", p2!.id]] as const) {
      w.state.encounters.set(id, { id, patientId: pid, type: "inpatient", startTime: 0, endTime: null,
        status: "active", payer: "Self-pay", primaryDiagnosis: "I10" });
    }
    expect(get(w, "RAHMA").map(x => x.id)).toEqual(["ENC-Q1"]);
    expect(get(w, "budi").map(x => x.id)).toEqual(["ENC-Q2"]);
    expect(get(w, p2!.id.toLowerCase()).map(x => x.id)).toEqual(["ENC-Q2"]);
    expect(get(w, "zz-no-such-patient-zz")).toEqual([]);
  });
});
