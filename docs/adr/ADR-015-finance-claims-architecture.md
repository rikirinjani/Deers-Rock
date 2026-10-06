# ADR-015: Finance & Claims Architecture (Epic IX M9.1 + M9.2)

**Status:** Accepted
**Date:** 2026-10-06
**Origin:** Oracle design review (ora-1, 2026-10-06) + explorer recon (exp-1)
**Scope:** Wave 1 of Epic IX. M9.3 (referral geography/ambulance) is wave 2. Supply COGS wave 2+.

---

## Context

Deers-Rock's money layer is structurally present but quantitatively fictional:

- **Room charges bill every 5 ticks = 5 sim-minutes** (1 tick = 1 min, `clock.ts:44-51`). One kelas-3 inpatient stay (LOS 3–7 days) accrues ~IDR 300M–1B against INA-CBG tariffs of 3–22M (`ina-cbg.ts`). `actualCost` and `computeBpjsEfficiency` are off by ~2 orders of magnitude.
- **Drug acquisition costs exist but are never billed** — `costIdr` on all ~175 drugs (`drug-catalog.ts:37`); pharmacy bills a flat 75k whether dispensing paracetamol or tenecteplase.
- **Dialysis and radiotherapy are fully simulated and bill zero.** ED, specialty consults, respiratory therapy: categories defined, no creation sites.
- **Claim adjudication clears 1 claim per 15 ticks** (`finance.ts:175-197`) while discharges create claims in batches — the `submitted` backlog grows unboundedly, pinning charges in memory (pruning treats only `paid|denied` as terminal).
- **Severity/tariff divergence bug:** severity inferred from chart dx (`finance.ts:108`) but tariff looked up from *patient* active dx (`:110-111`). Real BPJS groups on the coded chart.
- **Payer mix is fictional:** `assignPayer` produces only BPJS/Self-pay/Jasa Raharja; `BPJS Ketenagakerjaan` and `Private Insurance` PayerTypes exist but are never assigned; `PAYERS` array is half-dead with invalid values.
- **Denials are rng noise** (flat 85/10/5 roll) — untraceable to chart state, hence unlearnable for the Codex coding-drill consumer.

Consumer requirements: the INA-CBG grouper validation loop with Codex Interpretum needs `actualCost` in a plausible band vs tariffs, causal (chart-state-driven) denials, and a payer mix that produces differentiated revenue signatures. Controlled experiments need seeded determinism preserved.

## Decision

### D1 — Pricing model (hybrid)
Item-level price tables as TypeScript data modules (same pattern as `INA_CBG`), with drug prices **computed** at module load: `costIdr × PHARMACY_MARKUP` (1.25). `Charge` gains optional additive fields `code?`, `unitPrice?`, `quantity?`; `amount` remains the canonical billed total. All 6 charge-creation sites migrate to priced amounts. `CHARGE_RATES` retained only as fallback for unpriced categories — every currently-billed category gets a real price in wave 1.

### D2 — Room billing per DAY, stamped at admission (fixes F-A)
Bill room once per 1440-tick sim-day from a `roomClassAtAdmission` stamp set at bed assignment (`markov.ts:91`). BPJS ward class (kelas-1/2/3) drawn once at admission alongside payer (~15/25/60%), stored on the encounter; bed selection filters to eligible class with any-free-bed fallback (no waiting-room deadlock). VIP/VVIP restricted to Private/Self-pay; billed at class rate with `upgrade: true`; selisih top-up arithmetic deferred.

### D3 — Claim lifecycle (fixes F-B)
`submitted → verifying → adjudicated → paid | denied`, plus `returned` (defect; auto-resubmits after coder fix — existing behavior). Batch-adjudicate up to **8 claims per 15-tick pass**. The dead `adjudicated` enum becomes the post-verification decision point. Denial taxonomy gains `"procedure_not_documented"` and `"invalid_principal_dx"`; denial probability becomes a **function of chart state** (coder error model), not flat rng.

### D4 — Coded chart is the sole grouping truth source (fixes divergence bug)
Tariff lookup moves to the chart's primary diagnosis (fallback: chart first dx, then encounter primaryDiagnosis), matching severity inference which already uses chart dx. Charts are refreshed at discharge (final dx + completed procedures) and set to `completed` (activates the dead enum).

### D5 — Payer mix (all five PayerTypes activated)
One rng draw at encounter creation, stored on the encounter, never re-derived: non-WNI → Self-pay (override); accident ICD → Jasa Raharja (override); else BPJS Kesehatan ~82% / BPJS Ketenagakerjaan ~8% (CBG-like path in wave 1) / Private ~7% / Self-pay ~3%. Mix isolated in one `PAYER_MIX` table. Private insurance: 3-tier data table (80/90/100% coverage, 10/5/0% co-pay), no annual ceiling in wave 1.

### D6 — Coder error model (static coders stay, statefulness added)
The 4 static AI coders are NOT migrated to the agent pool (YAGNI). Upgraded in place: failed accuracy roll drops one severity-relevant secondary dx (feeds `incomplete_coding` denials + SEP under-grouping causally); pre-submission validation confirms chart primary has a CBG mapping. Primary-dx miscoding is out of wave 1.

### D7 — Unbilled departments priced (per-event hooks)
Dialysis per completed session (~700k–1.2M by type), radiotherapy per delivered fraction (~800k–1.5M by modality), ED acuity-scaled fee at disposition, specialty consults on order completion, respiratory therapy per-order activation. Supply/inventory COGS deferred (needs StockTransaction linkage).

### D8 — Determinism rules (codified)
1. **Entity-creation draws:** new random attributes (payer, payer class) drawn exactly once at creation, stored on the entity; never re-derived per-tick.
2. **Transition draws:** one roll per transitioned entity (per claim adjudicated), bounded batch per pass; draw count = pure function of state.
3. **No draws in defensive re-derivation:** billingHandler per-encounter loops call `clock.rng()` only at claim creation (SEP number) and cashier payment.
4. `clock.rng()` only — no Math.random, no Date.now, no second RNG pathway.
Determinism test strengthened: full charge/claim/payment **content** equality (not just `.size`) across same-seed runs.

### D9 — Cashier flips `charge.paid`
`processCashier` writes `Payment` and flips linked charges to `paid: true` in the same pass (flag existed, never set).

### D10 — Deferred (wave 2/3)
Appeals; partial payments; VIP/VVIP selisih balance-billing; INA-CBG outlier top-up; private annual policy ceilings; BPJS Ketenagakerjaan JKK-specific accident workflow; payer-differentiated drug markups; supply COGS; referral phantom-patient integrity (M9.3 owns it).

## Compatibility & migration

- **Seed break declared.** Per-day billing + admission draws shift every trajectory. Frozen baselines (EXPERIMENT-FREEZE-2026-09-10, zenodo) re-versioned: `finance-v1` archived read-only, re-frozen as `finance-v2` at Phase 4 gate.
- **Surfaces additive only:** `charges.csv` gains `category,code,unitPrice,quantity`; FHIR Claim gains line items; `FinanceSummary` gains `denialMix`, `ccrByPayer`; `InsuranceClaim.payer` tightened to `PayerType`. `Charge.id` format and claim field names unchanged.
- **Broken tests, expected:** `finance.test.ts` room-cadence (350k @ tick 5) and single-adjudication timing — rewritten around day-boundary ticks and driven loops.

## Implementation phases (gates)

| Phase | Content | Gate |
|-------|---------|------|
| 0 | ADR-015 + characterization tests (divergence bug, dead enums, unpaid flag) | Suite green; characterization documents current behavior |
| 1 | M9.1 pricing core (D1, D2, D7, D9) | Pricing unit tests; determinism content-equality; 1000-tick soak, median CCR 0.7–1.3 band |
| 2 | Chart truth + coder upgrade (D4, D6) | Divergence regression test; claim creation gated on validated charts, no throughput collapse |
| 3 | M9.2 claims & payers (D3, D5) | Lifecycle matrix (5 payers × statuses × denial reasons); invariant holds; backlog drains over 2000 ticks |
| 4 | Surfaces + baseline re-freeze (D9 surfaces) | Full suite; soak p95 ±20%; Codex adapter E2E green |

## Consequences

- `actualCost` lands in a plausible band vs CBG tariffs → `computeBpjsEfficiency` becomes meaningful for revenue modeling.
- Denials become codable-defect-driven → Codex drill can teach "code this to avoid that denial."
- Charge volume drops massively (per-day room) → bounded-state budgets improve.
- Every prior seeded trajectory is numerically stale → baselines re-versioned (accepted).
- Payer mix constants are calibration guesses → single-table isolation makes recalibration non-code.
