import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export type MicrobeType = "gram_positive" | "gram_negative" | "fungus" | "parasite";
export type MicroTestType = "gram_stain" | "culture" | "sensitivity" | "pcr" | "rapid_antigen";

export interface MicroOrder {
  id: string; encounterId: string; patientId: string;
  specimen: string; testType: MicroTestType;
  status: "pending" | "in_progress" | "completed";
  orderedAt: number; completedAt: number | null;
  organism: string | null;
  gramStain: string | null;
  sensitivity: string[];
  microbeType: MicrobeType | null;
  microbiologistId: string | null;
}

export interface MicroState {
  orders: Map<string, MicroOrder>;
}

const ORGANISMS: Record<string, string[]> = {
  gram_positive: ["Staphylococcus aureus", "Streptococcus pneumoniae", "Enterococcus faecalis", "Streptococcus pyogenes"],
  gram_negative: ["Escherichia coli", "Klebsiella pneumoniae", "Pseudomonas aeruginosa", "Acinetobacter baumannii", "Salmonella typhi"],
  fungus: ["Candida albicans", "Aspergillus fumigatus", "Cryptococcus neoformans"],
  parasite: ["Plasmodium falciparum", "Toxoplasma gondii", "Entamoeba histolytica"],
};

const GRAM_STAINS: Record<string, string> = {
  gram_positive: "Gram positive cocci in clusters",
  gram_negative: "Gram negative rods",
  fungus: "Yeast cells with pseudohyphae",
  parasite: "No organisms seen on gram stain",
};

const SENSITIVITY_PANEL: Record<string, string[]> = {
  "Staphylococcus aureus": ["Cefoxitin S", "Clindamycin S", "Vancomycin S", "Erythromycin R"],
  "Escherichia coli": ["Ceftriaxone S", "Ciprofloxacin S", "Gentamicin S", "Ampicillin R"],
  "Klebsiella pneumoniae": ["Meropenem S", "Ceftazidime S", "Amikacin S", "Ciprofloxacin R"],
  "Pseudomonas aeruginosa": ["Ceftazidime S", "Meropenem S", "Ciprofloxacin S", "Gentamicin R"],
};

let orderCounter = 0;

export function initMicroState(): MicroState {
  return { orders: new Map() };
}

export function microbiologyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const micro = state._microbiology ?? initMicroState();
  const newOrders = new Map(micro.orders);

  const agentPool = state._agentState?.pool;
  let microId: string | null = null;
  if (agentPool) {
    const microStaff = Array.from(agentPool.agents.values())
      .filter(a => (a.role === "analis_lab" || a.role === "dokter_spesialis") && a.status.inShift && a.spesialisasi === "Patologi Klinik");
    if (microStaff.length > 0) microId = microStaff[Math.floor(Math.random() * microStaff.length)]!.id;
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;
    const hasMicroDx = patient.diagnoses.some(d => ["J15", "J12", "A09", "N39", "A91", "K35"].includes(d.code));
    const alreadyOrdered = Array.from(newOrders.values()).some(o => o.patientId === enc.patientId && o.status !== "completed");

    if (hasMicroDx && !alreadyOrdered && Math.random() > 0.7 && clock.tick > 10) {
      orderCounter++;
      const specimen = ["Blood", "Sputum", "Urine", "Stool", "Wound swab", "CSF"][orderCounter % 6]!;
      const testTypes: MicroTestType[] = ["gram_stain", "culture", "sensitivity", "pcr"];
      const testType = testTypes[Math.floor(Math.random() * 4)]!;
      newOrders.set(`MICRO-${orderCounter}`, {
        id: `MICRO-${orderCounter}`, encounterId: enc.id, patientId: enc.patientId,
        specimen, testType, status: "pending",
        orderedAt: clock.hospitalTimeMs, completedAt: null,
        organism: null, gramStain: null, sensitivity: [],
        microbeType: null, microbiologistId: null,
      });
    }
  }

  for (const [id, o] of newOrders) {
    if (o.status === "pending" && clock.tick % 3 === 0) {
      const microbeKeys = Object.keys(ORGANISMS) as MicrobeType[];
      const mt = microbeKeys[Math.floor(Math.random() * microbeKeys.length)]!;
      const orgs = ORGANISMS[mt];
      const org = orgs[Math.floor(Math.random() * orgs.length)]!;
      const sens = SENSITIVITY_PANEL[org] ?? ["Ceftriaxone S", "Ciprofloxacin S"];
      newOrders.set(id, {
        ...o, status: "completed", completedAt: clock.hospitalTimeMs,
        organism: org, microbeType: mt,
        gramStain: GRAM_STAINS[mt] ?? "No organisms seen",
        sensitivity: sens, microbiologistId: microId,
      });
    }
  }

  return { ...state, _microbiology: { orders: newOrders } };
}
