# Deer's Rock HOE — Roadmap

**Last updated:** 2026-06-28
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
- [ ] Tune admission/discharge rates so all 95 beds are not permanently saturated
- [ ] Add buffer capacity for surge events
- [ ] Ensure waiting room functions correctly under load

### Milestone 1.5: Snapshot Test Fix
- [ ] Fix `tests/snapshot.test.ts` timeout (5s limit too short for 45-tick run)

---

## Epic II — Clinical Depth

Expand clinical accuracy, protocol coverage, and formulary to match a Tier A referral hospital.

### Milestone 2.1: Protocol Coverage
- [ ] Add protocols for all 58 ICD codes in the generator (L03, N20, S06, T14, N40, etc.)
- [ ] Ensure every diagnosis has a corresponding protocol or explicit default
- [ ] See EVALUATION-REPORT §2.3

### Milestone 2.2: Formulary Expansion
- [ ] Expand from 22 to 30+ drugs covering more diagnosis groups
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

---

## Epic III — Data & Interoperability

Make HOE data useful for analytics, reporting, and external system integration.

### Milestone 3.1: FHIR Resources
- [ ] Add `/fhir/Patient` search endpoint ✅
- [ ] Add `/fhir/Observation` search endpoint ✅
- [ ] Add `/fhir/Condition` endpoint
- [ ] Add `/fhir/Claim` endpoint
- [ ] Add `/fhir/Encounter` search endpoint
- [ ] FHIR R4 compliance tests

### Milestone 3.2: Report Presentation
- [ ] Replace JSON dump with styled HTML tables
- [ ] Add charts (ECharts or Chart.js) to reports
- [ ] Export to CSV/PDF
- [ ] Fix report blood type detection to use `patient.rhesus` (not Math.random())
- See EVALUATION-REPORT §7

### Milestone 3.3: CI/CD
- [ ] GitHub Actions: lint, typecheck, test on push
- [ ] Railway auto-deploy from main
- [ ] Integration test: `runWorld(createWorld(20), 30)` with department-level assertions

---

## Epic IV — Dashboard & UX

The single-page dashboard is the primary user interface. It must be usable at scale.

### Milestone 4.1: Dashboard Overhaul
- [ ] Department panels feel cramped at 1600+ items
- [ ] Add pagination, search, filtering, date-range pickers
- [ ] Loading indicator between 1s refresh cycles
- [ ] Dark/light theme toggle
- [ ] Patient search by name/ID

### Milestone 4.2: Admin & Controls
- [ ] Pause/resume simulation from dashboard
- [ ] Adjust tick speed
- [ ] Real-time WebSocket updates (instead of 1s polling)
- [ ] `.env` config for port, tick interval, patient pool size

### Milestone 4.3: Export
- [ ] Export patient census as CSV per ward
- [ ] CSV/PDF export of identity data for reporting
- [ ] Medical supply consumption tracking

---

## Epic V — Department Completeness

Add remaining clinical workflows to match a full Tier A hospital.

### Milestone 5.1: Agent-Patient Assignment
- [ ] Link specific doctors/nurses to encounters
- [ ] Auto-replace sick agents with backups (sick leave system)
- [ ] Dashboard for agent health status, fatigue alerts

### Milestone 5.2: Patient Flow
- [ ] Outpatient clinic system (Rawat Jalan) with appointment scheduling
- [ ] Patient discharge planning with referral to Puskesmas (rujuk balik)
- [ ] Puskesmas → RS Tipe C/D → Deer's Rock referral chain
- [ ] Kamar Jenazah & forensik workflow

### Milestone 5.3: Equipment & Supply
- [ ] Medical equipment tracking (alat kesehatan)
- [ ] Department-level supply consumption tracking

---

## Epic VI — Polish & Infrastructure

Quality-of-life improvements for developers and operators.

### Milestone 6.1: Developer Experience
- [ ] Dockerfile for local containerized dev
- [ ] Add more Indonesian names to patient generator pool

### Milestone 6.2: Code Quality
- [ ] Fix M&M conference `as any[]` cast in `rest.ts:135`
- [ ] Fix agent learning `getDeteriorationRate` to count deceased as deteriorated
- [ ] Split `HospitalState` into sub-states for maintainability (long-term)

---

## Epic VII — ADRs & Governance

Architectural decisions must be recorded for future agents and humans.

### Milestone 7.1: ADR Backlog
- [x] ADR-001: Handler Pipeline Architecture
- [x] ADR-002: Snapshot and Journal Retention Strategy
- [x] ADR-003: Agent State Persistence Contract
- [ ] ADR-004: Mortality Risk Engine
- [ ] ADR-005: Department Addition Pattern
- [ ] ADR-006: Agent Learning Architecture
- [ ] ADR-007: Referral System (Rujukan Berjenjang)

### Milestone 7.2: Terminology Standardization
- [ ] Normalize "Tier A" / "Tipe A" / "Type A" across all docs
- [ ] Standardize department naming conventions

---

## Legend

- ✅ Completed
- 🔴 Blocked / needs decision
- [ ] Pending
- See ADR-N: Related Architecture Decision Record
