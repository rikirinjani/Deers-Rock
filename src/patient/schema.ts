import type { Identity } from "../identity/types.js";

export type Gender = "male" | "female";

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
}

export type BloodType = "A" | "B" | "AB" | "O";
export type Rhesus = "+" | "-";

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
}

export interface Medication {
  code: string;
  name: string;
  dose: string;
  route: string;
}

export type PayerType = "BPJS Kesehatan" | "BPJS Ketenagakerjaan" | "Jasa Raharja" | "Private Insurance" | "Self-pay";

export interface Encounter {
  id: string;
  patientId: string;
  type: "inpatient" | "outpatient";
  startTime: number;
  endTime: number | null;
  status: "active" | "discharged" | "transferred";
  payer: PayerType;
  attendingDoctorId?: string;
  assignedNurseId?: string;
  /**
   * Phase D: principal diagnosis for this encounter, as an ICD-10 CODE string.
   * Selection rules (documented, deterministic, no RNG):
   *  - inpatient + ED encounters: first ACTIVE diagnosis of the patient's
   *    problem list (insertion order = generation order); falls back to the
   *    first diagnosis; "UNKNOWN" only if the patient has none (generator
   *    always assigns >= 1, so this is a safety net).
   *  - outpatient encounters: the clinic-visit diagnosis selected by the
   *    outpatient flow (referral-matched or walk-in pool draw) — the acute
   *    reason for the visit, not the chronic problem list.
   */
  primaryDiagnosis?: string;
  /**
   * Issue #5 (Oracle rework, F1): discharge-time severity snapshot, written
   * ONCE by the engine at the moment the encounter closes (markov.ts /
   * emergency.ts / outpatient.ts), computed from the respiratoryOrders that
   * still exist at close time. Additive optional field; no rng; no tick-loop
   * behavior change. Stored ON the encounter (not a module-level Map) so it
   * lives and dies with the encounter object, flows through state
   * snapshots/journaling, and cannot leak between Worlds in one process.
   * Serialization prefers this snapshot; live derivation from
   * respiratoryOrders is only a fallback when no snapshot exists (fresh test
   * fixtures), because cleanup.ts prunes discontinued respiratory orders
   * (MAX_RESP=50, ~400-tick retention) and would otherwise decay the value
   * toward 0 over poll time.
   */
  _severityAtClose?: { icuDays: number; ventilatorDays: number };
  /**
   * ADR-015 D2 (Epic IX Phase 1): room class stamped ONCE at inpatient bed
   * assignment (markov.ts). Additive optional field; no rng. Room charges bill
   * per 1440-tick sim-day against this stamp for the whole stay. Absent on
   * outpatient/ED encounters — its absence gates room billing (they never
   * accrue room charges).
   */
  roomClassAtAdmission?: RoomClass;
  /**
   * ADR-015 D2 (Epic IX Phase 1): highest room-day number already billed for
   * this encounter (1 charge per complete 1440-tick day + one final partial
   * day at discharge, min 1). Written only by billingHandler; makes per-day
   * billing idempotent across the handler's every-5-tick cadence without any
   * rng draw. Survives serialization with the encounter object.
   */
  lastRoomDayBilled?: number;
}

export type RoomClass = "vvip" | "vip" | "kelas-1" | "kelas-2" | "kelas-3" | "icu" | "hcu" | "nicu" | "picu";

export interface Bed {
  id: string;
  ward: string;
  building: string;
  roomClass: RoomClass;
  patientId: string | null;
}

export interface LabOrder {
  id: string;
  encounterId: string;
  patientId: string;
  testName: string;
  testCode: string;
  status: "ordered" | "collected" | "processing" | "resulted";
  result: string | null;
  referenceRange: string;
  unit: string;
  orderedAt: number;
  resultedAt: number | null;
}

export interface MedicationOrder {
  id: string;
  encounterId: string;
  patientId: string;
  medication: Medication;
  status: "ordered" | "dispensed" | "administered" | "discontinued";
  dose: string;
  route: string;
  frequency: string;
  orderedAt: number;
  administeredAt: number | null;
}

export interface NurseNote {
  id: string;
  encounterId: string;
  patientId: string;
  noteType: "assessment" | "round" | "procedure" | "observation";
  content: string;
  timestamp: number;
}

export interface PhysicianOrder {
  id: string;
  encounterId: string;
  patientId: string;
  orderType: "medication" | "lab" | "imaging" | "consult" | "discharge" | "surgery" | "respiratory" | "diet" | "social";
  description: string;
  status: "active" | "completed" | "cancelled";
  orderedAt: number;
  completedAt: number | null;
}

export interface RadiologyOrder {
  id: string;
  encounterId: string;
  patientId: string;
  studyType: string;
  modality: "X-ray" | "CT" | "MRI" | "Ultrasound" | "Mammography" | "Fluoroscopy";
  status: "ordered" | "scheduled" | "completed" | "resulted";
  finding: string | null;
  impression: string | null;
  orderedAt: number;
  resultedAt: number | null;
}

export interface SurgeryOrder {
  id: string;
  encounterId: string;
  patientId: string;
  procedureName: string;
  procedureCode: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  surgeon: string;
  scheduledAt: number;
  completedAt: number | null;
  notes: string | null;
}

export interface RespiratoryOrder {
  id: string;
  encounterId: string;
  patientId: string;
  therapyType: "ventilator" | "oxygen" | "nebulizer" | "chest-PT" | "PFT" | "CPAP";
  status: "ordered" | "active" | "discontinued";
  settings: string;
  orderedAt: number;
  notes: string | null;
}

export interface DietOrder {
  id: string;
  encounterId: string;
  patientId: string;
  dietType: "regular" | "soft" | "liquid" | "NPO" | "diabetic" | "cardiac" | "renal" | "high-protein";
  status: "active" | "discontinued";
  orderedAt: number;
  notes: string | null;
}

export interface SocialWorkNote {
  id: string;
  encounterId: string;
  patientId: string;
  noteType: "assessment" | "discharge-planning" | "counseling" | "resource-coordination";
  content: string;
  timestamp: number;
  disposition: "home" | "rehab" | "SNF" | "hospice" | "psychiatric" | null;
}

export interface EdTriage {
  id: string;
  encounterId: string;
  patientId: string;
  acuity: 1 | 2 | 3 | 4 | 5;
  chiefComplaint: string;
  arrivalMode: "walk-in" | "ambulance" | "transfer";
  disposition: "admitted" | "discharged" | "transferred" | null;
  triagedAt: number;
  dischargedAt: number | null;
}

// ─── Medical Records / HIM ───
export interface MedicalChart {
  id: string;
  encounterId: string;
  patientId: string;
  status: "open" | "incomplete" | "completed" | "coded";
  createdAt: number;
  completedAt: number | null;
  diagnoses: { code: string; name: string; type: "primary" | "secondary" }[];
  procedures: { code: string; name: string; date: number }[];
  coder: string | null;
}

// ─── Finance / Billing ───
// ADR-015 D1/D7: "dialysis" and "radiotherapy" added (additive union growth —
// previously fully-simulated departments that billed zero; no consumer switches
// exhaustively on this union, grouping is by string).
export type ChargeCategory = "lab" | "radiology" | "pharmacy" | "surgery" | "room" | "consult" | "emergency" | "respiratory" | "supply" | "administration" | "dialysis" | "radiotherapy";

export interface Charge {
  id: string;
  encounterId: string;
  patientId: string;
  category: ChargeCategory;
  description: string;
  amount: number;
  billedAt: number;
  paid: boolean;
  /**
   * ADR-015 D1 additive optional pricing fields. `amount` stays the canonical
   * billed total: amount = unitPrice × quantity whenever both are present.
   */
  code?: string;
  unitPrice?: number;
  quantity?: number;
}

export type ClaimDenialReason = "incomplete_coding" | "missing_documents" | "mismatched_icd_cbg" | "invalid_sep" | "coverage_expired" | "invalid_principal_dx" | "procedure_not_documented" | null;

/**
 * ADR-015 D3 (Epic IX Phase 2): private-insurance tier data table.
 * Replaces the flat 70% coverage with 3 tiers (80/90/100% coverage,
 * 10/5/0% co-pay). No annual policy ceiling in wave 1 (deferred, D10).
 * Tier selection is deterministic — see `selectPrivateTier` in finance.ts.
 */
export interface PrivateTier {
  name: string;
  coverage: number;   // fraction of totalCharges covered (0.80 | 0.90 | 1.00)
  coPay: number;      // patient out-of-pocket fraction (0.10 | 0.05 | 0.00)
}

export const PRIVATE_TIERS: PrivateTier[] = [
  { name: "private-basic",   coverage: 0.80, coPay: 0.10 },
  { name: "private-standard",coverage: 0.90, coPay: 0.05 },
  { name: "private-premium", coverage: 1.00, coPay: 0.00 },
];

export interface InsuranceClaim {
  id: string;
  encounterId: string;
  patientId: string;
  payer: string;
  sepNumber: string | null;
  actualCost: number;
  totalCharges: number;
  coveredAmount: number;
  patientResponsibility: number;
  /**
   * ADR-015 D3 lifecycle (Phase 2):
   *   submitted → verifying → adjudicated → paid | denied
   *   + returned (defect; auto-resubmits when chart is coded — existing behavior)
   * "adjudicated" was previously a dead enum value; it is now the
   * post-verification decision point, immediately followed by paid/denied.
   * In practice adjudicated is transient (resolved within the same pass).
   */
  status: "submitted" | "verifying" | "adjudicated" | "paid" | "denied" | "returned";
  denialReason: ClaimDenialReason;
  submittedAt: number;
  resolvedAt: number | null;
  /**
   * ADR-015 D5: deterministic private-insurance tier index for claims paid
   * by "Private Insurance" (0-2 into PRIVATE_TIERS). Absent on all other
   * payers. Computed at claim creation from a string hash of claim.id —
   * zero rng draws (D8).
   */
  privateTier?: number;
}

export interface Payment {
  id: string;
  encounterId: string;
  patientId: string;
  type: "cash" | "card" | "insurance" | "transfer";
  amount: number;
  paidAt: number;
  note: string;
}

// ─── Central Supply / Inventory ───
export interface InventoryItem {
  itemCode: string;
  itemName: string;
  category: "medication" | "lab-reagent" | "contrast" | "surgical" | "consumable" | "oxygen";
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number;
  departmentId: string;
}

export interface StockTransaction {
  id: string;
  itemCode: string;
  type: "restock" | "dispense" | "transfer" | "waste";
  quantity: number;
  timestamp: number;
  departmentId: string;
  referenceId: string | null;
}
