# ADR-017: Department Completeness — Agent Assignment & Workforce Management

**Status:** Accepted
**Date:** 2026-10-07
**Related:** ADR-006 (Agent Learning), ADR-004 (Bounded State)

---

## Context

Deer's Rock has 122 agents across 23 roles (doctors, nurses, pharmacists, technicians, support staff) but **zero agent-to-encounter assignments**. Agents exist in isolation — they track fatigue/health but never interact with patients. This gap undermines clinical realism: real hospitals assign doctors to admissions, nurses to wards, pharmacists to medication orders.

Additionally, when agents fall sick (tracked via `status.kesehatan`), there is no replacement mechanism — the simulation simply runs with fewer staff, which is unrealistic for a Tier C hospital.

## Decision

Implement three interconnected subsystems:

### 1. Agent-Encounter Assignment (`src/engine/agent-assignment.ts`)
- When a patient is admitted, assign a doctor based on specialty → ward mapping
- When a medication order is placed, assign a pharmacist
- When a lab test is ordered, assign an analyst
- Assignments are stored in `_agentState.pool.assignments` (already exists, currently empty)
- Each assignment: `{ encounterId, agentId, role }`

### 2. Sick Leave Replacement (`src/engine/sick-leave.ts`)
- When an agent's `kesehatan` becomes "sakit" or "sakit_berat", mark them unavailable
- Auto-assign a backup agent from the same role pool if available
- Track replacement chain: original → backup → backup2
- Daily check via new `sickLeaveHandler` every 10 ticks

### 3. Department-Level Consumption (`src/engine/dept-consumption.ts`)
- Track supply consumption per department (not just central inventory)
- Each handler reports consumption to `_deptConsumption[department]`
- Exposed via `/api/departments/consumption` endpoint
- Triggers reorder when dept stock < threshold

## Architecture

```
encounter created (markov.ts admissionHandler)
  → agent-assignment.ts assignDoctor(encounter, state)
  → agent-assignment.ts assignNurse(encounter, state)

medication dispensed (pharmacy.ts)
  → agent-assignment.ts assignPharmacist(encounter, state)

lab ordered (lab.ts)
  → agent-assignment.ts assignLabAnalyst(encounter, state)

agent health check (sick-leave.ts, every 10 ticks)
  → find sick agents
  → find available backups
  → update assignments

consumption report (each department handler)
  → dept-consumption.ts record(dept, item, qty)
```

## Consequences

### Positive
- Clinically realistic: every admission has an attending doctor
- Enables future AI agent specialization (doctor sees their assigned patients)
- Sick leave replacement prevents understaffing artifacts

### Negative
- Adds complexity to admission flow (must find available agent)
- Backup assignment adds state tracking
- Consumption tracking adds per-department state

### Neutral
- Assignment is best-effort: if no agent available, encounter proceeds without assignment
- No hard failure if pool is depleted

## Migration

- Backward compatible: existing snapshots without assignments work (assignments default to empty)
- New field `_agentAssignments` in HospitalState (additive)
- Tests verify: assignment on admission, replacement on sickness, consumption tracking
