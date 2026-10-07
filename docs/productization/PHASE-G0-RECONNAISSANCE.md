# Phase G0 — Productization Reconnaissance & Architecture

**Phase:** G (Productization & Application Sandbox)
**Date:** 2026-09-10
**Scope:** Deers Rock only. The scientific artifact is frozen; this phase is engineering.
**Status:** G0 complete — architecture and MVP boundary proposed. **No implementation yet.**

---

## 1. Current DR architecture relevant to external applications

**Entry points (`src/index.ts` public API):**
- `createWorld(patientCount = 100, journalPath?, seed?)` — builds a fresh world.
- `step(world)` / `runWorld(...)` — advance the simulation.
- `resumeWorld(state, startTick, journalPath)` — restore from a snapshot.
- `createClock`, `createState`, `EventQueue`, plus patient/agent/identity generators.

**Temporal model:** 1 tick = 1 simulated minute; clock speed multiplier 60×; `formatHospitalTime` for display.

**State model (`src/engine/state-store.ts`, `HospitalState`):** patients, encounters, beds (+wardCapacity, waitingRoom), labOrders, radiologyOrders, medicationOrders, surgeryOrders, nurseNotes, physicianOrders, edTriages, respiratoryOrders, dietOrders, socialWorkNotes, medicalCharts, charges, insuranceClaims, payments, inventory, stockTransactions, morgue, agents, referral, scenarios, learning/outcome memory, and per-domain sub-states (blood bank, microbiology, pathology, CSSD, biomedical, IPC, clinical nutrition, radiotherapy, dialysis).

**Patient/clinical models (`src/patient/schema.ts`):** `Patient`, `Vitals`, `Diagnosis`, `Medication`, `Encounter`, `Bed`, `LabOrder`, `MedicationOrder`, `NurseNote`, `PhysicianOrder`, `RadiologyOrder`, `SurgeryOrder`, `RespiratoryOrder`, `DietOrder`, `SocialWorkNote`, `EdTriage`, `MedicalChart`, `Charge`, `InsuranceClaim`, `Payment`, `InventoryItem`, `StockTransaction`.

**Persistence (`src/engine/journal.ts`):** SQLite (`better-sqlite3`), WAL mode, bounded 100-tick event window; full-state snapshots every 100 ticks, most recent 5 retained.

**Handler pipeline (`src/engine/world.ts`):** 38 domain handlers in fixed order + post-chain processors + event-dispatch handlers.

**Existing external surface:** a REST server (`src/api/rest.ts`, ~80 routes) and a static web UI (`public/index.html`, `public/bi.html`).

---

## 2. Existing API / FHIR capabilities

**REST (`createRestServer`, `src/api/rest.ts`)** — already substantial:
- Patients: `GET /api/patients`, `/api/patients?q=`, `/api/patients/{id}`, `/api/patients/by-mrn/{mrn}`, `/api/patients/identity`.
- Clinical: `/api/encounters`, `/api/beds` (by ward/building), `/api/labs`, `/api/radiology`, `/api/medications`, `/api/surgery`, `/api/nursing`, `/api/orders`, `/api/emergency`, `/api/respiratory`, `/api/diet`, `/api/social`, `/api/charts`, `/api/outpatient`, `/api/morgue`.
- Finance/ops: `/api/charges`, `/api/claims`, `/api/payments`, `/api/inventory`, `/api/inventory/low`.
- Reporting: `/api/report`, `/api/summary`, `/api/sirs/*` (many levels), `/api/bi/*` (census, financial, clinical, workforce, departments, trends).
- Agents/workforce: `/api/agents`, `/api/agents/summary`; `/api/referral*`; `/api/specialty`.
- Ops: `/api/scenarios` (list only), `/api/journal`, `/api/journal/stats`, `/api/snapshots`, `/api/snapshot/{tick}`, `/api/exports`, `/api/export/journal`, `/api/export/state`.

**FHIR:**
- `src/engine/fhir-export.ts` → `buildFhirBundle(state, encounterId)`, mounted at `GET /api/fhir/encounter/{id}`.
- `src/api/fhir.ts` → `createFhirEndpoints` (patientLookup, patientSearch, patientSearchByNarration/NIK, observationList) — **defined but NOT mounted** (dead code; no HTTP route).

**CLI (`src/cli/index.ts`):** `deers-rock up [port]`, `status`, `down`. `up` resumes from the journal if present, else `createWorld(50, journalPath)`, then **auto-steps one tick per second** (`setInterval`).

---

## 3. Existing application-facing gaps

| # | Gap | Impact on a helper application |
|---|---|---|
| G-1 | **Non-deterministic default seed** — `createWorld` uses `clockSeed = seed ?? Date.now()` | Cannot reproduce a sandbox run; tests are non-repeatable |
| G-2 | **No reset endpoint** | Cannot return a sandbox to a known state without restarting the process |
| G-3 | **No step/advance control** — the sim auto-runs on a wall-clock `setInterval` | An app cannot drive the clock deterministically (critical for testing) |
| G-4 | **No seed/configuration via CLI or API** | Cannot choose configuration/scenario/seed at start |
| G-5 | **No scenario trigger** — only `GET /api/scenarios` (list) | Cannot run a disaster/occupancy scenario on demand |
| G-6 | **FHIR Patient/Observation endpoints unmounted** (`createFhirEndpoints` dead) | FHIR-consuming apps only get encounter Bundles |
| G-7 | **No auth** and **no CORS** | Browser-based helper apps cannot call the API; no tenant isolation |
| G-8 | **Resume-on-start couples persistence to app sessions** | Restarting resumes prior state — undermines "start clean" |
| G-9 | **No developer documentation / OpenAPI / example client** | Another developer cannot self-serve the happy path |
| G-10 | **No health/readiness endpoint distinct from `/api/status`** | Orchestration/testing harder |

**Already usable today:** an app can `GET /api/patients`, `/api/encounters`, `/api/labs`, `/api/medications`, `/api/beds`, `/api/summary`, and `GET /api/fhir/encounter/{id}` against a running server. What is missing is **lifecycle control** (seed/reset/step/scenario) and the **mounted FHIR Patient/Observation** surface.

---

## 4. Proposed sandbox architecture

**Principle: additive, removable, no core changes.**

```
Deers Rock Core (frozen scientific artifact)   ← unchanged
        ▲  (imported via src/index.ts public API only)
        │  stable interface
Sandbox layer (new: src/sandbox/, removable)
  - lifecycle (create-with-seed, step, reset, scenario)
  - FHIR mount (Patient, Observation, encounter bundles)
  - config + fixtures
  - developer docs + example client
        ▲
        │ HTTP / FHIR
External applications
```

- The sandbox imports only the core's **public exports** (`createWorld`, `step`, `resumeWorld`, generators, `createFhirEndpoints`, `buildFhirBundle`). It must not reach into engine internals.
- The sandbox is a separate module (`src/sandbox/**`) plus an optional separate entry (`src/sandbox/server.ts` / `bin`), so deleting it leaves the scientific simulator intact.
- **Persistence isolation:** the sandbox must not write to the research journal. Default to an in-memory / ephemeral sandbox data dir; the research `world-journal.db` is never touched.
- **Determinism:** the sandbox requires an explicit seed; it does **not** auto-advance on wall-clock unless explicitly enabled.

---

## 5. Proposed MVP application contract

**Lifecycle (new — sandbox control):**
- `POST /sandbox/sessions` `{ seed, patients, scenario?, autoAdvanceMs? }` → `{ sessionId, tick, seed }`
- `GET  /sandbox/sessions/{id}/status` → `{ tick, time, patients, activeEncounters, bedsAvailable }`
- `POST /sandbox/sessions/{id}/step` `{ ticks: n }` → advance deterministically
- `POST /sandbox/sessions/{id}/reset` → back to tick 0 with the same seed
- `POST /sandbox/sessions/{id}/scenario` `{ type }` → trigger an existing scenario
- `DELETE /sandbox/sessions/{id}` → clean shutdown of the session
- `GET  /sandbox/health`

**Data (read-only — reuse the existing DR API per session):** patients, patient by id/MRN, encounters, labs, medications, observations (vitals), beds, summary.

**FHIR (mount the existing endpoints):**
- `GET /fhir/Patient`, `/fhir/Patient/{id}`, `/fhir/Patient?name=`
- `GET /fhir/Observation?patient={id}`
- `GET /api/fhir/encounter/{id}` (already present)

**Support classification (binding):**

| Capability | Status |
|---|---|
| Patient list/search/retrieve | **SUPPORTED BY CURRENT DR** |
| Encounter retrieval | **SUPPORTED BY CURRENT DR** |
| Beds / occupancy context | **SUPPORTED BY CURRENT DR** |
| Lab / radiology / medication orders | **SUPPORTED BY CURRENT DR** |
| Vitals → FHIR Observation | **SUPPORTED THROUGH ADAPTER** (endpoints exist, unmounted) |
| FHIR Patient | **SUPPORTED THROUGH ADAPTER** |
| Deterministic seed / reset / step / scenario | **NOT CURRENTLY SUPPORTED** (sandbox must add) |
| Auth / multi-tenant isolation | **NOT CURRENTLY SUPPORTED** |
| FHIR Encounter / DiagnosticReport / MedicationRequest resources | **NOT CURRENTLY SUPPORTED** (Patient + Observation only) |
| Clinical decision support / diagnosis inference | **NOT SUPPORTED** (out of scope — DR is not a clinical system) |

---

## 6. Integration strategy for the first OG medical application

**Finding:** no external helper-application source is present in the DR repository. Sibling projects exist (`Project_v2/pharmacy-automation`, `chatbot`, `Drug Platform`, `dqf-analyze`) but their intent as the "OG" target is unconfirmed.

Per the phase rules, do **not** fabricate an integration. Instead:
1. **Document the integration contract** (the MVP in §5) — the interface a helper app consumes.
2. **Identify the target application's needs** — AUTHOR ACTION: confirm which app is the first integration target and what workflow it must run (e.g. med-review, record lookup, coding).
3. **Implement the smallest compatible sandbox interface** — lifecycle + FHIR mount + the read-only data routes.
4. **Prepare a reference test client** (`examples/sandbox-client.ts`) demonstrating one meaningful workflow end-to-end: create session (seed) → find patient → fetch record → read observations → read medications → step → reset.

**First success criterion:** a real helper application can connect, run a meaningful workflow against synthetic data, and reset/reproduce.

---

## 7. Proposed G1–G7 implementation sequence

| Step | Deliverable | Notes |
|---|---|---|
| **G1** | `sandbox/contract.md` — the frozen MVP API contract (§5) | Small, useful; no invented data |
| **G2** | `sandbox/lifecycle.ts` + `sandbox/server.ts` — session create/step/reset/scenario/status/health, explicit seed, no wall-clock by default, ephemeral data dir | Core untouched |
| **G3** | Mount FHIR (`createFhirEndpoints` + encounter bundles) and add the reference client `examples/sandbox-client.ts` | First integration milestone |
| **G4** | `sandbox/scenarios.ts` + `sandbox/fixtures.ts` — reusable software-test scenarios (outpatient, inpatient, multi-encounter, med workflow, abnormal observation, high occupancy, disaster surge, missing data) | Software tests, not scientific experiments |
| **G5** | `docs/productization/README.md` + API reference + example requests/responses + FHIR samples + config/scenario/reset docs + troubleshooting | One obvious happy path |
| **G6** | `sandbox/*.test.ts` — contract, FHIR serialization, lookup, fixtures, reset, malformed requests, unsupported ops, state isolation; plus a **core-semantics guard test** proving sandbox activity does not alter DR core determinism | Proves isolation |
| **G7** | `docs/productization/PRODUCT-BOUNDARY.md` — research artifact vs product layer | Explicit boundary |

---

## 8. Architectural risks & decisions requiring approval

| # | Decision / risk | Recommendation | Needs approval |
|---|---|---|---|
| D-1 | **Single global world vs multiple concurrent sessions** | Start with a **single active session** (one sandbox = one world) for MVP; design the API with `sessionId` so multi-session is additive later | Yes |
| D-2 | **Persistence isolation** — sandbox must not touch the research journal | Sandbox defaults to an **ephemeral data dir**; research `world-journal.db` never used | Yes (confirm) |
| D-3 | **Determinism** — default seed must be explicit | Sandbox **requires** a seed; no `Date.now()` fallback; no wall-clock auto-advance unless requested | Yes (confirm) |
| D-4 | **Auth** | MVP: optional bearer token (`SANDBOX_TOKEN`); no auth by default for localhost | Yes |
| D-5 | **CORS** | Enable permissive CORS for the sandbox (browser helper apps), off by default for the core server | Yes |
| D-6 | **FHIR scope** | Mount **Patient + Observation only** (matches the frozen limitation); do not add Encounter/DiagnosticReport/MedicationRequest resources | Yes (confirm) |
| D-7 | **Core modification** | **None.** If any core change is required, stop and report — the sandbox must remain additive | Yes (binding) |
| D-8 | **Target application** | Identify the first OG helper app and its workflow | AUTHOR ACTION |

**No implementation begins until D-1…D-3 and D-7 are confirmed.**

---

## Deliverable status

- **G0 reconnaissance:** complete (this document).
- **Implementation:** not started (per instruction).
- **Next:** confirm D-1…D-3/D-7, then begin G1 (contract) and G2 (lifecycle/server).
