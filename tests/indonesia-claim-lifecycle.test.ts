/**
 * Epic X M10.2: IndonesiaClaimLifecycle honours the IClaimLifecycle
 * determinism contract (declared rng draws == actual draws) and keeps the
 * Epic IX rules.
 */
import { describe, it, expect } from "vitest";
import { IndonesiaClaimLifecycle } from "../src/engine/billing/indonesia-claims.js";
import type { ClaimContext } from "../src/engine/billing/contracts.js";

const L = new IndonesiaClaimLifecycle();
const base = (o: Partial<ClaimContext>): ClaimContext => ({
  claimId: "CLM-X", encounterId: "E", patientId: "P", payerType: "BPJS Kesehatan", tick: 10,
  totalCharges: 1_000_000, patientPrimaryDxCode: "A09",
  chartDiagnoses: [{ code: "A09", type: "primary" }, { code: "I10", type: "secondary" }, { code: "E11", type: "secondary" }],
  chartProcedureCount: 0, billedProcedureChargeCount: 0, chartCoded: true,
  encounterDurationTicks: 1000, existingDenialCode: null, coveredAmount: 0, ...o,
});
const counting = (v = 0.5) => { let n = 0; const rng = () => { n++; return v; }; return { rng, count: () => n }; };

describe("IndonesiaClaimLifecycle", () => {
  it("BPJS requires a coded chart", () => {
    expect(L.canSubmit(base({ chartCoded: false }))).toBe(false);
    expect(L.canSubmit(base({ payerType: "Self-pay", chartCoded: false }))).toBe(true);
  });

  it.each(["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Jasa Raharja", "Private Insurance", "Self-pay"] as const)(
    "%s: declared build draws equal actual draws", (payerType) => {
      const ctx = base({ payerType });
      const r = counting();
      L.buildClaim(ctx, r.rng);
      expect(r.count()).toBe(L.rngDrawsPerBuild(ctx));
    });

  it.each([0.01, 0.5, 0.95, 0.99])("verify draws match declaration (roll %s)", (v) => {
    for (const ctx of [base({}), base({ chartDiagnoses: [] }), base({ billedProcedureChargeCount: 1 }), base({ payerType: "Self-pay" })]) {
      const r = counting(v);
      L.verify(ctx, r.rng);
      expect(r.count()).toBe(L.rngDrawsPerVerification(ctx));
    }
  });

  it("unmapped principal dx is denied without a draw; procedure charge without chart procedure is denied", () => {
    expect(L.verify(base({ chartDiagnoses: [{ code: "ZZZ99", type: "primary" }] }), () => 0.5).denial?.code).toBe("invalid_principal_dx");
    expect(L.verify(base({ billedProcedureChargeCount: 2 }), () => 0.5).denial?.code).toBe("procedure_not_documented");
  });

  it("outcome roll splits paid / returned / denied", () => {
    const ctx = base({ chartDiagnoses: [{ code: "A09", type: "primary" }] }); // defectProb 0.2
    expect(L.verify(ctx, () => 0.5).status).toBe("paid");
    expect(L.verify(ctx, () => 0.85).status).toBe("returned");
    expect(L.verify(ctx, () => 0.99).status).toBe("denied");
  });

  it("Jasa Raharja settles at creation; private tier is deterministic", () => {
    expect(L.buildClaim(base({ payerType: "Jasa Raharja" }), () => 0.1).settledAtCreation).toBe(true);
    const a = L.buildClaim(base({ payerType: "Private Insurance" }), () => 0.1);
    const b = L.buildClaim(base({ payerType: "Private Insurance" }), () => 0.9);
    expect(a.tierIndex).toBe(b.tierIndex);
  });
});
