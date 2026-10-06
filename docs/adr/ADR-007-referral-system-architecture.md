# ADR-007: Referral System — Rujukan Berjenjang (Tiered Referral)

**Status:** Accepted
**Date:** 2026-10-07
**Origin:** Codified from ADR-016 wave 1 implementation (commits `13b90c5`, `d64f485`) and the M9.3 owner blocker decisions
**Scope:** Incoming referral geography, capacity, and queueing (`src/referral/`). Companion record to ADR-016; wave 2 (ambulance) extends this.

---

## Context

The Indonesian health system uses **Rujukan Berjenjang** — tiered referral. Care flows up a facility ladder: Puskesmas (primary care) → RS D → RS C → RS B → RS A, with each tier handling what the tier below cannot. A referral hospital's patient mix is therefore a function of *which geography* refers into it, not just local demand.

Deers-Rock (Makassar, South Sulawesi) sits in this ladder as an **RS C / tier-3** facility (owner decision, M9.3 blockers, 2026-10-06) serving as a regional referral destination for eastern Indonesia. Before M9.3 the referral system had no geographic routing and no capacity limit — any facility could refer anyone, instantly, in unlimited volume.

## Decision

- **Geo hierarchy is enforced via `src/referral/geo.ts` pure functions.** `facilityTier(type)` maps the ladder to numeric tiers: Puskesmas/Klinik → 1, RS D → 2, RS C → 3, RS B → 4, RS A → 5. No rng, no state mutation — routing decisions are deterministic functions of facility attributes.
- **Catchment bands** (via `catchmentBand()`, relative to Deers-Rock at province 73 / regency 71):
  - **Makassar city (immediate)** — same regency (73/71).
  - **South Sulawesi (secondary)** — same province (73).
  - **Eastern Indonesia (tertiary)** — the eastern province set (71, 72, 75, 63, 64, 65, 81, 91, 93).
  - Senders are restricted to Sulawesi + eastern Indonesia (`isEligibleSender`); everything else is out of catchment.
- **Referral capacity is limited by `REFERRAL_DAILY_SLOT_BUDGET = 5`** letters per specialist slot budget per handler pass (referral handler fires every 15 ticks → ≈20 letters/day simulated). The budget models specialist acceptance capacity on the receiving side.
- **FIFO drain with age-out at 500 ticks** (`REFERRAL_AGE_OUT_TICKS`). Letters beyond the budget stay queued in `incomingQueue` (FIFO); letters received but not converted to an encounter within 500 ticks (≈8.3 sim-hours) move to `returned` status — the letter goes back to the sender, it is not silently dropped.

## Consequences

- **Positive:** Patient mix reflects geography — a tier-3 Makassar hospital draws from its catchment bands, not from Jakarta or Aceh. Out-of-catchment referrals are **rejected** (excluded at generation), restoring data coherence.
- **Positive:** The specialist slot budget creates a realistic bottleneck — referral demand queues, waits, and sometimes bounces back — instead of instantaneous unlimited intake. This is the capacity pressure future experiments will study.
- **Positive:** Determinism preserved — fixed draw counts and counter-based IDs (ADR-016 D7); one declared seed break, baseline re-frozen as `referral-v1`.
- **Negative:** Age-out at 500 ticks is shorter than real referral wait times in some scenarios; it is a tunable ballpark (M9.3 blocker decision 4), not a calibrated constant.
- **Neutral:** Wave 2 (ambulance dispatch, BLS/ALS, costing, derived `arrivalMode`) will extend this architecture — the queue, catchment bands, and tier function are the substrate it builds on (ADR-016 D8).

## Related

- ADR-016 — Referral system & ambulance architecture (the full wave design this implements)
- `docs/adr/M9.3-BLOCKER-DECISIONS.md` — owner decisions: catchment provinces, Deers-Rock tier (RS C), domain parameters
- Epic IX M9.3 — roadmap milestone
