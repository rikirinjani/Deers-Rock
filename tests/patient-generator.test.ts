import { describe, it, expect } from "vitest";
import { generatePatient, generatePatientPool } from "../src/patient/generator.js";
import { createRng } from "../src/engine/clock.js";

describe("Patient Generator", () => {
  it("generates a patient with required fields", () => {
    const p = generatePatient();
    expect(p.id).toMatch(/^PAT-/);
    expect(p.name).toBeTruthy();
    expect(p.age).toBeGreaterThanOrEqual(18);
    expect(["male", "female"]).toContain(p.gender);
    expect(p.diagnoses.length).toBeGreaterThanOrEqual(1);
  });

  it("generates a pool of patients", () => {
    const pool = generatePatientPool(10);
    expect(pool).toHaveLength(10);
    const ids = new Set(pool.map(p => p.id));
    expect(ids.size).toBe(10);
  });

  it("generates realistic vitals", () => {
    const p = generatePatient();
    expect(p.vitals.heartRate).toBeGreaterThanOrEqual(50);
    expect(p.vitals.heartRate).toBeLessThanOrEqual(120);
    expect(p.vitals.oxygenSaturation).toBeGreaterThanOrEqual(90);
  });
});

// Epic VII M7.1: Indonesian names pool (2026-10-26 audit)
describe("patient names pool", () => {
  it("draws from a wide pool with no padded or empty name parts", () => {
    const pts = generatePatientPool(2000, createRng(11).next);
    const names = pts.map(p => p.name);
    for (const n of names) {
      expect(n).toBe(n.trim());
      expect(n).not.toMatch(/\s{2,}/);
    }
    const first = new Set(pts.map(p => p.name.split(" ")[0]));
    expect(first.size).toBeGreaterThan(150);
    expect(new Set(names).size).toBeGreaterThan(1500);
  });

  it("includes South Sulawesi (Bugis-Makassar, Toraja) names for the hospital's catchment", () => {
    const names = generatePatientPool(3000, createRng(12).next).map(p => p.name);
    expect(names.some(n => /\b(Mappaseng|Paturusi|Pallawa|Sompa|Mattalitti|Makkasau|Massalinri)\b/.test(n))).toBe(true);
    expect(names.some(n => /\b(Sampe|Tandi|Rante|Palinggi)\b/.test(n))).toBe(true);
  });

  it("is deterministic for a seed", () => {
    const a = generatePatientPool(50, createRng(5).next).map(p => p.name);
    const b = generatePatientPool(50, createRng(5).next).map(p => p.name);
    expect(a).toEqual(b);
  });
});
