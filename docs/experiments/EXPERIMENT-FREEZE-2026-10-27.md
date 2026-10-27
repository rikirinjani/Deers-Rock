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
~10 simulated days (14,400 ticks). Not run yet: per-tick cost grows with accumulated state, about 2 minutes per
simulated day by day 2 with `DR_BOUNDED_STATE=1`, so 10 seeds × 10 days is about 1–1.5 hours on 4 cores. The slowdown
is identical on `main` and is not from this branch.
