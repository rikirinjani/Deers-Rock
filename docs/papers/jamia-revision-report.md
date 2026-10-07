# DR Manuscript — JAMIA Revision Report

**Date:** 2026-09-10
**Manuscript:** `docs/papers/dr-prelude-draft.md`
**Prior audit:** `docs/papers/jamia-pre-submission-audit.md`
**Verdict:** MAJOR REVISION REQUIRED (editorial/author items remaining)

---

## Changes applied

| # | Change | Detail |
|---|---|---|
| 1 | **Bed-count contradiction resolved** | "peak bed occupancy 54.2/55 (99%)" → **"mean peak bed occupancy 130.9 of 133 beds (98%)"** (2 occurrences), per the frozen E1 summary (`experiment-2026-06-28T18-23-06-472Z-summary.json`: `bedOccupancy mean 130.9, max 133`) |
| 2 | **Abstract rewritten** to JAMIA R&A format (Objective / Materials and Methods / Results / Discussion / Conclusion) | 301 → **242** words ✅ |
| 3 | **Keywords trimmed** | 6 → 5 |
| 4 | **Declarations added** | Data availability, Ethics, AI disclosure, Funding (AUTHOR ACTION REQUIRED), Competing interests (AUTHOR ACTION REQUIRED), Acknowledgements (AUTHOR ACTION REQUIRED), Related manuscript |
| 5 | **Companion citation added** | "[companion paper]" → [15] (Kronos Engine companion); non-overlap stated |
| 6 | **Author metadata placeholders** | `[To be added]` → explicit `AUTHOR ACTION REQUIRED` |

## Bed-count evidence trace (HARD GATE — resolved)

- **55** = arithmetic error in the DR adversarial review (listed components sum to 131, wrote "55"); it had regressed the manuscript from the correct value.
- **133** = the capacity used by the E1 experiment (2026-06-28, pre-`6947c57`); pre-`6947c57` default layout sums to 133; E1 summary max occupancy = 133.
- **131** = current default `BUILDING_LAYOUT` (post-`6947c57`), a later code drift.

The manuscript now reports the evidence-backed 130.9/133 (98%).

## Word/abstract status

| Item | Limit | Actual | Status |
|---|---|---|---|
| Main text | 4,000 | ≈2,133 | ✅ |
| Abstract | 250 | 242 | ✅ |
| Figures | 6 | 4 (placeholders) | ⚠️ author/production |
| Keywords | 5 | 5 | ✅ |
| References | unlimited | 15 | ✅ |

## Numerical consistency

Handler count 38 ✅; 49 ICD-10, 9 departments, 22-drug formulary, 7 disaster types ✅; tick = 1 min; snapshots every 100 ticks, retain 5; LOS 82.9 (SD 10.4); deaths 4.3 (SD 1.9); occupancy 130.9/133 (98%); 127 tests / 17 files ✅. Word-count metadata in the freeze record (~2,460 vs header ~3,200) should be reconciled to the measured ~2,133.

## Remaining required work

1. Author metadata (names, affiliations, corresponding author, email, ORCID, funding, COI, acknowledgements).
2. Render Figures 1–4 (or remove unnecessary ones).
3. Optional: adopt Background-and-Significance / Discussion heading structure for strict JAMIA R&A compliance.
4. Reconcile the freeze-record word count/reference count metadata.
