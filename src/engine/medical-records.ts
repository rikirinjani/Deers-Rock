import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import type { MedicalChart } from "../patient/schema.js";

const CODERS = [
  { name: "AI Coder Alpha", specialty: "internal_medicine", accuracy: 0.92 },
  { name: "AI Coder Beta", specialty: "surgery", accuracy: 0.88 },
  { name: "AI Coder Gamma", specialty: "pediatrics", accuracy: 0.90 },
  { name: "AI Coder Delta", specialty: "general", accuracy: 0.85 },
];

const DX_MAP: Record<string, string> = {
  "I10": "Essential hypertension", "E11": "Type 2 diabetes", "J15": "Bacterial pneumonia",
  "N39": "UTI", "J45": "Asthma", "K29": "Gastritis", "M54": "Low back pain",
  "I50": "Heart failure", "A09": "Acute gastroenteritis", "E78": "Hyperlipidemia",
  "N18": "CKD", "J44": "COPD", "G40": "Epilepsy", "M17": "Knee osteoarthritis",
  "F32": "Major depressive disorder",
};

function mapIcdToSpecialty(code: string): string {
  if (!code || code.length === 0) return "general";
  const prefix = code.charAt(0);
  if (prefix === "I" || prefix === "E" || prefix === "N" || prefix === "R") return "internal_medicine";
  if (prefix === "S" || prefix === "T" || prefix === "M") return "surgery";
  if (prefix === "P") return "pediatrics";
  return "general";
}

function pickCoder(diagnosisCode: string, rng: () => number): { name: string; accuracy: number } {
  const preferred = CODERS.filter(c => c.specialty === mapIcdToSpecialty(diagnosisCode));
  const pool = preferred.length > 0 ? preferred : CODERS;
  return pool[Math.floor(rng() * pool.length)]!;
}

export function medicalRecordsHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const newCharts = new Map(state.medicalCharts);

  // Create charts for new encounters (always "open" on creation)
  const newlyCreated = new Set<string>();
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
    newlyCreated.add(chart.id);
  }

  // AI Coder assigns coders to "open" charts that weren't just created (up to 5 per tick)
  let assigned = 0;
  for (const [id, chart] of newCharts) {
    if (assigned >= 5) break;
    if (chart.status !== "open" || newlyCreated.has(id)) continue;
    const coder = pickCoder(chart.diagnoses[0]?.code ?? "", () => clock.rng());
    newCharts.set(id, { ...chart, status: "incomplete", coder: coder.name });
    assigned++;
  }

  // Coders process "incomplete" charts.
  // Discharged encounters get fast-track coded (next handler call).
  // Active encounters wait a variable delay (5-15 ticks) for coding.
  let coded = 0;
  for (const [id, chart] of newCharts) {
    if (coded >= 10) break;
    if (chart.status !== "incomplete" || !chart.coder) continue;
    const coder = CODERS.find(c => c.name === chart.coder);
    if (!coder) continue;

    const enc = state.encounters.get(chart.encounterId);
    const isDischarged = enc && enc.status !== "active";
    const codingDelay = isDischarged ? 1 : Math.floor(clock.rng() * 11) + 5;
    if (clock.tick % codingDelay !== 0) continue;

    const isAccurate = clock.rng() < coder.accuracy;
    newCharts.set(id, {
      ...chart,
      status: isAccurate ? "coded" : "incomplete",
      completedAt: isAccurate ? clock.hospitalTimeMs : null,
    });
    if (isAccurate) coded++;
  }

  return { ...state, medicalCharts: newCharts };
}
