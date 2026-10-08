import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { World } from "../engine/world.js";
import type { Patient } from "../patient/schema.js";
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
import { journalQuery, journalStats, loadNearestSnapshot, listSnapshots, listExports } from "../engine/journal.js";
import { SCENARIO_DEFS } from "../engine/scenario.js";
import { buildBiData } from "./bi.js";
import { createFhirEndpoints } from "./fhir.js";
import { buildEncounterView, computeIcdOutcomeStats, morgueEncounterIds, tickFromMs } from "../engine/encounter-insights.js";
import { getSnapshots as getOutcomeSnapshots, clearSnapshots as clearOutcomeSnapshots } from "../engine/outcome-snapshot.js";
import {
  createUniverse, getUniverse, getUniverses,
  createBranch, runBranch, compareBranches,
  getBranchesForUniverse, getAllBranches,
  STANDARD_SCENARIOS, runStandardScenario,
} from "../timeline/engine.js";
import { getConsumptionByDept, getConsumptionByItem, getDeptConsumption, checkReorderAlerts } from "../engine/dept-consumption.js";
import { getDischargePlans, getFollowUpStats } from "../engine/discharge-planning.js";
import { getKamarJenazahRecords } from "../engine/kamar-jenazah.js";
import { getUpcomingAppointments } from "../engine/appointment-scheduling.js";
import { getAllCoderProfiles } from "../engine/ai-coder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "..", "public");

export interface RestServer { listen(port: number, host?: string): void; close(): void; }

const MIME: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

// Per-response CORS state. Key present => DR_CORS_ALLOW_ORIGINS restricted mode handled this
// response; value = origin to echo ("" when there was no/mismatched Origin header).
const corsApplied = new WeakMap<http.ServerResponse, string>();

function json(res: http.ServerResponse, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  if (corsApplied.has(res)) { const echoed = corsApplied.get(res); if (echoed) res.setHeader("Access-Control-Allow-Origin", echoed); }
  else res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(data));
}

// Constant-time credential check: hash both sides to fixed length, then timingSafeEqual.
// Never logs either value.
function keyMatches(provided: string | undefined, expected: string): boolean {
  if (provided === undefined) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function toArr<K, V>(map: Map<K, V>): V[] { return Array.from(map.values()).reverse(); }

// ── Query-param helpers (issue #5 P1-4) ──────────────────────────────────
// Optional filters on GET /api/encounters and GET /api/charts. Absent/empty
// params mean "no filter" (behavior unchanged); present-but-invalid values
// are rejected with 400 rather than silently ignored.

const ENCOUNTER_STATUSES = ["active", "discharged", "transferred"] as const;
const ENCOUNTER_TYPES = ["inpatient", "outpatient"] as const;
const CHART_STATUSES = ["open", "incomplete", "completed", "coded"] as const;

function badRequest(res: http.ServerResponse, msg: string): void {
  res.statusCode = 400;
  json(res, { error: msg });
}

/** Returns the raw value when valid, undefined when absent, "INVALID" otherwise. */
function parseEnumParam(url: URL, name: string, allowed: readonly string[]): string | undefined | "INVALID" {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return undefined;
  return (allowed as readonly string[]).includes(raw) ? raw : "INVALID";
}

/**
 * Integer >= min. Returns a number when valid, undefined when absent,
 * "INVALID" otherwise. Strict /^\d+$/ (Oracle F8): rejects non-decimal
 * forms Number() would accept — "0x10", "1e3", " 5", "+5", "-5", "1.0" —
 * with a 400 instead of silently coercing them.
 */
function parseIntParam(url: URL, name: string, min: number): number | undefined | "INVALID" {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return undefined;
  if (!/^\d+$/.test(raw)) return "INVALID";
  const n = Number.parseInt(raw, 10);
  return n >= min ? n : "INVALID";
}

export function apiRoutes(req: http.IncomingMessage, res: http.ServerResponse, w: World, url: URL): boolean {
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
  // Issue #5: encounters now carry derived fields (outcome, icuDays,
  // ventilatorDays, readmissionWithin30d, lengthOfStay) plus optional
  // status/type/limit/since filters. No params → full array, as before.
  if (p === "/api/encounters") {
    const status = parseEnumParam(url, "status", ENCOUNTER_STATUSES);
    if (status === "INVALID") { badRequest(res, `invalid status param — expected one of ${ENCOUNTER_STATUSES.join("|")}`); return true; }
    const type = parseEnumParam(url, "type", ENCOUNTER_TYPES);
    if (type === "INVALID") { badRequest(res, `invalid type param — expected one of ${ENCOUNTER_TYPES.join("|")}`); return true; }
    const limit = parseIntParam(url, "limit", 1);
    if (limit === "INVALID") { badRequest(res, "invalid limit param — expected integer >= 1"); return true; }
    const since = parseIntParam(url, "since", 0);
    if (since === "INVALID") { badRequest(res, "invalid since param — expected integer tick >= 0"); return true; }
    // Oracle F9: one morgue-id set per request instead of a morgue scan per encounter.
    const morgueIds = morgueEncounterIds(w.state);
    let list = toArr(w.state.encounters).map(e => buildEncounterView(w.state, e, morgueIds));
    if (status !== undefined) list = list.filter(e => e.status === status);
    if (type !== undefined) list = list.filter(e => e.type === type);
    if (since !== undefined) list = list.filter(e => tickFromMs(e.startTime) >= since);
    if (limit !== undefined) list = list.slice(0, limit);
    json(res, list); return true;
  }
  if (p === "/api/beds") { const b = Array.from(w.state.beds.values()); const bw: Record<string, {total:number;occupied:number}> = {}; const bb: Record<string, {total:number;occupied:number}> = {}; for (const x of b) { if (!bw[x.ward]) bw[x.ward] = {total:0,occupied:0}; bw[x.ward]!.total++; if (x.patientId) bw[x.ward]!.occupied++; if (x.building) { if (!bb[x.building]) bb[x.building] = {total:0,occupied:0}; bb[x.building]!.total++; if (x.patientId) bb[x.building]!.occupied++; } } json(res, {beds:b, byWard:bw, byBuilding:bb}); return true; }
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
  // Issue #5: optional status/limit/since filters on charts. No params →
  // full array, as before.
  if (p === "/api/charts") {
    const status = parseEnumParam(url, "status", CHART_STATUSES);
    if (status === "INVALID") { badRequest(res, `invalid status param — expected one of ${CHART_STATUSES.join("|")}`); return true; }
    const limit = parseIntParam(url, "limit", 1);
    if (limit === "INVALID") { badRequest(res, "invalid limit param — expected integer >= 1"); return true; }
    const since = parseIntParam(url, "since", 0);
    if (since === "INVALID") { badRequest(res, "invalid since param — expected integer tick >= 0"); return true; }
    let list = toArr(w.state.medicalCharts);
    if (status !== undefined) list = list.filter(c => c.status === status);
    if (since !== undefined) list = list.filter(c => tickFromMs(c.createdAt) >= since);
    if (limit !== undefined) list = list.slice(0, limit);
    json(res, list); return true;
  }
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
  if (p === "/api/sirs/rl5b") { json(res, generateSirsReport(w).rl5b); return true; }
  if (p === "/api/sirs/rl6a") { json(res, generateSirsReport(w).rl6a); return true; }
  if (p === "/api/sirs/rl6b") { json(res, generateSirsReport(w).rl6b); return true; }
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
  // Issue #5 P2-7 (Oracle F3/F4): per-ICD outcome stats from _outcomeRecords
  // (append-only, all-time) joined with the morgue — same denominator as
  // records/total in this payload. Unified shape: `byIcd` is ALWAYS present;
  //  - ?icd=<code> → byIcd holds just that row (zeroed row when unknown).
  //  - no param    → byIcd holds the aggregate rows (top ICDs, capped at 50);
  //                  `truncated: true` + `totalDistinct` appear when capped.
  // records/total keep their pre-existing meaning (tracker vocabulary).
  if (p === "/api/outcomes") {
    const icdParam = url.searchParams.get("icd");
    const icd = icdParam !== null && icdParam !== "" ? icdParam : undefined;
    const { byIcd, totalDistinct, truncated } = computeIcdOutcomeStats(w.state, icd);
    json(res, {
      records: w.state._outcomeRecords,
      total: w.state._outcomeRecords.length,
      byIcd,
      ...(truncated ? { truncated: true, totalDistinct } : {}),
      _vocab: "records[].outcome uses the vitals-based tracker vocabulary {improved, deteriorated, deceased} (deceased = morgue-linked); byIcd[] uses the discharge vocabulary {sembuh = discharged alive, meninggal = died}",
    }); return true;
  }
  if (p === "/api/performance") { json(res, { diagnoses: computePerformanceStats(w.state) }); return true; }
  if (p === "/api/pharmacy-cases") { json(res, { cases: Array.from(w.state._pharmacyCaseMemory.values()).reverse(), total: w.state._pharmacyCaseMemory.size }); return true; }
  if (p === "/api/outpatient") {
    const visits = Array.from(w.state._outpatientVisits.values());
    json(res, { visits, total: visits.length, waiting: visits.filter(v => v.status === "waiting").length, consulting: visits.filter(v => v.status === "in-consultation").length, completed: visits.filter(v => v.status === "completed").length });
    return true;
  }
  if (p === "/api/fhir/Patient") {
    const fhir = createFhirEndpoints(() => w);
    const name = url.searchParams.get("name") ?? undefined;
    const resources = fhir.patientSearch(name);
    json(res, { resourceType: "Bundle", type: "searchset", total: resources.length, entry: resources.map(r => ({ resource: r })) });
    return true;
  }
  if ((p.startsWith("/api/fhir/Patient/") || p.startsWith("/api/fhir/patient/")) && p.split("/").length === 5) {
    const id = decodeURIComponent(p.split("/")[4] ?? "");
    const r = createFhirEndpoints(() => w).patientLookup(id);
    if (!r) { res.statusCode = 404; json(res, { error: `Patient/${id} not found` }); return true; }
    json(res, r); return true;
  }
  if (p === "/api/fhir/Observation") {
    const fhir = createFhirEndpoints(() => w);
    const patient = url.searchParams.get("patient");
    const patientIds = patient ? [patient] : Array.from(w.state.patients.keys());
    const resources = patientIds.flatMap(id => fhir.observationList(id));
    json(res, { resourceType: "Bundle", type: "searchset", total: resources.length, entry: resources.map(r => ({ resource: r })) });
    return true;
  }
  if (p.startsWith("/api/fhir/encounter/")) {
    const encId = p.replace("/api/fhir/encounter/", "");
    const bundle = buildFhirBundle(w.state, encId);
    if (!bundle) { res.statusCode = 404; json(res, { error: "Not found" }); return true; }
    json(res, bundle); return true;
  }
  // ADR-014: New FHIR endpoints
  if (p === "/api/fhir/Condition") {
    const api = createFhirEndpoints(() => w);
    const patient = url.searchParams.get("patient") ?? undefined;
    const resources = api.conditionSearch(patient);
    json(res, { resourceType: "Bundle", type: "searchset", total: resources.length, entry: resources.map(r => ({ resource: r })) });
    return true;
  }
  if (p === "/api/fhir/Claim") {
    const api = createFhirEndpoints(() => w);
    const patient = url.searchParams.get("patient") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const resources = api.claimSearch(patient, status);
    json(res, { resourceType: "Bundle", type: "searchset", total: resources.length, entry: resources.map(r => ({ resource: r })) });
    return true;
  }
  if (p === "/api/fhir/Encounter") {
    const api = createFhirEndpoints(() => w);
    const status = url.searchParams.get("status") ?? undefined;
    const type = url.searchParams.get("type") ?? undefined;
    const resources = api.encounterList(status, type);
    json(res, { resourceType: "Bundle", type: "searchset", total: resources.length, entry: resources.map(r => ({ resource: r })) });
    return true;
  }
  if (p === "/api/fhir/metadata") {
    json(res, createFhirEndpoints(() => w).conformance());
    return true;
  }
  // ADR-014: CSV exports
  function esc(s: string): string {
    return `"${String(s).replace(/"/g, '""').replace(/\n/g, " ")}"`;
  }
  if (p === "/api/export/patients.csv") {
    const patients = Array.from(w.state.patients.values());
    const rows = ["id,name,age,gender,bloodType,rhesus,allergies,morgueId"];
    for (const p of patients) {
      const r = (p as Patient & { rhesus?: string }).rhesus ?? "+";
      const pid = (p as Patient & { morgueId?: string | null }).morgueId ?? "";
      rows.push(`${esc(p.id)},${esc(p.name)},${p.age},${p.gender},${p.bloodType},${r},"${(p.allergies||[]).join(";")}",${esc(pid)}`);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="patients.csv"');
    res.end("\uFEFF" + rows.join("\n"));
    return true;
  }
  if (p === "/api/export/encounters.csv") {
    const encs = Array.from(w.state.encounters.values());
    const rows = ["id,type,status,patientId,diagnosis,tickIn"];
    for (const e of encs) {
      const dx = e.primaryDiagnosis || "";
      rows.push(`${esc(e.id)},${esc(e.type)},${esc(e.status)},${esc(e.patientId)},${esc(dx)},${e.startTime}`);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="encounters.csv"');
    res.end("\uFEFF" + rows.join("\n"));
    return true;
  }
  if (p === "/api/export/charges.csv") {
    const charges = Array.from(w.state.charges.values());
    const rows = ["id,encounterId,patientId,description,amount,billedAt"];
    for (const c of charges) {
      rows.push(`${esc(c.id)},${esc(c.encounterId)},${esc(c.patientId)},${esc(c.description)},${c.amount},${c.billedAt}`);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="charges.csv"');
    res.end("\uFEFF" + rows.join("\n"));
    return true;
  }
  // V M5.3: Per-ward patient census CSV
  if (p === "/api/export/ward-census.csv") {
    const beds = Array.from(w.state.beds.values());
    const activeEncs = Array.from(w.state.encounters.values()).filter(e => e.status === "active" && e.type === "inpatient");
    const rows = ["ward,building,roomClass,patientCount,totalCapacity,occupancyPct"];
    const wardMap = new Map<string, { occupied: number; total: number }>();
    for (const bed of beds) {
      if (!wardMap.has(bed.ward)) wardMap.set(bed.ward, { occupied: 0, total: 0 });
      const wData = wardMap.get(bed.ward)!;
      wData.total++;
      if (bed.patientId) wData.occupied++;
    }
    for (const [ward, data] of wardMap) {
      const pct = data.total > 0 ? Math.round(data.occupied / data.total * 100) : 0;
      rows.push(`${esc(ward)},${data.occupied},${data.total},${pct}%`);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="ward-census.csv"');
    res.end("\uFEFF" + rows.join("\n"));
    return true;
  }
  // V M5.3: Medical supply consumption CSV
  if (p === "/api/export/supply-consumption.csv") {
    const consumption = getDeptConsumption(w.state);
    const rows = ["department,itemCode,quantity,lastTick"];
    for (const c of consumption.values()) {
      rows.push(`${esc(c.department)},${esc(c.itemCode)},${c.quantity},${c.tick}`);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="supply-consumption.csv"');
    res.end("\uFEFF" + rows.join("\n"));
    return true;
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
  if (p === "/api/exports") {
    json(res, listExports());
    return true;
  }
  if (p.startsWith("/api/exports/")) {
    const filename = p.split("/").slice(3).join("/");
    const dataDir = process.env.DATA_DIR ?? ".";
    const filepath = path.join(dataDir, "exports", filename);
    if (!fs.existsSync(filepath) || !filename.startsWith("journal-") || !filename.endsWith(".json")) {
      res.statusCode = 404; json(res, { error: "Not found" });
      return true;
    }
    const data = fs.readFileSync(filepath, "utf-8");
    res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${filename}"` });
    res.end(data);
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
  if (p === "/api/bi") { try { json(res, buildBiData(w)); } catch (e) { res.statusCode = 500; json(res, { error: String(e) }); } return true; }
  if (p === "/api/bi/census") { try { json(res, buildBiData(w).census); } catch (e) { res.statusCode = 500; json(res, { error: String(e) }); } return true; }
  if (p === "/api/bi/financial") { try { json(res, buildBiData(w).financial); } catch (e) { res.statusCode = 500; json(res, { error: String(e) }); } return true; }
  if (p === "/api/bi/clinical") { try { json(res, buildBiData(w).clinical); } catch (e) { res.statusCode = 500; json(res, { error: String(e) }); } return true; }
  if (p === "/api/bi/workforce") { try { json(res, buildBiData(w).workforce); } catch (e) { res.statusCode = 500; json(res, { error: String(e) }); } return true; }
  if (p === "/api/bi/departments") { try { json(res, buildBiData(w).departments); } catch (e) { res.statusCode = 500; json(res, { error: String(e) }); } return true; }
  if (p === "/api/bi/trends") { try { json(res, buildBiData(w).trends); } catch (e) { res.statusCode = 500; json(res, { error: String(e) }); } return true; }
  // Epic VII M7.3: per-tick outcome snapshots
  if (p === "/api/outcomes/snapshots") {
    json(res, { count: getOutcomeSnapshots().length, snapshots: getOutcomeSnapshots().slice(-100).reverse() });
    return true;
  }
  if (p === "/api/outcomes/snapshots/reset") {
    clearOutcomeSnapshots();
    json(res, { ok: true });
    return true;
  }
  // Epic VI M6.3: Department consumption
  if (p === "/api/departments/consumption" && req.method === "GET") {
    json(res, {
      byDept: getConsumptionByDept(w.state),
      alerts: checkReorderAlerts(w.state),
      totalEntries: getDeptConsumption(w.state).size,
    });
    return true;
  }
  // Epic VI M6.2: Discharge planning / rujuk balik
  if (p === "/api/discharge-plans" && req.method === "GET") {
    json(res, {
      total: getDischargePlans(w.state).size,
      stats: getFollowUpStats(w.state),
      plans: Array.from(getDischargePlans(w.state).values()).slice(-50).reverse(),
    });
    return true;
  }
  // Epic VI: Kamar jenazah / forensik
  if (p === "/api/kamar-jenazah" && req.method === "GET") {
    const records = Array.from(getKamarJenazahRecords(w.state).values());
    const active = records.filter(r => r.status !== "released");
    json(res, { total: records.length, active, byStatus: { received: records.filter(r=>r.status==="received").length, stored: records.filter(r=>r.status==="stored").length, released: records.filter(r=>r.status==="released").length }, byForensic: { none: records.filter(r=>r.forensicFlag==="none").length, suspicious: records.filter(r=>r.forensicFlag==="suspicious").length, legal_hold: records.filter(r=>r.forensicFlag==="legal_hold").length, autopsy: records.filter(r=>r.forensicFlag==="autopsy_required").length } });
    return true;
  }
  // Epic VI: Sick leave records
  if (p === "/api/sick-leave" && req.method === "GET") {
    const sickState = (w.state as unknown as { _sickLeaveState?: { records: Map<string, any>; counter: number } })._sickLeaveState;
    const records = sickState ? Array.from(sickState.records.values()) : [];
    json(res, { total: records.length, active: records.filter(r => r.recoveredTick === null).length, recovered: records.filter(r => r.recoveredTick !== null).length, records: records.slice(-20).reverse() });
    return true;
  }
  // Epic VI: Appointments
  if (p === "/api/appointments" && req.method === "GET") {
    const appts = Array.from((w.state as unknown as { _appointmentState?: { appointments: Map<string, any> } })._appointmentState?.appointments?.values() ?? []);
    json(res, { total: appts.length, byStatus: { scheduled: appts.filter(a=>a.status==="scheduled").length, checked_in: appts.filter(a=>a.status==="checked_in").length, completed: appts.filter(a=>a.status==="completed").length, no_show: appts.filter(a=>a.status==="no_show").length }, upcoming: appts.filter(a => a.status === "scheduled").slice(0, 20) });
    return true;
  }
  // ADR-018: AI Medical Coder — coder profiles + accuracy stats
  if (p === "/api/coders" && req.method === "GET") {
    const profiles = getAllCoderProfiles();
    json(res, { coders: profiles.map(c => ({ name: c.name, specialty: c.specialty, accuracy: c.accuracy, casesProcessed: c.casesProcessed })), totalCharts: w.state.medicalCharts.size, coded: Array.from(w.state.medicalCharts.values()).filter(c => c.status === "coded").length });
    return true;
  }
  // Epic III: Timeline Engine endpoints
  if (p === "/api/timeline/universes" && req.method === "GET") {
    json(res, getUniverses());
    return true;
  }
  if (p.startsWith("/api/timeline/universes/") && p.endsWith("/branches") && req.method === "GET") {
    const uid = p.replace("/api/timeline/universes/", "").replace("/branches", "");
    json(res, getBranchesForUniverse(uid));
    return true;
  }
  if (p === "/api/timeline/branches" && req.method === "GET") {
    json(res, getAllBranches());
    return true;
  }
  if (p === "/api/timeline/scenarios" && req.method === "GET") {
    json(res, STANDARD_SCENARIOS);
    return true;
  }
  if (p.match(/^\/api\/timeline\/branches\/[^\/]+\/compare$/) && req.method === "GET") {
    const id1 = url.searchParams.get("id1");
    const id2 = url.searchParams.get("id2");
    if (!id1 || !id2) { res.statusCode = 400; json(res, { error: "Missing id1 or id2" }); return true; }
    const delta = compareBranches(id1, id2);
    if (!delta) { res.statusCode = 404; json(res, { error: "Branch not found" }); return true; }
    json(res, delta);
    return true;
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
  const apiKey = process.env.DR_API_KEY || "";
  const allowedOrigins = (process.env.DR_CORS_ALLOW_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const corsRestricted = allowedOrigins.length > 0;
  if (!apiKey) process.stderr.write("[dr-api] WARNING: DR_API_KEY is not set - API is unauthenticated\n");
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      // CORS gate — runs before auth and routing so FHIR, static and error routes are all covered.
      if (corsRestricted) {
        res.setHeader("Vary", "Origin");
        corsApplied.set(res, "");
        const origin = req.headers.origin;
        if (origin) {
          if (allowedOrigins.includes(origin)) { res.setHeader("Access-Control-Allow-Origin", origin); corsApplied.set(res, origin); }
          else { res.statusCode = 403; json(res, { error: "Origin not allowed" }); return; }
        }
      }
      // CORS preflight — never requires auth.
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, X-API-Key, Content-Type");
        if (!corsRestricted) res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(); return;
      }
      // Opt-in auth (DR_API_KEY) — checked before any body parsing or route work.
      if (apiKey) {
        const exempt = req.method === "GET" && (url.pathname === "/" || url.pathname === "/api/status" || url.pathname.endsWith(".html"));
        if (!exempt) {
          const authHeader = req.headers.authorization;
          const bearer = typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
          const xh = req.headers["x-api-key"];
          const xApiKey = Array.isArray(xh) ? xh[0] : xh;
          const okBearer = keyMatches(bearer, apiKey);
          const okXApiKey = keyMatches(xApiKey, apiKey);
          if (!(okBearer || okXApiKey)) {
            res.statusCode = 401;
            res.setHeader("WWW-Authenticate", "Bearer");
            json(res, { error: "Unauthorized" }); return;
          }
        }
      }
      const w = world();
      if (apiRoutes(req, res, w, url)) return;
      if (url.pathname.startsWith("/api/")) {
        res.statusCode = 404; json(res, { error: `no route for ${req.method ?? "GET"} ${url.pathname}` }); return;
      }
      let fp = path.join(publicDir, url.pathname === "/" ? "index.html" : url.pathname);
      if (!fp.startsWith(publicDir)) { res.statusCode = 403; json(res, { error: "Forbidden" }); return; }
      const ext = path.extname(fp);
      res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
      fs.readFile(fp, (err, data) => {
        if (err) { res.statusCode = 404; json(res, { error: "Not found" }); return; }
         if (ext === ".html" && apiKey) {
           // Inject auth config + global fetch polyfill so ALL dashboards auto-auth
           // Key MUST be set before the polyfill reads it (scripts execute top-to-bottom).
            const script = '<script>window.__DR_API_KEY="' + apiKey + '"</script>' +
              '<script>(function(){var k=window.__DR_API_KEY;if(k&&typeof window.fetch!=="undefined"){var f=window.fetch;window.fetch=function(u,o){return f(u,Object.assign({},o,{headers:Object.assign({},o?o.headers:{},{"Authorization":"Bearer "+k}))}})}})()</script>';
          const html = data.toString("utf8").replace("</head>", script + "</head>");
          res.end(html);
        } else {
          res.end(data);
        }
      });
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: String(e) }));
    }
  });
  return {
    listen(port: number, host?: string) {
      // BIND_HOST (co-host deployments): bind an explicit address, e.g.
      // 127.0.0.1, so the server never listens on a public interface.
      // Unset = today's behavior (all interfaces) — local dev, tests and
      // the Docker image are unchanged. No cli change needed: the
      // deployment sets BIND_HOST in the service environment.
      const h = host ?? process.env.BIND_HOST;
      if (h) server.listen(port, h);
      else server.listen(port);
    },
    close() { server.close(); },
  };
}
