import type { HospitalState } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export type SterilizationMethod = "steam" | "ethylene_oxide" | "plasma" | "chemical";
export type TrayStatus = "clean" | "packed" | "sterilized" | "in_use" | "expired";

export interface InstrumentTray {
  id: string;
  name: string;
  contents: string[];
  method: SterilizationMethod;
  status: TrayStatus;
  sterilizedAt: number | null;
  expiresAt: number | null;
  cycleId: string | null;
}

export interface SterilizationCycle {
  id: string;
  method: SterilizationMethod;
  startTick: number;
  endTick: number;
  status: "running" | "completed" | "failed";
  trayCount: number;
  operatorId: string | null;
}

export interface CssdState {
  trays: InstrumentTray[];
  cycles: SterilizationCycle[];
}

const TRAY_TEMPLATES: { name: string; contents: string[]; method: SterilizationMethod }[] = [
  { name: "Laparotomy set", contents: ["Scalpel #10", "Metzenbaum scissors", "Kelly clamps (x6)", "Needle holder", "Tissue forceps", "Abdominal retractor"], method: "steam" },
  { name: "Caesarean set", contents: ["Scalpel #20", "Mayo scissors", "Towel clamps (x4)", "Needle holder", "Babcock forceps", "Curette"], method: "steam" },
  { name: "Thoracotomy set", contents: ["Scalpel #10", "Rib spreader", "Long Metzenbaum", "Vascular clamps", "Satinsky clamp", "Wire cutter"], method: "steam" },
  { name: "Minor surgery set", contents: ["Scalpel #15", "Suture scissors", "Mosquito clamps (x4)", "Adson forceps", "Skin hook"], method: "steam" },
  { name: "Endoscope set", contents: ["Flexible endoscope", "Biopsy forceps", "Suction tube", "Light cable"], method: "plasma" },
  { name: "Dental set", contents: ["Dental mirror", "Explorer", "Scaler", "Forceps", "Elevator"], method: "steam" },
  { name: "Microsurgery set", contents: ["Micro scalpel", "Micro scissors", "Micro forceps", "Needle holder"], method: "ethylene_oxide" },
];

const STERILIZATION_DURATION: Record<SterilizationMethod, number> = {
  steam: 12, ethylene_oxide: 48, plasma: 8, chemical: 24,
};

let cycleCounter = 0;
let trayCounter = 0;

export function initCssdState(): CssdState {
  const trays: InstrumentTray[] = TRAY_TEMPLATES.map((t, i) => ({
    id: `TRAY-${String(i + 1).padStart(3, "0")}`,
    name: t.name, contents: t.contents, method: t.method,
    status: "sterilized" as TrayStatus,
    sterilizedAt: 0, expiresAt: 100, cycleId: null,
  }));
  return { trays, cycles: [] };
}

export function cssdHandler(state: HospitalState, clock: Clock, _queue: EventQueue): HospitalState {
  const cssd = state._cssd ?? initCssdState();
  const newTrays = [...cssd.trays];
  const newCycles = [...cssd.cycles];

  let operatorId: string | null = null;
  const agentPool = state._agentState?.pool;
  if (agentPool) {
    const staff = Array.from(agentPool.agents.values())
      .filter(a => (a.role === "perawat" || a.role === "petugas_kebersihan") && a.status.inShift);
    if (staff.length > 0) operatorId = staff[Math.floor(Math.random() * staff.length)]!.id;
  }

  for (const t of newTrays) {
    if ((t.status === "clean" || t.status === "expired") && newCycles.filter(c => c.status === "running").length < 3) {
      cycleCounter++;
      const method = t.method;
      newCycles.push({
        id: `CYCLE-${cycleCounter}`, method,
        startTick: clock.tick, endTick: clock.tick + STERILIZATION_DURATION[method],
        status: "running", trayCount: 1, operatorId,
      });
      t.status = "packed";
      t.cycleId = `CYCLE-${cycleCounter}`;
    }
  }

  for (const [ci, c] of newCycles.entries()) {
    if (c.status === "running" && clock.tick >= c.endTick) {
      newCycles[ci] = { ...c, status: Math.random() > 0.05 ? "completed" : "failed" };
      for (const t of newTrays) {
        if (t.cycleId === c.id) {
          if (newCycles[ci].status === "completed") {
            t.status = "sterilized";
            t.sterilizedAt = clock.hospitalTimeMs;
            t.expiresAt = clock.tick + 96;
          } else {
            t.status = "clean";
          }
        }
      }
    }
  }

  for (const t of newTrays) {
    if (t.status === "sterilized" && t.expiresAt !== null && clock.tick > t.expiresAt) {
      t.status = "expired";
    }
  }

  if (clock.tick % 20 === 0) {
    const used = newTrays.filter(t => t.status === "sterilized");
    if (used.length > 3 && Math.random() > 0.6) {
      const pick = used[Math.floor(Math.random() * used.length)]!;
      pick.status = "in_use";
    }
  }
  for (const t of newTrays) {
    if (t.status === "in_use" && clock.tick % 3 === 0) {
      t.status = "clean";
    }
  }

  return { ...state, _cssd: { trays: newTrays, cycles: newCycles } };
}
