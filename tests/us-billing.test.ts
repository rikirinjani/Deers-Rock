/**
 * Epic X M10.3: US payer assignment and claim lifecycle.
 * Numbers are placeholders pending M10.5c calibration; these tests pin the
 * structure (age-driven Medicare, deductible -> coinsurance -> OOP cap,
 * draw discipline), not clinical or financial validity.
 */
import { describe, it, expect, afterEach } from "vitest";
import { USPayerAssigner, US_PAYER_MIX_UNDER_65 } from "../src/engine/billing/us-payer.js";
import { USClaimLifecycle, US_TERMS, US_DENIALS } from "../src/engine/billing/us-claims.js";
import {
  useClaimLifecycle, usePayerAssigner, resetClaimLifecycle, resetPayerAssigner,
} from "../src/engine/billing/registry.js";
import type { ClaimContext } from "../src/engine/billing/contracts.js";
import { createWorld, runWorld } from "../src/engine/world.js";

const lcg = (seed: number) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const counting = (v: number) => { let n = 0; return { rng: () => { n++; return v; }, count: () => n }; };

const L = new USClaimLifecycle();
const ctx = (o: Partial<ClaimContext>): ClaimContext => ({
  claimId: "CLM-X", encounterId: "E", patientId: "P", payerType: "Private Insurance", tick: 5,
  totalCharges: 100_000, patientPrimaryDxCode: "J18.9",
  chartDiagnoses: [{ code: "J18.9", type: "primary" }, { code: "I10", type: "secondary" }, { code: "E11.9", type: "secondary" }],
  chartProcedureCount: 0, billedProcedureChargeCount: 0, chartCoded: true,
  encounterDurationTicks: 0, existingDenialCode: null, coveredAmount: 0, ...o,
});

describe("USPayerAssigner", () => {
  const A = new USPayerAssigner();
  it("Medicare at 65+ with no draw; under 65 draws exactly once", () => {
    const c = counting(0.5);
    expect(A.assign({ diagnoses: [], age: 65 }, c.rng)).toBe("Medicare");
    expect(c.count()).toBe(0);
    A.assign({ diagnoses: [], age: 40 }, c.rng);
    expect(c.count()).toBe(1);
  });
  it("under-65 mix shares sum to 1 and a pooled roll reproduces them", () => {
    expect(US_PAYER_MIX_UNDER_65.reduce((s, [, p]) => s + p, 0)).toBeCloseTo(1, 10);
    const r = lcg(1), counts: Record<string, number> = {};
    const N = 40_000;
    for (let i = 0; i < N; i++) { const p = A.assign({ diagnoses: [], age: 30 }, r); counts[p] = (counts[p] ?? 0) + 1; }
    for (const [payer, share] of US_PAYER_MIX_UNDER_65) expect((counts[payer] ?? 0) / N).toBeCloseTo(share, 1);
    expect(counts.Medicare).toBeUndefined();
  });
});

describe("USClaimLifecycle", () => {
  it("insured claims need a coded chart; self-pay does not", () => {
    expect(L.canSubmit(ctx({ chartCoded: false }))).toBe(false);
    expect(L.canSubmit(ctx({ payerType: "Self-pay", chartCoded: false }))).toBe(true);
  });

  it("private: deductible first, then coinsurance, within the allowed amount", () => {
    const t = US_TERMS["Private Insurance"]!;
    const d = L.buildClaim(ctx({ totalCharges: 20_000 }));
    const allowed = 20_000 * t.allowedRatio; // 9000
    const expected = Math.min(allowed, t.deductible) + (allowed - Math.min(allowed, t.deductible)) * t.coinsurance;
    expect(d.patientResponsibility).toBeCloseTo(expected, 2);
    expect(d.coveredAmount + d.patientResponsibility).toBeCloseTo(allowed, 2);
  });

  it("private: out-of-pocket max caps patient responsibility", () => {
    const t = US_TERMS["Private Insurance"]!;
    const d = L.buildClaim(ctx({ totalCharges: 1_000_000 }));
    expect(d.patientResponsibility).toBe(t.oopMax);
  });

  it("small claims fall entirely inside the deductible", () => {
    const d = L.buildClaim(ctx({ payerType: "Medicare", totalCharges: 1_000 }));
    expect(d.coveredAmount).toBe(0);
    expect(d.patientResponsibility).toBeCloseTo(300, 2);
  });

  it("Medicaid has no patient share; self-pay owes everything", () => {
    expect(L.buildClaim(ctx({ payerType: "Medicaid" })).patientResponsibility).toBe(0);
    const sp = L.buildClaim(ctx({ payerType: "Self-pay" }));
    expect(sp.coveredAmount).toBe(0);
    expect(sp.patientResponsibility).toBe(100_000);
    expect(sp.payerReference).toBeNull();
  });

  it("build draws nothing; verify draws once for insured, never for self-pay", () => {
    for (const payerType of ["Medicare", "Medicaid", "Private Insurance", "TRICARE", "VA", "Self-pay"] as const) {
      const c = ctx({ payerType });
      const b = counting(0.5); L.buildClaim(c); expect(L.rngDrawsPerBuild()).toBe(0);
      const v = counting(0.999); L.verify(c, v.rng);
      expect(v.count()).toBe(L.rngDrawsPerVerification(c));
      expect(b.count()).toBe(0);
    }
  });

  it("verify outcomes follow the roll: recoverable -> returned, hard -> denied, high -> paid", () => {
    const priv = ctx({}); // 2 secondary dx -> pCoding = 0.04
    expect(L.verify(priv, () => 0.01)).toMatchObject({ status: "returned", denial: { code: "incomplete_coding" } });
    expect(L.verify(priv, () => 0.07)).toMatchObject({ status: "returned", denial: { code: "prior_auth_missing" } });
    expect(L.verify(priv, () => 0.085)).toMatchObject({ status: "denied", denial: { code: "missing_documents" } });
    expect(L.verify(priv, () => 0.10)).toMatchObject({ status: "denied", denial: { code: "medical_necessity" } });
    expect(L.verify(priv, () => 0.999)).toMatchObject({ status: "paid", denial: null });
  });

  it("thin coding raises the coding-denial slice", () => {
    const thin = ctx({ chartDiagnoses: [{ code: "J18.9", type: "primary" }] }); // pCoding 0.08
    expect(L.verify(thin, () => 0.07).denial?.code).toBe("incomplete_coding");
  });

  it("taxonomy is complete and VA/Medicare never prior-auth deny", () => {
    expect(L.denialTaxonomy().map(d => d.code).sort()).toEqual(Object.keys(US_DENIALS).sort());
    for (const payerType of ["Medicare", "VA"] as const) {
      for (let r = 0; r < 1; r += 0.001) expect(L.verify(ctx({ payerType }), () => r).denial?.code).not.toBe("prior_auth_missing");
    }
  });
});

describe("US adapters swapped into a running world", () => {
  afterEach(() => { resetClaimLifecycle(); resetPayerAssigner(); });

  it("produces US payers and terminal claims without touching Indonesian types", () => {
    usePayerAssigner(new USPayerAssigner());
    useClaimLifecycle(new USClaimLifecycle());
    const w = runWorld(createWorld(20, undefined, 11), 1200);
    const claims = Array.from(w.state.insuranceClaims.values());
    expect(claims.length).toBeGreaterThan(5);
    const us = new Set(["Medicare", "Medicaid", "Private Insurance", "Self-pay", "TRICARE", "VA"]);
    expect(claims.every(c => us.has(c.payer))).toBe(true);
    expect(claims.some(c => c.status === "paid")).toBe(true);
    expect(claims.every(c => !c.sepNumber || c.sepNumber.startsWith("ICN-"))).toBe(true);
  });
});
