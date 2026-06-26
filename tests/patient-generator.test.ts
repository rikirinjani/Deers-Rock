import { describe, it, expect } from "vitest";
import { generatePatient, generatePatientPool } from "../src/patient/generator.js";

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
