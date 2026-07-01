import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { SurgeryOrder } from "../patient/schema.js";
import { addCharge } from "./finance.js";

const SURGEONS = ["Dr. Wijaya", "Dr. Santoso", "Dr. Kusuma", "Dr. Hidayat", "Dr. Pratama"];

const PROCEDURES: { code: string; name: string }[] = [
  { code: "47562", name: "Laparoscopic Cholecystectomy" },
  { code: "44970", name: "Laparoscopic Appendectomy" },
  { code: "49505", name: "Inguinal Hernia Repair" },
  { code: "27130", name: "Total Hip Arthroplasty" },
  { code: "27447", name: "Total Knee Arthroplasty" },
  { code: "44140", name: "Partial Colectomy" },
  { code: "43239", name: "Upper GI Endoscopy with Biopsy" },
  { code: "45380", name: "Colonoscopy with Biopsy" },
  { code: "38500", name: "Lymph Node Biopsy" },
  { code: "19120", name: "Breast Mass Excision" },
];

export function surgeryHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const activeEncounters = Array.from(state.encounters.values()).filter(e => e.status === "active");
  if (activeEncounters.length === 0 || clock.tick % 10 !== 0) return state;

  const encounter = activeEncounters[Math.floor(clock.rng() * activeEncounters.length)]!;
  const proc = PROCEDURES[Math.floor(clock.rng() * PROCEDURES.length)]!;

  const surgery: SurgeryOrder = {
    id: `OR-${clock.tick}-${encounter.patientId}`,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: proc.name,
    procedureCode: proc.code,
    status: "scheduled",
    surgeon: SURGEONS[Math.floor(clock.rng() * SURGEONS.length)]!,
    scheduledAt: clock.hospitalTimeMs,
    completedAt: null,
    notes: null,
  };

  const newOrders = new Map(state.surgeryOrders);
  newOrders.set(surgery.id, surgery);

  _queue.schedule("surgery_done", clock.tick + 5, { surgeryId: surgery.id });

  return { ...state, surgeryOrders: newOrders };
}

export function surgeryResultHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newOrders = new Map(state.surgeryOrders);
  let newCharges = new Map(state.charges);
  for (const [id, order] of newOrders) {
    if (order.status === "scheduled") {
      newOrders.set(id, {
        ...order,
        status: "completed",
        completedAt: clock.hospitalTimeMs,
        notes: "Procedure completed without complications. Patient transferred to recovery.",
      });
      newCharges = addCharge(state, clock, order.encounterId, order.patientId, "surgery", `Surgery: ${order.procedureName}`);
    }
  }
  return { ...state, surgeryOrders: newOrders, charges: newCharges };
}
