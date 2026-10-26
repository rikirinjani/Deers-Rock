# Astra v11 assessment: dr-khanza-e2e-full-assessment (post P1-P14) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

### Verification of Reported Closures vs. Transcripts and Code
The P11–P14 wave is characterized by exceptional operational transparency. The engineering logs frankly document serious defects and self-inflicted procedural hazards rather than concealing them:
1. **The concurrent-agent tool collision:** R5 §22 honestly records that a parallel agent session modified tools 19 seconds before an evidence run, unbinding intermediate evidence files (`aa34340f...` through `7ecb20ef...`) and necessitating immutable byte locking (`chattr +i`) and the advisory run lock (`dr_runlock.sh`).
2. **Vacuous and flawed negative controls caught in flight:** Both the P12 reconciliation negative control (`r5_p12_reconcile_negctl_FAILED_plant_noop_...`) where `UPDATE` affected 0 rows, and the P14 line-identity negative control (`nc_vacuous` where `databarang` failed to copy under strict `sql_mode`, causing an unhandled `0000-00-00` error and turning all drug lines into `UNMAPPED`), were preserved in failure records, repaired with fail-closed assertions (`ROW_COUNT()=1`, copied table row-count validation), and re-run.
3. **Cosmetic doubled-rate bug in P13:** Disclosed in R5 §25 and Handoff Item 14: `p13_wide_sample.sh` ran `grep -hc 'sukses=true'` across harness logs that emit two matching strings per visit, doubling both the reported total and the rate line. It was left frozen and documented rather than silently rewritten.
4. **Clopper-Pearson mathematical error:** The initial 4× under-estimate of the Clopper-Pearson bound was caught and corrected in R5 §25.7. Recomputing the exact Clopper-Pearson 95% confidence bounds confirms the arithmetic:
   - **P13 ($n = 3,330, k = 0$):**
     - One-sided 95% upper bound ($\alpha = 0.05$):
       $$p = 1 - 0.05^{1/3330} = 1 - \exp\left(\frac{\ln 0.05}{3330}\right) = 1 - \exp\left(-\frac{2.99573}{3330}\right) \approx 0.0008992 \approx 0.090\%$$
     - Two-sided 95% upper bound ($\alpha/2 = 0.025$):
       $$p = 1 - 0.025^{1/3330} = 1 - \exp\left(\frac{\ln 0.025}{3330}\right) = 1 - \exp\left(-\frac{3.68888}{3330}\right) \approx 0.0011074 \approx 0.111\%$$
     *Both figures match R5 §25.7 exactly.*
   - **P14 line identity ($n = 300, k = 0$):**
     - One-sided 95% upper bound:
       $$p = 1 - 0.05^{1/300} = 1 - \exp\left(-\frac{2.99573}{300}\right) \approx 0.009936 \approx 0.99\%$$
     - Two-sided 95% upper bound:
       $$p = 1 - 0.025^{1/300} = 1 - \exp\left(-\frac{3.68888}{300}\right) \approx 0.01222 \approx 1.22\%$$
     *Both figures match R5 §26.8 exactly.*

### Where the Self-Assessment Overclaims
Despite the high level of disclosure, the **P14 self-score of 28/28** cannot be accepted:
- **E6 Fractional Quantity Evasion (Rubric R6 & R7):** In `kill_driver_attempt1.log`, the frozen builder crashed with `ValueError: invalid literal for int() with base 10: '0.5'`. Instead of admitting that the benchmark builder cannot handle fractional quantities, the author split the fixture (`p14_fixture_split.py`) to inject the fractional visits *after* the ledger was built. Consequently, $C$ had 0 rows for these visits. The test did not validate that the system correctly billed or reconciled fractional quantities; it merely verified that $A_{\text{form}} - 0 = A_{\text{form}}$. Giving this a 2/2 on R6 and R7 claims full edge coverage where an architectural deficiency was bypassed.
- **EQUAL-CTX Masking:** Scoring R4 at 2/2 hides the fact that 119 of 300 real encounters (39.7%) could only be resolved by consulting the target ledger ($C$) itself to disambiguate identical display names. Calling this an independent "line identity match" stretches the definition of an independent oracle.

**Claim-honesty Score: 8.0/10**

---

## GATE-CORRECTNESS

### 1. P11 Negative-Control Switches
Inspection of `sampled_real_form_diff_r5.py`, `p6_acceptance_suite.sh`, and `p10_preservation_check.sh` confirms that negative control switches (`R5_NEGCTL_*`) are inert in production:
- In `stage_backup()`, `R5_NEGCTL_BACKUP_NO_TXN` explicitly forces an autocommit fallback. In normal operation, `dbutil.session(db)` wraps the `DELETE` and `REPLACE` statements in a single atomic transaction.
- In `_bill_date()`, `R5_NEGCTL_SKIP_IMMEDIATE_RESTORE` forces the code to record `b["restored"] = True` without executing `stage_restore()`. In `p11_negative_controls.sh` (NC2), this causes assertion (a) (`sample: pre-op vs post-fail`) to fail immediately with `DIFFERENT`.
- In `p10_hash_state.py`, NULL checksums or missing tables now yield an explicit sentinel `ERROR:<table>` rather than stringified `None`, preventing vacuous string equality comparisons (`None == None`).
All 5 P11 negative controls are demonstrably discriminating in `r5_p11_negative_controls_20261024T113529Z.md`.

### 2. VPS Run Lock (`dr_runlock.sh`)
The run lock introduces mutual exclusion via `mkdir`-style atomic file operations (`noclobber`), and guards `p6_run_suite_fresh.sh` and `p11_negative_controls.sh`.
**Vulnerabilities / Bypass paths:**
- As acknowledged in Handoff Item 10, executing `p6_acceptance_suite.sh` directly bypasses the lock check entirely.
- Ad-hoc CLI sessions (`mysql`, python scripts) are unguarded.
- The lock relies on environment inheritance (`DR_LOCK_SESSION`). A process with an inherited session variable cannot be distinguished from the legitimate lock acquirer.

### 3. Reconciliations: `p12_perencounter_reconcile.py` & `p13_sample_compare.py`
Both scripts shift from global aggregate sums to per-encounter dictionaries keyed by `no_rawat`.
- **Collation and Type Safety:** In `p12_perencounter_reconcile.py`, amounts are cast via `CAST(b.totalbiaya AS SIGNED)` and Decimal quantizing (`ROUND_HALF_UP`). In `p13_sample_compare.py`, line-item amounts use integer and Decimal conversions.
- **The Stale Payment Row Bug:** In P12, encounter `2026/10/23/000408` failed with $B \neq C$ (62,873.2 vs. 204,506). Replay proved that `detail_nota_jalan` is not cleaned by `KhanzaBillingConsumer` (which only cleans `billing` and `nota_jalan`). Thus, any pre-existing payment row survived subsequent re-billing. This was mitigated in P13 by reading `p7_write_audit` to assert that `detail_nota_jalan` was freshly inserted by `benchmark@localhost`.

### 4. P14 Line-Identity Comparator (`p14_line_identity.py`)
This tool attempts per-line multiset reconciliation: `(component, code, qty, unit_price, amount)`.
**Severe Architectural Flaw in Name-to-Code Mapping (EQUAL-CTX):**
Lines 112–119 of `p14_line_identity.py`:
```python
cand = (pm if c == "procedure" else dm).get(nm, set())
if len(cand) == 1:
    code, how = next(iter(cand)), "name"
elif len(cand) > 1:
    inled = sorted(k for k in cand if (c, k) in L)
    if len(inled) == 1:
        code, how = inled[0], "ctx"
    else:
        code, how = "AMBIGUOUS:" + nm, "ambiguous"
```
Because Khanza's `billing` table discards the foreign key procedure code (`kd_jenis_prw`) and stores only the display string `nm_perawatan`, 14 distinct procedures in the database share the identical name `Periksa Poliklinik Umum / IGD` (4 of which are DR-used). When disambiguating, the comparator queries `(c, k) in L`, where $L$ is the **DR charge ledger**.
**Consequence:** The oracle uses the expected answer ($L$) to decide what code the actual system ($F$) produced. If the Khanza form executed procedure `J000844` instead of expected `J000840`, but both shared the same display name and only `J000840` was present in the ledger, the code selects `J000840`, classifies it as `EQUAL-CTX`, and reports a clean match. This is circular verification. It caught the synthetic plant in NC(a) only because the plant renamed the line to an unused display name with a unique code.

**Gate-correctness Score: 7.5/10**

---

## ORACLE-VALIDITY

### 1. Hardening and Isolation Diffs
The oracle (`sampled_real_form_diff_r5.py`) incorporates critical structural fixes:
- **Snapshot Coherence Fixed:** In `stage_backup()`, pre-reset hashes are now generated via `_stage_content_hash(nrs, db, pfx, log)`, computing the SHA-256 digest directly from the staged tables rather than querying live tables post-commit. NC4 discriminates against the old post-commit live-read race.
- **Fail-Closed Writer Exclusion:** In `recover_writer_exclusion()`, a corrupted or truncated marker JSON file no longer defaults to an empty dictionary that deletes the marker (the old fail-open bug). It logs `WRITER-EXCLUSION marker unreadable`, keeps the marker, and exits with code 3. Atomic writes via temporary files and `os.fsync()` prevent mid-crash corruption.
- **Stale State Sanitation:** When a retry is refused (`RETRY-REFUSED`), `b["restored"] = False` and `b["restore_state"] = "refused"` are explicitly set, closing the bug where stale `restored=True` flags survived failed retries.

### 2. Independent Real-Form Comparison
- In P13, 3,330 visits were executed through the headless GUI harness (`DlgBilingRalan`) on disposable clones. Freshness of the payment output ($B$) was demonstrated via 8 database audit triggers recording `benchmark@localhost` INSERTs.
- In P14, the ENC-only consumer baseline allowed the real form to execute against author-crafted edge cases without pre-cooking `detail_pemberian_obat`.

### 3. Residual Oracle Risks (Ranked)
1. **Circularity in Display-Name Resolution:** As noted under Gate-Correctness, `billing` flattens codes into display text. Using $L$ as context to impute $F$'s codes compromises oracle independence for 40% of real outpatient visits.
2. **Shared Clone Contamination in P14 T5:** Deviating from the task plan, P14 ran the 300 real-visit cohort on the *same clone* (`sik_p14e`) that had just processed the 27 edge-strata fixture visits. While live state remained protected, this introduced unnecessary cross-test coupling.
3. **Unexercised Error Paths in Real-Form Execution:** In both P13 and P14, `--allow-strata` caused expected partial coverage exits (exit 4), but true application exceptions in the headless Java harness still emit generic log lines rather than structured stack trace captures.

**Oracle-validity Score: 8.5/10**

---

## REPRODUCIBILITY

### 1. Progress in Artifact Freezing
- **Manifest Rigor:** The operational toolset is frozen across three cryptographic manifests:
  - P12: 15 tools (`r5_frozen_manifest_20261024c.sha256`)
  - P13: 6 tools (`r5_p13_frozen_manifest_20261025.sha256`)
  - P14: 12 tools (`r5_p14_frozen_manifest_20261026.sha256`)
  All 33 files are verified with immutable attributes (`chattr +i`) on the execution box.
- **Deterministic Re-derivation:**
  - `p13_draw_sample.py` uses fixed seeding (`Random(20261024)`).
  - `p14_edge_fixture.py` authoring is byte-deterministic across repeated executions.
  - The DR charge ledger reproduces the pinned digest `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` across all clone builds.
  - The STRATA registration rows dump is pinned by SHA-256 (`c8980819...`), eliminating the fragile `ls | head -1` discovery pattern.
  - Core Java consumer sources and `stagea_common.py` are published under `src/` with `PUBLISHED.sha256`.

### 2. Remaining Reproducibility Blockers (Ranked)
1. **Immediate Infrastructure Expiry:** The benchmark is anchored entirely to a single VPS instance (`mac-mini-vultr`) scheduled for termination on **~2026-11-20**. There is still no third box, and off-box durable archival of evidence directories (`evidence/p13/`, `evidence/p14/`) is uncompleted.
2. **Missing Clean-Box Reconstruction Package:** An independent third party cannot execute the benchmark from git clone alone. Execution requires proprietary and heavyweight external prerequisites: `dist/SIMRSKhanza.jar` (SHA-256 `34b0d77e...`), the 34 GB raw MySQL dumps, and local credential configurations (`.vps-mac-mini.env`).
3. **Hardcoded Environmental Paths:** Scripts remain tightly coupled to absolute filesystem locations (`/opt/Deers-Rock/tools`, `/opt/dr-benchmark`, `C:\Users\think\...`). Portable containerization (e.g., Dockerfile/Compose) remains absent.

**Reproducibility Score: 6.5/10**

---

## E2E-DESIGN

### 1. End-to-End Evaluation Across Waves P11–P14
The scope of end-to-end financial validation has expanded significantly since v10:
- **Full-Cohort Population Sweep ($A$ vs. $C$):** `p12_perencounter_reconcile.py` reconciled all 86,455 DR encounters across component keys, row counts, and monetary amounts, proving zero offsetting deltas.
- **Fresh Multi-Stage Form Validation ($A_{\text{form}}$ vs. $B$ vs. $C$):** P13 executed 3,330 unique, stratified real encounters through `DlgBilingRalan`, confirming $A_{\text{form}} == C$, $B == C$, and fresh payment creation on 100% of the sample.
- **Line-Item Identity:** P14 added per-encounter line identity covering 1,240 lines across 300 encounters, proving that charges match at the individual tariff level rather than merely aggregating into matching category totals.
- **Edge-Strata Probing:** 27 synthetic visits across 8 strata forced the form through scenarios absent in the historical synthetic data (multi-line procedures, embalase, tuslah, half-rupiah PPN boundaries).

### 2. Fair E2E Claim Boundary
The benchmark can defensibly claim:
> "Deterministic, zero-defect financial equivalence between the optimized Java consumer settlement, the DR ground-truth ledger, and headless Khanza GUI form saves across 3,330 sampled outpatient encounters and 300 line-by-line charge breakdowns, with proven fail-closed accounting on known tariff, rounding, and administrative edge conditions."

### 3. The Weakest Remaining Leg and Its Required Fix
**Weakest Leg: The Builder Fractional Quantity Crash and Resulting Fixture Split.**
In P14, the ledger builder failed closed on `jml = 0.5` due to an integer cast `int(SUM(jml))`. Instead of fixing the builder's mathematical model or formalizing a decimal-handling rule, the author split the fixture and loaded fractional visits *after* the ledger was built.
**The Fix:**
1. Update `build_dr_charge_ledger_p2.py` to parse quantities using `Decimal` and apply Khanza's exact fractional rounding/dispensing rules rather than crashing on non-integer inputs.
2. Re-run the P14 fixture through the unified builder pipeline without post-build fixture loading, proving that fractional line items are either legitimately billed and reconciled or rejected by policy.

**E2E-design Score: 8.0/10**

---

## EXTERNAL-VALIDITY

### 1. Scope and Realism Gaps
The benchmark remains restricted to a highly stylized synthetic domain:
- **Homogeneous Visit Architecture:** T0 discovery revealed that **100% of all 86,455 DR outpatient visits contain exactly one procedure line**, zero embalase/tuslah dispensing fees, and an identical `biaya_reg = 10000`. Real outpatient clinic billing exhibits variable procedure densities, multiple specialist consultations, variable registration categories, and complex prescription fees.
- **Synthetic Drug Distribution:** Drug charges account for ~82.7% of total billing revenue, an unrealistic proportion driven by uncalibrated prescription generators.
- **Clinical/Administrative Omissions (C1–C4):** Diagnosis codes are uncalibrated (empty prefix sets on native tables), multi-payer/BPJS claim settlement logic is completely excluded, and secondary facility/inpatient workflows are unsupported.
- **Single Runtime Target:** Evaluation is confined to MySQL 8.0.46 running against a single local Khanza installation.

### 2. External Validity Scoping Honesty
The repository maintains exemplary boundary honesty. The R5 report explicitly re-states caveat **RC-9**, disclaiming population-wide correctness, clinical realism, or generalization to other HMS configurations. The Clopper-Pearson bound ($p \le 0.090\%$) is strictly bounded to uniform random draws from this single synthetic outpatient cohort.

### 3. Top External Risk
**Top External Risk:** Production deployment against real clinical data will immediately encounter fractional drug dosages, multi-procedure consultations, or alternative registration fee schedules that crash the billing ledger builder (fail-closed) or trigger undetected code substitutions under display-name collisions.

**External-validity Score: 4.0/10**

---

## OVERALL ASSESSMENT & VERDICT

### Scoring Summary

| Criterion | v10 Score | v11 Score | Delta | Key Justification |
|---|---:|---:|---:|---|
| **Claim-honesty** | 7.0 | **8.0** | +1.0 | Uncompromising disclosure of agent concurrency, script defects, rate bugs, and math corrections; docked for P14 28/28 self-score and E6 workaround. |
| **Gate-correctness** | 6.5 | **7.5** | +1.0 | Discriminating negative controls across recovery and line identity; docked for circularity in EQUAL-CTX display-name mapping and advisory run-lock bypasses. |
| **Oracle-validity** | 7.5 | **8.5** | +1.0 | Staged-row content hashing resolves the post-commit live-read race; atomic fsynced markers with fail-closed recovery; audit-trigger verified fresh payments. |
| **Reproducibility** | 6.0 | **6.5** | +0.5 | 33 immutable frozen tools, pinned STRATA dump, byte-identical ledger reproduction; docked for impending VPS termination and lack of clean-box containerization. |
| **E2E-design** | 7.0 | **8.0** | +1.0 | Population-wide 86,455 encounter check, 3,330 fresh form re-bills, 300 line-identity checks; docked for builder crash evasion on fractional quantities. |
| **External-validity**| 4.0 | **4.0** | 0.0 | Rigorously scoped caveats (RC-9), but clinical realism (C1–C4), multi-line visits, and fractional dispensing remain unaddressed. |

$$\text{Overall Score} = \operatorname{round}\left(\frac{8.0 + 7.5 + 8.5 + 6.5 + 8.0 + 4.0}{6} \times 10\right) = \operatorname{round}(70.83) = \mathbf{71/100}$$

### Verdict
**71/100 — Substantial Progress; Conditionally Acceptable for Scoped Synthetic Outpatient Benchmark.**

Waves P11–P14 deliver the most significant engineering improvements in the history of this benchmark. The recovery-preservation flaws that halted v10 have been systematically resolved with honest, discriminating negative controls, snapshot coherence, and fail-closed writer exclusion. Financial validity has advanced from high-level component totals to individual charge-line identity.

### Top Three Remaining Priorities
1. **Third-Box Clean Migration Before Expiry (Reproducibility Deadline ~2026-11-20):** Move off `mac-mini-vultr`, containerize the deployment pipeline, and execute a fresh build entirely from published assets.
2. **Fix Builder Fractional Quantity Handling (E2E Soundness):** Eliminate the `int(SUM(jml))` crash in `build_dr_charge_ledger_p2.py`, remove the `p14_fixture_split.py` late-load workaround, and reconcile fractional units end-to-end.
3. **Decouple Line Disambiguation from the Target Ledger (Oracle Independence):** Refactor `p14_line_identity.py` so that display-name collisions that cannot be disambiguated from form-internal metadata are reported as `AMBIGUOUS` rather than using the ground-truth ledger ($L$) to pick the candidate code.

## VERDICT

### Criterion Scores and Justifications

* **Claim-Honesty: 8.0 / 10 (DELTA vs prior: +4.0, +3.0, +3.0, +2.0, +2.0, +2.0, +1.0, +1.0)**
  * **Justification:** While the team honestly documented the double-counted harness log grep and corrected the Clopper-Pearson bounds in R5 §25.7, they improperly self-awarded 28/28 on P14 by using `p14_fixture_split.py` to bypass a builder crash on fractional quantities (`ValueError: invalid literal for int() with base 10: '0.5'`) and claiming full line-identity coverage where 39.7% of lines required target-ledger disambiguation.
  * **Biggest remaining risk:** Peer reviewers will reject the self-reported zero-defect claim upon discovering that the synthetic fractional test asserts $A_{\text{form}} - 0 = A_{\text{form}}$ because target ledger $C$ contained zero rows for post-split fixtures.

* **Gate-Correctness: 7.5 / 10 (DELTA vs prior: +4.5, +4.5, +4.5, +2.5, +1.5, +1.5, +1.5, +1.0)**
  * **Justification:** The reconciliation gates now enforce strict per-encounter integer/Decimal casting and fresh payment validation via `p7_write_audit`, but `p14_line_identity.py` (lines 112–119) introduces circular verification by querying the ground-truth ledger `(c, k) in L` to infer codes for identical display strings (`EQUAL-CTX`).
  * **Biggest remaining risk:** Masked discrepancies in procedures sharing identical descriptions (e.g., `Periksa Poliklinik Umum / IGD`) will pass unnoticed because the comparator uses the expected answer to resolve ambiguous actual form outputs.

* **Oracle-Validity: 8.5 / 10 (DELTA vs prior: +4.5, +4.5, +5.5, +3.5, +2.5, +1.5, +1.5, +1.0)**
  * **Justification:** Structural hardening in `sampled_real_form_diff_r5.py` eliminates previous race conditions by computing pre-reset digests directly from staged tables via `_stage_content_hash()` and implements fail-closed writer exclusion markers with atomic `fsync` writes.
  * **Biggest remaining risk:** Contamination across test cohorts caused by reusing mutable clone databases (e.g., executing the 300-encounter cohort on `sik_p14e` immediately after 27 synthetic edge visits) without guaranteed cold re-initialization.

* **Reproducibility: 6.5 / 10 (DELTA vs prior: +3.5, +1.5, +0.5, +1.5, +0.5, +0.5, +0.5, +0.5)**
  * **Justification:** The pipeline achieves high cryptographic discipline with 33 `chattr +i` frozen tools, pinned sample seeds, and deterministic ledger rebuilds (`356355:a66a3a5...`), yet still relies entirely on hardcoded absolute paths (`/opt/dr-benchmark`, `C:\Users\think\...`) on a single ephemeral host.
  * **Biggest remaining risk:** The imminent teardown of `mac-mini-vultr` (~2026-11-20) without an independent third-box build or containerized deployment package will render the benchmark permanently unexecutable.

* **E2E-Design: 8.0 / 10 (DELTA vs prior: +4.0, +3.0, +3.0, +2.0, +1.0, +1.0, +1.0, +1.0)**
  * **Justification:** E2E coverage expanded from aggregate sums to an 86,455-visit population sweep, 3,330 fresh GUI re-bills via headless `DlgBilingRalan`, and a 300-encounter line-identity comparator spanning 1,240 charge lines.
  * **Biggest remaining risk:** E2E accounting guarantees break down on fractional medication orders because the core builder pipeline cannot ingest non-integer quantities without crashing.

* **External-Validity: 4.0 / 10 (DELTA vs prior: +1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)**
  * **Justification:** The author transparently demarcates the operational envelope in RC-9, but the test corpus remains restricted to single-specialty synthetic outpatient visits that omit inpatient stays, multi-doctor consultations, laboratory packages, and fractional drug doses.
  * **Biggest remaining risk:** Claims of enterprise billing equivalence will not generalize to realistic hospital traffic where multi-line orders, inventory stock checks, and partial drug returns are standard.

---

### 1. Status of v10 Findings

* **Genuinely Fixed (verified in code AND demonstrated by asserted run):**
  * *Stale `restored=True` State Leak:* Fixed in `sampled_real_form_diff_r5.py` by explicitly assigning `restored = False` and `restore_state = "refused"` under `RETRY-REFUSED`.
  * *Fail-Open Writer Exclusion:* Fixed in `recover_writer_exclusion()` by requiring valid JSON parses, fsynced atomic writes, and fail-closed termination (exit code 3) on corrupted markers (asserted via NC3).
  * *Snapshot Coherence Live-Read Race:* Fixed by computing pre-reset hashes from staged snapshot tables via `_stage_content_hash()` rather than querying live tables post-commit (asserted via NC4).
  * *Stale Payment Accumulation in Consumer Re-bills:* Mitigated in P13 by joining against `p7_write_audit` to assert that `detail_nota_jalan` payment records were freshly inserted by `benchmark@localhost`.
  * *Population Aggregate Drift:* Fixed in P12 by replacing global aggregate sum checks with per-encounter dictionary reconciliations across all 86,455 records.

* **Merely Claimed (workaround applied or unproven):**
  * *Fractional Quantity Support (E6):* Claimed as passing under P14 edge strata (28/28), but bypassed in code via `p14_fixture_split.py` to prevent `build_dr_charge_ledger_p2.py` from crashing on `int(SUM(jml))`.
  * *Independent Per-Line Identity Validation:* Claimed as an independent oracle match, but 39.7% of lines (119/300 encounters) relied on `EQUAL-CTX`, which looks up candidate codes inside the reference ledger itself.

* **Still Open:**
  * *Advisory Run-Lock Isolation:* Locks remain tied to session-level variables (`_SESSION`), leaving the harness vulnerable to connection-pooling or inherited session escapes.
  * *Java Exception Telemetry:* Headless Java harness failures still emit unparsed generic log lines rather than structured stack traces, forcing crude substring grepping.

---

### 2. New Problems Introduced or Exposed in P11–P14

1. **Circular Line-Item Disambiguation (`p14_line_identity.py`):** Because Khanza drops `kd_jenis_prw` in `billing` and stores only `nm_perawatan`, 14 procedures share duplicate names. The comparator resolves duplicates by checking `(c, k) in L` (the DR reference ledger), making the oracle dependent on the ground truth it is meant to verify.
2. **Fixture-Splitting Architectural Evasion:** Splitting edge fixtures to inject fractional medication visits *after* the ledger is built prevents builder crashes but decouples the test from the ledger, testing $A_{\text{form}} - 0 = A_{\text{form}}$ instead of real settlement equivalence.
3. **Double-Counted Log Telemetry:** Harness script `13_wide_sample.sh` parsed logs using `grep -hc 'sukses=true'`, doubling the reported success counts due to duplicate log statements per encounter.
4. **Shared Disposable Clone Re-use:** P14 executed the 300 real-visit cohort directly on `sik_p14e` immediately following the 27 synthetic edge visits without an intermediate drop/re-clone, introducing test-order coupling.

---

### 3. Top-3 Remaining Issues in Priority Order

1. **VPS Infrastructure Deprecation (~2026-11-20 Deadline):** The benchmark is anchored to `/opt/dr-benchmark` on a single terminating VPS. Without an automated, portable container recipe (Docker/Compose) and off-box archiving of the 34 GB dataset and `SIMRSKhanza.jar`, reproducibility drops to zero upon host teardown.
2. **Circular Oracle Logic in Display Name Mapping:** Refactor `p14_line_identity.py` to classify ambiguous procedure names lacking unique metadata as `AMBIGUOUS` rather than querying ground truth $L$, ensuring negative controls can catch subtle procedure substitutions.
3. **Builder Engine Integer Cast Crash on Fractional Quantities:** Refactor `build_dr_charge_ledger_p2.py` to process non-integer quantities via `Decimal`, retire the `p14_fixture_split.py` late-injection workaround, and evaluate fractional billing end-to-end.

---

### 4. Top-3 Strongest Properties to Lead With

1. **Scale and Mathematical Rigor:** Complete 86,455-visit population reconciliation ($A$ vs. $C$), complemented by 3,330 fresh GUI billing settlements ($A_{\text{form}} == C == B$) with Clopper-Pearson two-sided 95% upper error bound of 0.111%.
2. **Adversarial Gate Discrimination:** Four purpose-built negative controls (NC1–NC4, NC(a)) that demonstrably reject stale snapshots, uncommitted writes, corrupted lock markers, and line-item misattributions.
3. **Immutable Cryptographic Traceability:** Full artifact pinning across three frozen manifests containing 33 tools (`chattr +i`), deterministic RNG seeds, and pinned digest verification for both intermediate tables and output ledgers.

---

### 5. Overall Score and Delta

* **Overall Score:** **71 / 100** (Sum of criteria: $42.5 \times \frac{10}{6} = 70.83 \to 71$)
* **Deltas vs. Prior Assessments:**
  * Run 4701365 (35/100): **+36**
  * Run 4769794 (43/100): **+28**
  * Run 4795743 (43/100): **+28**
  * Run 4818826 (52/100): **+19**
  * v7 Runs 4880158+4894730 (58/100): **+13**
  * v8 Run 4897654 (60/100): **+11**
  * v9 Run 4898353 (62/100): **+9**
  * v10 Run 4918967 (63/100): **+8**

---

### 6. Overall Verdict

**Needs targeted rework**

*Rationale:* The benchmark has transitioned from a flawed prototype to an engineering artifact with robust snapshot isolation, mathematical rigor, and extensive population-level coverage. However, paper submission cannot be recommended while the primary line-identity oracle employs circular disambiguation on 40% of encounters, fractional quantities are bypassed via late fixture injection, and the entire test environment risks deletion on ~2026-11-20.

---

### 7. Single Most Important Next Step

**Containerize the full pipeline and execute a clean-box reproduction run on fresh infrastructure before the 2026-11-20 host teardown.** This container must bundle the pinned `SIMRSKhanza.jar`, schema DDL, deterministic fixtures, and frozen scripts into a one-command automated validation run independent of `mac-mini-vultr`.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

### Verification of Reported Closures vs. Transcripts and Code
The P11–P14 wave is characterized by exceptional operational transparency. The engineering logs frankly document serious defects and self-inflicted procedural hazards rather than concealing them:
1. **The concurrent-agent tool collision:** R5 §22 honestly records that a parallel agent session modified tools 19 seconds before an evidence run, unbinding intermediate evidence files (`aa34340f...` through `7ecb20ef...`) and necessitating immutable byte locking (`chattr +i`) and the advisory run lock (`dr_runlock.sh`).
2. **Vacuous and flawed negative controls caught in flight:** Both the P12 reconciliation negative control (`r5_p12_reconcile_negctl_FAILED_plant_noop_...`) where `UPDATE` affected 0 rows, and the P14 line-identity negative control (`nc_vacuous` where `databarang` failed to copy under strict `sql_mode`, causing an unhandled `0000-00-00` error and turning all drug lines into `UNMAPPED`), were preserved in failure records, repaired with fail-closed assertions (`ROW_COUNT()=1`, copied table row-count validation), and re-run.
3. **Cosmetic doubled-rate bug in P13:** Disclosed in R5 §25 and Handoff Item 14: `p13_wide_sample.sh` ran `grep -hc 'sukses=true'` across harness logs that emit two matching strings per visit, doubling both the reported total and the rate line. It was left frozen and documented rather than silently rewritten.
4. **Clopper-Pearson mathematical error:** The initial 4× under-estimate of the Clopper-Pearson bound was caught and corrected in R5 §25.7. Recomputing the exact Clopper-Pearson 95% confidence bounds confirms the arithmetic:
   - **P13 ($n = 3,330, k = 0$):**
     - One-sided 95% upper bound ($\alpha = 0.05$):
       $$p = 1 - 0.05^{1/3330} = 1 - \exp\left(\frac{\ln 0.05}{3330}\right) = 1 - \exp\left(-\frac{2.99573}{3330}\right) \approx 0.0008992 \approx 0.090\%$$
     - Two-sided 95% upper bound ($\alpha/2 = 0.025$):
       $$p = 1 - 0.025^{1/3330} = 1 - \exp\left(\frac{\ln 0.025}{3330}\right) = 1 - \exp\left(-\frac{3.68888}{3330}\right) \approx 0.0011074 \approx 0.111\%$$
     *Both figures match R5 §25.7 exactly.*
   - **P14 line identity ($n = 300, k = 0$):**
     - One-sided 95% upper bound:
       $$p = 1 - 0.05^{1/300} = 1 - \exp\left(-\frac{2.99573}{300}\right) \approx 0.009936 \approx 0.99\%$$
     - Two-sided 95% upper bound:
       $$p = 1 - 0.025^{1/300} = 1 - \exp\left(-\frac{3.68888}{300}\right) \approx 0.01222 \approx 1.22\%$$
     *Both figures match R5 §26.8 exactly.*

### Where the Self-Assessment Overclaims
Despite the high level of disclosure, the **P14 self-score of 28/28** cannot be accepted:
- **E6 Fractional Quantity Evasion (Rubric R6 & R7):** In `kill_driver_attempt1.log`, the frozen builder crashed with `ValueError: invalid literal for int() with base 10: '0.5'`. Instead of admitting that the benchmark builder cannot handle fractional quantities, the author split the fixture (`p14_fixture_split.py`) to inject the fractional visits *after* the ledger was built. Consequently, $C$ had 0 rows for these visits. The test did not validate that the system correctly billed or reconciled fractional quantities; it merely verified that $A_{\text{form}} - 0 = A_{\text{form}}$. Giving this a 2/2 on R6 and R7 claims full edge coverage where an architectural deficiency was bypassed.
- **EQUAL-CTX Masking:** Scoring R4 at 2/2 hides the fact that 119 of 300 real encounters (39.7%) could only be resolved by consulting the target ledger ($C$) itself to disambiguate identical display names. Calling this an independent "line identity match" stretches the definition of an independent oracle.

**Claim-honesty Score: 8.0/10**

---

## GATE-CORRECTNESS

### 1. P11 Negative-Control Switches
Inspection of `sampled_real_form_diff_r5.py`, `p6_acceptance_suite.sh`, and `p10_preservation_check.sh` confirms that negative control switches (`R5_NEGCTL_*`) are inert in production:
- In `stage_backup()`, `R5_NEGCTL_BACKUP_NO_TXN` explicitly forces an autocommit fallback. In normal operation, `dbutil.session(db)` wraps the `DELETE` and `REPLACE` statements in a single atomic transaction.
- In `_bill_date()`, `R5_NEGCTL_SKIP_IMMEDIATE_RESTORE` forces the code to record `b["restored"] = True` without executing `stage_restore()`. In `p11_negative_controls.sh` (NC2), this causes assertion (a) (`sample: pre-op vs post-fail`) to fail immediately with `DIFFERENT`.
- In `p10_hash_state.py`, NULL checksums or missing tables now yield an explicit sentinel `ERROR:<table>` rather than stringified `None`, preventing vacuous string equality comparisons (`None == None`).
All 5 P11 negative controls are demonstrably discriminating in `r5_p11_negative_controls_20261024T113529Z.md`.

### 2. VPS Run Lock (`dr_runlock.sh`)
The run lock introduces mutual exclusion via `mkdir`-style atomic file operations (`noclobber`), and guards `p6_run_suite_fresh.sh` and `p11_negative_controls.sh`.
**Vulnerabilities / Bypass paths:**
- As acknowledged in Handoff Item 10, executing `p6_acceptance_suite.sh` directly bypasses the lock check entirely.
- Ad-hoc CLI sessions (`mysql`, python scripts) are unguarded.
- The lock relies on environment inheritance (`DR_LOCK_SESSION`). A process with an inherited session variable cannot be distinguished from the legitimate lock acquirer.

### 3. Reconciliations: `p12_perencounter_reconcile.py` & `p13_sample_compare.py`
Both scripts shift from global aggregate sums to per-encounter dictionaries keyed by `no_rawat`.
- **Collation and Type Safety:** In `p12_perencounter_reconcile.py`, amounts are cast via `CAST(b.totalbiaya AS SIGNED)` and Decimal quantizing (`ROUND_HALF_UP`). In `p13_sample_compare.py`, line-item amounts use integer and Decimal conversions.
- **The Stale Payment Row Bug:** In P12, encounter `2026/10/23/000408` failed with $B \neq C$ (62,873.2 vs. 204,506). Replay proved that `detail_nota_jalan` is not cleaned by `KhanzaBillingConsumer` (which only cleans `billing` and `nota_jalan`). Thus, any pre-existing payment row survived subsequent re-billing. This was mitigated in P13 by reading `p7_write_audit` to assert that `detail_nota_jalan` was freshly inserted by `benchmark@localhost`.

### 4. P14 Line-Identity Comparator (`p14_line_identity.py`)
This tool attempts per-line multiset reconciliation: `(component, code, qty, unit_price, amount)`.
**Severe Architectural Flaw in Name-to-Code Mapping (EQUAL-CTX):**
Lines 112–119 of `p14_line_identity.py`:
```python
cand = (pm if c == "procedure" else dm).get(nm, set())
if len(cand) == 1:
    code, how = next(iter(cand)), "name"
elif len(cand) > 1:
    inled = sorted(k for k in cand if (c, k) in L)
    if len(inled) == 1:
        code, how = inled[0], "ctx"
    else:
        code, how = "AMBIGUOUS:" + nm, "ambiguous"
```
Because Khanza's `billing` table discards the foreign key procedure code (`kd_jenis_prw`) and stores only the display string `nm_perawatan`, 14 distinct procedures in the database share the identical name `Periksa Poliklinik Umum / IGD` (4 of which are DR-used). When disambiguating, the comparator queries `(c, k) in L`, where $L$ is the **DR charge ledger**.
**Consequence:** The oracle uses the expected answer ($L$) to decide what code the actual system ($F$) produced. If the Khanza form executed procedure `J000844` instead of expected `J000840`, but both shared the same display name and only `J000840` was present in the ledger, the code selects `J000840`, classifies it as `EQUAL-CTX`, and reports a clean match. This is circular verification. It caught the synthetic plant in NC(a) only because the plant renamed the line to an unused display name with a unique code.

**Gate-correctness Score: 7.5/10**

---

## ORACLE-VALIDITY

### 1. Hardening and Isolation Diffs
The oracle (`sampled_real_form_diff_r5.py`) incorporates critical structural fixes:
- **Snapshot Coherence Fixed:** In `stage_backup()`, pre-reset hashes are now generated via `_stage_content_hash(nrs, db, pfx, log)`, computing the SHA-256 digest directly from the staged tables rather than querying live tables post-commit. NC4 discriminates against the old post-commit live-read race.
- **Fail-Closed Writer Exclusion:** In `recover_writer_exclusion()`, a corrupted or truncated marker JSON file no longer defaults to an empty dictionary that deletes the marker (the old fail-open bug). It logs `WRITER-EXCLUSION marker unreadable`, keeps the marker, and exits with code 3. Atomic writes via temporary files and `os.fsync()` prevent mid-crash corruption.
- **Stale State Sanitation:** When a retry is refused (`RETRY-REFUSED`), `b["restored"] = False` and `b["restore_state"] = "refused"` are explicitly set, closing the bug where stale `restored=True` flags survived failed retries.

### 2. Independent Real-Form Comparison
- In P13, 3,330 visits were executed through the headless GUI harness (`DlgBilingRalan`) on disposable clones. Freshness of the payment output ($B$) was demonstrated via 8 database audit triggers recording `benchmark@localhost` INSERTs.
- In P14, the ENC-only consumer baseline allowed the real form to execute against author-crafted edge cases without pre-cooking `detail_pemberian_obat`.

### 3. Residual Oracle Risks (Ranked)
1. **Circularity in Display-Name Resolution:** As noted under Gate-Correctness, `billing` flattens codes into display text. Using $L$ as context to impute $F$'s codes compromises oracle independence for 40% of real outpatient visits.
2. **Shared Clone Contamination in P14 T5:** Deviating from the task plan, P14 ran the 300 real-visit cohort on the *same clone* (`sik_p14e`) that had just processed the 27 edge-strata fixture visits. While live state remained protected, this introduced unnecessary cross-test coupling.
3. **Unexercised Error Paths in Real-Form Execution:** In both P13 and P14, `--allow-strata` caused expected partial coverage exits (exit 4), but true application exceptions in the headless Java harness still emit generic log lines rather than structured stack trace captures.

**Oracle-validity Score: 8.5/10**

---

## REPRODUCIBILITY

### 1. Progress in Artifact Freezing
- **Manifest Rigor:** The operational toolset is frozen across three cryptographic manifests:
  - P12: 15 tools (`r5_frozen_manifest_20261024c.sha256`)
  - P13: 6 tools (`r5_p13_frozen_manifest_20261025.sha256`)
  - P14: 12 tools (`r5_p14_frozen_manifest_20261026.sha256`)
  All 33 files are verified with immutable attributes (`chattr +i`) on the execution box.
- **Deterministic Re-derivation:**
  - `p13_draw_sample.py` uses fixed seeding (`Random(20261024)`).
  - `p14_edge_fixture.py` authoring is byte-deterministic across repeated executions.
  - The DR charge ledger reproduces the pinned digest `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` across all clone builds.
  - The STRATA registration rows dump is pinned by SHA-256 (`c8980819...`), eliminating the fragile `ls | head -1` discovery pattern.
  - Core Java consumer sources and `stagea_common.py` are published under `src/` with `PUBLISHED.sha256`.

### 2. Remaining Reproducibility Blockers (Ranked)
1. **Immediate Infrastructure Expiry:** The benchmark is anchored entirely to a single VPS instance (`mac-mini-vultr`) scheduled for termination on **~2026-11-20**. There is still no third box, and off-box durable archival of evidence directories (`evidence/p13/`, `evidence/p14/`) is uncompleted.
2. **Missing Clean-Box Reconstruction Package:** An independent third party cannot execute the benchmark from git clone alone. Execution requires proprietary and heavyweight external prerequisites: `dist/SIMRSKhanza.jar` (SHA-256 `34b0d77e...`), the 34 GB raw MySQL dumps, and local credential configurations (`.vps-mac-mini.env`).
3. **Hardcoded Environmental Paths:** Scripts remain tightly coupled to absolute filesystem locations (`/opt/Deers-Rock/tools`, `/opt/dr-benchmark`, `C:\Users\think\...`). Portable containerization (e.g., Dockerfile/Compose) remains absent.

**Reproducibility Score: 6.5/10**

---

## E2E-DESIGN

### 1. End-to-End Evaluation Across Waves P11–P14
The scope of end-to-end financial validation has expanded significantly since v10:
- **Full-Cohort Population Sweep ($A$ vs. $C$):** `p12_perencounter_reconcile.py` reconciled all 86,455 DR encounters across component keys, row counts, and monetary amounts, proving zero offsetting deltas.
- **Fresh Multi-Stage Form Validation ($A_{\text{form}}$ vs. $B$ vs. $C$):** P13 executed 3,330 unique, stratified real encounters through `DlgBilingRalan`, confirming $A_{\text{form}} == C$, $B == C$, and fresh payment creation on 100% of the sample.
- **Line-Item Identity:** P14 added per-encounter line identity covering 1,240 lines across 300 encounters, proving that charges match at the individual tariff level rather than merely aggregating into matching category totals.
- **Edge-Strata Probing:** 27 synthetic visits across 8 strata forced the form through scenarios absent in the historical synthetic data (multi-line procedures, embalase, tuslah, half-rupiah PPN boundaries).

### 2. Fair E2E Claim Boundary
The benchmark can defensibly claim:
> "Deterministic, zero-defect financial equivalence between the optimized Java consumer settlement, the DR ground-truth ledger, and headless Khanza GUI form saves across 3,330 sampled outpatient encounters and 300 line-by-line charge breakdowns, with proven fail-closed accounting on known tariff, rounding, and administrative edge conditions."

### 3. The Weakest Remaining Leg and Its Required Fix
**Weakest Leg: The Builder Fractional Quantity Crash and Resulting Fixture Split.**
In P14, the ledger builder failed closed on `jml = 0.5` due to an integer cast `int(SUM(jml))`. Instead of fixing the builder's mathematical model or formalizing a decimal-handling rule, the author split the fixture and loaded fractional visits *after* the ledger was built.
**The Fix:**
1. Update `build_dr_charge_ledger_p2.py` to parse quantities using `Decimal` and apply Khanza's exact fractional rounding/dispensing rules rather than crashing on non-integer inputs.
2. Re-run the P14 fixture through the unified builder pipeline without post-build fixture loading, proving that fractional line items are either legitimately billed and reconciled or rejected by policy.

**E2E-design Score: 8.0/10**

---

## EXTERNAL-VALIDITY

### 1. Scope and Realism Gaps
The benchmark remains restricted to a highly stylized synthetic domain:
- **Homogeneous Visit Architecture:** T0 discovery revealed that **100% of all 86,455 DR outpatient visits contain exactly one procedure line**, zero embalase/tuslah dispensing fees, and an identical `biaya_reg = 10000`. Real outpatient clinic billing exhibits variable procedure densities, multiple specialist consultations, variable registration categories, and complex prescription fees.
- **Synthetic Drug Distribution:** Drug charges account for ~82.7% of total billing revenue, an unrealistic proportion driven by uncalibrated prescription generators.
- **Clinical/Administrative Omissions (C1–C4):** Diagnosis codes are uncalibrated (empty prefix sets on native tables), multi-payer/BPJS claim settlement logic is completely excluded, and secondary facility/inpatient workflows are unsupported.
- **Single Runtime Target:** Evaluation is confined to MySQL 8.0.46 running against a single local Khanza installation.

### 2. External Validity Scoping Honesty
The repository maintains exemplary boundary honesty. The R5 report explicitly re-states caveat **RC-9**, disclaiming population-wide correctness, clinical realism, or generalization to other HMS configurations. The Clopper-Pearson bound ($p \le 0.090\%$) is strictly bounded to uniform random draws from this single synthetic outpatient cohort.

### 3. Top External Risk
**Top External Risk:** Production deployment against real clinical data will immediately encounter fractional drug dosages, multi-procedure consultations, or alternative registration fee schedules that crash the billing ledger builder (fail-closed) or trigger undetected code substitutions under display-name collisions.

**External-validity Score: 4.0/10**

---

## OVERALL ASSESSMENT & VERDICT

### Scoring Summary

| Criterion | v10 Score | v11 Score | Delta | Key Justification |
|---|---:|---:|---:|---|
| **Claim-honesty** | 7.0 | **8.0** | +1.0 | Uncompromising disclosure of agent concurrency, script defects, rate bugs, and math corrections; docked for P14 28/28 self-score and E6 workaround. |
| **Gate-correctness** | 6.5 | **7.5** | +1.0 | Discriminating negative controls across recovery and line identity; docked for circularity in EQUAL-CTX display-name mapping and advisory run-lock bypasses. |
| **Oracle-validity** | 7.5 | **8.5** | +1.0 | Staged-row content hashing resolves the post-commit live-read race; atomic fsynced markers with fail-closed recovery; audit-trigger verified fresh payments. |
| **Reproducibility** | 6.0 | **6.5** | +0.5 | 33 immutable frozen tools, pinned STRATA dump, byte-identical ledger reproduction; docked for impending VPS termination and lack of clean-box containerization. |
| **E2E-design** | 7.0 | **8.0** | +1.0 | Population-wide 86,455 encounter check, 3,330 fresh form re-bills, 300 line-identity checks; docked for builder crash evasion on fractional quantities. |
| **External-validity**| 4.0 | **4.0** | 0.0 | Rigorously scoped caveats (RC-9), but clinical realism (C1–C4), multi-line visits, and fractional dispensing remain unaddressed. |

$$\text{Overall Score} = \operatorname{round}\left(\frac{8.0 + 7.5 + 8.5 + 6.5 + 8.0 + 4.0}{6} \times 10\right) = \operatorname{round}(70.83) = \mathbf{71/100}$$

### Verdict
**71/100 — Substantial Progress; Conditionally Acceptable for Scoped Synthetic Outpatient Benchmark.**

Waves P11–P14 deliver the most significant engineering improvements in the history of this benchmark. The recovery-preservation flaws that halted v10 have been systematically resolved with honest, discriminating negative controls, snapshot coherence, and fail-closed writer exclusion. Financial validity has advanced from high-level component totals to individual charge-line identity.

### Top Three Remaining Priorities
1. **Third-Box Clean Migration Before Expiry (Reproducibility Deadline ~2026-11-20):** Move off `mac-mini-vultr`, containerize the deployment pipeline, and execute a fresh build entirely from published assets.
2. **Fix Builder Fractional Quantity Handling (E2E Soundness):** Eliminate the `int(SUM(jml))` crash in `build_dr_charge_ledger_p2.py`, remove the `p14_fixture_split.py` late-load workaround, and reconcile fractional units end-to-end.
3. **Decouple Line Disambiguation from the Target Ledger (Oracle Independence):** Refactor `p14_line_identity.py` so that display-name collisions that cannot be disambiguated from form-internal metadata are reported as `AMBIGUOUS` rather than using the ground-truth ledger ($L$) to pick the candidate code.
