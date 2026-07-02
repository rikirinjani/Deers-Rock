import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { SurgeryOrder } from "../patient/schema.js";
import { generateCharge } from "./charge-generator.js";

const SURGEONS = ["Dr. Wijaya", "Dr. Santoso", "Dr. Kusuma", "Dr. Hidayat", "Dr. Pratama"];

const PROCEDURES: { code: string; name: string; icd9Code: string }[] = [
  { code: "47562", name: "Laparoscopic Cholecystectomy", icd9Code: "51.23" },
  { code: "44970", name: "Laparoscopic Appendectomy", icd9Code: "47.01" },
  { code: "49505", name: "Inguinal Hernia Repair", icd9Code: "53.00" },
  { code: "27130", name: "Total Hip Arthroplasty", icd9Code: "81.51" },
  { code: "27447", name: "Total Knee Arthroplasty", icd9Code: "81.54" },
  { code: "44140", name: "Partial Colectomy", icd9Code: "45.73" },
  { code: "43239", name: "Upper GI Endoscopy with Biopsy", icd9Code: "45.16" },
  { code: "45380", name: "Colonoscopy with Biopsy", icd9Code: "45.23" },
  { code: "38500", name: "Lymph Node Biopsy", icd9Code: "40.11" },
  { code: "19120", name: "Breast Mass Excision", icd9Code: "85.21" },
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
  const newCharts = new Map(state.medicalCharts);
  for (const [id, order] of newOrders) {
    if (order.status === "scheduled") {
      const updated: SurgeryOrder = {
        ...order,
        status: "completed",
        completedAt: clock.hospitalTimeMs,
        notes: "Procedure completed without complications. Patient transferred to recovery.",
      };
      newOrders.set(id, updated);
      newCharges = generateCharge(newCharges, clock, order.encounterId, order.patientId, "surgery", `Surgery: ${order.procedureName}`);

      // Write procedure to chart
      const chart = Array.from(newCharts.values()).find(c => c.encounterId === order.encounterId);
      if (chart) {
        const icd9Code = PROCEDURES.find(p => p.code === order.procedureCode)?.icd9Code ?? order.procedureCode;
        const proc = { code: icd9Code, name: order.procedureName, date: clock.hospitalTimeMs };
        if (!chart.procedures.find(p => p.code === proc.code)) {
          newCharts.set(chart.id, { ...chart, procedures: [...chart.procedures, proc] });
        }
      }
    }
  }
  return { ...state, surgeryOrders: newOrders, charges: newCharges, medicalCharts: newCharts };
}
