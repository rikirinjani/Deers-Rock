# Astra v12 assessment: dr-khanza-e2e-full-assessment (post P1-P16) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

### 1. Verification of P15 Overclaims, Reviews, and Strike-Throughs
The independent review of P15 scored the wave **17/24** against the executor’s **23/24**, uncovering 8 distinct operational defects (N1–N8) and substantial overclaiming:
- **N1 (Trap placement in preservation check):** Claimed "every validation runs before EXIT trap" in P15 was false for `p10_preservation_check.sh:70`, where unconditional revocation of grants occurred before validation.
- **N2 (Unquoted timestamp):** Claimed boundary testing at run start was actually split at whitespace (`--since $SINCE`), testing only against midnight (`"since": "2026-10-26"`).
- **N3 (Fresh-B window loophole):** Ignored stale pre-run INSERTs by counting only `at >= since`.
- **N4 (Payment coercion):** Coerced NULL payments via `COALESCE(besar_bayar,0)`, violating the asserted B4 specification.
- **N5 (Masked restore failure in A28'):** Claimed "the restore result is asserted", yet `$R28` was merely printed and unconditional `-5` compensation masked failures.
- **N6 (Switch truthiness):** Claimed exact-`1` activation, but the suite coerced any non-empty string (`=0`) to `=1`.
- **N7 (Inexact count assertion):** B6 asserted `>= 1` rather than exact counts.
- **N8 (Process group signalling):** `kill -TERM -- -$pid` risked sending signals to arbitrary reused PIDs.

In P16, the owner formally admitted these oversights, annotated the previous claims with strike-throughs in R5 §27/§28, and backed each fix with an asserted differential run between `.bak_p16_20261026/` and current bytes.

### 2. Math Check: Clopper-Pearson Exact Confidence Intervals
For $n = 300$, $k = 0$ non-matching encounters under simple random sampling:
- **One-sided 95% upper limit:**
  $$\alpha = 0.05 \implies U = 1 - \alpha^{1/n} = 1 - (0.05)^{1/300} = 1 - 0.9900599 = 0.0099401 \implies \mathbf{0.994\%} \approx \mathbf{0.99\%}$$
- **Two-sided 95% upper limit ($\alpha/2 = 0.025$):**
  $$U = 1 - (\alpha/2)^{1/n} = 1 - (0.025)^{1/300} = 1 - 0.9877817 = 0.0122183 \implies \mathbf{1.222\%} \approx \mathbf{1.22\%}$$
Both figures reported in the transcripts and docs ($0.99\%$ one-sided, $1.22\%$ two-sided) are mathematically exact.

### 3. P16 Defect Disclosure and Residual Gaps
The executor documented a patch defect in P16 chain 1: gluing `: > /tmp/p15nc_empty.txt` onto an `echo` line resulted in an exit code of 1 instead of 2 for B4 (`32/33` passed, line NC exit 1). This failure was recorded in `records/failures/20261026T1500Z-test-r5-p16-b4-empty-list-control-glued-echo`, corrected via manifest b, and rerun to clean execution (`33/33`).

However, residual claim issues remain:
- **Unevidenced P14 Lock Release:** Acknowledged in R5 §28 ("the P14 release remains unevidenced").
- **P12 Payment Coercion:** `p12_perencounter_reconcile.py` continues to utilize `COALESCE` on payments. While documented under "NOT claimed," leaving an established defect in an audited reconciliation tool weakens claim consistency.
- **A5/A6 Wiring vs Full Injected Run:** P16 self-scores R2 at 1 because A5/A6 are validated via shell wiring extractions with stubs, not a live execution with an injected failure.

The wave demonstrates high transparency: admissions of error are supported by failure records and differential transcripts.

### Score: 8.5/10

---

## GATE-CORRECTNESS

### 1. Driver Safety: `p15_lib.sh` and Runner Architecture
Validation logic now executes before the shell traps:
- `p14_edge_run.sh:81-89` validates fixture presence, non-empty visit lists, `database.xml` alignment, clone absence, and free disk space before `trap cleanup EXIT` is installed at line 90.
- `p15_lib.sh:22-38` (`p15_kill_run_harness`) mitigates PID reuse hazards by asserting process group leadership (`pg == pid`) and creation time relative to the PID file:
  ```bash
  st=$(date -d "$(ps -o lstart= -p "$pid" 2>/dev/null)" +%s 2>/dev/null); fm=$(stat -c %Y "$f" 2>/dev/null)
  { [ -n "$st" ] && [ -n "$fm" ] && [ "$st" -le $((fm + 1)) ]; } || continue
  kill -TERM -- -"$pid" 2>/dev/null
  ```
- Integer stop-rule truncation is eliminated in `p15_lib.sh:6-9`:
  ```bash
  [ "$total" -gt 0 ] && [ $(( bad * 100 )) -gt $(( 2 * total )) ]
  ```
  This correctly detects 7 failures out of 300 ($2.33\% > 2\%$), where the former shell integer division evaluated $7 \times 100 / 300 = 2$, failing to trip the $>2\%$ check.

### 2. Line Identity Comparator: `p15_line_identity.py`
The circularity identified in v11 (where actual charge codes were inferred using candidate keys found in the expected ledger `L`) has been excised:
```python
cand = (pm if c == "procedure" else dm).get(nm, set())
if len(cand) == 1:
    code, how = next(iter(cand)), "name"
elif len(cand) > 1:
    insrc = sorted(k for k in cand if k in S.get(c, set()))  # C1: source rows only
    if len(insrc) == 1:
        code, how = insrc[0], "src"
    else:
        code, how = "AMBIGUOUS:" + nm, "ambiguous"
```
The mapping relies exclusively on the visit's raw input rows (`rawat_jl_dr` and `detail_pemberian_obat`). Any ambiguity assigns `AMBIGUOUS`, which rejects the run.

`--expect` mode enforcement in `p15_line_identity.py:229-231` now asserts full system state:
```python
ok_all = (delta == want and line_ok and fresh and b_eq_a
          and rec["form_model"] == "MATCH" and rec["ledger_model"] == "MATCH")
```
It rejects runs where payments diverge (`b_eq_a`), billing lines differ from predicted form models, or ledger states differ from predicted ledger models.

### 3. Fresh-B Semantics
The fresh-B predicate in `p15_line_identity.py:140-144, 204` resolves the timing vulnerability:
```python
win = ("at >= '%s'" % since) if since else "1"
# SQL queries count total INSERTs across all time (n_all), those by benchmark@ (n_bench),
# and those occurring at or after `since` (n_win)
fresh = (not fresh_required) or (fb[0] == 1 and fb[1] == 1 and fb[2] == 1)
```
This requires that `p7_write_audit` records exactly one INSERT on `detail_nota_jalan` for the encounter across the lifetime of the table, that it originated from `benchmark@localhost`, and that its timestamp falls within the run window. Plant B5c (inserting at `since - 1 µs`) fails as `MISMATCH` on current bytes while passing on P15 bytes.

### 4. Remaining Gate Defects and Control Limitations
- **A5/A6 Driver Controls:** Validated via extracted bash slices in `p16_a_negctl.sh` using stubbed oracle functions rather than a live failure injection in an active run. This tests bash branching syntax, but does not test runtime interactions with JVM termination, signal handling, or live lock management during a stop-rule event.
- **Multiset Gaps:** Line-item validation groups by `(component, code)`. Multiple entries for identical items collapse into an aggregated quantity and amount. Split distributions across identical codes remain unvalidated at an individual line level.

### Score: 8.5/10

---

## ORACLE-VALIDITY

### 1. Independence and Line-Level Identification
The primary oracle vulnerability in v11 was circularity: `p14_line_identity.py` utilized the expected ledger to pick actual charge codes during display-name collisions (`EQUAL-CTX`). In `p15_line_identity.py`, this is resolved via `EQUAL-SRC`, which looks exclusively at raw clinical tables (`rawat_jl_dr`, `detail_pemberian_obat`). In the C4 real-encounter rerun (300 visits, 1,240 billing lines):
- **181 encounters** resolved unambiguously by display name (`EQUAL`).
- **119 encounters** had colliding display names but resolved uniquely via raw source rows (`EQUAL-SRC`).
- **0 encounters** were `AMBIGUOUS`.

The plant in C2 (`900026`, where `J000840` was replaced with colliding, same-price `J000844` in the ledger) demonstrated that the old comparator produced `EQUAL-CTX` and `MATCH`, whereas the new comparator produced `DIFFER` and `MISMATCH`.

### 2. Residual Oracle Limitations
- **The Stated Display-Name Blindspot (C3 Stretch):** Khanza's `billing` table stores display strings (`nm_perawatan`), omitting the definitive catalog code (`kd_jenis_prw`/`kode_brng`). If the form bills an incorrect catalog item that shares an identical display name with the item in the clinical source record, `EQUAL-SRC` will evaluate the match as correct. Resolving this requires dumping the form UI's internal Java data model (`C3`), which remains unexecuted.
- **Coupled Validation Hashing (X2):** `p10_hash_state.py` still imports the oracle's core module (`import sampled_real_form_diff_r5 as o`), sharing table definitions and SQL serialization logic between the test harness and the independent validator.
- **Payment Settlement Scope:** Population-scale settlement verification is still bounded to the 300-encounter edge set and the 3,330-encounter P13 sample (covering $3.9\%$ of the eligible 85,387 DR outpatient visits).

The oracle is technically sound for the claims made, but the architectural limits of the target database enforce a ceiling on charge code verification.

### Score: 8.0/10

---

## REPRODUCIBILITY

### 1. Packaging, Immutability, and State Management
Discipline around immutable artifacts has improved:
- **Manifest Rigor:** Manifest b (`evidence/p16/r5_p16_frozen_manifest_20261026b.sha256`) pins 22 frozen tools. Transcripts explicitly verify that all 22 carry the immutable flag (`lsattr` showing `----i---------e-------`).
- **Run Lock Traceability:** Lock states are now captured immediately prior to acquisition (`RUNLOCK-FREE` at 14:02:04Z in `evidence/p16/lock_free_and_lsattr_before.txt`) and upon completion (`RUNLOCK-RELEASED` then `RUNLOCK-FREE` at 15:01:16Z in `evidence/p16/lock_release.txt`).
- **Differential Verification:** All negative controls execute against verified historical bytes stored in `.bak_p15_20261026/` and `.bak_p16_20261026/`, demonstrating deterministic failure on legacy code and passing on current code.
- **Deterministic Clones:** Full ledger reconstruction (`356,355` rows, hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`) was confirmed on fresh clone `sik_p14e` in both P15 and P16 chains.

### 2. Remaining Reproducibility Blockers
- **Single Hardware Dependency:** The environment remains pinned to a single VPS instance (`mac-mini-vultr`), which is slated for decommission around ~2026-11-20.
- **Absence of Clean-Box Rebuild:** The release manifest acknowledges that D1 was an overclaim ("repeatable on the existing installation", not "re-derivable without the original live box"). The proprietary Khanza source tree, database dumps, and compilation dependencies have not been reconstructed from scratch on a clean, isolated host.
- **Unchecked Historical Data:** The P14 lock release remains unevidenced.

The harness provides high within-box auditability, but external execution by an independent party remains blocked by environment capture.

### Score: 7.0/10

---

## E2E-DESIGN

### 1. End-to-End Architecture Progression
The E2E evaluation design has developed a coherent multi-tiered structure:
1. **Tier 1 (Macro Reconciliation):** A-to-C comparison across 86,455 encounters with zero delta.
2. **Tier 2 (Headless UI Form Execution):** Headless Java Swing harness execution on real clinical screens (`DlgBilingRalan`), writing live settlement records across 3,330 encounters ($3.9\%$ of the cohort) with audited trigger attribution (`benchmark@localhost`).
3. **Tier 3 (Granular Line-Level Identity):** 300 real encounters plus 27 edge fixtures evaluated line-by-line across quantities, unit prices, tambahan, and amounts, with collisions resolved via clinical source tables.
4. **Tier 4 (Adversarial Edge Suite):** 27 authored edge visits probing zero-cost procedures, fractional quantities, negative values, and tax edge cases.

### 2. Weakest Structural Elements
- **Display-Name Intermediary:** The system relies on string-based mapping between `billing.nm_perawatan` and catalog tables. The billing pipeline writes display strings rather than immutable IDs, leaving an unavoidable gap where code-level mutations under identical display names remain undetectable without UI model introspection (`C3`).
- **Integration of the Stop Rule:** The driver stop rule was verified through unit tests of `p15_lib.sh` and bash tail extractions in `p16_a_negctl.sh`. It has not been validated through an end-to-end failure injection that triggers during live Swing form automation.
- **Payment Coercion in P12:** The P12 reconcile script still processes payments via `COALESCE`, leaving historical reconciliation tools out of alignment with the stricter input validation applied to newer comparators.

The design supports rigorous verification of financial consistency between Khanza's form engine and the consumer, within the bounds of Khanza's underlying schema.

### Score: 8.0/10

---

## EXTERNAL-VALIDITY

### 1. Coverage, Cohort Calibration, and Realism
External validity remains the most constrained dimension of the benchmark, as acknowledged in R5 §13 (RC-9):
- **Cohort Homogeneity:** The dataset is restricted to synthetic outpatient visits from a single billing month (October 2026) within a single medical specialty configuration. Inpatient workflows, complex multi-payer splits, deposits, and returns are absent.
- **Clinical and Tariff Realism:**
  - Diagnoses are uncalibrated (the top diagnoses query is benchmark-authored and uncalibrated against ICD-10 distributions).
  - Revenue distribution is heavily skewed: drugs account for $\sim 82.7\%$ of total revenue (PPN-inclusive), which is uncharacteristic of standard outpatient operations.
  - The tariff model is simplified: all encounters feature exactly one procedure, zero embalase/tuslah, and a fixed registration fee (`biaya_reg = 10000`).
- **Single-System Boundary:** The setup is evaluated against a single Khanza version (`dist/SIMRSKhanza.jar` SHA `34b0d77e...`) running on a specific MySQL 8.0.46 configuration.

### 2. Scope Honesty
The benchmark does not claim generalizability. R5 §12/§13 explicitly states that external validity (C1–C4: diagnosis calibration, burst performance, payer mix, second HMS) is **NOT TESTED**. The documentation treats the benchmark as a synthetic installation consistency study rather than a proof of real-world billing correctness.

### Score: 4.5/10

---

## SYNTHESIS & RE-SCORE

### Comparison Across Waves

| Criterion | v10 | v11 | Current (v12) | Delta (v11 $\to$ v12) |
|---|:---:|:---:|:---:|:---:|
| **Claim-Honesty** | 7.0 | 7.0 | **8.5** | +1.5 |
| **Gate-Correctness** | 6.5 | 6.0 | **8.5** | +2.5 |
| **Oracle-Validity** | 7.5 | 7.5 | **8.0** | +0.5 |
| **Reproducibility** | 6.0 | 6.5 | **7.0** | +0.5 |
| **E2E-Design** | 7.0 | 8.0 | **8.0** | 0.0 |
| **External-Validity** | 4.0 | 4.5 | **4.5** | 0.0 |
| **Overall Score** | **63** | **66** | **74** | **+8** |

$$\text{Final Score} = \operatorname{round}\left(\frac{8.5 + 8.5 + 8.0 + 7.0 + 8.0 + 4.5}{6} \times 10\right) = \operatorname{round}(74.17) = \mathbf{74 / 100}$$

### Verdict
**Accept (Scoped).**

The system has progressed from an unreliable acceptance framework with circular logic into a **defensible, rigorously bounded consistency study**. Waves P15 and P16 resolved the primary architectural vulnerabilities identified in v11:
1. Circular identity resolution (`EQUAL-CTX`) has been replaced with clinical source-row resolution (`EQUAL-SRC`), accompanied by negative controls proving detection of same-name, same-price code mutations.
2. The fresh-B audit rule has been tightened to require exactly one lifetime insertion by the benchmark account, eliminating the timing window loophole.
3. Driver safety logic (lock verification, trap installation, run-scoped process group tracking, and integer-safe stop arithmetic) has been largely corrected in code and demonstrated through differential failure tests.

### Top Remaining Issues
1. **Third-Home Migration:** The existing hosting environment terminates in November 2026. A clean rebuild from external source archives remains unexecuted.
2. **Form Data Model Extraction (C3):** Validating charge codes behind colliding display names without relying on source-row inference requires dumping the UI form's underlying data model directly from the harness.
3. **End-to-End Stop-Rule Failure Injection:** The driver stop rule must be exercised through a live failure injected into an active form automation run, rather than relying solely on bash script wiring tests.

## VERDICT

### 1. Criteria Breakdown & Deltas

#### 1. Claim-Honesty: 8.5 / 10
* **Progression & Delta:** 4 $\to$ 5 $\to$ 5 $\to$ 6 $\to$ 6 $\to$ 6 $\to$ 7 $\to$ 7 $\to$ 7 $\to$ **8.5** (+1.5 vs v11; +4.5 overall)
* **Justification:** The author formally retracted prior overclaims across eight specific items (N1–N8) with explicit strikethroughs in R5 §27/§28, published exact Clopper-Pearson confidence limits ($0.99\%$ 1-sided, $1.22\%$ 2-sided for $n=300, k=0$), and logged the P16 glued-echo patch failure directly in `records/failures/20261026T1500Z-test-r5-p16-b4-empty-list-control-glued-echo`.
* **Biggest Remaining Risk:** Established utility tools like `p12_perencounter_reconcile.py` still retain silent `COALESCE` payment coercion under a formal "NOT claimed" disclaimer rather than bringing all legacy scripts up to the new strictness standard.

---

#### 2. Gate-Correctness: 8.5 / 10
* **Progression & Delta:** 3 $\to$ 3 $\to$ 3 $\to$ 5 $\to$ 6 $\to$ 6 $\to$ 6 $\to$ 6.5 $\to$ 6 $\to$ **8.5** (+2.5 vs v11; +5.5 overall)
* **Justification:** Gates enforce strict full-system consistency in `p15_line_identity.py:229-231` (`ok_all = delta == want and line_ok and fresh and b_eq_a and rec["form_model"] == "MATCH" and rec["ledger_model"] == "MATCH"`), while the fresh-B gate (`p15_line_identity.py:140-144`) requires exactly one lifetime write on `detail_nota_jalan` by `benchmark@localhost`.
* **Biggest Remaining Risk:** Driver abort rules (A5/A6) were validated through bash-slice extractions in `p16_a_negctl.sh` using stubbed oracles, leaving runtime interactions with real JVM crashes, signals, and locks during live execution unverified under true failure injection.

---

#### 3. Oracle-Validity: 8.0 / 10
* **Progression & Delta:** 4 $\to$ 4 $\to$ 3 $\to$ 5 $\to$ 6 $\to$ 7 $\to$ 7 $\to$ 7.5 $\to$ 7.5 $\to$ **8.0** (+0.5 vs v11; +4.0 overall)
* **Justification:** Circular identification (`EQUAL-CTX`) was fully excised in favor of raw clinical table sourcing (`EQUAL-SRC` via `rawat_jl_dr` and `detail_pemberian_obat`), proven by plant C2 (`900026`) where swapping `J000840` for identical-price `J000844` failed on new bytes while passing on legacy bytes.
* **Biggest Remaining Risk:** Because Khanza's `billing` table persists display strings (`nm_perawatan`) rather than catalog IDs, any UI bug billing a wrong catalog item that shares an exact display name with a source item remains undetectable without introspecting the Swing UI form model (the unexecuted C3 extension).

---

#### 4. Reproducibility: 7.0 / 10
* **Progression & Delta:** 3 $\to$ 5 $\to$ 6 $\to$ 5 $\to$ 6 $\to$ 6 $\to$ 6 $\to$ 6 $\to$ 6.5 $\to$ **7.0** (+0.5 vs v11; +4.0 overall)
* **Justification:** Manifest b (`r5_p16_frozen_manifest_20261026b.sha256`) cryptographically pins 22 frozen tools with immutable flags (`lsattr ----i-`), paired with explicit lock lifecycles (`evidence/p16/lock_free_and_lsattr_before.txt` to `lock_release.txt`) and exact ledger reconstruction (`356,355` rows, hash `a66a...eea7`).
* **Biggest Remaining Risk:** The harness remains completely bound to a single un-containerized VPS instance (`mac-mini-vultr`) scheduled for decommissioning around 2026-11-20, without a validated clean-box derivation procedure from raw upstream sources.

---

#### 5. E2E-Design: 8.0 / 10
* **Progression & Delta:** 4 $\to$ 5 $\to$ 5 $\to$ 6 $\to$ 7 $\to$ 7 $\to$ 7 $\to$ 7 $\to$ 8 $\to$ **8.0** (0.0 vs v11; +4.0 overall)
* **Justification:** The architecture enforces a coherent 4-tier hierarchy combining macro-reconciliation (86,455 encounters), headless Swing form automation with database write auditing (3,330 encounters), source-derived line identification (300 encounters, 1,240 lines), and 27 adversarial edge fixtures.
* **Biggest Remaining Risk:** Line-item reconciliation aggregates components by `(component, code)`, meaning duplicate entries of identical codes collapse into a total quantity and amount, leaving split line distributions unverified.

---

#### 6. External-Validity: 4.5 / 10
* **Progression & Delta:** 3 $\to$ 4 $\to$ 4 $\to$ 4 $\to$ 4 $\to$ 4 $\to$ 4 $\to$ 4 $\to$ 4.5 $\to$ **4.5** (0.0 vs v11; +1.5 overall)
* **Justification:** The documentation in R5 §12/§13 explicitly disclaims external validity (C1–C4: diagnosis calibration, burst performance, payer mix, second HMS marked as NOT TESTED), appropriately framing the benchmark as an in-situ billing engine consistency verification rather than an empirical clinical pricing study.
* **Biggest Remaining Risk:** Results cannot be generalized beyond single-encounter, single-cashier ralan workflows on this specific snapshot of SIMKES Khanza.

---

### 2. Status of v11 Findings in P15–P16

#### A. Genuinely Fixed (Code verified + old-vs-new asserted runs)
1. **Oracle Circularity (N1):** Removed `EQUAL-CTX` candidate resolution via ledger $L$; implemented `EQUAL-SRC` in `p15_line_identity.py:108-116` resolving strictly against `rawat_jl_dr` and `detail_pemberian_obat`. Differential test C2 (`900026`) confirmed legacy P14 passed as `MATCH` while current P16 threw `DIFFER`/`MISMATCH`.
2. **Fresh-B Timing Loophole (N2):** Rewrote `fresh-B` predicate in `p15_line_identity.py:140-144` to require $fb = (1, 1, 1)$ (total lifetime insertions $=1$, authored by `benchmark@localhost` $=1$, inside window $=1$). Plant B5c (inserting at `since - 1 µs`) fails on current bytes while passing on P15 bytes.
3. **Restore Masking in A28' (N5):** Removed unconditional `-5` compensation; checked `$R28` exit status explicitly. Differential run B2 confirmed failure detection.
4. **Boolean Truthiness Coercion (N6):** Enforced exact string comparison `== "1"` instead of generic non-empty truthiness checks. Tested via negative control B7.
5. **Inexact Count Assertions (N7):** Replaced `>= 1` loose checks in B6 with exact integer counts.

#### B. Merely Claimed / Partially Handled
1. **Driver Stop Rule Live Injection (N3 / A5/A6):** Driver abort logic was refactored with proper signal handlers and integer comparison, but testing was conducted via static bash extraction (`p16_a_negctl.sh`) using dummy stubs, rather than triggering a live failure inside a running Swing headless worker.
2. **Process Group Signalling (N8):** `kill -TERM -- -$pid` syntax was audited and refined, but isolation without Linux cgroups or pid namespaces still leaves corner-case risks during rapid PID cycling.

#### C. Still Open
1. **Display-Name Collision Blindspot (C3):** Mapping still depends on `nm_perawatan` strings because the `billing` table does not persist catalog codes. UI model introspection (`C3`) was deferred.
2. **Historical P14 Lock Release:** Acknowledged in R5 §28 as unevidenced.
3. **P12 Payment Coercion:** `COALESCE` remains in `p12_perencounter_reconcile.py`.

---

### 3. New Problems Introduced or Exposed in P15–P16

1. **Glued Echo Patch Syntax Bug:** In P16 chain 1, chaining `: > /tmp/p15nc_empty.txt` directly to an `echo` statement altered exit code semantics (yielding exit code 1 instead of 2 for B4), requiring an emergency manifest update (`manifest b`).
2. **Hashing Module Cross-Coupling (X2):** `p10_hash_state.py` directly executes `import sampled_real_form_diff_r5 as o`, coupling the state verification logic with the test execution logic and compromising validator independence.
3. **Immutable Manifest Fragility:** With 22 tools locked via `chattr +i`, hot-patching syntax errors during test runs invalidates SHA-256 manifests across the toolchain, increasing release friction.

---

### 4. Top-3 Remaining Issues (Priority Order)

1. **Environment Evaporation Risk (VPS Expiry ~Nov 2026):** The benchmark lacks an automated containerized build (Docker/Vagrant) to rebuild the proprietary Khanza binaries, MySQL schemas, and Java Swing dependencies from scratch on a clean machine.
2. **Absence of In-Flight Stop-Rule Failure Injection:** The driver abort and rollback mechanisms must be demonstrated against a simulated JVM segfault/SIGKILL during an active headless write transaction, not merely via stubbed bash scripts.
3. **Display-Name Catalog Code Blindspot:** Implementing C3 (extracting catalog IDs directly from `DlgBilingRalan`'s internal Swing table model) is necessary to close the loophole where identically named catalog items could mask pricing discrepancies.

---

### 5. Top-3 Strongest Properties to Lead With

1. **Adversarial Differential Verification:** Every negative control is verified on both old and new code, proving that historical bypasses (e.g., circular matching, stale audit rows, suppressed errors) genuinely fail on the current codebase.
2. **Source-Derived Line Identity (`EQUAL-SRC`):** Eliminating circular reliance on expected ledgers by cross-referencing raw input tables (`rawat_jl_dr`, `detail_pemberian_obat`) provides robust billing verification within the schema's limits.
3. **Exemplary Defect Transparency:** Detailed logging of actual test failures, explicit retractions in R5 §27/§28, and mathematically exact Clopper-Pearson confidence calculations establish strong scientific credibility.

---

### 6. Overall Score & Deltas

* **Current Score:** **74 / 100**
  $$\text{Scaled Score} = \operatorname{round}\left(\frac{8.5 + 8.5 + 8.0 + 7.0 + 8.0 + 4.5}{6} \times 10\right) = \operatorname{round}(74.17) = \mathbf{74}$$

* **Historical Deltas:**
  * vs Run 1 (4701365): **+39** (35 $\to$ 74)
  * vs Run 2 (4769794): **+31** (43 $\to$ 74)
  * vs Run 3 (4795743): **+31** (43 $\to$ 74)
  * vs Run 4 (4818826): **+22** (52 $\to$ 74)
  * vs Run 5 (v7 runs 4880158+4894730): **+16** (58 $\to$ 74)
  * vs Run 6 (v8 run 4897654): **+14** (60 $\to$ 74)
  * vs Run 7 (v9 run 4898353): **+12** (62 $\to$ 74)
  * vs Run 8 (v10 run 4918967): **+11** (63 $\to$ 74)
  * vs Run 9 (v11 run 5496287): **+8** (66 $\to$ 74)

---

### 7. Overall Verdict

**Needs targeted rework**

*Verdict Justification:* The technical foundation, oracle mechanics, and honesty around claims have reached publication quality. However, submission cannot be recommended while the system is tied to a single VPS instance facing decommission in under a month without an automated, portable clean-box reproduction harness.

---

### 8. Single Most Important Next Step

**Containerize the entire deployment pipeline into a self-contained Docker Compose or Vagrant environment** (packaging the base OS, pinned Java 8 JDK, MySQL 5.7 instance, database schema migration scripts, and compiled Khanza JARs) and execute a successful end-to-end audit run on a completely fresh, external machine.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

### 1. Verification of P15 Overclaims, Reviews, and Strike-Throughs
The independent review of P15 scored the wave **17/24** against the executor’s **23/24**, uncovering 8 distinct operational defects (N1–N8) and substantial overclaiming:
- **N1 (Trap placement in preservation check):** Claimed "every validation runs before EXIT trap" in P15 was false for `p10_preservation_check.sh:70`, where unconditional revocation of grants occurred before validation.
- **N2 (Unquoted timestamp):** Claimed boundary testing at run start was actually split at whitespace (`--since $SINCE`), testing only against midnight (`"since": "2026-10-26"`).
- **N3 (Fresh-B window loophole):** Ignored stale pre-run INSERTs by counting only `at >= since`.
- **N4 (Payment coercion):** Coerced NULL payments via `COALESCE(besar_bayar,0)`, violating the asserted B4 specification.
- **N5 (Masked restore failure in A28'):** Claimed "the restore result is asserted", yet `$R28` was merely printed and unconditional `-5` compensation masked failures.
- **N6 (Switch truthiness):** Claimed exact-`1` activation, but the suite coerced any non-empty string (`=0`) to `=1`.
- **N7 (Inexact count assertion):** B6 asserted `>= 1` rather than exact counts.
- **N8 (Process group signalling):** `kill -TERM -- -$pid` risked sending signals to arbitrary reused PIDs.

In P16, the owner formally admitted these oversights, annotated the previous claims with strike-throughs in R5 §27/§28, and backed each fix with an asserted differential run between `.bak_p16_20261026/` and current bytes.

### 2. Math Check: Clopper-Pearson Exact Confidence Intervals
For $n = 300$, $k = 0$ non-matching encounters under simple random sampling:
- **One-sided 95% upper limit:**
  $$\alpha = 0.05 \implies U = 1 - \alpha^{1/n} = 1 - (0.05)^{1/300} = 1 - 0.9900599 = 0.0099401 \implies \mathbf{0.994\%} \approx \mathbf{0.99\%}$$
- **Two-sided 95% upper limit ($\alpha/2 = 0.025$):**
  $$U = 1 - (\alpha/2)^{1/n} = 1 - (0.025)^{1/300} = 1 - 0.9877817 = 0.0122183 \implies \mathbf{1.222\%} \approx \mathbf{1.22\%}$$
Both figures reported in the transcripts and docs ($0.99\%$ one-sided, $1.22\%$ two-sided) are mathematically exact.

### 3. P16 Defect Disclosure and Residual Gaps
The executor documented a patch defect in P16 chain 1: gluing `: > /tmp/p15nc_empty.txt` onto an `echo` line resulted in an exit code of 1 instead of 2 for B4 (`32/33` passed, line NC exit 1). This failure was recorded in `records/failures/20261026T1500Z-test-r5-p16-b4-empty-list-control-glued-echo`, corrected via manifest b, and rerun to clean execution (`33/33`).

However, residual claim issues remain:
- **Unevidenced P14 Lock Release:** Acknowledged in R5 §28 ("the P14 release remains unevidenced").
- **P12 Payment Coercion:** `p12_perencounter_reconcile.py` continues to utilize `COALESCE` on payments. While documented under "NOT claimed," leaving an established defect in an audited reconciliation tool weakens claim consistency.
- **A5/A6 Wiring vs Full Injected Run:** P16 self-scores R2 at 1 because A5/A6 are validated via shell wiring extractions with stubs, not a live execution with an injected failure.

The wave demonstrates high transparency: admissions of error are supported by failure records and differential transcripts.

### Score: 8.5/10

---

## GATE-CORRECTNESS

### 1. Driver Safety: `p15_lib.sh` and Runner Architecture
Validation logic now executes before the shell traps:
- `p14_edge_run.sh:81-89` validates fixture presence, non-empty visit lists, `database.xml` alignment, clone absence, and free disk space before `trap cleanup EXIT` is installed at line 90.
- `p15_lib.sh:22-38` (`p15_kill_run_harness`) mitigates PID reuse hazards by asserting process group leadership (`pg == pid`) and creation time relative to the PID file:
  ```bash
  st=$(date -d "$(ps -o lstart= -p "$pid" 2>/dev/null)" +%s 2>/dev/null); fm=$(stat -c %Y "$f" 2>/dev/null)
  { [ -n "$st" ] && [ -n "$fm" ] && [ "$st" -le $((fm + 1)) ]; } || continue
  kill -TERM -- -"$pid" 2>/dev/null
  ```
- Integer stop-rule truncation is eliminated in `p15_lib.sh:6-9`:
  ```bash
  [ "$total" -gt 0 ] && [ $(( bad * 100 )) -gt $(( 2 * total )) ]
  ```
  This correctly detects 7 failures out of 300 ($2.33\% > 2\%$), where the former shell integer division evaluated $7 \times 100 / 300 = 2$, failing to trip the $>2\%$ check.

### 2. Line Identity Comparator: `p15_line_identity.py`
The circularity identified in v11 (where actual charge codes were inferred using candidate keys found in the expected ledger `L`) has been excised:
```python
cand = (pm if c == "procedure" else dm).get(nm, set())
if len(cand) == 1:
    code, how = next(iter(cand)), "name"
elif len(cand) > 1:
    insrc = sorted(k for k in cand if k in S.get(c, set()))  # C1: source rows only
    if len(insrc) == 1:
        code, how = insrc[0], "src"
    else:
        code, how = "AMBIGUOUS:" + nm, "ambiguous"
```
The mapping relies exclusively on the visit's raw input rows (`rawat_jl_dr` and `detail_pemberian_obat`). Any ambiguity assigns `AMBIGUOUS`, which rejects the run.

`--expect` mode enforcement in `p15_line_identity.py:229-231` now asserts full system state:
```python
ok_all = (delta == want and line_ok and fresh and b_eq_a
          and rec["form_model"] == "MATCH" and rec["ledger_model"] == "MATCH")
```
It rejects runs where payments diverge (`b_eq_a`), billing lines differ from predicted form models, or ledger states differ from predicted ledger models.

### 3. Fresh-B Semantics
The fresh-B predicate in `p15_line_identity.py:140-144, 204` resolves the timing vulnerability:
```python
win = ("at >= '%s'" % since) if since else "1"
# SQL queries count total INSERTs across all time (n_all), those by benchmark@ (n_bench),
# and those occurring at or after `since` (n_win)
fresh = (not fresh_required) or (fb[0] == 1 and fb[1] == 1 and fb[2] == 1)
```
This requires that `p7_write_audit` records exactly one INSERT on `detail_nota_jalan` for the encounter across the lifetime of the table, that it originated from `benchmark@localhost`, and that its timestamp falls within the run window. Plant B5c (inserting at `since - 1 µs`) fails as `MISMATCH` on current bytes while passing on P15 bytes.

### 4. Remaining Gate Defects and Control Limitations
- **A5/A6 Driver Controls:** Validated via extracted bash slices in `p16_a_negctl.sh` using stubbed oracle functions rather than a live failure injection in an active run. This tests bash branching syntax, but does not test runtime interactions with JVM termination, signal handling, or live lock management during a stop-rule event.
- **Multiset Gaps:** Line-item validation groups by `(component, code)`. Multiple entries for identical items collapse into an aggregated quantity and amount. Split distributions across identical codes remain unvalidated at an individual line level.

### Score: 8.5/10

---

## ORACLE-VALIDITY

### 1. Independence and Line-Level Identification
The primary oracle vulnerability in v11 was circularity: `p14_line_identity.py` utilized the expected ledger to pick actual charge codes during display-name collisions (`EQUAL-CTX`). In `p15_line_identity.py`, this is resolved via `EQUAL-SRC`, which looks exclusively at raw clinical tables (`rawat_jl_dr`, `detail_pemberian_obat`). In the C4 real-encounter rerun (300 visits, 1,240 billing lines):
- **181 encounters** resolved unambiguously by display name (`EQUAL`).
- **119 encounters** had colliding display names but resolved uniquely via raw source rows (`EQUAL-SRC`).
- **0 encounters** were `AMBIGUOUS`.

The plant in C2 (`900026`, where `J000840` was replaced with colliding, same-price `J000844` in the ledger) demonstrated that the old comparator produced `EQUAL-CTX` and `MATCH`, whereas the new comparator produced `DIFFER` and `MISMATCH`.

### 2. Residual Oracle Limitations
- **The Stated Display-Name Blindspot (C3 Stretch):** Khanza's `billing` table stores display strings (`nm_perawatan`), omitting the definitive catalog code (`kd_jenis_prw`/`kode_brng`). If the form bills an incorrect catalog item that shares an identical display name with the item in the clinical source record, `EQUAL-SRC` will evaluate the match as correct. Resolving this requires dumping the form UI's internal Java data model (`C3`), which remains unexecuted.
- **Coupled Validation Hashing (X2):** `p10_hash_state.py` still imports the oracle's core module (`import sampled_real_form_diff_r5 as o`), sharing table definitions and SQL serialization logic between the test harness and the independent validator.
- **Payment Settlement Scope:** Population-scale settlement verification is still bounded to the 300-encounter edge set and the 3,330-encounter P13 sample (covering $3.9\%$ of the eligible 85,387 DR outpatient visits).

The oracle is technically sound for the claims made, but the architectural limits of the target database enforce a ceiling on charge code verification.

### Score: 8.0/10

---

## REPRODUCIBILITY

### 1. Packaging, Immutability, and State Management
Discipline around immutable artifacts has improved:
- **Manifest Rigor:** Manifest b (`evidence/p16/r5_p16_frozen_manifest_20261026b.sha256`) pins 22 frozen tools. Transcripts explicitly verify that all 22 carry the immutable flag (`lsattr` showing `----i---------e-------`).
- **Run Lock Traceability:** Lock states are now captured immediately prior to acquisition (`RUNLOCK-FREE` at 14:02:04Z in `evidence/p16/lock_free_and_lsattr_before.txt`) and upon completion (`RUNLOCK-RELEASED` then `RUNLOCK-FREE` at 15:01:16Z in `evidence/p16/lock_release.txt`).
- **Differential Verification:** All negative controls execute against verified historical bytes stored in `.bak_p15_20261026/` and `.bak_p16_20261026/`, demonstrating deterministic failure on legacy code and passing on current code.
- **Deterministic Clones:** Full ledger reconstruction (`356,355` rows, hash `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`) was confirmed on fresh clone `sik_p14e` in both P15 and P16 chains.

### 2. Remaining Reproducibility Blockers
- **Single Hardware Dependency:** The environment remains pinned to a single VPS instance (`mac-mini-vultr`), which is slated for decommission around ~2026-11-20.
- **Absence of Clean-Box Rebuild:** The release manifest acknowledges that D1 was an overclaim ("repeatable on the existing installation", not "re-derivable without the original live box"). The proprietary Khanza source tree, database dumps, and compilation dependencies have not been reconstructed from scratch on a clean, isolated host.
- **Unchecked Historical Data:** The P14 lock release remains unevidenced.

The harness provides high within-box auditability, but external execution by an independent party remains blocked by environment capture.

### Score: 7.0/10

---

## E2E-DESIGN

### 1. End-to-End Architecture Progression
The E2E evaluation design has developed a coherent multi-tiered structure:
1. **Tier 1 (Macro Reconciliation):** A-to-C comparison across 86,455 encounters with zero delta.
2. **Tier 2 (Headless UI Form Execution):** Headless Java Swing harness execution on real clinical screens (`DlgBilingRalan`), writing live settlement records across 3,330 encounters ($3.9\%$ of the cohort) with audited trigger attribution (`benchmark@localhost`).
3. **Tier 3 (Granular Line-Level Identity):** 300 real encounters plus 27 edge fixtures evaluated line-by-line across quantities, unit prices, tambahan, and amounts, with collisions resolved via clinical source tables.
4. **Tier 4 (Adversarial Edge Suite):** 27 authored edge visits probing zero-cost procedures, fractional quantities, negative values, and tax edge cases.

### 2. Weakest Structural Elements
- **Display-Name Intermediary:** The system relies on string-based mapping between `billing.nm_perawatan` and catalog tables. The billing pipeline writes display strings rather than immutable IDs, leaving an unavoidable gap where code-level mutations under identical display names remain undetectable without UI model introspection (`C3`).
- **Integration of the Stop Rule:** The driver stop rule was verified through unit tests of `p15_lib.sh` and bash tail extractions in `p16_a_negctl.sh`. It has not been validated through an end-to-end failure injection that triggers during live Swing form automation.
- **Payment Coercion in P12:** The P12 reconcile script still processes payments via `COALESCE`, leaving historical reconciliation tools out of alignment with the stricter input validation applied to newer comparators.

The design supports rigorous verification of financial consistency between Khanza's form engine and the consumer, within the bounds of Khanza's underlying schema.

### Score: 8.0/10

---

## EXTERNAL-VALIDITY

### 1. Coverage, Cohort Calibration, and Realism
External validity remains the most constrained dimension of the benchmark, as acknowledged in R5 §13 (RC-9):
- **Cohort Homogeneity:** The dataset is restricted to synthetic outpatient visits from a single billing month (October 2026) within a single medical specialty configuration. Inpatient workflows, complex multi-payer splits, deposits, and returns are absent.
- **Clinical and Tariff Realism:**
  - Diagnoses are uncalibrated (the top diagnoses query is benchmark-authored and uncalibrated against ICD-10 distributions).
  - Revenue distribution is heavily skewed: drugs account for $\sim 82.7\%$ of total revenue (PPN-inclusive), which is uncharacteristic of standard outpatient operations.
  - The tariff model is simplified: all encounters feature exactly one procedure, zero embalase/tuslah, and a fixed registration fee (`biaya_reg = 10000`).
- **Single-System Boundary:** The setup is evaluated against a single Khanza version (`dist/SIMRSKhanza.jar` SHA `34b0d77e...`) running on a specific MySQL 8.0.46 configuration.

### 2. Scope Honesty
The benchmark does not claim generalizability. R5 §12/§13 explicitly states that external validity (C1–C4: diagnosis calibration, burst performance, payer mix, second HMS) is **NOT TESTED**. The documentation treats the benchmark as a synthetic installation consistency study rather than a proof of real-world billing correctness.

### Score: 4.5/10

---

## SYNTHESIS & RE-SCORE

### Comparison Across Waves

| Criterion | v10 | v11 | Current (v12) | Delta (v11 $\to$ v12) |
|---|:---:|:---:|:---:|:---:|
| **Claim-Honesty** | 7.0 | 7.0 | **8.5** | +1.5 |
| **Gate-Correctness** | 6.5 | 6.0 | **8.5** | +2.5 |
| **Oracle-Validity** | 7.5 | 7.5 | **8.0** | +0.5 |
| **Reproducibility** | 6.0 | 6.5 | **7.0** | +0.5 |
| **E2E-Design** | 7.0 | 8.0 | **8.0** | 0.0 |
| **External-Validity** | 4.0 | 4.5 | **4.5** | 0.0 |
| **Overall Score** | **63** | **66** | **74** | **+8** |

$$\text{Final Score} = \operatorname{round}\left(\frac{8.5 + 8.5 + 8.0 + 7.0 + 8.0 + 4.5}{6} \times 10\right) = \operatorname{round}(74.17) = \mathbf{74 / 100}$$

### Verdict
**Accept (Scoped).**

The system has progressed from an unreliable acceptance framework with circular logic into a **defensible, rigorously bounded consistency study**. Waves P15 and P16 resolved the primary architectural vulnerabilities identified in v11:
1. Circular identity resolution (`EQUAL-CTX`) has been replaced with clinical source-row resolution (`EQUAL-SRC`), accompanied by negative controls proving detection of same-name, same-price code mutations.
2. The fresh-B audit rule has been tightened to require exactly one lifetime insertion by the benchmark account, eliminating the timing window loophole.
3. Driver safety logic (lock verification, trap installation, run-scoped process group tracking, and integer-safe stop arithmetic) has been largely corrected in code and demonstrated through differential failure tests.

### Top Remaining Issues
1. **Third-Home Migration:** The existing hosting environment terminates in November 2026. A clean rebuild from external source archives remains unexecuted.
2. **Form Data Model Extraction (C3):** Validating charge codes behind colliding display names without relying on source-row inference requires dumping the UI form's underlying data model directly from the harness.
3. **End-to-End Stop-Rule Failure Injection:** The driver stop rule must be exercised through a live failure injected into an active form automation run, rather than relying solely on bash script wiring tests.
