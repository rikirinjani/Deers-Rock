# Length of Stay (LOS) Validation Note

**Epic:** II — Milestone M2.5
**Status:** Documented; formal validation ongoing
**Last reviewed:** 2026-10-07

## 1. Current Implementation

Inpatient length of stay (LOS) is sampled uniformly at admission time in
`src/engine/markov.ts` (`admissionHandler`):

```typescript
const dischargeDelay = 4320 + Math.floor(clock.rng() * 5760); // 3-7 days (avg 5)
```

- 1 tick = 1 minute of simulated hospital time; 1 day = 1440 ticks.
- Range: **4320–10080 ticks = 3–7 days**.
- Mean of the uniform range: 4320 + 5760/2 = 7200 ticks = **5.0 days average**.
- The discharge event is scheduled on the deterministic event queue, so LOS is
  reproducible under identical seeds (deterministic replay is preserved).

## 2. Comparison Against Published Indonesian Hospital Data

Reference point: **Ministry of Health RI (Kementerian Kesehatan) data reporting an
average LOS of 4–6 days for Tier A (Tipe A / rumah sakit rujukan) hospitals.**

| Metric | Deers-Rock (current) | MoH RI Tier A reference |
|---|---|---|
| LOS range | 3–7 days | — |
| Average LOS | 5.0 days | 4–6 days |
| Distribution | Uniform (fixed range) | Empirical, diagnosis-dependent |

The simulated mean of 5.0 days sits in the middle of the published 4–6 day
band, and the 3–7 day spread comfortably covers it.

## 3. Clinical Plausibility Assessment

The current fixed range of **4320–10080 ticks (3–7 days, average 5 days) is
clinically plausible** for a Tier A referral hospital census: it produces an
average LOS consistent with published national figures, and it avoids the
earlier implausibility (sub-hour LOS) previously flagged in project memory.

Known simplifications (acceptable for current milestones):

- LOS is uniform and **not yet diagnosis-dependent** (real ALOS varies
  strongly by ICD-10 group — e.g. normal delivery vs. stroke).
- LOS is independent of severity, complications, and discharge-readiness
  dynamics.

## 4. Ongoing Research / Next Steps

Formal validation against facility-specific data is **ongoing research**. The
**Epic III Timeline Engine (ADR-009, currently deferred)** will enable:

- Diagnosis- and severity-conditioned LOS distributions calibrated to
  facility-specific (Eastern Indonesia referral hospital) data.
- Time-variable admission/discharge rhythms (day-of-week, seasonal effects).
- Statistical goodness-of-fit reporting of simulated vs. observed LOS curves
  as part of the benchmark suite.

Until then, the fixed 3–7 day range remains the documented, clinically
plausible stand-in.
