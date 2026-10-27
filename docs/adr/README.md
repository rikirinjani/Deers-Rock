# Architecture Decision Records

Single home for HOE ADRs (consolidated 2026-10-27 from `adr/` and `docs/adr/`). Coordinator OC owns this index
(AGENTS.md). Numbers are never reused; a number that was never written stays a gap and is listed as such.

| ADR | Title | Status |
|-----|-------|--------|
| [001](ADR-001-handler-pipeline-architecture.md) | Handler Pipeline Architecture | Proposed |
| [002](ADR-002-snapshot-journal-retention.md) | Snapshot and Journal Retention Strategy | Proposed |
| [003](ADR-003-agent-state-persistence.md) | Agent State Persistence Contract | Approved 2026-07-02 |
| [004](ADR-004-bounded-state-durable-scheduling.md) | Bounded State and Durable Scheduling | Approved 2026-10-02 |
| [005](ADR-005-department-addition-pattern.md) | Department Addition Pattern | Accepted |
| [006](ADR-006-agent-learning-architecture.md) | Agent Learning Architecture | Accepted |
| [007](ADR-007-referral-system-architecture.md) | Referral System — Rujukan Berjenjang | Accepted |
| [008](ADR-008-seeded-random-number-generation.md) | Seeded Random Number Generation | Accepted; Amendment 1 (per-handler sub-streams) **Proposed** |
| [009](ADR-009-timeline-engine.md) | Timeline Engine — Counterfactual Experimentation | Accepted (2026-10-07); [vision version archived](archive/ADR-009-timeline-engine-vision-2026-06-28.md) |
| [010](ADR-010-clinical-fidelity-expansion.md) | Clinical Fidelity Expansion — Formulary, ICD-10, INA-CBG | Draft |
| [011](ADR-011-runner-tuning.md) | Runner Tuning — Drug Formulary Coverage | Draft |
| 012 | *Never written.* Formulary expansion is recorded in ADR-010 and ADR-011 | Gap |
| [013](ADR-013-chapter-ix-x-expansion.md) | ICD Chapter IX & X Expansion | Draft |
| [014](ADR-014-hospital-testbed.md) | Deer's Rock as Hospital App Test-bed | Approved |
| [015](ADR-015-finance-claims-architecture.md) | Finance & Claims Architecture | Accepted |
| [016](ADR-016-referral-ambulance-architecture.md) | Referral System & Ambulance Architecture | Accepted; Amendment 1 (wave 2 wiring) **Proposed** |
| [017](ADR-017-patient-flow-supply.md) | Department Completeness — Patient Flow & Supply Consumption | Accepted |
| [018](ADR-018-ai-medical-coder.md) | AI Medical Coder Agent | Accepted |
| [019](ADR-019-timeline-branch-journal.md) | Timeline Engine — Branch Journal Isolation | Accepted |
| [020](ADR-020-state-invariant-validation.md) | State Invariant Validation | Accepted |
| [021](ADR-021-primary-diagnosis-priority.md) | Primary Diagnosis Selection by Priority | Accepted |
| [022](ADR-022-intervention-validation.md) | Intervention Param Validation | Accepted |
| 023 | *Never written* | Gap |
| [024](ADR-024-handler-orchestration-phases.md) | Handler Orchestration Phases | Accepted |
| [025](ADR-025-quality-fixes.md) | Assessment-Driven Quality Fixes | Accepted |
| 026 | *Never written*, but cited: `tests/boundary-contract.test.ts` ("ADR-026: Boundary & Contract Tests") and two benchmark reports | Gap — needs writing |
| [027](ADR-027-international-adapter.md) | International Adapter Architecture — US Healthcare (Epic X design) | Accepted |
| [028](ADR-028-mortality-risk-engine.md) | Mortality Risk Engine (**formerly ADR-004**) | Accepted |
| [029](ADR-029-workforce-management.md) | Agent Assignment & Workforce Management (**formerly ADR-017**); Amendment 1 (roster) **Proposed** | Accepted |

Also here: [M9.3-BLOCKER-DECISIONS.md](M9.3-BLOCKER-DECISIONS.md) (owner decisions on Epic IX M9.3) and
[`evidence/`](evidence/) (benchmark runs cited by ADR-004).

## Renumbering 2026-10-27

Two numbers had been used twice. The ADR that the code cites keeps the number; the other moves to the next free
number, with a "formerly" note at its top. Documents written before this date may still cite the old numbers:

| Old citation | Means | Now |
|---|---|---|
| ADR-004 *Mortality Risk Engine* (`adr/`) | mortality risk scoring, `assessMortalityRisk` | **ADR-028** |
| ADR-004 *Bounded state and durable scheduling* | `DR_BOUNDED_STATE`, `DR_DURABLE_QUEUE`, snapshot v2 | ADR-004 (unchanged) |
| ADR-017 *Agent Assignment & Workforce Management* | agent ↔ encounter assignment, sick leave | **ADR-029** |
| ADR-017 *Patient Flow & Supply Consumption* | rujuk balik, kamar jenazah, appointments, dept consumption | ADR-017 (unchanged) |
| ADR-009 in `adr/` (vision, 2026-06-28) | superseded draft of ADR-009 | [archive](archive/ADR-009-timeline-engine-vision-2026-06-28.md) |
