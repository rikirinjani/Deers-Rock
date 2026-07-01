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
  let newOrders = new Map(state.dietOrders);

  // Fulfillment: complete orders placed >2 ticks ago, discontinue for discharged encounters
  for (const [id, order] of newOrders) {
    if (order.status === "active" && clock.tick - ticksFromMs(order.orderedAt, clock) > 2) {
      newOrders.set(id, { ...order, status: "discontinued", notes: "Diet served and documented." });
    }
    const enc = state.encounters.get(order.encounterId);
    if (enc && enc.status !== "active" && order.status === "active") {
      newOrders.set(id, { ...order, status: "discontinued", notes: "Patient discharged — diet discontinued." });
    }
  }

  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length > 0 && clock.tick % 7 === 0) {
    const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
    const dietType = DIET_TYPES[Math.floor(clock.rng() * DIET_TYPES.length)]!;
    newOrders.set(`DIET-${clock.tick}-${encounter.patientId}`, {
      id: `DIET-${clock.tick}-${encounter.patientId}`,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      dietType,
      status: "active",
      orderedAt: clock.hospitalTimeMs,
      notes: DIET_NOTES[dietType],
    });
  }

  return { ...state, dietOrders: newOrders };
}

function ticksFromMs(hospitalTimeMs: number, clock: Clock): number {
  return Math.floor(hospitalTimeMs / (clock.tickIntervalMs * clock.speedMultiplier));
}
