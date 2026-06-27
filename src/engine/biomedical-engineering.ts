import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export interface BiomedEquipment {
  id: string; name: string; category: string;
  serialNumber: string; location: string;
  status: "operational" | "under_maintenance" | "broken" | "decommissioned";
  lastMaintenanceTick: number;
  nextMaintenanceTick: number;
  maintenanceInterval: number;
  lifetimeTicks: number;
  engineerId: string | null;
}

export interface MaintenanceRecord {
  id: string; equipmentId: string; equipmentName: string;
  type: "preventive" | "corrective" | "calibration";
  tick: number; status: "scheduled" | "in_progress" | "completed";
  findings: string | null; engineerId: string | null;
}

export interface BiomedState {
  equipment: BiomedEquipment[];
  maintenance: MaintenanceRecord[];
}

const EQUIPMENT_TEMPLATES: { name: string; category: string; interval: number; lifetime: number }[] = [
  { name: "X-ray machine", category: "Radiology", interval: 48, lifetime: 2000 },
  { name: "CT scanner", category: "Radiology", interval: 40, lifetime: 1800 },
  { name: "Ultrasound", category: "Radiology", interval: 60, lifetime: 2200 },
  { name: "ECG machine", category: "Cardiology", interval: 96, lifetime: 3000 },
  { name: "Defibrillator", category: "Emergency", interval: 36, lifetime: 1500 },
  { name: "Ventilator", category: "Respiratory", interval: 48, lifetime: 2000 },
  { name: "Infusion pump", category: "Nursing", interval: 72, lifetime: 2500 },
  { name: "Syringe pump", category: "Nursing", interval: 72, lifetime: 2500 },
  { name: "Patient monitor", category: "Nursing", interval: 96, lifetime: 3000 },
  { name: "Dialysis machine", category: "Hemodialysis", interval: 36, lifetime: 1500 },
  { name: "Anesthesia machine", category: "Surgery", interval: 36, lifetime: 1600 },
  { name: "Surgical microscope", category: "Surgery", interval: 60, lifetime: 3000 },
  { name: "Autoclave", category: "CSSD", interval: 48, lifetime: 2000 },
  { name: "Centrifuge", category: "Lab", interval: 96, lifetime: 3000 },
  { name: "Blood gas analyzer", category: "Lab", interval: 48, lifetime: 1500 },
  { name: "Incubator", category: "NICU", interval: 48, lifetime: 2000 },
  { name: "Phototherapy unit", category: "NICU", interval: 96, lifetime: 2500 },
];

let maintCounter = 0;

export function initBiomedState(): BiomedState {
  const equipment: BiomedEquipment[] = EQUIPMENT_TEMPLATES.map((t, i) => ({
    id: `EQ-${String(i + 1).padStart(3, "0")}`,
    name: t.name, category: t.category,
    serialNumber: `SN-${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`,
    location: t.category,
    status: "operational", lastMaintenanceTick: 0,
    nextMaintenanceTick: t.interval,
    maintenanceInterval: t.interval, lifetimeTicks: t.lifetime,
    engineerId: null,
  }));
  return { equipment, maintenance: [] };
}

export function biomedHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const biomed = state._biomed ?? initBiomedState();
  const newEquip = [...biomed.equipment];
  const newMaint = [...biomed.maintenance];

  let engineerId: string | null = null;
  const agentPool = state._agentState?.pool;
  if (agentPool) {
    const eng = Array.from(agentPool.agents.values())
      .filter(a => (a.role === "perawat" || a.role === "staf_inventaris" || a.role === "petugas_kebersihan") && a.status.inShift);
    if (eng.length > 0) engineerId = eng[Math.floor(Math.random() * eng.length)]!.id;
  }

  for (const [ei, e] of newEquip.entries()) {
    if (e.status === "operational" && clock.tick >= e.nextMaintenanceTick) {
      newEquip[ei] = { ...e, status: "under_maintenance" };
      maintCounter++;
      newMaint.push({
        id: `MAINT-${maintCounter}`, equipmentId: e.id, equipmentName: e.name,
        type: "preventive", tick: clock.tick, status: "in_progress",
        findings: null, engineerId,
      });
    }
    if (e.status === "broken" && Math.random() > 0.8) {
      newEquip[ei] = { ...e, status: "under_maintenance" };
      maintCounter++;
      newMaint.push({
        id: `MAINT-${maintCounter}`, equipmentId: e.id, equipmentName: e.name,
        type: "corrective", tick: clock.tick, status: "in_progress",
        findings: "Repair in progress", engineerId,
      });
    }
    if (e.status === "under_maintenance" && clock.tick % 3 === 0) {
      const lastMaint = newMaint.filter(m => m.equipmentId === e.id && m.status === "in_progress");
      if (lastMaint.length > 0) {
        for (const mi of newMaint.keys()) {
          if (newMaint[mi]!.id === lastMaint[0]!.id) {
            newMaint[mi] = { ...newMaint[mi]!, status: "completed", findings: "All parameters within spec" };
          }
        }
      }
      newEquip[ei] = {
        ...e, status: "operational",
        lastMaintenanceTick: clock.tick,
        nextMaintenanceTick: clock.tick + e.maintenanceInterval,
      };
    }
    if (clock.tick > e.lifetimeTicks && Math.random() > 0.95) {
      newEquip[ei] = { ...e, status: "decommissioned" };
    }
  }

  return { ...state, _biomed: { equipment: newEquip, maintenance: newMaint } };
}
