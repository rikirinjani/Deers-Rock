import { describe, it, expect } from "vitest";
import { aiNurseHandler } from "../src/engine/ai-nurse.js";
import { EventQueue } from "../src/engine/event-queue.js";
import type { HospitalState } from "../src/engine/state-store.js";
import type { Patient, Encounter, HospitalAgent, AgentPool } from "../src/patient/schema.js";
import type { Clock } from "../src/engine/clock.js";
import type { AgentState } from "../src/agent/system.js";

function makeClock(tick: number): Clock {
  return {
    rng: () => Math.random(),
    rngSeed: tick, tick, hospitalTimeMs: tick * 60000, timeMs: Date.now(), timePerTickMs: 1000 };
}

function makeAgent(id: string, role: string): HospitalAgent {
  return {
    id, nama: "Nurse Test",
    identity: { gender: "female", birthDate: "1990-01-01", nik: { value: "456" }, addressKtp: { provinsi: "Sulawesi Selatan" }, religion: "Islam", maritalStatus: "Kawin" } as any,
    role: role as any, spesialisasi: null, department: "KEPERAWATAN" as any,
    status: {
      kelelahan: 0, kesehatan: "sehat", shift: "pagi" as any, inShift: true,
      shiftStartTick: 0, totalShiftTicks: 10, consecutiveTicks: 5, sakitTerhitung: 0,
      isHaids: false, haidCycleDay: 0, isHamil: false, hamilWeeks: 0,
    },
    lisensi: "STR-456", tahunPengalaman: 5, jamKerjaPerMinggu: 40,
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
      ["NUR-001", makeAgent("NUR-001", "perawat")],
      ["NUR-002", makeAgent("NUR-002", "bidan")],
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

describe("AI Nurse", () => {
  it("assigns a nurse to an encounter without one", () => {
    const state = makeState();
    const result = aiNurseHandler(state, makeClock(3), new EventQueue());
    const enc = result.encounters.get("ENC-0001")!;
    expect(enc.assignedNurseId).toBeTruthy();
  });

  it("creates nursing notes", () => {
    const state = makeState();
    const result = aiNurseHandler(state, makeClock(3), new EventQueue());
    const notes = Array.from(result.nurseNotes.values()).filter(n => n.encounterId === "ENC-0001");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("records nurse case in memory", () => {
    const state = makeState();
    const clock = makeClock(3);
    const result = aiNurseHandler(state, clock, new EventQueue());
    const memoryKey = "NURSE-CASE-ENC-0001";
    const mem = result._nurseCaseMemory.get(memoryKey);
    expect(mem).toBeDefined();
    expect(mem!.encounterId).toBe("ENC-0001");
    expect(mem!.assessmentsDone).toBeGreaterThanOrEqual(0);
  });

  it("increases monitoring for high deterioration risk", () => {
    const learningMemory = {
      byDiagnosis: new Map([[ "I10", {
        icdCode: "I10", diagnosisName: "Essential hypertension",
        totalCases: 10, improved: 3, deteriorated: 7,
        actions: new Map(),
      }]]),
    };
    const state = makeState({ _learningMemory: learningMemory as any });
    const result = aiNurseHandler(state, makeClock(6), new EventQueue());
    const notes = Array.from(result.nurseNotes.values())
      .filter(n => n.encounterId === "ENC-0001" && n.noteType === "observation");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("handles encounters with no active nurses but creates notes", () => {
    const emptyState = makeState({ _agentState: { pool: { agents: new Map(), assignments: new Map() } } });
    const result = aiNurseHandler(emptyState, makeClock(3), new EventQueue());
    const notes = Array.from(result.nurseNotes.values()).filter(n => n.encounterId === "ENC-0001");
    expect(notes.length).toBeGreaterThan(0);
  });
});
