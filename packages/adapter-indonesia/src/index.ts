/**
 * @deers-rock/adapter-indonesia — Indonesia Healthcare Adapter
 *
 * Implements IPayerSystem, ITariffSystem, IFormulary, IIdentityGenerator
 * for Indonesian public hospitals (RSUD Type C).
 */
import type {
  Patient, PayerType, PayerAssignment, SeverityLevel,
  TariffEntry, DrugRecord, AdjudicationResult, FinancialBreakdown,
  IAdapterConfig, IPayerSystem, ITariffSystem, IFormulary, IIdentityGenerator,
} from "@deers-rock/core";
import { AdapterRegistry } from "@deers-rock/core";

export const INDONESIA_CONFIG: IAdapterConfig = {
  countryCode: "ID",
  currency: "IDR",
  displayName: "Indonesia (BPJS/INA-CBG)",
};

// ── Payer System ──────────────────────────────────────────────────────────────
export class IndonesiaPayerSystem implements IPayerSystem {
  config = INDONESIA_CONFIG;

  assignPayer(patient: Patient, rng?: () => number): PayerAssignment {
    // ADR-025: Expanded accident detection for Jasa Raharja
    const ACCIDENT_ICD_CODES = new Set([
      // Trauma S00-S99
      ...Array.from({ length: 100 }, (_, i) => `S${String(i).padStart(2, '0')}`),
      // External causes T00-T98
      ...Array.from({ length: 99 }, (_, i) => `T${String(i).padStart(2, '0')}`),
    ]);
    const activeDx = patient.diagnoses.filter(d => d.active);
    const primary = activeDx[0];
    if (primary && ACCIDENT_ICD_CODES.has(primary.code.substring(0, 3))) {
      return {
        type: "Jasa Raharja",
        coverageRatio: 1.0,
        copayPercent: 0,
        hasDeductible: false,
        deductibleAmount: 0,
        priorAuthRequired: false,
      };
    }
    // RNG-based payer mix (matches current behavior)
    const r = rng ? rng() : Math.random();
    if (r < 0.80) {
      return { type: "BPJS Kesehatan", coverageRatio: 0.95, copayPercent: 0, hasDeductible: false, deductibleAmount: 0, priorAuthRequired: false };
    }
    if (r < 0.88) {
      return { type: "Private Insurance", coverageRatio: 0.85, copayPercent: 15, hasDeductible: true, deductibleAmount: 500000, priorAuthRequired: false };
    }
    if (r < 0.95) {
      return { type: "BPJS Ketenagakerjaan", coverageRatio: 0.90, copayPercent: 5, hasDeductible: false, deductibleAmount: 0, priorAuthRequired: false };
    }
    return { type: "Self-pay", coverageRatio: 0.0, copayPercent: 100, hasDeductible: false, deductibleAmount: 0, priorAuthRequired: false };
  }

  async submitClaim(encounter: any, tariff: TariffEntry, charges: number): Promise<AdjudicationResult> {
    const covered = charges * tariff.weight;
    return { approved: true, paidAmount: covered, patientResponsibility: charges - covered };
  }

  getCoverageRatio(payerType: PayerType): number {
    const map: Record<string, number> = {
      "BPJS Kesehatan": 0.95, "BPJS Ketenagakerjaan": 0.90,
      "Jasa Raharja": 1.0, "Private Insurance": 0.85, "Self-pay": 0.0,
    };
    return map[payerType] ?? 0.80;
  }

  getPayerTypes(): PayerType[] {
    return ["BPJS Kesehatan", "BPJS Ketenagakerjaan", "Jasa Raharja", "Private Insurance", "Self-pay"];
  }
}

// ── Tariff System (INA-CBG) ───────────────────────────────────────────────────
export class IndonesiaTariffSystem implements ITariffSystem {
  config = INDONESIA_CONFIG;

  lookupTariff(icd10: string, _procedureCode?: string): TariffEntry | null {
    // Simplified lookup — in production this uses the full INA-CBG table
    const group = icd10.charAt(0);
    const baseRates: Record<string, number> = { I: 3500000, E: 2800000, J: 3200000, N: 2500000, K: 2000000 };
    const base = baseRates[group] ?? 2000000;
    return { group: icd10.substring(0, 3), description: `${icd10} group`, baseRate: base, severity: "I", ccAdjusted: false, weight: 1.0 };
  }

  inferSeverity(diagnoses: { code: string; name: string; active: boolean }[]): SeverityLevel {
    const majorCC = ["I50", "J96", "G46", "A41"];
    const hasMajorCC = diagnoses.some(d => majorCC.some(m => d.code.startsWith(m)));
    return hasMajorCC ? "III" : "I";
  }

  calculatePatientResponsibility(totalCharges: number, tariff: TariffEntry, payer: PayerAssignment): FinancialBreakdown {
    const covered = totalCharges * payer.coverageRatio;
    const copay = (totalCharges - covered) + (payer.hasDeductible ? payer.deductibleAmount : 0);
    return {
      totalCharges, coveredAmount: covered, patientResponsibility: copay,
      breakdown: [
        { label: "Tariff", amount: covered },
        { label: "Co-pay", amount: copay },
      ],
    };
  }

  listTariffGroups(): string[] {
    return ["A", "B", "C", "D", "E", "F", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  }
}

// ── Formulary (E-Catalogue) ───────────────────────────────────────────────────
const ESSENTIAL_DRUGS = ["paracetamol", "amoxicillin", "metformin", "atorvastatin", "amlodipine"];

export class IndonesiaFormulary implements IFormulary {
  config = INDONESIA_CONFIG;

  getDrug(code: string): DrugRecord | null {
    return { code, name: code, category: "other", price: 50000, requiresPrescription: true, isEssential: ESSENTIAL_DRUGS.includes(code.toLowerCase()) };
  }

  getDrugPrice(code: string, _payerType: PayerType): number {
    const drug = this.getDrug(code);
    return drug?.price ?? 50000;
  }

  getEssentialDrugs(): string[] { return ESSENTIAL_DRUGS; }
  listDrugs(): DrugRecord[] { return ESSENTIAL_DRUGS.map(c => this.getDrug(c)!); }
}

// ── Identity Generator ────────────────────────────────────────────────────────
let patientCounter = 0;
export class IndonesiaIdentityGenerator implements IIdentityGenerator {
  config = INDONESIA_CONFIG;

  generatePatientId(): string {
    return `PAT-${String(++patientCounter).padStart(4, "0")}`;
  }
  generateEncounterId(): string { return `ENC-${Date.now()}`; }
  generateBedId(): string { return `BED-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`; }
  generateAgentId(): string { return `AGT-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`; }

  formatNationalId(patient: Patient): string {
    // Generate synthetic NIK (16 digits) for simulation
    return `${String(patient.age).padStart(2, '0')}${String(new Date().getFullYear()).slice(2)}${String(Math.floor(Math.random() * 99)).padStart(2, '0')}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
  }
}

// ── Registry Initialization ───────────────────────────────────────────────────
export function registerIndonesiaAdapters(): void {
  const payer = new IndonesiaPayerSystem();
  const tariff = new IndonesiaTariffSystem();
  const formulary = new IndonesiaFormulary();
  const identity = new IndonesiaIdentityGenerator();

  AdapterRegistry.register("payer:indonesia", payer);
  AdapterRegistry.register("tariff:indonesia", tariff);
  AdapterRegistry.register("formulary:indonesia", formulary);
  AdapterRegistry.register("identity:indonesia", identity);
}
