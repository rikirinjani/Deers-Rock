# Astra v9 assessment: dr-khanza-e2e-full-assessment (post P1-P9) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

### Assessment of Claims vs. Evidence
Wave P9 resolves the most glaring discrepancies between report prose and executable behaviour flagged in v8:
1. **Restore claims in logs and gates**: In `sampled_real_form_diff_r5.py` (~l. 666), the unconditional `"pre-reset state restored"` wording has been replaced by runtime-conditioned logging:
   ```python
   log("date %s: FAILED (%s) — pre-reset state %s, run stops (P5-2)"
       % (d, b["fail_reason"], "restored (hash-verified)" if restored
          else "NOT restored (unverified/mismatch/error; stage tables kept)"))
   ```
2. **A11 counting accuracy**: In `p6_acceptance_suite.sh`, A11 no longer claims "every restore across the suite hash-verified." It now excludes the deliberate failure tests (`A15`, `A18a`, `A18b`, `A22b`), tracks `STAGE-RESTORE-ERROR`, and verifies exact tallies:
   - Transcript confirms: `STAGE-RESTORED-VERIFIED=14`, `STAGE-RESTORE-MISMATCH=0`, `STAGE-RESTORE-UNVERIFIED=0`, `STAGE-RESTORE-ERROR=0`, and `deliberate failed restores (A15+A18a+A18b+A22b)=4`.
   - Math verification of the 14 verified restores: A4 (1) + A4b resume (1) + A8 resume (1) + A15 cleanup (1) + A18a cleanup (1) + A18b cleanup (1) + A19 resume (1) + A20 resume2 (1) + A21 timeout (1) + A22 timeout (1) + A22 retry restore (1) + A22b timeout (1) + A23 timeout (1) + A24 resume (1) = 14. Deliberate failures: A15 (unverified), A18a (unverified), A18b (mismatch), A22b (error) = 4. Counts match the transcript.
3. **Demotion of A14**: In `p6_acceptance_suite.sh` and the summary, A14 is explicitly relabelled: `"A14 early-branch exit self-test only... the production terminal path is tested by p9_terminal_path_check.sh"`.
4. **Correction of Section 13 B3 bound**: The text in §13 now strikes through `"B3 bound ~0.3% (rule of three)"` and explicitly adds:
   > *(P9-A7: restated — 0 drift in 999 sampled visits of this one synthetic cohort, measured with the pre-R5 oracle. The rule of three gives ~0.3% only for independent, uniformly random draws from the same population; that was not established, so no population bound is claimed.)*
5. **Recomputed check tally**: The summary table lists 34 checks (A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A15, A16, A18a, A18b, A19, A20, A21, A22, A22b, A23, A24, A25, A17, A14, A10, A10b, A10d, A10e, A10c, A11, A12, A13). The count is exactly 34/34 PASS.

### Remaining and New Overclaims
- **Terminal Path Execution Scope**: While `p9_terminal_path_check.sh` proves that a failure in `p6_acceptance_suite.sh` triggers non-zero wrapper exit and preserves `sik_p6f`, it did so under `P9_QUICK=1`, running only A0 and A13 while skipping A1–A12 and A14–A25. The claim of having tested the "production wrapper recovery acceptance experiment" holds mechanically for exit propagation and cleanup inhibition, but it has not been demonstrated with the full 34-check suite running behind a terminal failure.
- **"Live Untouched" Fencing Exemption**: Server fencing (`fence_sessions`) deliberately skips `sik` and `sik_bench` (`FENCE-SKIPPED`). While honestly disclosed in §20 and the unit tests, marketing the system as having "safe writer fencing" obscures that fencing is strictly a disposable-fixture mechanism and cannot protect live databases against concurrent rogue connections.

**Score: 7/10**

---

## GATE-CORRECTNESS

### Code-Level Findings
1. **Terminal Path and Fixture Preservation (`p6_run_suite_fresh.sh` & `p9_terminal_path_check.sh`)**:
   - `p6_run_suite_fresh.sh` now traps `EXIT` and checks:
     ```bash
     if [ "${BUILT:-0}" = "1" ]; then
       if [ "$SUITE_RAN" = "1" ] && [ "$RC" != "0" ] && [ "${KEEP_ON_FAIL:-1}" = "1" ]; then
         echo "FIXTURE-KEPT: $FX kept because the suite failed (exit $RC)..."
       else
         SQL "DROP DATABASE IF EXISTS $FX;"
       fi
     fi
     ```
   - In `p9_terminal_path_check.sh`, `P9_FORCE_FAIL_CHECK=0` forced `A0` to fail (`RC=1`), leaving `sik_p6f` present with benchmark grants revoked (`GRANT=0`) and `database.xml` restored to `sik`. Subsequent invocation with `--teardown-kept` dropped the database cleanly. This closes defect E7.
2. **Cohort-Scoped Builder DELETE (`build_dr_charge_ledger_p2.py`)**:
   - `build_dr_charge_ledger_p2.py` l. 139 constructs:
     ```python
     dscope = "1=1" if args.window == "ALL" else "l.no_rawat LIKE '2026/10/%'"
     delete_sql = ("DELETE l FROM dr_charge_ledger l LEFT JOIN " + SIC_DB + ".reg_periksa rp "
                   "ON " + on + " WHERE " + dscope + " AND (rp.no_rawat IS NULL OR "
                   + (cp % ()) + ")")
     ```
   - For `cohort == "dr"`, `cp % ()` is `rp.no_rkm_medis LIKE 'DR%'`. For `cohort == "all"`, it is `1=1`.
   - Any orphan row (`rp.no_rawat IS NULL`) in the target window is deleted. Non-DR visits in the window have `rp.no_rawat IS NOT NULL` and do not match `cp`, so they survive. This was proven in check `A10e`: non-DR visit `2026/10/01/000207` survived both `--window 2026-10` and `--window ALL`. Delete scope matches insert scope.
3. **Stage Table Preservation Before Delete (`sampled_real_form_diff_r5.py`)**:
   - In `stage_restore()` (ll. 468–479), the oracle queries `information_schema.tables` for all expected stage tables (`want = ["%s_%s" % (pfx, t) for t in RESET_TABLES] + ["%s_reg" % pfx]`) *before* executing any `DELETE`.
   - If any are missing, it logs `STAGE-RESTORE-ERROR ... stage tables missing ... (nothing deleted, NOT restored)` and aborts. This prevents the destructive deletion of target rows when recovery tables are absent (verified in A22b).
4. **Enforcing Builder Reproduction Check (`p8_builder_all_check.sh`)**:
   - Defect E10 is fixed: the script regex-validates both hash strings (`^[0-9]+:[0-9a-f]{64}$`) and verifies `$BRC = 0` and `$L = $S`. When `P9_PLANT_MISMATCH=1` is injected, the script prints `DIFFERS ... - FAIL` and exits 1.
5. **Mutation Risks to Live `sik`**:
   - `sampled_real_form_diff_r5.py` requires `--allow-live` when `--db-name sik` is passed in a billing run.
   - `p6_acceptance_suite.sh` rejects `FX=sik` and `FX=sik_bench` at line 26 (`LIVE-FIXTURE-REFUSED`, exit 3).
   - **Residual risk**: `build_dr_charge_ledger_p2.py` still defaults to `LEDGER_DB = "sik_bench"` and `SIC_DB = "sik"`. Running it directly without setting `P2_LEDGER_DB` executes an in-place delete and replace on the live `sik_bench.dr_charge_ledger`.

**Score: 7/10**

---

## ORACLE-VALIDITY

### Assessment of P9 Recovery Hardening
1. **Per-Batch Hash Files (P9-B1)**:
   - In `stage_backup()`, pre-reset content hashes are written to `stage_content_hash_<pfx>_<date>.json`.
   - Check `A23` confirms that two batches on different dates produce two distinct hash files, preventing a subsequent batch's backup from overwriting the pre-reset verification basis of an earlier batch.
2. **Current-State Retry (P9-B2)**:
   - In `sampled_real_form_diff_r5.py` (ll. 560–586), `--retry-failed` executes `current_matches_prereset()`, recomputing `_content_hash()` on the target rows against the batch's pre-reset JSON file.
   - In `A22`, a post-verification tampering of `sik_p6f.billing` was caught: the oracle reported `current state is not the pre-reset state`, executed `stage_restore()`, verified the re-restored state, and only then re-billed.
   - In `A22b`, when stage tables were dropped, `--retry-failed` resulted in `RETRY-REFUSED`, refusing to reset or delete target rows.
3. **Stop-at-FAILED Contract (P9-B3)**:
   - In `main()`, encountering a `FAILED` batch immediately breaks the resume loop (`failed = True; break`). In `A23`, batch 1 failure left batch 2 as `PENDING`; batch 2 was not touched until batch 1 was resolved via `--retry-failed`.
4. **Server-Side Fencing (P9-B4)**:
   - `fence_sessions()` queries `information_schema.processlist` for sessions matching `db = DATABASE()` or query strings referencing the database, kills stray `mysql` CLI clients, issues `KILL <id>`, and polls up to 10 seconds for completion.
   - In `A24`, a background process running `SELECT COUNT(*) FROM billing ... FOR UPDATE; SELECT SLEEP(600);` was detected and terminated (`sessions_killed=1 remaining=0`), allowing restore and rebill to succeed.
5. **Source-Content Verification (P9-A2)**:
   - `verify_frozen()` now evaluates `source_content_hash()`, which hashes drug lines, procedure lines, and prices.
   - In `A25`, altering a single `detail_pemberian_obat.jml` without changing row counts tripped `SOURCE-CONTENT DRIFT` (exit 3) without resetting any visits.

### Residual Oracle Risks
1. **Live Fencing Gap**: Fencing is bypassed entirely when targeting `sik` or `sik_bench` (`FENCE-SKIPPED`). While protecting live databases from indiscriminate `KILL` commands is sensible ops practice, it means the oracle cannot guarantee single-writer exclusivity on live databases.
2. **Crash Windows in `fence_sessions`**: The gap between polling `remaining == 0` and executing `stage_restore()` is vulnerable to new incoming connection attempts if an external supervisor repeatedly spawns billing clients.
3. **Unexercised System-Level Faults**: The oracle has demonstrated recovery against process SIGKILL, interrupted restores, and corrupt metadata, but not against OS-level I/O freezes, disk exhaustion during backup creation, or network partition from MySQL.

The oracle is fit for its asserted scoped claims on a dedicated fixture.

**Score: 8/10**

---

## REPRODUCIBILITY

### Current Status
- **Builder Determinism**: Re-verified. `p8_builder_all_check.sh` builds `--window ALL` into an empty scratch database and generates SHA-256 `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`, identical to `sik_bench.dr_charge_ledger` across all 356,355 rows.
- **Manifest Pinning**: Manifest updated to P9 tools (oracle `8e0cca5b...`, suite `9ae16c46...`, wrapper `2e6097be...`, builder `736506c3...`). Local LF hashes and VPS hashes are confirmed identical.

### Remaining Blockers for Independent Third-Party Replication
The autonomous slice is solid within the VPS environment, but Pack D remains unexecuted:
1. **Missing Private Dependencies**: `p6_dbxml.py` imports `stagea_common`, which is not packaged or scrubbed of secrets.
2. **Missing Source Code for Java Binaries**: `BilingHarness.java` and `KhanzaBillingConsumer.java` are referenced as compiled classpaths or binaries; complete source code, compilation manifests, and build scripts are absent from the artifact bundle.
3. **Undistributed SQL Seed Artifacts**: `strata_reg_rows.sql` is read from an absolute path (`/opt/dr-benchmark/p-chain/sik_p6f_build_*/strata_reg_rows.sql`). It is not self-contained within the test tooling.
4. **No Clean-Room / Second-Host Reproduction**: Execution still relies exclusively on the state, users (`benchmark`, `root`), paths, and socket configs of the single host.

**Score: 6/10**

---

## E2E-DESIGN

### Architecture and Findings
1. **Form-Save Write Semantics**:
   - The P7 write-provenance audit established that `DlgBilingRalan` writes 17 rows directly to `sik.billing` in addition to `nota_jalan` and `detail_nota_jalan`. This withdrew the earlier caveat that Count B did not touch `billing`.
   - The oracle's billing comparison is therefore a valid same-encounter billing comparison between the headless GUI form and the consumer.
2. **Weaknesses in Three-Count Reconcile**:
   - Count B (`count_form_save` in `three_count_reconcile_p2.py`) remains an aggregate note-level sum (`detail_nota_jalan.besar_bayar + besarppn` and `piutang_pasien.totalpiutang`). It does not perform encounter-level itemized cross-checks against Count A or Count C.
   - On the 2026-10 DR cohort, B is only a 149–151 note subset (Rp 49,903,019) of the 7,708 visits (Rp 3,113,533,580). Because B is not fully populated across the cohort, `three_count` inevitably outputs `PARTIAL` / `P2-BC-TOTAL` rather than proving full three-way reconciliation.
3. **Line-Level Granularity**:
   - `charge_delta --line-diff` compares aggregate quantities per component per visit (`jumlah`), successfully flagging quantity redistributions.
   - However, because Khanza's `billing` table stores text item descriptions rather than normalized item codes, a same-price, same-quantity substitution between different drugs remains invisible to both the amount gate and the line-diff gate.
4. **Fix Needed**:
   - Parse and match individual item descriptions from `billing.nm_perawatan` back to `databarang.nama_brng` to establish code-level equivalence.
   - Run a fully populated headless billing pass across the complete cohort to elevate Count B from a subset sanity check to a full 1:1 ledger reconciliation.

**Score: 7/10**

---

## EXTERNAL-VALIDITY

### Scope and Generalizability
1. **Calibration and Payer Realism**:
   - The workload remains uncalibrated synthetic data: drug revenue accounts for ~82.7% of total revenue (inclusive of PPN), which does not reflect realistic Indonesian hospital outpatient billing profiles.
   - Payer mix is 100% direct outpatient cashier settlement. BPJS Kesehatan claims, INA-CBG grouping, tariff capping, and private insurer split-billing are entirely unmodelled (items C1–C4 remain NOT TESTED).
2. **Tariff and Form Feature Realism**:
   - In this specific Khanza SIMRS configuration, authoring embalase and tuslah rows on `detail_pemberian_obat` produced zero effect on the generated bill (as documented in §17). The benchmark thus tests Khanza under a simplified fee-handling configuration.
3. **Statistical Restatement**:
   - §13 has been updated to remove the invalid rule-of-three 0.3% population bound. The authors honestly report the 0/999 result as an empirical measurement on a single synthetic sample cohort.
4. **Top External Risk**:
   - Assuming that an exact match between the billing consumer and Khanza's `DlgBilingRalan` on this synthetic cohort guarantees billing correctness in a real hospital operating with complex BPJS rules, multi-tier formularies, variable doctor honoraria, and inpatient care.

**Score: 4/10**

---

## OVERALL SCORE AND VERDICT

### Criterion Scores and Arithmetic

| Criterion | Score | Weight | Weighted Points |
|---|---:|---:|---:|
| Claim-honesty | 7/10 | 1/6 | 1.167 |
| Gate-correctness | 7/10 | 1/6 | 1.167 |
| Oracle-validity | 8/10 | 1/6 | 1.333 |
| Reproducibility | 6/10 | 1/6 | 1.000 |
| E2E-design | 7/10 | 1/6 | 1.167 |
| External-validity | 4/10 | 1/6 | 0.667 |
| **Total** | | | **6.500 / 10** |

\[
\operatorname{round}\left((7 + 7 + 8 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(\frac{390}{6}\right) = \mathbf{65/100}
\]

Historical progression: **35 → 43 → 43 → 52 → 58 → 60 → 65.**

### Verdict
**65/100 — Passable within declared autonomous scope; external validity and portability gaps remain.**

Wave P9 directly delivers the v8 "single next step":
- Per-batch content hash tracking resolves multi-batch verification clobbering.
- Retry checks real current database state against the pre-reset hash rather than trusting a stale flag.
- Server-side fencing terminates rogue database locks before restore attempts.
- The failure exit path preserves both the failed database fixture and recovery tables for post-mortem analysis.
- Log reporting and Section 13 statistical claims have been brought into alignment with executable reality.

The core validation engine on the benchmark host is now robust and fail-closed. Further progress beyond 65/100 cannot come from additional recovery micro-checks; it requires addressing **portability packaging** (Pack D: eliminating private dependencies and providing clean-room reproduction) and **external clinical/payer validation** (C1–C4).

## VERDICT

Here is the structured synthesis, rubric breakdown, and overall assessment based on the provided section evaluations and comparison against runs 1 through 6.

---

### Criterion Scores, Justifications, and Remaining Risks

| Criterion | Score | Delta vs Prior (P1 $\rightarrow$ P2 $\rightarrow$ P3 $\rightarrow$ P4 $\rightarrow$ v7 $\rightarrow$ v8) | Justification (1 sentence) | Biggest Remaining Risk (1 sentence) |
| :--- | :---: | :---: | :--- | :--- |
| **Claim-Honesty** | **7/10** | $+1$ vs v8 (prior: 4, 5, 5, 6, 6, 6) | Section 13 explicitly retracts the rule-of-three 0.3% bound, and the stage-restore tally math (14 verified, 4 deliberate failures) matches the executable transcript exactly. | The production wrapper recovery terminal path (`p9_terminal_path_check.sh`) was validated only under `P9_QUICK=1` (running A0 and A13 while skipping A1–A12 and A14–A25), meaning a terminal failure behind the full suite remains untested. |
| **Gate-Correctness** | **7/10** | $+1$ vs v8 (prior: 3, 3, 3, 5, 6, 6) | Stage restore validates table presence via `information_schema.tables` before issuing deletes, and `p8_builder_all_check.sh` regex-enforces identical hash outputs while exiting 1 on mismatch injections. | `build_dr_charge_ledger_p2.py` still defaults directly to live names (`LEDGER_DB = "sik_bench"` and `SIC_DB = "sik"`), risking accidental mutation if invoked without `P2_LEDGER_DB`. |
| **Oracle-Validity** | **8/10** | $+1$ vs v8 (prior: 4, 4, 3, 5, 6, 7) | Per-batch state files (`prereset_state_batch_*.json`), live-hash verification prior to retry rebilling, stop-at-FAILED enforcement, and active session fencing (`fence_sessions()`) make the oracle strictly fail-closed on fixtures. | Server-side fencing deliberately skips `sik` and `sik_bench` (`FENCE-SKIPPED`), and a concurrency window exists between fencing completion and restore execution if a client repeatedly reconnects. |
| **Reproducibility** | **6/10** | $0$ vs v8 (prior: 3, 5, 6, 5, 6, 6) | Full builder determinism is proven via matching SHA-256 (`a66a3a546...`) across 356,355 rows, but Pack D remains unexecuted with dependencies tied strictly to a single VPS environment. | The suite cannot be executed on a second host due to private unscrubbed dependencies (`stagea_common`), absolute path SQL seeds (`/opt/dr-benchmark/...`), and absent Java source code. |
| **E2E-Design** | **7/10** | $0$ vs v8 (prior: 4, 5, 5, 6, 7, 7) | Form-save write-provenance correctly establishes a shared target schema (`sik.billing`), but Count B remains an aggregate note-level subset (149–151 notes) rather than an encounter-level itemized cross-check across the cohort. | Same-price, same-quantity drug substitutions remain undetected because the oracle compares component aggregate quantities rather than resolving item descriptions back to normalized item codes. |
| **External-Validity** | **4/10** | $0$ vs v8 (prior: 3, 4, 4, 4, 4, 4) | The evaluation remains restricted to a single synthetic outpatient cohort with simplified fee structures (zero-value embalase/tuslah), leaving all inpatient and multi-class tariffs unexercised (C1–C4 NOT TESTED). | Billing equivalence on this synthetic dataset may fail entirely in a hospital setting with real BPJS claims, inpatient bed-day aggregations, and variable practitioner honoraria. |

---

### 1. Status of v8 Findings

* **Genuinely Fixed (verified in code and demonstrated by an asserted run):**
  * **E7 (Terminal Path Preservation):** `p9_terminal_path_check.sh` asserts that wrapper abort preserves fixture database `sik_p6f`, revokes grants (`GRANT=0`), resets `database.xml`, and successfully cleans up under `--teardown-kept`.
  * **E8 (Multi-batch Verification Clobbering):** Partitioned per-batch state files (`prereset_state_batch_*.json`) prevent state clobbering across batches; demonstrated in A19/A20.
  * **E9 (Retry Stale Trust):** `current_matches_prereset()` recalculates live content hashes against batch state; demonstrated in A22 (tamper detection triggering restore) and A22b (missing tables causing `RETRY-REFUSED`).
  * **E10 (Builder Reproduction Silent Pass):** `p8_builder_all_check.sh` validates hash format via regex and explicitly exits 1 on planted mismatch.
  * **E11 (A14 Self-Test Demotion):** A14 is explicitly re-scoped to an internal exit self-test in scripts and summary logs.
  * **E12 (Section 13 Statistical Overclaim):** Struck the 0.3% rule-of-three population bound in §13; correctly restated as zero observed drift on 999 sample visits without population generalization.
  * **E13 (Missing Pre-Delete Stage Validation):** Missing stage tables trigger `STAGE-RESTORE-ERROR` and abort before any destructive deletes can run.

* **Merely Claimed:**
  * **Comprehensive Production Wrapper Testing:** Claimed as validating full production recovery, but the asserted run executed exclusively under `P9_QUICK=1` (skipping checks A1–A12 and A14–A25).

* **Still Open:**
  * **Single-Host Coupling (Pack D):** Absolute paths, missing Java harness build scripts, and unreleased private dependencies (`stagea_common`).
  * **Count B Itemized Granularity:** Count B remains an aggregate subset total rather than an itemized, encounter-level reconciler.

---

### 2. New Problems Introduced or Exposed by P9

1. **Live Fencing Exemption:** `fence_sessions()` completely skips `sik` and `sik_bench` (`FENCE-SKIPPED`). While intended as a safety measure against killing clinical sessions, it creates an unhandled concurrency window if rogue writers touch production tables.
2. **Hardcoded Defaults in Builder:** `build_dr_charge_ledger_p2.py` sets live table defaults (`sik_bench`/`sik`). Invoking this builder manually outside of test orchestration risks mutating live ledger data.
3. **Execution Gap in Terminal Testing:** Setting `P9_QUICK=1` in `p9_terminal_path_check.sh` masks how the production wrapper handles cleanup and error logging when higher-numbered multi-batch suites (A15–A25) fail mid-run.

---

### 3. Top-3 Remaining Issues (Priority Order)

1. **Portability & Build Hermeticity (Pack D):** Eliminate dependencies on the single VPS host (remove `/opt/...` hardcoded paths, scrub/package `stagea_common`, provide Java compilation manifests).
2. **Fine-Grained Ledger Matching (Item-Code Resolution):** Resolve `nm_perawatan` strings back to catalog codes (`databarang`) so line-diff detects same-price drug substitutions.
3. **External Payer/Clinical Realism (C1–C4):** Expand test data beyond the synthetic outpatient DR cohort to incorporate inpatient visits, active embalase/tuslah fees, and BPJS claims logic.

---

### 4. Top-3 Strongest Properties to Lead With

1. **Strict Fail-Closed Oracle Architecture:** Multi-batch hash pinning, pre-delete stage verification, and live-hash validation before retry ensure zero false-positive verifications or destructive teardowns.
2. **Total Builder Determinism:** Identical SHA-256 hash generation (`a66a3a546...`) across all 356,355 rows when reconstructing the ledger from scratch.
3. **Honest Statistical and Scope Disclosures:** Transparent retraction of population claims in Section 13 and complete mathematical agreement between execution transcripts and restore logs (14 verified, 4 expected failures).

---

### 5. Overall Score

$$\text{Total Points} = 7 + 7 + 8 + 6 + 7 + 4 = 39 / 60$$
$$\text{Scaled Score} = \operatorname{round}\left(39 \times \frac{10}{6}\right) = \mathbf{65/100}$$

* **Historical Progression:** 35 $\rightarrow$ 43 $\rightarrow$ 43 $\rightarrow$ 52 $\rightarrow$ 58 $\rightarrow$ 60 $\rightarrow$ **65/100**
* **Deltas:** $+30$ vs run 1 (35), $+22$ vs runs 2/3 (43), $+13$ vs run 4 (52), $+7$ vs v7 (58), $+5$ vs v8 (60).

---

### 6. Overall Verdict

**Needs targeted rework.**  
*(The autonomous fixture test engine is now mathematically sound, fail-closed, and internally consistent, but paper submission requires clean-room reproducibility outside the host environment and itemized line reconciliation.)*

---

### 7. Single Most Important Next Step

**Execute Pack D portability:** Decouple the test suite from the current VPS by scrubbing and packaging `stagea_common`, parameterizing all absolute filesystem paths, providing complete Java harness source/build scripts, and proving execution on a fresh, clean-room instance.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

### Assessment of Claims vs. Evidence
Wave P9 resolves the most glaring discrepancies between report prose and executable behaviour flagged in v8:
1. **Restore claims in logs and gates**: In `sampled_real_form_diff_r5.py` (~l. 666), the unconditional `"pre-reset state restored"` wording has been replaced by runtime-conditioned logging:
   ```python
   log("date %s: FAILED (%s) — pre-reset state %s, run stops (P5-2)"
       % (d, b["fail_reason"], "restored (hash-verified)" if restored
          else "NOT restored (unverified/mismatch/error; stage tables kept)"))
   ```
2. **A11 counting accuracy**: In `p6_acceptance_suite.sh`, A11 no longer claims "every restore across the suite hash-verified." It now excludes the deliberate failure tests (`A15`, `A18a`, `A18b`, `A22b`), tracks `STAGE-RESTORE-ERROR`, and verifies exact tallies:
   - Transcript confirms: `STAGE-RESTORED-VERIFIED=14`, `STAGE-RESTORE-MISMATCH=0`, `STAGE-RESTORE-UNVERIFIED=0`, `STAGE-RESTORE-ERROR=0`, and `deliberate failed restores (A15+A18a+A18b+A22b)=4`.
   - Math verification of the 14 verified restores: A4 (1) + A4b resume (1) + A8 resume (1) + A15 cleanup (1) + A18a cleanup (1) + A18b cleanup (1) + A19 resume (1) + A20 resume2 (1) + A21 timeout (1) + A22 timeout (1) + A22 retry restore (1) + A22b timeout (1) + A23 timeout (1) + A24 resume (1) = 14. Deliberate failures: A15 (unverified), A18a (unverified), A18b (mismatch), A22b (error) = 4. Counts match the transcript.
3. **Demotion of A14**: In `p6_acceptance_suite.sh` and the summary, A14 is explicitly relabelled: `"A14 early-branch exit self-test only... the production terminal path is tested by p9_terminal_path_check.sh"`.
4. **Correction of Section 13 B3 bound**: The text in §13 now strikes through `"B3 bound ~0.3% (rule of three)"` and explicitly adds:
   > *(P9-A7: restated — 0 drift in 999 sampled visits of this one synthetic cohort, measured with the pre-R5 oracle. The rule of three gives ~0.3% only for independent, uniformly random draws from the same population; that was not established, so no population bound is claimed.)*
5. **Recomputed check tally**: The summary table lists 34 checks (A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A15, A16, A18a, A18b, A19, A20, A21, A22, A22b, A23, A24, A25, A17, A14, A10, A10b, A10d, A10e, A10c, A11, A12, A13). The count is exactly 34/34 PASS.

### Remaining and New Overclaims
- **Terminal Path Execution Scope**: While `p9_terminal_path_check.sh` proves that a failure in `p6_acceptance_suite.sh` triggers non-zero wrapper exit and preserves `sik_p6f`, it did so under `P9_QUICK=1`, running only A0 and A13 while skipping A1–A12 and A14–A25. The claim of having tested the "production wrapper recovery acceptance experiment" holds mechanically for exit propagation and cleanup inhibition, but it has not been demonstrated with the full 34-check suite running behind a terminal failure.
- **"Live Untouched" Fencing Exemption**: Server fencing (`fence_sessions`) deliberately skips `sik` and `sik_bench` (`FENCE-SKIPPED`). While honestly disclosed in §20 and the unit tests, marketing the system as having "safe writer fencing" obscures that fencing is strictly a disposable-fixture mechanism and cannot protect live databases against concurrent rogue connections.

**Score: 7/10**

---

## GATE-CORRECTNESS

### Code-Level Findings
1. **Terminal Path and Fixture Preservation (`p6_run_suite_fresh.sh` & `p9_terminal_path_check.sh`)**:
   - `p6_run_suite_fresh.sh` now traps `EXIT` and checks:
     ```bash
     if [ "${BUILT:-0}" = "1" ]; then
       if [ "$SUITE_RAN" = "1" ] && [ "$RC" != "0" ] && [ "${KEEP_ON_FAIL:-1}" = "1" ]; then
         echo "FIXTURE-KEPT: $FX kept because the suite failed (exit $RC)..."
       else
         SQL "DROP DATABASE IF EXISTS $FX;"
       fi
     fi
     ```
   - In `p9_terminal_path_check.sh`, `P9_FORCE_FAIL_CHECK=0` forced `A0` to fail (`RC=1`), leaving `sik_p6f` present with benchmark grants revoked (`GRANT=0`) and `database.xml` restored to `sik`. Subsequent invocation with `--teardown-kept` dropped the database cleanly. This closes defect E7.
2. **Cohort-Scoped Builder DELETE (`build_dr_charge_ledger_p2.py`)**:
   - `build_dr_charge_ledger_p2.py` l. 139 constructs:
     ```python
     dscope = "1=1" if args.window == "ALL" else "l.no_rawat LIKE '2026/10/%'"
     delete_sql = ("DELETE l FROM dr_charge_ledger l LEFT JOIN " + SIC_DB + ".reg_periksa rp "
                   "ON " + on + " WHERE " + dscope + " AND (rp.no_rawat IS NULL OR "
                   + (cp % ()) + ")")
     ```
   - For `cohort == "dr"`, `cp % ()` is `rp.no_rkm_medis LIKE 'DR%'`. For `cohort == "all"`, it is `1=1`.
   - Any orphan row (`rp.no_rawat IS NULL`) in the target window is deleted. Non-DR visits in the window have `rp.no_rawat IS NOT NULL` and do not match `cp`, so they survive. This was proven in check `A10e`: non-DR visit `2026/10/01/000207` survived both `--window 2026-10` and `--window ALL`. Delete scope matches insert scope.
3. **Stage Table Preservation Before Delete (`sampled_real_form_diff_r5.py`)**:
   - In `stage_restore()` (ll. 468–479), the oracle queries `information_schema.tables` for all expected stage tables (`want = ["%s_%s" % (pfx, t) for t in RESET_TABLES] + ["%s_reg" % pfx]`) *before* executing any `DELETE`.
   - If any are missing, it logs `STAGE-RESTORE-ERROR ... stage tables missing ... (nothing deleted, NOT restored)` and aborts. This prevents the destructive deletion of target rows when recovery tables are absent (verified in A22b).
4. **Enforcing Builder Reproduction Check (`p8_builder_all_check.sh`)**:
   - Defect E10 is fixed: the script regex-validates both hash strings (`^[0-9]+:[0-9a-f]{64}$`) and verifies `$BRC = 0` and `$L = $S`. When `P9_PLANT_MISMATCH=1` is injected, the script prints `DIFFERS ... - FAIL` and exits 1.
5. **Mutation Risks to Live `sik`**:
   - `sampled_real_form_diff_r5.py` requires `--allow-live` when `--db-name sik` is passed in a billing run.
   - `p6_acceptance_suite.sh` rejects `FX=sik` and `FX=sik_bench` at line 26 (`LIVE-FIXTURE-REFUSED`, exit 3).
   - **Residual risk**: `build_dr_charge_ledger_p2.py` still defaults to `LEDGER_DB = "sik_bench"` and `SIC_DB = "sik"`. Running it directly without setting `P2_LEDGER_DB` executes an in-place delete and replace on the live `sik_bench.dr_charge_ledger`.

**Score: 7/10**

---

## ORACLE-VALIDITY

### Assessment of P9 Recovery Hardening
1. **Per-Batch Hash Files (P9-B1)**:
   - In `stage_backup()`, pre-reset content hashes are written to `stage_content_hash_<pfx>_<date>.json`.
   - Check `A23` confirms that two batches on different dates produce two distinct hash files, preventing a subsequent batch's backup from overwriting the pre-reset verification basis of an earlier batch.
2. **Current-State Retry (P9-B2)**:
   - In `sampled_real_form_diff_r5.py` (ll. 560–586), `--retry-failed` executes `current_matches_prereset()`, recomputing `_content_hash()` on the target rows against the batch's pre-reset JSON file.
   - In `A22`, a post-verification tampering of `sik_p6f.billing` was caught: the oracle reported `current state is not the pre-reset state`, executed `stage_restore()`, verified the re-restored state, and only then re-billed.
   - In `A22b`, when stage tables were dropped, `--retry-failed` resulted in `RETRY-REFUSED`, refusing to reset or delete target rows.
3. **Stop-at-FAILED Contract (P9-B3)**:
   - In `main()`, encountering a `FAILED` batch immediately breaks the resume loop (`failed = True; break`). In `A23`, batch 1 failure left batch 2 as `PENDING`; batch 2 was not touched until batch 1 was resolved via `--retry-failed`.
4. **Server-Side Fencing (P9-B4)**:
   - `fence_sessions()` queries `information_schema.processlist` for sessions matching `db = DATABASE()` or query strings referencing the database, kills stray `mysql` CLI clients, issues `KILL <id>`, and polls up to 10 seconds for completion.
   - In `A24`, a background process running `SELECT COUNT(*) FROM billing ... FOR UPDATE; SELECT SLEEP(600);` was detected and terminated (`sessions_killed=1 remaining=0`), allowing restore and rebill to succeed.
5. **Source-Content Verification (P9-A2)**:
   - `verify_frozen()` now evaluates `source_content_hash()`, which hashes drug lines, procedure lines, and prices.
   - In `A25`, altering a single `detail_pemberian_obat.jml` without changing row counts tripped `SOURCE-CONTENT DRIFT` (exit 3) without resetting any visits.

### Residual Oracle Risks
1. **Live Fencing Gap**: Fencing is bypassed entirely when targeting `sik` or `sik_bench` (`FENCE-SKIPPED`). While protecting live databases from indiscriminate `KILL` commands is sensible ops practice, it means the oracle cannot guarantee single-writer exclusivity on live databases.
2. **Crash Windows in `fence_sessions`**: The gap between polling `remaining == 0` and executing `stage_restore()` is vulnerable to new incoming connection attempts if an external supervisor repeatedly spawns billing clients.
3. **Unexercised System-Level Faults**: The oracle has demonstrated recovery against process SIGKILL, interrupted restores, and corrupt metadata, but not against OS-level I/O freezes, disk exhaustion during backup creation, or network partition from MySQL.

The oracle is fit for its asserted scoped claims on a dedicated fixture.

**Score: 8/10**

---

## REPRODUCIBILITY

### Current Status
- **Builder Determinism**: Re-verified. `p8_builder_all_check.sh` builds `--window ALL` into an empty scratch database and generates SHA-256 `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`, identical to `sik_bench.dr_charge_ledger` across all 356,355 rows.
- **Manifest Pinning**: Manifest updated to P9 tools (oracle `8e0cca5b...`, suite `9ae16c46...`, wrapper `2e6097be...`, builder `736506c3...`). Local LF hashes and VPS hashes are confirmed identical.

### Remaining Blockers for Independent Third-Party Replication
The autonomous slice is solid within the VPS environment, but Pack D remains unexecuted:
1. **Missing Private Dependencies**: `p6_dbxml.py` imports `stagea_common`, which is not packaged or scrubbed of secrets.
2. **Missing Source Code for Java Binaries**: `BilingHarness.java` and `KhanzaBillingConsumer.java` are referenced as compiled classpaths or binaries; complete source code, compilation manifests, and build scripts are absent from the artifact bundle.
3. **Undistributed SQL Seed Artifacts**: `strata_reg_rows.sql` is read from an absolute path (`/opt/dr-benchmark/p-chain/sik_p6f_build_*/strata_reg_rows.sql`). It is not self-contained within the test tooling.
4. **No Clean-Room / Second-Host Reproduction**: Execution still relies exclusively on the state, users (`benchmark`, `root`), paths, and socket configs of the single host.

**Score: 6/10**

---

## E2E-DESIGN

### Architecture and Findings
1. **Form-Save Write Semantics**:
   - The P7 write-provenance audit established that `DlgBilingRalan` writes 17 rows directly to `sik.billing` in addition to `nota_jalan` and `detail_nota_jalan`. This withdrew the earlier caveat that Count B did not touch `billing`.
   - The oracle's billing comparison is therefore a valid same-encounter billing comparison between the headless GUI form and the consumer.
2. **Weaknesses in Three-Count Reconcile**:
   - Count B (`count_form_save` in `three_count_reconcile_p2.py`) remains an aggregate note-level sum (`detail_nota_jalan.besar_bayar + besarppn` and `piutang_pasien.totalpiutang`). It does not perform encounter-level itemized cross-checks against Count A or Count C.
   - On the 2026-10 DR cohort, B is only a 149–151 note subset (Rp 49,903,019) of the 7,708 visits (Rp 3,113,533,580). Because B is not fully populated across the cohort, `three_count` inevitably outputs `PARTIAL` / `P2-BC-TOTAL` rather than proving full three-way reconciliation.
3. **Line-Level Granularity**:
   - `charge_delta --line-diff` compares aggregate quantities per component per visit (`jumlah`), successfully flagging quantity redistributions.
   - However, because Khanza's `billing` table stores text item descriptions rather than normalized item codes, a same-price, same-quantity substitution between different drugs remains invisible to both the amount gate and the line-diff gate.
4. **Fix Needed**:
   - Parse and match individual item descriptions from `billing.nm_perawatan` back to `databarang.nama_brng` to establish code-level equivalence.
   - Run a fully populated headless billing pass across the complete cohort to elevate Count B from a subset sanity check to a full 1:1 ledger reconciliation.

**Score: 7/10**

---

## EXTERNAL-VALIDITY

### Scope and Generalizability
1. **Calibration and Payer Realism**:
   - The workload remains uncalibrated synthetic data: drug revenue accounts for ~82.7% of total revenue (inclusive of PPN), which does not reflect realistic Indonesian hospital outpatient billing profiles.
   - Payer mix is 100% direct outpatient cashier settlement. BPJS Kesehatan claims, INA-CBG grouping, tariff capping, and private insurer split-billing are entirely unmodelled (items C1–C4 remain NOT TESTED).
2. **Tariff and Form Feature Realism**:
   - In this specific Khanza SIMRS configuration, authoring embalase and tuslah rows on `detail_pemberian_obat` produced zero effect on the generated bill (as documented in §17). The benchmark thus tests Khanza under a simplified fee-handling configuration.
3. **Statistical Restatement**:
   - §13 has been updated to remove the invalid rule-of-three 0.3% population bound. The authors honestly report the 0/999 result as an empirical measurement on a single synthetic sample cohort.
4. **Top External Risk**:
   - Assuming that an exact match between the billing consumer and Khanza's `DlgBilingRalan` on this synthetic cohort guarantees billing correctness in a real hospital operating with complex BPJS rules, multi-tier formularies, variable doctor honoraria, and inpatient care.

**Score: 4/10**

---

## OVERALL SCORE AND VERDICT

### Criterion Scores and Arithmetic

| Criterion | Score | Weight | Weighted Points |
|---|---:|---:|---:|
| Claim-honesty | 7/10 | 1/6 | 1.167 |
| Gate-correctness | 7/10 | 1/6 | 1.167 |
| Oracle-validity | 8/10 | 1/6 | 1.333 |
| Reproducibility | 6/10 | 1/6 | 1.000 |
| E2E-design | 7/10 | 1/6 | 1.167 |
| External-validity | 4/10 | 1/6 | 0.667 |
| **Total** | | | **6.500 / 10** |

\[
\operatorname{round}\left((7 + 7 + 8 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(\frac{390}{6}\right) = \mathbf{65/100}
\]

Historical progression: **35 → 43 → 43 → 52 → 58 → 60 → 65.**

### Verdict
**65/100 — Passable within declared autonomous scope; external validity and portability gaps remain.**

Wave P9 directly delivers the v8 "single next step":
- Per-batch content hash tracking resolves multi-batch verification clobbering.
- Retry checks real current database state against the pre-reset hash rather than trusting a stale flag.
- Server-side fencing terminates rogue database locks before restore attempts.
- The failure exit path preserves both the failed database fixture and recovery tables for post-mortem analysis.
- Log reporting and Section 13 statistical claims have been brought into alignment with executable reality.

The core validation engine on the benchmark host is now robust and fail-closed. Further progress beyond 65/100 cannot come from additional recovery micro-checks; it requires addressing **portability packaging** (Pack D: eliminating private dependencies and providing clean-room reproduction) and **external clinical/payer validation** (C1–C4).
