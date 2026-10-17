# Astra v7 assessment: dr-khanza-e2e-full-assessment (post P1-P7) [merged finish: gate-correctness, oracle-validity, reproducibility, e2e-design, external-validity in one call + synthesis]

## GATE-CORRECTNESS

**P7 repairs real defects. It does not establish the advertised fail-closed acceptance contract.** This assessment is a source-and-transcript review, not an independent execution.

### 1. The normal suite exit is fixed; A14 does not test it

The suite now actually ends with:

```bash
[ "$FAIL" = "0" ] && exit 0 || exit 1
```

The wrapper captures and propagates that status:

```bash
RC=$?
echo "suite exit=$RC"
exit $RC
```

Neither EXIT trap explicitly replaces the requested status. An ordinary failed `check` increments `FAIL`; the normal terminal path now returns 1. That is a legitimate fix.

But A14 exercises a **separate early-return implementation**:

```bash
if [ -n "${P7_EXIT_TEST:-}" ]; then
  ...
  [ "$FAIL" = "0" ] && exit 0 || exit 1
fi
```

It never reaches the terminal exit, fixture operations, wrapper, or cleanup traps. Delete the real terminal exit and A14 still passes. The transcript—

> “A14 forced-fail exit=1 forced-pass exit=0”

—proves the test branch works, not that a failing full suite propagates through the wrapper. The rubric acknowledges the wrapper was not tested but nevertheless marks AC-1 PASS. **That is partial acceptance presented as complete acceptance.**

Also, inherited `P7_EXIT_TEST=pass` makes the wrapper invoke a suite that immediately returns success without running acceptance checks. This test-only bypass belongs in a unit test, not an operational entry point.

There are still uncounted failures: freeze failures, SQL setup failures, A2 cleanup, archive creation, and cleanup operations are not consistently checked. `set -u` is not `set -e` or `pipefail`. Thus:

- **A recorded failed assertion:** normal path now exits nonzero.
- **Any failed operation or violated advertised property:** not guaranteed to become an assertion failure.

### 2. Several assertions still cannot reject the claimed violation

| Check | Actual discrimination and remaining defect |
|---|---|
| A1 | Checks only `RC=0`; does not independently assert expected visits, successful saves, or comparison rows. |
| A2 | Checks exit 1 and absence of `Traceback`; prints the oracle verdict and drift count but does not assert either. |
| A3/A6 | Checks exit 4 and four OOE labels. A failed OOE batch can satisfy those conditions without demonstrating successful financial execution. The supplied CSV does show successful saves, which is stronger evidence than the assertion. |
| A4/A4b/A8 | Substantive checks: termination evidence, verified restoration, expected return codes, and selected process checks. They cover the stated injections, not hard-crash recovery generally. |
| A9 | Demonstrates sequential prefix separation, not concurrent isolation. |
| A10/A10c | Successful build and injected transaction rollback are meaningfully checked. |
| A11 | Still false as written: “every restore … hash-verified” is inferred from zero mismatches and **at least one** verified restoration. |
| A12 | Checks absence of stage tables, not whether deleting them was safe. |
| A13 | Checks selected pre/post fingerprints, with validation weaknesses discussed below. |
| A15 | Demonstrates missing-hash rejection and retention; does not assert `FAILED` directly, nor all 13 expected stage tables, nor writer death. |
| A16 | Properly asserts the specific live-name refusal and exit 3. |

The **21/21 count is numerically correct**. The implication that 21 advertised properties were fully enforced is not.

### 3. `three_count`: the targeted repair is correct

The new:

```python
if verify_form:
    gate_pass = False
...
return 0 if gate_pass else 1
```

correctly implements PARTIAL→0, absent B with `--verify-form-save`→1, and disagreement→1.

The contract test invokes the real `main()` with mocked readers and checks four exit codes. It is useful control-flow coverage, not SQL integration coverage; it omits B-present/B-unequal and matched-encounter coverage tests. Its standalone execution output is not embedded, although the report asserts 4/4.

The larger B gate remains weak: one note makes B “verified”; only its aggregate amount is compared with the entire cohort’s C. B encounter coverage and per-encounter financial agreement are not enforced. The docstring’s component-level A==B==C description is still wrong.

### 4. Integer tax: fixed computation, overstated invariant

The builder now uses:

```python
tax = (int(s or 0) * 11 + 50) // 100
```

The empty-scratch rebuild transcript establishes identical canonical serialized ledger content at hash `a66a3a54…`. That is strong demonstrated evidence.

A10b now detects missing positive-tax rows and exact amount discrepancies. However, its LEFT JOIN does **not** enforce “exactly one tax row”: two tax rows under different codes, both with the expected amount, pass this query. The schema key is `(no_rawat, component, code)`, not `(no_rawat, component)`. Expected-zero taxes are also excluded by:

```sql
WHERE (x.ds*11+50) DIV 100 > 0
```

No negative injection demonstrates the new missing/orphan tax detectors. Furthermore, `p7_tax_rule_check.py` only prints discrepancies; it does not return failure when discrepancies exist.

The tax step is integer. The blanket “no float … end-to-end” claim remains false: builder `irup()` still converts through `float`, and some gate paths cast or round inputs.

### 5. Live refusal is a guardrail, not disposable-target enforcement

Administrative `--freeze-only` and `--verify-frozen` modes bypass refusal but are database-read-only in the supplied code. Destructive live runs explicitly allowed by `--allow-live` are intentional.

The real hole is target binding: the oracle checks `db == "sik"` but does not verify the harness XML target. A clone-targeted oracle can still launch a form pointed at live `sik`. The supplied suite retargets correctly; the general oracle does not enforce it.

The suite itself accepts `FX=sik` and performs direct SQL mutation independently of A16. The builder also retains this destructive cohort defect:

```python
DELETE ... WHERE 1=1
```

for `--window ALL`, while inserts honor `--cohort dr`. Non-DR ledger rows would be deleted. Atomic execution does not make the deletion scope correct.

**Gate-correctness: 6/10 — up from 5.**

## ORACLE-VALIDITY

### Missing hashes: the demonstrated case is genuinely fixed

The missing-file branch now returns `False` rather than silently accepting restoration. A15 demonstrates the intended sequence:

> `STAGE-RESTORE-UNVERIFIED`  
> `restored=False`  
> `STAGE-KEEP`  
> `stage_tables_kept=13`  
> `exit=4`

That closes the specific v6 fail-open defect.

It does **not** close the broader missing/unreadable/corrupt-hash contract. This code is outside the restoration exception handler:

```python
pre = json.load(open(hpath)).get("sha256")
post = _content_hash(nrs, db, log)
```

Malformed JSON, permission failure, or a hashing query failure can produce an uncaught exception rather than structured FAILED/restored=False/STAGE-KEEP behavior. That is nonzero, not false success—but it is not the specified recoverable failure protocol. A wrong valid hash should produce a mismatch; no supplied injection demonstrates it.

The operational messages also remain dishonest. A15 prints:

> “FAILED … **pre-reset state restored**”

immediately after declaring restoration unverified. `_finalize()` still emits unconditional `crash_safe=YES` and describes FAILED batches as restored.

### P7 introduces a test cleanup that defeats its own recovery principle

A15 cleanup calls:

```python
o.stage_restore(...)
print('stage_drop', o.stage_drop(...))
```

It ignores the restoration return value. The hash is still missing. It therefore drops recovery material after an unverified restoration—the exact practice the new oracle path correctly refuses.

Then A11 announces:

> “every restore across the suite hash-verified”

despite A15’s explicitly unverified restoration and cleanup. This is not a theoretical concern; the supplied transcript contradicts the acceptance claim.

The wrapper compounds this: its EXIT trap drops the entire fixture even if the suite failed with retained recovery tables. On a disposable fixture that is not live-data loss, but it destroys the failed experiment’s recovery material and prevents investigation unless preserved elsewhere.

### Ranked residual oracle risks

**1. Source/baseline integrity remains inadequately enforced.**

`freeze_baseline()` records `source_content_hash`, but `verify_frozen()` never compares it. The v6 frozen-source finding is **not fixed**.

Worse, the hash function omits the billed drug fields the suite itself identifies:

> “The form bills … `detail_pemberian_obat.biaya_obat`”

It hashes master `ralan`, quantities and fees, not `biaya_obat` or `total`; it also omits the registration charge despite its docstring. Query failures are swallowed with `except Exception: pass`.

Consequently, same-count source changes can pass frozen verification. Baseline hashes preserve the captured rows; they do not establish that the captured rows came from a fresh consumer execution.

**2. Surviving writers and recovery interruption remain unsafe.**

A4/A4b/A8 provide credible bounded evidence: group termination, verified intermediate restoration, and successful rebilling.

But hard-crash resume watches a wrapper PID, waits a bounded time, and removes its PID file without proving the descendant group dead. Restoration remains a series of separately committed DELETE/REPLACE operations. Interruption during restoration is still untested.

**3. FAILED batches remain terminal rather than retryable.**

Resume explicitly skips `("BILLED", "FAILED")`. Retained stage tables are therefore useful for manual recovery, but “kept for a resume” overstates the implemented retry capability.

**4. Isolation and preservation remain incomplete.**

Locks are run-directory scoped, not encounter/database scoped. Separate runs can overlap on the same visits and shared XML configuration. There is no complete protected-fixture pre/post acceptance check. Intermediate restoration plus rebilling is still a redesigned contract, not exact final fixture restoration.

### Provenance materially improves validity—but does not establish baseline lineage

The audit is well designed for the demonstrated question:

- Triggers are installed before reset and verified to number eight.
- Oracle DML uses root.
- `USER()` records the originating account, avoiding the trigger-definer attribution problem associated with `CURRENT_USER()`.
- `CONNECTION_ID()` separates the root reset sessions from the benchmark writer.
- The transcript shows root deleting 17 billing rows, then `benchmark@localhost#68986` inserting 17 billing rows and the nota records.

That is convincing evidence that the exercised JVM/form path writes clone `billing`, not just notes.

However, **`BilingHarness.java` is not actually embedded**, despite the assertion that its SQL-free implementation can be inspected. Neither is the consumer source. The audit identifies a session/account, not independently a Java call stack; the supplied orchestration makes the attribution credible, but the “harness contains no SQL” premise remains asserted here.

Also, the audit counts **all billing rows**, not specifically 17 value rows.

**Fitness verdict:** suitable for bounded, selected-visit differential measurements under controlled execution. Not suitable for universal crash-safety claims or automatically attributing every frozen baseline to the consumer.

**Oracle-validity: 6/10 — up from 5.**

## REPRODUCIBILITY

### The ledger repair is a real closure of the v6 data defect

The rebuild evidence reconciles:

\[
86{,}455+86{,}455+113{,}389+70{,}056=356{,}355
\]

The backup and original ledger share hash `d2b65d8e…`. The rebuilt ledger changes to `a66a3a54…`, with:

- zero added or missing keys;
- zero amount or unit-price changes;
- one quantity correction;
- 260,800 source-label changes.

The quantity correction is internally consistent:

\[
25\times29{,}832=745{,}800
\]

The source-label repair affects:

\[
260{,}800/356{,}355=73.1854\%
\]

The old floating-tax builder performed the live rebuild; the **new integer builder subsequently reproduces the entire serialized ledger from an empty scratch table**. Those are distinct, complementary demonstrations. They close the earlier “only keys, amounts and prices reproduce” limitation for this current source state.

“Byte-identical” should mean the defined ordered row serialization—not identical database files or storage layout.

The line-diff passes on both windows are also properly supported. The transcripts correctly retain `three_count exit=1`; they demonstrate A==C, not a full three-source PASS.

### The wrapper improves on-box repeatability, not independent reproducibility

The wrapper supplies a useful operational recipe:

1. Create a fresh full clone.
2. Load STRATA registrations.
3. Grant benchmark DML.
4. Run the suite.
5. Revoke and drop.

The actual XML retargeting, successful clone saves, and clone audit remove the principal current-path ambiguity caused by `database.ini`. **Current targeting is materially verified. Historical targeting is not rehabilitated.**

However, the wrapper has failure-handling holes:

```bash
mysqldump ... | mysql ... || exit 3
```

without `pipefail` can miss an upstream dump failure if the import exits successfully. CREATE and GRANT return codes are not consistently enforced. Cleanup revocation and DROP failures are printed, not reliably reflected in the verdict.

### Ranked third-party blockers

**1. No frozen, retrievable fixture or full derivation closure.**

The “fresh fixture” is a fresh copy of mutable live `sik`, plus an unpinned STRATA SQL artifact selected from an on-box directory. A third party cannot reconstruct this from schema and jar alone.

The manifest’s statement that raw images are “too large to pin by hash” is indefensible. Storage and distribution may be expensive; streaming a content hash is not an archival impossibility.

**2. Missing runtime dependencies and executable lineage.**

The embedded material does not include everything claimed:

- `BilingHarness.java` and its compiled-class pin;
- `KhanzaBillingConsumer.java` and a matching executable pin;
- `stagea_common.py`, on which XML handling depends;
- the STRATA SQL artifact;
- `p7_ledger_rebuild.sh`, although it is listed in the manifest.

The Java classpath includes `harness`, `shim`, and other runtime dependencies outside the pinned Khanza jar. Pinning the main jar does not pin the exercised program.

**3. Pins are recorded, not enforced at startup.**

The suite prints three tool hashes. It does not compare the whole executable/configuration set against the manifest before destructive execution. Earlier deployment-pin drift therefore remains a class of risk, even though current transcripts identify specific builds.

**4. Host and privilege dependence.**

Hard-coded `/opt` paths, root MySQL access, a password file, Xvfb, faketime, encrypted XML, and shared configuration backups bind execution to this VPS layout. Temporary grants are sensible, but there is no portable provision-and-verify environment package.

**5. Evidence preservation and chronology.**

Repeated suites delete `results/r6_*`; the wrapper drops failed fixtures. Recovery state and baseline artifacts are not comprehensively archived by the raw-log tar command.

There is also an unresolved chronological discrepancy: the task says it was written **2026-10-17 before execution**, while the UTC audit, rebuild, and suite transcripts are dated **2026-10-16**. That does not invalidate the results, but it does not substantiate “task-before-hands” as written.

**Bottom line:** whole-ledger reproduction is fixed on the current box. Artifact/fixture closure, cross-machine reproduction, and historical-run validity remain open.

**Reproducibility: 6/10 — up from 5.**

## E2E-DESIGN

### The provenance finding removes a false structural limitation

The old assertion that this form path cannot write `billing` should be withdrawn. The audit directly contradicts it:

> `billing | INSERT | benchmark@localhost | 17`

This is a significant improvement, not cosmetic reframing. The form can produce the very billing surface the oracle compares.

The defensible claim is:

> On selected encounters in the exercised Khanza configuration, the form-save path writes billing rows on the verified clone, and the oracle compares their normalized value-row multiset with a frozen pre-run billing snapshot. Controlled price perturbation produces a detected discrepancy.

Calling that snapshot a **consumer baseline** additionally requires attributable consumer lineage.

### The weakest remaining leg is baseline lineage and the matched financial reference

The suite does not run a fresh consumer to establish A1’s baseline. It freezes whatever billing rows happen to exist in the live-derived clone.

After A1, those same visits contain form-written rows. A2 then freezes that state. A2 remains a valid controlled mismatch detector, but its baseline is now demonstrably inherited from a preceding form run, not a freshly executed consumer.

Similarly, the provenance audit establishes who wrote the **post-reset** rows. It does not establish who wrote the pre-reset 17 rows. They could already have been rewritten during historical form runs.

Therefore §18’s:

> “same-encounter form-vs-consumer check on **every** sampled, re-billed visit”

is too broad. Same encounter is established by the query keys. Consumer provenance is not established by calling a directory `baseline_frozen`.

The report correctly leaves the R4 0/999 interpretation unresolved. That restraint must also constrain any use of those 999 visits as current form-versus-consumer evidence.

### Is note-level B still meaningful?

**Yes, but not as currently validated.**

It is a distinct settlement-record surface that can reveal disagreement between charge generation and saved payment/receivable records. It is not fully independent of form-written billing: both can be produced by the same application save and share defects.

The current `three_count` gate:

1. detects any notes/receivables in the cohort;
2. calls B verified;
3. compares their aggregate amount with the entire cohort ledger.

That is not matched-subset reconciliation. For example, one erroneous note carrying the entire cohort total can satisfy B’s amount comparison despite missing notes for other encounters. Conversely, valid notes for a genuine subset predictably fail against full-cohort C.

Thus the remaining B-subset limitation is **correctly retained for this note-level gate**, even though the “form cannot write billing” explanation is withdrawn.

### Concrete repair for the weakest leg

Build one small, attributable three-way experiment:

1. Pin immutable input encounters and the tariff/source snapshot.
2. Run the pinned consumer into a clean isolated output target.
3. Freeze and hash that newly generated consumer output, recording process and connection provenance.
4. Run the form from the identical source snapshot into a separate clean target.
5. Compare by the exact encounter set:
   - consumer versus form billing multisets;
   - both versus independently derived expected charges;
   - note/payment/receivable totals versus the expected financial treatment for those same encounters.
6. Inject same-price code swaps, quantity reallocations preserving totals, missing/duplicate tax rows, and missing/misassigned notes.
7. Verify protected non-sample state and reject incomplete encounter coverage.

The ledger still shares codes and quantities with adapter-populated source tables. Rebuilding it faithfully repairs consistency; it does not create independent source truth.

### Disposition of the v6 E2E and safety findings

- **Current XML targeting:** fixed and exercised.
- **Selected timeout/SIGTERM recovery and rollback:** retained, demonstrated strengths.
- **Controlled mismatch detection:** retained strength.
- **Write provenance:** substantially resolved for the audited path.
- **Matched B–C reconciliation:** still open.
- **Aggregate-preserving line reallocations:** still open; component quantity sums are not line identity.
- **Non-DR/cohort preservation:** still open; builder DELETE scope is concretely wrong.
- **Financial edge coverage:** still open.
- **Original exact restoration acceptance:** still substituted by intermediate restore plus rebilling.
- **Historical clone contamination:** explicitly disclosed, not repaired.

**E2E-design: 7/10 — up from 6, for a real form-written billing endpoint, not for completed independent financial validation.**

## EXTERNAL-VALIDITY

### P7 changes internal validity, not the external evidence envelope

There is no new evidence for:

- another hospital;
- another Khanza configuration;
- inpatient billing;
- payer/insurance variation;
- clinically calibrated encounter content;
- representative operational performance;
- another HMS.

C1–C4 remain untested. The external-validity score should not increase because recovery code, audit triggers, or ledger consistency improved.

### Edge execution is still not edge financial validation

The current evidence distinguishes these correctly when read carefully:

- **More than two procedures:** the form executes, but the oracle marks encounters OOE. One supplied CSV row shows 11 baseline versus 6 real value rows. Classification prevents a false in-envelope pass; it does not establish correctness for that stratum.
- **Embalase/tuslah:** authored charges produced no observable bill difference. That demonstrates behavior of this configuration, not correct handling across configurations.
- **ZEROFEE/HALFPPN:** remain financially unvalidated through the required consumer-to-form workflow.

The integer-rule comparison over 70,056 subtotals is useful arithmetic coverage of the existing corpus. It is not proof that boundary cases were authored and exercised through the form.

### The rule-of-three claim remains overstated

The arithmetic is:

\[
3/999=0.003003=0.3003\%
\]

But a numerical rule-of-three calculation does not automatically yield a population bound. It requires an appropriate sampling model, valid independent observations, and a trustworthy measurement endpoint. The 999 sample is stratified, includes historical visits, and uses a pre-R5 oracle whose exact interpretation is explicitly unresolved.

Likewise:

\[
4/216=1.85185\%
\]

is numerically correct, but the four original comparisons were invalidated by baseline contamination. Neither figure supports an unconditional B3 population-correctness bound.

The throughput bridge remains reasonable:

\[
47.8\times60/86{,}101\approx33.31\text{ ms/visit}
\]

and:

\[
999/(8{,}393/60)\approx7.14\text{ GUI visits/min}
\]

Those are different execution surfaces, not interchangeable measures of hospital workflow capacity.

The revenue bridge also reconciles:

\[
34{,}727{,}295{,}800+142{,}947{,}833
=34{,}870{,}243{,}633
\]

Correct arithmetic supports accounting consistency; it does not supply missing representativeness.

### Scoping honesty: better, but still inconsistent

The paper-safe boundary in §13 is appropriate. P7 explicitly defers difficult recovery work and historical revalidation, which deserves credit.

However, the report still contains incompatible current-facing claims:

- §16 says B-settlement equivalence is “structurally unclaimable.”
- §18 withdraws that explanation.
- A11 claims every restoration verified while A15 demonstrates otherwise.
- The oracle emits `crash_safe=YES` unconditionally.
- The manifest implies third-party reproducibility without the live box despite missing fixture/runtime closure.
- The population-bound wording remains.

The owner has become better at documenting limitations, but is still appending corrections rather than maintaining one coherent acceptance contract.

**Top external risk:** mistaking synthetic execution and internal agreement for representative hospital financial correctness. Shared input assumptions, narrow payer coverage, and uncalibrated clinical content can produce excellent agreement on an unrealistic workload.

### Final six-criterion assessment

The requested five sections cover five criteria. Claim-honesty remains the sixth equally weighted criterion.

| Criterion | v6 | v7 | Delta |
|---|---:|---:|---:|
| Claim-honesty | 6 | **6** | 0 |
| Gate-correctness | 5 | **6** | +1 |
| Oracle-validity | 5 | **6** | +1 |
| Reproducibility | 5 | **6** | +1 |
| E2E-design | 6 | **7** | +1 |
| External-validity | 4 | **4** | 0 |

\[
\operatorname{round}\left(\frac{6+6+6+6+7+4}{6}\times10\right)
=\boxed{58/100}
\]

History: **35 → 43 → 43 → 52 → 58**.

**Verdict: Needs targeted rework. P7 delivered meaningful fixes, but its blanket PASS is not justified against its own rubric.**

The top three remaining issues are:

1. **Recovery and protection:** structured corrupt-hash handling, surviving-writer death proof, interrupted restoration, retryable failures, and preservation of failed-run evidence.
2. **Acceptance integrity:** test the actual terminal/wrapper failure path; replace A11; enforce checksum validity, tax cardinality, target binding, and cleanup outcomes.
3. **Independent E2E lineage:** freshly attributable consumer baselines and matched-encounter billing/settlement/ledger reconciliation.

The strongest properties to lead with are now **audited form-written billing**, **controlled mismatch and bounded recovery/rollback demonstrations**, and **whole-ledger reproduction from the current source state**. Lead with those—not “crash-safe,” “every restore verified,” or population correctness.

**External-validity: 4/10 — unchanged.**

## VERDICT

## Overall assessment

**P7: 58/100 — Needs targeted rework.** It materially strengthens the demonstrated implementation, but not enough to justify blanket PASS, universal crash-safety, independent financial correctness, or third-party reproducibility.

The strongest advance is evidence that the exercised form path actually writes billing rows, alongside deterministic whole-ledger rebuilding and bounded recovery demonstrations. The central remaining weakness is **acceptance integrity**: success claims still exceed what the gates enforce.

This synthesis uses the supplied assessment excerpts; “verified” below means supported by their code analysis and reported runs, not a new independent execution. The claim-honesty section is empty, so its score rests on the explicit contradictions documented elsewhere.

## Criterion scores and historical deltas

Deltas are ordered against runs **4701365 / 4769794 / 4795743 / 4818826**.

| Criterion | Score | Prior scores | Deltas |
|---|---:|---|---|
| Claim-honesty | **6/10** | 4 / 5 / 5 / 6 | **+2 / +1 / +1 / 0** |
| Gate-correctness | **6/10** | 3 / 3 / 3 / 5 | **+3 / +3 / +3 / +1** |
| Oracle-validity | **6/10** | 4 / 4 / 3 / 5 | **+2 / +2 / +3 / +1** |
| Reproducibility | **6/10** | 3 / 5 / 6 / 5 | **+3 / +1 / 0 / +1** |
| E2E-design | **7/10** | 4 / 5 / 5 / 6 | **+3 / +2 / +2 / +1** |
| External-validity | **4/10** | 3 / 4 / 4 / 4 | **+1 / 0 / 0 / 0** |

### Claim-honesty — 6/10
**Justification:** Disclosure improves, but the report still says B-settlement equivalence is “structurally unclaimable” before withdrawing that explanation, and emits `crash_safe=YES` unconditionally despite documented recovery limitations.  
**Biggest remaining risk:** Readers may treat appended corrections as qualifications to a valid acceptance contract when they actually contradict its headline claims.

### Gate-correctness — 6/10
**Justification:** Integer tax computation is concretely repaired with `tax = (int(s or 0) * 11 + 50) // 100`, but “one note makes B ‘verified’,” and A10b cannot enforce exactly one tax row under the key `(no_rawat, component, code)`.  
**Biggest remaining risk:** A successful gate can still conceal incomplete encounter coverage, duplicate tax rows, or mutation of the wrong target or cohort.

### Oracle-validity — 6/10
**Justification:** The audit records root deleting 17 billing rows followed by `benchmark@localhost#68986` inserting 17 billing rows and nota records, while A4/A4b/A8 demonstrate bounded termination, restoration, and rebilling.  
**Biggest remaining risk:** Hard-crash recovery can restore while descendants survive, and frozen baselines still lack consistently demonstrated fresh-consumer lineage.

### Reproducibility — 6/10
**Justification:** The empty-scratch rebuild reproduces canonical ledger hash `a66a3a54…`, but the fixture remains a copy of mutable live `sik` and required artifacts include missing `stagea_common.py`, Java sources/classes, and STRATA SQL.  
**Biggest remaining risk:** Another machine cannot reconstruct and verify the exercised fixture and complete executable stack from the supplied package.

### E2E-design — 7/10
**Justification:** Audited form-written billing repairs a substantive endpoint uncertainty, but the note gate still “compares their aggregate amount with the entire cohort ledger” rather than reconciling identical encounter sets.  
**Biggest remaining risk:** Shared-source assumptions and aggregate-preserving line errors can produce agreement without independently correct billing or settlement.

### External-validity — 4/10
**Justification:** The assessment identifies “narrow payer coverage” and “uncalibrated clinical content,” while population-bound wording persists without a representative validation basis.  
**Biggest remaining risk:** Synthetic execution success will be interpreted as representative hospital financial correctness.

## 1. Disposition of v6 findings

### Genuinely fixed — within demonstrated scope

| Finding | Supported resolution | Boundary |
|---|---|---|
| Tax calculation used floating arithmetic | Code now uses integer arithmetic, and the rebuilt ledger has the reported matching canonical hash. | This fixes the tax step, **not** the blanket “no float … end-to-end” claim. |
| Whole-ledger rebuilding from current source state | Empty-scratch rebuilding demonstrates identical canonical ledger content. | Same-box consistency, not immutable fixture closure or independent source truth. |
| Current suite XML targeting | The assessment explicitly identifies current targeting as “fixed and exercised.” | The general oracle still does not bind its checked database to the harness XML target. |

**Retained, demonstrated strengths—not new comprehensive fixes:** selected timeout/SIGTERM recovery, intermediate restoration plus successful rebilling, controlled mismatch detection, and rollback behavior.

**Substantially resolved, but not fully closed:** form-write provenance. The trigger implementation and audit run convincingly establish billing writes from the benchmark session. However, absent harness/consumer source and executable closure prevent upgrading this to fully verified SQL-free harness lineage or attribution of every historical baseline.

### Merely claimed, or broader than the evidence

- **Universal crash safety:** contradicted by survivor and interrupted-restoration gaps.
- **“Every restoration verified”:** contradicted by the reported A15 result.
- **“Exactly one tax row”:** not enforced by A10b.
- **“No float … end-to-end”:** contradicted by `irup()` and gate conversions.
- **Automatic retry through retained stages:** resume skips `("BILLED", "FAILED")`.
- **SQL-free harness inspectability:** its source is not embedded.
- **Third-party reproducibility without the live box:** fixture and runtime closure are missing.
- **Four exit-path tests:** useful mocked control-flow coverage, with 4/4 asserted, but not SQL integration or B-coverage validation.

### Still open

- Matched-encounter B–C reconciliation and per-encounter financial agreement.
- Aggregate-preserving code/quantity substitutions.
- Structured corrupt-hash handling, descendant-death proof, and interrupted restoration.
- Encounter/database-scoped isolation and protected non-sample preservation.
- Correct cohort deletion scope for `--window ALL`.
- Exact final fixture restoration under the original contract.
- Fresh attributable consumer baselines, independent expected charges, and financial edge cases.
- Frozen fixtures, complete runtime pins, startup enforcement, and portable provisioning.
- Historical-run contamination and revalidation.

## 2. Problems P7 introduced or exposed

These are **newly exposed or sharpened by P7**; the excerpts do not establish that all were newly introduced.

1. **Tax acceptance is weaker than advertised:** duplicate expected-amount rows under different codes pass; expected-zero taxes are excluded; `p7_tax_rule_check.py` prints discrepancies without failing.
2. **Live-target protection is not end-to-end:** the oracle checks `db == "sik"` without checking harness XML, while the suite accepts `FX=sik` and mutates SQL directly.
3. **Destructive cohort mismatch:** `DELETE ... WHERE 1=1` under `--window ALL` can remove non-DR rows although inserts honor `--cohort dr`.
4. **Failure evidence can disappear:** repeated suites delete `results/r6_*`, failed fixtures are dropped, and recovery artifacts are not comprehensively archived.
5. **New evidence creates new closure obligations:** benchmark-session attribution does not supply the missing harness/consumer executable lineage.
6. **Chronology is unresolved:** a task described as written on **2026-10-17 before execution** accompanies transcripts dated **2026-10-16**; this weakens the preregistration claim, not necessarily the execution results.

## 3. Top three remaining issues

1. **Recovery and state protection:** prove writers are dead before restoring, handle corrupt metadata and interrupted restoration, preserve non-sample state, and retain failed-run evidence.
2. **Acceptance integrity:** make the actual wrapper fail closed on invalid checksums, incomplete B coverage, tax-cardinality errors, target mismatches, and cleanup failures; replace contradictory restoration/PASS assertions.
3. **Independent E2E lineage:** generate a fresh pinned consumer baseline and reconcile consumer, form, independently expected charges, and settlement over exactly the same encounters.

## 4. Top three strongest properties to lead with

1. **Audited form-written billing**, with originating account and connection-level evidence.
2. **Controlled mismatch detection and bounded recovery/rollback demonstrations**, explicitly limited to exercised failure modes.
3. **Deterministic whole-ledger rebuilding from current source state**, demonstrated by matching canonical serialization hashes.

These are stronger and more defensible than “crash-safe,” “every restore verified,” or population-level correctness.

## 5. Overall score and historical comparison

\[
\operatorname{round}\left((6+6+6+6+7+4)\times\frac{10}{6}\right)
=\boxed{58/100}
\]

| Prior run | Prior score | P7 delta |
|---|---:|---:|
| 4701365 | 35 | **+23** |
| 4769794 | 43 | **+15** |
| 4795743 | 43 | **+15** |
| 4818826 | 52 | **+6** |

**Trajectory: 35 → 43 → 43 → 52 → 58.** The latest improvement is substantive but bounded: four implementation/evidence criteria rise by one point; claim-honesty and external-validity do not improve.

## 6. Verdict

**Needs targeted rework.**

P7 supports a credible, narrowly framed engineering result under controlled execution. It does not yet support its broader safety, reproducibility, and financial-equivalence claims.

## 7. Single most important next step

**Replace the blanket PASS with a fail-closed recovery acceptance test through the actual production wrapper on an immutable disposable clone.** Inject corrupt recovery metadata, a surviving child writer, and interruption during restoration; require verified writer termination, state/protected-cohort checks, correct nonzero failure propagation, and preserved evidence before declaring success.

## RAW MERGED RESPONSE

## GATE-CORRECTNESS

**P7 repairs real defects. It does not establish the advertised fail-closed acceptance contract.** This assessment is a source-and-transcript review, not an independent execution.

### 1. The normal suite exit is fixed; A14 does not test it

The suite now actually ends with:

```bash
[ "$FAIL" = "0" ] && exit 0 || exit 1
```

The wrapper captures and propagates that status:

```bash
RC=$?
echo "suite exit=$RC"
exit $RC
```

Neither EXIT trap explicitly replaces the requested status. An ordinary failed `check` increments `FAIL`; the normal terminal path now returns 1. That is a legitimate fix.

But A14 exercises a **separate early-return implementation**:

```bash
if [ -n "${P7_EXIT_TEST:-}" ]; then
  ...
  [ "$FAIL" = "0" ] && exit 0 || exit 1
fi
```

It never reaches the terminal exit, fixture operations, wrapper, or cleanup traps. Delete the real terminal exit and A14 still passes. The transcript—

> “A14 forced-fail exit=1 forced-pass exit=0”

—proves the test branch works, not that a failing full suite propagates through the wrapper. The rubric acknowledges the wrapper was not tested but nevertheless marks AC-1 PASS. **That is partial acceptance presented as complete acceptance.**

Also, inherited `P7_EXIT_TEST=pass` makes the wrapper invoke a suite that immediately returns success without running acceptance checks. This test-only bypass belongs in a unit test, not an operational entry point.

There are still uncounted failures: freeze failures, SQL setup failures, A2 cleanup, archive creation, and cleanup operations are not consistently checked. `set -u` is not `set -e` or `pipefail`. Thus:

- **A recorded failed assertion:** normal path now exits nonzero.
- **Any failed operation or violated advertised property:** not guaranteed to become an assertion failure.

### 2. Several assertions still cannot reject the claimed violation

| Check | Actual discrimination and remaining defect |
|---|---|
| A1 | Checks only `RC=0`; does not independently assert expected visits, successful saves, or comparison rows. |
| A2 | Checks exit 1 and absence of `Traceback`; prints the oracle verdict and drift count but does not assert either. |
| A3/A6 | Checks exit 4 and four OOE labels. A failed OOE batch can satisfy those conditions without demonstrating successful financial execution. The supplied CSV does show successful saves, which is stronger evidence than the assertion. |
| A4/A4b/A8 | Substantive checks: termination evidence, verified restoration, expected return codes, and selected process checks. They cover the stated injections, not hard-crash recovery generally. |
| A9 | Demonstrates sequential prefix separation, not concurrent isolation. |
| A10/A10c | Successful build and injected transaction rollback are meaningfully checked. |
| A11 | Still false as written: “every restore … hash-verified” is inferred from zero mismatches and **at least one** verified restoration. |
| A12 | Checks absence of stage tables, not whether deleting them was safe. |
| A13 | Checks selected pre/post fingerprints, with validation weaknesses discussed below. |
| A15 | Demonstrates missing-hash rejection and retention; does not assert `FAILED` directly, nor all 13 expected stage tables, nor writer death. |
| A16 | Properly asserts the specific live-name refusal and exit 3. |

The **21/21 count is numerically correct**. The implication that 21 advertised properties were fully enforced is not.

### 3. `three_count`: the targeted repair is correct

The new:

```python
if verify_form:
    gate_pass = False
...
return 0 if gate_pass else 1
```

correctly implements PARTIAL→0, absent B with `--verify-form-save`→1, and disagreement→1.

The contract test invokes the real `main()` with mocked readers and checks four exit codes. It is useful control-flow coverage, not SQL integration coverage; it omits B-present/B-unequal and matched-encounter coverage tests. Its standalone execution output is not embedded, although the report asserts 4/4.

The larger B gate remains weak: one note makes B “verified”; only its aggregate amount is compared with the entire cohort’s C. B encounter coverage and per-encounter financial agreement are not enforced. The docstring’s component-level A==B==C description is still wrong.

### 4. Integer tax: fixed computation, overstated invariant

The builder now uses:

```python
tax = (int(s or 0) * 11 + 50) // 100
```

The empty-scratch rebuild transcript establishes identical canonical serialized ledger content at hash `a66a3a54…`. That is strong demonstrated evidence.

A10b now detects missing positive-tax rows and exact amount discrepancies. However, its LEFT JOIN does **not** enforce “exactly one tax row”: two tax rows under different codes, both with the expected amount, pass this query. The schema key is `(no_rawat, component, code)`, not `(no_rawat, component)`. Expected-zero taxes are also excluded by:

```sql
WHERE (x.ds*11+50) DIV 100 > 0
```

No negative injection demonstrates the new missing/orphan tax detectors. Furthermore, `p7_tax_rule_check.py` only prints discrepancies; it does not return failure when discrepancies exist.

The tax step is integer. The blanket “no float … end-to-end” claim remains false: builder `irup()` still converts through `float`, and some gate paths cast or round inputs.

### 5. Live refusal is a guardrail, not disposable-target enforcement

Administrative `--freeze-only` and `--verify-frozen` modes bypass refusal but are database-read-only in the supplied code. Destructive live runs explicitly allowed by `--allow-live` are intentional.

The real hole is target binding: the oracle checks `db == "sik"` but does not verify the harness XML target. A clone-targeted oracle can still launch a form pointed at live `sik`. The supplied suite retargets correctly; the general oracle does not enforce it.

The suite itself accepts `FX=sik` and performs direct SQL mutation independently of A16. The builder also retains this destructive cohort defect:

```python
DELETE ... WHERE 1=1
```

for `--window ALL`, while inserts honor `--cohort dr`. Non-DR ledger rows would be deleted. Atomic execution does not make the deletion scope correct.

**Gate-correctness: 6/10 — up from 5.**

## ORACLE-VALIDITY

### Missing hashes: the demonstrated case is genuinely fixed

The missing-file branch now returns `False` rather than silently accepting restoration. A15 demonstrates the intended sequence:

> `STAGE-RESTORE-UNVERIFIED`  
> `restored=False`  
> `STAGE-KEEP`  
> `stage_tables_kept=13`  
> `exit=4`

That closes the specific v6 fail-open defect.

It does **not** close the broader missing/unreadable/corrupt-hash contract. This code is outside the restoration exception handler:

```python
pre = json.load(open(hpath)).get("sha256")
post = _content_hash(nrs, db, log)
```

Malformed JSON, permission failure, or a hashing query failure can produce an uncaught exception rather than structured FAILED/restored=False/STAGE-KEEP behavior. That is nonzero, not false success—but it is not the specified recoverable failure protocol. A wrong valid hash should produce a mismatch; no supplied injection demonstrates it.

The operational messages also remain dishonest. A15 prints:

> “FAILED … **pre-reset state restored**”

immediately after declaring restoration unverified. `_finalize()` still emits unconditional `crash_safe=YES` and describes FAILED batches as restored.

### P7 introduces a test cleanup that defeats its own recovery principle

A15 cleanup calls:

```python
o.stage_restore(...)
print('stage_drop', o.stage_drop(...))
```

It ignores the restoration return value. The hash is still missing. It therefore drops recovery material after an unverified restoration—the exact practice the new oracle path correctly refuses.

Then A11 announces:

> “every restore across the suite hash-verified”

despite A15’s explicitly unverified restoration and cleanup. This is not a theoretical concern; the supplied transcript contradicts the acceptance claim.

The wrapper compounds this: its EXIT trap drops the entire fixture even if the suite failed with retained recovery tables. On a disposable fixture that is not live-data loss, but it destroys the failed experiment’s recovery material and prevents investigation unless preserved elsewhere.

### Ranked residual oracle risks

**1. Source/baseline integrity remains inadequately enforced.**

`freeze_baseline()` records `source_content_hash`, but `verify_frozen()` never compares it. The v6 frozen-source finding is **not fixed**.

Worse, the hash function omits the billed drug fields the suite itself identifies:

> “The form bills … `detail_pemberian_obat.biaya_obat`”

It hashes master `ralan`, quantities and fees, not `biaya_obat` or `total`; it also omits the registration charge despite its docstring. Query failures are swallowed with `except Exception: pass`.

Consequently, same-count source changes can pass frozen verification. Baseline hashes preserve the captured rows; they do not establish that the captured rows came from a fresh consumer execution.

**2. Surviving writers and recovery interruption remain unsafe.**

A4/A4b/A8 provide credible bounded evidence: group termination, verified intermediate restoration, and successful rebilling.

But hard-crash resume watches a wrapper PID, waits a bounded time, and removes its PID file without proving the descendant group dead. Restoration remains a series of separately committed DELETE/REPLACE operations. Interruption during restoration is still untested.

**3. FAILED batches remain terminal rather than retryable.**

Resume explicitly skips `("BILLED", "FAILED")`. Retained stage tables are therefore useful for manual recovery, but “kept for a resume” overstates the implemented retry capability.

**4. Isolation and preservation remain incomplete.**

Locks are run-directory scoped, not encounter/database scoped. Separate runs can overlap on the same visits and shared XML configuration. There is no complete protected-fixture pre/post acceptance check. Intermediate restoration plus rebilling is still a redesigned contract, not exact final fixture restoration.

### Provenance materially improves validity—but does not establish baseline lineage

The audit is well designed for the demonstrated question:

- Triggers are installed before reset and verified to number eight.
- Oracle DML uses root.
- `USER()` records the originating account, avoiding the trigger-definer attribution problem associated with `CURRENT_USER()`.
- `CONNECTION_ID()` separates the root reset sessions from the benchmark writer.
- The transcript shows root deleting 17 billing rows, then `benchmark@localhost#68986` inserting 17 billing rows and the nota records.

That is convincing evidence that the exercised JVM/form path writes clone `billing`, not just notes.

However, **`BilingHarness.java` is not actually embedded**, despite the assertion that its SQL-free implementation can be inspected. Neither is the consumer source. The audit identifies a session/account, not independently a Java call stack; the supplied orchestration makes the attribution credible, but the “harness contains no SQL” premise remains asserted here.

Also, the audit counts **all billing rows**, not specifically 17 value rows.

**Fitness verdict:** suitable for bounded, selected-visit differential measurements under controlled execution. Not suitable for universal crash-safety claims or automatically attributing every frozen baseline to the consumer.

**Oracle-validity: 6/10 — up from 5.**

## REPRODUCIBILITY

### The ledger repair is a real closure of the v6 data defect

The rebuild evidence reconciles:

\[
86{,}455+86{,}455+113{,}389+70{,}056=356{,}355
\]

The backup and original ledger share hash `d2b65d8e…`. The rebuilt ledger changes to `a66a3a54…`, with:

- zero added or missing keys;
- zero amount or unit-price changes;
- one quantity correction;
- 260,800 source-label changes.

The quantity correction is internally consistent:

\[
25\times29{,}832=745{,}800
\]

The source-label repair affects:

\[
260{,}800/356{,}355=73.1854\%
\]

The old floating-tax builder performed the live rebuild; the **new integer builder subsequently reproduces the entire serialized ledger from an empty scratch table**. Those are distinct, complementary demonstrations. They close the earlier “only keys, amounts and prices reproduce” limitation for this current source state.

“Byte-identical” should mean the defined ordered row serialization—not identical database files or storage layout.

The line-diff passes on both windows are also properly supported. The transcripts correctly retain `three_count exit=1`; they demonstrate A==C, not a full three-source PASS.

### The wrapper improves on-box repeatability, not independent reproducibility

The wrapper supplies a useful operational recipe:

1. Create a fresh full clone.
2. Load STRATA registrations.
3. Grant benchmark DML.
4. Run the suite.
5. Revoke and drop.

The actual XML retargeting, successful clone saves, and clone audit remove the principal current-path ambiguity caused by `database.ini`. **Current targeting is materially verified. Historical targeting is not rehabilitated.**

However, the wrapper has failure-handling holes:

```bash
mysqldump ... | mysql ... || exit 3
```

without `pipefail` can miss an upstream dump failure if the import exits successfully. CREATE and GRANT return codes are not consistently enforced. Cleanup revocation and DROP failures are printed, not reliably reflected in the verdict.

### Ranked third-party blockers

**1. No frozen, retrievable fixture or full derivation closure.**

The “fresh fixture” is a fresh copy of mutable live `sik`, plus an unpinned STRATA SQL artifact selected from an on-box directory. A third party cannot reconstruct this from schema and jar alone.

The manifest’s statement that raw images are “too large to pin by hash” is indefensible. Storage and distribution may be expensive; streaming a content hash is not an archival impossibility.

**2. Missing runtime dependencies and executable lineage.**

The embedded material does not include everything claimed:

- `BilingHarness.java` and its compiled-class pin;
- `KhanzaBillingConsumer.java` and a matching executable pin;
- `stagea_common.py`, on which XML handling depends;
- the STRATA SQL artifact;
- `p7_ledger_rebuild.sh`, although it is listed in the manifest.

The Java classpath includes `harness`, `shim`, and other runtime dependencies outside the pinned Khanza jar. Pinning the main jar does not pin the exercised program.

**3. Pins are recorded, not enforced at startup.**

The suite prints three tool hashes. It does not compare the whole executable/configuration set against the manifest before destructive execution. Earlier deployment-pin drift therefore remains a class of risk, even though current transcripts identify specific builds.

**4. Host and privilege dependence.**

Hard-coded `/opt` paths, root MySQL access, a password file, Xvfb, faketime, encrypted XML, and shared configuration backups bind execution to this VPS layout. Temporary grants are sensible, but there is no portable provision-and-verify environment package.

**5. Evidence preservation and chronology.**

Repeated suites delete `results/r6_*`; the wrapper drops failed fixtures. Recovery state and baseline artifacts are not comprehensively archived by the raw-log tar command.

There is also an unresolved chronological discrepancy: the task says it was written **2026-10-17 before execution**, while the UTC audit, rebuild, and suite transcripts are dated **2026-10-16**. That does not invalidate the results, but it does not substantiate “task-before-hands” as written.

**Bottom line:** whole-ledger reproduction is fixed on the current box. Artifact/fixture closure, cross-machine reproduction, and historical-run validity remain open.

**Reproducibility: 6/10 — up from 5.**

## E2E-DESIGN

### The provenance finding removes a false structural limitation

The old assertion that this form path cannot write `billing` should be withdrawn. The audit directly contradicts it:

> `billing | INSERT | benchmark@localhost | 17`

This is a significant improvement, not cosmetic reframing. The form can produce the very billing surface the oracle compares.

The defensible claim is:

> On selected encounters in the exercised Khanza configuration, the form-save path writes billing rows on the verified clone, and the oracle compares their normalized value-row multiset with a frozen pre-run billing snapshot. Controlled price perturbation produces a detected discrepancy.

Calling that snapshot a **consumer baseline** additionally requires attributable consumer lineage.

### The weakest remaining leg is baseline lineage and the matched financial reference

The suite does not run a fresh consumer to establish A1’s baseline. It freezes whatever billing rows happen to exist in the live-derived clone.

After A1, those same visits contain form-written rows. A2 then freezes that state. A2 remains a valid controlled mismatch detector, but its baseline is now demonstrably inherited from a preceding form run, not a freshly executed consumer.

Similarly, the provenance audit establishes who wrote the **post-reset** rows. It does not establish who wrote the pre-reset 17 rows. They could already have been rewritten during historical form runs.

Therefore §18’s:

> “same-encounter form-vs-consumer check on **every** sampled, re-billed visit”

is too broad. Same encounter is established by the query keys. Consumer provenance is not established by calling a directory `baseline_frozen`.

The report correctly leaves the R4 0/999 interpretation unresolved. That restraint must also constrain any use of those 999 visits as current form-versus-consumer evidence.

### Is note-level B still meaningful?

**Yes, but not as currently validated.**

It is a distinct settlement-record surface that can reveal disagreement between charge generation and saved payment/receivable records. It is not fully independent of form-written billing: both can be produced by the same application save and share defects.

The current `three_count` gate:

1. detects any notes/receivables in the cohort;
2. calls B verified;
3. compares their aggregate amount with the entire cohort ledger.

That is not matched-subset reconciliation. For example, one erroneous note carrying the entire cohort total can satisfy B’s amount comparison despite missing notes for other encounters. Conversely, valid notes for a genuine subset predictably fail against full-cohort C.

Thus the remaining B-subset limitation is **correctly retained for this note-level gate**, even though the “form cannot write billing” explanation is withdrawn.

### Concrete repair for the weakest leg

Build one small, attributable three-way experiment:

1. Pin immutable input encounters and the tariff/source snapshot.
2. Run the pinned consumer into a clean isolated output target.
3. Freeze and hash that newly generated consumer output, recording process and connection provenance.
4. Run the form from the identical source snapshot into a separate clean target.
5. Compare by the exact encounter set:
   - consumer versus form billing multisets;
   - both versus independently derived expected charges;
   - note/payment/receivable totals versus the expected financial treatment for those same encounters.
6. Inject same-price code swaps, quantity reallocations preserving totals, missing/duplicate tax rows, and missing/misassigned notes.
7. Verify protected non-sample state and reject incomplete encounter coverage.

The ledger still shares codes and quantities with adapter-populated source tables. Rebuilding it faithfully repairs consistency; it does not create independent source truth.

### Disposition of the v6 E2E and safety findings

- **Current XML targeting:** fixed and exercised.
- **Selected timeout/SIGTERM recovery and rollback:** retained, demonstrated strengths.
- **Controlled mismatch detection:** retained strength.
- **Write provenance:** substantially resolved for the audited path.
- **Matched B–C reconciliation:** still open.
- **Aggregate-preserving line reallocations:** still open; component quantity sums are not line identity.
- **Non-DR/cohort preservation:** still open; builder DELETE scope is concretely wrong.
- **Financial edge coverage:** still open.
- **Original exact restoration acceptance:** still substituted by intermediate restore plus rebilling.
- **Historical clone contamination:** explicitly disclosed, not repaired.

**E2E-design: 7/10 — up from 6, for a real form-written billing endpoint, not for completed independent financial validation.**

## EXTERNAL-VALIDITY

### P7 changes internal validity, not the external evidence envelope

There is no new evidence for:

- another hospital;
- another Khanza configuration;
- inpatient billing;
- payer/insurance variation;
- clinically calibrated encounter content;
- representative operational performance;
- another HMS.

C1–C4 remain untested. The external-validity score should not increase because recovery code, audit triggers, or ledger consistency improved.

### Edge execution is still not edge financial validation

The current evidence distinguishes these correctly when read carefully:

- **More than two procedures:** the form executes, but the oracle marks encounters OOE. One supplied CSV row shows 11 baseline versus 6 real value rows. Classification prevents a false in-envelope pass; it does not establish correctness for that stratum.
- **Embalase/tuslah:** authored charges produced no observable bill difference. That demonstrates behavior of this configuration, not correct handling across configurations.
- **ZEROFEE/HALFPPN:** remain financially unvalidated through the required consumer-to-form workflow.

The integer-rule comparison over 70,056 subtotals is useful arithmetic coverage of the existing corpus. It is not proof that boundary cases were authored and exercised through the form.

### The rule-of-three claim remains overstated

The arithmetic is:

\[
3/999=0.003003=0.3003\%
\]

But a numerical rule-of-three calculation does not automatically yield a population bound. It requires an appropriate sampling model, valid independent observations, and a trustworthy measurement endpoint. The 999 sample is stratified, includes historical visits, and uses a pre-R5 oracle whose exact interpretation is explicitly unresolved.

Likewise:

\[
4/216=1.85185\%
\]

is numerically correct, but the four original comparisons were invalidated by baseline contamination. Neither figure supports an unconditional B3 population-correctness bound.

The throughput bridge remains reasonable:

\[
47.8\times60/86{,}101\approx33.31\text{ ms/visit}
\]

and:

\[
999/(8{,}393/60)\approx7.14\text{ GUI visits/min}
\]

Those are different execution surfaces, not interchangeable measures of hospital workflow capacity.

The revenue bridge also reconciles:

\[
34{,}727{,}295{,}800+142{,}947{,}833
=34{,}870{,}243{,}633
\]

Correct arithmetic supports accounting consistency; it does not supply missing representativeness.

### Scoping honesty: better, but still inconsistent

The paper-safe boundary in §13 is appropriate. P7 explicitly defers difficult recovery work and historical revalidation, which deserves credit.

However, the report still contains incompatible current-facing claims:

- §16 says B-settlement equivalence is “structurally unclaimable.”
- §18 withdraws that explanation.
- A11 claims every restoration verified while A15 demonstrates otherwise.
- The oracle emits `crash_safe=YES` unconditionally.
- The manifest implies third-party reproducibility without the live box despite missing fixture/runtime closure.
- The population-bound wording remains.

The owner has become better at documenting limitations, but is still appending corrections rather than maintaining one coherent acceptance contract.

**Top external risk:** mistaking synthetic execution and internal agreement for representative hospital financial correctness. Shared input assumptions, narrow payer coverage, and uncalibrated clinical content can produce excellent agreement on an unrealistic workload.

### Final six-criterion assessment

The requested five sections cover five criteria. Claim-honesty remains the sixth equally weighted criterion.

| Criterion | v6 | v7 | Delta |
|---|---:|---:|---:|
| Claim-honesty | 6 | **6** | 0 |
| Gate-correctness | 5 | **6** | +1 |
| Oracle-validity | 5 | **6** | +1 |
| Reproducibility | 5 | **6** | +1 |
| E2E-design | 6 | **7** | +1 |
| External-validity | 4 | **4** | 0 |

\[
\operatorname{round}\left(\frac{6+6+6+6+7+4}{6}\times10\right)
=\boxed{58/100}
\]

History: **35 → 43 → 43 → 52 → 58**.

**Verdict: Needs targeted rework. P7 delivered meaningful fixes, but its blanket PASS is not justified against its own rubric.**

The top three remaining issues are:

1. **Recovery and protection:** structured corrupt-hash handling, surviving-writer death proof, interrupted restoration, retryable failures, and preservation of failed-run evidence.
2. **Acceptance integrity:** test the actual terminal/wrapper failure path; replace A11; enforce checksum validity, tax cardinality, target binding, and cleanup outcomes.
3. **Independent E2E lineage:** freshly attributable consumer baselines and matched-encounter billing/settlement/ledger reconciliation.

The strongest properties to lead with are now **audited form-written billing**, **controlled mismatch and bounded recovery/rollback demonstrations**, and **whole-ledger reproduction from the current source state**. Lead with those—not “crash-safe,” “every restore verified,” or population correctness.

**External-validity: 4/10 — unchanged.**
