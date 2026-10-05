import { describe, it, expect } from "vitest";
import type { SandboxSession } from "../src/sandbox/session.js";
import { createSession, stepSession, resetSession, sessionStatus, setActiveSession } from "../src/sandbox/session.js";
import { createSandboxControlServer } from "../src/sandbox/server.js";

function fingerprint(s: SandboxSession): string {
  const st = s.world.state;
  const occupied = Array.from(st.beds.values()).filter((b) => b.patientId).length;
  const first = Array.from(st.patients.values())[0];
  return [
    s.world.clock.tick, st.patients.size, st.encounters.size, occupied, st.morgue.length,
    first ? JSON.stringify(first.vitals) : "",
  ].join("|");
}

describe("sandbox session lifecycle", () => {
  it("requires an explicit integer seed (no wall-clock fallback)", () => {
    expect(() => createSession({ seed: undefined as unknown as number })).toThrow();
    expect(() => createSession({ seed: 1.5 })).toThrow();
  });

  it("is deterministic for a repeated seed", () => {
    const a = createSession({ seed: 42 });
    stepSession(a, 50);
    const b = createSession({ seed: 42 });
    stepSession(b, 50);
    expect(fingerprint(b)).toBe(fingerprint(a));
  });

  it("diverges for different seeds", () => {
    const a = createSession({ seed: 42 }); stepSession(a, 50);
    const b = createSession({ seed: 43 }); stepSession(b, 50);
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });

  it("reset returns to tick 0 and reproduces the initial state", () => {
    const s = createSession({ seed: 7 });
    const init = fingerprint(s);
    stepSession(s, 30);
    resetSession(s);
    expect(s.ticks).toBe(0);
    expect(fingerprint(s)).toBe(init);
  });

  it("reports status", () => {
    const s = createSession({ seed: 5, patients: 20 });
    const st = sessionStatus(s);
    expect(st.sessionId).toBe(s.id);
    expect(st.seed).toBe(5);
    expect(st.patientsTotal).toBeGreaterThan(0);
  });

  it("rejects invalid step counts", () => {
    const s = createSession({ seed: 1 });
    expect(() => stepSession(s, -1)).toThrow();
    expect(() => stepSession(s, 1.5)).toThrow();
  });
});

async function withServer(fn: (port: number) => Promise<void>): Promise<void> {
  setActiveSession(null);
  const server = createSandboxControlServer();
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  try { await fn(port); } finally {
    await new Promise<void>((r) => server.close(() => r()));
    setActiveSession(null);
  }
}

describe("sandbox control server", () => {
  it("health", () => withServer(async (port) => {
    const r = await fetch(`http://127.0.0.1:${port}/sandbox/health`);
    expect(r.status).toBe(200);
    const b = await r.json() as { status: string; activeSession: string | null };
    expect(b.status).toBe("ok");
    expect(b.activeSession).toBeNull();
  }));

  it("full lifecycle: create → status → step → reset → delete", () => withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    const c = await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: 42, patients: 30 }) });
    expect(c.status).toBe(201);
    const created = await c.json() as { sessionId: string; seed: number };
    expect(created.seed).toBe(42);

    const s1 = await (await fetch(`${base}/sandbox/sessions/${created.sessionId}/status`)).json() as { tick: number };
    expect(s1.tick).toBe(0);

    const step = await fetch(`${base}/sandbox/sessions/${created.sessionId}/step`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticks: 25 }) });
    expect(step.status).toBe(200);
    expect(((await step.json()) as { tick: number }).tick).toBe(25);

    const reset = await fetch(`${base}/sandbox/sessions/${created.sessionId}/reset`, { method: "POST" });
    expect(reset.status).toBe(200);
    expect(((await reset.json()) as { tick: number }).tick).toBe(0);

    const del = await fetch(`${base}/sandbox/sessions/${created.sessionId}`, { method: "DELETE" });
    expect(del.status).toBe(204);
  }));

  it("enforces single-active-session (409)", () => withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: 1 }) });
    const second = await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: 2 }) });
    expect(second.status).toBe(409);
  }));

  it("400 on malformed JSON and invalid seed", () => withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    const bad = await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" });
    expect(bad.status).toBe(400);
    const noSeed = await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patients: 10 }) });
    expect(noSeed.status).toBe(400);
  }));

  it("404 for unknown route and unknown session", () => withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    expect((await fetch(`${base}/sandbox/nope`)).status).toBe(404);
    expect((await fetch(`${base}/sandbox/sessions/sbx-999/status`)).status).toBe(404);
  }));

  it("501 for scenario triggering (not currently supported)", () => withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    const c = await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: 3 }) });
    const { sessionId } = await c.json() as { sessionId: string };
    const r = await fetch(`${base}/sandbox/sessions/${sessionId}/scenario`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "earthquake" }) });
    expect(r.status).toBe(501);
  }));

  it("serves FHIR Patient and Observation for the active session", () => withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    const c = await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: 42, patients: 20 }) });
    const { sessionId } = await c.json() as { sessionId: string };

    const bundle = await (await fetch(`${base}/fhir/Patient`)).json() as { resourceType: string; total: number; entry: Array<{ resource: { resourceType: string; id: string } }> };
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.total).toBeGreaterThan(0);
    const pid = bundle.entry[0]!.resource.id;

    const one = await (await fetch(`${base}/fhir/Patient/${pid}`)).json() as { resourceType: string };
    expect(one.resourceType).toBe("Patient");

    const obs = await (await fetch(`${base}/fhir/Observation?patient=${pid}`)).json() as { resourceType: string; total: number };
    expect(obs.resourceType).toBe("Bundle");
    expect(obs.total).toBeGreaterThan(0);

    // cleanup
    await fetch(`${base}/sandbox/sessions/${sessionId}`, { method: "DELETE" });
  }));

  it("503 for FHIR when no session is active", () => withServer(async (port) => {
    const r = await fetch(`http://127.0.0.1:${port}/fhir/Patient`);
    expect(r.status).toBe(503);
  }));

  it("isolates lifecycles: same seed reproduces after delete+recreate", () => withServer(async (port) => {
    const base = `http://127.0.0.1:${port}`;
    const mk = async (seed: number) => {
      const c = await fetch(`${base}/sandbox/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed, patients: 20 }) });
      return (await c.json() as { sessionId: string }).sessionId;
    };
    const id1 = await mk(42);
    await fetch(`${base}/sandbox/sessions/${id1}/step`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticks: 30 }) });
    const p1 = await (await fetch(`${base}/fhir/Patient`)).json() as { total: number; entry: Array<{ resource: { id: string } }> };
    await fetch(`${base}/sandbox/sessions/${id1}`, { method: "DELETE" });

    const id2 = await mk(42);
    await fetch(`${base}/sandbox/sessions/${id2}/step`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticks: 30 }) });
    const p2 = await (await fetch(`${base}/fhir/Patient`)).json() as { total: number; entry: Array<{ resource: { id: string } }> };
    expect(p2.total).toBe(p1.total);
    expect(p2.entry[0]!.resource.id).toBe(p1.entry[0]!.resource.id);
  }));
});
