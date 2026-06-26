import type { World } from "./world.js";
import { formatHospitalTime } from "./clock.js";

export interface HospitalReport {
  generatedAt: string;
  hospitalTime: string;
  tick: number;
  census: CensusSummary;
  emergency: EmergencySummary;
  clinical: ClinicalSummary;
  operations: OperationsSummary;
  finance: FinanceSummary;
  supplyChain: SupplyChainSummary;
  departments: DepartmentSummary[];
}

interface CensusSummary {
  totalPatients: number;
  activeEncounters: number;
  dischargedEncounters: number;
  totalBeds: number;
  availableBeds: number;
  occupancyRate: number;
  waitingRoom: number;
  wardOccupancy: { ward: string; total: number; occupied: number; rate: number }[];
}

interface EmergencySummary {
  totalTriages: number;
  activeTriages: number;
  acuityBreakdown: Record<string, number>;
  mostCommonComplaint: string;
  avgTimeToDispositionMs: number;
}

interface ClinicalSummary {
  lab: { total: number; resulted: number; pending: number };
  radiology: { total: number; resulted: number; pending: number };
  pharmacy: { total: number; administered: number; pending: number };
  surgery: { total: number; completed: number; pending: number };
  respiratory: { total: number; active: number };
  dietary: { total: number; active: number };
  socialWork: { total: number; assessments: number };
  physicianOrders: { total: number; completed: number; active: number };
  nurseNotes: number;
  mostOrderedLab: string;
  mostOrderedMed: string;
  mostCommonProcedure: string;
}

interface OperationsSummary {
  medicalRecords: { total: number; open: number; incomplete: number; coded: number };
  topDiagnoses: { code: string; name: string; count: number }[];
  avgDiagnosesPerChart: number;
}

interface FinanceSummary {
  totalCharges: number;
  totalChargeAmount: number;
  totalClaims: number;
  paidClaims: number;
  deniedClaims: number;
  totalPayments: number;
  totalPaymentAmount: number;
  payerMix: Record<string, number>;
  avgChargePerEncounter: number;
}

interface SupplyChainSummary {
  totalItems: number;
  lowStockItems: { code: string; name: string; stock: number; min: number }[];
  totalTransactions: number;
  restockCount: number;
  dispenseCount: number;
}

interface DepartmentSummary {
  name: string;
  orderCount: number;
  activeCount: number;
}

export function generateReport(world: World): HospitalReport {
  const s = world.state;
  const activeEncs = Array.from(s.encounters.values()).filter(e => e.status === "active");
  const dischargedEncs = Array.from(s.encounters.values()).filter(e => e.status === "discharged");
  const bedsArr = Array.from(s.beds.values());
  const availableBeds = bedsArr.filter(b => !b.patientId).length;

  // Ward occupancy
  const wardMap: Record<string, { total: number; occupied: number }> = {};
  for (const b of bedsArr) {
    if (!wardMap[b.ward]) wardMap[b.ward] = { total: 0, occupied: 0 };
    wardMap[b.ward]!.total++;
    if (b.patientId) wardMap[b.ward]!.occupied++;
  }
  const wardOccupancy = Object.entries(wardMap).map(([ward, w]) => ({
    ward, total: w.total, occupied: w.occupied,
    rate: w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0,
  }));

  // Emergency
  const triages = Array.from(s.edTriages.values());
  const activeTriages = triages.filter(t => !t.disposition);
  const acuityBreakdown: Record<string, number> = {};
  for (const t of triages) {
    const k = `P${t.acuity}`;
    acuityBreakdown[k] = (acuityBreakdown[k] ?? 0) + 1;
  }
  const complaintCounts: Record<string, number> = {};
  for (const t of triages) {
    complaintCounts[t.chiefComplaint] = (complaintCounts[t.chiefComplaint] ?? 0) + 1;
  }
  const mostCommonComplaint = Object.entries(complaintCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const triagesWithTime = triages.filter(t => t.dischargedAt);
  const avgTimeToDispositionMs = triagesWithTime.length > 0
    ? Math.round(triagesWithTime.reduce((s, t) => s + (t.dischargedAt! - t.triagedAt), 0) / triagesWithTime.length)
    : 0;

  // Clinical
  const labs = Array.from(s.labOrders.values());
  const rads = Array.from(s.radiologyOrders.values());
  const meds = Array.from(s.medicationOrders.values());
  const surgs = Array.from(s.surgeryOrders.values());
  const resps = Array.from(s.respiratoryOrders.values());
  const diets = Array.from(s.dietOrders.values());
  const socials = Array.from(s.socialWorkNotes.values());
  const phys = Array.from(s.physicianOrders.values());
  const nurses = Array.from(s.nurseNotes.values());

  const labCounts: Record<string, number> = {};
  for (const l of labs) labCounts[l.testName] = (labCounts[l.testName] ?? 0) + 1;
  const medCounts: Record<string, number> = {};
  for (const m of meds) medCounts[m.medication.name] = (medCounts[m.medication.name] ?? 0) + 1;
  const surgCounts: Record<string, number> = {};
  for (const s of surgs) surgCounts[s.procedureName] = (surgCounts[s.procedureName] ?? 0) + 1;

  const top = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  // Operations / Medical Records
  const charts = Array.from(s.medicalCharts.values());

  // Top diagnoses
  const dxCounts: Record<string, { name: string; count: number }> = {};
  for (const c of charts) {
    for (const d of c.diagnoses) {
      if (!dxCounts[d.code]) dxCounts[d.code] = { name: d.name, count: 0 };
      dxCounts[d.code]!.count++;
    }
  }
  const topDiagnoses = Object.entries(dxCounts)
    .map(([code, v]) => ({ code, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const avgDxPerChart = charts.length > 0 ? Math.round((charts.reduce((s, c) => s + c.diagnoses.length, 0) / charts.length) * 10) / 10 : 0;

  // Finance
  const charges = Array.from(s.charges.values());
  const claims = Array.from(s.insuranceClaims.values());
  const payments = Array.from(s.payments.values());
  const totalChargeAmount = charges.reduce((s, c) => s + c.amount, 0);
  const totalPaymentAmount = payments.reduce((s, p) => s + p.amount, 0);

  const payerMix: Record<string, number> = {};
  for (const cl of claims) payerMix[cl.payer] = (payerMix[cl.payer] ?? 0) + 1;

  const avgChargePerEncounter = s.encounters.size > 0 ? Math.round(totalChargeAmount / s.encounters.size) : 0;

  // Supply Chain
  const inv = Array.from(s.inventory.values());
  const lowStockItems = inv.filter(i => i.stock < i.minStock).map(i => ({
    code: i.itemCode, name: i.itemName, stock: i.stock, min: i.minStock,
  }));
  const txns = Array.from(s.stockTransactions.values());

  // Department summary
  const departments: DepartmentSummary[] = [
    { name: "Emergency", orderCount: triages.length, activeCount: activeTriages.length },
    { name: "Laboratory", orderCount: labs.length, activeCount: labs.filter(l => l.status === "ordered").length },
    { name: "Radiology", orderCount: rads.length, activeCount: rads.filter(r => r.status === "ordered").length },
    { name: "Pharmacy", orderCount: meds.length, activeCount: meds.filter(m => m.status === "ordered").length },
    { name: "Surgery", orderCount: surgs.length, activeCount: surgs.filter(s => s.status === "scheduled").length },
    { name: "Nursing", orderCount: nurses.length, activeCount: 0 },
    { name: "Physicians", orderCount: phys.length, activeCount: phys.filter(p => p.status === "active").length },
    { name: "Respiratory", orderCount: resps.length, activeCount: resps.filter(r => r.status === "active").length },
    { name: "Dietary", orderCount: diets.length, activeCount: diets.filter(d => d.status === "active").length },
    { name: "Social Work", orderCount: socials.length, activeCount: 0 },
    { name: "Medical Records", orderCount: charts.length, activeCount: charts.filter(c => c.status === "open").length },
  ];

  return {
    generatedAt: new Date().toISOString(),
    hospitalTime: formatHospitalTime(world.clock),
    tick: world.clock.tick,
    census: {
      totalPatients: s.patients.size,
      activeEncounters: activeEncs.length,
      dischargedEncounters: dischargedEncs.length,
      totalBeds: bedsArr.length,
      availableBeds,
      occupancyRate: bedsArr.length > 0 ? Math.round(((bedsArr.length - availableBeds) / bedsArr.length) * 100) : 0,
      waitingRoom: s.waitingRoom,
      wardOccupancy,
    },
    emergency: {
      totalTriages: triages.length, activeTriages: activeTriages.length,
      acuityBreakdown, mostCommonComplaint, avgTimeToDispositionMs,
    },
    clinical: {
      lab: { total: labs.length, resulted: labs.filter(l => l.status === "resulted").length, pending: labs.filter(l => l.status === "ordered").length },
      radiology: { total: rads.length, resulted: rads.filter(r => r.status === "resulted").length, pending: rads.filter(r => r.status === "ordered").length },
      pharmacy: { total: meds.length, administered: meds.filter(m => m.status === "administered").length, pending: meds.filter(m => m.status === "ordered").length },
      surgery: { total: surgs.length, completed: surgs.filter(s => s.status === "completed").length, pending: surgs.filter(s => s.status === "scheduled").length },
      respiratory: { total: resps.length, active: resps.filter(r => r.status === "active").length },
      dietary: { total: diets.length, active: diets.filter(d => d.status === "active").length },
      socialWork: { total: socials.length, assessments: socials.filter(s => s.noteType === "assessment").length },
      physicianOrders: { total: phys.length, completed: phys.filter(p => p.status === "completed").length, active: phys.filter(p => p.status === "active").length },
      nurseNotes: nurses.length,
      mostOrderedLab: top(labCounts),
      mostOrderedMed: top(medCounts),
      mostCommonProcedure: top(surgCounts),
    },
    operations: {
      medicalRecords: {
        total: charts.length,
        open: charts.filter(c => c.status === "open").length,
        incomplete: charts.filter(c => c.status === "incomplete").length,
        coded: charts.filter(c => c.status === "coded").length,
      },
      topDiagnoses,
      avgDiagnosesPerChart: avgDxPerChart,
    },
    finance: {
      totalCharges: charges.length, totalChargeAmount,
      totalClaims: claims.length,
      paidClaims: claims.filter(c => c.status === "paid").length,
      deniedClaims: claims.filter(c => c.status === "denied").length,
      totalPayments: payments.length, totalPaymentAmount,
      payerMix, avgChargePerEncounter,
    },
    supplyChain: {
      totalItems: inv.length, lowStockItems,
      totalTransactions: txns.length,
      restockCount: txns.filter(t => t.type === "restock").length,
      dispenseCount: txns.filter(t => t.type === "dispense").length,
    },
    departments,
  };
}
