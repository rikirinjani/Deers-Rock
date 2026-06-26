import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { World } from "../engine/world.js";
import { formatHospitalTime } from "../engine/clock.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "..", "public");

export interface RestServer {
  listen(port: number): void;
  close(): void;
}

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

function json(res: http.ServerResponse, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(data));
}

function apiRoutes(req: http.IncomingMessage, res: http.ServerResponse, w: World, url: URL): boolean {
  const pathname = url.pathname;

  if (pathname === "/api/status") {
    const activeEncounters = Array.from(w.state.encounters.values()).filter(e => e.status === "active");
    const availableBeds = Array.from(w.state.beds.values()).filter(b => b.patientId === null);
    json(res, {
      time: formatHospitalTime(w.clock),
      tick: w.clock.tick,
      patients: w.state.patients.size,
      activeEncounters: activeEncounters.length,
      availableBeds: availableBeds.length,
      waitingRoom: w.state.waitingRoom,
      totalBeds: w.state.beds.size,
      labOrders: w.state.labOrders.size,
      medicationOrders: w.state.medicationOrders.size,
      nurseNotes: w.state.nurseNotes.size,
      physicianOrders: w.state.physicianOrders.size,
    });
    return true;
  }

  if (pathname === "/api/patients") {
    json(res, Array.from(w.state.patients.values()));
    return true;
  }

  if (pathname.startsWith("/api/patients/") && pathname.split("/").length === 4) {
    const id = pathname.split("/")[3];
    const patient = w.state.patients.get(id ?? "");
    if (patient) json(res, patient);
    else { res.statusCode = 404; json(res, { error: "Patient not found" }); }
    return true;
  }

  if (pathname === "/api/encounters") {
    json(res, Array.from(w.state.encounters.values()));
    return true;
  }

  if (pathname === "/api/beds") {
    const beds = Array.from(w.state.beds.values());
    const byWard: Record<string, { total: number; occupied: number }> = {};
    for (const b of beds) {
      if (!byWard[b.ward]) byWard[b.ward] = { total: 0, occupied: 0 };
      byWard[b.ward]!.total++;
      if (b.patientId) byWard[b.ward]!.occupied++;
    }
    json(res, { beds, byWard });
    return true;
  }

  if (pathname === "/api/labs") {
    json(res, Array.from(w.state.labOrders.values()).reverse());
    return true;
  }

  if (pathname === "/api/medications") {
    json(res, Array.from(w.state.medicationOrders.values()).reverse());
    return true;
  }

  if (pathname === "/api/nursing") {
    json(res, Array.from(w.state.nurseNotes.values()).reverse());
    return true;
  }

  if (pathname === "/api/orders") {
    json(res, Array.from(w.state.physicianOrders.values()).reverse());
    return true;
  }

  if (pathname === "/api/summary") {
    const activeEncounters = Array.from(w.state.encounters.values()).filter(e => e.status === "active");
    const pendingLabs = Array.from(w.state.labOrders.values()).filter(o => o.status === "ordered").length;
    const pendingMeds = Array.from(w.state.medicationOrders.values()).filter(o => o.status === "ordered").length;
    const activeOrders = Array.from(w.state.physicianOrders.values()).filter(o => o.status === "active").length;
    json(res, {
      time: formatHospitalTime(w.clock),
      tick: w.clock.tick,
      census: { patients: w.state.patients.size, activeEncounters: activeEncounters.length, bedsAvailable: Array.from(w.state.beds.values()).filter(b => b.patientId === null).length, waiting: w.state.waitingRoom },
      labs: { total: w.state.labOrders.size, pending: pendingLabs, resulted: w.state.labOrders.size - pendingLabs },
      pharmacy: { total: w.state.medicationOrders.size, pending: pendingMeds, administered: Array.from(w.state.medicationOrders.values()).filter(o => o.status === "administered").length },
      nursing: { total: w.state.nurseNotes.size },
      physicians: { total: w.state.physicianOrders.size, active: activeOrders, completed: Array.from(w.state.physicianOrders.values()).filter(o => o.status === "completed").length },
    });
    return true;
  }

  return false;
}

export function createRestServer(world: () => World): RestServer {
  const server = http.createServer((req, res) => {
    const w = world();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (apiRoutes(req, res, w, url)) return;

    let filePath = path.join(publicDir, url.pathname === "/" ? "index.html" : url.pathname);
    if (!filePath.startsWith(publicDir)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end("Not found");
      } else {
        res.end(data);
      }
    });
  });

  return {
    listen(port: number) {
      server.listen(port);
    },
    close() {
      server.close();
    },
  };
}
