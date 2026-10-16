# Astra v6 assessment: dr-khanza-e2e-full-assessment (post P1-P6)

## CLAIM-HONESTY

## Claim-honesty verdict: **6/10 — improved disclosure, still an overstated close-out**

**Up from 5/10 in v5.** P6 contains real engineering progress and unusually consequential admissions. The transaction failure test is credible; the XML-target correction materially improves the evidence; §17 correctly withdraws several false historical claims.

But **“18/18 PASS” is a count of the checks implemented, not proof that the original acceptance requirements were met.** Several checks are weaker than their labels, and the report continues to assert properties contradicted by its own source and corrections.

This is an assessment of the embedded evidence, not an independently executed verification.

## 1. What the figures actually establish

### The suite really reports 18 passing checks

The labels are:

`A0, A1, A2, A3, A6, A4, A4b, A5, A7, A8, A8b, A9, A10, A10b, A10c, A11, A12, A13`

That is **18**, consistent with:

> `PASS=18 FAIL=0`

However, these are not 18 independent acceptance requirements. A3 and A6 share one execution; A11–A13 are additional summary/state checks. The count is legitimate; treating it as coverage of the original rubric is not.

### A10c provides genuine rollback evidence

The transcript records the same scratch-ledger digest before and after:

```text
pre=356355:504531980ca252725fe9897ed038088f5fefa50b993893c7320b28c11c69bf99
post=356355:504531980ca252725fe9897ed038088f5fefa50b993893c7320b28c11c69bf99
```

It also records:

> `ERROR 1644 (45000) ... p6 A10c injected mid-build failure`

The suite asserts trigger existence, the injected error text, exit 1, `FAIL-CLOSED`, and digest equality. The source uses one persistent mysql process and inserts tax last. **This closes the old separate-session transaction defect for the demonstrated failure case.** It is not just a self-congratulatory commit log.

The scratch digest differs from the live digest. That is not a contradiction: A10/A10b rebuilt the October scratch ledger before A10c.

### The ALL figures reconcile numerically—but are not an embedded asserted ALL run

The reported figures satisfy:

- **86,101 + 354 = 86,455 visits**
- **Rp 34,727,295,800 + Rp 142,947,833 = Rp 34,870,243,633**
- §17’s **356,355 rows / Rp 34,870,243,633** matches the manifest’s ledger aggregate pin.

The current gate source correctly says:

```python
return "1=1" if window == "ALL" else "no_rawat LIKE '2026/10/%'"
```

**Code fix: verified. Numerical consistency: verified. Current asserted ALL execution: not supplied here.** The acceptance suite never invokes either reconciliation gate and builds only `--window 2026-10`. The raw `evidence/window_all/` transcript is referenced, not embedded.

Do not turn matching report numbers into independent execution evidence.

## 2. The acceptance claims still exceed the assertions

The blanket statement—

> “Each check asserts the gate's own log line AND the exit code”

—is **false against the supplied suite source**.

| Check | What the source actually establishes | Honesty assessment |
|---|---|---|
| **A0** | Counts five `STRATA-%` registrations. | Does not check dates, populated financial fixtures, or clone completeness. “Date-resolved” is stronger than this assertion. |
| **A1** | Asserts only `RC == 0`. | A valid narrow normal-path result, but no asserted FINAL line, visit count, success markers, or nonempty output. The grep is informational. |
| **A2** | Asserts exit 1 and no traceback. | `ORACLE_FAIL` and `drift_visits=1` appear in the transcript, but neither is asserted. A parse-error verdict could satisfy the implemented check. |
| **A3/A6** | Asserts exit 4/no traceback/no restore mismatch and four OOE CSV lines. | Transcript demonstrates four BILLED visits. The check does not require BILLED or `sukses=true`. It also replaces the original forced-JVM-exit test, rather than completing it. |
| **A4/A4b** | Asserts group-empty proof, relevant exits, and verified restoration; A4b includes resume. | Strong evidence for these exercised timeout/SIGTERM paths. Not proof of SIGKILL crash recovery or forced escalation. |
| **A5** | Asserts `MISSING-REG`, exit 2, no traceback. | Honest and specific, under `--allow-strata`. |
| **A7** | Asserts empty-baseline rejection and an administrative freeze succeeding with the override. | Does **not** run the allowed empty baseline through billing or prove missing-settlement mismatch detection. |
| **A8** | SIGTERM after reset, then verified restore and successful rebill. | **Not interruption during restoration**, as the original requirement specified. Calling “after reset” a “restore-injection point” does not make it one. |
| **A8b** | Asserts changed-sample rejection. | Good evidence for this particular resume-binding case. |
| **A9** | Runs B3 and B2 sequentially; asserts distinct backup/drop log prefixes. | Demonstrates stage-aware names, **not overlapping-visit concurrency safety**. Does not assert run exit codes. |
| **A10/A10c** | Commit path plus substantial injected rollback evidence. | Real improvement, with the demonstrated scope stated correctly. |
| **A10b** | Checks stale-key absence and `ABS(ta - ds*0.11) > 1`. | Does **not** prove exact half-up tax equality or tax-row completeness. |
| **A11** | Zero mismatch/drop-failure strings and at least one verified restore. | Does **not** prove “every restore” was verified. |
| **A12** | Queries zero remaining stage tables. | Honest evidence of stage-table absence—not complete data restoration. |
| **A13** | Compares live ledger digests and probes XML targets. | Honest only as **ledger-content stability plus restored target configuration**, not “live state untouched.” |

### A10b’s rounding claim is demonstrably too strong

The predicate is:

```sql
WHERE ABS(ta - ds*0.11) > 1
```

For a drug subtotal of Rp 100, correct tax is Rp 11. **Tax of Rp 10 or Rp 12 passes this check.** Missing tax rows are also invisible because the query starts from existing tax rows.

Replace “every window tax row = 11%” with the actual, weaker predicate—or fix the test.

### The suite itself does not fail its process when checks fail

It increments `FAIL`, but ends with successful `echo` commands. There is no:

```bash
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
```

or equivalent.

Thus a caller checking only the suite process exit could accept a failed suite. **“Machine-asserted” is incomplete without a machine-enforced aggregate result.**

## 3. Target correctness improved; “live untouched” remains unproven

The XML correction is important and credible:

> `harness+consumer database.xml -> sik_p6f (RETARGET-VERIFIED ...)`

The clone-only authored visits in the strata re-check, followed by `sukses=true` and populated output, provide stronger supporting evidence than merely editing a configuration file.

But the evidence chain still has limits:

- `p6_dbxml.py` delegates the actual work to **`stagea_common.py`**, whose source and pin are not supplied.
- The claimed one-command fixture wrapper, **`p6_run_suite_fresh.sh`**, is pinned but its source is not embedded.
- Neither Java harness nor consumer source is supplied here.
- A13 hashes **`sik_bench.dr_charge_ledger` only**. It does not hash live `sik.billing`, notes, payments, registration status, or other possible write surfaces.
- Restoring XML database names does not prove full configuration byte restoration.
- Neither suite nor oracle enforces a disposable-target allowlist. `FX` is overridable, root access is enabled, and the oracle still defaults to `sik`.

The exact safe claim is:

> **The supplied runs provide evidence of XML-retargeted clone execution, stable live-ledger content, and XML targets restored to `sik`. They do not establish that all live database state remained unchanged.**

The report’s admission that B was not pinned is correct. It also prevents a broader no-live-mutation claim.

## 4. §16’s recovery assurances still contradict current source

These are not merely historical wording problems.

### Missing restoration hash is treated as success

`stage_restore()` initializes:

```python
ok = True
```

If the hash file is absent, it logs:

```text
NOT hash-verified
```

but still returns `True`.

Consequences:

- resume can proceed after an unverified restore;
- the failed-batch path can record `restored=True`;
- finalization can drop the recovery tables.

That directly contradicts:

> “content-hash-verified restore … on every restore path”

and the claim that unverified restoration always preserves stage tables.

### “Source-content verification” is not implemented

The manifest records:

```python
"source_content_hash": source_content_hash(db, nrs, log)
```

But `verify_frozen()` **never compares it with current source content**.

Worse, the hash function omits the very fields A2 demonstrates the form charges from—`biaya_obat` and `total`—and does not include the claimed registration fee. Query errors are swallowed.

The docstring promises source-content drift detection; the implementation supplies neither the comparison nor complete relevant inputs. **Withdraw that claim immediately.**

### FAILED recovery is not automatically resumable

Resume skips FAILED batches:

```python
if not b or b["status"] in ("BILLED", "FAILED"):
    ...
    continue
```

Keeping stage tables is useful, but **“kept for resume” does not mean the implemented resume will retry an unsuccessful restoration**. For these states, manual recovery remains necessary.

Likewise, the legacy resume path waits on a recorded wrapper PID, then proceeds after a bounded wait without establishing group death. A4b demonstrates the new cooperative SIGTERM handler, not this SIGKILL/orphan-writer scenario.

Finally, output still unconditionally prints:

> `crash_safe=YES`

and describes FAILED batches as restored even where restoration failed. Those are current-code overclaims.

## 5. The retractions are substantive—but not consistently propagated

### ALL-predicate “misread”: correctly retracted, stale authority remains

§17 correctly admits the SQL literal was unterminated and that the old pattern excluded 354 visits.

But the task document still says:

> “Astra's … sub-claim was a misread … verified.”

The rubric also ends with:

> “Open: `--window ALL` Stage-A scoping not tested.”

Historical records may remain intact, but they need conspicuous supersession annotations. More importantly, §6’s earlier claim that a scratch `three_count --window ALL` fault test succeeded needs revalidation or withdrawal: §17 establishes that the defective versions could not execute that query. The supplied material does not resolve which earlier artifact used which source.

### P4 edge strata: the local correction is good; dependent claims survive

§14’s bracketed correction and §17’s detailed replacement are useful. The new transcript supports:

- successful form execution for the two authored visits;
- eligibility-based OOE classification;
- exit 4;
- no extra embalase/tuslah billing line in these cases.

The financial arithmetic agrees:

- `2 × 1,320 = 2,640`
- `2,640 × 11% = 290.4`, rounded to **290**
- total per visit: **10,000 + 75,000 + 2,640 + 290 = 87,930**

Neither the Rp 2,500 nor Rp 1,500 addition appears.

But the statement should stay at **these authored cases in this configuration**, not become exhaustive proof about how those charges behave. The re-check script also mostly prints outcomes rather than asserting them, despite its “every step asserted” comment.

Stale dependent claims include:

- §14: **“all on scratch fixtures with no live-DB mutation”**
- §14: **“No live-DB mutation in P4”**
- §14’s status update marking the five edge-strata slice DONE
- §15 Demo A: **“The original P4-populated-clone edge-strata run remains the evidence for that slice”**

That last sentence is explicitly invalidated by §17. It cannot remain an operative justification.

### Earlier clone-mode qualification is not applied consistently

§17’s scope note correctly names P1 clone-mode demos and P4. But:

- §0 and §1 still lead with unqualified P1 crash-safety PASS claims.
- §8 continues to rely on that hardening narrative without attaching the target qualification.
- §15 Demo A still borrows the invalid P4 populated-clone evidence.
- P4’s consumer “cold scratch” burst and the manifest’s corresponding performance claim are not individually reverified, although §16 says **both harness and consumer** read XML.

**P5 Demo B is different:** it explicitly says it ran live and disclaims the tamper’s causal role. The XML discovery does not by itself invalidate that stated target. Nevertheless, its historical execution and cleanup are not re-proven by P6, and must not inherit P6’s clone-safety claims.

A blanket appendix disclaimer is not an adequate repair for prominent affirmative claims that still cite invalidated experiments.

### Ledger reproducibility: disclosure is honest; “byte-for-byte” is still false

The defect arithmetic is exact:

- **25 × 29,832 = 745,800**
- **23 × 29,832 = 686,136**
- inconsistency: **Rp 59,664** relative to stored quantity × unit price.

This is a quantity defect, **not evidence that the recorded amount is wrong**. The amount-only gate can legitimately pass while the quantity gate fails.

But §11 still says the canonical ledger was rebuilt “byte-for-byte,” and the manifest’s main ledger row still calls it “byte-for-byte reproducible.” The later qualification—

> “‘Byte-for-byte’ now holds for keys/amounts/prices”

—is not good terminology. Say **selected-field equality**. One changed quantity and 260,800 changed provenance fields disprove whole-row reproducibility.

The corrected claim is:

> **A scratch rebuild reportedly reproduces keys, amounts and unit prices, but not full ledger content. The current pinned ledger fails the quantity comparison.**

The raw rebuild and line-delta transcripts are not embedded, so their execution remains reported rather than directly auditable here.

## 6. Other remaining honesty defects

- **Builder “cohort replacement”:** reads use the cohort predicate, but DELETE does not. For ALL it executes `DELETE ... WHERE 1=1`, then inserts only the selected cohort. Atomicity is fixed; cohort-scoped preservation is not established.
- **“Integer end-to-end”:** the builder uses `float()` and `float(s) * 0.11`. Integer outputs are not integer-only arithmetic.
- **Line-diff scope:** the source still claims reallocating quantity between codes necessarily shifts component quantity totals. It does not. Aggregate-preserving reallocations remain invisible.
- **Three-count PARTIAL contract:** documentation promises exit 0 for PARTIAL, but the final expression returns 1 when B is absent. `--verify-form-save` is parsed but unused.
- **“Verified subset”:** the B implementation verifies presence of some save content; it does not reconcile B against C for the same encounter subset. “Observed form-save subset” is more accurate than a financially verified subset.
- **Restoration acceptance was weakened after execution:** the amended rubric substitutes verified intermediate restoration plus rebilling for P6-5’s exact pre/post fixture hashes. That may be a reasonable redesigned requirement, but it is **not fulfillment of the original requirement**.
- **Reproducibility packaging:** a manifest of tool hashes does not substantiate “every runtime component” or reconstruction without the original box. Missing dependencies and an unpinned fixture remain. Database images being “too large to pin by hash” is not a valid technical explanation.

## Final score and required correction

### **Claim-honesty: 6/10**

**Credit earned:** explicit admission of wrong SQL, wrong harness targeting, contaminated historical evidence, an internally inconsistent pinned ledger, and a live test-row mutation; credible current rollback and selected recovery demonstrations; no renewed claim of population-wide settlement equivalence.

**Credit withheld:** universal assertion claims that the suite does not implement; incomplete propagation of retractions; unsupported “live untouched,” “every restore verified,” source-content verification, and whole-ledger reproducibility language.

**The most useful next action is not another PASS banner.** Publish a corrected claims matrix that marks each old claim **retained, narrowed, withdrawn, or newly demonstrated**, and remove contradicted claims from the executive sections. Then make the suite enforce the properties its labels name—especially aggregate failure exit, missing-hash rejection, interrupted restoration, source-content verification, and live-state guards.

P6 deserves credit for exposing the truth. It does not yet deserve credit for consistently reporting it.

## GATE-CORRECTNESS

# v6 assessment: **52/100 — Needs targeted rework**

**P6 is real progress. It is not the acceptance proof its headline claims.**

The persistent builder transaction, corrected `ALL` predicates, actual `database.xml` retargeting, and demonstrated timeout/SIGTERM recovery deserve credit. This is materially stronger evidence than v5.

But **“18/18 PASS” is the result of eighteen implemented conditions—not proof that the original eighteen named properties hold.** Several conditions are weaker than their labels. Some planned tests disappeared. The suite itself can finish successfully after recording failures. Complete live-state preservation was not measured.

Most seriously:

1. **The builder’s DELETE still ignores `--cohort`; `--window ALL --cohort dr` deletes the entire ledger before rebuilding only DR rows.**
2. **Recovery still has fail-open verification and unsafe crash-resume paths.**
3. **The newly recorded source-content hash is never verified.**

I reviewed the embedded source and transcript; I did not independently execute them. Where §17 supplies only a reported result, I distinguish that from an embedded, machine-asserted run.

## Scores

| Criterion | v5 | v6 | Assessment |
|---|---:|---:|---|
| Claim-honesty | 5 | **6** | Important, explicit retractions. But the report, manifest, comments, and acceptance labels still make contradicted claims. |
| Gate-correctness | 3 | **5** | Genuine transaction and SQL repairs. Destructive cohort scope, weak tax assertions, and existing gate-contract defects remain. |
| Oracle-validity | 3 | **4** | Frozen comparisons and demonstrated restore hashes improve confidence. Unchecked source hashes, incomplete recovery, shared-source expectations, and the defective canonical quantity remain material. |
| Reproducibility | 6 | **6** | Better pins and a current-run transcript, offset by missing dependency sources, unarchived fixture inputs, unproven historical runs, and no enforced pin check. |
| E2E-design | 5 | **6** | Actual clone-targeted real-form interaction is now supported. This remains a narrow hybrid benchmark, not independently established settlement equivalence. |
| External-validity | 4 | **4** | No new calibration, second system, cross-machine execution, payer coverage, or real-facility comparison. |

\[
(6+5+4+6+6+4)\times\frac{100}{60}
=51.67 \rightarrow \boxed{52/100}
\]

**Delta:** +17 versus 35; +9 versus both previous 43s.

---

# 1. Disposition of every v5 finding

| v5 finding | Current disposition |
|---|---|
| **Fail-open exit / unconditional BILLED** | **Ordinary-path repair confirmed.** `_bill_date()` requires `rc == 0 and all(sukses.get(v, False) for v in nrs)`; `main()` returns `_finalize()`’s result. The transcript demonstrates exit 1 for drift and exit 4 for timeout/out-of-envelope execution. Administrative exit-0 qualification is now documented. **Universal crash-safe/fail-closed claims remain false.** |
| **Attempt-based not-covered classification** | **Fixed and now demonstrated on successfully billed visits.** A3’s CSV contains four `OUT-OF-ENVELOPE,...True,0,...BILLED` rows. Classification no longer depends on harness failure. But this is not the originally specified five financial strata. |
| **Manifest existence presented as independence** | **Misleading control withdrawn.** The builder discloses shared source quantities/codes and removes the existence-only flags. No independent pre-adapter quantity/code oracle was added. |
| **Overstated line-diff scope** | **Still incompletely corrected.** Report wording is mostly narrower, but source still claims quantity reallocation within a component necessarily changes its total. It does not. The current ledger also fails this optional gate. |
| **Report inconsistencies** | **Partially repaired; not closed.** Wrong target configuration and the ALL denial are retracted. Nevertheless, old byte-for-byte, crash-safe, no-live-mutation, financial-strata, and query-count claims remain in the current document. |
| **Global stage-table interference** | **Stage namespace repair confirmed, concurrency safety not established.** Prefixes now include stage. A9 demonstrates distinct names sequentially. Sanitization collisions remain, and different runs/stages can still reset the same live encounter concurrently. |

### Additional v5 subfindings

- **Header-only FAILED results:** fixed in `_finalize()`; non-BILLED batches receive rows.
- **CREATE privilege failure masquerading as drift:** explicit root DDL remains; the current A2 transcript shows an actual `ORACLE_FAIL`, not the previous traceback mechanism.
- **Root-dependent DDL without disposable-target guard:** **still open.** Root access is now exercised successfully, not made safe.
- **`--db-name` does not configure Java:** **confirmed and repaired only by the surrounding P6 orchestration.** The oracle still does not bind or verify the Java target itself.
- **Unreachable `REPAIR-SKIPPED`:** logging moved to a reachable non-BILLED path. However, the promised repair behavior remains defective: actual repair is still inside the BILLED branch under `if not ok_flag`, which fresh BILLED batches cannot satisfy.
- **Guaranteed cleanup/restoration overclaims:** still present, although `STAGE-KEEP` and verified-drop handling are substantive improvements.
- **False transactional replacement:** repaired for the tested builder path.
- **Malformed ALL predicates:** repaired in current code; v5 was correct.

### v5 top-three issues

1. **Database primitives:** transaction repair demonstrated; SQL syntax repaired; **cohort deletion semantics remain wrong**.
2. **Populated-clone recovery suite:** substantially delivered, but **not interrupted-restore, SIGKILL recovery, full pre/post restoration, or real concurrency proof**.
3. **Evidence chain:** improved markedly, but still incomplete. Current-source pins do not rehabilitate historical wrong-target runs.

---

# 2. The acceptance suite: what each check actually proves

The summary says:

> “Each check asserts the gate's own log line AND the exit code.”

That is false in the supplied shell source.

| Check | Actual assertion and evidential value |
|---|---|
| **A0** | Asserts five `STRATA-%` registrations exist. Does not assert their dates, source charges, billing baselines, or financial properties. Useful fixture precondition only. |
| **A1** | **Exit code only:** `[ "$RC" = "0" ]`. The grep output is not tested. Given the reviewed normal path, this supports a clean comparison, but it is not the advertised marker-plus-status assertion. |
| **A2** | Asserts exit 1 and zero `Traceback` strings. It does **not** assert `ORACLE_FAIL`, drift count, the mutated visit, or expected Obat/PPN differences. The transcript nonetheless supplies `ORACLE_FAIL` and `drift_visits=1`, supporting this particular run. |
| **A3** | Asserts exit 4, no traceback, and no restore-mismatch string. A harness/backup failure could satisfy this. The embedded CSV supplies stronger evidence: all four actually BILLED. **The planned forced Java exit-3 test was replaced, not completed.** |
| **A6** | Asserts four CSV lines containing `OUT-OF-ENVELOPE`. Does not require those lines to be BILLED or have `sukses=True`. Again, the actual transcript provides that stronger evidence. Four >2-procedure visits are not five distinct financial edge cases. |
| **A4** | Strong check for the exercised timeout: exit 4, group-empty proof, verified restore, and no process matching `BilingHarness`. It does not demonstrate SIGKILL escalation or killing a writer after a partial financial write; the 3-second timeout is deliberately early. |
| **A4b** | Strong evidence for the handled SIGTERM path and successful resume. However, `pgrep -f BilingHarness` counts matching processes, including wrappers—not necessarily three JVMs. “3 → 0 java” is overstated. |
| **A5** | Good structured rejection test: named `MISSING-REG`, exit 2, no traceback. It deliberately uses `--allow-strata` to reach this check; without that, eligibility can reject first. |
| **A7** | Good empty-baseline **freeze** test. It does not demonstrate a billing run after the override, nor missing-settlement mismatch detection. No traceback assertion is implemented here. |
| **A8** | Demonstrates SIGTERM after reset, then verified restoration and a clean re-bill. It **does not interrupt restoration**, despite the original task requiring that. It is not SIGKILL crash recovery. |
| **A8b** | Good named sample-binding rejection: `RESUME-ABORT` plus exit 3. |
| **A9** | Checks two different backup/drop prefixes. **No exit codes are asserted. Runs are sequential.** Demonstrates namespace separation, not overlapping-visit concurrency safety. |
| **A10** | Exit 0 plus commit message. The persistent-session source makes this credible, with A10b/A10c providing behavioral support. A self-reported “single session” line alone would not prove atomicity. |
| **A10b** | Stale-key removal is meaningfully tested. **Tax correctness is not:** the query allows an error up to Rp 1 and only examines tax rows that exist. Missing all tax rows could pass this portion. |
| **A10c** | Strongest database test: trigger existence, injected error text, exit 1, `FAIL-CLOSED`, and identical complete ledger row hashes. Demonstrates rollback for this injected SQL failure. |
| **A11** | **Does not prove “every restore.”** It asserts zero mismatch strings, zero drop-failure strings, and at least one verified restore. It ignores restore errors, absent-hash warnings, and the number of restore attempts. |
| **A12** | Proves no matching stage tables remain in this fixture at this point. Does not prove restored content or cleanliness of other schemas/resources. |
| **A13** | Proves the live **ledger row content** is unchanged over this suite and that the probe reports `sik` afterward. Does not prove live `sik` billing, notes, statuses, other tables, or complete XML bytes were unchanged. |

### A10b’s tax assertion is plainly weaker than its label

The source checks:

```sql
WHERE ABS(ta - ds*0.11) > 1
```

For a subtotal of Rp 2,640:

- exact percentage = Rp 290.4;
- half-up integer tax = **Rp 290**;
- wrong tax **Rp 291 passes**, because the difference is 0.6.

Further, the query starts from existing tax rows. It cannot detect an absent tax row.

The correct test needs a drug-subtotal-driven comparison against the expected rounded amount, including missing and unexpected tax rows.

### The suite itself is not fail-closed

It ends with:

```bash
echo "=== P6 SUITE DONE: PASS=$PASS FAIL=$FAIL ==="
echo "evidence: $OUT"
```

There is no:

```bash
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
```

or equivalent. A normal completion can exit 0 after recording failures.

It also uses `set -u`, without systematic return checking or `pipefail`. Freeze failures are logged but generally not enforced before continuing.

**This is a P6-introduced acceptance-runner defect. A CI caller cannot trust its process status.**

---

# 3. Targeting and live-state preservation

## The target repair is credible

The current suite calls:

```bash
$DBXML retarget ${FX}
```

and requires:

```text
RETARGET-VERIFIED sik_p6f
```

The form subsequently produces the expected response to a **clone-local** `biaya_obat` mutation. The strata re-check uses newly authored clone visits and records successful form billing. This is substantially better target evidence than merely passing `--db-name`.

The transcript also records:

> `harness+consumer database.xml -> sik_p6f`

and final restoration to `sik`.

**I accept current-run clone targeting as supported by the combined configuration and behavioral evidence.**

## “Live state proven untouched” is not supported

A13 hashes only:

```python
SELECT * FROM dr_charge_ledger
```

in `sik_bench`.

It does not hash live:

- `billing`;
- `nota_jalan` / `detail_nota_jalan`;
- payment/receivable tables;
- `reg_periksa.status_bayar`;
- other harness-written state.

A form accidentally writing to live `sik` could leave the ledger hash unchanged.

Nor does restoring the decrypted DATABASE value prove exact restoration of the entire XML files.

The historical B count changes from 149 to 151 notes:

\[
49,903,019-49,738,954=\text{Rp }164,065.
\]

That is not proof P6 caused the change. It is proof that **broader stability cannot be inferred from the ledger guard**.

## The orchestration remains unsafe outside the demonstrated serial run

- `FX` is overrideable, with no enforced rejection of `sik` or `sik_bench`.
- The suite globally switches both XML configurations.
- It globally executes `pkill -f BilingHarness`.
- It deletes `/opt/dr-benchmark/results/r6_*`.
- There is no global configuration/target ownership lock.
- Cleanup restores configuration before killing remaining matching harness processes.

These are not disposable-target guarantees.

Also, despite “all tool sources” being requested, the embedded package omits:

- `p6_run_suite_fresh.sh`;
- `stagea_common.py`, which implements actual XML backup/retarget/restore;
- the harness and consumer sources used to establish write provenance.

Their hashes or references do not substitute for their contents.

---

# 4. Builder and reconciliation gates: concrete findings

## 4.1 ALL SQL is fixed; cohort replacement is not

All three `window_predicate()` functions now return valid SQL:

```python
return "1=1"
```

for `ALL`. Combined with the registration cohort predicate, source selection includes all 86,455 DR visits, including the 354 Stage-A visits.

**The former syntax and generated-prefix selection bugs are fixed in code.**

However, the builder DELETE is:

```python
sess.exec("START TRANSACTION; DELETE FROM dr_charge_ledger WHERE "
          + ("1=1" if args.window == "ALL"
             else "no_rawat LIKE '2026/10/%'") + ";")
```

The inserts select:

```sql
WHERE <window predicate> AND rp.no_rkm_medis LIKE 'DR%'
```

The DELETE does **not**.

### Consequence

`--window ALL --cohort dr`:

1. deletes **every ledger row**;
2. rebuilds only DR rows;
3. commits successfully;
4. reports successful “cohort replacement.”

Any non-DR ledger content is destroyed. October mode has the corresponding month-wide scope mismatch.

This may be invisible on the current DR-only ledger, but the exposed `--cohort all|dr` contract makes it a real defect.

**P6’s change to `DELETE ... WHERE 1=1` broadens the destructive scope.** It is not enough to say the builder now uses a shared predicate: the DELETE demonstrably does not.

You need explicit cohort ownership for ledger rows, including stale rows whose registrations no longer exist—not just a convenient broad DELETE.

## 4.2 Atomic replacement is genuinely improved and demonstrated

The transaction now follows one mysql process:

```text
START TRANSACTION
DELETE
registration REPLACEs
procedure REPLACEs
drug REPLACEs
tax REPLACEs
COMMIT
close()/wait for mysql status
```

Tax now comes from the current build:

```python
drug_sub[nr] = drug_sub.get(nr, 0) + amt
...
tax = irup(float(s or 0) * 0.11)
```

It no longer re-reads uncommitted ledger rows through another connection.

The transcript is meaningful:

> `ERROR 1644 ... p6 A10c injected mid-build failure`

followed by equal scratch ledger hashes:

> `356355:504531980ca...` before and after.

**Credit this as an actual atomicity repair and rollback demonstration.**

### Remaining transaction qualifications

- The source reads and tariff load occur through other connections, not one consistent source snapshot.
- Transactional table engines are not explicitly enforced.
- `session.exec(timeout=300)` does not use its timeout; pipe writes can block.
- A connection/process failure after COMMIT creates an **unknown commit outcome**. Reporting failure is appropriate, but claiming definite rollback is not.
- The broad exception handler says “ledger unchanged” without checking. An exception after successful COMMIT—for example in subsequent logging inside the `try`—would make that statement false.

The normal clean-COMMIT false-failure bug appears repaired. Do not generalize the injected pre-COMMIT SQL failure to every possible failure boundary.

## 4.3 The canonical quantity defect is invisible by default

Pinned row:

- quantity = 23;
- unit price = Rp 29,832;
- amount = Rp 745,800.

Arithmetic:

\[
25\times29,832=745,800
\]

\[
23\times29,832=686,136
\]

\[
745,800-686,136=59,664.
\]

The amount is consistent with **25**, not 23.

Default `charge_delta` compares component amounts. `three_count` compares component row counts and amounts. Neither validates this row’s quantity-price-amount relationship.

Only optional `--line-diff` detects the quantity disagreement.

**Therefore default green gates do not support “the canonical ledger is correct” or whole-row reproducibility. They support the narrower amount/count claims.**

## 4.4 Other gate defects remain

### `charge_delta`: “other rows” is actually a net amount

```python
other_total = sum(v.get("other", 0) for v in kx.values())
```

It gates that sum, not row count. Unknown-status rows with zero total, or selected positive/negative rows that net to zero, can escape this gate.

`three_count` does count unknown-status rows, so the combined tools provide some mitigation. The individual gate’s stated property is still wrong.

### `three_count`: PARTIAL exit contract contradicts implementation

It documents exit 0 for a clean A==C with no B. Actual return:

```python
return 0 if (gate_pass and not partial or gate_pass and b_verified) else 1
```

With B absent, `partial=True` and `b_verified=False`, so it returns **1**.

This is not newly proven to be P6-introduced. It remains a current defect.

### “Verified B subset” is too strong

`count_form_save()` declares B verified when any note/receivable content exists. It does not verify:

- per-visit B-to-C equality on the covered subset;
- complete coverage;
- provenance or freshness;
- payment/receivable overlap semantics.

It then compares partial B’s total with **all** C.

That honestly produces a disagreement, but it does not validate subset correctness. Conversely, aggregate equality by coincidence could produce PASS without complete encounter-level equivalence.

### “Integer end-to-end” is false

The builder uses `float()` and:

```python
float(s or 0) * 0.11
```

It also converts malformed numeric values to zero in `irup()`.

Partial tariff coverage silently falls back to source prices. With an unreadable tariff, `--allow-legacy-fallback --require-tariff` is not rejected by the `status == "empty"` check.

These are existing hardening gaps, not all P6 regressions.

### No current asserted ALL gate run is embedded

§17 reports the correct full-cohort totals. The current code supports the fix.

But the supplied acceptance script **never invokes either reconciliation gate**, and A10 uses October. The raw ALL gate transcript and full-rebuild comparison are not embedded.

So the precise disposition is:

- **ALL fix:** verified in source;
- **full-window results:** reported in §17;
- **current machine-asserted ALL regression test:** not supplied.

---

# 5. Oracle recovery still has critical holes

## 5.1 P6 records a source-content hash and never verifies it

`freeze_baseline()` stores:

```python
"source_content_hash": source_content_hash(db, nrs, log)
```

`verify_frozen()` never compares that field with a fresh source hash.

It checks table counts and baseline artifact hashes. A charge-source change preserving counts can pass verification.

Worse, `source_content_hash()` itself:

- omits `detail_pemberian_obat.biaya_obat`, the very field A2 proves affects the bill;
- omits the advertised registration fee;
- swallows query exceptions with `except Exception: pass`.

**P6-2g’s content-drift protection is not implemented as claimed.**

The per-visit manifest-pinned hash and aggregate baseline-hash checks are real improvements. They are artifact-integrity checks, not source-state verification.

## 5.2 Missing restore hash returns success

In `stage_restore()`:

```python
ok = True
if os.path.exists(hpath):
    ...
else:
    log("... NOT hash-verified")
return ok
```

With the hash file absent, restoration returns **True**.

The caller can set `restored=True`, resume billing, or allow stage-table deletion despite explicitly lacking verification.

This directly contradicts:

> “content-hash-verified restore ... on every restore path.”

## 5.3 Failed restore cannot actually resume automatically

Main-loop logic skips FAILED batches:

```python
if not b or b["status"] in ("BILLED", "FAILED"):
    ...
    continue
```

A restore failure sets:

```python
b["status"] = "FAILED"
b["restored"] = False
```

`STAGE-KEEP` preserves evidence—good—but a subsequent ordinary resume skips that batch rather than retrying restoration.

Thus “kept for resume/manual restore” is misleading: **manual restore may be possible; automatic retry is not implemented for that state.**

## 5.4 SIGTERM handling does not establish SIGKILL crash safety

The handled timeout/SIGTERM paths kill the group and check its emptiness. Those demonstrations are valid.

Crash resume instead reads the saved **wrapper PID**, waits while `_pid_alive(hp)`, and eventually removes the PID file. It:

- does not establish process-group death;
- does not kill a surviving group;
- can proceed after its bounded wait even if the PID remains alive;
- cannot detect a JVM surviving a dead wrapper through that PID check.

After an unhandled crash, restoration may therefore race a surviving writer.

**A4b is not a substitute for the original kill-9 crash claim.**

## 5.5 Restoration remains nontransactional

`stage_restore()` performs separate DELETE/REPLACE calls across tables. The builder’s transaction fix does not fix this.

A crash mid-restore can leave partial state. That can be recoverable with a correct journal and retry path—but the requested interrupted-restore test was not executed.

Additional problems:

- Backup rows are copied across separate snapshots.
- The pre-reset hash is taken from live rows after backup, not from a verified immutable backup snapshot.
- `_stage_prefix()` still maps distinct IDs such as `a-b` and `a_b` to the same namespace.
- Per-run locks do not prevent separate runs resetting the same visits.
- `crash_safe=YES` remains unconditionally written into result reports.
- `_bill_date()` still logs “pre-reset state restored” even when `stage_restore()` returned false.

These are not cosmetic defects.

---

# 6. §17 disclosure: valuable, but incomplete

## What deserves credit

The owner explicitly admits:

- v5’s SQL finding was correct;
- previous scratch-form targeting was wrong;
- some fixtures were registration-only;
- the pinned ledger contains a quantity defect;
- full-row byte reproducibility does not hold;
- an earlier test polluted the live ledger;
- earlier clone-mode evidence is not individually rehabilitated.

That is materially better than defending the old narrative.

## What still needs correction

### The current report remains a contradictory document

Examples still present:

- §11 says the ledger was rebuilt “byte-for-byte.”
- The manifest table says “byte-for-byte reproducible,” then a note narrows it.
- §14 still carries “No live-DB mutation in P4.”
- §15 still relies on the original P4 populated-clone evidence.
- §5 says three raw-billing queries; §12 says six.
- The oracle header still says `database.ini` configures the harness.
- The task document still calls the ALL finding a misread.

Preserving historical text is fine **if unmistakably marked superseded**. Leaving it as current prose beside later corrections is not a clean close-out.

### Whole-row reproducibility has been withdrawn, not repaired

The disclosed 260,800 `source=NULL` rows are approximately:

\[
260,800/356,355 \approx 73.19\%.
\]

Together with the quantity defect, that is not a byte-identical ledger reproduction.

The supported narrower claim is **matching keys, amounts, and unit prices**, as reported in §17. That comparison still needs its actual machine-checkable artifact supplied.

### Historical clone evidence has a larger blast radius

The scope note correctly invalidates pre-P6 clone-form claims. But it also requires reconsideration of:

- P1 clone crash/recovery demonstrations;
- P4 edge-strata results;
- clone consumer runs using the same ineffective configuration method;
- the cold-scratch burst characterization.

P6 does not individually re-verify those historical experiments.

### ZEROFEE/HALFPPN wording is imprecise

Fee and PPN values do not themselves exclude a visit under `eligible()`.

But registration-only fixtures fail:

```python
(n_dpo + n_proc) > 0
```

The actual A7 `STRATA-ZEROFEE` fixture is therefore not made in-envelope merely by being called zero-fee. “These financial properties are not exclusion criteria” is accurate; “these current fixtures are in-envelope” is not.

### Form-write provenance needs reconciliation

The report repeatedly says the form writes notes, **not billing**.

Yet the current workflow resets `billing`, runs the harness, then finds nonempty billing rows and compares them. The strata transcript explicitly labels these:

> “form billing rows after the run”

This does not by itself establish independent settlement equivalence. But it does mean the categorical write-path explanation is incomplete or wrong for the exercised workflow. Supply the harness/consumer source and identify the actual writer.

For embalase/tuslah, the safe conclusion is:

> Under these two authored mutations and this harness configuration, the observed bill did not change.

The authoring script changes `embalase`/`tuslah` without rebuilding every derived source field. That is insufficient to generalize to “these charges never reach outpatient billing in this configuration.”

---

# 7. Arithmetic and claim boundaries

Several headline figures reconcile correctly:

- \(86,101+354=86,455\).
- \(34,870,243,633-34,727,295,800=142,947,833\).
- \(34,895,128,580-34,870,243,633=24,884,947\).
- The monthly visit table sums to **86,455**.
- Its billing-row column sums to **1,393,815**, matching the stated predicate

## ORACLE-VALIDITY

# v6 verdict: **Needs targeted rework — 55/100**

**P6 is real progress. It is not the comprehensive acceptance proof its “18/18 PASS” label suggests.**

The persistent-session builder, timeout process-group handling, structured rejection paths, and correctly retargeted form runs are substantial repairs. Unlike v5, there is credible execution evidence for several important normal and injected-failure paths.

But three release-blocking facts remain:

1. **The suite itself can exit successfully with failed checks.**
2. **Recovery still has paths that accept unverified restoration or resume without proving the writer group dead.**
3. **The suite proves the live ledger unchanged—not live `sik` unchanged, and not complete fixture restoration.**

**Residual oracle score: 5/10.** Suitable for tightly supervised, disposable-clone experiments. Not a crash-safe release candidate.

I assessed the embedded source and transcripts; I did not independently execute them. Also, despite the “all sources” framing, **`p6_run_suite_fresh.sh`, `stagea_common.py`, and the Java harness/consumer sources are not embedded**. Their implementations cannot be verified here.

---

## 1. Scores

| Criterion | v5 | v6 | Assessment |
|---|---:|---:|---|
| Claim-honesty | 5 | **6** | §17 makes consequential admissions, including that v5 was right. However, current report banners, rubric claims, and manifest language still contradict the corrected evidence. |
| Gate-correctness | 3 | **6** | ALL predicates and persistent-session replacement are fixed. Rollback is exercised. Remaining defects include overbroad deletion, misleading tax assertions, and a suite that does not propagate failure. |
| Oracle-validity | 3 | **5** | Controlled drift and populated restore paths now have meaningful evidence. Frozen source-content verification is not implemented as advertised; recovery still has unsafe exceptions. Independence remains limited. |
| Reproducibility | 6 | **6** | Current tool hashes and a rerun improve provenance. Missing dependencies, global configuration mutation, absent asserted pin comparisons, and invalidated historical runs prevent an increase. |
| E2E-design | 5 | **6** | Verified XML retargeting and populated real-form runs materially strengthen the narrow hybrid experiment. Same-encounter financial settlement equivalence remains unproved. |
| External-validity | 4 | **4** | No new external calibration, representative workload evidence, or second-environment validation. Scope discipline is not external evidence. |

\[
(6+6+5+6+6+4)\frac{100}{60}
=\boxed{55/100}
\]

**Change:** +12 versus v5/v4’s 43; +20 versus the first assessment’s 35.

---

## 2. Disposition of every v5 finding

| v5 finding | v6 disposition |
|---|---|
| **Fail-open exit / unconditional BILLED** | **Ordinary oracle path repaired and demonstrated.** BILLED still requires `rc == 0 and all(sukses.get(v, False)...)`. A2 demonstrates exit 1; A3 demonstrates exit 4. Administrative exit-0 qualification is now explicit. **The acceptance shell introduces its own fail-open exit problem.** |
| **Attempt-based not-covered classification** | **Fixed and now demonstrated on successful real-form output.** A3’s four CSV rows are `OUT-OF-ENVELOPE,...,BILLED`; two additional authored fee strata also bill successfully. This is materially better than the invalid P4 narrative. |
| **Manifest existence presented as independent control** | **Closed by withdrawal, not replacement.** No independent pre-adapter encounter oracle has been added. |
| **Overstated line-diff scope** | **Still partly open.** The report admits component quantity aggregation; source still falsely says reallocating quantities between codes “still shifts” the component total. It need not. |
| **Report inconsistencies** | **Partially corrected, not closed.** §17 fixes important facts, but stale claims remain elsewhere: blanket crash-safety, byte-for-byte ledger reproduction, P4 no-live-mutation, inconsistent raw-billing query counts, and the task document’s claim that the SQL finding was a misread. |
| **Global stage-table interference** | **Stage dimension fixed; full isolation not fixed.** Prefix includes stage, demonstrated sequentially by A9. Sanitization collisions remain, and different stages/runs can still reset the same live rows concurrently under separate locks. |

### v5 “new problems”

- **Root-dependent DDL:** remains. Neither oracle nor suite enforces a disposable-target allowlist. `DBUTIL_FORCE_ROOT=1` remains powerful enough to damage live state.
- **Java target mismatch:** corrected for the demonstrated P6 orchestrations through XML retargeting. **Not corrected in the standalone oracle interface:** `--db-name` still does not configure or validate the Java target. Its header still incorrectly references `database.ini`.
- **Cleanup/restoration overclaims:** reduced, not eliminated. Verified drop checking is real; missing-hash restoration still returns success.
- **False transaction:** genuinely fixed in the builder’s implementation.
- **Broken ALL SQL:** genuinely fixed in both gate sources. `ALL` now returns `"1=1"`.
- **Recovery/fixture contradictions:** the hollow fixture and wrong target have been disclosed and replaced for current demonstrations. Earlier results are not thereby rehabilitated.

### v5 top-three issues

1. **Database primitives:** largely repaired, but replacement still deletes beyond the selected cohort.
2. **Populated-clone recovery suite:** delivered, but substantially narrower than the predeclared acceptance contract.
3. **Evidence chain:** improved, still incomplete. Current execution is more credible; historical clone claims, full live-state safety, and settlement equivalence remain unresolved.

---

## 3. What the acceptance suite actually proves

**Printing a line is not asserting it.** Several checks violate the summary’s statement that every check asserts the named gate line and exit code.

| Check | Actual assertion and evidentiary judgment |
|---|---|
| **A0** | Asserts five `STRATA-` registration rows. Does not assert their dates, source charges, billing, or reference-table completeness. Useful precondition, not populated financial-strata proof. |
| **A1** | Asserts **only `RC == 0`**. The `grep` output is not a condition. Given the reviewed ordinary billing path, this supports a clean comparison, but it does not independently assert two BILLED visits, nonempty baseline, or zero drift. |
| **A2** | Asserts **exit 1 and no traceback**, not `ORACLE_FAIL`, drift count, or expected changed rows. The transcript nevertheless prints `ORACLE_FAIL: exit 1` and `drift_visits=1`, supporting this particular execution. A future parse-error failure could satisfy the check. |
| **A3** | Asserts exit 4, no traceback, no restore mismatch. **It no longer tests the planned forced JVM exit 3.** Exit 4 could come from failed billing or cleanup. |
| **A6** | Counts four OOE CSV lines. Does not assert they are BILLED or successful. **The embedded CSV does show all four BILLED with `True,0`**, so this run provides stronger evidence than its assertion. |
| **A4** | Good targeted check: exit 4, group-empty proof, verified restore, no matching harness processes. Does not exercise stubborn SIGTERM-resistant children or prove SIGKILL escalation occurred. |
| **A4b** | Good targeted SIGTERM-handler check: matching processes existed, became absent, group proof appeared, resume restored and exited 0. `pgrep -f BilingHarness` counts matching processes, **not necessarily three JVMs**. |
| **A5** | Good: named `MISSING-REG` rejection, exit 2, no traceback. Specifically exercised with `--allow-strata` to reach that gate. |
| **A7** | Proves empty-baseline freeze rejection and administrative override. **Does not test a subsequent missing-settlement billing comparison.** |
| **A8** | Proves SIGTERM after reset, followed by verified restore and successful rebill. **Not interruption during restore; not SIGKILL recovery.** |
| **A8b** | Proves rejection of a supplied sample reduced from two visits to one. It binds against stored batches, not an independently authenticated manifest. |
| **A9** | Proves distinct B3/B2 prefixes and successful drops **sequentially**. Does not assert either run’s exit code or test overlapping execution. |
| **A10** | Exit 0 plus commit line, supported by actual persistent-session code. Credit warranted. |
| **A10b** | Demonstrates removal of the planted stale visit. Its tax assertion is materially weaker than advertised; see below. |
| **A10c** | Strongest database test: trigger existence, named injected MySQL error, failure exit, and equal full-ledger pre/post hashes. Supports rollback for this path. |
| **A11** | Does **not** prove “every restore” was verified. It requires zero mismatch lines, zero drop-failure lines, and **at least one** verified restore. It does not reject `STAGE-RESTORE-ERROR` or “NOT hash-verified.” |
| **A12** | Proves zero matching stage tables at that moment. Does not prove output restoration or prevent unsafe deletion of recovery material. |
| **A13** | Proves equal live **ledger** hashes and XML DATABASE values back on `sik`. **Does not hash any live `sik` output table.** |

### A1/A2: useful evidence, but stop calling it an independent consumer replay

A2 changes the clone’s source:

```sql
SET biaya_obat=biaya_obat+1000, total=total+1000*jml
```

The transcript then shows:

> `ORACLE_FAIL: exit 1`  
> `drift_visits=1`

This is credible evidence that the form responds to the changed drug-price input and the oracle detects disagreement with frozen billing rows.

However, **A1 has already reset and re-billed those same visits through the form before A2 freezes them**. A2 therefore uses existing output from the preceding form run as its baseline. It is a useful controlled differential test—not a fresh independent consumer-versus-form financial validation.

The cleanup rebill exits 1 as expected, but its result is merely printed, not asserted.

### A10b: the tax test can pass with missing or wrong tax

Its predicate is:

```sql
WHERE ABS(ta - ds*0.11) > 1
```

That is not exact half-up equality.

- Drug subtotal 100 → expected tax 11.
- Tax 10 or 12 both pass this test.
- **No tax rows at all also produces zero inconsistent tax rows**, because the query starts from existing tax rows.

Thus:

> “every window tax row = 11% of its own drug subtotal”

is not established. Require a drug-subtotal-driven comparison that detects missing/extra tax rows and exact integer half-up amounts.

### The suite’s own exit contract is broken

The script ends with:

```bash
echo "=== P6 SUITE DONE: PASS=$PASS FAIL=$FAIL ==="
echo "evidence: $OUT"
```

There is no:

```bash
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
```

or equivalent.

**A run with FAIL > 0 ordinarily exits 0.** `set -u` is not fail-on-error, and the script lacks `pipefail`. A wrapper that trusts its process status can report success for a failed acceptance run.

That is a P6-introduced enforcement defect, not a documentation quibble.

---

## 4. Target correctness and live-state safety

### Current form targeting: credible, narrowly

The suite retargets before launching fresh harness processes and logs:

> `harness+consumer database.xml -> sik_p6f (RETARGET-VERIFIED; restored by EXIT trap)`

The retarget helper explicitly probes both configured copies. A2’s clone-only source perturbation producing observed drift provides additional behavioral support.

The authored `890001`/`890002` visits in the strata recheck also successfully bill after clone retargeting. That is much better target evidence than editing an unused INI file.

**I accept the current runs as credibly clone-targeted.** The absent `stagea_common.py` and harness implementation prevent a complete end-to-end source audit of that mechanism.

### “Live untouched”: not proved

A13 compares:

```bash
LIVE_LEDGER_PRE=$(ledger_hash sik_bench)
LIVE_LEDGER_POST=$(ledger_hash sik_bench)
```

The form writes in **`sik`**, not that ledger.

Those hashes would remain equal if the harness changed live billing, notes, receivables, or payment status. Restoring the XML target afterwards does not undo or detect such writes.

The report itself supplies a warning:

- B: 149 → 151 notes.
- Amount: Rp 49,738,954 → Rp 49,903,019.
- Difference: **2 notes / Rp 164,065**.

That does not establish P6 caused the change. It establishes that historical B-state stability cannot be asserted.

**Required distinction:** “live ledger unchanged” is demonstrated; “live database untouched” is not.

---

## 5. Residual oracle risks, ranked

### 1. Recovery still accepts a missing verification artifact — **critical**

`stage_restore()` initializes:

```python
ok = True
```

If its pre-reset hash file is absent, it logs:

> `NOT hash-verified`

but returns `ok`, still **True**.

Consequences:

- Resume can proceed to reset and rebill after an unverified restore.
- Failed-batch handling can set `restored=True`.
- Finalization can drop the stage tables.

This directly contradicts the claimed contract that unverified restoration keeps recovery material.

**Fix:** absent, malformed, or unreadable hash evidence must return false; no rebill or drop.

### 2. Hard-crash resume does not prove the writer group dead — **critical**

Timeout handling is genuinely group-level:

```python
os.killpg(pgid, sig)
```

and the demonstrated timeout/SIGTERM paths are creditable.

Resume is different:

```python
if _pid_alive(hp):
    for _ in range(240):
        if not _pid_alive(hp):
            break
        time.sleep(5)
os.remove(pidf)
```

Problems:

- It checks the recorded wrapper PID, **not the process group**.
- After roughly 20 minutes it proceeds even if that PID remains alive.
- A dead wrapper with a surviving JVM can bypass the wait.
- SIGKILL bypasses `_on_terminate`.

Thus the old “restore underneath a surviving writer” hazard remains on hard-crash resume.

**Fix:** persist and validate process-group identity; kill/reap/prove group empty before any restore. Failure to prove death must block recovery.

### 3. Frozen source-content verification is advertised but absent — **high**

Freeze stores:

```python
"source_content_hash": source_content_hash(db, nrs, log)
```

**`verify_frozen()` never checks it.**

Moreover, the hash function:

- Omits `detail_pemberian_obat.biaya_obat`, the field A2 proves affects the form.
- Omits the advertised registration-fee content.
- Swallows source-query exceptions with `except Exception: pass`.

The per-file and aggregate baseline checksum checks are real improvements. **Source-content binding is not.**

A same-count source change after freeze is not rejected as promised. A resumed DONE run can recompare existing billing while accepting changed source content.

### 4. Restore remains nontransactional, and failed recovery is not automatically retried — **high**

Restoration still does separate sessions:

```python
DELETE FROM ...
REPLACE INTO ...
```

across twelve tables and registration status. Interruption can leave partial state.

Keeping stage tables helps, but resume explicitly skips `FAILED` batches:

```python
if not b or b["status"] in ("BILLED", "FAILED"):
    ...
    continue
```

So the advertised “kept for resume” recovery path does not automatically retry a failed restore.

Also, after a false restore result, `_bill_date()` still logs:

> `pre-reset state restored`

and the report writer still labels failed batches as restored. Those statements are false on the error path.

### 5. Namespace separation is not encounter isolation — **high**

Different stages and run IDs have different locks but can target the same visits. Both can snapshot, delete, bill, and restore over one another.

A9 is sequential and cannot detect this.

Sanitization also remains collision-prone:

```python
re.sub(r"[^A-Za-z0-9_]", "_", ...)
```

For example, distinct run IDs containing `-` and `_` can map to the same SQL prefix while retaining separate filesystem locks.

### 6. Global orchestration can damage unrelated runs — **high**

The suite:

- Accepts arbitrary `FX`.
- Uses root.
- Mutates shared XML configuration without a global lock.
- Deletes `results/r6_*`.
- Uses global `pkill -f BilingHarness`.
- Ignores cleanup failures.

These are supervised-lab assumptions, not safe release behavior. An EXIT trap also does not survive SIGKILL or host failure.

### 7. Backup/hash and artifact guarantees are weaker than stated — **medium**

Stage backup and subsequent live-content hashing are not one consistent database snapshot. A concurrent writer can make the staged rows differ from the recorded pre-reset hash.

The hash file is also per stage prefix rather than per batch, and written without the atomic state-file pattern. The tested single-interrupted-batch path works; broader recovery guarantees need explicit testing.

**Oracle score: 5/10.** The tested happy path and cooperative interruption paths work. The untested failure boundaries still contain concrete defects.

---

## 6. Additional gate defects exposed by this review

### Builder DELETE ignores `--cohort`

The replacement deletes:

```python
"1=1" if args.window == "ALL"
else "no_rawat LIKE '2026/10/%'"
```

but inserts using the cohort predicate.

Therefore **`--window ALL --cohort dr` deletes every ledger row and reinserts only DR rows**. A mixed ledger loses non-DR content. October mode has the analogous scope problem.

This is atomic destruction, not correct cohort replacement. A10b’s stale-row removal does not test preservation outside the selected cohort.

### “Integer end-to-end” remains overstated

The builder uses:

```python
f = float(x or 0)
tax = irup(float(s or 0) * 0.11)
```

Malformed values can become zero. Missing individual tariff entries still fall back to source prices despite the broad “fail-closed authority” description.

Use exact integer/decimal arithmetic and distinguish table-level availability from complete tariff coverage.

### Three-count B is presence-detected, not equivalence-verified

`b_verified` means at least one form-save row exists. It does not establish:

- full encounter coverage;
- freshness;
- successful current-run provenance;
- per-encounter settlement agreement.

A coincidentally equal aggregate could produce PASS despite missing or misallocated encounter payments.

The no-B exit contract is also inconsistent: documentation says PARTIAL can return 0, but the actual final expression returns 1 when `partial=True` and B is absent.

### Amount and quantity gates retain blind spots

- Component-total quantity checks cannot detect reallocations preserving component totals.
- `charge_delta` tests the **sum** of unknown-status amounts, not their row count. Offsetting unknown amounts can cancel.
- Both reconciliation tools derive their encounter universe from current registrations; neither substitutes for an independently pinned expected encounter set.
- The current acceptance suite does not execute either reconciliation gate, including `--window ALL`.

The ALL source fix is verified by inspection. Its reported full-window live results are **§17 execution claims**, not an embedded asserted gate transcript.

---

## 7. §17 disclosure: valuable, but not complete

### The ledger defect changes the claim

The arithmetic is unambiguous:

\[
25\times29{,}832=745{,}800
\]

\[
23\times29{,}832=686{,}136
\]

The pinned row’s amount exceeds its own quantity-times-price by **Rp 59,664**.

Consequently:

- Amount reconciliation can remain valid.
- Current quantity reconciliation is not green.
- Whole-row byte-for-byte reproduction is false.
- The canonical ledger needs a versioned correction or an explicit retained-defect designation.

The 260,800 NULL-source rows are approximately **73.19%** of the 356,355-row ledger. That is a major provenance discontinuity, not a minor metadata exception.

The manifest’s phrase:

> “‘Byte-for-byte’ now holds for keys/amounts/prices”

should be replaced with **“the key/amount/unit-price projection matches.”** Byte-for-byte reproduction of a ledger means the ledger, not selected columns.

### Historical clone claims must stay withdrawn

§17 correctly invalidates the claimed clone isolation of earlier INI-retargeted runs. That affects crash-safety and edge-strata evidence, not just deployment instructions.

It does **not** follow that every historical numerical result is false. It follows that those runs cannot substantiate their claimed target, isolation, or restoration guarantees without revalidation.

The P4 cold-scratch consumer throughput claim also needs a target audit: the newly disclosed configuration mechanism applies to the consumer too.

### Edge strata: classification now credible; financial coverage still incomplete

For embalase/tuslah, the displayed bill sums to:

\[
10{,}000+75{,}000+2{,}640+290=\boxed{87{,}930}
\]

Neither Rp 2,500 nor Rp 1,500 reaches that observed bill. Thus:

- Successful form execution: demonstrated.
- Eligibility-based OOE classification: demonstrated.
- Financial handling of these fees: **not demonstrated as correct**; this configuration omitted them from the observed bill.
- HALFPPN and ZEROFEE: still not re-tested.

Also, `p6_strata_recheck.sh` prints most outcomes rather than asserting them, and its embedded cleanup does **not drop the clone database**.

### Remaining stale claims matter

The document still contains, among others:

- Blanket `crash_safe=YES` output.
- “Complete” restoration language.
- “Three” versus “six” raw-billing-query statements.
- Original P4 no-live-mutation assertions.
- Original ledger byte-for-byte claims.
- The task’s erroneous dismissal of the SQL finding.

Append-only corrections are useful audit history. They are not a substitute for a clean current claim register.

---

## 8. Numerical reconciliation

The principal cohort and revenue bridges are consistent:

- \(86,455-86,101=354\), about **0.409%** of all DR visits.
- Rp \(34,870,243,633-34,727,295,800=142,947,833\).
- Rp \(34,895,128,580-34,870,243,633=24,884,947\).
- The twelve monthly visit counts sum to **86,455**.
- Their displayed billing-row counts sum to **1,393,815**.

Those arithmetic matches do not independently prove the asserted identities of the extra visits or predicate bridges.

Performance arithmetic is approximately consistent:

- \(86,101/47.8\approx1,801.3\) visits/min.
- \(47.8\times60,000/86,101\approx33.31\) ms/visit.
- \(999\times60/8,393\approx7.142\) form visits/min.
- Consumer/form throughput ratio ≈ **252×**.

The “rule of three” gives \(3/999\approx0.3003\%\), but **not a justified population drift bound for selected, stratified, eligibility-filtered visits without the necessary sampling assumptions**.

---

## 9. Release decision and next step

**Do not sign off the original P6 acceptance contract as fully satisfied.**

The delivered suite omitted or weakened several predeclared requirements:

- Forced nonzero JVM failure replaced by OOE execution.
- Mid-restore interruption replaced by post-reset interruption.
- Full pre/post state restoration replaced by selected restore-event hashes.
- Concurrent overlap testing replaced by sequential prefix checking.
- Exact tax checking replaced by a tolerant, missing-row-blind query.

These are legitimate scope changes only if labeled as such—not counted as equivalent proof.

### Top three next actions

1. **Repair recovery semantics:** missing hash must fail; FAILED/unrestored batches must be retryable; hard-crash resume must prove group death; no recovery material may be dropped before verified restoration.
2. **Repair the acceptance harness:** nonzero suite exit on failure, disposable-target enforcement, isolated configuration/process cleanup, exact assertions, and live `sik` plus fixture state guards.
3. **Run one stronger current-pinned suite:** SIGKILL with surviving child, interruption during restore, missing/corrupt hash, restore/drop failure, overlapping visits, non-DR preservation, missing tax rows, and post-freeze source-content mutation.

**Bottom line:** P6 earns a meaningful score increase because several repairs are now executable and demonstrated. It does not earn “crash-safe,” “live untouched,” “every restore verified,” or “acceptance complete.” Those remain claims ahead of the implementation.

## REPRODUCIBILITY

# v6 verdict: **Needs targeted rework — 52/100**

**P6 is real progress. It is not the acceptance closure claimed.**

The persistent-session builder and injected rollback test are substantial fixes. The timeout/SIGTERM tests now exercise real recovery behavior on a plausibly correct clone target. The disclosures also correct major historical misstatements.

But **“18/18 PASS” overstates the coverage of the acceptance criteria**:

- Several checks do **not** assert the named verdict line or even the command’s exit status.
- The suite itself can finish **exit 0 with failed checks**.
- Its “every restore verified” assertion does not establish that.
- It never proves live `sik` was unchanged.
- Frozen source-content verification is advertised but **not implemented in `verify_frozen()`**.
- Missing restoration hashes are accepted as successful restoration.
- Crash-resume still lacks a reliable writer-dead barrier.
- The builder’s replacement DELETE ignores `--cohort`, with particularly destructive consequences under the newly widened `ALL` scope.

**The engineering has improved more than the release claims have. Stop treating the summary count as the acceptance specification.**

**Evidence boundary:** This is a source/transcript assessment, not an independent execution. The supplied material omits `p6_run_suite_fresh.sh`, `stagea_common.py`, and the Java harness/consumer sources. The §17 full-window and full-ledger rebuild results are reported findings, not embedded raw execution transcripts.

---

## 1. Scores

| Criterion | v5 | v6 | Assessment |
|---|---:|---:|---|
| Claim-honesty | 5 | **6** | Meaningful retractions and disclosure of the ledger defect deserve credit. Blanket acceptance, restoration, isolation, and reproducibility statements still exceed the evidence. |
| Gate-correctness | 3 | **5** | ALL predicate syntax is fixed; builder transaction/rollback is demonstrated. Cohort-destructive DELETE, source-verification omissions, restoration fail-open behavior, and suite exit handling remain serious defects. |
| Oracle-validity | 3 | **4** | Frozen output comparison and positive recovery hash evidence improve the oracle. Source hashes are not checked; B is not encounter-reconciled; aggregate quantity checks retain blind spots; the pinned ledger is known inconsistent. |
| Reproducibility | 6 | **6** | Better pins, an executable suite, documented XML targeting, and transaction evidence. Missing dependencies, an unembedded fixture wrapper, unenforced pins, absent fixture hashes, and nonidentical ledger rebuild prevent an increase. |
| E2E-design | 5 | **6** | Current clone-targeted form runs provide better causal evidence, particularly A2 and the authored edge visits. Still a hybrid benchmark without same-encounter settlement equivalence or comprehensive recovery isolation. |
| External-validity | 4 | **4** | No new calibration, representative workload, second configuration, or cross-machine evidence. Better disclaimers do not create external validity. |

\[
(6+5+4+6+6+4)\frac{100}{60}
=51.67 \rightarrow \boxed{52/100}
\]

**Change:** +9 versus v5/v4’s 43; +17 versus the original 35.

**Reproducibility specifically: 6/10.** Same-box replay is materially more feasible. Independent reconstruction and safe replay are not established.

---

## 2. Disposition of every v5 finding

| v5 finding | v6 disposition |
|---|---|
| **1. Fail-open exits / unconditional BILLED** | **Ordinary oracle execution remains fixed and now has stronger execution evidence.** `_bill_date()` requires `rc == 0 and all(sukses.get(v, False) for v in nrs)`. A2 shows `ORACLE_FAIL: exit 1`; A3’s CSV shows four `BILLED`, `True`, rc=0 visits classified out of envelope. Administrative exit-0 modes are now explicitly qualified. **Universal fail-closed behavior is not established:** restoration can accept a missing hash, and the acceptance script itself does not propagate failures. |
| **2. Attempt-based not-covered classification** | **Fixed in code and demonstrated.** A3/A6 classify successfully billed visits as `OUT-OF-ENVELOPE`, rather than relying on failure to bill. The embalase/tuslah transcript supplies further positive evidence. **The five original P4 edge cases remain unproven as a group.** ZEROFEE/HALFPPN were not re-tested. |
| **3. Manifest existence misrepresented as independence** | **Closed by withdrawal, not by adding independence.** Builder flags are absent; the shared-source limitation remains. No independently pinned pre-adapter charge manifest was delivered. |
| **4. Overstated line-diff scope** | **Still only partially corrected.** Report prose acknowledges component quantity aggregation, but source still asserts that “a quantity re-allocated between codes within a component still shifts” the total. That is false when the reallocation preserves the total. The newly disclosed 23-versus-25 row is a detectable case, not evidence of code-level coverage. |
| **5. Report inconsistencies** | **Improved, not closed.** XML targeting, obsolete pins, ALL syntax, and the latent ledger defect are disclosed. Contradictions remain in executable assertions, restore claims, manifest wording, query counts, P4 burst validity, and historical crash/clone evidence. |
| **6. Global stage-table interference** | **Stage dimension fixed; collision and overlapping-write risks remain.** `_stage_prefix()` includes stage. A9 demonstrates separate B3/B2 names sequentially. Sanitization still aliases distinct IDs, and locks remain per run/stage rather than per database/visit. Different tables do not prevent two runs from resetting the same live rows. |

### v5 follow-up subfindings

- **Header-only FAILED results:** fixed in source; `_finalize()` emits non-BILLED rows. The supplied summary does not expose the failed-batch CSVs, so the current run does not separately demonstrate their exact contents.
- **CREATE privilege failure:** the root DDL path is present and staging now succeeds in the transcript. But the suite exports `DBUTIL_FORCE_ROOT=1`, so it does **not** test the claimed mixed-privilege live path.
- **`REPAIR-SKIPPED`:** moved to a reachable non-BILLED branch. No suite assertion checks it. Worse, its invitation to use `--repair-consumer` is misleading: actual repair remains inside the BILLED branch under `if not ok_flag`, which fresh BILLED batches cannot satisfy.

### v5 “new problems”

| Problem | Current status |
|---|---|
| Root-dependent DDL without a disposable-target guard | **Open.** Neither the builder nor suite enforces a safe target. `FX` is externally configurable; setting it to `sik` would be dangerous. |
| `--db-name` does not configure Java target | **Fixed operationally for the supplied P6 orchestration, not in the oracle interface.** The oracle still depends on a separate global XML mutation and even retains the obsolete `database.ini` claim in its header. |
| Incomplete stage isolation | **Partially fixed**, as above. |
| Guaranteed cleanup/restoration overclaims | **Still open**, with concrete fail-open cases below. |
| False transactional replacement | **Fixed for the demonstrated target transaction.** A10c provides strong rollback evidence. |
| Broken ALL predicates | **Fixed in current source.** §17 reports successful full-window execution, but that execution is not an assertion in the embedded suite. |
| Recovery/fixture contradictions | **Some corrected, others remain.** The full clone resolves the hollow-fixture problem; the recovery matrix is still incomplete. |

---

## 3. What the acceptance suite actually proves

The statement that **“each check asserts the gate’s own log line AND the exit code” is false.** Printing a line is not asserting it.

### Check-by-check audit

| Check | Actual assertion and demonstrated property | What it does not prove |
|---|---|---|
| **A0** | Exactly five `STRATA-%` registration rows exist. | Dates resolved, FK completeness, financial content, or five genuine edge fixtures. |
| **A1** | Only `RC == 0`. Current oracle control flow makes this useful evidence of a clean billing run. | No machine assertion of BILLED count, visit count, nonempty baseline, or zero-drift line. Freeze status is printed, not enforced. |
| **A2** | `RC == 1` and no `Traceback`. Transcript additionally shows `ORACLE_FAIL` and one drift visit. **Good observed mismatch evidence.** | The named oracle line and drift count are not asserted. Expected changed Obat/PPN values are not checked. Cleanup exits 1 and is not validated beyond printing the exit. |
| **A3** | Exit 4, no traceback, no restore-mismatch text. | This is **not the specified forced nonzero-JVM-rc test**. No successful-visit count is asserted. The CSV nevertheless demonstrates four successful bills in this run. |
| **A6** | Four occurrences of `OUT-OF-ENVELOPE` in the CSV. | Five P4 strata, exact visit identities, or successful billing. Those are visible here for four procedure-heavy visits, not enforced by the check. |
| **A4** | Exit 4, `group_empty=true`, at least one verified restore, zero matching harness processes. **Strong positive timeout test.** | A resistant writer requiring SIGKILL, failure to prove death, or timeout after meaningful partial billing. The cap intentionally fires very early. |
| **A4b** | SIGTERM handler proof, matching processes before and none after, exit 4, successful verified-restore resume. **Strong positive handled-interruption test.** | SIGKILL crash recovery or descendants surviving a dead wrapper. “3 java” is also imprecise: `pgrep -f BilingHarness` counts matching command lines, not Java binaries exclusively. |
| **A5** | Exact MISSING-REG line, exit 2, no traceback. **Pass for the named rejection.** | Missing registration without `--allow-strata` reaches the eligibility rejection first; this test deliberately bypasses that. |
| **A7** | EMPTY-BASELINE line and exit 2; administrative freeze succeeds with override. **Pass for the freeze gate.** | Missing-settlement billing execution, subsequent form output, or mismatch detection against an allowed empty baseline. |
| **A8** | SIGTERM after reset, verified restore on resume, exit 0, no matching writer left. | **Not interruption during restoration**, despite the task’s requirement. Not kill -9. No full final pre/post state comparison. |
| **A8b** | Exact RESUME-ABORT line and exit 3 when the sample is reduced. **Pass for that binding case.** | Binding to independently pinned manifest identities, changed eligibility, changed source contents, or changed registration dates. |
| **A9** | B3/B2 backup and verified-drop log lines have separate prefixes. | No concurrency is run; command exit codes are not checked. No collision test or overlapping-visit isolation test. |
| **A10** | Exit 0 and the single-session commit message. Together with source and A10c, supports the transaction fix. | Correct cohort preservation, ALL coverage, or snapshot-consistent source reads. |
| **A10b** | Stale visit absent; no existing tax row differs from raw 11% by more than Rp1. | Exact half-up tax correctness, tax completeness, or absence of missing tax rows. |
| **A10c** | Trigger exists, injected error appears, exit 1, FAIL-CLOSED, exact full scratch-ledger hash equality. **Strongest check in the suite.** | All error paths, nontransactional storage engines, or commit-acknowledgment ambiguity. |
| **A11** | No mismatch string, no drop-failure string, at least one verified-restore string. | **“Every restore verified.”** It neither counts attempted restores nor rejects restore-error, absent-hash, or STAGE-KEEP output. |
| **A12** | Zero stage tables remain on the target. | Restored row contents. Deleting the only recovery copy also yields zero tables. |
| **A13** | Live **ledger** hash equal; XML probes return `sik`. | Live `sik` billing, notes, registration status, source tables, or grants unchanged. Nor does equality prove no temporary mutation occurred. |

### The tax assertion is weaker than its label

A10b uses:

```sql
WHERE ABS(ta - ds*0.11) > 1
```

That is not exact half-up equality. For a drug subtotal of Rp2,640:

\[
0.11 \times 2640 = 290.4
\]

The correct half-up tax is **290**, but an erroneous **291** also passes this predicate.

The query starts from tax rows, so **a missing tax row is invisible**. An empty set of tax rows could satisfy this check.

### The suite is not a failing CI gate

Its ending is:

```bash
echo "=== P6 SUITE DONE: PASS=$PASS FAIL=$FAIL ==="
echo "evidence: $OUT"
```

There is no:

```bash
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
```

or equivalent. Ordinary assertion failures accumulate in `FAIL`, then the final successful `echo` leaves a successful script status.

**Machine-readable text is not machine-enforced acceptance.**

---

## 4. Critical current-code defects

### 4.1 Source-content verification is advertised but never performed

Freeze records:

```python
"source_content_hash": source_content_hash(db, nrs, log)
```

But `verify_frozen()` never reads that field and never calls `source_content_hash()`.

It checks source **counts**, output artifact hashes, and the aggregate artifact hash. A price/content change preserving counts therefore passes verification.

Even the recorded source hash is incomplete:

```python
SELECT d.no_rawat, d.kode_brng, d.jml, d.embalase, d.tuslah,
       COALESCE(b.ralan, -1)
```

It omits:

- `detail_pemberian_obat.biaya_obat`—the actual price input A2 demonstrated;
- `detail_pemberian_obat.total`;
- the registration fee promised by its docstring.

And query errors are swallowed:

```python
except Exception:
    pass
```

**P6-2g is not complete.** The suite has no source-mutation-after-freeze test to catch this.

### 4.2 Missing restoration hashes are treated as successful restoration

`stage_restore()` initializes:

```python
ok = True
```

If its hash file is absent, it logs:

```python
"NOT hash-verified"
```

and still:

```python
return ok
```

The caller can mark the batch `restored=True`, and finalization can drop its recovery tables.

That directly contradicts:

> “a batch whose restore is not verified keeps its stage tables”

It also defeats the intended meaning of STAGE-KEEP. A missing verification artifact must return failure, not successful restoration.

Additional overclaims remain:

```python
"pre-reset state restored, run stops"
```

is logged even when `restored` is false. The generated report also unconditionally prints `crash_safe=YES` and describes FAILED batches as restored.

### 4.3 Crash-resume still does not establish writer death

The new timeout and SIGTERM paths use process groups correctly in the demonstrated cases. Resume does not.

Resume reads a wrapper PID, waits up to 240 × 5 seconds, then removes the PID file and proceeds. It:

- does not verify the process group;
- does not kill the lingering group;
- does not abort if the wrapper remains alive after the wait;
- can miss a surviving JVM if the wrapper has died.

Thus a hard crash can still lead to restore underneath a surviving writer.

Also:

```python
if not b or b["status"] in ("BILLED", "FAILED"):
    ...
    continue
```

means a FAILED batch with an unverified restoration is **not retried on resume**. Keeping tables is better than losing them, but “kept for resume” is not an implemented automatic recovery path for that state.

### 4.4 The builder DELETE ignores cohort

The DELETE is:

```python
"DELETE FROM dr_charge_ledger WHERE "
+ ("1=1" if args.window == "ALL"
   else "no_rawat LIKE '2026/10/%'")
```

There is no cohort predicate.

The insertion queries do apply `cp`.

Therefore:

```text
--window ALL --cohort dr
```

**deletes the entire ledger and inserts only DR rows.**

Likewise, the October build deletes non-DR October rows if any exist. The current DR-only fixture cannot expose this.

The widening to `ALL = 1=1` fixes visit coverage but also widens this deletion hazard. The §17 statement that the builder uses one shared predicate is not true for the DELETE.

Preserving unrelated cohorts while removing orphaned stale keys requires explicit ownership semantics—not just joining current registrations and hoping that covers deleted encounters.

### 4.5 Other gate limitations remain executable, not merely theoretical

- **Unknown-status detection in charge_delta checks money, not row count:**

  ```python
  other_total = sum(v.get("other", 0) for v in kx.values())
  ```

  An unknown-status row with positive `biaya` but zero `totalbiaya` can pass this gate. Offsetting unknown amounts can also cancel. Three-count checks row count, which is stronger, but the charge-delta claim is still wrong.

- **Three-count’s PARTIAL exit contract contradicts its implementation.** It documents exit 0 for A==C with B absent, but its final expression returns 1 in that case.

- **B “VERIFIED” means rows exist**, not that they reconcile to expected amounts for those same encounters. A matching aggregate B total can hide missing visits and offsetting errors. `c_rows_visit` is computed and unused.

- **Tariff authority is not strictly enforced per key.** A nonempty tariff with a missing requested code silently falls back to source prices. That is disclosed in code, but broad “fail-closed on tariff authority” wording is too strong.

- **“No float” money claims are false.** `irup()` uses `float`; tax uses `float(s) * 0.11`; malformed numeric inputs can become zero. This is not exact integer arithmetic throughout.

---

## 5. Target correctness and live-state safety

### Current clone targeting: substantially better evidence

The transcript records:

> `harness+consumer database.xml -> sik_p6f (RETARGET-VERIFIED; restored by EXIT trap)`

`p6_dbxml.py` probes the encrypted DATABASE setting after retargeting. More importantly, A2 changes a **clone-only** source price and observes drift. The authored `890001`/`890002` visits also succeed after being created on the clone. These are stronger causal indicators than a configuration log alone.

I therefore accept that the supplied P6 runs provide **substantially credible evidence of clone-targeted form execution**.

The remaining boundary: `stagea_common.py` and the Java code are absent, so I cannot independently audit the complete configuration resolution chain or output attribution.

### “Live untouched”: not established

A13 hashes only:

```python
SELECT * FROM dr_charge_ledger ...
```

on `sik_bench`.

The historical targeting error affected **`sik`**, especially form output and status tables. Those are not hashed.

The report itself says B changed from:

- 149 notes / Rp49,738,954
- to 151 notes / Rp49,903,019

That is **+2 notes / +Rp164,065**. This does not prove P6 caused the change. It proves the supplied evidence cannot support B stability.

Further safety problems:

- XML retargeting is a global mutable resource with no supplied global lock.
- Cleanup uses global `pkill -f BilingHarness`, not ownership-scoped termination.
- The cleanup trap restores XML before killing matching harnesses.
- No validated disposable-target allowlist exists.
- Neither clone teardown nor restored grants are demonstrated by the embedded suite transcript.
- `p6_strata_recheck.sh` revokes its grant but does **not** drop its fixture.

**Configuration restored is not database restored. Ledger unchanged is not live `sik` unchanged.**

---

## 6. The P6 rubric does not justify an unqualified PASS

| Acceptance criterion | Assessment |
|---|---|
| **AC-1 suite green** | The 18 printed checks are green. **The original test matrix is not fully covered**, and the suite does not return failure when checks fail. |
| **AC-2 structured failures** | **Demonstrated for A5 and the A7 freeze refusal.** |
| **AC-3 transaction** | **Demonstrated for the scratch target**, with a strong trigger rollback test. Cohort preservation remains defective. |
| **AC-4 writer death** | **Demonstrated for cooperative timeout/SIGTERM termination.** Hard-crash resume and forced escalation are not demonstrated. |
| **AC-5 restoration** | **Not satisfied as originally written.** No whole-suite pre/post reset-table equality; A8 is not interruption during restore. |
| **AC-6 no overclaim** | **Not satisfied.** Missing hashes return success; restore logs overstate outcomes; A11 cannot establish universal verification. |
| **AC-7 report/manifest** | Present, but materially inconsistent. |
| **AC-8 records** | Referenced, not embedded sufficiently to audit. |

The AC-5 amendment is understandable: successful form runs legitimately change outputs. But the solution is to **define separate contracts**:

1. aborted batch restores its exact pre-state;
2. successful billing produces expected changed state;
3. disposable fixture is eventually destroyed;
4. live state remains unchanged.

Replacing the original contract with “some verified restores plus a zero-drift re-bill” is not equivalent.

---

## 7. §17 disclosures: valuable, incomplete closure

### Ledger defect: the arithmetic is unequivocal

Pinned row:

\[
23 \times 29{,}832 = 686{,}136
\]

Recorded amount:

\[
25 \times 29{,}832 = 745{,}800
\]

Difference:

\[
745{,}800-686{,}136 = \boxed{59{,}664}
\]

The pinned quantity is two units short—**8% below the source/billing quantity of 25**.

The amount gate legitimately remains green because the amount matches. That does not make the ledger internally valid.

Consequences:

- Withdraw “clean canonical ledger → LINE-DELTA=0.”
- Withdraw whole-row byte-identical rebuild claims.
- Do not rewrite the live ledger merely to make the assessment green. Preserve the defective pin, issue a versioned correction with owner approval, and publish the exact delta.
- Until corrected, describe the pin as **amount-consistent but containing a known quantity defect**.

The 260,800 NULL provenance rows represent approximately:

\[
260{,}800/356{,}355 = \boxed{73.19\%}
\]

of ledger rows. That is a large provenance-label difference, even though it need not alter money.

The manifest footnote discloses this, but its main table still says:

> “P2 builder output, byte-for-byte reproducible”

That statement must be replaced, not rescued by a later qualification.

### ALL correction: credible source fix, incomplete embedded execution proof

Both gate sources now return:

```python
return "1=1" if window == "ALL" else ...
```

That fixes the malformed literal and the 354-visit omission.

The count reconciliation is correct:

\[
86{,}101+354=86{,}455
\]

But the acceptance suite does not invoke either reconciliation gate or run the builder with ALL. Its successful re-run therefore **does not itself validate the new ALL behavior**. §17’s reported run results need their own asserted transcript.

### Earlier clone evidence must be downgraded more broadly

The disclosure correctly invalidates P1/P4 scratch-target claims based on `database.ini`. Its implications need to propagate through the report:

- P1 clone-mode crash-safety evidence cannot continue supporting an unqualified banner.
- P4’s “no live mutation” cannot be inferred from unchanged ledger totals.
- The P4 cold-scratch consumer burst is also suspect: the report says the **consumer** reads XML, but the scope correction discusses pre-P6 **form** runs. The manifest still promotes the 916 v/min cold-scratch result without resolving this targeting question.
- Historical 999-visit evidence must be tied explicitly to its actual target/configuration. Do not assume it is invalid, but do not let an unresolved clone narrative authenticate it.

### Edge strata: keep the corrected narrow claim

The recheck bill totals are:

\[
10{,}000+75{,}000+2{,}640+290
=\boxed{87{,}930}
\]

for each authored visit. Neither Rp2,500 embalase nor Rp1,500 tuslah appears in the selected output.

Supported conclusion:

> In this tested configuration and output surface, the authored fees produced no observable billing difference.

Unsupported broader conclusion:

> The five financial edge cases have been validated.

Also, the recheck script mostly **prints** results; it does not assert freeze success, exit 4, two BILLED rows, exact amounts, or final restoration success as acceptance conditions.

---

## 8. Remaining numerical/report issues

Some reconciliation arithmetic is sound:

- Full DR minus B3 revenue:

  \[
  34{,}870{,}243{,}633-34{,}727{,}295{,}800
  =142{,}947{,}833
  \]

- Live billing minus DR ledger:

  \[
  34{,}895{,}128{,}580-34{,}870{,}243{,}633
  =24{,}884{,}947
  \]

- GUI rate:

  \[
  999\times60/8393\approx7.14\text{ visits/min}
  \]

- B3 consumer time:

  \[
  47.8\times60{,}000/86{,}101\approx33.31\text{ ms/visit}
  \]

But unresolved presentation defects remain:

- §5 says **three** scaling queries read raw billing; §12 says **six**.
- RC-10 labels 1,393,815 a “value-row sum,” while current three-count reports 356,355 value rows for the DR cohort. A precise predicate-by-predicate SQL bridge is required; the current prose is not one.
- \(3/999 \approx 0.3003\%\) is a rule-of-three calculation, not automatically a population drift bound for a selected, eligibility-filtered sample with historical oracle contamination concerns.

---

## 9. Reproducibility after P6: **6/10**

### What a third party can now do

On the original configured machine, with the missing dependencies and live fixture already present, the suite is a useful runnable starting point:

- explicit tool hashes;
- persistent-session transaction helper;
- documented XML targeting;
- scratch ledger use;
- known sample visit IDs;
- injected failure recipe;
- B3 encounter seed/hash provenance.

### What they cannot reconstruct from this submission alone

1. **Fresh fixture orchestration:** `p6_run_suite_fresh.sh` is pinned and cited but its source is absent.
2. **Retarget implementation:** `stagea_common.py`, its XML list, encryption helper, and backup semantics are not supplied/pinned here.
3. **Actual harness behavior:** Java harness, shim, consumer, and relevant configuration dependencies are not fully packaged.
4. **Input dataset:** the suite assumes a particular populated live `sik`, tariff table, patient identities, and visit IDs.
5. **Immutable fixture identity:** no full input dump hash or canonical table-content manifest.
6. **Automatic pin enforcement:** the suite prints three shortened hashes; it does not compare them against required pins.
7. **Safe operational contract:** global XML changes, root use, blanket process killing, and missing target guards remain prerequisites rather than controlled mechanisms.

“Raw DB images are too large to pin by hash” is not a defensible justification. **A streaming SHA-256 does not require loading the image into memory.** Distribution may be difficult; hashing is not the obstacle.

The rebuild is reproducible only under a narrower reported projection:

> Same keys, amounts, and unit prices; different quantity and provenance fields.

That is useful evidence. It is not byte-identical ledger reproduction.

---

## 10. Ranked blockers and next action

### 1. Repair the recovery state machine and frozen-verification contract

- Recompute and compare source hashes, including actual billed price fields.
- Treat unavailable inputs and absent hashes as verification failures.
- Require group-level writer-dead proof on resume, not just timeout.
- Make FAILED/unrestored states recoverable or explicitly manual-only.
- Inject interruption **during restoration**, failed restoration, missing hashes, and surviving descendants.
- Remove unconditional “restored” and `crash_safe=YES` claims.

### 2. Make acceptance enforce the properties it names

- Nonzero suite exit on any failed assertion.
- Assert expected verdict, visit identities/counts, BILLED status, and exact deltas.
- Test exact half-up tax plus missing/extra tax rows.
- Add current-pin ALL gate execution.
- Add cohort-preservation tests before accepting the builder.
- Add actual overlapping-run isolation tests.
- Hash the relevant live `sik` surfaces, not just `sik_bench`.

### 3. Close the evidence and release chain

- Supply the fresh-wrapper, retarget dependency, harness, and consumer artifacts.
- Enforce pins and publish fixture hashes.
- Version the known-bad ledger and its corrected successor.
- Replace superseded report assertions in the headline sections.
- Resolve the cold-scratch consumer result and clearly identify which historical runs remain usable.

## Bottom line

**Credit P6 for the transaction rollback proof, operational XML retargeting correction, and successful timeout/SIGTERM recovery demonstrations. Those are substantive fixes.**

**Reject the broader claims of complete recovery, universal asserted coverage, untouched live state, and byte-identical ledger reproducibility.**

The next step is not another narrative close-out. It is a **smaller, stricter acceptance gate whose assertions cover the negative recovery paths and whose own exit status cannot lie**.

## E2E-DESIGN

# v6 verdict: Real progress, but the acceptance claim still exceeds the tests

**Overall: Needs targeted rework — 52/100.**  
**E2E design: 6/10 — defensible as a hybrid benchmark, not as financial end-to-end validation.**

P6 finally supplies useful execution evidence: a populated clone, successful form billing, a controlled mismatch, process-group termination, verified restoration on exercised paths, and a genuine transactional rollback test.

But **“18/18 PASS” does not establish the acceptance contract described in the task.** Some assertions are weaker than their names, several required failure modes were replaced rather than tested, and current source contains consequential recovery and scope defects.

This assessment is a static review of the embedded source and transcripts—not an independent execution. Some referenced evidence and dependencies are not embedded.

## 1. Scores

| Criterion | v5 | v6 | Assessment |
|---|---:|---:|---|
| Claim-honesty | 5 | **6** | §17 makes substantive, damaging disclosures. Credit earned. However, contradictory claims remain in the report, manifest, source comments, and rubric; “every check asserts its own log line” is false. |
| Gate-correctness | 3 | **5** | ALL predicates and single-session replacement are repaired. But builder deletion ignores cohort, source-content verification is absent, and recovery still has fail-open verification paths. |
| Oracle-validity | 3 | **4** | Frozen consumer rows, a causal mismatch experiment, and restoration hashes improve the evidence. Independent settlement validation remains missing; the pinned ledger is demonstrably inconsistent. |
| Reproducibility | 6 | **6** | Current tool prefixes match the manifest; the clone runs are materially better documented. Missing dependencies, unprovided wrapper source, mutable fixtures, and withdrawn historical evidence prevent a higher score. |
| E2E-design | 5 | **6** | Real form execution on the intended clone is now credibly demonstrated. This remains a sampled, consumer-baseline comparison—not independent financial E2E validation. |
| External-validity | 4 | **4** | No new calibration, operational population evidence, second-machine replication, or second-HMS evidence. Better disclosure does not earn external-validity points. |

\[
(6+5+4+6+6+4)\frac{100}{60}
=51.67\rightarrow\boxed{52/100}
\]

**Change:** +9 versus v5’s rounded 43; +17 versus the initial 35.

---

## 2. Disposition of the v5 findings

| v5 finding | Current disposition |
|---|---|
| **Fail-open exit / unconditional BILLED** | **Ordinary billing path substantially fixed and exercised.** `rc == 0 and all(sukses.get(v, False)...)` gates BILLED; A2 demonstrates exit 1 on drift; A4 demonstrates exit 4 on timeout. Universal fail-closed recovery remains unproven and defective. |
| **Attempt-based not-covered classification** | **Fixed and now demonstrated on populated visits.** A3/A6’s CSV contains four `OUT-OF-ENVELOPE,...,BILLED` rows. Classification therefore no longer depends on failure. The embalase/tuslah recheck adds two successful examples. |
| **Manifest existence masquerading as independence** | **Resolved by withdrawal, not by an independent control.** The builder’s shared-source limitation remains. |
| **Overstated line-diff scope** | **Still not fully corrected.** Reporting mostly says component quantity totals, but source still asserts that quantity reallocation between codes “still shifts” the total. It need not. The current ledger also fails this optional gate. |
| **Report inconsistencies** | **Partially corrected; substantial residual debt.** §17 retracts major errors, but earlier conclusions remain visibly incompatible with it. The manifest still calls the ledger “byte-for-byte reproducible” before qualifying that claim away. |
| **Global stage interference** | **Stage-name separation fixed, collision/concurrency problem not closed.** A9 demonstrates different B2/B3 prefixes sequentially. Sanitization collisions and simultaneous resets of overlapping visits remain possible. |

### v5’s additional problems

- **Root-dependent DDL:** still present. No disposable-target enforcement was added.
- **Java target mismatch:** repaired by the P6 orchestration, **not by `--db-name` itself**. The oracle’s opening documentation still incorrectly says `database.ini`.
- **Unreachable `REPAIR-SKIPPED`:** logging is now reachable for non-BILLED envelope visits. However, `--repair-consumer` still does not repair those FAILED batches: the actual repair call remains inside the BILLED branch under `if not ok_flag`, which fresh BILLED batches cannot satisfy.
- **False transactional replacement:** genuinely repaired for the tested transactional target.
- **Broken ALL SQL:** repaired in source. Both gates now return `"1=1"` for ALL.
- **Restoration/cleanup overclaims:** improved, not eliminated. See the recovery defects below.

### v5’s top three issues

1. **Database primitives:** transaction repair demonstrated; ALL syntax repaired; cohort deletion remains wrong.
2. **Populated-clone recovery acceptance:** delivered in part, but not the complete promised failure matrix or complete pre/post restoration proof.
3. **Evidence chain:** much stronger for P6; earlier clone experiments are invalid as clone experiments, and the current package remains incomplete.

---

## 3. What each acceptance check actually proves

The summary’s statement—

> “Each check asserts the gate’s own log line AND the exit code”

—is contradicted by the suite.

| Check | What the assertion and transcript establish | What they do not establish |
|---|---|---|
| **A0** | Five `STRATA-` registration rows exist. | Populated financial strata, date validity, or billability. |
| **A1** | Billing invocation returned 0; current code requires successful billing and clean comparison on this path. | The assertion checks **only RC**. The preceding grep is informational. It does not independently assert nonempty rows, two success markers, or FINAL counts. |
| **A2** | Transcript shows `ORACLE_FAIL: exit 1`, no traceback, and one drift visit after a controlled source-price perturbation. This is useful causal evidence. | The assertion checks only RC=1 and no traceback. Neither the verdict line nor `drift_visits=1` is asserted. Cleanup’s expected exit 1 is printed, not checked. |
| **A3** | Exit 4 without traceback or restore-mismatch text. CSV shows successful out-of-envelope billing. | **Not the planned forced JVM exit-3 test.** Exit 4 alone can result from another partial/failure condition. |
| **A6** | Exactly four CSV lines contain `OUT-OF-ENVELOPE`; the supplied CSV also shows BILLED. | Assertion does not require BILLED, successful markers, specific visit identities, or five original financial strata. |
| **A4** | Strong tested-path evidence: exit 4, `group_empty=true`, verified restore, no matching harness processes afterward. | Forced SIGKILL escalation is not demonstrated; the timeout occurs before the first visit completes, not during an established database write. |
| **A4b** | SIGTERM handler killed the active group; resume verified restoration and returned 0. | SIGKILL crash recovery and a descendant surviving its wrapper are not tested. |
| **A5** | Structured missing-registration rejection, exit 2, no traceback. | Only the `--allow-strata` route reaches this diagnostic; default eligibility rejects earlier. |
| **A7** | Empty freeze rejected; explicit override permits freezing. | No billing run follows the override. It does not test missing-settlement comparison or form-populated replacement of an empty baseline. |
| **A8** | SIGTERM after reset; subsequent verified restore and clean rebill. | **Not interruption during restoration**, as originally required. |
| **A8b** | Changed supplied visit set rejected with the named abort and exit 3. | Manifest-to-state consistency, changed dates, or changed eligibility/content are not comprehensively bound. |
| **A9** | Sequential B2/B3 runs used distinct stage prefixes and dropped their tables. | No concurrency test; neither billing exit code is asserted. Separate backup tables do not prevent overlapping live-row resets. |
| **A10** | Successful builder completion plus the single-session message, supported by the source implementation. | Log text alone is not atomicity proof; A10c supplies that evidence. |
| **A10b** | Stale visit’s drug/tax rows disappeared; existing tax rows passed a loose consistency query. | Exact half-up tax correctness, missing tax rows, cohort preservation, or outside-window preservation. |
| **A10c** | **Strong evidence:** trigger exists, injected MySQL failure occurs during tax insertion, exit 1, complete scratch-ledger hash unchanged. | Other storage engines, concurrent source changes, or ambiguous connection failure after COMMIT. |
| **A11** | At least one verified restore; no mismatch/drop-failed strings found. | “Every restore verified.” It does not count expected restores or reject restore-error, missing-hash, or STAGE-KEEP messages. |
| **A12** | No stage tables remain on the target at that instant. | Correct restoration of target contents. Deleting backup tables is not data restoration. |
| **A13** | Live **ledger** content hash unchanged; XML probes end on `sik`. | Live `sik` billing, notes, registration status, or other writable tables remained unchanged. |

### Two acceptance defects that matter immediately

**The suite does not fail its process when checks fail.**

It ends with:

```bash
echo "=== P6 SUITE DONE: PASS=$PASS FAIL=$FAIL ==="
echo "evidence: $OUT"
```

There is no:

```bash
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
```

or equivalent. A normal completed run with failed checks can return success. The EXIT cleanup also ends with `true`. A wrapper must explicitly inspect the report to compensate; its source is not embedded.

**A10b does not test the property it names.**

```sql
WHERE ABS(ta - ds*0.11) > 1
```

This accepts incorrect one-rupiah results. For subtotal 2,640:

\[
2640\times0.11=290.4,\quad\text{half-up}=290
\]

Tax **291** also passes that assertion. Because the query starts from tax rows, **a missing tax row is invisible**.

---

## 4. Current code defects blocking a robust release

### 4.1 New ALL scope repair creates an unrestricted ledger deletion

The builder selects source visits using both window and cohort. Its DELETE does not:

```python
"START TRANSACTION; DELETE FROM dr_charge_ledger WHERE "
+ ("1=1" if args.window == "ALL"
   else "no_rawat LIKE '2026/10/%'")
```

Consequently:

```text
--window ALL --cohort dr
```

**deletes the entire ledger**, then rebuilds only DR rows. Any legitimate non-DR ledger rows disappear.

The October variant similarly deletes non-DR October rows.

Atomic execution does not make an incorrect deletion safe. The claim that the builder now uses “one shared predicate” is false for the DELETE. A10b’s orphan stale-key test cannot detect this; add retained non-DR and out-of-window sentinels.

### 4.2 “Source-content verification” is recorded but never performed

Freeze stores:

```python
"source_content_hash": source_content_hash(db, nrs, log)
```

But `verify_frozen()` **never recomputes or compares it**.

Even the stored hash omits `detail_pemberian_obat.biaya_obat`—the field A2 explicitly establishes the form bills from—and does not implement the promised registration-fee hashing. Query failures are swallowed with `except Exception: pass`.

Thus P6-2g is not implemented as advertised. Matching row counts do not freeze source semantics. This also allows eligibility-changing source edits to change which visits contribute to the drift denominator.

### 4.3 Missing restoration evidence is accepted as successful restoration

In `stage_restore()`:

```python
ok = True
...
else:
    log("... pre-reset hash file absent ... NOT hash-verified")
return ok
```

**No hash file returns True.** The caller can set `restored=True`, proceed, and later delete backups.

That directly contradicts “unverified restore keeps its stage tables.”

Additionally, `_bill_date()` prints:

> “pre-reset state restored, run stops”

even when `stage_restore()` returned False. The final report unconditionally writes `crash_safe=YES` and describes FAILED batches as restored.

### 4.4 Preserved backups do not imply working resume

The resume loop explicitly skips FAILED batches:

```python
if not b or b["status"] in ("BILLED", "FAILED"):
    ...
    continue
```

So a restore error producing `FAILED, restored=False` retains tables but **does not retry restoration on resume**.

The timeout-without-death-proof branch claims it leaves the batch RESET, but actually assigns FAILED. It has the same problem.

### 4.5 SIGKILL recovery still lacks group-level writer exclusion

The graceful handler is real progress. The separate resume path, however:

- checks only the recorded wrapper PID;
- waits up to 1,200 seconds;
- removes the PID file regardless;
- does not establish process-group death before restoring.

If the wrapper died but Java survived, or the timeout expired with the process alive, restoration can race the writer. A4b does not test this path.

### 4.6 Isolation remains incomplete

- Sanitization maps different run IDs to the same table prefix.
- Locks are per run/stage directory, not per target/encounter set.
- Distinct stage tables do not serialize modifications to overlapping `billing` rows.
- XML configuration is shared mutable global state without a demonstrated global lock.
- Suite cleanup uses global `pkill -f BilingHarness`, not only its own process group.
- `FX` accepts arbitrary targets, including `sik`; root privileges amplify this risk.

These are operational hazards, not cosmetic issues.

### Other gate defects still visible

- `charge_delta` gates **net unknown-status amount**, despite claiming to gate unknown-row count. Zero-valued or cancelling unknown rows can escape that tool.
- `three_count` labels no-B output PARTIAL but its final expression returns **1**, contrary to its documented exit-0 PARTIAL contract.
- B “VERIFIED” means some form-save content exists—not that the subset’s encounters or totals match their corresponding ledger records.
- Money computation still uses floats, including `float(s) * 0.11`, despite “integer end-to-end” wording.

---

## 5. Target verification and live-state safety

### Did the form actually use the clone?

**The P6 evidence is credible for the exercised runs.**

The transcript includes:

> `harness+consumer database.xml -> sik_p6f (RETARGET-VERIFIED...)`

A2 then changes clone-local `biaya_obat` and obtains a billing mismatch. The strata recheck bills two clone-authored visits successfully. That is materially stronger than merely printing `--db-name`.

However:

- `p6_dbxml.py` delegates to **unprovided `stagea_common` source**.
- The harness and consumer sources are not embedded.
- The claimed fresh-clone wrapper, `p6_run_suite_fresh.sh`, is pinned but its source is not supplied.
- No runtime connection-identity assertion from the Java connection is shown.

So I accept the demonstrated clone execution, not the stronger claim that the complete targeting mechanism has been source-audited here.

### Was live state proven untouched?

**No. Only the live ledger was hashed.**

A13’s equal hash establishes stability of `sik_bench.dr_charge_ledger`. The form ordinarily writes elsewhere. An accidentally live-targeted form could alter billing/notes/status while A13 stayed green.

Nor does decrypting DATABASE back to `sik` prove that configuration files were restored byte-for-byte.

The task’s P6-5 requirement—pre/post hashes of every reset-table row set—was not delivered suite-wide. The rubric explicitly substituted “restore then rebill” for original pre/post equality. That is a narrower recovery test, not fulfillment of the original preservation contract.

---

## 6. §17 disclosure: valuable, but not complete

### The ledger defect changes the allowable claim

The arithmetic is unambiguous:

\[
25\times29{,}832=745{,}800
\]

\[
23\times29{,}832=686{,}136
\]

The row’s internal discrepancy is **Rp 59,664**, although its stored amount matches source billing.

Therefore:

- Amount reconciliation can remain PASS.
- Quantity reconciliation is currently FAIL.
- The pinned ledger is not an internally consistent canonical ground truth.
- Full-row byte reproducibility is false.

The 260,800 NULL provenance labels constitute:

\[
260{,}800/356{,}355 \approx 73.19\%
\]

That is not a minor metadata footnote. It does not prove those prices are wrong, but it invalidates a claim of uniform current-builder provenance.

### Retractions must propagate to conclusions

§17 properly retracts the ALL denial and P4 clone claim. But the following remain unsupported or contradictory:

- §0/§1 crash-safety conclusions relying on earlier clone demonstrations;
- §14’s broad “no live-DB mutation” claim;
- the cold-*scratch* consumer throughput claim, given that the consumer also reads XML;
- the manifest’s main ledger reproducibility statement;
- stale three-versus-six raw-billing query descriptions;
- the task rubric’s obsolete ALL-scope open item.

Pre-P6 targeting failures establish **wrong-target execution**, not automatically that every recorded result is false. Each affected claim needs an explicit disposition: invalid, retained under a live-target interpretation, or rerun.

The disclosure also lacks a complete live-write inventory. “The form refused to save” and matching four-visit hashes do not establish every writable table was untouched across all affected runs.

### Financial and population arithmetic

The main cohort bridges are consistent:

\[
86{,}101+354=86{,}455
\]

\[
34{,}870{,}243{,}633-34{,}727{,}295{,}800
=142{,}947{,}833
\]

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633
=24{,}884{,}947
\]

But arithmetic consistency does not validate writer attribution or historical execution.

Likewise, \(3/999\approx0.3003\%\) is numerically correct. A population defect bound still requires an appropriate sampling design and a valid independent outcome measure; “stratified consumer-oracle comparison” does not automatically supply those assumptions.

Finally, §17’s ALL results are **reported results**, not an embedded asserted gate transcript. The acceptance suite never runs either reconciliation gate. Source repair is verified here; the full-window execution claim has a weaker evidence tier.

---

## 7. E2E assessment: what is fairly claimable?

### The hybrid characterization remains honest—with a strict qualifier

This is fairly described as:

> **A synthetic outpatient billing integration benchmark combining direct-database fixtures, simulator-scale consumer execution, and selected real-form comparisons on one Khanza configuration.**

It is **not** fairly described as:

- 86,455 real-GUI E2E encounters;
- population-wide billing correctness;
- independently validated settlement equivalence;
- a crash-safe, non-destructive release.

The successful clone tests improve the real-form leg. The embalase/tuslah results demonstrate execution and eligibility classification, **not financial edge-case coverage**: neither charge produced an observable bill difference. ZEROFEE/HALFPPN remain untested financially.

### Weakest leg: independent financial outcome validation

For the **scientific E2E claim**, the weakest leg remains the **B-subset settlement gap and weak outcome oracle**, not simply the withdrawn historical clone runs.

Reading a different table is not enough. `count_form_save()` declares B verified when any note or receivable exists and compares that subset’s total to the whole cohort’s ledger total. That is neither matched-encounter reconciliation nor validated subset correctness.

Also, the blanket statement that form-level billing equivalence is “structurally unclaimable” now needs investigation. The current oracle clears `billing`, executes the harness, and reads newly populated billing rows; A2 shows those rows respond to a source-price change. Without the harness implementation and writer trace, you have not established exactly which part of that path writes which financial surface.

**Do not confuse “this implementation has not proved it” with “the system makes it impossible.”**

### Fix

Run a small, explicitly selected matched-encounter experiment:

1. Use independently isolated targets or mutually exclusive, verified resets.
2. Execute consumer and form paths separately for the **same encounters**.
3. Record runtime database identity and attribute writes to each path.
4. Compare frozen charge rows, notes, payments/receivables, and status using explicit per-encounter financial invariants.
5. Keep code/quantity provenance independent of the adapted source tables where possible.
6. Treat any B subset as a matched subset, never compare it indiscriminately against the full cohort.

For **release readiness**, the immediate blockers are the unrestricted builder DELETE, unverified-restore success path, and unsafe crash-resume writer handling. Fix those before expanding testing.

## Bottom line

**P6 deserves credit for real engineering progress. It does not deserve its blanket acceptance verdict.**

The strongest new evidence is **A2’s controlled mismatch, A4/A4b’s exercised group termination, and A10c’s rollback hash**. Lead with those.

Retire “18/18 proves recovery and live safety.” It does not.

**E2E score: 6/10. Overall: 52/100. Verdict: Needs targeted rework.**

## EXTERNAL-VALIDITY

## External-validity verdict: **4/10 — unchanged from v5**

P6 improves internal enforcement and exposes invalid historical evidence. It adds **no population calibration, operational workload validation, or cross-HMS evidence**. Better tests on a clone do not make the cloned synthetic workload representative.

### Top external risk: an uncalibrated workload presented as hospital evidence

The central risk remains that **correct execution of this synthetic workload says little about real outpatient billing workloads**:

- **C1–C4 remain NOT TESTED:** diagnosis mix, clinical coherence, payer/demographic/temporal composition, and comparison with facility aggregates.
- The approximately **82.7% PPN-inclusive drug revenue share** describes the fixture—not a validated hospital population.
- The oracle deliberately restricts coverage:
  ```python
  return (n_dpo + n_proc) > 0 and n_etc == 0 and n_proc <= 2
  ```
  It excludes registration-only visits, nonzero embalase/tuslah, and visits with more than two procedures. Agreement inside that envelope does not validate the excluded cases or establish their prevalence in practice.
- The new synthetic embalase/tuslah tests demonstrate **classification and execution**, not financial coverage. Both return `BILLED` and `OUT-OF-ENVELOPE`, but §17 explicitly reports:
  > “The form's bill was identical to the template.”

  There is no observable Rp 2,500/Rp 1,500 billing effect to validate. ZEROFEE/HALFPPN remain untested.

Cross-machine D2 would improve portability evidence, not clinical representativeness. A DOI would improve archival accessibility, not external validity. Neither substitutes for C1–C4.

### Is the §13 boundary publication-safe?

**The sentence itself: yes. The surrounding claims: not yet.**

> “This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

That is an appropriately narrow boundary. However, it cannot neutralize contradictory claims elsewhere:

1. **Historical clone-mode evidence must be explicitly marked unverified or superseded.** The `database.ini` discovery also puts the reported **“cold scratch” consumer measurement** in question unless its actual target is independently established; §16 says the consumer also reads XML.
2. **Remove the population interpretation of the “~0.3% B3 bound.”** Numerically, \(3/999=0.3003\%\). But that calculation does not establish a population-wide error bound without a defensible sampling model and validated measurement endpoint. A stratified, eligibility-restricted consumer-oracle comparison is not automatically such a model.
3. **Do not market synthetic edge-fixture success as demonstrated financial generalization.** The re-check specifically found no observable billing difference.

A useful publication addition is:

> “The selected-visit comparisons validate only the tested eligibility envelope and measurement endpoint; they do not estimate population billing-error prevalence. Earlier clone-target claims relying on `database.ini` are unverified and are not used as evidence of isolated execution.”

### Score rationale

**4/10:** credit for real single-system execution, selected real-form comparisons, and explicit scope limits. **No increase for P6:** its gains are principally internal validity and disclosure. The external evidence gap remains essentially untouched; the target discovery actually reduces the historical evidence that can safely be cited.

## VERDICT

## Overall assessment

**P6 represents meaningful engineering progress, but not completion of its original acceptance contract.** Its strongest evidence is controlled mismatch detection, exercised timeout/SIGTERM recovery, and transaction rollback. Its weakest points remain recovery fail-open paths, an acceptance suite that does not enforce all its advertised guarantees, and the absence of matched-encounter financial reconciliation.

The synthesis below is based on the supplied assessments, **not a fresh inspection or rerun**. “Verified” therefore means that those assessments identify both an implementation change and an asserted demonstration. The v5 classification covers the findings identifiable in these excerpts.

## Criterion scores and comparison

Deltas are ordered against **4701365 / 4769794 / 4795743**, respectively.

| Criterion | Score /10 | Prior scores | Deltas |
|---|---:|---|---|
| Claim-honesty | **6** | 4 / 5 / 5 | **+2 / +1 / +1** |
| Gate-correctness | **5** | 3 / 3 / 3 | **+2 / +2 / +2** |
| Oracle-validity | **5** | 4 / 4 / 3 | **+1 / +1 / +2** |
| Reproducibility | **5** | 3 / 5 / 6 | **+2 / 0 / −1** |
| E2E-design | **6** | 4 / 5 / 5 | **+2 / +1 / +1** |
| External-validity | **4** | 3 / 4 / 4 | **+1 / 0 / 0** |

### Claim-honesty — 6/10
**Justification:** P6 explicitly acknowledges wrong targeting, historical contamination, and ledger defects, but the report’s “every restore verified” language conflicts with missing-hash success paths, while “integer end-to-end” conflicts with `float(s) * 0.11`.  
**Biggest remaining risk:** Readers may rely on unretracted executive claims rather than the narrower, more accurate disclosures buried later in the report.

### Gate-correctness — 5/10
**Justification:** “A2’s controlled mismatch” demonstrates useful discrimination, but `--verify-form-save` is parsed without being used, and the documented PARTIAL exit-0 contract conflicts with an expression returning 1 when B is absent.  
**Biggest remaining risk:** The acceptance suite can signal success without enforcing the required assertions, while aggregate-preserving code/quantity reallocations remain invisible.

### Oracle-validity — 5/10
**Justification:** A2 demonstrates sensitivity to a source-price change, but acceptance substitutes a “tolerant, missing-row-blind query” for exact tax checking and selected restoration hashes for full pre/post state equivalence.  
**Biggest remaining risk:** A passing comparison may reflect a weak or shared measurement endpoint rather than independently established financial correctness.

### Reproducibility — 5/10
**Justification:** The assessments credit the operational XML retargeting correction and “A10c’s rollback hash,” but reproduction is explicitly narrowed to “Same keys, amounts, and unit prices; different quantity and provenance fields.”  
**Biggest remaining risk:** Missing runtime artifacts, unenforced pins, an unpinned fixture, and unresolved historical targeting prevent a third party from reliably reconstructing the claimed experiment.

The decline from the latest **6/10** reflects newly exposed limitations, not a denial of P6’s operational improvements.

### E2E-design — 6/10
**Justification:** “A2’s controlled mismatch, A4/A4b’s exercised group termination, and A10c’s rollback hash” strengthen the exercised workflow, but `count_form_save()` establishes B from any note or receivable rather than reconciling the same encounters against C.  
**Biggest remaining risk:** Successful execution may be presented as financial E2E validation despite the unmatched B subset, uncertain write provenance, and unsafe destructive/recovery paths.

### External-validity — 4/10
**Justification:** The explicit boundary—“one Khanza/MySQL configuration”—is appropriate, but the financial edge tests report that “The form’s bill was identical to the template,” providing no demonstrated generalization to those charges.  
**Biggest remaining risk:** Selected synthetic comparisons and the unjustified population interpretation of the “~0.3% B3 bound” may overstate applicability beyond the tested envelope.

## 1. Status of the v5 findings

### Genuinely fixed—but only within the demonstrated scope

| Finding | Implementation and asserted-run evidence | Boundary |
|---|---|---|
| **Ineffective clone retargeting in the current exercised path** | Operational XML targeting replaces reliance on ineffective `database.ini` configuration; current clone-form tests exercise the corrected path. | Does not rehabilitate historical clone, consumer, crash/recovery, or cold-scratch results. |
| **Transaction rollback for the exercised failure case** | Transactional behavior is backed by **A10c’s rollback hash**. | Does not establish safe unrestricted deletion, restoration under every failure, or cohort preservation. |
| **Timeout/SIGTERM group termination and recovery in selected cases** | Implemented group handling is exercised in **A4/A4b**. | Does not prove safe hard-crash resume with surviving descendants or interruption during restoration. |
| **Detection of a controlled price mismatch** | The current comparison path responds to the authored mutation in **A2**. | Does not validate every line-level discrepancy, tax invariant, or settlement outcome. |

These are legitimate fixes, not merely better prose; **none warrants a universal guarantee**.

### Claimed, narrowed, or substituted—not demonstrated as originally promised

- **“Every restore verified” / `crash_safe=YES`:** missing hashes, interrupted restoration, failed restoration, and surviving writers remain inadequately handled.
- **“18/18” or universal asserted acceptance:** aggregate failure exit and several exact assertions are absent.
- **“Live untouched”:** contradicted by the disclosed live test-row mutation and unsupported by comprehensive live-state guards.
- **Frozen source-content verification:** current content, including billed price fields, is not adequately reverified.
- **Whole-ledger reproducibility:** withdrawn in favor of a narrower projection, not repaired.
- **Original restoration acceptance:** intermediate restoration plus rebilling is a redesigned requirement, not fulfillment of exact pre/post fixture-hash acceptance.
- **“Verified subset”:** observed save content is not matched-subset financial reconciliation.

### Still open

Recovery fail-closed semantics; retryable FAILED/unrestored states; safe recovery-material retention; disposable-target enforcement; non-DR/cohort preservation; aggregate-preserving line reallocations; exact tax and missing-row detection; true concurrent-overlap isolation; matched B–C reconciliation; artifact/fixture closure; and financial edge-case coverage.

## 2. New problems P6 introduced or exposed

The excerpts do not establish when every defect originated; most are best classified as **newly exposed**.

1. **Historical evidence contamination has a wider blast radius.** The XML discovery undermines more than clone-form comparisons: earlier crash/recovery, edge-strata, consumer, and cold-scratch claims need individual revalidation.
2. **The pinned ledger is internally inconsistent.** Quantity defects and **260,800 `source=NULL` rows—about 73.19%—** defeat whole-row reproduction; even the narrower projection still needs its machine-checkable comparison artifact.
3. **Live-state safety is now contradicted, not merely unproven.** A live test-row mutation was disclosed.
4. **Write provenance is unresolved.** “Notes, not billing” conflicts with observed “form billing rows after the run”; the actual writer must be identified.
5. **Acceptance requirements were weakened after execution.** OOE execution, post-reset interruption, sequential prefix checks, and selected hashes do not substitute for the originally specified failure, interruption, concurrency, and restoration tests.
6. **Edge-fixture execution did not deliver financial coverage.** Embalase/tuslah produced no observable bill difference, and ZEROFEE/HALFPPN remain financially untested.

## 3. Top three remaining issues

1. **Operational safety and recovery correctness:** constrain destructive operations, fail closed on missing verification, establish writer-group death, and preserve recoverability until restoration is verified.
2. **Acceptance-gate integrity:** make failures produce nonzero suite exit and assert the actual safety, tax, identity, concurrency, and state-preservation contracts.
3. **Independent financial E2E validation:** reconcile consumer and form outcomes for the **same encounters**, with isolated targets and attributable writes.

## 4. Top three strongest properties to lead with

1. **Controlled fault sensitivity:** A2 shows detection of a deliberately introduced price mismatch.
2. **Concrete, bounded recovery evidence:** A4/A4b and A10c demonstrate selected termination/recovery and rollback behavior.
3. **Substantial single-system execution with reconciling headline arithmetic:** cohort and revenue bridges reconcile, provided they are presented as execution/accounting evidence—not population correctness or portability proof.

## 5. Overall score

\[
\operatorname{round}\left((6+5+5+5+6+4)\times\frac{10}{6}\right)
=\boxed{52/100}
\]

| Prior assessment | Overall delta |
|---|---:|
| **35/100 — run 4701365** | **+17** |
| **43/100 — run 4769794** | **+9** |
| **43/100 — run 4795743** | **+9** |

The improvement is principally in **internal validity and executable engineering evidence**, not external validity.

## 6. Overall verdict

**Needs targeted rework.**

A defensible narrow paper is plausible, but the current blanket acceptance and safety claims outrun the implementation and evidence.

## 7. Single most important next step

**Repair and rerun a small, fail-closed recovery acceptance gate on an enforced disposable target.** It must reject missing/corrupt hashes, exercise interruption *during* restoration and surviving-child hard crashes, verify complete protected-state restoration before deleting recovery material, and exit nonzero on any failed assertion; publish its machine-checkable results with claims limited to what actually passed.
