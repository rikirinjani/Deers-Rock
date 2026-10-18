# Astra v8 assessment: dr-khanza-e2e-full-assessment (post P1-P8) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

Wave P8 delivers the most disciplined claim cleanup of this entire benchmark history. Rather than papering over v7's findings, the team systematically tracked down and corrected the discrepancies between log markers, gate assertions, and report text.

### 1. Verification of Numbers and Arithmetic
- **The 29 Suite Checks:** The transcript emits exactly 29 PASS lines: `A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A15, A16, A18a, A18b, A19, A20, A21, A17, A14, A10, A10b, A10d, A10e, A10c, A11, A12, A13`. The count of passing assertions is genuinely 29, and `PASS=29 FAIL=0` reconciles with the execution log.
- **The A11 Count Reconciliation:** In v7, A11 asserted "every restore across the suite hash-verified" while A15 intentionally produced an unverified restore. In P8, the predicate and message were rebuilt:
  ```bash
  RM_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-MISMATCH")
  UV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-UNVERIFIED")
  DF_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-DROP-FAILED")
  RV_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-RESTORED-VERIFIED")
  DELIB=$(( $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a15.log) + $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a18.log) + $(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a18b.log) ))
  ```
  The transcript logs: `STAGE-RESTORED-VERIFIED=9 STAGE-RESTORE-MISMATCH=0 STAGE-RESTORE-UNVERIFIED=0 · deliberate unverified/mismatched restores (A15+A18a+A18b)=3 · STAGE-DROP-FAILED=0`.
  The 9 verified restores outside the fault cases trace cleanly across the suite: A3/A6 (1), A4 (1), A4b resume (1), A8 resume (1), A19 resume (1), A20 resume (1), A21 retry (1), plus the verified cleanup restores for A15 and A18a/A18b. The arithmetic (`9 verified, 3 deliberate failures, 0 dropped failures`) matches the raw log lines.
- **Ledger Invariant:** The ledger rebuild into an empty scratch DB reproduces the exact canonical content hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` across 356,355 rows and Rp 34,870,243,633.

### 2. Resolution of Stale Wording and Withdrawn Guarantees
- **`crash_safe=YES` eradicated:** In `sampled_real_form_diff_r5.py`, the unconditional `crash_safe=YES` field was completely removed. The markdown artifact now records explicit, empirical recovery metrics:
  ```python
  f.write("- recovery: batches=%d billed=%d failed=%d failed_restored_verified=%d "
          "unrestored=%d retried=%d\n" % ...)
  ```
- **R5 Report Annotations:** In R5 §0, §1, and §16, previous blanket claims were struck through in place (`~~crash-safety~~ recovery from one injected kill -9`, `~~B-settlement equivalence is structurally unclaimable~~`).
- **Floating-point honesty:** The builder docstring withdrew "no float ... end-to-end", detailing where Decimal rounding is applied (`irup()` using `ROUND_HALF_UP` on exact string representations).
- **Chronology:** The v7 chronology concern (task dated Oct 17 with transcripts dated Oct 16) is clarified: the team documented that VPS run logs are kept in UTC while documentation headers use local time (UTC+7).

### 3. Remaining / New Overclaim Risks
- The suite summary table still uses `PASS` in a binary column before stating the asserted property. While the footnote qualifies that "a PASS covers only the property in its row, on fixture sik_p6f", casual readers will see 29 PASSes and assume universal system correctness.
- The unit test claims "11/11 cases PASS" for recovery decisions, but DB operations are mocked to `lambda *a, **k: None`. The report is clear that this is a mocked decision test, but it must not be conflated with live SQL integration.

**Claim-honesty score: 8/10**

---

## GATE-CORRECTNESS

### 1. Concrete Code-Level Findings
- **(a) Tax-Row Cardinality (A10b / A10d):**
  In v7, A10b joined only on amount, allowing a duplicate row with the expected amount to pass unnoticed. P8 introduces `taxcard()` in `p6_acceptance_suite.sh`:
  ```bash
  taxcard() { SQL "SELECT COUNT(*) FROM (SELECT d.no_rawat, (SUM(d.amount)*11+50) DIV 100 et, (SELECT COUNT(*) FROM ${FX}.dr_charge_ledger t WHERE t.no_rawat=d.no_rawat AND t.component='tax') nt FROM ${FX}.dr_charge_ledger d WHERE d.component='drug' AND d.no_rawat LIKE '2026/10/%' GROUP BY d.no_rawat) x WHERE x.nt <> IF(x.et > 0, 1, 0);"; }
  ```
  Check A10d proves this works: planting duplicate tax row `P8DUP` results in `count_query=1` while `amount_query=0`.
  Furthermore, `p7_tax_rule_check.py` was fixed to fail closed:
  ```python
  bad = len(diff) + len(missing) + len(dup) + len(mism_stored)
  print("TAX-RULE-CHECK %s (%d defects)" % ("PASS" if bad == 0 else "FAIL", bad))
  sys.exit(0 if bad == 0 else 1)
  ```
  Planted defects force exit code 1.
  *Latent blind spot:* In `p7_tax_rule_check.py`, the driver query groups by `dr_charge_ledger WHERE component='drug'`. An orphan tax row (a tax charge on a visit with zero drug rows) is omitted by this subquery and will not be flagged by `p7_tax_rule_check.py`. However, A10b explicitly catches this via `TAXORPHAN` (`WHERE t.component='tax' ... AND NOT EXISTS (...)`).

- **(b) Cohort-Scoped DELETE (A10e):**
  In `build_dr_charge_ledger_p2.py`, the cohort DELETE was previously un-scoped (`WHERE 1=1` under `--window ALL`), wiping out non-DR rows. P8 binds DELETE to both window and cohort:
  ```python
  rp_cs = dbutil.scalar(SIC_DB, "SELECT character_set_name FROM information_schema.columns WHERE ...")
  on = ("rp.no_rawat = CONVERT(l.no_rawat USING %s)" % rp_cs) if rp_cs else "rp.no_rawat = l.no_rawat"
  dscope = "1=1" if args.window == "ALL" else "l.no_rawat LIKE '2026/10/%'"
  delete_sql = ("DELETE l FROM dr_charge_ledger l LEFT JOIN " + SIC_DB + ".reg_periksa rp "
                "ON " + on + " WHERE " + dscope + " AND (rp.no_rawat IS NULL OR " + (cp % ()) + ")")
  ```
  `A10e` plants non-DR row `2026/10/01/000207` (`P8NONDR`). Under both `--window 2026-10` and `--window ALL`, the non-DR row survives (`survived=1`).
  *Charset index fix:* Converting `l.no_rawat` rather than `rp.no_rawat` preserves the index on `rp.no_rawat`, preventing the 30-minute table lock observed in run 1.

- **(c) Mutation Paths Against Live `sik`:**
  - `p6_acceptance_suite.sh` immediately aborts if `FX` matches `sik` or `sik_bench` (A17, exit 3).
  - `sampled_real_form_diff_r5.py` refuses `--db-name sik` without `--allow-live` (A16, exit 3).
  - *Residual vulnerability:* `build_dr_charge_ledger_p2.py` defaults to `LEDGER_DB = sik_bench` and `SIC_DB = sik`. It contains no `--allow-live` guard. If invoked manually without environment variables, it will directly write to `sik_bench.dr_charge_ledger`. While `sik_bench` is the benchmark database rather than core clinical `sik`, a missing target assertion in the builder leaves open accidental clobbering of the baseline ledger.

- **(d) Reliability of A11 Relabel:**
  Because `OTHER_LOGS` explicitly filters out `r6_a15.log`, `r6_a18.log`, and `r6_a18b.log`, any unverified restore occurring in any other check will increment `UV_OTH` or `RM_OTH` and trip `check 11`. The cleanup logs (`/tmp/r6_a15_cleanup.log`, etc.) are included in `OTHER_LOGS`; since their cleanups must be verified (`STAGE-RESTORED-VERIFIED`), an unverified cleanup restore would also trip the check.

- **(e) New Gate Defects Introduced in P8:**
  In `sampled_real_form_diff_r5.py::reap_writers`:
  ```python
  pending = [v for b in st["batches"].values()
             if b.get("status") in ("STAGED", "RESET") for v in b["visits"]]
  quiet = True
  if pending and not left and not alive_groups:
      qs = float(...)
      h1 = _content_hash(pending, db, log)
      time.sleep(qs)
      quiet = h1 == _content_hash(pending, db, log)
  ```
  When resuming with `--retry-failed` on a run where all failed batches have `status == "FAILED"`, `pending` evaluates to `[]`. Consequently, the quiet-interval content check is bypassed (`quiet` remains `True` without checking database stability). The PID check and process-table grep still run, but the output-quiescence invariant is skipped for `FAILED` batch retries.

**Gate-correctness score: 8/10**

---

## ORACLE-VALIDITY

### 1. Hash Validation and Corrupt Metadata (P8-C1, A18a / A18b)
The restore logic in `stage_restore` now validates the stage metadata file before attempting to trust its contents:
```python
if os.path.exists(hpath):
    try:
        meta = json.load(open(hpath))
        pre = meta.get("sha256")
        if meta.get("pfx") != pfx or sorted(meta.get("nrs") or []) != sorted(nrs) \
                or not re.fullmatch(r"[0-9a-f]{64}", str(pre)):
            bad = "hash file does not describe this batch (pfx/nrs/sha256 invalid)"
    except Exception as e:
        bad = "hash file unreadable (%s)" % type(e).__name__
```
Any JSON parse failure, prefix mismatch, visit mismatch, or malformed sha256 marks `bad`, logs `STAGE-RESTORE-UNVERIFIED`, preserves the stage tables (`STAGE-KEEP`), and returns `False` without throwing an unhandled exception. This directly addresses v7's AC-2 gap.

### 2. Writer Death Proof in `reap_writers` (P8-C2, A19)
The proof of writer death now combines three layers:
1. **PGID Kill:** Reaps the recorded PGIDs from `harness_*.log.pid` via `os.killpg(pgid, SIGTERM/SIGKILL)`.
2. **Process-table Command-line Scan:** Inspects `/proc/*/cmdline` for any process containing `BilingHarness` and referencing any visit in the batch, killing their PGIDs.
3. **Quiescence Interval:** Samples `_content_hash(pending)` across all 12 output tables, sleeps 5 seconds (`R5_WRITER_QUIET_S`), and re-hashes. If the hash flips, `WRITER-ALIVE` aborts the restore (exit 4).

*Soundness evaluation:* Can a writer survive this?
- If a JVM process ignores SIGTERM, escalation to SIGKILL (`signal.SIGKILL`) terminates it unless it is stuck in uninterruptible disk I/O (`D` state). If it is stuck in `D` state, `_group_alive` continues to return `True`, causing `_kill_pgid` to return `False` and logging `WRITER-ALIVE`. The restore will correctly abort.
- If an unparented JVM process was started under a different name or wrapped such that `BilingHarness` does not appear in `/proc/*/cmdline`, the process scan would miss it. However, if that writer attempts to mutate any of the 12 stage-reset tables for the pending visits, the 5-second `_content_hash` quiet interval detects the write and trips `quiet=False`.
- *Remaining loophole:* A rogue writer that pauses or sleeps for > 5 seconds between writes could evade the quiet check and write to the database after restoration. Within the context of headless GUI billing execution, this is an acceptable residual risk.

### 3. Restore Idempotence and Interruption (P8-C3, A20)
`stage_restore` operates by executing `DELETE FROM <table> WHERE no_rawat IN (...)` followed by `REPLACE INTO <table> SELECT * FROM <stage_table>`. Because the stage tables are preserved until finalized and the DML is set-based replacement, killing the process mid-restore (in A20, after `billing` was restored but before the other 11 tables) leaves the stage tables intact. A subsequent resume simply re-executes the DELETE + REPLACE sequence and verifies the end-state hash. Idempotence is mathematically and operationally sound.

### 4. Retry of Failed Batches (P8-C4, A21)
`--retry-failed` allows a batch that failed due to timeout or harness crash to be re-billed, but strictly requires that its pre-reset state be verified before re-billing:
```python
if b.get("restored") is not True:
    if not stage_restore(b["visits"], db, rundir, log, tool.run_id, stage=st.get("stage")):
        log("date %s: RETRY-REFUSED (restore not hash-verified; stays FAILED)" % d)
        failed = True
        break
    b["restored"] = True
```
This closes the state-machine hole where failed batches were either permanently stuck or retried over dirty state.

**Oracle-validity score: 8/10**

---

## REPRODUCIBILITY

### 1. What P8 Improved
- **Clean Execution Wrapper:** `tools/p6_run_suite_fresh.sh` provides a single-command entry point: builds `sik_p6f` from live `sik`, applies `strata_reg_rows.sql`, sets up grants, executes `p6_acceptance_suite.sh`, and tears down the fixture via an `EXIT` trap.
- **Evidence Archival:** Defect D7 was closed in `p6_acceptance_suite.sh`: prior results are moved to `/opt/dr-benchmark/results/archive/<TS>/` rather than deleted via `rm -rf`.
- **Manifest Synchronization:** The release manifest accurately pins the SHA-256 hashes of all 15 gate, oracle, and utility tools on the VPS.
- **Deterministic Ledger Rebuild:** `p8_builder_all_check.sh` proves that running `build_dr_charge_ledger_p2.py --window ALL` into an empty scratch database reproduces the pinned ledger content hash `a66a3a54...` identically.

### 2. Ranked Blockers for Third-Party Off-Box Reproducibility
Pack D (reproducibility closure) was explicitly deferred by the owner. Consequently, external reproduction without access to this specific VPS remains blocked:
1. **Missing Supporting Source Code (`stagea_common.py`):** `p6_dbxml.py` imports `stagea_common`, which is not embedded, not in the repository tools directory, and withheld due to environment-specific credentials/configuration.
2. **Missing Java Harness Source:** `BilingHarness.java` and `KhanzaBillingConsumer.java` are referenced as compiled `.class` files or jar paths. While the trigger audit verified database writes, third parties cannot inspect or recompile the harness.
3. **Missing Fixture Seed (`strata_reg_rows.sql`):** The clone script requires `/opt/dr-benchmark/p-chain/sik_p6f_build_*/strata_reg_rows.sql`. This file is not embedded.
4. **Proprietary Fixture Data:** The entire benchmark relies on a mysqldump of the live `sik` database (86,455 encounters). No synthetic generation script exists to reconstruct `sik` from zero on an empty machine.

On the local machine/VPS, reproducibility is high; for an independent third party, the artifact pack is incomplete.

**Reproducibility score: 6/10**

---

## E2E-DESIGN

### 1. Current State of the E2E Evidence
- **Proven Form Billing Writes:** The trigger audit in P7 established that `DlgBilingRalan` executed via `BilingHarness` directly issues `INSERT INTO billing` (17 rows on the audited encounter), alongside the `nota_jalan` payment records. The consumer and the form write to the same billing table.
- **Sampled Equivalence:** For encounters evaluated by the oracle (`A1`, `A2`, `A3`), the comparison between the frozen consumer baseline and the form-written billing is a true row-level, same-encounter diff.
- **Sample Scope Limitation:** Full E2E headless GUI execution is executed only on samples (e.g. 2 visits in A1, 4 in A3/A6, historically 999 in R4). Across the 86,101 encounters of B3, the primary end-to-end claim relies on the consumer simulator.

### 2. The Weakest Leg: Aggregate Note-Level B–C Reconciliation
The three-source model in `three_count_reconcile_p2.py` remains structurally disconnected at the encounter level:
- Source A is consumer billing rows.
- Source C is the DR ground-truth ledger.
- Source B is read from `detail_nota_jalan` and `piutang_pasien`.
When B is present, `three_count` compares:
```python
if b_amt != c_amt:
    gate_pass = False
    findings.append(("P2-BC-TOTAL", "note", "B ... != C ..."))
```
It compares the **sum of all notes in B** against the **sum of all charges in C for the entire cohort**. Because only encounters that were re-billed through the GUI have notes in B (149 or 151 notes in October out of 7,708 visits), B is always a subset. The tool logs `P2-BC-TOTAL`, outputs `PARTIAL`, and bypasses any line-item or per-visit check between B and C.

### 3. The Necessary Fix
To achieve true E2E reconciliation, `three_count` must perform **matched-encounter reconciliation**: filter C to exactly the subset of `no_rawat` present in B, and assert per-encounter equality of form-settled revenue against DR ground truth.

**E2E-design score: 7/10**

---

## EXTERNAL-VALIDITY

### 1. Scope and Realism
- **Single-Site, Single-Engine:** All benchmarks run against a single configuration of Khanza SIMRS on MySQL 8.0.46, hosted on one Ubuntu VPS.
- **Outpatient Only:** No inpatient hospitalization, bed charges, operating theater, ICU, or multi-day stays are modeled.
- **Uncalibrated Clinical Profile:** Diagnoses and prescriptions are synthetically assigned. The drug share of revenue is ~82.7% (inclusive of PPN), which does not reflect realistic hospital outpatient revenue distributions.
- **Ineffective Edge Strata:** As discovered in §17 and re-confirmed in P8, embalase and tuslah charges authored into synthetic visits do not reach the final outpatient bill in this Khanza configuration. The system cannot evaluate fee behavior for these edge cases.
- **Payer Mix Not Exercised:** All billing is evaluated under standard cashier settlement; BPJS health insurance claims, INA-CBG grouping, tariff capping, and private insurer discounts remain entirely unexercised (C1–C4 NOT TESTED).

### 2. Scoping Honesty vs. External Risk
The authors deserve credit for maintaining strict scoping boundaries. Caveat RC-9 in §13 explicitly prohibits generalizing these results to real-world hospital financial performance:
> *"This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products."*

The greatest external risk is that external stakeholders quote the headline figures ("86,455 visits, Rp 34.87 Billion, 0 drift") as proof that Khanza SIMRS bills accurately in clinical production, when it only demonstrates deterministic simulator equivalence on synthetic outpatient encounters.

**External-validity score: 4/10**

---

## OVERALL ASSESSMENT & VERDICT

### Criterion Score Summary

| Criterion | v7 Score | P8 Score | Delta | Primary Justification |
|---|---:|---:|---:|---|
| **Claim-honesty** | 6/10 | **8/10** | +2 | Removal of `crash_safe=YES`; A11 relabeled and verified against deliberate faults; Decimal precision documented; all 29 checks asserted per property. |
| **Gate-correctness** | 6/10 | **8/10** | +2 | Tax-row cardinality check closes duplicate-row hole; `p7_tax_rule_check` fails closed; cohort-scoped DELETE preserves non-DR records; live fixture refusal enforced. |
| **Oracle-validity** | 6/10 | **8/10** | +2 | Multi-layer writer death proof (PGID + `/proc` grep + quiet interval); corrupt/foreign hash validation; mid-restore crash idempotence proven. |
| **Reproducibility** | 6/10 | **6/10** | 0 | Automated disposable-clone wrapper and byte-identical ledger rebuilds established on-box; external reproduction still blocked by Pack D omissions. |
| **E2E-design** | 7/10 | **7/10** | 0 | Form writes billing proven, but B–C reconciliation remains an aggregate cohort comparison rather than matched-encounter validation. |
| **External-validity** | 4/10 | **4/10** | 0 | Unchanged surface (outpatient only, single instance, uncalibrated clinical distributions, C1–C4 unexercised). Scoping honesty remains rigorous. |

### Overall Score Calculation
$$\text{Total Score} = \operatorname{round}\left( (8 + 8 + 8 + 6 + 7 + 4) \times \frac{10}{6} \right) = \operatorname{round}\left( 41 \times 1.6667 \right) = \mathbf{68/100}$$

### Historical Progression
**35 (v3) $\rightarrow$ 43 (v4) $\rightarrow$ 43 (v5) $\rightarrow$ 52 (v6) $\rightarrow$ 58 (v7) $\rightarrow$ 68 (v8)**

### Final Verdict
**PASS (Autonomous Scope — Substantially Hardened).**
Wave P8 successfully addresses the central vulnerability identified in v7: recovery acceptance testing under adversarial fault injection. The fail-closed guarantees across corrupt hash metadata, surviving writers, interrupted restoration, and retry states are now mathematically and empirically demonstrated on disposable clones. The benchmark is sound within its stated autonomous boundaries. Future progression beyond the 70-point threshold requires executing Pack D (reproducibility packaging) and Pack E (matched-encounter B–C financial reconciliation).

## VERDICT

### Criterion Scores and Comparisons

#### 1. Claim-Honesty: 8/10 (prior: 4 / 5 / 5 / 6 / 6; $\Delta = +2$ vs v7)
- **Justification:** Blanket overclaims were excised—`crash_safe=YES` was replaced with empirical metrics (`recovery: batches=%d billed=%d failed=%d...`), check A11 was relabeled to isolate deliberate faults from unexpected failures, and ledger Decimal precision (`ROUND_HALF_UP`) was explicitly documented.
- **Biggest Remaining Risk:** Unit test claims of "11/11 cases PASS" for recovery decisions rely on mocked database operations (`lambda *a, **k: None`), risking conflation between mocked unit logic and live relational integrity.

#### 2. Gate-Correctness: 8/10 (prior: 3 / 3 / 3 / 5 / 6; $\Delta = +2$ vs v7)
- **Justification:** Tax row-cardinality assertions prevent duplicate-row inflation, `p7_tax_rule_check` fails closed on unexpected rule variations, and the cohort-scoped `DELETE` safely preserves planted non-DR records (`P8NONDR`, `survived=1`).
- **Biggest Remaining Risk:** In `sampled_real_form_diff_r5.py::reap_writers`, resuming with `--retry-failed` over batches with `status == "FAILED"` results in `pending = []`, which bypasses the 5-second database quiescence content-hash check.

#### 3. Oracle-Validity: 8/10 (prior: 4 / 4 / 3 / 5 / 6; $\Delta = +2$ vs v7)
- **Justification:** The oracle now enforces a strict multi-layer writer death gate (PGID kill, `/proc` cmdline scan, 5-second `_content_hash` quiet interval) and verifies restore idempotence across crash interruptions (A20) and corrupted stage metadata (A15, A18a, A18b).
- **Biggest Remaining Risk:** A rogue headless writer sleeping or blocked on I/O for longer than the 5-second quiet window could evade detection and mutate output tables after `stage_restore` completes.

#### 4. Reproducibility: 6/10 (prior: 3 / 5 / 6 / 5 / 6; $\Delta = 0$ vs v7)
- **Justification:** Single-command execution and byte-identical ledger regeneration (`a66a3a54...` across 356,355 rows) are proven via `tools/p6_run_suite_fresh.sh` on the host, but Pack D was formally deferred.
- **Biggest Remaining Risk:** Off-box reproduction by independent third parties remains impossible because `stagea_common.py`, `BilingHarness.java`, `strata_reg_rows.sql`, and clean synthetic database seed generators remain unbundled from the repository.

#### 5. E2E-Design: 7/10 (prior: 4 / 5 / 5 / 6 / 7; $\Delta = 0$ vs v7)
- **Justification:** The P7 trigger audit verified that headless GUI execution writes directly to production billing tables (`nota_jalan` and `billing`), but encounter-level settlement verification is restricted to micro-samples (2 to 4 visits per suite run).
- **Biggest Remaining Risk:** Macro-level settlement validation (`three_count_reconcile_p2.py`) compares the aggregate sum of a sparse sample of notes in Source B against the cohort-wide total of Source C, structurally tripping `P2-BC-TOTAL` and bypassing true per-encounter B–C financial reconciliation.

#### 6. External-Validity: 4/10 (prior: 3 / 4 / 4 / 4 / 4; $\Delta = 0$ vs v7)
- **Justification:** Evaluation remains confined to a single MySQL instance, historical outpatient encounters, synthetic doctor assignments, and unexercised inpatient modules (C1–C4).
- **Biggest Remaining Risk:** Findings cannot be generalized to multi-tenant or concurrent clinical hospital operations without testing raw concurrency contention, inpatient bed transfers, and real-world billing exceptions.

---

### 1. Status of v7 Findings

- **Genuinely Fixed (verified in code AND asserted in run):**
  - *Adversarial crash recovery acceptance:* A15 (corrupt hash), A18a (truncated hash), and A18b (foreign stage table) were built, run, and verified to fail closed with `STAGE-RESTORE-HASH-MISMATCH` / `STAGE-RESTORE-UNVERIFIED`.
  - *Surviving writer detection:* Process killing via PGID, process-table scanning, and pre-restore quiescence hashing verified in A19 (`WRITER-ALIVE`).
  - *Mid-restore crash idempotence:* Verified in A20 by killing the process midway through table restoration and resuming cleanly.
  - *Retrying failed batches over clean state:* `--retry-failed` in A21 verified to reject unverified restores and enforce clean pre-billing state.
  - *Tax row-cardinality inflation:* Verified in A10 with strict row-count checks preventing duplicate-tax artifacts.
  - *Cohort-scoped DELETE corruption:* Verified in A10e; planted non-DR records survive cleanup.

- **Merely Claimed (partial code or limited assertions):**
  - *Off-box execution completeness:* Claimed via disposable clone scripts, but dependent on unbundled local dependencies.
  - *Unit test decision rigor:* Claimed "11/11 PASS" on recovery decisions, but live SQL state transitions remain unasserted due to mocked database connections.

- **Still Open:**
  - *Matched-encounter B–C financial reconciliation:* `three_count_reconcile_p2.py` still computes whole-cohort totals rather than restricting Ground Truth C to matched notes in B.
  - *Pack D artifact bundling:* Source Java harnesses, schema fixtures, and support libraries remain off-repo.

---

### 2. New Problems Introduced or Exposed by P8

1. **Quiescence Bypass on Failed Batch Retry:** In `reap_writers`, filtering `pending` visits strictly on `status in ("STAGED", "RESET")` sets `pending = []` when executing `--retry-failed` on batches with `status == "FAILED"`, skipping the 5-second database hash quiet-interval check.
2. **Missing Live Target Guard in Ledger Builder:** `build_dr_charge_ledger_p2.py` defaults directly to `LEDGER_DB = sik_bench` and `SIC_DB = sik` without an `--allow-live` command-line requirement, leaving the baseline ledger exposed to accidental overwrite if run manually outside the harness wrapper.

---

### 3. Top-3 Remaining Issues (Priority Order)

1. **Cohort-Wide vs. Matched B–C Reconciliation (Pack E):** Modify `three_count_reconcile_p2.py` to filter ledger charges to the exact set of `no_rawat` present in `detail_nota_jalan`, replacing the guaranteed `P2-BC-TOTAL` aggregate mismatch with an asserted per-encounter financial diff.
2. **Off-Box Reproducibility Bundle (Pack D):** Package `stagea_common.py`, `BilingHarness.java`, `strata_reg_rows.sql`, and an anonymized/synthetic DB seeder to eliminate dependencies on the local VPS environment.
3. **Quiescence Gate Gap for Retried Batches:** Update `reap_writers` in `sampled_real_form_diff_r5.py` to include `status == "FAILED"` visits in the `pending` set so that retried runs enforce the 5-second output quiet window.

---

### 4. Top-3 Strongest Properties to Lead With

1. **Adversarial Fail-Closed Recovery:** Rigorously proven rejection of corrupted, truncated, or foreign state tables, alongside automated SIGKILL and quiescence detection of orphaned writers before any state restoration.
2. **Deterministic Full-Ledger Invariant:** Complete reproducibility of 356,355 rows and Rp 34,870,243,633 down to an identical SHA-256 hash (`a66a3a54...`) when executed against an empty target schema.
3. **Rigorous Scoping and Claim Boundaries:** Complete eradication of blanket claims (`crash_safe=YES` removed, Decimal rounding modes explicit, single-encounter GUI mutations isolated from production).

---

### 5. Overall Score

$$\text{Overall Score} = \operatorname{round}\left((8 + 8 + 8 + 6 + 7 + 4) \times \frac{10}{6}\right) = \operatorname{round}(41 \times 1.6667) = \mathbf{68/100}$$

- **$\Delta$ vs Run 4701365 (35):** $+33$
- **$\Delta$ vs Run 4769794 (43):** $+25$
- **$\Delta$ vs Run 4795743 (43):** $+25$
- **$\Delta$ vs Run 4818826 (52):** $+16$
- **$\Delta$ vs v7 Runs 4880158+4894730 (58):** $+10$

---

### 6. Overall Verdict

**Needs targeted rework**

*(The benchmark's autonomous crash-recovery and ledger gates are now mathematically and empirically defensible, but paper submission requires resolving the aggregate B–C reconciliation mismatch and bundling the deferred Pack D artifacts for third-party reproducibility).*

---

### 7. Single Most Important Next Step

Refactor `three_count_reconcile_p2.py` to join Note Source B with Ground Truth Source C on matching encounter IDs (`no_rawat`), proving exact line-item and aggregate financial equivalence between form-settled payments and simulated billing on the sampled cohort.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

Wave P8 delivers the most disciplined claim cleanup of this entire benchmark history. Rather than papering over v7's findings, the team systematically tracked down and corrected the discrepancies between log markers, gate assertions, and report text.

### 1. Verification of Numbers and Arithmetic
- **The 29 Suite Checks:** The transcript emits exactly 29 PASS lines: `A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A15, A16, A18a, A18b, A19, A20, A21, A17, A14, A10, A10b, A10d, A10e, A10c, A11, A12, A13`. The count of passing assertions is genuinely 29, and `PASS=29 FAIL=0` reconciles with the execution log.
- **The A11 Count Reconciliation:** In v7, A11 asserted "every restore across the suite hash-verified" while A15 intentionally produced an unverified restore. In P8, the predicate and message were rebuilt:
  ```bash
  RM_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-MISMATCH")
  UV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-UNVERIFIED")
  DF_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-DROP-FAILED")
  RV_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-RESTORED-VERIFIED")
  DELIB=$(( $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a15.log) + $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a18.log) + $(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a18b.log) ))
  ```
  The transcript logs: `STAGE-RESTORED-VERIFIED=9 STAGE-RESTORE-MISMATCH=0 STAGE-RESTORE-UNVERIFIED=0 · deliberate unverified/mismatched restores (A15+A18a+A18b)=3 · STAGE-DROP-FAILED=0`.
  The 9 verified restores outside the fault cases trace cleanly across the suite: A3/A6 (1), A4 (1), A4b resume (1), A8 resume (1), A19 resume (1), A20 resume (1), A21 retry (1), plus the verified cleanup restores for A15 and A18a/A18b. The arithmetic (`9 verified, 3 deliberate failures, 0 dropped failures`) matches the raw log lines.
- **Ledger Invariant:** The ledger rebuild into an empty scratch DB reproduces the exact canonical content hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` across 356,355 rows and Rp 34,870,243,633.

### 2. Resolution of Stale Wording and Withdrawn Guarantees
- **`crash_safe=YES` eradicated:** In `sampled_real_form_diff_r5.py`, the unconditional `crash_safe=YES` field was completely removed. The markdown artifact now records explicit, empirical recovery metrics:
  ```python
  f.write("- recovery: batches=%d billed=%d failed=%d failed_restored_verified=%d "
          "unrestored=%d retried=%d\n" % ...)
  ```
- **R5 Report Annotations:** In R5 §0, §1, and §16, previous blanket claims were struck through in place (`~~crash-safety~~ recovery from one injected kill -9`, `~~B-settlement equivalence is structurally unclaimable~~`).
- **Floating-point honesty:** The builder docstring withdrew "no float ... end-to-end", detailing where Decimal rounding is applied (`irup()` using `ROUND_HALF_UP` on exact string representations).
- **Chronology:** The v7 chronology concern (task dated Oct 17 with transcripts dated Oct 16) is clarified: the team documented that VPS run logs are kept in UTC while documentation headers use local time (UTC+7).

### 3. Remaining / New Overclaim Risks
- The suite summary table still uses `PASS` in a binary column before stating the asserted property. While the footnote qualifies that "a PASS covers only the property in its row, on fixture sik_p6f", casual readers will see 29 PASSes and assume universal system correctness.
- The unit test claims "11/11 cases PASS" for recovery decisions, but DB operations are mocked to `lambda *a, **k: None`. The report is clear that this is a mocked decision test, but it must not be conflated with live SQL integration.

**Claim-honesty score: 8/10**

---

## GATE-CORRECTNESS

### 1. Concrete Code-Level Findings
- **(a) Tax-Row Cardinality (A10b / A10d):**
  In v7, A10b joined only on amount, allowing a duplicate row with the expected amount to pass unnoticed. P8 introduces `taxcard()` in `p6_acceptance_suite.sh`:
  ```bash
  taxcard() { SQL "SELECT COUNT(*) FROM (SELECT d.no_rawat, (SUM(d.amount)*11+50) DIV 100 et, (SELECT COUNT(*) FROM ${FX}.dr_charge_ledger t WHERE t.no_rawat=d.no_rawat AND t.component='tax') nt FROM ${FX}.dr_charge_ledger d WHERE d.component='drug' AND d.no_rawat LIKE '2026/10/%' GROUP BY d.no_rawat) x WHERE x.nt <> IF(x.et > 0, 1, 0);"; }
  ```
  Check A10d proves this works: planting duplicate tax row `P8DUP` results in `count_query=1` while `amount_query=0`.
  Furthermore, `p7_tax_rule_check.py` was fixed to fail closed:
  ```python
  bad = len(diff) + len(missing) + len(dup) + len(mism_stored)
  print("TAX-RULE-CHECK %s (%d defects)" % ("PASS" if bad == 0 else "FAIL", bad))
  sys.exit(0 if bad == 0 else 1)
  ```
  Planted defects force exit code 1.
  *Latent blind spot:* In `p7_tax_rule_check.py`, the driver query groups by `dr_charge_ledger WHERE component='drug'`. An orphan tax row (a tax charge on a visit with zero drug rows) is omitted by this subquery and will not be flagged by `p7_tax_rule_check.py`. However, A10b explicitly catches this via `TAXORPHAN` (`WHERE t.component='tax' ... AND NOT EXISTS (...)`).

- **(b) Cohort-Scoped DELETE (A10e):**
  In `build_dr_charge_ledger_p2.py`, the cohort DELETE was previously un-scoped (`WHERE 1=1` under `--window ALL`), wiping out non-DR rows. P8 binds DELETE to both window and cohort:
  ```python
  rp_cs = dbutil.scalar(SIC_DB, "SELECT character_set_name FROM information_schema.columns WHERE ...")
  on = ("rp.no_rawat = CONVERT(l.no_rawat USING %s)" % rp_cs) if rp_cs else "rp.no_rawat = l.no_rawat"
  dscope = "1=1" if args.window == "ALL" else "l.no_rawat LIKE '2026/10/%'"
  delete_sql = ("DELETE l FROM dr_charge_ledger l LEFT JOIN " + SIC_DB + ".reg_periksa rp "
                "ON " + on + " WHERE " + dscope + " AND (rp.no_rawat IS NULL OR " + (cp % ()) + ")")
  ```
  `A10e` plants non-DR row `2026/10/01/000207` (`P8NONDR`). Under both `--window 2026-10` and `--window ALL`, the non-DR row survives (`survived=1`).
  *Charset index fix:* Converting `l.no_rawat` rather than `rp.no_rawat` preserves the index on `rp.no_rawat`, preventing the 30-minute table lock observed in run 1.

- **(c) Mutation Paths Against Live `sik`:**
  - `p6_acceptance_suite.sh` immediately aborts if `FX` matches `sik` or `sik_bench` (A17, exit 3).
  - `sampled_real_form_diff_r5.py` refuses `--db-name sik` without `--allow-live` (A16, exit 3).
  - *Residual vulnerability:* `build_dr_charge_ledger_p2.py` defaults to `LEDGER_DB = sik_bench` and `SIC_DB = sik`. It contains no `--allow-live` guard. If invoked manually without environment variables, it will directly write to `sik_bench.dr_charge_ledger`. While `sik_bench` is the benchmark database rather than core clinical `sik`, a missing target assertion in the builder leaves open accidental clobbering of the baseline ledger.

- **(d) Reliability of A11 Relabel:**
  Because `OTHER_LOGS` explicitly filters out `r6_a15.log`, `r6_a18.log`, and `r6_a18b.log`, any unverified restore occurring in any other check will increment `UV_OTH` or `RM_OTH` and trip `check 11`. The cleanup logs (`/tmp/r6_a15_cleanup.log`, etc.) are included in `OTHER_LOGS`; since their cleanups must be verified (`STAGE-RESTORED-VERIFIED`), an unverified cleanup restore would also trip the check.

- **(e) New Gate Defects Introduced in P8:**
  In `sampled_real_form_diff_r5.py::reap_writers`:
  ```python
  pending = [v for b in st["batches"].values()
             if b.get("status") in ("STAGED", "RESET") for v in b["visits"]]
  quiet = True
  if pending and not left and not alive_groups:
      qs = float(...)
      h1 = _content_hash(pending, db, log)
      time.sleep(qs)
      quiet = h1 == _content_hash(pending, db, log)
  ```
  When resuming with `--retry-failed` on a run where all failed batches have `status == "FAILED"`, `pending` evaluates to `[]`. Consequently, the quiet-interval content check is bypassed (`quiet` remains `True` without checking database stability). The PID check and process-table grep still run, but the output-quiescence invariant is skipped for `FAILED` batch retries.

**Gate-correctness score: 8/10**

---

## ORACLE-VALIDITY

### 1. Hash Validation and Corrupt Metadata (P8-C1, A18a / A18b)
The restore logic in `stage_restore` now validates the stage metadata file before attempting to trust its contents:
```python
if os.path.exists(hpath):
    try:
        meta = json.load(open(hpath))
        pre = meta.get("sha256")
        if meta.get("pfx") != pfx or sorted(meta.get("nrs") or []) != sorted(nrs) \
                or not re.fullmatch(r"[0-9a-f]{64}", str(pre)):
            bad = "hash file does not describe this batch (pfx/nrs/sha256 invalid)"
    except Exception as e:
        bad = "hash file unreadable (%s)" % type(e).__name__
```
Any JSON parse failure, prefix mismatch, visit mismatch, or malformed sha256 marks `bad`, logs `STAGE-RESTORE-UNVERIFIED`, preserves the stage tables (`STAGE-KEEP`), and returns `False` without throwing an unhandled exception. This directly addresses v7's AC-2 gap.

### 2. Writer Death Proof in `reap_writers` (P8-C2, A19)
The proof of writer death now combines three layers:
1. **PGID Kill:** Reaps the recorded PGIDs from `harness_*.log.pid` via `os.killpg(pgid, SIGTERM/SIGKILL)`.
2. **Process-table Command-line Scan:** Inspects `/proc/*/cmdline` for any process containing `BilingHarness` and referencing any visit in the batch, killing their PGIDs.
3. **Quiescence Interval:** Samples `_content_hash(pending)` across all 12 output tables, sleeps 5 seconds (`R5_WRITER_QUIET_S`), and re-hashes. If the hash flips, `WRITER-ALIVE` aborts the restore (exit 4).

*Soundness evaluation:* Can a writer survive this?
- If a JVM process ignores SIGTERM, escalation to SIGKILL (`signal.SIGKILL`) terminates it unless it is stuck in uninterruptible disk I/O (`D` state). If it is stuck in `D` state, `_group_alive` continues to return `True`, causing `_kill_pgid` to return `False` and logging `WRITER-ALIVE`. The restore will correctly abort.
- If an unparented JVM process was started under a different name or wrapped such that `BilingHarness` does not appear in `/proc/*/cmdline`, the process scan would miss it. However, if that writer attempts to mutate any of the 12 stage-reset tables for the pending visits, the 5-second `_content_hash` quiet interval detects the write and trips `quiet=False`.
- *Remaining loophole:* A rogue writer that pauses or sleeps for > 5 seconds between writes could evade the quiet check and write to the database after restoration. Within the context of headless GUI billing execution, this is an acceptable residual risk.

### 3. Restore Idempotence and Interruption (P8-C3, A20)
`stage_restore` operates by executing `DELETE FROM <table> WHERE no_rawat IN (...)` followed by `REPLACE INTO <table> SELECT * FROM <stage_table>`. Because the stage tables are preserved until finalized and the DML is set-based replacement, killing the process mid-restore (in A20, after `billing` was restored but before the other 11 tables) leaves the stage tables intact. A subsequent resume simply re-executes the DELETE + REPLACE sequence and verifies the end-state hash. Idempotence is mathematically and operationally sound.

### 4. Retry of Failed Batches (P8-C4, A21)
`--retry-failed` allows a batch that failed due to timeout or harness crash to be re-billed, but strictly requires that its pre-reset state be verified before re-billing:
```python
if b.get("restored") is not True:
    if not stage_restore(b["visits"], db, rundir, log, tool.run_id, stage=st.get("stage")):
        log("date %s: RETRY-REFUSED (restore not hash-verified; stays FAILED)" % d)
        failed = True
        break
    b["restored"] = True
```
This closes the state-machine hole where failed batches were either permanently stuck or retried over dirty state.

**Oracle-validity score: 8/10**

---

## REPRODUCIBILITY

### 1. What P8 Improved
- **Clean Execution Wrapper:** `tools/p6_run_suite_fresh.sh` provides a single-command entry point: builds `sik_p6f` from live `sik`, applies `strata_reg_rows.sql`, sets up grants, executes `p6_acceptance_suite.sh`, and tears down the fixture via an `EXIT` trap.
- **Evidence Archival:** Defect D7 was closed in `p6_acceptance_suite.sh`: prior results are moved to `/opt/dr-benchmark/results/archive/<TS>/` rather than deleted via `rm -rf`.
- **Manifest Synchronization:** The release manifest accurately pins the SHA-256 hashes of all 15 gate, oracle, and utility tools on the VPS.
- **Deterministic Ledger Rebuild:** `p8_builder_all_check.sh` proves that running `build_dr_charge_ledger_p2.py --window ALL` into an empty scratch database reproduces the pinned ledger content hash `a66a3a54...` identically.

### 2. Ranked Blockers for Third-Party Off-Box Reproducibility
Pack D (reproducibility closure) was explicitly deferred by the owner. Consequently, external reproduction without access to this specific VPS remains blocked:
1. **Missing Supporting Source Code (`stagea_common.py`):** `p6_dbxml.py` imports `stagea_common`, which is not embedded, not in the repository tools directory, and withheld due to environment-specific credentials/configuration.
2. **Missing Java Harness Source:** `BilingHarness.java` and `KhanzaBillingConsumer.java` are referenced as compiled `.class` files or jar paths. While the trigger audit verified database writes, third parties cannot inspect or recompile the harness.
3. **Missing Fixture Seed (`strata_reg_rows.sql`):** The clone script requires `/opt/dr-benchmark/p-chain/sik_p6f_build_*/strata_reg_rows.sql`. This file is not embedded.
4. **Proprietary Fixture Data:** The entire benchmark relies on a mysqldump of the live `sik` database (86,455 encounters). No synthetic generation script exists to reconstruct `sik` from zero on an empty machine.

On the local machine/VPS, reproducibility is high; for an independent third party, the artifact pack is incomplete.

**Reproducibility score: 6/10**

---

## E2E-DESIGN

### 1. Current State of the E2E Evidence
- **Proven Form Billing Writes:** The trigger audit in P7 established that `DlgBilingRalan` executed via `BilingHarness` directly issues `INSERT INTO billing` (17 rows on the audited encounter), alongside the `nota_jalan` payment records. The consumer and the form write to the same billing table.
- **Sampled Equivalence:** For encounters evaluated by the oracle (`A1`, `A2`, `A3`), the comparison between the frozen consumer baseline and the form-written billing is a true row-level, same-encounter diff.
- **Sample Scope Limitation:** Full E2E headless GUI execution is executed only on samples (e.g. 2 visits in A1, 4 in A3/A6, historically 999 in R4). Across the 86,101 encounters of B3, the primary end-to-end claim relies on the consumer simulator.

### 2. The Weakest Leg: Aggregate Note-Level B–C Reconciliation
The three-source model in `three_count_reconcile_p2.py` remains structurally disconnected at the encounter level:
- Source A is consumer billing rows.
- Source C is the DR ground-truth ledger.
- Source B is read from `detail_nota_jalan` and `piutang_pasien`.
When B is present, `three_count` compares:
```python
if b_amt != c_amt:
    gate_pass = False
    findings.append(("P2-BC-TOTAL", "note", "B ... != C ..."))
```
It compares the **sum of all notes in B** against the **sum of all charges in C for the entire cohort**. Because only encounters that were re-billed through the GUI have notes in B (149 or 151 notes in October out of 7,708 visits), B is always a subset. The tool logs `P2-BC-TOTAL`, outputs `PARTIAL`, and bypasses any line-item or per-visit check between B and C.

### 3. The Necessary Fix
To achieve true E2E reconciliation, `three_count` must perform **matched-encounter reconciliation**: filter C to exactly the subset of `no_rawat` present in B, and assert per-encounter equality of form-settled revenue against DR ground truth.

**E2E-design score: 7/10**

---

## EXTERNAL-VALIDITY

### 1. Scope and Realism
- **Single-Site, Single-Engine:** All benchmarks run against a single configuration of Khanza SIMRS on MySQL 8.0.46, hosted on one Ubuntu VPS.
- **Outpatient Only:** No inpatient hospitalization, bed charges, operating theater, ICU, or multi-day stays are modeled.
- **Uncalibrated Clinical Profile:** Diagnoses and prescriptions are synthetically assigned. The drug share of revenue is ~82.7% (inclusive of PPN), which does not reflect realistic hospital outpatient revenue distributions.
- **Ineffective Edge Strata:** As discovered in §17 and re-confirmed in P8, embalase and tuslah charges authored into synthetic visits do not reach the final outpatient bill in this Khanza configuration. The system cannot evaluate fee behavior for these edge cases.
- **Payer Mix Not Exercised:** All billing is evaluated under standard cashier settlement; BPJS health insurance claims, INA-CBG grouping, tariff capping, and private insurer discounts remain entirely unexercised (C1–C4 NOT TESTED).

### 2. Scoping Honesty vs. External Risk
The authors deserve credit for maintaining strict scoping boundaries. Caveat RC-9 in §13 explicitly prohibits generalizing these results to real-world hospital financial performance:
> *"This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products."*

The greatest external risk is that external stakeholders quote the headline figures ("86,455 visits, Rp 34.87 Billion, 0 drift") as proof that Khanza SIMRS bills accurately in clinical production, when it only demonstrates deterministic simulator equivalence on synthetic outpatient encounters.

**External-validity score: 4/10**

---

## OVERALL ASSESSMENT & VERDICT

### Criterion Score Summary

| Criterion | v7 Score | P8 Score | Delta | Primary Justification |
|---|---:|---:|---:|---|
| **Claim-honesty** | 6/10 | **8/10** | +2 | Removal of `crash_safe=YES`; A11 relabeled and verified against deliberate faults; Decimal precision documented; all 29 checks asserted per property. |
| **Gate-correctness** | 6/10 | **8/10** | +2 | Tax-row cardinality check closes duplicate-row hole; `p7_tax_rule_check` fails closed; cohort-scoped DELETE preserves non-DR records; live fixture refusal enforced. |
| **Oracle-validity** | 6/10 | **8/10** | +2 | Multi-layer writer death proof (PGID + `/proc` grep + quiet interval); corrupt/foreign hash validation; mid-restore crash idempotence proven. |
| **Reproducibility** | 6/10 | **6/10** | 0 | Automated disposable-clone wrapper and byte-identical ledger rebuilds established on-box; external reproduction still blocked by Pack D omissions. |
| **E2E-design** | 7/10 | **7/10** | 0 | Form writes billing proven, but B–C reconciliation remains an aggregate cohort comparison rather than matched-encounter validation. |
| **External-validity** | 4/10 | **4/10** | 0 | Unchanged surface (outpatient only, single instance, uncalibrated clinical distributions, C1–C4 unexercised). Scoping honesty remains rigorous. |

### Overall Score Calculation
$$\text{Total Score} = \operatorname{round}\left( (8 + 8 + 8 + 6 + 7 + 4) \times \frac{10}{6} \right) = \operatorname{round}\left( 41 \times 1.6667 \right) = \mathbf{68/100}$$

### Historical Progression
**35 (v3) $\rightarrow$ 43 (v4) $\rightarrow$ 43 (v5) $\rightarrow$ 52 (v6) $\rightarrow$ 58 (v7) $\rightarrow$ 68 (v8)**

### Final Verdict
**PASS (Autonomous Scope — Substantially Hardened).**
Wave P8 successfully addresses the central vulnerability identified in v7: recovery acceptance testing under adversarial fault injection. The fail-closed guarantees across corrupt hash metadata, surviving writers, interrupted restoration, and retry states are now mathematically and empirically demonstrated on disposable clones. The benchmark is sound within its stated autonomous boundaries. Future progression beyond the 70-point threshold requires executing Pack D (reproducibility packaging) and Pack E (matched-encounter B–C financial reconciliation).
