import { describe, it, expect } from "vitest";
import { aiDoctorHandler } from "../src/engine/ai-doctor.js";
import { EventQueue } from "../src/engine/event-queue.js";
import type { HospitalState, LearningMemory } from "../src/engine/state-store.js";
import type { Patient, Encounter, Vitals, HospitalAgent, AgentPool, AgentStatus } from "../src/patient/schema.js";
import type { Clock } from "../src/engine/clock.js";
import type { AgentState } from "../src/agent/system.js";

function makeClock(tick: number): Clock {
  return {
    rng: () => Math.random(),
    rngSeed: tick, tick, hospitalTimeMs: tick * 60000, timeMs: Date.now(), timePerTickMs: 1000 };
}

function makeAgent(id: string, role: string, spesialisasi: string | null): HospitalAgent {
  return {
    id, nama: "Dr. Test",
    identity: { gender: "male", birthDate: "1980-01-01", nik: { value: "123" }, addressKtp: { provinsi: "Sulawesi Selatan" }, religion: "Islam", maritalStatus: "Kawin" } as any,
    role: role as any, spesialisasi: spesialisasi as any, department: "DOKTER" as any,
    status: {
      kelelahan: 0, kesehatan: "sehat", shift: "pagi" as any, inShift: true,
      shiftStartTick: 0, totalShiftTicks: 10, consecutiveTicks: 5, sakitTerhitung: 0,
      isHaids: false, haidCycleDay: 0, isHamil: false, hamilWeeks: 0,
    },
    lisensi: "STR-123", tahunPengalaman: 10, jamKerjaPerMinggu: 40,
  };
}

function makePatient(overrides?: Partial<Patient>): Patient {
  return {
    id: "PAT-0001", name: "Test Patient", age: 45, gender: "male",
    identity: {} as any, phone: "081234567890",
    bloodType: "O", rhesus: "+", allergies: [],
    vitals: { heartRate: 80, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, temperature: 37.0, oxygenSaturation: 98, respiratoryRate: 16, painLevel: 2 },
    diagnoses: [{ code: "I10", name: "Essential hypertension", active: true }],
    medications: [],
    ...overrides,
  };
}

function makeEncounter(overrides?: Partial<Encounter>): Encounter {
  return {
    id: "ENC-0001", patientId: "PAT-0001",
    type: "admission", startTime: 0, endTime: null, status: "active",
    ...overrides,
  };
}

function makeState(overrides?: Partial<HospitalState>): HospitalState {
  const pool: AgentPool = {
    agents: new Map([
      ["DOC-001", makeAgent("DOC-001", "dokter_umum", null)],
      ["DOC-002", makeAgent("DOC-002", "dokter_spesialis", "cardiology")],
    ]),
    assignments: new Map(),
  };
  const agentState: AgentState = { pool };
  return {
    patients: new Map([["PAT-0001", makePatient()]]),
    beds: new Map([["BED-0001", { id: "BED-0001", ward: "Internal Medicine", patientId: "PAT-0001" }]]),
    encounters: new Map([["ENC-0001", makeEncounter()]]),
    wardCapacity: { "Internal Medicine": 20 },
    waitingRoom: 0,
    labOrders: new Map(), medicationOrders: new Map(), nurseNotes: new Map(),
    physicianOrders: new Map(), radiologyOrders: new Map(),
    surgeryOrders: new Map(), respiratoryOrders: new Map(),
    dietOrders: new Map(), socialWorkNotes: new Map(),
    edTriages: new Map(), medicalCharts: new Map(),
    charges: new Map(), insuranceClaims: new Map(), payments: new Map(),
    inventory: new Map(), stockTransactions: new Map(),
    specialtyOrders: new Map(),
    _agentState: agentState,
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

describe("AI Doctor", () => {
  it("assigns a doctor to an encounter without one", () => {
    const result = aiDoctorHandler(makeState(), makeClock(4), new EventQueue());
    const enc = result.encounters.get("ENC-0001")!;
    expect(enc.attendingDoctorId).toBeTruthy();
  });

  it("skips non-round ticks", () => {
    const result = aiDoctorHandler(makeState(), makeClock(3), new EventQueue());
    expect(result.physicianOrders.size).toBe(0);
  });

  it("creates physician orders on round ticks", () => {
    const result = aiDoctorHandler(makeState(), makeClock(4), new EventQueue());
    expect(result.physicianOrders.size).toBeGreaterThan(0);
    const order = Array.from(result.physicianOrders.values())[0]!;
    expect(order.status).toBe("active");
    expect(order.encounterId).toBe("ENC-0001");
  });

  it("creates lab orders for diagnosed conditions", () => {
    const result = aiDoctorHandler(makeState(), makeClock(4), new EventQueue());
    expect(result.labOrders.size).toBeGreaterThan(0);
  });

  it("records actions in case memory", () => {
    const result = aiDoctorHandler(makeState(), makeClock(4), new EventQueue());
    const caseRecord = result._doctorCaseMemory.get("CASE-ENC-0001");
    expect(caseRecord).toBeDefined();
    expect(caseRecord!.actionsTaken.length).toBeGreaterThan(0);
    expect(caseRecord!.encounterId).toBe("ENC-0001");
  });

  it("does not duplicate existing lab orders", () => {
    const state = makeState({
      labOrders: new Map([["LAB-1", {
        id: "LAB-1", encounterId: "ENC-0001", patientId: "PAT-0001",
        testName: "Complete Blood Count", testCode: "CBC",
        status: "ordered", result: null, referenceRange: "", unit: "",
        orderedAt: 0, resultedAt: null,
      }]]),
    });
    const result = aiDoctorHandler(state, makeClock(4), new EventQueue());
    const newCbcOrders = Array.from(result.labOrders.values())
      .filter(o => o.encounterId === "ENC-0001" && o.testName === "Complete Blood Count" && o.id !== "LAB-1");
    expect(newCbcOrders.length).toBe(0);
  });

  it("uses learning memory to rank actions", () => {
    const learningMemory: LearningMemory = {
      byDiagnosis: new Map([[ "I10", {
        icdCode: "I10", diagnosisName: "Essential hypertension",
        totalCases: 10, improved: 8, deteriorated: 2,
        actions: new Map([
          ["medication:Enalapril 5mg", { actionLabel: "medication:Enalapril 5mg", actionType: "medication", successes: 8, failures: 0, lastUsedTick: 50 }],
          ["lab:Complete Blood Count", { actionLabel: "lab:Complete Blood Count", actionType: "lab", successes: 2, failures: 1, lastUsedTick: 50 }],
        ]),
      }]]),
    };
    const state = makeState({ _learningMemory: learningMemory });
    const result = aiDoctorHandler(state, makeClock(8), new EventQueue());
    const orders = Array.from(result.physicianOrders.values()).filter(o => o.encounterId === "ENC-0001");
    expect(orders.length).toBeGreaterThan(0);
  });

  it("triggers escalation for critical vitals", () => {
    const criticalVitals: Vitals = {
      heartRate: 130, bloodPressureSystolic: 85, bloodPressureDiastolic: 55,
      temperature: 40.0, oxygenSaturation: 85, respiratoryRate: 28, painLevel: 9,
    };
    const state = makeState({
      patients: new Map([["PAT-0001", makePatient({ vitals: criticalVitals })]]),
    });
    const result = aiDoctorHandler(state, makeClock(4), new EventQueue());
    const consults = Array.from(result.physicianOrders.values())
      .filter(o => o.orderType === "consult" && o.encounterId === "ENC-0001");
    expect(consults.length).toBeGreaterThan(0);
  });
});
