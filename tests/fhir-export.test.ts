import { describe, it, expect } from "vitest";
import { buildFhirBundle } from "../src/engine/fhir-export.js";
import type { HospitalState } from "../src/engine/state-store.js";
import type { Patient, Encounter, AgentPool, HospitalAgent } from "../src/patient/schema.js";
import type { AgentState } from "../src/agent/system.js";

function makeAgent(id: string, role: string): HospitalAgent {
  return {
    id, nama: "Dr. FHIR",
    identity: { gender: "male", birthDate: "1980-01-01", nik: { value: "123" }, addressKtp: { provinsi: "Sulawesi Selatan" }, religion: "Islam", maritalStatus: "Kawin" } as any,
    role: role as any, spesialisasi: null, department: "DOKTER" as any,
    status: { kelelahan: 0, kesehatan: "sehat", shift: "pagi" as any, inShift: true, shiftStartTick: 0, totalShiftTicks: 10, consecutiveTicks: 5, sakitTerhitung: 0, isHaids: false, haidCycleDay: 0, isHamil: false, hamilWeeks: 0 },
    lisensi: "STR-001", tahunPengalaman: 10, jamKerjaPerMinggu: 40,
  };
}

function makeState(overrides?: Partial<HospitalState>): HospitalState {
  return {
    patients: new Map(), beds: new Map(), encounters: new Map(),
    wardCapacity: {}, waitingRoom: 0,
    labOrders: new Map(), medicationOrders: new Map(), nurseNotes: new Map(),
    physicianOrders: new Map(), radiologyOrders: new Map(),
    surgeryOrders: new Map(), respiratoryOrders: new Map(),
    dietOrders: new Map(), socialWorkNotes: new Map(),
    edTriages: new Map(), medicalCharts: new Map(),
    charges: new Map(), insuranceClaims: new Map(), payments: new Map(),
    inventory: new Map(), stockTransactions: new Map(),
    specialtyOrders: new Map(),
    _agentState: { pool: { agents: new Map([["DOC-001", makeAgent("DOC-001", "dokter_umum")]]), assignments: new Map() } },
    _referralState: { letters: new Map(), facilities: new Map() } as any,
    _icdTop10: null,
    _doctorCaseMemory: new Map(), _nurseCaseMemory: new Map(),
    _pharmacyCaseMemory: new Map(),
    _learningMemory: { byDiagnosis: new Map() },
    _outcomeRecords: [],
    morgue: [], morgueCapacity: 10,
    _mmConferences: [], _mmLastConferenceTick: 0,
    _calendarTicks: 0,
    ...overrides,
  };
}

describe("FHIR Export", () => {
  it("returns null for non-existent encounter", () => {
    const state = makeState();
    expect(buildFhirBundle(state, "NONEXISTENT")).toBeNull();
  });

  it("returns null for encounter with no patient", () => {
    const state = makeState({
      encounters: new Map([["ENC-001", { id: "ENC-001", patientId: "PAT-999", type: "admission", startTime: 0, endTime: null, status: "active" }]]),
    });
    expect(buildFhirBundle(state, "ENC-001")).toBeNull();
  });

  it("builds a valid bundle for an active encounter", () => {
    const patient: Patient = {
      id: "PAT-001", name: "Budi Santoso", age: 45, gender: "male",
      identity: {} as any, phone: "081234567890",
      bloodType: "O", rhesus: "+", allergies: ["Penicillin"],
      vitals: { heartRate: 80, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 37.0, oxygenSaturation: 98, respiratoryRate: 16, painLevel: 2 },
      diagnoses: [{ code: "I10", name: "Essential hypertension", active: true }],
      medications: [],
    };
    const encounter: Encounter = {
      id: "ENC-001", patientId: "PAT-001",
      type: "admission", startTime: 0, endTime: null, status: "active",
    };
    const state = makeState({
      patients: new Map([["PAT-001", patient]]),
      encounters: new Map([["ENC-001", encounter]]),
    });
    const bundle = buildFhirBundle(state, "ENC-001")!;
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("document");
    expect(bundle.entry.length).toBeGreaterThan(0);
    const resources = bundle.entry.map(e => e.resource);
    const patientResource = resources.find(r => r.resourceType === "Patient");
    expect(patientResource).toBeDefined();
    expect((patientResource as any).id).toBe("PAT-001");
    const encResource = resources.find(r => r.resourceType === "Encounter");
    expect(encResource).toBeDefined();
    expect((encResource as any).status).toBe("in-progress");
    const condResources = resources.filter(r => r.resourceType === "Condition");
    expect(condResources.length).toBe(patient.diagnoses.length);
  });

  it("includes vitals as Observation resources", () => {
    const patient: Patient = {
      id: "PAT-002", name: "Siti Nurhaliza", age: 30, gender: "female",
      identity: {} as any, phone: "081234567891",
      bloodType: "A", rhesus: "-", allergies: [],
      vitals: { heartRate: 72, bloodPressureSystolic: 110, bloodPressureDiastolic: 70, temperature: 36.6, oxygenSaturation: 99, respiratoryRate: 14, painLevel: 0 },
      diagnoses: [{ code: "Z00", name: "General examination", active: true }],
      medications: [],
    };
    const encounter: Encounter = { id: "ENC-002", patientId: "PAT-002", type: "outpatient", startTime: 0, endTime: null, status: "active" };
    const state = makeState({
      patients: new Map([["PAT-002", patient]]),
      encounters: new Map([["ENC-002", encounter]]),
    });
    const bundle = buildFhirBundle(state, "ENC-002")!;
    const vitals = bundle.entry.filter(e => e.resource.resourceType === "Observation");
    expect(vitals.length).toBe(7);
    const hr = vitals.find(v => (v.resource as any).id?.includes("HR"));
    expect(hr).toBeDefined();
    expect((hr!.resource as any).valueQuantity.value).toBe(72);
  });

  it("includes medication orders as MedicationRequest resources", () => {
    const patient: Patient = {
      id: "PAT-003", name: "Ahmad", age: 50, gender: "male",
      identity: {} as any, phone: "081234567892",
      bloodType: "B", rhesus: "+", allergies: [],
      vitals: { heartRate: 80, bloodPressureSystolic: 130, bloodPressureDiastolic: 85, temperature: 37.0, oxygenSaturation: 97, respiratoryRate: 16, painLevel: 1 },
      diagnoses: [{ code: "I10", name: "Essential hypertension", active: true }],
      medications: [{ code: "ACE", name: "Enalapril 5mg", dose: "5 mg", route: "PO" }],
    };
    const encounter: Encounter = { id: "ENC-003", patientId: "PAT-003", type: "admission", startTime: 0, endTime: null, status: "active" };
    const state = makeState({
      patients: new Map([["PAT-003", patient]]),
      encounters: new Map([["ENC-003", encounter]]),
      medicationOrders: new Map([["MED-001", {
        id: "MED-001", encounterId: "ENC-003", patientId: "PAT-003",
        medication: { code: "ACE", name: "Enalapril 5mg", dose: "5 mg", route: "PO" },
        status: "administered", dose: "5 mg", route: "PO", frequency: "QD",
        orderedAt: 0, administeredAt: 100,
      }]]),
    });
    const bundle = buildFhirBundle(state, "ENC-003")!;
    const medReqs = bundle.entry.filter(e => e.resource.resourceType === "MedicationRequest");
    expect(medReqs.length).toBe(1);
    expect((medReqs[0]!.resource as any).medicationCodeableConcept.coding[0].code).toBe("ACE");
  });

  it("marks discharged encounters as finished", () => {
    const patient: Patient = {
      id: "PAT-004", name: "Test", age: 60, gender: "male",
      identity: {} as any, phone: "081234567893",
      bloodType: "AB", rhesus: "+", allergies: [],
      vitals: { heartRate: 80, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 37.0, oxygenSaturation: 98, respiratoryRate: 16, painLevel: 0 },
      diagnoses: [{ code: "I10", name: "Essential hypertension", active: false }],
      medications: [],
    };
    const encounter: Encounter = { id: "ENC-004", patientId: "PAT-004", type: "admission", startTime: 0, endTime: 1000, status: "discharged" };
    const state = makeState({
      patients: new Map([["PAT-004", patient]]),
      encounters: new Map([["ENC-004", encounter]]),
    });
    const bundle = buildFhirBundle(state, "ENC-004")!;
    const encRes = bundle.entry.find(e => e.resource.resourceType === "Encounter")!.resource as any;
    expect(encRes.status).toBe("finished");
    expect(encRes.period.end).toBeDefined();
    const cond = bundle.entry.find(e => e.resource.resourceType === "Condition")!.resource as any;
    expect(cond.clinicalStatus.coding[0].code).toBe("resolved");
  });
});
