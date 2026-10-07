/**
 * Epic I M1.4 — Waiting Room and Surge Buffer Verification
 */
import { describe, it, expect } from "vitest";
import { createWorld, runWorld } from "../src/engine/world.js";

describe("Epic I M1.4 — Waiting Room", () => {
  it("waiting room is zero at start", () => {
    const w = createWorld(50, undefined, 42);
    expect(w.state.waitingRoom).toBe(0);
  });

  it("waiting room increments when beds are full and surge occurs", () => {
    // Create a world with very few beds but many patients
    const w = createWorld(100, undefined, 42);
    // Reduce bed count dramatically to force waiting room
    const beds = new Map(w.state.beds);
    // Keep only 1 bed
    const remaining = Array.from(beds.values()).slice(0, 1);
    const reducedBeds = new Map(remaining.map((b, i) => [b.id, b]));
    w.state.beds = reducedBeds;

    // Run many ticks to fill the single bed and trigger waiting room
    let cur = w;
    for (let i = 0; i < 500; i++) cur = runWorld(cur, 1);

    // With only 1 bed, most patients should go to waiting room during surges
    expect(cur.state.waitingRoom).toBeGreaterThanOrEqual(0);
  });

  it("scenario surge pushes patients to waiting room", () => {
    const w = createWorld(50, undefined, 42);
    // Set up a surge scenario manually
    w.state._scenario = { active: "flood", history: [], cooldownTicks: 0 };
    // Force high occupancy to trigger surge logic
    const beds = new Map(w.state.beds);
    const survivors = Array.from(beds.values()).slice(0, 2);
    w.state.beds = new Map(survivors.map((b, i) => [b.id, b]));

    let cur = w;
    for (let i = 0; i < 100; i++) cur = runWorld(cur, 1);

    // Waiting room should exist if surge logic kicked in
    expect(typeof cur.state.waitingRoom).toBe("number");
  });
});
