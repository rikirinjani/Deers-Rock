/**
 * Sandbox control server — productization layer (Phase G).
 *
 * Serves the `/sandbox/*` lifecycle contract and activates the EXISTING DR FHIR
 * Patient/Observation capability (`createFhirEndpoints`, previously unmounted).
 *
 * It does NOT serve the DR read surface (`/api/*`) — that is the existing DR REST
 * server, run alongside on its own port (see index.ts). This keeps the sandbox
 * additive and avoids any modification to `src/api/rest.ts`.
 */
import http from "node:http";
import { createFhirEndpoints } from "../api/fhir.js";
import {
  createSession,
  getActiveSession,
  setActiveSession,
  stepSession,
  resetSession,
  sessionStatus,
  type SandboxSession,
} from "./session.js";

function json(res: http.ServerResponse, code: number, obj: unknown): void {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error("malformed JSON body")); }
    });
    req.on("error", reject);
  });
}

function requireSession(id: string): SandboxSession | null {
  const s = getActiveSession();
  if (!s || s.id !== id) return null;
  return s;
}

export function createSandboxControlServer(): http.Server {
  const fhir = createFhirEndpoints(() => {
    const s = getActiveSession();
    if (!s) throw new Error("no active sandbox session");
    return s.world;
  });

  return http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const p = url.pathname;

      // ---- health -----------------------------------------------------------
      if (method === "GET" && p === "/sandbox/health") {
        return json(res, 200, { status: "ok", activeSession: getActiveSession()?.id ?? null });
      }

      // ---- create session ---------------------------------------------------
      if (method === "POST" && p === "/sandbox/sessions") {
        if (getActiveSession()) {
          return json(res, 409, { error: "a sandbox session is already active (single-active semantics); DELETE it first" });
        }
        let body: Record<string, unknown>;
        try { body = await readBody(req); } catch (e) { return json(res, 400, { error: String((e as Error).message) }); }
        try {
          const session = createSession({ seed: body.seed as number, patients: body.patients as number | undefined });
          setActiveSession(session);
          return json(res, 201, { sessionId: session.id, seed: session.seed, patients: session.patients, tick: 0 });
        } catch (e) {
          return json(res, 400, { error: String((e as Error).message) });
        }
      }

      // ---- session-scoped routes -------------------------------------------
      const m = p.match(/^\/sandbox\/sessions\/([^/]+)\/(status|step|reset|scenario)$/);
      if (m) {
        const id = decodeURIComponent(m[1]!);
        const action = m[2]!;
        const session = requireSession(id);
        if (!session) return json(res, 404, { error: `no active session '${id}'` });

        if (method === "GET" && action === "status") return json(res, 200, sessionStatus(session));

        if (method === "POST" && action === "step") {
          let body: Record<string, unknown>;
          try { body = await readBody(req); } catch (e) { return json(res, 400, { error: String((e as Error).message) }); }
          const ticks = body.ticks === undefined ? 1 : body.ticks;
          try { stepSession(session, ticks as number); return json(res, 200, sessionStatus(session)); }
          catch (e) { return json(res, 400, { error: String((e as Error).message) }); }
        }

        if (method === "POST" && action === "reset") {
          resetSession(session);
          return json(res, 200, sessionStatus(session));
        }

        if (method === "POST" && action === "scenario") {
          // No public DR trigger for arbitrary scenarios exists (the only activation
          // path is internal to the scenario handler / macro-disaster override).
          return json(res, 501, {
            error: "scenario triggering is not currently supported through the public DR API",
            status: "NOT CURRENTLY SUPPORTED",
            note: "DR scenarios activate internally by probability; a first-class trigger export would be required (core seam — reported, not modified).",
          });
        }
      }

      if (method === "DELETE" && /^\/sandbox\/sessions\/[^/]+$/.test(p)) {
        const id = decodeURIComponent(p.split("/")[3]!);
        const session = requireSession(id);
        if (!session) return json(res, 404, { error: `no active session '${id}'` });
        setActiveSession(null);
        res.statusCode = 204;
        return res.end();
      }

      // ---- FHIR (activated existing capability; Patient + Observation) -------
      if (method === "GET" && p === "/fhir/Patient") {
        if (!getActiveSession()) return json(res, 503, { error: "no active sandbox session" });
        const name = url.searchParams.get("name") ?? undefined;
        const resources = fhir.patientSearch(name);
        return json(res, 200, { resourceType: "Bundle", type: "searchset", total: resources.length, entry: resources.map((r) => ({ resource: r })) });
      }
      if (method === "GET" && p.startsWith("/fhir/Patient/")) {
        if (!getActiveSession()) return json(res, 503, { error: "no active sandbox session" });
        const id = decodeURIComponent(p.slice("/fhir/Patient/".length));
        const r = fhir.patientLookup(id);
        if (!r) return json(res, 404, { error: `Patient/${id} not found` });
        return json(res, 200, r);
      }
      if (method === "GET" && p === "/fhir/Observation") {
        if (!getActiveSession()) return json(res, 503, { error: "no active sandbox session" });
        const patient = url.searchParams.get("patient");
        if (!patient) return json(res, 400, { error: "query parameter 'patient' is required" });
        const resources = fhir.observationList(patient);
        return json(res, 200, { resourceType: "Bundle", type: "searchset", total: resources.length, entry: resources.map((r) => ({ resource: r })) });
      }

      return json(res, 404, { error: `no route for ${method} ${p}` });
    } catch (e) {
      return json(res, 500, { error: String((e as Error).message) });
    }
  });
}
