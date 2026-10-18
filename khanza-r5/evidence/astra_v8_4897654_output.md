# Astra v8 assessment: dr-khanza-e2e-full-assessment (post P1-P8) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

**P8 is a substantive engineering improvement, not a completed recovery acceptance contract.** The tax tests and recovery injections are real. Several of their advertised guarantees are still stronger than their assertions.

This is a review of the embedded source and execution records—not an independent execution. A matching printed hash is evidence of the reported comparison, not a hash I independently recomputed from the database.

### What is genuinely supported

- **Corrupt recovery metadata:** A18a exercises malformed JSON and records structured rejection rather than a traceback.
- **Wrong recovery digest:** A18b exercises a syntactically valid but incorrect digest and records a mismatch.
- **Surviving harness processes:** A19 records `killed_exit=137 java_after_kill=3`, followed by group termination, a quiet check, verified restoration and successful rebilling.
- **Interrupted restoration:** A20 actually reaches the restore pause, kills that process, and successfully restores on the next invocation.
- **Explicit retry:** A21 demonstrates the ordinary sequence: timeout → FAILED → plain resume remains unsuccessful → flagged retry succeeds.
- **Tax cardinality and positive-tax amount defects:** A10d demonstrates both planted failures.
- **Registered non-DR preservation:** A10e demonstrates preservation in October and ALL rebuilds.
- **Same-box ledger reproduction:** the P8 builder produces the reported canonical serialization hash.
- **Scope disclosure:** §19 explicitly leaves packs D/E, overlap isolation, historical revalidation and C1–C4 open.

Removing the unconditional `crash_safe=YES` field is a genuine correction. It is not merely a footnote added underneath the same output.

### The counts reconcile—but do not establish every label

There are **29 check rows**: the previous 21 plus:

`A10d, A10e, A17, A18a, A18b, A19, A20, A21`.

Thus \(21+8=29\), and the transcript reports all 29 passing predicates.

The reported **nine verified restorations** are consistent with:

- A4, A4b resume, A8 resume: 3;
- A15, A18a and A18b cleanup restores: 3;
- A19 resume, A20 final resume, A21 initial timeout: 3.

The three intentional rejected restorations are A15, A18a and A18b. The retry in A21 does **not** provide another fresh restore verification: it trusts the stored `restored=True` flag.

The unit result is also numerically consistent: **seven metadata cases, three writer-decision cases, and one final PID-file existence check = 11 assertions**. These are not eleven independent integration fault modes.

### Remaining overclaims

**1. A11 still says “every restore” without enforcing every restore.**

Its predicate is:

```bash
[ "$RM_OTH" = "0" ] &&
[ "$UV_OTH" = "0" ] &&
[ "$RV_ALL" -ge 1 ] &&
[ "$DELIB" = "3" ] &&
[ "$DF_ALL" = "0" ]
```

It still ignores `STAGE-RESTORE-ERROR`, does not count restore attempts, and does not match each attempt to a verified outcome. Moreover, `RV_ALL` reads **all** logs, not just `OTHER_LOGS`.

The deliberate exceptions are now handled better. The universal claim is still not established.

**2. The false restored-state message survives unchanged.**

A15 prints:

> `STAGE-RESTORE-UNVERIFIED ... data re-applied but NOT verified`

followed by:

> `FAILED (harness rc=-1) — pre-reset state restored`

The source emits that latter message regardless of `restored`. The generated report similarly labels FAILED batches “restored from stage backup” without conditioning that wording on the result.

**3. “Retry only from a hash-verified state” is stronger than the implementation.**

The retry path checks a historical boolean, not necessarily the current state. That is a new P8 claim defect, examined below.

**4. “Live untouched” remains too absolute.**

A13 demonstrates equal before/after values for the ledger and six output-table checksums. It does not demonstrate absence of transient writes, preservation of every live table, or successful cleanup after the measurement. The empty-equals-empty checksum weakness also remains.

**5. Reproducibility wording still contradicts §19.**

The manifest still says:

> “every runtime component is pinned … re-derivable without the original live box”

and:

> “raw 12-month DB images are too large to pin by hash”

Both are indefensible. Required artifacts remain missing, and size does not prevent hashing.

**6. Other v7 wording findings remain open.**

- The oracle docstring still says the harness targets its database through `database.ini`.
- It still claims `verify_frozen` checks a source-content hash; the function does not.
- R5 §12 retains the obsolete B-settlement “out of scope (subset)” explanation.
- §18 still calls the audited 17 billing rows “17 value rows” without showing the value-row filter.
- §13 retains the population-flavored “B3 bound ~0.3%.”
- A14 is still advertised as the suite exit-path proof, although it tests a separate early-exit branch.

The UTC+7 explanation resolves the apparent date mismatch: **October 17, 22:58 UTC is October 18, 05:58 local**. It does not independently prove the task was written before execution.

### Arithmetic retained from v7

The reported figures reconcile:

\[
86{,}455+86{,}455+113{,}389+70{,}056=356{,}355
\]

\[
25\times29{,}832=745{,}800
\]

\[
34{,}870{,}243{,}633-34{,}727{,}295{,}800=142{,}947{,}833
\]

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633=24{,}884{,}947.
\]

These are consistent aggregates, not independent financial validation.

**Claim-honesty score: 6/10 — unchanged.** The disclosures improve substantially, but the rewritten acceptance language still promises properties its predicates do not enforce.

## GATE-CORRECTNESS

### Disposition of each new check

| Check | Can it fail for the advertised violation? | Assessment |
|---|---|---|
| **A10d** | Yes, for the planted duplicate and wrong positive-tax amount. | Genuine improvement. It requires cardinality defect count 1 and tax-tool exit 1; the transcript supplies both. It prints, but does not assert, `DUPBAD=0`. |
| **A10e** | Yes, if the registered non-DR sentinel disappears. | Genuine narrow preservation test. It checks row count, not full row content or all protected rows. |
| **A17** | Yes, if either named live fixture is accepted. | Genuine guard, before DB access in this script. Not comprehensive target enforcement. |
| **A18a** | Yes, for the injected truncated JSON path. | Requires the unreadable marker, exit 4, no traceback, `restored=False`, keep marker and successful cleanup. |
| **A18b** | Yes, for the injected wrong digest. | Same strengths for the mismatch path. |
| **A19** | Yes, if the ordinary surviving harness is not killed or recovery fails. | Demonstrates the exercised group termination. Does not independently establish all writers dead before restore. |
| **A20** | Yes, if the pause is not reached, SIGKILL is not observed, or subsequent restore/rebill fails. | Good bounded interruption test. Does not test interruption inside an executing SQL statement. |
| **A21** | Yes, if the demonstrated retry-control sequence breaks. | Does **not** test rejection of a retry from a changed or unverifiable current state. |

### Tax: the cardinality repair works, but the standalone checker remains incomplete

The new suite query enforces:

```sql
x.nt <> IF(x.et > 0, 1, 0)
```

That closes the duplicate-correct-amount hole, including a stray tax row when the expected tax is zero.

The planted example is decisive:

> `subtotal=103752 tax_rows=2 tax_sum=22826`  
> `dup: count_query=1 amount_query=0 tax_check_exit=1`

The arithmetic is correct:

\[
(103{,}752\times11+50)\operatorname{DIV}100=11{,}413,
\quad 2\times11{,}413=22{,}826.
\]

However, `p7_tax_rule_check.py` can still return zero on defects:

1. **A single zero-valued tax row when expected tax is zero.**  
   `n_tax == 1` and `stored == java == 0` triggers nothing, although the suite’s contract requires zero rows.

2. **An orphan tax row with no drug row.**  
   Its query starts from grouped drug rows; orphan taxes never enter the result.

3. **An empty ledger.**  
   Zero input rows produce zero defects and PASS.

The tool now fails on the defects it counts. It is not a complete ledger-tax invariant checker.

### Builder DELETE: improved, but not equal to insertion scope

The critical expression is:

```python
... "AND (rp.no_rawat IS NULL OR " + (cp % ()) + ")"
```

For every window:

- DR rebuild: deletes registered DR rows **and unregistered ledger rows**.
- ALL-cohort rebuild: deletes all in-window ledger rows, including unregistered rows.
- Inserts: require a matching `reg_periksa` row.

Therefore **DELETE scope is not identical to INSERT scope**. The source explicitly adds orphan cleanup; the report should say so.

A10e proves preservation only where a non-DR registration exists. It says nothing about an unregistered row whose ownership is unknown. If that preservation matters, encode ledger ownership rather than assuming every orphan is disposable.

The cross-charset performance defect is credibly disclosed and the corrected join is present. The transcript supports a **26-second whole ALL rebuild**, not an independently measured 0.07-second DELETE or `eq_ref` plan; those latter figures are report-only here.

### A11 and cleanup remain acceptance holes

A non-deliberate `STAGE-RESTORE-UNVERIFIED` in a readable, included log makes A11 fail. That specific improvement is real.

But an unsuccessful restoration returning:

```python
log("STAGE-RESTORE-ERROR ...")
return False
```

is invisible to A11.

A15 cleanup still does:

```python
o.stage_restore(...)
print('stage_drop', o.stage_drop(...))
```

It ignores the restoration result and drops recovery tables anyway. Putting the hash back improves the observed run, but does not repair this control-flow defect.

The new `restore_kept()` also drops unconditionally. A18 subsequently detects `restore_verified False`, but by then it may already have destroyed the recovery copy. **Detecting failure after deleting the evidence is not fail-closed recovery.**

### Live protection is still not end-to-end

A17 closes `FX=sik` and `FX=sik_bench` in the suite. The oracle still only checks:

```python
if db == "sik" and not (... or args.allow_live):
```

It never checks the JVM’s actual XML target. A direct invocation with `--db-name clone` and XML pointing at `sik` remains unsafe.

Other retained hazards:

- global XML retargeting without cross-run isolation;
- global `pkill -f BilingHarness`;
- cleanup restores XML **before** terminating remaining harnesses;
- A13 uses unvalidated pipeline output without `pipefail`;
- wrapper teardown failures do not override a successful suite status.

### New P8 acceptance defects

The separate builder-check script reintroduces the original success-exit disease:

```bash
[ "$L" = "$S" ] && echo "...REPRODUCES..." || echo "DIFFERS"
...
echo "dbs: ..."
```

It prints a builder failure or hash difference and can still exit zero. Two failed hash reads can also compare equal. The embedded matching result is useful positive evidence; **the check itself is not a failing acceptance gate**.

A14 remains unchanged:

```bash
if [ -n "${P7_EXIT_TEST:-}" ]; then
    ...
    [ "$FAIL" = "0" ] && exit 0 || exit 1
fi
```

Reverting the production terminal exit to unconditional success would still leave A14 green. The normal suite ending and wrapper propagation are correct by inspection, but an actual failing suite → wrapper demonstration remains absent.

**Gate-correctness score: 6/10 — unchanged.** Several concrete gates improve; the acceptance framework still contains false-positive paths and destructive cleanup after failed verification.

## ORACLE-VALIDITY

### A18: genuinely repaired metadata handling, with a narrower safety meaning

`stage_restore()` now validates:

- readable JSON;
- matching prefix;
- matching visit set;
- a 64-character lowercase hexadecimal digest.

A18a/A18b and the mocked cases substantiate those branches.

But validation happens **after DELETE/REPLACE restoration**. A foreign or corrupt metadata file does not prevent mutation; it prevents that mutation from being accepted as verified.

That distinction matters. These tests establish:

> “Unverifiable restoration is rejected and reported.”

They do not establish:

> “Untrusted recovery material is rejected before modifying the target.”

Also, `_content_hash()` is outside the SQL restoration exception handler. A failure during post-restore hashing can still raise an exception rather than produce the structured restore-failure outcome.

### A19: good evidence of this kill; not a sound general writer-death proof

Credit the actual result:

> `groups_checked=1 killed=['448791:dead'] harness_writers=0 quiet=true`

Together with three matched processes surviving the oracle kill and zero afterward, this supports termination of the exercised harness process group.

The generalized proof remains unsound for several reasons.

**1. Process matching is a heuristic, not ownership.**

```python
if "BilingHarness" not in " ".join(argv) or \
        not want & set(" ".join(argv).split()):
    continue
```

This misses writers that do not retain that command line, use another executable, or are inaccessible in `/proc`. Inspection errors are silently skipped.

Conversely, it can kill another run’s harness naming the same visit on another database. There is no DB or run identity in the match.

**2. Recorded PGIDs have no process-generation identity.**

A stored integer is not proof that a later process group belongs to this run. PID/PGID reuse can make recovery signal an unrelated group.

**3. The quiet interval is two observations, not continuous quiescence.**

```python
h1 = _content_hash(...)
time.sleep(qs)
quiet = h1 == _content_hash(...)
```

An idle writer can resume afterward. Changes can occur and revert between observations. Processes are not rescanned after the interval.

`R5_WRITER_QUIET_S` can also reduce the interval to zero without changing the success label.

**4. FAILED batches are excluded from the quiet check.**

```python
if b.get("status") in ("STAGED", "RESET")
```

A FAILED batch awaiting `--retry-failed` can therefore be restored without this output-stability check.

**5. Client death is not server-side operation fencing.**

The code does not establish that the writer’s MySQL work has finished, rolled back or been terminated. Nor does it fence new writes during restoration.

These are residual engineering risks, not proof that the recorded A19 run was unsafe. The proper conclusion is **bounded recovery demonstrated, comprehensive writer exclusion not established**.

### The unit test does not prove the whole fail-closed path

It usefully verifies `reap_writers()` returns False on an unkillable mocked group and changing mocked output.

It does not test that `main()` makes **zero restoration calls** after that result. Source inspection supports the immediate return, but integration proof is absent.

The final assertion:

> `pid file removed only after the proof`

checks only that the file is absent after the successful call. If an earlier failing call deleted it, this assertion could still pass. Check existence immediately after each failed call.

### A20: real restartability at one carefully selected point

The test pauses after the `billing` restore, with **11 output tables pending**, then kills and resumes. The later verified restore is meaningful evidence.

Two limits:

- It is after **one of twelve output tables**, not literally halfway through all restoration work; registration status is also pending.
- It pauses **between completed SQL calls**. Killing the Python parent while a spawned mysql client is executing SQL is a different case. Such a child is not included in `_harness_writers()`.

The implementation redoes restoration based on state; it does not first demonstrate detection of partial restoration by a hash mismatch as the task wording suggested. Reapplying and verifying is acceptable for the exercised case—just describe the actual mechanism.

### A21: newly introduced stale-verification shortcut

The implementation says:

```python
if b.get("restored") is not True:
    if not stage_restore(...):
        ...
```

If `restored=True`, no current output hash is checked. `_finalize()` may already have dropped the stage tables. A later invocation trusts that historical flag and logs:

> `pre-reset state verified -> re-billing`

A21 never changes output between attempts and never tests `--retry-failed` with unverifiable recovery state. It therefore cannot expose this defect.

A genuine retry precondition needs a persisted, batch-specific digest compared with the current output immediately before retry—or a newly verified restore from retained recovery material.

### Ranked residual oracle risks

1. **Writer isolation/fencing is not established**, including FAILED retry paths.
2. **Retry trusts historical verification instead of current state.**
3. **Recovery metadata and staging are not robust across broader sequences.** The hash filename is per run/stage, not per date, and gets overwritten by later backups. A plain resume skips FAILED batches and can process later pending dates, potentially replacing metadata needed by an earlier unrestored batch.
4. **Frozen-baseline lineage remains incomplete.** `verify_frozen()` never compares `source_content_hash`; that helper also omits the consequential `biaya_obat` field.
5. **Successful runs retain form output rather than restore exact initial fixture state.** Disposable teardown is not evidence of exact restoration or protected non-sample preservation.

The oracle is fit for **the demonstrated, isolated single-batch fault experiments**, not the broader recovery guarantee suggested by some labels.

**Oracle-validity score: 7/10 — up from 6.** Corrupt-metadata, surviving-child and interrupted-restore demonstrations earn real credit, despite the remaining proof gaps.

## REPRODUCIBILITY

### What improved—and what was already strong

The current tool prefixes agree across the manifest and reported run:

- oracle `2aa3ef22…`;
- builder `736506c3…`;
- dbutil `f85958b4…`.

The builder output reports:

```text
live    356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7
scratch 356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7
```

That is strong **same-box content reproduction evidence** for the current integer-tax, Decimal-rounding builder.

“Byte-identical” should mean identical canonical serialized row content, not identical database files, physical layout or independent correctness.

Archiving earlier run directories is a real improvement over deleting them. The transcript reports 73 archived entries. However, the script suppresses `mv` failures and checks neither an expected inventory nor archive checksums.

### Ranked third-party blockers

**1. No immutable, reconstructible fixture.**

The wrapper does:

```bash
mysqldump ... sik | mysql ... sik_p6f
```

This is a fresh copy of current mutable live state. It is not a pinned fixture release.

There is no supplied complete fixture image, source snapshot hash, or deterministic provisioning path for the full reference data needed by the form.

**2. Missing executable dependencies and lineage.**

`p6_dbxml.py` imports unavailable `stagea_common.py`. The package also lacks the Java harness and consumer sources/classes needed to inspect and reproduce the claimed execution lineage, plus STRATA SQL.

The manifest’s list of Python and shell hashes does not close that dependency graph. Referencing a path on the VPS is not distribution.

**3. Provisioning and runtime closure are incomplete.**

The scripts assume:

- root mysql access;
- a particular benchmark account and password-file location;
- `/opt/simrs-khanza` and `/opt/Deers-Rock`;
- particular Java dependencies and encrypted XML tooling;
- Xvfb and faketime;
- existing grants, schema and operational configuration.

Do not publish production secrets. Publish parameterized provisioning and generate disposable credentials.

Version labels are useful but not a complete runtime lock: dependency artifacts, configuration, build procedures and startup pin enforcement remain missing.

**4. The wrapper is not failure-preserving.**

Its teardown says:

```bash
[ "${BUILT:-0}" = "1" ] && SQL "DROP DATABASE IF EXISTS $FX;"
```

That runs on failure too. Any stage tables intentionally preserved by the oracle disappear with the fixture. Filesystem logs do not replace the recovery database.

The wrapper also lacks `pipefail` on dump/import and does not propagate teardown failure into its final status.

**5. The new reproduction check does not enforce reproduction.**

As discussed above, `p8_builder_all_check.sh` can print `DIFFERS` and exit successfully. It must validate builder status, validate both hash results, compare against the pinned digest, and exit nonzero on failure.

### v7 reproducibility findings: disposition

| Finding | P8 disposition |
|---|---|
| Deterministic whole-ledger rebuild | Retained and reproduced with current builder |
| Mutable live-derived fixture | Still open |
| Missing `stagea_common.py`, Java and STRATA artifacts | Explicitly deferred; still open |
| Runtime/startup closure | Still open |
| Destruction of prior result directories | Improved in code and reported run |
| Preservation of failed fixture/recovery state | Still open |
| Cross-machine reproduction | Not run |
| Historical executable/baseline lineage | Not closed |

The supplied acceptance transcript also omits the wrapper’s own `fixture ...`, `suite exit=...` and teardown output. §19 attributes the run to the wrapper, and the wrapper source is available; that is weaker than an embedded complete wrapper transcript, especially for its failure path.

**Reproducibility score: 6/10 — unchanged.** Better records and another deterministic rebuild do not substitute for the missing fixture and executable release.

## E2E-DESIGN

### Fair claim now

A defensible claim is:

> On one configured Khanza installation, selected synthetic outpatient encounters can be reset and billed through the real form; their resulting value-row multisets can be compared with frozen pre-run billing. Controlled mutations and selected process interruptions are detected or recovered in the demonstrated cases.

The P7 audit materially supports **form-path writes to `billing`**, not merely note creation. P8 does not invalidate that strength.

But “frozen pre-run billing” is not automatically “fresh, attributable consumer output.” Later suite checks repeatedly freeze output left by earlier form runs. They remain useful recovery tests, but are not independent fresh-consumer equivalence experiments.

### The weakest financial leg remains B–C reconciliation

`count_form_save()` sets verification when **any** paid or credit row exists:

```python
return by, (has_paid or has_piut)
```

The comparison then uses:

```python
if b_amt != c_amt:
```

It does not require:

- equal encounter sets;
- complete form-save coverage;
- per-encounter agreement;
- note uniqueness;
- matching component or line-level quantities;
- demonstrated handling of combined payment/credit cases.

`c_rows_visit` is computed and unused.

The reported live result is therefore correctly unsuccessful:

> A == C: **31,750 rows / Rp 3,113,533,580**  
> B: **151 notes / Rp 49,903,019**, exit 1.

That B amount is approximately **1.603%** of C’s amount. It is not an encounter-coverage estimate, and calling it a “verified subset” does not reconcile it against C for that subset.

The unchanged design can even pass with incomplete B coverage if the amounts happen to aggregate to the full C amount. Presence plus total equality is not coverage.

### Independence remains limited

The ledger is separate from billing output, which is good. However:

- quantities and codes come from shared source tables;
- tariffs were adopted from the configured bundle rather than independently clinically validated;
- individual missing tariffs can fall back to source values;
- aggregate quantity checks miss quantity-preserving reallocations and same-price code substitutions.

The charge-delta source still claims a quantity reallocation between codes “still shifts” the component total. That is false when the reallocation preserves the total.

The oracle’s billing comparison also converts monetary values through binary floats rounded to two decimals. P8 corrected selected builder/payment sites, not the entire financial comparison stack.

### What fixes the weakest leg

Use one explicit encounter manifest and reconcile:

1. Independently specified expected charges.
2. Fresh pinned consumer output.
3. Fresh audited form output.
4. Payment and credit output for **those same encounters**.

Assert set equality and per-encounter financial identities before aggregate totals. Add adversarial cases that preserve totals while changing code, quantity allocation or note coverage.

The historical R4 0/999 sample needs a separate lineage re-examination; neither the one-visit audit nor the P8 recovery suite rehabilitates it.

### Disposition of v7’s top-three issues and next step

- **Recovery/state protection:** materially advanced, not closed.
- **Acceptance integrity:** tax checks improve; A11, A14, retry verification, cleanup and preservation remain incomplete.
- **Independent E2E lineage:** substantially unchanged and explicitly deferred.

The v7 single next step is therefore **partially delivered**: the requested injections were run, but not on an immutable fixture, without comprehensive protected-state checks, without an actual failing-wrapper demonstration, and without retained failed recovery databases.

**Next step:** finish that recovery acceptance contract before expanding claims: use a pinned fixture, fence writers, revalidate current retry state, test a real wrapper failure, and retain the failed fixture plus recovery artifacts. Assert protected sample and non-sample hashes throughout.

**E2E-design score: 7/10 — unchanged.**

## EXTERNAL-VALIDITY

### Scope honesty is better than external evidence

The paper-safe boundary in §13 is appropriate:

> “does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

§19 accurately says C1–C4 remain untested. P8 adds recovery assurance within the same environment, not evidence of external validity.

The remaining surface is narrow:

- one Khanza/MySQL configuration;
- synthetic outpatient data;
- uncalibrated diagnosis and drug distributions;
- unexercised payer mix;
- no representative facility comparison;
- no second-HMS validation;
- no independent pharmacist/clinical validation;
- limited observable financial edge behavior.

The embalase/tuslah experiments are especially important to interpret correctly: **the form produced no observable fee difference in this configuration**. That is a useful configuration-specific finding, not proof that these charges are correctly handled generally. Zero-fee and half-PPN cases remain unretested in the required populated, consumer-baselined form.

### The statistical wording still needs removal

Numerically:

\[
4/216=1.85185\%, \qquad 3/999=0.30030\%.
\]

The second number is the familiar approximate rule-of-three limit under suitable sampling assumptions. Those assumptions are not established for this selected, stratified, historically qualified sample.

Consequently, **“B3 bound ~0.3%” is not a supported population claim**. Repairing recovery logic does nothing to repair that inference.

Similarly, the measured throughput distinction remains essential:

- \(86{,}101/47.8\approx1{,}801\) consumer visits/minute;
- \(999\times60/8{,}393\approx7.14\) real-form visits/minute.

The approximately 250-fold difference reflects different execution paths. It is not evidence that ordinary hospital GUI billing operates at the consumer’s rate.

### Top external risk

**Synthetic internal agreement will be presented as representative hospital financial correctness.**

A consumer, builder and form can agree within the same configured synthetic system while omitting payer rules, meaningful clinical distributions, discounts, credit workflows or financially consequential edge conditions.

The highest-value external work is a licensed or anonymized facility comparison plus clinically reviewed, independently priced encounter cases—not another recovery test or a larger synthetic throughput run.

### Overall v8 assessment

| Criterion | v7 | v8 |
|---|---:|---:|
| Claim-honesty | 6 | **6** |
| Gate-correctness | 6 | **6** |
| Oracle-validity | 6 | **7** |
| Reproducibility | 6 | **6** |
| E2E-design | 7 | **7** |
| External-validity | 4 | **4** |

\[
\operatorname{round}\left(\frac{6+6+7+6+7+4}{60}\times100\right)
=\boxed{60/100}.
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60.**

**Verdict: Needs targeted rework.** P8 earns credit for real fault injections and concrete repairs. It does not earn closure for “every restore,” verified-current-state retry, immutable fixtures, failed-evidence preservation or independent financial correctness. The modest score increase reflects those unresolved acceptance defects—not a dismissal of the engineering work.

**External-validity score: 4/10 — unchanged.**

## VERDICT

## Overall verdict

**60/100 — Needs targeted rework.**

P8 materially strengthens the evidence for **bounded recovery experiments**, but does not establish the broader guarantees claimed for recovery, retry, live protection or reproducibility. The gain over v7 is therefore narrow but genuine: **oracle validity improves; the other five scores remain unchanged.**

This synthesis treats the supplied assessments’ code excerpts and asserted runs as the evidence base; it does not imply a new independent execution.

## Criterion scores and historical deltas

Deltas are ordered against **4701365 / 4769794 / 4795743 / 4818826 / v7 (4880158+4894730)**.

| Criterion | Score | Prior scores | Deltas |
|---|---:|---|---|
| Claim-honesty | **6/10** | 4 / 5 / 5 / 6 / 6 | **+2 / +1 / +1 / 0 / 0** |
| Gate-correctness | **6/10** | 3 / 3 / 3 / 5 / 6 | **+3 / +3 / +3 / +1 / 0** |
| Oracle-validity | **7/10** | 4 / 4 / 3 / 5 / 6 | **+3 / +3 / +4 / +2 / +1** |
| Reproducibility | **6/10** | 3 / 5 / 6 / 5 / 6 | **+3 / +1 / 0 / +1 / 0** |
| E2E-design | **7/10** | 4 / 5 / 5 / 6 / 7 | **+3 / +2 / +2 / +1 / 0** |
| External-validity | **4/10** | 3 / 4 / 4 / 4 / 4 | **+1 / 0 / 0 / 0 / 0** |

### Claim-honesty
**Justification:** A15 prints `"STAGE-RESTORE-UNVERIFIED ... data re-applied but NOT verified"` followed by `"FAILED (harness rc=-1) — pre-reset state restored"`, demonstrating that the improved disclosures still coexist with unsupported success wording.  
**Biggest remaining risk:** Readers will interpret historical verification, measured before/after equality and synthetic agreement as stronger recovery, non-interference and financial-correctness guarantees than the implementation establishes.

### Gate-correctness
**Justification:** A11 now rejects included, non-deliberate `"STAGE-RESTORE-UNVERIFIED"` events, but misses `"STAGE-RESTORE-ERROR"`, while `restore_kept()` can delete recovery tables before A18 detects `restore_verified False`.  
**Biggest remaining risk:** A run can appear acceptable—or destroy its recovery material—despite failed restoration, failed reproduction or unsuccessful cleanup.

### Oracle-validity
**Justification:** The assessment credits “corrupt-metadata, surviving-child and interrupted-restore demonstrations,” but retry still uses `if b.get("restored") is not True:` rather than necessarily verifying current state.  
**Biggest remaining risk:** An unfenced writer or intervening mutation can invalidate a previously verified state before retry, with insufficient batch-specific recovery metadata remaining.

### Reproducibility
**Justification:** A deterministic whole-ledger rebuild was reproduced, but the release still lacks dependencies including `"stagea_common.py, Java and STRATA artifacts"` and has not demonstrated cross-machine reproduction.  
**Biggest remaining risk:** An independent reviewer cannot reconstruct the experiment from distributed, immutable inputs and executable artifacts without access to the original operational environment.

### E2E-design
**Justification:** The ledger is separate from billing output, but the assessment’s finding that “Presence plus total equality is not coverage” captures the unresolved mismatch between payment coverage and the encounters used for charge comparison.  
**Biggest remaining risk:** Shared inputs and aggregate agreement can conceal missing encounters, same-price code substitutions or quantity-preserving reallocations.

### External-validity
**Justification:** The report retains `"B3 bound ~0.3%"` without established sampling assumptions, while the observed form result is explicitly “no observable fee difference in this configuration.”  
**Biggest remaining risk:** Configuration-specific synthetic results will be presented as representative hospital financial correctness or ordinary GUI throughput.

## 1. Disposition of v7 findings

### Genuinely fixed or demonstrated—within a bounded scope

Under the requested **code plus asserted-run** standard, the supplied assessments support these conclusions:

- **Protection against overwriting prior result directories:** improved in code and demonstrated in a reported run.
- **Suite-level rejection of protected fixture names:** A17 demonstrates closure for `FX=sik` and `FX=sik_bench`; this does **not** close direct-oracle or actual JVM-target protection.
- **Specific recovery fault cases now have substantive evidence:** corrupt metadata, a surviving harness child and an interruption between completed restore SQL calls were exercised against the revised implementation. These close particular test gaps, not the general recovery guarantee.
- **Deterministic whole-ledger rebuilding remains demonstrated:** the current builder reproduced the matching result. This is a retained strength, **not a newly closed immutable-fixture or reproducibility finding**.

The narrower A11 improvement is real in code, but the supplied excerpt does not establish a separate asserted negative run proving that gate rejects the relevant failure; it should not receive broader closure credit.

### Merely claimed, or asserted more broadly than demonstrated

- **“Retry only from a hash-verified state”:** the historical `restored=True` flag is insufficient.
- **“Pre-reset state restored” / “restored from stage backup”:** emitted without conditioning the claim on successful verification.
- **A14 as production suite-exit proof:** it exercises a separate early-exit branch.
- **“Every runtime component is pinned” and reconstruction without the original box:** contradicted by missing dependencies and provisioning.
- **“Live untouched”:** before/after checksums demonstrate only the measured equality, not absence of transient writes or protection of all live state.
- **Frozen source-content verification:** claimed by documentation but not performed by `verify_frozen()`.

### Still open

Writer fencing; actual JVM-target validation; safe cleanup and failed-fixture preservation; batch-specific recovery metadata; immutable fixture distribution; executable/runtime closure; cross-machine reproduction; historical baseline lineage; same-encounter financial reconciliation; populated zero-fee and half-PPN cases; and defensible external/statistical claims.

**The v7 next step was partially delivered, not completed.**

## 2. New problems P8 introduced or exposed

1. **Stale verification on retry.** A21 can trust `restored=True` after outputs change or recovery tables disappear, yet log `"pre-reset state verified -> re-billing"`.
2. **A non-enforcing reproduction check.** `p8_builder_all_check.sh` can print `"DIFFERS"` and still exit zero; two failed hash reads can also compare equal.
3. **Destructive cleanup before failure handling.** The new `restore_kept()` drops recovery tables unconditionally; subsequent detection cannot recover the deleted copy.
4. **Broader recovery sequences remain unsafe or unproven.** Per-run/stage hash metadata can be overwritten by later backups, while plain resume can skip FAILED batches and advance to later dates.
5. **The interruption experiment exposes an important boundary.** Killing the parent between completed SQL calls does not establish safety when a spawned mysql client is still executing a restore statement.

## 3. Top three remaining issues

1. **Fail-closed recovery and acceptance integrity:** fence writers, verify current retry state, preserve recovery material, and propagate real failures through the suite and wrapper.
2. **Immutable, independently runnable experiment:** distribute the fixture and complete dependency/provisioning closure, then reproduce from a clean environment.
3. **Independent encounter-level financial validation:** use identical encounter sets across expected charges, consumer, form, payments and credits, with per-encounter assertions before aggregation.

## 4. Top three strongest properties to lead with

1. **Concrete recovery fault-injection evidence**, explicitly limited to the scenarios exercised.
2. **A separate ledger and deterministic whole-ledger rebuild**, with internally reconciling aggregates.
3. **A multi-path E2E comparison architecture**, distinguishing consumer, real-form and settlement behavior rather than treating one implementation’s output as sufficient.

These are credible engineering contributions without claiming general hospital correctness.

## 5. Overall score and historical comparison

\[
\operatorname{round}\left((6+6+7+6+7+4)\times\frac{10}{6}\right)
=\boxed{60/100}.
\]

| Assessment | Score | Current delta |
|---|---:|---:|
| Run 4701365 | 35 | **+25** |
| Run 4769794 | 43 | **+17** |
| Run 4795743 | 43 | **+17** |
| Run 4818826 | 52 | **+8** |
| v7: runs 4880158+4894730 | 58 | **+2** |

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60.**

## 6. Verdict

**Needs targeted rework.**

P8 is stronger than v7, but recovery and acceptance defects still prevent trusting some PASS conditions and recovery claims. Reproducibility and independent financial lineage also remain material submission gaps.

## 7. Single most important next step

**Complete one pinned-fixture, production-wrapper recovery acceptance experiment that deliberately invalidates a previously verified state before retry.**

Fence writers; require a current, batch-specific digest or newly verified restore; assert protected sample and non-sample hashes; force a real suite failure through the normal terminal path; and demonstrate a nonzero wrapper exit **with the failed fixture and recovery artifacts retained**. This would directly test the central remaining weakness: whether failure is both detected and safely preserved, rather than merely reported afterward.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

**P8 is a substantive engineering improvement, not a completed recovery acceptance contract.** The tax tests and recovery injections are real. Several of their advertised guarantees are still stronger than their assertions.

This is a review of the embedded source and execution records—not an independent execution. A matching printed hash is evidence of the reported comparison, not a hash I independently recomputed from the database.

### What is genuinely supported

- **Corrupt recovery metadata:** A18a exercises malformed JSON and records structured rejection rather than a traceback.
- **Wrong recovery digest:** A18b exercises a syntactically valid but incorrect digest and records a mismatch.
- **Surviving harness processes:** A19 records `killed_exit=137 java_after_kill=3`, followed by group termination, a quiet check, verified restoration and successful rebilling.
- **Interrupted restoration:** A20 actually reaches the restore pause, kills that process, and successfully restores on the next invocation.
- **Explicit retry:** A21 demonstrates the ordinary sequence: timeout → FAILED → plain resume remains unsuccessful → flagged retry succeeds.
- **Tax cardinality and positive-tax amount defects:** A10d demonstrates both planted failures.
- **Registered non-DR preservation:** A10e demonstrates preservation in October and ALL rebuilds.
- **Same-box ledger reproduction:** the P8 builder produces the reported canonical serialization hash.
- **Scope disclosure:** §19 explicitly leaves packs D/E, overlap isolation, historical revalidation and C1–C4 open.

Removing the unconditional `crash_safe=YES` field is a genuine correction. It is not merely a footnote added underneath the same output.

### The counts reconcile—but do not establish every label

There are **29 check rows**: the previous 21 plus:

`A10d, A10e, A17, A18a, A18b, A19, A20, A21`.

Thus \(21+8=29\), and the transcript reports all 29 passing predicates.

The reported **nine verified restorations** are consistent with:

- A4, A4b resume, A8 resume: 3;
- A15, A18a and A18b cleanup restores: 3;
- A19 resume, A20 final resume, A21 initial timeout: 3.

The three intentional rejected restorations are A15, A18a and A18b. The retry in A21 does **not** provide another fresh restore verification: it trusts the stored `restored=True` flag.

The unit result is also numerically consistent: **seven metadata cases, three writer-decision cases, and one final PID-file existence check = 11 assertions**. These are not eleven independent integration fault modes.

### Remaining overclaims

**1. A11 still says “every restore” without enforcing every restore.**

Its predicate is:

```bash
[ "$RM_OTH" = "0" ] &&
[ "$UV_OTH" = "0" ] &&
[ "$RV_ALL" -ge 1 ] &&
[ "$DELIB" = "3" ] &&
[ "$DF_ALL" = "0" ]
```

It still ignores `STAGE-RESTORE-ERROR`, does not count restore attempts, and does not match each attempt to a verified outcome. Moreover, `RV_ALL` reads **all** logs, not just `OTHER_LOGS`.

The deliberate exceptions are now handled better. The universal claim is still not established.

**2. The false restored-state message survives unchanged.**

A15 prints:

> `STAGE-RESTORE-UNVERIFIED ... data re-applied but NOT verified`

followed by:

> `FAILED (harness rc=-1) — pre-reset state restored`

The source emits that latter message regardless of `restored`. The generated report similarly labels FAILED batches “restored from stage backup” without conditioning that wording on the result.

**3. “Retry only from a hash-verified state” is stronger than the implementation.**

The retry path checks a historical boolean, not necessarily the current state. That is a new P8 claim defect, examined below.

**4. “Live untouched” remains too absolute.**

A13 demonstrates equal before/after values for the ledger and six output-table checksums. It does not demonstrate absence of transient writes, preservation of every live table, or successful cleanup after the measurement. The empty-equals-empty checksum weakness also remains.

**5. Reproducibility wording still contradicts §19.**

The manifest still says:

> “every runtime component is pinned … re-derivable without the original live box”

and:

> “raw 12-month DB images are too large to pin by hash”

Both are indefensible. Required artifacts remain missing, and size does not prevent hashing.

**6. Other v7 wording findings remain open.**

- The oracle docstring still says the harness targets its database through `database.ini`.
- It still claims `verify_frozen` checks a source-content hash; the function does not.
- R5 §12 retains the obsolete B-settlement “out of scope (subset)” explanation.
- §18 still calls the audited 17 billing rows “17 value rows” without showing the value-row filter.
- §13 retains the population-flavored “B3 bound ~0.3%.”
- A14 is still advertised as the suite exit-path proof, although it tests a separate early-exit branch.

The UTC+7 explanation resolves the apparent date mismatch: **October 17, 22:58 UTC is October 18, 05:58 local**. It does not independently prove the task was written before execution.

### Arithmetic retained from v7

The reported figures reconcile:

\[
86{,}455+86{,}455+113{,}389+70{,}056=356{,}355
\]

\[
25\times29{,}832=745{,}800
\]

\[
34{,}870{,}243{,}633-34{,}727{,}295{,}800=142{,}947{,}833
\]

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633=24{,}884{,}947.
\]

These are consistent aggregates, not independent financial validation.

**Claim-honesty score: 6/10 — unchanged.** The disclosures improve substantially, but the rewritten acceptance language still promises properties its predicates do not enforce.

## GATE-CORRECTNESS

### Disposition of each new check

| Check | Can it fail for the advertised violation? | Assessment |
|---|---|---|
| **A10d** | Yes, for the planted duplicate and wrong positive-tax amount. | Genuine improvement. It requires cardinality defect count 1 and tax-tool exit 1; the transcript supplies both. It prints, but does not assert, `DUPBAD=0`. |
| **A10e** | Yes, if the registered non-DR sentinel disappears. | Genuine narrow preservation test. It checks row count, not full row content or all protected rows. |
| **A17** | Yes, if either named live fixture is accepted. | Genuine guard, before DB access in this script. Not comprehensive target enforcement. |
| **A18a** | Yes, for the injected truncated JSON path. | Requires the unreadable marker, exit 4, no traceback, `restored=False`, keep marker and successful cleanup. |
| **A18b** | Yes, for the injected wrong digest. | Same strengths for the mismatch path. |
| **A19** | Yes, if the ordinary surviving harness is not killed or recovery fails. | Demonstrates the exercised group termination. Does not independently establish all writers dead before restore. |
| **A20** | Yes, if the pause is not reached, SIGKILL is not observed, or subsequent restore/rebill fails. | Good bounded interruption test. Does not test interruption inside an executing SQL statement. |
| **A21** | Yes, if the demonstrated retry-control sequence breaks. | Does **not** test rejection of a retry from a changed or unverifiable current state. |

### Tax: the cardinality repair works, but the standalone checker remains incomplete

The new suite query enforces:

```sql
x.nt <> IF(x.et > 0, 1, 0)
```

That closes the duplicate-correct-amount hole, including a stray tax row when the expected tax is zero.

The planted example is decisive:

> `subtotal=103752 tax_rows=2 tax_sum=22826`  
> `dup: count_query=1 amount_query=0 tax_check_exit=1`

The arithmetic is correct:

\[
(103{,}752\times11+50)\operatorname{DIV}100=11{,}413,
\quad 2\times11{,}413=22{,}826.
\]

However, `p7_tax_rule_check.py` can still return zero on defects:

1. **A single zero-valued tax row when expected tax is zero.**  
   `n_tax == 1` and `stored == java == 0` triggers nothing, although the suite’s contract requires zero rows.

2. **An orphan tax row with no drug row.**  
   Its query starts from grouped drug rows; orphan taxes never enter the result.

3. **An empty ledger.**  
   Zero input rows produce zero defects and PASS.

The tool now fails on the defects it counts. It is not a complete ledger-tax invariant checker.

### Builder DELETE: improved, but not equal to insertion scope

The critical expression is:

```python
... "AND (rp.no_rawat IS NULL OR " + (cp % ()) + ")"
```

For every window:

- DR rebuild: deletes registered DR rows **and unregistered ledger rows**.
- ALL-cohort rebuild: deletes all in-window ledger rows, including unregistered rows.
- Inserts: require a matching `reg_periksa` row.

Therefore **DELETE scope is not identical to INSERT scope**. The source explicitly adds orphan cleanup; the report should say so.

A10e proves preservation only where a non-DR registration exists. It says nothing about an unregistered row whose ownership is unknown. If that preservation matters, encode ledger ownership rather than assuming every orphan is disposable.

The cross-charset performance defect is credibly disclosed and the corrected join is present. The transcript supports a **26-second whole ALL rebuild**, not an independently measured 0.07-second DELETE or `eq_ref` plan; those latter figures are report-only here.

### A11 and cleanup remain acceptance holes

A non-deliberate `STAGE-RESTORE-UNVERIFIED` in a readable, included log makes A11 fail. That specific improvement is real.

But an unsuccessful restoration returning:

```python
log("STAGE-RESTORE-ERROR ...")
return False
```

is invisible to A11.

A15 cleanup still does:

```python
o.stage_restore(...)
print('stage_drop', o.stage_drop(...))
```

It ignores the restoration result and drops recovery tables anyway. Putting the hash back improves the observed run, but does not repair this control-flow defect.

The new `restore_kept()` also drops unconditionally. A18 subsequently detects `restore_verified False`, but by then it may already have destroyed the recovery copy. **Detecting failure after deleting the evidence is not fail-closed recovery.**

### Live protection is still not end-to-end

A17 closes `FX=sik` and `FX=sik_bench` in the suite. The oracle still only checks:

```python
if db == "sik" and not (... or args.allow_live):
```

It never checks the JVM’s actual XML target. A direct invocation with `--db-name clone` and XML pointing at `sik` remains unsafe.

Other retained hazards:

- global XML retargeting without cross-run isolation;
- global `pkill -f BilingHarness`;
- cleanup restores XML **before** terminating remaining harnesses;
- A13 uses unvalidated pipeline output without `pipefail`;
- wrapper teardown failures do not override a successful suite status.

### New P8 acceptance defects

The separate builder-check script reintroduces the original success-exit disease:

```bash
[ "$L" = "$S" ] && echo "...REPRODUCES..." || echo "DIFFERS"
...
echo "dbs: ..."
```

It prints a builder failure or hash difference and can still exit zero. Two failed hash reads can also compare equal. The embedded matching result is useful positive evidence; **the check itself is not a failing acceptance gate**.

A14 remains unchanged:

```bash
if [ -n "${P7_EXIT_TEST:-}" ]; then
    ...
    [ "$FAIL" = "0" ] && exit 0 || exit 1
fi
```

Reverting the production terminal exit to unconditional success would still leave A14 green. The normal suite ending and wrapper propagation are correct by inspection, but an actual failing suite → wrapper demonstration remains absent.

**Gate-correctness score: 6/10 — unchanged.** Several concrete gates improve; the acceptance framework still contains false-positive paths and destructive cleanup after failed verification.

## ORACLE-VALIDITY

### A18: genuinely repaired metadata handling, with a narrower safety meaning

`stage_restore()` now validates:

- readable JSON;
- matching prefix;
- matching visit set;
- a 64-character lowercase hexadecimal digest.

A18a/A18b and the mocked cases substantiate those branches.

But validation happens **after DELETE/REPLACE restoration**. A foreign or corrupt metadata file does not prevent mutation; it prevents that mutation from being accepted as verified.

That distinction matters. These tests establish:

> “Unverifiable restoration is rejected and reported.”

They do not establish:

> “Untrusted recovery material is rejected before modifying the target.”

Also, `_content_hash()` is outside the SQL restoration exception handler. A failure during post-restore hashing can still raise an exception rather than produce the structured restore-failure outcome.

### A19: good evidence of this kill; not a sound general writer-death proof

Credit the actual result:

> `groups_checked=1 killed=['448791:dead'] harness_writers=0 quiet=true`

Together with three matched processes surviving the oracle kill and zero afterward, this supports termination of the exercised harness process group.

The generalized proof remains unsound for several reasons.

**1. Process matching is a heuristic, not ownership.**

```python
if "BilingHarness" not in " ".join(argv) or \
        not want & set(" ".join(argv).split()):
    continue
```

This misses writers that do not retain that command line, use another executable, or are inaccessible in `/proc`. Inspection errors are silently skipped.

Conversely, it can kill another run’s harness naming the same visit on another database. There is no DB or run identity in the match.

**2. Recorded PGIDs have no process-generation identity.**

A stored integer is not proof that a later process group belongs to this run. PID/PGID reuse can make recovery signal an unrelated group.

**3. The quiet interval is two observations, not continuous quiescence.**

```python
h1 = _content_hash(...)
time.sleep(qs)
quiet = h1 == _content_hash(...)
```

An idle writer can resume afterward. Changes can occur and revert between observations. Processes are not rescanned after the interval.

`R5_WRITER_QUIET_S` can also reduce the interval to zero without changing the success label.

**4. FAILED batches are excluded from the quiet check.**

```python
if b.get("status") in ("STAGED", "RESET")
```

A FAILED batch awaiting `--retry-failed` can therefore be restored without this output-stability check.

**5. Client death is not server-side operation fencing.**

The code does not establish that the writer’s MySQL work has finished, rolled back or been terminated. Nor does it fence new writes during restoration.

These are residual engineering risks, not proof that the recorded A19 run was unsafe. The proper conclusion is **bounded recovery demonstrated, comprehensive writer exclusion not established**.

### The unit test does not prove the whole fail-closed path

It usefully verifies `reap_writers()` returns False on an unkillable mocked group and changing mocked output.

It does not test that `main()` makes **zero restoration calls** after that result. Source inspection supports the immediate return, but integration proof is absent.

The final assertion:

> `pid file removed only after the proof`

checks only that the file is absent after the successful call. If an earlier failing call deleted it, this assertion could still pass. Check existence immediately after each failed call.

### A20: real restartability at one carefully selected point

The test pauses after the `billing` restore, with **11 output tables pending**, then kills and resumes. The later verified restore is meaningful evidence.

Two limits:

- It is after **one of twelve output tables**, not literally halfway through all restoration work; registration status is also pending.
- It pauses **between completed SQL calls**. Killing the Python parent while a spawned mysql client is executing SQL is a different case. Such a child is not included in `_harness_writers()`.

The implementation redoes restoration based on state; it does not first demonstrate detection of partial restoration by a hash mismatch as the task wording suggested. Reapplying and verifying is acceptable for the exercised case—just describe the actual mechanism.

### A21: newly introduced stale-verification shortcut

The implementation says:

```python
if b.get("restored") is not True:
    if not stage_restore(...):
        ...
```

If `restored=True`, no current output hash is checked. `_finalize()` may already have dropped the stage tables. A later invocation trusts that historical flag and logs:

> `pre-reset state verified -> re-billing`

A21 never changes output between attempts and never tests `--retry-failed` with unverifiable recovery state. It therefore cannot expose this defect.

A genuine retry precondition needs a persisted, batch-specific digest compared with the current output immediately before retry—or a newly verified restore from retained recovery material.

### Ranked residual oracle risks

1. **Writer isolation/fencing is not established**, including FAILED retry paths.
2. **Retry trusts historical verification instead of current state.**
3. **Recovery metadata and staging are not robust across broader sequences.** The hash filename is per run/stage, not per date, and gets overwritten by later backups. A plain resume skips FAILED batches and can process later pending dates, potentially replacing metadata needed by an earlier unrestored batch.
4. **Frozen-baseline lineage remains incomplete.** `verify_frozen()` never compares `source_content_hash`; that helper also omits the consequential `biaya_obat` field.
5. **Successful runs retain form output rather than restore exact initial fixture state.** Disposable teardown is not evidence of exact restoration or protected non-sample preservation.

The oracle is fit for **the demonstrated, isolated single-batch fault experiments**, not the broader recovery guarantee suggested by some labels.

**Oracle-validity score: 7/10 — up from 6.** Corrupt-metadata, surviving-child and interrupted-restore demonstrations earn real credit, despite the remaining proof gaps.

## REPRODUCIBILITY

### What improved—and what was already strong

The current tool prefixes agree across the manifest and reported run:

- oracle `2aa3ef22…`;
- builder `736506c3…`;
- dbutil `f85958b4…`.

The builder output reports:

```text
live    356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7
scratch 356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7
```

That is strong **same-box content reproduction evidence** for the current integer-tax, Decimal-rounding builder.

“Byte-identical” should mean identical canonical serialized row content, not identical database files, physical layout or independent correctness.

Archiving earlier run directories is a real improvement over deleting them. The transcript reports 73 archived entries. However, the script suppresses `mv` failures and checks neither an expected inventory nor archive checksums.

### Ranked third-party blockers

**1. No immutable, reconstructible fixture.**

The wrapper does:

```bash
mysqldump ... sik | mysql ... sik_p6f
```

This is a fresh copy of current mutable live state. It is not a pinned fixture release.

There is no supplied complete fixture image, source snapshot hash, or deterministic provisioning path for the full reference data needed by the form.

**2. Missing executable dependencies and lineage.**

`p6_dbxml.py` imports unavailable `stagea_common.py`. The package also lacks the Java harness and consumer sources/classes needed to inspect and reproduce the claimed execution lineage, plus STRATA SQL.

The manifest’s list of Python and shell hashes does not close that dependency graph. Referencing a path on the VPS is not distribution.

**3. Provisioning and runtime closure are incomplete.**

The scripts assume:

- root mysql access;
- a particular benchmark account and password-file location;
- `/opt/simrs-khanza` and `/opt/Deers-Rock`;
- particular Java dependencies and encrypted XML tooling;
- Xvfb and faketime;
- existing grants, schema and operational configuration.

Do not publish production secrets. Publish parameterized provisioning and generate disposable credentials.

Version labels are useful but not a complete runtime lock: dependency artifacts, configuration, build procedures and startup pin enforcement remain missing.

**4. The wrapper is not failure-preserving.**

Its teardown says:

```bash
[ "${BUILT:-0}" = "1" ] && SQL "DROP DATABASE IF EXISTS $FX;"
```

That runs on failure too. Any stage tables intentionally preserved by the oracle disappear with the fixture. Filesystem logs do not replace the recovery database.

The wrapper also lacks `pipefail` on dump/import and does not propagate teardown failure into its final status.

**5. The new reproduction check does not enforce reproduction.**

As discussed above, `p8_builder_all_check.sh` can print `DIFFERS` and exit successfully. It must validate builder status, validate both hash results, compare against the pinned digest, and exit nonzero on failure.

### v7 reproducibility findings: disposition

| Finding | P8 disposition |
|---|---|
| Deterministic whole-ledger rebuild | Retained and reproduced with current builder |
| Mutable live-derived fixture | Still open |
| Missing `stagea_common.py`, Java and STRATA artifacts | Explicitly deferred; still open |
| Runtime/startup closure | Still open |
| Destruction of prior result directories | Improved in code and reported run |
| Preservation of failed fixture/recovery state | Still open |
| Cross-machine reproduction | Not run |
| Historical executable/baseline lineage | Not closed |

The supplied acceptance transcript also omits the wrapper’s own `fixture ...`, `suite exit=...` and teardown output. §19 attributes the run to the wrapper, and the wrapper source is available; that is weaker than an embedded complete wrapper transcript, especially for its failure path.

**Reproducibility score: 6/10 — unchanged.** Better records and another deterministic rebuild do not substitute for the missing fixture and executable release.

## E2E-DESIGN

### Fair claim now

A defensible claim is:

> On one configured Khanza installation, selected synthetic outpatient encounters can be reset and billed through the real form; their resulting value-row multisets can be compared with frozen pre-run billing. Controlled mutations and selected process interruptions are detected or recovered in the demonstrated cases.

The P7 audit materially supports **form-path writes to `billing`**, not merely note creation. P8 does not invalidate that strength.

But “frozen pre-run billing” is not automatically “fresh, attributable consumer output.” Later suite checks repeatedly freeze output left by earlier form runs. They remain useful recovery tests, but are not independent fresh-consumer equivalence experiments.

### The weakest financial leg remains B–C reconciliation

`count_form_save()` sets verification when **any** paid or credit row exists:

```python
return by, (has_paid or has_piut)
```

The comparison then uses:

```python
if b_amt != c_amt:
```

It does not require:

- equal encounter sets;
- complete form-save coverage;
- per-encounter agreement;
- note uniqueness;
- matching component or line-level quantities;
- demonstrated handling of combined payment/credit cases.

`c_rows_visit` is computed and unused.

The reported live result is therefore correctly unsuccessful:

> A == C: **31,750 rows / Rp 3,113,533,580**  
> B: **151 notes / Rp 49,903,019**, exit 1.

That B amount is approximately **1.603%** of C’s amount. It is not an encounter-coverage estimate, and calling it a “verified subset” does not reconcile it against C for that subset.

The unchanged design can even pass with incomplete B coverage if the amounts happen to aggregate to the full C amount. Presence plus total equality is not coverage.

### Independence remains limited

The ledger is separate from billing output, which is good. However:

- quantities and codes come from shared source tables;
- tariffs were adopted from the configured bundle rather than independently clinically validated;
- individual missing tariffs can fall back to source values;
- aggregate quantity checks miss quantity-preserving reallocations and same-price code substitutions.

The charge-delta source still claims a quantity reallocation between codes “still shifts” the component total. That is false when the reallocation preserves the total.

The oracle’s billing comparison also converts monetary values through binary floats rounded to two decimals. P8 corrected selected builder/payment sites, not the entire financial comparison stack.

### What fixes the weakest leg

Use one explicit encounter manifest and reconcile:

1. Independently specified expected charges.
2. Fresh pinned consumer output.
3. Fresh audited form output.
4. Payment and credit output for **those same encounters**.

Assert set equality and per-encounter financial identities before aggregate totals. Add adversarial cases that preserve totals while changing code, quantity allocation or note coverage.

The historical R4 0/999 sample needs a separate lineage re-examination; neither the one-visit audit nor the P8 recovery suite rehabilitates it.

### Disposition of v7’s top-three issues and next step

- **Recovery/state protection:** materially advanced, not closed.
- **Acceptance integrity:** tax checks improve; A11, A14, retry verification, cleanup and preservation remain incomplete.
- **Independent E2E lineage:** substantially unchanged and explicitly deferred.

The v7 single next step is therefore **partially delivered**: the requested injections were run, but not on an immutable fixture, without comprehensive protected-state checks, without an actual failing-wrapper demonstration, and without retained failed recovery databases.

**Next step:** finish that recovery acceptance contract before expanding claims: use a pinned fixture, fence writers, revalidate current retry state, test a real wrapper failure, and retain the failed fixture plus recovery artifacts. Assert protected sample and non-sample hashes throughout.

**E2E-design score: 7/10 — unchanged.**

## EXTERNAL-VALIDITY

### Scope honesty is better than external evidence

The paper-safe boundary in §13 is appropriate:

> “does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

§19 accurately says C1–C4 remain untested. P8 adds recovery assurance within the same environment, not evidence of external validity.

The remaining surface is narrow:

- one Khanza/MySQL configuration;
- synthetic outpatient data;
- uncalibrated diagnosis and drug distributions;
- unexercised payer mix;
- no representative facility comparison;
- no second-HMS validation;
- no independent pharmacist/clinical validation;
- limited observable financial edge behavior.

The embalase/tuslah experiments are especially important to interpret correctly: **the form produced no observable fee difference in this configuration**. That is a useful configuration-specific finding, not proof that these charges are correctly handled generally. Zero-fee and half-PPN cases remain unretested in the required populated, consumer-baselined form.

### The statistical wording still needs removal

Numerically:

\[
4/216=1.85185\%, \qquad 3/999=0.30030\%.
\]

The second number is the familiar approximate rule-of-three limit under suitable sampling assumptions. Those assumptions are not established for this selected, stratified, historically qualified sample.

Consequently, **“B3 bound ~0.3%” is not a supported population claim**. Repairing recovery logic does nothing to repair that inference.

Similarly, the measured throughput distinction remains essential:

- \(86{,}101/47.8\approx1{,}801\) consumer visits/minute;
- \(999\times60/8{,}393\approx7.14\) real-form visits/minute.

The approximately 250-fold difference reflects different execution paths. It is not evidence that ordinary hospital GUI billing operates at the consumer’s rate.

### Top external risk

**Synthetic internal agreement will be presented as representative hospital financial correctness.**

A consumer, builder and form can agree within the same configured synthetic system while omitting payer rules, meaningful clinical distributions, discounts, credit workflows or financially consequential edge conditions.

The highest-value external work is a licensed or anonymized facility comparison plus clinically reviewed, independently priced encounter cases—not another recovery test or a larger synthetic throughput run.

### Overall v8 assessment

| Criterion | v7 | v8 |
|---|---:|---:|
| Claim-honesty | 6 | **6** |
| Gate-correctness | 6 | **6** |
| Oracle-validity | 6 | **7** |
| Reproducibility | 6 | **6** |
| E2E-design | 7 | **7** |
| External-validity | 4 | **4** |

\[
\operatorname{round}\left(\frac{6+6+7+6+7+4}{60}\times100\right)
=\boxed{60/100}.
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60.**

**Verdict: Needs targeted rework.** P8 earns credit for real fault injections and concrete repairs. It does not earn closure for “every restore,” verified-current-state retry, immutable fixtures, failed-evidence preservation or independent financial correctness. The modest score increase reflects those unresolved acceptance defects—not a dismissal of the engineering work.

**External-validity score: 4/10 — unchanged.**
