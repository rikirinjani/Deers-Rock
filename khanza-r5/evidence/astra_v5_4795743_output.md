# Astra v5 assessment: dr-khanza-e2e-full-assessment (post P1-P5)

## CLAIM-HONESTY

## Claim-honesty: **5/10 — materially improved, but not an auditable close-out**

**Justification:** P5 genuinely fixes the normal-path verdict propagation, conditional BILLED, classification, and manifest-control misrepresentation, but the current report still claims demonstrations and operational guarantees that the embedded source either contradicts or does not establish.

This is a source-and-evidence assessment, not an independently executed verification of the live box. **I would not accept the rubric’s unconditional “P5 = PASS.”**

## 1. What is genuinely fixed—and what the report can honestly say

| Prior finding | Assessment against current evidence |
|---|---|
| **1. Fail-open verdict / unconditional BILLED** | **Fixed on the normal execution path.** `main()` returns `_finalize`’s result, and `sys.exit(main())` propagates it. BILLED requires `rc == 0 and all(sukses.get(v, False) for v in nrs)`. There is no longer an unconditional successful return after finalization. |
| **2. Attempt-based not-covered classification** | **Fixed in code.** `bad` is calculated using `eligible()` at load, persisted as `out_of_envelope`, and used for classification and exit 4. Failed-batch rows are excluded from the diff denominator. This proves classification against the implemented predicate—not that the predicate covers every named edge stratum correctly. |
| **3. Unconsumed manifest presented as control** | **Fixed honestly.** Both manifest flags are absent. The builder explicitly says the pre-adapter manifest “is NOT implemented” and acknowledges shared code/quantity provenance. This removes a false control; it does not implement independent provenance. |
| **4. Line-diff scope overstated** | **Report substantially corrected.** Section 14 now says “per-visit per-component quantity … in aggregate, not code-level line items.” Correct. However, source comments still overclaim detection of within-component quantity reallocations; those can preserve both quantity and amount totals. |
| **5. Report inconsistencies** | **Several corrected; consistency is not achieved.** MySQL, timing units, and the diagnosis-scope clarification improve. The edge-demo location, repair evidence, privilege requirements, and rubric SHA remain inconsistent. |
| **6. Global stage-table hazard** | **Mitigated, not eliminated.** Names now contain sanitized `run_id`. But locks include the stage-specific run directory while table names do not include stage. Two stages under one RUN_ID still share tables despite separate locks. Different IDs can also collide after sanitization. |
| **7(a). Header-only FAILED-batch CSV** | **Fixed in `_finalize`.** Its non-BILLED branch appends one row per visit, including classification, status, reason, and `mismatch=None`. If finalization is reached with the stated five-visit FAILED batch, five rows will be written. |
| **7(b). CREATE traceback mislabeled as drift exit** | **Underlying CREATE routing fixed; demonstration not independently established here.** CREATE/DROP explicitly request root, and backup exceptions become FAILED. That removes the identified privilege failure path under working root access. It does not by itself prove the claimed rerun reached `_finalize`. |

### The exit contract is real—but narrower than the headline

The relevant code is unambiguous:

```python
if failed_batches or out_of_env:
    exit_code = 4
elif drift or parse_errors:
    exit_code = 1
else:
    exit_code = 0
```

and:

```python
rc = _finalize(...)
...
return rc
```

Thus **a detected in-envelope mismatch reaching this finalizer cannot exit 0**.

But section 15’s “0 only on a clean in-envelope pass” should explicitly describe **billing-run finalization**. `--freeze-only` and `--verify-frozen` can return 0 without performing a billing comparison. Infrastructure exceptions elsewhere can also exit through tracebacks rather than this contract.

That distinction matters after finding #7(b): **nonzero exit is not automatically evidence of an exercised verdict path.**

## 2. The biggest remaining evidence defect: Demo A does not match this source

The summary says the rerun used:

> “synthetic … values with no live `reg_periksa` rows”

and nevertheless reports:

> “date 2026-10-01: FAILED”

The embedded code obtains the date exclusively from the missing registration:

```python
tgl = dbutil.scalar(db, "SELECT tgl_registrasi FROM reg_periksa ...")
by_date.setdefault(tgl, []).append(n)
```

With no matching row, `scalar()` returns `None`. The subsequent resume loop executes:

```python
"harness_%s.log.pid" % d.replace("-", "_")
```

**For `d is None`, that raises `AttributeError` before `_bill_date` runs.** There is no fallback to `2026-10-01` in the supplied source. A mixture of missing and real dates also creates a sorting problem.

Therefore the stated live rerun is **not reproducible from the embedded source and stated fixture conditions**. Either the actual fixture contained registrations, a different source was executed, or relevant execution machinery is missing from the evidence. This requires reconciliation, not charitable interpretation.

### Even after fixing that discrepancy, it is not an equivalent restoration demonstration

A missing-registration fixture can exercise failure classification and an exit branch. It does **not** establish:

- execution of the five authored financial edge cases;
- restoration of nonempty billing and verification state;
- complete pre-run state preservation;
- disposable-clone isolation.

Restoring an empty pre-state is a much weaker test than restoring actual populated encounter state. Running privileged operations against live `sik` is also not “equivalent disposable-clone semantics.”

**Section 15 still explicitly calls this the “scratch `sik_p2`” demo.** Section 14 attributes post-P5 behavior to authored visits on a scratch clone. The current summary instead re-anchors the evidence to live missing-registration identifiers.

That is a material provenance contradiction, not a cosmetic location label.

## 3. “REPAIR-SKIPPED fired” is contradicted by the control flow

Section 15 says:

> “default logs `REPAIR-SKIPPED`”

The summary and rubric claim those lines occurred in the FAILED STRATA demonstration.

But the log is inside the **BILLED** branch of `_finalize`:

```python
if is_billed:
    ...
    if not ok_flag:
        ...
        log("REPAIR-SKIPPED ...")
```

Newly BILLED batches, by construction, have `sukses=true` for every visit. FAILED batches enter the other branch, which contains **no `REPAIR-SKIPPED` logging**.

Consequences:

- **Removing default automatic repair is real.**
- The claimed default log is not emitted for the stated FAILED-batch path.
- `--repair-consumer` is effectively unreachable for ordinary freshly generated state: its repair branch also requires a BILLED visit with `sukses=false`.

“Zero REBILL lines” is plausible. **“REPAIR-SKIPPED fired” is not supported by this source.** AC-4 cannot honestly remain PASS as written.

## 4. Restoration, cleanup, and privilege claims need qualification

### Restoration is implemented, not comprehensively verified

For harness failure, `_bill_date` calls `stage_restore`, marks FAILED, and breaks the current processing loop. That is real progress.

But “complete pre-run state … re-applied” remains stronger than the evidence:

- Restoration consists of separate DELETE and REPLACE calls, without a transaction or post-restore hash verification.
- A timeout kills the **bash wrapper**, not a managed process group. Java can remain alive and mutate state during or after restoration.
- Resume waits for the recorded wrapper PID but does not reliably terminate the writer before restoring.
- A pre-existing FAILED batch is skipped with `continue`; later pending dates can still run on a subsequent invocation. “No further batches” is true for the immediate failure break, not an unconditional resume invariant.

The original acceptance target explicitly demanded complete state restoration **and hash verification**. The shown implementation does not supply the latter.

### “Box left clean” is not enforced

```python
except Exception:
    pass
log("stage-drop ... (box left clean)")
```

A DROP failure is swallowed, followed by an unconditional cleanliness claim. The finalizer can still return 0.

The reported observation of zero stage tables may be true for one run. **The tool does not guarantee it and must not log it as established without checking.**

### The privilege split is real; the operational wording is stale

`dbutil` genuinely routes:

- stage CREATE/DROP to root through `force_root=True`;
- ordinary operations to `benchmark` by default;
- **all operations** to root when `DBUTIL_FORCE_ROOT=1`.

Section 15 nevertheless says:

> “live oracle runs need `DBUTIL_FORCE_ROOT=1`”

That is obsolete as a consequence of the stated CREATE problem once per-operation escalation is installed. The evidence summary itself says live runs now work without that flag.

Also, a FORCE_ROOT demonstration cannot prove that the default benchmark-user DML path works on newly created stage tables. That needs a rerun **with the environment flag unset** and verified grants.

## 5. The drift-demo honesty boundary is good

This is one of the strongest improvements:

> “the tamper’s causal role is not established … What is proven is the exit contract.”

That qualification is correctly placed alongside the demonstration. It does not bury the limitation elsewhere.

I accept the intended distinction:

- **Claimable:** a detected baseline mismatch takes the finalizer’s failure path.
- **Not claimable:** the price tamper caused the observed mismatch.
- **Not claimable:** same-encounter form-versus-consumer settlement equivalence.

The report continues to disclose the B-subset structural limitation. **Do not undo that by describing Demo B as successful end-to-end price-fault propagation.**

The embedded summary reports a successful rerun; the complete transcript is not supplied here, so actual path execution remains reported evidence rather than independently verified execution.

## 6. Report consistency: arithmetic improves, but stale claims remain

### Corrections that hold

- **MySQL:** section 13 now agrees with the manifest’s **8.0.46**.
- **Burst timing:**  
  \(60{,}000 / 65.5 = 916.03\) visits/min.  
  \(60{,}000 / 64.2 = 934.58\) visits/min.  
  Therefore **916 v/min belongs to wall timing**, not the internal consumer timing. The revised wording is correct.
- **Line diff:** aggregate quantity versus code-level identity is now distinguished.
- **Diagnoses:** 8,353 native rows and empty generated-prefix slices can coexist. The revised footnote supplies the necessary scope distinction.

### Remaining contradictions

- Rubric AC-7 still cites superseded oracle **`c729ad06…`**, while the manifest pins **`70f37ba3…`** and newly pins dbutil **`7ce404a1…`**.
- Section 3 still presents B as **149 notes / Rp 49,738,954** without clearly dating that state against the new **151 / Rp 49,903,019** observation. The increase is **2 notes and Rp 164,065**. Historical figures are fine; unlabeled current-state mixtures are not.
- Section 12 still says “six native-table queries read raw `billing`,” while section 5 says **three of seven scaling queries** do. The claimed semantic cleanup is incomplete.
- The rule-of-three arithmetic is approximately correct: \(3/999 = 0.3003\%\). But calling it a **B3 population drift bound** needs sampling and oracle-validity assumptions that the report’s own historical-baseline qualifications do not establish.

## 7. A major additional honesty problem exposed by `dbutil.py`

The report calls the ledger builder:

> “transactional”

It is not transactional across the replacement operation shown.

```python
dbutil.execute(..., "START TRANSACTION; DELETE ...;")
...
dbutil.execute(..., "REPLACE INTO ...")
...
dbutil.execute(..., "COMMIT")
```

Each `execute()` launches a **new mysql process and connection**. For transactional tables, the initial uncommitted DELETE rolls back when that connection closes. Later REPLACEs commit independently; the final COMMIT belongs to another session.

This means obsolete keys can survive and partial builds can persist. **The report’s transactional-replacement guarantee is false.** This is newly exposed by the complete helper source, not necessarily introduced by P5.

Likewise, both reconciliation tools’ `ALL` predicates contain an unterminated SQL string literal:

```python
"no_rawat LIKE '____/__/__/8_____%"
```

The closing SQL quote is absent. Current-source full-window execution therefore cannot be accepted merely because historical full-window PASS artifacts are cited.

## Bottom line

**Credit the real fixes. Reject the blanket close-out.**

P5 honestly narrows the financial-equivalence claim and implements important normal-path safeguards. But an assessor cannot sign off a report that simultaneously contains:

1. a Demo A fixture description incompatible with its date-handling code;
2. claimed repair-skip logs unreachable on the demonstrated path;
3. stale scratch/live, privilege, and SHA provenance;
4. unverified restoration and unconditional cleanup assertions;
5. a false transactional-builder guarantee.

**Score: 5/10 for claim-honesty.** The next step is not another celebratory section. It is a corrected, current-SHA, disposable-clone execution record with populated pre-state, explicit verdict-path evidence, and before/after state hashes.

## GATE-CORRECTNESS

# Third assessment (v5): **48/100 — NOT READY**

**P5 fixes the ordinary oracle verdict path. It does not establish the advertised fail-closed, crash-safe, fully restored execution contract.** The current source also contradicts parts of the *re-patched* demonstration summary—not just the superseded first-pass evidence.

The most serious findings are:

1. **The live STRATA rerun, as described, cannot follow the claimed execution path in this source.** Missing `reg_periksa` rows produce a `None` date; the execution path calls `d.replace(...)`.
2. **The claimed `REPAIR-SKIPPED` transcript is not supported by the patched control flow.** FAILED batches never enter that logging branch.
3. **The ledger replacement is not transactional.** `dbutil` opens a new MySQL connection for every call, separating `START TRANSACTION`, inserts, and `COMMIT`.
4. **Both reconciliation tools have malformed SQL for `--window ALL`.**
5. **Per-run stage names still collide across stages sharing a RUN_ID**, while their locks remain separate.
6. **Timeout handling can restore data while the JVM is still running.**

These are not paper-polish issues.

**Assessment basis:** static verification of the embedded sources and consistency checking of the embedded report, rubric, manifest, and evidence summary. I have not executed these tools, inspected the live database, or independently recomputed the supplied file hashes. A narrated transcript is not stronger evidence than contradictory executable source.

## 1. Scorecard

Each criterion has equal weight.

| Criterion | Score /10 | Assessment |
|---|---:|---|
| Claim-honesty | **5** | Important structural limits are disclosed correctly. But §15, the rubric, and the current source still disagree about the STRATA target, repair logging, privilege requirements, and restoration guarantees. |
| Gate-correctness | **3** | Ordinary `_finalize` propagation is fixed. Full-window SQL and transactional replacement are broken; other gate semantics remain overstated. |
| Oracle-validity | **3** | Eligibility classification and conditional BILLED are real improvements. Baseline verification, empty-output acceptance, restore safety, and cross-run isolation remain insufficient. |
| Reproducibility | **6** | Credit retained for B3 encounter replay, seeds, runtime pins, and newly pinned `dbutil`. No cross-machine reproduction or complete executable release closure. |
| E2E-design | **5** | The hybrid characterization remains honest. The weakest leg is still independent same-encounter financial verification, followed by destructive-run recovery. |
| External-validity | **7** | Good disclosure that C1–C4 and clinical calibration are untested. This scores scope discipline, **not demonstrated external validity**. |

\[
(5+3+3+6+5+7)/60 \times 100 = \mathbf{48.33/100}
\]

**Rounded: 48/100, versus 43 previously: +5 points.** The executable verdict repair earns credit. The new source review prevents a larger increase.

---

## 2. Disposition of the seven prior findings

| Prior finding | Current disposition |
|---|---|
| **1. Fail-open exit and unconditional BILLED** | **Fixed on the ordinary execution/finalization path; not a universal contract.** `main()` returns `_finalize`’s result, and BILLED requires rc=0 plus every success marker. Maintenance-mode early returns, resume behavior, and recovery exceptions remain outside that claimed guarantee. |
| **2. Attempt-based not-covered classification** | **Fixed in code.** Classification comes from eligibility captured in `st["out_of_envelope"]`; FAILED/PENDING batches now receive result rows. The claimed rerun still has a date-handling contradiction. |
| **3. Manifest existence check presented as control** | **Fixed by withdrawal.** The flags are removed and the shared-source limitation is explicit. No independent encounter-manifest control has been implemented. |
| **4. Line-diff scope overstated** | **Report substantially fixed; source commentary still overstated.** It is a component-total quantity check, not code-level reconciliation. Quantity reallocations preserving component totals also escape it. |
| **5. Report inconsistencies** | **Named version, timing, and diagnosis-scope edits applied. Consistency work remains incomplete.** §15 still names the wrong STRATA target and gives obsolete root requirements; the rubric pins the superseded oracle. |
| **6. Global stage-table interference** | **Partially fixed.** Different sanitized RUN_IDs get different tables. Different stages under the same RUN_ID still share tables despite separate locks; sanitization also permits collisions. |
| **7(a). Header-only CSV for FAILED batches** | **Fixed in `_finalize`.** It now emits rows for non-BILLED batches with `mismatch=None`, status, and reason. This does not prove the narrated STRATA run actually reached `_finalize`. |
| **7(b). CREATE traceback mislabeled as drift proof** | **The original CREATE failure mechanism is addressed.** DDL explicitly uses root, and stage-backup exceptions become FAILED. The particular rerun remains evidence-summary testimony, not independently verified execution. Other uncaught exceptions still exit 

## ORACLE-VALIDITY

# Third assessment (v5): **52/100 — NOT READY**

**Oracle score: 4/10.**

P5 fixes the original unconditional-success bug. That is real progress. It also fixes eligibility-based classification and the FAILED-batch CSV omission **in the finalizer**.

But the evidence still overclaims the implementation. Most seriously:

1. **The re-anchored Demo A cannot follow the reported execution path through this source.** Visits with no `reg_periksa` row produce a `None` date; the code calls `d.replace(...)` before billing. That is a traceback, not the reported restored FAILED batch.
2. **The claimed `REPAIR-SKIPPED` output is unreachable on the normal FAILED-batch path.**
3. Timeout handling can leave the Java process running while restoration proceeds.
4. Restoration is neither transactional nor hash-verified.
5. Reading `dbutil.py` exposes a separate major defect: **the ledger builder’s claimed transaction is not a transaction across its operations.**
6. Both reconciliation tools have malformed SQL for `--window ALL`.

The right conclusion is **“the normal-path exit predicate is repaired; the fail-closed, recoverable oracle is not yet demonstrated.”** Not “P5 = PASS.”

This assessment verifies the embedded source and checks it against the supplied evidence summaries. It does not independently execute the programs, inspect the live database, or authenticate the stated SHA-256 values.

## 1. Scores

All six criteria have equal weight.

| Criterion | Score | Assessment |
|---|---:|---|
| Claim-honesty | **5/10** | Important boundaries are now explicit, particularly B-subset and tamper causality. But current source contradicts Demo A and `REPAIR-SKIPPED`; report/rubric still contain superseded configuration and SHA claims. |
| Gate-correctness | **4/10** | Normal-path oracle exits and conditional BILLED are fixed. Full-window SQL, builder transactionality, cleanup reporting and gate documentation remain defective. |
| Oracle-validity | **4/10** | Eligibility markers and frozen-row mismatch detection are real. Empty-baseline acceptance, timeout descendants, weak freeze verification and unverified restoration remain material risks. |
| Reproducibility | **6/10** | Credit retained for B3 replay, seeds and runtime/tool pins, including newly pinned `dbutil.py`. This is not yet a complete independently executable release; cross-machine and DOI remain open. |
| E2E-design | **5/10** | Hybrid characterization remains honest. The weakest leg is still independent, same-encounter financial validation—not throughput. P5 improves control flow, not that structural limitation. |
| External-validity | **7/10** | Good scoping: C1–C4 and external validation are NOT TESTED. No credit for actual calibration or generalization. Opt-in, uncalibrated ICD-10 mapping is not clinical validation. |

\[
\frac{5+4+4+6+5+7}{60}\times100
=\frac{31}{60}\times100
=\mathbf{51.7/100}
\]

**Rounded: 52/100, up 9 points from 43.** The increase is for executable fixes, not acceptance of the P5 close-out rubric.

---

## 2. Disposition of all seven prior findings

| Prior finding | Verdict against current evidence |
|---|---|
| **1. Unconditional success / unconditional BILLED** | **Fixed on the normal execution path.** `main()` returns `_finalize`’s result, and `sys.exit(main())` propagates it. BILLED requires rc zero and every requested visit successful. Recovery and exception handling remain incomplete. |
| **2. Attempt-based not-covered classification** | **Fixed in code.** Eligibility is evaluated at load, persisted as `out_of_envelope`, used for row classification, excluded from the drift denominator and given exit-4 priority. The claimed live Demo A does not demonstrate successful traversal of this path. |
| **3. Unconsumed manifest flags** | **Fixed by removal and disclosure.** No fictitious manifest control remains in the builder. Code/quantity provenance is still shared-source, explicitly not solved. |
| **4. Line-diff scope overstated** | **Report substantially fixed; source comments remain overstated.** It compares quantity totals per visit/component, not code-level lines. A quantity-preserving redistribution within a component is still invisible. |
| **5. Report inconsistencies** | **Partially fixed.** MySQL version, wall/internal throughput distinction and diagnosis-scope explanation are corrected. New/stale contradictions remain in §15, the rubric and cleanup claims. |
| **6. Global stage-table hazard** | **Partially fixed.** Different ordinary run IDs get different stage tables. Same RUN_ID across different stages still shares tables while using different locks; sanitized run IDs can collide. Concurrent writes to the same visits also remain unprotected. |
| **7(a). Header-only FAILED-batch CSV** | **Fixed in `_finalize`.** Non-BILLED batches now emit per-visit rows with classification, status and reason, with no claimed diff. This does not prove the re-demo reached `_finalize`. |
| **7(b). Exit 1 was a CREATE traceback** | **Specific CREATE defect addressed.** CREATE/DROP use `force_root=True`; backup exceptions become FAILED before reset. The reported rerun of Demo B is plausible contract evidence, but the supplied summary is not an independently inspected transcript. Other traceback paths remain. |

### Finding #1: the important control-flow fix is genuine

The relevant chain is now:

```python
if rc == 0 and all(sukses.get(v, False) for v in nrs):
    b["status"] = "BILLED"
else:
    stage_restore(...)
    b["status"] = "FAILED"
```

Then:

```python
rc = _finalize(...)
...
return rc
```

And:

```python
if __name__ == "__main__":
    sys.exit(main())
```

The finalizer gives the intended priority:

```python
if failed_batches or out_of_env:
    exit_code = 4
elif drift or parse_errors:
    exit_code = 1
else:
    exit_code = 0
```

**Therefore: an in-envelope mismatch actually computed against the frozen baseline in a normally finalized run cannot exit 0.** That closes the original finding.

It does **not** establish that every financially wrong run becomes a computed mismatch, that every incomplete run fails through the documented contract, or that failures restore the target safely.

The literal report claim, “0 only on a clean in-envelope pass,” also needs an operational-mode qualifier: `--freeze-only` and `--verify-frozen` can legitimately return 0 without performing a billing comparison.

### Findings #2 and #7(a): classification and row emission are genuine

The classification now comes from:

```python
bad = [n for n in nrs if not eligible(n, db, log)]
st["out_of_envelope"] = sorted(bad) if (args.allow_strata and bad) else []
```

The finalizer emits rows for non-BILLED batches:

```python
"mismatch": None,
"batch_status": fail_status,
"fail_reason": fail_reason
```

And its denominator is based on:

```python
in_env_diffable = [
    r for r in diffable if r["classification"] == "ENVELOPE"
]
```

This fixes the attempt-based mistake and the specific header-only CSV defect. In CSV, Python `None` becomes an **empty field**, not the literal string `null`; downstream consumers need that serialization contract documented.

For a zero-diffable-row run, `max(1, len(in_env_diffable))` produces a numerical rate of zero. The exit-4 verdict prevents a process-level false pass, but the report should print **“N/A: no diffable visits”**, not a potentially misleading zero drift rate.

---

## 3. Demo A: not equivalent, and currently contradicted by source

The summary says the rerun used:

> “synthetic STRATA- no_rawat values with no live reg_periksa rows”

Yet the program derives dates only from `reg_periksa`:

```python
tgl = dbutil.scalar(
    db,
    "SELECT tgl_registrasi FROM reg_periksa WHERE no_rawat='%s'" % n
)
by_date.setdefault(tgl, []).append(n)
dates = sorted(by_date)
```

With all five registrations absent, `dates` is `[None]`.

Before `_bill_date` is reached, the resume loop executes:

```python
"harness_%s.log.pid" % d.replace("-", "_")
```

That raises **`AttributeError` on `None`**. There is no fallback to `2026-10-01`.

Furthermore, JSON persistence converts a `None` dictionary key to `"null"`, creating an additional state-key inconsistency on reload.

**The stated premises, embedded source and reported successful Demo A path cannot all be true.** An omitted fixture, different source, manual state manipulation or different invocation must explain the discrepancy. Until supplied, do not accept that rerun as proof.

### Even if the date defect were bypassed, the demonstration is weaker

Nonexistent visits test rejection of missing/no-content inputs. They do not test:

- embalase or tuslah billing;
- half-rupiah PPN;
- zero-fee-clinic behavior;
- ≥3 procedure lines;
- restoration of a populated pre-run financial state.

Five empty inputs restored to empty state are not equivalent to five authored edge fixtures restored exactly.

Nor does using synthetic identifiers make a live database an “equivalent disposable clone.” The program still operates against live tables with elevated privileges.

### AC-1 through AC-5

| Acceptance criterion | Current disposition |
|---|---|
| **AC-1: exit 4** | Finalizer logic supports it; this Demo A execution claim is contradicted by the missing-date path. |
| **AC-2: FAILED and restored** | Conditional failure branch exists. A populated, exact restoration is not demonstrated by nonexistent visits, and no restoration hash check exists. |
| **AC-3: five classified rows** | Finalizer now supports them. Actual emission by the described rerun remains unproven. |
| **AC-4: REPAIR-SKIPPED** | **Contradicted by current normal-path control flow.** |
| **AC-5: stage hygiene** | Drop calls exist. Cleanup success is not enforced; failures are swallowed. The stated zero-table check is summary evidence, not something the code guarantees. |

### `REPAIR-SKIPPED` is not emitted for FAILED batches

Its only logging branch is inside:

```python
if is_billed:
    ...
    if not ok_flag:
        ...
        log("REPAIR-SKIPPED ...")
```

But P5 allows BILLED only when **every** `ok_flag` is true.

FAILED batches go into the other branch, which emits result rows but does not log `REPAIR-SKIPPED`.

Consequently, in an ordinary run:

- automatic consumer repair is indeed prevented;
- the advertised optional repair path is effectively unreachable;
- the claimed FAILED STRATA `REPAIR-SKIPPED` transcript is not explained by this source.

**Zero REBILL lines is plausible. `REPAIR-SKIPPED` lines are not.**

---

## 4. Demo B: acceptable exit-contract evidence, not financial-oracle validation

The report now says:

> “the tamper’s causal role is not established”

and:

> “What is proven is the exit contract.”

That is the correct boundary. Credit it.

A mismatch caused by the known B-subset behavior is sufficient to exercise:

\[
\text{computed in-envelope mismatch}
\rightarrow \text{FAIL}
\rightarrow \text{exit 1}
\]

The mismatch does not have to originate in a price tamper to test that Boolean contract.

However:

- it does not demonstrate price-fault sensitivity through this form path;
- it does not validate same-encounter settlement equivalence;
- it does not establish restoration of the entire pre-run state;
- it cannot rehabilitate a population billing-correctness claim.

**A settlement-level tamper demo is unnecessary for the narrow exit-contract claim. It is necessary, or needs an equally valid independent alternative, for a stronger financial-oracle claim.** P5 explicitly excludes that stronger claim; keep it excluded.

The reported clean Demo C is useful, but its baseline and observed nonempty settlement rows should be published. `sukses=true` alone does not establish financial output.

---

## 5. Ranked residual oracle risks

### 1. Timeout can restore underneath a still-running writer — **critical**

`run_harness` launches a shell and handles timeout with:

```python
p.kill()
rc = -1
```

That kills the shell process, not reliably its Java descendant. There is no process-group termination and no post-kill wait establishing that the writer has stopped.

The failure branch can then restore state and finalize/drop backups while Java continues writing.

The resume code also does not actually “reap” a lingering harness as claimed. It waits for up to 1,200 seconds, removes the PID file and proceeds even if the process is still alive.

**Required:** dedicated process group, bounded TERM/KILL escalation, wait for termination, and proof that no writer survives before restore.

### 2. “Complete pre-run state restored” is not verified — **critical**

Restoration uses separate calls:

```python
DELETE FROM target ...
REPLACE INTO target SELECT ... FROM stage ...
```

Each is a separate database connection and committed operation. A failure after DELETE leaves partial restoration. There is no transaction across the restoration, no row-content hash verification, and no controlled restore-failure state.

The finalizer even prints:

> “FAILED batches (restored from stage backup; P5-2)”

for stage-backup failures explicitly recorded as:

```python
b["restored"] = False
```

Backup failure before reset is safely nondestructive for that batch. It is **not** a successful restore.

### 3. Missing settlement can still pass when the baseline is empty — **high**

Freeze accepts zero value rows:

```python
vals = per.get(n, [])
```

Finalization compares:

```python
c, r = frozen.get(n, []), real.get(n, [])
```

If both are empty and the harness reports success, the row passes.

Missing settlement **does** fail against a populated baseline. It is not universally rejected. Eligibility only checks source drug/procedure rows; it does not require a valid, nonempty consumer baseline.

**Required:** explicit baseline completeness and expected-output assertions, with any legitimate zero-charge exception separately specified.

### 4. Frozen-baseline verification is weaker than advertised — **high**

`db_fingerprint` records several source counts, but verification checks only:

```python
for k in ("count_billing", "count_reg_periksa"):
```

`count_billing` is no longer populated. Thus its comparison is normally `None == None`.

The recorded drug, procedure and price-table counts are not checked. Counts would not detect price/content changes anyway.

Per-visit rows are checked against a hash inside the same file, but that hash is not cross-checked against `manifest["sha256"][n]`; the aggregate manifest hash is not recomputed. Resume also does not rigorously bind the supplied visit set to the frozen visit set.

This is not the immutable, content-verified source/freeze boundary the prose suggests.

### 5. Missing-registration and exception paths bypass structured outcomes — **high**

Demo A exposes the `None` date defect. Reset, display startup, harness launch, reads and restoration can also throw outside structured failure handling.

These generally return a nonzero Python exit, so they are not the original silent-success bug. But **“nonzero traceback” is not equivalent to “documented verdict plus safe recovery.”** Finding #7 already established that distinction.

### 6. Stage isolation remains incomplete — **high**

The prefix uses RUN_ID, while locks use RUN_ID plus stage directory. Two stages under one RUN_ID can manipulate the same stage tables under different locks.

Different run IDs do not prevent concurrent destructive operations on the same target visits. Sanitization can also map distinct IDs to the same prefix.

On resume, encountering an already FAILED batch sets `failed=True` and **continues**; later pending batches can run. That contradicts an unqualified “no further batches after failure” rule.

### 7. Cleanup and numeric validity are not enforced — **medium**

`stage_drop` catches every exception and nevertheless logs:

> “box left clean”

That is false assurance.

`value_rows_strict` uses rounded floats, does not explicitly reject non-finite values, and excludes rows with neither positive price nor positive total. Its predicate needs a documented boundary for negative adjustments and malformed numeric values.

These risks are not acceptable under **“crash_safe=YES”** and “complete pre-run state restored.” They are tolerable only for a much narrower, supervised experimental comparator on a disposable target.

---

## 6. P5-5b privilege split: real fix, not isolation

The implementation is straightforward:

```python
dbutil.execute(..., force_root=True)  # stage CREATE/DROP
```

Ordinary calls use the benchmark account unless:

```python
if os.environ.get("DBUTIL_FORCE_ROOT") == "1":
    force_root = True
```

This closes the specific benchmark-user CREATE problem, assuming root authentication works and the benchmark account can perform DML on the new stage tables.

It does **not** itself contaminate the frozen comparison. But it introduces or exposes operational risks:

- root availability is a hidden runtime prerequisite;
- the environment flag escalates **all** operations, including live DML;
- no assertion restricts that flag to a disposable database;
- Python’s `--db-name` is not an enforced binding to the Java harness’s database configuration.

The report’s §15 ops statement—

> “live oracle runs need `DBUTIL_FORCE_ROOT=1`”

—is stale after the per-operation split, and contradicts the updated summary. The task rubric also retains that obsolete instruction.

Do not prescribe full-root live execution as the remedy for a DDL privilege requirement.

---

## 7. The three-count / charge-delta surface is not fully sound

These are newly identified from the supplied sources; they are not all newly introduced by P5.

### A. Both `--window ALL` predicates contain malformed SQL

Both tools return:

```python
"no_rawat LIKE '____/__/__/8_____%"
```

The SQL string has no closing quote.

Their full-window query therefore cannot execute as advertised. Historical A3 evidence may exist, but **the current embedded tools do not support the claimed runnable full-window gate.**

Even with the quote repaired, the generated-marker predicate excludes the 354 Stage-A registrations. “ALL generated-marker visits” is not “all 86,455 DR visits.”

### B. The builder’s transaction is fictitious across calls

The builder performs:

```python
dbutil.execute(..., "START TRANSACTION; DELETE ...;")
...
dbutil.execute(..., "REPLACE INTO ...")
...
dbutil.execute(..., "COMMIT")
```

But every `execute()` invokes a new `mysql` process:

```python
p = subprocess.run(argv, input=sql, ...)
```

For the intended transactional table:

1. START/DELETE runs in connection A.
2. Connection A closes without COMMIT; the DELETE rolls back.
3. REPLACE batches run in separate autocommit connections.
4. COMMIT runs on another connection with no corresponding transaction.

**Obsolete ledger keys can survive, and a failed build can leave partial updates.** A clean no-op rebuild does not test this defect.

The delete and tax predicates also fail to implement the selected cohort consistently. Fixing connection lifetime without fixing those predicates would expose additional replacement-scope problems.

This directly contradicts the report’s “transactional” P2 PASS claim.

### C. Tariff and integer claims remain too broad

Missing tariff codes fall back to source prices even without `--allow-legacy-fallback`. An unreadable tariff can pass with `--allow-legacy-fallback --require-tariff`, because the latter checks only `"empty"`.

The builder’s “no float” claim is contradicted by:

```python
f = float(x or 0)
tax = irup(float(s or 0) * 0.11)
```

Invalid numeric inputs can silently become zero, and quantities are coerced to integers. These may match the canonical fixture’s limited domain; they are not general fail-closed monetary validation.

### D. Three-count B is independent, but not encounter-complete

B genuinely reads form-save tables. Credit retained.

But it checks a **cohort-wide B amount**, not encounter-by-encounter completeness or agreement. `c_rows_visit` is unused, as is the parsed `--verify-form-save` option. Offsetting B errors can escape a total-only comparison.

Also, its documented PARTIAL exit contract is wrong. When A==C and B is absent, the final expression returns **1**, despite the docstring saying exit 0. Conservative, but inconsistent.

### E. Charge-delta’s unknown-status check is an amount check

```python
other_total = sum(v.get("other", 0) for v in kx.values())
```

That is not an unknown-row count. Zero-total or offsetting unknown-status rows can evade this tool’s check. Three-count separately gates unknown **row count**, so the paired surface is stronger than charge-delta alone.

The quantity gate also cannot detect redistribution that preserves both component amount and component quantity. The source comment asserting that redistribution necessarily changes the quantity total is mathematically false.

---

## 8. Report honesty and arithmetic

### Corrections that hold

- \(60,000/65.5 = 916.03\) visits/min: **916 wall-clock v/min is correct**.
- \(60,000/64.2 = 934.58\) visits/min: the internal measurement is correctly separated now.
- \(47.8\times60,000/86,101 = 33.31\) ms/visit.
- \(999\times60/8,393 = 7.14\) real-form visits/min.
- \(4/216\times100 = 1.8519\%\).
- \(354+86,101=86,455\).
- \(34,870,243,633-34,727,295,800=142,947,833\) rupiah.
- \(34,895,128,580-34,870,243,633=24,884,947\) rupiah.
- The monthly table sums to **86,455 visits** and **1,393,815 billing rows**.
- The displayed PPN-inclusive drug amounts support approximately **82.7%** of revenue.

The B-subset update is:

\[
151-149=2\text{ notes}
\]

\[
49,903,019-49,738,954=\mathbf{164,065}\text{ rupiah}
\]

Section 3’s older B figures need an explicit as-of label or update.

### Honesty boundaries that hold

The report correctly refuses population correctness, GUI-at-86k-scale and billing-level A==B equivalence. Its Demo B causality disclaimer is appropriately narrow. P5 does not solve these limitations, and mostly does not pretend to.

### Contradictions still requiring correction

- §15 calls Demo A a **scratch `sik_p2`** run; the summary says the current rerun was on **live `sik`**.
- §14 attaches current P5 behavior to authored scratch edge fixtures without separating that historical fixture from the nonexistent-visit rerun.
- The rubric still cites superseded oracle SHA **`c729ad06…`**, not **`70f37ba3…`**.
- §15 and rubric retain obsolete full-root instructions.
- `REPAIR-SKIPPED`, guaranteed stage cleanup and restored-all-FAILED prose exceed code behavior.
- §12 still says six native-table queries read raw billing, while §5 says three scaling queries do.
- The rule-of-three calculation is \(3/999=0.3003\%\), but that is **not a population billing-error bound** without sampling and oracle-validity assumptions.

The release manifest is improved, especially by pinning `dbutil.py`. But pins are not a complete reproducibility package. The statement that DB images are “too large to pin by hash” is technically wrong: large files can be hashed incrementally. Distribution and archival cost are separate issues.

Cross-machine execution and DOI remain open. So do packaging the exact generator, consumer, harness, fixtures, grants and operational configuration needed to reproduce the run—not just the gate scripts.

---

## 9. Final judgment and required next step

### Is the oracle fit for its stated claims?

**For the narrow claim:**  
“When a normally completed run computes an in-envelope frozen-row mismatch, it returns exit 1 rather than 0” — **yes**.

**For eligibility-based not-covered classification in finalization:** **yes**.

**For “crash-safe fail-closed oracle, complete pre-run restoration, verified edge-strata demo, clean target afterward”: no.**

Do not demand another cosmetic wave. Require one executable acceptance suite on an **asserted disposable clone**:

1. Nonempty clean baseline → nonempty matching output → exit 0.
2. Controlled in-envelope row mismatch → exit 1 through finalization.
3. Nonzero JVM exit, timeout, missing success marker and missing settlement → documented failure.
4. Real edge fixtures with valid registrations → classified rows and exit 4.
5. Missing registration → structured rejection, never a date traceback.
6. Failure injected midway through restore → preserved recovery material and no false “restored/clean” claim.
7. Full pre/post content hashes across every reset table and relevant registration state.
8. No surviving Java process and no unverified stage-drop failure.
9. Same-RUN_ID/different-stage and overlapping-visit concurrency tests.
10. Corrected full-window gates and a ledger replacement test proving obsolete-row deletion and rollback on failure.

**Bottom line:** P5 repaired a consequential exit-code defect. It has not yet earned its PASS rubric. The next deliverable should be executable recovery evidence and corrected database semantics—not stronger report language.

## REPRODUCIBILITY

## Reproducibility verdict: **5/10 — pinned, but not independently reproducible yet**

P4’s byte-identical B3 encounter replay, seeds, and runtime pins remain genuine credit. P5 improves identification of the verification tools. But **identifying a build is not the same as providing a reproducible, working experiment**, and the embedded code still contradicts parts of the execution record.

### First, correct the version and privilege record

Your closing question repeats superseded information:

| Item | Current embedded evidence |
|---|---|
| Oracle SHA | **`70f37ba3…`**, not first-pass `c729ad06…` |
| `dbutil.py` SHA | **`7ce404a1…`**, newly pinned |
| Builder SHA | **`6f81ec1f…`** |
| Live `DBUTIL_FORCE_ROOT=1` requirement | **Not required by the patched design**: stage CREATE/DROP explicitly use `force_root=True`; other operations default to `benchmark` |
| Scratch operation | `DBUTIL_FORCE_ROOT=1` routes **all Python DB operations** to root because scratch grants are absent |

The release manifest has the current pins. The task rubric’s AC-7 still cites `c729ad06…`; report §15’s operational note still says live runs “need `DBUTIL_FORCE_ROOT=1`.” Those are stale instructions, not harmless historical context.

## Does this close finding #3?

**Yes as removal of a misleading control; no as implementation of independent provenance.**

The builder no longer exposes `--manifest-file` or `--require-manifest`, and its docstring explicitly says:

> “A pre-adapter encounter manifest was considered but is NOT implemented.”

That is the right correction. An existence-only check must not masquerade as provenance validation.

However, two different manifests must not be conflated:

- **Release manifest:** identifies tool versions and runtime artifacts.
- **Pre-adapter encounter manifest:** would independently establish expected codes and quantities before those data enter the shared database source.

Updating release-tool SHAs does **not** solve the second problem. The builder still derives quantities/codes from `rawat_jl_dr` and `detail_pemberian_obat`. Finding #3 is closed by withdrawing the fake control, **not by delivering its intended assurance**.

## Ranked reproducibility blockers

### 1. **Critical: the current source and reported demonstrations do not fully agree**

The re-anchored STRATA summary says there are no live `reg_periksa` rows. But the oracle obtains its batch date through:

```python
tgl = dbutil.scalar(db, "SELECT tgl_registrasi FROM reg_periksa ...")
by_date.setdefault(tgl, []).append(n)
```

For those visits, `tgl` is `None`. The normal execution path later uses:

```python
d.replace("-", "_")
```

There is no synthetic-date fallback. Moreover, state serialization turns a `None` dictionary key into `"null"`, adding a resume inconsistency.

**The stated live STRATA rerun cannot be reconstructed from these inputs and this source as presented.** Either the fixture description, execution source, or omitted setup is wrong.

A second contradiction: the current code logs `REPAIR-SKIPPED` only inside the **BILLED** branch when `ok_flag` is false. Yet newly BILLED batches require every visit’s `sukses=true`. FAILED batches emit rows but no such log. The claimed STRATA `REPAIR-SKIPPED` lines therefore need reconciliation too.

Require exact command lines, fixture creation, state files, complete logs, exit statuses, and hashes of the files actually executed. A corrected summary alone is insufficient.

### 2. **Critical: pinned gate/builder code contains reproducibility-breaking defects**

Both reconciliation tools construct malformed SQL for `--window ALL`:

```python
"no_rawat LIKE '____/__/__/8_____%"
```

The SQL literal lacks its closing quote. Consequently, the **current embedded full-window gate path cannot reproduce the claimed result**.

The builder’s “transactional replacement” also does not survive inspection of `dbutil.py`:

```python
dbutil.execute(..., "START TRANSACTION; DELETE ...;")
# subsequent execute calls insert batches
dbutil.execute(..., "COMMIT")
```

Each call launches a **new mysql process and connection**. On transactional tables, the uncommitted DELETE rolls back when its connection closes; subsequent REPLACEs commit independently. The final COMMIT belongs to another session.

This means stale charge keys can survive and interrupted rebuilds can leave mixed state. **A clean one-time rebuild is not evidence of reliable re-derivation.**

These are newly identified assessment defects; the supplied evidence does not establish that P5 introduced them.

### 3. **High: the release package is not a complete reconstruction package**

The manifest itself says:

> “the on-box `/opt/Deers-Rock` tree is not a git checkout”

The five tool hashes do not identify the entire generator/adapter/consumer/harness implementation and configuration used in the experiment. The local research commit is not demonstrated to match that deployed tree.

Missing or insufficiently anchored dependencies include:

- Exact deployed consumer and harness artifacts.
- Schema and deterministic fixture/seed bootstrap.
- Grants, root-authentication setup, and required configuration.
- Retrievable artifacts corresponding to the recorded hashes.

The statement that DB images are “too large to pin by hash” is wrong. **Large files can be hashed incrementally.** Storage and distribution may be expensive; hashing is not the obstacle. Alternatively, provide a complete deterministic reconstruction recipe.

### 4. **High: privilege and target-selection instructions are incomplete and contradictory**

The DDL/DML split is real:

```python
dbutil.execute(..., force_root=True)  # CREATE/DROP
```

But it introduces an explicit operational dependency: the executing OS account must successfully invoke `mysql -uroot`. A third party also needs benchmark-user DML permissions on newly created stage tables.

The documentation should specify and test:

1. Root authentication prerequisites.
2. Benchmark grants, including newly created stage tables.
3. Live mode with the environment override **unset**.
4. Scratch mode with explicit target validation.
5. Harness `database.ini` alignment with `--db-name`.

The environment override is **not an isolation guard**: nothing prevents root operations against live `sik`. Also, `--db-name` does not itself configure the Java harness target.

**Documented enough to explain the developer’s workaround? Yes. Enough for a safe third-party runbook? No.**

### 5. **Medium: second-machine replay remains untested**

The B3 hash `84991ca4…` establishes same-environment encounter-set replay. Preserve that credit.

It does not establish fresh-machine reconstruction, financial-output equivalence, or portable harness behavior. Run the pinned package on a second provisioned machine and compare encounter hashes, ledger content, and gate artifacts—not only aggregate row counts and revenue.

### 6. **Medium: durable archival remains open**

DOI/Zenodo publication is outstanding. A DOI alone would not repair the execution defects above; an accessible, complete, immutable package matters more than its identifier.

For release readiness, archive the actual source/binaries, reconstruction inputs, manifest, and acceptance evidence together.

## Bottom line

**P5 improves version traceability and honestly removes the fake manifest control. It does not close reproducibility.**

The next step is not another manifest edit. It is a **fresh-clone reconstruction using the current pinned files**, with verified privilege setup, working full-window gates, genuinely transactional ledger construction, and transcripts that match the fixtures and source. Until that succeeds, “re-derivable without the original live box” remains an unsupported release claim.

## E2E-DESIGN

# Third assessment: **50/100 — NOT READY**

**P5 fixes the original fail-open return path. It does not establish the broader “fail-closed, crash-safe, fully restored” contract claimed in the report.** More seriously, parts of the re-run evidence still cannot be reconciled with the current embedded source.

The hybrid benchmark remains fairly characterized. A full same-encounter financial E2E equivalence claim remains unjustified. The weakest scientific leg is still the form-settlement gap; the immediate engineering blockers are recovery correctness, gate implementation defects, and evidence that does not match the executable.

This is a source-and-evidence assessment, not an independent execution. I credit supplied execution summaries where they are consistent with the code; I do not treat a filename, SHA listing, or checked rubric as execution proof.

## Scores

All six criteria are equally weighted.

| Criterion | Score /10 | Assessment |
|---|---:|---|
| Claim honesty | **5** | Structural limitations and drift-demo causality are disclosed well. Current demo location, repair logging, recovery, transactionality, and operational claims remain contradictory. |
| Gate correctness | **4** | Oracle verdict propagation and conditional BILLED are real fixes. Full-window SQL is broken in both gates; ledger replacement is not transactional. |
| Oracle validity | **3** | Classification and mismatch exits improve substantially. Baseline verification, resume identity, timeout handling, and restore verification remain inadequate. |
| Reproducibility | **6** | Credit retained for B3 replay, seeds, runtime pins, and newly pinned dbutil. Artifact availability, source coverage, environment assumptions, cross-machine replay, and DOI remain incomplete. |
| E2E design | **5** | Honest hybrid, but no demonstrated same-encounter financial equivalence. P5 improves enforcement, not the missing comparison surface. |
| External-validity scoping | **7** | C1–C4 and generalization are appropriately excluded. This scores disclosure, not demonstrated external validity. |
| **Total** | **30/60** | **30 ÷ 60 × 100 = 50/100**, up **7 points** from 43. |

---

## 1. Disposition of all seven prior findings

### Finding 1 — Fail-open exits and unconditional BILLED: **substantially fixed, with important boundaries**

The principal return-path defect is fixed:

```python
rc = _finalize(...)
...
return rc
```

and:

```python
if __name__ == "__main__":
    sys.exit(main())
```

The ordinary execution path no longer discards `_finalize`’s verdict.

The status transition is also genuinely fixed:

```python
if rc == 0 and all(sukses.get(v, False) for v in nrs):
    b["status"] = "BILLED"
```

A missing success marker is false, not implicitly successful. Otherwise, the code calls `stage_restore`, records FAILED, and stops the current processing loop.

The final verdict priority is correctly implemented:

```python
if failed_batches or out_of_env:
    exit_code = 4
elif drift or parse_errors:
    exit_code = 1
else:
    exit_code = 0
```

**Credit:** An actual in-envelope mismatch detected in a BILLED batch cannot take the normal exit-0 verdict path.

**Boundary:** This does not prove that every requested encounter is diffed, every infrastructure failure produces exit 4, or every failed/destructive operation is restored. Several exceptions still escape; recovery and resume defects are discussed below.

The explicit `--freeze-only` and `--verify-frozen` success returns are legitimate administrative modes, not the old unconditional billing-run success defect. The exit contract should say that.

### Finding 2 — Attempt-based not-covered classification: **fixed in the implementation**

The code now records eligibility failures:

```python
st["out_of_envelope"] = sorted(bad) if (args.allow_strata and bad) else []
```

`_finalize` labels membership in that set as `OUT-OF-ENVELOPE`, excludes those rows from the in-envelope diff denominator, and forces exit 4.

That is the requested eligibility-based mechanism. It no longer depends on whether a visit was attempted.

Two qualifications:

* Eligibility is recomputed and overwritten on resume rather than checked against the original frozen run definition.
* The predicate explicitly checks nonzero embalase/tuslah, procedure count, and presence of drug/procedure rows. It does **not** independently classify half-rupiah PPN or zero-fee clinics as unsupported. Five nonexistent identifiers do not validate five distinct financial edge predicates.

### Finding 3 — Unconsumed manifest control: **fixed by honest withdrawal**

The manifest flags are absent. The builder now states:

> “A pre-adapter encounter manifest was considered but is NOT implemented.”

Good. This removes a fake control; it does not create independent quantity/code provenance. The shared-source limitation remains.

### Finding 4 — Line-diff scope overstatement: **report substantially fixed; source comments still wrong**

Section 14 now accurately describes:

> “per-visit per-component quantity … in aggregate, not code-level line items.”

However, the gate source still claims:

> “a quantity re-allocated between codes within a component still shifts the per-visit per-component quantity total.”

That is false. Moving one unit from code X to code Y preserves the component quantity total. If both have the same price, it also preserves the amount.

This gate catches **aggregate quantity changes**, not arbitrary quantity misallocation between codes. The report’s particular injected example may have changed the aggregate; do not generalize that result.

### Finding 5 — Report inconsistencies: **partially fixed**

The requested local repairs are present:

* MySQL **8.0.46**, not 8.4.
* **65.5 ms/visit wall** and **64.2 ms/visit internal** separated.
* Diagnosis-table and generated-slice scopes distinguished.
* Line-diff narrowed.
* Eligibility-based classification described.

But the report is still not internally consistent:

1. Section 15 says the current STRATA demo ran on **scratch `sik_p2`**; the superseding summary says **live `sik`**.
2. Section 15 says live runs **need `DBUTIL_FORCE_ROOT=1`**, immediately after describing the per-operation escalation intended to remove that requirement.
3. The rubric’s AC-7 still cites superseded oracle SHA **`c729ad06…`**, not current **`70f37ba3…`**.
4. Section 12 says six native-table queries read raw billing; section 5 says three of seven scaling queries do.
5. Section 3 still presents B as **149 notes / Rp 49,738,954**, while the post-demo summary gives **151 / Rp 49,903,019**. Historical figures are acceptable, but they need explicit snapshot labels.
6. The blanket “all gates must return PASS” rule conflicts with the expected live **`P2-BC-TOTAL` FAIL**. Distinguish A–C acceptance from the intentionally failing B-total comparison.

### Finding 6 — Global stage tables: **mitigated, not eliminated**

The prefix now includes sanitized `run_id`:

```python
return "r5_stage_%s" % re.sub(r"[^A-Za-z0-9_]", "_", ...)
```

That separates distinct, noncolliding run IDs.

It does **not** match the lock namespace. Locks are under:

```text
results/<run_id>/<stage>_oracle_run_r5/
```

Stage tables contain the run ID but **not the stage**. Two stages under the same run ID can hold separate locks and share or drop each other’s backups. Sanitization can also map distinct IDs to the same prefix.

Even unique backup names do not prevent two runs from resetting the same live encounters concurrently.

**Required fix:** collision-resistant run/stage identity, plus database/encounter-level exclusion for overlapping mutation.

### Finding 7(a) — Header-only FAILED CSV: **fixed in `_finalize`**

The non-BILLED branch now emits a row for each visit:

```python
"mismatch": None,
"batch_status": fail_status,
"fail_reason": fail_reason
```

Thus, a FAILED batch reaching `_finalize` no longer produces only a header. CSV `None` values are serialized as empty fields, not literal `null`; the semantics are nevertheless appropriate.

**But:** this verifies the emitter, not the claimed STRATA execution. That demonstration has a separate reproducibility contradiction below.

### Finding 7(b) — CREATE traceback mislabeled as drift proof: **code cause addressed; re-run proof incomplete**

DDL escalation is real:

```python
dbutil.execute(..., force_root=True)
```

and dbutil selects `-uroot`. Ordinary calls use `-ubenchmark`, unless the environment override routes everything to root.

Stage-backup exceptions now become FAILED before reset:

```python
except Exception as e:
    b["status"] = "FAILED"
    b["restored"] = False
    ...
    return 1
```

That is a useful fail-closed infrastructure path.

However:

* Root authentication and benchmark DML grants on newly created tables remain runtime prerequisites.
* A run under `DBUTIL_FORCE_ROOT=1` does **not** validate the DDL/DML privilege split.
* The embedded summary describes a corrected drift verdict, but does not include the raw verdict transcript and environment needed to independently establish the claimed unset-environment run.

Credit the code repair. Do not inflate it into comprehensive execution proof.

---

## 2. Two current evidence claims still contradict the source

### A. The re-anchored Demo A cannot run as described

The summary explicitly says the five synthetic identifiers have **no live `reg_periksa` rows**.

The code obtains dates using:

```python
tgl = dbutil.scalar(db, "SELECT tgl_registrasi FROM reg_periksa ...")
by_date.setdefault(tgl, []).append(n)
```

For those identifiers, `tgl` is `None`.

Before billing, the resume loop executes:

```python
"harness_%s.log.pid" % d.replace("-", "_")
```

`None.replace(...)` raises `AttributeError`.

There is no fallback date of `2026-10-01`. Persisting batches also converts a `None` dictionary key into the JSON key `"null"`, creating another resume inconsistency.

Therefore, the combination of:

* no registration rows,
* this exact current source, and
* a successful dated FAILED/restore/finalize transcript

is not reproducible as stated. Some fixture condition, code revision, or execution description is missing or wrong.

### B. “REPAIR-SKIPPED fired” is not supported by the normal P5 control flow

The only `REPAIR-SKIPPED` logging is inside the BILLED branch under:

```python
if not ok_flag:
```

But a newly BILLED batch now requires **every** `ok_flag` to be true.

FAILED batches enter the other branch, which emits rows but never logs `REPAIR-SKIPPED`. `_bill_date` accepts `repair_consumer` but does not use it.

Consequently:

* default automatic consumer repair is effectively removed — good;
* the advertised opt-in repair is unreachable in ordinary fresh runs;
* the claimed FAILED-STRATA `REPAIR-SKIPPED` lines cannot come from that path in this source.

**AC-4 cannot remain an unqualified PASS.**

---

## 3. Demo A re-anchoring: narrower test, not equivalent acceptance evidence

Even setting aside the date bug, nonexistent identifiers on live `sik` are not equivalent to populated edge-stratum encounters on a disposable clone.

They can test, after repairing the date handling:

* rejection by the eligibility predicate;
* missing/false harness success;
* FAILED status;
* non-diff result rows;
* exit 4.

They do **not** test:

* embalase, tuslah, rounding, zero-fee, or multi-procedure billing behavior;
* restoration of nonempty financial state;
* disposable-clone isolation;
* the “live untouched” acceptance condition.

Restoring an empty pre-state is a weak rollback test. Synthetic keys reduce collision risk; they do not turn the live database into a disposable clone.

**Verdict:** useful as a negative-input smoke test, not equivalent to Demo A’s original acceptance claim. Section 15’s scratch wording must be corrected, and the full populated-clone test remains open.

---

## 4. The gate surface is not sound enough for the report’s claims

These are newly identified findings in this assessment; they are not necessarily regressions introduced by P5.

### Blocker: ledger replacement is not transactional

The builder does:

```python
dbutil.execute(..., "START TRANSACTION; DELETE ...;")
```

then separate calls for inserts, and finally:

```python
dbutil.execute(..., "COMMIT")
```

But every `dbutil.execute` launches a **new mysql process and connection**:

```python
subprocess.run(argv, input=sql, ...)
```

On transactional tables, the first connection exits without committing its DELETE, so that transaction rolls back. Subsequent `REPLACE` calls commit independently. The final COMMIT operates on another connection.

Therefore:

* obsolete ledger keys can survive;
* a failed build can leave a partially updated ledger;
* there is no atomic cohort replacement.

Section 0’s “transactional” PASS and the builder’s documentation are false for this implementation.

**Fix:** one persistent transaction/session, or build and validate a replacement dataset before an atomic publication step. Add delete-source and mid-build-failure tests.

### Blocker: `--window ALL` SQL is malformed in both gates

Both return:

```python
"no_rawat LIKE '____/__/__/8_____%"
```

There is no closing SQL quote.

Thus the embedded versions cannot support their claimed `--window ALL` behavior.

Additionally, the builder’s ALL predicate selects generated `8...` encounter identifiers, not all DR encounters, excluding the 354 Stage-A visits. “ALL” must have one documented, consistently implemented meaning.

### Other gate defects

* **Three-count PARTIAL exits 1**, despite its documentation promising exit 0. With `gate_pass=True`, `partial=True`, and `b_verified=False`, its return expression is false.
* `--verify-form-save` is parsed but unused.
* B verification means some form-save content exists. It does not establish full encounter coverage or per-encounter financial agreement; B is compared only in aggregate.
* Charge-delta gates the **sum of unknown-status amounts**, not their row count. Unknown rows with zero amount or offsetting amounts can evade that check. Three-count’s row-count check is stronger.
* Missing per-code tariffs fall back to source prices even without the legacy flag. The fail-closed tariff claim covers an empty/unreadable authority table, not complete authority coverage.
* “Integer money end-to-end” overstates the implementation: builder rounding uses floats and converts invalid values to zero.

October A–C success can still be a valid observed result. It does not establish that this entire verification surface is sound.

---

## 5. Remaining oracle risks

### Timeout recovery can race a surviving JVM

`run_harness` starts `bash -c`, then on timeout:

```python
p.kill()
```

It does not kill and wait for the whole process group. The Java descendant may survive and continue writing while the oracle restores state.

Resume also waits for a recorded PID but does not enforce termination after the wait.

That contradicts an unconditional crash-safe restoration claim.

### Restore success is asserted, not hash-verified

Restore is a sequence of separate DELETE and REPLACE operations. It has no encompassing transaction and no post-restore comparison against staged row hashes.

A restore exception can leave partial state. The acceptance request explicitly called for **complete pre-run state restored and hash-verified**; the current implementation does not deliver that.

### Frozen-baseline verification is incomplete

The verifier compares:

```python
("count_billing", "count_reg_periksa")
```

Yet the fingerprint deliberately no longer records `count_billing`. Other recorded source-table counts are not compared, and counts would not detect price changes anyway.

Per-visit files are checked against their **own** stored hashes, not against the manifest’s pinned per-visit hashes. The aggregate manifest hash is not recomputed.

This is not robust immutable-baseline verification.

### Resume does not bind the original sample

The current visits file overwrites `st["nrs"]`, while existing batches remain. There is no equality check between:

* requested encounters;
* frozen manifest encounters;
* batch encounters;
* eligibility classification.

A changed visits file can introduce encounters that never enter existing batches while the run finalizes successfully on the old ones.

Also, encountering an existing FAILED batch sets a flag and `continue`s, allowing later pending batches to run on resume. That violates the unqualified “no further batches” wording.

### Cleanup claims are unconditional even when cleanup fails

`stage_drop` catches all exceptions and still logs:

> “box left clean”

A clean verdict can therefore coexist with failed cleanup. Report observed hygiene separately from guaranteed hygiene.

### Privilege split judgment

The DDL/DML split does not itself contaminate the financial oracle. It is a reasonable operational fix.

It does broaden the trust boundary: the executable can invoke root, and the environment override makes **all** operations root operations against any selected database, including live `sik`. There is no enforced scratch-only guard.

Use an asserted disposable target and narrowly provisioned permissions. An environment variable named for fixture convenience is not isolation.

---

## 6. Honesty boundaries and arithmetic

### Drift causality: the boundary holds

Section 15 correctly says:

> “the tamper’s causal role is not established”

and:

> “What is proven is the exit contract.”

That is the right distinction. A B-subset-driven mismatch can validly test the mismatch-exit branch. It need not be price-tamper-caused.

**“Fail-closed” is not an overclaim because of that causal limitation.** It is an overclaim when extended to universal encounter coverage, verified rollback, timeout safety, and crash-safe operation.

### Financial equivalence: still unclaimable

The report retains the important admission:

> “Not a `billing`-level form-settlement equivalence.”

Keep it. Neither conditional BILLED nor exit-code propagation fills that structural gap.

The clean two-visit demo also needs an explicit explanation of how its settlement rows matched while the drift fixture’s form path did not persist settlement rows. Without encounter-level provenance, it establishes only that some observed state compared equal.

### Arithmetic checks

* B3 consumer:  
  `47.8 × 60,000 / 86,101 = 33.31 ms/visit`; approximately **1,801 v/min**, consistent with rounded 1,802.
* Real form:  
  `999 × 60 / 8,393 = 7.142 visits/min`; consumer/form rate ratio is approximately **252×**.
* Burst:  
  `60,000 / 65.5 = 916.0 visits/min`.  
  `60,000 / 64.2 = 934.6 visits/min`.  
  Separating those measurements fixes the inconsistency.
* Historical drift: `4/216 × 100 = 1.8519%`.
* Rule of three: `3/999 × 100 = 0.3003%`.  
  Correct arithmetic, but not a justified population financial-correctness bound for a stratified, structurally limited consumer-oracle measurement.
* Cohort bridge: `86,455 − 86,101 = 354`.
* Revenue bridge:  
  `34,870,243,633 − 34,727,295,800 = Rp 142,947,833`.
* Snapshot bridge:  
  `34,895,128,580 − 34,870,243,633 = Rp 24,884,947`.
* B changed by **2 notes / Rp 164,065**. That is plausible form-save growth, not proof of byte-identical live restoration.

---

## 7. Reproducibility and external validity

Credit retained for the previously verified B3 replay, seeds, hybrid disclosure, and burst reframing. The current manifest also usefully pins oracle **`70f37ba3…`** and dbutil **`7ce404a1…`**.

But hashes identify artifacts; they do not supply them or prove the described run used them. The pinned surface does not fully capture the harness, consumer, adapter, fixture reconstruction, grants, or mutable `database.ini` targeting.

The manifest’s statement that DB images are “too large to pin by hash” is not technically credible. Large images can be hashed; distribution and archival are the hard parts.

Cross-machine replay and DOI remain open. C1–C4, payer/clinical calibration, and second-system generalization remain NOT TESTED. The ICD-10 mapper should remain opt-in and explicitly uncalibrated; no embedded mapper evidence warrants additional validation credit.

---

# E2E verdict and required next step

**Is E2E fairly claimed?**  
**Only as a hybrid synthetic billing benchmark:** direct-DB fixtures, simulator-scale consumer execution, and sampled real-form interaction. Not as validated same-encounter financial equivalence, and not as population-wide Khanza correctness.

**Is it internally consistent now?**  
**No.** Section 15 and the rubric still claim execution and operational properties that the code does not support.

**Weakest remaining leg?**  
Scientifically, still the **B-subset settlement gap**. Operationally, unverified recovery and contradictory demo evidence now block trusting the claimed fail-closed release.

**Fix:** build a populated disposable-clone acceptance suite with independently pinned encounter expectations. Capture and compare the actual form financial output for the same encounters—or explicitly retain the weaker hybrid claim. Inject mismatch, missing settlement, nonzero JVM exit, timeout with descendants, stage failure, interrupted restore, and changed resume input. Require encounter coverage equality, process-group termination, exact restore hashes, and evidence produced by the currently pinned binaries.

Before that suite, fix the broken ALL predicates and nontransactional ledger builder. Otherwise you are using defective gates to certify the recovery test.

**E2E-design score: 5/10. P5 is meaningful progress, not a release-ready close-out.**

## EXTERNAL-VALIDITY

## External validity: **4/10 — honestly scoped, externally unvalidated**

P5 improves enforcement and internal consistency. **It adds no external-validation evidence.** Correcting MySQL to 8.0.46 and distinguishing wall-clock from consumer-internal latency makes the report more accurate—not more representative.

### Top external risk: no real-facility calibration (**C4**)

**C4—comparison with anonymized monthly aggregates from one real facility—is the single missing external item that most limits publication value.**

There is no demonstrated link between this synthetic workload and actual hospital operations. Visits/day, revenue/visit, drug share, diagnosis mix, and temporal patterns remain unanchored. The reported **~82.7% drug share, including PPN**, illustrates the problem: it is a measured property of this fixture, not evidence of a representative hospital revenue mix.

Without C4, the benchmark can show that a particular synthetic workload executes and reconciles. It cannot establish that its workload composition or resulting performance is operationally meaningful. One facility would provide an initial calibration anchor—not broad generalizability.

Other gaps remain substantial:

- **C1/C2:** Diagnosis calibration and clinical coherence are NOT TESTED. An opt-in, master-sampled ICD-10 mapper does not fix either. FK integrity, deterministic output, and zero billing impact are engineering properties, not clinical validation.
- **C3:** Payer mix, demographics, return visits, and temporal rhythms remain unvalidated.
- **Cross-machine D2:** Portability remains untested; same-box replay does not establish it.
- **DOI:** Archival remains incomplete. That affects accessibility and reproducibility, but a DOI would not validate the workload.

“Human-gated” identifies the dependency. **It does not reduce the evidentiary gap.**

### Is the boundary publication-safe? **Yes—for the narrow systems claim**

Section 13 says:

> “This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

That is an appropriate boundary. It supports publication as a **single-configuration synthetic systems benchmark**, not as validation of realistic hospital operations or general billing correctness.

However, a caveat is not a waiver for broader claims elsewhere. This boundary must govern the **title, abstract, conclusions, and performance comparisons**, not merely appear in §13. “Real-form comparisons” must also retain the disclosed limitation: they do **not** establish same-encounter financial settlement equivalence.

### Score rationale

**4/10:** strong credit for explicit exclusions and the absence of a false clinical-calibration claim; substantial deductions because essentially the entire real-world calibration surface remains untested. P5 earns **no external-evidence uplift**. The scoping is defensible; the external validity is still weak.

## VERDICT

## Overall verdict: **Needs targeted rework — 43/100**

P5 fixes consequential normal-path defects, but does not establish a crash-safe, reproducible release. The strongest improvement is executable verdict handling; the main blockers are defective database semantics, unverified recovery, and execution narratives that conflict with the reviewed source.

**Comparison:** **+8 points versus run 4701365 (35/100); unchanged versus run 4769794 (43/100).** That flat total does not mean no progress: stronger honesty and reproducibility are offset by newly exposed oracle weaknesses.

Here, **“verified” means supported by the code evidence in the supplied assessments**, not independently executed in this synthesis.

## Criterion scores

| Criterion | Score | Δ vs first / second prior | Evidence-based justification | Biggest remaining risk |
|---|---:|---:|---|---|
| **Claim-honesty** | **5/10** | **+1 / 0** | The report appropriately narrows its claim to “one Khanza/MySQL configuration,” but still calls the builder “transactional” despite separate `dbutil.execute(...)` calls opening separate connections. | Unsupported restoration, cleanup, and demo claims could cause readers to trust guarantees that the implementation does not provide. |
| **Gate-correctness** | **3/10** | **0 / 0** | “`main()` returns `_finalize`’s result” and BILLED requires rc=0 plus success markers, but both reconciliation tools retain the malformed ALL predicate `"no_rawat LIKE '____/__/__/8_____%"`. | Historical PASS artifacts can conceal broken current-source full-window execution, while exceptional and maintenance paths remain outside the ordinary-path guarantee. |
| **Oracle-validity** | **3/10** | **−1 / −1** | Eligibility-based classification through `st["out_of_envelope"]` is real, but the assessment rejects “complete pre-run restoration” and identifies component-total checks rather than independent code-level reconciliation. | Shared-source blind spots and incomplete recovery can leave a verdict unsupported by either independent expected results or verified database state. |
| **Reproducibility** | **6/10** | **+3 / +1** | The manifest pins oracle `70f37ba3…` and dbutil `7ce404a1…`, and B3 hash `84991ca4…` supports same-environment replay, although the exact harness, fixtures, grants, and configuration remain incompletely packaged. | A third party still cannot reliably reconstruct and safely execute the claimed experiment without the original environment. |
| **E2E-design** | **5/10** | **+1 / 0** | The design is defensible “only as a hybrid synthetic billing benchmark,” combining direct-DB fixtures, consumer execution, and sampled real-form interaction without same-encounter financial settlement equivalence. | The B-subset settlement gap prevents form interaction from serving as an independent financial end-to-end oracle. |
| **External-validity** | **4/10** | **+1 / 0** | Section 13 explicitly disclaims “representative hospital performance” and generalization, while C1–C4 remain NOT TESTED and the approximately 82.7% drug share is only a fixture property. | Workload composition and performance may not reflect any operational hospital population, despite accurate reporting of this synthetic configuration. |

**Scoring reconciliation:** The embedded **48/100** calculation uses **7/10 for external validity**, contradicting that section’s explicit **4/10** judgment and acknowledgment that scope discipline is not external evidence. The consistent synthesis is:

\[
(5+3+3+6+5+4)\times\frac{10}{6}
=43.33 \rightarrow \boxed{43/100}.
\]

## 1. Disposition of the six prior re-assessment findings

| Prior finding | Verified resolution | Merely claimed or still open |
|---|---|---|
| **1. Fail-open exit / unconditional BILLED** | **Fixed on ordinary execution/finalization paths:** the finalizer’s return value propagates, and BILLED requires successful execution and markers. | **Not universally closed:** maintenance early returns, resume behavior, and recovery exceptions remain outside the demonstrated contract; blanket “fail-closed” language overreaches. |
| **2. Attempt-based not-covered classification** | **Fixed in code:** classification uses captured eligibility, not attempt outcome, and FAILED/PENDING batches receive result rows. | The narrated edge-strata rerun is **not verified execution evidence** because its fixture description conflicts with date-handling behavior. |
| **3. Manifest existence presented as an independent control** | **Resolved by withdrawal:** the flags are removed and the shared-source limitation is disclosed. | No independent encounter-manifest control exists; this closes the misleading-control claim, not the underlying independence gap. |
| **4. Overstated line-diff scope** | **Substantially corrected in the report**, which describes component-total quantity checking. | Source commentary still overstates coverage; code-level differences and quantity reallocations preserving component totals remain undetected. |
| **5. Report inconsistencies** | Named version, timing, and diagnosis-scope edits were applied. | **Still open:** wrong STRATA target, obsolete privilege instructions and oracle pin, conflicting raw-billing query counts, stale current-state totals, and unsupported restoration/cleanup claims. |
| **6. Global stage-table interference** | **Partially fixed in code:** distinct sanitized RUN_IDs receive distinct tables. | Same-RUN_ID/different-stage jobs still share tables despite separate locks, and sanitization permits collisions. |

**Additional follow-up subfindings:** Header-only FAILED output is fixed in `_finalize`; explicit root DDL and FAILED handling address the original CREATE failure mechanism. Neither change verifies that the claimed rerun reached finalization or demonstrated drift detection.

## 2. New problems introduced—or exposed—by P5

### Introduced or made explicit by remediation
- **Root-dependent DDL:** `force_root=True` creates an authentication and grants prerequisite without an enforced disposable-target guard; `--db-name` also does not configure the Java harness target.
- **Incomplete stage isolation:** the new RUN_ID-based namespace does not distinguish stages and permits sanitization collisions; this is an incomplete repair, not proven regression from the original global-table design.
- **New close-out overclaims:** claims of `REPAIR-SKIPPED`, guaranteed cleanup, and restoration of all FAILED cases exceed the reviewed behavior.

### Newly exposed, not established as P5-introduced
- **False transactional replacement:** separate mysql sessions mean the DELETE can roll back while REPLACEs commit independently, allowing obsolete rows and partial builds.
- **Broken ALL predicates:** missing closing SQL quotes invalidate current-source full-window execution.
- **Recovery and fixture contradictions:** the supplied evidence establishes unresolved defects, but not when they originated.

## 3. Top three remaining issues

1. **Repair the database primitives:** correct both ALL predicates and implement genuinely atomic ledger replacement, with obsolete-row deletion and rollback tests.
2. **Prove recovery and verdict behavior on a populated disposable clone:** test failures, timeouts, missing registrations/settlement, interrupted restoration, resume changes, and concurrency; require exact pre/post hashes and process cleanup.
3. **Close the evidence chain:** align current-source transcripts, fixtures, report claims, privileges, target configuration, and immutable artifacts; resolve same-encounter settlement equivalence or consistently retain the weaker hybrid claim.

## 4. Top three strongest properties to lead with

1. **Real normal-path verdict repair:** mismatch exit propagation, eligibility-based coverage classification, and non-BILLED result rows.
2. **Deterministic replay and improved provenance:** B3 same-environment encounter replay, seeds, and explicit oracle/helper pins.
3. **A defensible narrow systems contribution:** high-volume synthetic billing-consumer execution on one configuration, with transparent hybrid construction and explicit limits.

## 5–7. Final decision and next step

- **Overall score:** **43/100**
- **Delta versus 35:** **+8**
- **Delta versus 43:** **0**
- **Verdict:** **Needs targeted rework**

**Single most important next step:** After fixing the SQL predicates and transaction semantics, run one current-pinned, populated **disposable-clone acceptance suite** that produces machine-checkable verdicts, injected-failure evidence, and exact pre/post restoration hashes. That execution record—not another narrative close-out—is the critical missing evidence.
