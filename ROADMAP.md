# Deer's Rock HOE — Roadmap

**Last updated:** 2026-10-07
**Steward:** Coordinator OC

---

## Epic I — Core Simulation Reliability

The simulation must run without data loss, without unbounded storage growth, and with reliable persistence across restarts.

### Milestone 1.1: Storage Stability ✅
- [x] SQLite persistent event journal with append-only logging
- [x] Snapshot save/restore (every 20 ticks)
- [x] Journal purge retaining 100 ticks (PURGE_INTERVAL=50)
- [x] Hard purge on startup to prevent SQLITE_FULL
- [x] Incremental vacuum after large purges

### Milestone 1.2: Agent & Referral Persistence ✅
- [x] Persist `_agentState` (fatigue, health, shifts, assignments) in snapshots — journal serializes both
- [x] Persist `_referralState` (facilities, letters, pipeline) in snapshots
- [x] Verify round-trip in snapshot tests (`tests/persistence.test.ts`)
- See ADR-003

### Milestone 1.3: Data Pruning ✅
- [x] MAX constants defined: MAX_NURSING=300, MAX_CHARGES=100, MAX_ENCOUNTERS=500
- [x] Pruning runs every 10 ticks via `cleanupHandler`
- [x] Tests verify bounded growth (`tests/pruning.test.ts`)
- [x] Bounded collection growth per Constitution IV §4.2

### Milestone 1.4: Throughput Balance ✅
- [x] LOS increased from 4-12 to 360-1440 ticks (Platform OC)
- [x] Morgue ceiling removed (deaths now uncapped)
- [x] `DR_ADMISSION_RATE` env var (default 2.0) for admission tuning
- [x] Admission/discharge balanced: full occupancy by tick ~1000, discharges fire at tick ~4600 (LOS=3-7 days)
- [x] Waiting room buffer verified (tests/waiting-room.test.ts)
- [x] Waiting room functions under load (`tests/waiting-room.test.ts`)

### Milestone 1.5: Snapshot Test Fix ✅
- [x] Fix `tests/snapshot.test.ts` timeout (5s → 15s)

---

## Epic II — Clinical Fidelity

Make the simulation believable enough that experiments are meaningful. The goal is not exhaustive clinical depth but sufficient fidelity for controlled experiments.

### Milestone 2.1: Protocol Coverage ✅
- [x] ICD codes expanded from 40 to 147 (ADR-010/013)
- [x] Add protocols for remaining uncovered codes (165 protocols total)
- [x] Ensure every diagnosis has a corresponding protocol or explicit default
- [x] Fix specialty mappings for new codes

### Milestone 2.2: Formulary Expansion ✅
- [x] Expand from 22 to 205 drugs across 36 categories (ADR-010, ADR-012, M9.4)
- [x] Add drug-drug and drug-diagnosis interaction rules (~100 pairs)
- [ ] Ensure pharmacy allergy detection is testable — calibration gap: simulation rate 60-70% vs real 3-5% (documented in calibration-benchmarks.md; flagged by reviewer 2026-10-09)

### Milestone 2.3: AI Test Coverage ✅
- [x] Maintain AI Doctor tests (action selection, duplication prevention) ✅
- [x] Maintain AI Nurse tests (vitals alerts, nursing notes) ✅
- [x] Maintain AI Pharmacy tests (interaction checks, dispense) ✅
- [x] Add M&M Conference tests ✅ (4 tests, mm-conference.test.ts)
- [x] Add Calendar tests ✅ (12 tests, calendar.test.ts)
- [x] Add Morgue/Death roll tests ✅ (6 tests, morgue-outpatient.test.ts)
- [x] Add Outpatient tests ✅ (6 tests, morgue-outpatient.test.ts)
- [x] Add FHIR export tests ✅ (8 tests, fhir-compliance.test.ts)

### Milestone 2.4: Continuous Validation ✅
- [x] Run simulation for 1000+ ticks and verify invariants ✅
- [x] Load test: measure tick latency at 500+ patients ✅ (p95=3ms @ 500pt, 500 ticks)
- [x] 100k tick benchmark: 33.12s on Kaggle CPU, linear scaling confirmed

### Milestone 2.5: Model Calibration ✅
- [x] Document mortality risk factor weights with plausible clinical ranges (ADR-004)
- [x] LOS validation doc vs MoH RI Tier A data (`docs/benchmarks/los-validation.md`)
- [ ] Validate drug allergy prevalence rates against Indonesian pharmacovigilance data — **open gap**: simulation shows 60-70%, real prevalence is 3-5% (documented in calibration-benchmarks.md)
- [x] **Calibration benchmark table** vs Indonesian hospital data (`docs/benchmarks/calibration-benchmarks.md`)
- [x] **Calibration test suite** — BPJS share 80.2% ✅, allergy rate 68.8% (documented gap), BOR tracking
- [ ] Formal validation against real hospital data — deferred (aggregate data only available via RISNA login)

### Milestone 2.6: Scientific Validation Infrastructure ✅
- [x] Seeded RNG (ADR-008) — 148 `Math.random()` → `clock.rng()`
- [x] Generator seeding — `createWorld(50, "db", 42)` = identical output
- [x] Multi-run test harness — `src/experiment/runner.ts` (seedCount, ticks, scenario forcing)
- [x] Outcome recorder — per-run CSV/JSON export with CI/SD, deaths by ICD, LOS, occupancy
- [x] Learning toggle — `DR_FREEZE_LEARNING=1` freezes agent learning for controlled experiments (commit `21e99c8`)

---

## Epic III — Timeline Engine (Deferred)

Controlled counterfactual experiments: snapshot → branch → intervene → run → compare outcomes.

**Status:** All milestones complete. ADR-009 + ADR-019 implemented, 14 tests green.

### Milestone 3.1: Terminology & Modeling ✅
- [x] Concepts defined (ADR-009): Universe, Seed, Point of Rewind, Branch, Timeline, Genealogy
- [x] Slogan: "Counterfactuals by Construction"

### Milestone 3.2-3.5: Implementation ✅
- [x] Universe creation/get/list, Branch create/run/compare, 5 standard scenarios, ADR-019 journal isolation, avgLOS fix, 14 tests

---

## Epic IV — Data & Interoperability ✅

Make HOE data useful for analytics, reporting, and external system integration.

### Milestone 4.1: FHIR Resources ✅
- [x] Add `/fhir/Patient` search endpoint ✅
- [x] Add `/fhir/Observation` search endpoint ✅
- [x] Add `/fhir/Condition` endpoint ✅ (ADR-014, 2026-10-05)
- [x] Add `/fhir/Claim` endpoint ✅ (ADR-014, 2026-10-05)
- [x] Add `/fhir/Encounter` search endpoint ✅ (ADR-014, 2026-10-05)
- [x] FHIR R4 compliance tests ✅ (ADR-014, 8 tests)
- [x] FHIR Conformance Statement at `/api/fhir/metadata` ✅

### Milestone 4.2: Report Presentation 🟡
- [x] Replace JSON dump with styled HTML tables ✅ (`/report.html`, dark theme)
- [x] Export to CSV — patients, encounters, charges ✅ (`/api/export/*.csv`)
- [x] Fix report blood type detection to use `patient.rhesus` ✅
- [x] Add charts (Chart.js) to main dashboard ✅ (5 charts: occupancy, ward, encounters, clinical, diagnoses)
- [x] PDF export via browser print dialog ✅
- See EVALUATION-REPORT §7

### Milestone 4.3: CI/CD ✅
- [x] GitHub Actions: lint, typecheck, test on push ✅ (`.github/workflows/ci.yml`)
- [x] Railway auto-deploy from main — superseded by cokro-tech live box
- [x] Integration test suite (`tests/integration.test.ts`) — boot, 100-tick, determinism, snapshot round-trip, 500-tick endurance

---

## Epic V — Dashboard & UX

The single-page dashboard is the primary user interface. It must be usable at scale.

> **Audit 2026-10-26 (branch `epic-v-dashboard`):** the dashboard's main script had **not parsed since
> `fd96038` (2026-10-07, Epic IV charts)**: three Chart.js `options` objects were missing a closing brace,
> so no panel ever refreshed. The M5.2 pause/speed controls were also mis-scored ✅: they only changed the
> browser's poll interval, the simulation kept stepping, and the speed `<select>` had a stray quote in
> its `onchange`. Both are fixed below; the earlier ✅ marks are corrected.

### Milestone 5.1: Dashboard Overhaul ✅
- [x] Pagination for encounter table (50 rows/page) ✅
- [x] Search by patient ID ✅
- [x] Full search/filtering, date-range pickers ✅ (hospital-day from/to filter on the encounters table, 2026-10-26)
- [x] Loading indicator between refresh cycles ✅ (first-load overlay + header sync dot; the overlay existed but was never shown)
- [x] Dark/light theme toggle ✅ (header 🌓, remembered per browser)
- [x] Patient search by name/ID ✅ (`/api/encounters?q=` matches patient ID or name; dashboard search is server-side, debounced)

### Milestone 5.2: Admin & Controls ✅
- [x] Pause/resume simulation from dashboard ✅ — ~~toggle button + status indicator~~ *was dashboard-polling only;* now `POST /api/sim/pause|resume` on a real run controller (`src/engine/sim-control.ts`)
- [x] Adjust tick speed (1x, 2x, 5x) ✅ — ~~poll interval~~ *now* `POST /api/sim/speed?x=1|2|5` (wall-clock period only; hospital time per tick unchanged, replay unaffected)
- [x] Real-time updates instead of polling ✅ — Server-Sent Events `/api/stream` (one event per tick, no dependency); dashboard refreshes on events, ≤ 1 per 2 s, polling fallback
- [x] `.env` config for port, tick interval, patient pool size ✅ — `DR_TICK_MS`, `DR_PATIENT_POOL` (+ existing `PORT`, `DATA_DIR`, …) in `.env.example`; `npm run start:env`

### Milestone 5.3: Export ✅
- [x] Export patient census as CSV per ward ✅ (`/api/export/ward-census.csv` existed but was unreachable from the UI; now in the ⬇ Export menu)
- [x] CSV export of identity data for reporting ✅ (`/api/export/identity.csv`; PDF stays the browser print dialog from M4.2)
- [x] Medical supply consumption tracking ✅ (`/api/export/supply-consumption.csv`, from Epic VI M6.3; now in the Export menu)

Tests: `tests/sim-control.test.ts` (6). Verified in the running app 2026-10-26: pause holds the tick, 5× gives 5 ticks/s, SSE connected, name search, day filter, theme, all 6 CSV exports 200.

---

## Epic VI — Department Completeness

Add remaining clinical workflows to match a full Tier C hospital.

### Status: ✅ Audited 2026-10-26, follow-ups and Indonesian workforce calibration 2026-10-27 (`docs/epic-audit-2026-10-26.md`)

### Milestone 6.1: Agent-Patient Assignment ✅
- [x] Agent pool with 30+ roles generated (`src/agent/generator.ts`)
- [x] Fatigue/health/shift tracking — 2026-10-27: real roster (`src/agent/roster.ts`) on the Indonesian pattern pagi 07–14 / siang 14–21 / malam 21–07, 4-team rotation (42 h/week), day roles Mon–Sat; fatigue recovers off duty; sickness calibrated on Indonesian WISN data to 6 sick days per person-year (measured 6.3; band 3–12) (was: `inShift` hard-coded, 100% of staff sick by tick 50). ADR-029 Amendment 1, accepted by owner 2026-10-27. `tests/roster.test.ts`
  - ~~2026-10-26: model broken (`inShift` hard-coded `true`, fatigue never reset)~~ — fixed above
- [x] `assignments` Map exists but not linked to encounters
- [x] Link specific doctors/nurses to encounters — done (M6.1). 2026-10-27: DPJP assigned on call by department, on-duty GP fallback; 131/131 inpatient encounters have a doctor and a nurse over the first 600 ticks (was 1/131)
- [x] Auto-replace sick agents with backups (sick leave system) — 2026-10-26: the detector never fired (0 records in 600 ticks). Now state-based, picks a same-role backup and hands over encounter assignments (`tests/sick-leave.test.ts`)
- [x] Dashboard for agent health status, fatigue alerts — 2026-10-26: `GET /api/agents/health` plus a 👷 Staff Health panel

### Milestone 6.2: Patient Flow ✅
- [x] Outpatient clinic system (Rawat Jalan) with 9 poliklinik — `src/engine/outpatient.ts`
- [x] Appointment scheduling — 2026-10-27: kontrol 7 days after every inpatient discharge (alive), Mon–Sat 08:00–14:00 poli slot, 80% attendance, checked in as an outpatient visit, completes with it (`tests/appointments.test.ts`). Not yet observed end to end in a full run (first kontrol ~10 sim-days in)
  - ~~Appointment scheduling — deferred (walk-in sufficient for current scope)~~ — 2026-10-26: was unwired (`createAppointment` had no caller)
- [x] Patient discharge planning with referral to Puskesmas (rujuk balik) — done (M6.2)
- [x] Puskesmas → RS Tier C/D → Deer's Rock referral chain — `src/referral/system.ts`
- [x] Morgue records with diagnosis — inline in `markov.ts`
- [x] Kamar Jenazah & forensik workflow — 2026-10-26: natural deaths go stored → certified → released; unnatural deaths (S/T/V–Y) go legal hold → autopsy → certified → released (`kamar-jenazah.ts`, `tests/kamar-jenazah.test.ts`)

### Milestone 6.3: Equipment & Supply 🟡
- [x] Medical equipment tracking (biomedical engineering) — `src/engine/biomedical-engineering.ts`
- [x] Central supply inventory — `src/engine/central-supply.ts`
- [x] Department-level supply consumption tracking — done (M6.3)

### Implemented Departments (all have handlers in HANDLER_SKIP)
| Department | Handler | Cadence | File |
|------------|---------|---------|------|
| Outpatient | `outpatientHandler` | 3 ticks | `outpatient.ts` |
| Blood Bank | `bloodBankHandler` | 5 ticks | `blood-bank.ts` |
| Central Supply | `centralSupplyHandler` | 3 ticks | `central-supply.ts` |
| CSSD | `cssdHandler` | 5 ticks | `cssd.ts` |
| Clinical Nutrition | `clinicalNutritionHandler` | 3 ticks | `clinical-nutrition.ts` |
| Dialysis | `dialysisHandler` | 5 ticks | `dialysis.ts` |
| IPC | `ipcHandler` | 5 ticks | `ipc.ts` |
| Microbiology | `microbiologyHandler` | 5 ticks | `microbiology.ts` |
| Pathology | `pathologyHandler` | 5 ticks | `pathology.ts` |
| Radiotherapy | `radiotherapyHandler` | 5 ticks | `radiotherapy.ts` |
| Social Work | `socialWorkHandler` | 5 ticks | `social-work.ts` |
| Morgue | Inline in discharge | per discharge | `markov.ts` |

---

## Epic VII — Polish & Infrastructure

Quality-of-life improvements for developers and operators.

### Milestone 7.1: Developer Experience ✅
- [x] Dockerfile for local containerized dev (node:20-slim, multi-stage, healthcheck) ✅
- [x] Add more Indonesian names to patient generator pool — 2026-10-26: 158/130/130 (was 107/86/79), South Sulawesi weighted, defects fixed

### Milestone 7.2: Code Quality 🟡
- [x] Fix `as any` casts in `rest.ts` and `fhir.ts` with typed intersections ✅
- [x] `getDeteriorationRate` already counts deceased as deteriorated (verified)
- [ ] Split `HospitalState` into sub-states for maintainability (long-term) — deferred. Audited 2026-10-26: ~60 flat fields, ~25 `_` sub-states reached via casts, hand-written serializers (L, needs an ADR)

### Milestone 7.3: Experimental Instrumentation ✅
- [x] Per-tick outcome snapshot module (`src/engine/outcome-snapshot.ts`)
- [x] API endpoint `/api/outcomes/snapshots` for time-series analysis
- [x] Expose action ranking distribution via API — 2026-10-26: `GET /api/learning/action-ranking` (`?icd=`, `?top=`)
- [x] 2026-10-26 fix: `learningHandler` re-learned every outcome on each pass (431 outcomes counted as 53,856 cases). Now uses a `learnedOutcomes` cursor and copy-on-write memory.

---

## Epic VIII — ADRs & Governance

Architectural decisions must be recorded for future agents and humans.

### Milestone 8.1: ADR Backlog ✅ (audited 2026-10-26, cleaned up 2026-10-27; index: `docs/adr/README.md`)
- [x] ADR-001: Handler Pipeline Architecture (status still **Proposed**)
- [x] ADR-002: Snapshot and Journal Retention Strategy (status still **Proposed**)
- [x] ADR-003: Agent State Persistence Contract
- [x] ADR-004: Bounded State and Durable Scheduling (keeps the number; cited throughout `src/`)
- [x] ~~ADR-004: Mortality Risk Engine~~ → renumbered **ADR-028** 2026-10-27 (number collision)
- [x] ADR-005: Department Addition Pattern (docs/adr, 2026-10-07)
- [x] ADR-006: Agent Learning Architecture (docs/adr, 2026-10-07)
- [x] ADR-007: Referral System (Rujukan Berjenjang) (docs/adr, 2026-10-07)
- [x] ADR-008: Seeded Random Number Generation
- [x] ADR-009: Timeline Engine (accepted 2026-10-07; the 2026-06-28 vision copy is archived in `docs/adr/archive/`)
- [x] ADR-010: Clinical Fidelity Expansion (Draft)
- [x] ADR-011: Runner Tuning (Draft)
- [ ] ~~ADR-012: Formulary Expansion~~ — never written (2026-10-26); recorded as a gap in the index, formulary covered by ADR-010/011
- [x] ADR-013: Chapter IX/X Expansion (Draft)
- [x] ADR-014: Hospital Testbed (FHIR)
- [x] ADR-015: Finance & Claims Architecture
- [x] ADR-016: Referral & Ambulance Architecture
- [x] ADR-017: Department Completeness — Patient Flow & Supply Consumption
- [x] ~~ADR-017: Agent Assignment & Workforce Management~~ → renumbered **ADR-029** 2026-10-27 (two files shared ADR-017)
- [x] ADR-018: AI Medical Coder Agent
- [x] ADR-019: Timeline Engine — Branch Journal Isolation
- [x] ADR-020: State Invariant Validation
- [x] ADR-021: Primary Diagnosis Selection by Priority
- [x] ADR-022: Intervention Param Validation
- [ ] ADR-023 — no file
- [x] ADR-024: Handler Orchestration Phases
- [x] ADR-025: Assessment-Driven Quality Fixes
- [ ] ADR-026 — no file (cited in `docs/CODEX-E2E-REPORT.md` and `docs/benchmarks/100k-tick-report.md`)
- [x] ADR-027: International Adapter Architecture — US Healthcare
- [x] ADR-028: Mortality Risk Engine (formerly ADR-004)
- [x] ADR-029: Agent Assignment & Workforce Management (formerly ADR-017)
- [x] 2026-10-27: collisions resolved, `adr/` merged into `docs/adr/`, index with old→new citation map
- [x] 2026-10-27: owner accepted ADR-008 Amendment 1 (per-handler streams, with baseline re-freeze `substream-v1`) and ADR-029 Amendment 1 (roster, Indonesian calibration)
- [ ] Open (Coordinator OC): accept or reject ADR-001/002 (Proposed) and ADR-016 Amendment 1 (Proposed); write ADR-026 (cited by `tests/boundary-contract.test.ts`)

### Milestone 8.3: Constitution Amendments ✅
- [x] Amendment 1: Article VI — Agent Interoperability
- [x] Amendment 2: Agent roles refined
- [x] Amendment 3: §3.2 protocol gap logging + §3.3 mortality provenance
- [x] Amendment 4: Article VII — Model Assumptions & Calibration
- [x] Amendment 5: §1.4 — Counterfactual Experimentation (branch mandate, outcome diff)
- [x] Amendment 6: Article IV §4.2 — remove pruning caps, rely on journal retention (was unlisted)

### Milestone 8.2: Terminology Standardization ✅
- [x] English-context docs normalized to "Tier A/B/C/D"
- [x] "Tipe A" preserved in Indonesian regulatory citations and paper drafts
- [x] ADR-003 reference cleaned (historical doc removed, no stale refs remain)

---

## Epic IX — Financial & Referral Realism

Build out the business and logistics layer to match a real Indonesian Tier C hospital: real costs, real insurance, real referral geography, and expanded formulary.

### Milestone 9.1: Finance Overhaul ✅
- [x] Drug charges — each medication dispensed generates acquisition cost × markup (`costIdr × 1.25`, Phase 1)
- [x] Professional charges — doctor/specialist consultation fees (ED acuity, specialty consult)
- [x] Procedure charges — lab, imaging, surgery, dialysis, radiotherapy with real costs (Phase 1)
- [x] Bed/day charges — differentiated by ward class (`roomClassAtAdmission` stamp, per 1440-tick day)
- [x] AI Medical Records/Coder agent — ICD-10 coding validation, DRG assignment, chart completeness, claim coding (ADR-018, 2026-10-08)

### Milestone 9.2: Claims & Insurance ✅
- [x] BPJS model — INA-CBG (ICD-10 → fixed tariff mapping), verified at Phase 2
- [x] Private insurance — 3-tier coverage (80/90/100% with 10/5/0% co-pay) activated
- [x] Jasa Raharja — mandatory accident insurance, 30-day emergency cover
- [x] Out-of-pocket — balance billing, self-pay, co-payments (Self-pay ~3% share)
- [x] Claim workflow — `submitted → verifying → adjudicated → paid | denied` (+ `returned`), batch adjudication ≤8/15-tick pass, causal denial taxonomy
- [x] Payer mix — all five `PayerType` activated (82/8/7/3) via one admission-time rng draw

### Milestone 9.3: Referral System Redesign 🟡
- [x] Geographic hierarchy: Puskesmas → RS D → RS C → RS B → RS A (tier function, catchment band, distanceKm) — ADR-016 wave 1
- [x] ED walk-in / self-referral with ESI-based routing (ESI-lite table, level 5 reintroduced, fast-track ESI 4-5 → POLI) — ADR-016 wave 1
- [ ] Road accidents + Jasa Raharja claim integration (incidentRef provenance) — 2026-10-27: one incident per accident (30-day window), linked to letter + dispatch, JR claims carry `incidentRef`; `/api/jr-incidents`. **Still open (owner decision §5):** finance bills 199 S/T/V codes to JR while provenance triggers on 6, so e.g. S06 claims have no incident (3 of 7 JR claims at seed 42 / 900 ticks)
- [x] Geographic catchment: Makassar city → South Sulawesi → Eastern Indonesia (catchmentBand function, sender province filter) — ADR-016 wave 1
- [x] Referral capacity: limited specialist slots per day (REFERRAL_DAILY_SLOT_BUDGET=5, FIFO drain, age-out→returned) — ADR-016 wave 1
- [x] Ambulance system: BLS/ALS dispatch, tracking, costing — 2026-10-27: wired. Transport chosen by referral diagnosis (ALS/BLS/own), road ambulances only within Sulawesi (others `sea_air`, not modelled), dispatch cost charged once on the arrival encounter, `/api/ambulance`. Seed 42 / 900 ticks: 4 dispatches, all charged (ADR-016 Amendment 1, Proposed)
  - ~~2026-10-26: `dispatchAmbulance` had no caller~~ — fixed above
- [x] Real-patient linkage: phantom REF-PAT-* eliminated, real Patient materialized at letter→arrival — ADR-016 wave 1. 2026-10-27: visit created at the patient's arrival; letter completed with the real patient + encounter; patient carries the referral diagnosis; letters in transit no longer age out (14/14 letters completed, seed 42 / 900 ticks)
- [x] Fixed draw count discipline (6 draws per fire, counter-based IDs) — ADR-016 wave 1

### Milestone 9.4: Expanded Formulary ✅
- [x] Expand from 22 to 205 essential drugs across 36 categories
- [x] All generic names (no brands)
- [x] 12 categories covered: antibiotics, cardiovascular, endocrine, respiratory, CNS, GI, IV fluids, emergency, chemotherapy, vaccines, anaesthetics, nutrition
- [x] Drug costs from e-catalogue (costIdr on all 205 drugs)

---

## Epic X — International Billing & Commercial Productization

**Status:** Design phase — strategy approved by owner 2026-10-05. Implementation deferred until all other Epics green.

### Milestone 10.1-10.6: All Pending 🔴
See ADR-027 (international adapter) for design. ~~See ADR-013~~: ADR-013 is ICD chapters IX/X (corrected 2026-10-26). Will implement only after Epic I-IX complete.

---

## Summary

| Epic | Status | Tests | Notes |
|------|--------|-------|-------|
| **I** Core Reliability | ✅ Complete | — | All 5 milestones verified, throughput balanced |
| **II** Clinical Fidelity | ✅ Complete | — | 205 drugs, 147 ICD, 165 protocols |
| **III** Timeline Engine | ✅ Complete | — | Branch engine + ADR-019 isolation + 5 scenarios + 14 tests |
| **IV** Data & Interop | ✅ Complete | — | FHIR, charts, PDF export, CI all done |
| **V** Dashboard & UX | ✅ Complete | 6 | 2026-10-26: dashboard script fixed (dead since 10-07), real sim pause/speed, SSE live updates, name+day search, theme, exports menu, env config |
| **VI** Department Completeness | ✅ 3/3 MS | 45 | Roster + calibrated workforce health, sick-leave cover, staff health API/panel, kamar jenazah workflow, kontrol appointments; rates are Research OC calibration targets |
| **VII** Polish & Infra | 🟡 M7.1 ✅ M7.3 ✅, M7.2 🟡 | 9 | Names pool, action-ranking API, learning double-count fixed; `HospitalState` split open (L) |
| **VIII** ADRs & Governance | ✅ 3/3 MS | — | ADRs consolidated in `docs/adr/` with index; collisions resolved (→ ADR-028, ADR-029); ADR-008/029 amendments accepted 2026-10-27; open: ADR-001/002 + ADR-016 amendment Proposed, ADR-026 unwritten |
| **IX** Financial & Referral | 🟡 3/4 MS (M9.3 🟡) | 21 | Wave 2 wired: transport, ambulance charge, letter↔visit link, JR incident↔claim; open: JR trigger set (owner decision) |
| **X** International Billing | 🔴 Deferred | — | Design only |

**Overall (2026-10-27, branch `epic-audit-vi-ix`):** 505 tests pass / 3 skipped / 0 failed (64 files), tsc clean. Determinism: module-global AI-coder profiles reset; per-handler RNG sub-streams (declared seed break, ADR-008 Amendment 1). Baselines re-frozen as `substream-v1` (`docs/experiments/EXPERIMENT-FREEZE-2026-10-27.md`; 2026-09-10 JAMIA freeze untouched). Epic VI–IX audit and follow-ups: `docs/epic-audit-2026-10-26.md`.
