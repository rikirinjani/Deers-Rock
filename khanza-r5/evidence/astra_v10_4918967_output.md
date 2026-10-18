# Astra v10 assessment: dr-khanza-e2e-full-assessment (post P1-P10) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

**P10 is a substantive improvement, but its PASS labels still exceed its assertions.** The retained failed run is valuable evidence. The declaration that the recovery work is now “crash-safe” is not.

This assessment is a source-and-evidence review, not an execution. Eight tool sources are explicitly **not embedded**, including `dbutil.py`, the wrapper, both reconciliation tools and the builder-check script. Their hashes identify claimed versions; they do not let me re-read their implementations. Findings about those tools remain bounded by the supplied transcripts and historical evidence.

### What is honestly supported

- **The suite count is correct:** 34 previous checks plus A26, A27, A28, A29 and A31 equals **39**. A30 belongs to the separate preservation run, not the 39-check suite.
- Run 1 was **30/38 = 78.95%**, with eight failures. Run 2 reports **39/39 = 100%**. Publishing the failed run materially strengthens the evidence.
- The A22 correction is accurate: the SQL changes **all 17 billing rows**, increasing their combined amount by **Rp17**, not Rp1.
- The preservation transcript establishes a normal terminal failure with recovery material present:
  > `stage tables: 13, populated rows: 21 (pre) / 21 (post)`
  
  This closes the specific P9 defect of testing terminal retention with **zero** recovery tables.
- `_finalize()` no longer unconditionally writes “restored from stage backup.” Its new `_restore_state()` distinguishes backup failure, verified restoration and non-restoration.
- The exclusions concerning independent reproduction, encounter-level financial reconciliation, untested fault modes and external validation are explicit.

### Remaining or new overclaims

**1. A11 still claims a universal property from an existential assertion.**

The new computation correctly distinguishes the file sets:

```bash
RV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORED-VERIFIED")
```

But acceptance still requires only:

```bash
[ "$RV_OTH" -ge 1 ]
```

The transcript reports **16 total markers and 16 outside the four excluded files**, with four deliberate failure markers. Those numbers are mutually consistent. The raw logs are not embedded, so I cannot independently recount them.

What does not follow is the label:

> “every restore OUTSIDE the deliberate-fault checks … hash-verified”

One verified operation plus another operation with missing verification and no recognized error marker can satisfy A11. P10 fixes the derivation of the count, **not completeness of acceptance**.

**2. “13 populated stage tables” is not established.**

There are 13 stage tables and **21 rows in aggregate**. Neither the checker nor the displayed transcript establishes that every table contains rows. Say “13 stage tables containing 21 rows in total.”

**3. “Independent hashes” needs qualification.**

`p10_hash_state.py` explicitly uses:

```python
"sample": o._content_hash(...),
"protected": o._content_hash(...),
```

That is an independent process/read, not an independent implementation or independently defined protection scope. It inherits the oracle’s omissions.

**4. “Crash-safe via the marker” is too broad.**

A20 demonstrates recovery from one SIGKILL placement. The marker is written directly, without atomic replacement or `fsync`; malformed markers are discarded; grant-restoration errors do not necessarily invalidate restoration success. Details follow below.

**5. The result-artifact wording is improved, but can still be stale.**

In the FAILED retry path, a failed `stage_restore()` produces `RETRY-REFUSED` without updating an earlier `b["restored"] = True`. `_finalize()` can therefore still report:

> `restored, hash-verified`

after the current retry was refused and the current data differ from the pre-reset state. The unconditional false claim is removed; **current-state reporting is not fully repaired**.

**6. Old affirmative claims remain active.**

Examples:

- The manifest says the benchmark is “re-derivable without the original live box.”
- Its limitation says DB images are “too large to pin by hash.” Size is not an obstacle to streaming a hash.
- The oracle docstring still says harness retargeting uses `database.ini`.
- R5’s early sections still describe “fail-closed tariff authority” more broadly than the builder implements.
- A13 still calls selected before/after equality “untouched.”

The later qualifications do not automatically neutralize these affirmative statements.

**Disposition of v9 reporting findings:** A22 is fixed; A11 accounting is fixed but its universal label is not; E5 is partially fixed in code, not comprehensively asserted in result-artifact tests; reproduction and “live untouched” overclaims remain.

**Score: 7/10 — unchanged from v9.**

## GATE-CORRECTNESS

**The suite now demonstrates more meaningful failures. It still contains tests that can pass without establishing the property named in their label.**

### Can the new checks fail when their property is violated?

| Check | What it genuinely detects | What it does not establish |
|---|---|---|
| **A26** | `'12x'` in the scratch tariff must produce `MALFORMED-AMOUNT`, `FAIL-CLOSED`, exit 1 and equal ledger hashes. The transcript demonstrates this. | NULL/empty source handling throughout the builder; tariff coverage; hash-read failure handling. |
| **A27** | A `biaya_obat` change after freeze must trigger source drift, exit 3 and no reset marker. Demonstrated. | Complete source-input coverage or rejection of an unreadable source query. |
| **A28** | Injected backup error, exit 4, stage retention and unchanged checksums. | **Rollback is not causally demonstrated**, because replacement rows are identical to the old rows. |
| **A29** | A fresh benchmark connection cannot perform the tested UPDATE during the pause; access works afterwards. Demonstrated with MySQL error 1142. | All effective privilege paths, all accounts, uninterrupted exclusion after a crash, or even necessarily the stated denial reason—the predicate accepts any `WRITE-DENIED` exception. |
| **A31** | Start/end schema-grant equality, no marker remaining and at least one recovery log. | Per-operation restoration, effective privileges, or absence of an unsafe interval. |
| **Preservation** | Kept fixture and table contents survive the normal failed terminal path; a subsequent retry restores and bills. | Independent correctness of immediate restoration, complete protected-state preservation or robust failure handling of the checker itself. |

### A28 is the central defective new negative test

The first timeout restores the original rows. The retry then backs up that same current state:

```bash
C0=$(stage_cks r6_a28)
env ... R5_FAULT_BACKUP_FAIL=1 ... --retry-failed
C1=$(stage_cks r6_a28)
```

The injected error is **after all DELETE/REPLACE statements**, just before COMMIT.

If those statements were accidentally autocommitted, they would replace the staged rows with identical rows. **`C0 == C1` would still hold.** With the same failure reporting, A28 could pass despite rollback being broken.

Fix it by injecting failure **after a destructive DELETE and before its replacement**, or by testing a direct re-backup with deliberately distinguishable old and candidate snapshots. Assert which version survived. The current implementation has a transaction-shaped repair; the test does not prove its essential protective property.

### Preservation: meaningful progress, incomplete acceptance

The production terminal path is exercised with populated artifacts. That is a genuine v9 closure.

However:

1. **A30’s underlying result is overwritten.**
   ```bash
   if ...; then st=1; ... fi
   ```
   The outer checker cannot distinguish “A30 preconditions passed, then forced failure” from “A30 already failed, then decorated as forced.” It rechecks some preconditions, not all.

2. **Immediate restoration is not asserted.** The preservation run does not require timeout proof, exclusion on/off or verified restoration from `/tmp/r6_p10.log`.

3. **Protected/sample pre-hashes are taken after the initial failure and restore attempt.** They cannot establish preservation through that initial operation.

4. **Checksum failure can masquerade as a value.**
   ```python
   stage[n] = str(rows[0][1]) if rows else None
   ...
   any(v is None for v in stage.values())
   ```
   A SQL NULL checksum becomes `"None"` or `"NULL"`, not Python `None`. Repeated unavailable checksums can compare equal. Live checksums have the same stringification problem.

5. The helper does not assert the expected 13-table inventory, all six live results, or 20 distinct, existing, disjoint protected visits.

6. Teardown happens even after failed assertions. A failed preservation experiment can therefore destroy the fixture it should retain for investigation. The script also lacks an EXIT trap for its own grant/configuration changes.

### Other v9 gate findings

**A10e does not prove DELETE scope equals INSERT scope.**

The builder explicitly deletes:

```sql
... AND (rp.no_rawat IS NULL OR <cohort predicate>)
```

Inserts require registered encounters. Thus orphan ledger rows are deleted without being rebuilt, including under `--cohort dr`, where their cohort cannot be established. This is a garbage-collection policy, not identical replacement scope. A10e demonstrates protection of **one registered non-DR row**, not orphan protection.

**A17 protects suite entry, not every mutation path.**

The oracle only requires `--allow-live` for `db == "sik"` billing runs. Direct helper calls bypass that guard. `stage_restore("sik", ...)` explicitly performs a plain restore without exclusion. The oracle does not verify the actual XML/JVM target against `--db-name`. These remain v9 limitations.

**A11 still lacks an expected operation inventory and planted unintended-error test.** It also excludes entire deliberate-fault logs, where additional failures of other classes can escape its aggregate accounting.

**Retained closures:** nonzero suite termination, kept failed fixtures, conditional cleanup after verified restoration and missing-stage refusal are all supported. The omitted builder-check source prevents fresh verification of its negative-check implementation; the P10 transcript shows its positive reproduction case only.

**Score: 6.5/10 — up 0.5.** Real acceptance coverage improved; A28 and preservation-check weaknesses prevent a larger increase.

## ORACLE-VALIDITY

**The oracle is better for the narrow injected-fault claims. It is not a complete-input, crash-safe, fail-closed recovery system.**

### What P10 actually repairs

**Source prices:** `source_content_hash()` now includes `biaya_obat`, `total`, `h_beli` and procedure amount columns. A25 and A27 demonstrate quantity and price drift rejection. Query exceptions are no longer silently treated as an empty source set.

**Backup replacement:** `stage_backup()` submits its replacement statements inside:

```python
sql = ["START TRANSACTION;"]
...
sql.append("COMMIT;")
```

and treats unsuccessful session closure as failure. `_finalize()` now retains stages after backup failure. Those are substantive source fixes. A28’s rollback experiment remains insufficient, as explained above; `dbutil.session` itself is not embedded.

**FAILED retry quiet interval:** `include_failed=args.retry_failed or args.abandon_failed` puts FAILED visits into the quiet-check set. The preservation transcript shows `quiet=true`. This repairs the specific v9 omission.

**Fixture writer exclusion:** A29 demonstrates the intended schema-grant configuration:

> `before=DELETE,INSERT,SELECT,UPDATE during=SELECT after=DELETE,INSERT,SELECT,UPDATE`

and:

> `ERROR 1142 ... UPDATE command denied`

**SIGKILL recovery:** Run 1 genuinely exposed the new privilege-loss defect. Run 2 demonstrates A20 recovery and A31 reports one recovered exclusion. Credit the fix for that tested interruption—not for every crash boundary.

### Ranked residual risks

**1. Exclusion recovery restores access before it recovers the interrupted data operation.**

At startup:

```python
recover_writer_exclusion(db, log)
```

runs before baseline verification, writer reaping and restoration. Recovery grants DML back and removes the marker. An interrupted half-restore is therefore exposed to writers before a later restore reacquires exclusion.

It gets worse if baseline verification then fails: the oracle can exit with grants restored and the interrupted data operation unresolved.

A recovery marker should preserve exclusion until the interrupted operation is safely resolved, not merely repair account availability.

**2. Grant restoration is not fail-closed.**

`stage_restore()` returns the inner restore result; the `finally` block logs re-grant failure or mismatch but does not override success:

```python
return _stage_restore_inner(...)
...
log("WRITER-EXCLUSION off ... MISMATCH - grants not as before")
```

A verified row restore can therefore be reported successful despite failed privilege restoration.

`recover_writer_exclusion()` similarly reads back privileges but never checks equality against the recorded set before removing the marker and returning True.

**3. The marker is neither robustly durable nor safely parsed.**

```python
with open(marker, "w") as f:
    json.dump(...)
```

There is no atomic rename, file/directory sync or schema validation. On parse error:

```python
except Exception:
    m = {}
```

The function can then remove the marker and declare recovery with no privilege information. PID-only ownership also lacks process-start identity.

Power-loss behavior is explicitly unclaimed; that is appropriate. Nevertheless, calling this marker “durable” or the mechanism generally “crash-safe” is unsupported. The demonstrated property is **recovery from one SIGKILL after the marker was successfully written and revocation completed**.

**4. Revoking schema privileges is effective only under a bounded account model.**

`_bench_dml_privs()` examines only `information_schema.schema_privileges` for one account. It does not establish absence of global, role-derived or table-level DML privileges. Nor does it block another account reconnecting after the drain.

With the tested benchmark account’s schema-only privileges, A29 is convincing. As a general writer-exclusion claim, it is incomplete.

The unit test cannot extend that conclusion: SQL is mocked, grants are returned by a static lambda, and its “DML ran only while revoked” assertion checks the position of the **first** DELETE, not every write.

**5. “Complete source hash” is still false.**

Despite its docstring referring to “reg fee,” `source_content_hash()` queries only drug and procedure rows. It hashes no registration fee or registration attributes, and no relevant registration master/configuration inputs. A row-count fingerprint does not close that gap.

Also, `source_hash_version` is recorded but not explicitly required by verification. “All old freezes fail by design” is stronger than an enforced version contract.

**6. Backup data and verification metadata are not one coherent snapshot.**

After committing the stage copy, `stage_backup()` hashes the **current source/output tables**, not the staged copy:

```python
h = _content_hash(nrs, db, log)
with open(hpath, "w") as f:
    json.dump(...)
```

Backup creation is not under exclusion. A writer can change current rows between copying and hashing. Metadata writes can also fail after the stage transaction commits. Transactional row replacement alone does not make the backup-plus-hash publication atomic.

**7. Restore validates too late.**

The restore checks table existence, then DELETEs/reapplies rows, and only afterwards validates hash metadata and restored content. Empty or corrupt stage contents can destructively replace current rows before rejection. A post-restore hash-read exception also sits outside the DML exception handler.

### Fit for purpose

The current-state retry, stage retention, surviving-JVM handling and interrupted-restore replay are retained and demonstrated. The oracle is fit for reporting those **specific fixture experiments**.

It is not fit for asserting complete source immutability, continuous exclusion across crash recovery, or universally verified restoration.

**Score: 7.5/10 — up 0.5.**

## REPRODUCIBILITY

**P10 improves evidence organization and repeatability on the existing box. It does not close independent reproducibility.**

### What the supplied evidence establishes

The suite and preservation transcripts identify the same oracle prefix:

> `c3bdd2d62933`

The builder check identifies:

> `2a4a1c48b6ee1423`

and reports matching ledger serializations:

> `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`

for both live and scratch.

That is strong evidence of deterministic ledger rebuilding from the existing source environment. The exact interpretation of “byte-identical” is **the selected, ordered row serialization**, not identical database files.

The archive behavior also improves auditability:

```bash
mv /opt/dr-benchmark/results/r6_* "$ARCH"/
mv /tmp/r6_a*.log ... "$ARCH"/
```

Retaining the failed first run rather than replacing it with the successful run is particularly useful.

The wrapper’s successful and failed paths are exercised through their supplied transcripts. The wrapper source is not present here, so its provisioning and cleanup behavior cannot be freshly audited in full.

### Ranked blockers

**1. There is no immutable, available fixture.**

The fixture is a fresh dump of **current live `sik`**, plus external STRATA SQL. That is not an immutable fixture pin.

A ledger hash, encounter hash and six table checksums do not identify the entire database dependency set. Reference tables, account configuration, schema, SQL modes and other billing inputs can change independently.

The v9 request specifically included a **pinned fixture**. P10 delivers pinned tool identities and measurements of selected fixture state, not that fixture closure.

**2. Executable dependency closure is still missing.**

The owner explicitly excludes:

- secret-free `stagea_common.py`;
- Java harness/consumer sources;
- STRATA SQL;
- an independently obtainable fixture.

The classpath also names additional jars, shim/harness directories and wildcard dependencies. The manifest’s assertion that “every runtime component is pinned” is not established by its listed pins.

**3. Environment-specific configuration remains essential.**

Scripts assume paths such as:

```text
/opt/Deers-Rock/tools
/opt/dr-benchmark/results
/opt/simrs-khanza
```

and rely on root MySQL access, a specifically named benchmark account, encrypted XML configuration, Xvfb and faketime.

Reproduction does not require publishing credentials. It requires a documented, secret-free provisioning contract that creates equivalent accounts, privileges and configuration without copying the original box’s secrets.

**4. Source availability is not replaced by SHA availability.**

A hash answers “is this the same file?” It does not supply the file, explain the build or establish that the recorded binary was derived from the available source.

Likewise, the statement that local LF copies equal VPS copies is reported evidence here, not something independently recomputable from the supplied deployment files.

**5. Clean-machine reproduction remains unrun.**

The builder check reproduces the ledger **from the same source database on the same box**. It does not establish that a third party can regenerate that source state, rebuild the Java components and obtain the same results.

**6. Historical lineage remains partly unresolved.**

Pre-P6 clone-mode claims remain invalid or unverified because the harness actually used live `sik`. The historical 0/999 result has not been re-examined with the current oracle and independently retained baseline.

### What can fairly be claimed

> “The pinned tools repeatedly execute the acceptance suite and reproduce the ledger serialization on the existing environment, using fresh clones of its live database.”

Do not replace that with “re-derivable without the original live box.”

A minimally credible release needs a content-addressed fixture or deterministic fixture generator, all executable dependencies, a sanitized provisioning recipe and one clean-environment execution with archived outputs. Hashing a large dump is routine; “too large to pin by hash” should be deleted.

**Score: 6/10 — unchanged.**

## E2E-DESIGN

**The benchmark has a useful multi-path design. Its weakest leg remains financial independence and encounter-level reconciliation—not recovery throughput or test count.**

### What the design now supports

The P7 write-provenance audit supports the corrected model: the real form writes `billing` as well as nota tables. Consequently, comparing freshly form-written billing rows against an earlier frozen consumer baseline is a meaningful **same-encounter consumer-versus-form comparison**.

The current oracle compares multisets containing:

```python
(status, nm_perawatan, biaya, jumlah, totalbiaya)
```

That is stronger than comparing only cohort revenue. It can detect many line and quantity differences.

But distinguish three claims:

1. **Sampled form comparison:** supported for the encounters actually exercised.
2. **Consumer-versus-ledger reconciliation:** supported within its declared predicates and shared-source limitations.
3. **Independent clinical/financial ground truth:** not established.

The note-level B source is operationally distinct, but it is not an independent specification of what a patient should owe.

### B–C arithmetic and interpretation

For the current October figures:

- B: **151 notes / Rp49,903,019**
- A/C: **Rp3,113,533,580**
- Difference: **Rp3,063,630,561**
- B amount as a fraction of the cohort total: approximately **1.603%**

That is a comparison of different coverage sets. It is not a 98.397% billing error, nor does the subset percentage establish correctness for matched encounters.

The original 149-note total and later 151-note total differ by:

- **2 notes**
- **Rp164,065**

Without matched encounter identities and a reconciled payment model, these aggregate changes say little about settlement correctness.

### What the preservation experiment adds—and what it does not

It adds a genuinely integrated sequence:

1. real timeout configuration;
2. FAILED/PENDING batch state;
3. populated stages;
4. normal terminal failure;
5. fixture retention;
6. changed billing rows;
7. verified retry restoration;
8. successful billing of both dates.

That is much better E2E recovery evidence than P9’s disconnected tests.

However, it does **not fully satisfy v9’s single next step**:

| Requested property | Current disposition |
|---|---|
| Normal terminal failure with populated artifacts | **Demonstrated** |
| Nonzero wrapper exit and retained fixture | **Demonstrated** |
| Retry forced to restore under tested account exclusion | **Demonstrated** |
| Independently pinned fixture | **Open** |
| Immediate restoration asserted within the same experiment | **Open** |
| Protected rows measured before initial destructive work | **Open** |
| Independent protection oracle and complete artifact hashes | **Partial** |
| Per-operation acceptance, not merely marker existence | **Partial** |

A concrete counterexample shows the gap: if immediate restoration were skipped and returned False, the initial sample could remain reset. The preservation pre-hash would record that already-damaged state. Terminal retention could still compare equal. The subsequent `UPDATE` could affect zero billing rows—the script does not assert 17—and retry could restore successfully from stages and bill both dates. The preservation check could still PASS.

That is why “integrated” does not yet mean “the entire requested property was verified.”

### The weakest financial leg and its fix

The ledger derives codes and quantities from the same source tables used by the other paths. Its tariff authority also permits missing-entry fallback. Agreement can therefore validate internal consistency while missing shared mistakes.

The next financial layer should retain a **pre-adapter encounter manifest**, then assert for matched encounters:

- exact encounter coverage and uniqueness;
- charge-line identity, not only aggregate quantities;
- code/name mapping;
- quantity, unit price and amount;
- discounts, additions and tax;
- paid amount, credit/receivable and residual balance;
- explicit treatment of cancellations and duplicate notes.

The quantity line-diff’s same-price code-swap blind spot remains. The row-multiset oracle can catch a changed displayed name, but that is not a general code-identity guarantee.

### Highest-priority next action

**Repair the existing preservation experiment before adding another check number.** Take pre-operation independent snapshots, assert immediate and retry restoration separately, fix A28’s discriminating fault point, validate complete hash inventories and retain the fixture on any failure.

The top three v9 priorities remain: recovery/acceptance integrity, independent reproducibility, then independent encounter-level financial validation.

**Score: 7/10 — unchanged.**

## EXTERNAL-VALIDITY

**P10 contributes no new external-validation evidence. Its value is engineering assurance inside one synthetic environment.**

### Fair scope

The defensible claim remains:

> High-volume synthetic outpatient billing-consumer execution on one Khanza/MySQL configuration, with real-form comparisons on selected encounters and recovery behavior demonstrated under specified injected faults.

The explicitly unclaimed areas are correctly stated:

- inpatient and broader payer workflows;
- representative facility operations;
- diagnosis and dispensing calibration;
- clinically reviewed coherence;
- payer/demographic/seasonal mix;
- a second HMS;
- independent facility-reference validation.

C1–C4 remain **NOT TESTED**. Those are not documentation tasks; they are missing evidence.

### Performance arithmetic

The reported rates are consistent within rounding:

- Consumer:
  \[
  86{,}101 / 47.8 = 1{,}801.28\ \text{visits/minute}
  \]
- Consumer wall time:
  \[
  47.8 \times 60{,}000 / 86{,}101 \approx 33.31\ \text{ms/visit}
  \]
- Real-form sample:
  \[
  999 \times 60 / 8{,}393 \approx 7.142\ \text{visits/minute}
  \]
- Ratio: approximately **252×**.

The arithmetic is sound. The inference must remain bounded: the two paths perform different work. This is **not** a measured 252× improvement in cashier productivity or equivalent end-to-end hospital processing.

Likewise:

- \(4/216 = 1.8519\%\).
- \(0/999 = 0\%\) observed sample mismatch.
- \(3/999 \approx 0.3003\%\), but the sampling assumptions needed for that population bound were not established.

Withdrawing the population-bound claim was correct.

### Edge strata are not external validation

The embalase/tuslah experiments are useful configuration findings: authored source charges did not produce an observable outpatient bill difference in this configuration.

They do not establish that those financial behaviors are handled correctly in facilities where the charges are used. ZEROFEE/HALFPPN remain unretested in the corrected setup, and exclusion/classification of >2-procedure encounters is not validation of their financial correctness.

A synthetic cohort with roughly 82.7% PPN-inclusive drug revenue also needs real-source calibration before it can stand in for representative hospital economics.

### Top external risk

**Internal agreement will be mistaken for representative financial correctness.**

Three paths can agree because they share encounter inputs, tariff assumptions, mapping decisions or configuration—not because those inputs represent real practice. Strong recovery engineering does not change that.

The most valuable external next step is a small, authorized facility-reference dataset with encounter-level settlement reconciliation and clinician/pharmacist review. Another synthetic fault injection does not substitute for it.

### Overall v10 verdict and scoring

**63/100 — Needs targeted rework.**

Fractional criterion scores make the narrow improvement explicit:

| Criterion | v9 | v10 |
|---|---:|---:|
| Claim-honesty | 7 | **7** |
| Gate-correctness | 6 | **6.5** |
| Oracle-validity | 7 | **7.5** |
| Reproducibility | 6 | **6** |
| E2E-design | 7 | **7** |
| External-validity | 4 | **4** |

\[
\operatorname{round}\left(
\frac{7+6.5+7.5+6+7+4}{6}\times10
\right)
=
\operatorname{round}(63.33)
=
\boxed{63/100}
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63.**

P10 earns credit for real retained artifacts, stricter input handling, tested privilege denial and recovery from the regression it introduced. It does not earn full closure because the rollback test is nondiscriminating, the integrated experiment misses immediate preservation, and exclusion recovery still has unsafe and fail-open boundaries.

**External-validity score: 4/10 — unchanged.**

## VERDICT

## Overall verdict

**63/100 — Needs targeted rework.**

P10 makes a **narrow but genuine improvement over v9**: stronger retained-artifact evidence, tested writer exclusion under the benchmark account’s privilege model, and demonstrated interrupted-restore recovery. It does **not** close the central gap between successful individual recovery demonstrations and an acceptance gate that proves preservation and verified restoration for **every required operation**.

This synthesis uses the supplied assessments’ code and run findings; it is not a fresh inspection of the repository or execution of the suite.

## Criterion scores and historical deltas

Delta vectors follow this order: **4701365 / 4769794 / 4795743 / 4818826 / v7 / v8 / v9**.

| Criterion | Score | Deltas against the seven prior scores |
|---|---:|---|
| Claim-honesty | **7/10** | **+3 / +2 / +2 / +1 / +1 / +1 / 0** |
| Gate-correctness | **6.5/10** | **+3.5 / +3.5 / +3.5 / +1.5 / +0.5 / +0.5 / +0.5** |
| Oracle-validity | **7.5/10** | **+3.5 / +3.5 / +4.5 / +2.5 / +1.5 / +0.5 / +0.5** |
| Reproducibility | **6/10** | **+3 / +1 / 0 / +1 / 0 / 0 / 0** |
| E2E-design | **7/10** | **+3 / +2 / +2 / +1 / 0 / 0 / 0** |
| External-validity | **4/10** | **+1 / 0 / 0 / 0 / 0 / 0 / 0** |

### Claim-honesty — 7/10
**Justification:** A11’s count derivation is repaired, but its label, **“every restore OUTSIDE the deliberate-fault checks … hash-verified,”** still exceeds what acceptance establishes, and stale `b["restored"] = True` can survive a `RETRY-REFUSED` outcome.  
**Biggest remaining risk:** Readers will interpret aggregate markers and historical success flags as guarantees about complete coverage and the current restored state.

### Gate-correctness — 6.5/10
**Justification:** The assessments retain demonstrated nonzero termination and failed-fixture retention, but `stage[n] = str(rows[0][1]) if rows else None` can turn an unavailable checksum into a comparable string rather than a rejected value.  
**Biggest remaining risk:** A nondiscriminating rollback test, incomplete operation inventories and post-damage baselines can allow preservation failures to pass.

### Oracle-validity — 7.5/10
**Justification:** A29 demonstrates exclusion for the tested schema-only account and A20 demonstrates one SIGKILL recovery placement, but backup metadata is computed from current tables using `_content_hash(nrs, db, log)` **after** the stage copy commits.  
**Biggest remaining risk:** Incoherent backup/hash publication, incomplete privilege coverage and validation after destructive writes can make recovery unsafe outside the demonstrated cases.

### Reproducibility — 6/10
**Justification:** The manifest’s **“re-derivable without the original live box”** claim remains unsupported because executable dependencies, an obtainable fixture and a clean-environment run are missing.  
**Biggest remaining risk:** An independent researcher cannot reconstruct the source state and execution environment, even if every available file’s hash matches.

### E2E-design — 7/10
**Justification:** Although **“Normal terminal failure with populated artifacts”** is demonstrated, **“Immediate restoration asserted within the same experiment”** remains open, and preservation baselines are captured after the initial failure and restore attempt.  
**Biggest remaining risk:** The integrated experiment can pass after initial damage because its baseline records that already-damaged state.

### External-validity — 4/10
**Justification:** The evidence supports **“0/999 = 0% observed sample mismatch,”** not a population guarantee or a **“252× improvement in cashier productivity.”**  
**Biggest remaining risk:** Agreement among paths sharing inputs, tariffs and mappings will be mistaken for representative encounter-level financial correctness.

## 1. Disposition of v9 findings

### Genuinely fixed or demonstrated—but only within the stated scope

The supplied assessments support these **bounded closures**, not universal safety claims:

- **A11 count derivation:** Fixed; the accounting improvement does not establish that every expected restore was verified.
- **Failure termination and fixture retention:** Nonzero suite/wrapper termination and retained failed fixtures are supported by implementation findings and demonstrated outcomes.
- **Missing-stage refusal and conditional cleanup:** Retained closures; cleanup is conditioned on verified restoration in the covered paths.
- **Retry recovery under tested exclusion:** Demonstrated for the benchmark account’s schema-only privilege configuration, including effective privilege denial in A29.
- **Interrupted-restore replay:** A20 demonstrates recovery from **one** SIGKILL placement, after marker creation and revocation completed.
- **Current-state retry and surviving-JVM handling:** The oracle assessment explicitly identifies these as retained and demonstrated.

**A22 requires an evidence qualification:** the claim-honesty assessment explicitly calls it fixed, but the supplied excerpt does not identify its concrete code change or asserted run; it is therefore a **reported closure**, not one independently auditable from these excerpts.

### Partially fixed or merely claimed as complete

| Finding | Actual disposition |
|---|---|
| A11 universally verified restores | **Count fixed; completeness open.** One verified operation can coexist with an unverified operation without rejection. |
| E5 truthful result artifacts | **Partial code repair.** A refused retry can leave an earlier restored flag active; comprehensive artifact assertions are absent. |
| “13 populated stage tables” | **Not established.** Evidence supports 13 tables containing 21 rows in aggregate. |
| “Independent hashes” | **Independent process/read only.** `p10_hash_state.py` reuses `o._content_hash(...)` and its protection scope. |
| “Crash-safe via the marker” | **Overbroad.** One successful crash-recovery experiment does not establish durable marker publication or fail-closed recovery. |
| A10e equal DELETE/INSERT scope | **Not established.** DELETE includes orphan rows; INSERT requires registered encounters. |
| A17 comprehensive live protection | **Entry-point guard only.** Helpers and the actual XML/JVM target remain outside that guarantee. |
| Independently reproducible benchmark | **Claimed, not demonstrated.** Same-box reproduction is not clean-machine reconstruction. |

### Still open

- Discriminating A28 rollback verification.
- Immediate preservation measured from a **pre-operation** baseline.
- Expected-operation inventories and unintended-error detection, including additional failures within deliberate-fault logs.
- Complete source hashing, including registration fees, attributes and relevant configuration; enforced hash-version compatibility.
- Coherent backup-plus-metadata publication and validation before destructive restoration.
- Exclusion across relevant privilege sources and crash-recovery boundaries.
- Independent fixture/dependency closure and clean-machine reproduction.
- Independent encounter-level financial validation and historical reassessment of the 0/999 result.

## 2. New problems P10 introduced or exposed

The excerpts establish several **newly exposed weaknesses**, but do not establish when every underlying defect was introduced.

1. **Exclusion-recovery machinery creates additional failure boundaries.** Direct, non-`fsync` marker writes, discarded malformed markers and grant-restoration errors weaken the generalized crash-safety claim.
2. **Retry status can become stale.** `RETRY-REFUSED` need not clear a previous `restored=True`, allowing a current-state misreport.
3. **The integrated preservation experiment admits a false-positive path.** Its baseline is too late, and its perturbing `UPDATE` need not affect the intended 17 rows.
4. **Unavailable checksums can compare equal.** Stringification defeats the intended `None` rejection.
5. **Experiment teardown can destroy failure evidence.** Teardown proceeds after failed assertions, and the script lacks an EXIT trap for its own grant/configuration changes.
6. **P10 exposes backup publication incoherence.** Staged rows and hashes of subsequently read live rows need not describe the same state.

The summary also reports recovery from a regression P10 introduced, but the excerpts do not provide enough detail to attribute that regression more specifically.

## 3. Top three remaining issues

1. **Recovery and acceptance integrity:** Eliminate false-positive preservation outcomes, stale success reporting and destructive validation order.
2. **Independent reproducibility:** Supply the fixture, executable dependency closure and sanitized provisioning contract, then demonstrate a clean-environment run.
3. **Independent financial correctness:** Validate encounter and charge-line identity, prices, adjustments and settlement against an independently retained reference—not merely shared-source agreement.

## 4. Top three strongest properties to lead with

1. **Demonstrated failure containment:** Nonzero termination and retained populated artifacts make covered failures inspectable.
2. **Concrete recovery experiments:** Forced retry, surviving-JVM handling and bounded SIGKILL replay are stronger evidence than recovery claims alone.
3. **Repeatable execution in the existing environment:** Pinned tools reproduce ledger serialization and execute acceptance experiments on fresh clones of the existing source database.

These are defensible claims without implying portable reproduction, universal crash safety or representative hospital accuracy.

## 5. Overall score and comparison

\[
\operatorname{round}\left(\frac{7+6.5+7.5+6+7+4}{6}\times10\right)
=\boxed{63/100}
\]

| Prior assessment | Overall delta |
|---|---:|
| 35 — run 4701365 | **+28** |
| 43 — run 4769794 | **+20** |
| 43 — run 4795743 | **+20** |
| 52 — run 4818826 | **+11** |
| 58 — v7 | **+5** |
| 60 — v8 | **+3** |
| 62 — v9 | **+1** |

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63.**

The one-point gain reflects stronger bounded gate and oracle evidence; honesty, reproducibility, end-to-end completeness and external validity have not materially advanced.

## 6. Verdict

**Needs targeted rework.**

The work supports a credible account of specific recovery experiments, but not yet the broader preservation, reproducibility and financial-validity claims needed for submission as currently framed.

## 7. Single most important next step

**Repair the existing preservation experiment before adding another check.**

Capture independent snapshots **before any destructive operation**, separately assert immediate and retry restoration, validate complete non-null hash inventories and perturbation row counts, and retain the fixture on every failure. Crucially, demonstrate that deliberately skipping immediate restoration and breaking rollback each make the experiment **fail**. That would turn the central preservation claim into a discriminating, auditable test.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

**P10 is a substantive improvement, but its PASS labels still exceed its assertions.** The retained failed run is valuable evidence. The declaration that the recovery work is now “crash-safe” is not.

This assessment is a source-and-evidence review, not an execution. Eight tool sources are explicitly **not embedded**, including `dbutil.py`, the wrapper, both reconciliation tools and the builder-check script. Their hashes identify claimed versions; they do not let me re-read their implementations. Findings about those tools remain bounded by the supplied transcripts and historical evidence.

### What is honestly supported

- **The suite count is correct:** 34 previous checks plus A26, A27, A28, A29 and A31 equals **39**. A30 belongs to the separate preservation run, not the 39-check suite.
- Run 1 was **30/38 = 78.95%**, with eight failures. Run 2 reports **39/39 = 100%**. Publishing the failed run materially strengthens the evidence.
- The A22 correction is accurate: the SQL changes **all 17 billing rows**, increasing their combined amount by **Rp17**, not Rp1.
- The preservation transcript establishes a normal terminal failure with recovery material present:
  > `stage tables: 13, populated rows: 21 (pre) / 21 (post)`
  
  This closes the specific P9 defect of testing terminal retention with **zero** recovery tables.
- `_finalize()` no longer unconditionally writes “restored from stage backup.” Its new `_restore_state()` distinguishes backup failure, verified restoration and non-restoration.
- The exclusions concerning independent reproduction, encounter-level financial reconciliation, untested fault modes and external validation are explicit.

### Remaining or new overclaims

**1. A11 still claims a universal property from an existential assertion.**

The new computation correctly distinguishes the file sets:

```bash
RV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORED-VERIFIED")
```

But acceptance still requires only:

```bash
[ "$RV_OTH" -ge 1 ]
```

The transcript reports **16 total markers and 16 outside the four excluded files**, with four deliberate failure markers. Those numbers are mutually consistent. The raw logs are not embedded, so I cannot independently recount them.

What does not follow is the label:

> “every restore OUTSIDE the deliberate-fault checks … hash-verified”

One verified operation plus another operation with missing verification and no recognized error marker can satisfy A11. P10 fixes the derivation of the count, **not completeness of acceptance**.

**2. “13 populated stage tables” is not established.**

There are 13 stage tables and **21 rows in aggregate**. Neither the checker nor the displayed transcript establishes that every table contains rows. Say “13 stage tables containing 21 rows in total.”

**3. “Independent hashes” needs qualification.**

`p10_hash_state.py` explicitly uses:

```python
"sample": o._content_hash(...),
"protected": o._content_hash(...),
```

That is an independent process/read, not an independent implementation or independently defined protection scope. It inherits the oracle’s omissions.

**4. “Crash-safe via the marker” is too broad.**

A20 demonstrates recovery from one SIGKILL placement. The marker is written directly, without atomic replacement or `fsync`; malformed markers are discarded; grant-restoration errors do not necessarily invalidate restoration success. Details follow below.

**5. The result-artifact wording is improved, but can still be stale.**

In the FAILED retry path, a failed `stage_restore()` produces `RETRY-REFUSED` without updating an earlier `b["restored"] = True`. `_finalize()` can therefore still report:

> `restored, hash-verified`

after the current retry was refused and the current data differ from the pre-reset state. The unconditional false claim is removed; **current-state reporting is not fully repaired**.

**6. Old affirmative claims remain active.**

Examples:

- The manifest says the benchmark is “re-derivable without the original live box.”
- Its limitation says DB images are “too large to pin by hash.” Size is not an obstacle to streaming a hash.
- The oracle docstring still says harness retargeting uses `database.ini`.
- R5’s early sections still describe “fail-closed tariff authority” more broadly than the builder implements.
- A13 still calls selected before/after equality “untouched.”

The later qualifications do not automatically neutralize these affirmative statements.

**Disposition of v9 reporting findings:** A22 is fixed; A11 accounting is fixed but its universal label is not; E5 is partially fixed in code, not comprehensively asserted in result-artifact tests; reproduction and “live untouched” overclaims remain.

**Score: 7/10 — unchanged from v9.**

## GATE-CORRECTNESS

**The suite now demonstrates more meaningful failures. It still contains tests that can pass without establishing the property named in their label.**

### Can the new checks fail when their property is violated?

| Check | What it genuinely detects | What it does not establish |
|---|---|---|
| **A26** | `'12x'` in the scratch tariff must produce `MALFORMED-AMOUNT`, `FAIL-CLOSED`, exit 1 and equal ledger hashes. The transcript demonstrates this. | NULL/empty source handling throughout the builder; tariff coverage; hash-read failure handling. |
| **A27** | A `biaya_obat` change after freeze must trigger source drift, exit 3 and no reset marker. Demonstrated. | Complete source-input coverage or rejection of an unreadable source query. |
| **A28** | Injected backup error, exit 4, stage retention and unchanged checksums. | **Rollback is not causally demonstrated**, because replacement rows are identical to the old rows. |
| **A29** | A fresh benchmark connection cannot perform the tested UPDATE during the pause; access works afterwards. Demonstrated with MySQL error 1142. | All effective privilege paths, all accounts, uninterrupted exclusion after a crash, or even necessarily the stated denial reason—the predicate accepts any `WRITE-DENIED` exception. |
| **A31** | Start/end schema-grant equality, no marker remaining and at least one recovery log. | Per-operation restoration, effective privileges, or absence of an unsafe interval. |
| **Preservation** | Kept fixture and table contents survive the normal failed terminal path; a subsequent retry restores and bills. | Independent correctness of immediate restoration, complete protected-state preservation or robust failure handling of the checker itself. |

### A28 is the central defective new negative test

The first timeout restores the original rows. The retry then backs up that same current state:

```bash
C0=$(stage_cks r6_a28)
env ... R5_FAULT_BACKUP_FAIL=1 ... --retry-failed
C1=$(stage_cks r6_a28)
```

The injected error is **after all DELETE/REPLACE statements**, just before COMMIT.

If those statements were accidentally autocommitted, they would replace the staged rows with identical rows. **`C0 == C1` would still hold.** With the same failure reporting, A28 could pass despite rollback being broken.

Fix it by injecting failure **after a destructive DELETE and before its replacement**, or by testing a direct re-backup with deliberately distinguishable old and candidate snapshots. Assert which version survived. The current implementation has a transaction-shaped repair; the test does not prove its essential protective property.

### Preservation: meaningful progress, incomplete acceptance

The production terminal path is exercised with populated artifacts. That is a genuine v9 closure.

However:

1. **A30’s underlying result is overwritten.**
   ```bash
   if ...; then st=1; ... fi
   ```
   The outer checker cannot distinguish “A30 preconditions passed, then forced failure” from “A30 already failed, then decorated as forced.” It rechecks some preconditions, not all.

2. **Immediate restoration is not asserted.** The preservation run does not require timeout proof, exclusion on/off or verified restoration from `/tmp/r6_p10.log`.

3. **Protected/sample pre-hashes are taken after the initial failure and restore attempt.** They cannot establish preservation through that initial operation.

4. **Checksum failure can masquerade as a value.**
   ```python
   stage[n] = str(rows[0][1]) if rows else None
   ...
   any(v is None for v in stage.values())
   ```
   A SQL NULL checksum becomes `"None"` or `"NULL"`, not Python `None`. Repeated unavailable checksums can compare equal. Live checksums have the same stringification problem.

5. The helper does not assert the expected 13-table inventory, all six live results, or 20 distinct, existing, disjoint protected visits.

6. Teardown happens even after failed assertions. A failed preservation experiment can therefore destroy the fixture it should retain for investigation. The script also lacks an EXIT trap for its own grant/configuration changes.

### Other v9 gate findings

**A10e does not prove DELETE scope equals INSERT scope.**

The builder explicitly deletes:

```sql
... AND (rp.no_rawat IS NULL OR <cohort predicate>)
```

Inserts require registered encounters. Thus orphan ledger rows are deleted without being rebuilt, including under `--cohort dr`, where their cohort cannot be established. This is a garbage-collection policy, not identical replacement scope. A10e demonstrates protection of **one registered non-DR row**, not orphan protection.

**A17 protects suite entry, not every mutation path.**

The oracle only requires `--allow-live` for `db == "sik"` billing runs. Direct helper calls bypass that guard. `stage_restore("sik", ...)` explicitly performs a plain restore without exclusion. The oracle does not verify the actual XML/JVM target against `--db-name`. These remain v9 limitations.

**A11 still lacks an expected operation inventory and planted unintended-error test.** It also excludes entire deliberate-fault logs, where additional failures of other classes can escape its aggregate accounting.

**Retained closures:** nonzero suite termination, kept failed fixtures, conditional cleanup after verified restoration and missing-stage refusal are all supported. The omitted builder-check source prevents fresh verification of its negative-check implementation; the P10 transcript shows its positive reproduction case only.

**Score: 6.5/10 — up 0.5.** Real acceptance coverage improved; A28 and preservation-check weaknesses prevent a larger increase.

## ORACLE-VALIDITY

**The oracle is better for the narrow injected-fault claims. It is not a complete-input, crash-safe, fail-closed recovery system.**

### What P10 actually repairs

**Source prices:** `source_content_hash()` now includes `biaya_obat`, `total`, `h_beli` and procedure amount columns. A25 and A27 demonstrate quantity and price drift rejection. Query exceptions are no longer silently treated as an empty source set.

**Backup replacement:** `stage_backup()` submits its replacement statements inside:

```python
sql = ["START TRANSACTION;"]
...
sql.append("COMMIT;")
```

and treats unsuccessful session closure as failure. `_finalize()` now retains stages after backup failure. Those are substantive source fixes. A28’s rollback experiment remains insufficient, as explained above; `dbutil.session` itself is not embedded.

**FAILED retry quiet interval:** `include_failed=args.retry_failed or args.abandon_failed` puts FAILED visits into the quiet-check set. The preservation transcript shows `quiet=true`. This repairs the specific v9 omission.

**Fixture writer exclusion:** A29 demonstrates the intended schema-grant configuration:

> `before=DELETE,INSERT,SELECT,UPDATE during=SELECT after=DELETE,INSERT,SELECT,UPDATE`

and:

> `ERROR 1142 ... UPDATE command denied`

**SIGKILL recovery:** Run 1 genuinely exposed the new privilege-loss defect. Run 2 demonstrates A20 recovery and A31 reports one recovered exclusion. Credit the fix for that tested interruption—not for every crash boundary.

### Ranked residual risks

**1. Exclusion recovery restores access before it recovers the interrupted data operation.**

At startup:

```python
recover_writer_exclusion(db, log)
```

runs before baseline verification, writer reaping and restoration. Recovery grants DML back and removes the marker. An interrupted half-restore is therefore exposed to writers before a later restore reacquires exclusion.

It gets worse if baseline verification then fails: the oracle can exit with grants restored and the interrupted data operation unresolved.

A recovery marker should preserve exclusion until the interrupted operation is safely resolved, not merely repair account availability.

**2. Grant restoration is not fail-closed.**

`stage_restore()` returns the inner restore result; the `finally` block logs re-grant failure or mismatch but does not override success:

```python
return _stage_restore_inner(...)
...
log("WRITER-EXCLUSION off ... MISMATCH - grants not as before")
```

A verified row restore can therefore be reported successful despite failed privilege restoration.

`recover_writer_exclusion()` similarly reads back privileges but never checks equality against the recorded set before removing the marker and returning True.

**3. The marker is neither robustly durable nor safely parsed.**

```python
with open(marker, "w") as f:
    json.dump(...)
```

There is no atomic rename, file/directory sync or schema validation. On parse error:

```python
except Exception:
    m = {}
```

The function can then remove the marker and declare recovery with no privilege information. PID-only ownership also lacks process-start identity.

Power-loss behavior is explicitly unclaimed; that is appropriate. Nevertheless, calling this marker “durable” or the mechanism generally “crash-safe” is unsupported. The demonstrated property is **recovery from one SIGKILL after the marker was successfully written and revocation completed**.

**4. Revoking schema privileges is effective only under a bounded account model.**

`_bench_dml_privs()` examines only `information_schema.schema_privileges` for one account. It does not establish absence of global, role-derived or table-level DML privileges. Nor does it block another account reconnecting after the drain.

With the tested benchmark account’s schema-only privileges, A29 is convincing. As a general writer-exclusion claim, it is incomplete.

The unit test cannot extend that conclusion: SQL is mocked, grants are returned by a static lambda, and its “DML ran only while revoked” assertion checks the position of the **first** DELETE, not every write.

**5. “Complete source hash” is still false.**

Despite its docstring referring to “reg fee,” `source_content_hash()` queries only drug and procedure rows. It hashes no registration fee or registration attributes, and no relevant registration master/configuration inputs. A row-count fingerprint does not close that gap.

Also, `source_hash_version` is recorded but not explicitly required by verification. “All old freezes fail by design” is stronger than an enforced version contract.

**6. Backup data and verification metadata are not one coherent snapshot.**

After committing the stage copy, `stage_backup()` hashes the **current source/output tables**, not the staged copy:

```python
h = _content_hash(nrs, db, log)
with open(hpath, "w") as f:
    json.dump(...)
```

Backup creation is not under exclusion. A writer can change current rows between copying and hashing. Metadata writes can also fail after the stage transaction commits. Transactional row replacement alone does not make the backup-plus-hash publication atomic.

**7. Restore validates too late.**

The restore checks table existence, then DELETEs/reapplies rows, and only afterwards validates hash metadata and restored content. Empty or corrupt stage contents can destructively replace current rows before rejection. A post-restore hash-read exception also sits outside the DML exception handler.

### Fit for purpose

The current-state retry, stage retention, surviving-JVM handling and interrupted-restore replay are retained and demonstrated. The oracle is fit for reporting those **specific fixture experiments**.

It is not fit for asserting complete source immutability, continuous exclusion across crash recovery, or universally verified restoration.

**Score: 7.5/10 — up 0.5.**

## REPRODUCIBILITY

**P10 improves evidence organization and repeatability on the existing box. It does not close independent reproducibility.**

### What the supplied evidence establishes

The suite and preservation transcripts identify the same oracle prefix:

> `c3bdd2d62933`

The builder check identifies:

> `2a4a1c48b6ee1423`

and reports matching ledger serializations:

> `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`

for both live and scratch.

That is strong evidence of deterministic ledger rebuilding from the existing source environment. The exact interpretation of “byte-identical” is **the selected, ordered row serialization**, not identical database files.

The archive behavior also improves auditability:

```bash
mv /opt/dr-benchmark/results/r6_* "$ARCH"/
mv /tmp/r6_a*.log ... "$ARCH"/
```

Retaining the failed first run rather than replacing it with the successful run is particularly useful.

The wrapper’s successful and failed paths are exercised through their supplied transcripts. The wrapper source is not present here, so its provisioning and cleanup behavior cannot be freshly audited in full.

### Ranked blockers

**1. There is no immutable, available fixture.**

The fixture is a fresh dump of **current live `sik`**, plus external STRATA SQL. That is not an immutable fixture pin.

A ledger hash, encounter hash and six table checksums do not identify the entire database dependency set. Reference tables, account configuration, schema, SQL modes and other billing inputs can change independently.

The v9 request specifically included a **pinned fixture**. P10 delivers pinned tool identities and measurements of selected fixture state, not that fixture closure.

**2. Executable dependency closure is still missing.**

The owner explicitly excludes:

- secret-free `stagea_common.py`;
- Java harness/consumer sources;
- STRATA SQL;
- an independently obtainable fixture.

The classpath also names additional jars, shim/harness directories and wildcard dependencies. The manifest’s assertion that “every runtime component is pinned” is not established by its listed pins.

**3. Environment-specific configuration remains essential.**

Scripts assume paths such as:

```text
/opt/Deers-Rock/tools
/opt/dr-benchmark/results
/opt/simrs-khanza
```

and rely on root MySQL access, a specifically named benchmark account, encrypted XML configuration, Xvfb and faketime.

Reproduction does not require publishing credentials. It requires a documented, secret-free provisioning contract that creates equivalent accounts, privileges and configuration without copying the original box’s secrets.

**4. Source availability is not replaced by SHA availability.**

A hash answers “is this the same file?” It does not supply the file, explain the build or establish that the recorded binary was derived from the available source.

Likewise, the statement that local LF copies equal VPS copies is reported evidence here, not something independently recomputable from the supplied deployment files.

**5. Clean-machine reproduction remains unrun.**

The builder check reproduces the ledger **from the same source database on the same box**. It does not establish that a third party can regenerate that source state, rebuild the Java components and obtain the same results.

**6. Historical lineage remains partly unresolved.**

Pre-P6 clone-mode claims remain invalid or unverified because the harness actually used live `sik`. The historical 0/999 result has not been re-examined with the current oracle and independently retained baseline.

### What can fairly be claimed

> “The pinned tools repeatedly execute the acceptance suite and reproduce the ledger serialization on the existing environment, using fresh clones of its live database.”

Do not replace that with “re-derivable without the original live box.”

A minimally credible release needs a content-addressed fixture or deterministic fixture generator, all executable dependencies, a sanitized provisioning recipe and one clean-environment execution with archived outputs. Hashing a large dump is routine; “too large to pin by hash” should be deleted.

**Score: 6/10 — unchanged.**

## E2E-DESIGN

**The benchmark has a useful multi-path design. Its weakest leg remains financial independence and encounter-level reconciliation—not recovery throughput or test count.**

### What the design now supports

The P7 write-provenance audit supports the corrected model: the real form writes `billing` as well as nota tables. Consequently, comparing freshly form-written billing rows against an earlier frozen consumer baseline is a meaningful **same-encounter consumer-versus-form comparison**.

The current oracle compares multisets containing:

```python
(status, nm_perawatan, biaya, jumlah, totalbiaya)
```

That is stronger than comparing only cohort revenue. It can detect many line and quantity differences.

But distinguish three claims:

1. **Sampled form comparison:** supported for the encounters actually exercised.
2. **Consumer-versus-ledger reconciliation:** supported within its declared predicates and shared-source limitations.
3. **Independent clinical/financial ground truth:** not established.

The note-level B source is operationally distinct, but it is not an independent specification of what a patient should owe.

### B–C arithmetic and interpretation

For the current October figures:

- B: **151 notes / Rp49,903,019**
- A/C: **Rp3,113,533,580**
- Difference: **Rp3,063,630,561**
- B amount as a fraction of the cohort total: approximately **1.603%**

That is a comparison of different coverage sets. It is not a 98.397% billing error, nor does the subset percentage establish correctness for matched encounters.

The original 149-note total and later 151-note total differ by:

- **2 notes**
- **Rp164,065**

Without matched encounter identities and a reconciled payment model, these aggregate changes say little about settlement correctness.

### What the preservation experiment adds—and what it does not

It adds a genuinely integrated sequence:

1. real timeout configuration;
2. FAILED/PENDING batch state;
3. populated stages;
4. normal terminal failure;
5. fixture retention;
6. changed billing rows;
7. verified retry restoration;
8. successful billing of both dates.

That is much better E2E recovery evidence than P9’s disconnected tests.

However, it does **not fully satisfy v9’s single next step**:

| Requested property | Current disposition |
|---|---|
| Normal terminal failure with populated artifacts | **Demonstrated** |
| Nonzero wrapper exit and retained fixture | **Demonstrated** |
| Retry forced to restore under tested account exclusion | **Demonstrated** |
| Independently pinned fixture | **Open** |
| Immediate restoration asserted within the same experiment | **Open** |
| Protected rows measured before initial destructive work | **Open** |
| Independent protection oracle and complete artifact hashes | **Partial** |
| Per-operation acceptance, not merely marker existence | **Partial** |

A concrete counterexample shows the gap: if immediate restoration were skipped and returned False, the initial sample could remain reset. The preservation pre-hash would record that already-damaged state. Terminal retention could still compare equal. The subsequent `UPDATE` could affect zero billing rows—the script does not assert 17—and retry could restore successfully from stages and bill both dates. The preservation check could still PASS.

That is why “integrated” does not yet mean “the entire requested property was verified.”

### The weakest financial leg and its fix

The ledger derives codes and quantities from the same source tables used by the other paths. Its tariff authority also permits missing-entry fallback. Agreement can therefore validate internal consistency while missing shared mistakes.

The next financial layer should retain a **pre-adapter encounter manifest**, then assert for matched encounters:

- exact encounter coverage and uniqueness;
- charge-line identity, not only aggregate quantities;
- code/name mapping;
- quantity, unit price and amount;
- discounts, additions and tax;
- paid amount, credit/receivable and residual balance;
- explicit treatment of cancellations and duplicate notes.

The quantity line-diff’s same-price code-swap blind spot remains. The row-multiset oracle can catch a changed displayed name, but that is not a general code-identity guarantee.

### Highest-priority next action

**Repair the existing preservation experiment before adding another check number.** Take pre-operation independent snapshots, assert immediate and retry restoration separately, fix A28’s discriminating fault point, validate complete hash inventories and retain the fixture on any failure.

The top three v9 priorities remain: recovery/acceptance integrity, independent reproducibility, then independent encounter-level financial validation.

**Score: 7/10 — unchanged.**

## EXTERNAL-VALIDITY

**P10 contributes no new external-validation evidence. Its value is engineering assurance inside one synthetic environment.**

### Fair scope

The defensible claim remains:

> High-volume synthetic outpatient billing-consumer execution on one Khanza/MySQL configuration, with real-form comparisons on selected encounters and recovery behavior demonstrated under specified injected faults.

The explicitly unclaimed areas are correctly stated:

- inpatient and broader payer workflows;
- representative facility operations;
- diagnosis and dispensing calibration;
- clinically reviewed coherence;
- payer/demographic/seasonal mix;
- a second HMS;
- independent facility-reference validation.

C1–C4 remain **NOT TESTED**. Those are not documentation tasks; they are missing evidence.

### Performance arithmetic

The reported rates are consistent within rounding:

- Consumer:
  \[
  86{,}101 / 47.8 = 1{,}801.28\ \text{visits/minute}
  \]
- Consumer wall time:
  \[
  47.8 \times 60{,}000 / 86{,}101 \approx 33.31\ \text{ms/visit}
  \]
- Real-form sample:
  \[
  999 \times 60 / 8{,}393 \approx 7.142\ \text{visits/minute}
  \]
- Ratio: approximately **252×**.

The arithmetic is sound. The inference must remain bounded: the two paths perform different work. This is **not** a measured 252× improvement in cashier productivity or equivalent end-to-end hospital processing.

Likewise:

- \(4/216 = 1.8519\%\).
- \(0/999 = 0\%\) observed sample mismatch.
- \(3/999 \approx 0.3003\%\), but the sampling assumptions needed for that population bound were not established.

Withdrawing the population-bound claim was correct.

### Edge strata are not external validation

The embalase/tuslah experiments are useful configuration findings: authored source charges did not produce an observable outpatient bill difference in this configuration.

They do not establish that those financial behaviors are handled correctly in facilities where the charges are used. ZEROFEE/HALFPPN remain unretested in the corrected setup, and exclusion/classification of >2-procedure encounters is not validation of their financial correctness.

A synthetic cohort with roughly 82.7% PPN-inclusive drug revenue also needs real-source calibration before it can stand in for representative hospital economics.

### Top external risk

**Internal agreement will be mistaken for representative financial correctness.**

Three paths can agree because they share encounter inputs, tariff assumptions, mapping decisions or configuration—not because those inputs represent real practice. Strong recovery engineering does not change that.

The most valuable external next step is a small, authorized facility-reference dataset with encounter-level settlement reconciliation and clinician/pharmacist review. Another synthetic fault injection does not substitute for it.

### Overall v10 verdict and scoring

**63/100 — Needs targeted rework.**

Fractional criterion scores make the narrow improvement explicit:

| Criterion | v9 | v10 |
|---|---:|---:|
| Claim-honesty | 7 | **7** |
| Gate-correctness | 6 | **6.5** |
| Oracle-validity | 7 | **7.5** |
| Reproducibility | 6 | **6** |
| E2E-design | 7 | **7** |
| External-validity | 4 | **4** |

\[
\operatorname{round}\left(
\frac{7+6.5+7.5+6+7+4}{6}\times10
\right)
=
\operatorname{round}(63.33)
=
\boxed{63/100}
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63.**

P10 earns credit for real retained artifacts, stricter input handling, tested privilege denial and recovery from the regression it introduced. It does not earn full closure because the rollback test is nondiscriminating, the integrated experiment misses immediate preservation, and exclusion recovery still has unsafe and fail-open boundaries.

**External-validity score: 4/10 — unchanged.**
