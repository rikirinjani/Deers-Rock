# Astra v9 assessment: dr-khanza-e2e-full-assessment (post P1-P9) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

**P9 makes real progress. It does not complete the recovery acceptance contract, and the rubric marks several partial results as complete.** This assessment is based on the supplied sources and asserted runs—not an independent execution.

### What is now supported

- **Current-state retry is genuinely implemented and exercised.** A22 reports:
  > `current state is not the pre-reset state … restoring from the kept stage tables first`

  followed by verified restoration and retry exit 0. This is materially stronger than v8’s stale `restored=True` decision.
- **Per-batch metadata and stop-at-FAILED are demonstrated.** A23 shows two dated hash files and the exact progression:
  > `FAILED,PENDING` → `FAILED,PENDING` → `BILLED,BILLED`.
- **The FAILED console message is conditional.** A15 now says:
  > `pre-reset state NOT restored (unverified/mismatch/error; stage tables kept)`
- **The real terminal exit line is tested**, although only with A0 and A13 executed.
- **Builder reproduction now has a demonstrated negative result:** clean exit 0; planted mismatch exit 1.
- **The population-bound withdrawal is appropriate.** \(3/999=0.003003\), or approximately **0.3003%**, but the necessary sampling assumptions were not established. Reporting the observed 0/999 without that inference is the right correction.

### The counts

**34/34 is arithmetically correct:** 29 previous checks plus A22, A22b, A23, A24 and A25. It is a count of heterogeneous assertions, not 34 independent proofs of recovery.

**A11’s reported 14 verified restores is consistent with the run**, but the implementation is:

```bash
RV_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-RESTORED-VERIFIED")
```

It counts **all logs**, not `OTHER_LOGS`. The four excluded fault logs contain the four deliberate failure markers, not verified restores, so this does not change the numeric result here. However:

- “Outside the four fault **checks**” is inaccurate: their cleanup logs and A22b’s initial successful restore remain included.
- Excluding those four checks in their entirety would remove four successful restores, leaving **10**, not 14.
- The actual narrow result is **14 verification markers across all logs, zero failure markers outside four specifically excluded files, and four expected failure markers inside them**.

That is what the report should say.

### Remaining and newly exposed overclaims

1. **E5 is only partially fixed.** `_finalize()` still writes:

   ```python
   "- FAILED batches (restored from stage backup; P5-2): %s\n"
   ```

   This is emitted even for an unverified or refused restore. Fixing stdout while leaving the result artifact wrong does not close the finding.

2. **AC-4 overclaims recovery-artifact preservation.** The terminal run starts with zero stage tables and skips every recovery check. It proves that the wrapper retains a failed **database**, not that populated recovery tables survive a genuine recovery failure.

3. **“One billing row changed” is inaccurate.** A22/A22b use:

   ```sql
   UPDATE ...billing SET totalbiaya=totalbiaya+1
   WHERE no_rawat='2026/10/01/800085';
   ```

   No row selector or `LIMIT` exists. For the reported 17-row visit, this changes **17 rows**, increasing the total by Rp17: **87,930 → 87,947**.

4. **“Live untouched” remains stronger than the observation.** A13 demonstrates equality of selected before/after checksums and the ledger hash. It does not demonstrate absence of transient writes or changes elsewhere.

5. Stale statements remain: the oracle docstring still describes `database.ini` targeting; its reset comment says **“guaranteed restore”**; the manifest still claims **“every runtime component is pinned”** and reconstruction without the original box.

The P9 “not claimed” list is substantially honest, but those disclaimers do not neutralize contradictory affirmative claims elsewhere.

**Score: 7/10 — up from 6. Better disclosures and substantive closures, but not a clean claims ledger.**

## GATE-CORRECTNESS

### Terminal path: a real improvement, with a preservation gap

The suite really ends with:

```bash
[ "$FAIL" = "0" ] && exit 0 || exit 1
```

`P9_FORCE_FAIL_CHECK=0` changes A0’s recorded result without taking an early exit. The transcript shows **PASS=1 FAIL=1**, wrapper exit **1**, retained fixture, revoked grant and restored XML. A14 is now correctly labelled an early-branch self-test.

However, **retention starts too late to guarantee recovery-artifact retention**:

- The oracle can already have dropped its stage tables.
- `restore_kept()` can already have restored and dropped them.
- The full suite continues executing after a failed check, potentially modifying the evidence-bearing fixture.
- The quick terminal test creates no recovery tables to preserve.

The wrapper preserves whatever remains; it does not preserve the state at the first failure.

There are also wrapper enforcement holes:

- No `pipefail` on `mysqldump ... | mysql ...`; a failed dump can be hidden by a successful import process.
- Teardown SQL failures do not alter the successful suite exit.
- `--teardown-kept` ends with `exit 0` even if dropping the database failed.
- Its EXIT trap revokes the fixture grant even when startup refused an already-existing fixture.

These are code-level defects, not demonstrated failures in the supplied run.

### Builder scope: improved, but not equal to insert scope

A10e genuinely demonstrates preservation of one **registered non-DR** ledger row under DR rebuilds for October and ALL.

But the DELETE is:

```python
... WHERE dscope AND (rp.no_rawat IS NULL OR cp)
```

The inserts require a matching registration satisfying `wp AND cp`.

Therefore:

| Combination | Registered rows | Orphan ledger rows |
|---|---|---|
| October / DR | DR October rows replaced | All October orphans deleted |
| ALL / DR | Registered DR rows replaced | **All orphans deleted**, regardless of provenance |
| October / all | Registered October rows replaced | October orphans deleted |
| ALL / all | Registered rows replaced | All orphans deleted |

That is **cohort replacement plus orphan garbage collection**, not identical delete/insert scope. An orphan cannot be classified as DR using the missing registration. Document that policy or preserve provenance sufficient to scope deletion. A10e does not test this boundary.

### A11 and cleanup

E8’s central code fix is real:

```python
o.stage_drop(...) if ok else 'SKIPPED ...'
```

A18 cleanup succeeds in the asserted run. But `restore_kept()` does not itself exit nonzero when `ok=False`; callers must inspect its output. A15 does not directly assert cleanup success, although ordinary restore errors and leftover tables should subsequently fail A11/A12.

E9 is fixed for **logged errors in included files**:

```bash
ER_OTH=... "STAGE-RESTORE-ERROR"
```

Still, A11 is not an operation-by-operation completeness check. It can miss:

- Additional error types inside an excluded file.
- A restore that exits before emitting a recognized marker.
- A missing verification event when some other restore supplies the required `RV_ALL >= 1`.

There is no asserted negative test showing A11 itself rejecting a planted non-deliberate restore error.

### Other remaining gates

- **A17 protects suite entry**, not every mutation path. Direct oracle execution validates `db == "sik"` only; it neither validates the actual JVM target nor protects `sik_bench` equivalently. Direct helper calls bypass the CLI guard.
- A13 can compare two empty failed hash reads as equal; its checksum pipeline does not enforce successful reads.
- `charge_delta` gates the **sum** of unknown-status amounts, not their count. Unknown rows with net zero—including a positive-price, zero-total row—can evade that specific gate. `three_count` does count them.
- The tax checker misses orphan tax rows and accepts one zero-valued tax row where its stated cardinality convention requires none.
- Builder `irup()` converts malformed numeric text to zero; missing individual tariff entries still fall back. “Fail-closed tariff authority” is broader than the implementation.

**Score: 6/10 — unchanged. The terminal and builder-check fixes are genuine, but acceptance completeness and preservation remain materially defective.**

## ORACLE-VALIDITY

### What the new checks actually establish

| Check | Can it fail meaningfully? | Supported result and limitation |
|---|---|---|
| **A22** | Yes | Requires detected current-state mismatch, verified restore, retry marker and exit 0. It would reject the old flag-only implementation. It does not independently hash protected non-sample rows or prove the ordering through a separate observer. |
| **A22b** | Yes | Requires missing-stage refusal, exit 4, no reset marker and unchanged visit count/sum. Count/sum is not content identity and covers only one visit’s billing table. |
| **A23** | Yes | Asserts exact batch statuses and two filenames. Does not restore an earlier batch after both backups exist or prove the first file’s content remains unchanged. |
| **A24** | Yes | Requires a blocker, at least one server KILL, blocker disappearance, verified restore and exit 0. Tests one root/default-database session—not the rubric’s benchmark-account session or an actively mutating orphan statement. |
| **A25** | Yes | Detects the injected quantity change despite unchanged table counts. Does not validate completeness of the source hash. |
| **Terminal test** | Yes, narrowly | Detects a broken final exit or missing fixture retention. Cannot detect loss of recovery tables because none exist. |

The 20/20 unit result adds useful branch coverage, not an independent recovery simulation. `_content_hash`, SQL execution, session discovery and process liveness are mocked. The test labelled **“pid file removed only after the proof”** checks absence after success, but never asserts presence after each preceding failed proof.

### Ranked residual risks

**1. Fencing is incomplete and absent on important restore paths.**

`fence_sessions()` is invoked through `reap_writers()` at resume entry. But `_bill_date()` restores after a harness failure by calling `stage_restore()` directly. `restore_kept()` also calls it directly. Neither performs server fencing.

Thus **“before any restore” is false**. A process-group death proof does not establish that its server statement has stopped—the exact lesson that motivated P9.

The session query is also not a reliable ownership boundary:

```sql
db = DATABASE()
OR info LIKE CONCAT('%', DATABASE(), '.%')
```

A session using another default database can hold fixture locks while sleeping, with no fixture name in its current statement. Backtick-qualified references can evade the text pattern; underscores in schema names are LIKE wildcards. Conversely, unrelated sessions can match and be killed.

Finally, enumerating and killing sessions once is **draining**, not durable fencing. New sessions can connect immediately afterwards. No lock, credential revocation, lease or fencing token excludes later writers.

**2. FAILED retries lack the quiet check promised by the rubric.**

```python
pending = [... if status in ("STAGED", "RESET")]
...
if pending ...:
    h1 = _content_hash(...)
    ...
```

FAILED batches trigger session draining but not the quiet interval. Current-state retry does genuinely compute:

```python
cur == pre
```

That closes the stale-flag defect at the moment of measurement. It does not make the measurement and subsequent backup/reset atomic.

**3. Source verification omits known charge-driving inputs.**

`source_content_hash()` includes drug quantity, embalase, tuslah and `databarang.ralan`, but omits **`detail_pemberian_obat.biaya_obat` and `total`**.

The suite itself states:

> “The form bills … `biaya_obat` (NOT … `databarang.ralan`)”

A25 therefore tests a detectable field while missing the price field A2 already established as important. Registration fee content is also absent despite the docstring. Both source queries swallow exceptions with `except Exception: pass`, permitting incomplete hashes to verify if the same reads fail at freeze and verification.

**4. Backup preservation still has destructive boundaries.**

P9 retry backup now deletes existing staged rows before repopulating them. It is not transactional, and the old hash remains until the final write. A backup failure sets `restored=False`, but `_finalize()` explicitly excludes `stage-backup` failures from `unrestored`; it can consequently drop the recovery tables.

Also, `stage_restore()` checks table **existence**, not backup completeness, and validates metadata only **after** destructive restore SQL.

**5. P8’s interruption boundary remains.**

A20 kills between completed SQL calls. A24 adds a sleeping lock-holder, not interruption during an active restore DELETE/REPLACE. Those are useful experiments, but the latter gap remains open.

**Fit:** credible for the specific single-fixture recovery cases executed; not fit for a blanket “fenced, fail-closed recovery” guarantee.

**Score: 7/10 — unchanged. Current-state retry improves materially; source and fencing inspection prevents a broader upgrade.**

## REPRODUCIBILITY

### What P9 genuinely adds

The pinned source prefixes align with the transcript: oracle `8e0cca5b…`, builder `736506c3…`, and the other recorded tools. The supplied record asserts local-LF/VPS equality; no independent hash computation is implied here.

The builder check now enforces:

```bash
BRC == 0
L matches rows:sha256
S matches rows:sha256
L == S
```

That closes both v8 defects: printing DIFFERS with exit zero, and treating two empty hash reads as equal.

The asserted results are strong for **same-environment reconstruction**:

- **356,355 rows**
- **Rp34,870,243,633**
- Matching ordered-content digest `a66a3a54…`
- Planted amount change → different digest `d5be7ba6…` → **exit 1**

The wrapper and archived prior results are also operational improvements. They reduce manual setup and avoid simply deleting previous evidence.

### Ranked blockers to independent reproduction

**1. The fixture is reconstructed from mutable live state, not distributed immutable input.**

The wrapper executes:

```bash
mysqldump ... sik | mysql ... sik_p6f
```

This is a fresh clone, not a pinned fixture. Neither the full starting database nor a complete deterministic provisioning recipe is supplied. Counts and a ledger digest do not identify all reference tables, triggers, settings and source rows that determine form behaviour.

The manifest’s claim that DB images are **“too large to pin by hash”** is indefensible. Large artifacts can be hashed incrementally. Distribution cost is a different problem from content identification.

**2. Executable dependency closure is missing.**

`p6_dbxml.py` imports unpublished `stagea_common.py`. The Java harness, consumer, retargeting support, shim and their build inputs are not supplied here. STRATA provisioning depends on:

```bash
ls .../sik_p6f_build_*/strata_reg_rows.sql | head -1
```

That selects an existing operational artifact rather than a release-pinned input.

A Khanza jar hash is useful, but a hash is neither availability nor a build recipe.

**3. Provisioning is tied to the original privileged environment.**

The scripts assume:

- `/opt/Deers-Rock`, `/opt/dr-benchmark`, `/opt/simrs-khanza`.
- Root MySQL access and a preconfigured benchmark account.
- Existing XML files and backup/restore conventions.
- Linux `/proc`, Xvfb, faketime and particular Java classpaths.

Actual secrets should **not** be published. Reproducibility requires a safe credential-generation and provisioning process, not the original passwords.

**4. No clean-environment reproduction exists.**

B3 encounter replay and whole-ledger rebuilding are retained strengths. Neither demonstrates that another machine can reconstruct the form environment and reproduce the acceptance run from released artifacts.

**5. Evidence identity remains operationally fragile.**

The terminal test selects the newest acceptance file globally rather than binding to the wrapper’s returned evidence path. Results use fixed `r6_*` names, and tooling uses broad archive globs. Concurrent runs are explicitly out of scope, but these conventions still fall short of immutable, run-bound provenance.

### Disposition of the v8 findings

- Deterministic whole-ledger rebuilding: **retained and strengthened** by a negative check.
- Failed reproduction exiting successfully: **fixed in code and demonstrated**.
- Missing runtime dependencies, immutable fixtures and cross-machine execution: **still open**.
- Manifest claim of reconstruction without the original box: **still unsupported**.
- Historical baseline lineage: **not repaired by another rebuild of current live state**.

**Score: 6/10 — unchanged. Good on-box repeatability; incomplete third-party reproducibility.**

## E2E-DESIGN

### The fair E2E claim

The strongest defensible statement remains:

> A high-volume synthetic outpatient billing consumer was exercised against one Khanza configuration, with selected encounters re-billed through the real form and compared with frozen billing-row baselines, plus bounded recovery and gate fault-injection experiments.

That is a meaningful hybrid benchmark. It is not population-scale GUI execution or independent end-to-end financial validation.

The P7 provenance finding is important and remains valid evidence: the audited form connection inserted **17 billing rows**, one nota and one detail-nota row. It corrects the earlier false claim that the form writes only a separate verification layer.

But an alternative form path and an independently correct financial oracle are different things.

### The weakest leg: financial identity and lineage

`three_count` still treats B as verified when **any** paid or credit content exists:

```python
return by, (has_paid or has_piut)
```

Then:

```python
if b_amt != c_amt:
    ... P2-BC-TOTAL ...
```

There is no assertion that B covers the same encounters as C, no per-encounter residual check and no coverage reconciliation. The unused:

```python
c_rows_visit = len([1 for _ in nr])
```

does not enforce anything.

Consequences:

- A sparse B can accidentally equal the whole-cohort C total and pass.
- Offsetting payment errors can cancel.
- Duplicate or incorrectly associated payments can distort totals.
- Whether paid amounts and `totalpiutang` overlap requires explicit financial semantics; the code merely adds them.

The documented October result—**151 notes / Rp49,903,019** versus **Rp3,113,533,580**—is correctly reported as a disagreement/subset state. Calling it a **verified subset** should mean verified presence and scope, not verified financial reconciliation.

### Other unresolved design limitations

- The ledger derives codes and quantities from the same post-adapter source tables used by billing. Shared-source omissions or incorrect quantities can agree across implementations.
- `--line-diff` compares aggregate quantity per encounter/component. Its comment claiming quantity reallocation between codes necessarily changes the total is false: **−1 on one code and +1 on another preserves quantity**.
- Same-price code substitutions remain invisible to those aggregate gates.
- The oracle’s value-row filter excludes rows where neither price nor total is positive. That bounds its ability to validate free lines, credits and negative adjustments.
- Repeated suite runs freeze billing produced by previous form runs. They establish recovery and repeatability; they do not independently prove that every newly frozen baseline still represents original consumer output.
- R4’s 0/999 has not been re-examined under the corrected targeting and provenance understanding.
- Populated zero-fee and half-PPN cases remain untested.

P9 improves the reliability of executing a comparison. It does not repair the weakest comparison itself.

### Required design fix

Build one explicit encounter manifest, independently retained before adapter ingestion. For exactly that encounter set:

1. Derive expected code/quantity/price lines from the manifest and versioned tariff authority.
2. Retain consumer output before the form modifies it.
3. Capture form billing and payment/credit output with encounter-level provenance.
4. Assert coverage, uniqueness and per-encounter residuals **before aggregation**.
5. Inject offsetting payments, missing encounters, same-price substitutions and quantity-preserving reallocations.

That addresses v8’s third top issue. It is still not delivered.

**Score: 7/10 — unchanged. Strong multi-path architecture; incomplete independent financial reconciliation.**

## EXTERNAL-VALIDITY

### Scoping is better; validation coverage is not

P9 correctly withdraws the unsupported “B3 bound ~0.3%.” The report also explicitly excludes population-wide billing correctness, representative hospital performance and generalization to other settings.

Those are important honesty improvements. They do not constitute new external evidence.

The tested surface remains:

- One Khanza/MySQL configuration.
- Synthetic outpatient data.
- A narrow payer and workflow envelope.
- Selected headless form encounters.
- No C1–C4 calibration or real-source comparison.
- No demonstrated generalization to another HMS or facility.

The embalase/tuslah experiments should be described precisely: authored source charges produced **no observable outpatient billing difference in this configuration**. They do not validate positive fee handling elsewhere. Zero-fee and half-PPN financial cases remain open.

### Arithmetic and interpretation

The principal figures reconcile:

- \(86,101+354=86,455\) visits.
- \(34,870,243,633-34,727,295,800=\textbf{Rp142,947,833}\).
- \(34,895,128,580-34,870,243,633=\textbf{Rp24,884,947}\).
- \(4/216\times100=\textbf{1.85185%}\).

Performance separation is also numerically reasonable:

- B3: \(86,101/47.8=\textbf{1,801.3 visits/min}\).
- B3 wall time per visit: \(47.8\times60,000/86,101=\textbf{33.31 ms}\).
- Form sample: \(999\times60/8,393=\textbf{7.142 visits/min}\).
- Their throughput ratio is approximately **252×**.

That ratio is not evidence of a 252× optimization of the same workflow. The two paths do different work. Neither establishes ordinary human-operated cashier throughput.

### Top external risk

**Synthetic agreement can be mistaken for representative financial correctness.** Shared quantities, adopted tariffs, a high drug-revenue share and limited payer behaviour can generate excellent internal agreement while missing the operational cases that dominate real billing errors.

The first external experiment should be a legally obtained, anonymized facility reference with prespecified comparisons of visits, revenue per visit, payer mix, drug share and payment/credit behaviour. More recovery tests cannot substitute for that.

### Overall v9 verdict and v8 next-step disposition

**62/100 — Needs targeted rework.**

| Criterion | v8 | v9 |
|---|---:|---:|
| Claim-honesty | 6 | **7** |
| Gate-correctness | 6 | **6** |
| Oracle-validity | 7 | **7** |
| Reproducibility | 6 | **6** |
| E2E-design | 7 | **7** |
| External-validity | 4 | **4** |

\[
\operatorname{round}\left((7+6+7+6+7+4)\frac{10}{6}\right)
=\operatorname{round}(61.6667)=\boxed{62}.
\]

Trajectory: **35 → 43 → 43 → 52 → 58 → 60 → 62**.

The v8 top three issues remain, in the same order:

1. **Recovery and acceptance integrity:** materially improved, not closed.
2. **Immutable independent reproduction:** still open.
3. **Encounter-level independent financial validation:** still open.

The single next step was **partially delivered**. P9 demonstrates current-state retry and a real terminal failure, but not one integrated, pinned-fixture experiment with effective writer exclusion, protected sample/non-sample hashes and populated recovery artifacts retained after failure.

**Do that integrated experiment next—not another count-increasing suite patch.** Exercise the immediate harness-failure restore path as well as resume; retain a real failed backup; independently hash its tables and protected fixture rows; force the normal terminal failure; then verify the retained material before explicit teardown. Until then, mark AC-3 and AC-4 **partial**, not unqualified PASS.

**Score: 4/10 — unchanged. Better statistical scoping; no new external validation.**

## VERDICT

## Overall verdict

**62/100 — Needs targeted rework.**

P9 improves recovery execution and the honesty of its reporting, but does not close the central v8 concerns: recovery/acceptance integrity, independently reproducible fixtures, and encounter-level financial validation. The improvement is substantive but narrow—not evidence for a blanket “fenced, fail-closed recovery” guarantee.

The dispositions below reflect the code and asserted-run evidence described in the supplied assessments, not a new execution or independent repository audit.

## Criterion scores and historical deltas

Deltas are against these six assessments, in order: **4701365 / 4769794 / 4795743 / 4818826 / v7 4880158+4894730 / v8 4897654**.

| Criterion | Score | Deltas against the six prior assessments |
|---|---:|---|
| Claim-honesty | **7/10** | **+3 / +2 / +2 / +1 / +1 / +1** |
| Gate-correctness | **6/10** | **+3 / +3 / +3 / +1 / 0 / 0** |
| Oracle-validity | **7/10** | **+3 / +3 / +4 / +2 / +1 / 0** |
| Reproducibility | **6/10** | **+3 / +1 / 0 / +1 / 0 / 0** |
| E2E-design | **7/10** | **+3 / +2 / +2 / +1 / 0 / 0** |
| External-validity | **4/10** | **+1 / 0 / 0 / 0 / 0 / 0** |

### Claim-honesty
**Justification:** Disclosures are more bounded, but `_finalize()` still emits **“FAILED batches (restored from stage backup; P5-2)”** even when restoration was refused or unverified.  
**Biggest remaining risk:** Contradictory affirmative claims in result artifacts, documentation and PASS labels can outweigh the more careful “not claimed” list.

### Gate-correctness
**Justification:** The cleanup condition **`o.stage_drop(...) if ok else 'SKIPPED ...'`** and successful A18 cleanup are genuine improvements, but A11’s **`RV_ALL >= 1`** does not establish successful verification for every required restore.  
**Biggest remaining risk:** Missing events, excluded-file errors, failed hash reads or destructive scope mismatches can escape acceptance while the suite appears successful.

### Oracle-validity
**Justification:** Current-state retry now checks **`cur == pre`**, but `source_content_hash()` omits `biaya_obat` and `total` despite the suite stating that the form bills **“`biaya_obat` (NOT … `databarang.ralan`)”**.  
**Biggest remaining risk:** Incomplete source verification, non-durable writer exclusion and nontransactional backup replacement can invalidate recovery or destroy its evidence.

### Reproducibility
**Justification:** Whole-ledger rebuilding and failure exit behavior are strengths, but unpublished `stagea_common.py` and **`ls .../sik_p6f_build_*/strata_reg_rows.sql | head -1`** leave executable inputs dependent on the original environment.  
**Biggest remaining risk:** A third party cannot reconstruct the asserted environment from immutable, available artifacts and a clean provisioning recipe.

### E2E-design
**Justification:** The reported **151 notes / Rp49,903,019 versus Rp3,113,533,580** is appropriately treated as disagreement/subset evidence, but aggregate comparisons still permit offsetting errors and same-price substitutions.  
**Biggest remaining risk:** Shared-source agreement and cohort totals can conceal missing encounters, incorrect line attribution and financially incorrect payment/credit reconciliation.

### External-validity
**Justification:** The approximately **252×** throughput ratio is arithmetically sound, but the assessment correctly notes that **“the two paths do different work”**, and no facility-reference validation is supplied.  
**Biggest remaining risk:** Synthetic internal agreement may be interpreted as representative real-world financial correctness or cashier productivity.

## 1. Disposition of v8 findings

### Genuinely fixed—within the demonstrated scope

| Finding | Code-and-run-supported closure | Boundary |
|---|---|---|
| Stale-state retry decision | Retry recomputes current content and compares `cur == pre`; the supplied assessment identifies current-state retry as demonstrated. | This is a point-in-time check, not atomic recovery or durable fencing. |
| Cleanup dropping recovery tables despite unsuccessful restoration | Conditional `stage_drop` addresses E8’s central defect; A18 cleanup succeeds in the asserted run. | Other destructive paths, especially failed backup handling, remain. |
| Failed reproduction returning success | Nonzero terminal failure behavior is fixed in code and demonstrated. | It proves retention of a failed database, not populated recovery artifacts. |
| Builder-check failure handling | The assessment reports a genuine builder-check fix, demonstrated through a negative check. | It does not establish comprehensive fail-closed tariff authority. |

Deterministic whole-ledger rebuilding is also **retained and strengthened**, rather than a newly repaired v8 defect.

### Partial fixes or broader closures merely claimed

- **E5 reporting:** stdout improves, but the persisted result artifact still falsely labels some FAILED batches as restored.
- **E9 acceptance checking:** included logs are checked for `STAGE-RESTORE-ERROR`, but no asserted planted-error test establishes that A11 rejects an unintended restore failure; completeness remains unproven.
- **AC-3 / AC-4:** current-state retry and terminal failure are demonstrated separately, but the integrated preservation experiment is not; **mark both partial**, especially because AC-4 starts with zero stage tables and skips recovery checks.
- **A17 protection:** suite-entry protection does not imply protection of direct oracle/helper paths or validation of every actual JVM target.
- **“Fail-closed tariff authority”:** malformed numerics can become zero and missing tariff entries can fall back.
- **“Live untouched”:** selected before/after equality is not proof of no transient writes or changes elsewhere.
- **Original-box-independent reconstruction / “every runtime component is pinned”:** unsupported by the supplied artifact closure.

### Still open

Durable writer exclusion; immediate-failure and resume-path recovery integrity; complete source hashes; backup completeness and preservation; active-restore interruption testing; immutable fixtures and dependency closure; clean-machine reproduction; historical baseline lineage; independent encounter-level reconciliation; and external validation.

## 2. New problems P9 introduced or exposed

**Introduced by the retry-backup change:**

- Existing staged rows are deleted before replacement without a transaction, while the old hash remains until the final write.
- A `stage-backup` failure can be excluded from `_finalize()`’s `unrestored` set, allowing recovery tables to be dropped precisely when backup creation failed.

**Exposed or newly made consequential—not necessarily introduced by P9:**

- **Draining is not fencing:** session matching can miss writers or kill unrelated sessions, and new writers can reconnect.
- **FAILED retries lack the quiet interval** applied to STAGED/RESET cases.
- **Source hashes omit established billing inputs** and swallow query exceptions.
- **A11’s accounting is overstated:** the defensible result is **14 verification markers across all logs**, zero failure markers outside four excluded files, and four expected failures inside them—not 14 independent recoveries outside four entire fault checks.
- **The “one row” mutation changes 17 billing rows**, increasing the reported total by Rp17.
- **Recovery-artifact retention is not exercised** by a terminal test with no populated stage tables.
- **Deletion includes orphan garbage collection**, which is not identical to registered-cohort replacement and needs an explicit policy.

## 3. Top three remaining issues

1. **Recovery and acceptance integrity:** prevent destructive loss of backups, enforce effective writer exclusion, verify complete inputs, and require operation-by-operation acceptance evidence.
2. **Immutable independent reproduction:** publish a content-identified fixture, complete executable dependencies and a clean provisioning path.
3. **Independent encounter-level financial validation:** assert coverage, uniqueness, line identity and payment/credit residuals before aggregation, using an independently retained pre-adapter manifest.

These remain the v8 priorities, in the same order.

## 4. Top three strongest properties to lead with

1. **Substantial asserted fault-injection and recovery evidence**, including current-state retry and a real terminal failure—with explicit boundaries.
2. **Strong on-box repeatability**, including encounter replay, deterministic whole-ledger rebuilding and negative checks.
3. **A useful multi-path comparison architecture with increasingly honest disagreement reporting**, providing a credible foundation for stronger financial validation.

Lead with these demonstrated properties, not broad claims of independent reproducibility, durable fencing or representative financial correctness.

## 5. Overall score and historical comparison

\[
\operatorname{round}\left((7+6+7+6+7+4)\times\frac{10}{6}\right)
=\boxed{62/100}
\]

| Prior overall score | Delta |
|---:|---:|
| 35 | **+27** |
| 43 — both assessments | **+19** |
| 52 | **+10** |
| 58 | **+4** |
| 60 | **+2** |

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62.**  
The v8-to-P9 gain comes entirely from claim-honesty; the other five criteria remain unchanged.

## 6. Verdict

**Needs targeted rework.**

The work supports a bounded engineering evaluation, but not yet the stronger recovery, reproducibility and financial-validity claims presently attached to it.

## 7. Single most important next step

**Deliver one integrated, pinned-fixture recovery-preservation experiment—not another increase in test counts.**

Exercise both immediate harness-failure restoration and resume under effective writer exclusion; induce a real failure with populated recovery artifacts; independently hash those artifacts and protected sample/non-sample rows; force the normal terminal failure; and assert artifact retention, nonzero exit and per-operation verification before explicit teardown. This directly tests the highest-risk claim that P9 still does not establish.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

**P9 makes real progress. It does not complete the recovery acceptance contract, and the rubric marks several partial results as complete.** This assessment is based on the supplied sources and asserted runs—not an independent execution.

### What is now supported

- **Current-state retry is genuinely implemented and exercised.** A22 reports:
  > `current state is not the pre-reset state … restoring from the kept stage tables first`

  followed by verified restoration and retry exit 0. This is materially stronger than v8’s stale `restored=True` decision.
- **Per-batch metadata and stop-at-FAILED are demonstrated.** A23 shows two dated hash files and the exact progression:
  > `FAILED,PENDING` → `FAILED,PENDING` → `BILLED,BILLED`.
- **The FAILED console message is conditional.** A15 now says:
  > `pre-reset state NOT restored (unverified/mismatch/error; stage tables kept)`
- **The real terminal exit line is tested**, although only with A0 and A13 executed.
- **Builder reproduction now has a demonstrated negative result:** clean exit 0; planted mismatch exit 1.
- **The population-bound withdrawal is appropriate.** \(3/999=0.003003\), or approximately **0.3003%**, but the necessary sampling assumptions were not established. Reporting the observed 0/999 without that inference is the right correction.

### The counts

**34/34 is arithmetically correct:** 29 previous checks plus A22, A22b, A23, A24 and A25. It is a count of heterogeneous assertions, not 34 independent proofs of recovery.

**A11’s reported 14 verified restores is consistent with the run**, but the implementation is:

```bash
RV_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-RESTORED-VERIFIED")
```

It counts **all logs**, not `OTHER_LOGS`. The four excluded fault logs contain the four deliberate failure markers, not verified restores, so this does not change the numeric result here. However:

- “Outside the four fault **checks**” is inaccurate: their cleanup logs and A22b’s initial successful restore remain included.
- Excluding those four checks in their entirety would remove four successful restores, leaving **10**, not 14.
- The actual narrow result is **14 verification markers across all logs, zero failure markers outside four specifically excluded files, and four expected failure markers inside them**.

That is what the report should say.

### Remaining and newly exposed overclaims

1. **E5 is only partially fixed.** `_finalize()` still writes:

   ```python
   "- FAILED batches (restored from stage backup; P5-2): %s\n"
   ```

   This is emitted even for an unverified or refused restore. Fixing stdout while leaving the result artifact wrong does not close the finding.

2. **AC-4 overclaims recovery-artifact preservation.** The terminal run starts with zero stage tables and skips every recovery check. It proves that the wrapper retains a failed **database**, not that populated recovery tables survive a genuine recovery failure.

3. **“One billing row changed” is inaccurate.** A22/A22b use:

   ```sql
   UPDATE ...billing SET totalbiaya=totalbiaya+1
   WHERE no_rawat='2026/10/01/800085';
   ```

   No row selector or `LIMIT` exists. For the reported 17-row visit, this changes **17 rows**, increasing the total by Rp17: **87,930 → 87,947**.

4. **“Live untouched” remains stronger than the observation.** A13 demonstrates equality of selected before/after checksums and the ledger hash. It does not demonstrate absence of transient writes or changes elsewhere.

5. Stale statements remain: the oracle docstring still describes `database.ini` targeting; its reset comment says **“guaranteed restore”**; the manifest still claims **“every runtime component is pinned”** and reconstruction without the original box.

The P9 “not claimed” list is substantially honest, but those disclaimers do not neutralize contradictory affirmative claims elsewhere.

**Score: 7/10 — up from 6. Better disclosures and substantive closures, but not a clean claims ledger.**

## GATE-CORRECTNESS

### Terminal path: a real improvement, with a preservation gap

The suite really ends with:

```bash
[ "$FAIL" = "0" ] && exit 0 || exit 1
```

`P9_FORCE_FAIL_CHECK=0` changes A0’s recorded result without taking an early exit. The transcript shows **PASS=1 FAIL=1**, wrapper exit **1**, retained fixture, revoked grant and restored XML. A14 is now correctly labelled an early-branch self-test.

However, **retention starts too late to guarantee recovery-artifact retention**:

- The oracle can already have dropped its stage tables.
- `restore_kept()` can already have restored and dropped them.
- The full suite continues executing after a failed check, potentially modifying the evidence-bearing fixture.
- The quick terminal test creates no recovery tables to preserve.

The wrapper preserves whatever remains; it does not preserve the state at the first failure.

There are also wrapper enforcement holes:

- No `pipefail` on `mysqldump ... | mysql ...`; a failed dump can be hidden by a successful import process.
- Teardown SQL failures do not alter the successful suite exit.
- `--teardown-kept` ends with `exit 0` even if dropping the database failed.
- Its EXIT trap revokes the fixture grant even when startup refused an already-existing fixture.

These are code-level defects, not demonstrated failures in the supplied run.

### Builder scope: improved, but not equal to insert scope

A10e genuinely demonstrates preservation of one **registered non-DR** ledger row under DR rebuilds for October and ALL.

But the DELETE is:

```python
... WHERE dscope AND (rp.no_rawat IS NULL OR cp)
```

The inserts require a matching registration satisfying `wp AND cp`.

Therefore:

| Combination | Registered rows | Orphan ledger rows |
|---|---|---|
| October / DR | DR October rows replaced | All October orphans deleted |
| ALL / DR | Registered DR rows replaced | **All orphans deleted**, regardless of provenance |
| October / all | Registered October rows replaced | October orphans deleted |
| ALL / all | Registered rows replaced | All orphans deleted |

That is **cohort replacement plus orphan garbage collection**, not identical delete/insert scope. An orphan cannot be classified as DR using the missing registration. Document that policy or preserve provenance sufficient to scope deletion. A10e does not test this boundary.

### A11 and cleanup

E8’s central code fix is real:

```python
o.stage_drop(...) if ok else 'SKIPPED ...'
```

A18 cleanup succeeds in the asserted run. But `restore_kept()` does not itself exit nonzero when `ok=False`; callers must inspect its output. A15 does not directly assert cleanup success, although ordinary restore errors and leftover tables should subsequently fail A11/A12.

E9 is fixed for **logged errors in included files**:

```bash
ER_OTH=... "STAGE-RESTORE-ERROR"
```

Still, A11 is not an operation-by-operation completeness check. It can miss:

- Additional error types inside an excluded file.
- A restore that exits before emitting a recognized marker.
- A missing verification event when some other restore supplies the required `RV_ALL >= 1`.

There is no asserted negative test showing A11 itself rejecting a planted non-deliberate restore error.

### Other remaining gates

- **A17 protects suite entry**, not every mutation path. Direct oracle execution validates `db == "sik"` only; it neither validates the actual JVM target nor protects `sik_bench` equivalently. Direct helper calls bypass the CLI guard.
- A13 can compare two empty failed hash reads as equal; its checksum pipeline does not enforce successful reads.
- `charge_delta` gates the **sum** of unknown-status amounts, not their count. Unknown rows with net zero—including a positive-price, zero-total row—can evade that specific gate. `three_count` does count them.
- The tax checker misses orphan tax rows and accepts one zero-valued tax row where its stated cardinality convention requires none.
- Builder `irup()` converts malformed numeric text to zero; missing individual tariff entries still fall back. “Fail-closed tariff authority” is broader than the implementation.

**Score: 6/10 — unchanged. The terminal and builder-check fixes are genuine, but acceptance completeness and preservation remain materially defective.**

## ORACLE-VALIDITY

### What the new checks actually establish

| Check | Can it fail meaningfully? | Supported result and limitation |
|---|---|---|
| **A22** | Yes | Requires detected current-state mismatch, verified restore, retry marker and exit 0. It would reject the old flag-only implementation. It does not independently hash protected non-sample rows or prove the ordering through a separate observer. |
| **A22b** | Yes | Requires missing-stage refusal, exit 4, no reset marker and unchanged visit count/sum. Count/sum is not content identity and covers only one visit’s billing table. |
| **A23** | Yes | Asserts exact batch statuses and two filenames. Does not restore an earlier batch after both backups exist or prove the first file’s content remains unchanged. |
| **A24** | Yes | Requires a blocker, at least one server KILL, blocker disappearance, verified restore and exit 0. Tests one root/default-database session—not the rubric’s benchmark-account session or an actively mutating orphan statement. |
| **A25** | Yes | Detects the injected quantity change despite unchanged table counts. Does not validate completeness of the source hash. |
| **Terminal test** | Yes, narrowly | Detects a broken final exit or missing fixture retention. Cannot detect loss of recovery tables because none exist. |

The 20/20 unit result adds useful branch coverage, not an independent recovery simulation. `_content_hash`, SQL execution, session discovery and process liveness are mocked. The test labelled **“pid file removed only after the proof”** checks absence after success, but never asserts presence after each preceding failed proof.

### Ranked residual risks

**1. Fencing is incomplete and absent on important restore paths.**

`fence_sessions()` is invoked through `reap_writers()` at resume entry. But `_bill_date()` restores after a harness failure by calling `stage_restore()` directly. `restore_kept()` also calls it directly. Neither performs server fencing.

Thus **“before any restore” is false**. A process-group death proof does not establish that its server statement has stopped—the exact lesson that motivated P9.

The session query is also not a reliable ownership boundary:

```sql
db = DATABASE()
OR info LIKE CONCAT('%', DATABASE(), '.%')
```

A session using another default database can hold fixture locks while sleeping, with no fixture name in its current statement. Backtick-qualified references can evade the text pattern; underscores in schema names are LIKE wildcards. Conversely, unrelated sessions can match and be killed.

Finally, enumerating and killing sessions once is **draining**, not durable fencing. New sessions can connect immediately afterwards. No lock, credential revocation, lease or fencing token excludes later writers.

**2. FAILED retries lack the quiet check promised by the rubric.**

```python
pending = [... if status in ("STAGED", "RESET")]
...
if pending ...:
    h1 = _content_hash(...)
    ...
```

FAILED batches trigger session draining but not the quiet interval. Current-state retry does genuinely compute:

```python
cur == pre
```

That closes the stale-flag defect at the moment of measurement. It does not make the measurement and subsequent backup/reset atomic.

**3. Source verification omits known charge-driving inputs.**

`source_content_hash()` includes drug quantity, embalase, tuslah and `databarang.ralan`, but omits **`detail_pemberian_obat.biaya_obat` and `total`**.

The suite itself states:

> “The form bills … `biaya_obat` (NOT … `databarang.ralan`)”

A25 therefore tests a detectable field while missing the price field A2 already established as important. Registration fee content is also absent despite the docstring. Both source queries swallow exceptions with `except Exception: pass`, permitting incomplete hashes to verify if the same reads fail at freeze and verification.

**4. Backup preservation still has destructive boundaries.**

P9 retry backup now deletes existing staged rows before repopulating them. It is not transactional, and the old hash remains until the final write. A backup failure sets `restored=False`, but `_finalize()` explicitly excludes `stage-backup` failures from `unrestored`; it can consequently drop the recovery tables.

Also, `stage_restore()` checks table **existence**, not backup completeness, and validates metadata only **after** destructive restore SQL.

**5. P8’s interruption boundary remains.**

A20 kills between completed SQL calls. A24 adds a sleeping lock-holder, not interruption during an active restore DELETE/REPLACE. Those are useful experiments, but the latter gap remains open.

**Fit:** credible for the specific single-fixture recovery cases executed; not fit for a blanket “fenced, fail-closed recovery” guarantee.

**Score: 7/10 — unchanged. Current-state retry improves materially; source and fencing inspection prevents a broader upgrade.**

## REPRODUCIBILITY

### What P9 genuinely adds

The pinned source prefixes align with the transcript: oracle `8e0cca5b…`, builder `736506c3…`, and the other recorded tools. The supplied record asserts local-LF/VPS equality; no independent hash computation is implied here.

The builder check now enforces:

```bash
BRC == 0
L matches rows:sha256
S matches rows:sha256
L == S
```

That closes both v8 defects: printing DIFFERS with exit zero, and treating two empty hash reads as equal.

The asserted results are strong for **same-environment reconstruction**:

- **356,355 rows**
- **Rp34,870,243,633**
- Matching ordered-content digest `a66a3a54…`
- Planted amount change → different digest `d5be7ba6…` → **exit 1**

The wrapper and archived prior results are also operational improvements. They reduce manual setup and avoid simply deleting previous evidence.

### Ranked blockers to independent reproduction

**1. The fixture is reconstructed from mutable live state, not distributed immutable input.**

The wrapper executes:

```bash
mysqldump ... sik | mysql ... sik_p6f
```

This is a fresh clone, not a pinned fixture. Neither the full starting database nor a complete deterministic provisioning recipe is supplied. Counts and a ledger digest do not identify all reference tables, triggers, settings and source rows that determine form behaviour.

The manifest’s claim that DB images are **“too large to pin by hash”** is indefensible. Large artifacts can be hashed incrementally. Distribution cost is a different problem from content identification.

**2. Executable dependency closure is missing.**

`p6_dbxml.py` imports unpublished `stagea_common.py`. The Java harness, consumer, retargeting support, shim and their build inputs are not supplied here. STRATA provisioning depends on:

```bash
ls .../sik_p6f_build_*/strata_reg_rows.sql | head -1
```

That selects an existing operational artifact rather than a release-pinned input.

A Khanza jar hash is useful, but a hash is neither availability nor a build recipe.

**3. Provisioning is tied to the original privileged environment.**

The scripts assume:

- `/opt/Deers-Rock`, `/opt/dr-benchmark`, `/opt/simrs-khanza`.
- Root MySQL access and a preconfigured benchmark account.
- Existing XML files and backup/restore conventions.
- Linux `/proc`, Xvfb, faketime and particular Java classpaths.

Actual secrets should **not** be published. Reproducibility requires a safe credential-generation and provisioning process, not the original passwords.

**4. No clean-environment reproduction exists.**

B3 encounter replay and whole-ledger rebuilding are retained strengths. Neither demonstrates that another machine can reconstruct the form environment and reproduce the acceptance run from released artifacts.

**5. Evidence identity remains operationally fragile.**

The terminal test selects the newest acceptance file globally rather than binding to the wrapper’s returned evidence path. Results use fixed `r6_*` names, and tooling uses broad archive globs. Concurrent runs are explicitly out of scope, but these conventions still fall short of immutable, run-bound provenance.

### Disposition of the v8 findings

- Deterministic whole-ledger rebuilding: **retained and strengthened** by a negative check.
- Failed reproduction exiting successfully: **fixed in code and demonstrated**.
- Missing runtime dependencies, immutable fixtures and cross-machine execution: **still open**.
- Manifest claim of reconstruction without the original box: **still unsupported**.
- Historical baseline lineage: **not repaired by another rebuild of current live state**.

**Score: 6/10 — unchanged. Good on-box repeatability; incomplete third-party reproducibility.**

## E2E-DESIGN

### The fair E2E claim

The strongest defensible statement remains:

> A high-volume synthetic outpatient billing consumer was exercised against one Khanza configuration, with selected encounters re-billed through the real form and compared with frozen billing-row baselines, plus bounded recovery and gate fault-injection experiments.

That is a meaningful hybrid benchmark. It is not population-scale GUI execution or independent end-to-end financial validation.

The P7 provenance finding is important and remains valid evidence: the audited form connection inserted **17 billing rows**, one nota and one detail-nota row. It corrects the earlier false claim that the form writes only a separate verification layer.

But an alternative form path and an independently correct financial oracle are different things.

### The weakest leg: financial identity and lineage

`three_count` still treats B as verified when **any** paid or credit content exists:

```python
return by, (has_paid or has_piut)
```

Then:

```python
if b_amt != c_amt:
    ... P2-BC-TOTAL ...
```

There is no assertion that B covers the same encounters as C, no per-encounter residual check and no coverage reconciliation. The unused:

```python
c_rows_visit = len([1 for _ in nr])
```

does not enforce anything.

Consequences:

- A sparse B can accidentally equal the whole-cohort C total and pass.
- Offsetting payment errors can cancel.
- Duplicate or incorrectly associated payments can distort totals.
- Whether paid amounts and `totalpiutang` overlap requires explicit financial semantics; the code merely adds them.

The documented October result—**151 notes / Rp49,903,019** versus **Rp3,113,533,580**—is correctly reported as a disagreement/subset state. Calling it a **verified subset** should mean verified presence and scope, not verified financial reconciliation.

### Other unresolved design limitations

- The ledger derives codes and quantities from the same post-adapter source tables used by billing. Shared-source omissions or incorrect quantities can agree across implementations.
- `--line-diff` compares aggregate quantity per encounter/component. Its comment claiming quantity reallocation between codes necessarily changes the total is false: **−1 on one code and +1 on another preserves quantity**.
- Same-price code substitutions remain invisible to those aggregate gates.
- The oracle’s value-row filter excludes rows where neither price nor total is positive. That bounds its ability to validate free lines, credits and negative adjustments.
- Repeated suite runs freeze billing produced by previous form runs. They establish recovery and repeatability; they do not independently prove that every newly frozen baseline still represents original consumer output.
- R4’s 0/999 has not been re-examined under the corrected targeting and provenance understanding.
- Populated zero-fee and half-PPN cases remain untested.

P9 improves the reliability of executing a comparison. It does not repair the weakest comparison itself.

### Required design fix

Build one explicit encounter manifest, independently retained before adapter ingestion. For exactly that encounter set:

1. Derive expected code/quantity/price lines from the manifest and versioned tariff authority.
2. Retain consumer output before the form modifies it.
3. Capture form billing and payment/credit output with encounter-level provenance.
4. Assert coverage, uniqueness and per-encounter residuals **before aggregation**.
5. Inject offsetting payments, missing encounters, same-price substitutions and quantity-preserving reallocations.

That addresses v8’s third top issue. It is still not delivered.

**Score: 7/10 — unchanged. Strong multi-path architecture; incomplete independent financial reconciliation.**

## EXTERNAL-VALIDITY

### Scoping is better; validation coverage is not

P9 correctly withdraws the unsupported “B3 bound ~0.3%.” The report also explicitly excludes population-wide billing correctness, representative hospital performance and generalization to other settings.

Those are important honesty improvements. They do not constitute new external evidence.

The tested surface remains:

- One Khanza/MySQL configuration.
- Synthetic outpatient data.
- A narrow payer and workflow envelope.
- Selected headless form encounters.
- No C1–C4 calibration or real-source comparison.
- No demonstrated generalization to another HMS or facility.

The embalase/tuslah experiments should be described precisely: authored source charges produced **no observable outpatient billing difference in this configuration**. They do not validate positive fee handling elsewhere. Zero-fee and half-PPN financial cases remain open.

### Arithmetic and interpretation

The principal figures reconcile:

- \(86,101+354=86,455\) visits.
- \(34,870,243,633-34,727,295,800=\textbf{Rp142,947,833}\).
- \(34,895,128,580-34,870,243,633=\textbf{Rp24,884,947}\).
- \(4/216\times100=\textbf{1.85185%}\).

Performance separation is also numerically reasonable:

- B3: \(86,101/47.8=\textbf{1,801.3 visits/min}\).
- B3 wall time per visit: \(47.8\times60,000/86,101=\textbf{33.31 ms}\).
- Form sample: \(999\times60/8,393=\textbf{7.142 visits/min}\).
- Their throughput ratio is approximately **252×**.

That ratio is not evidence of a 252× optimization of the same workflow. The two paths do different work. Neither establishes ordinary human-operated cashier throughput.

### Top external risk

**Synthetic agreement can be mistaken for representative financial correctness.** Shared quantities, adopted tariffs, a high drug-revenue share and limited payer behaviour can generate excellent internal agreement while missing the operational cases that dominate real billing errors.

The first external experiment should be a legally obtained, anonymized facility reference with prespecified comparisons of visits, revenue per visit, payer mix, drug share and payment/credit behaviour. More recovery tests cannot substitute for that.

### Overall v9 verdict and v8 next-step disposition

**62/100 — Needs targeted rework.**

| Criterion | v8 | v9 |
|---|---:|---:|
| Claim-honesty | 6 | **7** |
| Gate-correctness | 6 | **6** |
| Oracle-validity | 7 | **7** |
| Reproducibility | 6 | **6** |
| E2E-design | 7 | **7** |
| External-validity | 4 | **4** |

\[
\operatorname{round}\left((7+6+7+6+7+4)\frac{10}{6}\right)
=\operatorname{round}(61.6667)=\boxed{62}.
\]

Trajectory: **35 → 43 → 43 → 52 → 58 → 60 → 62**.

The v8 top three issues remain, in the same order:

1. **Recovery and acceptance integrity:** materially improved, not closed.
2. **Immutable independent reproduction:** still open.
3. **Encounter-level independent financial validation:** still open.

The single next step was **partially delivered**. P9 demonstrates current-state retry and a real terminal failure, but not one integrated, pinned-fixture experiment with effective writer exclusion, protected sample/non-sample hashes and populated recovery artifacts retained after failure.

**Do that integrated experiment next—not another count-increasing suite patch.** Exercise the immediate harness-failure restore path as well as resume; retain a real failed backup; independently hash its tables and protected fixture rows; force the normal terminal failure; then verify the retained material before explicit teardown. Until then, mark AC-3 and AC-4 **partial**, not unqualified PASS.

**Score: 4/10 — unchanged. Better statistical scoping; no new external validation.**
