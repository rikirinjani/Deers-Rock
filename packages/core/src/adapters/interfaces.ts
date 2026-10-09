/**
 * ADR-027: International Adapter Interfaces
 *
 * Core abstractions that every country adapter must implement.
 * The simulation engine depends only on these interfaces, not on
 * concrete adapter implementations.
 */

export type Gender = "male" | "female";
export type BloodType = "A" | "B" | "AB" | "O";
export type Rhesus = "+" | "-";

export interface Identity {
  nik?: string;          // Indonesia: National ID (16 digits)
  mrn?: string;          // US: Medical Record Number
  birthDate: string;
  province?: string;
  kabupaten?: string;
  kecamatan?: string;
  kelurahan?: string;
  religion?: string;
  maritalStatus?: string;
  nationality?: string;
}

export interface Vitals {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  painLevel: number;
}

export interface Diagnosis {
  code: string;
  name: string;
  active: boolean;
  priority?: number;
}

export interface Medication {
  code: string;
  name: string;
  dose: string;
  route: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  identity: Identity;
  phone: string;
  bloodType: BloodType;
  rhesus: Rhesus;
  allergies: string[];
  vitals: Vitals;
  diagnoses: Diagnosis[];
  medications: Medication[];
  /** ADR-025: morgue ID if deceased; null if alive */
  morgueId: string | null;
}

export type PayerType =
  | "BPJS Kesehatan"
  | "BPJS Ketenagakerjaan"
  | "Jasa Raharja"
  | "Private Insurance"
  | "Self-pay"
  | "Medicare"
  | "Medicaid"
  | "TRICARE"
  | "VA"
  | "Unknown";

export interface PayerAssignment {
  type: PayerType;
  coverageRatio: number;      // 0.0 - 1.0
  copayPercent: number;       // 0-100
  hasDeductible: boolean;
  deductibleAmount: number;
  priorAuthRequired: boolean;
}

export type SeverityLevel = "I" | "II" | "III" | "MCC";

export interface TariffEntry {
  group: string;
  description: string;
  baseRate: number;           // in local currency
  severity: SeverityLevel;
  ccAdjusted: boolean;
  /** For US: DRG weight; for ID: SEP multiplier */
  weight: number;
}

export interface DrugRecord {
  code: string;
  name: string;
  category: string;
  price: number;
  requiresPrescription: boolean;
  isEssential: boolean;
}

export interface ClaimDenialReason {
  code: string;
  description: string;
}

export interface AdjudicationResult {
  approved: boolean;
  paidAmount: number;
  patientResponsibility: number;
  denialReason?: ClaimDenialReason;
  priorAuthStatus?: "approved" | "denied" | "pending";
}

export interface FinancialBreakdown {
  totalCharges: number;
  coveredAmount: number;
  patientResponsibility: number;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

export interface IAdapterConfig {
  /** Country ISO code (e.g., "ID", "US") */
  countryCode: string;
  /** Currency code (e.g., "IDR", "USD") */
  currency: string;
  /** Display name for UI */
  displayName: string;
}
