# DR Prelude Paper — Post-Revision Audit

**Date:** 2026-09-08
**Manuscript:** "Deers Rock: A Deterministic Micro-Simulation of a Tier A Referral Hospital in Eastern Indonesia"
**Revision:** Major revision (revision 2)
**Auditor:** Coordinator

---

## 1. Factual Consistency Scan

### Snapshot interval

| Location | Value | Correct? |
|----------|-------|----------|
| Abstract (Methods) | "every 100 ticks" | ✅ |
| §3 (Event journal) | "every 100 ticks" | ✅ |
| §5 (Level 2) | "every 100 ticks" | ✅ |
| §5 (Verification) | N/A (not mentioned) | ✅ |

**Result:** No stale "20 ticks" remaining.

### Journal retention

| Location | Value | Correct? |
|----------|-------|----------|
| Abstract (Methods) | "bounded SQLite event journal with configurable retention" | ✅ |
| §3 (Event journal) | "rolling window (default: 100 ticks)" | ✅ |
| §5 (Level 2) | "retains recent events within a configurable rolling window" | ✅ |
| §9 (Conclusion) | N/A | ✅ |

**Result:** No stale "append-only, monotonically growing" remaining.

### Tick rate

| Location | Value | Correct? |
|----------|-------|----------|
| §3 (Tick engine) | "At 60×, one simulated day (1,440 ticks) executes in approximately 24 seconds" | ✅ |
| §3 (Tick engine) | "configurable speed multiplier (default: 60×)" | ✅ |

**Result:** No stale "24 minutes" remaining.

### Handler count

| Location | Value | Correct? |
|----------|-------|----------|
| Abstract (Methods) | "38 domain handlers" | ✅ |
| §3 (Handler chain) | "38 handler functions" | ✅ |
| §9 (Conclusion) | "38 independent handlers" | ✅ |

**Result:** No stale "35 handlers" remaining.

### Bed count

| Location | Value | Correct? |
|----------|-------|----------|
| Abstract (Results) | "54.2/55 (99%)" | ✅ |
| §5 (Verification) | "54.2/55 (99%)" | ✅ |

**Result:** No stale "130.9/133" remaining.

### ICD-10 count

| Location | Value | Correct? |
|----------|-------|----------|
| Abstract (Objective) | "49 unique ICD-10 diagnoses" | ✅ |
| §1 (Introduction) | "49 unique ICD-10 diagnoses" | ✅ |
| §4.1 (Patient generation) | "49 unique codes" | ✅ |

**Result:** No stale "50 diagnoses" remaining.

---

## 2. Overclaim Scan

| Term | Occurrences | Assessment |
|------|-------------|------------|
| "validated" | 0 | ✅ Removed; replaced with "verified" |
| "calibrated" | 1 (Limitations: "has not been calibrated") | ✅ Correctly used in negative |
| "predictive" | 0 | ✅ Not present |
| "accurate" | 0 | ✅ Not present |
| "realistic" | 0 | ✅ Removed; replaced with "contextualized" |
| "digital twin" | 0 | ✅ Removed from keywords and body |
| "representative" | 0 | ✅ Not present |
| "clinical" | 3 (used appropriately: "clinical constitution," "clinical model," "clinical throughput") | ✅ Descriptive, not validating |
| "sentinel" | 0 | ✅ Removed from abstract; not used in body |
| "causal" | 0 | ✅ Not present |
| "deterministic" | 3 (§1, §3, §9) | ✅ Correctly used for architecture |
| "reproducible" | 3 (§1, §5, §9) | ✅ Correctly used for within-seed reproducibility |
| "independent" | 2 (§3, §4) | ✅ Used for handler independence, not external validity |

**Result:** No overclaims remaining.

---

## 3. Remaining Factual Risks

| Risk | Severity | Status |
|------|----------|--------|
| Bed count (55 vs. possible config override) | LOW | Manuscript states 55 per current BUILDING_LAYOUT. If experiments used a different config, that is a separate issue. |
| Handler count (38 in HANDLER_SKIP) | LOW | Counted directly from source. Post-chain processors (medAdmin, orderComplete, mmConference) not included in "handler" count. |
| ICD-10 count (49 unique) | LOW | Verified against patient-generator.ts. E11 duplicated. |
| Experiment data may predate code changes | LOW | Experiment results frozen separately; manuscript correctly reports what experiments produced |

---

## 4. Missing Evidence

### Not submission-blocking

| Gap | Impact | Status |
|-----|--------|--------|
| No real hospital calibration | Clinical parameters unvalidated | Acknowledged explicitly in Limitations as first limitation |
| Only 10 seeds | Wide confidence intervals | Acknowledged in Limitations |
| Cross-platform determinism not tested | Same-process only | Acknowledged in Limitations |
| FHIR limited to 2 resource types | Incomplete interoperability | Acknowledged in Limitations |
| No comparison with open-source simulators | Weaker novelty claim | Not addressed; could strengthen Related Work |

### Submission-blocking

None. All factual errors corrected. All overclaims reduced. Limitations section is prominent and honest.

---

## 5. Structural Assessment

| Section | Assessment |
|---------|------------|
| Abstract | ✅ Honest, accurate, within word limit |
| Introduction | ✅ Establishes problem, states contribution clearly |
| Related Work | ✅ Appropriate comparisons; could add open-source survey |
| System Architecture | ✅ Accurate numerical values, clear descriptions |
| Clinical Model | ✅ Correctly qualified as plausibility-based |
| Reproducibility Guarantees | ✅ Accurately describes bounded journal and snapshot behavior |
| Demonstration | ✅ Results reported with appropriate caveats |
| Availability | ✅ Clear, actionable |
| Limitations | ✅ Prominent, specific, honest |
| Conclusion | ✅ Does not overclaim |
| References | ⚠️ Some references lack volume/pages (minor) |

---

## 6. Revised Publication Verdict

### **MINOR REVISION REMAINING**

**Explanation:** All 5 factual errors corrected. All ~10 overclaims reduced. Manuscript now accurately describes what the repository implements. Limitations section is honest and prominent. The manuscript is factually defensible.

**Remaining minor work (not submission-blocking):**
1. Add figure: handler pipeline architecture
2. Add figure: LOS distribution histogram
3. Tighten word count (currently ~3,500; target 3,000-3,500)
4. Fix reference formatting (some references lack volume/pages)
5. Add brief comparison with open-source healthcare simulation projects in Related Work

**The manuscript is ready for submission after these minor revisions.**
