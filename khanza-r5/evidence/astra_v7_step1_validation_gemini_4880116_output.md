# Astra v7 assessment: dr-khanza-e2e-full-assessment (post P1-P7) [step 1/3: claim-honesty]

## CLAIM-HONESTY

## VERDICT

### Overall Assessment
**Wave P7 represents a decisive turnaround in engineering rigor and gate integrity.** 

In previous waves (v1–v6), progress was routinely undermined by fail-open recovery paths, suites ending on `echo` that could never fail, unvalidated write provenance, tolerance slack on tax calculations, and an uncorrected data defect in the pinned ledger. 

P7 directly confronts and closes the technical debt identified in v6:
1. **The acceptance suite and restore paths now fail closed** (verified via A14 and A15).
2. **The core data defect has been cleanly rectified**: the live ledger was rebuilt from source under owner approval (Option A), resolving the single quantity mismatch (`2026/10/01/000298` drug `B000000240`: 23 → 25) and backfilling 260,800 missing source labels, while keeping all 356,355 keys, amounts, and unit prices identical (`LINE-DELTA=0` on both `2026-10` and `ALL` windows).
3. **Write provenance has been definitively established via database trigger auditing**: Khanza's `DlgBilingRalan` save path in the headless JVM was proven to insert the 17 `billing` value rows as well as the receipt notes. The longstanding caveat that the form only writes receipt notes was false—caused by prior test runs improperly retargeting via `database.ini` rather than `database.xml`.
4. **Tax math and checks are exact and integer-pure**: `(s * 11 + 50) // 100` was demonstrated to match Java's `Math.round(s * 0.11)` across all 70,056 real drug subtotals with zero discrepancies, and A10b now rejects missing and orphan tax rows with zero tolerance.
5. **Live state protection is verified**: six live table checksums are asserted pre- and post-suite, and destructive runs against `sik` are refused without `--allow-live`.

The benchmark remains an outpatient-only, single-HMS configuration benchmark with sampled GUI execution, but its internal validity and test harnesses are now sound.

---

### Criterion Scores and Comparison

| Criterion | Score /10 | Prior (v6) | Deltas vs v6 |
|---|---:|---:|---|
| **Claim-honesty** | **8** | 6 | **+2**
