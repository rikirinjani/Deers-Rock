# DR Sandbox — Application Contract (G1)

**Phase:** G (Productization)
**Version:** MVP-1 (2026-09-10)
**Status:** Frozen for G1/G2. Additive to the frozen DR scientific core.

---

## Purpose

A stable external contract so a medical-record/helper application can drive a
synthetic Deers Rock hospital, read structured clinical/hospital data, and
reset/reproduce the environment for repeatable software testing — without
touching the DR scientific core.

## Surfaces

```
sandbox lifecycle  ──►  DR world (ephemeral, seeded)  ──►  existing DR REST/FHIR read surface
   (/sandbox/*)              (one active session)              (/api/* on the data port)
```

Two listeners (see `index.ts`):
- **Control surface** — `/sandbox/*`, `/fhir/*` — default port **3100**.
- **Data surface** — `/api/*` + static UI — the existing DR REST server — default port **3000**.

Composing both onto one listener would require exporting `apiRoutes` from
`src/api/rest.ts` (a non-semantic core seam). To honour the zero-core-modification
constraint, the sandbox leaves that file untouched and runs the existing server as-is.

---

## Lifecycle endpoints (control surface)

### `GET /sandbox/health`
→ `200 { "status": "ok", "activeSession": string|null }`

### `POST /sandbox/sessions`
Body: `{ "seed": number (integer, required), "patients"?: number (default 50) }`
→ `201 { "sessionId": string, "seed": number, "patients": number, "tick": 0 }`
Errors: `400` invalid/missing seed or patients · `409` a session is already active (single-active).

### `GET /sandbox/sessions/{sessionId}/status`
→ `200 { sessionId, seed, patients, tick, hospitalTime, patientsTotal, activeEncounters, bedsAvailable }`
Errors: `404` no such active session.

### `POST /sandbox/sessions/{sessionId}/step`
Body: `{ "ticks"?: number (default 1, non-negative integer) }`
→ `200` status object (post-step)
Errors: `400` invalid ticks · `404` no such session.

### `POST /sandbox/sessions/{sessionId}/reset`
→ `200` status object at `tick: 0`
Semantics: recreate the world from the **same seed/config** (see *Determinism*).
Errors: `404`.

### `POST /sandbox/sessions/{sessionId}/scenario`
Body: `{ "type": string }`
→ `501 { "error": ..., "status": "NOT CURRENTLY SUPPORTED", "note": ... }`
Reason: DR scenarios activate internally by probability; no public trigger is exported.

### `DELETE /sandbox/sessions/{sessionId}`
→ `204` (session destroyed; registry cleared)
Errors: `404`.

---

## FHIR endpoints (control surface) — activated existing capability

| Endpoint | Returns |
|---|---|
| `GET /fhir/Patient` | `Bundle` (searchset) of Patient resources |
| `GET /fhir/Patient?name={substr}` | `Bundle` filtered by name substring |
| `GET /fhir/Patient/{id}` | a single Patient resource, or `404` |
| `GET /fhir/Observation?patient={id}` | `Bundle` of Observation resources (vitals) |

Backed by the existing `createFhirEndpoints` (previously defined but unmounted).
Errors: `503` when no session is active · `400` missing `patient` param.

The existing encounter Bundle remains available on the **data** surface at
`GET /api/fhir/encounter/{id}`.

---

## Capability classification (binding)

| Capability | Classification |
|---|---|
| Session create / status / step / reset / delete / health | **NOT CURRENTLY SUPPORTED** by DR (provided by the sandbox layer) |
| Explicit deterministic seed | **SUPPORTED BY CURRENT DR** (via `createWorld(_, _, seed)`) |
| Patient list / search / retrieve | **SUPPORTED BY CURRENT DR** (`/api/patients*`) |
| Encounter retrieval | **SUPPORTED BY CURRENT DR** (`/api/encounters`) |
| Beds / occupancy | **SUPPORTED BY CURRENT DR** (`/api/beds`) |
| Labs / radiology / medications / orders | **SUPPORTED BY CURRENT DR** (`/api/labs`, `/api/radiology`, `/api/medications`, …) |
| Hospital summary / reports | **SUPPORTED BY CURRENT DR** (`/api/summary`, `/api/report`, `/api/sirs/*`) |
| FHIR Patient + Observation | **SUPPORTED THROUGH ADAPTER** (existing endpoints, now mounted) |
| FHIR encounter Bundle | **SUPPORTED THROUGH ADAPTER** (`/api/fhir/encounter/{id}`) |
| Scenario triggering | **NOT CURRENTLY SUPPORTED** (no public trigger) |
| Auth / multi-tenancy | **NOT CURRENTLY SUPPORTED** (deferred, D-4) |
| FHIR Encounter / DiagnosticReport / MedicationRequest resources | **NOT CURRENTLY SUPPORTED** |
| Clinical decision support / diagnosis inference | **NOT SUPPORTED** (out of scope; DR is not a clinical system) |

---

## Determinism and reset semantics

- A session created with `seed = X` is **reproducible** under explicit stepping:
  the same seed and configuration yield the same trajectory.
- **`reset session`** = *recreate the world from the same seed/config* → returns to
  `tick 0`. It is **not** a restore of an arbitrary historical snapshot. Internal
  snapshot/replay mechanics are intentionally **not exposed** by the MVP.
- No wall-clock auto-advance: the sandbox only advances via `/step`.
- Sessions are **ephemeral**: created without a journal path; the research journal
  (`world-journal.db`) and frozen artifacts are never touched.

## Hidden internals

The contract exposes only: session id/seed/patients/tick/time and census counters.
It does **not** expose the handler pipeline, RNG internals, snapshot files, module
globals, or the research journal.
