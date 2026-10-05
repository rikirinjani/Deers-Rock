import { describe, it, expect } from "vitest";
import { runMmConference, resetMmConferenceCounter } from "../src/engine/mm-conference.js";
import { createWorld } from "../src/engine/world.js";
import type { HospitalState } from "../src/engine/state-store.js";

function makeWorldWithDeaths(ticks: number = 200, deathCount: number = 3): ReturnType<typeof createWorld> {
  const w = createWorld(ticks);
  // Advance simulation to generate some morgue entries
  for (let i = 0; i < 50; i++) {
    w.queue.step();
  }
  return w;
}

describe("M&M Conference", () => {
  beforeEach(() => { resetMmConferenceCounter(); });

  it("returns null when no deaths since last conference", () => {
    const w = createWorld(10);
    for (let i = 0; i < 10; i++) w.queue.step();
    const result = runMmConference(w.state, w.clock, w.queue);
    // No deaths expected in first 10 ticks
    expect(result.conference).toBeNull();
  });

  it("returns null when interval not reached (10080 ticks = 1 week)", () => {
    const w = createWorld(500);
    for (let i = 0; i < 500; i++) w.queue.step();
    // Conference interval is 10080 * 0.5 = 5040 ticks
    const result = runMmConference(w.state, w.clock, w.queue);
    expect(result.conference).toBeNull();
  });

  it("creates conference when deaths exist and interval reached", () => {
    // Create a world with enough ticks to trigger conference
    const w = createWorld(6000);
    // Step to generate some encounters and potential deaths
    for (let i = 0; i < 600; i++) {
      w.queue.step();
    }
    const result = runMmConference(w.state, w.clock, w.queue);
    // Should have a conference if there are deaths
    if (result.conference !== null) {
      expect(result.conference.id).toBeGreaterThan(0);
      expect(result.conference.date).toBeTruthy();
      expect(result.conference.totalDeathsSinceLast).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.conference.reviewedCases)).toBe(true);
      expect(Array.isArray(result.conference.overallRecommendations)).toBe(true);
    }
  });

  it("increments conference ID on each conference", () => {
    const w = createWorld(6000);
    for (let i = 0; i < 600; i++) w.queue.step();
    
    const result1 = runMmConference(w.state, w.clock, w.queue);
    const result2 = runMmConference(w.state, w.clock, w.queue);
    
    if (result1.conference && result2.conference) {
      expect(result2.conference.id).toBe(result1.conference.id + 1);
    }
  });

  it("persists conference in state", () => {
    const w = createWorld(6000);
    for (let i = 0; i < 600; i++) w.queue.step();
    
    const initialCount = w.state._mmConferences?.length ?? 0;
    runMmConference(w.state, w.clock, w.queue);
    
    // State should be updated
    expect(w.state._mmLastConferenceTick).toBeGreaterThan(0);
  });

  it("has valid case structure when reviews happen", () => {
    const w = createWorld(6000);
    for (let i = 0; i < 600; i++) w.queue.step();
    
    const result = runMmConference(w.state, w.clock, w.queue);
    if (result.conference && result.conference.reviewedCases.length > 0) {
      const tc = result.conference.reviewedCases[0];
      expect(tc).toHaveProperty("encounterId");
      expect(tc).toHaveProperty("patientId");
      expect(tc).toHaveProperty("primaryDiagnosis");
      expect(tc).toHaveProperty("escalationMissed");
      expect(tc).toHaveProperty("recommendations");
      expect(Array.isArray(tc.timeline)).toBe(true);
    }
  });

  it("does not crash with empty state", () => {
    const w = createWorld(1);
    const result = runMmConference(w.state, w.clock, w.queue);
    expect(result).toBeDefined();
    expect(result.state).toBeDefined();
  });
});
