/**
 * Epic X M10.4: MS-DRG grouping and payment, IPriceBook seam, US chargemaster.
 * Weights, prices and multipliers are unverified placeholders pending M10.5c;
 * these tests pin structure (grouping rules, coverage, payer ordering, seam
 * behaviour, Indonesian byte-parity), not financial validity.
 */
import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  assignMsDrg, drgPayment, drgCoverage, usSeverity, icdCategory, MEDICARE_BASE_RATE, MEDICARE_OPERATING_RATE, MEDICARE_CAPITAL_RATE,
} from "../src/engine/billing/us-drg.js";
import { USClaimLifecycle, US_TERMS } from "../src/engine/billing/us-claims.js";
import { USPriceBook, USChargePolicy, US_DRUG_PRICES } from "../src/engine/billing/us-prices.js";
import { useUSAdapter, resetBillingAdapter } from "../src/engine/billing/us-adapter.js";
import { getPriceBook, usePriceBook, getChargePolicy } from "../src/engine/billing/registry.js";
import { INA_CBG, ICD9_PROCEDURES } from "../src/engine/ina-cbg.js";
import { DRUG_CATALOG } from "../src/engine/drug-catalog.js";
import { ambulanceFee, labPrice, radiologyPrice, drugPrice, edFee, respiratoryActivationFee, DRUG_PRICES } from "../src/engine/price-tables.js";
import type { ClaimContext } from "../src/engine/billing/contracts.js";
import { createWorld, runWorld } from "../src/engine/world.js";

const ctx = (o: Partial<ClaimContext>): ClaimContext => ({
  claimId: "CLM-D", encounterId: "E", patientId: "P", payerType: "Medicare", tick: 5,
  totalCharges: 500_000, patientPrimaryDxCode: "I50",
  chartDiagnoses: [{ code: "I50", type: "primary" }],
  chartProcedureCount: 0, billedProcedureChargeCount: 0, chartCoded: true,
  encounterDurationTicks: 0, existingDenialCode: null, coveredAmount: 0, ...o,
});

describe("MS-DRG grouper", () => {
  it("normalises ICD-10-CM codes to their category", () => {
    expect(icdCategory("J18.9")).toBe("J18");
    expect(icdCategory(" e11.5 ")).toBe("E11");
  });

  it("covers every ICD code the simulator generates (unmapped report is empty)", () => {
    const simCodes = [...INA_CBG.map(e => e.icdCode), ...ICD9_PROCEDURES.flatMap(p => p.icdCodes)];
    const { mapped, unmapped } = drgCoverage(simCodes);
    expect(unmapped).toEqual([]);
    expect(mapped.length).toBeGreaterThan(100);
  });

  it("reports codes it cannot group", () => {
    expect(drgCoverage(["I50", "Z99.9", "Z99.9"])).toEqual({ mapped: ["I50"], unmapped: ["Z99.9"] });
    expect(assignMsDrg(["Z99.9"], false)).toBeUndefined();
    expect(assignMsDrg([], false)).toBeUndefined();
  });

  it("splits by MCC / CC / none and weight rises with severity", () => {
    const none = assignMsDrg(["I50"], false)!;
    const cc = assignMsDrg(["I50", "N18"], false)!;
    const mcc = assignMsDrg(["I50", "J96"], false)!;
    expect([none.severity, cc.severity, mcc.severity]).toEqual(["none", "CC", "MCC"]);
    expect(none.weight).toBeLessThan(cc.weight);
    expect(cc.weight).toBeLessThan(mcc.weight);
    expect([mcc.drg, cc.drg, none.drg]).toEqual(["291", "292", "293"]);
  });

  it("MCC outranks CC regardless of order; severity ignores non-CC codes", () => {
    expect(usSeverity(["N18", "J96"])).toBe("MCC");
    expect(usSeverity(["I10", "M54"])).toBe("none");
    expect(usSeverity([])).toBe("none");
  });

  it("2-tier families: w MCC / w/o MCC; CC-or-MCC families share the top tier", () => {
    expect(assignMsDrg(["A41"], false)!.drg).toBe("872");
    expect(assignMsDrg(["A41", "J96"], false)!.drg).toBe("871");
    const j20cc = assignMsDrg(["J20", "N18"], false)!;
    expect(j20cc.drg).toBe("202");
    expect(assignMsDrg(["J20"], false)!.drg).toBe("203");
  });

  it("uses the surgical DRG only when a procedure exists and a surgical family does", () => {
    const med = assignMsDrg(["K80"], false)!;
    const surg = assignMsDrg(["K80"], true)!;
    expect(med.surgical).toBe(false);
    expect(surg.surgical).toBe(true);
    expect(surg.weight).toBeGreaterThan(med.weight);
    expect(assignMsDrg(["I50"], true)!.surgical).toBe(false); // no surgical family for I50
  });

  it("payment is weight x base rate", () => {
    const a = assignMsDrg(["I50"], false)!;
    expect(drgPayment(a)).toBeCloseTo(a.weight * MEDICARE_BASE_RATE, 2);
    expect(drgPayment(a, 1000)).toBeCloseTo(a.weight * 1000, 2);
  });
});

describe("US claims pay by MS-DRG", () => {
  const L = new USClaimLifecycle();

  it("Medicare allowed = DRG payment (deductible taken from it)", () => {
    const drg = assignMsDrg(["I50"], false)!;
    const d = L.buildClaim(ctx({}));
    expect(d.coveredAmount + d.patientResponsibility).toBeCloseTo(drgPayment(drg), 2);
    expect(d.patientResponsibility).toBeCloseTo(US_TERMS.Medicare!.deductible, 2);
  });

  it("payer ordering: commercial > Medicare > Medicaid for the same DRG", () => {
    const allowed = (payerType: ClaimContext["payerType"]) => {
      const d = L.buildClaim(ctx({ payerType, totalCharges: 1_000_000 }));
      return d.coveredAmount + d.patientResponsibility;
    };
    expect(allowed("Private Insurance")).toBeGreaterThan(allowed("Medicare"));
    expect(allowed("Medicare")).toBeGreaterThan(allowed("Medicaid"));
    expect(allowed("TRICARE")).toBeCloseTo(allowed("Medicare"), 2);
  });

  it("a payer never pays more than billed charges", () => {
    const d = L.buildClaim(ctx({ totalCharges: 900 }));
    expect(d.coveredAmount + d.patientResponsibility).toBeLessThanOrEqual(900);
  });

  it("chart severity moves the payment; a chart procedure switches DRG", () => {
    const base = L.buildClaim(ctx({ payerType: "Medicaid", totalCharges: 1_000_000 }));
    const sick = L.buildClaim(ctx({
      payerType: "Medicaid", totalCharges: 1_000_000,
      chartDiagnoses: [{ code: "I50", type: "primary" }, { code: "J96", type: "secondary" }],
    }));
    expect(sick.coveredAmount).toBeGreaterThan(base.coveredAmount);
    const k80 = (n: number) => L.buildClaim(ctx({
      payerType: "Medicaid", totalCharges: 1_000_000, patientPrimaryDxCode: "K80",
      chartDiagnoses: [{ code: "K80", type: "primary" }], chartProcedureCount: n,
    })).coveredAmount;
    expect(k80(1)).toBeGreaterThan(k80(0));
  });

  it("drgFor falls back to the problem-list primary when the chart has no diagnoses", () => {
    expect(L.drgFor(ctx({ chartDiagnoses: [], patientPrimaryDxCode: "I21" }))?.drg).toBe("282");
    expect(L.drgFor(ctx({ chartDiagnoses: [], patientPrimaryDxCode: null }))).toBeUndefined();
  });
});

describe("price book seam", () => {
  afterEach(() => resetBillingAdapter());

  it("Indonesian default is unchanged", () => {
    expect(labPrice("CBC")).toBe(150_000);
    expect(radiologyPrice("CT Head without contrast")).toBe(1_200_000);
    expect(edFee(1)).toBe(400_000);
    expect(respiratoryActivationFee()).toBe(200_000);
    expect(labPrice("NOPE")).toBe(250_000); // flat IDR fallback
    expect(drugPrice("PRC")).toBe(DRUG_PRICES.get("PRC"));
    expect(drugPrice("NOPE")).toBe(75_000);
  });

  it("ambulance fee: Indonesian default unchanged, US uses mileage rates", () => {
    expect(ambulanceFee("BLS", 250)).toBe(700_000);
    expect(ambulanceFee("ALS", 0)).toBe(500_000);
    useUSAdapter();
    expect(ambulanceFee("BLS", 100)).toBe(2_700);
    expect(ambulanceFee("ALS", 100)).toBe(4_000);
  });

  it("useUSAdapter swaps prices, fallbacks and policy together; reset restores", () => {
    useUSAdapter();
    expect(getPriceBook()).toBeInstanceOf(USPriceBook);
    expect(getChargePolicy()).toBeInstanceOf(USChargePolicy);
    expect(labPrice("CBC")).toBe(60);
    expect(edFee(3)).toBe(2_000);
    expect(labPrice("NOPE")).toBe(90); // US flat fallback, not IDR
    expect(drugPrice("NOPE")).toBe(150);
    resetBillingAdapter();
    expect(labPrice("CBC")).toBe(150_000);
  });

  it("every catalogue drug has a positive USD price in cents", () => {
    for (const d of DRUG_CATALOG) {
      const p = US_DRUG_PRICES.get(d.code)!;
      expect(p).toBeGreaterThan(0);
      expect(Math.round(p * 100)).toBeCloseTo(p * 100, 6);
    }
  });

  it("usePriceBook accepts a custom book", () => {
    usePriceBook({ ...new USPriceBook(), lab: () => 1 } as USPriceBook);
    expect(labPrice("CBC")).toBe(1);
  });
});

describe("US adapter in a running world", () => {
  afterEach(() => resetBillingAdapter());

  it("bills at USD scale with DRG-paid claims", () => {
    useUSAdapter();
    const w = runWorld(createWorld(20, undefined, 11), 1200);
    const charges = Array.from(w.state.charges.values());
    const claims = Array.from(w.state.insuranceClaims.values());
    expect(charges.length).toBeGreaterThan(20);
    // IDR-scale charges would be 10^5..10^7; USD chargemaster stays far below that.
    expect(Math.max(...charges.map(c => c.amount))).toBeLessThan(500_000);
    const labs = charges.filter(c => c.category === "lab" && c.code === "CBC");
    for (const c of labs) expect(c.unitPrice).toBe(60);
    expect(claims.some(c => c.status === "paid")).toBe(true);
    for (const c of claims) expect(c.coveredAmount + (c.patientResponsibility)).toBeLessThanOrEqual(c.totalCharges + 0.01);
  });
});

describe("CMS FY 2026 standard amounts (docs/us-calibration-targets.md T-DRG-2, T-DRG-3)", () => {
  it("base rate is the cited operating plus capital amounts", () => {
    expect(MEDICARE_OPERATING_RATE).toBe(6752.61);
    expect(MEDICARE_CAPITAL_RATE).toBe(524.15);
    expect(MEDICARE_BASE_RATE).toBeCloseTo(7276.76, 2);
  });
});

describe("DRG weights follow CMS FY 2026 Table 5 (docs/us-drg-table5-comparison.csv)", () => {
  const fields = (line: string): string[] => Array.from(line.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)).slice(0, 7).map(m => m[2] ?? m[1]!);
  it("every simulator DRG that exists in Table 5 carries the Table 5 weight, and only the cleft family is unmatched", () => {
    const rows = readFileSync(new URL("../docs/us-drg-table5-comparison.csv", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.length > 0).slice(1);
    const unmatched: string[] = [];
    for (const r of rows) {
      const [drg, , simW, cmsW] = fields(r);
      if (!cmsW) { unmatched.push(drg!); continue; }
      expect(Number(simW), `DRG ${drg}`).toBeCloseTo(Number(cmsW), 4);
    }
    expect(unmatched.sort()).toEqual(["131", "132"]);
  });
});
