# Deer's Rock HOE — Roadmap

**Last updated:** 2026-06-29
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

### Milestone 1.2: Agent & Referral Persistence 🔴
- [ ] Persist `_agentState` (fatigue, health, shifts, assignments) in snapshots
- [ ] Persist `_referralState` (facilities, letters, pipeline) in snapshots
- [ ] Verify round-trip in snapshot tests
- See ADR-003

### Milestone 1.3: Data Pruning
- [ ] Add TTL or rolling window for all department collections
- [ ] Prune nursing notes (fastest-growing: 21K+)
- [ ] Prune charges (16K+)
- [ ] Bounded collection growth per Constitution IV §4.2

### Milestone 1.4: Throughput Balance
- [x] LOS increased from 4-12 to 360-1440 ticks (Platform OC)
- [x] Morgue ceiling removed (deaths now uncapped)
- [ ] Tune admission/discharge rates for stable occupancy
- [ ] Add buffer capacity for surge events
- [ ] Ensure waiting room functions correctly under load

### Milestone 1.5: Snapshot Test Fix
- [x] Fix `tests/snapshot.test.ts` timeout (5s → 15s)

---

## Epic II — Clinical Fidelity

Make the simulation believable enough that experiments are meaningful. The goal is not exhaustive clinical depth but sufficient fidelity for controlled experiments.

### Milestone 2.1: Protocol Coverage
- [x] ICD codes expanded from 40 to 50 (Platform OC)
- [ ] Add protocols for remaining 8 uncovered codes
- [ ] Ensure every diagnosis has a corresponding protocol or explicit default
- [ ] Fix specialty mappings for 10 new codes (currently all cardiology)

### Milestone 2.2: Formulary Expansion
- [x] New drugs added: ciprofloxacin, artemisinin-combination therapy, rabies Ig, polyvalent antivenom (in progress)
- [ ] Expand from 22 to 30+ drugs
- [ ] Add more drug-drug and drug-diagnosis interaction rules
- [ ] Ensure pharmacy allergy detection is testable (>3% allergy rate)

### Milestone 2.3: AI Test Coverage
- [ ] Maintain AI Doctor tests (action selection, duplication prevention)
- [ ] Maintain AI Nurse tests (vitals alerts, nursing notes)
- [ ] Maintain AI Pharmacy tests (interaction checks, dispense)
- [ ] Add M&M Conference tests
- [ ] Add Calendar tests
- [ ] Add Morgue/Death roll tests
- [ ] Add Outpatient tests
- [ ] Add FHIR export tests
- See EVALUATION-REPORT §4

### Milestone 2.4: Continuous Validation
- [ ] Run simulation for 1000+ ticks and verify invariants ✅ (exists in world.test.ts)
- [ ] Load test: measure tick latency at 500+ patients

### Milestone 2.5: Model Calibration
- [ ] Document mortality risk factor weights with plausible clinical ranges (ADR-004 drafted)
- [ ] Validate LOS distribution against real Indonesian hospital data (current: 4-12 ticks suspect)
- [ ] Validate drug allergy prevalence rates against Indonesian pharmacovigilance data

### Milestone 2.6: Scientific Validation Infrastructure
- [x] Seeded RNG (ADR-008) — 148 `Math.random()` → `clock.rng()`
- [x] Generator seeding — `createWorld(50, "db", 42)` = identical output
- [x] Multi-run test harness — `src/experiment/runner.ts` (seedCount, ticks, scenario forcing)
- [x] Outcome recorder — per-run CSV/JSON export with CI/SD, deaths by ICD, LOS, occupancy
- [ ] Add learning toggle (freeze/disable agent learning for control experiments)

---

## Epic III — Timeline Engine (Deferred)

Enable controlled counterfactual experiments by treating snapshots as Points of Rewind from which Branch Timelines diverge.

**Status:** Concepts accepted (ADR-009). Implementation deferred until Epic 0 (stability) and Epic I (clinical fidelity) reach sufficient maturity.

### Milestone 3.1: Terminology & Modeling
- [x] Concepts defined (ADR-009): Universe, Seed, Point of Rewind, Branch, Timeline, Genealogy
- [x] Slogan: "Counterfactuals by Construction"
- [ ] Formal Universe ID: `U-YYYY-NNNN` with explicit branch genealogy
- [ ] Branch metadata: parent universe, rewind tick, intervention description

### Milestone 3.2: Branch Orchestration
- [ ] CLI command: `deers-rock branch <snapshot-tick> [--inject ...]`
- [ ] API endpoint: `POST /api/branch` — create branch from snapshot with intervention
- [ ] Branch isolation: each branch gets its own journal/snapshot namespace

### Milestone 3.3: Intervention System
- [ ] Intervention catalog: resource injection (beds, staff, supplies), scenario activation, policy param override
- [ ] Intervention DSL or JSON schema for specifying "what changed"
- [ ] Rollback: discard branch without affecting parent timeline

### Milestone 3.4: Comparison & Analysis
- [ ] Branch comparison view: overlay outcome distributions across branches
- [ ] Baseline vs intervention: statistical delta (mortality, LOS, occupancy)
- [ ] Export: branch genealogy as DOT/JSON, outcome comparison as CSV

### Milestone 3.5: Standard Scenario Library
A set of canonical seeds representing archetypal hospital days, frozen in time for integration testing and paper reproducibility.

| Scenario | Seed | Description |
|----------|------|-------------|
| `normal_tuesday` | 101 | Baseline patient flow, no disasters |
| `lebaran_burns` | 202 | Post-holiday surge in burn victims |
| `tsunami_evac` | 303 | Mass casualty event, supply chain disruption |
| `pandemic_wave` | 404 | 3x patient influx, ventilator shortage |
| `drug_shortage` | 505 | Formulary stockout on Day 2 |

Each scenario is available as a standalone import — no need to run the simulation to reach the relevant tick. Canonical FHIR data exports included.

### Domain Independence
Timeline Engine is intentionally specified as a generic temporal abstraction. Healthcare experiments are the first consumer, but the branching mechanism is not tied to hospitals. No extraction commitment — recognition that the abstraction is broader than its first application.

---

## Epic IV — Data & Interoperability

Make HOE data useful for analytics, reporting, and external system integration.

### Milestone 4.1: FHIR Resources
- [ ] Add `/fhir/Patient` search endpoint ✅
- [ ] Add `/fhir/Observation` search endpoint ✅
- [ ] Add `/fhir/Condition` endpoint
- [ ] Add `/fhir/Claim` endpoint
- [ ] Add `/fhir/Encounter` search endpoint
- [ ] FHIR R4 compliance tests

### Milestone 4.2: Report Presentation
- [ ] Replace JSON dump with styled HTML tables
- [ ] Add charts (ECharts or Chart.js) to reports
- [ ] Export to CSV/PDF
- [ ] Fix report blood type detection to use `patient.rhesus` (not Math.random())
- See EVALUATION-REPORT §7

### Milestone 4.3: CI/CD
- [ ] GitHub Actions: lint, typecheck, test on push
- [ ] Railway auto-deploy from main
- [ ] Integration test: `runWorld(createWorld(20), 30)` with department-level assertions

---

## Epic V — Dashboard & UX

The single-page dashboard is the primary user interface. It must be usable at scale.

### Milestone 5.1: Dashboard Overhaul
- [ ] Department panels feel cramped at 1600+ items
- [ ] Add pagination, search, filtering, date-range pickers
- [ ] Loading indicator between 1s refresh cycles
- [ ] Dark/light theme toggle
- [ ] Patient search by name/ID

### Milestone 5.2: Admin & Controls
- [ ] Pause/resume simulation from dashboard
- [ ] Adjust tick speed
- [ ] Real-time WebSocket updates (instead of 1s polling)
- [ ] `.env` config for port, tick interval, patient pool size

### Milestone 5.3: Export
- [ ] Export patient census as CSV per ward
- [ ] CSV/PDF export of identity data for reporting
- [ ] Medical supply consumption tracking

---

## Epic VI — Department Completeness

Add remaining clinical workflows to match a full Tier A hospital.

### Milestone 6.1: Agent-Patient Assignment
- [ ] Link specific doctors/nurses to encounters
- [ ] Auto-replace sick agents with backups (sick leave system)
- [ ] Dashboard for agent health status, fatigue alerts

### Milestone 6.2: Patient Flow
- [ ] Outpatient clinic system (Rawat Jalan) with appointment scheduling
- [ ] Patient discharge planning with referral to Puskesmas (rujuk balik)
- [ ] Puskesmas → RS Tipe C/D → Deer's Rock referral chain
- [ ] Kamar Jenazah & forensik workflow

### Milestone 6.3: Equipment & Supply
- [ ] Medical equipment tracking (alat kesehatan)
- [ ] Department-level supply consumption tracking

---

## Epic VII — Polish & Infrastructure

Quality-of-life improvements for developers and operators.

### Milestone 7.1: Developer Experience
- [ ] Dockerfile for local containerized dev
- [ ] Add more Indonesian names to patient generator pool

### Milestone 7.2: Code Quality
- [ ] Fix M&M conference `as any[]` cast in `rest.ts:135`
- [x] `getDeteriorationRate` already counts deceased as deteriorated (verified — code correct, EVALUATION-REPORT was wrong)
- [ ] Split `HospitalState` into sub-states for maintainability (long-term)

### Milestone 7.3: Experimental Instrumentation
- [ ] Add per-tick outcome snapshot for time-series analysis
- [ ] Expose action ranking distribution via API for external analysis

---

## Epic VIII — ADRs & Governance

Architectural decisions must be recorded for future agents and humans.

### Milestone 8.1: ADR Backlog
- [x] ADR-001: Handler Pipeline Architecture
- [x] ADR-002: Snapshot and Journal Retention Strategy
- [x] ADR-003: Agent State Persistence Contract
- [x] ADR-008: Seeded Random Number Generation
- [x] ADR-004: Mortality Risk Engine (drafted by Research OC, pending Coordinator approval)
- [x] ADR-009: Timeline Engine (Vision ADR — accepted, implementation deferred)
- [ ] ADR-005: Department Addition Pattern
- [ ] ADR-006: Agent Learning Architecture
- [ ] ADR-007: Referral System (Rujukan Berjenjang)

### Milestone 8.3: Constitution Amendments
- [x] Amendment 1: Article VI — Agent Interoperability
- [x] Amendment 2: Agent roles refined
- [x] Amendment 3: §3.2 protocol gap logging + §3.3 mortality provenance
- [x] Amendment 4: Article VII — Model Assumptions & Calibration
- [x] Amendment 5: §1.4 — Counterfactual Experimentation (branch mandate, outcome diff)

### Milestone 8.2: Terminology Standardization
- [ ] Normalize "Tier A" / "Tipe A" / "Type A" across all docs
- [ ] Standardize department naming conventions

---

## Epic IX — Financial & Referral Realism

Build out the business and logistics layer to match a real Indonesian Tier A hospital: real costs, real insurance, real referral geography, and expanded formulary.

**Status:** Design phase — requirements collected from human via Research OC. Implementation after JAMIA submission.

### Milestone 9.1: Finance Overhaul
- [ ] Drug charges — each medication dispensed generates acquisition cost + markup
- [ ] Professional charges — doctor/specialist consultation fees (per INA-CBG tariff schedules)
- [ ] Procedure charges — lab, imaging, surgery, dialysis, radiotherapy with real costs
- [ ] Bed/day charges — differentiated by ward class (VIP, I, II, III)
- [ ] AI Medical Records/Coder agent — ICD-10 coding validation, DRG assignment, chart completeness, claim coding

### Milestone 9.2: Claims & Insurance
- [ ] BPJS model — INA-CBG (ICD-10 → fixed tariff mapping)
- [ ] Private insurance — coverage levels, co-pay, policy limits
- [ ] Jasa Raharja — mandatory accident insurance, 30-day emergency cover
- [ ] Out-of-pocket — balance billing, self-pay, co-payments
- [ ] Claim workflow: verification → approval → payment/rejection

### Milestone 9.3: Referral System Redesign
- [ ] Geographic hierarchy: Puskesmas → RS D → RS C → RS B → RS A
- [ ] ED walk-in / self-referral with ESI-based routing
- [ ] Road accidents + Jasa Raharja claim integration
- [ ] Geographic catchment: Makassar city → South Sulawesi → Eastern Indonesia
- [ ] Referral capacity: limited specialist slots per day
- [ ] Ambulance system: BLS, ALS, helicopter; dispatch, tracking, costing

### Milestone 9.4: Expanded Formulary
- [ ] Expand from 22 to 200-500 essential drugs
- [ ] All generic names (no brands)
- [ ] 12 categories: antibiotics, cardiovascular, endocrine, respiratory, CNS, GI, IV fluids, emergency, chemotherapy, vaccines, anaesthetics, nutrition

### Design Note
These four milestones are interconnected — finance needs drug costs, insurance needs ICD→INA-CBG mapping, referral needs geographic routing, ambulance needs dispatch logic. **A design review session is recommended before any code changes.**

---

## Legend

- ✅ Completed
- 🔴 Blocked / needs decision
- [ ] Pending
- See ADR-N: Related Architecture Decision Record
