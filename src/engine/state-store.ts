import type { Patient, Bed, Encounter, LabOrder, MedicationOrder, NurseNote, PhysicianOrder, RadiologyOrder, SurgeryOrder, RespiratoryOrder, DietOrder, SocialWorkNote, EdTriage, MedicalChart, Charge, InsuranceClaim, Payment, InventoryItem, StockTransaction } from "../patient/schema.js";
import type { SpecialtyOrder } from "./specialty.js";
import type { AgentState } from "../agent/system.js";
import type { ReferralState } from "../referral/system.js";
import type { IcdPeriodData } from "./icd-tracker.js";
import type { MmConference } from "./mm-conference.js";
import type { BloodBankState } from "./blood-bank.js";
import { initBloodBank } from "./blood-bank.js";
import type { MicroState } from "./microbiology.js";
import { initMicroState } from "./microbiology.js";
import type { PathoState } from "./pathology.js";
import { initPathoState } from "./pathology.js";
import type { CssdState } from "./cssd.js";
import { initCssdState } from "./cssd.js";
import type { BiomedState } from "./biomedical-engineering.js";
import { initBiomedState } from "./biomedical-engineering.js";
import type { IpcState } from "./ipc.js";
import { initIpcState } from "./ipc.js";
import type { ClinicalNutritionState } from "./clinical-nutrition.js";
import { initNutritionState } from "./clinical-nutrition.js";
import type { RadiotherapyState } from "./radiotherapy.js";
import { initRtState } from "./radiotherapy.js";
import type { DialysisState } from "./dialysis.js";
import { initDialysisState } from "./dialysis.js";
import type { ScenarioState } from "./scenario.js";
import { initScenarioState } from "./scenario.js";
import { centralSupplyInit } from "./central-supply.js";

export interface MorgueRecord {
  patientId: string;
  encounterId: string;
  primaryDiagnosis: string;
  icdCode: string;
  age: number;
  gender: string;
  causeOfDeath: string;
  mortalityScore: number;
  deathTick: number;
}

export interface OutcomeRecord {
  patientId: string;
  encounterId: string;
  primaryDiagnosis: string;
  icdCode: string;
  outcome: "improved" | "deteriorated" | "deceased";
  losTicks: number;
  ordersCount: number;
  dischargeTick: number;
}

export interface CaseRecord {
  encounterId: string;
  patientId: string;
  primaryDiagnosis: string;
  actionsTaken: string[];
  outcome: "active" | "discharged" | "transferred";
  tickStarted: number;
  tickEnded: number | null;
  attendingDoctorId: string | null;
  attendingSpesialisasi: string | null;
}

export interface NurseCaseRecord {
  encounterId: string;
  patientId: string;
  assignedNurseId: string | null;
  assessmentsDone: number;
  alertsRaised: number;
  proceduresDone: number;
  medsAdministered: number;
  lastNoteTick: number;
}

export interface HospitalState {
  patients: Map<string, Patient>;
  beds: Map<string, Bed>;
  encounters: Map<string, Encounter>;
  wardCapacity: Record<string, number>;
  waitingRoom: number;
  labOrders: Map<string, LabOrder>;
  medicationOrders: Map<string, MedicationOrder>;
  nurseNotes: Map<string, NurseNote>;
  physicianOrders: Map<string, PhysicianOrder>;
  radiologyOrders: Map<string, RadiologyOrder>;
  surgeryOrders: Map<string, SurgeryOrder>;
  respiratoryOrders: Map<string, RespiratoryOrder>;
  dietOrders: Map<string, DietOrder>;
  socialWorkNotes: Map<string, SocialWorkNote>;
  edTriages: Map<string, EdTriage>;
  medicalCharts: Map<string, MedicalChart>;
  charges: Map<string, Charge>;
  insuranceClaims: Map<string, InsuranceClaim>;
  payments: Map<string, Payment>;
  inventory: Map<string, InventoryItem>;
  stockTransactions: Map<string, StockTransaction>;
  specialtyOrders: Map<string, SpecialtyOrder>;
  _agentState: AgentState;
  _referralState: ReferralState;
  _icdTop10: IcdPeriodData | null;
  _doctorCaseMemory: Map<string, CaseRecord>;
  _nurseCaseMemory: Map<string, NurseCaseRecord>;
  _outcomeRecords: OutcomeRecord[];
  _pharmacyCaseMemory: Map<string, PharmacistCaseRecord>;
  _learningMemory: LearningMemory;
  _outpatientVisits: Map<string, OutpatientVisit>;
  _calendarTicks: number;
  morgue: MorgueRecord[];
  morgueCapacity: number;
  _mmConferences: MmConference[];
  _mmLastConferenceTick: number;
  _bloodBank: BloodBankState;
  _microbiology: MicroState;
  _pathology: PathoState;
  _cssd: CssdState;
  _biomed: BiomedState;
  _ipc: IpcState;
  _clinicalNutrition: ClinicalNutritionState;
  _radiotherapy: RadiotherapyState;
  _dialysis: DialysisState;
  _scenario: ScenarioState;
  _rngSeed: number;
}

export interface OutpatientVisit {
  id: string; encounterId: string; patientId: string;
  referralId: string | null; poli: string;
  diagnosis: string; icdCode: string;
  doctorId: string | null;
  status: "waiting" | "in-consultation" | "completed";
  arrivalTime: number; completedAt: number | null;
  ordersGenerated: number;
}

export interface ActionLearning {
  actionLabel: string; actionType: string;
  successes: number; failures: number; lastUsedTick: number;
}

export interface DiagnosisLearning {
  icdCode: string; diagnosisName: string;
  totalCases: number; improved: number; deteriorated: number;
  actions: Map<string, ActionLearning>;
}

export interface LearningMemory {
  byDiagnosis: Map<string, DiagnosisLearning>;
}

export interface PharmacistCaseRecord {
  encounterId: string;
  patientId: string;
  pharmacistId: string;
  ordersReviewed: number;
  warningsIssued: number;
  dosesDispensed: number;
  interventionsCount: number;
  lastReviewTick: number;
}

export function createState(patients: Patient[], wardCapacity: Record<string, number> = {}): HospitalState {
  const patientMap = new Map<string, Patient>();
  for (const p of patients) patientMap.set(p.id, p);

  const defaultCapacity = {
    "Internal Medicine": 30, "Surgery": 20, "Pediatrics": 10, "OBGYN": 10,
    "ICU": 10, "Telemetry": 15, "Cardiology": 10, "Neurology": 8,
    "Pulmonology": 8, "NICU": 6, "PICU": 6,
  };
  const capacity = { ...defaultCapacity, ...wardCapacity };

  const beds = new Map<string, Bed>();
  for (const [ward, count] of Object.entries(capacity)) {
    for (let i = 1; i <= count; i++) {
      const bedId = `${ward.replace(/\s+/g, "-")}-${String(i).padStart(2, "0")}`;
      beds.set(bedId, { id: bedId, ward, patientId: null });
    }
  }

  return {
    patients: patientMap, beds, encounters: new Map(), wardCapacity: capacity, waitingRoom: 0,
    labOrders: new Map(), medicationOrders: new Map(), nurseNotes: new Map(),
    physicianOrders: new Map(), radiologyOrders: new Map(), surgeryOrders: new Map(),
    respiratoryOrders: new Map(), dietOrders: new Map(), socialWorkNotes: new Map(),
    edTriages: new Map(), medicalCharts: new Map(), charges: new Map(), insuranceClaims: new Map(),
    payments: new Map(), inventory: centralSupplyInit(), stockTransactions: new Map(),
    specialtyOrders: new Map(),
    _agentState: { pool: { agents: new Map(), assignments: new Map() } },
    _referralState: { facilities: new Map(), letters: new Map(), incomingQueue: [] },
    _icdTop10: null,
    _doctorCaseMemory: new Map(),
    _nurseCaseMemory: new Map(),
    _outcomeRecords: [],
    _pharmacyCaseMemory: new Map(),
    _learningMemory: { byDiagnosis: new Map() },
    _outpatientVisits: new Map(),
    _calendarTicks: 0,
    morgue: [],
    morgueCapacity: 10,
    _mmConferences: [],
    _mmLastConferenceTick: 0,
    _bloodBank: initBloodBank(),
    _microbiology: initMicroState(),
    _pathology: initPathoState(),
    _cssd: initCssdState(),
    _biomed: initBiomedState(),
    _ipc: initIpcState(),
    _clinicalNutrition: initNutritionState(),
    _radiotherapy: initRtState(),
    _dialysis: initDialysisState(),
    _scenario: initScenarioState(),
    _rngSeed: 0,
  };
}
