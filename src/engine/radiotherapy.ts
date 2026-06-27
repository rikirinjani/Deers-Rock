import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export type RadiotherapyModality = "external_beam" | "brachytherapy" | "stereotactic" | "imrt" | "electron";

export interface RtPlan {
  id: string; encounterId: string; patientId: string;
  diagnosis: string;
  modality: RadiotherapyModality;
  fractionsPlanned: number;
  fractionsDelivered: number;
  dosePerFractionGy: number;
  totalDoseGy: number;
  status: "planned" | "in_progress" | "completed" | "paused";
  plannedAt: number; startedAt: number | null; completedAt: number | null;
  radiationOncologistId: string | null;
  physicistId: string | null;
  therapistId: string | null;
}

export interface RtFraction {
  id: string; planId: string; fractionNumber: number;
  deliveredAt: number; doseGy: number; notes: string;
  therapistId: string | null;
}

export interface RtEquipment {
  id: string; name: string; modality: RadiotherapyModality;
  status: "operational" | "under_maintenance" | "out_of_service";
  lastCalibrationTick: number;
}

export interface RadiotherapyState {
  plans: RtPlan[];
  fractions: RtFraction[];
  equipment: RtEquipment[];
}

let planCounter = 0;
let fracCounter = 0;

const MODALITY_BY_DX: Record<string, RadiotherapyModality> = {
  C50: "external_beam", C18: "imrt", C22: "external_beam",
  C61: "brachytherapy", C34: "stereotactic", C53: "brachytherapy",
  C16: "imrt", C25: "imrt", C32: "electron",
};

export function initRtState(): RadiotherapyState {
  return {
    plans: [],
    fractions: [],
    equipment: [
      { id: "LINAC-01", name: "Varian TrueBeam", modality: "external_beam", status: "operational", lastCalibrationTick: 0 },
      { id: "LINAC-02", name: "Elekta Synergy", modality: "imrt", status: "operational", lastCalibrationTick: 0 },
      { id: "BRACHY-01", name: "Nucletron HDR", modality: "brachytherapy", status: "operational", lastCalibrationTick: 0 },
      { id: "SRS-01", name: "Gamma Knife", modality: "stereotactic", status: "operational", lastCalibrationTick: 0 },
      { id: "ELECTRON-01", name: "Siemens Primus", modality: "electron", status: "operational", lastCalibrationTick: 0 },
    ],
  };
}

export function radiotherapyHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const rt = state._radiotherapy ?? initRtState();
  const newPlans = [...rt.plans];
  const newFracs = [...rt.fractions];
  const newEquip = [...rt.equipment];

  const agentPool = state._agentState?.pool;
  let oncoId: string | null = null;
  let physicistId: string | null = null;
  let therapistId: string | null = null;
  if (agentPool) {
    const oncos = Array.from(agentPool.agents.values()).filter(a => a.role === "dokter_spesialis" && a.status.inShift && a.spesialisasi === "Penyakit Dalam");
    if (oncos.length > 0) oncoId = oncos[Math.floor(Math.random() * oncos.length)]!.id;
    const physicists = Array.from(agentPool.agents.values()).filter(a => (a.role === "radiografer" || a.role === "teknisi_biomedik") && a.status.inShift);
    if (physicists.length > 0) physicistId = physicists[Math.floor(Math.random() * physicists.length)]!.id;
    const therapists = Array.from(agentPool.agents.values()).filter(a => (a.role === "perawat" || a.role === "radiografer") && a.status.inShift);
    if (therapists.length > 0) therapistId = therapists[Math.floor(Math.random() * therapists.length)]!.id;
  }

  for (const enc of state.encounters.values()) {
    if (enc.status !== "active") continue;
    const patient = state.patients.get(enc.patientId);
    if (!patient) continue;
    const cancerDx = patient.diagnoses.find(d => d.active && d.code.startsWith("C"));
    if (!cancerDx) continue;
    const alreadyPlanned = newPlans.some(p => p.patientId === enc.patientId && p.status !== "completed");
    if (alreadyPlanned) continue;
    if (Math.random() > 0.6) continue;

    planCounter++;
    const modality = MODALITY_BY_DX[cancerDx.code] ?? "external_beam";
    const fractions = modality === "brachytherapy" ? 3 : modality === "stereotactic" ? 5 : modality === "electron" ? 15 : 28;
    const dosePerFrac = modality === "brachytherapy" ? 7 : modality === "stereotactic" ? 8 : modality === "electron" ? 2 : 1.8;
    newPlans.push({
      id: `RT-${planCounter}`, encounterId: enc.id, patientId: enc.patientId,
      diagnosis: cancerDx.name, modality,
      fractionsPlanned: fractions, fractionsDelivered: 0,
      dosePerFractionGy: dosePerFrac, totalDoseGy: Math.round(dosePerFrac * fractions * 10) / 10,
      status: "planned", plannedAt: clock.hospitalTimeMs,
      startedAt: null, completedAt: null,
      radiationOncologistId: oncoId, physicistId, therapistId,
    });
  }

  for (const [pi, p] of newPlans.entries()) {
    if (p.status === "planned" && clock.tick % 2 === 0) {
      newPlans[pi] = { ...p, status: "in_progress", startedAt: clock.hospitalTimeMs };
    }
    if (p.status === "in_progress" && clock.tick % 4 === 0 && p.fractionsDelivered < p.fractionsPlanned) {
      fracCounter++;
      newFracs.push({
        id: `FRAC-${fracCounter}`, planId: p.id,
        fractionNumber: p.fractionsDelivered + 1,
        deliveredAt: clock.hospitalTimeMs,
        doseGy: p.dosePerFractionGy,
        notes: "Patient tolerated well",
        therapistId,
      });
      newPlans[pi] = { ...p, fractionsDelivered: p.fractionsDelivered + 1 };
    }
    if (p.status === "in_progress" && p.fractionsDelivered >= p.fractionsPlanned) {
      newPlans[pi] = { ...p, status: "completed", completedAt: clock.hospitalTimeMs };
    }
  }

  for (const [ei, e] of newEquip.entries()) {
    if (e.status === "operational" && clock.tick - e.lastCalibrationTick > 240) {
      newEquip[ei] = { ...e, status: "under_maintenance" };
    }
    if (e.status === "under_maintenance" && clock.tick % 10 === 0) {
      newEquip[ei] = { ...e, status: "operational", lastCalibrationTick: clock.tick };
    }
  }

  return { ...state, _radiotherapy: { plans: newPlans, fractions: newFracs, equipment: newEquip } };
}
