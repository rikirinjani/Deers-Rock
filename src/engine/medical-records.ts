import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { MedicalChart } from "../patient/schema.js";

const CODERS = ["Coder A", "Coder B", "Coder C", "Coder D"];

const DX_MAP: Record<string, string> = {
  "I10": "Essential hypertension", "E11": "Type 2 diabetes", "J15": "Bacterial pneumonia",
  "N39": "UTI", "J45": "Asthma", "K29": "Gastritis", "M54": "Low back pain",
  "I50": "Heart failure", "A09": "Acute gastroenteritis", "E78": "Hyperlipidemia",
  "N18": "CKD", "J44": "COPD", "G40": "Epilepsy", "M17": "Knee osteoarthritis",
  "F32": "Major depressive disorder",
};

export function medicalRecordsHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  // Create charts for new encounters
  const newCharts = new Map(state.medicalCharts);
  for (const encounter of state.encounters.values()) {
    if (newCharts.has(`CHART-${encounter.id}`)) continue;

    const patient = state.patients.get(encounter.patientId);
    if (!patient) continue;

    const chart: MedicalChart = {
      id: `CHART-${encounter.id}`,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      status: "open",
      createdAt: clock.hospitalTimeMs,
      completedAt: null,
      diagnoses: patient.diagnoses.slice(0, 2).map((d, i) => ({
        code: d.code,
        name: DX_MAP[d.code] ?? d.name,
        type: i === 0 ? "primary" as const : "secondary" as const,
      })),
      procedures: [],
      coder: null,
    };
    newCharts.set(chart.id, chart);
  }

  // Auto-code charts when encounter ends (skip "incomplete" staging)
  // Also code any straggler "incomplete" charts
  let coded = 0;
  for (const [id, chart] of newCharts) {
    if (coded >= 30) break;
    const enc = state.encounters.get(chart.encounterId);
    if (enc && enc.status !== "active" && (chart.status === "open" || chart.status === "incomplete")) {
      newCharts.set(id, {
        ...chart,
        status: "coded",
        completedAt: clock.hospitalTimeMs,
        coder: CODERS[Math.floor(clock.rng() * CODERS.length)]!,
      });
      coded++;
    }
  }

  return { ...state, medicalCharts: newCharts };
}
