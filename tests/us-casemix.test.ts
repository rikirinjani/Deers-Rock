/**
 * Epic X M10.5b (first slice): US case mix. Weights are placeholders pending
 * M10.5c; these tests pin structure, coverage and determinism.
 */
import { describe, it, expect, afterEach } from "vitest";
import { US_DIAGNOSES, US_EXCLUDED_CODES, US_EXTRA_DIAGNOSES, USCaseMix } from "../src/locale/us-casemix.js";
import { IndonesiaCaseMix } from "../src/locale/indonesia.js";
import { ICD10_DIAGNOSES } from "../src/patient/icd-pool.js";
import { getCaseMix } from "../src/locale/registry.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { useUSAdapter, resetBillingAdapter } from "../src/engine/billing/us-adapter.js";
import { groupForIcd, NO_ACUTE_SIGNATURE } from "../src/engine/illness-model.js";
import { ICD_PROTOCOLS } from "../src/engine/clinical-knowledge.js";
import { resolveOrderableMed } from "../src/engine/ai-doctor.js";
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
    expect(US_DIAGNOSES.length).toBe(ICD10_DIAGNOSES.filter(d => !US_EXCLUDED_CODES.includes(d.code)).length + US_EXTRA_DIAGNOSES.length);
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

describe("US-central categories (slice 4)", () => {
  const NEW = ["F10", "F11", "T40", "E66", "K70"];

  it("exist only in the US pool, with eligible ages and sexes", () => {
    expect(US_EXTRA_DIAGNOSES.map(d => d.code)).toEqual(NEW);
    for (const c of NEW) expect(ICD10_DIAGNOSES.some(d => d.code === c)).toBe(false);
    for (const d of US_EXTRA_DIAGNOSES) { expect(d.weight).toBeGreaterThan(0); expect(d.minAge).toBeLessThan(d.maxAge); }
  });

  it("map to illness groups (or none, deliberately) and each has a protocol", () => {
    expect(groupForIcd("T40")).toBe("opioid_overdose");
    expect(groupForIcd("F10")).toBe("alcohol_withdrawal");
    expect(groupForIcd("K70")).toBe("cirrhosis");
    expect(groupForIcd("E66")).toBeNull();
    expect(groupForIcd("F11")).toBeNull();
    for (const c of NEW) expect(ICD_PROTOCOLS.some(p => p.code === c && p.actions.length > 0)).toBe(true);
  });

  it("every medication in the new protocols is orderable under the US formulary and not in Indonesia", () => {
    const meds = ICD_PROTOCOLS.filter(p => NEW.includes(p.code)).flatMap(p => p.actions.filter(a => a.type === "medication"));
    expect(meds.length).toBeGreaterThan(5);
    useUSLocale();
    const unresolved = meds.filter(a => !resolveOrderableMed(a.label, a.detail)).map(a => a.label);
    expect(unresolved).toEqual([]);
    expect(resolveOrderableMed("Thiamine 100mg", "x")?.med.code).toBe("THI");
    resetLocale();
    expect(resolveOrderableMed("Thiamine 100mg", "x")).toBeUndefined();
  });

  it("US generation produces the new categories at plausible rates", () => {
    useUSLocale();
    const r = lcg(21);
    const counts = new Map<string, number>();
    const N = 4000;
    for (let i = 0; i < N; i++) for (const d of generatePatient(r).diagnoses) counts.set(d.code, (counts.get(d.code) ?? 0) + 1);
    for (const c of NEW) expect(counts.get(c) ?? 0, c).toBeGreaterThan(0);
    expect(counts.get("E66")!).toBeGreaterThan(counts.get("T40")!);
  });
});

describe("US case mix: HCUP fit (M10.5c)", () => {
  it("fitted codes carry the fitted weights and the Indonesian pool is untouched", () => {
    const w = (c: string) => US_DIAGNOSES.find(d => d.code === c)!.weight;
    expect([w("A40"), w("A49"), w("I50"), w("M17"), w("I21"), w("N39")]).toEqual([9.5, 9.5, 25.5, 43, 13.5, 3.5]);
    expect(ICD10_DIAGNOSES.find(d => d.code === "A40")!.weight).toBe(2);
    expect(ICD10_DIAGNOSES.find(d => d.code === "M17")!.weight).toBe(5);
  });
});
