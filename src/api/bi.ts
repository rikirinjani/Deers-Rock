import type { World } from "../engine/world.js";
import { computePerformanceStats } from "../engine/outcome-tracker.js";
import { getBloodBankSummary } from "../engine/blood-bank.js";
import { journalQuery, journalStats, listSnapshots } from "../engine/journal.js";

export interface BiDashboardData {
  snapshot: BiSnapshot;
  census: BiCensus;
  financial: BiFinancial;
  clinical: BiClinical;
  workforce: BiWorkforce;
  departments: BiDepartments;
  trends: BiTrends;
}

interface BiSnapshot {
  time: string;
  tick: number;
}

interface BiCensus {
  totalPatients: number;
  activeEncounters: number;
  dischargedEncounters: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  waitingRoom: number;
  morgueTotal: number;
  morgueCapacity: number;
  byWard: { ward: string; total: number; occupied: number; rate: number }[];
  demographics: { byGender: Record<string, number>; byAgeGroup: Record<string, number> };
}

interface BiFinancial {
  totalCharges: number;
  totalChargeAmount: number;
  totalClaims: number;
  pendingClaims: number;
  paidClaims: number;
  deniedClaims: number;
  totalPayments: number;
  totalPaymentAmount: number;
  outstanding: number;
  avgChargePerPatient: number;
  collectionRate: number;
}

interface BiClinical {
  totalOutcomes: number;
  improved: number;
  deteriorated: number;
  deceased: number;
  improvementRate: number;
  mortalityRate: number;
  avgLosTicks: number;
  topDiagnoses: { icdCode: string; diagnosisName: string; totalCases: number; improvementRate: number; mortalityRate: number; avgLosTicks: number }[];
  labTotal: number; labResulted: number; labPending: number;
  radTotal: number; radResulted: number; radPending: number;
  medTotal: number; medAdministered: number; medPending: number;
  surgTotal: number; surgCompleted: number; surgPending: number;
  edTotal: number; edActive: number;
}

interface BiWorkforce {
  totalAgents: number;
  available: number;
  sick: number;
  pregnant: number;
  byRole: Record<string, number>;
  doctorCases: number;
  nurseCases: number;
  pharmacyCases: number;
}

interface BiDepartments {
  laboratory: { total: number; pending: number; resulted: number };
  radiology: { total: number; pending: number; resulted: number };
  pharmacy: { total: number; pending: number; dispensed: number; administered: number };
  surgery: { total: number; scheduled: number; inProgress: number; completed: number };
  emergency: { total: number; active: number };
  nursing: { totalNotes: number };
  respiratory: { total: number };
  dietary: { total: number };
  socialWork: { total: number };
  medicalRecords: { total: number; coded: number };
  outpatient: { total: number; waiting: number; consulting: number; completed: number };
  microbiology: { total: number };
  pathology: { total: number };
  cssd: { totalTrays: number; sterile: number };
  biomedical: { total: number; operational: number; underMaintenance: number; broken: number };
  ipc: { totalCases: number; handHygiene: number; isolationBeds: number };
  nutrition: { total: number; highRisk: number };
  radiotherapy: { total: number; active: number; completed: number };
  dialysis: { totalSessions: number; activeSessions: number; availMachines: number };
  bloodBank: { totalUnits: number; available: number };
  referral: { totalLetters: number; totalFacilities: number };
  specialty: { total: number };
}

interface BiTrends {
  journalTotal: number;
  journalByType: Record<string, number>;
  firstTick: number | null;
  lastTick: number | null;
  snapshots: { tick: number; createdAt: string }[];
  recentEvents: { tick: number; eventType: string; entityType: string; summary: string }[];
}

function calcAgeGroup(age: number): string {
  if (age < 1) return "Infant";
  if (age < 5) return "Toddler";
  if (age < 13) return "Child";
  if (age < 18) return "Adolescent";
  if (age < 40) return "Adult";
  if (age < 65) return "Middle-Aged";
  return "Elderly";
}

export function buildBiData(w: World): BiDashboardData {
  const s = w.state;
  const activeEncounters = Array.from(s.encounters.values()).filter(e => e.status === "active");
  const dischargedEncounters = Array.from(s.encounters.values()).filter(e => e.status === "discharged");
  const beds = Array.from(s.beds.values());
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.patientId).length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const byWard: Record<string, { total: number; occupied: number }> = {};
  for (const b of beds) {
    if (!byWard[b.ward]) byWard[b.ward] = { total: 0, occupied: 0 };
    byWard[b.ward].total++;
    if (b.patientId) byWard[b.ward].occupied++;
  }

  const patients = Array.from(s.patients.values());
  const byGender: Record<string, number> = {};
  const byAgeGroup: Record<string, number> = {};
  for (const p of patients) {
    byGender[p.gender] = (byGender[p.gender] ?? 0) + 1;
    const ag = calcAgeGroup(p.age);
    byAgeGroup[ag] = (byAgeGroup[ag] ?? 0) + 1;
  }

  const charges = Array.from(s.charges.values());
  const totalChargeAmount = charges.reduce((sum, c) => sum + c.amount, 0);
  const claims = Array.from(s.insuranceClaims.values());
  const payments = Array.from(s.payments.values());
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  const outcomes = s._outcomeRecords ?? [];
  const improved = outcomes.filter(o => o.outcome === "improved").length;
  const deteriorated = outcomes.filter(o => o.outcome === "deteriorated").length;
  const deceased = outcomes.filter(o => o.outcome === "deceased").length;
  const avgLos = outcomes.length > 0 ? Math.round(outcomes.reduce((s, o) => s + o.losTicks, 0) / outcomes.length) : 0;

  const labOrders = Array.from(s.labOrders.values());
  const radOrders = Array.from(s.radiologyOrders.values());
  const medOrders = Array.from(s.medicationOrders.values());
  const surgOrders = Array.from(s.surgeryOrders.values());
  const edTriage = Array.from(s.edTriages.values());

  const agents = Array.from(s._agentState.pool.agents.values());
  const byRole: Record<string, number> = {};
  for (const a of agents) byRole[a.role] = (byRole[a.role] ?? 0) + 1;

  const morgue = s.morgue ?? [];
  const ipc = s._ipc;

  const jStats = journalStats();
  const recentEvents = journalQuery({ limit: 30 });

  const perf = computePerformanceStats(s);

  return {
    snapshot: { time: w.clock ? `${w.clock.tick}` : "0", tick: w.clock?.tick ?? 0 },
    census: {
      totalPatients: patients.length,
      activeEncounters: activeEncounters.length,
      dischargedEncounters: dischargedEncounters.length,
      totalBeds, occupiedBeds, availableBeds: totalBeds - occupiedBeds,
      occupancyRate, waitingRoom: s.waitingRoom,
      morgueTotal: morgue.length, morgueCapacity: s.morgueCapacity ?? 10,
      byWard: Object.entries(byWard).map(([ward, d]) => ({ ward, total: d.total, occupied: d.occupied, rate: d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0 })),
      demographics: { byGender, byAgeGroup },
    },
    financial: {
      totalCharges: charges.length, totalChargeAmount,
      totalClaims: claims.length,
      pendingClaims: claims.filter(c => c.status === "submitted").length,
      paidClaims: claims.filter(c => c.status === "paid" || c.status === "adjudicated").length,
      deniedClaims: claims.filter(c => c.status === "denied").length,
      totalPayments: payments.length, totalPaymentAmount,
      outstanding: totalChargeAmount - totalPaymentAmount,
      avgChargePerPatient: patients.length > 0 ? Math.round(totalChargeAmount / patients.length) : 0,
      collectionRate: totalChargeAmount > 0 ? Math.round((totalPaymentAmount / totalChargeAmount) * 100) : 0,
    },
    clinical: {
      totalOutcomes: outcomes.length, improved, deteriorated, deceased,
      improvementRate: outcomes.length > 0 ? Math.round((improved / outcomes.length) * 100) : 0,
      mortalityRate: outcomes.length > 0 ? Math.round((deceased / outcomes.length) * 100) : 0,
      avgLosTicks: avgLos,
      topDiagnoses: perf.slice(0, 15),
      labTotal: labOrders.length,
      labResulted: labOrders.filter(o => o.status === "resulted").length,
      labPending: labOrders.filter(o => o.status !== "resulted").length,
      radTotal: radOrders.length,
      radResulted: radOrders.filter(o => o.status === "resulted").length,
      radPending: radOrders.filter(o => o.status !== "resulted").length,
      medTotal: medOrders.length,
      medAdministered: medOrders.filter(o => o.status === "administered" || o.status === "dispensed").length,
      medPending: medOrders.filter(o => o.status !== "administered" && o.status !== "dispensed" && o.status !== "discontinued").length,
      surgTotal: surgOrders.length,
      surgCompleted: surgOrders.filter(o => o.status === "completed").length,
      surgPending: surgOrders.filter(o => o.status === "scheduled").length,
      edTotal: edTriage.length,
      edActive: edTriage.filter(t => !t.disposition).length,
    },
    workforce: {
      totalAgents: agents.length,
      available: agents.filter(a => a.status.inShift && a.status.kesehatan !== "sakit_berat").length,
      sick: agents.filter(a => a.status.kesehatan !== "sehat").length,
      pregnant: agents.filter(a => a.status.isHamil).length,
      byRole,
      doctorCases: s._doctorCaseMemory?.size ?? 0,
      nurseCases: s._nurseCaseMemory?.size ?? 0,
      pharmacyCases: s._pharmacyCaseMemory?.size ?? 0,
    },
    departments: {
      laboratory: { total: labOrders.length, pending: labOrders.filter(o => o.status !== "resulted").length, resulted: labOrders.filter(o => o.status === "resulted").length },
      radiology: { total: radOrders.length, pending: radOrders.filter(o => o.status !== "resulted").length, resulted: radOrders.filter(o => o.status === "resulted").length },
      pharmacy: { total: medOrders.length, pending: medOrders.filter(o => o.status === "ordered").length, dispensed: medOrders.filter(o => o.status === "dispensed").length, administered: medOrders.filter(o => o.status === "administered").length },
      surgery: { total: surgOrders.length, scheduled: surgOrders.filter(o => o.status === "scheduled").length, inProgress: surgOrders.filter(o => o.status === "in-progress").length, completed: surgOrders.filter(o => o.status === "completed").length },
      emergency: { total: edTriage.length, active: edTriage.filter(t => !t.disposition).length },
      nursing: { totalNotes: s.nurseNotes.size },
      respiratory: { total: s.respiratoryOrders.size },
      dietary: { total: s.dietOrders.size },
      socialWork: { total: s.socialWorkNotes.size },
      medicalRecords: { total: s.medicalCharts.size, coded: Array.from(s.medicalCharts.values()).filter(c => c.status === "coded").length },
      outpatient: { total: s._outpatientVisits?.size ?? 0, waiting: Array.from(s._outpatientVisits?.values() ?? []).filter(v => v.status === "waiting").length, consulting: Array.from(s._outpatientVisits?.values() ?? []).filter(v => v.status === "in-consultation").length, completed: Array.from(s._outpatientVisits?.values() ?? []).filter(v => v.status === "completed").length },
      microbiology: { total: s._microbiology?.orders?.size ?? 0 },
      pathology: { total: s._pathology?.orders?.size ?? 0 },
      cssd: { totalTrays: s._cssd?.trays?.length ?? 0, sterile: s._cssd?.trays?.filter(t => t.status === "sterilized").length ?? 0 },
      biomedical: { total: s._biomed?.equipment?.length ?? 0, operational: s._biomed?.equipment?.filter(e => e.status === "operational").length ?? 0, underMaintenance: s._biomed?.equipment?.filter(e => e.status === "under_maintenance").length ?? 0, broken: s._biomed?.equipment?.filter(e => e.status === "broken").length ?? 0 },
      ipc: { totalCases: s._ipc?.cases?.length ?? 0, handHygiene: Math.round((s._ipc?.handHygieneCompliance ?? 1) * 100), isolationBeds: s._ipc?.isolationBedsInUse ?? 0 },
      nutrition: { total: s._clinicalNutrition?.assessments?.length ?? 0, highRisk: s._clinicalNutrition?.assessments?.filter(a => a.malnutritionRisk === "high").length ?? 0 },
      radiotherapy: { total: s._radiotherapy?.plans?.length ?? 0, active: s._radiotherapy?.plans?.filter(p => p.status === "in_progress").length ?? 0, completed: s._radiotherapy?.plans?.filter(p => p.status === "completed").length ?? 0 },
      dialysis: { totalSessions: s._dialysis?.sessions?.length ?? 0, activeSessions: s._dialysis?.sessions?.filter(s => s.status === "in_progress").length ?? 0, availMachines: s._dialysis?.machines?.filter(m => m.status === "available").length ?? 0 },
      bloodBank: { totalUnits: s._bloodBank?.units?.length ?? 0, available: s._bloodBank ? getBloodBankSummary(s._bloodBank).available : 0 },
      referral: { totalLetters: s._referralState?.letters?.size ?? 0, totalFacilities: s._referralState?.facilities?.size ?? 0 },
      specialty: { total: s.specialtyOrders.size },
    },
    trends: {
      journalTotal: jStats.total,
      journalByType: jStats.byType,
      firstTick: jStats.firstTick,
      lastTick: jStats.lastTick,
      snapshots: listSnapshots(),
      recentEvents: recentEvents.map(e => ({
        tick: e.tick,
        eventType: e.event_type,
        entityType: e.entity_type,
        summary: `${e.event_type}${e.entity_type ? ` (${e.entity_type})` : ""}${e.entity_id ? ` → ${e.entity_id.slice(0, 20)}` : ""}`,
      })),
    },
  };
}
