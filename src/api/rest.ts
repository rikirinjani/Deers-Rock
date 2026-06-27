import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { World } from "../engine/world.js";
import { formatHospitalTime } from "../engine/clock.js";
import { generateReport } from "../engine/report.js";
import { generateSirsReport } from "../engine/sirs-report.js";
import { computePerformanceStats } from "../engine/outcome-tracker.js";
import { buildFhirBundle } from "../engine/fhir-export.js";
import { getEventSummary, tickToDate, formatCalendarDate } from "../engine/calendar.js";
import { getBloodBankSummary } from "../engine/blood-bank.js";
import { initMicroState } from "../engine/microbiology.js";
import { initPathoState } from "../engine/pathology.js";
import { initCssdState } from "../engine/cssd.js";
import { initBiomedState } from "../engine/biomedical-engineering.js";
import { initIpcState } from "../engine/ipc.js";
import { initNutritionState } from "../engine/clinical-nutrition.js";
import { initRtState } from "../engine/radiotherapy.js";
import { initDialysisState } from "../engine/dialysis.js";
import { journalQuery, journalStats, loadNearestSnapshot, listSnapshots } from "../engine/journal.js";
import { SCENARIO_DEFS } from "../engine/scenario.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "..", "public");

export interface RestServer { listen(port: number): void; close(): void; }

const MIME: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

function json(res: http.ServerResponse, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(data));
}

function toArr<K, V>(map: Map<K, V>): V[] { return Array.from(map.values()).reverse(); }

function apiRoutes(req: http.IncomingMessage, res: http.ServerResponse, w: World, url: URL): boolean {
  const p = url.pathname;

  if (p === "/api/status") {
    const ae = Array.from(w.state.encounters.values()).filter(e => e.status === "active");
    json(res, {
      time: formatHospitalTime(w.clock), tick: w.clock.tick,
      patients: w.state.patients.size, activeEncounters: ae.length,
      availableBeds: Array.from(w.state.beds.values()).filter(b => !b.patientId).length,
      waitingRoom: w.state.waitingRoom, totalBeds: w.state.beds.size,
      labOrders: w.state.labOrders.size, radiologyOrders: w.state.radiologyOrders.size,
      medicationOrders: w.state.medicationOrders.size, surgeryOrders: w.state.surgeryOrders.size,
      nurseNotes: w.state.nurseNotes.size, physicianOrders: w.state.physicianOrders.size,
      edTriages: w.state.edTriages.size, respiratoryOrders: w.state.respiratoryOrders.size,
      dietOrders: w.state.dietOrders.size, socialWorkNotes: w.state.socialWorkNotes.size,
      medicalCharts: w.state.medicalCharts.size, charges: w.state.charges.size,
      insuranceClaims: w.state.insuranceClaims.size, payments: w.state.payments.size, inventoryItems: w.state.inventory.size,
      stockTxns: w.state.stockTransactions.size, agents: w.state._agentState.pool.agents.size,
      specialtyServices: w.state.specialtyOrders.size, referrals: w.state._referralState.letters.size,
    }); return true;
  }
  if (p === "/api/patients/identity") {
    json(res, Array.from(w.state.patients.values()).map(p => ({ id: p.id, name: p.name, nik: p.identity?.nik?.value ?? "N/A", phone: p.phone, bloodType: `${p.bloodType}${p.rhesus ?? "+"}`, allergies: p.allergies, provinsi: p.identity?.addressKtp?.provinsi ?? "N/A", agama: p.identity?.religion ?? "N/A", statusKawin: p.identity?.maritalStatus ?? "N/A" }))); return true;
  }
  if (p === "/api/patients") {
    const q = url.searchParams.get("q")?.toLowerCase();
    if (q) { json(res, Array.from(w.state.patients.values()).filter(pt => pt.name.toLowerCase().includes(q) || pt.id.toLowerCase().includes(q)).slice(0, 20)); return true; }
    json(res, toArr(w.state.patients)); return true;
  }
  if (p.startsWith("/api/patients/") && p.split("/").length === 4) {
    const id = p.split("/")[3]; const pt = w.state.patients.get(id ?? "");
    if (pt) json(res, pt); else { res.statusCode = 404; json(res, { error: "Not found" }); } return true;
  }
  if (p.startsWith("/api/patients/by-mrn/")) {
    const num = parseInt(p.split("/")[4] ?? "0");
    const target = `PAT-${String(num).padStart(4, "0")}`;
    const pt = w.state.patients.get(target);
    if (pt) json(res, pt); else { res.statusCode = 404; json(res, { error: "Patient not found", mrn: num }); } return true;
  }
  if (p === "/api/encounters") { json(res, toArr(w.state.encounters)); return true; }
  if (p === "/api/beds") { const b = Array.from(w.state.beds.values()); const bw: Record<string, {total:number;occupied:number}> = {}; for (const x of b) { if (!bw[x.ward]) bw[x.ward] = {total:0,occupied:0}; bw[x.ward]!.total++; if (x.patientId) bw[x.ward]!.occupied++; } json(res, {beds:b, byWard:bw}); return true; }
  if (p === "/api/labs") { json(res, toArr(w.state.labOrders)); return true; }
  if (p === "/api/radiology") { json(res, toArr(w.state.radiologyOrders)); return true; }
  if (p === "/api/medications") { json(res, toArr(w.state.medicationOrders)); return true; }
  if (p === "/api/surgery") { json(res, toArr(w.state.surgeryOrders)); return true; }
  if (p === "/api/nursing") { json(res, toArr(w.state.nurseNotes)); return true; }
  if (p === "/api/orders") { json(res, toArr(w.state.physicianOrders)); return true; }
  if (p === "/api/emergency") { json(res, toArr(w.state.edTriages)); return true; }
  if (p === "/api/respiratory") { json(res, toArr(w.state.respiratoryOrders)); return true; }
  if (p === "/api/diet") { json(res, toArr(w.state.dietOrders)); return true; }
  if (p === "/api/social") { json(res, toArr(w.state.socialWorkNotes)); return true; }
  if (p === "/api/charts") { json(res, toArr(w.state.medicalCharts)); return true; }
  if (p === "/api/charges") { json(res, toArr(w.state.charges)); return true; }
  if (p === "/api/claims") { json(res, toArr(w.state.insuranceClaims)); return true; }
  if (p === "/api/payments") { json(res, toArr(w.state.payments)); return true; }
  if (p === "/api/inventory") { json(res, toArr(w.state.inventory)); return true; }
  if (p === "/api/inventory/low") { json(res, Array.from(w.state.inventory.values()).filter(i => i.stock < i.minStock)); return true; }
  if (p === "/api/report") { json(res, generateReport(w)); return true; }
  if (p === "/api/sirs") { json(res, generateSirsReport(w)); return true; }
  if (p === "/api/sirs/rl1") { json(res, generateSirsReport(w).rl1); return true; }
  if (p === "/api/sirs/rl2a") { json(res, generateSirsReport(w).rl2a); return true; }
  if (p === "/api/sirs/rl2b") { json(res, generateSirsReport(w).rl2b); return true; }
  if (p === "/api/sirs/rl3") { json(res, generateSirsReport(w).rl3); return true; }
  if (p === "/api/sirs/rl4a") { json(res, generateSirsReport(w).rl4a); return true; }
  if (p === "/api/sirs/rl4b") { json(res, generateSirsReport(w).rl4b); return true; }
  if (p === "/api/sirs/rl4c") { json(res, generateSirsReport(w).rl4c); return true; }
  if (p === "/api/sirs/rl5a") { json(res, generateSirsReport(w).rl5a); return true; }
  if (p === "/api/sirs/rl6a") { json(res, generateSirsReport(w).rl6a); return true; }
  if (p === "/api/sirs/rl7") { json(res, generateSirsReport(w).rl7); return true; }
  if (p === "/api/sirs/rl8") { json(res, generateSirsReport(w).rl8); return true; }
  if (p === "/api/sirs/rl9") { json(res, generateSirsReport(w).rl9); return true; }
  if (p === "/api/journal") {
    const limit = parseInt(url.searchParams.get("limit") ?? "100");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const eventType = url.searchParams.get("type") ?? undefined;
    const entityType = url.searchParams.get("entity") ?? undefined;
    json(res, { events: journalQuery({ limit, offset, eventType, entityType }), stats: journalStats() }); return true;
  }
  if (p === "/api/journal/stats") { json(res, journalStats()); return true; }
  if (p === "/api/snapshots") { json(res, listSnapshots()); return true; }
  if (p.startsWith("/api/snapshot/")) {
    const targetTick = parseInt(p.split("/")[3] ?? "0");
    const snap = loadNearestSnapshot(targetTick);
    if (!snap.state) { res.statusCode = 404; json(res, { error: "No snapshot found", tick: targetTick }); return true; }
    const stateObj: Record<string, unknown> = { snapshotTick: snap.tick, targetTick };
    for (const [key, map] of Object.entries(snap.state)) {
      if (map instanceof Map) stateObj[key] = Array.from(map.values()).reverse();
    }
    stateObj.wardCapacity = snap.state.wardCapacity;
    stateObj.waitingRoom = snap.state.waitingRoom;
    json(res, stateObj); return true;
  }
  if (p === "/api/agents") { json(res, toArr(w.state._agentState.pool.agents)); return true; }
  if (p === "/api/agents/summary") {
    const agents = Array.from(w.state._agentState.pool.agents.values());
    const byRole: Record<string, number> = {};
    for (const a of agents) byRole[a.role] = (byRole[a.role] ?? 0) + 1;
    json(res, { total: agents.length, available: agents.filter(a => a.status.inShift && a.status.kesehatan !== "sakit_berat").length, byRole, sick: agents.filter(a => a.status.kesehatan !== "sehat").length, pregnant: agents.filter(a => a.status.isHamil).length }); return true;
  }
  if (p === "/api/referral") { json(res, { letters: toArr(w.state._referralState.letters), stats: { total: w.state._referralState.letters.size, facilities: w.state._referralState.facilities.size } }); return true; }
  if (p === "/api/referral/letters") { json(res, toArr(w.state._referralState.letters)); return true; }
  if (p === "/api/referral/facilities") { json(res, Array.from(w.state._referralState.facilities.values())); return true; }
  if (p === "/api/specialty") { json(res, toArr(w.state.specialtyOrders)); return true; }
  if (p === "/api/doctor-cases") { json(res, { cases: Array.from(w.state._doctorCaseMemory.values()).reverse(), total: w.state._doctorCaseMemory.size }); return true; }
  if (p === "/api/nurse-cases") { json(res, { cases: Array.from(w.state._nurseCaseMemory.values()).reverse(), total: w.state._nurseCaseMemory.size }); return true; }
  if (p === "/api/outcomes") { json(res, { records: w.state._outcomeRecords, total: w.state._outcomeRecords.length }); return true; }
  if (p === "/api/performance") { json(res, { diagnoses: computePerformanceStats(w.state) }); return true; }
  if (p === "/api/pharmacy-cases") { json(res, { cases: Array.from(w.state._pharmacyCaseMemory.values()).reverse(), total: w.state._pharmacyCaseMemory.size }); return true; }
  if (p === "/api/outpatient") {
    const visits = Array.from(w.state._outpatientVisits.values());
    json(res, { visits, total: visits.length, waiting: visits.filter(v => v.status === "waiting").length, consulting: visits.filter(v => v.status === "in-consultation").length, completed: visits.filter(v => v.status === "completed").length });
    return true;
  }
  if (p.startsWith("/api/fhir/encounter/")) {
    const encId = p.replace("/api/fhir/encounter/", "");
    const bundle = buildFhirBundle(w.state, encId);
    if (!bundle) { res.writeHead(404); res.end("Not found"); return true; }
    json(res, bundle); return true;
  }
  if (p === "/api/mm-conference") {
    const conferences = w.state._mmConferences || [];
    const latest = conferences[conferences.length - 1] ?? null;
    json(res, { latest, total: conferences.length }); return true;
  }
  if (p === "/api/morgue") {
    const morgue = w.state.morgue || [];
    const totalDeaths = morgue.length;
    const capacity = w.state.morgueCapacity;
    const byDiagnosis: Record<string, number> = {};
    for (const m of morgue) { byDiagnosis[m.primaryDiagnosis] = (byDiagnosis[m.primaryDiagnosis] || 0) + 1; }
    json(res, { bodies: morgue, totalDeaths, capacity, byDiagnosis }); return true;
  }
  if (p === "/api/calendar") {
    const ctx = getEventSummary(w.state._calendarTicks);
    json(res, { ...ctx, formatted: formatCalendarDate(ctx.date) }); return true;
  }
  if (p === "/api/blood-bank") {
    const bb = w.state._bloodBank;
    if (!bb) { json(res, { units: [], transfusionRecords: [], summary: { total: 0, byType: {}, available: 0 } }); return true; }
    const summary = getBloodBankSummary(bb);
    json(res, { units: bb.units, transfusionRecords: bb.transfusionRecords.slice(-20).reverse(), summary });
    return true;
  }
  if (p === "/api/microbiology") {
    const micro = w.state._microbiology ?? initMicroState();
    json(res, { orders: Array.from(micro.orders.values()).slice(-20).reverse() });
    return true;
  }
  if (p === "/api/pathology") {
    const patho = w.state._pathology ?? initPathoState();
    json(res, { orders: Array.from(patho.orders.values()).slice(-20).reverse() });
    return true;
  }
  if (p === "/api/cssd") {
    const cssd = w.state._cssd ?? initCssdState();
    json(res, { trays: cssd.trays, cycles: cssd.cycles.slice(-10).reverse() });
    return true;
  }
  if (p === "/api/biomedical") {
    const biomed = w.state._biomed ?? initBiomedState();
    const operational = biomed.equipment.filter(e => e.status === "operational").length;
    const maint = biomed.equipment.filter(e => e.status === "under_maintenance").length;
    const broken = biomed.equipment.filter(e => e.status === "broken").length;
    json(res, { equipment: biomed.equipment, maintenance: biomed.maintenance.slice(-10).reverse(), summary: { total: biomed.equipment.length, operational, underMaintenance: maint, broken } });
    return true;
  }
  if (p === "/api/ipc") {
    const ipc = w.state._ipc ?? initIpcState();
    json(res, { cases: ipc.cases.slice(-20).reverse(), handHygieneCompliance: ipc.handHygieneCompliance, isolationBedsInUse: ipc.isolationBedsInUse });
    return true;
  }
  if (p === "/api/clinical-nutrition") {
    const nut = w.state._clinicalNutrition ?? initNutritionState();
    json(res, { assessments: nut.assessments.slice(-10).reverse(), tubeFeedings: nut.tubeFeedings.filter(t => t.status === "active"), tpnOrders: nut.tpnOrders.slice(-5).reverse() });
    return true;
  }
  if (p === "/api/radiotherapy") {
    const rt = w.state._radiotherapy ?? initRtState();
    const active = rt.plans.filter(p => p.status === "in_progress").length;
    const completed = rt.plans.filter(p => p.status === "completed").length;
    json(res, { plans: rt.plans.slice(-10).reverse(), fractions: rt.fractions.slice(-20).reverse(), equipment: rt.equipment, summary: { total: rt.plans.length, active, completed } });
    return true;
  }
  if (p === "/api/dialysis") {
    const d = w.state._dialysis ?? initDialysisState();
    const activeSessions = d.sessions.filter(s => s.status === "in_progress").length;
    const availMachines = d.machines.filter(m => m.status === "available").length;
    json(res, { sessions: d.sessions.slice(-10).reverse(), machines: d.machines, summary: { totalSessions: d.sessions.length, activeSessions, availMachines, totalMachines: d.machines.length } });
    return true;
  }
  if (p === "/api/scenarios") {
    const sc = w.state._scenario ?? { active: null, history: [], cooldownTicks: 0 };
    json(res, { active: sc.active, history: sc.history.slice(-10).reverse(), definitions: SCENARIO_DEFS.map(d => ({ type: d.type, name: d.name, description: d.description })), cooldownTicks: sc.cooldownTicks });
    return true;
  }
  if (p === "/api/export/journal") {
    const all = journalQuery({ limit: 1000000 });
    res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="journal-${w.clock.tick}.json"` });
    res.end(JSON.stringify(all));
    return true;
  }
  if (p === "/api/export/state") {
    const s = { tick: w.clock.tick, time: formatHospitalTime(w.clock), patients: w.state.patients.size, encounters: w.state.encounters.size, morgue: w.state.morgue.length, outcomeRecords: w.state._outcomeRecords?.length ?? 0, bloodBank: w.state._bloodBank?.units?.length ?? 0, microOrders: w.state._microbiology?.orders?.size ?? 0, pathoOrders: w.state._pathology?.orders?.size ?? 0, cssdTrays: w.state._cssd?.trays?.length ?? 0, biomedEquipment: w.state._biomed?.equipment?.length ?? 0, ipcCases: w.state._ipc?.cases?.length ?? 0, nutAssessments: w.state._clinicalNutrition?.assessments?.length ?? 0, rtPlans: w.state._radiotherapy?.plans?.length ?? 0, dialysisSessions: w.state._dialysis?.sessions?.length ?? 0, scenarios: w.state._scenario?.history?.length ?? 0, doctorCases: w.state._doctorCaseMemory?.size ?? 0, nurseCases: w.state._nurseCaseMemory?.size ?? 0, learningEntries: w.state._learningMemory?.byDiagnosis?.size ?? 0 };
    res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="state-summary-${w.clock.tick}.json"` });
    res.end(JSON.stringify(s, null, 2));
    return true;
  }
  if (p === "/api/learning") {
    const mem = w.state._learningMemory;
    const summary = Array.from(mem.byDiagnosis.values()).map(dx => ({
      icdCode: dx.icdCode, diagnosisName: dx.diagnosisName,
      totalCases: dx.totalCases, improved: dx.improved, deteriorated: dx.deteriorated,
      rate: dx.totalCases > 0 ? Math.round((dx.improved / dx.totalCases) * 100) : 0,
      actionsLearned: dx.actions.size,
    }));
    json(res, { diagnoses: summary });
    return true;
  }
  if (p === "/api/top-icd") {
    if (w.state._icdTop10) { json(res, w.state._icdTop10); return true; }
    json(res, { period: 0, tick: 0, top10: [] }); return true;
  }
  if (p === "/api/summary") {
    const ae = Array.from(w.state.encounters.values()).filter(e => e.status === "active");
    json(res, {
      time: formatHospitalTime(w.clock), tick: w.clock.tick,
      census: { patients: w.state.patients.size, activeEncounters: ae.length, bedsAvailable: Array.from(w.state.beds.values()).filter(b => !b.patientId).length, waiting: w.state.waitingRoom },
      labs: { total: w.state.labOrders.size, pending: Array.from(w.state.labOrders.values()).filter(o => o.status === "ordered").length },
      radiology: { total: w.state.radiologyOrders.size, pending: Array.from(w.state.radiologyOrders.values()).filter(o => o.status === "ordered").length },
      pharmacy: { total: w.state.medicationOrders.size, pending: Array.from(w.state.medicationOrders.values()).filter(o => o.status === "ordered").length },
      surgery: { total: w.state.surgeryOrders.size, pending: Array.from(w.state.surgeryOrders.values()).filter(o => o.status === "scheduled").length },
      emergency: { total: w.state.edTriages.size, active: Array.from(w.state.edTriages.values()).filter(t => !t.disposition).length },
      nursing: { total: w.state.nurseNotes.size }, physicians: { total: w.state.physicianOrders.size, active: Array.from(w.state.physicianOrders.values()).filter(o => o.status === "active").length },
      respiratory: { total: w.state.respiratoryOrders.size }, dietary: { total: w.state.dietOrders.size }, social: { total: w.state.socialWorkNotes.size },
      medicalRecords: { total: w.state.medicalCharts.size, coded: Array.from(w.state.medicalCharts.values()).filter(c => c.status === "coded").length },
      finance: { charges: w.state.charges.size, claims: w.state.insuranceClaims.size, payments: w.state.payments.size },
      inventory: { items: w.state.inventory.size, lowStock: Array.from(w.state.inventory.values()).filter(i => i.stock < i.minStock).length, transactions: w.state.stockTransactions.size },
    }); return true;
  }
  return false;
}

export function createRestServer(world: () => World): RestServer {
  const server = http.createServer((req, res) => {
    const w = world();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (apiRoutes(req, res, w, url)) return;
    let fp = path.join(publicDir, url.pathname === "/" ? "index.html" : url.pathname);
    if (!fp.startsWith(publicDir)) { res.statusCode = 403; res.end("Forbidden"); return; }
    const ext = path.extname(fp);
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    fs.readFile(fp, (err, data) => { if (err) { res.statusCode = 404; res.end("Not found"); } else res.end(data); });
  });
  return { listen(port: number) { server.listen(port); }, close() { server.close(); } };
}
