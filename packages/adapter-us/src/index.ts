/**
 * @deers-rock/adapter-us — US Healthcare Adapter
 *
 * Implements IPayerSystem, ITariffSystem, IFormulary, IIdentityGenerator
 * for US hospitals (Medicare, Medicaid, Private insurance).
 */
import type {
  Patient, PayerType, PayerAssignment, SeverityLevel,
  TariffEntry, DrugRecord, AdjudicationResult, FinancialBreakdown,
  IAdapterConfig, IPayerSystem, ITariffSystem, IFormulary, IIdentityGenerator,
} from "@deers-rock/core";
import { AdapterRegistry } from "@deers-rock/core";

export const US_CONFIG: IAdapterConfig = {
  countryCode: "US",
  currency: "USD",
  displayName: "United States (Medicare/MS-DRG)",
};

// ── Payer System ──────────────────────────────────────────────────────────────
export class USPayerSystem implements IPayerSystem {
  config = US_CONFIG;

  assignPayer(patient: Patient, rng?: () => number): PayerAssignment {
    // US payer mix based on age and status
    const r = rng ? rng() : Math.random();
    const age = patient.age;

    // Medicare: age 65+ or disability
    if (age >= 65) {
      return {
        type: "Medicare", coverageRatio: 0.80, copayPercent: 20,
        hasDeductible: true, deductibleAmount: 1676, priorAuthRequired: false,
      };
    }
    if (r < 0.45) {
      // Private insurance (employer-sponsored)
      return {
        type: "Private Insurance", coverageRatio: 0.80, copayPercent: 20,
        hasDeductible: true, deductibleAmount: 2000, priorAuthRequired: true,
      };
    }
    if (r < 0.65) {
      // Medicaid
      return {
        type: "Medicaid", coverageRatio: 0.95, copayPercent: 0,
        hasDeductible: false, deductibleAmount: 0, priorAuthRequired: false,
      };
    }
    if (r < 0.75) {
      // Self-pay / uninsured
      return {
        type: "Self-pay", coverageRatio: 0.0, copayPercent: 100,
        hasDeductible: false, deductibleAmount: 0, priorAuthRequired: false,
      };
    }
    if (r < 0.85) {
      // TRICARE (military)
      return {
        type: "TRICARE", coverageRatio: 0.90, copayPercent: 5,
        hasDeductible: false, deductibleAmount: 0, priorAuthRequired: false,
      };
    }
    return {
      type: "VA", coverageRatio: 1.0, copayPercent: 0,
      hasDeductible: false, deductibleAmount: 0, priorAuthRequired: false,
    };
  }

  async submitClaim(encounter: any, tariff: TariffEntry, charges: number): Promise<AdjudicationResult> {
    // US claims often require prior authorization
    const priorAuthOk = !tariff.weight || tariff.weight > 0;
    if (!priorAuthOk) {
      return {
        approved: false, paidAmount: 0, patientResponsibility: charges,
        denialReason: { code: "NO_PREAUTH", description: "Prior authorization required" },
      };
    }
    const covered = charges * tariff.weight;
    return { approved: true, paidAmount: covered, patientResponsibility: charges - covered };
  }

  getCoverageRatio(payerType: PayerType): number {
    const map: Record<string, number> = {
      "Medicare": 0.80, "Medicaid": 0.95, "Private Insurance": 0.80,
      "Self-pay": 0.0, "TRICARE": 0.90, "VA": 1.0,
    };
    return map[payerType] ?? 0.80;
  }

  getPayerTypes(): PayerType[] {
    return ["Medicare", "Medicaid", "Private Insurance", "Self-pay", "TRICARE", "VA"];
  }
}

// ── Tariff System (MS-DRG) ────────────────────────────────────────────────────
// Simplified MS-DRG table — in production this would be a full CMS lookup
const MS_DRG_TABLE: Record<string, { weight: number; desc: string }> = {
  "I": { weight: 1.2, desc: "Circulatory System Diagnosis" },
  "E": { weight: 0.9, desc: "Endocrine, Nutritional & Metabolic" },
  "J": { weight: 1.5, desc: "Respiratory System Diagnosis" },
  "K": { weight: 0.8, desc: "Digestive System Diagnosis" },
  "N": { weight: 1.0, desc: "Kidney & Urinary System Diagnosis" },
  "S": { weight: 2.5, desc: "Injury & Poisoning" },
  "M": { weight: 1.1, desc: "Musculoskeletal System Diagnosis" },
  "A": { weight: 0.7, desc: "Infectious Disease" },
  "F": { weight: 0.9, desc: "Mental Disorders" },
  "G": { weight: 1.3, desc: "Nervous System Diagnosis" },
  "H": { weight: 0.6, desc: "Eye, Ear, Nose, Throat" },
  "O": { weight: 1.8, desc: " Pregnancy, Childbirth & Puerperium" },
  "P": { weight: 1.4, desc: "Perinatal Conditions" },
  "Q": { weight: 2.0, desc: "Congenital Malformations" },
  "R": { weight: 0.7, desc: "Symptoms & Abnormal Findings" },
  "T": { weight: 2.2, desc: "Injury & Poisoning (continued)" },
  "V": { weight: 0.3, desc: "Contact with Health Services" },
  "W": { weight: 0.3, desc: "Abnormal findings" },
  "X": { weight: 0.3, desc: "Supplemental codes" },
  "Y": { weight: 0.3, desc: "Temporary provisional codes" },
  "Z": { weight: 0.4, desc: "Factors influencing health status" },
};

export class USTariffSystem implements ITariffSystem {
  config = US_CONFIG;

  lookupTariff(icd10: string, _procedureCode?: string): TariffEntry | null {
    const prefix = icd10.charAt(0);
    const entry = MS_DRG_TABLE[prefix];
    if (!entry) return null;
    return {
      group: `DRG-${prefix}`,
      description: entry.desc,
      baseRate: 7500,  // USD base rate
      severity: "I",
      ccAdjusted: false,
      weight: entry.weight,
    };
  }

  inferSeverity(diagnoses: { code: string; name: string; active: boolean }[]): SeverityLevel {
    const mccCodes = ["I21", "J81", "G46", "A41", "K72"];
    const ccCodes = ["I10", "E11", "J45", "N18", "M54"];
    const hasMCC = diagnoses.some(d => mccCodes.some(m => d.code.startsWith(m)));
    if (hasMCC) return "MCC";
    const hasCC = diagnoses.some(d => ccCodes.some(c => d.code.startsWith(c)));
    if (hasCC) return "III";
    return "II";
  }

  calculatePatientResponsibility(totalCharges: number, tariff: TariffEntry, payer: PayerAssignment): FinancialBreakdown {
    const drgPayment = totalCharges * tariff.weight;
    const covered = drgPayment * payer.coverageRatio;
    const afterDeductible = Math.max(0, covered - payer.deductibleAmount);
    const coinsurance = afterDeductible * (1 - payer.coverageRatio);
    const patientPay = totalCharges - afterDeductible + coinsurance;
    return {
      totalCharges,
      coveredAmount: afterDeductible,
      patientResponsibility: patientPay,
      breakdown: [
        { label: "DRG Payment", amount: drgPayment },
        { label: "Insurance Cover", amount: covered },
        { label: "Deductible", amount: payer.deductibleAmount },
        { label: "Coinsurance", amount: coinsurance },
        { label: "Patient Responsibility", amount: patientPay },
      ],
    };
  }

  listTariffGroups(): string[] {
    return Object.keys(MS_DRG_TABLE).map(k => `DRG-${k}`);
  }
}

// ── Formulary (FDA-approved drugs) ───────────────────────────────────────────
const FDA_DRUGS = [
  { code: "aceta", name: "Acetaminophen", category: "analgesic", price: 15, essential: true },
  { code: "amoxi", name: "Amoxicillin", category: "antibiotic", price: 45, essential: true },
  { code: "atenl", name: "Atenolol", category: "beta-blocker", price: 25, essential: true },
  { code: "aceo1", name: "Lisinopril", category: "ACE inhibitor", price: 20, essential: true },
  { code: "metfo", name: "Metformin", category: "antidiabetic", price: 30, essential: true },
  { code: "atorv", name: "Atorvastatin", category: "statin", price: 50, essential: true },
  { code: "albut", name: "Albuterol", category: "bronchodilator", price: 35, essential: true },
  { code: "omepr", name: "Omeprazole", category: "PPI", price: 40, essential: true },
];

export class USFormulary implements IFormulary {
  config = US_CONFIG;

  getDrug(code: string): DrugRecord | null {
    const drug = FDA_DRUGS.find(d => d.code === code);
    if (!drug) return null;
    return { ...drug, requiresPrescription: true };
  }

  getDrugPrice(code: string, payerType: PayerType): number {
    const drug = this.getDrug(code);
    if (!drug) return 50;
    // US pricing varies by payer negotiated rates
    const multiplier = payerType === "Medicare" ? 1.2 : payerType === "Medicaid" ? 0.8 : 1.0;
    return Math.round(drug.price * multiplier);
  }

  getEssentialDrugs(): string[] { return FDA_DRUGS.filter(d => d.essential).map(d => d.code); }
  listDrugs(): DrugRecord[] { return FDA_DRUGS.map(d => ({ ...d, requiresPrescription: true })); }
}

// ── Identity Generator ────────────────────────────────────────────────────────
let patientCounter = 0;
export class USIdentityGenerator implements IIdentityGenerator {
  config = US_CONFIG;

  generatePatientId(): string {
    return `MRN-${String(++patientCounter).padStart(6, "0")}`;
  }
  generateEncounterId(): string { return `ENC-${Date.now()}`; }
  generateBedId(): string { return `BED-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`; }
  generateAgentId(): string { return `AGT-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`; }

  formatNationalId(patient: Patient): string {
    // US uses SSN (masked) or MRN
    return `***-**-${String(patient.age).padStart(2, '0')}${String(Math.floor(Math.random() * 99)).padStart(2, '0')}`;
  }
}

// ── Registry Initialization ───────────────────────────────────────────────────
export function registerUSAdapters(): void {
  AdapterRegistry.register("payer:us", new USPayerSystem());
  AdapterRegistry.register("tariff:us", new USTariffSystem());
  AdapterRegistry.register("formulary:us", new USFormulary());
  AdapterRegistry.register("identity:us", new USIdentityGenerator());
}
