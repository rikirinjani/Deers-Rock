/**
 * Epic X M10.5b slice 3: US formulary (FDA availability, USAN names).
 * Availability reflects author knowledge, not an Orange Book check; sourcing
 * is M10.5c. These tests pin structure and that protocols stay prescribable.
 */
import { describe, it, expect, afterEach } from "vitest";
import { USFormulary, US_UNAVAILABLE_DRUGS, usanName } from "../src/locale/us-formulary.js";
import { IndonesiaFormulary } from "../src/locale/indonesia.js";
import { getFormulary } from "../src/locale/registry.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { useUSAdapter, resetBillingAdapter } from "../src/engine/billing/us-adapter.js";
import { DRUG_CATALOG } from "../src/engine/drug-catalog.js";
import { MEDICATIONS, formularyMedications } from "../src/engine/pharmacy.js";
import { LABEL_TO_CODE } from "../src/engine/ai-doctor.js";
import { ICD_PROTOCOLS, VITALS_RULES } from "../src/engine/clinical-knowledge.js";
import { createWorld, runWorld } from "../src/engine/world.js";

afterEach(() => { resetLocale(); resetBillingAdapter(); });

/** Resolve a protocol medication action to a drug code the way ai-doctor does. */
function resolve(label: string, detail: string): string | undefined {
  const direct = MEDICATIONS.find(m => m.name === label || m.code === detail);
  if (direct) return direct.code;
  const alias = LABEL_TO_CODE[label] ?? detail;
  return DRUG_CATALOG.find(d => d.code === alias)?.code;
}

describe("US formulary", () => {
  const us = new USFormulary();

  it("USAN names replace INN names, doses and other names are kept", () => {
    expect(usanName("Paracetamol 500mg")).toBe("Acetaminophen 500mg");
    expect(usanName("Paracetamol IV 1g")).toBe("Acetaminophen IV 1g");
    expect(usanName("Salbutamol Inhaler")).toBe("Albuterol Inhaler");
    expect(usanName("Pethidine 50mg")).toBe("Meperidine 50mg");
    expect(usanName("Rifampicin 150mg")).toBe("Rifampin 150mg");
    expect(usanName("Metformin 500mg")).toBe("Metformin 500mg");
  });

  it("the unavailable drugs exist in the catalogue and are excluded", () => {
    for (const c of US_UNAVAILABLE_DRUGS) {
      expect(DRUG_CATALOG.some(d => d.code === c)).toBe(true);
      expect(us.isAvailable(c)).toBe(false);
    }
    expect(us.isAvailable("MET")).toBe(true);
  });

  it("every drug a protocol or vitals rule can prescribe is on the US formulary", () => {
    const actions = [...ICD_PROTOCOLS.flatMap(p => p.actions), ...VITALS_RULES.flatMap(r => (r as unknown as { actions?: { type: string; label: string; detail: string }[] }).actions ?? [])];
    const meds = actions.filter(a => a.type === "medication");
    expect(meds.length).toBeGreaterThan(50);
    const blocked = meds.filter(a => { const c = resolve(a.label, a.detail); return c !== undefined && !us.isAvailable(c); }).map(a => a.label);
    // Known gap: the Meniere's protocol prescribes betahistine (not FDA-approved). Under the US
    // formulary that action is skipped until a US substitute (e.g. meclizine) joins a US drug catalogue.
    // Any NEW blocked protocol drug fails this test.
    expect(Array.from(new Set(blocked))).toEqual(["Betahistine 16mg"]);
  });

  it("Indonesian formulary is the identity; the US view drops drugs and renames", () => {
    const id = new IndonesiaFormulary();
    expect(id.isAvailable("RAN")).toBe(true);
    expect(id.displayName("PRC", "Paracetamol 500mg")).toBe("Paracetamol 500mg");
    expect(formularyMedications().map(m => m.name)).toEqual(MEDICATIONS.map(m => m.name));
    useUSLocale();
    expect(getFormulary().config.countryCode).toBe("US");
    const view = formularyMedications();
    expect(view.length).toBe(MEDICATIONS.length - US_UNAVAILABLE_DRUGS.length);
    expect(view.find(m => m.code === "PRC")!.name).toBe("Acetaminophen 500mg");
    resetLocale();
    expect(formularyMedications().length).toBe(MEDICATIONS.length);
  });

  it("a US world orders only US-named, FDA-available drugs", () => {
    useUSLocale();
    useUSAdapter();
    const w = runWorld(createWorld(40, undefined, 5), 2500);
    const orders = Array.from(w.state.medicationOrders.values());
    expect(orders.length).toBeGreaterThan(20);
    for (const o of orders) {
      expect(US_UNAVAILABLE_DRUGS.includes(o.medication.code)).toBe(false);
      expect(o.medication.name).not.toMatch(/Paracetamol|Salbutamol|Pethidine|Rifampicin/);
    }
  });
});
