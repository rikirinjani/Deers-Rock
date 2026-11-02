/**
 * US claim lifecycle (Medicare, Medicaid, Private, TRICARE, VA, Self-pay).
 * Epic X M10.3.
 *
 * Engine states map to the US revenue cycle as: submitted = claim filed with
 * the clearinghouse, verifying = payer edits + adjudication, paid | denied |
 * returned (recoverable denial -> corrected/appealed claim, resubmitted by the
 * engine once the chart is coded).
 *
 * CALIBRATION PENDING: every number below is a placeholder to be replaced by
 * sourced targets in M10.5c (CMS, HCUP, MedPAC, KFF), and the allowed amount
 * becomes MS-DRG weight x base rate in M10.4. Until then amounts are
 * fraction-of-charges, so US output is structurally valid but NOT validated.
 *
 * Determinism: build draws nothing (control number is a hash); verify draws
 * exactly once for insured payers and never for self-pay.
 */
import type {
  ClaimContext, ClaimDraft, DenialCode, IClaimLifecycle, VerificationOutcome,
} from "./contracts.js";

export const US_DENIALS: Record<string, DenialCode> = {
  incomplete_coding: { code: "incomplete_coding", description: "Coding incomplete or unspecific; corrected claim required", category: "coding", recoverable: true },
  prior_auth_missing: { code: "prior_auth_missing", description: "Prior authorization missing; retro-authorization / appeal", category: "authorization", recoverable: true },
  missing_documents: { code: "missing_documents", description: "Supporting documentation missing", category: "documentation", recoverable: false },
  medical_necessity: { code: "medical_necessity", description: "Service not medically necessary per payer policy", category: "medical-necessity", recoverable: false },
  out_of_network: { code: "out_of_network", description: "Out-of-network provider", category: "coverage", recoverable: false },
  coverage_inactive: { code: "coverage_inactive", description: "Coverage not active on date of service", category: "coverage", recoverable: false },
};

export interface USPayerTerms {
  /** Allowed amount as a fraction of billed charges (replaced by MS-DRG in M10.4). */
  allowedRatio: number;
  /** Per-admission deductible, USD. */
  deductible: number;
  /** Patient share of the allowed amount after the deductible. */
  coinsurance: number;
  /** Per-claim out-of-pocket cap, USD (Infinity = none modelled). */
  oopMax: number;
  /** Denial probabilities (disjoint slices of one roll). */
  pPriorAuth: number;
  pMedicalNecessity: number;
  pOutOfNetwork: number;
  pMissingDocs: number;
  /** Base coding-defect probability before the chart-completeness adjustment. */
  pCoding: number;
}

/** Placeholders (approximate 2024-25 public figures, unverified); see header. */
export const US_TERMS: Record<string, USPayerTerms> = {
  Medicare:            { allowedRatio: 0.30, deductible: 1676, coinsurance: 0,    oopMax: Infinity, pPriorAuth: 0,    pMedicalNecessity: 0.03, pOutOfNetwork: 0,    pMissingDocs: 0.01, pCoding: 0.04 },
  "Private Insurance": { allowedRatio: 0.45, deductible: 1787, coinsurance: 0.20, oopMax: 9200,     pPriorAuth: 0.04, pMedicalNecessity: 0.03, pOutOfNetwork: 0.02, pMissingDocs: 0.01, pCoding: 0.04 },
  Medicaid:            { allowedRatio: 0.22, deductible: 0,    coinsurance: 0,    oopMax: Infinity, pPriorAuth: 0.03, pMedicalNecessity: 0.03, pOutOfNetwork: 0,    pMissingDocs: 0.01, pCoding: 0.04 },
  TRICARE:             { allowedRatio: 0.30, deductible: 0,    coinsurance: 0.05, oopMax: 3000,     pPriorAuth: 0,    pMedicalNecessity: 0.02, pOutOfNetwork: 0,    pMissingDocs: 0.01, pCoding: 0.04 },
  VA:                  { allowedRatio: 0.30, deductible: 0,    coinsurance: 0,    oopMax: Infinity, pPriorAuth: 0,    pMedicalNecessity: 0.02, pOutOfNetwork: 0,    pMissingDocs: 0.01, pCoding: 0.04 },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function controlNumber(ctx: ClaimContext): string {
  let h = 0;
  for (let i = 0; i < ctx.claimId.length; i++) h = (h * 31 + ctx.claimId.charCodeAt(i)) | 0;
  return `ICN-${ctx.tick}-${String(Math.abs(h) % 1_000_000).padStart(6, "0")}`;
}

export class USClaimLifecycle implements IClaimLifecycle {
  config = { countryCode: "US", currency: "USD", displayName: "United States (Medicare/MS-DRG)", currencyMinorUnits: 2 };
  readonly verifyEveryTicks = 15;
  readonly batchSize = 8;

  private terms(ctx: ClaimContext): USPayerTerms | undefined { return US_TERMS[ctx.payerType]; }

  /** Insured claims need a coded chart before the clearinghouse accepts them. */
  canSubmit(ctx: ClaimContext): boolean {
    return !this.terms(ctx) || ctx.chartCoded;
  }

  rngDrawsPerBuild(): number { return 0; }

  buildClaim(ctx: ClaimContext): ClaimDraft {
    const t = this.terms(ctx);
    const total = ctx.totalCharges;
    if (!t) {
      // Self-pay (and unknown): the patient owes the full chargemaster amount.
      return {
        billedAmount: total, coveredAmount: 0, patientResponsibility: total,
        payerReference: null, deferredDenial: null, initialStatus: "submitted", settledAtCreation: false,
      };
    }
    const allowed = round2(total * t.allowedRatio);
    // Deductible first, then coinsurance on the remainder, capped at the OOP max.
    const deductiblePart = Math.min(allowed, t.deductible);
    const coinsurancePart = (allowed - deductiblePart) * t.coinsurance;
    const patientResponsibility = round2(Math.min(deductiblePart + coinsurancePart, t.oopMax, allowed));
    return {
      billedAmount: total,
      coveredAmount: round2(allowed - patientResponsibility),
      patientResponsibility,
      payerReference: controlNumber(ctx),
      deferredDenial: null,
      initialStatus: "submitted",
      settledAtCreation: false,
    };
  }

  rngDrawsPerVerification(ctx: ClaimContext): number {
    return this.terms(ctx) ? 1 : 0;
  }

  verify(ctx: ClaimContext, rng: () => number): VerificationOutcome {
    const t = this.terms(ctx);
    if (!t) return { status: "paid", denial: null }; // patient-pay: nothing to adjudicate
    // One roll, partitioned into disjoint denial slices; the coding slice grows
    // when the chart carries fewer secondary diagnoses (less specific coding).
    const secondary = ctx.chartDiagnoses.filter(d => d.type === "secondary").length;
    const pCoding = Math.min(0.25, t.pCoding + Math.max(0, 2 - secondary) * 0.02);
    const slices: [number, DenialCode][] = [
      [pCoding, US_DENIALS.incomplete_coding!],
      [t.pPriorAuth, US_DENIALS.prior_auth_missing!],
      [t.pMissingDocs, US_DENIALS.missing_documents!],
      [t.pMedicalNecessity, US_DENIALS.medical_necessity!],
      [t.pOutOfNetwork, US_DENIALS.out_of_network!],
    ];
    let r = rng();
    for (const [p, denial] of slices) {
      if (p <= 0) continue;
      if (r < p) return { status: denial.recoverable ? "returned" : "denied", denial };
      r -= p;
    }
    return { status: "paid", denial: null };
  }

  denialTaxonomy(): DenialCode[] { return Object.values(US_DENIALS); }
}
