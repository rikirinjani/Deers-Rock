# Astra v6 assessment: dr-khanza-e2e-full-assessment (post P1-P6)

## CLAIM-HONESTY

### VERDICT

## Overall verdict: **Conditionally Defensible Benchmark — 68/100**

Wave P6 represents a watershed transition from narrative remediation to executable systems rigor. By delivering an 18/18 machine-asserted acceptance suite on a full clone target (`sik_p6f`), replacing multi-connection pseudo-transactions with single-session persistent pipes (`dbutil.session()`), implementing group-level process termination with writer-dead proofs, and discovering/retargeting the true AES-encrypted configuration target (`database.xml`), the owner has systematically eliminated the critical failure modes identified in v5.

Crucially, the post-P6 disclosures in R5 §17—unmasking the historical `database.ini` retargeting failure across all prior clone runs, retracting the defensive "misread" stance on the `--window ALL` syntax error, and exposing a latent quantity bug in the pinned ledger—demonstrate high engineering integrity. The benchmark is no longer "Needs targeted rework"; it is now a sound, empirically verified hybrid benchmark within its stated boundaries.

**Comparison:** **+25 points versus v5 (43/100); +25 points versus v4 (43/100); +33 points versus v3 (35/100).**

---

### Criterion scores

| Criterion | Score | Δ vs v5 | Evidence-based justification | Biggest remaining risk |
|---|---:|---:|---|---|
| **Claim-honesty

## GATE-CORRECTNESS

### Executive Verdict: **Needs targeted rework — 50/100**

Wave P6 delivers substantial engineering progress on the test harness and crash semantics. For the first time, the repository contains a machine-asserted acceptance suite (`p6_acceptance_suite.sh`, 18/18 checks) running against a clone retargeted via `database.xml`, genuine single-session transactional builder semantics (`dbutil.session()`), process-group writer cleanup, and verified content-hash restorations. 

However, this increased rigor has exposed three serious structural issues that cap the benchmark's score:
1. **The Pinned Ground-Truth Ledger is Broken and Unsynchronized:** R5 §17 discloses that live pinned ledger row `2026/10/01/000298` carries `quantity=23` while its amount (Rp 745,800) and underlying source data require `quantity=25`. Rebuilding the ledger fixes the quantity but breaks byte-level repeatability across 260,800 rows (`source=NULL` vs `source='dr_tariff'`). The owner elected **not** to fix the live ledger; the default gate passes only because it ignores quantities entirely.
2. **Logic Regression in Gate Tooling:** In `three_count_reconcile_p2.py`, the exit condition was botched: `return 0 if (gate_pass and not partial or gate_pass and b_verified

## ORACLE-VALIDITY

### 1. Verification of Prior Findings & P6 Changes

| Prior Finding (v5) | Status in P6 Source & Runs | Verified Resolution vs. Mere Claim vs. New Defect |
|---|---|---|
| **1. False Transactional Replacement** (separate `dbutil.execute` calls opened separate connections; uncommitted `DELETE` rolled back while `REPLACE`s committed) | **GENUINELY FIXED & PROVEN.** `dbutil.py` now provides `session()` streaming over a single persistent `mysql` subprocess pipe. In `build_dr_charge_ledger_p2.py`, `START TRANSACTION`, `DELETE`, batch `REPLACE`s, and `COMMIT` execute in one session. Tax calculation was moved in-memory from `drug_sub` rather than re-queried over a second connection. | **Proven in A10/A10b/A10c.** In check A10c, an injected trigger on `tax` (`SIGNAL SQLSTATE '45000'`) forced MySQL `ERROR 1644` mid-build. The session caught the error, executed `ROLLBACK`, exited 1 (`FAIL-CLOSED`), and the pre/post SHA-256 hashes of the scratch ledger were identical (`356355:504531980ca252725fe9897ed038088f5fefa50

## REPRODUCIBILITY

## VERDICT

## Overall verdict: **Substantial progress, gates and recovery verified, core data defect uncorrected — 58/100**

Wave P6 represents the most technically disciplined engineering cycle in this project. The owner finally abandoned defensive narratives, conceded critical architectural errors that Astra previously flagged, implemented genuine database session transactions, solved JVM process-group leakages, and delivered an 18/18 machine-asserted acceptance suite on a verified, retargeted clone. 

However, the benchmark is held back from a production-grade rating by a major data paradox: **the pinned reference ledger is provably corrupted in quantity (`2026/10/01/000298` qty 23 vs 25), yet the owner deliberately refused to re-baseline it to preserve historical hashes.** Furthermore, every clone-mode run prior to P6 has been invalidated by the disclosure that the Java harness was reading AES-encrypted `database.xml` and running against live production all along.

**Comparison:** **+15 points versus run 4795743 (43/100); +15 points versus run 4769794 (43/100); +23 points versus run 4701365 (35/100).**

---

## Criterion scores

| Criterion | Score | Δ vs v5 | Evidence-based justification | Biggest remaining risk |
|---|---:|---:|

## E2E-DESIGN

# Fourth Assessment (v6): DR → Khanza E2E Billing Benchmark

## Executive Verdict: **Targeted Systems Progress, Major Oracle/Data Integrity Gaps Exposed — 55/100**

Wave P6 demonstrates substantive engineering remediation: atomic single-session transaction management (`dbutil.session`), robust process-group lifecycle controls (`killpg`, `WRITER-DEAD-PROOF`), a functional 18-check acceptance suite executed on a populated clone (`sik_p6f`), and the correction of target-retargeting (`setting/database.xml`).

However, P6's increased rigor also unmasks severe integrity liabilities that were previously obscured:
1. **The pinned live ledger is demonstrably corrupted**: Row `2026/10/01/000298` (drug `B000000240`) has `quantity=23` with `amount=745,800` ($25 \times 29,832$), while source and billing record `25`. `charge_delta --line-diff` fails on the live pinned ledger. Additionally, 260,800 pinned rows carry `source=NULL`.
2. **Every pre-P6 "scratch clone" run was invalid**: The Java harness never read `database.ini`; it read AES-encrypted `setting/database.xml`. All prior clone-mode form executions ran against the live production database `sik`.
3. **The outpatient billing oracle is insensitive to fee strata**: Authored embalase and tuslah surcharges are completely ignored by Khanza's `DlgBilingRalan` outpatient billing path. The synthetic edge strata produce no observable billing deltas in this configuration.

---

## Criterion Scores

| Criterion | Score | Δ vs v5 | Evidence-Based Justification | Biggest Remaining Risk |
|---|---:|---:|---|---|
| **1. Claim-honesty** | **6/10** | **+1** | Transparent post-P6 disclosure (§17): retracts incorrect §16 defense of the SQL syntax error, admits the `database.ini` retargeting failure, documents the `STALE-TEST-KEY` live leak, and flags the corrupted ledger row. Deductions remain because the live ledger was not rebuilt to match the claim. | Pinned artifacts in the manifest do not match the clean canonical state claimed in baseline documentation. |
| **2. Gate-correctness** | **6/10** | **+3** | The broken unterminated string literal in `--window ALL` is finally fixed (`1=1`); 354 Stage-A visits are now included. Builder replacement is genuinely atomic via streaming stdin (`dbutil.session`) and proven via trigger injection (`A10c`). However, `--window ALL` in the builder issues an unfiltered `DELETE WHERE 1=1` without cohort scoping. | Unscoped global DELETEs in the builder wipe out entire tables if multi-cohort tenancies are introduced. |
| **3. Oracle-validity** | **5/10** | **+2** | Content-hash-verified restoration (`STAGE-RESTORED-VERIFIED`), writer-dead process-group verification, and strict structured rejection of missing registrations (`exit 2`) are proven in code. But `DlgBilingRalan` does not process embalase/tuslah, and `charge_delta --line-diff` fails on the pinned ledger. | The oracle cannot validate edge fee logic, and the line-diff gate is untrustworthy against the pinned baseline. |
| **4. Reproducibility** | **7/10** | **+1** | One-command suite runner (`p6_run_suite_fresh.sh`), automated `database.xml` retargeting, and hash-pinned manifest tools provide reproducible clone runs. But third-party reproduction still depends on proprietary DB dumps and undisclosed VPS root credentials. | The live ledger cannot be reproduced byte-for-byte from scratch without changing `source` labels and the corrupted quantity. |
| **5. E2E-design** | **5/10** | **0** | The hybrid design is transparently scoped, but the fundamental B-subset settlement gap remains: the real form writes `nota_jalan`, not `billing`. Form execution verifies note creation, not consumer billing row generation. | Real-form billing execution does not test or assert the actual financial settlement rows written to `sik.billing`. |
| **6. External-validity** | **4/10** | **0** | §13 correctly restates the narrow scope (single clinic, single MySQL, outpatient only). P4 strata recheck proves that out-of-envelope fee mechanisms (embalase/tuslah) are completely unexercised in this installation. C1–C4 remain NOT TESTED. | Khanza configuration is non-standard or deaf to pharmacy surcharges, limiting relevance to standard hospital deployments. |

### Score Synthesis
$$\text{Score} = (6 + 6 + 5 + 7 + 5 + 4) \times \frac{10}{6} = \frac{33 \times 10}{6} = 55.0 \rightarrow \mathbf{55/100}$$

---

## 1. Verification of v5 Findings & P5 Defects

| Finding / Issue | Status | Source & Transcript Verification | Assessment |
|---|---|---|---|
| **v5 Top Issue 1: Database Primitives & Transactions** | **FIXED & PROVEN** | `dbutil.py` lines 105–204; `p6_acceptance_suite.sh` lines 177–213; transcript lines 58–69. | `dbutil.session()` streams commands to a single persistent `mysql` process. A10c injects trigger `p6_a10c_fail` on `BEFORE INSERT` for `component='tax'`. MySQL raises `ERROR 1644`, broken pipe is trapped, rollback executed, and pre/post ledger hash `504531980ca2...` is identical. |
| **v5 Top Issue 2: Disposable Clone Recovery & Verification** | **FIXED & PROVEN** | `sampled_real_form_diff_r5.py` lines 196–258; transcript lines 34–42. | `stage_restore()` computes `_content_hash()` over all 12 reset tables plus `reg_periksa.status_bayar`. Compares directly to staged hash. Logs `STAGE-RESTORED-VERIFIED`. Group-level kill (`killpg`) is verified by `group_empty=true`. |
| **v5 Top Issue 3: Close Evidence Chain & Target Config** | **PARTIALLY RESOLVED** | `p6_dbxml.py`; `p6_strata_recheck.sh`; R5 §17. | Target configuration fixed via `database.xml` AES retargeting. But §17 discloses that all pre-P6 clone-mode form runs ran against live `sik`, and the pinned ledger is corrupted. |
| **Broken `--window ALL` SQL Literal** | **FIXED & PROVEN** | `charge_delta_per_component_p2.py` lines 42–47; `three_count_reconcile_p2.py` lines 43–48; `build_dr_charge_ledger_p2.py` line 67. | The unquoted string literal was real. §16's denial is retracted in §17. Both gates and the builder now use `"1=1"`. Full-window execution passes with 86,455 visits (including the 354 Stage-A visits). |
| **Target Harness Configuration (`database.ini`)** | **FIXED IN P6 / INVALIDATES PRIOR** | `p6_dbxml.py` lines 1–40; R5 §17 item 3 & 5. | The Java harness reads AES-encrypted `database.xml`. P6 created `p6_dbxml.py` to encrypt/retarget. Confirmed: all prior "clone-mode" form runs (P1, P4) actually ran against production `sik`. |
| **Stage Isolation Across Jobs** | **FIXED & PROVEN** | `sampled_real_form_diff_r5.py` line 161: `r5_stage_%s_%s % (stg, rid)`; transcript lines 53–57 (A9). | Prefixes now include stage (`r5_stage_B3_r6_a9_*` vs `r5_stage_B2_r6_a9_*`). Drops verified independently. |
| **Timeout Killing JVM Descendants** | **FIXED & PROVEN** | `sampled_real_form_diff_r5.py` lines 270–348; transcript lines 34–38. | `start_new_session=True`, `_kill_process_group` with `os.killpg(pgid, SIGTERM/SIGKILL)`, and `group_empty=true` check. A4 verifies 0 java processes remain. |

---

## 2. Critical Audit of Acceptance Suite (`p6_acceptance_suite.sh`)

Every check in run `20261016T054920Z` was evaluated against the suite source:

1. **A0 (Precondition Guard)**: Checks `STRATA-` count == 5 in `sik_p6f.reg_periksa`. Legitimate prerequisite.
2. **A1 (Clean Baseline)**: 2 visits (`800085`, `800128`), `exit=0`, wall clock 16s. Proves clean in-envelope execution.
3. **A2 (In-Envelope Mismatch)**: Modifies `detail_pemberian_obat.biaya_obat` by +1000 before freeze. Oracle detects mismatch, logs `ORACLE_FAIL`, exits 1 with 0 tracebacks.
   * *Critical observation*: The cleanup re-bill `r6_a2fix` exited 1 (`A2 cleanup re-bill exit=1`). Why? Because the perturbed row had already been billed into the database by A2, so diffing against the baseline in `a2fix` failed. This proves the harness really wrote to `sik_p6f`, though `a2fix` was redundant.
4. **A3 / A6 (Out-of-Envelope Classification)**: 4 real visits with >2 procedures. Result: `exit=4`, 4 rows marked `OUT-OF-ENVELOPE` in CSV, `restored=True`, `restore_mismatch=0`. Validates that eligibility logic precedes execution.
5. **A4 (Harness Timeout & Process Death)**: 3-second timeout fires during harness startup. Emits `WRITER-DEAD-PROOF pgid=411273 group_empty=true`, restores pre-reset state with hash verification (`STAGE-RESTORED-VERIFIED`), exits 4, `java_after=0`. Robust.
6. **A4b (SIGTERM Mid-Harness)**: Oracle killed mid-run via `kill -TERM`. Signal handler intercepts, kills JVM group (3 Java processes $\rightarrow$ 0), exits 4. Resume pass verifies pre-reset hash and re-bills to `exit=0`. Excellent crash-safety test.
7. **A5 (Missing Registration Row)**: `NO-SUCH-REG-ROW` passed with `--allow-strata`. Hits `P6-2a` structured rejection: logs `MISSING-REG`, exits 2, 0 tracebacks. Eliminates the old `None.replace()` crash.
8. **A7 (Empty Baseline Guard)**: `STRATA-ZEROFEE` has 0 billing rows. Exits 2 with `EMPTY-BASELINE`; passes (`exit=0`) only when `--allow-empty-baseline` is supplied.
9. **A8 / A8b (Restore-Injection & Resume Binding)**:
   * A8: Oracle killed immediately after `reset 2 visits`. Resume verifies hash (`STAGE-RESTORED-VERIFIED`) and finishes with `exit=0`.
   * A8b: Visits file altered on resume. Triggers `RESUME-ABORT (P6-2f)` and exits 3. Prevents sample tampering during restarts.
10. **A9 (Stage Prefix Collisions)**: B3 and B2 executed under `RUN_ID=r6_a9`. Log proves distinct prefixes `r5_stage_B3_r6_a9_*` and `r5_stage_B2_r6_a9_*` and verified clean drops.
11. **A10, A10b, A10c (Builder Transactionality & Rollback)**:
    * A10: Single-session commit logged.
    * A10b: Pre-seeded stale key `2026/10/01/999999` deleted; tax recalculation verified.
    * A10c: MySQL trigger `p6_a10c_fail` raises `ERROR 1644` on tax insert. Python traps `BrokenPipeError`, calls `rollback()`, exits 1. Hash of ledger before and after is identical (`504531980ca2...`). **Definitive proof of transaction atomicity.**
12. **A11, A12, A13 (Global Invariants & Leak Guards)**:
    * A11: 0 restore mismatches, 0 drop failures across entire suite.
    * A12: 0 stage tables left on `sik_p6f`.
    * A13: Live `sik_bench` ledger hash unchanged (`356355:d2b65d8e...`), both `database.xml` files restored to `sik`.

**Verdict on Suite**: The test suite is technically competent, rigorous, and asserts ground truth rather than proxy exit codes.

---

## 3. Audit of Post-P6 Disclosures (§17)

Section 17 provides necessary technical honesty, but reveals serious foundational defects:

### 1. Latent Ledger Corruption
In `dr_charge_ledger`:
$$\text{Row: } \texttt{2026/10/01/000298} \quad|\quad \text{drug } \texttt{B000000240} \quad|\quad \text{quantity}=23 \quad|\quad \text{unit\_price}=29,832 \quad|\quad \text{amount}=745,800$$
$$\text{Math: } 23 \times 29,832 = 686,136 \neq 745,800 \quad (25 \times 29,832 = 745,800)$$
* Source (`detail_pemberian_obat`) and `sik.billing` both have quantity 25.
* When `charge_delta --line-diff` runs on the canonical pinned ledger, it flags:
  `GAP [P2-LINE-DELTA] ... LINE-DELTA 2026/10/01/000298 drug: khanza_qty=25 ledger_qty=23 delta=2`
* **Consequence**: The R5 §14 claim that *"clean canonical ledger $\rightarrow$ LINE-DELTA=0"* is **false** for the live pinned ledger.
* Furthermore, rebuilding the ledger from source produces `dr_tariff` for the `source` column, whereas 260,800 rows outside October in the pinned ledger have `source=NULL`. The pinned ledger cannot be rebuilt byte-for-byte from current code without altering rows. The owner's refusal to fix the live ledger leaves corrupted data at the foundation of the benchmark.

### 2. Retraction of SQL Syntax Finding
In §16, the report dismissed Astra v5’s finding regarding unterminated SQL quotes as a "misread". In §17, the author retracts this and admits that Astra v5 was correct: `"no_rawat LIKE '____/__/__/8_____%"` lacked a closing quote, crashing any `--window ALL` execution with MySQL 1064. Acknowledging this error is necessary, but §16's premature dismissal indicates inadequate pre-release validation.

### 3. Total Invalidation of Historical Clone-Mode Runs
The revelation that the Java harness reads AES-encrypted `database.xml` and completely ignores `database.ini` means that **every benchmark or validation run before P6 that claimed to run the real form against a scratch clone was actually mutating the production database `sik`**. This invalidates all prior isolation claims.

---

## 4. Assessment of End-to-End Design

### Is the hybrid characterization still honest?
Yes, but strictly as a synthetic billing consumer benchmark. It is **not** an end-to-end evaluation of hospital cashier settlement. 

### The Weakest Remaining Leg: The Structural B-Subset Gap
The benchmark's claim of end-to-end financial validity rests on three sources: A (

## EXTERNAL-VALIDITY

# Principal-Engineer Assessment (v6)

**Project:** DR → Khanza E2E Billing Benchmark  
**Run:** Wave P6 Acceptance Suite & Post-P6 Disclosures (R5 §16–§17)  
**Previous Verdicts:** 35/100 (run 4701365) → 43/100 (run 4769794) → 43/100 (run 4795743, *Needs targeted rework*)  
**Current Verdict:** **62/100 — Technically sound narrow benchmark; externally uncalibrated**

---

## Executive Summary & Score Reconciliation

Wave P6 represents the most significant engineering maturation in this project's history. The owner abandoned defensive narrative patching, rebuilt the database interaction layer, and delivered an 18-check machine-asserted acceptance suite (`p6_acceptance_suite.sh`) executed against a verified disposable clone (`sik_p6f`). 

Crucially, R5 §17 provides a set of candid retractions: acknowledging that Astra v5 was right regarding the broken `--window ALL` SQL syntax, revealing that all pre-P6 clone runs silently hit the live database because Khanza ignores `database.ini` in favor of AES-encrypted `database.xml`, and disclosing a latent quantity defect in the pinned ledger row (`2026/10/01/000298`).

The infrastructure defects that previously prevented crash-safe, reproducible execution are genuinely fixed in code and verified by execution artifacts. However, the system's external validity remains uncalibrated, and the benchmark's scope remains bounded as a hybrid synthetic runner with structural settlement differences.

### Score Progression

$$\text{v3: 35/100} \longrightarrow \text{v4: 43/100} \longrightarrow \text{v5: 43/100} \longrightarrow \mathbf{v6: 62/100}\ (+19)$$

$$\text{Score Calculation: } \frac{7 + 7 + 6 + 7 + 6 + 4}{6} \times 10 = \frac{37}{60} \times 100 = 61.67 \longrightarrow \mathbf{62/100}$$

| Criterion | v5 Score | v6 Score | Δ | Justification | Remaining Bottleneck |
|---|:---:|:---:|:---:|---|---|
| **1. Claim-Honesty** | 5/10 | **7/10** | +2 | Radical disclosures in §17 (retracting `--window ALL` denial, admitting `database.xml` live-target leak, documenting pinned ledger quantity corruption). | Live ledger still harbors known defect; historical narrative artifacts require footnotes. |
| **2. Gate-Correctness** | 3/10 | **7/10** | +4 | `--window ALL` syntax fixed (`1=1`); atomic transactions in persistent session (`dbutil.session`); mid-build rollback proven under trigger fault injection. | Pinned ledger fails `charge_delta --line-diff` on quantity; `three_count` B-subset cannot achieve full equality. |
| **3. Oracle-Validity** | 3/10 | **6/10** | +3 | Staged content-hash backup/restore verified (`STAGE-RESTORED-VERIFIED`); JVM timeout process-group kill verified (`group_empty=true`); empty baseline guarded. | B-subset settlement disparity remains; form outpatient billing ignores embalase/tuslah in this configuration. |
| **4. Reproducibility** | 6/10 | **7/10** | +1 | Deterministic replay; fresh suite runner (`p6_run_suite_fresh.sh`); verified `p6_dbxml.py` retargeting; tool hashes re-pinned. | Cross-machine D2 human-gated; scratch rebuild reproduces keys/prices/amounts but not legacy `source=NULL` strings. |
| **5. E2E-Design** | 5/10 | **6/10** | +1 | Retargeting via `database.xml` finally isolates harness runs from live DB; real JVM interaction tested on verified full clone. | Hybrid architecture: form writes `nota_jalan`, not consumer's `billing`; cannot serve as end-to-end settlement oracle. |
| **6. External-Validity** | 4/10 | **4/10** | 0 | Disciplined disclaimer in §13; synthetic edge strata (embalase/tuslah) prove to be inert in Khanza outpatient billing. | C1–C4 unexecuted; ~82.7% drug revenue share; uncalibrated against real hospital operations. |

---

## 1. Verification of v5 Findings & P6 Remediation

### Disposition of Astra v5 Findings

| v5 Finding | P6 Status | Verification Evidence (Code & Transcript) |
|---|---|---|
| **1. False transactional replacement** (`dbutil.execute` per call opened fresh connections; DELETE committed/rolled back independently). | **GENUINELY FIXED & PROVEN** | `dbutil.py` implements `session()` holding a persistent `subprocess.Popen(["mysql", ...], stdin=PIPE)`. `build_dr_charge_ledger_p2.py` wraps `START TRANSACTION; DELETE ...; flush(); COMMIT;` in `sess`. **Proof in A10c transcript:** Trigger `p6_a10c_fail` injected on tax insert; caught `BrokenPipeError / ERROR 1644`; rolled back; scratch ledger pre/post SHA256 identical (`504531980ca2...`). |
| **2. Broken ALL predicates** (Missing closing SQL quote on `"no_rawat LIKE '____/__/__/8_____%"` caused MySQL 1064). | **GENUINELY FIXED & PROVEN** | R5 §17 formally retracted §16's erroneous denial. Both `charge_delta_per_component_p2.py` and `three_count_reconcile_p2.py` replaced the broken literal with `1=1` scoped by `cohort_predicate()`. Now captures all 86,455 DR visits (including 354 Stage-A visits). Live `--window ALL` runs green. |
| **3. Harness targeting failure** (`--db-name` / `database.ini` did not retarget Java harness; form ran against live DB). | **GENUINELY FIXED & PROVEN** | Disclosed in §17 that Khanza reads AES-encrypted `setting/database.xml`. Delivered `p6_dbxml.py` using Khanza's cipher to decrypt/encrypt targets. Proven in `p6_acceptance_suite.sh`: retargets to `sik_p6f` (`RETARGET-VERIFIED`), executes, and trap restores to `sik` (`RESTORE-VERIFIED`). |
| **4. Timeout orphaning JVM / unverified restore** (Killed bash wrapper, leaving Java writing while restore ran). | **GENUINELY FIXED & PROVEN** | `sampled_real_form_diff_r5.py` spawns

## VERDICT

## Overall Verdict: **Needs targeted rework — 57 / 100**

Wave P6 represents the most technically disciplined engineering cycle in this project. The author transitioned from defensive denials to rigorous, machine-asserted systems engineering: replacing multi-connection pseudo-transactions with single-pipe `dbutil.session()` streams, implementing process-group teardowns with writer-dead proofs, discovering and retargeting the AES-encrypted `database.xml` configuration, and delivering an 18/18 machine-asserted acceptance suite (`p6_acceptance_suite.sh`) on a verified clone (`sik_p6f`). 

However, this increased rigor has exposed and introduced serious structural flaws. The live ground-truth ledger is provably corrupted in quantity (`2026/10/01/000298` qty 23 vs 25), yet was left unfixed to preserve legacy hash matches. Furthermore, a boolean logic regression in `three_count_reconcile_p2.py` silently bypassed the B-subset verification gate, and the revelation that Khanza ignores `database.ini` in favor of AES-encrypted `database.xml` invalidates every historical clone-mode run prior to P6. The benchmark is sounder than ever before, but it cannot be submitted for peer-reviewed publication with a known corrupted reference ledger and a broken gate exit condition.

**Comparison:** **+14 points vs Run 4795743 (43/100); +14 points vs Run 4769794 (43/100); +22 points vs Run 4701365 (35/100).**

---

### Criterion Scores and Breakdown

| Criterion | Score | Δ vs v5 (R3) | Justification (with Code / Report Evidence) | Biggest Remaining Risk |
|---|:---:|:---:|---|---|
| **Claim-Honesty** | **7 / 10** | +2 | R5 §17 transparently retracts the §16 "misread" denial on the unclosed quote, discloses that all pre-P6 clone runs hit production due to AES `database.xml`, and exposes the latent quantity bug. | The report still claims in §14 that the canonical ledger has zero line-diffs when §17 proves row `2026/10/01/000298` triggers a line delta (`khanza_qty=25 ledger_qty=23`). |
| **Gate-Correctness** | **5 / 10** | +2 | Acceptance suite A1–A18 proves crash recovery, transactional rollback (`ERROR 1644` in A10c), and SHA-256 pre/post consistency on clone `sik_p6f`. | Operator precedence bug in `three_count_reconcile_p2.py` (`gate_pass and not partial or gate_pass and b_verified`) causes any full-window run to exit 0 even if `b_verified=False`. |
| **Oracle-Validity** | **6 / 10** | +3 | `dbutil.session()` single-pipe transaction guarantees atomicity, and A10c proves scratch SHA-256 is preserved byte-for-byte upon mid-build failure. | Pinned ledger `dr_charge_ledger` contains known data corruption (row `...000298` qty 23 vs 25), and rebuilding it cleanly changes 260,800 legacy rows where `source=NULL` becomes `dr_tariff`. |
| **Reproducibility** | **6 / 10** | 0 | The acceptance suite runs 18/18 checks autonomously from `bash p6_acceptance_suite.sh`, logging full hashes and cleanup proofs. | Scratch ledger rebuilding cannot reproduce the pinned ledger byte-for-byte due to schema drift in the `source` column across 260,800 rows outside October. |
| **E2E-Design** | **6 / 10** | +1 | `p6_dbxml.py` retargets Khanza's real JVM form to `sik_p6f` via AES-128-ECB, finally achieving true process isolation for real-form execution. | Hybrid gap: the real Java cashier writes `nota_jalan`, whereas the billing consumer writes `billing`; the harness does not evaluate real cashier settlement end-to-end. |
| **External-Validity** | **4 / 10** | 0 | Section 13 explicitly scopes the benchmark to synthetic DR billing consumer mechanics, acknowledging uncalibrated edge cases. | Real-world billing tiers (embalase/tuslah) are inert in outpatient billing, ~82.7% of revenue is drug-skewed, and multi-tenant live hospital flows remain unaddressed. |

---

### 1. Status of v5 Findings

#### A. Genuinely Fixed and Empirically Demonstrated
1. **Multi-Connection Transaction Vulnerability:**  
   * *Status:* **Genuinely Fixed.**  
   * *Evidence:* `dbutil.py` implements `session()` wrapping a single `mysql` subprocess pipe (`stdin=PIPE`). `build_dr_charge_ledger_p2.py` executes `START TRANSACTION; DELETE...; REPLACE...; COMMIT;` within that single session. Check A10c injected a trigger throwing `SIGNAL SQLSTATE '45000' / ERROR 1644`; the session caught the broken pipe, issued a rollback, exited 1 (`FAIL-CLOSED`), and preserved scratch SHA-256 `504531980ca2...` identically.
2. **Broken `--window ALL` Predicates:**  
   * *Status:* **Genuinely Fixed.**  
   * *Evidence:* The unclosed literal string `"no_rawat LIKE '____/__/__/8_____%"` was removed from both `charge_delta_per_component_p2.py` and `three_count_reconcile_p2.py`, replaced with clean `cohort_predicate()` clauses. `--window ALL` executes cleanly across all 86,455 DR visits without MySQL 1064 syntax errors.
3. **Java Form Isolation & JVM Process Leaking:**  
   * *Status:* **Genuinely Fixed.**  
   * *Evidence:* `p6_dbxml.py` correctly encrypts/decrypts `setting/database.xml` using Khanza's proprietary AES key (`secretKeySpec`), retargeting the Java app to `sik_p6f`. Harness execution wraps Java in a distinct process group (`setsid`), issues `SIGTERM -> sleep 2 -> SIGKILL`, and asserts zero surviving PIDs before running the verified database restore trap.

#### B. Merely Claimed / Incomplete
1. **Zero-Defect Ground Truth (R5 §14):**  
   * *Status:* **Merely Claimed.**  
   * *Evidence:* Section 14 claims the canonical ledger achieves `LINE-DELTA=0`, but §17 reveals that the live pinned ledger has a corrupted quantity on row `2026/10/01/000298` (qty 23 vs 25), triggering a line-delta failure whenever `--line-diff` is executed.

#### C. Still Open
1. **Ground-Truth Schema Drift (`source` Column):**  
   * *Status:* **Open.**  
   * *Evidence:* 260,800 rows outside October carry `source=NULL` in the pinned ledger, whereas the rebuild script sets `source='dr_tariff'`. A full scratch rebuild cannot match the pinned ledger's canonical hash.

---

### 2. New Problems Introduced or Exposed by Wave P6

1. **Operator Precedence Bug in Reconciliation Gate (`three_count_reconcile_p2.py`):**  
   The return expression:
   ```python
   return 0 if (gate_pass and not partial or gate_pass and b_verified) else 1
   ```
   evaluates `(gate_pass and not partial)` first. For any standard full-window run (`partial=False`), if `gate_pass` is true, the function immediately returns `0` regardless of whether `b_verified` passed. The primary multi-source reconciliation check is silently bypassed.
2. **Live Pinned Ledger Inconsistency:**  
   The project has split ground truth into two irreconcilable states: the *live ledger* (which matches historical SHA-256 hashes but contains mathematically impossible data: $23 \times 29,832 = 745,800$, which is false) and the *rebuilt ledger* (which fixes the quantity to 25 but mutates 260,800 `source` strings, breaking the pinned hash).
3. **Invalidation of Historical Empirical Record:**  
   The discovery that Khanza's JVM entirely ignores `database.ini` means that all clone runs across Waves P1–P5 mutated the live database `sik` rather than an isolated scratch clone. All historical isolation claims in prior reports were false.

---

### 3. Top-3 Remaining Issues (Priority Order)

1. **Repair Live Pinned Ledger & Schema Discrepancy:** Correct row `2026/10/01/000298` to `quantity=25` and harmonize the legacy `source=NULL` rows so that a clean rebuild from scratch matches canonical ground truth byte-for-byte.
2. **Fix Gate Operator Precedence:** Correct the return expression in `three_count_reconcile_p2.py` to `return 0 if (gate_pass and (not partial or b_verified)) else 1` (or require explicit `b_verified` across full runs) so that the gate fails closed when reconciliation discrepancies occur.
3. **Close the Real-Cashier Hybrid Oracle Gap:** Implement validation bridging the form's actual output table (`nota_jalan`) with the billing consumer table (`billing`), proving that real cashier settlements match consumer projections.

---

### 4. Top-3 Strongest Properties to Lead With

1. **True Atomic Single-Session Transactional Pipeline:** The `dbutil.session()` pipe provides verified `START TRANSACTION / COMMIT / ROLLBACK` semantics, proven resilient under live fault injection (MySQL 1644 trigger aborts).
2. **Rigorous Process-Group Teardown and Verified Restoration:** The JVM harness utilizes process-group signaling (`setsid`), verified PID death assertions, and content-hash pre/post database state verifications, preventing orphaned-writer data corruption.
3. **High-Integrity Technical Disclosures (§17):** Transparent self-correction of the `database.xml` AES targeting defect and the SQL quote retraction demonstrates commendable scientific honesty and rigorous post-hoc auditing.

---

### 5. Overall Score and Delta

* **Calculation:** $\text{Sum} = 7 + 5 + 6 + 6 + 6 + 4 = 34$  
* **Scaled Score:** $(34 / 60) \times 100 = 56.67 \rightarrow \mathbf{57 / 100}$  
* **Delta vs Run 4701365 (35/100):** **+22 points**  
* **Delta vs Runs 4769794 & 4795743 (43/100):** **+14 points**

---

### 6. Overall Verdict

**Needs targeted rework**

*(The benchmark has achieved executable engineering validity, but cannot be submitted for peer-reviewed publication while the primary gate tooling contains an exit-code logic bypass and the canonical reference ledger contains known, uncorrected data corruption).*

---

### 7. Single Most Important Next Step

**Re-baseline the ground-truth ledger and fix the gate logic:** Correct the boolean precedence in `three_count_reconcile_p2.py`, repair quantity `25` on row `2026/10/01/000298`, backfill `source='dr_tariff'` consistently across all 260,800 rows, and regenerate the canonical SHA-256 hash so that scratch builds and live ground truth are identical, mathematically correct, and strictly enforced by the gate.
