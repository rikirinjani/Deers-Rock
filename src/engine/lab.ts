import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { LabOrder } from "../patient/schema.js";
import { dispenseItem, getStock } from "./central-supply.js";
import { appendCharge } from "./charge-generator.js";

export const LAB_TESTS = [
  { code: "CBC", name: "Complete Blood Count", range: "4.5-11.0 x10^3/uL", unit: "x10^3/uL", supplyCode: "LAB-CBC" },
  { code: "BMP", name: "Basic Metabolic Panel", range: "Na 136-145, K 3.5-5.1 mEq/L", unit: "mEq/L", supplyCode: "LAB-CHEM" },
  { code: "TROP", name: "Troponin I", range: "<0.04 ng/mL", unit: "ng/mL", supplyCode: "LAB-CHEM" },
  { code: "CRP", name: "C-Reactive Protein", range: "<5.0 mg/L", unit: "mg/L", supplyCode: "LAB-CHEM" },
  { code: "PT-INR", name: "Prothrombin Time / INR", range: "0.8-1.2 INR", unit: "INR", supplyCode: "LAB-CHEM" },
  { code: "LFT", name: "Liver Function Test", range: "ALT 7-56, AST 10-40 U/L", unit: "U/L", supplyCode: "LAB-CHEM" },
  { code: "UA", name: "Urinalysis", range: "Negative", unit: "", supplyCode: "LAB-CHEM" },
  { code: "HBA1C", name: "Hemoglobin A1C", range: "<5.7%", unit: "%", supplyCode: "LAB-CHEM" },
];

function generateResult(testCode: string, rng: () => number): string {
  const r = () => +(rng() * 3 + 0.5).toFixed(1);
  switch (testCode) {
    case "CBC": return `${r() + 4}`;
    case "TROP": return rng() > 0.8 ? `${r() * 0.5}` : "<0.04";
    case "CRP": return `${Math.floor(rng() * 30)}`;
    case "PT-INR": return `${(0.9 + rng() * 0.6).toFixed(1)}`;
    case "HBA1C": return `${(4.5 + rng() * 4).toFixed(1)}`;
    default: return `${Math.floor(rng() * 200)}`;
  }
}

export function labHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 3 !== 0) return state;

  const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
  const test = LAB_TESTS[Math.floor(clock.rng() * LAB_TESTS.length)]!;

  // Check lab reagent stock before ordering
  if (test.supplyCode && getStock(state, test.supplyCode) < 1) return state;
  if (test.supplyCode) state = dispenseItem(state, test.supplyCode, 1, clock, `LAB-${clock.tick}`);

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

  const newOrders = new Map(state.labOrders);
  newOrders.set(order.id, order);
  queue.schedule("lab_result", clock.tick + 2, { labOrderId: order.id });

  return { ...state, labOrders: newOrders };
}

export function labResultHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newOrders = new Map(state.labOrders);
  let newCharges = new Map(state.charges);
  for (const [id, order] of newOrders) {
    if (order.status === "ordered") {
      newOrders.set(id, {
        ...order,
        status: "resulted",
        result: generateResult(order.testCode, clock.rng),
        resultedAt: clock.hospitalTimeMs,
      });
      newCharges = appendCharge(newCharges, clock, order.encounterId, order.patientId, "lab", `Lab test: ${order.testName}`);
    }
  }
  return { ...state, labOrders: newOrders, charges: newCharges };
}
