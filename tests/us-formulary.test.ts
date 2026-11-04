/**
 * Epic X M10.5b slice 3: US formulary (FDA availability, USAN names).
 * Availability reflects author knowledge, not an Orange Book check; sourcing
 * is M10.5c. These tests pin structure and that protocols stay prescribable.
 */
import { describe, it, expect, afterEach } from "vitest";
import { USFormulary, US_UNAVAILABLE_DRUGS, usanName } from "../src/locale/us-formulary.js";
import { US_EXTRA_DRUGS, US_SUBSTITUTES } from "../src/locale/us-drugs.js";
import { activeCatalog, findDrug } from "../src/engine/drug-catalog.js";
import { centralSupplyInit } from "../src/engine/central-supply.js";
import { getDoseRange, checkDrugAllergy } from "../src/engine/pharmacy-knowledge.js";
import { USPriceBook } from "../src/engine/billing/us-prices.js";
import { IndonesiaFormulary } from "../src/locale/indonesia.js";
import { getFormulary } from "../src/locale/registry.js";
import { useUSLocale, resetLocale } from "../src/locale/us-locale.js";
import { useUSAdapter, resetBillingAdapter } from "../src/engine/billing/us-adapter.js";
import { DRUG_CATALOG } from "../src/engine/drug-catalog.js";
import { MEDICATIONS, formularyMedications } from "../src/engine/pharmacy.js";
import { LABEL_TO_CODE, resolveOrderableMed } from "../src/engine/ai-doctor.js";
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
    // Betahistine (Meniere's protocol) is off-formulary; it must have a US substitute. Any other
    // blocked protocol drug without a substitute fails this test.
    const uncovered = Array.from(new Set(blocked)).filter(l => { const c = resolve(l, ""); return !c || !US_SUBSTITUTES[c] || !US_EXTRA_DRUGS.some(d => d.code === US_SUBSTITUTES[c]); });
    expect(uncovered).toEqual([]);
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
    expect(view.length).toBe(MEDICATIONS.length - US_UNAVAILABLE_DRUGS.length + US_EXTRA_DRUGS.length);
    expect(view.find(m => m.code === "PRC")!.name).toBe("Acetaminophen 500mg");
    resetLocale();
    expect(formularyMedications().length).toBe(MEDICATIONS.length);
  });

  it("US extension drugs exist only while the US formulary is active", () => {
    expect(activeCatalog()).toBe(DRUG_CATALOG);
    expect(findDrug("APX")).toBeUndefined();
    expect(centralSupplyInit().has("MED-APX")).toBe(false);
    useUSLocale();
    expect(activeCatalog().length).toBe(DRUG_CATALOG.length + US_EXTRA_DRUGS.length);
    expect(findDrug("APX")?.innName).toBe("Apixaban 5mg");
    expect(centralSupplyInit().has("MED-APX")).toBe(true);
    resetLocale();
    expect(findDrug("APX")).toBeUndefined();
  });

  it("extension drugs are well formed: unique codes, stocked, priced, dosed, allergen-aware", () => {
    useUSLocale();
    const base = new Set(DRUG_CATALOG.map(d => d.code));
    const supply = centralSupplyInit();
    const price = new USPriceBook();
    for (const d of US_EXTRA_DRUGS) {
      expect(base.has(d.code)).toBe(false);
      expect(supply.get(d.supplyCode)?.stock).toBeGreaterThan(0);
      expect(price.drug(d.code)).toBeGreaterThan(0);
      expect(getDoseRange(d.code)?.maxMg).toBe(d.maxMg);
    }
    expect(checkDrugAllergy("PIP", ["Penicillin"])).toContain("penicillin");
    expect(checkDrugAllergy("CFZ", ["Penicillin"])).toBeNull();
  });

  it("every substitute is a US extension drug and replaces exactly an off-formulary drug", () => {
    for (const [off, sub] of Object.entries(US_SUBSTITUTES)) {
      expect(US_UNAVAILABLE_DRUGS).toContain(off);
      expect(US_EXTRA_DRUGS.some(d => d.code === sub)).toBe(true);
    }
    expect(Object.keys(US_SUBSTITUTES).sort()).toEqual([...US_UNAVAILABLE_DRUGS].sort());
  });

  it("order resolution: Indonesian unchanged; US substitutes betahistine, renames, drops drugs with no substitute", () => {
    expect(resolveOrderableMed("Betahistine 16mg", "x")?.med.code).toBe("BET");
    expect(resolveOrderableMed("Paracetamol 500mg", "x")?.displayName).toBe("Paracetamol 500mg");
    useUSLocale();
    const r = resolveOrderableMed("Betahistine 16mg", "x")!;
    expect(r.med.code).toBe("MEC");
    expect(r.displayName).toBe("Meclizine 25mg");
    expect(resolveOrderableMed("Paracetamol 500mg", "x")?.displayName).toBe("Acetaminophen 500mg");
    expect(resolveOrderableMed("No such drug", "NOPE")).toBeUndefined();
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
