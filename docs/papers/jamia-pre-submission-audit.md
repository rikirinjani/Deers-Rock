# DR Manuscript — JAMIA Pre-Submission Audit

**Manuscript:** `docs/papers/dr-prelude-draft.md`
**Date:** 2026-09-10
**Companion:** `C:/Users/think/Project_v2/docs/jamia-2026-joint-submission-audit.md`
**Verdict:** MAJOR REVISION REQUIRED

---

## 1. Article-Type Fit

**Research and Applications** (main text ≈2,116 words ≤ 4,000). Brief Communication is not viable (2,116 > 2,000).

| Constraint | Limit | Actual | Status |
|---|---|---|---|
| Main text words | 4,000 | ≈2,116 | ✅ |
| Abstract words | 250 | **≈301** | ❌ over |
| Abstract headings | Objective / Materials and Methods / Results / Discussion / Conclusion | Background / Objective / Methods / Results / Conclusions | ❌ non-compliant |
| Tables | 4 | 0 | ✅ |
| Figures | 6 | 4 (unrendered) | ⚠️ |
| Keywords | 5 | 6 | ⚠️ trim |
| References | unlimited | 14 | ✅ |

## 2. Scientific Boundary Audit

- No clinical-validity, calibration, representativeness, or predictive claims. ✅
- Qualifications retained: plausibility-based parameters; single-hospital scope; rule-based agents; cause-of-death limitation (19% implausible); 10-seed limitation; within-process determinism only; FHIR limited to Patient/Observation. ✅
- Disaster-mortality comparison (6.0 vs 3.3) correctly labelled descriptive/non-controlled. ✅
- Deterministic replay explicitly scoped to same process/platform. ✅

## 3. Numerical Audit

- Handler count = **38** — verified against `world.ts` HANDLER array. ✅
- Tick = 1 minute; snapshots every 100 ticks; retain 5; tests 127 / 17 files. ✅
- **Bed count = 55** ("peak bed occupancy 54.2/55 (99%)", lines 19 & 93) — the current implementation defaults to **131 beds** (BUILDING_LAYOUT). The KE paper says **133**. **FLAG — unresolved cross-paper contradiction**; also a reproducibility gap (the 55-bed experiment configuration is not documented).
- **Word-count metadata inconsistency:** header "~3,200"; freeze record "~2,460"; measured ≈2,116. Reconcile.
- Freeze record states "References 15"; manuscript lists 14. Reconcile.

## 4. Figure Audit

- Figures 1–4 are all `[Placeholder: …]` — **unrendered**. Production blocker.
- Figure 3/4 could be presented as tables if simpler.

## 5. Reference Audit

- [1]–[14] resolve; Medline style. ✅
- Line 139: "[companion paper]" is a **placeholder** — replace with the KE citation and disclose as a related manuscript.

## 6. Reproducibility / Data Availability

- Repository `github.com/rikirinjani/Deers-Rock`, Apache-2.0; `npm run build`, `npm test`. ✅
- Data availability line is one sentence — expand to a JAMIA-compliant Data Availability Statement.

## 7. Submission Metadata

| Item | Status |
|---|---|
| Authors / Affiliations / Corresponding author | ❌ `[To be added]` |
| ORCID | ❌ missing |
| Keywords ≤5 | ⚠️ 6 |
| Funding / COI / Acknowledgements | ❌ `[To be added]` |
| Data availability | ⚠️ minimal |
| AI disclosure | ❌ missing |
| Ethics statement | ❌ missing (synthetic data only) |
| Related-manuscript disclosure | ❌ placeholder |

**AUTHOR ACTION REQUIRED.**

## 8. Required Edits

Trim abstract to ≤250 words; restructure abstract to JAMIA headings; add Background and Significance + Discussion sections; trim keywords to 5; reconcile bed count; render figures; replace companion placeholder; add AI disclosure, Data Availability, ethics statement; supply author metadata.

## 9. Reviewer Attack Test

1. "Not clinically calibrated" — answered (Limitations). MINOR.
2. "55 beds / 99% occupancy looks like a tuning artifact" — partially answered; **bed count unresolved**. MAJOR.
3. "Determinism only within one process/platform" — answered. MINOR.
4. "Rule-based agents are trivial" — answered (baselines). MINOR.
5. "Format doesn't meet JAMIA" — not answered. MAJOR (editorial).

## 10. Verdict

**MAJOR REVISION REQUIRED** — science is usable; abstract structure/limits, bed-count contradiction, and missing submission elements remain.
