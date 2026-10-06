import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { Charge, RespiratoryOrder } from "../patient/schema.js";
import { appendCharge } from "./charge-generator.js";
import { RESPIRATORY_ACTIVATION_FEE } from "./price-tables.js";

export const THERAPIES: { type: RespiratoryOrder["therapyType"]; settings: string[] }[] = [
  { type: "oxygen", settings: ["2L NC", "3L NC", "4L NC", "Face mask 40%", "NRB 15L"] },
  { type: "nebulizer", settings: ["Albuterol 2.5mg q4h", "Albuterol 2.5mg + Ipratropium 0.5mg q6h", "Budesonide 0.5mg BID"] },
  { type: "ventilator", settings: ["AC/VC 400mL RR12 PEEP5 FiO2 40%", "AC/VC 450mL RR14 PEEP8 FiO2 35%", "SIMV 350mL RR10 PS10 PEEP5"] },
  { type: "chest-PT", settings: ["Chest physiotherapy BID", "Incentive spirometer q2h while awake", "Postural drainage TID"] },
  { type: "PFT", settings: ["Pulmonary Function Test", "Spirometry pre/post bronchodilator"] },
  { type: "CPAP", settings: ["CPAP 8cmH2O at bedtime", "BiPAP 12/8cmH2O nocturnal"] },
];

export function respiratoryHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  let newOrders = new Map(state.respiratoryOrders);
  let newCharges = new Map(state.charges);

  // Fulfillment: discontinue orders >2 ticks old, or for discharged encounters
  for (const [id, order] of newOrders) {
    if (order.status === "ordered" && clock.tick - ticksFromMs(order.orderedAt, clock) > 2) {
      newOrders.set(id, { ...order, status: "discontinued", notes: "Therapy course completed." });
    }
    const enc = state.encounters.get(order.encounterId);
    if (enc && enc.status !== "active" && order.status === "ordered") {
      newOrders.set(id, { ...order, status: "discontinued", notes: "Patient discharged — therapy discontinued." });
    }
  }

  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length > 0 && clock.tick % 8 === 0) {
    const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
    const therapy = THERAPIES[Math.floor(clock.rng() * THERAPIES.length)]!;
    newOrders.set(`RT-${clock.tick}-${encounter.patientId}`, {
      id: `RT-${clock.tick}-${encounter.patientId}`,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      therapyType: therapy.type,
      status: "ordered",
      settings: therapy.settings[Math.floor(clock.rng() * therapy.settings.length)]!,
      orderedAt: clock.hospitalTimeMs,
      notes: null,
    });
    // ADR-015 D7: per-order activation fee (no code ever transitions these
    // orders to "active" — creation is the activation). No rng draws added.
    newCharges = appendCharge(newCharges, clock, encounter.id, encounter.patientId, "respiratory",
      `Respiratory therapy: ${therapy.type}`, undefined,
      { code: therapy.type, unitPrice: RESPIRATORY_ACTIVATION_FEE, quantity: 1 });
  }

  return { ...state, respiratoryOrders: newOrders, charges: newCharges };
}

function ticksFromMs(hospitalTimeMs: number, clock: Clock): number {
  return Math.floor(hospitalTimeMs / (clock.tickIntervalMs * clock.speedMultiplier));
}
