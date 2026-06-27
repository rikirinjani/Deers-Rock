import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { DietOrder } from "../patient/schema.js";

export const DIET_TYPES: DietOrder["dietType"][] = ["regular", "soft", "liquid", "NPO", "diabetic", "cardiac", "renal", "high-protein"];

const DIET_NOTES: Record<DietOrder["dietType"], string> = {
  regular: "Regular diet as tolerated",
  soft: "Soft mechanical diet, cut into small pieces",
  liquid: "Clear liquid diet, advance as tolerated",
  NPO: "NPO — nothing by mouth",
  diabetic: "Diabetic diet, carbohydrate counting, no concentrated sweets",
  cardiac: "Cardiac diet, low sodium <2g/day, low saturated fat",
  renal: "Renal diet, restrict K+ <2g, PO4 <800mg, fluid 1.5L",
  "high-protein": "High protein diet for wound healing, encourage PO intake",
};

export function dietaryHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 7 !== 0) return state;

  const encounter = activeEncounters[Math.floor(Math.random() * activeEncounters.length)]!;
  const dietType = DIET_TYPES[Math.floor(Math.random() * DIET_TYPES.length)]!;

  const order: DietOrder = {
    id: `DIET-${clock.tick}-${encounter.patientId}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    dietType,
    status: "active",
    orderedAt: clock.hospitalTimeMs,
    notes: DIET_NOTES[dietType],
  };

  const newOrders = new Map(state.dietOrders);
  newOrders.set(order.id, order);

  return { ...state, dietOrders: newOrders };
}
