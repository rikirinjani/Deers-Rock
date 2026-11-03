/**
 * Engine-side mirror of packages/core/src/adapters/billing.ts (ADR-027
 * Amendment 1). The root tsconfig has rootDir=src, so src/ cannot import the
 * workspace package; the contract body below is kept byte-identical to the
 * core file and enforced by tests/billing-contract-drift.test.ts. Resolved for
 * real when the engine moves behind workspace packages (Epic X M10.6).
 */
import type { PayerType } from "../../patient/schema.js";

export interface IAdapterConfig {
  countryCode: string;
  currency: string;
  displayName: string;
  currencyMinorUnits?: number;
}

// ---- contract body (mirrored in src/engine/billing/contracts.ts; tests/billing-contract-drift.test.ts) ----

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

/**
 * Item-level price list (lab, imaging, procedures, drugs, fees) in major
 * currency units. Each lookup returns undefined on a miss; the caller then
 * falls back to IChargePolicy.baseRate for the category.
 */
export interface IPriceBook {
  config: IAdapterConfig;
  lab(testCode: string): number | undefined;
  radiology(studyType: string): number | undefined;
  surgery(procedureCode: string): number | undefined;
  dialysis(sessionType: string): number | undefined;
  radiotherapy(modality: string): number | undefined;
  edFee(acuity: number): number | undefined;
  specialtyConsult(specialty: string): number | undefined;
  respiratoryActivation(): number;
  /** Ambulance transfer fee for a tier ("BLS" | "ALS") and distance in km. */
  ambulance(tier: string, distanceKm: number): number;
  /** Billed unit price (acquisition cost x markup); undefined when the drug is not in the formulary. */
  drug(drugCode: string): number | undefined;
}

/** Facts about a patient that payer assignment may use. */
export interface PayerPatientFacts {
  id?: string;
  diagnoses: { code: string; active: boolean }[];
  nationality?: string;
  /** Age in years (US Medicare eligibility is age-driven). */
  age?: number;
  /** Explicit injury mechanism when known (e.g. from a police report). */
  injuryMechanism?: "traffic" | "other";
}

/**
 * Payer assignment at encounter creation. ONE draw from `rngDraw` at most
 * (ADR-015 D5/D8): the draw count must be a pure function of the patient.
 */
export interface IPayerAssigner {
  config: IAdapterConfig;
  /** The payer mix table this adapter rolls against, as [payer, share] pairs. */
  payerMix(): [PayerType, number][];
  assign(patient: PayerPatientFacts, rngDraw?: () => number, worldSeed?: number): PayerType;
}

/** One chart diagnosis as the coder recorded it. */
export interface ChartDiagnosis {
  code: string;
  type: "primary" | "secondary" | string;
}

/** What the adapter needs to price, route and verify one encounter's claim. */
export interface ClaimContext {
  claimId: string;
  encounterId: string;
  patientId: string;
  payerType: PayerType;
  /** Sim tick at the moment of the call (used for payer reference numbers). */
  tick: number;
  /** Sum of charges billed to the encounter, major currency units. */
  totalCharges: number;
  /** Primary active diagnosis on the patient problem list (tariff source), if any. */
  patientPrimaryDxCode: string | null;
  /** Diagnoses on the coded chart (grouping truth source for severity). */
  chartDiagnoses: ChartDiagnosis[];
  /** Number of procedures documented on the chart. */
  chartProcedureCount: number;
  /** Number of billed procedure-type charges (surgery, dialysis, radiotherapy). */
  billedProcedureChargeCount: number;
  chartCoded: boolean;
  /** Encounter duration in sim-minutes (ticks), for per-diem caps; 0 if unknown. */
  encounterDurationTicks: number;
  /** Denial already attached to the claim (e.g. deferred at creation), else null. */
  existingDenialCode: string | null;
  /** Amount covered, as set at claim creation (known at verification time). */
  coveredAmount: number;
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
  /** True when the payer settles at creation (no verification stage). */
  settledAtCreation: boolean;
  /** Adapter-specific tier index (e.g. private-insurance tier), if any. */
  tierIndex?: number;
}

export interface VerificationOutcome {
  status: Extract<ClaimStatus, "paid" | "denied" | "returned">;
  denial: DenialCode | null;
}

/**
 * Claim lifecycle: the country-specific rules behind finance.ts's billing
 * handler. The engine owns scheduling and state; the adapter owns the rules.
 */
export interface IClaimLifecycle {
  config: IAdapterConfig;

  /** Whether a claim may be created yet (e.g. BPJS requires a coded chart). */
  canSubmit(ctx: ClaimContext): boolean;

  /** Draws consumed by `buildClaim` (pure function of ctx; e.g. a reference number). */
  rngDrawsPerBuild(ctx: ClaimContext): number;

  /** Price and route the claim. May draw from `rng` only as declared above. */
  buildClaim(ctx: ClaimContext, rng: () => number): ClaimDraft;

  /** Engine cadence: run verification every N ticks, at most `batchSize` claims per stage. */
  readonly verifyEveryTicks: number;
  readonly batchSize: number;

  /** Draws consumed by `verify` for one claim (pure function of ctx). Zero for deterministic payers. */
  rngDrawsPerVerification(ctx: ClaimContext): number;

  /** Decide the outcome of one claim in "verifying". */
  verify(ctx: ClaimContext, rng: () => number): VerificationOutcome;

  /** The country's full denial taxonomy, for reports and validation. */
  denialTaxonomy(): DenialCode[];
}
