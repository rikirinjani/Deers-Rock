# ADR-029: Department Completeness — Agent Assignment & Workforce Management

> **Formerly ADR-017** (`docs/adr/ADR-017-department-completeness.md`). Renumbered 2026-10-27: two files shared
> ADR-017. *Patient Flow & Supply Consumption* keeps ADR-017 (cited by kamar jenazah, discharge planning,
> appointments and supply consumption); this workforce ADR moves to ADR-029.

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

## Amendment 1 — Staff roster and workforce health model (2026-10-27)

**Status:** Proposed (Platform OC, implemented in `epic-audit-vi-ix`) — awaiting Coordinator OC acceptance.

**Problem.** `agentHandler` hard-coded `inShift = true` and never reset fatigue, so every agent was sick by tick 50
(seed 42) and none were available; `sickLeaveHandler` never detected a sick agent.

**Decision.**
- Roster (`src/agent/roster.ts`): 8-h shifts on the calendar clock (pagi 07–15, siang 15–23, malam 23–07). 24-h roles
  rotate in 4 teams (pagi → siang → malam → libur, ~42 h/week); 3-person roles rotate backwards (no malam → pagi);
  roles with < 3 staff are on call; office and specialist roles work pagi Mon–Sat.
- Fatigue = consecutive ticks on duty, recovering at 2/tick off duty. "lelah" from 7 h; illness from overtime past 10 h.
- Sickness: ~4 mild episodes per person-year (2 days), 10 % progressing to severe (5 days), giving ~2.7 % absence.
  Fixed draw count (2 per agent per tick). `sakit_berat` agents are off duty; `agentHandler` owns recovery;
  `sickLeaveHandler` opens/closes leave state-based and hands encounter assignments to a same-role backup.
- The attending specialist (DPJP) is assigned by department regardless of roster (on call for their patients), with an
  on-duty GP (dokter jaga) fallback.

**Evidence.** 90 sim-days, 122 staff: absence 2.69 %, 3.92 mild onsets per person-year, max fatigue 478 ticks,
35 staff on duty on average (min 22). `tests/roster.test.ts`, `tests/sick-leave.test.ts`.

**Calibration target (Research OC).** The 2.7 % absence and the episode rates are literature-range assumptions,
not fitted to Indonesian hospital HR data.
