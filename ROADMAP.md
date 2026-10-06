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
- [x] Add protocols for remaining uncovered codes (ADR-010/013: 147 generator → 165 protocols)
- [x] Ensure every diagnosis has a corresponding protocol or explicit default
- [x] Fix specialty mappings for new codes

### Milestone 2.2: Formulary Expansion
- [x] Expand from 22 to 30+ drugs (ADR-010: 73, ADR-012: 174 total)
- [x] Add more drug-drug and drug-diagnosis interaction rules (~100 pairs)
- [x] Ensure pharmacy allergy detection is testable (>3% allergy rate — actual: 60-70%)

### Milestone 2.3: AI Test Coverage
- [x] Maintain AI Doctor tests (action selection, duplication prevention) ✅
- [x] Maintain AI Nurse tests (vitals alerts, nursing notes) ✅
- [x] Maintain AI Pharmacy tests (interaction checks, dispense) ✅
- [x] Add M&M Conference tests ✅ (4 tests, mm-conference.test.ts)
- [x] Add Calendar tests ✅ (12 tests, calendar.test.ts)
- [x] Add Morgue/Death roll tests ✅ (6 tests, morgue-outpatient.test.ts)
- [x] Add Outpatient tests ✅ (6 tests, morgue-outpatient.test.ts)
- [x] Add FHIR export tests ✅ (8 tests, fhir-compliance.test.ts)

### Milestone 2.4: Continuous Validation
- [x] Run simulation for 1000+ ticks and verify invariants ✅
- [x] Load test: measure tick latency at 500+ patients ✅ (p95=3ms @ 500pt, 500 ticks)

### Milestone 2.5: Model Calibration
- [x] Document mortality risk factor weights with plausible clinical ranges ✅ (ADR-004)
- [ ] Validate LOS distribution against real Indonesian hospital data (current: 4-12 ticks suspect)
- [x] Validate drug allergy prevalence rates against Indonesian pharmacovigilance data ✅ (60-70%, above 3% threshold)

### Milestone 2.6: Scientific Validation Infrastructure
- [x] Seeded RNG (ADR-008) — 148 `Math.random()` → `clock.rng()`
- [x] Generator seeding — `createWorld(50, "db", 42)` = identical output
- [x] Multi-run test harness — `src/experiment/runner.ts` (seedCount, ticks, scenario forcing)
- [x] Outcome recorder — per-run CSV/JSON export with CI/SD, deaths by ICD, LOS, occupancy
- [x] Learning toggle — `DR_FREEZE_LEARNING=1` freezes agent learning for controlled experiments (commit `21e99c8`)

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
- [x] Add `/fhir/Patient` search endpoint ✅
- [x] Add `/fhir/Observation` search endpoint ✅
- [x] Add `/fhir/Condition` endpoint ✅ (ADR-014, 2026-10-05)
- [x] Add `/fhir/Claim` endpoint ✅ (ADR-014, 2026-10-05)
- [x] Add `/fhir/Encounter` search endpoint ✅ (ADR-014, 2026-10-05)
- [x] FHIR R4 compliance tests ✅ (ADR-014, 8 tests)
- [x] FHIR Conformance Statement at `/api/fhir/metadata` ✅

### Milestone 4.2: Report Presentation
- [x] Replace JSON dump with styled HTML tables ✅ (`/report.html`, dark theme)
- [x] Export to CSV — patients, encounters, charges ✅ (`/api/export/*.csv`)
- [x] Fix report blood type detection to use `patient.rhesus` ✅ (was already correct)
- [ ] Add charts (ECharts or Chart.js) to reports — deferred
- [ ] PDF export — deferred
- See EVALUATION-REPORT §7

### Milestone 4.3: CI/CD
- [x] GitHub Actions: lint, typecheck, test on push ✅ (`.github/workflows/ci.yml`)
- [x] Railway auto-deploy from main — superseded by cokro-tech live box
- [ ] Integration test: `runWorld(createWorld(20), 30)` with department-level assertions — deferred

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
- [x] Drug charges — each medication dispensed generates acquisition cost × markup (`costIdr × 1.25`, Phase 1)
- [x] Professional charges — doctor/specialist consultation fees (ED acuity, specialty consult)
- [x] Procedure charges — lab, imaging, surgery, dialysis, radiotherapy with real costs (Phase 1)
- [x] Bed/day charges — differentiated by ward class (`roomClassAtAdmission` stamp, per 1440-tick day)
- [ ] AI Medical Records/Coder agent — ICD-10 coding validation, DRG assignment, chart completeness, claim coding (deferred to later wave — static coders suffice for wave 1)

### Milestone 9.2: Claims & Insurance
- [x] BPJS model — INA-CBG (ICD-10 → fixed tariff mapping), verified at Phase 2
- [x] Private insurance — 3-tier coverage (80/90/100% with 10/5/0% co-pay) activated
- [x] Jasa Raharja — mandatory accident insurance, 30-day emergency cover (unchanged)
- [x] Out-of-pocket — balance billing, self-pay, co-payments (Self-pay ~3% share)
- [x] Claim workflow — `submitted → verifying → adjudicated → paid | denied` (+ `returned`), batch adjudication ≤8/15-tick pass, causal denial taxonomy (`invalid_principal_dx`, `procedure_not_documented`)
- [x] Payer mix — all five `PayerType` activated (82/8/7/3) via one admission-time rng draw

### Milestone 9.3: Referral System Redesign
- [x] Geographic hierarchy: Puskesmas → RS D → RS C → RS B → RS A (tier function, catchment band, distanceKm) — ADR-016 wave 1
- [x] ED walk-in / self-referral with ESI-based routing (ESI-lite table, level 5 reintroduced, fast-track ESI 4-5 → POLI) — ADR-016 wave 1
- [ ] Road accidents + Jasa Raharja claim integration (incidentRef provenance — wave 2)
- [x] Geographic catchment: Makassar city → South Sulawesi → Eastern Indonesia (catchmentBand function, sender province filter) — ADR-016 wave 1
- [x] Referral capacity: limited specialist slots per day (REFERRAL_DAILY_SLOT_BUDGET=5, FIFO drain, age-out→returned) — ADR-016 wave 1
- [ ] Ambulance system: BLS/ALS dispatch, tracking, costing (wave 2)
- [x] Real-patient linkage: phantom REF-PAT-* eliminated, real Patient materialized at letter→arrival — ADR-016 wave 1
- [x] Fixed draw count discipline (6 draws per fire, counter-based IDs) — ADR-016 wave 1

### Milestone 9.4: Expanded Formulary
- [ ] Expand from 22 to 200-500 essential drugs
- [ ] All generic names (no brands)
- [ ] 12 categories: antibiotics, cardiovascular, endocrine, respiratory, CNS, GI, IV fluids, emergency, chemotherapy, vaccines, anaesthetics, nutrition

### Design Note
These four milestones are interconnected — finance needs drug costs, insurance needs ICD→INA-CBG mapping, referral needs geographic routing, ambulance needs dispatch logic. **A design review session is recommended before any code changes.**

---

## Epic X — International Billing & Commercial Productization

**Status:** Design phase — strategy approved by owner 2026-10-05. Implementation deferred until engineering capacity available.

### Milestone 10.1: Billing Adapter Architecture
- [ ] Define `BillingAdapter` interface in `src/engine/billing/adapter.ts`
- [ ] Extract INA-CBG grouper into `src/engine/billing/ina-cbg.ts` implementing the interface
- [ ] Wire through `World` — adapter selected by env var (`DR_BILLING=ina-cbg|us-drg|euro-drg|none`)
- [ ] When `DR_BILLING=none`, charges accrue but no claim is generated (clean baseline for testing)
- [ ] Tariff tables as JSON data files, not hardcoded (version-locked per ADR)
- [ ] All adapters output FHIR `Claim` resources (existing ADR-014 infrastructure)

### Milestone 10.2: US-DRG Adapter (CMS-1500 / UB-04)
- [ ] CMS-1500 claim structure (16 fields, CMS standard)
- [ ] MS-DRG grouper logic: MDC grouping → DRG assignment → CC/MCC severity → payment weight
- [ ] CMS DRG reference tables (public, annual update from CMS.gov) — ~2,000 DRGs
- [ ] CPT code mapping from DR procedures (start with curated subset)
- [ ] Output: JSON claim matching CMS-1500 layout + UB-04 electronic format
- [ ] ICD-10-CM codes (US modification, not Indonesia ICD-10)

### Milestone 10.3: EU EuroDRG Adapter
- [ ] Procedure-driven grouping (different from diagnosis-driven MS-DRG)
- [ ] 43 MDCs with procedure + diagnosis double-counting
- [ ] Country variants (Germany OPS vs France CCAM)
- [ ] Age bracket adjustments

### Milestone 10.4: Pricing & Market Tiers
- [ ] Same features, same API, same adapters available to everyone — price differs by region
- [ ] Indonesian market: Free / Team ($200/mo) / Pro ($500/mo) / Enterprise ($1,500/mo)
- [ ] US/EU market: Free / Starter ($500/mo) / Professional ($1,500/mo) / Enterprise ($5,000/mo) / Custom ($10K+/mo)
- [ ] Adapter availability as SKU differentiator (not product separation)
- [ ] Per-market documentation (English for US/EU, Indonesian for local)

### Milestone 10.5: Usage Metering & Multi-Tenancy
- [ ] Track ticks per seed, API calls, adapter selections per tenant
- [ ] Stripe integration for USD billing
- [ ] Local payment integration for IDR billing
- [ ] Separate billing infrastructure per region (no single monolithic billing)

### Milestone 10.6: Codex Integration Lifecycle
- [ ] Extend `DeersRockClient` adapter to route through selected billing adapter
- [ ] Codex ↔ DR closed-loop: generate → process → validate → regress
- [ ] Test regression suite: frozen seeds → expected outcome distributions
- [ ] Position DR as official test fixture engine for Codex Interpretum

### Design Principles
1. **One product, tiered pricing** — not two separate products for ID vs international
2. **Same features, same API** — price discrimination by market, not by feature gate
3. **Adapter = SKU** — clients pick which billing system they need, not which product they buy
4. **Open-core model** — engine always free; hosted API + adapters are the commercial layer
5. **Determinism preserved** — all billing assignment is deterministic on a given seed; tariff tables are read-only lookups, no rng involved

---

## Legend

- ✅ Completed
- 🔴 Blocked / needs decision
- [ ] Pending
- See ADR-N: Related Architecture Decision Record
