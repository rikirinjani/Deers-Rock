# ADR-017: Department Completeness — Patient Flow & Supply Consumption

**Status:** Accepted
**Date:** 2026-10-07
**Supersedes:** ADR-017 draft (agent assignment — already implemented)
**Related:** ADR-004 (bounded state), ADR-016 (referral system)

---

## Context

Deer's Rock has 12 department handlers but three patient-flow and supply gaps prevent it from simulating a complete Tier C hospital:

1. **No discharge-to-Puskesmas referral (rujuk balik)** — Patients leave without structured follow-up, breaking the Indonesian primary-care referral chain.
2. **No appointment scheduling** — Outpatient visits are purely walk-in; real hospitals book time slots.
3. **No department-level supply consumption** — Central supply tracks total inventory but not which department consumed what, making cost attribution impossible.

## Decision

### 1. Discharge Planning with Rujuk Balik (`src/engine/discharge-planning.ts`)
- On discharge, check if patient's diagnosis warrants follow-up at a Puskesmas
- Criteria: chronic conditions (hypertension I10, diabetes E11, asthma J45, etc.)
- Create outgoing referral letter → queue to nearest Puskesmas facility
- Track `dischargePlan` on encounter: `{ followUpRequired, targetFacility, scheduledTick }`
- New event type: `followup_check` fires at scheduled tick to verify if patient attended

### 2. Appointment Scheduling (`src/engine/appointment-scheduler.ts`)
- Outpatient visitors can be "scheduled" vs "walk-in"
- Each poliklinik has a daily slot budget (default 10 slots/poli)
- Slots are reserved via `scheduleAppointment(patientId, poliId, targetTick)`
- Scheduler runs every 15 ticks, fills available slots with next-in-queue patients
- Walk-in capacity still exists (20% of visits remain walk-in)

### 3. Department-Level Consumption (`src/engine/dept-consumption.ts`)
- Each department handler reports consumptions via `recordConsumption(dept, itemCode, qty)`
- `_deptConsumption: Map<department, Map<itemCode, number>>` in HospitalState
- Aggregated daily/weekly via new `/api/departments/consumption` endpoint
- Reorder trigger: when dept stock < threshold, log alert (no auto-order yet)

## Architecture

```
dischargeScheduledPatients (markov.ts)
  → dischargePlanning.record(state, encounter, clock)
  → if chronic dx: create referral to Puskesmas

outpatientHandler (outpatient.ts)
  → check scheduled appointments first
  → then walk-ins
  → appointmentScheduler fills slots every 15 ticks

Each department handler (lab, pharmacy, radiology, etc.)
  → on order completion: deptConsumption.record(dept, item, qty)
  → centralSupplyHandler already calls dispenseItem() — just add dept tracking
```

## Consequences

### Positive
- Complete referral chain: Puskesmas → RS → Puskesmas (rujuk balik)
- Realistic outpatient flow with scheduled + walk-in
- Cost attribution per department enables financial analysis

### Negative
- Adds `_deptConsumption` state (bounded by MAX_DEPT_CONSUMPTION=1000 entries)
- Appointment scheduling adds 15-tick cadence handler
- Rujuk balik adds referral letters (already bounded by MAX_REFERRAL_LETTERS=100)

### Neutral
- Chronic disease list is author-assigned plausibility (not calibrated)
- Slot budgets are tunable via env vars

## Implementation Plan

1. `src/engine/discharge-planning.ts` — rujuk balik logic
2. `src/engine/appointment-scheduler.ts` — slot-based scheduling
3. `src/engine/dept-consumption.ts` — per-dept tracking
4. Wire into existing handlers (markov.ts, outpatient.ts, lab.ts, pharmacy.ts)
5. Add API endpoint `/api/departments/consumption`
6. Tests for all three subsystems
