# Deers Rock — Zenodo Research Artifact

Frozen research artifact accompanying the JAMIA 2026 manuscript:

> **Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia**

## Contents

| Directory | Contents |
|---|---|
| `manuscript/` | Final submission copy (`jamia-dr-submission.md`) |
| `evidence/e1-baseline/` | Frozen E1 artifacts: 10-seed summary JSON + per-run CSV |
| `documentation/` | Experiment freeze record, reproducibility notes |
| `software/` | `CITATION.cff`, `LICENSE` (Apache-2.0) |

## Frozen results (E1 baseline, 10 seeds × 1,000 ticks)

- Mean length of stay: 82.9 ticks (SD 10.4)
- Mean deaths per run: 4.3 (SD 1.9)
- Mean peak bed occupancy: 130.9 of 133 beds (98%, SD 2.4)
- Disaster-triggered runs: 2/10 (seeds 3, 7); deaths 5.5 vs 4.0 (descriptive)

## Scope and non-claims

Deers Rock is a deterministic, seeded micro-simulation. All clinical parameters are plausibility-based and have **not** been calibrated against real hospital data. This artifact makes **no** clinical-validity, predictive, or population-representativeness claims. Deterministic replay is verified within the same process and platform only.

## Provenance

- Repository: `https://github.com/rikirinjani/Deers-Rock` (Apache-2.0)
- Git commit: `5884ba39729768693bb91dfd796d8fe2e246ea68`
- Freeze date: 2026-09-10
- Creator: Riki Rinjani (ORCID 0009-0002-9364-2637), Hisfarma IAI

No experiment was re-run for this artifact; the frozen files are copied unmodified (SHA-256 recorded in the freeze record).
