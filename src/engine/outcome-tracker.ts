import type { HospitalState, OutcomeRecord } from "./state-store.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";

export interface DiagnosisPerformance {
  icdCode: string;
  diagnosisName: string;
  totalCases: number;
  improved: number;
  deteriorated: number;
  avgLosTicks: number;
  totalOrders: number;
  improvementRate: number;
}

function isVitalsNormal(vitals: {
  heartRate: number; bloodPressureSystolic: number; bloodPressureDiastolic: number;
  temperature: number; oxygenSaturation: number; respiratoryRate: number; painLevel: number;
}): boolean {
  const checks = [
    vitals.heartRate >= 60 && vitals.heartRate <= 100,
    vitals.bloodPressureSystolic >= 100 && vitals.bloodPressureSystolic <= 140,
    vitals.bloodPressureDiastolic >= 60 && vitals.bloodPressureDiastolic <= 90,
    vitals.temperature >= 36 && vitals.temperature <= 38,
    vitals.oxygenSaturation >= 95,
    vitals.respiratoryRate >= 12 && vitals.respiratoryRate <= 20,
    vitals.painLevel >= 0 && vitals.painLevel <= 3,
  ];
  return checks.filter(Boolean).length >= 5;
}

export function recordOutcome(
  state: HospitalState,
  encounterId: string,
  patientId: string,
  clock: Clock,
): { state: HospitalState; record: OutcomeRecord } {
  const patient = state.patients.get(patientId);
  const encounter = state.encounters.get(encounterId);
  if (!patient || !encounter) return { state, record: null as unknown as OutcomeRecord };

  const activeDx = patient.diagnoses.filter(d => d.active);
  const primaryDx = activeDx[0] || { code: "Z00.0", name: "General examination" };

  const improved = isVitalsNormal(patient.vitals);
  const outcome: "improved" | "deteriorated" = improved ? "improved" : "deteriorated";

  const startTick = Math.floor(encounter.startTime / 60000);
  const losTicks = clock.tick - startTick;

  let ordersCount = 0;
  for (const order of state.labOrders.values()) if (order.encounterId === encounterId) ordersCount++;
  for (const order of state.medicationOrders.values()) if (order.encounterId === encounterId) ordersCount++;
  for (const order of state.radiologyOrders.values()) if (order.encounterId === encounterId) ordersCount++;
  for (const order of state.physicianOrders.values()) if (order.encounterId === encounterId) ordersCount++;
  for (const order of state.surgeryOrders.values()) if (order.encounterId === encounterId) ordersCount++;
  for (const order of state.respiratoryOrders.values()) if (order.encounterId === encounterId) ordersCount++;
  for (const order of state.dietOrders.values()) if (order.encounterId === encounterId) ordersCount++;

  const record: OutcomeRecord = {
    patientId, encounterId, primaryDiagnosis: primaryDx.name, icdCode: primaryDx.code,
    outcome, losTicks, ordersCount, dischargeTick: clock.tick,
  };

  const existing = state._outcomeRecords || [];
  return { state: { ...state, _outcomeRecords: [...existing, record] }, record };
}

export function computePerformanceStats(state: HospitalState): DiagnosisPerformance[] {
  const records = state._outcomeRecords || [];
  const byCode = new Map<string, { name: string; outcomes: OutcomeRecord[] }>();

  for (const r of records) {
    let entry = byCode.get(r.icdCode);
    if (!entry) { entry = { name: r.primaryDiagnosis, outcomes: [] }; byCode.set(r.icdCode, entry); }
    entry.outcomes.push(r);
  }

  const result: DiagnosisPerformance[] = [];
  for (const [icdCode, entry] of byCode) {
    const total = entry.outcomes.length;
    const improved = entry.outcomes.filter(o => o.outcome === "improved").length;
    const deteriorated = entry.outcomes.filter(o => o.outcome === "deteriorated").length;
    const avgLos = Math.round(entry.outcomes.reduce((s, o) => s + o.losTicks, 0) / total);
    const totalOrders = entry.outcomes.reduce((s, o) => s + o.ordersCount, 0);
    result.push({
      icdCode, diagnosisName: entry.name, totalCases: total,
      improved, deteriorated, avgLosTicks: avgLos, totalOrders,
      improvementRate: Math.round((improved / total) * 100),
    });
  }

  result.sort((a, b) => b.totalCases - a.totalCases);
  return result;
}

export function outcomeHandler(state: HospitalState, clock: Clock, queue: EventQueue): HospitalState {
  const discharges = Array.from(state.encounters.values())
    .filter(e => e.status === "discharged" && !(state._outcomeRecords || []).some(r => r.encounterId === e.id));

  let s = state;
  for (const enc of discharges) {
    const result = recordOutcome(s, enc.id, enc.patientId, clock);
    s = result.state;
  }
  return s;
}
