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

**Status:** Accepted by the owner, 2026-10-27, with calibration on Indonesian data (done the same day, below).

**Problem.** `agentHandler` hard-coded `inShift = true` and never reset fatigue, so every agent was sick by tick 50
(seed 42) and none were available; `sickLeaveHandler` never detected a sick agent.

**Decision.**
- Roster (`src/agent/roster.ts`) on the calendar clock, using the Indonesian hospital shift pattern: pagi 07–14 (7 h),
  siang 14–21 (7 h), malam 21–07 (10 h). 24-h roles rotate in 4 teams (pagi → siang → malam → libur, 42 h/week;
  UU 6/2023 sets 40 h/week); 3-person roles rotate backwards (no malam → pagi); roles with < 3 staff are on call;
  office and specialist roles work pagi Mon–Sat.
- Fatigue = consecutive ticks on duty, recovering at 2/tick off duty. "lelah" from 7 h on duty; illness from
  overwork only past 12 h, beyond the longest scheduled shift.
- Sickness: 2.5 mild episodes per person-year (2 days of izin sakit, off duty), 10 % progressing to a 5-day severe
  episode (sick leave, off duty), ≈ 6 sick days per person-year. Fixed draw count (2 per agent per tick);
  `agentHandler` owns recovery; `sickLeaveHandler` opens/closes leave state-based for severe episodes and hands
  encounter assignments to a same-role backup.
- The attending specialist (DPJP) is assigned by department regardless of roster (on call for their patients), with an
  on-duty GP (dokter jaga) fallback.

**Calibration sources (Indonesia).**
- Shift times: RSUD Dr. Soetomo ER (pagi 07–14, sore 14–21, malam 21–07) and RSUD Sunan Kalijaga (same hours);
  a nursing thesis describes this as the general hospital rule. Variants exist (e.g. RS Herna Medan 08–16 / 16–23 /
  23–08); the common pattern is used.
- Sick days: no national figure exists. Indonesian hospital WISN staffing studies (Kemenkes method, "ketidakhadiran
  kerja: sakit/izin") report 3 days/year (RSU Aulia policy; RSU Mitra Guray assumption), 4 days/year (RS Paru
  Surabaya) and 12 days/year (RSUD Wamena ER, measured from the 2020 attendance register; the only measured and the
  only Eastern-Indonesian figure, in a COVID year). Target 6 days = geometric middle of 3–12; **3–12 is the
  sensitivity band** for experiments.

**Evidence.** 90 sim-days, 122 staff (seed 42): 6.3 sick days per person-year (1.73 %), 2.69 mild onsets per
person-year, max fatigue 598 ticks (the 10-h malam), 33 staff on duty on average (min 22). Doctor and nurse
assigned to 131/131 inpatient encounters over the first 600 ticks. `tests/roster.test.ts` asserts sick days in
3–12 and within 3 of the target.

**Not modelled (open calibration items).** Annual leave (cuti tahunan, 12 days for ASN) and national holidays are not
deducted from the roster; the 4-team rotation absorbs them only implicitly.
