# Astra v7 assessment: dr-khanza-e2e-full-assessment (post P1-P7) [step 1/3: claim-honesty]

## CLAIM-HONESTY

## Claim-honesty verdict: **6/10 — unchanged from v6**

P7 fixes real defects and supplies substantially better evidence. But its reporting still turns **specific successful observations into broader acceptance claims that the assertions do not establish**. The most obvious example is indefensible: the transcript records an unverified restore, then awards PASS to **“every restore across the suite hash-verified.”**

This assessment is a source-and-transcript review, not an independent execution.

## 1. What is honestly supported

### The suite now propagates recorded assertion failures

The production exit path is repaired:

```bash
[ "$FAIL" = "0" ] && exit 0 || exit 1
```

The wrapper preserves the suite status:

```bash
RC=$?
echo "suite exit=$RC"
exit $RC
```

That closes the original “ends on an echo” defect **in code**. The clean transcript reports `PASS=21 FAIL=0`.

However, the negative demonstration is narrower than advertised; see below.

### Missing-hash recovery now refuses to declare success

The missing-file branch explicitly sets:

```python
ok = False
```

A15 demonstrates:

> `STAGE-RESTORE-UNVERIFIED`  
> `exit=4 ... stage_tables_kept=13 restored=False`

That is a genuine improvement: the production finalize path retains recovery material rather than treating an unverified restore as successful.

The defensible claim is **“missing hash detected; restoration not accepted; recovery tables retained in the exercised timeout case.”** It is not complete recovery correctness.

### The ledger defect was repaired, not merely re-described

The rebuild transcript supports the stated transition:

| Property | Evidence |
|---|---:|
| Keys removed / added | 0 / 0 |
| Amount changes | 0 |
| Unit-price changes | 0 |
| Quantity changes | 1 |
| Source-label changes | 260,800 |
| Rows after rebuild | 356,355 |
| Amount after rebuild | Rp 34,870,243,633 |

The quantity correction is explicit: `23 → 25` for `2026/10/01/000298`, drug `B000000240`.

The backup hash equals the pre-rebuild hash. The resulting hash, `a66a3a54…`, matches the manifest and the subsequent integer-builder scratch result.

The version distinction is also important and correctly visible in the evidence:

- Live rebuild: builder `7f6e79c4…`.
- Subsequent integer-builder reproduction: `84c49f0d…`.

Do not collapse these into “the integer builder performed the live rebuild.” It reproduced that rebuild afterward.

### The provenance evidence justifies withdrawing “the form does not write billing”

The audit is materially stronger than observing rows after execution:

- Eight INSERT/DELETE triggers are asserted present.
- `USER()` records the session identity, rather than the trigger definer identity that `CURRENT_USER()` would report.
- `CONNECTION_ID()` distinguishes connections.
- Oracle operations are routed through root.
- The transcript records root deleting 17 billing rows, followed by `benchmark@localhost` inserting 17 billing rows and the nota records on one connection.
- The oracle reports `sukses_true=1 -> BILLED`, exit 0.

This supports **form-path billing writes for the audited encounter**, rather than merely note-layer writes.

Two qualifications remain:

1. **`BilingHarness.java` is not actually embedded here.** Its alleged absence of SQL is an assertion in the audit script, not something this submission lets me inspect.
2. Account attribution is not inherently process attribution. The consumer also uses the benchmark account. The presented orchestration, which launches the form and no consumer repair, makes the attribution persuasive for this controlled run; the trigger records alone would not establish it.

The withdrawal is justified. Blanket promotion of all historical samples is not.

---

## 2. Arithmetic: the numbers reconcile, but the acceptance labels do not

### There really are 21 printed checks

The labels are:

`A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A15, A16, A14, A10, A10b, A10c, A11, A12, A13`.

That is **21**, all printed PASS.

But **21 passing predicates ≠ 21 correctly established advertised properties**.

### Ledger arithmetic is consistent

The rebuild component counts sum correctly:

\[
86{,}455+86{,}455+113{,}389+70{,}056=356{,}355.
\]

The source-label repair affects:

\[
260{,}800/356{,}355 \times 100 \approx 73.1854\%.
\]

The corrected row is financially consistent:

\[
25\times29{,}832=745{,}800.
\]

The published revenue bridges also reconcile:

\[
34{,}870{,}243{,}633-34{,}727{,}295{,}800
=142{,}947{,}833,
\]

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633
=24{,}884{,}947.
\]

These are consistent reported aggregates and hashes. The embedded evidence does not contain the underlying 356,355 rows for an independent total recomputation.

---

## 3. Remaining and newly exposed overclaims

### A. “Every restore verified” is directly contradicted by this run

A11 asserts only:

```bash
[ "$RM_ALL" = "0" ] &&
[ "$DF_ALL" = "0" ] &&
[ "$RV_ALL" -ge 1 ]
```

That means:

- no matching mismatch log;
- no matching failed-drop log;
- at least one verified restore.

It does **not** mean every restore verified. It ignores `STAGE-RESTORE-UNVERIFIED` and `STAGE-RESTORE-ERROR`.

P7 makes this contradiction concrete. A15 deliberately generates an unverified restore. Its cleanup then does:

```python
o.stage_restore(...)
print('stage_drop', o.stage_drop(...))
```

The cleanup **ignores the restore result and drops the tables anyway**, with the hash still absent.

The log compounds the problem:

> `FAILED (harness rc=-1) — pre-reset state restored`

That message is unconditional even when `restored=False`.

**Required correction:** describe A11 as the limited predicate it actually checks, explicitly exclude the intentional A15 negative case, and verify cleanup separately. Do not claim universally verified restoration.

### B. A14 does not exercise the production terminal failure path

The special mode exits early using its own copy of the decision:

```bash
if [ -n "${P7_EXIT_TEST:-}" ]; then
    ...
    [ "$FAIL" = "0" ] && exit 0 || exit 1
fi
```

It never reaches the normal terminal exit statement. Reverting the production ending to an unconditional successful echo would leave A14 green.

The rubric honestly concedes that the wrapper was not run with a failing suite, but still marks the original wrapper-negative AC-1 as PASS.

**Correct status:** production exit logic fixed by inspection; miniature negative-path demonstration passed; actual suite→wrapper failure propagation not demonstrated.

### C. Missing-hash success is not unreadable/corrupt-hash acceptance

P7-2 requires missing **or unreadable** hash handling. But:

```python
pre = json.load(open(hpath)).get("sha256")
```

is outside the restore exception handler. An unreadable or malformed JSON file can raise an exception rather than produce the promised structured FAILED/`restored=False`/exit-4 outcome.

A15 tests deletion only. A valid JSON file with an incorrect digest follows the mismatch branch, but that case is not demonstrated here either.

**AC-2 is only partially demonstrated against its written requirement.**

### D. A10b overstates tax-row cardinality

Its prose says:

> “every window visit with drugs has exactly one tax row”

The SQL does not count tax rows per visit. Two tax rows with different codes, each carrying the expected amount, satisfy the join predicate. The primary key includes `code`, so the schema does not rule that out.

It also excludes expected-zero tax cases using:

```sql
WHERE (x.ds*11+50) DIV 100 > 0
```

The defensible claim is exact positive-tax amount/missing-row checking, plus orphan detection—not universal existence and uniqueness.

Also, `p7_tax_rule_check.py` only prints discrepancy counts; it has no failure exit based on those counts. Its claimed “0 differences” result is repeated in prose, but its execution output is not embedded.

### E. Live-state evidence improved; “untouched” remains too absolute

The six before/after checksums are present, numeric, and identical. That is useful evidence of **net content stability for those six tables during this suite**.

It does not prove:

- no transient writes occurred;
- all live tables were unchanged;
- the provenance run had equivalent live-state protection;
- historical clone-mode runs were safe.

The guard also permits empty-equals-empty or invalid-equals-invalid results if reads fail: `live_sik()` pipes through `awk` and `tr`, without `pipefail` or validating six numeric results.

Finally, A16 checks the Python argument `db == "sik"`. It does not bind the JVM’s actual XML target to that argument. **Explicit live opt-in is implemented; comprehensive disposable-target enforcement is not.**

### F. The provenance correction has not been propagated consistently

The struck-through §0/§1/§13 statements are an honest correction. But elsewhere:

- §12 still says B-settlement equivalence is out of scope because it is a subset.
- §16 still says **“B-settlement equivalence is structurally unclaimable.”**
- §18 says the comparison applies to **“every sampled, re-billed visit”**, while expressly leaving the pre-R5 999-visit sample unresolved.

The correct distinction is:

- The current oracle can compare frozen pre-run billing with same-encounter form-written billing.
- `three_count`’s B remains a note-total aggregate over whichever encounters have notes.
- That tool still does **not** perform matched-subset B–C financial reconciliation.
- The historical 999-visit result is not rehabilitated by this one-visit audit.

Also, “17 billing rows” must not become **“17 value rows”** without applying the oracle’s value-row filter. The audit counts all billing rows.

### G. Other stale guarantees remain

- `_finalize()` still emits `crash_safe=YES` unconditionally.
- `verify_frozen()` never compares the stored `source_content_hash` with current source content, despite the P6-2g guarantee. Its helper also omits the billed `biaya_obat` field that A2 identifies as consequential.
- The manifest still carries present-tense text saying whole-row reproduction does not hold, beneath the new evidence showing that it does.
- §13 retains the population-flavored “B3 bound ~0.3%.” Numerically, \(3/999=0.3003\%\); that does not justify population inference from this selected, historically qualified sample.
- “DB images are too large to pin by hash” is not a valid reproducibility limitation. Size can impede distribution, not hashing.

---

## 4. Are deferred items honestly marked?

**In §18 and the P7 task, mostly yes.** Restoration interruption, surviving-JVM hard crashes, overlap isolation, retryable FAILED states, historical targeting revalidation, and external validity are explicitly deferred.

But deferral is not a waiver. It conflicts with continuing blanket `crash_safe=YES` output and older report guarantees. Those must be narrowed wherever readers encounter them.

The “written before execution” chronology also needs clarification: the task says October 17, while the embedded UTC runs occurred October 16. This may be a timezone convention; the supplied dates do not establish the claimed ordering.

## Bottom line

**Claim-honesty: 6/10.**

Credit the owner for the ledger repair, genuine missing-hash refusal, stronger live guards, and a warranted provenance retraction. Those are substantive advances.

Do **not** accept “P7 = PASS” as written against the original rubric. A14 substitutes an early-exit microtest, A11 asserts something the transcript disproves, and several ACs are only partially demonstrated.

The next reporting fix is straightforward: **replace blanket PASS labels with property-level statuses, remove stale guarantees, and distinguish observed results from assertions that actually enforce them.**
