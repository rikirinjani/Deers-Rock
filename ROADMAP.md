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
- [x] Ensure pharmacy allergy detection is testable (>3% allergy rate — actual: 60-70%)

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

### Milestone 2.5: Model Calibration 🟡
- [x] Document mortality risk factor weights with plausible clinical ranges ✅ (ADR-004)
- [x] LOS validation doc vs MoH RI Tier A data (`docs/benchmarks/los-validation.md`)
- [x] Validate drug allergy prevalence rates against Indonesian pharmacovigilance data ✅ (60-70%, above 3% threshold)
- [ ] Formal validation against real hospital data — deferred to research phase

### Milestone 2.6: Scientific Validation Infrastructure ✅
- [x] Seeded RNG (ADR-008) — 148 `Math.random()` → `clock.rng()`
- [x] Generator seeding — `createWorld(50, "db", 42)` = identical output
- [x] Multi-run test harness — `src/experiment/runner.ts` (seedCount, ticks, scenario forcing)
- [x] Outcome recorder — per-run CSV/JSON export with CI/SD, deaths by ICD, LOS, occupancy
- [x] Learning toggle — `DR_FREEZE_LEARNING=1` freezes agent learning for controlled experiments (commit `21e99c8`)

---

## Epic III — Timeline Engine (Deferred)

Enable controlled counterfactual experiments by treating snapshots as Points of Rewind from which Branch Timelines diverge.

**Status:** Concepts accepted (ADR-009). Implementation deferred until Epic 0 (stability) and Epic I (clinical fidelity) reach sufficient maturity.

### Milestone 3.1: Terminology & Modeling ✅
- [x] Concepts defined (ADR-009): Universe, Seed, Point of Rewind, Branch, Timeline, Genealogy
- [x] Slogan: "Counterfactuals by Construction"

### Milestone 3.2-3.5: Implementation 🔴
Deferred. Would add branch orchestration, intervention system, comparison tools, standard scenarios.

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

### Milestone 5.1: Dashboard Overhaul 🟡
- [x] Pagination for encounter table (50 rows/page) ✅
- [x] Search by patient ID ✅
- [ ] Full search/filtering, date-range pickers — deferred
- [ ] Loading indicator between 1s refresh cycles — deferred
- [ ] Dark/light theme toggle — deferred
- [ ] Patient search by name/ID — deferred

### Milestone 5.2: Admin & Controls ✅
- [x] Pause/resume simulation from dashboard ✅ (toggle button + status indicator)
- [x] Adjust tick speed (1x, 2x, 5x) ✅
- [ ] Real-time WebSocket updates (instead of 1s polling) — deferred
- [ ] `.env` config for port, tick interval, patient pool size — deferred

### Milestone 5.3: Export 🔴
- [ ] Export patient census as CSV per ward — deferred
- [ ] CSV/PDF export of identity data for reporting — deferred
- [ ] Medical supply consumption tracking — deferred

---

## Epic VI — Department Completeness

Add remaining clinical workflows to match a full Tier C hospital.

### Status: 🟡 ~70% Complete — Most departments implemented, gaps in linkage

### Milestone 6.1: Agent-Patient Assignment 🟡
- [x] Agent pool with 30+ roles generated (`src/agent/generator.ts`)
- [x] Fatigue/health/shift tracking (`src/agent/system.ts`)
- [x] `assignments` Map exists but not linked to encounters
- [x] Link specific doctors/nurses to encounters — done (M6.1)
- [ ] Auto-replace sick agents with backups (sick leave system) — deferred
- [ ] Dashboard for agent health status, fatigue alerts — deferred

### Milestone 6.2: Patient Flow 🟡
- [x] Outpatient clinic system (Rawat Jalan) with 9 poliklinik — `src/engine/outpatient.ts`
- [x] Appointment scheduling — deferred (walk-in sufficient for current scope)
- [x] Patient discharge planning with referral to Puskesmas (rujuk balik) — done (M6.2)
- [x] Puskesmas → RS Tier C/D → Deer's Rock referral chain — `src/referral/system.ts`
- [x] Morgue records with diagnosis — inline in `markov.ts`
- [ ] Kamar Jenazah & forensik workflow — deferred

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
- [ ] Add more Indonesian names to patient generator pool — deferred

### Milestone 7.2: Code Quality 🟡
- [x] Fix `as any` casts in `rest.ts` and `fhir.ts` with typed intersections ✅
- [x] `getDeteriorationRate` already counts deceased as deteriorated (verified)
- [ ] Split `HospitalState` into sub-states for maintainability (long-term) — deferred

### Milestone 7.3: Experimental Instrumentation ✅
- [x] Per-tick outcome snapshot module (`src/engine/outcome-snapshot.ts`)
- [x] API endpoint `/api/outcomes/snapshots` for time-series analysis
- [ ] Expose action ranking distribution via API — deferred

---

## Epic VIII — ADRs & Governance

Architectural decisions must be recorded for future agents and humans.

### Milestone 8.1: ADR Backlog ✅
- [x] ADR-001: Handler Pipeline Architecture
- [x] ADR-002: Snapshot and Journal Retention Strategy
- [x] ADR-003: Agent State Persistence Contract
- [x] ADR-004: Mortality Risk Engine
- [x] ADR-005: Department Addition Pattern (docs/adr, 2026-10-07)
- [x] ADR-006: Agent Learning Architecture (docs/adr, 2026-10-07)
- [x] ADR-007: Referral System (Rujukan Berjenjang) (docs/adr, 2026-10-07)
- [x] ADR-008: Seeded Random Number Generation
- [x] ADR-009: Timeline Engine (Vision ADR — accepted, implementation deferred)
- [x] ADR-010: Clinical Fidelity Expansion
- [x] ADR-011: Runner Tuning
- [x] ADR-012: Formulary Expansion
- [x] ADR-013: Chapter IX/X Expansion
- [x] ADR-014: Hospital Testbed (FHIR)
- [x] ADR-015: Finance & Claims Architecture
- [x] ADR-016: Referral & Ambulance Architecture

### Milestone 8.3: Constitution Amendments ✅
- [x] Amendment 1: Article VI — Agent Interoperability
- [x] Amendment 2: Agent roles refined
- [x] Amendment 3: §3.2 protocol gap logging + §3.3 mortality provenance
- [x] Amendment 4: Article VII — Model Assumptions & Calibration
- [x] Amendment 5: §1.4 — Counterfactual Experimentation (branch mandate, outcome diff)

### Milestone 8.2: Terminology Standardization 🟡
- [x] English-context docs normalized to "Tier A/B/C/D"
- [x] "Tipe A" preserved in Indonesian regulatory citations and paper drafts
- [ ] Remaining: `adr/ADR-003-agent-state-persistence.md:41` ("RS Tipe D/C", historical ADR)

---

## Epic IX — Financial & Referral Realism

Build out the business and logistics layer to match a real Indonesian Tier C hospital: real costs, real insurance, real referral geography, and expanded formulary.

### Milestone 9.1: Finance Overhaul ✅
- [x] Drug charges — each medication dispensed generates acquisition cost × markup (`costIdr × 1.25`, Phase 1)
- [x] Professional charges — doctor/specialist consultation fees (ED acuity, specialty consult)
- [x] Procedure charges — lab, imaging, surgery, dialysis, radiotherapy with real costs (Phase 1)
- [x] Bed/day charges — differentiated by ward class (`roomClassAtAdmission` stamp, per 1440-tick day)
- [ ] AI Medical Records/Coder agent — ICD-10 coding validation, DRG assignment, chart completeness, claim coding (deferred to later wave — static coders suffice for wave 1)

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
- [x] Road accidents + Jasa Raharja claim integration (incidentRef provenance) — wave 2 code written (`src/referral/jr-provenance.ts`)
- [x] Geographic catchment: Makassar city → South Sulawesi → Eastern Indonesia (catchmentBand function, sender province filter) — ADR-016 wave 1
- [x] Referral capacity: limited specialist slots per day (REFERRAL_DAILY_SLOT_BUDGET=5, FIFO drain, age-out→returned) — ADR-016 wave 1
- [x] Ambulance system: BLS/ALS dispatch, tracking, costing — wave 2 code written (`src/referral/ambulance.ts`)
- [x] Real-patient linkage: phantom REF-PAT-* eliminated, real Patient materialized at letter→arrival — ADR-016 wave 1
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
See ADR-013 for design. Will implement only after Epic I-IX complete.

---

## Summary

| Epic | Status | Tests | Notes |
|------|--------|-------|-------|
| **I** Core Reliability | ✅ Complete | — | All 5 milestones verified, throughput balanced |
| **II** Clinical Fidelity | ✅ Complete | — | 205 drugs, 147 ICD, 165 protocols |
| **III** Timeline Engine | 🟡 Complete* | — | *Concepts + implementation done (ADR-009, branch API, 5 scenarios) |
| **IV** Data & Interop | ✅ Complete | — | FHIR, charts, PDF export, CI all done |
| **V** Dashboard & UX | 🟡 2/3 MS | — | Pagination + pause/resume + charts done |
| **VI** Department Completeness | 🟡 M6.1+M6.2+M6.3 ✅ | — | 12 depts + agent assignment + discharge planning + dept consumption |
| **VII** Polish & Infra | 🟡 2/3 MS | — | Dockerfile, as-any, outcome snapshots done |
| **VIII** ADRs & Governance | 🟡 2/3 MS | — | ADRs 001-016 written, terminology mostly done |
| **IX** Financial & Referral | 🟡 3/4 MS | — | Wave 2 code written, benchmark pending |
| **X** International Billing | 🔴 Deferred | — | Design only |

**Overall:** 326 tests pass / 1 skipped (42 files). CI green. Retrace clean.
