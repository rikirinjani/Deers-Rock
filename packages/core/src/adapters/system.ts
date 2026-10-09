/**
 * ADR-027: Adapter System Interfaces
 *
 * Every country must implement these interfaces to plug into
 * the Deer's Rock simulation engine.
 */
import type {
  Patient, PayerType, PayerAssignment, SeverityLevel,
  TariffEntry, DrugRecord, AdjudicationResult, FinancialBreakdown,
  IAdapterConfig,
} from "./interfaces.js";

/**
 * Payer System — determines insurance type and coverage
 */
export interface IPayerSystem {
  config: IAdapterConfig;

  /** Assign payer to a patient (deterministic or RNG-based) */
  assignPayer(patient: Patient, rng?: () => number): PayerAssignment;

  /** Submit claim for an encounter */
  submitClaim(encounter: any, tariff: TariffEntry, charges: number): Promise<AdjudicationResult>;

  /** Get coverage ratio for a payer type */
  getCoverageRatio(payerType: PayerType): number;

  /** List all supported payer types */
  getPayerTypes(): PayerType[];
}

/**
 * Tariff System — maps diagnoses/procedures to payment rates
 */
export interface ITariffSystem {
  config: IAdapterConfig;

  /** Look up tariff by ICD code (and optional procedure code) */
  lookupTariff(icd10: string, procedureCode?: string): TariffEntry | null;

  /** Infer severity from diagnoses */
  inferSeverity(diagnoses: { code: string; name: string; active: boolean }[]): SeverityLevel;

  /** Calculate patient responsibility (deductible, copay, coinsurance) */
  calculatePatientResponsibility(
    totalCharges: number,
    tariff: TariffEntry,
    payer: PayerAssignment
  ): FinancialBreakdown;

  /** List all available tariff groups */
  listTariffGroups(): string[];
}

/**
 * Formulary — drug pricing and availability
 */
export interface IFormulary {
  config: IAdapterConfig;

  /** Get drug record by code */
  getDrug(code: string): DrugRecord | null;

  /** Get drug price for a specific payer */
  getDrugPrice(code: string, payerType: PayerType): number;

  /** Get list of essential drugs */
  getEssentialDrugs(): string[];

  /** List all drugs in formulary */
  listDrugs(): DrugRecord[];
}

/**
 * Identity Generator — creates patient/encounter IDs per country format
 */
export interface IIdentityGenerator {
  config: IAdapterConfig;

  /** Generate unique patient ID */
  generatePatientId(): string;

  /** Generate unique encounter ID */
  generateEncounterId(): string;

  /** Generate unique bed ID */
  generateBedId(): string;

  /** Generate unique agent ID */
  generateAgentId(): string;

  /** Format national ID (NIK for Indonesia, MRN for US) */
  formatNationalId(patient: Patient): string;
}

/**
 * Referral System — handles patient referrals between facilities
 */
export interface IReferralSystem {
  config: IAdapterConfig;

  /** Create referral letter */
  createReferral(patient: Patient, sourceFacility: string, targetFacility: string): Promise<any>;

  /** Process incoming referral */
  processIncomingReferral(referral: any): Promise<boolean>;

  /** Get referral pipeline stats */
  getPipelineStats(): { pending: number; incoming: number; completed: number };
}

/**
 * Report Generator — generates country-specific reports
 */
export interface IReportGenerator {
  config: IAdapterConfig;

  /** Generate SIRS form (Indonesia) or CMS form (US) */
  generateForm(formType: string, data: any): Promise<string>;

  /** Export encounters to CSV */
  exportEncountersCSV(encounters: any[]): string;

  /** Export charges to CSV */
  exportChargesCSV(charges: any[]): string;
}

/**
 * Adapter Registry — holds all registered adapters
 */
export class AdapterRegistry {
  private static instances = new Map<string, unknown>();

  static register<T extends object>(key: string, adapter: T): void {
    AdapterRegistry.instances.set(key, adapter);
  }

  static get<T extends object>(key: string): T | null {
    return (AdapterRegistry.instances.get(key) ?? null) as T;
  }

  static has(key: string): boolean {
    return AdapterRegistry.instances.has(key);
  }
}
