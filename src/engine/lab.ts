import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { LabOrder } from "../patient/schema.js";

const LAB_TESTS = [
  { code: "CBC", name: "Complete Blood Count", range: "4.5-11.0 x10^3/uL", unit: "x10^3/uL" },
  { code: "BMP", name: "Basic Metabolic Panel", range: "Na 136-145, K 3.5-5.1 mEq/L", unit: "mEq/L" },
  { code: "TROP", name: "Troponin I", range: "<0.04 ng/mL", unit: "ng/mL" },
  { code: "CRP", name: "C-Reactive Protein", range: "<5.0 mg/L", unit: "mg/L" },
  { code: "PT-INR", name: "Prothrombin Time / INR", range: "0.8-1.2 INR", unit: "INR" },
  { code: "LFT", name: "Liver Function Test", range: "ALT 7-56, AST 10-40 U/L", unit: "U/L" },
  { code: "UA", name: "Urinalysis", range: "Negative", unit: "" },
  { code: "HBA1C", name: "Hemoglobin A1C", range: "<5.7%", unit: "%" },
];

function generateResult(testCode: string): string {
  const r = () => +(Math.random() * 3 + 0.5).toFixed(1);
  switch (testCode) {
    case "CBC": return `${r() + 4}`;
    case "TROP": return Math.random() > 0.8 ? `${r() * 0.5}` : "<0.04";
    case "CRP": return `${Math.floor(Math.random() * 30)}`;
    case "PT-INR": return `${(0.9 + Math.random() * 0.6).toFixed(1)}`;
    case "HBA1C": return `${(4.5 + Math.random() * 4).toFixed(1)}`;
    default: return `${Math.floor(Math.random() * 200)}`;
  }
}

export function labHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0) return state;

  if (clock.tick % 3 !== 0) return state;

  const encounter = activeEncounters[Math.floor(Math.random() * activeEncounters.length)]!;

  const test = LAB_TESTS[Math.floor(Math.random() * LAB_TESTS.length)]!;
  const order: LabOrder = {
    id: `LAB-${clock.tick}-${encounter.patientId}-${test.code}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    testName: test.name,
    testCode: test.code,
    status: "ordered",
    result: null,
    referenceRange: test.range,
    unit: test.unit,
    orderedAt: clock.hospitalTimeMs,
    resultedAt: null,
  };

  const newLabOrders = new Map(state.labOrders);
  newLabOrders.set(order.id, order);

  queue.schedule("lab_result", clock.tick + 2, { labOrderId: order.id });

  return { ...state, labOrders: newLabOrders };
}

export function labResultHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newOrders = new Map(state.labOrders);
  for (const [id, order] of newOrders) {
    if (order.status === "ordered") {
      newOrders.set(id, {
        ...order,
        status: "resulted",
        result: generateResult(order.testCode),
        resultedAt: clock.hospitalTimeMs,
      });
    }
  }
  return { ...state, labOrders: newOrders };
}
