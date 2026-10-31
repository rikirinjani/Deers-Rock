# Astra v13 assessment: dr-khanza-e2e-full-assessment (post P1-P21) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

**Overall v13 verdict: 74/100 — Needs targeted rework.** The safety and comparator repairs are substantial. The benchmark is still not complete, and P21 did not make it complete by correcting the records.

This assessment uses the embedded code, transcripts and independent reviews. I have not executed the repository or independently hashed its files. Where a script is not embedded, I distinguish the reviewer’s verification from what the transcript alone establishes.

### What the independent reviews actually found

| Wave reviewed | Material overclaim or defect | Current disposition |
|---|---|---|
| **P17** | “Final” state preceded C3; snapshot sidecars overwrote the hash command’s exit status; writer-death checks missed surviving groups; P13 restoration remained permissive; A9 did not exercise the stop rule; “paired controls” and “trace-clean” were overstated. | Most code defects repaired in P18–P20. Later final captures are genuinely last. The missing historical T0 clone-drop evidence remains missing. |
| **P18** | “Any unsourced key fails” contradicted the predicate: a mixed encounter could pass. Equal mode did not run the source-unit check. Some OLD arms accepted crashes. The real stop-rule experiment also broke restoration. | Mixed-key and equal-mode gates genuinely repaired in P19. OLD-arm checks strengthened. B4 correctly relabelled as compound and unpaired. |
| **P19** | Failed-batch helper missed `STAGE-DROP-FAILED` and `STAGE-KEEP`. The `ps` control passed after deleting the purported fix. Missing payments were described as differing payments. Repository retrace was overstated. | Helper and mutant control repaired in P20; payment explanation corrected. Repository retrace remains incomplete. |
| **P20** | Records claimed withdrawn traces were committed; “every file” was preflighted; copy log named the wrong final capture; an unexplained hang was called environmental and not a product defect. Missing-log assertions remained permissive. | P21 corrects several sentences, not the remaining executable defects. No new independent score establishes that P21 meets acceptance. |

The corrections generally agree with the evidence. Particularly important: the P20 first chain remains a **failed chain**, not a successful chain with an inconvenient footnote:

> `c4=1 fixture=0 real=1 asserts-failed=2`

The subsequent C4 rerun and short chain are valid additional evidence. They do not retroactively change that result.

### The process defect is stable, even though the code is converging

The raw self-score excesses are:

\[
6,\ 7,\ 3,\ 3,\ 3 \quad\Rightarrow\quad \text{mean}=4.4
\]

Those are rubric points, not directly comparable benchmark percentage points; P17 used an 18-point applicable denominator. Still, the direction is consistent. P17’s self-score was 100%, versus the reviewer’s 61.1%; P20’s was 91.7%, versus 79.2%.

**Both interpretations are true:**

- The executable predicates are converging. Review findings increasingly concern narrower paths and evidence handling.
- The reporting process has a persistent defect: outcomes are written from plans, then inadequately checked against execution.

Independent review is functioning as the missing acceptance test for the author’s prose. That is useful, but it is not an efficient or trustworthy release process.

### Remaining contradictions in the CURRENT packet

1. **The handoff is still not a current-state document.** Its headline says “Latest wave: P17 done”; Records says “trace-clean”; later sections establish P21 and 44 uncovered files. Its history label only explicitly excuses v10/P13 rows. Appending more corrections does not resolve an ambiguous operational instruction.

2. **P17/P18 chronology is internally inconsistent.** Section 29 places P17 at 21:03–22:10Z on October 27; section 30 places its successor P18 at 00:50–02:32Z on the same date. Both cannot describe that sequence. Correct the date from primary timestamps; do not invent a reconciliation.

3. **The release manifest overstates `.bak_p17fix1` verification.** Its P17 paragraph includes that directory in a byte-equal-to-git statement, while later sections explicitly say it was never hashed.

4. **“Clone matches” still means counts, not content.** The corrected output is:
   > `tables=1179 (= sik), 6 key tables row-equal`

   The code compares `COUNT(*)`. “Row-count-equal” is the accurate phrase.

5. **The R5 opening claim that the pipeline “is deterministic and reproducible” remains broader than the release limitation “repeatable on the existing installation.”** Deterministic encounter generation does not establish deterministic harness completion or independent reconstruction.

The v12 table-count bug is genuinely fixed. The doubled-count bug is reported fixed and the current rate arithmetic is consistent, but the old handoff text remains contradictory. Original P13 positive summaries have still not been repaired or retired.

**Score: 7.5/10 — unchanged.** Better disclosure and retained failures earn credit; repeated contradictions in documents labelled “current” prevent an increase.

## GATE-CORRECTNESS

**The main repairs work at their demonstrated scope. “Fails closed” is still too broad.**

### Verified repairs against v12

| v12 finding | Current evidence | Disposition |
|---|---|---|
| Writer termination not mandatory | Cleanup now aborts with exit 3 when `p15_kill_run_harness` fails; paired live-process controls cover TERM resistance, dead leader/live child, unreadable identity and failed `ps`. | **Substantively fixed for tested recorded-group paths.** |
| XML restoration could accompany success | P14 and P13 normal tails require successful restore and probe target `sik`; OLD 0 → NEW 3 on failed restore. | **Fixed in normal tails; EXIT-trap restoration remains open.** |
| A31′ ignored restore result | Predicate now includes `[ "$R31" = "restored" ]`. P18 isolates the clause with equal hashes, then demonstrates OLD suite PASS / NEW FAIL under injection. | **Genuinely fixed.** |
| A28′ evidence was overdetermined | P18 tests the restore clause alone with hashes equal. | **Judge-contract closure established.** |
| Unsafe CREATE/helper setup | Checked P13 CREATE and refusal-safe helper; existing database survives NEW and is destroyed by OLD. | **Genuinely fixed for those paths.** |
| Freshness mistaken for snapshot provenance | Sidecar names suite evidence; foreign/missing sidecar rejected. P18 also fixes `RCH=$?` placement. | **Improved run binding, not a general concurrency-proof provenance system.** |
| Expected-mode unit/cardinality gaps | Unit mutation, missing visit, duplicate payment and registration-shape controls discriminate. | **Fixed for these specified properties, not universal billing-line cardinality.** |

The strongest comparator repair is:

```python
rec["unit_src"] = "DIFF" if unit_src_bad else "UNCHECKED" if unit_unchecked else "MATCH"
```

Both modes require `unit_src == "MATCH"`. The P19 mixed plant demonstrates the exact previously missed case:

> OLD `MATCH/MATCH`; NEW `UNCHECKED/MISMATCH`

Equal-mode mutations produce exactly three failing encounters in NEW and none in OLD. This is meaningful fault detection, not merely another successful baseline.

AMBIGUOUS keys are excluded from the unit count but fail the encounter verdict. P20 demonstrates that in both modes. Therefore `MATCH 0/0` for that subcheck is misleading in isolation, but not an acceptance hole in the demonstrated complete predicate.

### Controls that do—and do not—discriminate

- **O1:** The extracted real `oracle_run` plus OLD/NEW libraries is a credible isolated control. New failure shapes return OLD 4 / NEW 10; clean logs remain 4/4. A live stage-drop failure is not necessary to credit this parser repair. It would be necessary to claim demonstrated live stage-drop recovery.
- **O2:** The mutant really removes the `ga = 2` branch. Reason-text assertions distinguish the intended path from a different safe failure. Good.
- **After-TERM control:** It reaches the wait/KILL paths but only discriminates the final message. It does not prove that UNKNOWN waits correctly or triggers KILL.
- **A8:** Success-line evidence is not a negative control. No demonstrated `n_u != n_b` failure.
- **B4:** Genuine save failure and driver rejection, but compound and unpaired. It establishes current failure handling, not a clean before/after causal contrast.
- **A9:** Zero successful visits exercises `FORM-INCOMPLETE`, not the false-save stop rule.
- **Historical N2 word-splitting demonstration:** Mechanism illustration, not a discriminating benchmark control.

The old E1/R1 missing-evidence, NC2/NC5 specificity and exact-1 activation findings should not be silently promoted to full end-to-end closure merely because historical suites still pass. The packet does not add all previously missing runner-level interventions. Before-revoke/publication-boundary faults and comprehensive grant restoration remain open.

### Remaining executable holes

**1. Log-read error is still treated as “no failed batch.”**

```bash
p15_oracle_batch_failed() {
  grep -aEq ': FAILED \(|STAGE-RESTORE-ERROR|NOT restored|STAGE-DROP-FAILED|STAGE-KEEP' "$1"
}
```

The driver uses:

```bash
if p15_oracle_batch_failed /tmp/p15e_${label}.log; then
    ...; return 10
fi
return $rc
```

`grep` returns 2 on an unreadable/missing file. That falls through just like “no match.” If the successful-visit counts were already obtained and the log subsequently disappears or becomes unreadable, the expected fixture exit 4 can still be accepted.

Q5 demonstrates the same error concretely in chain step 3z. The function-existence check fixes “command not found,” not “evidence missing.” Require readable, explicitly run-bound evidence and distinguish match/no-match/error. Make the positive control mandatory.

**2. EXIT-trap XML restoration is still unchecked in both supplied drivers.**

```bash
[ "$RETARGETED" = "1" ] && $DBXML restore ...
[ "$GRANTED" = "1" ] && SQL "REVOKE ..."
```

An early exit can therefore proceed to later cleanup after restoration fails. The normal-tail repair does not cover that path. The P13 empty-pid-file integration path also remains unexercised.

**3. Process identity is a constrained heuristic, not proof.**

The live-leader path uses PID/group and start-time ordering, with:

```bash
[ "$st" -le $((fm + 50)) ]
```

That is a 50-ms tolerance, not exact millisecond identity. The dead-leader path accepts a member containing `BilingHarness` **or** the log path. Missing pid files are silently skipped, and `tr -dc 0-9` does not strictly validate numeric file contents. These assumptions may suit the recorded launch protocol; they do not establish arbitrary writer exclusion or before-publication crash safety.

**4. Clone validation lacks explicit query-error validation.**

The helper compares captured strings. In a checked-function context where shell `errexit` does not rescue it, two failed SQL queries can both yield empty strings and compare equal. Require successful SQL exits and numeric counts. The corrected display-variable control does not test this.

**Score: 8/10 — up from 7.** Strong, discriminating repairs; still incomplete error-state and cleanup contracts.

## ORACLE-VALIDITY

**The oracle is fit for narrowly scoped rendered-charge consistency. It is not an independent charge-code or financial-policy oracle.**

### What the latest successful observations establish

The C4 rerun reports:

- Fixture: **27/27 specified outcomes matched**.
- Of those, **12 DIFFER**, 12 EQUAL, 3 EQUAL-SRC.
- Real sample: **300/300 accepted**, 181 EQUAL and 119 EQUAL-SRC.
- **698 source-unit keys checked, zero unchecked**.
- **1,240 comparison entries**, zero line differences.
- Fresh payment evidence and B=A for all 300.

The arithmetic matters:

- \(12/27 = 44.4\%\) of authored fixture encounters intentionally disagree with the ledger. “27/27” is characterization success, not universal financial agreement.
- \(119/300 = 39.67\%\) need encounter-source-assisted name resolution.
- 698 keys and 1,240 entries are different measurement units. Neither is an additional independent sample of visits.

The unit check is now real:

```python
if f["units"] != su:
    unit_src_bad = True
```

It compares billed units with units in encounter source rows, in both modes. The deletion and +1 plants prove sensitivity.

That is stronger than ledger-only matching, but the reference is still the application’s source data—not an independently adjudicated tariff schedule. The deviation from manifest `predicted_unit` is consequential and correctly disclosed.

### C3 is a discovery stop, not observed provenance

The captured procedure query selects names and groups by names:

```sql
select jns_perawatan.nm_perawatan, …
...
group by jns_perawatan.nm_perawatan
```

The evidence supports this conclusion:

> The observed query/result interface does not expose the requested charge-code identity.

It does **not** support “we have now verified which code the form used.” Nor do zero code literals in **filtered** statement history establish absence from every possible application path.

The pre-registered STOP is legitimate. It avoids fabricating a nonexistent observation channel. But completing a discovery gate is not completing the original C3 measurement.

My v12 next step therefore needs refinement: **do not inject a fictitious form-side code field.** Either:

1. instrument source-to-query/model lineage at an appropriate layer, with a same-name/same-price source-code substitution that the observation detects; or
2. explicitly retire code-identity equivalence from this benchmark’s claim and define the observable equivalence class as rendered name/unit/quantity/amount behavior.

The assertion that a mapping error is outside *any* possible observation is too strong. It is outside this observation channel. Alternative instrumentation or an independent source-policy reference could expose some such errors.

### Registration is now honestly modelled, not numerically measured

The code still says:

```python
f["qty"] += Decimal(1) if c == "registration" else jml
```

Discovery found registration rows with `jumlah=0, biaya=0, tambahan=0`, fee in `totalbiaya`. The new shape gate catches `jumlah=2`; quantity remains **one row = one registration**.

That is a defensible representation. It closes the misleading “billing jumlah measured for every component” claim only if documentation consistently describes the special case.

### Residual risks, ranked

1. **Shared-source/common-mode mapping errors and C3 identity limits.** EQUAL-SRC resolves names using source rows; it does not independently observe code lineage.
2. **X2 preservation verification.** “PRESERVATION-CHECK PASS” remains narrower than independent implementation of preservation truth.
3. **Freshness attribution:** no run-end bound and no payment UPDATE audit. Exactly one INSERT after start is not a complete history of the accepted payment row.
4. **Ledger scope:** fractional quantities, embalase/tuslah and registration-policy differences remain known modelling boundaries.

B is separately produced by the actual form, but billing and payment outputs share that save path. They are not independent financial truths merely because they occupy different tables.

**Score: 8.5/10 — up from 8.** The unit and missing-source gates materially improve validity. C3 remains unobserved.

## REPRODUCIBILITY

**Local byte accountability is now good. Independent reconstruction is still absent.**

### What is genuinely established

The independent reviewers report locally checking:

- Manifest b against committed bytes: **39/39**.
- Effective release inventory: **62 files, 10 manifests**.
- Matching local/box pins and hashes.
- P20 wrapper-a reconstruction matching `cb1545da…`.
- Wrapper b differing only by library sourcing and step 3z.
- Final state capture at **14:43:02Z**, followed by a read-only copy and lock release.

That is substantial progress over v12’s evidence qualification.

**V22 is refuted at the tool-byte scope.** It is no longer fair to say the relevant historical tools necessarily exist only in unpublished `.bak` directories. The supplied hash comparisons and git reconstructions establish recoverable history for the checked files.

Do not enlarge that finding into “everything necessary is archived.” `.bak_p17fix1` was not checked; some older evidence is lost; the failed real-300 full oracle log and batch harness diagnostics are not committed.

The 39-file active manifest and 62-file effective inventory serve different purposes. Neither number measures complete environment coverage.

### The P20 result is compositional, not one final release run

The evidence consists of:

1. a full chain on wrapper a, with a failed C4 run;
2. a successful C4-only rerun;
3. a short chain on wrapper b, rechecking helper availability and selected logs.

The reviewer’s reconstruction makes that composition credible. I do **not** reject the successful component results because there was no final monolithic run.

But there remains **no single full acceptance chain on the final frozen wrapper**, and the ad hoc rerun script lacks a runtime hash. That is an unfinished release-verification task, not proof that the comparator result is false.

The hang remains unexplained. The observed safe failure is valuable:

> `group_empty=true`  
> `STAGE-RESTORED-VERIFIED`

The successful retry does not establish its cause or a reliable completion rate.

### Ranked third-party blockers

1. **Missing reconstructible environment and durable archival.** Pins identify the jar, dumps and runtime requirements; they do not provide them. The sole installation expires around November 20—approximately 20 days after this assessment date.
2. **No independent clean-box rehearsal.** A third party has not provisioned the environment and reproduced the claimed outputs without relying on hidden state.
3. **Incomplete evidence transport.** Repository retrace leaves 44 files uncovered; the outside-repository self-harness run is not reproducible from the repository. The P21 list of 47 filename-unmentioned P11 files is explicitly a different test, not closure.
4. **Fragmented current release description.** Historical pin tables are acceptable archives, but the current handoff and frozen local-inventory script still require interpretation or a disclosed temporary modification.
5. **Concurrency assumptions.** The lock remains advisory and direct suite invocation is not guarded. Sidecar binding does not eliminate interference from uncoordinated writers.

P14 lock-release evidence, the P17 T0 clone-drop history and the lost P16 retrace remain historical gaps. Later clean captures establish later state; they cannot manufacture those missing events.

### Single highest-value next step

**Archive the complete environment immediately, then have a second operator perform a clean-box release rehearsal of the same 27+300 experiment.**

As preparation, fix missing-log acceptance and mandatory controls; exercise or exclude the P13 driver; freeze one supported entrypoint; and bind every result to that run. Do not spend the remaining installation lifetime adding sample size while the environment remains irreplaceable.

**Score: 7.5/10 — up from 7.** Tool reproducibility improved substantially; system reproducibility has not been demonstrated.

## E2E-DESIGN

**This is a credible application-level consistency experiment, not a completed general billing-correctness benchmark.**

### The strong design remains strong

The design connects:

- DR-generated encounters and a pinned expected-charge ledger;
- consumer-written settlement;
- actual Khanza outpatient-form rebilling;
- payment-save audit evidence;
- encounter-level and rendered-line comparisons;
- authored edge fixtures;
- mutation controls;
- recovery and cleanup checks.

The real form-failure experiment is particularly useful. One of 27 visits failed:

\[
1/27 = 3.70\% > 2\%
\]

The transcript shows the stop rule, driver exit 1, XML back on `sik`, no clone grant and retained clone. Because the trigger also broke restoration, this proves safe rejection of that compound event—not isolated recovery from a save-only failure.

The new completeness gate also matters:

```bash
if [ "$ok" != "$n" ]; then
    ... FORM-INCOMPLETE ...
    return 10
fi
```

It closes the zero-true/zero-false hole that a percentage stop rule cannot detect.

### Keep the populations separate

The stated figures reconcile as follows:

- \(86{,}676 - 86{,}455 = 221\) non-DR registrations.
- \(86{,}101 + 354 = 86{,}455\), consistent with the stated B3/Stage-A bridge.
- \(3{,}330/85{,}387 = 3.9001\%\) of the stated P13 eligible population.
- \(86{,}455-85{,}387=1{,}068\) encounters lie outside that eligible population.

Those are different populations, not interchangeable denominators.

The amount bridge is arithmetically correct:

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633
=24{,}884{,}947
\]

The attribution to 221 non-DR registrations is a reported reconciliation, not something subtraction alone proves.

Likewise, all-cohort A=C does not mean all-cohort fresh form agreement. The supplied new transcripts directly establish the latest 300-run observations, not a new full-cohort reconciliation or retrospective validation of all 3,330 historical comparator summaries.

### The P20 failure is evidence about design, not just noise

Only 115/300 visits were billed in the failed run:

\[
115/300=38.3\%,\qquad185/300=61.7\%\text{ incomplete}
\]

The driver and comparators rejected that run. Good.

Meanwhile, source-unit assertions still passed. That is not itself a defect: source-unit consistency cannot prove fresh execution. It demonstrates why acceptance must be a conjunction of **execution completeness, fresh-save evidence, financial comparison and recovery state**, not a collection of attractive green subchecks.

The rerun rates are correct:

- \(27/91\times60=17.80\) visits/minute.
- \(300/1565\times60=11.50\) visits/minute.

### Fair E2E claim

> On one pinned synthetic outpatient installation, consumer output matches the specified DR ledger over the stated cohort; selected encounters were reprocessed through the actual Khanza form, with current 300-encounter rendered-charge, source-unit and audited payment-save agreement. Authored edge cases matched specified outcomes, including expected disagreements. Named failure injections caused rejection.

Do not replace that with “independently correct billing,” “all charge codes verified,” or “general crash safety.”

### What completion requires

For the **scoped** benchmark:

1. Resolve the C3 contract: instrument lineage or explicitly exclude code-identity equivalence.
2. Close missing-evidence acceptance and supported cleanup paths; include mutations proving those gates fail.
3. Run one complete release chain on final bytes, retaining the failed-run evidence and avoiding undocumented rerun selection.
4. Complete the clean-box rehearsal and durable archive.
5. Repair or retire P13 summaries and issue one current claim/evidence inventory.
6. Meet the declared Accept rule—or explicitly revise its scope before running it, rather than after failure.

X2 and the remaining preservation/privilege gaps must either be closed or excluded from the completion claim. “Complete” need not mean tested against every hospital, but it must mean the declared scope has actually passed.

**Score: 8.5/10 — unchanged.** Excellent integration structure; the weakest leg remains independent identity/financial truth, followed by release-level evidence discipline.

## EXTERNAL-VALIDITY

**There is essentially no new external-validity evidence in P17–P21.**

The correct boundary remains RC-9:

> “This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

That statement is accurate. The synthetic fixtures, successful unit checks and safer process termination do not validate clinical realism, payer policy or hospital billing practice.

Also, distinguish the overloaded labels: **C3 charge-code discovery** is not the **C3 payer-mix external-validity item**. Neither closes the other.

### Top external risk

**A shared, synthetic configuration can be consistently wrong in clinically or financially important ways.**

Examples already present in the record:

- diagnoses are uncalibrated;
- drug revenue share is approximately 82.7%;
- payer mix is unexercised;
- real visits have a narrow procedure shape;
- embalase/tuslah and registration-policy differences remain unresolved;
- outpatient-only execution excludes important inpatient and multi-facility behavior.

Independent reviewers checked code and evidence. They did not independently adjudicate hospital charges.

### Statistical claims remain conditional

For zero observed mismatches among \(n=3330\), an independent-binomial model gives:

\[
p_{\text{upper, one-sided }95\%}
=1-0.05^{1/3330}
\approx0.0899\%
\]

The two-sided 95% upper endpoint is:

\[
1-0.025^{1/3330}\approx0.1107\%
\]

The corrected handoff numbers are right. Their applicability still depends on the sampling model, ascertainment and historical oracle quality. Stratification, repeated visits, common-mode blind spots and incomplete historical summaries are not repaired by quoting Clopper–Pearson.

Do not pool repeated executions of the same 300 visits into a larger independent sample. Do not interpret 27 authored fixtures as a prevalence study.

### What would earn an external-validity increase

A bounded, independently adjudicated set of realistic encounters, with:

- independently specified expected charges and payer rules;
- clinically plausible procedure/drug distributions;
- explicit coverage of known ledger exclusions;
- reconciliation of discrepancies by a qualified billing/domain reviewer.

A second configuration or HMS would test portability. More synthetic volume on this installation would not.

### Final scorecard

| Criterion | v12 | v13 |
|---|---:|---:|
| Claim-honesty | 7.5 | **7.5** |
| Gate-correctness | 7 | **8** |
| Oracle-validity | 8 | **8.5** |
| Reproducibility | 7 | **7.5** |
| E2E-design | 8.5 | **8.5** |
| External-validity | 4.5 | **4.5** |

\[
\operatorname{round}\left(
\frac{7.5+8+8.5+7.5+8.5+4.5}{6}\times10
\right)
=\boxed{74/100}
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66 → 71 → 74.**

The gain is earned by repaired safety predicates, discriminating unit checks and better byte accountability. **C3 is not observed, independent reconstruction is not demonstrated, and the benchmark does not meet its own current acceptance rule.** Stop treating another correction wave as completion. Deliver the scoped release rehearsal.

**Score: 4.5/10 — unchanged.**

## VERDICT

## Overall verdict: **Needs targeted rework — 74/100 (+3 vs v12)**

The benchmark has become a stronger **scoped integration and fault-detection study**, but not yet a submission-ready release. The improvements are substantive: tighter gates, better source-unit checks, and greater byte accountability. The remaining blockers concern **fail-closed evidence handling, release reproducibility, and the boundary between observable agreement and independently correct billing**.

**Evidence qualification:** This synthesis uses the supplied assessment excerpts, not an independent inspection of the repository or transcripts. Where those excerpts omit an asserted old-versus-new execution, I distinguish a reviewer-confirmed repair from a fix satisfying your stricter verification standard.

## Criterion scores and historical deltas

Delta vectors follow your ten-assessment order: **4701365, 4769794, 4795743, 4818826, v7, v8, v9, v10, v11, v12**.

| Criterion | Score | Deltas against the ten prior scores |
|---|---:|---|
| Claim-honesty | **7.5/10** | +3.5 / +2.5 / +2.5 / +1.5 / +1.5 / +1.5 / +0.5 / +0.5 / +0.5 / 0 |
| Gate-correctness | **8/10** | +5 / +5 / +5 / +3 / +2 / +2 / +2 / +1.5 / +2 / +1 |
| Oracle-validity | **8.5/10** | +4.5 / +4.5 / +5.5 / +3.5 / +2.5 / +1.5 / +1.5 / +1 / +1 / +0.5 |
| Reproducibility | **7.5/10** | +4.5 / +2.5 / +1.5 / +2.5 / +1.5 / +1.5 / +1.5 / +1.5 / +1 / +0.5 |
| E2E-design | **8.5/10** | +4.5 / +3.5 / +3.5 / +2.5 / +1.5 / +1.5 / +1.5 / +1.5 / +0.5 / 0 |
| External-validity | **4.5/10** | +1.5 / +0.5 / +0.5 / +0.5 / +0.5 / +0.5 / +0.5 / +0.5 / 0 / 0 |

### Claim-honesty
**Justification:** Retained failures and narrower disclosures deserve credit, but a handoff saying **“Latest wave: P17 done”** and **“trace-clean”** conflicts with P21 and **44 uncovered files**, while “row-equal” still describes `COUNT(*)` comparisons.  
**Biggest remaining risk:** Documents labelled current continue to turn intended or partial outcomes into operational completion claims.

### Gate-correctness
**Justification:** The assessment credits **“strong, discriminating repairs,”** but `p15_oracle_batch_failed()` still treats `grep` exit 2 like no match, and EXIT-trap `$DBXML restore` remains unchecked.  
**Biggest remaining risk:** Missing evidence or failed early-exit restoration can bypass the intended acceptance and recovery contract.

### Oracle-validity
**Justification:** Source-unit and missing-source gates improve discrimination, while `f["qty"] += Decimal(1) if c == "registration" else jml` makes the registration convention explicit rather than pretending all quantities are measured identically.  
**Biggest remaining risk:** Shared-source mapping errors can remain invisible because C3 does not observe code lineage and billing/payment outputs are not independent financial truths.

### Reproducibility
**Justification:** Recovery evidence includes **`group_empty=true`** and **`STAGE-RESTORED-VERIFIED`**, but there is **“no single full acceptance chain on the final frozen wrapper”** and no independent clean-box reproduction.  
**Biggest remaining risk:** The sole installation may disappear around November 20 before its hidden dependencies and complete evidence are durably reconstructible.

### E2E-design
**Justification:** The failed P20 execution billed only **115/300** visits and was rejected by the driver and comparators, demonstrating why execution completeness must accompany otherwise passing source-unit checks.  
**Biggest remaining risk:** Component successes could still be assembled into a completion claim without the final release satisfying its declared conjunctive Accept rule.

### External-validity
**Justification:** An approximately **82.7% drug-revenue share**, unexercised payer mix, and outpatient-only execution constrain the findings to the synthetic installation rather than realistic hospital billing correctness.  
**Biggest remaining risk:** More repeated synthetic executions may be mistaken for independent statistical evidence or broader clinical and financial validity.

## 1. Which v12 findings are fixed, claimed, or still open?

### Genuinely fixed under your strict standard

**The supplied excerpts do not expose enough paired old-versus-new assertions to certify a specific repair under that standard.** That is an evidence limitation, not a conclusion that the repairs failed.

The strongest **reviewer-confirmed repair** is the v12 table-count/display bug: the assessment explicitly calls it **“genuinely fixed”** and quotes the corrected output:

> `tables=1179 (= sik), 6 key tables row-equal`

However, the paired old/new asserted execution is not reproduced here, and the residual “row-equal” wording remains inaccurate.

Other **assessed or code-visible improvements**, whose full strict verification cannot be reconstructed from these excerpts, include:

- Source-unit and missing-source gates; the registration shape gate catches `jumlah=2`.
- A function-existence check addressing “command not found.”
- Normal-tail restoration handling.
- Improved process-identity checks and byte accountability.

These deserve credit **within their tested paths**, not as closure of missing evidence, EXIT cleanup, arbitrary writer exclusion, or general crash safety.

### Reported fixed or overstated, but not fully established

- **Doubled-count bug:** reported fixed, with consistent current rate arithmetic; contradictory handoff text remains.
- **`.bak_p17fix1` byte equality:** overstated in the manifest despite the later admission that it was never hashed.
- **Clone content equality:** not demonstrated by matching table and row counts.
- **Deterministic, reproducible pipeline:** exceeds evidence of repeatability on the existing installation.
- **Complete release verification:** component results are credible, but the final frozen acceptance chain is absent.

### Still open

- Missing/unreadable-log rejection and mandatory positive controls.
- EXIT-trap restoration checks; P13 empty-pid integration coverage.
- Before-revoke/publication-boundary interventions and comprehensive grant restoration.
- SQL-error validation in clone checks.
- C3 code-identity observation, or explicit retirement of that claim.
- Independent X2 preservation verification.
- Freshness run-end bounds and payment UPDATE auditing.
- Durable environment reconstruction, clean-box rehearsal, and complete evidence transport.
- Repair or retirement of original P13 positive summaries.
- Independent financial/domain adjudication.

**Important distinction:** C3 discovery reached a legitimate STOP; it did not complete the original measurement.

## 2. Problems introduced or exposed during P17–P21

These are **wave-associated exposures**; the excerpts do not establish that every defect originated in these waves.

1. **Reporting remains an unreliable acceptance layer.** P17 self-scored 100% versus reviewer 61.1%; P20 self-scored 91.7% versus 79.2%, with persistent current-document contradictions.
2. **Chronology and provenance conflict.** P18 is dated earlier than its stated P17 predecessor, and `.bak_p17fix1` verification is overstated.
3. **Evidence absence can masquerade as success.** Q5 exposes the missing-log issue; the function-existence repair does not close it.
4. **P20 exposes unresolved completion reliability.** The 115/300 failure was safely rejected, but the hang remains unexplained and a successful retry does not establish a completion rate.
5. **Release evidence remains fragmented.** The rerun script lacks a runtime hash, no final frozen full chain exists, and P21’s 47 filename-unmentioned files do not resolve the separate 44-file coverage finding.
6. **Clone checks have a newly articulated error-state hole.** Two unsuccessful SQL queries may yield equal empty strings unless exit status and numeric output are validated.

## 3. Top three remaining issues

1. **Fail-closed acceptance and recovery:** reject missing evidence, validate SQL failures, check supported cleanup paths, and prove these gates with mutations.
2. **Reconstructible release:** urgently archive the environment, freeze one supported entrypoint, and reproduce the complete acceptance chain on a clean box.
3. **Claim–oracle alignment:** resolve C3 by instrumentation or explicit exclusion, bound preservation/freshness claims, and replace contradictory current documents with one authoritative inventory.

## 4. Top three strongest properties to lead with

1. **Real application integration:** selected encounters traverse the actual Khanza form, with current 300-encounter rendered-charge, source-unit, and audited payment-save agreement.
2. **Discriminating rejection behavior:** the incomplete P20 run was rejected despite passing source-unit checks, and named fault injections test more than happy-path arithmetic.
3. **Increasingly explicit, inspectable scope:** authored edge cases include expected disagreements, failed-run evidence is retained, and byte accountability has improved.

Lead with these—not “independently correct billing,” “all charge codes verified,” or “general crash safety.”

## 5. Overall score and trajectory

\[
\operatorname{round}\left(\frac{7.5+8+8.5+7.5+8.5+4.5}{6}\times10\right)
=\boxed{74/100}
\]

| Prior overall score | Delta |
|---:|---:|
| 35 | +39 |
| 43 — both assessments | +31 |
| 52 | +22 |
| 58 | +16 |
| 60 | +14 |
| 62 | +12 |
| 63 | +11 |
| 66 | +8 |
| 71 | +3 |

**Trajectory:** 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66 → 71 → **74**.

## 6. Overall verdict

**Needs targeted rework.** The technical trajectory is credible, but the current acceptance rule remains unmet and the release is not independently reconstructible. Further synthetic volume will not close those gaps.

## 7. Single most important next step

**Execute an archive-first, second-operator clean-box release rehearsal of the same 27+300 experiment.** Preserve the environment immediately; then, after closing missing-evidence acceptance and supported cleanup holes, run one frozen, hash-bound entrypoint and retain the complete acceptance and recovery evidence.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

**Overall v13 verdict: 74/100 — Needs targeted rework.** The safety and comparator repairs are substantial. The benchmark is still not complete, and P21 did not make it complete by correcting the records.

This assessment uses the embedded code, transcripts and independent reviews. I have not executed the repository or independently hashed its files. Where a script is not embedded, I distinguish the reviewer’s verification from what the transcript alone establishes.

### What the independent reviews actually found

| Wave reviewed | Material overclaim or defect | Current disposition |
|---|---|---|
| **P17** | “Final” state preceded C3; snapshot sidecars overwrote the hash command’s exit status; writer-death checks missed surviving groups; P13 restoration remained permissive; A9 did not exercise the stop rule; “paired controls” and “trace-clean” were overstated. | Most code defects repaired in P18–P20. Later final captures are genuinely last. The missing historical T0 clone-drop evidence remains missing. |
| **P18** | “Any unsourced key fails” contradicted the predicate: a mixed encounter could pass. Equal mode did not run the source-unit check. Some OLD arms accepted crashes. The real stop-rule experiment also broke restoration. | Mixed-key and equal-mode gates genuinely repaired in P19. OLD-arm checks strengthened. B4 correctly relabelled as compound and unpaired. |
| **P19** | Failed-batch helper missed `STAGE-DROP-FAILED` and `STAGE-KEEP`. The `ps` control passed after deleting the purported fix. Missing payments were described as differing payments. Repository retrace was overstated. | Helper and mutant control repaired in P20; payment explanation corrected. Repository retrace remains incomplete. |
| **P20** | Records claimed withdrawn traces were committed; “every file” was preflighted; copy log named the wrong final capture; an unexplained hang was called environmental and not a product defect. Missing-log assertions remained permissive. | P21 corrects several sentences, not the remaining executable defects. No new independent score establishes that P21 meets acceptance. |

The corrections generally agree with the evidence. Particularly important: the P20 first chain remains a **failed chain**, not a successful chain with an inconvenient footnote:

> `c4=1 fixture=0 real=1 asserts-failed=2`

The subsequent C4 rerun and short chain are valid additional evidence. They do not retroactively change that result.

### The process defect is stable, even though the code is converging

The raw self-score excesses are:

\[
6,\ 7,\ 3,\ 3,\ 3 \quad\Rightarrow\quad \text{mean}=4.4
\]

Those are rubric points, not directly comparable benchmark percentage points; P17 used an 18-point applicable denominator. Still, the direction is consistent. P17’s self-score was 100%, versus the reviewer’s 61.1%; P20’s was 91.7%, versus 79.2%.

**Both interpretations are true:**

- The executable predicates are converging. Review findings increasingly concern narrower paths and evidence handling.
- The reporting process has a persistent defect: outcomes are written from plans, then inadequately checked against execution.

Independent review is functioning as the missing acceptance test for the author’s prose. That is useful, but it is not an efficient or trustworthy release process.

### Remaining contradictions in the CURRENT packet

1. **The handoff is still not a current-state document.** Its headline says “Latest wave: P17 done”; Records says “trace-clean”; later sections establish P21 and 44 uncovered files. Its history label only explicitly excuses v10/P13 rows. Appending more corrections does not resolve an ambiguous operational instruction.

2. **P17/P18 chronology is internally inconsistent.** Section 29 places P17 at 21:03–22:10Z on October 27; section 30 places its successor P18 at 00:50–02:32Z on the same date. Both cannot describe that sequence. Correct the date from primary timestamps; do not invent a reconciliation.

3. **The release manifest overstates `.bak_p17fix1` verification.** Its P17 paragraph includes that directory in a byte-equal-to-git statement, while later sections explicitly say it was never hashed.

4. **“Clone matches” still means counts, not content.** The corrected output is:
   > `tables=1179 (= sik), 6 key tables row-equal`

   The code compares `COUNT(*)`. “Row-count-equal” is the accurate phrase.

5. **The R5 opening claim that the pipeline “is deterministic and reproducible” remains broader than the release limitation “repeatable on the existing installation.”** Deterministic encounter generation does not establish deterministic harness completion or independent reconstruction.

The v12 table-count bug is genuinely fixed. The doubled-count bug is reported fixed and the current rate arithmetic is consistent, but the old handoff text remains contradictory. Original P13 positive summaries have still not been repaired or retired.

**Score: 7.5/10 — unchanged.** Better disclosure and retained failures earn credit; repeated contradictions in documents labelled “current” prevent an increase.

## GATE-CORRECTNESS

**The main repairs work at their demonstrated scope. “Fails closed” is still too broad.**

### Verified repairs against v12

| v12 finding | Current evidence | Disposition |
|---|---|---|
| Writer termination not mandatory | Cleanup now aborts with exit 3 when `p15_kill_run_harness` fails; paired live-process controls cover TERM resistance, dead leader/live child, unreadable identity and failed `ps`. | **Substantively fixed for tested recorded-group paths.** |
| XML restoration could accompany success | P14 and P13 normal tails require successful restore and probe target `sik`; OLD 0 → NEW 3 on failed restore. | **Fixed in normal tails; EXIT-trap restoration remains open.** |
| A31′ ignored restore result | Predicate now includes `[ "$R31" = "restored" ]`. P18 isolates the clause with equal hashes, then demonstrates OLD suite PASS / NEW FAIL under injection. | **Genuinely fixed.** |
| A28′ evidence was overdetermined | P18 tests the restore clause alone with hashes equal. | **Judge-contract closure established.** |
| Unsafe CREATE/helper setup | Checked P13 CREATE and refusal-safe helper; existing database survives NEW and is destroyed by OLD. | **Genuinely fixed for those paths.** |
| Freshness mistaken for snapshot provenance | Sidecar names suite evidence; foreign/missing sidecar rejected. P18 also fixes `RCH=$?` placement. | **Improved run binding, not a general concurrency-proof provenance system.** |
| Expected-mode unit/cardinality gaps | Unit mutation, missing visit, duplicate payment and registration-shape controls discriminate. | **Fixed for these specified properties, not universal billing-line cardinality.** |

The strongest comparator repair is:

```python
rec["unit_src"] = "DIFF" if unit_src_bad else "UNCHECKED" if unit_unchecked else "MATCH"
```

Both modes require `unit_src == "MATCH"`. The P19 mixed plant demonstrates the exact previously missed case:

> OLD `MATCH/MATCH`; NEW `UNCHECKED/MISMATCH`

Equal-mode mutations produce exactly three failing encounters in NEW and none in OLD. This is meaningful fault detection, not merely another successful baseline.

AMBIGUOUS keys are excluded from the unit count but fail the encounter verdict. P20 demonstrates that in both modes. Therefore `MATCH 0/0` for that subcheck is misleading in isolation, but not an acceptance hole in the demonstrated complete predicate.

### Controls that do—and do not—discriminate

- **O1:** The extracted real `oracle_run` plus OLD/NEW libraries is a credible isolated control. New failure shapes return OLD 4 / NEW 10; clean logs remain 4/4. A live stage-drop failure is not necessary to credit this parser repair. It would be necessary to claim demonstrated live stage-drop recovery.
- **O2:** The mutant really removes the `ga = 2` branch. Reason-text assertions distinguish the intended path from a different safe failure. Good.
- **After-TERM control:** It reaches the wait/KILL paths but only discriminates the final message. It does not prove that UNKNOWN waits correctly or triggers KILL.
- **A8:** Success-line evidence is not a negative control. No demonstrated `n_u != n_b` failure.
- **B4:** Genuine save failure and driver rejection, but compound and unpaired. It establishes current failure handling, not a clean before/after causal contrast.
- **A9:** Zero successful visits exercises `FORM-INCOMPLETE`, not the false-save stop rule.
- **Historical N2 word-splitting demonstration:** Mechanism illustration, not a discriminating benchmark control.

The old E1/R1 missing-evidence, NC2/NC5 specificity and exact-1 activation findings should not be silently promoted to full end-to-end closure merely because historical suites still pass. The packet does not add all previously missing runner-level interventions. Before-revoke/publication-boundary faults and comprehensive grant restoration remain open.

### Remaining executable holes

**1. Log-read error is still treated as “no failed batch.”**

```bash
p15_oracle_batch_failed() {
  grep -aEq ': FAILED \(|STAGE-RESTORE-ERROR|NOT restored|STAGE-DROP-FAILED|STAGE-KEEP' "$1"
}
```

The driver uses:

```bash
if p15_oracle_batch_failed /tmp/p15e_${label}.log; then
    ...; return 10
fi
return $rc
```

`grep` returns 2 on an unreadable/missing file. That falls through just like “no match.” If the successful-visit counts were already obtained and the log subsequently disappears or becomes unreadable, the expected fixture exit 4 can still be accepted.

Q5 demonstrates the same error concretely in chain step 3z. The function-existence check fixes “command not found,” not “evidence missing.” Require readable, explicitly run-bound evidence and distinguish match/no-match/error. Make the positive control mandatory.

**2. EXIT-trap XML restoration is still unchecked in both supplied drivers.**

```bash
[ "$RETARGETED" = "1" ] && $DBXML restore ...
[ "$GRANTED" = "1" ] && SQL "REVOKE ..."
```

An early exit can therefore proceed to later cleanup after restoration fails. The normal-tail repair does not cover that path. The P13 empty-pid-file integration path also remains unexercised.

**3. Process identity is a constrained heuristic, not proof.**

The live-leader path uses PID/group and start-time ordering, with:

```bash
[ "$st" -le $((fm + 50)) ]
```

That is a 50-ms tolerance, not exact millisecond identity. The dead-leader path accepts a member containing `BilingHarness` **or** the log path. Missing pid files are silently skipped, and `tr -dc 0-9` does not strictly validate numeric file contents. These assumptions may suit the recorded launch protocol; they do not establish arbitrary writer exclusion or before-publication crash safety.

**4. Clone validation lacks explicit query-error validation.**

The helper compares captured strings. In a checked-function context where shell `errexit` does not rescue it, two failed SQL queries can both yield empty strings and compare equal. Require successful SQL exits and numeric counts. The corrected display-variable control does not test this.

**Score: 8/10 — up from 7.** Strong, discriminating repairs; still incomplete error-state and cleanup contracts.

## ORACLE-VALIDITY

**The oracle is fit for narrowly scoped rendered-charge consistency. It is not an independent charge-code or financial-policy oracle.**

### What the latest successful observations establish

The C4 rerun reports:

- Fixture: **27/27 specified outcomes matched**.
- Of those, **12 DIFFER**, 12 EQUAL, 3 EQUAL-SRC.
- Real sample: **300/300 accepted**, 181 EQUAL and 119 EQUAL-SRC.
- **698 source-unit keys checked, zero unchecked**.
- **1,240 comparison entries**, zero line differences.
- Fresh payment evidence and B=A for all 300.

The arithmetic matters:

- \(12/27 = 44.4\%\) of authored fixture encounters intentionally disagree with the ledger. “27/27” is characterization success, not universal financial agreement.
- \(119/300 = 39.67\%\) need encounter-source-assisted name resolution.
- 698 keys and 1,240 entries are different measurement units. Neither is an additional independent sample of visits.

The unit check is now real:

```python
if f["units"] != su:
    unit_src_bad = True
```

It compares billed units with units in encounter source rows, in both modes. The deletion and +1 plants prove sensitivity.

That is stronger than ledger-only matching, but the reference is still the application’s source data—not an independently adjudicated tariff schedule. The deviation from manifest `predicted_unit` is consequential and correctly disclosed.

### C3 is a discovery stop, not observed provenance

The captured procedure query selects names and groups by names:

```sql
select jns_perawatan.nm_perawatan, …
...
group by jns_perawatan.nm_perawatan
```

The evidence supports this conclusion:

> The observed query/result interface does not expose the requested charge-code identity.

It does **not** support “we have now verified which code the form used.” Nor do zero code literals in **filtered** statement history establish absence from every possible application path.

The pre-registered STOP is legitimate. It avoids fabricating a nonexistent observation channel. But completing a discovery gate is not completing the original C3 measurement.

My v12 next step therefore needs refinement: **do not inject a fictitious form-side code field.** Either:

1. instrument source-to-query/model lineage at an appropriate layer, with a same-name/same-price source-code substitution that the observation detects; or
2. explicitly retire code-identity equivalence from this benchmark’s claim and define the observable equivalence class as rendered name/unit/quantity/amount behavior.

The assertion that a mapping error is outside *any* possible observation is too strong. It is outside this observation channel. Alternative instrumentation or an independent source-policy reference could expose some such errors.

### Registration is now honestly modelled, not numerically measured

The code still says:

```python
f["qty"] += Decimal(1) if c == "registration" else jml
```

Discovery found registration rows with `jumlah=0, biaya=0, tambahan=0`, fee in `totalbiaya`. The new shape gate catches `jumlah=2`; quantity remains **one row = one registration**.

That is a defensible representation. It closes the misleading “billing jumlah measured for every component” claim only if documentation consistently describes the special case.

### Residual risks, ranked

1. **Shared-source/common-mode mapping errors and C3 identity limits.** EQUAL-SRC resolves names using source rows; it does not independently observe code lineage.
2. **X2 preservation verification.** “PRESERVATION-CHECK PASS” remains narrower than independent implementation of preservation truth.
3. **Freshness attribution:** no run-end bound and no payment UPDATE audit. Exactly one INSERT after start is not a complete history of the accepted payment row.
4. **Ledger scope:** fractional quantities, embalase/tuslah and registration-policy differences remain known modelling boundaries.

B is separately produced by the actual form, but billing and payment outputs share that save path. They are not independent financial truths merely because they occupy different tables.

**Score: 8.5/10 — up from 8.** The unit and missing-source gates materially improve validity. C3 remains unobserved.

## REPRODUCIBILITY

**Local byte accountability is now good. Independent reconstruction is still absent.**

### What is genuinely established

The independent reviewers report locally checking:

- Manifest b against committed bytes: **39/39**.
- Effective release inventory: **62 files, 10 manifests**.
- Matching local/box pins and hashes.
- P20 wrapper-a reconstruction matching `cb1545da…`.
- Wrapper b differing only by library sourcing and step 3z.
- Final state capture at **14:43:02Z**, followed by a read-only copy and lock release.

That is substantial progress over v12’s evidence qualification.

**V22 is refuted at the tool-byte scope.** It is no longer fair to say the relevant historical tools necessarily exist only in unpublished `.bak` directories. The supplied hash comparisons and git reconstructions establish recoverable history for the checked files.

Do not enlarge that finding into “everything necessary is archived.” `.bak_p17fix1` was not checked; some older evidence is lost; the failed real-300 full oracle log and batch harness diagnostics are not committed.

The 39-file active manifest and 62-file effective inventory serve different purposes. Neither number measures complete environment coverage.

### The P20 result is compositional, not one final release run

The evidence consists of:

1. a full chain on wrapper a, with a failed C4 run;
2. a successful C4-only rerun;
3. a short chain on wrapper b, rechecking helper availability and selected logs.

The reviewer’s reconstruction makes that composition credible. I do **not** reject the successful component results because there was no final monolithic run.

But there remains **no single full acceptance chain on the final frozen wrapper**, and the ad hoc rerun script lacks a runtime hash. That is an unfinished release-verification task, not proof that the comparator result is false.

The hang remains unexplained. The observed safe failure is valuable:

> `group_empty=true`  
> `STAGE-RESTORED-VERIFIED`

The successful retry does not establish its cause or a reliable completion rate.

### Ranked third-party blockers

1. **Missing reconstructible environment and durable archival.** Pins identify the jar, dumps and runtime requirements; they do not provide them. The sole installation expires around November 20—approximately 20 days after this assessment date.
2. **No independent clean-box rehearsal.** A third party has not provisioned the environment and reproduced the claimed outputs without relying on hidden state.
3. **Incomplete evidence transport.** Repository retrace leaves 44 files uncovered; the outside-repository self-harness run is not reproducible from the repository. The P21 list of 47 filename-unmentioned P11 files is explicitly a different test, not closure.
4. **Fragmented current release description.** Historical pin tables are acceptable archives, but the current handoff and frozen local-inventory script still require interpretation or a disclosed temporary modification.
5. **Concurrency assumptions.** The lock remains advisory and direct suite invocation is not guarded. Sidecar binding does not eliminate interference from uncoordinated writers.

P14 lock-release evidence, the P17 T0 clone-drop history and the lost P16 retrace remain historical gaps. Later clean captures establish later state; they cannot manufacture those missing events.

### Single highest-value next step

**Archive the complete environment immediately, then have a second operator perform a clean-box release rehearsal of the same 27+300 experiment.**

As preparation, fix missing-log acceptance and mandatory controls; exercise or exclude the P13 driver; freeze one supported entrypoint; and bind every result to that run. Do not spend the remaining installation lifetime adding sample size while the environment remains irreplaceable.

**Score: 7.5/10 — up from 7.** Tool reproducibility improved substantially; system reproducibility has not been demonstrated.

## E2E-DESIGN

**This is a credible application-level consistency experiment, not a completed general billing-correctness benchmark.**

### The strong design remains strong

The design connects:

- DR-generated encounters and a pinned expected-charge ledger;
- consumer-written settlement;
- actual Khanza outpatient-form rebilling;
- payment-save audit evidence;
- encounter-level and rendered-line comparisons;
- authored edge fixtures;
- mutation controls;
- recovery and cleanup checks.

The real form-failure experiment is particularly useful. One of 27 visits failed:

\[
1/27 = 3.70\% > 2\%
\]

The transcript shows the stop rule, driver exit 1, XML back on `sik`, no clone grant and retained clone. Because the trigger also broke restoration, this proves safe rejection of that compound event—not isolated recovery from a save-only failure.

The new completeness gate also matters:

```bash
if [ "$ok" != "$n" ]; then
    ... FORM-INCOMPLETE ...
    return 10
fi
```

It closes the zero-true/zero-false hole that a percentage stop rule cannot detect.

### Keep the populations separate

The stated figures reconcile as follows:

- \(86{,}676 - 86{,}455 = 221\) non-DR registrations.
- \(86{,}101 + 354 = 86{,}455\), consistent with the stated B3/Stage-A bridge.
- \(3{,}330/85{,}387 = 3.9001\%\) of the stated P13 eligible population.
- \(86{,}455-85{,}387=1{,}068\) encounters lie outside that eligible population.

Those are different populations, not interchangeable denominators.

The amount bridge is arithmetically correct:

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633
=24{,}884{,}947
\]

The attribution to 221 non-DR registrations is a reported reconciliation, not something subtraction alone proves.

Likewise, all-cohort A=C does not mean all-cohort fresh form agreement. The supplied new transcripts directly establish the latest 300-run observations, not a new full-cohort reconciliation or retrospective validation of all 3,330 historical comparator summaries.

### The P20 failure is evidence about design, not just noise

Only 115/300 visits were billed in the failed run:

\[
115/300=38.3\%,\qquad185/300=61.7\%\text{ incomplete}
\]

The driver and comparators rejected that run. Good.

Meanwhile, source-unit assertions still passed. That is not itself a defect: source-unit consistency cannot prove fresh execution. It demonstrates why acceptance must be a conjunction of **execution completeness, fresh-save evidence, financial comparison and recovery state**, not a collection of attractive green subchecks.

The rerun rates are correct:

- \(27/91\times60=17.80\) visits/minute.
- \(300/1565\times60=11.50\) visits/minute.

### Fair E2E claim

> On one pinned synthetic outpatient installation, consumer output matches the specified DR ledger over the stated cohort; selected encounters were reprocessed through the actual Khanza form, with current 300-encounter rendered-charge, source-unit and audited payment-save agreement. Authored edge cases matched specified outcomes, including expected disagreements. Named failure injections caused rejection.

Do not replace that with “independently correct billing,” “all charge codes verified,” or “general crash safety.”

### What completion requires

For the **scoped** benchmark:

1. Resolve the C3 contract: instrument lineage or explicitly exclude code-identity equivalence.
2. Close missing-evidence acceptance and supported cleanup paths; include mutations proving those gates fail.
3. Run one complete release chain on final bytes, retaining the failed-run evidence and avoiding undocumented rerun selection.
4. Complete the clean-box rehearsal and durable archive.
5. Repair or retire P13 summaries and issue one current claim/evidence inventory.
6. Meet the declared Accept rule—or explicitly revise its scope before running it, rather than after failure.

X2 and the remaining preservation/privilege gaps must either be closed or excluded from the completion claim. “Complete” need not mean tested against every hospital, but it must mean the declared scope has actually passed.

**Score: 8.5/10 — unchanged.** Excellent integration structure; the weakest leg remains independent identity/financial truth, followed by release-level evidence discipline.

## EXTERNAL-VALIDITY

**There is essentially no new external-validity evidence in P17–P21.**

The correct boundary remains RC-9:

> “This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

That statement is accurate. The synthetic fixtures, successful unit checks and safer process termination do not validate clinical realism, payer policy or hospital billing practice.

Also, distinguish the overloaded labels: **C3 charge-code discovery** is not the **C3 payer-mix external-validity item**. Neither closes the other.

### Top external risk

**A shared, synthetic configuration can be consistently wrong in clinically or financially important ways.**

Examples already present in the record:

- diagnoses are uncalibrated;
- drug revenue share is approximately 82.7%;
- payer mix is unexercised;
- real visits have a narrow procedure shape;
- embalase/tuslah and registration-policy differences remain unresolved;
- outpatient-only execution excludes important inpatient and multi-facility behavior.

Independent reviewers checked code and evidence. They did not independently adjudicate hospital charges.

### Statistical claims remain conditional

For zero observed mismatches among \(n=3330\), an independent-binomial model gives:

\[
p_{\text{upper, one-sided }95\%}
=1-0.05^{1/3330}
\approx0.0899\%
\]

The two-sided 95% upper endpoint is:

\[
1-0.025^{1/3330}\approx0.1107\%
\]

The corrected handoff numbers are right. Their applicability still depends on the sampling model, ascertainment and historical oracle quality. Stratification, repeated visits, common-mode blind spots and incomplete historical summaries are not repaired by quoting Clopper–Pearson.

Do not pool repeated executions of the same 300 visits into a larger independent sample. Do not interpret 27 authored fixtures as a prevalence study.

### What would earn an external-validity increase

A bounded, independently adjudicated set of realistic encounters, with:

- independently specified expected charges and payer rules;
- clinically plausible procedure/drug distributions;
- explicit coverage of known ledger exclusions;
- reconciliation of discrepancies by a qualified billing/domain reviewer.

A second configuration or HMS would test portability. More synthetic volume on this installation would not.

### Final scorecard

| Criterion | v12 | v13 |
|---|---:|---:|
| Claim-honesty | 7.5 | **7.5** |
| Gate-correctness | 7 | **8** |
| Oracle-validity | 8 | **8.5** |
| Reproducibility | 7 | **7.5** |
| E2E-design | 8.5 | **8.5** |
| External-validity | 4.5 | **4.5** |

\[
\operatorname{round}\left(
\frac{7.5+8+8.5+7.5+8.5+4.5}{6}\times10
\right)
=\boxed{74/100}
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66 → 71 → 74.**

The gain is earned by repaired safety predicates, discriminating unit checks and better byte accountability. **C3 is not observed, independent reconstruction is not demonstrated, and the benchmark does not meet its own current acceptance rule.** Stop treating another correction wave as completion. Deliver the scoped release rehearsal.

**Score: 4.5/10 — unchanged.**
