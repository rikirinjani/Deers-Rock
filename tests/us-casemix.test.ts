/**
 * Epic X M10.5b (first slice): US case mix. Weights are placeholders pending
 * M10.5c; these tests pin structure, coverage and determinism.
 */
import { describe, it, expect, afterEach } from "vitest";
import { US_DIAGNOSES, US_EXCLUDED_CODES, USCaseMix } from "../src/locale/us-casemix.js";
import { IndonesiaCaseMix } from "../src/locale/indonesia.js";
import { ICD10_DIAGNOSES } from "../src/patient/icd-pool.js";
import { getCaseMix } from "../src/locale/registry.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { useUSAdapter, resetBillingAdapter } from "../src/engine/billing/us-adapter.js";
import { groupForIcd, NO_ACUTE_SIGNATURE } from "../src/engine/illness-model.js";
import { assignMsDrg } from "../src/engine/billing/us-drg.js";
import { generatePatient, dengueAgeFactor } from "../src/patient/generator.js";
import { createWorld, runWorld } from "../src/engine/world.js";

const lcg = (seed: number) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
afterEach(() => { resetLocale(); resetBillingAdapter(); });

describe("US case mix", () => {
  it("every US category is handled by the illness model", () => {
    const unmapped = US_DIAGNOSES.map(d => d.code).filter(c => groupForIcd(c) === null && !NO_ACUTE_SIGNATURE.includes(c));
    expect(unmapped).toEqual([]);
  });

  it("every US category has a DRG family (no fallback to the old allowed ratio)", () => {
    const noDrg = US_DIAGNOSES.map(d => d.code).filter(c => !assignMsDrg([c], false));
    expect(noDrg).toEqual([]);
  });

  it("endemic-only diseases are excluded, the rest of the pool is kept", () => {
    const codes = new Set(US_DIAGNOSES.map(d => d.code));
    for (const c of US_EXCLUDED_CODES) expect(codes.has(c)).toBe(false);
    expect(US_DIAGNOSES.length).toBe(ICD10_DIAGNOSES.filter(d => !US_EXCLUDED_CODES.includes(d.code)).length);
    expect(US_DIAGNOSES.every(d => d.weight > 0)).toBe(true);
  });

  it("selection weight: hip fracture skews elderly, dengue age factor is Indonesian only", () => {
    const us = new USCaseMix(), id = new IndonesiaCaseMix();
    expect(us.ageWeight("S72", 80)).toBeGreaterThan(us.ageWeight("S72", 30));
    expect(us.ageWeight("A91", 10)).toBe(1);
    expect(id.ageWeight("A91", 10)).toBe(dengueAgeFactor(10));
    expect(id.ageWeight("I10", 50)).toBe(1);
  });

  it("generation draws only US categories and is deterministic", () => {
    useUSLocale();
    expect(getCaseMix().config.countryCode).toBe("US");
    const allowed = new Set(US_DIAGNOSES.map(d => d.code).concat("Z00"));
    const codes = (seed: number) => { const r = lcg(seed); return Array.from({ length: 400 }, () => generatePatient(r).diagnoses.map(d => d.code).join(",")); };
    const a = codes(5);
    for (const row of a) for (const c of row.split(",")) expect(allowed.has(c)).toBe(true);
    expect(codes(5)).toEqual(a);
  });

  it("locale reset restores the Indonesian pool", () => {
    useUSLocale();
    resetLocale();
    expect(getCaseMix().config.countryCode).toBe("ID");
    expect(getCaseMix().diagnoses.length).toBe(ICD10_DIAGNOSES.length);
  });

  it("a US world runs with no endemic diagnoses", () => {
    useUSLocale();
    useUSAdapter();
    const w = runWorld(createWorld(40, undefined, 3), 1500);
    const dx = new Set(Array.from(w.state.patients.values()).flatMap(p => p.diagnoses.map(d => d.code)));
    for (const c of US_EXCLUDED_CODES) expect(dx.has(c)).toBe(false);
    expect(dx.size).toBeGreaterThan(10);
  });
});
