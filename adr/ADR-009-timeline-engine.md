# ADR-009: Timeline Engine — Counterfactual Experimentation

**Status:** Accepted (Vision ADR)
**Implementation:** Deferred
**Date:** 2026-06-28
**Author:** Coordinator OC (concept), External Reviewer (refinement)

## Motivation

HOE currently supports deterministic replay through seeded PRNGs (ADR-008) and snapshot persistence. These capabilities naturally enable branching timelines. Rather than treating snapshots solely as debugging artifacts, HOE will treat them as experimental rewind points — Points of Rewind — from which counterfactual histories can be explored.

This moves HOE from answering *"What happened?"* to answering *"What would have happened if we had made a different decision?"*

### Concrete Scenarios

**Scenario 1 — HIS Crash Recovery.** The simulation crashes at Tick 200. Rewind to Tick 190, run a debug version against the exact same patient flow. Does it crash again? No — ship the fix with the same test case as proof.

**Scenario 2 — Disaster Response.** A tsunami hits at Tick 300. Rewind to Tick 280. Test five resource allocation policies (open all beds, evacuate, triage tents, military hospital, blood bank surge). Which minimizes mortality? Policy wins are evidence-based, not guessed.

**Scenario 3 — Diagnostic Rule Validation.** Patient X arrives at Tick 450 with symptoms of UTI but actually has sepsis. Rewind to Tick 440, update the triage rules, re-run. Does Patient X now get flagged correctly? The diagnostic rule is validated against a ground-truth replay.

**Scenario 4 — Protocol Optimization.** A policy change (e.g., "Triage all chest pain as high-risk") is retroactively tested against the last 100 similar cases. Does mortality decrease? The policy is optimized on historical data before live deployment.

**Scenario 5 — Clinical Education.** A patient died at Tick 445. Binary search through snapshots to find the last tick at which a different decision could have changed the outcome. That tick is the teaching moment — the precise point where clinical reasoning mattered most.

## Definitions

| Term | Meaning |
|------|---------|
| **Seed** | The unique identifier that creates a simulation universe by initializing its deterministic randomness. |
| **Universe** | A complete simulation run identified by its seed. `U-YYYY-NNNN` with explicit genealogy once formalized. |
| **Snapshot** | A complete saved state of the universe at a specific simulation tick. The Point of Rewind. |
| **Point of Rewind** | A snapshot from which one or more branches are created. The fork in history. |
| **Branch** | A new timeline created by restoring a snapshot and changing one or more conditions. |
| **Timeline** | The complete sequence of events from a seed or branch. |
| **Genealogy** | The parent-child relationship between universes and branches. |
| **Counterfactual Experiment** | A controlled experiment where one variable is changed at the Point of Rewind, holding everything else constant. |
| **Counterfactual Branch Point** | The paper term for Point of Rewind. Used in publications to distinguish the experimental concept from game terminology. |

## Slogan

**Counterfactuals by Construction.**

The platform is not hacked to support alternate histories. It was architected so branching timelines emerge naturally from seeded PRNGs and snapshot persistence.

**Every seed is a history. Every snapshot is a choice.**

Companion slogan. The seed identifies the universe; the snapshot identifies the moment where a decision could have changed everything.

## Reference API Shape

The following TypeScript interface captures the intended abstraction. Not a commitment to this exact signature — a design reference for Platform OC when implementation begins.

```typescript
class PointOfRewind {
  seed: number              // which universe
  tick: number              // which moment
  snapshot: HospitalState   // exact state at that moment
  label: string             // "Pre-tsunami", "Day 3 surge peak"

  branch(policyChange: PolicyDelta): Timeline {
    // restore snapshot, apply change, run forward with preserved seed
  }

  compare(timelineA: Timeline, timelineB: Timeline): DivergenceReport {
    return {
      mortalityDelta: timelineB.deaths - timelineA.deaths,
      losDelta: timelineB.avgLOS - timelineA.avgLOS,
      costDelta: timelineB.totalCharges - timelineA.totalCharges,
      firstDivergenceTick: findFirstDivergence(timelineA, timelineB),
    }
  }
}
```

ADR-008 already provides the infrastructure (seeded RNG, snapshot persistence). The Point of Rewind is simply a named snapshot with a branching interface on top.

## Non-Goals

Timeline Engine is explicitly NOT:
- Version control for snapshots
- Multiplayer or collaborative simulation
- Distributed simulation
- A general-purpose temporal database

## Domain Independence

Timeline Engine is intentionally specified as a generic temporal abstraction. Although first implemented for healthcare, the branching mechanism (seed → universe → snapshot → branch) is not tied to hospitals. Healthcare experiments are merely the first consumer. No extraction commitment — recognition that the abstraction is broader than its first application.

## Implementation Gate

Implementation of Timeline Engine begins after:
1. **Epic 0 (Core Stability)** — snapshot/restore reliable, agent state persisted, storage bounded
2. **Epic I (Clinical Fidelity)** — simulation believable enough that counterfactuals are meaningful

## Related

- ADR-008: Seeded Random Number Generation (the infrastructure that makes this possible)
- ADR-002: Snapshot and Journal Retention Strategy (snapshots are the Points of Rewind)
- ROADMAP.md Epic III (Timeline Engine)
- Constitution §1.3 (Determinism)
- Constitution §1.4 (Counterfactual Experimentation)
