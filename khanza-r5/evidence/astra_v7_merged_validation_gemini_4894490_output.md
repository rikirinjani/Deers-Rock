# Astra v7 assessment: dr-khanza-e2e-full-assessment (post P1-P7) [merged finish: gate-correctness, oracle-validity, reproducibility, e2e-design, external-validity in one call + synthesis]

## GATE-CORRECTNESS

### (a) Suite Exit Path and A14
In `tools/p6_acceptance_suite.sh`, the final line now enforces a non-zero exit on failure:
```bash
[ "$FAIL" = "0" ] && exit 0 || exit 1
```
The fresh fixture runner `tools/p6_run_suite_fresh.sh` captures and propagates this code:
```bash
FX=$FX bash p6_acceptance_suite.sh
RC=$?
echo "suite exit=$RC"
exit $RC
```
The exit trap in `p6_run_suite_fresh.sh` invokes `teardown()`, which ends on `echo` without an explicit `exit`, correctly preserving `$RC` in POSIX bash.

**Defect in A14:** Check A14 does **not** test an end-to-end failure of the acceptance suite. At lines 21–25 of `tools/p6_acceptance_suite.sh`:
```bash
if [ -n "${P7_EXIT_TEST:-}" ]; then
  OUT=/dev/null
  check 99 "exit-path self-test" $([ "$P7_EXIT_TEST" = "pass" ] && echo 0 || echo 1)
  [ "$FAIL" = "0" ] && exit 0 || exit 1
fi
```
When `P7_EXIT_TEST=fail` is invoked, execution short-circuits immediately at line 25. It bypasses all fixtures, retargeting, cleanup traps, background checks, and downstream assertions. A14 is a unit test of a 4-line stub, not proof that a mid-suite assertion failure (e.g., during A4b or A10) cleanly propagates past background processes and traps to exit 1.

Furthermore, line 118 reveals an unasserted non-zero exit in the suite transcript:
```text
  freeze r6_a2fix/B3 exit=0
A2 cleanup re-bill exit=1
```
Because `A2 cleanup re-bill` is logged via `res` rather than `check`, `$FAIL` was not incremented, and the suite reported `PASS=21 FAIL=0` despite a sub-step failing.

### (b) `three_count` Exit Contract and `--verify-form-save`
In `tools/three_count_reconcile_p2.py`, the exit condition was repaired from the broken P6 boolean:
```python
# Line 282
tool.close()
return 0 if gate_pass else 1
```
Lines 227–275 set `gate_pass = False` if:
1. `a_rows == 0` or `c_rows == 0`
2. Any component mismatch occurs between Count A and Count C (`P2-AC-*`)
3. Any unknown status rows appear (`P2-OTHER-STATUS`)
4. Count B is verified and `b_amt != c_amt` (`P2-BC-TOTAL`)
5. Count B is unverified AND `--verify-form-save` is passed (`B-REQUIRED`):
   ```python
   else:
       partial = True
       log("B NOT-VERIFIED: no form-save rows for cohort; A==C still required, B not compared.")
       if verify_form:
           gate_pass = False
           findings.append(("B-REQUIRED", "note",
                            "--verify-form-save given but no form-save rows exist for the cohort"))
   ```
When B is unverified and `--verify-form-save` is absent, `partial = True`, `gate_pass` remains `True`, and the process returns 0 as documented. `tools/p7_three_count_contract_test.py` validates all four cases (A==C no B $\rightarrow$ 0; A==C no B with flag $\rightarrow$ 1; A==C with B==C $\rightarrow$ 0; A!=C no B $\rightarrow$ 1), confirmed 4/4 in the transcript.

### (c) Integer Tax Rule, A10b Exactness, and Ledger Reproduction
In `tools/build_dr_charge_ledger_p2.py`, line 239 replaces floating-point multiplication with integer truncation half-up:
```python
tax = (int(s or 0) * 11 + 50) // 100
```
`tools/p7_tax_rule_check.py` evaluated this formula against Java's IEEE-754 double `Math.round(subttl * 0.11)` across all 70,056 real drug subtotals: exactly 0 discrepancies, 0 missing tax rows, and 0 stored tax deviations.

In `tools/p6_acceptance_suite.sh`, A10b was hardened from a loose inequality into an exact match:
```sql
TAXBAD=$(SQL "SELECT COUNT(*) FROM (SELECT d.no_rawat, SUM(d.amount) ds FROM ${FX}.dr_charge_ledger d WHERE d.component='drug' AND d.no_rawat LIKE '2026/10/%' GROUP BY d.no_rawat) x LEFT JOIN ${FX}.dr_charge_ledger t ON t.no_rawat=x.no_rawat AND t.component='tax' WHERE (x.ds*11+50) DIV 100 > 0 AND (t.no_rawat IS NULL OR t.amount <> (x.ds*11+50) DIV 100);")
TAXORPHAN=$(SQL "SELECT COUNT(*) FROM ${FX}.dr_charge_ledger t WHERE t.component='tax' AND t.no_rawat LIKE '2026/10/%' AND NOT EXISTS (SELECT 1 FROM ${FX}.dr_charge_ledger d WHERE d.no_rawat=t.no_rawat AND d.component='drug');")
```
Tolerance is now 0. Any visit with drug charges where tax is missing (`t.no_rawat IS NULL`) or where `t.amount <> (x.ds*11+50) DIV 100` trips `TAXBAD`. 

Running the integer builder `--window ALL` into an empty scratch ledger yielded content hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`, matching the live ledger byte-for-byte.

### (d) Live Guards and `--allow-live`
In `tools/sampled_real_form_diff_r5.py`, lines 393–397 guard the live database:
```python
if db == "sik" and not (args.freeze_only or args.verify_frozen or args.allow_live):
    print("LIVE-TARGET-REFUSED: a billing run resets output rows; --db-name sik "
          "requires --allow-live (use a disposable clone for tests)")
    return 3
```
Check A16 confirms refusal (exit 3). Check A13 confirms that live `sik_bench.dr_charge_ledger` hash and table checksums across `sik.billing`, `nota_jalan`, `detail_nota_jalan`, `piutang_pasien`, `detail_piutang_pasien`, and `reg_periksa` are identical pre- and post-suite.

**Remaining Live Vulnerabilities:**
1. `--freeze-only` and `--verify-frozen` are permitted against live `sik` without `--allow-live`. While nominally read-only, `--freeze-only` writes artifacts into `results/`.
2. `build_dr_charge_ledger_p2.py` has **no** `--allow-live` guard. Defaults remain `LEDGER_DB = os.environ.get("P2_LEDGER_DB", "sik_bench")` and `SIC_DB = os.environ.get("P2_CONSUMER_DB", "sik")`. An invocation without environment overrides immediately deletes and replaces data in live `sik_bench.dr_charge_ledger`.

### (e) New Gate Defects Introduced in P7
1. **`build_dr_charge_ledger_p2.py` Cohort Scope Bug:** At line 134:
   ```python
   sess.exec("START TRANSACTION; DELETE FROM dr_charge_ledger WHERE "
             + ("1=1" if args.window == "ALL" else "no_rawat LIKE '2026/10/%'") + ";")
   ```
   If invoked with `--window ALL --cohort dr`, the DELETE wipes out `WHERE 1=1` (all cohorts), but subsequent insertions only query `WHERE rp.no_rkm_medis LIKE 'DR%'`. Non-DR rows in the target table are purged without replacement.
2. **A15 Cleanup Defect:** When A15 deliberately deletes the hash file, the script cleans up the kept stage tables using an embedded Python script that calls `o.stage_restore` and `o.stage_drop` without verifying whether `stage_restore` passed. Because the hash is missing, `stage_restore` returns `False`, but `stage_drop` proceeds regardless.

**Gate-Correctness Score: 7/10**

---

## ORACLE-VALIDITY

### Fail-Closed Restore and STAGE-KEEP
The fail-open restore defect identified in v6 (where a missing pre-reset hash still returned `ok=True`) is closed in `tools/sampled_real_form_diff_r5.py`:
```python
# Line 323
else:
    ok = False
    log("STAGE-RESTORE-UNVERIFIED %d visits: pre-reset hash file absent; data "
        "re-applied but NOT verified — treated as a failed restore" % len(nrs))
return ok
```
In `_finalize`, unverified restorations prevent stage tables from being purged:
```python
# Lines 530-539
unrestored = sorted(d for d, b in st["batches"].items()
                    if b.get("status") in ("STAGED", "RESET")
                    or (b.get("status") == "FAILED" and b.get("restored") is False
                        and not str(b.get("fail_reason", "")).startswith("stage-backup")))
if unrestored:
    log("STAGE-KEEP %s_*: batches %s not verifiably restored — stage tables "
        "kept for a resume/manual restore (box NOT clean)" ...)
    drop_ok = False
```
`drop_ok = False` forces `verdict = "PARTIAL-NOT-COVERED"` and `exit_code = 4`. A15 executes this path: deleting the hash file produces `STAGE-RESTORE-UNVERIFIED`, `exit 4`, `restored=False`, and leaves 13 stage tables intact (`STAGE-KEEP`).

### Process-Group Termination and Resume (A4, A4b, A8)
- **Timeout (A4):** Setting `R5_HARNESS_TIMEOUT_S=3` triggers `_kill_process_group` with `SIGTERM` followed by `SIGKILL` escalation on the group leader (`pgid`). The oracle logs `WRITER-DEAD-PROOF pgid=... group_empty=true`, restores from stage backup (`STAGE-RESTORED-VERIFIED`), exits 4, and confirms 0 Java processes survive.
- **SIGTERM Interrupt (A4b):** Oracle signal handler `_on_terminate` terminates the active harness process group before exiting 4 without dropping state, allowing immediate resume (`r6_a4b_resume.log`) to restore and re-bill cleanly to exit 0.
- **Mid-Batch Kill (A8):** Terminating the harness immediately post-reset leaves state in `RESET`; resume recovers via stage backup (`STAGE-RESTORED-VERIFIED`) and finishes with exit 0.

### Audit Implication on Billing Comparison
The row-level trigger audit in `evidence/p7/r5_p7_write_provenance_*.md` proves that connection `benchmark@localhost#68986` (the JVM executing `BilingHarness.java` driving `DlgBilingRalan`) inserts 17 rows into `sik.billing` alongside `nota_jalan` and `detail_nota_jalan`. Because `BilingHarness.java` contains no SQL commands, Khanza's own GUI form writes the `billing` table rows. Diffing `sik.billing` post-run against the frozen baseline is therefore an authentic same-encounter comparison between the GUI save path and the batch consumer.

### Residual Oracle Risks (Ranked)
1. **Unprotected Multi-Table Restore Atomicity (P8):** `stage_restore` iterates through 12 tables issuing sequential `DELETE` and `REPLACE INTO` statements without an enclosing transaction. An interruption during restoration leaves the database partially restored.
2. **Concurrency and Session Isolation:** Oracle locking relies on `.lock` in the file system. Multiple database instances or distributed consumers are not isolated at the DBMS level.
3. **Survivability Under Ungraceful SIGKILL of Oracle:** If the Python oracle receives `SIGKILL` (`kill -9`), `_on_terminate` cannot run. The detached JVM harness (in its own session via `start_new_session=True`) continues writing concurrently to the database.

**Oracle-Validity Score: 7/10**

---

## REPRODUCIBILITY

### Re-Pinned Manifest and Ledger Rebuild
The release manifest (`khanza_r5_release_manifest.md`) accurately pins all critical components:
- SIMRS Khanza JAR SHA-256: `34b0d77e3a37243075cdac6321802e886580557c8e3ae0d3f72153332d8a829d`
- B3 Encounter Set SHA-256: `84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08`
- Pinned Rebuilt Ledger Hash: `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` (356,355 rows / Rp 34,870,243,633)
- Backup Ledger Table: `sik_bench.dr_charge_ledger_bak_20261017` preserves the pre-P7 state (`d2b65d8e...`).
- Gate and Oracle Tool SHAs: Re-pinned for `sampled_real_form_diff_r5.py`, `three_count_reconcile_p2.py`, `build_dr_charge_ledger_p2.py`, and `p6_acceptance_suite.sh`.

The ledger rebuild fixed the known quantity bug on visit `2026/10/01/000298` (23 $\rightarrow$ 25) and populated 260,800 `source` labels. `charge_delta_per_component_p2.py --line-diff` now returns `LINE-DELTA == 0` on both `2026-10` and `ALL` windows.

### Retargeting and Single-Command Execution
`p6_run_suite_fresh.sh` automates the acceptance pipeline:
1. Creates disposable database `sik_p6f` matching `sik` character set and collation.
2. Clones schema and data via `mysqldump` and applies `STRATA-` seeds.
3. Grants DML permissions to `benchmark@localhost`.
4. Executes `p6_acceptance_suite.sh`, which retargets AES-encrypted `setting/database.xml` via `p6_dbxml.py` and confirms `RETARGET-VERIFIED`.
5. Drops `sik_p6f` and revokes grants in an EXIT trap.

### External Third-Party Reproduction Blockers (Ranked)
1. **Absence of Canonical Data Dump (D3 Remainder):** The benchmark repository does not provide the underlying 12-month `sik` database dump (~35 GB raw SQL) or a DOI-Zenodo archive. An independent third party cannot execute `p6_run_suite_fresh.sh` from scratch.
2. **Hardcoded VPS Environment Dependencies:** Scripts enforce absolute filesystem paths (`/opt/simrs-khanza`, `/opt/Deers-Rock`, `/opt/dr-benchmark`), root passwordless MySQL socket access (`mysql -uroot`), and static credentials in `/opt/simrs-khanza/run-env/benchmark_pw`.
3. **Display Server Dependency:** The headless GUI form harness requires an active X11/Xvfb display buffer on `:99`.

**Reproducibility Score: 6/10**

---

## E2E-DESIGN

### Restated E2E Claims Post-Provenance Audit
The audit in `tools/p7_write_provenance.sh` resolves the contradiction that compromised prior reports. The form save path (`DlgBilingRalan`) inserts directly into `sik.billing` under `benchmark@localhost`:

```text
| billing | INSERT | benchmark@localhost | 17 | 2026-10-16 19:46:35.976859 | 2026-10-16 19:46:36.000394 |
```

The withdrawal of the "B-subset caveat" in R5 §18 is sound. The end-to-end benchmark now demonstrates that for tested encounters:
$$\text{DR Clinical Source} \longrightarrow \text{Consumer} \longrightarrow \text{sik.billing (A)}$$
$$\text{DR Clinical Source} \longrightarrow \text{Khanza GUI Form} \longrightarrow \text{sik.billing (B)}$$
$$\text{A} \equiv \text{B} \equiv \text{DR Ground-Truth Ledger (C)}$$

### Weakest Remaining Leg
The weakest architectural element is the decoupling between Count B and Counts A/C in `three_count_reconcile_p2.py`. 

`count_form_save()` derives Count B exclusively from `detail_nota_jalan` (`besar_bayar + besarppn`) and `piutang_pasien`. It operates at the receipt/note level rather than matching line items. Because GUI form billing runs at ~7.14 visits/min, full-cohort execution of 86,455 visits via GUI is intractable (~200 hours). Consequently, on any cohort run, B is either completely absent (`PARTIAL`, exit 0) or an arbitrary subset (`P2-BC-TOTAL` failure). Count B does not serve as a coherent gate for the cohort.

### Recommended Fix for Weakest Leg
Refactor `three_count_reconcile_p2.py` into two distinct gates:
1. **Cohort Billing Gate (A vs C):** Evaluates `sik.billing` against `dr_charge_ledger` across the full cohort.
2. **Sampled Form E2E Gate (A vs B vs C):** Evaluates the exact set of GUI-billed visits (identified by `DISTINCT no_rawat FROM detail_nota_jalan`) comparing line-level `sik.billing` written by the form directly against consumer billing and the DR ledger for those specific visits. This eliminates `P2-BC-TOTAL` subset mismatches while evaluating actual GUI output.

**E2E-Design Score: 7/10**

---

## EXTERNAL-VALIDITY

### Evaluation of Surface and Scoping
The external validity envelope remains constrained and was not expanded in P7:
- Single HMS (`SIMRS Khanza` git `722b82e`, compiled as `dist/SIMRSKhanza.jar`).
- Single database configuration (MySQL 8.0.46, InnoDB buffer pool 3,200 MB).
- Single encounter class: synthetic outpatient registrations (`reg_periksa` where `no_rkm_medis LIKE 'DR%'`).
- Tasks C1 (diagnosis mix calibration), C2 (clinical coherence review), C3 (payer mix / BPJS rules), and C4 (real hospital aggregate comparison) remain **NOT TESTED**.

### Synthetic Edge Strata Deficiencies
In §17, testing of edge cases (embalase, tuslah, half-rupiah PPN, zero-fee clinics) revealed that in this Khanza configuration, embalase and tuslah do not reach outpatient billing rows:
```text
The form's bill was identical to the template (drug Rp 2,640 + PPN Rp 290; no embalase/tuslah line): in this Khanza configuration those charges do not reach the outpatient bill, so these strata carry no observable billing difference here.
```
Because the underlying billing logic ignores these parameters, passing them through the form provides no evidence that complex tariff structures are accurately calculated.

### Scoping Honesty
The report maintains rigorous scoping boundaries. RC-9 explicitly disclaims broader applicability:
> "This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products."

Revenue composition remains heavily skewed toward drugs (~82.7% inclusive of PPN), uncalibrated against Indonesian hospital benchmarks.

### Top External Risk
**Complete absence of insurance and statutory payer mechanics.** Khanza deployments in Indonesia are overwhelmingly dominated by BPJS Kesehatan (INA-CBG tariff groupings, claim validation rules, and co-payment handling). The benchmark tests only a direct fee-for-service cash register workflow (`status_bayar = 'Sudah Bayar'`). The operational performance and computational correctness observed here provide no assurance for insured patient billing.

**External-Validity Score: 4/10**

---

## SYNTHESIS & SCORECARD

### Evaluation of v6 Findings in P7
1. **Suite fail-closed:** Demonstrated by exit code check in `p6_acceptance_suite.sh`, though A14 unit-tests a subshell stub rather than an in-flight check failure.
2. **Restore fail-closed:** Demonstrated by A15 (`STAGE-RESTORE-UNVERIFIED`, `exit 4`, `STAGE-KEEP`).
3. **Write provenance:** Resolved by trigger audit; Khanza GUI save writes `sik.billing`. B-subset caveat legitimately withdrawn for sampled encounters.
4. **Ledger integrity:** Live ledger rebuilt from authority, resolving quantity defect 23 $\rightarrow$ 25 and `source` NULLs; content hash pinned and reproduced byte-for-byte by integer builder.
5. **Integer tax:** Converted to `(subtotal * 11 + 50) // 100`; tolerance 0 asserted in A10b.

### 6-Criterion Scorecard

| Criterion | Score /10 | Delta vs v6 | Key Evidence & Remaining Gaps |
|---|---:|---:|---|
| **Claim-Honesty** | **8** | +2 | Withdrew B-subset caveat based on trigger audit; disclosed unobservable embalase/tuslah; acknowledged un-replayed B3 drift. |
| **Gate-Correctness** | **7** | +2 | Exact integer tax (A10b); `three_count` contract fixed; live guards added. Deductions: A14 stubbed self-test; builder lacks live guard. |
| **Oracle-Validity** | **7** | +2 | Fail-closed restore on missing hash (A15); proven writer termination (A4/A4b); trigger-verified same-encounter billing comparison. |
| **Reproducibility** | **6** | +1 | Re-pinned manifest; automated fixture wrapper (`p6_run_suite_fresh.sh`); byte-identical integer builder check. Blocked by missing public baseline DB dump. |
| **E2E-Design** | **7** | +1 | Form writes `billing` proven. Deduction: `three_count` Count B remains an aggregate note check structurally mismatched to full-cohort gates. |
| **External-Validity** | **4** | 0 | Unchanged. Outpatient fee-for-service cash billing only; C1–C4 untouched; embalase/tuslah unbilled in this configuration. |

$$\text{Overall Score} = \operatorname{round}\left((8 + 7 + 7 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(39 \times 1.6667\right) = \mathbf{65 / 100}$$

**Verdict:** **Conditionally Defensible (Narrow Operational Scope).** The pipeline has progressed from an unreliable test harness to a verified, fail-closed integration benchmark for single-configuration outpatient billing. Publication or production claims must strictly adhere to the RC-9 claim boundary.

## VERDICT

### Criterion Scores and Breakdown

#### 1. Claim-Honesty: 8/10
* **Delta vs Priors:** (4 $\rightarrow$ 5 $\rightarrow$ 5 $\rightarrow$ 6 $\rightarrow$ **8**; $\mathbf{+2}$ vs v6, $\mathbf{+4}$ vs initial)
* **Justification:** The benchmark team legitimately withdrew the "B-subset caveat" in R5 §18 after an empirical trigger audit in `evidence/p7/r5_p7_write_provenance_*.md` proved that GUI execution under `benchmark@localhost` directly writes 17 rows to `sik.billing`, while explicitly disclosing unobservable embalase/tuslah and un-replayed B3 drift.
* **Biggest Remaining Risk:** Claiming full billing equivalence across hospital workflows when the benchmark team has only evaluated outpatient fee-for-service cash encounters without active drug packaging fees.

#### 2. Gate-Correctness: 7/10
* **Delta vs Priors:** (3 $\rightarrow$ 3 $\rightarrow$ 3 $\rightarrow$ 5 $\rightarrow$ **7**; $\mathbf{+2}$ vs v6, $\mathbf{+4}$ vs initial)
* **Justification:** Drug tax rounding was corrected to exact integer division `(subtotal * 11 + 50) DIV 100` with zero tolerance enforced in check A10b, and live-database guard checks in `sampled_real_form_diff_r5.py` (lines 393–397) were demonstrated via refusal check A16.
* **Biggest Remaining Risk:** `build_dr_charge_ledger_p2.py` still lacks a live guard and contains a cohort scope bug where `--window ALL --cohort dr` issues `DELETE FROM dr_charge_ledger WHERE 1=1`, wiping non-DR records without replacement.

#### 3. Oracle-Validity: 7/10
* **Delta vs Priors:** (4 $\rightarrow$ 4 $\rightarrow$ 3 $\rightarrow$ 5 $\rightarrow$ **7**; $\mathbf{+2}$ vs v6, $\mathbf{+4}$ vs initial)
* **Justification:** Check A15 proved fail-closed oracle behavior by asserting `STAGE-RESTORE-UNVERIFIED`, exit code 4, and table retention (`STAGE-KEEP`) when stage hashes are missing, while checks A4/A4b verified clean process-group teardown via `SIGKILL` escalation.
* **Biggest Remaining Risk:** Multi-table restore in `stage_restore` iterates sequentially over 12 tables without an enclosing SQL transaction, leaving the database partially restored if interrupted mid-flight.

#### 4. Reproducibility: 6/10
* **Delta vs Priors:** (3 $\rightarrow$ 5 $\rightarrow$ 6 $\rightarrow$ 5 $\rightarrow$ **6**; $\mathbf{+1}$ vs v6, $\mathbf{+3}$ vs initial)
* **Justification:** `khanza_r5_release_manifest.md` precisely pins table hashes, consumer artifacts, and the rebuilt ledger hash (`a66a3a54...`), which was independently reproduced byte-for-byte using the integer builder script across the `ALL` window.
* **Biggest Remaining Risk:** Reproduction by external researchers is completely blocked without the canonical 35 GB raw SQL database dump or a persistent Zenodo/DOI archive.

#### 5. E2E-Design: 7/10
* **Delta vs Priors:** (4 $\rightarrow$ 5 $\rightarrow$ 5 $\rightarrow$ 6 $\rightarrow$ **7**; $\mathbf{+1}$ vs v6, $\mathbf{+3}$ vs initial)
* **Justification:** The write-provenance audit confirmed that Khanza GUI's `DlgBilingRalan` writes directly to `sik.billing`, closing the architectural loop between consumer billing (A), GUI form billing (B), and ground truth (C) for tested visits.
* **Biggest Remaining Risk:** `three_count_reconcile_p2.py` derives Count B from `detail_nota_jalan` aggregates at ~7 visits/min, making it structurally incompatible with full-cohort gating and forcing arbitrary subset mismatches (`P2-BC-TOTAL`).

#### 6. External-Validity: 4/10
* **Delta vs Priors:** (3 $\rightarrow$ 4 $\rightarrow$ 4 $\rightarrow$ 4 $\rightarrow$ **4**; $\mathbf{0}$ vs v6, $\mathbf{+1}$ vs initial)
* **Justification:** The operational scope remains confined to single-organization outpatient cash billing, leaving inpatient (ranap), BPJS/insurance, and multi-depot inventory completely unaddressed.
* **Biggest Remaining Risk:** Over-generalizing findings to national hospital deployments where BPJS INA-CBG claims and inpatient formulary rules dominate revenue cycle operations.

---

### 1. Status of v6 Findings

* **Genuinely Fixed (Code-verified and asserted in execution):**
  1. *Suite & Restore Fail-Closed Behavior:* Check A15 verified `STAGE-RESTORE-UNVERIFIED` triggering exit code 4 and keeping stage tables (`STAGE-KEEP`) when hash integrity fails.
  2. *Write Provenance & Billing Parity:* Row-level triggers in `evidence/p7/r5_p7_write_provenance_*.md` proved `DlgBilingRalan` inserts directly into `sik.billing` under `benchmark@localhost`.
  3. *Ledger Rebuild Integrity:* Visit `2026/10/01/000298` drug quantity fixed (23 $\rightarrow$ 25), 260,800 `source` labels populated, and hash `a66a3a54...` asserted byte-identical.
  4. *Deterministic Integer Tax Formulation:* Replaced float math with `(subtotal * 11 + 50) DIV 100`, asserted at tolerance 0 in check A10b.
  5. *Live Guards on Difference Runner:* `sampled_real_form_diff_r5.py` refuses live target without `--allow-live` (asserted by A16).
* **Merely Claimed:**
  1. *Suite-Level Assertion Robustness (A14):* A14 tests exit-propagation via an isolated subshell stub rather than asserting an actual in-flight check failure inside `p6_acceptance_suite.sh`.
* **Still Open:**
  1. *Public Canonical Dataset Availability:* The underlying 12-month SQL dump remains unhosted and unavailable for external replication.
  2. *Transaction Enclosure on Restore:* `stage_restore` still executes table-by-table DDL/DML outside a single atomic transaction.

---

### 2. New Problems Introduced or Exposed in P7

1. **`build_dr_charge_ledger_p2.py` Cohort Wipe Defect:** When executed with `--window ALL --cohort dr`, line 134 executes `DELETE FROM dr_charge_ledger WHERE 1=1;`, but the subsequent insertion only selects `WHERE rp.no_rkm_medis LIKE 'DR%'`, inadvertently deleting non-DR ledger rows.
2. **Missing Live Guard in Builder:** `build_dr_charge_ledger_p2.py` defaults to live database targets (`sik_bench` / `sik`) and executes destructive DML without requiring `--allow-live`.
3. **Flawed Cleanup Logic in Check A15:** When the stage hash is intentionally deleted to test fail-closed behavior, the embedded post-test cleanup script calls `o.stage_drop()` regardless of `stage_restore()` returning `False`.
4. **Structural Decoupling in Three-Count Reconcile:** Count B is aggregated from receipt headers (`detail_nota_jalan`) rather than line items, causing structural reconciliation failures (`P2-BC-TOTAL`) whenever evaluated against full cohorts.

---

### 3. Top-3 Remaining Issues (Priority Order)

1. **Lack of Transactional Atomicity in Stage Restore:** If the oracle process is killed or interrupted during `stage_restore`, the database is left in a corrupted, half-restored state across the 12 target tables.
2. **Missing Canonical Data Dump for External Reproduction:** The benchmark cannot be replicated from scratch by third parties due to hardcoded environment paths and the absence of a public, anonymized base database dump.
3. **Destructive Cohort Scoping & Missing Guard in Ledger Builder:** A careless run of `build_dr_charge_ledger_p2.py` against live databases permanently erases non-DR cohorts without an `--allow-live` sanity check.

---

### 4. Top-3 Strongest Properties to Lead With

1. **Empirically Proven GUI Write Provenance:** Elimination of the B-subset ambiguity by proving via database connection audit triggers that Khanza's uninstrumented GUI form generates identical `billing` records.
2. **Deterministic, Zero-Tolerance Arithmetic Parity:** Exact line-for-line mathematical equivalence across 356,355 rows (`LINE-DELTA == 0`) with integer-exact drug tax calculations.
3. **Fail-Closed Process Isolation & Self-Healing:** Demonstrated oracle lifecycle management that enforces stage table retention on checksum mismatch and kills stray JVM harness process groups via `SIGKILL` escalation.

---

### 5. Overall Score

$$\text{Overall Score} = \operatorname{round}\left((8 + 7 + 7 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(39 \times 1.6667\right) = \mathbf{65 / 100}$$

* **Delta vs Prior Runs:**
  * Run 4701365 (35/100): **+30**
  * Run 4769794 (43/100): **+22**
  * Run 4795743 (43/100): **+22**
  * Run 4818826 (52/100): **+13**

---

### 6. Overall Verdict

**Needs targeted rework**

*Justification:* The core technical, arithmetic, and oracle instrumentation hurdles have been resolved, and write-provenance integrity is confirmed. However, targeted rework is required to resolve destructive ledger builder bugs, atomic restore vulnerabilities, and to package an anonymized data fixture before the benchmark is defensible for peer-reviewed paper submission.

---

### 7. Single Most Important Next Step

**Refactor `stage_restore` and `build_dr_charge_ledger_p2.py` to enforce strict safety invariants:** enclose multi-table restoration inside an atomic transaction, add mandatory `--allow-live` guards to the ledger builder, and correct the cohort `DELETE` clause to `WHERE no_rkm_medis LIKE 'DR%'` under `--cohort dr`.

## RAW MERGED RESPONSE

## GATE-CORRECTNESS

### (a) Suite Exit Path and A14
In `tools/p6_acceptance_suite.sh`, the final line now enforces a non-zero exit on failure:
```bash
[ "$FAIL" = "0" ] && exit 0 || exit 1
```
The fresh fixture runner `tools/p6_run_suite_fresh.sh` captures and propagates this code:
```bash
FX=$FX bash p6_acceptance_suite.sh
RC=$?
echo "suite exit=$RC"
exit $RC
```
The exit trap in `p6_run_suite_fresh.sh` invokes `teardown()`, which ends on `echo` without an explicit `exit`, correctly preserving `$RC` in POSIX bash.

**Defect in A14:** Check A14 does **not** test an end-to-end failure of the acceptance suite. At lines 21–25 of `tools/p6_acceptance_suite.sh`:
```bash
if [ -n "${P7_EXIT_TEST:-}" ]; then
  OUT=/dev/null
  check 99 "exit-path self-test" $([ "$P7_EXIT_TEST" = "pass" ] && echo 0 || echo 1)
  [ "$FAIL" = "0" ] && exit 0 || exit 1
fi
```
When `P7_EXIT_TEST=fail` is invoked, execution short-circuits immediately at line 25. It bypasses all fixtures, retargeting, cleanup traps, background checks, and downstream assertions. A14 is a unit test of a 4-line stub, not proof that a mid-suite assertion failure (e.g., during A4b or A10) cleanly propagates past background processes and traps to exit 1.

Furthermore, line 118 reveals an unasserted non-zero exit in the suite transcript:
```text
  freeze r6_a2fix/B3 exit=0
A2 cleanup re-bill exit=1
```
Because `A2 cleanup re-bill` is logged via `res` rather than `check`, `$FAIL` was not incremented, and the suite reported `PASS=21 FAIL=0` despite a sub-step failing.

### (b) `three_count` Exit Contract and `--verify-form-save`
In `tools/three_count_reconcile_p2.py`, the exit condition was repaired from the broken P6 boolean:
```python
# Line 282
tool.close()
return 0 if gate_pass else 1
```
Lines 227–275 set `gate_pass = False` if:
1. `a_rows == 0` or `c_rows == 0`
2. Any component mismatch occurs between Count A and Count C (`P2-AC-*`)
3. Any unknown status rows appear (`P2-OTHER-STATUS`)
4. Count B is verified and `b_amt != c_amt` (`P2-BC-TOTAL`)
5. Count B is unverified AND `--verify-form-save` is passed (`B-REQUIRED`):
   ```python
   else:
       partial = True
       log("B NOT-VERIFIED: no form-save rows for cohort; A==C still required, B not compared.")
       if verify_form:
           gate_pass = False
           findings.append(("B-REQUIRED", "note",
                            "--verify-form-save given but no form-save rows exist for the cohort"))
   ```
When B is unverified and `--verify-form-save` is absent, `partial = True`, `gate_pass` remains `True`, and the process returns 0 as documented. `tools/p7_three_count_contract_test.py` validates all four cases (A==C no B $\rightarrow$ 0; A==C no B with flag $\rightarrow$ 1; A==C with B==C $\rightarrow$ 0; A!=C no B $\rightarrow$ 1), confirmed 4/4 in the transcript.

### (c) Integer Tax Rule, A10b Exactness, and Ledger Reproduction
In `tools/build_dr_charge_ledger_p2.py`, line 239 replaces floating-point multiplication with integer truncation half-up:
```python
tax = (int(s or 0) * 11 + 50) // 100
```
`tools/p7_tax_rule_check.py` evaluated this formula against Java's IEEE-754 double `Math.round(subttl * 0.11)` across all 70,056 real drug subtotals: exactly 0 discrepancies, 0 missing tax rows, and 0 stored tax deviations.

In `tools/p6_acceptance_suite.sh`, A10b was hardened from a loose inequality into an exact match:
```sql
TAXBAD=$(SQL "SELECT COUNT(*) FROM (SELECT d.no_rawat, SUM(d.amount) ds FROM ${FX}.dr_charge_ledger d WHERE d.component='drug' AND d.no_rawat LIKE '2026/10/%' GROUP BY d.no_rawat) x LEFT JOIN ${FX}.dr_charge_ledger t ON t.no_rawat=x.no_rawat AND t.component='tax' WHERE (x.ds*11+50) DIV 100 > 0 AND (t.no_rawat IS NULL OR t.amount <> (x.ds*11+50) DIV 100);")
TAXORPHAN=$(SQL "SELECT COUNT(*) FROM ${FX}.dr_charge_ledger t WHERE t.component='tax' AND t.no_rawat LIKE '2026/10/%' AND NOT EXISTS (SELECT 1 FROM ${FX}.dr_charge_ledger d WHERE d.no_rawat=t.no_rawat AND d.component='drug');")
```
Tolerance is now 0. Any visit with drug charges where tax is missing (`t.no_rawat IS NULL`) or where `t.amount <> (x.ds*11+50) DIV 100` trips `TAXBAD`. 

Running the integer builder `--window ALL` into an empty scratch ledger yielded content hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`, matching the live ledger byte-for-byte.

### (d) Live Guards and `--allow-live`
In `tools/sampled_real_form_diff_r5.py`, lines 393–397 guard the live database:
```python
if db == "sik" and not (args.freeze_only or args.verify_frozen or args.allow_live):
    print("LIVE-TARGET-REFUSED: a billing run resets output rows; --db-name sik "
          "requires --allow-live (use a disposable clone for tests)")
    return 3
```
Check A16 confirms refusal (exit 3). Check A13 confirms that live `sik_bench.dr_charge_ledger` hash and table checksums across `sik.billing`, `nota_jalan`, `detail_nota_jalan`, `piutang_pasien`, `detail_piutang_pasien`, and `reg_periksa` are identical pre- and post-suite.

**Remaining Live Vulnerabilities:**
1. `--freeze-only` and `--verify-frozen` are permitted against live `sik` without `--allow-live`. While nominally read-only, `--freeze-only` writes artifacts into `results/`.
2. `build_dr_charge_ledger_p2.py` has **no** `--allow-live` guard. Defaults remain `LEDGER_DB = os.environ.get("P2_LEDGER_DB", "sik_bench")` and `SIC_DB = os.environ.get("P2_CONSUMER_DB", "sik")`. An invocation without environment overrides immediately deletes and replaces data in live `sik_bench.dr_charge_ledger`.

### (e) New Gate Defects Introduced in P7
1. **`build_dr_charge_ledger_p2.py` Cohort Scope Bug:** At line 134:
   ```python
   sess.exec("START TRANSACTION; DELETE FROM dr_charge_ledger WHERE "
             + ("1=1" if args.window == "ALL" else "no_rawat LIKE '2026/10/%'") + ";")
   ```
   If invoked with `--window ALL --cohort dr`, the DELETE wipes out `WHERE 1=1` (all cohorts), but subsequent insertions only query `WHERE rp.no_rkm_medis LIKE 'DR%'`. Non-DR rows in the target table are purged without replacement.
2. **A15 Cleanup Defect:** When A15 deliberately deletes the hash file, the script cleans up the kept stage tables using an embedded Python script that calls `o.stage_restore` and `o.stage_drop` without verifying whether `stage_restore` passed. Because the hash is missing, `stage_restore` returns `False`, but `stage_drop` proceeds regardless.

**Gate-Correctness Score: 7/10**

---

## ORACLE-VALIDITY

### Fail-Closed Restore and STAGE-KEEP
The fail-open restore defect identified in v6 (where a missing pre-reset hash still returned `ok=True`) is closed in `tools/sampled_real_form_diff_r5.py`:
```python
# Line 323
else:
    ok = False
    log("STAGE-RESTORE-UNVERIFIED %d visits: pre-reset hash file absent; data "
        "re-applied but NOT verified — treated as a failed restore" % len(nrs))
return ok
```
In `_finalize`, unverified restorations prevent stage tables from being purged:
```python
# Lines 530-539
unrestored = sorted(d for d, b in st["batches"].items()
                    if b.get("status") in ("STAGED", "RESET")
                    or (b.get("status") == "FAILED" and b.get("restored") is False
                        and not str(b.get("fail_reason", "")).startswith("stage-backup")))
if unrestored:
    log("STAGE-KEEP %s_*: batches %s not verifiably restored — stage tables "
        "kept for a resume/manual restore (box NOT clean)" ...)
    drop_ok = False
```
`drop_ok = False` forces `verdict = "PARTIAL-NOT-COVERED"` and `exit_code = 4`. A15 executes this path: deleting the hash file produces `STAGE-RESTORE-UNVERIFIED`, `exit 4`, `restored=False`, and leaves 13 stage tables intact (`STAGE-KEEP`).

### Process-Group Termination and Resume (A4, A4b, A8)
- **Timeout (A4):** Setting `R5_HARNESS_TIMEOUT_S=3` triggers `_kill_process_group` with `SIGTERM` followed by `SIGKILL` escalation on the group leader (`pgid`). The oracle logs `WRITER-DEAD-PROOF pgid=... group_empty=true`, restores from stage backup (`STAGE-RESTORED-VERIFIED`), exits 4, and confirms 0 Java processes survive.
- **SIGTERM Interrupt (A4b):** Oracle signal handler `_on_terminate` terminates the active harness process group before exiting 4 without dropping state, allowing immediate resume (`r6_a4b_resume.log`) to restore and re-bill cleanly to exit 0.
- **Mid-Batch Kill (A8):** Terminating the harness immediately post-reset leaves state in `RESET`; resume recovers via stage backup (`STAGE-RESTORED-VERIFIED`) and finishes with exit 0.

### Audit Implication on Billing Comparison
The row-level trigger audit in `evidence/p7/r5_p7_write_provenance_*.md` proves that connection `benchmark@localhost#68986` (the JVM executing `BilingHarness.java` driving `DlgBilingRalan`) inserts 17 rows into `sik.billing` alongside `nota_jalan` and `detail_nota_jalan`. Because `BilingHarness.java` contains no SQL commands, Khanza's own GUI form writes the `billing` table rows. Diffing `sik.billing` post-run against the frozen baseline is therefore an authentic same-encounter comparison between the GUI save path and the batch consumer.

### Residual Oracle Risks (Ranked)
1. **Unprotected Multi-Table Restore Atomicity (P8):** `stage_restore` iterates through 12 tables issuing sequential `DELETE` and `REPLACE INTO` statements without an enclosing transaction. An interruption during restoration leaves the database partially restored.
2. **Concurrency and Session Isolation:** Oracle locking relies on `.lock` in the file system. Multiple database instances or distributed consumers are not isolated at the DBMS level.
3. **Survivability Under Ungraceful SIGKILL of Oracle:** If the Python oracle receives `SIGKILL` (`kill -9`), `_on_terminate` cannot run. The detached JVM harness (in its own session via `start_new_session=True`) continues writing concurrently to the database.

**Oracle-Validity Score: 7/10**

---

## REPRODUCIBILITY

### Re-Pinned Manifest and Ledger Rebuild
The release manifest (`khanza_r5_release_manifest.md`) accurately pins all critical components:
- SIMRS Khanza JAR SHA-256: `34b0d77e3a37243075cdac6321802e886580557c8e3ae0d3f72153332d8a829d`
- B3 Encounter Set SHA-256: `84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08`
- Pinned Rebuilt Ledger Hash: `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` (356,355 rows / Rp 34,870,243,633)
- Backup Ledger Table: `sik_bench.dr_charge_ledger_bak_20261017` preserves the pre-P7 state (`d2b65d8e...`).
- Gate and Oracle Tool SHAs: Re-pinned for `sampled_real_form_diff_r5.py`, `three_count_reconcile_p2.py`, `build_dr_charge_ledger_p2.py`, and `p6_acceptance_suite.sh`.

The ledger rebuild fixed the known quantity bug on visit `2026/10/01/000298` (23 $\rightarrow$ 25) and populated 260,800 `source` labels. `charge_delta_per_component_p2.py --line-diff` now returns `LINE-DELTA == 0` on both `2026-10` and `ALL` windows.

### Retargeting and Single-Command Execution
`p6_run_suite_fresh.sh` automates the acceptance pipeline:
1. Creates disposable database `sik_p6f` matching `sik` character set and collation.
2. Clones schema and data via `mysqldump` and applies `STRATA-` seeds.
3. Grants DML permissions to `benchmark@localhost`.
4. Executes `p6_acceptance_suite.sh`, which retargets AES-encrypted `setting/database.xml` via `p6_dbxml.py` and confirms `RETARGET-VERIFIED`.
5. Drops `sik_p6f` and revokes grants in an EXIT trap.

### External Third-Party Reproduction Blockers (Ranked)
1. **Absence of Canonical Data Dump (D3 Remainder):** The benchmark repository does not provide the underlying 12-month `sik` database dump (~35 GB raw SQL) or a DOI-Zenodo archive. An independent third party cannot execute `p6_run_suite_fresh.sh` from scratch.
2. **Hardcoded VPS Environment Dependencies:** Scripts enforce absolute filesystem paths (`/opt/simrs-khanza`, `/opt/Deers-Rock`, `/opt/dr-benchmark`), root passwordless MySQL socket access (`mysql -uroot`), and static credentials in `/opt/simrs-khanza/run-env/benchmark_pw`.
3. **Display Server Dependency:** The headless GUI form harness requires an active X11/Xvfb display buffer on `:99`.

**Reproducibility Score: 6/10**

---

## E2E-DESIGN

### Restated E2E Claims Post-Provenance Audit
The audit in `tools/p7_write_provenance.sh` resolves the contradiction that compromised prior reports. The form save path (`DlgBilingRalan`) inserts directly into `sik.billing` under `benchmark@localhost`:

```text
| billing | INSERT | benchmark@localhost | 17 | 2026-10-16 19:46:35.976859 | 2026-10-16 19:46:36.000394 |
```

The withdrawal of the "B-subset caveat" in R5 §18 is sound. The end-to-end benchmark now demonstrates that for tested encounters:
$$\text{DR Clinical Source} \longrightarrow \text{Consumer} \longrightarrow \text{sik.billing (A)}$$
$$\text{DR Clinical Source} \longrightarrow \text{Khanza GUI Form} \longrightarrow \text{sik.billing (B)}$$
$$\text{A} \equiv \text{B} \equiv \text{DR Ground-Truth Ledger (C)}$$

### Weakest Remaining Leg
The weakest architectural element is the decoupling between Count B and Counts A/C in `three_count_reconcile_p2.py`. 

`count_form_save()` derives Count B exclusively from `detail_nota_jalan` (`besar_bayar + besarppn`) and `piutang_pasien`. It operates at the receipt/note level rather than matching line items. Because GUI form billing runs at ~7.14 visits/min, full-cohort execution of 86,455 visits via GUI is intractable (~200 hours). Consequently, on any cohort run, B is either completely absent (`PARTIAL`, exit 0) or an arbitrary subset (`P2-BC-TOTAL` failure). Count B does not serve as a coherent gate for the cohort.

### Recommended Fix for Weakest Leg
Refactor `three_count_reconcile_p2.py` into two distinct gates:
1. **Cohort Billing Gate (A vs C):** Evaluates `sik.billing` against `dr_charge_ledger` across the full cohort.
2. **Sampled Form E2E Gate (A vs B vs C):** Evaluates the exact set of GUI-billed visits (identified by `DISTINCT no_rawat FROM detail_nota_jalan`) comparing line-level `sik.billing` written by the form directly against consumer billing and the DR ledger for those specific visits. This eliminates `P2-BC-TOTAL` subset mismatches while evaluating actual GUI output.

**E2E-Design Score: 7/10**

---

## EXTERNAL-VALIDITY

### Evaluation of Surface and Scoping
The external validity envelope remains constrained and was not expanded in P7:
- Single HMS (`SIMRS Khanza` git `722b82e`, compiled as `dist/SIMRSKhanza.jar`).
- Single database configuration (MySQL 8.0.46, InnoDB buffer pool 3,200 MB).
- Single encounter class: synthetic outpatient registrations (`reg_periksa` where `no_rkm_medis LIKE 'DR%'`).
- Tasks C1 (diagnosis mix calibration), C2 (clinical coherence review), C3 (payer mix / BPJS rules), and C4 (real hospital aggregate comparison) remain **NOT TESTED**.

### Synthetic Edge Strata Deficiencies
In §17, testing of edge cases (embalase, tuslah, half-rupiah PPN, zero-fee clinics) revealed that in this Khanza configuration, embalase and tuslah do not reach outpatient billing rows:
```text
The form's bill was identical to the template (drug Rp 2,640 + PPN Rp 290; no embalase/tuslah line): in this Khanza configuration those charges do not reach the outpatient bill, so these strata carry no observable billing difference here.
```
Because the underlying billing logic ignores these parameters, passing them through the form provides no evidence that complex tariff structures are accurately calculated.

### Scoping Honesty
The report maintains rigorous scoping boundaries. RC-9 explicitly disclaims broader applicability:
> "This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products."

Revenue composition remains heavily skewed toward drugs (~82.7% inclusive of PPN), uncalibrated against Indonesian hospital benchmarks.

### Top External Risk
**Complete absence of insurance and statutory payer mechanics.** Khanza deployments in Indonesia are overwhelmingly dominated by BPJS Kesehatan (INA-CBG tariff groupings, claim validation rules, and co-payment handling). The benchmark tests only a direct fee-for-service cash register workflow (`status_bayar = 'Sudah Bayar'`). The operational performance and computational correctness observed here provide no assurance for insured patient billing.

**External-Validity Score: 4/10**

---

## SYNTHESIS & SCORECARD

### Evaluation of v6 Findings in P7
1. **Suite fail-closed:** Demonstrated by exit code check in `p6_acceptance_suite.sh`, though A14 unit-tests a subshell stub rather than an in-flight check failure.
2. **Restore fail-closed:** Demonstrated by A15 (`STAGE-RESTORE-UNVERIFIED`, `exit 4`, `STAGE-KEEP`).
3. **Write provenance:** Resolved by trigger audit; Khanza GUI save writes `sik.billing`. B-subset caveat legitimately withdrawn for sampled encounters.
4. **Ledger integrity:** Live ledger rebuilt from authority, resolving quantity defect 23 $\rightarrow$ 25 and `source` NULLs; content hash pinned and reproduced byte-for-byte by integer builder.
5. **Integer tax:** Converted to `(subtotal * 11 + 50) // 100`; tolerance 0 asserted in A10b.

### 6-Criterion Scorecard

| Criterion | Score /10 | Delta vs v6 | Key Evidence & Remaining Gaps |
|---|---:|---:|---|
| **Claim-Honesty** | **8** | +2 | Withdrew B-subset caveat based on trigger audit; disclosed unobservable embalase/tuslah; acknowledged un-replayed B3 drift. |
| **Gate-Correctness** | **7** | +2 | Exact integer tax (A10b); `three_count` contract fixed; live guards added. Deductions: A14 stubbed self-test; builder lacks live guard. |
| **Oracle-Validity** | **7** | +2 | Fail-closed restore on missing hash (A15); proven writer termination (A4/A4b); trigger-verified same-encounter billing comparison. |
| **Reproducibility** | **6** | +1 | Re-pinned manifest; automated fixture wrapper (`p6_run_suite_fresh.sh`); byte-identical integer builder check. Blocked by missing public baseline DB dump. |
| **E2E-Design** | **7** | +1 | Form writes `billing` proven. Deduction: `three_count` Count B remains an aggregate note check structurally mismatched to full-cohort gates. |
| **External-Validity** | **4** | 0 | Unchanged. Outpatient fee-for-service cash billing only; C1–C4 untouched; embalase/tuslah unbilled in this configuration. |

$$\text{Overall Score} = \operatorname{round}\left((8 + 7 + 7 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}\left(39 \times 1.6667\right) = \mathbf{65 / 100}$$

**Verdict:** **Conditionally Defensible (Narrow Operational Scope).** The pipeline has progressed from an unreliable test harness to a verified, fail-closed integration benchmark for single-configuration outpatient billing. Publication or production claims must strictly adhere to the RC-9 claim boundary.
