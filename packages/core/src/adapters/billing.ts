/**
 * ADR-027 Amendment 1: billing-lifecycle contracts.
 *
 * Country-agnostic shapes for what `src/engine/finance.ts` does today for
 * Indonesia (Epic IX): charge rates, claim creation, the submitted -> verifying
 * -> adjudicated -> paid | denied | returned lifecycle, and the denial taxonomy.
 * Types only, no behaviour. 10.2 moves the Indonesian rules behind these;
 * 10.3 implements the US ones.
 *
 * Determinism contract (ADR-008 / ADR-015 D8): implementations MUST NOT call
 * Math.random or read the wall clock. Randomness comes only from the `rng`
 * passed in, and the number of draws must be a pure function of the inputs
 * (declared via `rngDrawsPerVerification`) so a given seed replays identically.
 */
import type { IAdapterConfig, PayerType } from "./interfaces.js";

/** Lifecycle states shared by every country (superset of ADR-015 D3). */
export type ClaimStatus =
  | "submitted" | "verifying" | "adjudicated" | "paid" | "denied" | "returned";

export type DenialCategory =
  | "coding" | "documentation" | "coverage" | "authorization" | "medical-necessity";

/** One entry in a country's denial taxonomy. Codes are adapter-defined strings. */
export interface DenialCode {
  code: string;
  description: string;
  category: DenialCategory;
  /** true = returned for correction and resubmitted; false = terminal denial */
  recoverable: boolean;
}

/** Charge categories the engine bills (mirrors Charge.category). */
export type ChargeCategory =
  | "administration" | "room" | "drug" | "lab" | "imaging" | "surgery"
  | "dialysis" | "radiotherapy" | "consultation" | "transport" | string;

/** Pricing hooks: lets an adapter own rates, currency units and markups. */
export interface IChargePolicy {
  config: IAdapterConfig;
  /** Base rate for a charge category, in major currency units. */
  baseRate(category: ChargeCategory, code?: string): number;
  /** Multiplier for room class (e.g. VIP, ward, private room). */
  roomClassMultiplier(roomClass: string): number;
  /** Markup applied to drug acquisition cost. */
  drugMarkup(payerType: PayerType): number;
}

/** What the adapter needs to price and route one discharged encounter. */
export interface ClaimContext {
  encounterId: string;
  patientId: string;
  payerType: PayerType;
  /** Sum of charges billed to the encounter, major currency units. */
  totalCharges: number;
  /** Primary + secondary diagnosis codes from the coded chart (ICD-10 flavour per adapter). */
  diagnosisCodes: string[];
  procedureCodes: string[];
  chartCoded: boolean;
  /** Admission length in sim-days, for per-diem caps. */
  lengthOfStayDays: number;
}

/** Result of building a claim from a ClaimContext. */
export interface ClaimDraft {
  /** Amount the payer is billed (tariff/DRG amount, or total charges for fee-for-service). */
  billedAmount: number;
  coveredAmount: number;
  patientResponsibility: number;
  /** Payer reference number (SEP for BPJS/JR, claim control number for US), if any. */
  payerReference: string | null;
  /** Denial deferred to the verification stage, if already known. */
  deferredDenial: DenialCode | null;
  /** Initial status; most payers start "submitted", some settle immediately. */
  initialStatus: ClaimStatus;
}

export interface VerificationOutcome {
  status: Extract<ClaimStatus, "paid" | "denied" | "returned">;
  denial: DenialCode | null;
  /** Amount actually paid (may differ from covered after adjudication). */
  paidAmount: number;
}

/**
 * Claim lifecycle: the country-specific rules behind finance.ts's billing
 * handler. The engine owns scheduling and state; the adapter owns the rules.
 */
export interface IClaimLifecycle {
  config: IAdapterConfig;

  /** Whether a claim may be created yet (e.g. BPJS requires a coded chart). */
  canSubmit(ctx: ClaimContext): boolean;

  /** Price and route the claim. Must not draw from rng. */
  buildClaim(ctx: ClaimContext): ClaimDraft;

  /** Engine cadence: run verification every N ticks, at most `batchSize` claims. */
  readonly verifyEveryTicks: number;
  readonly batchSize: number;

  /**
   * Draws consumed by `verify` for one claim (pure function of ctx/draft).
   * Zero for deterministic payers. Lets the engine and tests assert draw counts.
   */
  rngDrawsPerVerification(ctx: ClaimContext, draft: ClaimDraft): number;

  /** Decide the outcome of one claim in "verifying". */
  verify(ctx: ClaimContext, draft: ClaimDraft, rng: () => number): VerificationOutcome;

  /** The country's full denial taxonomy, for reports and validation. */
  denialTaxonomy(): DenialCode[];
}
