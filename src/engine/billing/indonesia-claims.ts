/**
 * Indonesian claim lifecycle (BPJS / INA-CBG, Jasa Raharja, private, self-pay).
 *
 * Epic X M10.2: the rules that used to live inline in finance.ts's
 * billingHandler, moved behind IClaimLifecycle with NO behaviour change
 * (ADR-015 D3/D5/D8 semantics, rng draw order and counts preserved).
 */
import { lookupCbgTariff, inferSeverity } from "../ina-cbg.js";
import { PRIVATE_TIERS } from "../../patient/schema.js";
import type {
  ClaimContext, ClaimDraft, DenialCode, IClaimLifecycle, VerificationOutcome,
} from "./contracts.js";

const JR_TICK_CAP = 30 * 24 * 60; // 30-day Jasa Raharja treatment cap (in ticks / minutes)

export const ID_DENIALS: Record<string, DenialCode> = {
  incomplete_coding: { code: "incomplete_coding", description: "Resume medis incomplete; returned for coding", category: "coding", recoverable: true },
  missing_documents: { code: "missing_documents", description: "Supporting documents missing", category: "documentation", recoverable: false },
  mismatched_icd_cbg: { code: "mismatched_icd_cbg", description: "ICD-10 does not map to an INA-CBG group", category: "coding", recoverable: false },
  invalid_sep: { code: "invalid_sep", description: "Invalid SEP", category: "coverage", recoverable: false },
  coverage_expired: { code: "coverage_expired", description: "Coverage expired", category: "coverage", recoverable: false },
  invalid_principal_dx: { code: "invalid_principal_dx", description: "Principal diagnosis has no tariff mapping", category: "coding", recoverable: false },
  procedure_not_documented: { code: "procedure_not_documented", description: "Billed procedure not documented on chart", category: "documentation", recoverable: false },
};

/**
 * ADR-015 D5: deterministic private-insurance tier selection (zero rng).
 * String-hash claim.id into PRIVATE_TIERS (0-2).
 */
export function selectPrivateTier(claimId: string): number {
  let h = 0;
  for (let i = 0; i < claimId.length; i++) h = (h * 31 + claimId.charCodeAt(i)) | 0;
  return Math.abs(h) % PRIVATE_TIERS.length;
}

const isCbgPayer = (p: string) => p === "BPJS Kesehatan" || p === "BPJS Ketenagakerjaan";

function severityOf(ctx: ClaimContext) {
  return inferSeverity(ctx.chartDiagnoses.map(d => d.code)).level;
}

export class IndonesiaClaimLifecycle implements IClaimLifecycle {
  config = { countryCode: "ID", currency: "IDR", displayName: "Indonesia (BPJS/INA-CBG)", currencyMinorUnits: 0 };
  readonly verifyEveryTicks = 15;
  readonly batchSize = 8;

  canSubmit(ctx: ClaimContext): boolean {
    // BPJS / BPJS Ketenagakerjaan claims require a coded chart before submission.
    return !(isCbgPayer(ctx.payerType) && !ctx.chartCoded);
  }

  private cbgEntry(ctx: ClaimContext) {
    return ctx.patientPrimaryDxCode ? lookupCbgTariff(ctx.patientPrimaryDxCode, severityOf(ctx)) : undefined;
  }

  rngDrawsPerBuild(ctx: ClaimContext): number {
    if (ctx.payerType === "Jasa Raharja") return 1; // SEP number
    if (isCbgPayer(ctx.payerType)) return this.cbgEntry(ctx) ? 1 : 0;
    return 0;
  }

  buildClaim(ctx: ClaimContext, rng: () => number): ClaimDraft {
    const payer = ctx.payerType;
    const total = ctx.totalCharges;
    const sep = () => `SEP-${ctx.tick}-${Math.floor(rng() * 9000) + 1000}`;

    let billedAmount = total;
    let coveredAmount: number;
    let patientResponsibility: number;
    let payerReference: string | null = null;
    let deferredDenial: DenialCode | null = null;
    let tierIndex: number | undefined;

    if (isCbgPayer(payer)) {
      // All-inclusive tariff per INA-CBG (wave 1: same path for Ketenagakerjaan).
      const cbg = this.cbgEntry(ctx);
      if (cbg) {
        billedAmount = cbg.tariffIdr;
        coveredAmount = cbg.tariffIdr;
        patientResponsibility = 0;
        payerReference = sep();
      } else {
        // ADR-015 D3: submitted with denial deferred to the verification stage.
        coveredAmount = 0;
        patientResponsibility = total;
        deferredDenial = ID_DENIALS.mismatched_icd_cbg!;
      }
    } else if (payer === "Jasa Raharja") {
      // Full coverage for accident cases, capped at 30 days.
      const jrCapRatio = ctx.encounterDurationTicks > JR_TICK_CAP ? JR_TICK_CAP / ctx.encounterDurationTicks : 1;
      coveredAmount = Math.round(total * jrCapRatio);
      patientResponsibility = total - coveredAmount;
      payerReference = sep();
    } else if (payer === "Self-pay") {
      coveredAmount = 0;
      patientResponsibility = total;
    } else {
      // ADR-015 D5: private insurance 3-tier table; tier is a string hash, zero rng.
      tierIndex = selectPrivateTier(ctx.claimId);
      const tier = PRIVATE_TIERS[tierIndex] ?? PRIVATE_TIERS[0]!;
      coveredAmount = Math.round(total * tier.coverage);
      patientResponsibility = total - coveredAmount;
    }

    return {
      billedAmount, coveredAmount, patientResponsibility, payerReference, deferredDenial,
      // Existing behaviour: every claim enters at "submitted"; Jasa Raharja is
      // stamped resolved at creation (no verifikator step).
      initialStatus: "submitted",
      settledAtCreation: payer === "Jasa Raharja",
      tierIndex,
    };
  }

  rngDrawsPerVerification(ctx: ClaimContext): number {
    if (!isCbgPayer(ctx.payerType)) return 0;
    return this.verifyBranch(ctx) === "roll" ? 1 : 0;
  }

  /** Which verification branch applies; the only one that draws is "roll". */
  private verifyBranch(ctx: ClaimContext): "invalid_principal_dx" | "procedure_not_documented" | "roll" {
    const dx = ctx.chartDiagnoses;
    const chartPrimary = dx.find(d => d.type === "primary") ?? dx[0];
    const chartHasTariff = chartPrimary ? lookupCbgTariff(chartPrimary.code) !== undefined : false;
    const chartDxHasTariff = dx.some(d => lookupCbgTariff(d.code) !== undefined);
    if (ctx.existingDenialCode === "mismatched_icd_cbg" || (chartHasTariff === false && chartDxHasTariff === false)) {
      return "invalid_principal_dx";
    }
    if (ctx.billedProcedureChargeCount > 0 && ctx.chartProcedureCount === 0) return "procedure_not_documented";
    return "roll";
  }

  verify(ctx: ClaimContext, rng: () => number): VerificationOutcome {
    // Non-CBG payers settle on their coverage math: paid, no denial roll.
    if (!isCbgPayer(ctx.payerType)) return { status: "paid", denial: null };

    const branch = this.verifyBranch(ctx);
    if (branch === "invalid_principal_dx") return { status: "denied", denial: ID_DENIALS.invalid_principal_dx! };
    if (branch === "procedure_not_documented") return { status: "denied", denial: ID_DENIALS.procedure_not_documented! };

    // ADR-015 D3/D6: coding-defect probability varies with chart completeness
    // (fewer secondary diagnoses -> higher chance of a flagged resume medis).
    // ONE rng roll for the paid/returned/denied outcome (D8).
    const secondaryCount = ctx.chartDiagnoses.filter(d => d.type === "secondary").length;
    const defectProb = Math.min(0.25, 0.10 + Math.max(0, 2 - secondaryCount) * 0.05);
    const roll = rng();
    if (roll < 1 - defectProb) return { status: "paid", denial: null };
    // 2/3 of the defect mass is returned-for-coding (auto-resubmits), 1/3 hard-denied.
    if (roll < 1 - defectProb * (1 / 3)) return { status: "returned", denial: ID_DENIALS.incomplete_coding! };
    return { status: "denied", denial: ID_DENIALS.missing_documents! };
  }

  denialTaxonomy(): DenialCode[] {
    return Object.values(ID_DENIALS);
  }
}
