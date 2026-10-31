/**
 * Vital-sign drift (owner-approved fix, 2026-10-31). Regression for the
 * biased random walk (`floor(rng*6) - 3`, mean -0.5/min, no mean reversion)
 * that turned the whole patient pool bradycardic, hypotensive and hypoxic
 * within an hour (outcome-v1 finding 1: 93.5% of inpatients "deteriorated").
 */
import { describe, it, expect } from "vitest";
import { driftVitals, noiseHalfWidth, VITALS_PARAMS } from "../src/engine/vitals-model.js";
import { vitalsUpdateHandler } from "../src/engine/markov.js";
import { generatePatient, generatePatientPool } from "../src/patient/generator.js";
import { createRng, createClock } from "../src/engine/clock.js";
import { EventQueue } from "../src/engine/event-queue.js";
import { createWorld, runWorld } from "../src/engine/world.js";
import type { Vitals } from "../src/patient/schema.js";

const KEYS = Object.keys(VITALS_PARAMS) as (keyof Vitals)[];
const BASE: Vitals = { heartRate: 76, bloodPressureSystolic: 124, bloodPressureDiastolic: 80, temperature: 36.9, oxygenSaturation: 97, respiratoryRate: 17, painLevel: 2 };

/** Run n independent patients (all at BASE) for `minutes`, calling `each` after every minute. */
function simulate(n: number, minutes: number, seed: number, each?: (vs: Vitals[], minute: number) => void, start: Vitals = BASE): Vitals[] {
  const rng = createRng(seed).next;
  let vs = Array.from({ length: n }, () => ({ ...start }));
  for (let t = 1; t <= minutes; t++) {
    vs = vs.map(v => driftVitals(v, BASE, rng));
    each?.(vs, t);
  }
  return vs;
}

describe("vitals drift model", () => {
  it("is unbiased: long-run means stay on the baseline (the old walk lost 0.5 per minute)", () => {
    const sums: Record<string, number> = {}, counts: Record<string, number> = {};
    simulate(200, 2880, 1, (vs, t) => {
      if (t < 120 || t % 20) return; // after warm-up, sampled
      for (const k of KEYS) { sums[k] = (sums[k] ?? 0) + vs.reduce((a, v) => a + (v[k] - BASE[k]), 0); counts[k] = (counts[k] ?? 0) + vs.length; }
    });
    for (const k of KEYS) {
      const bias = sums[k]! / counts[k]!;
      // Pain is floored at 0 (baseline 2), which lifts its mean slightly.
      expect(Math.abs(bias), k).toBeLessThan(k === "painLevel" ? 0.4 : 0.1 * VITALS_PARAMS[k].sd);
    }
  });

  it("holds each vital's stationary SD near its target", () => {
    const sq: Record<string, number> = {}; let n = 0;
    simulate(300, 1500, 2, (vs, t) => {
      if (t < 200 || t % 25) return;
      n += vs.length;
      for (const k of KEYS) sq[k] = (sq[k] ?? 0) + vs.reduce((a, v) => a + (v[k] - BASE[k]) ** 2, 0);
    });
    for (const k of KEYS) {
      const sd = Math.sqrt(sq[k]! / n);
      expect(sd, k).toBeGreaterThan(VITALS_PARAMS[k].sd * 0.75);
      expect(sd, k).toBeLessThan(VITALS_PARAMS[k].sd * 1.3);
    }
  });

  it("pulls a displaced vital back to the baseline", () => {
    const displaced: Vitals = { ...BASE, heartRate: 110, oxygenSaturation: 91, bloodPressureSystolic: 160 };
    const after = simulate(300, 150, 3, undefined, displaced);
    const mean = (k: keyof Vitals) => after.reduce((a, v) => a + v[k], 0) / after.length;
    expect(Math.abs(mean("heartRate") - BASE.heartRate)).toBeLessThan(1.5);
    expect(Math.abs(mean("oxygenSaturation") - BASE.oxygenSaturation)).toBeLessThan(0.5);
    expect(Math.abs(mean("bloodPressureSystolic") - BASE.bloodPressureSystolic)).toBeLessThan(2.5);
  });

  it("every vital actually moves, including coarse ones (pain once never moved)", () => {
    const seen: Record<string, Set<number>> = {};
    simulate(1, 3000, 4, vs => { for (const k of KEYS) (seen[k] ??= new Set()).add(vs[0]![k]); });
    for (const k of KEYS) expect(seen[k]!.size, k).toBeGreaterThan(2);
  });

  it("respects the physiological clamps and the stored precision", () => {
    const extreme: Vitals = { heartRate: 120, bloodPressureSystolic: 180, bloodPressureDiastolic: 120, temperature: 39.5, oxygenSaturation: 100, respiratoryRate: 30, painLevel: 10 };
    simulate(100, 600, 5, vs => {
      for (const v of vs) for (const k of KEYS) {
        const { min, max, step } = VITALS_PARAMS[k];
        expect(v[k]).toBeGreaterThanOrEqual(min); expect(v[k]).toBeLessThanOrEqual(max);
        expect(Math.abs(Math.round(v[k] / step) * step - v[k])).toBeLessThan(1e-9);
      }
    }, extreme);
  });

  it("draws exactly 7 numbers per call and is deterministic", () => {
    let draws = 0; const rng = createRng(6).next;
    driftVitals(BASE, BASE, () => { draws++; return rng(); });
    expect(draws).toBe(7);
    expect(driftVitals(BASE, BASE, createRng(6).next)).toEqual(driftVitals(BASE, BASE, createRng(6).next));
  });

  it("noise half-widths follow sd·sqrt(2k)·sqrt(3)", () => {
    for (const k of KEYS) { const p = VITALS_PARAMS[k]; expect(noiseHalfWidth(k)).toBeCloseTo(p.sd * Math.sqrt(2 * p.k) * Math.sqrt(3), 10); }
  });
});

describe("vitals in the simulation", () => {
  it("a patient pool stays healthy for hours: no collapse to bradycardia, hypotension, hypoxia", () => {
    const pts = generatePatientPool(200, createRng(8).next);
    const rng = createRng(9).next;
    let vs = pts.map(p => p.vitals); const base = pts.map(p => p.baselineVitals!);
    for (let t = 0; t < 480; t++) vs = vs.map((v, i) => driftVitals(v, base[i]!, rng));
    const mean = (k: keyof Vitals, a: Vitals[]) => a.reduce((s, v) => s + v[k], 0) / a.length;
    // The old walk: mean HR 76 -> 57, SBP 124 -> 97, SpO2 97.8 -> 92.3 within one hour.
    expect(Math.abs(mean("heartRate", vs) - mean("heartRate", base))).toBeLessThan(2);
    expect(Math.abs(mean("bloodPressureSystolic", vs) - mean("bloodPressureSystolic", base))).toBeLessThan(3);
    expect(Math.abs(mean("oxygenSaturation", vs) - mean("oxygenSaturation", base))).toBeLessThan(0.5);
    const atFloor = vs.filter(v => v.heartRate === 50 || v.oxygenSaturation === 90 || v.bloodPressureSystolic === 90).length;
    expect(atFloor / vs.length).toBeLessThan(0.02);
  });

  it("generated patients carry a baseline equal to their generated vitals", () => {
    const p = generatePatient(createRng(10).next);
    expect(p.baselineVitals).toEqual(p.vitals);
    expect(p.baselineVitals).not.toBe(p.vitals);
  });

  it("vitalsUpdateHandler drifts around the baseline without mutating its input", () => {
    const w = createWorld(10, undefined, 3);
    const before = JSON.stringify(Array.from(w.state.patients.values()));
    const clock = createClock(60, 3); clock.tick = 1;
    const s2 = vitalsUpdateHandler(w.state, clock, new EventQueue());
    expect(JSON.stringify(Array.from(w.state.patients.values()))).toBe(before);
    for (const [id, p] of s2.patients) expect(p.baselineVitals).toEqual(w.state.patients.get(id)!.baselineVitals);
  });

  it("a patient without a baseline (older snapshot) adopts current vitals as the baseline", () => {
    const w = createWorld(3, undefined, 3);
    const [id, p] = Array.from(w.state.patients.entries())[0]!;
    const { baselineVitals: _drop, ...bare } = p;
    w.state.patients.set(id, bare as typeof p);
    const clock = createClock(60, 3); clock.tick = 1;
    const s2 = vitalsUpdateHandler(w.state, clock, new EventQueue());
    expect(s2.patients.get(id)!.baselineVitals).toEqual(p.vitals);
  });

  it("over two simulated days the active inpatients are mostly in normal vital ranges", () => {
    const w = runWorld(createWorld(30, undefined, 42), 2 * 1440);
    const active = Array.from(w.state.encounters.values()).filter(e => e.status === "active").map(e => w.state.patients.get(e.patientId)!).filter(Boolean);
    expect(active.length).toBeGreaterThan(20);
    const hrOk = active.filter(p => p.vitals.heartRate >= 55 && p.vitals.heartRate <= 105).length / active.length;
    const spo2Ok = active.filter(p => p.vitals.oxygenSaturation >= 94).length / active.length;
    expect(hrOk).toBeGreaterThan(0.9);
    expect(spo2Ok).toBeGreaterThan(0.9);
  });
});
