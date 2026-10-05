/**
 * Core-semantics guard.
 *
 * Proves that exercising the sandbox layer does NOT change the DR core's
 * deterministic behaviour: a fixed (seed, ticks) core run produces the identical
 * fingerprint before and after sandbox sessions are created and stepped.
 *
 * This is a software/product test, not a scientific experiment.
 */
import { describe, it, expect } from "vitest";
import { createWorld, step, type World } from "../src/engine/world.js";
import { createSession, stepSession, setActiveSession } from "../src/sandbox/session.js";

function fp(w: World): string {
  const st = w.state;
  const occupied = Array.from(st.beds.values()).filter((b) => b.patientId).length;
  const first = Array.from(st.patients.values())[0];
  return [
    w.clock.tick, st.patients.size, st.encounters.size, occupied, st.morgue.length,
    first ? JSON.stringify(first.vitals) : "",
  ].join("|");
}

function coreRun(seed: number, ticks: number): string {
  let w = createWorld(50, undefined, seed);
  for (let i = 0; i < ticks; i++) w = step(w);
  return fp(w);
}

describe("core-semantics guard", () => {
  it("core determinism is unchanged by sandbox activity", () => {
    const before = coreRun(42, 40);

    // Exercise the sandbox: two full lifecycles with different seeds.
    const a = createSession({ seed: 999 }); setActiveSession(a); stepSession(a, 25);
    setActiveSession(null);
    const b = createSession({ seed: 123 }); setActiveSession(b); stepSession(b, 10);
    setActiveSession(null);

    const after = coreRun(42, 40);
    expect(after).toBe(before);
  });

  it("sandbox sessions never create a journal file (ephemeral)", () => {
    const s = createSession({ seed: 11 });
    stepSession(s, 5);
    // createWorld was called with journalPath === undefined; the world exposes no journal path.
    expect((s.world as unknown as { journalPath?: unknown }).journalPath ?? null).toBeNull();
  });
});
