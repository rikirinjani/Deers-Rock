/**
 * Epic X M10.5b slice 5: US protocol overrides. The order sets are simulation
 * sketches (see us-protocols.ts), not clinical guidance; these tests pin that
 * they are well formed, orderable under the US formulary, and start the
 * illness model's treated course, and that the Indonesian protocols are untouched.
 */
import { describe, it, expect, afterEach } from "vitest";
import { US_PROTOCOL_OVERRIDES, USProtocolSet } from "../src/locale/us-protocols.js";
import { US_DIAGNOSES } from "../src/locale/us-casemix.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { getProtocolSet } from "../src/locale/registry.js";
import { ICD_PROTOCOLS, mapIcdToActions } from "../src/engine/clinical-knowledge.js";
import { resolveOrderableMed } from "../src/engine/ai-doctor.js";
import { findDrug } from "../src/engine/drug-catalog.js";
import { GROUPS, groupForIcd } from "../src/engine/illness-model.js";

afterEach(() => { resetLocale(); });

describe("US protocol overrides", () => {
  it("Indonesian protocols are untouched by the seam", () => {
    expect(getProtocolSet().config.countryCode).toBe("ID");
    for (const code of Object.keys(US_PROTOCOL_OVERRIDES)) {
      expect(mapIcdToActions(code)).toBe(ICD_PROTOCOLS.find(p => p.code === code)!.actions);
    }
    expect(mapIcdToActions("ZZZ")).toEqual([]);
  });

  it("every override is for a US-pool category that already has a shared protocol, and replaces it", () => {
    const pool = new Set(US_DIAGNOSES.map(d => d.code));
    useUSLocale();
    expect(getProtocolSet().config.countryCode).toBe("US");
    for (const code of Object.keys(US_PROTOCOL_OVERRIDES)) {
      expect(pool.has(code), code).toBe(true);
      const shared = ICD_PROTOCOLS.find(p => p.code === code);
      expect(shared, code).toBeDefined();
      expect(mapIcdToActions(code)).toBe(US_PROTOCOL_OVERRIDES[code]);
      expect(mapIcdToActions(code)).not.toEqual(shared!.actions);
    }
    expect(mapIcdToActions("I10")).toBe(ICD_PROTOCOLS.find(p => p.code === "I10")!.actions);
    resetLocale();
    expect(getProtocolSet().config.countryCode).toBe("ID");
    expect(new USProtocolSet().overrides("I10")).toBeUndefined();
  });

  it("every medication is orderable under the US formulary exactly as written (no substitution, no drop)", () => {
    useUSLocale();
    for (const [code, actions] of Object.entries(US_PROTOCOL_OVERRIDES)) {
      for (const a of actions.filter(x => x.type === "medication")) {
        const r = resolveOrderableMed(a.label, a.detail);
        expect(r, `${code} ${a.label}`).toBeDefined();
        expect(r!.med.name, `${code} ${a.label}`).toBe(findDrug(r!.med.code)!.innName);
      }
    }
  });

  it("each override orders a drug that starts the illness model's treated course (when the group has a definitive class)", () => {
    useUSLocale();
    const missing: string[] = [];
    for (const [code, actions] of Object.entries(US_PROTOCOL_OVERRIDES)) {
      const g = groupForIcd(code);
      if (!g || GROUPS[g]!.definitive.length === 0) continue;
      const cats = new Set(actions.filter(a => a.type === "medication").map(a => findDrug(resolveOrderableMed(a.label, a.detail)!.med.code)!.category));
      if (!GROUPS[g]!.definitive.some(d => cats.has(d))) missing.push(`${code}(${g})`);
    }
    expect(missing).toEqual([]);
  });

  it("key US practice differences are present", () => {
    const labels = (c: string) => US_PROTOCOL_OVERRIDES[c]!.map(a => a.label);
    expect(labels("A49")).toContain("Piperacillin-tazobactam 4.5g");
    expect(labels("A49")).toContain("Ringer's Lactate IV");
    expect(labels("I21")).toEqual(expect.arrayContaining(["Aspirin 80mg", "Clopidogrel 75mg", "Heparin 5000IU/ml"]));
    expect(labels("J18")).toContain("Azithromycin 250mg");
    expect(labels("J18")).not.toContain("Levofloxacin 500mg");
    expect(labels("I48")).toContain("Apixaban 5mg");
    expect(labels("N39")).not.toContain("Ciprofloxacin 500mg");
    expect(labels("E11")).toContain("Empagliflozin 10mg");
  });
});
