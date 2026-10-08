/**
 * ADR-022: Intervention Param Validation
 *
 * Tests for intervention schema validation:
 * - Required fields per type
 * - Type validators (count > 0, reduction in [0,1), etc.)
 * - Throw on invalid params
 */
import { describe, it, expect } from "vitest";
import {
  validateIntervention,
  type Intervention,
} from "../src/timeline/engine.js";

const validInterventions: { type: string; params: Record<string, unknown>; shouldPass: boolean }[] = [
  { type: "bed_increase", params: { count: 10 }, shouldPass: true },
  { type: "bed_increase", params: { count: 0 }, shouldPass: false },
  { type: "bed_increase", params: { count: -5 }, shouldPass: false },
  { type: "staff_reduction", params: { reduction: 0.3 }, shouldPass: true },
  { type: "staff_reduction", params: { reduction: 1.5 }, shouldPass: false },
  { type: "staff_reduction", params: { reduction: -0.1 }, shouldPass: false },
  { type: "supply_injection", params: { drugs: ["paracetamol"], reduction: 0.5 }, shouldPass: true },
  { type: "supply_injection", params: { drugs: [], reduction: 0.5 }, shouldPass: true },
  { type: "supply_injection", params: { reduction: 0.5 }, shouldPass: false },
  { type: "scenario_activate", params: { type: "fire" }, shouldPass: true },
  { type: "scenario_activate", params: { type: 123 }, shouldPass: false },
  { type: "policy_override", params: { policy: "admission_rate", value: 1.5 }, shouldPass: true },
  { type: "policy_override", params: { value: 1.5 }, shouldPass: false },
  { type: "custom", params: { anything: true }, shouldPass: true },
];

describe("ADR-022: Intervention Param Validation", () => {
  it("accepts valid bed_increase with positive count", () => {
    expect(() => validateIntervention({ type: "bed_increase", params: { count: 10 } })).not.toThrow();
  });

  it("rejects bed_increase with zero count", () => {
    expect(() => validateIntervention({ type: "bed_increase", params: { count: 0 } }))
      .toThrow("count");
  });

  it("rejects bed_increase with negative count", () => {
    expect(() => validateIntervention({ type: "bed_increase", params: { count: -5 } }))
      .toThrow("count");
  });

  it("accepts valid staff_reduction in (0,1)", () => {
    expect(() => validateIntervention({ type: "staff_reduction", params: { reduction: 0.3 } }))
      .not.toThrow();
  });

  it("rejects staff_reduction >= 1", () => {
    expect(() => validateIntervention({ type: "staff_reduction", params: { reduction: 1.5 } }))
      .toThrow("reduction");
  });

  it("rejects staff_reduction < 0", () => {
    expect(() => validateIntervention({ type: "staff_reduction", params: { reduction: -0.1 } }))
      .toThrow("reduction");
  });

  it("accepts supply_injection with drugs array and reduction", () => {
    expect(() => validateIntervention({ type: "supply_injection", params: { drugs: ["paracetamol"], reduction: 0.5 } }))
      .not.toThrow();
  });

  it("rejects supply_injection missing drugs", () => {
    expect(() => validateIntervention({ type: "supply_injection", params: { reduction: 0.5 } }))
      .toThrow("drugs");
  });

  it("accepts scenario_activate with string type", () => {
    expect(() => validateIntervention({ type: "scenario_activate", params: { type: "fire" } }))
      .not.toThrow();
  });

  it("rejects scenario_activate with non-string type", () => {
    expect(() => validateIntervention({ type: "scenario_activate", params: { type: 123 } }))
      .toThrow("type");
  });

  it("accepts policy_override with policy string and value number", () => {
    expect(() => validateIntervention({ type: "policy_override", params: { policy: "admission_rate", value: 1.5 } }))
      .not.toThrow();
  });

  it("rejects policy_override missing policy", () => {
    expect(() => validateIntervention({ type: "policy_override", params: { value: 1.5 } }))
      .toThrow("policy");
  });

  it("rejects Infinity values", () => {
    expect(() => validateIntervention({ type: "bed_increase", params: { count: Infinity } }))
      .toThrow("count");
    expect(() => validateIntervention({ type: "staff_reduction", params: { reduction: Infinity } }))
      .toThrow("reduction");
    expect(() => validateIntervention({ type: "policy_override", params: { policy: "x", value: Infinity } }))
      .toThrow("value");
  });

  it("rejects NaN values", () => {
    expect(() => validateIntervention({ type: "bed_increase", params: { count: NaN } }))
      .toThrow("count");
    expect(() => validateIntervention({ type: "staff_reduction", params: { reduction: NaN } }))
      .toThrow("reduction");
  });

  it("rejects non-integer bed counts", () => {
    expect(() => validateIntervention({ type: "bed_increase", params: { count: 5.5 } }))
      .toThrow("count");
  });

  it("accepts custom intervention with any params", () => {
    expect(() => validateIntervention({ type: "custom", params: { anything: true } }))
      .not.toThrow();
  });

  it("all predefined scenarios pass validation", () => {
    // Standard scenarios from engine.ts should all be valid
    const scenarios = [
      { type: "scenario_activate", params: { type: "none" } },
      { type: "scenario_activate", params: { type: "fire" } },
      { type: "scenario_activate", params: { type: "tsunami" } },
      { type: "scenario_activate", params: { type: "pandemic" } },
      { type: "supply_injection", params: { drugs: [], reduction: 0.7 } },
    ] as Intervention[];
    for (const s of scenarios) {
      expect(() => validateIntervention(s)).not.toThrow();
    }
  });
});
