# Deers Rock — Experiment Data Freeze Record (`substream-v1`)

**Date:** 2026-10-27
**Status:** FROZEN — reference baseline after the declared seed break of ADR-008 Amendment 1
**Approved by:** owner, 2026-10-27 (re-freeze approved together with ADR-008 Amendment 1)
**Repository:** `github.com/rikirinjani/Deers-Rock`, branch `epic-audit-vi-ix`
**Code commit:** `ae7b776` (clean tree)
**Predecessor:** [`EXPERIMENT-FREEZE-2026-09-10.md`](EXPERIMENT-FREEZE-2026-09-10.md) — stays read-only. It is the JAMIA
manuscript / Zenodo evidence and is **not** superseded for that paper; this record is the reference for new work.

---

## Why a re-freeze

Per-handler RNG sub-streams (ADR-008 Amendment 1, 2026-10-27) change every trajectory. The workforce roster and its
Indonesian calibration (ADR-029 Amendment 1) and the Epic IX M9.3 wiring land in the same code. Precedent: the
`finance-v1` → `finance-v2` and `referral-v1` re-freezes (ADR-015, ADR-016).

## Frozen study: E1 configuration (10 seeds × 1,000 ticks)

| Artifact | Bytes | SHA-256 |
|---|---|---|
| `freeze-2026-10-27-substream-v1/e1-substream-v1-2026-10-27T05-46-40-439Z-summary.json` | 5,674 | `0a164749ed8385850b4a7f6ee69eaabb1ffcaf5aaad006e383cebdc06c9843db` |
| `freeze-2026-10-27-substream-v1/e1-substream-v1-2026-10-27T05-46-40-439Z.csv` | 901 | `eb79ec0d9d9bedee0db8aaea26618090b4789ba6ab26ef48cad5d6002ed676a0` |

## Configuration

- Seeds 0–9 (10 runs), 1,000 ticks each (1 tick = 1 simulated minute), 50 initial patients
- Produced by `runExperiment({ seedCount: 10, ticks: 1000, patientCount: 50, prefix: "e1-substream-v1" })`
  (`src/experiment/runner.ts`)
- Current default hospital layout: **131 beds** (the 2026-09-10 freeze used the historical 133-bed layout)
- Flags: none set (`DR_BOUNDED_STATE`, `DR_DURABLE_QUEUE`, `DR_FREEZE_LEARNING` all off)
- Disaster scenario engine: stochastic (not forced)

## Reproducibility

The configuration was run twice, independently, on the same commit. CSV and summary are **byte-identical** apart
from the timestamp in the file names.

## Frozen results

| Metric | Value |
|---|---|
| Deaths per run | 0 in all 10 runs |
| Mean length of stay, discharged encounters | 4.8 ticks (SD 0.4; range 4–5) |
| Mean length of stay, active encounters at tick 1000 | 603 ticks (SD 7.9; range 593–616) |
| Peak bed occupancy | 131 of 131 beds in all runs |
| Encounters per run | 500 in all runs |
| Disaster-triggered runs | 1 of 10 (seed 3, sunken ship) |

## Comparability warning — read before using these numbers

**The E1 horizon no longer observes inpatient outcomes.** Since commit `e458f6f` (2026-10-08, ADR-021/022)
inpatient stays last 3–7 simulated days (4,320–10,080 ticks), and deaths are rolled at discharge. A 1,000-tick run
covers under one simulated day, so:

- no inpatient is discharged and no death can occur (0 deaths in every run);
- "length of stay, discharged" measures only ED and outpatient encounters (minutes, not days).

This predates the seed break: `main` (`0d60971`, before any change on this branch) gives the same picture with the
same configuration (0 deaths, discharged LOS 5.3 ticks). The 2026-09-10 figures (4.3 deaths per run, LOS 82.9 ticks)
come from the earlier length-of-stay model and **must not be compared** with these.

This freeze fixes the E1 configuration as a deterministic regression reference: any later change that moves these
bytes changes trajectories. It is **not** a clinical outcome baseline. An outcome baseline needs a horizon of at least
~10 simulated days (14,400 ticks): see **Study 2** below (`outcome-v1`). Running it required removing three
O(encounters × orders) scans (`30d441f`), verified result-neutral against this E1 freeze (byte-identical).

---

# Study 2: Outcome baseline `outcome-v1` (10 seeds × 10 simulated days)

**Approved by:** owner, 2026-10-27 ("run the new outcome baseline").
**Code commit:** `30d441f`, run from a fresh `git clone` of the pushed branch into an isolated directory (dependencies
shared via symlinked `node_modules`; the clone's source tree was clean before and after).
**Why:** the E1 horizon (above) cannot observe inpatient outcomes. 14,400 ticks covers 3–7-day stays several times.
**Runtime:** 09:19–12:31 UTC on 4 cores via `src/experiment/parallel.ts` (one process per seed, merged in seed order).
The job hit the 2-hour background limit after 6 seeds; it resumed from the saved per-seed results and re-ran the 4
interrupted seeds from tick 0. No partial run was reused.

| Artifact | Bytes | SHA-256 |
|---|---|---|
| `freeze-2026-10-27-outcome-v1/outcome-v1-2026-10-27T12-31-58-122Z.csv` | 1,504 | `62b0850ad610d0b2188e9ed1af272b4e4653b5c625ebff8ba4363f9dd614db5f` |
| `freeze-2026-10-27-outcome-v1/outcome-v1-2026-10-27T12-31-58-122Z-summary.json` | 7,029 | `9f0b7a3e08cc4256536b6d54052999f6fc4b0fb52e332240c0bee469a1c49a86` |
| `freeze-2026-10-27-outcome-v1/outcome-v1-outcomes.json` | 11,189 | `1c9a2e2174b8d4f183e48aaf3e717034d254b11c9a42a4b52cd6a5df4617b851` |

The CSV and summary use the E1 format; `outcomes.json` holds the per-seed `OutcomeMetrics` (`src/experiment/outcomes.ts`).

## Configuration

Seeds 0–9, 14,400 ticks (10 simulated days) each, 50 initial patients, 131 beds, no flags, stochastic disasters.

```
npx tsx src/experiment/parallel.ts --seeds 10 --ticks 14400 --patients 50 --jobs 4 --prefix outcome-v1
```

## Results (mean, SD, 95% CI, range across 10 seeds)

| Metric | Value | Indonesian reference (Depkes RI) |
|---|---|---|
| Inpatient discharges per run | 191.6 (SD 6.6; ±4.1; 184–206) | — |
| Deaths per run | 6.9 (SD 2.2; ±1.4; 4–11) | — |
| In-hospital mortality | **3.62 %** (SD 1.23; ±0.76; 2.14–5.98) = 36 ‰ | GDR < 45 ‰; NDR < 25 ‰ |
| Inpatient length of stay, mean | **4.79 days** (SD 0.09; 4.64–4.93) | ALOS 6–9 days |
| Bed occupancy at day 10 | **99.7 %** (98.5–100) | BOR 60–85 % |
| Discharged "improved" / "deteriorated" | **2.9 % / 93.5 %** | — (see finding 1) |
| ED + outpatient encounters held at day 10 | 3,634 (SD 28) | — |
| Referral letters / completed | 292.9 / 291.6 | — |
| Ambulance dispatches / charged | 72.9 / 62.1 M IDR | — |
| Kontrol appointments booked / completed | 167.6 / 0 | due after day 10 by design |
| Sick-leave episodes (122 staff) | 0.8 | ~0.8 expected (0.25 severe episodes per person-year) |
| Jasa Raharja incidents / claims / claims with incident | 50.3 / 32.0 / 54.7 % | — |

Deaths by ICD across all 69 deaths: I10 hypertension 6, A91 dengue 5, K80, J96, E11, I26, E78 3 each, the rest ≤ 2.

## Reproducibility

Seed 8 was re-run alone from tick 0 after the batch; its per-seed result is compared byte-for-byte below (wall-clock
time excluded). Determinism of the parallel runner is also covered by the E1 study above (byte-identical through
`parallel.ts`) and `tests/experiment-runner.test.ts`.

**Seed 8 re-run: pending** (started 12:33 UTC; this line is updated when it completes).

## What this baseline shows (model findings, not engine bugs)

1. **Discharge outcomes are an artefact.** 93.5 % of inpatients leave "deteriorated". `vitalsUpdateHandler`
   (`markov.ts`, unchanged since at least `e458f6f`) moves every vital sign by `floor(rng·6) − 3` per minute: a
   **biased** random walk (mean −0.5/min) with no pull back to normal. Within one simulated hour mean HR falls 76 → 57,
   systolic BP 124 → 97, SpO₂ 97.8 → 92.3 %, RR 17.9 → 12.8, and patients pile up at the clamps (HR 50, SBP 90,
   SpO₂ 90 %). Outcome classification ("≥ 5 of 7 vitals normal") then fails almost everyone. The same vitals feed the
   mortality-risk score and the AI doctor's triggers, so **mortality is also shaped by this artefact**.
2. **The hospital is saturated:** 99.7 % bed occupancy against the 60–85 % standard, with a large ED/outpatient load.
3. **Stays are short:** 4.8 days against the 6–9-day ALOS standard (the 3–7-day draw in `markov.ts`).
4. **Hypertension (I10) is the leading recorded cause of death**, which is implausible for in-hospital mortality and
   follows from primary-diagnosis selection, not clinical cause.

These are reported, not fixed: each changes outcomes and needs the owner's decision (Research OC). Re-freeze after
any of them is fixed.
