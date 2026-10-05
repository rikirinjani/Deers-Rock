import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";
import { runMmConference, resetMmConferenceCounter } from "../src/engine/mm-conference.js";

describe("M&M Conference", () => {
  it("does not crash with minimal world", () => {
    resetMmConferenceCounter();
    const w = createWorld(5);
    runWorld(w, 10);
    expect(() => runMmConference(w.state, w.clock, w.queue)).not.toThrow();
  });

  it("returns valid structure", () => {
    resetMmConferenceCounter();
    const w = createWorld(20);
    runWorld(w, 100);
    const result = runMmConference(w.state, w.clock, w.queue);
    expect(result).toBeDefined();
    expect(result.state).toBeDefined();
  });

  it("increments conference ID", () => {
    resetMmConferenceCounter();
    const w = createWorld(20);
    runWorld(w, 100);
    const r1 = runMmConference(w.state, w.clock, w.queue);
    const r2 = runMmConference(w.state, w.clock, w.queue);
    if (r1.conference && r2.conference) {
      expect(r2.conference.id).toBe(r1.conference.id + 1);
    }
  });

  it("persists in state", () => {
    resetMmConferenceCounter();
    const w = createWorld(20);
    runWorld(w, 100);
    runMmConference(w.state, w.clock, w.queue);
    expect(w.state._mmLastConferenceTick).toBeGreaterThanOrEqual(0);
  });
});
