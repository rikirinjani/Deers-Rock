import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { PhysicianOrder } from "../patient/schema.js";

const ORDER_TEMPLATES = [
  { type: "medication" as const, desc: "Continue current medications" },
  { type: "lab" as const, desc: "Repeat lab work in AM" },
  { type: "imaging" as const, desc: "Chest X-ray PA & Lateral" },
  { type: "consult" as const, desc: "Consult to Internal Medicine" },
  { type: "discharge" as const, desc: "Prepare discharge summary" },
  { type: "lab" as const, desc: "Blood cultures x2" },
  { type: "imaging" as const, desc: "CT Head without contrast" },
  { type: "consult" as const, desc: "Consult to Cardiology" },
  { type: "medication" as const, desc: "Adjust antibiotic dose" },
  { type: "imaging" as const, desc: "Abdominal ultrasound" },
];

export function physicianHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0) return state;

  if (clock.tick % 4 !== 0) return state;

  const encounter = activeEncounters[Math.floor(Math.random() * activeEncounters.length)]!;
  const template = ORDER_TEMPLATES[Math.floor(Math.random() * ORDER_TEMPLATES.length)]!;

  const order: PhysicianOrder = {
    id: `DR-${clock.tick}-${encounter.patientId}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    orderType: template.type,
    description: template.desc,
    status: "active",
    orderedAt: clock.hospitalTimeMs,
    completedAt: null,
  };

  const newOrders = new Map(state.physicianOrders);
  newOrders.set(order.id, order);

  return { ...state, physicianOrders: newOrders };
}

export function orderCompleteHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newOrders = new Map(state.physicianOrders);
  for (const [id, order] of newOrders) {
    if (order.status === "active" && clock.tick % 8 === 0 && Math.random() > 0.5) {
      newOrders.set(id, {
        ...order,
        status: "completed",
        completedAt: clock.hospitalTimeMs,
      });
    }
  }
  return { ...state, physicianOrders: newOrders };
}
