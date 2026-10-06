/**
 * ADR-016 wave 1: ESI-lite triage tests.
 */
import { describe, it, expect } from "vitest";
import { assignAcuity } from "../src/engine/emergency.js";

describe("ADR-016 wave 1 — ESI-lite triage", () => {
  it("level 1: immediate life threat complaints", () => {
    expect(assignAcuity("Chest pain", 0)).toBe(1);
    expect(assignAcuity("Shortness of breath", 0)).toBe(1);
    expect(assignAcuity("Altered mental status", 0)).toBe(1);
    expect(assignAcuity("Seizure", 0)).toBe(1);
    expect(assignAcuity("Motor vehicle accident", 0)).toBe(1);
  });

  it("level 2: high risk / severe complaints (no uptriade needed)", () => {
    expect(assignAcuity("Abdominal pain", 0)).toBe(2);
    expect(assignAcuity("Fever", 0)).toBe(2);
    expect(assignAcuity("Bleeding", 0)).toBe(2);
    expect(assignAcuity("Allergic reaction", 0)).toBe(2);
  });

  it("level 3: moderate complaints, uptriade to 2 when instability draw fires", () => {
    // Base 3, instability draw < 0.15 → uptriade to 2
    expect(assignAcuity("Trauma from fall", 0.1)).toBe(2);
    // Base stays 3 when instability draw doesn't fire
    expect(assignAcuity("Trauma from fall", 0.2)).toBe(3);
  });

  it("level 4: one-resource complaints", () => {
    expect(assignAcuity("Back pain", 0)).toBe(4);
  });

  it("level 5: non-urgent complaints (new — enables self-referral routing)", () => {
    expect(assignAcuity("Medication refill", 0)).toBe(5);
    expect(assignAcuity("Suture removal", 0)).toBe(5);
    expect(assignAcuity("Minor rash", 0)).toBe(5);
  });

  it("all 5 ESI levels are reachable", () => {
    const levels = new Set<number>();
    levels.add(assignAcuity("Chest pain", 0));       // 1
    levels.add(assignAcuity("Abdominal pain", 0));   // 2
    levels.add(assignAcuity("Trauma from fall", 0.2)); // 3 (base)
    levels.add(assignAcuity("Back pain", 0));        // 4
    levels.add(assignAcuity("Medication refill", 0)); // 5
    expect(levels.size).toBe(5);
    expect(levels.has(1)).toBe(true);
    expect(levels.has(2)).toBe(true);
    expect(levels.has(3)).toBe(true);
    expect(levels.has(4)).toBe(true);
    expect(levels.has(5)).toBe(true);
  });

  it("uptriade only applies when base==3", () => {
    // Level 1 — never uptriades
    expect(assignAcuity("Chest pain", 0.01)).toBe(1);
    // Level 2 — never uptriades
    expect(assignAcuity("Fever", 0.01)).toBe(2);
    // Level 4 — never uptriades
    expect(assignAcuity("Back pain", 0.01)).toBe(4);
    // Level 5 — never uptriades
    expect(assignAcuity("Medication refill", 0.01)).toBe(5);
  });
});
