import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export type PathoTestType = "histopathology" | "frozen_section" | "cytology" | "immunohistochemistry";

export interface PathoOrder {
  id: string; encounterId: string; patientId: string;
  specimen: string; testType: PathoTestType;
  diagnosis: string;
  status: "pending" | "in_progress" | "completed";
  orderedAt: number; completedAt: number | null;
  result: string | null;
  malignant: boolean | null;
  pathologistId: string | null;
}

export interface PathoState {
  orders: Map<string, PathoOrder>;
}

const PATHO_DIAGNOSES: Record<string, { benign: string[]; malignant: string[] }> = {
  histopathology: {
    benign: ["Benign fibroadenoma", "Leiomyoma uteri", "Adenomatous polyp", "Granulation tissue"],
    malignant: ["Invasive ductal carcinoma", "Adenocarcinoma of colon", "Squamous cell carcinoma", "Hepatocellular carcinoma"],
  },
  cytology: {
    benign: ["Reactive lymphoid hyperplasia", "Colloid nodule", "Benign pap smear (NILM)"],
    malignant: ["Papillary carcinoma", "High grade squamous intraepithelial lesion", "Adenocarcinoma cells"],
  },
  frozen_section: {
    benign: ["Negative for malignancy", "Benign breast tissue", "Reactive changes"],
    malignant: ["Positive for malignancy", "Invasive carcinoma", "Margins positive for tumor"],
  },
  immunohistochemistry: {
    benign: ["ER/PR negative, Ki-67 low", "CK7 negative, CK20 positive", "Desmin positive (muscle origin)"],
    malignant: ["ER/PR positive, Ki-67 high", "HER2/neu positive (3+)", "CK7 positive, CK20 negative (lung origin)"],
  },
};

let orderCounter = 0;

export function initPathoState(): PathoState {
  return { orders: new Map() };
}

export function pathologyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const patho = state._pathology ?? initPathoState();
  const newOrders = new Map(patho.orders);

  let pathologistId: string | null = null;
  const agentPool = state._agentState?.pool;
  if (agentPool) {
    const staff = Array.from(agentPool.agents.values())
      .filter(a => a.role === "dokter_spesialis" && a.status.inShift &&
        (a.spesialisasi === "Patologi Anatomi" || a.spesialisasi === "Patologi Klinik"));
    if (staff.length > 0) pathologistId = staff[Math.floor(Math.random() * staff.length)]!.id;
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;
    const needsPatho = patient.diagnoses.some(d => ["C50", "C18", "C22", "C61", "D25", "N60"].includes(d.code));
    const alreadyOrdered = Array.from(newOrders.values()).some(o => o.patientId === enc.patientId && o.status !== "completed");

    if (needsPatho && !alreadyOrdered && Math.random() > 0.6 && clock.tick > 10) {
      orderCounter++;
      const testTypes: PathoTestType[] = ["histopathology", "cytology", "frozen_section", "immunohistochemistry"];
      const tt = testTypes[orderCounter % 4]!;
      const specimens: Record<string, string> = {
        histopathology: "Tissue biopsy", cytology: "Fine needle aspirate",
        frozen_section: "Intraoperative specimen", immunohistochemistry: "Tissue block",
      };
      newOrders.set(`PATHO-${orderCounter}`, {
        id: `PATHO-${orderCounter}`, encounterId: enc.id, patientId: enc.patientId,
        specimen: specimens[tt] ?? "Tissue specimen", testType: tt,
        diagnosis: patient.diagnoses.map(d => d.name).join("; "),
        status: "pending", orderedAt: clock.hospitalTimeMs, completedAt: null,
        result: null, malignant: null, pathologistId: null,
      });
    }
  }

  for (const [id, o] of newOrders) {
    if (o.status === "pending" && clock.tick % 5 === 0) {
      const pool = PATHO_DIAGNOSES[o.testType];
      if (!pool) continue;
      const isMalignant = Math.random() > 0.5;
      const results = isMalignant ? pool.malignant : pool.benign;
      const result = results[Math.floor(Math.random() * results.length)]!;
      newOrders.set(id, {
        ...o, status: "completed", completedAt: clock.hospitalTimeMs,
        result, malignant: isMalignant, pathologistId,
      });
    }
  }

  return { ...state, _pathology: { orders: newOrders } };
}
