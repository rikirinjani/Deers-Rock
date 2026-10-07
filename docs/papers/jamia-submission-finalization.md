# DR Submission Package — Finalization Record

**Date:** 2026-09-10
**Scope:** Deers Rock only
**Verdict:** READY AFTER AUTHOR CONFIRMATION

---

## 1. Files created or modified

| File | Change |
|---|---|
| `docs/papers/figures/figure-1-architecture.svg` | Created (vector SVG) |
| `docs/papers/figures/figure-2-handler-pipeline.svg` | Created (vector SVG) |
| `docs/papers/figures/figure-3-calendar-modifiers.svg` | Created (vector SVG) |
| `docs/papers/figures/figure-4-per-seed-los.svg` | Created (vector SVG) |
| `docs/papers/figures/README.md` | Updated (production files + raster-export note) |
| `docs/papers/jamia-dr-submission.md` | Data Availability → Zenodo DOI; reference [15] author corrected (Kirinjani → Rinjani) |
| `docs/papers/dr-prelude-draft.md` | Same two corrections |
| `docs/papers/jamia-submission-field-map.md` | Figures → READY (SVG); Data Availability → READY |
| `docs/papers/jamia-submission-package-manifest.md` | Figures → SVG; Zenodo record row |

**Scientific content unchanged.** No experiments rerun; frozen E1 evidence and freeze record untouched; historical 133-bed configuration preserved.

## 2. Final package inventory

**For journal upload:**
- Manuscript: `docs/papers/jamia-dr-submission.md`
- Figures (vector SVG): `figure-1-architecture.svg`, `figure-2-handler-pipeline.svg`, `figure-3-calendar-modifiers.svg`, `figure-4-per-seed-los.svg`
- Tables: none

**Archival/reproducibility (not journal upload):**
- Mermaid sources `figure-{1..4}-*.mmd`; `figures/README.md`; `jamia-figure-provenance.md`
- `docs/experiments/EXPERIMENT-FREEZE-2026-09-10.md` (SHA-256 freeze record)
- Zenodo artifact: https://doi.org/10.5281/zenodo.22699524 (8 files)
- Repository commit: `5884ba39729768693bb91dfd796d8fe2e246ea68`
- Package docs: author-action register, field map, manifest, cover-letter inputs, readiness report, revision report, pre-submission audit

**Excluded (stale/fabricated legacy figures):** `fig1-architecture.svg`, `fig2-los-histogram.png`, `fig3-bed-occupancy.png` + their `.py` scripts.

## 3. Figure production status

| Figure | SVG | Caption | Referenced in text | Legibility |
|---|---|---|---|---|
| 1 Architecture | ✅ | ✅ | ✅ (§3) | Arial 12–15 px |
| 2 Handler pipeline | ✅ | ✅ | ✅ (§3) | Arial 12–15 px |
| 3 Calendar modifiers | ✅ | ✅ | ✅ (§4.6) | axis 11.5–12 px |
| 4 Per-seed LOS | ✅ | ✅ | ✅ (§6) | axis 12 px |

All four SVGs are well-formed XML, no placeholders, no clipping, consistent palette (#2c7bb6 / #e08a2e). Raster export (PNG/TIFF ≥300 dpi) optional if the journal requires it.

## 4. Manuscript integrity status

- Title preserved; structured abstract (244 words) and wording preserved.
- Author metadata complete: Riki Rinjani · Hisfarma IAI · ORCID 0009-0002-9364-2637 · riki.rinjani@hisfarma.com.
- Data Availability, AI disclosure, Ethics, companion disclosure present.
- No placeholders; no stale values (55 beds / 54.2/55 / 3 of 10 / 6.0 vs / 35 handlers all absent).
- Historical values intact: 133 beds, LOS 82.9 ± 10.4, deaths 4.3 ± 1.9, occupancy 130.9/133 (98%), 2/10 (5.5 vs 4.0).
- Only KE references are the intended companion disclosure (reference [15] + Related manuscript + conclusion). No KE results reproduced.
- No secrets/tokens; no temp/debug files in the submission directory.

## 5. Submission-field map status

`docs/papers/jamia-submission-field-map.md` — all fields mapped. READY: title, abstract, keywords, authors, affiliations, corresponding author, email, ORCID, manuscript file, figures, data availability, ethics, AI disclosure, companion disclosure, article type. AUTHOR ACTION: funding, COI, acknowledgements, cover letter.

## 6. Remaining author actions

- Funding statement (or "none").
- Conflict-of-interest statement (or "none").
- Acknowledgements (or "none").
- Cover letter (not drafted; input sheet at `jamia-cover-letter-inputs.md`).
- Optional: raster figure export if required; confirm ethics/AI/data statements.

## 7. Verdict

**READY AFTER AUTHOR CONFIRMATION** — the manuscript and figure/package artifacts are submission-ready; only author-supplied statements (funding/COI/acknowledgements) and the cover letter remain.
