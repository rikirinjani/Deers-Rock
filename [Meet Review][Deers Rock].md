# 🔬 Peer Review Result — Deer's Rock (SoftwareX Pivot)

> Simulated pre-submission red-team review. Venue: SoftwareX (software paper criteria).

| Reviewer | Score | Recommendation |
|----------|-------|----------------|
| R1 — The Champion | 7/10 | Minor Revision |
| R2 — Methodological Skeptic | 5/10 | Major Revision |
| R3·AC — Novelty Hawk | 6/10 | Minor Revision |
| **AC Consensus** | **~6/10** | **Minor Revision** |

## Key Weaknesses (Consensus)

1. Repository URL, license, and documentation status not stated — non-negotiable for SoftwareX
2. No feature comparison table against SimPy, AnyLogic, MedModel, Synthea
3. Runtime performance data missing (adoption barrier for readers)

## Top Quick Fixes (All低成本)

1. Add repository URL + license + README link
2. Add a 5-row feature comparison table
3. Add runtime performance (wall-clock for 1000/5000/10000 ticks)
4. Caveat the 82% mortality claim (3 vs 7 runs, post-hoc)
5. Add system requirements and quick-start example

## Verdict

The SoftwareX pivot is strategically sound — this format fits the platform's architectural contribution far better than a full research paper. No new experiments are needed for acceptance; only mechanical additions (repo, table, benchmarks). The cultural calendar engine remains the strongest differentiator.

## Full Report

See `redteam/deers-rock-softwarex-redteam.md` for complete reviews, AC meta-review, and detailed fix list.
