# Deers Rock Sandbox — Developer Guide

A synthetic-hospital sandbox for testing healthcare / medical-record helper
applications. The **DR scientific core is unchanged**; the sandbox is an additive
productization layer under `src/sandbox/`.

- **Control surface** (`/sandbox/*`, `/fhir/*`): `http://127.0.0.1:3100`
- **Data surface** (`/api/*`, static UI): the existing DR REST server, `http://127.0.0.1:3000`

See [`SANDBOX-CONTRACT.md`](./SANDBOX-CONTRACT.md) for the full contract, and
[`PHASE-G0-RECONNAISSANCE.md`](./PHASE-G0-RECONNAISSANCE.md) for the architecture.

---

## Quick start

```bash
# from the Deers-Rock repository root
npm install
npx tsx src/sandbox/cli.ts          # control :3100, data :3000
```

Then, in another shell:

```bash
# 1. create a reproducible session
curl -s -X POST http://127.0.0.1:3100/sandbox/sessions \
  -H 'Content-Type: application/json' \
  -d '{"seed":42,"patients":50}'
# → {"sessionId":"sbx-1","seed":42,"patients":50,"tick":0}

# 2. advance the hospital deterministically
curl -s -X POST http://127.0.0.1:3100/sandbox/sessions/sbx-1/step \
  -H 'Content-Type: application/json' -d '{"ticks":120}'
# → {"sessionId":"sbx-1","tick":120,"hospitalTime":"Day 1 02:00", ...}

# 3. query hospital data on the data surface
curl -s http://127.0.0.1:3000/api/patients?q=siti
curl -s http://127.0.0.1:3000/api/encounters
curl -s http://127.0.0.1:3000/api/summary

# 4. FHIR (control surface)
curl -s http://127.0.0.1:3100/fhir/Patient
curl -s http://127.0.0.1:3100/fhir/Patient/<id>
curl -s "http://127.0.0.1:3100/fhir/Observation?patient=<id>"

# 5. reset to the reproducible initial state
curl -s -X POST http://127.0.0.1:3100/sandbox/sessions/sbx-1/reset

# 6. terminate
curl -s -X DELETE http://127.0.0.1:3100/sandbox/sessions/sbx-1 -o /dev/null -w "%{http_code}\n"
```

Environment overrides: `SANDBOX_CONTROL_PORT`, `SANDBOX_DATA_PORT`
(or pass them as the first two CLI args).

---

## How deterministic seeds work

- A session **requires an explicit integer seed**. There is no `Date.now()` fallback.
- The same `seed` + configuration produces the same trajectory under the same
  `/step` sequence — ideal for repeatable software tests.
- **`reset`** recreates the world from the same seed (back to `tick 0`). It is not
  a snapshot restore.
- There is **no wall-clock auto-advance**: the hospital only moves when you call `/step`.
- Sessions are **ephemeral** — no journal file is created; the research journal is never touched.

## Session semantics

- **One active session at a time** (single-active). Creating a second returns `409`;
  `DELETE` the first, then create again.
- State is isolated per lifecycle: delete → recreate with the same seed reproduces
  the same initial state.

## What you can read today

Via the **data surface** (`:3000`) — the existing DR REST API:
`/api/patients` (+`?q=`, `/by-mrn/`, `/{id}`), `/api/encounters`, `/api/beds`,
`/api/labs`, `/api/radiology`, `/api/medications`, `/api/surgery`, `/api/nursing`,
`/api/orders`, `/api/emergency`, `/api/charts`, `/api/inventory`, `/api/summary`,
`/api/report`, `/api/sirs/*`, `/api/scenarios` (list), `/api/journal`,
`/api/snapshots`, `/api/fhir/encounter/{id}`.

Via the **control surface** (`:3100`): `/fhir/Patient`, `/fhir/Patient/{id}`,
`/fhir/Observation?patient=`.

Not currently supported: scenario triggering, auth, FHIR resources beyond Patient
and Observation. See the contract's classification table.

---

## Architecture boundary

```
Healthcare applications
        │  HTTP / FHIR
        ▼
DR Sandbox layer  (src/sandbox/ — additive, removable)
  lifecycle · FHIR mount · config
        │  imports only the DR public API
        ▼
Deers Rock Core  (frozen scientific artifact — unchanged)
```

The sandbox does **not** modify the scientific core, its state-transition logic,
the research journal, snapshots, or frozen evidence. Removing `src/sandbox/` leaves
the scientific simulator intact.

## Tests

```bash
npx vitest run src/sandbox
```

Covers session create/status/step/reset/delete, single-active enforcement, malformed
requests, unsupported operations, FHIR Patient/Observation, lifecycle isolation,
deterministic repeated execution, and a **core-semantics guard** proving sandbox
activity does not change core determinism.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `409` on `POST /sandbox/sessions` | A session is already active — `DELETE` it first. |
| `503` on `/fhir/*` | No active session — create one. |
| `400` "seed is required…" | Pass an integer `seed` in the body. |
| `501` on `/scenario` | Scenario triggering is not supported via the public API yet. |
| Data routes 500 | The data surface returns 500 when no session is active — create one first. |
| Port in use | Set `SANDBOX_CONTROL_PORT` / `SANDBOX_DATA_PORT`. |
