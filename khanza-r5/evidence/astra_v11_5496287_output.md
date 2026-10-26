# Astra v11 assessment: dr-khanza-e2e-full-assessment (post P1-P14) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

**v11 overall: 66/100 — Needs targeted rework.**

There is real progress: the preservation experiment now demonstrates immediate restoration against a pre-operation baseline; encounter-level reconciliation exists; fresh form payments were exercised at substantially greater scale; and P14 found genuine ledger limitations. But **“5/5 DISCRIMINATING,” “27/27 pre-registered matches,” and “300/300 line identity” each conceal qualifications that the current acceptance logic does not enforce.**

This assessment inspects the embedded code, diffs and transcripts. It is not a fresh execution, and a SHA for an omitted script is not source inspection.

### What is honestly disclosed

Credit is due for retaining rather than deleting adverse evidence:

- P12’s first reconciliation mutation changed nothing and was reported as `NOT-DISCRIMINATING`.
- P14’s first line NC failed its clean arm:
  > `unplanted exit=1 (0 needed)`
  
  The corrected run actually establishes clean pass → planted failure.
- P14’s first kill attempt stopped at the builder failure, before the intended kill point. The second transcript shows three harness processes before SIGTERM and zero afterward.
- The P13 bound and doubled throughput were explicitly corrected in prose.
- The concurrent P11 writer incident and loss of binding to earlier executable bytes are plainly recorded.
- Fractional quantities, fees and zero-price differences are reported as defects or scope gaps, not silently repaired.

These are meaningful improvements in research conduct.

### Arithmetic and statistical claims

For zero observed failures, the binomial Clopper–Pearson upper limits are:

\[
p_{\text{one-sided},95\%}=1-0.05^{1/n},
\qquad
p_{\text{two-sided},95\%}=1-0.025^{1/n}.
\]

| Result | One-sided upper limit | Two-sided upper endpoint |
|---|---:|---:|
| 0/3,330 | **0.08992%** | **0.11072%** |
| 0/300 | **0.99361%** | **1.22210%** |

The corrected numerical values are right. Their interpretation still needs work:

1. **P14’s denominator is encounters, not lines.** It measures whether an encounter has a comparator-detectable disagreement. Calling this a bound on the “line-level mismatch rate” is wrong. There are 1,240 lines, but lines within encounters are not independent trials.
2. Stratified sampling alone does not establish the common-rate binomial model. Without the sampler’s allocation and inclusion probabilities, these are **conditional binomial reference limits**, not demonstrated design-valid population bounds.
3. They bound failures observable by the comparator—not true billing errors that its mapping or selection rules hide.

Other arithmetic:

- \(3330/85387 = 3.900\%\): correct.
- \(1068/86455 = 1.235\%\): “1.2%” is fair.
- \(119/300 = 39.667\%\): “40%” is fair.
- Correct P13 rates from the supplied elapsed times are **9.63, 11.48 and 16.96 visits/min**. The printed rates are doubled.
- The stale payment’s raw discrepancy is **Rp 141,632.8**, not an integer discrepancy. P12’s rounding makes its comparison discrepancy Rp 141,633.
- \(34,895,128,580-34,870,243,633=24,884,947\): the scope-bridge subtraction is correct. Attribution to 221 registrations requires the underlying query, not subtraction alone.

### P14’s pre-registration is not as clean as claimed

The task permits learning from failures. That is reasonable. It does **not** justify describing all final matches as unchanged pre-registered predictions.

- E4 was originally **OPEN**. Observing half-up behavior is useful evidence, not an originally fixed EQUAL prediction.
- E6’s original model was wrong. It predicted truncation; the builder actually rejected the string `'0.5'`.
- The amendment’s signs were also wrong: if C truncates a positive drug quantity, **A−C is positive**, not the negative drug delta written in §2a.
- Loading the two fractional visits **after** the successful ledger build changes the experiment. Their C=0 is an imposed absence, not the frozen builder’s computed financial answer.
- The task self-score says E6 was “not re-predicted to match.” The report says its expectation was amended to the whole form amount; the final manifest comparisons clearly use that revised expectation. Those statements cannot both describe an unchanged prediction.
- E8 was changed from “AMBIGUOUS” to EQUAL-CTX before the reported billing run. The change is disclosed, but it relaxes the identity claim rather than solving the ambiguity.

Correct wording: **25 successfully built fixture visits plus two fractional visits evaluated under an explicitly amended missing-ledger experiment; final observations matched the revised models.**

### The 28/28 self-score is not defensible

At minimum, these rubric items cannot receive full credit:

| Item | Why full credit fails |
|---|---|
| R3 driver safety | Existing-clone refusal and pipeline/exit handling have defects; see below. |
| R4 line identity | Expected ledger codes resolve ambiguity; aggregation is not a per-line multiset comparison. |
| R6 pre-registration | E6 was revised after an executed builder experiment; the original failed prediction remains material. |
| R9 real-cohort result | 119 encounters have circular code resolution; the bound is mislabeled. |
| R11 live-state proof | Equal row counts plus a ledger hash do not prove all live data unchanged. |
| R14 report honesty | Several claims exceed the assertions actually implemented. |

Even granting every other item 2, that caps the self-score at **22/28**, not 28. A complete independent rubric score would require the omitted evidence files.

### Remaining overclaims and stale documents

- A11 still says:
  > “every restore … hash-verified … `>=1 verification marker`”

  One verification marker is not an inventory of every required restore.
- The manifest still says:
  > “re-derivable without the original live box”

  P12 explicitly says the clean-box rebuild and external-input closure are unfinished.
- “Raw … DB images are too large to pin by hash” is not a technical justification. Large files can be streamed through SHA-256.
- The handoff says **no benchmark grants on live databases**. P14 explicitly lists live INSERT/UPDATE/DELETE and broad `sik_bench` privileges. This is a consequential stale safety statement.
- The final P14 proof still shows the lock held. Release is reported elsewhere, but not demonstrated by the embedded final proof.
- “One held lock” over the entire P12 chain is imprecise: the transcript explicitly releases it for the lock NC and reacquires it.
- R5’s older “edge strata NOT TESTED” and settlement caveats remain inconsistent with later sections.

**Claim-honesty score: 7/10.**

## GATE-CORRECTNESS

The important question is not whether a transcript contains FAIL. It is whether **the same acceptance predicate rejects the intended violation, without unrelated failure or missing evidence being counted as success**.

### P11 negative controls: three useful tests, one partial test, one confounded test

| Control | Assessment |
|---|---|
| NC1 rollback | The injected autocommit path can change staged content and is observed failing. Genuine sensitivity, but checksum validation and cleanup remain defective. |
| NC2 immediate restoration | The pre-operation snapshot detects skipped restoration. Genuine observed discrimination, but the runner accepts aggregate failure rather than requiring that exact assertion to fail. |
| NC3 stale restored flag | Code clears the flag; the targeted state assertion fails with the switch and passes without it. Strong bounded closure. |
| NC4 snapshot coherence | **Not a valid demonstration of the claimed causal property.** Different arms use different predicates and the NC arm adds a separate live mutation. |
| NC5 missing stage table | Dropping an inventoried table is observed failing. Does not prove the original inventory was complete. |

The switches are inactive when absent, but use truthiness:

```python
if os.environ.get("R5_NEGCTL_BACKUP_NO_TXN"):
```

Thus `R5_NEGCTL_BACKUP_NO_TXN=0` activates the fault. They are not production-safe merely because they are called test-only; direct helper calls can bypass entry-point target protections.

#### NC4 is the clearest false assurance

The switch changes backup hashing to the old live-late behavior. But the NC test then independently executes:

```bash
SQL "UPDATE ... SET totalbiaya=totalbiaya+1 ..."
```

and checks only:

```bash
[ "$HSTAGE" = "$HLIVE" ]
```

The clean arm additionally checks the **stored** hash. The broken arm does not.

The NC would still fail if the backup stored the correct stage hash, because the test deliberately makes current live content differ from staged content. It demonstrates that a hash detects an UPDATE—not that the stored backup metadata remains coherent across that UPDATE.

Use identical assertions in both arms: stage content versus stored metadata, with the same intervening live mutation. Correct stage-based hashing should pass; live-late hashing should fail.

#### The NC runner can manufacture PASS from missing evidence

```bash
grep -aq "^A$2: FAIL" "$1" 2>/dev/null && echo FAIL || echo PASS
```

No file, no matching assertion, or a crashed run without that assertion becomes **PASS**. It also chooses evidence through `ls -t ... | head -1`, rather than a run-specific returned artifact.

NC2/NC5 search for any `PRESERVATION-CHECK FAIL`, allowing an unrelated failure to satisfy their negative arm. These are genuine gate defects despite the displayed successful targeted runs.

### The preservation repair still has an escape hatch

The good path is substantially improved. The bad path remains:

```bash
[ -f "$PREOP" ] || {
  python3 p10_hash_state.py ... > "$PREOP"
  echo "pre-op snapshot re-recorded on the kept fixture ..."
}
```

That is a **post-failure baseline labeled pre-operation**. It reintroduces the exact v10 failure mode when the original snapshot is absent.

Further regressions:

- The prior assertions for wrapper exit=1, exactly one forced failure and A13 success were removed.
- Global snapshot filenames survive across runs without fixture/run identity binding.
- Expected stage names come from the post-failure observation:
  ```python
  print(",".join(sorted(d.get("stage", {}))))
  ```
  Missing tables already absent at that observation are not detected as missing from a specification.
- `ERROR:<table>` is not “non-comparable.” Two identical strings compare equal. Correctness depends on rejecting error status everywhere.
- Stage NULL checks improved, but the shown validation only checks that the live checksum mapping is nonempty, not that every required live checksum is non-null.
- The retry’s restoration still relies on oracle markers rather than an independent sample snapshot immediately after restore and before re-billing.
- The new preservation script has no run-lock guard before installing its cleanup trap. A refused child wrapper does not prevent the parent’s trap from restoring XML and revoking another run’s fixture grant.

### A28′ introduces fixture corruption

After restoring the original staged rows, the test unconditionally does:

```bash
UPDATE ... SET totalbiaya=totalbiaya-5 ...
```

In the transactional clean arm, restore has already removed the +5 perturbation. The subtraction therefore damages the fixture by −5.

It also ignores `stage_restore()`’s Boolean result and calls `stage_drop()` regardless. The new `stage_cks_p11()` compares concatenated checksum strings without rejecting NULL checksums or enforcing the full table inventory.

The test is discriminating on its demonstrated fixture, but its cleanup and failure contracts are not trustworthy.

### Run lock: useful advisory admission control, not execution exclusion

The transcripts demonstrate refusal of absent/wrong sessions before the two guarded scripts write. That is real progress.

Still bypassable through:

- Direct suite invocation.
- Unguarded preservation/helper scripts.
- Manual SQL or configuration edits.
- Multiple processes using the same session identifier.
- Explicit forced release while a process remains alive.

The full lock implementation is omitted, so its race behavior cannot be independently inspected here. Do not promote the demonstrated session checks into a process-lifetime exclusivity guarantee.

### P12/P13 reconciliation: useful, but not exact financial validation

Both genuinely compare encounter/component pairs. The repaired +1 NC names the planted encounter, avoiding the earlier no-op.

However:

```sql
CAST(totalbiaya AS SIGNED)
```

and:

```python
quantize(Decimal(1), rounding=ROUND_HALF_UP)
```

discard sub-rupiah differences. Zero/negative-only rows can be excluded by:

```sql
(biaya>0 OR totalbiaya>0)
```

Additional problems:

- P12 compares `dr | ledger_enc`, while A is filtered to DR registrations. Legitimate retained non-DR ledger rows can produce scope-induced failures.
- Required coverage is printed, not comprehensively asserted. A DR encounter missing from both A and C can agree as two empty dictionaries.
- P12 S3 does not assert B coverage or B equality; those are inferred from the broader run, not enforced by S3.
- P13 silently deduplicates the visit list, so it cannot assert the requested original sample cardinality.
- P13’s freshness predicate is:
  ```python
  if bcnt == 1 and cnt >= 1:
  ```
  It permits additional INSERTs by another account. The report claims exactly one INSERT.
- The audit check has no run/time boundary. Fresh disposable audit tables make the demonstrated execution stronger, but the comparator alone does not establish current-run provenance.

**Collation-safe? Not established.** SQL uses database collation; Python uses exact string keys and sets. There is no explicit binary collation contract or adversarial case/accent/trailing-space test. The observed DR identifiers may avoid this problem; that is not a general guarantee.

### P14: wrong lines can pass

The central circularity is explicit:

```python
inled = sorted(k for k in cand if (c, k) in L)
if len(inled) == 1:
    code, how = inled[0], "ctx"
```

If expected code X and actual code Y share the same displayed name and financial attributes, the comparator assigns X because **the expected ledger contains X**. It passes the identity error.

EQUAL-CTX is defensible as “financial agreement under a ledger-conditioned mapping.” It is **not independently verified code identity**.

Other concrete defects:

1. **Expected-mode payment equality is not asserted.**
   ```python
   rec["outcome"] = "MATCH" if (delta == want and line_ok and fresh) else "MISMATCH"
   ```
   B can be wrong or absent while a historical audit INSERT survives.

2. **Predicted models do not gate acceptance.**
   `form_model` and `ledger_model` can be DIFF while `rec["pass"]` remains true. A wrong code or quantity can pass a DIFFER stratum if component deltas remain as expected.

3. **Ledger duplicates are overwritten.**
   ```python
   led.setdefault(nr, {})[(comp, code)] = (...)
   ```
   This neither aggregates nor rejects duplicate keys.

4. **This is normalized aggregate comparison, not a line multiset.**
   Form rows are summed per component/code. Split distributions and row multiplicity can disappear. Registration/tax quantity and unit price are not compared.

5. **Empty input passes 0/0.** There is no nonempty, unique, expected-cardinality assertion.

6. **NULL/empty numeric values become zero.** Malformed financial data should not silently acquire a valid numeric meaning.

The corrected P14 NC proves detection for a **unique-name substitution**, qty/unit mutation and collision with no matching ledger candidate. It does not test the dangerous collision where exactly one expected ledger candidate exists.

**Gate-correctness score: 6/10.**

## ORACLE-VALIDITY

### What v10 findings are genuinely closed

| v10 finding | Current disposition |
|---|---|
| Stale `restored=True` after refusal | **Code and asserted run closure**, for the shown refusal branch: `restored=False`, `restore_state="refused"`; NC3 discriminates. |
| A22 current-state retry | **Now concretely demonstrated.** Transcript shows 17 changed rows, current-state detection, verified restore and successful retry. |
| Immediate restoration from a pre-operation baseline | **Demonstrated on the fresh path**, including a skip-restore mutation. Not a universal closure because of the fallback baseline. |
| Nondiscriminating A28 | **Targeted sensitivity demonstrated**, but selective test cleanup is wrong and full-suite A28 remains the older test. |
| “13 populated tables” | **Corrected:** 13 tables, 21 rows, five nonempty. |
| Failure retention and XML/grant cleanup | **Demonstrated for the forced-failure experiment**, not every new driver failure path. |
| Missing-stage refusal, surviving JVM handling and interrupted restore | **Retained bounded evidence**, including A19/A20/A22b. |

### What remains partial or open

- **Independent hashes:** still the same implementation:
  ```python
  import sampled_real_form_diff_r5 as o
  ```
  Separate process/read independence is not independent canonicalization or protection-scope design.
- **Complete source/configuration hashing and hash-version compatibility:** the supplied oracle diff does not repair these v10 items.
- **A11 expected-operation inventory:** still open.
- **Validation before destructive restore:** no shown repair to the inner restoration order.
- **A10e DELETE/INSERT domain equality:** unchanged builder; preserving one registered non-DR row does not establish orphan handling.
- **A17 comprehensive live protection:** still entry-point protection, not a comprehensive helper/XML/JVM target boundary.
- **Privilege-source coverage:** A29 covers the tested account configuration, not global/table/role grants or arbitrary writers.

### Backup metadata is better, but “atomic snapshot” is too strong

The production change is sensible:

```python
h = _stage_content_hash(nrs, db, pfx, log)
```

Hashing staged rows fixes the specific live-after-copy mismatch in the normal uncontended path.

It does not atomically publish the database backup and metadata:

```python
with open(hpath, "w") as f:
    json.dump(...)
```

That publication remains separate, non-atomic and non-fsynced. Hashing stage tables occurs through subsequent reads. No demonstrated concurrent-stage-writer exclusion makes those reads one immutable snapshot.

NC4 does not validate the claimed mutation scenario correctly, as described above.

### Marker recovery is improved, not fully fail-closed

Atomic replacement and file fsync eliminate the ordinary truncated-file publication path. Malformed JSON is now retained and refused. Good.

Residual issues:

- No parent-directory fsync is shown after `os.replace`; do not claim power-loss durability.
- Any JSON dictionary passes structural validation. `{}` can still become an empty privilege record rather than a rejected schema violation.
- `_recover_grants_expected()` deletes an existing marker without checking whether its holder is alive.
- It reads restored grants but does not compare them to the requested set before returning success.
- Main calls that override first, removes the marker, and then invokes ordinary recovery; the latter can no longer validate the deleted record.
- The documented before-revoke crash hook is not exercised by the shown unit tests. Mocked valid/dead markers are not an actual crash at that publication boundary.

### Independence of the financial oracle

P13/P14 materially improve the evidence. Real `DlgBilingRalan` execution, audited payment writes and retained consumer baselines are far stronger than comparing two aggregate SQL queries.

But call the sources what they are:

- A_form and B are two outputs of the **same form save**, not independent implementations.
- The frozen consumer baseline is a separate implementation comparison.
- C is a DR-priced reference built using encounter/source data and mappings shared with the system under test. It is not an independently observed hospital invoice.

The ENC-only fixture baseline is a sensible design: it avoids overwriting the authored drug rows. The transcript shows a nonempty baseline and successful form execution. However, “drug rows unchanged” is printed as aggregate counts/sums, not asserted against a retained before-image.

`--allow-strata` is also handled honestly at the observation level:

> `real run exit=4`  
> `27 ... sukses=true`

That establishes execution of all 27 and the oracle’s narrower comparison envelope. **It is not an oracle PASS on all 27.** For the nine out-of-envelope visits, acceptance rests on the new comparator—with its expected-mode defects.

### Ranked residual oracle risks

1. **Expected-ledger-conditioned identity mapping**, hiding genuine code substitutions.
2. **Expected-mode acceptance disconnected from payment/model equality.**
3. **Recovery/hash scope shared with the checker**, plus missing operation inventories.
4. **Metadata publication and privilege-recovery boundaries not covered by the injected faults.**
5. **Historical provenance:** the stale-payment replay demonstrates that a fresh form save agrees; it does not identify the historical writer or event that created 62,873.2.

**Fit for purpose:** yes, for selected-form-path consistency experiments on this controlled synthetic installation. No, for independent charge-code correctness, general restoration safety, or population billing correctness.

**Oracle-validity score: 7.5/10.**

## REPRODUCIBILITY

P12 improves reproducibility, but does not close it. **“Reproducibility closure” is the wrong section title.**

### What is now demonstrably repeatable

- P12 binds the major recovery chain to checked executable bytes before and after execution.
- The wrapper’s current `39979e3c…` pin is consistent with the extra STRATA pinning change after the earlier run-lock deployment. That is explained evolution, not unexplained SHA drift.
- Published consumer/harness/helper sources reduce dependence on undocumented on-box code.
- The wrapper checks a specific STRATA dump hash.
- The builder repeatedly reproduces:
  > `356355:a66a3a546cc322... REPRODUCES-PIN`
- P14’s main run, kill-test rebuild and NC rerun reproduce the non-fixture ledger serialization.
- P14 fixture authoring is deterministic for fixed database inputs.
- P13 sampler determinism is reported with a repeated hash and an ineligible-visit refusal.

These establish **same-environment repeatability and partial source closure**.

They do not establish a third party can obtain the necessary inputs, provision the environment, compile the Java pieces and reproduce the results.

### Ranked blockers

#### 1. Obtainable input and dependency closure

The Khanza tree/jar dependencies, database dumps, configuration and provisioning secrets remain external inputs. A binary hash identifies a file; it does not supply that file or its dependency closure.

Required:

- Obtainable, immutable, hash-pinned input archives.
- Schema/data provenance and licensing/access conditions.
- A sanitized configuration contract.
- Build commands and dependency versions for the consumer/harness.
- A clear split between generated data and indispensable imported database state.

The manifest’s “given the Khanza jar + DB schema” understates the required input. These experiments need populated source tables, lookup data, tariffs, sample lists and application configuration.

#### 2. No clean-environment execution

No clean-box rebuild is embedded. Cloning the existing database copies its hidden assumptions, legacy data, SQL-mode sensitivities and accumulated application state.

P14’s zero-date copy failure is a concrete example: a seemingly simple lookup-table copy failed under a different session SQL mode. That is precisely the kind of dependency a clean build exposes.

#### 3. Single-home durability

The only live environment expires around November 20. Off-box durable storage is still an open owner decision. The handoff also says local commits were not pushed.

“Published sources” should therefore distinguish **present in the assessment/local tree** from independently downloadable release artifacts.

#### 4. Incomplete evidence binding

P13’s comparator summary says:

> `clone dropped; see earlier evidence`

and:

> `comparator.csv (0 diffs = ALL-EQUAL)`

Header-only difference CSVs do not independently establish denominator, B coverage or audit counts. The comparator could have emitted an explicit machine-readable summary, but the handoff admits those counts were not saved.

P14 is better: per-encounter JSON and detailed fixture lines are specified. Nevertheless, final freezing after development does not by itself establish that every earlier run used those final bytes.

#### 5. Reproducibility bypasses remain

The wrapper pins STRATA, but the NC driver still does:

```bash
STRATA_SQL=$(ls .../sik_p6f_build_*/strata_reg_rows.sql | head -1)
```

Its fixture validation is only “five STRATA registrations exist.” That does not establish full fixture provenance or equality between mutation arms.

Likewise, P14’s ledger reproduction check only prints:

```python
"REPRODUCES-PIN" if got == pin else "DIFFERS-FROM-PIN"
```

It never exits nonzero on a mismatch. The supplied runs did match; the driver does not enforce reproduction as a required property.

### What should count as closure

One new machine, provisioned from the documented release inputs, without copying an unexplained working installation:

1. Verify input archive hashes.
2. Build the executable dependencies.
3. Generate/reconstruct the cohort.
4. Reproduce the ledger pin.
5. Run recovery controls and a small form sample.
6. Save positive summaries, expected denominators, exits and final state.
7. Have someone other than the original operator follow the instructions.

Until then, the correct claim is **repeatable on the existing installation with improving portability**, not independently reproducible.

**Reproducibility score: 6.5/10.**

## E2E-DESIGN

This is the strongest improvement since v10. The financial experiments now connect actual form execution, payments, encounter totals and a first identity-sensitive comparison.

### What the evidence now supports

1. **Population-sized observed reconciliation, within the implemented projection.**
   > `S1 A vs C per encounter x component: 0 differences`

   That is 86,455 DR encounters, not just a total that can hide cross-encounter cancellation. But A is the current last-written billing state—part consumer, part form—not a historical pure-consumer output series.

2. **A real stale-payment problem was exposed.**
   The single live B discrepancy was not hidden. The clone replay shows a new benchmark-account INSERT of 204,506.

3. **Fresh form comparisons expanded substantially.**
   P13 ran 30 + 300 + 3,000 disjoint visits, with oracle exit 0 for each stage. This is stronger than the old 999 result, although the missing per-stage comparator summaries weaken the exact audit-count claim.

4. **P14 tested previously unexercised shapes.**
   Fees, multiple/repeated procedures, rounding boundaries, zero charges, fractional quantities and empty sections now have observed form behavior.

5. **Unique-name same-price substitutions are detectable.**
   The corrected NC establishes:
   > `verdict=DIFFER component_delta={}`

   That closes a real part of v10’s blind spot.

### A fair E2E claim

> On one pinned synthetic outpatient Khanza/MySQL installation, current billing and a DR-priced ledger agreed under the encounter/component reconciliation projection for 86,455 DR encounters. The real form was re-run on 3,330 additional sampled encounters with no reported comparator differences. A further 300-encounter run showed normalized financial agreement at component/code level under the implemented name mapping, with 119 encounters requiring expected-ledger-conditioned identity resolution. Authored edge experiments exposed fractional-quantity and fee-model limitations.

That is a substantial result. It does not require claiming independent code identity on all 300 or unchanged pre-registration on all 27.

### New E2E safety defects

#### P13 can delete a fixture it refused to touch

The script installs its EXIT trap before checking whether the clone already exists. With `BUILT=0`, cleanup executes:

```bash
SQL "DROP DATABASE IF EXISTS $FX;"
```

Therefore:

1. A retained `sik_p13w` exists.
2. Driver says “exists — refusing.”
3. EXIT cleanup drops that retained clone.

This directly contradicts the failure-retention intent and can destroy evidence.

#### Clone creation is not pipeline-fail-closed

Both P13 and P14 use:

```bash
mysqldump ... | mysql ... || ...
```

without `pipefail`. A producer failure can be hidden by a successful consumer exit. Printed billing counts are not a complete clone validation.

#### P14 reports successful driver completion after failures

```bash
case "$FIX_RC" in 0|1|4) ;; ...
```

accepts fixture mismatch exit 1. Real-run failures are printed but not propagated. The driver ends:

```bash
exit 0
```

The task may legitimately allow known financial DIFFER outcomes, but it must distinguish those from failed execution, unexpected oracle mismatch and missing coverage.

#### Stop rules are incorrectly implemented

Both drivers use integer division and compare the truncated result to 2. A 2.33% failure rate can become 2 and escape a “>2%” stop rule.

P14’s stop function returns 1, which its caller then accepts as an allowed fixture result. Thus even a detected stop condition need not stop the wave.

#### Cleanup is not run-scoped

`pkill -f BilingHarness` targets all matching harness processes, not only the current run. An advisory lock covering some entry points does not make global process killing safe.

P14 also installs cleanup before checking XML state and fixture existence. Refusal can restore configuration, kill processes and revoke grants belonging to existing work.

### v10’s top three and single next step: disposition

| v10 priority | v11 disposition |
|---|---|
| Recovery/acceptance integrity | **Partially improved, not closed.** Fresh preservation run succeeds, but fallback baselines, unchecked evidence and new cleanup defects remain. |
| Independent reproducibility | **Improved packaging, still open.** No clean-box rebuild. |
| Independent encounter/line financial correctness | **Major encounter-level advance; partial line-level closure.** Circular collision mapping remains. |
| Single next step: repair preservation experiment | **Successful demonstrated fresh path, incomplete implementation closure.** The missing-baseline reuse path and removed assertions prevent a full close. |

### Weakest financial leg and the next step

The weakest financial leg is **provenance of the actual charge code**, not sample size. Another 3,000 EQUAL-CTX visits would not solve it.

**Single most important next step: make the 300-encounter line-identity experiment genuinely discriminating before expanding it.**

- Capture actual form/input charge identifiers independently of C.
- Leave ambiguous names unresolved unless independent provenance resolves them.
- Add a same-name, same-price wrong-code mutation whose expected ledger code remains present.
- Make `--expect` assert payment equality, model equality and required cardinalities.
- Fail on duplicate ledger keys and empty/missing encounters.
- Rerun the existing 300 and retain complete summaries.

In parallel, fix the existing-clone deletion bug before any more driver runs. That is a safety prerequisite, not optional benchmark enhancement.

**E2E-design score: 8/10.**

## EXTERNAL-VALIDITY

P14 broadens **mechanistic path coverage**, not external validity in the clinical or operational sense.

### What improved

The benchmark no longer tests only the cohort’s simplest billing shape. P14 demonstrates that the form can exercise:

- Multiple and repeated procedures.
- Dispensing fees.
- Zero-priced registration/procedures.
- Fractional quantities.
- Split drug rows.
- Empty billing sections.
- Rounding boundaries.
- Display-name collisions.

Finding that the ledger rejects fractional quantities and omits dispensing fees is valuable. It defines where extrapolation breaks.

### What did not improve

The population remains:

- Synthetic.
- Outpatient.
- One HMS installation.
- One pinned MySQL/application configuration.
- Uncalibrated diagnosis, drug and payer distributions.
- No inpatient/BPJS or second-HMS validation.
- No C1–C4 clinical/calibration review.

T0 is especially important:

> All 86,455 DR visits have exactly one procedure, no non-zero embalase/tuslah, and registration fee 10,000.

That is a very narrow financial workload. A large N does not compensate for missing support over the cases where the ledger demonstrably differs.

The 27 authored visits are not representative patient encounters. They are directed tests selected using this installation’s source tables and known implementation behavior. Their success rate is not a hospital accuracy estimate.

### Top external risk

**Shared synthetic assumptions will be mistaken for real-world financial correctness.**

The consumer, ledger and fixture models share encounter data, prices and mapping assumptions. Agreement can coexist with:

- Clinically implausible prescriptions.
- Incorrect payer rules.
- Missing discounts, surcharges or debt treatment.
- Wrong code identities hidden by display-name collisions.
- A tariff policy inappropriate for actual hospital billing.

P14’s zero-fee cases illustrate the problem: calling the difference a “ledger scope gap, not a form error” is reasonable under the declared DR authority, but real-world correctness requires a policy authority outside both implementations.

### What would materially advance this criterion

A small, independently reviewed reference set would do more than a full synthetic-cohort replay:

- De-identified or deliberately authored cases signed off by hospital billing staff.
- Independently specified expected codes, quantities, tariffs, adjustments and settlement.
- Realistic payer and clinical distributions.
- A second configuration or institution.
- Performance measurements that include actual cashier workflow rather than equating consumer throughput with productivity.

The paper-safe caveat in R5 §13 remains appropriate. Keep it prominent, and stop allowing stronger manifest/headline language to contradict it.

### Final scorecard

| Criterion | v10 | v11 | Delta |
|---|---:|---:|---:|
| Claim-honesty | 7 | **7** | 0 |
| Gate-correctness | 6.5 | **6** | −0.5 |
| Oracle-validity | 7.5 | **7.5** | 0 |
| Reproducibility | 6 | **6.5** | +0.5 |
| E2E-design | 7 | **8** | +1 |
| External-validity | 4 | **4.5** | +0.5 |

\[
\operatorname{round}\left(
\frac{7+6+7.5+6.5+8+4.5}{6}\times10
\right)
=
\boxed{66/100}.
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66.**

**Verdict: Needs targeted rework.** The experiments are stronger than v10. The acceptance machinery is not consistently as strong as the experiments. Stop adding green summary counts until missing evidence, expected-model disagreement and circular identity resolution can no longer pass.

**External-validity score: 4.5/10.**

## VERDICT

## Overall verdict

**66/100 — Needs targeted rework.**

The supplied assessments show a meaningful advance over v10: stronger real-form experiments, directed financial fixtures, better packaging, and a successful fresh preservation path. But **the acceptance machinery remains weaker than the experiments**: circular charge-code resolution and incomplete expected-mode assertions can still turn incorrect results into passes.

This synthesis uses the supplied code excerpts and assessment reports; it does not independently certify omitted code or run artifacts.

## Criterion scores and historical deltas

Delta order: **4701365 / 4769794 / 4795743 / 4818826 / v7 / v8 / v9 / v10**, matching the eight prior assessments.

| Criterion | Score /10 | Deltas versus eight prior scores |
|---|---:|---|
| Claim-honesty | **7** | +3 / +2 / +2 / +1 / +1 / +1 / 0 / 0 |
| Gate-correctness | **6** | +3 / +3 / +3 / +1 / 0 / 0 / 0 / −0.5 |
| Oracle-validity | **7.5** | +3.5 / +3.5 / +4.5 / +2.5 / +1.5 / +0.5 / +0.5 / 0 |
| Reproducibility | **6.5** | +3.5 / +1.5 / +0.5 / +1.5 / +0.5 / +0.5 / +0.5 / +0.5 |
| E2E-design | **8** | +4 / +3 / +3 / +2 / +1 / +1 / +1 / +1 |
| External-validity | **4.5** | +1.5 / +0.5 / +0.5 / +0.5 / +0.5 / +0.5 / +0.5 / +0.5 |

### Claim-honesty — 7/10
**Justification:** Disclosure of the amended experiments improves transparency, but “re-derivable without the original live box” contradicts the unfinished clean-box work, and the asserted **28/28** self-score exceeds the assessment’s defensible ceiling of **22/28**.  
**Biggest remaining risk:** Headline, manifest, and safety statements will convey stronger independence, preservation, or correctness guarantees than the evidence supports.

### Gate-correctness — 6/10
**Justification:** `code, how = inled[0], "ctx"` uses the expected ledger to select actual identity, while `MATCH` depends on `delta == want and line_ok and fresh` without requiring payment or predicted-model equality.  
**Biggest remaining risk:** A same-name, same-price wrong-code substitution—or an incorrect payment in expected mode—can receive a passing result.

### Oracle-validity — 7.5/10
**Justification:** Real `DlgBilingRalan` execution and audited writes materially strengthen the experiment, but “real run exit=4” alongside “27 ... sukses=true” proves execution, not an oracle pass for every fixture.  
**Biggest remaining risk:** Shared mappings and same-save outputs will be mistaken for independent financial truth, especially where the weaker comparator substitutes for the oracle.

### Reproducibility — 6.5/10
**Justification:** Packaging and pinned inputs improve repeatability, but the ledger check merely prints `"REPRODUCES-PIN" ... else "DIFFERS-FROM-PIN"` and no clean-box reconstruction has been demonstrated.  
**Biggest remaining risk:** Hidden installation dependencies and locally held, unpushed artifacts will prevent independent reconstruction, particularly after the existing environment expires.

### E2E-design — 8/10
**Justification:** The assessment reports a “Successful demonstrated fresh path” for preservation and broader directed financial controls, but P14 permits a stop-function return of `1` as an allowed fixture result.  
**Biggest remaining risk:** Unsafe refusal/cleanup behavior or ineffective stop rules can damage existing work or allow an invalid wave to continue.

### External-validity — 4.5/10
**Justification:** The directed cases broaden coverage, but “The 27 authored visits are not representative patient encounters,” and DR authority does not independently establish hospital billing policy.  
**Biggest remaining risk:** Agreement among synthetic, assumption-sharing implementations will be presented as real-world billing accuracy.

## 1. Disposition of v10 findings

**No broad v10 priority is fully closed under the requested code-plus-asserted-run standard.** There are credible, narrower closures.

| Finding | Disposition | What the supplied evidence supports |
|---|---|---|
| Fresh preservation experiment | **Narrowly demonstrated; broader issue still open** | The fresh path succeeds, but missing-baseline reuse, fallback baselines, removed assertions, and unchecked evidence prevent closure of preservation integrity generally. |
| Missing real-form financial evidence | **Substantially addressed for the demonstrated paths** | Real form execution, audited payment writes, and a retained consumer baseline are stronger than aggregate-query agreement; this does not establish independent charge-code correctness. |
| Detection of specific line mutations | **Narrowly fixed in the reported corrected NC** | The corrected P14 control detects unique-name substitution, quantity/unit mutation, and a collision with no matching ledger candidate; it does not cover the dangerous collision with exactly one expected candidate. |
| General recovery/acceptance integrity | **Still open** | Recovery publication boundaries, grant validation, evidence inventories, and acceptance predicates remain defective or incomplete. |
| Independent reproducibility | **Still open; packaging improved** | No independent clean-box rebuild or complete external-input closure is shown. |
| Independent encounter/line correctness | **Partial encounter-level progress; line identity still open** | EQUAL-CTX is ledger-conditioned financial agreement, not independent identification of the actual charge code. |

### Claims that do not qualify as verified fixes

- **“Every restore” verified:** `>=1 verification marker` does not enumerate and verify every required restore.
- **All live data unchanged:** equal row counts and a ledger hash do not cover all relevant live state.
- **Drug rows unchanged:** printed aggregate counts/sums are not an assertion against a retained before-image.
- **Exactly one current-run INSERT:** `bcnt == 1 and cnt >= 1` permits other accounts’ inserts, and the check lacks a run/time boundary.
- **All 27 passed the oracle:** successful execution does not override the oracle’s reported exit `4`.
- **Original predictions confirmed:** E6 was revised after an executed experiment; E8’s change to EQUAL-CTX weakened the identity claim rather than resolving it.
- **Recovery boundary tested:** mocked marker states do not demonstrate the documented before-revoke crash boundary.
- **Independent release reproducibility:** local availability is not independently downloadable, durable publication.

## 2. Problems introduced or exposed across P11–P14

The excerpts establish these problems in the current work; they do not establish that every defect was newly introduced rather than newly discovered.

1. **Safety defects in refusal and cleanup.** Existing-clone refusal can lead to deletion; cleanup installed before validation can affect existing work; `pkill -f BilingHarness` is not run-scoped.
2. **P14’s circular identity resolution.** The expected ledger selects the supposed actual code, allowing a financially identical wrong code to pass.
3. **Expected-mode acceptance gaps.** Payment equality and predicted-model equality do not gate success; duplicate ledger keys are overwritten; empty input can pass `0/0`; NULL/empty numerics silently become zero.
4. **Line-comparison scope is overstated.** Aggregation loses row multiplicity and split distributions, while registration/tax quantity and unit price are not compared.
5. **Stop rules do not reliably stop.** Integer truncation can hide a rate above 2%, and P14 can accept the stop function’s failure return.
6. **Recovery boundaries remain unsafe or untested.** Override recovery can disregard holder liveness, omit grant-set equality, and delete metadata before ordinary recovery validates it.
7. **Reproducibility evidence is incompletely bound.** P13 lacks saved positive denominator/coverage summaries; P14’s pin mismatch does not fail execution; NC fixture selection still uses `ls ... | head -1`.
8. **Portability and documentation contradictions are now concrete.** P14’s zero-date copy failure exposes SQL-mode dependence, while documented live write privileges contradict the handoff’s “no benchmark grants” statement.

## 3. Top three remaining issues

1. **Execution safety and recovery integrity.** Fix destructive existing-clone refusal, pre-validation cleanup, global process killing, and privilege-recovery validation **before further driver runs**.
2. **Discriminating financial acceptance.** Remove expected-ledger-conditioned actual identity and require payment/model equality, freshness, nonempty expected coverage, and duplicate rejection.
3. **Independent reproducibility and durable evidence.** Complete an independently operated clean-box rebuild from hashed release inputs, with enforced pins and retained positive summaries.

## 4. Top three strongest properties to lead with

1. **Actual application-path testing:** real billing-form execution, audited payment writes, and a separate consumer implementation baseline.
2. **Directed, falsifiable experiments:** fractional and missing-ledger cases plus mutation controls probe specific failure mechanisms rather than merely increasing sample size.
3. **Improved experimental breadth and transparency:** more edge coverage, a successful fresh preservation path, and disclosure of revised expectations—provided the headline claims retain those qualifications.

## 5. Overall score and trajectory

\[
\operatorname{round}\left(\frac{7+6+7.5+6.5+8+4.5}{6}\times10\right)
=\operatorname{round}(65.83)=\boxed{66/100}
\]

| Prior score | Overall delta |
|---:|---:|
| 35 | **+31** |
| 43 — both prior assessments | **+23** |
| 52 | **+14** |
| 58 | **+8** |
| 60 | **+6** |
| 62 | **+4** |
| 63 | **+3** |

**Trajectory:** 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → **66**.

The gain reflects stronger experimental design and modest reproducibility/external-coverage progress, partly offset by newly exposed acceptance defects.

## 6. Submission verdict

**Needs targeted rework.**

The work is increasingly credible as a **controlled synthetic-installation study of selected billing-path consistency**. It is not yet supported as an independently reproducible demonstration of charge-code correctness, general restoration safety, or population billing accuracy.

## 7. Single most important next step

**Make the existing 300-encounter line-identity experiment genuinely discriminating, then rerun it—not expand it.**

Capture actual charge identifiers independently of the expected ledger; add a same-name, same-price wrong-code mutation with the expected code still present; enforce payment/model equality and complete cardinality checks; and retain asserted per-encounter results and positive summaries.

**Safety prerequisite:** repair existing-clone deletion and non-run-scoped cleanup before executing that rerun.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

**v11 overall: 66/100 — Needs targeted rework.**

There is real progress: the preservation experiment now demonstrates immediate restoration against a pre-operation baseline; encounter-level reconciliation exists; fresh form payments were exercised at substantially greater scale; and P14 found genuine ledger limitations. But **“5/5 DISCRIMINATING,” “27/27 pre-registered matches,” and “300/300 line identity” each conceal qualifications that the current acceptance logic does not enforce.**

This assessment inspects the embedded code, diffs and transcripts. It is not a fresh execution, and a SHA for an omitted script is not source inspection.

### What is honestly disclosed

Credit is due for retaining rather than deleting adverse evidence:

- P12’s first reconciliation mutation changed nothing and was reported as `NOT-DISCRIMINATING`.
- P14’s first line NC failed its clean arm:
  > `unplanted exit=1 (0 needed)`
  
  The corrected run actually establishes clean pass → planted failure.
- P14’s first kill attempt stopped at the builder failure, before the intended kill point. The second transcript shows three harness processes before SIGTERM and zero afterward.
- The P13 bound and doubled throughput were explicitly corrected in prose.
- The concurrent P11 writer incident and loss of binding to earlier executable bytes are plainly recorded.
- Fractional quantities, fees and zero-price differences are reported as defects or scope gaps, not silently repaired.

These are meaningful improvements in research conduct.

### Arithmetic and statistical claims

For zero observed failures, the binomial Clopper–Pearson upper limits are:

\[
p_{\text{one-sided},95\%}=1-0.05^{1/n},
\qquad
p_{\text{two-sided},95\%}=1-0.025^{1/n}.
\]

| Result | One-sided upper limit | Two-sided upper endpoint |
|---|---:|---:|
| 0/3,330 | **0.08992%** | **0.11072%** |
| 0/300 | **0.99361%** | **1.22210%** |

The corrected numerical values are right. Their interpretation still needs work:

1. **P14’s denominator is encounters, not lines.** It measures whether an encounter has a comparator-detectable disagreement. Calling this a bound on the “line-level mismatch rate” is wrong. There are 1,240 lines, but lines within encounters are not independent trials.
2. Stratified sampling alone does not establish the common-rate binomial model. Without the sampler’s allocation and inclusion probabilities, these are **conditional binomial reference limits**, not demonstrated design-valid population bounds.
3. They bound failures observable by the comparator—not true billing errors that its mapping or selection rules hide.

Other arithmetic:

- \(3330/85387 = 3.900\%\): correct.
- \(1068/86455 = 1.235\%\): “1.2%” is fair.
- \(119/300 = 39.667\%\): “40%” is fair.
- Correct P13 rates from the supplied elapsed times are **9.63, 11.48 and 16.96 visits/min**. The printed rates are doubled.
- The stale payment’s raw discrepancy is **Rp 141,632.8**, not an integer discrepancy. P12’s rounding makes its comparison discrepancy Rp 141,633.
- \(34,895,128,580-34,870,243,633=24,884,947\): the scope-bridge subtraction is correct. Attribution to 221 registrations requires the underlying query, not subtraction alone.

### P14’s pre-registration is not as clean as claimed

The task permits learning from failures. That is reasonable. It does **not** justify describing all final matches as unchanged pre-registered predictions.

- E4 was originally **OPEN**. Observing half-up behavior is useful evidence, not an originally fixed EQUAL prediction.
- E6’s original model was wrong. It predicted truncation; the builder actually rejected the string `'0.5'`.
- The amendment’s signs were also wrong: if C truncates a positive drug quantity, **A−C is positive**, not the negative drug delta written in §2a.
- Loading the two fractional visits **after** the successful ledger build changes the experiment. Their C=0 is an imposed absence, not the frozen builder’s computed financial answer.
- The task self-score says E6 was “not re-predicted to match.” The report says its expectation was amended to the whole form amount; the final manifest comparisons clearly use that revised expectation. Those statements cannot both describe an unchanged prediction.
- E8 was changed from “AMBIGUOUS” to EQUAL-CTX before the reported billing run. The change is disclosed, but it relaxes the identity claim rather than solving the ambiguity.

Correct wording: **25 successfully built fixture visits plus two fractional visits evaluated under an explicitly amended missing-ledger experiment; final observations matched the revised models.**

### The 28/28 self-score is not defensible

At minimum, these rubric items cannot receive full credit:

| Item | Why full credit fails |
|---|---|
| R3 driver safety | Existing-clone refusal and pipeline/exit handling have defects; see below. |
| R4 line identity | Expected ledger codes resolve ambiguity; aggregation is not a per-line multiset comparison. |
| R6 pre-registration | E6 was revised after an executed builder experiment; the original failed prediction remains material. |
| R9 real-cohort result | 119 encounters have circular code resolution; the bound is mislabeled. |
| R11 live-state proof | Equal row counts plus a ledger hash do not prove all live data unchanged. |
| R14 report honesty | Several claims exceed the assertions actually implemented. |

Even granting every other item 2, that caps the self-score at **22/28**, not 28. A complete independent rubric score would require the omitted evidence files.

### Remaining overclaims and stale documents

- A11 still says:
  > “every restore … hash-verified … `>=1 verification marker`”

  One verification marker is not an inventory of every required restore.
- The manifest still says:
  > “re-derivable without the original live box”

  P12 explicitly says the clean-box rebuild and external-input closure are unfinished.
- “Raw … DB images are too large to pin by hash” is not a technical justification. Large files can be streamed through SHA-256.
- The handoff says **no benchmark grants on live databases**. P14 explicitly lists live INSERT/UPDATE/DELETE and broad `sik_bench` privileges. This is a consequential stale safety statement.
- The final P14 proof still shows the lock held. Release is reported elsewhere, but not demonstrated by the embedded final proof.
- “One held lock” over the entire P12 chain is imprecise: the transcript explicitly releases it for the lock NC and reacquires it.
- R5’s older “edge strata NOT TESTED” and settlement caveats remain inconsistent with later sections.

**Claim-honesty score: 7/10.**

## GATE-CORRECTNESS

The important question is not whether a transcript contains FAIL. It is whether **the same acceptance predicate rejects the intended violation, without unrelated failure or missing evidence being counted as success**.

### P11 negative controls: three useful tests, one partial test, one confounded test

| Control | Assessment |
|---|---|
| NC1 rollback | The injected autocommit path can change staged content and is observed failing. Genuine sensitivity, but checksum validation and cleanup remain defective. |
| NC2 immediate restoration | The pre-operation snapshot detects skipped restoration. Genuine observed discrimination, but the runner accepts aggregate failure rather than requiring that exact assertion to fail. |
| NC3 stale restored flag | Code clears the flag; the targeted state assertion fails with the switch and passes without it. Strong bounded closure. |
| NC4 snapshot coherence | **Not a valid demonstration of the claimed causal property.** Different arms use different predicates and the NC arm adds a separate live mutation. |
| NC5 missing stage table | Dropping an inventoried table is observed failing. Does not prove the original inventory was complete. |

The switches are inactive when absent, but use truthiness:

```python
if os.environ.get("R5_NEGCTL_BACKUP_NO_TXN"):
```

Thus `R5_NEGCTL_BACKUP_NO_TXN=0` activates the fault. They are not production-safe merely because they are called test-only; direct helper calls can bypass entry-point target protections.

#### NC4 is the clearest false assurance

The switch changes backup hashing to the old live-late behavior. But the NC test then independently executes:

```bash
SQL "UPDATE ... SET totalbiaya=totalbiaya+1 ..."
```

and checks only:

```bash
[ "$HSTAGE" = "$HLIVE" ]
```

The clean arm additionally checks the **stored** hash. The broken arm does not.

The NC would still fail if the backup stored the correct stage hash, because the test deliberately makes current live content differ from staged content. It demonstrates that a hash detects an UPDATE—not that the stored backup metadata remains coherent across that UPDATE.

Use identical assertions in both arms: stage content versus stored metadata, with the same intervening live mutation. Correct stage-based hashing should pass; live-late hashing should fail.

#### The NC runner can manufacture PASS from missing evidence

```bash
grep -aq "^A$2: FAIL" "$1" 2>/dev/null && echo FAIL || echo PASS
```

No file, no matching assertion, or a crashed run without that assertion becomes **PASS**. It also chooses evidence through `ls -t ... | head -1`, rather than a run-specific returned artifact.

NC2/NC5 search for any `PRESERVATION-CHECK FAIL`, allowing an unrelated failure to satisfy their negative arm. These are genuine gate defects despite the displayed successful targeted runs.

### The preservation repair still has an escape hatch

The good path is substantially improved. The bad path remains:

```bash
[ -f "$PREOP" ] || {
  python3 p10_hash_state.py ... > "$PREOP"
  echo "pre-op snapshot re-recorded on the kept fixture ..."
}
```

That is a **post-failure baseline labeled pre-operation**. It reintroduces the exact v10 failure mode when the original snapshot is absent.

Further regressions:

- The prior assertions for wrapper exit=1, exactly one forced failure and A13 success were removed.
- Global snapshot filenames survive across runs without fixture/run identity binding.
- Expected stage names come from the post-failure observation:
  ```python
  print(",".join(sorted(d.get("stage", {}))))
  ```
  Missing tables already absent at that observation are not detected as missing from a specification.
- `ERROR:<table>` is not “non-comparable.” Two identical strings compare equal. Correctness depends on rejecting error status everywhere.
- Stage NULL checks improved, but the shown validation only checks that the live checksum mapping is nonempty, not that every required live checksum is non-null.
- The retry’s restoration still relies on oracle markers rather than an independent sample snapshot immediately after restore and before re-billing.
- The new preservation script has no run-lock guard before installing its cleanup trap. A refused child wrapper does not prevent the parent’s trap from restoring XML and revoking another run’s fixture grant.

### A28′ introduces fixture corruption

After restoring the original staged rows, the test unconditionally does:

```bash
UPDATE ... SET totalbiaya=totalbiaya-5 ...
```

In the transactional clean arm, restore has already removed the +5 perturbation. The subtraction therefore damages the fixture by −5.

It also ignores `stage_restore()`’s Boolean result and calls `stage_drop()` regardless. The new `stage_cks_p11()` compares concatenated checksum strings without rejecting NULL checksums or enforcing the full table inventory.

The test is discriminating on its demonstrated fixture, but its cleanup and failure contracts are not trustworthy.

### Run lock: useful advisory admission control, not execution exclusion

The transcripts demonstrate refusal of absent/wrong sessions before the two guarded scripts write. That is real progress.

Still bypassable through:

- Direct suite invocation.
- Unguarded preservation/helper scripts.
- Manual SQL or configuration edits.
- Multiple processes using the same session identifier.
- Explicit forced release while a process remains alive.

The full lock implementation is omitted, so its race behavior cannot be independently inspected here. Do not promote the demonstrated session checks into a process-lifetime exclusivity guarantee.

### P12/P13 reconciliation: useful, but not exact financial validation

Both genuinely compare encounter/component pairs. The repaired +1 NC names the planted encounter, avoiding the earlier no-op.

However:

```sql
CAST(totalbiaya AS SIGNED)
```

and:

```python
quantize(Decimal(1), rounding=ROUND_HALF_UP)
```

discard sub-rupiah differences. Zero/negative-only rows can be excluded by:

```sql
(biaya>0 OR totalbiaya>0)
```

Additional problems:

- P12 compares `dr | ledger_enc`, while A is filtered to DR registrations. Legitimate retained non-DR ledger rows can produce scope-induced failures.
- Required coverage is printed, not comprehensively asserted. A DR encounter missing from both A and C can agree as two empty dictionaries.
- P12 S3 does not assert B coverage or B equality; those are inferred from the broader run, not enforced by S3.
- P13 silently deduplicates the visit list, so it cannot assert the requested original sample cardinality.
- P13’s freshness predicate is:
  ```python
  if bcnt == 1 and cnt >= 1:
  ```
  It permits additional INSERTs by another account. The report claims exactly one INSERT.
- The audit check has no run/time boundary. Fresh disposable audit tables make the demonstrated execution stronger, but the comparator alone does not establish current-run provenance.

**Collation-safe? Not established.** SQL uses database collation; Python uses exact string keys and sets. There is no explicit binary collation contract or adversarial case/accent/trailing-space test. The observed DR identifiers may avoid this problem; that is not a general guarantee.

### P14: wrong lines can pass

The central circularity is explicit:

```python
inled = sorted(k for k in cand if (c, k) in L)
if len(inled) == 1:
    code, how = inled[0], "ctx"
```

If expected code X and actual code Y share the same displayed name and financial attributes, the comparator assigns X because **the expected ledger contains X**. It passes the identity error.

EQUAL-CTX is defensible as “financial agreement under a ledger-conditioned mapping.” It is **not independently verified code identity**.

Other concrete defects:

1. **Expected-mode payment equality is not asserted.**
   ```python
   rec["outcome"] = "MATCH" if (delta == want and line_ok and fresh) else "MISMATCH"
   ```
   B can be wrong or absent while a historical audit INSERT survives.

2. **Predicted models do not gate acceptance.**
   `form_model` and `ledger_model` can be DIFF while `rec["pass"]` remains true. A wrong code or quantity can pass a DIFFER stratum if component deltas remain as expected.

3. **Ledger duplicates are overwritten.**
   ```python
   led.setdefault(nr, {})[(comp, code)] = (...)
   ```
   This neither aggregates nor rejects duplicate keys.

4. **This is normalized aggregate comparison, not a line multiset.**
   Form rows are summed per component/code. Split distributions and row multiplicity can disappear. Registration/tax quantity and unit price are not compared.

5. **Empty input passes 0/0.** There is no nonempty, unique, expected-cardinality assertion.

6. **NULL/empty numeric values become zero.** Malformed financial data should not silently acquire a valid numeric meaning.

The corrected P14 NC proves detection for a **unique-name substitution**, qty/unit mutation and collision with no matching ledger candidate. It does not test the dangerous collision where exactly one expected ledger candidate exists.

**Gate-correctness score: 6/10.**

## ORACLE-VALIDITY

### What v10 findings are genuinely closed

| v10 finding | Current disposition |
|---|---|
| Stale `restored=True` after refusal | **Code and asserted run closure**, for the shown refusal branch: `restored=False`, `restore_state="refused"`; NC3 discriminates. |
| A22 current-state retry | **Now concretely demonstrated.** Transcript shows 17 changed rows, current-state detection, verified restore and successful retry. |
| Immediate restoration from a pre-operation baseline | **Demonstrated on the fresh path**, including a skip-restore mutation. Not a universal closure because of the fallback baseline. |
| Nondiscriminating A28 | **Targeted sensitivity demonstrated**, but selective test cleanup is wrong and full-suite A28 remains the older test. |
| “13 populated tables” | **Corrected:** 13 tables, 21 rows, five nonempty. |
| Failure retention and XML/grant cleanup | **Demonstrated for the forced-failure experiment**, not every new driver failure path. |
| Missing-stage refusal, surviving JVM handling and interrupted restore | **Retained bounded evidence**, including A19/A20/A22b. |

### What remains partial or open

- **Independent hashes:** still the same implementation:
  ```python
  import sampled_real_form_diff_r5 as o
  ```
  Separate process/read independence is not independent canonicalization or protection-scope design.
- **Complete source/configuration hashing and hash-version compatibility:** the supplied oracle diff does not repair these v10 items.
- **A11 expected-operation inventory:** still open.
- **Validation before destructive restore:** no shown repair to the inner restoration order.
- **A10e DELETE/INSERT domain equality:** unchanged builder; preserving one registered non-DR row does not establish orphan handling.
- **A17 comprehensive live protection:** still entry-point protection, not a comprehensive helper/XML/JVM target boundary.
- **Privilege-source coverage:** A29 covers the tested account configuration, not global/table/role grants or arbitrary writers.

### Backup metadata is better, but “atomic snapshot” is too strong

The production change is sensible:

```python
h = _stage_content_hash(nrs, db, pfx, log)
```

Hashing staged rows fixes the specific live-after-copy mismatch in the normal uncontended path.

It does not atomically publish the database backup and metadata:

```python
with open(hpath, "w") as f:
    json.dump(...)
```

That publication remains separate, non-atomic and non-fsynced. Hashing stage tables occurs through subsequent reads. No demonstrated concurrent-stage-writer exclusion makes those reads one immutable snapshot.

NC4 does not validate the claimed mutation scenario correctly, as described above.

### Marker recovery is improved, not fully fail-closed

Atomic replacement and file fsync eliminate the ordinary truncated-file publication path. Malformed JSON is now retained and refused. Good.

Residual issues:

- No parent-directory fsync is shown after `os.replace`; do not claim power-loss durability.
- Any JSON dictionary passes structural validation. `{}` can still become an empty privilege record rather than a rejected schema violation.
- `_recover_grants_expected()` deletes an existing marker without checking whether its holder is alive.
- It reads restored grants but does not compare them to the requested set before returning success.
- Main calls that override first, removes the marker, and then invokes ordinary recovery; the latter can no longer validate the deleted record.
- The documented before-revoke crash hook is not exercised by the shown unit tests. Mocked valid/dead markers are not an actual crash at that publication boundary.

### Independence of the financial oracle

P13/P14 materially improve the evidence. Real `DlgBilingRalan` execution, audited payment writes and retained consumer baselines are far stronger than comparing two aggregate SQL queries.

But call the sources what they are:

- A_form and B are two outputs of the **same form save**, not independent implementations.
- The frozen consumer baseline is a separate implementation comparison.
- C is a DR-priced reference built using encounter/source data and mappings shared with the system under test. It is not an independently observed hospital invoice.

The ENC-only fixture baseline is a sensible design: it avoids overwriting the authored drug rows. The transcript shows a nonempty baseline and successful form execution. However, “drug rows unchanged” is printed as aggregate counts/sums, not asserted against a retained before-image.

`--allow-strata` is also handled honestly at the observation level:

> `real run exit=4`  
> `27 ... sukses=true`

That establishes execution of all 27 and the oracle’s narrower comparison envelope. **It is not an oracle PASS on all 27.** For the nine out-of-envelope visits, acceptance rests on the new comparator—with its expected-mode defects.

### Ranked residual oracle risks

1. **Expected-ledger-conditioned identity mapping**, hiding genuine code substitutions.
2. **Expected-mode acceptance disconnected from payment/model equality.**
3. **Recovery/hash scope shared with the checker**, plus missing operation inventories.
4. **Metadata publication and privilege-recovery boundaries not covered by the injected faults.**
5. **Historical provenance:** the stale-payment replay demonstrates that a fresh form save agrees; it does not identify the historical writer or event that created 62,873.2.

**Fit for purpose:** yes, for selected-form-path consistency experiments on this controlled synthetic installation. No, for independent charge-code correctness, general restoration safety, or population billing correctness.

**Oracle-validity score: 7.5/10.**

## REPRODUCIBILITY

P12 improves reproducibility, but does not close it. **“Reproducibility closure” is the wrong section title.**

### What is now demonstrably repeatable

- P12 binds the major recovery chain to checked executable bytes before and after execution.
- The wrapper’s current `39979e3c…` pin is consistent with the extra STRATA pinning change after the earlier run-lock deployment. That is explained evolution, not unexplained SHA drift.
- Published consumer/harness/helper sources reduce dependence on undocumented on-box code.
- The wrapper checks a specific STRATA dump hash.
- The builder repeatedly reproduces:
  > `356355:a66a3a546cc322... REPRODUCES-PIN`
- P14’s main run, kill-test rebuild and NC rerun reproduce the non-fixture ledger serialization.
- P14 fixture authoring is deterministic for fixed database inputs.
- P13 sampler determinism is reported with a repeated hash and an ineligible-visit refusal.

These establish **same-environment repeatability and partial source closure**.

They do not establish a third party can obtain the necessary inputs, provision the environment, compile the Java pieces and reproduce the results.

### Ranked blockers

#### 1. Obtainable input and dependency closure

The Khanza tree/jar dependencies, database dumps, configuration and provisioning secrets remain external inputs. A binary hash identifies a file; it does not supply that file or its dependency closure.

Required:

- Obtainable, immutable, hash-pinned input archives.
- Schema/data provenance and licensing/access conditions.
- A sanitized configuration contract.
- Build commands and dependency versions for the consumer/harness.
- A clear split between generated data and indispensable imported database state.

The manifest’s “given the Khanza jar + DB schema” understates the required input. These experiments need populated source tables, lookup data, tariffs, sample lists and application configuration.

#### 2. No clean-environment execution

No clean-box rebuild is embedded. Cloning the existing database copies its hidden assumptions, legacy data, SQL-mode sensitivities and accumulated application state.

P14’s zero-date copy failure is a concrete example: a seemingly simple lookup-table copy failed under a different session SQL mode. That is precisely the kind of dependency a clean build exposes.

#### 3. Single-home durability

The only live environment expires around November 20. Off-box durable storage is still an open owner decision. The handoff also says local commits were not pushed.

“Published sources” should therefore distinguish **present in the assessment/local tree** from independently downloadable release artifacts.

#### 4. Incomplete evidence binding

P13’s comparator summary says:

> `clone dropped; see earlier evidence`

and:

> `comparator.csv (0 diffs = ALL-EQUAL)`

Header-only difference CSVs do not independently establish denominator, B coverage or audit counts. The comparator could have emitted an explicit machine-readable summary, but the handoff admits those counts were not saved.

P14 is better: per-encounter JSON and detailed fixture lines are specified. Nevertheless, final freezing after development does not by itself establish that every earlier run used those final bytes.

#### 5. Reproducibility bypasses remain

The wrapper pins STRATA, but the NC driver still does:

```bash
STRATA_SQL=$(ls .../sik_p6f_build_*/strata_reg_rows.sql | head -1)
```

Its fixture validation is only “five STRATA registrations exist.” That does not establish full fixture provenance or equality between mutation arms.

Likewise, P14’s ledger reproduction check only prints:

```python
"REPRODUCES-PIN" if got == pin else "DIFFERS-FROM-PIN"
```

It never exits nonzero on a mismatch. The supplied runs did match; the driver does not enforce reproduction as a required property.

### What should count as closure

One new machine, provisioned from the documented release inputs, without copying an unexplained working installation:

1. Verify input archive hashes.
2. Build the executable dependencies.
3. Generate/reconstruct the cohort.
4. Reproduce the ledger pin.
5. Run recovery controls and a small form sample.
6. Save positive summaries, expected denominators, exits and final state.
7. Have someone other than the original operator follow the instructions.

Until then, the correct claim is **repeatable on the existing installation with improving portability**, not independently reproducible.

**Reproducibility score: 6.5/10.**

## E2E-DESIGN

This is the strongest improvement since v10. The financial experiments now connect actual form execution, payments, encounter totals and a first identity-sensitive comparison.

### What the evidence now supports

1. **Population-sized observed reconciliation, within the implemented projection.**
   > `S1 A vs C per encounter x component: 0 differences`

   That is 86,455 DR encounters, not just a total that can hide cross-encounter cancellation. But A is the current last-written billing state—part consumer, part form—not a historical pure-consumer output series.

2. **A real stale-payment problem was exposed.**
   The single live B discrepancy was not hidden. The clone replay shows a new benchmark-account INSERT of 204,506.

3. **Fresh form comparisons expanded substantially.**
   P13 ran 30 + 300 + 3,000 disjoint visits, with oracle exit 0 for each stage. This is stronger than the old 999 result, although the missing per-stage comparator summaries weaken the exact audit-count claim.

4. **P14 tested previously unexercised shapes.**
   Fees, multiple/repeated procedures, rounding boundaries, zero charges, fractional quantities and empty sections now have observed form behavior.

5. **Unique-name same-price substitutions are detectable.**
   The corrected NC establishes:
   > `verdict=DIFFER component_delta={}`

   That closes a real part of v10’s blind spot.

### A fair E2E claim

> On one pinned synthetic outpatient Khanza/MySQL installation, current billing and a DR-priced ledger agreed under the encounter/component reconciliation projection for 86,455 DR encounters. The real form was re-run on 3,330 additional sampled encounters with no reported comparator differences. A further 300-encounter run showed normalized financial agreement at component/code level under the implemented name mapping, with 119 encounters requiring expected-ledger-conditioned identity resolution. Authored edge experiments exposed fractional-quantity and fee-model limitations.

That is a substantial result. It does not require claiming independent code identity on all 300 or unchanged pre-registration on all 27.

### New E2E safety defects

#### P13 can delete a fixture it refused to touch

The script installs its EXIT trap before checking whether the clone already exists. With `BUILT=0`, cleanup executes:

```bash
SQL "DROP DATABASE IF EXISTS $FX;"
```

Therefore:

1. A retained `sik_p13w` exists.
2. Driver says “exists — refusing.”
3. EXIT cleanup drops that retained clone.

This directly contradicts the failure-retention intent and can destroy evidence.

#### Clone creation is not pipeline-fail-closed

Both P13 and P14 use:

```bash
mysqldump ... | mysql ... || ...
```

without `pipefail`. A producer failure can be hidden by a successful consumer exit. Printed billing counts are not a complete clone validation.

#### P14 reports successful driver completion after failures

```bash
case "$FIX_RC" in 0|1|4) ;; ...
```

accepts fixture mismatch exit 1. Real-run failures are printed but not propagated. The driver ends:

```bash
exit 0
```

The task may legitimately allow known financial DIFFER outcomes, but it must distinguish those from failed execution, unexpected oracle mismatch and missing coverage.

#### Stop rules are incorrectly implemented

Both drivers use integer division and compare the truncated result to 2. A 2.33% failure rate can become 2 and escape a “>2%” stop rule.

P14’s stop function returns 1, which its caller then accepts as an allowed fixture result. Thus even a detected stop condition need not stop the wave.

#### Cleanup is not run-scoped

`pkill -f BilingHarness` targets all matching harness processes, not only the current run. An advisory lock covering some entry points does not make global process killing safe.

P14 also installs cleanup before checking XML state and fixture existence. Refusal can restore configuration, kill processes and revoke grants belonging to existing work.

### v10’s top three and single next step: disposition

| v10 priority | v11 disposition |
|---|---|
| Recovery/acceptance integrity | **Partially improved, not closed.** Fresh preservation run succeeds, but fallback baselines, unchecked evidence and new cleanup defects remain. |
| Independent reproducibility | **Improved packaging, still open.** No clean-box rebuild. |
| Independent encounter/line financial correctness | **Major encounter-level advance; partial line-level closure.** Circular collision mapping remains. |
| Single next step: repair preservation experiment | **Successful demonstrated fresh path, incomplete implementation closure.** The missing-baseline reuse path and removed assertions prevent a full close. |

### Weakest financial leg and the next step

The weakest financial leg is **provenance of the actual charge code**, not sample size. Another 3,000 EQUAL-CTX visits would not solve it.

**Single most important next step: make the 300-encounter line-identity experiment genuinely discriminating before expanding it.**

- Capture actual form/input charge identifiers independently of C.
- Leave ambiguous names unresolved unless independent provenance resolves them.
- Add a same-name, same-price wrong-code mutation whose expected ledger code remains present.
- Make `--expect` assert payment equality, model equality and required cardinalities.
- Fail on duplicate ledger keys and empty/missing encounters.
- Rerun the existing 300 and retain complete summaries.

In parallel, fix the existing-clone deletion bug before any more driver runs. That is a safety prerequisite, not optional benchmark enhancement.

**E2E-design score: 8/10.**

## EXTERNAL-VALIDITY

P14 broadens **mechanistic path coverage**, not external validity in the clinical or operational sense.

### What improved

The benchmark no longer tests only the cohort’s simplest billing shape. P14 demonstrates that the form can exercise:

- Multiple and repeated procedures.
- Dispensing fees.
- Zero-priced registration/procedures.
- Fractional quantities.
- Split drug rows.
- Empty billing sections.
- Rounding boundaries.
- Display-name collisions.

Finding that the ledger rejects fractional quantities and omits dispensing fees is valuable. It defines where extrapolation breaks.

### What did not improve

The population remains:

- Synthetic.
- Outpatient.
- One HMS installation.
- One pinned MySQL/application configuration.
- Uncalibrated diagnosis, drug and payer distributions.
- No inpatient/BPJS or second-HMS validation.
- No C1–C4 clinical/calibration review.

T0 is especially important:

> All 86,455 DR visits have exactly one procedure, no non-zero embalase/tuslah, and registration fee 10,000.

That is a very narrow financial workload. A large N does not compensate for missing support over the cases where the ledger demonstrably differs.

The 27 authored visits are not representative patient encounters. They are directed tests selected using this installation’s source tables and known implementation behavior. Their success rate is not a hospital accuracy estimate.

### Top external risk

**Shared synthetic assumptions will be mistaken for real-world financial correctness.**

The consumer, ledger and fixture models share encounter data, prices and mapping assumptions. Agreement can coexist with:

- Clinically implausible prescriptions.
- Incorrect payer rules.
- Missing discounts, surcharges or debt treatment.
- Wrong code identities hidden by display-name collisions.
- A tariff policy inappropriate for actual hospital billing.

P14’s zero-fee cases illustrate the problem: calling the difference a “ledger scope gap, not a form error” is reasonable under the declared DR authority, but real-world correctness requires a policy authority outside both implementations.

### What would materially advance this criterion

A small, independently reviewed reference set would do more than a full synthetic-cohort replay:

- De-identified or deliberately authored cases signed off by hospital billing staff.
- Independently specified expected codes, quantities, tariffs, adjustments and settlement.
- Realistic payer and clinical distributions.
- A second configuration or institution.
- Performance measurements that include actual cashier workflow rather than equating consumer throughput with productivity.

The paper-safe caveat in R5 §13 remains appropriate. Keep it prominent, and stop allowing stronger manifest/headline language to contradict it.

### Final scorecard

| Criterion | v10 | v11 | Delta |
|---|---:|---:|---:|
| Claim-honesty | 7 | **7** | 0 |
| Gate-correctness | 6.5 | **6** | −0.5 |
| Oracle-validity | 7.5 | **7.5** | 0 |
| Reproducibility | 6 | **6.5** | +0.5 |
| E2E-design | 7 | **8** | +1 |
| External-validity | 4 | **4.5** | +0.5 |

\[
\operatorname{round}\left(
\frac{7+6+7.5+6.5+8+4.5}{6}\times10
\right)
=
\boxed{66/100}.
\]

**Trajectory: 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66.**

**Verdict: Needs targeted rework.** The experiments are stronger than v10. The acceptance machinery is not consistently as strong as the experiments. Stop adding green summary counts until missing evidence, expected-model disagreement and circular identity resolution can no longer pass.

**External-validity score: 4.5/10.**
