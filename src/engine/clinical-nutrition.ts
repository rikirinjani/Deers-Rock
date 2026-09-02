import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export interface NutritionAssessment {
  id: string; encounterId: string; patientId: string;
  bmi: number; malnutritionRisk: "low" | "moderate" | "high";
  assessment: string;
  recommendation: string;
  dietitianId: string | null;
  assessedAt: number;
}

export interface TubeFeedingOrder {
  id: string; encounterId: string; patientId: string;
  formula: string; rateMlPerHr: number;
  route: "NGT" | "OGT" | "PEG" | "jejunostomy";
  status: "active" | "completed" | "discontinued";
  startedAt: number;
  dietitianId: string | null;
}

export interface TpnOrder {
  id: string; encounterId: string; patientId: string;
  volumeMl: number; kcal: number; proteinG: number;
  lipidsG: number; additives: string[];
  status: "ordered" | "infusing" | "completed";
  orderedAt: number;
  dietitianId: string | null;
}

export interface ClinicalNutritionState {
  assessments: NutritionAssessment[];
  tubeFeedings: TubeFeedingOrder[];
  tpnOrders: TpnOrder[];
}

let assessCounter = 0;
let tubeCounter = 0;
let tpnCounter = 0;
export function resetClinicalNutritionCounters(): void { assessCounter = 0; tubeCounter = 0; tpnCounter = 0; }

const FEEDING_FORMULAS = ["Nutrison Standard", "Nutrison Energy", "Diason", "Nepro", "Ensure Plus", "Peptamen"];

export function initNutritionState(): ClinicalNutritionState {
  return { assessments: [], tubeFeedings: [], tpnOrders: [] };
}

export function clinicalNutritionHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const nut = state._clinicalNutrition ?? initNutritionState();
  const newAssessments = [...nut.assessments];
  const newTubes = [...nut.tubeFeedings];
  const newTpn = [...nut.tpnOrders];

  let dietitianId: string | null = null;
  const agentPool = state._agentState?.pool;
  if (agentPool) {
    const staff = Array.from(agentPool.agents.values())
      .filter(a => (a.role === "nutrisionis" || a.role === "dokter_spesialis") && a.status.inShift &&
        a.spesialisasi === "Gizi Klinik");
    if (staff.length > 0) dietitianId = staff[Math.floor(clock.rng() * staff.length)]!.id;
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;
    const needsNutrition = patient.diagnoses.some(d => ["E10", "E11", "I50", "N18", "K25", "K35", "R64", "D50", "E44"].includes(d.code));
    const alreadyAssessed = newAssessments.some(a => a.patientId === enc.patientId);

    if (needsNutrition && !alreadyAssessed && clock.rng() > 0.7 && clock.tick > 10) {
      assessCounter++;
      const wt = 40 + Math.floor(clock.rng() * 60);
      const ht = 150 + Math.floor(clock.rng() * 30);
      const bmi = Math.round((wt / ((ht / 100) * (ht / 100))) * 10) / 10;
      const risk: "low" | "moderate" | "high" = bmi < 17 ? "high" : bmi < 20 ? "moderate" : "low";
      const recs = risk === "high" ? "High calorie high protein diet, consider NG tube" : risk === "moderate" ? "Nutrition supplementation, monitor oral intake" : "Continue regular diet, nutrition counseling";
      newAssessments.push({
        id: `NUT-${assessCounter}`, encounterId: enc.id, patientId: enc.patientId,
        bmi, malnutritionRisk: risk,
        assessment: `BMI ${bmi}, ${risk} malnutrition risk. ${patient.diagnoses.map(d => d.name).join(", ")}`,
        recommendation: recs, dietitianId,
        assessedAt: clock.hospitalTimeMs,
      });
    }
  }

  const highRisk = newAssessments.filter(a => a.malnutritionRisk === "high" && !newTubes.some(t => t.patientId === a.patientId && t.status === "active"));
  if (highRisk.length > Math.floor(newTubes.length / 2) && clock.rng() > 0.6) {
    tubeCounter++;
    newTubes.push({
      id: `TF-${tubeCounter}`, encounterId: highRisk[0]!.encounterId,
      patientId: highRisk[0]!.patientId,
      formula: FEEDING_FORMULAS[Math.floor(clock.rng() * FEEDING_FORMULAS.length)]!,
      rateMlPerHr: 20 + Math.floor(clock.rng() * 60),
      route: ["NGT", "OGT", "PEG"][Math.floor(clock.rng() * 3)]! as TubeFeedingOrder["route"],
      status: "active", startedAt: clock.hospitalTimeMs, dietitianId,
    });
  }

  const icuEncs = Array.from(state.encounters.values()).filter(e => e.status === "active").slice(0, 2);
  for (const enc of icuEncs) {
    if (clock.rng() > 0.95 && !newTpn.some(t => t.patientId === enc.patientId && t.status !== "completed")) {
      tpnCounter++;
      newTpn.push({
        id: `TPN-${tpnCounter}`, encounterId: enc.id, patientId: enc.patientId,
        volumeMl: 1500 + Math.floor(clock.rng() * 1000),
        kcal: 1200 + Math.floor(clock.rng() * 600),
        proteinG: 50 + Math.floor(clock.rng() * 30),
        lipidsG: 20 + Math.floor(clock.rng() * 20),
        additives: ["Multivitamin", "Trace elements", "Electrolytes"],
        status: "ordered", orderedAt: clock.hospitalTimeMs, dietitianId,
      });
    }
  }

  for (const [ti, t] of newTpn.entries()) {
    if (t.status === "ordered" && clock.tick % 2 === 0) {
      newTpn[ti] = { ...t, status: "infusing" };
    }
  }

  return { ...state, _clinicalNutrition: { assessments: newAssessments, tubeFeedings: newTubes, tpnOrders: newTpn } };
}
