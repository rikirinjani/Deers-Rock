# Phase G1/G2 — Sandbox Contract & Runtime Report

**Phase:** G (Productization) · **Date:** 2026-09-10
**Verdict:** G1/G2 READY
**Scope:** Deers Rock only. Additive productization; scientific core unchanged.

---

## 1. G1 contract specification

`docs/productization/SANDBOX-CONTRACT.md` (frozen MVP-1). Control surface `/sandbox/*` + `/fhir/*`
(default :3100); data surface `/api/*` = the existing DR REST server (default :3000).
Full request/response schemas, error codes (400/404/409/501/503), and a binding capability
classification (SUPPORTED BY CURRENT DR / SUPPORTED THROUGH ADAPTER / NOT CURRENTLY SUPPORTED).

## 2. G2 implementation summary

- **Lifecycle** (`src/sandbox/session.ts`): `createSession` (explicit integer seed required;
  ephemeral — `createWorld(patients, undefined, seed)`), `stepSession`, `resetSession`
  (recreate from seed, not snapshot restore), `sessionStatus`, single-active registry.
- **Control server** (`src/sandbox/server.ts`): routes for create/status/step/reset/delete/health,
  scenario (501), and the activated FHIR Patient/Observation endpoints.
- **Composition** (`src/sandbox/index.ts`): starts the control server **and** the existing DR REST
  server bound to the active session's world. Two listeners (rationale: single-port composition
  would need to export `apiRoutes` from `src/api/rest.ts` — a core seam, avoided per D-7).
- **CLI** (`src/sandbox/cli.ts`): `npx tsx src/sandbox/cli.ts [controlPort] [dataPort]`.

## 3. Files created / modified

**Created (all additive):**
- `src/sandbox/session.ts`, `src/sandbox/server.ts`, `src/sandbox/index.ts`, `src/sandbox/cli.ts`
- `tests/sandbox.test.ts`, `tests/core-isolation.test.ts` (tests live in `tests/`, per repo
  convention — `tsconfig.json` excludes `tests/`, so test files never reach `dist/`)
- `docs/productization/SANDBOX-CONTRACT.md`, `docs/productization/README.md`, `docs/productization/PHASE-G1-G2-REPORT.md`

**Modified:** none. `git status` confirms **no core `src/` file changed** (only new `src/sandbox/`
+ `docs/productization/`).

## 4. API endpoint inventory (new control surface)

| Method | Path |
|---|---|
| GET | `/sandbox/health` |
| POST | `/sandbox/sessions` |
| GET | `/sandbox/sessions/{id}/status` |
| POST | `/sandbox/sessions/{id}/step` |
| POST | `/sandbox/sessions/{id}/reset` |
| POST | `/sandbox/sessions/{id}/scenario` (501) |
| DELETE | `/sandbox/sessions/{id}` |
| GET | `/fhir/Patient`, `/fhir/Patient/{id}`, `/fhir/Observation?patient=` |

Data surface = the existing DR REST API (`/api/*`) — unchanged, reused, not duplicated.

## 5. FHIR activation status

**Activated through the productization boundary.** `createFhirEndpoints` (previously defined but
unmounted) is now mounted by the sandbox for Patient + Observation (D-6). The existing encounter
Bundle (`/api/fhir/encounter/{id}`) remains on the data surface. No FHIR expansion beyond the
approved MVP.

## 6. Determinism / reset semantics

- Explicit integer `seed` required; no `Date.now()` fallback; no wall-clock auto-advance.
- Same seed + configuration + step sequence ⇒ same trajectory (verified).
- **`reset`** = recreate the world from the same seed/config → `tick 0`. It is **not** a restore of
  an arbitrary historical snapshot; internal snapshot/replay mechanics are not exposed.
- Sessions are ephemeral: no journal path is passed; the research journal is never touched.

## 7. Core-isolation evidence

- `tests/core-isolation.test.ts` — **core-semantics guard**: a fixed core run
  (`createWorld(50, _, 42)` + 40 ticks) produces the identical fingerprint before and after two
  full sandbox lifecycles (seeds 999, 123) are created and stepped. ✅
- `git status` — no core `src/` file modified. ✅
- No hidden RNG/wall-clock introduced: the sandbox calls only `createWorld`/`step` with an explicit seed.

## 8. Test results

| Suite | Result |
|---|---|
| `src/sandbox/*` (17 tests: lifecycle, server, FHIR, isolation, malformed, unsupported, determinism, core guard) | **17/17 pass** |
| `npx tsc --noEmit` | **clean (exit 0)** |
| End-to-end smoke (create → step 120 → data surface 58 patients → FHIR → reset → delete) | **OK** |
| Full DR suite | **143/144 pass** — the single failure is the **pre-existing** `tests/world.test.ts > runs 1000+ ticks` timeout (fails in isolation; unrelated to the sandbox) |

## 9. Developer-start workflow

```bash
npm install
npx tsx src/sandbox/cli.ts                     # control :3100, data :3000
curl -X POST http://127.0.0.1:3100/sandbox/sessions \
  -H 'Content-Type: application/json' -d '{"seed":42,"patients":50}'
curl -X POST http://127.0.0.1:3100/sandbox/sessions/sbx-1/step \
  -H 'Content-Type: application/json' -d '{"ticks":120}'
curl http://127.0.0.1:3000/api/patients        # data surface
curl http://127.0.0.1:3100/fhir/Patient        # FHIR
curl -X POST http://127.0.0.1:3100/sandbox/sessions/sbx-1/reset
curl -X DELETE http://127.0.0.1:3100/sandbox/sessions/sbx-1
```

## 10. Architectural issues discovered

| # | Issue | Resolution |
|---|---|---|
| A-1 | `createWorld` resets module-global ID counters → concurrent worlds would collide | Confirms D-1 single-active session; enforced via 409 |
| A-2 | Single-port composition would require exporting `apiRoutes` from `src/api/rest.ts` (core seam) | **Reported, not done.** Sandbox runs two listeners instead (D-7 honoured) |
| A-3 | No public trigger for scenarios (only internal probability / macro-disaster override) | `/scenario` → 501 NOT CURRENTLY SUPPORTED; seam reported for a future phase |
| A-4 | `tests/world.test.ts` 1000-tick test times out (~330 s) | Pre-existing; outside Phase G scope; noted for the core team |
| A-5 | Data surface returns 500 when no session is active | Documented in the contract/README; create a session first |

## Verdict

### G1/G2 READY

The sandbox contract and runtime are operational, deterministic, isolated, and tested, with zero
modification to the DR scientific core. **Stopping here** — G3 (application-specific integration)
begins only after the project owner identifies the first medical-record/helper application (D-8).
