import { describe, it, expect } from "vitest";
import { aiPharmacyHandler } from "../src/engine/ai-pharmacy.js";
import { EventQueue } from "../src/engine/event-queue.js";
import type { HospitalState } from "../src/engine/state-store.js";
import type { Patient, Encounter, MedicationOrder, HospitalAgent, AgentPool } from "../src/patient/schema.js";
import type { Clock } from "../src/engine/clock.js";
import type { AgentState } from "../src/agent/system.js";

function makeClock(tick: number): Clock {
  return {
    rng: () => Math.random(),
    rngSeed: tick, tick, hospitalTimeMs: tick * 60000, timeMs: Date.now(), timePerTickMs: 1000 };
}

function makeAgent(id: string, role: string): HospitalAgent {
  return {
    id, nama: "Pharm Test",
    identity: { gender: "female", birthDate: "1985-01-01", nik: { value: "789" }, addressKtp: { provinsi: "Sulawesi Selatan" }, religion: "Islam", maritalStatus: "Kawin" } as any,
    role: role as any, spesialisasi: null, department: "FARMASI" as any,
    status: {
      kelelahan: 0, kesehatan: "sehat", shift: "pagi" as any, inShift: true,
      shiftStartTick: 0, totalShiftTicks: 10, consecutiveTicks: 5, sakitTerhitung: 0,
      isHaids: false, haidCycleDay: 0, isHamil: false, hamilWeeks: 0,
    },
    lisensi: "STR-789", tahunPengalaman: 8, jamKerjaPerMinggu: 40,
  };
}

function makePatient(overrides?: Partial<Patient>): Patient {
  return {
    id: "PAT-0001", name: "Test Patient", age: 45, gender: "male",
    identity: {} as any, phone: "081234567890",
    bloodType: "O", rhesus: "+", allergies: ["Penicillin"],
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

function makeMedOrder(overrides?: Partial<MedicationOrder>): MedicationOrder {
  return {
    id: "MED-0001", encounterId: "ENC-0001", patientId: "PAT-0001",
    medication: { code: "LVF", name: "Levofloxacin 500mg", dose: "500 mg", route: "IV" },
    status: "ordered", dose: "500 mg", route: "IV", frequency: "QD",
    orderedAt: 0, administeredAt: null,
    ...overrides,
  };
}

function makeState(overrides?: Partial<HospitalState>): HospitalState {
  const pool: AgentPool = {
    agents: new Map([
      ["PHA-001", makeAgent("PHA-001", "apoteker")],
    ]),
    assignments: new Map(),
  };
  const agentState: AgentState = { pool };
  return {
    patients: new Map([["PAT-0001", makePatient()]]),
    beds: new Map([["BED-0001", { id: "BED-0001", ward: "Internal Medicine", patientId: null }]]),
    encounters: new Map([["ENC-0001", makeEncounter()]]),
    wardCapacity: { "Internal Medicine": 20 },
    waitingRoom: 0,
    labOrders: new Map(), medicationOrders: new Map([["MED-0001", makeMedOrder()]]), nurseNotes: new Map(),
    physicianOrders: new Map(), radiologyOrders: new Map(),
    surgeryOrders: new Map(), respiratoryOrders: new Map(),
    dietOrders: new Map(), socialWorkNotes: new Map(),
    edTriages: new Map(), medicalCharts: new Map(),
    charges: new Map(), insuranceClaims: new Map(), payments: new Map(),
    inventory: new Map([[ "MED-LVF", { itemCode: "MED-LVF", itemName: "Levofloxacin", category: "medication" as any, unit: "vial", stock: 100, minStock: 10, maxStock: 500, departmentId: "FARMASI" }]]),
    stockTransactions: new Map(),
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

describe("AI Pharmacy", () => {
  it("skips odd ticks", () => {
    const state = makeState();
    const result = aiPharmacyHandler(state, makeClock(1), new EventQueue());
    expect(result.medicationOrders.get("MED-0001")!.status).toBe("ordered");
  });

  it("dispenses medication on even ticks when no warnings", () => {
    const state = makeState();
    const result = aiPharmacyHandler(state, makeClock(2), new EventQueue());
    const order = result.medicationOrders.get("MED-0001")!;
    expect(order.status).toBe("dispensed");
  });

  it("dispenses and deducts from inventory", () => {
    const state = makeState();
    const result = aiPharmacyHandler(state, makeClock(2), new EventQueue());
    const item = result.inventory.get("MED-LVF")!;
    expect(item.stock).toBe(99);
  });

  it("flags allergy warnings", () => {
    const patient = makePatient({ allergies: ["Fluoroquinolone"] });
    const state = makeState({
      patients: new Map([["PAT-0001", patient]]),
    });
    const result = aiPharmacyHandler(state, makeClock(2), new EventQueue());
    const order = result.medicationOrders.get("MED-0001")!;
    expect(order.status).toBe("ordered");
  });

  it("records pharmacy case in memory", () => {
    const state = makeState();
    const result = aiPharmacyHandler(state, makeClock(2), new EventQueue());
    const caseKey = "PHARM-ENC-0001";
    const mem = result._pharmacyCaseMemory.get(caseKey);
    expect(mem).toBeDefined();
    expect(mem!.ordersReviewed).toBe(1);
  });

  it("flags insufficient stock", () => {
    const inventory = new Map([[ "MED-LVF", { itemCode: "MED-LVF", itemName: "Levofloxacin", category: "medication" as any, unit: "vial", stock: 0, minStock: 10, maxStock: 500, departmentId: "FARMASI" }]]);
    const state = makeState({ inventory });
    const result = aiPharmacyHandler(state, makeClock(2), new EventQueue());
    const order = result.medicationOrders.get("MED-0001")!;
    expect(order.status).toBe("ordered");
  });
});
