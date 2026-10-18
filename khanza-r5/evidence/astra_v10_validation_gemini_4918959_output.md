# Astra v10 assessment: dr-khanza-e2e-full-assessment (post P1-P10) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

### Verification against Code and Transcripts
P10 exhibits a high degree of transparency and meticulousness regarding its claimed fixes and boundaries:
1. **Rubric and Suite Arithmetic**: The asserted run of `p6_acceptance_suite.sh` reports `PASS=39 FAIL=0`. Re-verifying each row in the summary table matches the 39 checks: A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A15, A16, A18a, A18b, A19, A20, A21, A22, A22b, A23, A24, A25, A27, A28, A29, A17, A14, A10, A10b, A10d, A10e, A10c, A26, A11, A12, A31, A13. 39 distinct assertions run and match the logs.
2. **Failure Exposure**: Rather than burying the failure, Run 1 (`30/38 PASS`, 8 FAIL) was preserved as primary evidence (`r5_p10_suite_run1_FAILED_20261018T042243Z.md`), diagnosing that A20's SIGKILL during `stage_restore` left `benchmark@localhost` stripped of DML privileges because `finally:` never executed. The post-mortem and fix (durable marker file `.writer_exclusion_<db>.json` + recovery on next startup in `recover_writer_exclusion()`) is verified in code and demonstrated in Run 2 via A31.
3. **A11 Counting Recalibration**: In P9, Astra caught that A11 counted markers globally across all logs. In P10's `p6_acceptance_suite.sh`:
   ```bash
   OTHER_LOGS=$(ls /tmp/r6_a*.log | grep -v -e '/r6_a15\.log$' -e '/r6_a18\.log$' -e '/r6_a18b\.log$' -e '/r6_a22b_retry\.log$')
   ...
   RV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-VERIFIED")
   DELIB=$(( $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a15.log) + $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a18.log) + $(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a18b.log) + $(cnt "STAGE-RESTORE-ERROR" /tmp/r6_a22b_retry.log) ))
   ```
   Transcript confirms: `RV_ALL=16, OUTSIDE the four excluded logs=16`, `deliberate failed restores (A15+A18a+A18b+A22b)=4`. The math is strictly consistent.
4. **Result Artifact Honesty (F1 / P10-A2)**: In `sampled_real_form_diff_r5.py`:
   ```python
   def _restore_state(b):
       if str(b.get("fail_reason", "")).startswith("stage-backup"):
           return "backup failed; stage tables kept"
       if b.get("restored") is True:
           return "restored, hash-verified"
       return "NOT restored; stage tables kept"
   ```
   The indiscriminate claim "FAILED batches (restored from stage backup)" is eliminated.
5. **A22 Mutation Correction**: R5 §20 previously stated "a billing row". R5 §21 and the suite summary now accurately state: "all 17 billing rows of 2026/10/01/800085 changed (+1 each)".

### Remaining / New Overclaims
- **"Fail-closed tariff authority" vs Gap Fallback**: The builder claims fail-closed behavior for malformed tariff entries (`irup()` raising `ValueError: MALFORMED-AMOUNT (P10-B5)`, caught in A26). However, for missing entries where `_TARIFF_STATUS == "ok"`, `dr_tariff()` still defaults silently to `dr-source(gap)` via fallback. While documented in the text, marketing this as "fail-closed tariff authority" across the benchmark remains a partial overclaim.
- **Exclusion Scope**: The claim of "writer exclusion" is strictly local MySQL privilege revocation for `benchmark@localhost` on the fixture DB. It does not exclude `root` connections or external system services. The text now scopes this to "benchmark account DML on fixture", which is accurate, but any residual mention of absolute "writer exclusion" must remain qualified.

**Score: 8/10**

---

## GATE-CORRECTNESS

### (a) Preservation Check and A30/A31
The preservation experiment (`p10_preservation_check.sh`) fulfills the core requirements of v9's next step:
- It runs through `p6_run_suite_fresh.sh` with `P10_INJECT=1 P9_FORCE_FAIL_CHECK=30`.
- Induces a genuine harness failure (3-second timeout on a 2-batch run), producing batch 1 `FAILED` with 13 stage tables populated (21 rows total across output tables + reg) and batch 2 `PENDING`.
- Computes independent root hashes (`p10_hash_state.py`) covering:
  1. `CHECKSUM TABLE ... EXTENDED` and row counts of all 13 stage tables.
  2. Sample visits output-row hash.
  3. 20 protected visits (10 non-DR, 10 DR outside sample).
  4. Live `sik` output-table checksums.
- Forces A30 failure -> normal suite exit with failure -> wrapper exits 1 -> leaves fixture untouched (`FIXTURE-KEPT`).
- On the preserved fixture, independent hashes re-evaluated: `ALL-EQUAL` (21 stage rows intact).
- Mutates the billing rows (`totalbiaya=totalbiaya+1` on visit `800085`), forces `--retry-failed` to restore under writer exclusion (`REVOKE` executed, fenced, restore hash-verified, `GRANT` restored), bills both batches clean (`rc=0 sukses_true=1`), checks protected rows and live DB untouched (`EQUAL`), and teardown succeeds.

### (b) Builder Cohort-Scoped DELETE (A10e)
In `build_dr_charge_ledger_p2.py`:
```python
rp_cs = dbutil.scalar(SIC_DB, "SELECT character_set_name FROM information_schema.columns ...")
on = ("rp.no_rawat = CONVERT(l.no_rawat USING %s)" % rp_cs) if rp_cs else "rp.no_rawat = l.no_rawat"
dscope = "1=1" if args.window == "ALL" else "l.no_rawat LIKE '2026/10/%'"
delete_sql = ("DELETE l FROM dr_charge_ledger l LEFT JOIN " + SIC_DB + ".reg_periksa rp "
              "ON " + on + " WHERE " + dscope + " AND (rp.no_rawat IS NULL OR "
              + (cp % ()) + ")")
```
Where `cp` is `cohort_predicate(args.cohort)` (`rp.no_rkm_medis LIKE 'DR%%'` if `dr` else `1=1`).
- For orphan rows in `dr_charge_ledger` that have no matching `reg_periksa` row (`rp.no_rawat IS NULL`), they are deleted within the window scope.
- Non-DR rows: if `cohort == "dr"`, `(rp.no_rawat IS NULL OR rp.no_rkm_medis LIKE 'DR%')` correctly isolates DR rows and orphans; non-DR rows have `rp.no_rawat IS NOT NULL` and `rp.no_rkm_medis NOT LIKE 'DR%'`, so the predicate evaluates to `FALSE` and they are spared. A10e confirms non-DR row `2026/10/01/000207` survives both `2026-10` and `ALL` rebuilds. The insert scope likewise queries `WHERE %s AND %s` (`wp` and `cp`). Delete and insert scopes are symmetric.

### (c) Live `sik` Mutation Risks
A17 refuses `FX=sik` or `FX=sik_bench` before executing. In `sampled_real_form_diff_r5.py`:
```python
if db == "sik" and not (args.freeze_only or args.verify_frozen or args.allow_live):
    print("LIVE-TARGET-REFUSED: ...")
    return 3
```
However, mutation vectors remain:
1. Running with `--allow-live` against `sik` is permitted by design for production runs, but relies solely on runtime flags.
2. In `sampled_real_form_diff_r5.py`, writer exclusion explicitly skips live databases:
   ```python
   if db in LIVE_DBS:
       log("WRITER-EXCLUSION skipped ...")
       return _stage_restore_inner(...)
   ```
   If a restore is ever executed against `sik` under `--allow-live`, it does **not** have writer exclusion, nor does it fence sessions (`FENCE-SKIPPED`).
3. If `p6_acceptance_suite.sh` crashes or is killed before the `trap cleanup EXIT` can restore `database.xml`, external applications pointing to the harness config could theoretically connect to the wrong database, though the trap has proved reliable on test runs.

### (d) A11 Relabeling and Acceptance
In `p6_acceptance_suite.sh`, A11 requires:
`[ "$RM_OTH" = "0" ] && [ "$UV_OTH" = "0" ] && [ "$ER_OTH" = "0" ] && [ "$RV_OTH" -ge 1 ] && [ "$DELIB" = "4" ] && [ "$DF_ALL" = "0" ]`
If an unintentional unverified restore, hash mismatch, or restore error occurs in any check other than the four deliberate ones (`r6_a15`, `r6_a18`, `r6_a18b`, `r6_a22b_retry`), `UV_OTH`, `RM_OTH`, or `ER_OTH` increments and trips A11 immediately. This closes the loophole where unverified restores could pass undetected.

### (e) Gate Defects Introduced in P10
- In `p10_hash_state.py`, `o._content_hash(visits(sample_f), db, log)` uses the oracle's internal hash function. If the oracle's hashing logic has a blind spot (e.g. ignoring certain table columns or joins), the independent check shares the exact same blind spot because it imports `sampled_real_form_diff_r5.py`. It is process-independent (runs as root CLI), but **algorithmically coupled**.

**Score: 8/10**

---

## ORACLE-VALIDITY

### Oracle Hardening in P10
1. **Source Content Hash Expansion (F2 / P10-B1)**:
   `source_content_hash()` in `sampled_real_form_diff_r5.py` now includes `h_beli`, `biaya_obat`, `total`, and procedure cost fields (`material`, `bhp`, `tarif_tindakandr`, `kso`, `menejemen`, `biaya_rawat`).
   Critically, `except Exception: pass` was replaced with explicit exception propagation:
   ```python
   except Exception as e:
       cur_src = "ERROR(%s)" % type(e).__name__
       log("verify-frozen: SOURCE-CONTENT CHECK ERROR (P10-B1): ...")
   ```
   This ensures DB errors or schema mismatches fail closed during baseline verification. A27 confirms that tampering with `biaya_obat` after freeze trips `SOURCE-CONTENT DRIFT` (exit 3) without resetting rows.
2. **Transactional Stage Backup (F3 / P10-B2)**:
   In `stage_backup()`, the `DELETE` and `REPLACE INTO ... SELECT` are wrapped in `START TRANSACTION; ... COMMIT;` using `dbutil.session()`. A28 verifies that an injected statement failure triggers a rollback, leaving earlier staged tables intact (checksums identical before and after), logs `STAGE-KEEP`, and exits 4 without deleting target rows.
3. **Quiet Interval Prior to FAILED Retries (F4 / P10-B3)**:
   `reap_writers()` now sets `restorable = ("STAGED", "RESET", "FAILED") if include_failed else ("STAGED", "RESET")`, ensuring that a batch about to undergo retry or abandonment waits out `R5_WRITER_QUIET_S` (5s) to guarantee no concurrent writes are occurring.
4. **Writer Exclusion Mechanism (F5 / P10-B4)**:
   During `stage_restore()` on fixtures, DML privileges (`INSERT`, `UPDATE`, `DELETE`) are revoked from `'benchmark'@'localhost'`. Crucially, because schema-level privilege revocations do not affect existing active connections until their next `USE <db>`, `fence_sessions()` executes immediately after revoke, issuing `KILL <id>` to all target sessions. Restore runs as `root`, and privileges are re-granted in `finally:`.
   - **Crash Safety**: Validated by Run 1's real failure. When a process holding the exclusion is `SIGKILL`ed, `.writer_exclusion_<db>.json` preserves the PID and revoked privileges. `recover_writer_exclusion()` detects dead PIDs on subsequent starts, executes `GRANT`, and cleans the marker. Tested directly in unit tests and asserted in A31.

### Residual Oracle Risks
1. **Algorithmic Coupling in Hash Verification**: As noted in Gate Correctness, `p10_hash_state.py` calls `o._content_hash()`. True oracle independence requires an out-of-band hashing routine that does not import the subject under test.
2. **Fencing Session Gap**: Between `REVOKE` and `KILL`, a running query could commit. Furthermore, `fence_sessions` filters on `db = DATABASE() OR info LIKE CONCAT('%', DATABASE(), '.%')`. If an external writer issues queries using unqualified table names without setting the default database to the fixture (e.g. multi-db cross query from root), the session filter might miss it.

The oracle is demonstrably fit for the bounded claims asserted on this fixture.

**Score: 8/10**

---

## REPRODUCIBILITY

### Reproducibility Improvements in P10
- **Manifest Pinning**: `khanza_r5_release_manifest.md` is cleanly updated. Tool SHAs match across git and VPS:
  - `sampled_real_form_diff_r5.py`: `c3bdd2d62933...`
  - `build_dr_charge_ledger_p2.py`: `2a4a1c48b6ee...`
  - `p6_acceptance_suite.sh`: `8b89d431c446...`
  - `p8_recovery_unit_test.py`: `345bc6ae011d...`
  - `p10_hash_state.py`: `8bf6c811ddcb...`
  - `p10_preservation_check.sh`: `7d05ef23b9f6...`
- **Builder Ledger Reproduction**: `p8_builder_all_check.sh` executes the integer builder `--window ALL` into an empty scratch database and compares row-by-row SHA-256 against the pinned canonical ledger (`356,355` rows, `Rp 34,870,243,633`, content hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`). Matches byte-for-byte.
- **One-Command Fixture Lifecycle**: `p6_run_suite_fresh.sh` automates clone provisioning from mysqldump, grant setup, test suite execution, failure preservation (`--teardown-kept`), and teardown.

### Remaining Blockers for Independent Third Parties (Ranked)
1. **Missing Upstream Source Dependencies**: As explicitly acknowledged in Pack D / "NOT claimed":
   - `stagea_common.py` (scrubbed for credentials but unpublished).
   - Java harness sources (`BilingHarness.java` modifications, compiled into the harness classpath).
   - STRATA fixture SQL generators.
   Without these, an external assessor cannot build the execution harness from source.
2. **Heavy Database Fixtures**: Reproduction relies on a 12-month pre-populated MySQL database dump (`sik` with 86,455 DR visits, ~1.46M billing rows). The raw database dumps are not published to a public immutable repository (e.g., Zenodo / DOI archive).
3. **Environment Hardcoding**: Tool scripts maintain hardcoded absolute paths (`/opt/dr-benchmark`, `/opt/Deers-Rock/tools`, `/opt/simrs-khanza/run-env`). Provisioning on an arbitrary Linux host requires reproducing exact path hierarchies.

On-box repeatability is exemplary; external clean-machine portability remains blocked.

**Score: 6/10**

---

## E2E-DESIGN

### Assessment of Current E2E Pipeline
1. **Form-Level Provenance Clarification (Retraction of B-subset Caveat)**:
   P7/P8 established that Khanza's `DlgBilingRalan` GUI save action writes both the verification layer (`nota_jalan`, `detail_nota_jalan`) and `billing` (17 rows in the audited encounter). The headless form save is thus an actual billing engine run, not merely a receipt generator.
2. **Current Comparison Topology**:
   - **Leg A**: Simulated/Consumer settlement rows in `sik.billing`.
   - **Leg B**: Real form headless GUI execution (`DlgBilingRalan` via Xvfb + faketime).
   - **Leg C**: DR ground-truth ledger (`dr_charge_ledger`), constructed from DR tariff authority + source inputs.

### Weakest Leg and Residual Vulnerabilities
- **The B-to-C Cohort Mismatch**:
  `three_count_reconcile_p2.py` reports `A == C == 31,750 rows / Rp 3,113,533,580` for the 2026-10 cohort. But Leg B on that cohort is only `149 notes / Rp 49,738,954` (or 151 notes / Rp 49,903,019 post-P6).
  Because running all 86,101 encounters through the GUI would take ~200 wall-clock hours at 7.14 visits/min, Leg B is only executed on small samples (e.g. 999 visits). Therefore, three-count reconciliation reports `P2-BC-TOTAL` failure/partial pass by construction.
- **Shared Source Tables Between A, B, and C**:
  The ground-truth ledger builder (`build_dr_charge_ledger_p2.py`) queries `rawat_jl_dr` and `detail_pemberian_obat` in `sik` to discover visit quantities and procedure codes. If an upstream ingestion error corrupts quantities or assigns wrong procedure codes in `sik`, both Leg A (consumer) and Leg C (ledger builder) read the identical corrupted rows. Leg C only independently verifies **unit price mapping via `dr_tariff`**, not encounter composition or clinical line-item authenticity.
- **Quantity Line-Diff Limitation**:
  `charge_delta --line-diff` compares aggregate quantities per visit per component, but cannot detect same-price code substitutions because `billing.nm_perawatan` stores text labels rather than clean item codes.

### Recommended Fix
Decouple Leg C from `sik` tables completely. Feed the ledger builder from a frozen, pre-adapter clinical transaction manifest (e.g. HL7/FHIR or raw DR clinical events) stored outside the database.

**Score: 7/10**

---

## EXTERNAL-VALIDITY

### Scope and External Reality
The benchmark's scope remains deliberately narrow and synthetic:
- **Single System Configuration**: Evaluated solely against SIMRS Khanza (git `722b82e`) running on MySQL 8.0.46 under Linux.
- **Outpatient Only**: Inpatient billing, BPJS / INA-CBG grouper tariffs, and complex multi-payer splits are entirely unmodelled.
- **Unrealistic Clinical Distributions**: Drug revenue constitutes ~82.7% of total revenue (PPN-inclusive), which does not reflect realistic hospital operational economics. Diagnoses are uncalibrated synthetic tokens.
- **Synthetic Strata Limits**: The 5 authored edge strata (embalase, tuslah, half-rupiah PPN, etc.) showed zero observable impact on the final outpatient bill in this Khanza configuration (embalase and tuslah charges are ignored by Khanza's outpatient billing module).

### Scoping Honesty
Credit is due to the project's reporting integrity: R5 §13 explicitly retains the verbatim paper-safe boundary caveat (`RC-9`):
> *"This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products."*

All real-world validation criteria (C1 diagnosis calibration, C2 clinical coherence, C3 payer mix, C4 real facility baseline) remain clearly tagged **NOT TESTED** and human-gated.

### Top External Risk
The ~250× performance divergence between the direct-DB consumer (~1,802 visits/min) and the real Khanza GUI (~7.14 visits/min) means the benchmark measures database write saturation of a bespoke batch client, not the operational throughput of hospital staff using the Khanza SIMRS software.

**Score: 4/10**

---

## OVERALL VERDICT

### Criterion Scores & Historical Trajectory

| Criterion | Score | Historical Progression (Runs 1 → 2 → 3 → 4 → v7 → v8 → v9 → **v10**) |
|---|---:|---|
| Claim-Honesty | **8/10** | 3 → 4 → 4 → 5 → 6 → 6 → 7 → **8** (+1) |
| Gate-Correctness | **8/10** | 3 → 3 → 3 → 4 → 6 → 6 → 6 → **8** (+2) |
| Oracle-Validity | **8/10** | 3 → 3 → 4 → 5 → 7 → 7 → 7 → **8** (+1) |
| Reproducibility | **6/10** | 3 → 4 → 4 → 5 → 6 → 6 → 6 → **6** (0) |
| E2E-Design | **7/10** | 4 → 5 → 5 → 6 → 7 → 7 → 7 → **7** (0) |
| External-Validity | **4/10** | 3 → 4 → 4 → 4 → 4 → 4 → 4 → **4** (0) |

$$\text{Overall Score} = \operatorname{round}\left((8 + 8 + 8 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(41 \times 1.6667\right) = \boxed{68/100}$$

### Summary Assessment
P10 represents the most technically rigorous cycle of this project to date. By executing the requested **integrated recovery-preservation experiment** (`p10_preservation_check.sh`), the authors:
1. Closed the gap between point-in-time checks and terminal failure behavior.
2. Proved that a real timeout failure with populated stage tables (21 rows) preserves state across the failed terminal path (`ALL-EQUAL` on 13 stage tables, sample, 20 protected visits, and live DB).
3. Demonstrated that `--retry-failed` detects mutated state, restores under verified writer exclusion (`REVOKE` + `KILL` fence + `GRANT`), and bills to completion.
4. Surfaced and resolved a real crash-safety defect in writer exclusion (A20 SIGKILL leaving revoked privileges), documenting the failure in Run 1 and proving recovery in Run 2 and unit tests.

The benchmark's internal test harness, recovery machinery, and claim boundaries are now solid and trustworthy. What prevents higher scores is not internal engineering rigor, but the architectural boundaries of the project: lack of an external pre-adapter clinical manifest (E2E), missing source distribution packages for independent clean-room builds (Reproducibility), and the absence of real-world hospital operational data (External Validity).

## VERDICT

Here is the synthesis of the six assessment sections, comparative analysis against prior runs, and overall verdict.

---

### Criterion Scores, Deltas & Evidence

| Criterion | Score | Delta vs Prior (Runs 1 → 2 → 3 → 4 → v7 → v8 → v9) | One-Sentence Justification | One-Sentence Biggest Remaining Risk |
| :--- | :---: | :---: | :--- | :--- |
| **Claim-Honesty** | **8/10** | **+1** (prior: 4/5/5/6/6/6/7) | The authors explicitly retracted "a billing row" to "all 17 billing rows", corrected F1 artifact mislabeling via `_restore_state()`, and candidly documented the Run 1 crash-safety failure in §21 and the manifest. | While malformed amounts fail-closed via `ValueError: MALFORMED-AMOUNT` (A26), missing tariff entries when `_TARIFF_STATUS == "ok"` still fall back silently to `dr-source(gap)`. |
| **Gate-Correctness** | **8/10** | **+2** (prior: 3/3/3/5/6/6/6) | A11's global counter loophole was eliminated by explicitly separating deliberate failure logs from normal execution (`RV_OTH=16`, `DELIB=4`, `UV_OTH=0`, `RM_OTH=0`), making unverified restores an immediate gate failure. | `p10_hash_state.py` calls `o._content_hash()`, creating algorithmic coupling where blind spots in the oracle’s hash routine are mirrored in the independent gate check. |
| **Oracle-Validity** | **8/10** | **+1** (prior: 4/4/3/5/6/7/7) | Baseline content drift detection fails closed on DB error/drift (A27), stage backup is fully transactional with rollback verification (A28), and writer exclusion revokes DML and fences sessions with persistent crash recovery (A31). | Fencing filters active connections by database name, which can miss cross-database unqualified writes issued by active privileged sessions. |
| **Reproducibility** | **6/10** | **0** (prior: 3/5/6/5/6/6/6) | The canonical integer builder reproducibly regenerates the identical 356,355-row ledger hash (`a66a3a54...`) from scratch, but external third-party builds remain blocked by unpublished upstream components. | Pack D explicitly admits upstream Java harness sources (`BilingHarness.java`), `stagea_common.py`, and raw database dumps are unpublished, preventing clean-room external reproduction. |
| **E2E-Design** | **7/10** | **0** (prior: 4/5/5/6/7/7/7) | Retraction of the B-subset caveat was justified by proving `DlgBilingRalan` headless execution writes both audit notes and the exact 17 billing rows, validating Leg B as an authentic billing engine run. | Ground-truth Leg C queries `sik.rawat_jl_dr` and `sik.detail_pemberian_obat`, creating circular dependency on the same source tables feeding Leg A, thus verifying unit pricing rather than encounter integrity. |
| **External-Validity** | **4/10** | **0** (prior: 3/4/4/4/4/4/4) | The synthetic generator reflects real ICD-10 codings and tariff structures under DR rules, but production-readiness claims for actual hospital operations remain unverified. | The ~250× throughput divergence between the DB consumer (~1,802 visits/min) and the GUI engine (~7.14 visits/min) indicates the benchmark measures direct-DB batch saturation, not real Khanza SIMRS operational load. |

---

### 1. Status of v9 Findings (Fixed vs Claimed vs Open)

*   **GENUINELY FIXED (Code-verified & asserted in run)**:
    *   **F1 (Artifact Honesty)**: `sampled_real_form_diff_r5.py` uses `_restore_state(b)` to report `"backup failed; stage tables kept"`, `"restored, hash-verified"`, or `"NOT restored; stage tables kept"`. Verified in code; asserted in A22b retry transcript.
    *   **F2 (Baseline Content Drift Fail-Closed)**: `verify_frozen_baseline()` catches schema/data tampering and DB errors, logging `SOURCE-CONTENT DRIFT` and failing closed. Asserted in A27.
    *   **F3 (Transactional Stage Backup)**: `stage_backup()` wraps table replication in a single atomic transaction. Asserted in A28 (simulated rollback leaves stage tables intact; target untouched).
    *   **F4 (Quiet Interval on FAILED Batches)**: `reap_writers(include_failed=True)` enforces `R5_WRITER_QUIET_S` (5s) before retrying or abandoning `FAILED` batches. Asserted in A29.
    *   **F5 (Writer Exclusion & Crash Recovery)**: Local `benchmark@localhost` DML privileges revoked and active sessions killed via `fence_sessions()` during restore; durable marker `.writer_exclusion_<db>.json` allows `recover_writer_exclusion()` to clean orphaned locks after `SIGKILL`. Asserted in A30 and A31.
    *   **F6 (Preservation Across Failure Lifecycle)**: `p10_preservation_check.sh` proved stage preservation (21 rows), baseline immutability, and successful subsequent retry under writer exclusion. Asserted in p10 run log.
*   **MERELY CLAIMED / PARTIALLY OPEN**:
    *   **Fail-Closed Tariff Authority**: Malformed numeric tariffs fail closed (`MALFORMED-AMOUNT`), but missing codes under `_TARIFF_STATUS == "ok"` continue to silently fall back to `dr-source(gap)`.
*   **STILL OPEN**:
    *   **Leg C Input Independence**: Leg C still queries `sik` operational tables for line-item quantities rather than reading from an independent, pre-adapter clinical transaction stream.
    *   **Algorithmic Independence of Gate Hash**: `p10_hash_state.py` re-imports the oracle's internal content hash function rather than using an out-of-band hashing routine.

---

### 2. New Problems Introduced or Exposed in P10

1.  **SIGKILL Privilege Leak (Exposed in Run 1, Fixed in Run 2)**:
    A20 kills `sampled_real_form_diff_r5.py` with `SIGKILL` mid-flight. Because privilege re-grant was located solely in a Python `finally:` block, the process died before executing it, leaving `benchmark@localhost` permanently stripped of DML permissions. While cleanly resolved via `.writer_exclusion_<db>.json` and `recover_writer_exclusion()`, it revealed how brittle in-process privilege manipulation can be without OS-level/durable transaction boundaries.
2.  **Algorithmic Coupling in Independent Preservation Gate**:
    To assert stage preservation, P10 added `p10_hash_state.py`. However, it executes `from sampled_real_form_diff_r5 import visits, _content_hash`. If `_content_hash` contains a masking bug or omits specific sub-columns, the preservation check inherits the identical flaw.

---

### 3. Top-3 Remaining Issues (Priority Order)

1.  **Circular Input Ingestion in Ground-Truth Ledger (Leg C)**: Leg C shares underlying database tables (`rawat_jl_dr`, `detail_pemberian_obat`) with Leg A. An upstream pipeline error that duplicates treatments or misallocates clinical codes will be mirrored in the ledger, leaving code-substitution and quantity errors undetected.
2.  **Algorithmic and Environmental Dependency of Verification Gates**: Key acceptance gates import implementation internals (e.g., `_content_hash`), and suite execution depends on absolute paths (`/opt/dr-benchmark`) and unreleased Java/Python libraries (`BilingHarness.java`, `stagea_common.py`), preventing clean-room third-party replication.
3.  **Silent Fallback for Unmapped Tariffs**: While malformed values trip hard failures, missing procedure mappings when tariff status is nominal fall back to `dr-source(gap)` rather than halting execution, creating potential leakage in reimbursement calculations.

---

### 4. Top-3 Strongest Properties to Lead With

1.  **Exemplary Failure-Preservation and Recovery Lifecycle**: Terminal failures (timeouts, injection errors) reliably preserve intermediate staging states for post-mortem analysis without corrupting baseline visits or mutating production tables, proven by rigorous integrated lifecycle checks.
2.  **Crash-Safe Fenced Writer Exclusion**: Fixture restoration prevents race conditions by revoking local writer DML privileges and actively terminating concurrent database sessions, backed by persistent marker files that automatically self-heal from uncatchable termination signals (`SIGKILL`).
3.  **Strict Metric Accounting and Gate Hygiene**: Rejection of loose global log assertions in favor of partitioned, exact-match accounting (`RV_OTH=16`, `DELIB=4`, `UV_OTH=0`) ensures deliberate test failures cannot mask unexpected runtime anomalies.

---

### 5. Overall Score

$$\text{Overall Score} = \operatorname{round}\left((8 + 8 + 8 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(41 \times 1.6667\right) = \mathbf{68/100}$$

*   **Delta vs Run 4701365 (35/100)**: **+33**
*   **Delta vs Run 4769794 (43/100)**: **+25**
*   **Delta vs Run 4795743 (43/100)**: **+25**
*   **Delta vs Run 4818826 (52/100)**: **+16**
*   **Delta vs Run 4880158 (v7, 58/100)**: **+10**
*   **Delta vs Run 4897654 (v8, 60/100)**: **+8**
*   **Delta vs Run 4898353 (v9, 62/100)**: **+6**

---

### 6. Overall Verdict

**Needs targeted rework**

*Verdict Context*: The benchmark harness, recovery mechanisms, concurrency guards, and internal verification suites are fully mature and engineering-sound. However, it cannot be rated "Ready for paper submission" until:
1. Ground-truth Leg C is decoupled from the operational database tables.
2. The proprietary/unpublished build dependencies (`BilingHarness.java`, `stagea_common.py`, and fixture generators) are packaged into a reproducible, self-contained artifact release.

---

### 7. Single Most Important Next Step

**Decouple Leg C from the SIMRS database**: Modify `build_dr_charge_ledger_p2.py` to construct the ground-truth ledger exclusively from an immutable, pre-adapter JSON/CSV clinical event log (external visit manifest), removing all runtime SQL dependencies on `sik.rawat_jl_dr` and `sik.detail_pemberian_obat` to achieve true end-to-end oracle independence.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

### Verification against Code and Transcripts
P10 exhibits a high degree of transparency and meticulousness regarding its claimed fixes and boundaries:
1. **Rubric and Suite Arithmetic**: The asserted run of `p6_acceptance_suite.sh` reports `PASS=39 FAIL=0`. Re-verifying each row in the summary table matches the 39 checks: A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A15, A16, A18a, A18b, A19, A20, A21, A22, A22b, A23, A24, A25, A27, A28, A29, A17, A14, A10, A10b, A10d, A10e, A10c, A26, A11, A12, A31, A13. 39 distinct assertions run and match the logs.
2. **Failure Exposure**: Rather than burying the failure, Run 1 (`30/38 PASS`, 8 FAIL) was preserved as primary evidence (`r5_p10_suite_run1_FAILED_20261018T042243Z.md`), diagnosing that A20's SIGKILL during `stage_restore` left `benchmark@localhost` stripped of DML privileges because `finally:` never executed. The post-mortem and fix (durable marker file `.writer_exclusion_<db>.json` + recovery on next startup in `recover_writer_exclusion()`) is verified in code and demonstrated in Run 2 via A31.
3. **A11 Counting Recalibration**: In P9, Astra caught that A11 counted markers globally across all logs. In P10's `p6_acceptance_suite.sh`:
   ```bash
   OTHER_LOGS=$(ls /tmp/r6_a*.log | grep -v -e '/r6_a15\.log$' -e '/r6_a18\.log$' -e '/r6_a18b\.log$' -e '/r6_a22b_retry\.log$')
   ...
   RV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-VERIFIED")
   DELIB=$(( $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a15.log) + $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a18.log) + $(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a18b.log) + $(cnt "STAGE-RESTORE-ERROR" /tmp/r6_a22b_retry.log) ))
   ```
   Transcript confirms: `RV_ALL=16, OUTSIDE the four excluded logs=16`, `deliberate failed restores (A15+A18a+A18b+A22b)=4`. The math is strictly consistent.
4. **Result Artifact Honesty (F1 / P10-A2)**: In `sampled_real_form_diff_r5.py`:
   ```python
   def _restore_state(b):
       if str(b.get("fail_reason", "")).startswith("stage-backup"):
           return "backup failed; stage tables kept"
       if b.get("restored") is True:
           return "restored, hash-verified"
       return "NOT restored; stage tables kept"
   ```
   The indiscriminate claim "FAILED batches (restored from stage backup)" is eliminated.
5. **A22 Mutation Correction**: R5 §20 previously stated "a billing row". R5 §21 and the suite summary now accurately state: "all 17 billing rows of 2026/10/01/800085 changed (+1 each)".

### Remaining / New Overclaims
- **"Fail-closed tariff authority" vs Gap Fallback**: The builder claims fail-closed behavior for malformed tariff entries (`irup()` raising `ValueError: MALFORMED-AMOUNT (P10-B5)`, caught in A26). However, for missing entries where `_TARIFF_STATUS == "ok"`, `dr_tariff()` still defaults silently to `dr-source(gap)` via fallback. While documented in the text, marketing this as "fail-closed tariff authority" across the benchmark remains a partial overclaim.
- **Exclusion Scope**: The claim of "writer exclusion" is strictly local MySQL privilege revocation for `benchmark@localhost` on the fixture DB. It does not exclude `root` connections or external system services. The text now scopes this to "benchmark account DML on fixture", which is accurate, but any residual mention of absolute "writer exclusion" must remain qualified.

**Score: 8/10**

---

## GATE-CORRECTNESS

### (a) Preservation Check and A30/A31
The preservation experiment (`p10_preservation_check.sh`) fulfills the core requirements of v9's next step:
- It runs through `p6_run_suite_fresh.sh` with `P10_INJECT=1 P9_FORCE_FAIL_CHECK=30`.
- Induces a genuine harness failure (3-second timeout on a 2-batch run), producing batch 1 `FAILED` with 13 stage tables populated (21 rows total across output tables + reg) and batch 2 `PENDING`.
- Computes independent root hashes (`p10_hash_state.py`) covering:
  1. `CHECKSUM TABLE ... EXTENDED` and row counts of all 13 stage tables.
  2. Sample visits output-row hash.
  3. 20 protected visits (10 non-DR, 10 DR outside sample).
  4. Live `sik` output-table checksums.
- Forces A30 failure -> normal suite exit with failure -> wrapper exits 1 -> leaves fixture untouched (`FIXTURE-KEPT`).
- On the preserved fixture, independent hashes re-evaluated: `ALL-EQUAL` (21 stage rows intact).
- Mutates the billing rows (`totalbiaya=totalbiaya+1` on visit `800085`), forces `--retry-failed` to restore under writer exclusion (`REVOKE` executed, fenced, restore hash-verified, `GRANT` restored), bills both batches clean (`rc=0 sukses_true=1`), checks protected rows and live DB untouched (`EQUAL`), and teardown succeeds.

### (b) Builder Cohort-Scoped DELETE (A10e)
In `build_dr_charge_ledger_p2.py`:
```python
rp_cs = dbutil.scalar(SIC_DB, "SELECT character_set_name FROM information_schema.columns ...")
on = ("rp.no_rawat = CONVERT(l.no_rawat USING %s)" % rp_cs) if rp_cs else "rp.no_rawat = l.no_rawat"
dscope = "1=1" if args.window == "ALL" else "l.no_rawat LIKE '2026/10/%'"
delete_sql = ("DELETE l FROM dr_charge_ledger l LEFT JOIN " + SIC_DB + ".reg_periksa rp "
              "ON " + on + " WHERE " + dscope + " AND (rp.no_rawat IS NULL OR "
              + (cp % ()) + ")")
```
Where `cp` is `cohort_predicate(args.cohort)` (`rp.no_rkm_medis LIKE 'DR%%'` if `dr` else `1=1`).
- For orphan rows in `dr_charge_ledger` that have no matching `reg_periksa` row (`rp.no_rawat IS NULL`), they are deleted within the window scope.
- Non-DR rows: if `cohort == "dr"`, `(rp.no_rawat IS NULL OR rp.no_rkm_medis LIKE 'DR%')` correctly isolates DR rows and orphans; non-DR rows have `rp.no_rawat IS NOT NULL` and `rp.no_rkm_medis NOT LIKE 'DR%'`, so the predicate evaluates to `FALSE` and they are spared. A10e confirms non-DR row `2026/10/01/000207` survives both `2026-10` and `ALL` rebuilds. The insert scope likewise queries `WHERE %s AND %s` (`wp` and `cp`). Delete and insert scopes are symmetric.

### (c) Live `sik` Mutation Risks
A17 refuses `FX=sik` or `FX=sik_bench` before executing. In `sampled_real_form_diff_r5.py`:
```python
if db == "sik" and not (args.freeze_only or args.verify_frozen or args.allow_live):
    print("LIVE-TARGET-REFUSED: ...")
    return 3
```
However, mutation vectors remain:
1. Running with `--allow-live` against `sik` is permitted by design for production runs, but relies solely on runtime flags.
2. In `sampled_real_form_diff_r5.py`, writer exclusion explicitly skips live databases:
   ```python
   if db in LIVE_DBS:
       log("WRITER-EXCLUSION skipped ...")
       return _stage_restore_inner(...)
   ```
   If a restore is ever executed against `sik` under `--allow-live`, it does **not** have writer exclusion, nor does it fence sessions (`FENCE-SKIPPED`).
3. If `p6_acceptance_suite.sh` crashes or is killed before the `trap cleanup EXIT` can restore `database.xml`, external applications pointing to the harness config could theoretically connect to the wrong database, though the trap has proved reliable on test runs.

### (d) A11 Relabeling and Acceptance
In `p6_acceptance_suite.sh`, A11 requires:
`[ "$RM_OTH" = "0" ] && [ "$UV_OTH" = "0" ] && [ "$ER_OTH" = "0" ] && [ "$RV_OTH" -ge 1 ] && [ "$DELIB" = "4" ] && [ "$DF_ALL" = "0" ]`
If an unintentional unverified restore, hash mismatch, or restore error occurs in any check other than the four deliberate ones (`r6_a15`, `r6_a18`, `r6_a18b`, `r6_a22b_retry`), `UV_OTH`, `RM_OTH`, or `ER_OTH` increments and trips A11 immediately. This closes the loophole where unverified restores could pass undetected.

### (e) Gate Defects Introduced in P10
- In `p10_hash_state.py`, `o._content_hash(visits(sample_f), db, log)` uses the oracle's internal hash function. If the oracle's hashing logic has a blind spot (e.g. ignoring certain table columns or joins), the independent check shares the exact same blind spot because it imports `sampled_real_form_diff_r5.py`. It is process-independent (runs as root CLI), but **algorithmically coupled**.

**Score: 8/10**

---

## ORACLE-VALIDITY

### Oracle Hardening in P10
1. **Source Content Hash Expansion (F2 / P10-B1)**:
   `source_content_hash()` in `sampled_real_form_diff_r5.py` now includes `h_beli`, `biaya_obat`, `total`, and procedure cost fields (`material`, `bhp`, `tarif_tindakandr`, `kso`, `menejemen`, `biaya_rawat`).
   Critically, `except Exception: pass` was replaced with explicit exception propagation:
   ```python
   except Exception as e:
       cur_src = "ERROR(%s)" % type(e).__name__
       log("verify-frozen: SOURCE-CONTENT CHECK ERROR (P10-B1): ...")
   ```
   This ensures DB errors or schema mismatches fail closed during baseline verification. A27 confirms that tampering with `biaya_obat` after freeze trips `SOURCE-CONTENT DRIFT` (exit 3) without resetting rows.
2. **Transactional Stage Backup (F3 / P10-B2)**:
   In `stage_backup()`, the `DELETE` and `REPLACE INTO ... SELECT` are wrapped in `START TRANSACTION; ... COMMIT;` using `dbutil.session()`. A28 verifies that an injected statement failure triggers a rollback, leaving earlier staged tables intact (checksums identical before and after), logs `STAGE-KEEP`, and exits 4 without deleting target rows.
3. **Quiet Interval Prior to FAILED Retries (F4 / P10-B3)**:
   `reap_writers()` now sets `restorable = ("STAGED", "RESET", "FAILED") if include_failed else ("STAGED", "RESET")`, ensuring that a batch about to undergo retry or abandonment waits out `R5_WRITER_QUIET_S` (5s) to guarantee no concurrent writes are occurring.
4. **Writer Exclusion Mechanism (F5 / P10-B4)**:
   During `stage_restore()` on fixtures, DML privileges (`INSERT`, `UPDATE`, `DELETE`) are revoked from `'benchmark'@'localhost'`. Crucially, because schema-level privilege revocations do not affect existing active connections until their next `USE <db>`, `fence_sessions()` executes immediately after revoke, issuing `KILL <id>` to all target sessions. Restore runs as `root`, and privileges are re-granted in `finally:`.
   - **Crash Safety**: Validated by Run 1's real failure. When a process holding the exclusion is `SIGKILL`ed, `.writer_exclusion_<db>.json` preserves the PID and revoked privileges. `recover_writer_exclusion()` detects dead PIDs on subsequent starts, executes `GRANT`, and cleans the marker. Tested directly in unit tests and asserted in A31.

### Residual Oracle Risks
1. **Algorithmic Coupling in Hash Verification**: As noted in Gate Correctness, `p10_hash_state.py` calls `o._content_hash()`. True oracle independence requires an out-of-band hashing routine that does not import the subject under test.
2. **Fencing Session Gap**: Between `REVOKE` and `KILL`, a running query could commit. Furthermore, `fence_sessions` filters on `db = DATABASE() OR info LIKE CONCAT('%', DATABASE(), '.%')`. If an external writer issues queries using unqualified table names without setting the default database to the fixture (e.g. multi-db cross query from root), the session filter might miss it.

The oracle is demonstrably fit for the bounded claims asserted on this fixture.

**Score: 8/10**

---

## REPRODUCIBILITY

### Reproducibility Improvements in P10
- **Manifest Pinning**: `khanza_r5_release_manifest.md` is cleanly updated. Tool SHAs match across git and VPS:
  - `sampled_real_form_diff_r5.py`: `c3bdd2d62933...`
  - `build_dr_charge_ledger_p2.py`: `2a4a1c48b6ee...`
  - `p6_acceptance_suite.sh`: `8b89d431c446...`
  - `p8_recovery_unit_test.py`: `345bc6ae011d...`
  - `p10_hash_state.py`: `8bf6c811ddcb...`
  - `p10_preservation_check.sh`: `7d05ef23b9f6...`
- **Builder Ledger Reproduction**: `p8_builder_all_check.sh` executes the integer builder `--window ALL` into an empty scratch database and compares row-by-row SHA-256 against the pinned canonical ledger (`356,355` rows, `Rp 34,870,243,633`, content hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`). Matches byte-for-byte.
- **One-Command Fixture Lifecycle**: `p6_run_suite_fresh.sh` automates clone provisioning from mysqldump, grant setup, test suite execution, failure preservation (`--teardown-kept`), and teardown.

### Remaining Blockers for Independent Third Parties (Ranked)
1. **Missing Upstream Source Dependencies**: As explicitly acknowledged in Pack D / "NOT claimed":
   - `stagea_common.py` (scrubbed for credentials but unpublished).
   - Java harness sources (`BilingHarness.java` modifications, compiled into the harness classpath).
   - STRATA fixture SQL generators.
   Without these, an external assessor cannot build the execution harness from source.
2. **Heavy Database Fixtures**: Reproduction relies on a 12-month pre-populated MySQL database dump (`sik` with 86,455 DR visits, ~1.46M billing rows). The raw database dumps are not published to a public immutable repository (e.g., Zenodo / DOI archive).
3. **Environment Hardcoding**: Tool scripts maintain hardcoded absolute paths (`/opt/dr-benchmark`, `/opt/Deers-Rock/tools`, `/opt/simrs-khanza/run-env`). Provisioning on an arbitrary Linux host requires reproducing exact path hierarchies.

On-box repeatability is exemplary; external clean-machine portability remains blocked.

**Score: 6/10**

---

## E2E-DESIGN

### Assessment of Current E2E Pipeline
1. **Form-Level Provenance Clarification (Retraction of B-subset Caveat)**:
   P7/P8 established that Khanza's `DlgBilingRalan` GUI save action writes both the verification layer (`nota_jalan`, `detail_nota_jalan`) and `billing` (17 rows in the audited encounter). The headless form save is thus an actual billing engine run, not merely a receipt generator.
2. **Current Comparison Topology**:
   - **Leg A**: Simulated/Consumer settlement rows in `sik.billing`.
   - **Leg B**: Real form headless GUI execution (`DlgBilingRalan` via Xvfb + faketime).
   - **Leg C**: DR ground-truth ledger (`dr_charge_ledger`), constructed from DR tariff authority + source inputs.

### Weakest Leg and Residual Vulnerabilities
- **The B-to-C Cohort Mismatch**:
  `three_count_reconcile_p2.py` reports `A == C == 31,750 rows / Rp 3,113,533,580` for the 2026-10 cohort. But Leg B on that cohort is only `149 notes / Rp 49,738,954` (or 151 notes / Rp 49,903,019 post-P6).
  Because running all 86,101 encounters through the GUI would take ~200 wall-clock hours at 7.14 visits/min, Leg B is only executed on small samples (e.g. 999 visits). Therefore, three-count reconciliation reports `P2-BC-TOTAL` failure/partial pass by construction.
- **Shared Source Tables Between A, B, and C**:
  The ground-truth ledger builder (`build_dr_charge_ledger_p2.py`) queries `rawat_jl_dr` and `detail_pemberian_obat` in `sik` to discover visit quantities and procedure codes. If an upstream ingestion error corrupts quantities or assigns wrong procedure codes in `sik`, both Leg A (consumer) and Leg C (ledger builder) read the identical corrupted rows. Leg C only independently verifies **unit price mapping via `dr_tariff`**, not encounter composition or clinical line-item authenticity.
- **Quantity Line-Diff Limitation**:
  `charge_delta --line-diff` compares aggregate quantities per visit per component, but cannot detect same-price code substitutions because `billing.nm_perawatan` stores text labels rather than clean item codes.

### Recommended Fix
Decouple Leg C from `sik` tables completely. Feed the ledger builder from a frozen, pre-adapter clinical transaction manifest (e.g. HL7/FHIR or raw DR clinical events) stored outside the database.

**Score: 7/10**

---

## EXTERNAL-VALIDITY

### Scope and External Reality
The benchmark's scope remains deliberately narrow and synthetic:
- **Single System Configuration**: Evaluated solely against SIMRS Khanza (git `722b82e`) running on MySQL 8.0.46 under Linux.
- **Outpatient Only**: Inpatient billing, BPJS / INA-CBG grouper tariffs, and complex multi-payer splits are entirely unmodelled.
- **Unrealistic Clinical Distributions**: Drug revenue constitutes ~82.7% of total revenue (PPN-inclusive), which does not reflect realistic hospital operational economics. Diagnoses are uncalibrated synthetic tokens.
- **Synthetic Strata Limits**: The 5 authored edge strata (embalase, tuslah, half-rupiah PPN, etc.) showed zero observable impact on the final outpatient bill in this Khanza configuration (embalase and tuslah charges are ignored by Khanza's outpatient billing module).

### Scoping Honesty
Credit is due to the project's reporting integrity: R5 §13 explicitly retains the verbatim paper-safe boundary caveat (`RC-9`):
> *"This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products."*

All real-world validation criteria (C1 diagnosis calibration, C2 clinical coherence, C3 payer mix, C4 real facility baseline) remain clearly tagged **NOT TESTED** and human-gated.

### Top External Risk
The ~250× performance divergence between the direct-DB consumer (~1,802 visits/min) and the real Khanza GUI (~7.14 visits/min) means the benchmark measures database write saturation of a bespoke batch client, not the operational throughput of hospital staff using the Khanza SIMRS software.

**Score: 4/10**

---

## OVERALL VERDICT

### Criterion Scores & Historical Trajectory

| Criterion | Score | Historical Progression (Runs 1 → 2 → 3 → 4 → v7 → v8 → v9 → **v10**) |
|---|---:|---|
| Claim-Honesty | **8/10** | 3 → 4 → 4 → 5 → 6 → 6 → 7 → **8** (+1) |
| Gate-Correctness | **8/10** | 3 → 3 → 3 → 4 → 6 → 6 → 6 → **8** (+2) |
| Oracle-Validity | **8/10** | 3 → 3 → 4 → 5 → 7 → 7 → 7 → **8** (+1) |
| Reproducibility | **6/10** | 3 → 4 → 4 → 5 → 6 → 6 → 6 → **6** (0) |
| E2E-Design | **7/10** | 4 → 5 → 5 → 6 → 7 → 7 → 7 → **7** (0) |
| External-Validity | **4/10** | 3 → 4 → 4 → 4 → 4 → 4 → 4 → **4** (0) |

$$\text{Overall Score} = \operatorname{round}\left((8 + 8 + 8 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(41 \times 1.6667\right) = \boxed{68/100}$$

### Summary Assessment
P10 represents the most technically rigorous cycle of this project to date. By executing the requested **integrated recovery-preservation experiment** (`p10_preservation_check.sh`), the authors:
1. Closed the gap between point-in-time checks and terminal failure behavior.
2. Proved that a real timeout failure with populated stage tables (21 rows) preserves state across the failed terminal path (`ALL-EQUAL` on 13 stage tables, sample, 20 protected visits, and live DB).
3. Demonstrated that `--retry-failed` detects mutated state, restores under verified writer exclusion (`REVOKE` + `KILL` fence + `GRANT`), and bills to completion.
4. Surfaced and resolved a real crash-safety defect in writer exclusion (A20 SIGKILL leaving revoked privileges), documenting the failure in Run 1 and proving recovery in Run 2 and unit tests.

The benchmark's internal test harness, recovery machinery, and claim boundaries are now solid and trustworthy. What prevents higher scores is not internal engineering rigor, but the architectural boundaries of the project: lack of an external pre-adapter clinical manifest (E2E), missing source distribution packages for independent clean-room builds (Reproducibility), and the absence of real-world hospital operational data (External Validity).
