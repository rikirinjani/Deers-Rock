# DR Prelude Paper — Final Polish Report

**Date:** 2026-09-08
**Manuscript:** "Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia"
**Status:** FINAL — Scientifically Frozen, Editorial Freeze

---

## 1. Polish Changes

### 1.1 Prose tightening

- Removed redundant architecture descriptions (e.g., "Every state transition is recorded" appeared twice)
- Removed repository-documentation language ("Source code: TypeScript/Node.js" → tightened)
- Removed repeated limitations across sections
- Tightened abstract from ~270 words to ~250 words
- Added en-dashes for ranges (2–8, 360–1,440, 2–7×)

### 1.2 References

- Added volume/page numbers to references 3, 4, 6, 7, 11, 12
- Added URLs to references 1, 5, 8, 9
- Added two new references: OpenMRS [13] and Synthea [14] for open-source comparison
- Fixed inconsistent formatting (capitalization, punctuation)

### 1.3 Related Work

- Added "Open-source healthcare simulators" subsection comparing with OpenMRS, Synthea, and Python-based hospital simulators
- Clarified how DR differs: persistent deterministic replay + culturally-contextualized generation + multi-department composition + AI agents + FHIR
- Removed unsupported "first", "only", "no existing system" claims where possible

### 1.4 Figure placeholders

- Added 4 figure placeholders with captions:
  - Figure 1: System architecture
  - Figure 2: Handler pipeline
  - Figure 3: Cultural calendar effects
  - Figure 4: LOS distribution
- Each figure caption clearly describes what the figure should contain
- Figures are editorial gaps, not fabricated content

### 1.5 Numerical consistency

All values verified consistent across manuscript:

| Value | Locations | Correct? |
|-------|-----------|----------|
| 100-tick snapshot interval | Abstract, §3, §5 | ✅ |
| 100-tick journal retention | Abstract, §3, §5 | ✅ |
| ~24 seconds/day at 60× | §3 | ✅ |
| 38 handlers | Abstract, §3, §9 | ✅ |
| 55 beds | Abstract, §5 | ✅ |
| 49 unique ICD-10 codes | Abstract, §1, §4.1 | ✅ |
| 22-drug formulary | Abstract, §1 | ✅ |
| 7 disaster types | Abstract, §4.5 | ✅ |
| 9 departments | Abstract, §4.2 | ✅ |
| 10 × 1,000-tick runs | Abstract, §5, §6 | ✅ |

### 1.6 Claim audit

All occurrences of sensitive terms verified defensible:

| Term | Occurrences | Assessment |
|------|-------------|------------|
| deterministic | 6 | ✅ Used for architecture (tick engine, PRNG, replay) |
| reproducible | 4 | ✅ Used for within-seed trajectory identity |
| clinical | 5 | ✅ Used descriptively ("clinical model", "clinical agents"), not validating |
| contextualized | 2 | ✅ Correctly used instead of "realistic" |
| validated | 0 | ✅ Not present |
| calibrated | 1 | ✅ Used in negative ("has not been calibrated") |
| predictive | 0 | ✅ Not present |
| accurate | 0 | ✅ Not present |
| realistic | 0 | ✅ Not present |
| digital twin | 0 | ✅ Not present |
| representative | 0 | ✅ Not present |
| sentinel | 0 | ✅ Not present (KE cross-reference uses "reference component") |
| causal | 0 | ✅ Not present |

### 1.7 KE contamination check

- No Phase F details (no CO₂, no seeds 42–46, no SupplyStress, no direction consistency)
- No macro-to-micro coupling claims
- Added brief cross-reference: "Deers Rock subsequently serves as a reference healthcare simulation component within the Kronos Engine macro-simulation framework [companion paper]"
- Cross-reference is factual, not evidentiary

---

## 2. Word count

| Section | Words |
|---------|-------|
| Abstract | ~250 |
| §1 Introduction | ~350 |
| §2 Related Work | ~400 |
| §3 System Architecture | ~400 |
| §4 Clinical Model | ~450 |
| §5 Reproducibility Guarantees | ~200 |
| §6 Demonstration | ~150 |
| §7 Availability | ~80 |
| §8 Limitations | ~200 |
| §9 Conclusion | ~180 |
| **Main text total** | **~2,460** |

**Note:** Main text is ~2,460 words, below the 3,000–3,500 target. The manuscript is content-complete and scientifically frozen. The word count gap can be addressed by expanding the figure captions, adding a detailed handler pipeline table, or expanding the Discussion section if the target venue requires it. This is an editorial task, not a scientific one.

---

## 3. Remaining submission requirements

| Task | Type | Blocking? |
|------|------|-----------|
| Create figures 1–4 | Editorial | No (placeholders documented) |
| Expand to 3,000–3,500 words if required by venue | Editorial | No |
| Format references per venue style | Editorial | No |
| Add author names, affiliations | Administrative | No |
| Add acknowledgments, funding, competing interests | Administrative | No |
| Submit to venue | Administrative | No |

**None of these are scientific or factual blockers.**
