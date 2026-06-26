import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { World } from "../engine/world.js";
import { formatHospitalTime } from "../engine/clock.js";

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
      stockTxns: w.state.stockTransactions.size,
    }); return true;
  }
  if (p === "/api/patients") { json(res, toArr(w.state.patients)); return true; }
  if (p.startsWith("/api/patients/") && p.split("/").length === 4) {
    const id = p.split("/")[3]; const pt = w.state.patients.get(id ?? "");
    if (pt) json(res, pt); else { res.statusCode = 404; json(res, { error: "Not found" }); } return true;
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
