import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { RespiratoryOrder } from "../patient/schema.js";

export const THERAPIES: { type: RespiratoryOrder["therapyType"]; settings: string[] }[] = [
  { type: "oxygen", settings: ["2L NC", "3L NC", "4L NC", "Face mask 40%", "NRB 15L"] },
  { type: "nebulizer", settings: ["Albuterol 2.5mg q4h", "Albuterol 2.5mg + Ipratropium 0.5mg q6h", "Budesonide 0.5mg BID"] },
  { type: "ventilator", settings: ["AC/VC 400mL RR12 PEEP5 FiO2 40%", "AC/VC 450mL RR14 PEEP8 FiO2 35%", "SIMV 350mL RR10 PS10 PEEP5"] },
  { type: "chest-PT", settings: ["Chest physiotherapy BID", "Incentive spirometer q2h while awake", "Postural drainage TID"] },
  { type: "PFT", settings: ["Pulmonary Function Test", "Spirometry pre/post bronchodilator"] },
  { type: "CPAP", settings: ["CPAP 8cmH2O at bedtime", "BiPAP 12/8cmH2O nocturnal"] },
];

export function respiratoryHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 8 !== 0) return state;

  const encounter = activeEncounters[Math.floor(Math.random() * activeEncounters.length)]!;
  const therapy = THERAPIES[Math.floor(Math.random() * THERAPIES.length)]!;

  const order: RespiratoryOrder = {
    id: `RT-${clock.tick}-${encounter.patientId}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    therapyType: therapy.type,
    status: "ordered",
    settings: therapy.settings[Math.floor(Math.random() * therapy.settings.length)]!,
    orderedAt: clock.hospitalTimeMs,
    notes: null,
  };

  const newOrders = new Map(state.respiratoryOrders);
  newOrders.set(order.id, order);

  return { ...state, respiratoryOrders: newOrders };
}
