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
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

export function createRestServer(world: () => World): RestServer {
  const server = http.createServer((req, res) => {
    const w = world();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/api/status") {
      const activeEncounters = Array.from(w.state.encounters.values()).filter(e => e.status === "active");
      const availableBeds = Array.from(w.state.beds.values()).filter(b => b.patientId === null);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify({
        time: formatHospitalTime(w.clock),
        tick: w.clock.tick,
        patients: w.state.patients.size,
        activeEncounters: activeEncounters.length,
        availableBeds: availableBeds.length,
        waitingRoom: w.state.waitingRoom,
        totalBeds: w.state.beds.size,
      }));
      return;
    }

    if (url.pathname === "/api/patients") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(Array.from(w.state.patients.values())));
      return;
    }

    if (url.pathname.startsWith("/api/patients/")) {
      const id = url.pathname.split("/")[3];
      const patient = w.state.patients.get(id ?? "");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (patient) {
        res.end(JSON.stringify(patient));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Patient not found" }));
      }
      return;
    }

    if (url.pathname === "/api/encounters") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify(Array.from(w.state.encounters.values())));
      return;
    }

    if (url.pathname === "/api/beds") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      const beds = Array.from(w.state.beds.values());
      const byWard: Record<string, { total: number; occupied: number }> = {};
      for (const b of beds) {
        if (!byWard[b.ward]) byWard[b.ward] = { total: 0, occupied: 0 };
        byWard[b.ward]!.total++;
        if (b.patientId) byWard[b.ward]!.occupied++;
      }
      res.end(JSON.stringify({ beds, byWard }));
      return;
    }

    if (url.pathname === "/api/feed") {
      const activeEncounters = Array.from(w.state.encounters.values()).filter(e => e.status === "active");
      const recentEncounters = Array.from(w.state.encounters.values())
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 20);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(JSON.stringify({ activeEncounters: activeEncounters.length, recentEncounters }));
      return;
    }

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
