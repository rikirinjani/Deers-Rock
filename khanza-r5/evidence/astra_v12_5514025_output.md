# Astra v12 assessment: dr-khanza-e2e-full-assessment (post P1-P16) [merged: all six sections in one call + synthesis]

## CLAIM-HONESTY

**Overall: 71/100 — Needs targeted rework.** P15–P16 genuinely improve the benchmark. The central v11 circularity is removed, and several previously destructive or permissive paths now have useful controls. But “all findings fixed with old/new controls” is still too strong.

This is an assessment of the **embedded source and recorded runs**, not an independent execution or verification of files supplied only by hash.

### The independent review was necessary—and largely correct

P15’s **23/24 self-score was not defensible**. The reviewer identified substantive defects, not presentation preferences:

- Preservation refusal still revoked a grant it had not created.
- B5’s unquoted timestamp tested midnight, not the run start.
- Pre-run INSERTs were ignored.
- NULL payments became zero.
- A28′ printed but did not assert the restore result.
- Suite-level switch handling reactivated faults for `=0`.
- B6 plants lacked exact counts.
- Process-group cleanup lacked identity safeguards.
- Several evidence and document claims were unsupported.

P16 answers most of those **narrowly and concretely**. Particularly good corrections are the withdrawal of the supposed P15-start lock evidence, the admission that P14 release remains unevidenced, and the explicit limitation of A5/A6 to wiring tests.

The recorded first-chain failures are also handled correctly:

> `P15-LINE-NC: PASS=32 FAIL=1`

followed by a disclosed one-line test-script repair and:

> `P15-LINE-NC: PASS=33 FAIL=0`

That is honest experimental reporting. The earlier P15 ImportError and nondiscriminating NC1 are likewise retained rather than quietly replaced.

### P16 still overstates several things

**1. “Old bytes versus new bytes for each N1–N8” is false as a blanket description.**

Explicit paired evidence exists for preservation refusal, stale INSERT acceptance, restore-result assertion, and zero-valued switch activation. But:

- NULL-payment controls demonstrate the **new** comparators’ exit 2; no corresponding old-byte run is shown.
- B6’s new exact-count assertions are demonstrated, but there is no defective-plant experiment distinguishing the old `>=1` judge from the new judge.
- N8 is supported by current library-test results; the embedded evidence does not show an old/new execution pair for every process-identity case.

These are useful tests. They are not all paired regression demonstrations.

**2. The clone table-count claim is wrong.**

The report says 1,100 tables, echoing:

> `clone matches sik: tables=1100-equal`

But `p15_clone_matches_sik` overwrites `a` in its row-count loop and finally prints:

```bash
echo "clone matches sik: tables=$a-equal, 6 key tables row-equal"
```

At that point, `a` is the **detail_nota_jalan row count**, which the transcript separately reports as 1,100. The table-count equality check exists; the reported numerical table count is not its result.

**3. “Quantity compared for every component” is misleading.**

Registration quantity is synthesized:

```python
f["qty"] += Decimal(1) if c == "registration" else jml
```

The registration control mutates the **ledger** quantity, not the billing row’s `jumlah`. More on this below.

**4. “Snapshots written by this run” exceeds the binding check.**

The check establishes only `mtime >= suite_start`. It does not establish authorship, run identity, or an upper bound. A newer snapshot from another run satisfies it.

**5. The A28′ control does not demonstrate an actual failed restore being masked.**

It changes the printed result after the real restore operation. The transcript shows identical before/after hashes. It proves that the old judge ignored the result string and the new judge requires it. Calling that an executed failed-restore experiment overstates the intervention.

**6. The handoff remains internally stale.**

Its “current state” still leads with v10/P13, retains EQUAL-CTX, says the doubled-count bug remains unfixed although the P15 diff fixes it, and retains P14 “28/28” and “released” language. Later appended corrections do not make the earlier operational instructions reliable.

The P16 retrace claim again says “see the commit”; the actual trace-clean output is not embedded. I cannot verify that closure.

### Statistical claims

For zero mismatches in 300 encounters:

\[
U_{\text{one-sided}}=1-0.05^{1/300}=0.9936\%
\]

\[
U_{\text{two-sided upper}}=1-0.025^{1/300}=1.2221\%
\]

The stated **0.99% and 1.22% are correct**, conditional on the sampling/model assumptions. They are encounter-level bounds on **detectable mismatches**, not bounds on wrong-code use invisible to this comparator.

The fixture’s 27/27 means **27 expected outcomes matched**, including 12 DIFFER verdicts and 24 differing per-code entries. It does not mean 27 financial-equivalence passes or 27 oracle exit-zero results.

**Score: 7.5/10** — materially more honest, but the documentation still converts narrow checks into broader guarantees.

## GATE-CORRECTNESS

The important advance is real: the gate is no longer plainly circular, and expected mode now checks payment and model agreement. The remaining defects are sufficiently concrete that I would not approve the acceptance machinery unchanged.

### Disposition of the v11 safety and acceptance findings

| Findings | Current disposition |
|---|---|
| **S1–S2: destructive refusal/global cleanup** | **Narrowly fixed and paired-demonstrated** for P13/P14 refusal and, in P16, preservation refusal. General cleanup safety remains incomplete. |
| **S3: missing pipefail** | Fixed in P13/P14; producer failure demonstrated on current P14. No old-arm producer-failure run is embedded. |
| **S4: truncated stop percentage** | Fixed and unit-demonstrated: `bad*100 > 2*total`. |
| **S5: unexpected exits accepted** | Exit-decision logic fixed; wiring demonstrated. Full injected driver failure remains untested. |
| **S6: non-failing pin mismatch** | Pin checker and driver branch fixed; mutation plus separate wiring evidence. Not a full driver mutation run. |
| **S7: vacuous grant probe** | Fixed, with a genuine positive case and the old probe returning zero on the same grant. |
| **G1/G7: ledger-conditioned identity/missing collision control** | **Fixed for the named hole**, with explicit old/new C2 evidence. |
| **G2: expected-mode acceptance omissions** | Payment and quantity/amount model gates fixed and demonstrated; model scope remains incomplete. |
| **G3: duplicate ledger keys** | Explicit rejection demonstrated on a scratch table without its PK. Defensive hardening; production PK already prevented this case. |
| **G4: aggregation/registration quantities** | **Still partial.** Multiplicity is reported, not enforced; registration `jumlah` is ignored. |
| **G5/G6/G9: empty, duplicate, NULL inputs** | Demonstrated for the named P15 inputs and NULL payments in both comparators. Not complete numeric hardening across P13/P12. |
| **G8: fresh-B** | Stronger rule implemented and boundary-tested, with remaining attribution/cardinality gaps. |
| **G10: absent A and C coverage** | Fixed in P12 and explicitly paired-demonstrated by B6. |

### The controls discriminate—but only within their actual interventions

- **A1/A2:** Strong controls. Old P13 produces `sentinel=0`; old P14 produces `grant=0 dummy=dead`; new drivers preserve `sentinel=1 grant=4 dummy=alive`. P16 separately closes the preservation refusal’s grant revocation.
- **A3:** The failing dump produces a partial table and exit 2; current P14 exits 3 and removes its half-clone. This tests pipeline propagation rather than merely grepping for `pipefail`.
- **A4:** Correct arithmetic. \(7/300=2.333\%\), so `700 > 600` fires; the old integer division returned 2 and did not.
- **A5/A6:** Useful composition evidence, not E2E failure evidence. In fact, `tailrc()` directly assigns `FIX_RC` and `REAL_RC`; it does **not** execute a stubbed `oracle_run`. It tests the final decision tail. The pin test checks “no CONTINUED,” `KEEP=1`, and an abort message, but does not explicitly assert exit 3.
- **B1a:** Payment −1 produces MISMATCH.
- **B1b:** Changed quantity/unit with unchanged amount produces `form_model=DIFF`. This establishes the quantity/amount model gate, not complete unit-price validation.
- **B2/B4:** Duplicate ledger key, empty list, duplicate list, NULL billing total and NULL payment all reach the stated exit-2 paths.
- **B3:** Ledger registration quantity 2 fails. It does not test form-side registration quantity.
- **B5a–d:** Extra-account INSERT, stale-only timestamp, additional pre-run INSERT, and exact-start inclusion are meaningfully distinguished. B5c’s old MATCH/new MISMATCH is particularly useful.
- **C2:** Strong and targeted: old `EQUAL-CTX/MATCH`, new `DIFFER/MISMATCH`, on the same wrong ledger code.
- **B6:** Strong corrected control: exactly 18 billing and 5 ledger rows deleted; old ALL-EQUAL, new DIFFERENCES with two coverage records.

### New or residual acceptance defects

**Registration quantity remains invisible.**

```python
f["qty"] += Decimal(1) if c == "registration" else jml
```

A billing registration row changing `jumlah=1` to `jumlah=2`, with total unchanged, leaves the inferred quantity unchanged. The B3 plant avoids this blind spot by changing the ledger instead.

**Expected-mode unit-price defects can still pass.**

Predicted models contain only quantity and amount:

```python
obs_form = {...: [fmt(f["qty"]), fmt(f["amt"])] ...}
```

For fixtures with expected deltas, acceptance only requires the line verdict to remain DIFFER. Changing a unit price alone while retaining quantity and total can therefore leave:

- the expected component delta unchanged;
- both models MATCH;
- the already-DIFFER verdict unchanged;
- payment/freshness unchanged.

That is a concrete false-pass class. The fixture model needs unit prices and relevant adjustments, or an exact expected-difference specification.

**Cardinality is not complete.**

The visit list must be nonempty and unique, but it is not checked against an authoritative expected encounter set. A valid subset of the 27 manifest visits can pass. `B_rows` is recorded but never gated. Neither nonempty form/ledger coverage nor registration existence is universally required in equal mode.

Thus B6 closes the P12 `{}`/`{}` hole; it does not establish complete coverage in every comparator.

**Fresh-B is right for this fresh-clone experiment, not a general provenance proof.**

Current acceptance:

```python
fb[0] == 1 and fb[1] == 1 and fb[2] == 1
```

correctly implements exactly one recorded INSERT, by `benchmark@`, at/after start. But it lacks:

- a run-end bound;
- connection/run identity;
- rejection of subsequent UPDATE/DELETE activity;
- an assertion of the current payment-row cardinality.

P13 also permits omitting `--since`, making `win = "1"`. Its CLI can still label an undated historical INSERT “fresh.” Require a timestamp for freshness, as P15 does.

**Cleanup is safer, not proven safe.**

The PID guard accepts:

```bash
[ "$st" -le $((fm + 1)) ]
```

That is not “started no later than the PID file.” Same-second/next-second reuse can pass; PID identity can also change between checking and signalling. TERM is sent without waiting for confirmed death. Retargeting or teardown can follow while a writer remains alive.

P13 additionally sets `CREATED=1` after an **unchecked** CREATE DATABASE command. Under a race or creation failure it can claim ownership it never established. The advisory lock does not exclude manual writers.

P14’s successful exit ignores XML restore failure:

```bash
$DBXML restore ... && RETARGETED=0
res "database.xml restored"
```

The decision tail can still exit zero. Its wiring test uses `DBXML=true`, so cannot catch this.

### Recovery checks

- **E1/R1:** Missing evidence now yields ERROR in `nc_status_e`; the extracted-function tests demonstrate that. They do not delete evidence during a complete NC-runner execution. NC2/NC5 now require specific failure evidence, which is a substantive improvement.
- **E2/R2:** Both hash arms now receive the same drift hook; the contrast is properly isolated. However, the SQL updates **all billing rows for the encounter**, not “one row,” and does not assert affected rows.
- **E3/R3:** A28′ now requires `R28 = restored`, confines compensation to the NC arm, and checks the before-image hash. Good. A31′ still does not propagate a false `stage_restore()` result into its verdict.
- **E4/R4–R5:** Missing snapshot refusal is demonstrated; expected stage inventory now derives from specification. Timestamp freshness is still not run binding.
- **R6:** Exact-1 activation is fixed at the shown layers; runtime evidence directly covers the backup switch, with code inspection covering the other edited sites.
- **R7–R8:** Holder liveness, `{}` rejection and missing-grant checks improve recovery. But `set(privs) - set(back)` verifies inclusion, not exact restored-grant equality. Override recovery can issue grants before a readable marker is subsequently validated. No actual before-revoke crash-boundary experiment is supplied.

Finally, the new safety-control script itself starts setup with unconditional `DROP DATABASE IF EXISTS` and selects a dummy using global `pgrep ... | head -1`. **The safety tester needs the ownership discipline it demands from the drivers.**

**Score: 7/10** — major named holes closed; several acceptance and cleanup false-pass paths remain.

## ORACLE-VALIDITY

### EQUAL-SRC removes circular selection—not uncertainty about the form’s code

The crucial change is:

```python
insrc = sorted(k for k in cand if k in S.get(c, set()))
```

`S` comes from `rawat_jl_dr` and `detail_pemberian_obat`, not the expected ledger. That closes the v11 mechanism where the expected answer selected the alleged actual answer.

C2 demonstrates this rather than merely asserting it:

> Old: `verdict=EQUAL-CTX ... outcome=MATCH`  
> New: `verdict=DIFFER ... outcome=MISMATCH`

The independent reviewer also checked the collision’s preconditions: J000840 and J000844 share the display name and price, while the source row identifies J000840. This is good adversarial design.

However, C2 changes the **ledger**, not the form’s actual code choice. It demonstrates that a source-disagreeing expected code no longer gets laundered into the observed result. It does not demonstrate detection of a form using the wrong colliding code.

The stated C3 limitation is therefore essential and accurate:

> “The 119 EQUAL-SRC encounters agree with their own source rows; that is not an independent observation of the code the form used.”

For globally unique names, EQUAL is stronger identification under the lookup assumptions. It still relies on the display-name mapping being faithful and on the form output containing enough information to identify the intended charge.

### What the reruns establish

The P16 real run has a coherent evidence chain:

- 300 requested encounters;
- 300 distinct successful form executions;
- oracle exit 0;
- 300 comparator passes;
- 300 payment equalities;
- 300 fresh-B successes;
- 181 EQUAL and 119 EQUAL-SRC;
- zero differing entries among 1,240 compared entries.

The arithmetic is consistent:

\[
181+119=300,\qquad 119/300=39.67\%
\]

But **1,240 “lines” are aggregated per-encounter/component/code comparison entries**, not necessarily 1,240 original billing rows. The implementation unions keys and aggregates quantities and amounts; it does not compare a row multiset.

For the fixture:

\[
12\ \text{DIFFER}+12\ \text{EQUAL}+3\ \text{EQUAL-SRC}=27
\]

These 27 expected outcomes are useful evidence of characterized behavior, including known disagreement. The fixture oracle’s exit 4 is explicitly expected; it must not be promoted to an oracle-equivalence pass.

This substantially addresses v11’s concern about the weaker comparator standing in for the oracle: the comparator is stronger now and its expected-mode interpretation is clearer. It does not erase the distinction.

### Ranked residual oracle risks

**1. Unobserved form-side charge-code identity.**

This is the largest financial-oracle gap. Source rows and the ledger can agree while the form uses another code with the same rendered name and price. More samples cannot expose information the measurement does not collect.

**2. Shared-source and shared-model errors.**

The ledger, source-row resolver and authored fixture predictions share assumptions and mappings. Agreement is good evidence of implementation consistency, not independent hospital-policy correctness.

The expected-mode model also omits unit prices and row multiplicity. That is a gate weakness and an oracle-resolution weakness.

**3. X2: preservation checks share the oracle implementation.**

The supposed independent hash path imports the oracle module. Recomputing a hash in another process is not an independently implemented verification of the serialized state or table inventory. A shared omission can make both sides agree.

Specification-derived stage inventory is better than deriving expectations from the observation, but using the oracle’s own `RESET_TABLES` cannot detect a table the specification itself wrongly excludes.

**4. Incomplete recovery-state authority.**

A11’s operation inventory, inner restore order, comprehensive privilege sources, publication-boundary faults and general power-loss durability remain open. Atomic rename and unit-tested marker decisions are not a general restoration oracle.

### Fitness for use

The oracle is now **fit for a scoped consistency claim on the measured installation and selected encounters**. It is not fit to certify actual charge-code correctness under name collisions, independent preservation completeness, or hospital billing-policy correctness.

The v11 strongest properties remain valid and stronger: actual form execution, audited saves, retained consumer baselines and targeted financial mutations. The distinction between “different implementation” and “independent financial truth” must remain explicit.

**Score: 8/10** — the circularity fix earns credit; C3 and X2 still cap the claim.

## REPRODUCIBILITY

P16 improves **local repeatability and evidence attribution**. It does not establish independent reproducibility.

### What is genuinely stronger

**Frozen-current-byte discipline is better evidenced.**

The record now contains:

> `frozen P16: 21/21 OK`  
> `lsattr i-flag: 21/21`

and after the test-script repair:

> `frozen P16 (b): 22/22 OK; lsattr i-flag: 22`

The pre-unfreeze transcript shows the P15 set carrying `i` flags. This supplies the observation missing from the P15 review.

Do not overinterpret it: seeing P15 files immutable at 14:02 does not retroactively prove they were immutable throughout the earlier P15 execution. Historical hash checks support byte consistency at their recorded endpoints; later `lsattr` proves later attribute state.

**The partial rerun after P16 fix 1 is legitimate.**

The manifest amendment says only `p15_line_negctl.sh` changed, with `p16_chain_b.sh` added. Consequently, unchanged comparator, driver, oracle and recovery-suite evidence from chain A need not be discarded. Rebuilding the fixture and rerunning the affected line controls is a reasonable dependency-scoped rerun.

It would be wrong to say every result was obtained in one flawless run of manifest b. The report generally avoids that.

**Lock evidence is now properly bounded.**

P16 records:

> `RUNLOCK-FREE` before acquisition

and:

> `RUNLOCK-RELEASED`  
> `RUNLOCK-FREE`

afterward. That establishes the reported P16 endpoints. It does not establish P14 release, and P16 correctly withdraws that inference.

**The builder pin now gates execution.**

Repeated fresh clones reproduce:

> `356355:a66a3a54... REPRODUCES-PIN`

This is stronger than the v11 print-only check. A mutated copy fails the checker, and the driver’s pin branch is wiring-tested.

**Positive summaries are retained for the rerun.**

The 300-encounter denominator, verdict distribution, payment equality and freshness counts are now saved in machine-readable summaries, with per-encounter output supported by the source. This closes the missing-positive-summary problem for the **new 300 run**, not retrospectively for all original P13 stages.

### Ranked third-party blockers

**1. No complete, durable, independently obtainable reconstruction bundle.**

The manifest itself now admits:

> “The pins identify the bytes; they do not supply the Khanza tree, the DB dumps or the secrets.”

Correct. A hash identifies an artifact; it does not distribute it. The unpushed commits and `.bak_*` directories on the sole VPS remain availability risks. Old/new controls are not independently reproducible if the old bytes disappear.

The planned box expiry around November 20 makes this operationally urgent.

**2. No independently operated clean-box rebuild.**

No third party has demonstrated provisioning the runtime, loading the required database state, rebuilding the ledger and reproducing the gates without relying on the existing installation.

The report’s broad “deterministic and reproducible” banner therefore still needs a qualifier: **repeatable on the existing installation**.

**3. External state and dependencies remain incompletely closed.**

Jar, source tree, schema, fixture seed dump, database content, SQL mode and operational credentials are not interchangeable dependencies. A jar plus schema alone is insufficient for these numerical results.

Secrets need not be published. Their required roles, privileges and provisioning procedure do need to be reproducible.

The relaxed SQL-mode workaround remains installation knowledge, not demonstrated portability.

**4. Evidence binding remains weaker than the strongest wording.**

The preservation snapshots retain global filenames. Checking their timestamps against an evidence filename is not cryptographic or structural run binding.

Similarly:

- matching six table row counts is not clone content equality;
- matching live row counts and one ledger hash is not all-live-state equality;
- the grant-line hash covers the printed grant surface, not every possible effective privilege source.

**5. The release manifest is an accretion, not a clean release specification.**

Supersession rules are present, which is good. But multiple historical pin rows, stale component descriptions and locally held artifacts make selecting the effective dependency set unnecessarily error-prone. Produce one machine-readable current release inventory alongside the history.

### v11 reproducibility disposition

- **D1/D2 overclaims:** substantially corrected.
- **D8 P14 release:** still unevidenced, honestly acknowledged.
- **Ledger pin enforcement:** fixed.
- **NC fixture selection by `ls | head`:** replaced with an explicit pinned input.
- **Independent rebuild/durable publication:** still open.
- **P13 original positive summaries:** not repaired by rerunning only 300.

**Score: 7/10** — improved local reproducibility evidence, still no independent reconstruction.

## E2E-DESIGN

This is now a reasonably strong **controlled integration experiment**, but its evidence levels must not be collapsed into one “E2E passed” headline.

### The layers are useful and distinct

1. **Full-cohort A–C reconciliation:** consumer settlement versus the DR reference ledger.
2. **3,330 sampled real-form re-bills:** wider encounter-level consistency evidence under the historical P13 machinery.
3. **300 rerun encounters:** current per-code financial comparison, stricter payment/model/freshness handling and saved positive summaries.
4. **27 authored edge encounters:** directed tests of known financial behavior and discrepancies.
5. **Mutation and recovery controls:** evidence that named checks can reject named failures.

These are complementary. None substitutes for the others.

The denominator arithmetic can be reconciled:

\[
86{,}676-86{,}455=221
\]

matching the reported non-DR registration bridge, and:

\[
86{,}455-86{,}101=354
\]

matching the stated Stage-A seed difference. But:

\[
86{,}455-85{,}387=1{,}068
\]

encounters lie outside the P13 eligible sampling denominator. Every headline should identify which population it describes.

The sampled coverage is:

\[
3{,}330/85{,}387=3.900\%
\]

The current source-resolved line experiment covers only:

\[
300/85{,}387=0.351\%
\]

or about 9.01% of the 3,330 sampled re-bills. **The other 3,030 do not inherit the current comparator’s guarantees merely because the tool was subsequently repaired.**

### Freshness is a genuine design improvement—with a narrow contract

Exactly one total audit INSERT is defensible here because the experiment uses a fresh audit context and selects visits intended to receive a fresh form save. B5c proves the code does not silently ignore prior recorded INSERTs, and B5d checks the inclusive boundary.

It is not a universal billing correctness rule. Legitimate retries or multiple payments may produce several INSERTs. A proper generalization would use run/connection attribution and a domain-appropriate payment cardinality contract, not weaken the benchmark rule whenever it becomes inconvenient.

Within this experiment, also distinguish:

- “one recorded INSERT”;
- “one current payment row”;
- “the final payment value came from this form invocation.”

The current gate establishes the first more directly than the latter two.

### The safety prerequisite is substantially, not universally, satisfied

The v11 demand to fix destructive refusal before rerunning was followed for the P13/P14 drivers. Their paired controls precede the C4 run. P16 then repairs the preservation-check omission.

That is a legitimate closure of the immediate prerequisite. It is not general cleanup certification:

- no confirmed-dead writer barrier follows TERM;
- XML restore failure does not necessarily fail the driver;
- ownership and refusal safety are inconsistent across test helpers;
- the lock remains advisory;
- the full stop-rule failure has not been injected through the driver.

The process is now safer to operate, but “every validation before cleanup” and “cleanup only undoes this run” remain broader than the implementation.

### Fair E2E claim

A defensible statement is:

> On one pinned synthetic Khanza installation, full-cohort consumer totals reconcile to the DR ledger; selected encounters were re-billed through the real outpatient form; a 300-encounter rerun matched per-code aggregated financial values using source-resolved names and audited fresh saves; and 27 authored edge cases matched their specified outcomes, including expected disagreements.

Do not replace that with “charge-code correctness demonstrated” or “all 86,455 encounters independently verified through the form.”

### Top three remaining issues

1. **Observable financial identity:** C3 is still absent, and expected-mode unit/cardinality checks remain incomplete.
2. **End-to-end failure and cleanup acceptance:** the driver can report success despite restoration problems, while process termination is not verified.
3. **Independent reconstruction and durable artifacts:** the only installation remains a single point of evidence loss.

### Single most important next step

**Complete the existing 300-encounter experiment with form-side charge-code provenance—not a larger sample.**

Capture identifiers from the form model or save-path instrumentation independently of the ledger and source-row resolver. Compare a specified line representation including quantity, unit price, amount, adjustments and required cardinality. Inject a same-name/same-price **wrong form-side code**, then require that exact mutation to fail while the baseline passes.

Before executing it, close the identified cleanup-success paths: confirmed writer termination and a mandatory XML-restored assertion. Separately, archive the current inputs immediately; that should not wait for the next experimental wave.

This completes the intent of the v11 next step. P15–P16 completed its ledger-independent-resolution portion, not the full “actual charge identifiers” requirement.

**Score: 8.5/10** — strong layered integration design; the weakest leg remains the measurement of actual form-side identity.

## EXTERNAL-VALIDITY

P15–P16 improve internal validity. They add essentially no external validity.

### What is—and is not—covered

The benchmark remains:

- one Khanza application configuration;
- one MySQL configuration;
- outpatient only;
- a synthetic DR cohort;
- authored edge cases;
- an uncalibrated clinical and payer distribution.

C1–C4 remain untested. The 27 fixtures exercise behaviors that ordinary synthetic encounters may never reach, which is valuable. They do not estimate how frequently those behaviors occur in hospitals or whether the benchmark’s expected rules are the correct rules there.

The report’s own discovery illustrates the limitation: every DR visit has exactly one procedure, no embalase/tuslah, and the same registration-fee structure. That regularity makes agreement easier and suppresses interactions common in less constrained data.

The reported drug revenue share of approximately 82.7%, absent payer-mix exercise and uncalibrated diagnoses remain material external-validity gaps.

### The top external risk

**Shared synthetic assumptions can make all implementations agree on behavior that is wrong for real hospital billing policy.**

DR tariff authority is a legitimate benchmark reference. It is not independent evidence of:

- payer-specific contractual rates;
- exemptions and discounts;
- registration eligibility;
- packaging or service fees;
- cancellation and correction workflows;
- actual clinical utilization.

The known ledger gaps—fractional quantities, embalase/tuslah and DR-owned fees where Khanza bills zero—are particularly important. Reporting those discrepancies is honest. Treating them as “expected” in fixtures does not resolve which behavior is operationally correct.

### Statistical scope must remain narrow

The 300-encounter bounds are mathematically correct under the stated assumptions, but they cannot support general hospital accuracy. They also exclude error classes the comparator cannot observe.

Likewise, for 3,330 zero-mismatch encounters:

\[
1-0.05^{1/3330}\approx0.0899\%
\]

and the two-sided upper endpoint is approximately 0.1107%. Those are conditional binomial bounds, not population guarantees established by this study.

Neither repeated execution of the same 300 visits nor repeated zero results expands the independent encounter sample size.

The billing scope bridge is arithmetically sound:

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633
=24{,}884{,}947
\]

But reconciling the 221 non-DR registrations explains a benchmark scope difference; it does not validate real-world billing policy.

### Scoping honesty

The RC-9 paper-safe statement is appropriate and should lead any publication:

> “...does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

That limitation is stronger and more useful than the broad “PASS” banners elsewhere. Keep it attached to every summary of the result.

An external-validity next step would require independently adjudicated, appropriately governed hospital cases spanning payer and financial workflows—not simply a second synthetic installation. A second installation would first strengthen portability.

### Final score and trajectory

| Criterion | v11 | v12 | Change |
|---|---:|---:|---:|
| Claim-honesty | 7 | 7.5 | +0.5 |
| Gate-correctness | 6 | 7 | +1 |
| Oracle-validity | 7.5 | 8 | +0.5 |
| Reproducibility | 6.5 | 7 | +0.5 |
| E2E-design | 8 | 8.5 | +0.5 |
| External-validity | 4.5 | 4.5 | 0 |

\[
\operatorname{round}\left(
\frac{7.5+7+8+7+8.5+4.5}{6}\times10
\right)
=\operatorname{round}(70.83)=\boxed{71/100}
\]

**Trajectory:** 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66 → **71**.

**Verdict: Needs targeted rework.** The gain is earned: the central circular comparator and several dangerous refusal paths have been repaired with real evidence. The next gain requires better observation and stronger failure contracts—not another wave of reassuring pass counts.

**Score: 4.5/10** — appropriately scoped, but still externally unvalidated.

## VERDICT

## Overall verdict

**71/100 — Needs targeted rework.** P15–P16 improve the comparator, recovery checks, and local reproducibility, but they do not complete the v11 requirement to observe **actual form-side charge identifiers**. The remaining blockers are measurement blind spots, success despite incomplete restoration, and dependence on a single unpublished installation—not insufficient pass counts.

**Evidence qualification:** This synthesis relies on the six supplied assessments, not a fresh inspection of the repository or execution logs. Where they do not establish both a code change and an asserted old-bytes/new-bytes contrast, I do **not** label the finding fully verified under your requested standard.

## Criterion scores and historical deltas

Delta columns follow your nine assessments in chronological order; the combined v7 runs count as one assessment.

| Criterion | Score | 4701365 | 4769794 | 4795743 | 4818826 | v7 | v8 | v9 | v10 | v11 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Claim-honesty | **7.5** | +3.5 | +2.5 | +2.5 | +1.5 | +1.5 | +1.5 | +0.5 | +0.5 | +0.5 |
| Gate-correctness | **7** | +4 | +4 | +4 | +2 | +1 | +1 | +1 | +0.5 | +1 |
| Oracle-validity | **8** | +4 | +4 | +5 | +3 | +2 | +1 | +1 | +0.5 | +0.5 |
| Reproducibility | **7** | +4 | +2 | +1 | +2 | +1 | +1 | +1 | +1 | +0.5 |
| E2E-design | **8.5** | +4.5 | +3.5 | +3.5 | +2.5 | +1.5 | +1.5 | +1.5 | +1.5 | +0.5 |
| External-validity | **4.5** | +1.5 | +0.5 | +0.5 | +0.5 | +0.5 | +0.5 | +0.5 | +0.5 | 0 |

### Claim-honesty — 7.5/10
**Justification:** Statistical bounds and expected-disagreement reporting are more accurate, but `echo "clone matches sik: tables=$a-equal, 6 key tables row-equal"` prints a row-count variable as a table count, illustrating the remaining tendency to overstate what checks establish.  
**Biggest remaining risk:** Readers will interpret broad “PASS,” freshness, and quantity-comparison claims as guarantees stronger than the implemented observations.

### Gate-correctness — 7/10
**Justification:** Missing evidence now produces ERROR and A28′ requires `R28 = restored`, but `$DBXML restore ... && RETARGETED=0` followed by `res "database.xml restored"` still permits misleading restoration reporting and potentially successful driver exit.  
**Biggest remaining risk:** A run can be accepted or torn down while restoration is incomplete or a writer remains alive.

### Oracle-validity — 8/10
**Justification:** The assessments credit the circularity repair and stronger financial comparison, while `f["qty"] += Decimal(1) if c == "registration" else jml` shows that registration quantity remains synthesized rather than measured from the billing quantity.  
**Biggest remaining risk:** A wrong form-side code with the same rendered name and price remains invisible, even when all measured financial values agree.

### Reproducibility — 7/10
**Justification:** “Ledger pin enforcement: fixed” and an “explicit pinned input” replacing `ls | head` improve repeatability, but “unpushed commits and `.bak_*` directories on the sole VPS” leave essential evidence locally dependent.  
**Biggest remaining risk:** Loss of the installation or historical bytes could make both the results and the old/new repair demonstrations irreproducible.

### E2E-design — 8.5/10
**Justification:** The design combines real outpatient-form execution, audited fresh saves, a 300-encounter financial comparison, and “27 authored edge cases matched their specified outcomes, including expected disagreements.”  
**Biggest remaining risk:** Strong integration coverage can obscure the fact that the decisive form-side identity measurement and complete failure-through-driver tests are still missing.

### External-validity — 4.5/10
**Justification:** RC-9 correctly states that the study “does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”  
**Biggest remaining risk:** Synthetic-installation consistency and conditional mismatch bounds could nevertheless be presented as evidence of real hospital billing-policy correctness.

## 1. Disposition of v11 findings

### A. Narrow repairs supported by the reported contrasts

These deserve credit **only at the scope actually demonstrated**:

| Finding | Supported closure | What remains unproven |
|---|---|---|
| **A28′ judge ignored the restore result** | The supplied account describes the old judge ignoring the altered result string and the new judge requiring `restored`, alongside the before-image check and NC-only compensation. | This is a **judge-contract repair**, not an experiment in which an actual failed restoration was masked: before/after hashes remained identical. |
| **E2/R2 confounded hash comparison** | Both hash arms now receive the same drift hook, giving the reported contrast a properly isolated intervention. | The intervention updates **all billing rows for the encounter**, not one row, and does not assert affected-row count. |

These are the clearest contrasts described in the supplied material; the excerpts themselves do not include the underlying byte identities and complete assertion logs.

### B. Substantive repairs reported, but strict old/new closure is not fully established here

These are **more than unsupported promises**, but should not be promoted to your strongest verification category without the paired evidence:

- **Comparator circularity / ledger-independent resolution:** The oracle assessment explicitly credits the repair. The supplied excerpts do not expose the complete asserted old/new control, and this repair does not establish form-side code provenance.
- **E1/R1 missing-evidence handling:** Code and extracted-function tests establish ERROR behavior; they do not demonstrate evidence deletion through a complete NC-runner execution.
- **NC2/NC5 failure specificity:** Requiring specific failure evidence is a substantive gate improvement; complete paired runner evidence is not supplied.
- **E4/R4–R5 snapshot checks:** Missing-snapshot refusal is demonstrated and stage inventory is specification-derived, but the excerpt does not establish the full old/new assertion pair.
- **R6 exact-1 activation:** Runtime evidence covers the backup switch; other edited sites have code-inspection coverage rather than equivalent runtime demonstrations.
- **R7–R8 recovery guards:** Holder liveness, `{}` rejection, and missing-grant checks improve recovery, but do not demonstrate the before-revoke crash boundary.
- **Ledger pin enforcement and explicit NC fixture selection:** Reported fixed, but the excerpts do not provide paired old/new assertions.
- **Doubled-count bug:** The P15 diff reportedly fixes it; the handoff still says otherwise, and an asserted regression contrast is not supplied.

### C. Merely claimed, overstated, or not verifiable from the supplied record

- **P16 trace-clean closure:** “See the commit” is not embedded trace-clean evidence.
- **P14 release/D8 closure:** Still unevidenced, although now acknowledged.
- **“Snapshots written by this run”:** `mtime >= suite_start` establishes neither authorship nor run identity.
- **“1,100 tables”:** The displayed number is the overwritten row count, not the table-count check’s result.
- **“Quantity compared for every component”:** Registration quantity is synthesized; its control mutates the ledger rather than billing `jumlah`.
- **General cleanup safety or independent reproducibility:** Neither follows from the supplied local controls.

### D. Still open

- **C3:** Actual form-side charge-code identity.
- **X2:** Independently implemented preservation verification.
- Expected-mode **unit-price and cardinality** checks.
- A31′ propagation of a false `stage_restore()` result.
- Mandatory XML-restoration success and confirmed writer termination.
- Consistent ownership discipline, including unchecked P13 CREATE and unsafe test-helper setup.
- Exact grant restoration and comprehensive effective-privilege coverage.
- Before-revoke/publication-boundary fault experiments and broader recovery authority.
- Independent clean-box reconstruction and durable publication.
- Repair or retirement of original P13 positive summaries; rerunning 300 does not validate the historical claims.
- External clinical/financial adjudication.

## 2. New problems introduced or exposed by P15–P16

The excerpts do not establish when every defect originated, so these are **newly introduced or newly exposed**, not all demonstrably new regressions.

1. **Reporting-variable corruption:** `a` is reused, turning a row count into the headline table count.
2. **A safety tester with unsafe setup:** Unconditional `DROP DATABASE IF EXISTS` and global `pgrep ... | head -1` lack the ownership discipline expected of the drivers.
3. **Registration-control mismatch:** Ledger-side quantity mutation does not test whether billing-side registration quantity is observed.
4. **Freshness mistaken for provenance:** Global snapshot filenames plus a lower timestamp bound allow another run’s newer artifacts to qualify.
5. **Restore-result simulation overstated as restore failure:** A28′ tests acceptance of a result string, not actual failed recovery.
6. **Incomplete mutation specification:** The drift hook affects every encounter billing row without asserting mutation cardinality.
7. **Documentation/release divergence:** The handoff retains v10/P13 guidance, EQUAL-CTX, obsolete bug status, and P14 release language despite later corrections.

## 3. Top three remaining issues

1. **Financial identity remains unobservable.** Capture form-side codes independently and compare quantity, unit price, amount, adjustments, and required cardinality; otherwise same-name/same-price wrong-code use can pass.
2. **Success and cleanup contracts remain porous.** Require confirmed writer death, mandatory XML restoration, propagated restore failures, and ownership-safe setup/teardown.
3. **Evidence is not independently reconstructible or durably available.** Preserve historical bytes and publish one effective, machine-readable release inventory with a tested provisioning path.

## 4. Top three strongest properties to lead with

1. **Real application execution:** Actual outpatient-form rebilling with audited fresh saves, rather than ledger-only reconciliation.
2. **Layered consistency evidence:** Full-cohort consumer reconciliation, retained baselines, stronger per-code financial comparisons, and targeted mutations.
3. **Explicit characterization and scope:** Authored fixtures report expected disagreements rather than hiding them, and RC-9 clearly limits generalization.

Lead with **measured consistency on one pinned synthetic installation**, not independent financial truth or population-wide correctness.

## 5. Overall score and trajectory

\[
\operatorname{round}\left(\frac{7.5+7+8+7+8.5+4.5}{6}\times10\right)
=\boxed{71/100}
\]

| Prior overall score | Delta |
|---:|---:|
| 35 | **+36** |
| 43 — both assessments | **+28** |
| 52 | **+19** |
| 58 | **+13** |
| 60 | **+11** |
| 62 | **+9** |
| 63 | **+8** |
| 66 | **+5** |

**Trajectory:** 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66 → **71**.

The gain over v11 is earned primarily by better gate behavior and a less circular comparator. External validity has not materially advanced.

## 6. Verdict

**Needs targeted rework.**

The work supports a credible, narrowly scoped consistency study, but the current measurement, acceptance paths, and release evidence do not yet justify submission readiness.

## 7. Single most important next step

**Complete the existing 300-encounter experiment with independently captured form-side charge-code provenance.**

Instrument the form model or save path, assert a specified line representation, and inject a **same-name/same-price wrong form-side code**: the baseline must pass and that mutation must fail, with pinned bytes and retained assertions. Do not substitute a larger sample.

**Before running it**, make writer termination and XML restoration mandatory safety conditions; **archive the existing artifacts immediately**, independently of the next experimental wave.

## RAW MERGED RESPONSE

## CLAIM-HONESTY

**Overall: 71/100 — Needs targeted rework.** P15–P16 genuinely improve the benchmark. The central v11 circularity is removed, and several previously destructive or permissive paths now have useful controls. But “all findings fixed with old/new controls” is still too strong.

This is an assessment of the **embedded source and recorded runs**, not an independent execution or verification of files supplied only by hash.

### The independent review was necessary—and largely correct

P15’s **23/24 self-score was not defensible**. The reviewer identified substantive defects, not presentation preferences:

- Preservation refusal still revoked a grant it had not created.
- B5’s unquoted timestamp tested midnight, not the run start.
- Pre-run INSERTs were ignored.
- NULL payments became zero.
- A28′ printed but did not assert the restore result.
- Suite-level switch handling reactivated faults for `=0`.
- B6 plants lacked exact counts.
- Process-group cleanup lacked identity safeguards.
- Several evidence and document claims were unsupported.

P16 answers most of those **narrowly and concretely**. Particularly good corrections are the withdrawal of the supposed P15-start lock evidence, the admission that P14 release remains unevidenced, and the explicit limitation of A5/A6 to wiring tests.

The recorded first-chain failures are also handled correctly:

> `P15-LINE-NC: PASS=32 FAIL=1`

followed by a disclosed one-line test-script repair and:

> `P15-LINE-NC: PASS=33 FAIL=0`

That is honest experimental reporting. The earlier P15 ImportError and nondiscriminating NC1 are likewise retained rather than quietly replaced.

### P16 still overstates several things

**1. “Old bytes versus new bytes for each N1–N8” is false as a blanket description.**

Explicit paired evidence exists for preservation refusal, stale INSERT acceptance, restore-result assertion, and zero-valued switch activation. But:

- NULL-payment controls demonstrate the **new** comparators’ exit 2; no corresponding old-byte run is shown.
- B6’s new exact-count assertions are demonstrated, but there is no defective-plant experiment distinguishing the old `>=1` judge from the new judge.
- N8 is supported by current library-test results; the embedded evidence does not show an old/new execution pair for every process-identity case.

These are useful tests. They are not all paired regression demonstrations.

**2. The clone table-count claim is wrong.**

The report says 1,100 tables, echoing:

> `clone matches sik: tables=1100-equal`

But `p15_clone_matches_sik` overwrites `a` in its row-count loop and finally prints:

```bash
echo "clone matches sik: tables=$a-equal, 6 key tables row-equal"
```

At that point, `a` is the **detail_nota_jalan row count**, which the transcript separately reports as 1,100. The table-count equality check exists; the reported numerical table count is not its result.

**3. “Quantity compared for every component” is misleading.**

Registration quantity is synthesized:

```python
f["qty"] += Decimal(1) if c == "registration" else jml
```

The registration control mutates the **ledger** quantity, not the billing row’s `jumlah`. More on this below.

**4. “Snapshots written by this run” exceeds the binding check.**

The check establishes only `mtime >= suite_start`. It does not establish authorship, run identity, or an upper bound. A newer snapshot from another run satisfies it.

**5. The A28′ control does not demonstrate an actual failed restore being masked.**

It changes the printed result after the real restore operation. The transcript shows identical before/after hashes. It proves that the old judge ignored the result string and the new judge requires it. Calling that an executed failed-restore experiment overstates the intervention.

**6. The handoff remains internally stale.**

Its “current state” still leads with v10/P13, retains EQUAL-CTX, says the doubled-count bug remains unfixed although the P15 diff fixes it, and retains P14 “28/28” and “released” language. Later appended corrections do not make the earlier operational instructions reliable.

The P16 retrace claim again says “see the commit”; the actual trace-clean output is not embedded. I cannot verify that closure.

### Statistical claims

For zero mismatches in 300 encounters:

\[
U_{\text{one-sided}}=1-0.05^{1/300}=0.9936\%
\]

\[
U_{\text{two-sided upper}}=1-0.025^{1/300}=1.2221\%
\]

The stated **0.99% and 1.22% are correct**, conditional on the sampling/model assumptions. They are encounter-level bounds on **detectable mismatches**, not bounds on wrong-code use invisible to this comparator.

The fixture’s 27/27 means **27 expected outcomes matched**, including 12 DIFFER verdicts and 24 differing per-code entries. It does not mean 27 financial-equivalence passes or 27 oracle exit-zero results.

**Score: 7.5/10** — materially more honest, but the documentation still converts narrow checks into broader guarantees.

## GATE-CORRECTNESS

The important advance is real: the gate is no longer plainly circular, and expected mode now checks payment and model agreement. The remaining defects are sufficiently concrete that I would not approve the acceptance machinery unchanged.

### Disposition of the v11 safety and acceptance findings

| Findings | Current disposition |
|---|---|
| **S1–S2: destructive refusal/global cleanup** | **Narrowly fixed and paired-demonstrated** for P13/P14 refusal and, in P16, preservation refusal. General cleanup safety remains incomplete. |
| **S3: missing pipefail** | Fixed in P13/P14; producer failure demonstrated on current P14. No old-arm producer-failure run is embedded. |
| **S4: truncated stop percentage** | Fixed and unit-demonstrated: `bad*100 > 2*total`. |
| **S5: unexpected exits accepted** | Exit-decision logic fixed; wiring demonstrated. Full injected driver failure remains untested. |
| **S6: non-failing pin mismatch** | Pin checker and driver branch fixed; mutation plus separate wiring evidence. Not a full driver mutation run. |
| **S7: vacuous grant probe** | Fixed, with a genuine positive case and the old probe returning zero on the same grant. |
| **G1/G7: ledger-conditioned identity/missing collision control** | **Fixed for the named hole**, with explicit old/new C2 evidence. |
| **G2: expected-mode acceptance omissions** | Payment and quantity/amount model gates fixed and demonstrated; model scope remains incomplete. |
| **G3: duplicate ledger keys** | Explicit rejection demonstrated on a scratch table without its PK. Defensive hardening; production PK already prevented this case. |
| **G4: aggregation/registration quantities** | **Still partial.** Multiplicity is reported, not enforced; registration `jumlah` is ignored. |
| **G5/G6/G9: empty, duplicate, NULL inputs** | Demonstrated for the named P15 inputs and NULL payments in both comparators. Not complete numeric hardening across P13/P12. |
| **G8: fresh-B** | Stronger rule implemented and boundary-tested, with remaining attribution/cardinality gaps. |
| **G10: absent A and C coverage** | Fixed in P12 and explicitly paired-demonstrated by B6. |

### The controls discriminate—but only within their actual interventions

- **A1/A2:** Strong controls. Old P13 produces `sentinel=0`; old P14 produces `grant=0 dummy=dead`; new drivers preserve `sentinel=1 grant=4 dummy=alive`. P16 separately closes the preservation refusal’s grant revocation.
- **A3:** The failing dump produces a partial table and exit 2; current P14 exits 3 and removes its half-clone. This tests pipeline propagation rather than merely grepping for `pipefail`.
- **A4:** Correct arithmetic. \(7/300=2.333\%\), so `700 > 600` fires; the old integer division returned 2 and did not.
- **A5/A6:** Useful composition evidence, not E2E failure evidence. In fact, `tailrc()` directly assigns `FIX_RC` and `REAL_RC`; it does **not** execute a stubbed `oracle_run`. It tests the final decision tail. The pin test checks “no CONTINUED,” `KEEP=1`, and an abort message, but does not explicitly assert exit 3.
- **B1a:** Payment −1 produces MISMATCH.
- **B1b:** Changed quantity/unit with unchanged amount produces `form_model=DIFF`. This establishes the quantity/amount model gate, not complete unit-price validation.
- **B2/B4:** Duplicate ledger key, empty list, duplicate list, NULL billing total and NULL payment all reach the stated exit-2 paths.
- **B3:** Ledger registration quantity 2 fails. It does not test form-side registration quantity.
- **B5a–d:** Extra-account INSERT, stale-only timestamp, additional pre-run INSERT, and exact-start inclusion are meaningfully distinguished. B5c’s old MATCH/new MISMATCH is particularly useful.
- **C2:** Strong and targeted: old `EQUAL-CTX/MATCH`, new `DIFFER/MISMATCH`, on the same wrong ledger code.
- **B6:** Strong corrected control: exactly 18 billing and 5 ledger rows deleted; old ALL-EQUAL, new DIFFERENCES with two coverage records.

### New or residual acceptance defects

**Registration quantity remains invisible.**

```python
f["qty"] += Decimal(1) if c == "registration" else jml
```

A billing registration row changing `jumlah=1` to `jumlah=2`, with total unchanged, leaves the inferred quantity unchanged. The B3 plant avoids this blind spot by changing the ledger instead.

**Expected-mode unit-price defects can still pass.**

Predicted models contain only quantity and amount:

```python
obs_form = {...: [fmt(f["qty"]), fmt(f["amt"])] ...}
```

For fixtures with expected deltas, acceptance only requires the line verdict to remain DIFFER. Changing a unit price alone while retaining quantity and total can therefore leave:

- the expected component delta unchanged;
- both models MATCH;
- the already-DIFFER verdict unchanged;
- payment/freshness unchanged.

That is a concrete false-pass class. The fixture model needs unit prices and relevant adjustments, or an exact expected-difference specification.

**Cardinality is not complete.**

The visit list must be nonempty and unique, but it is not checked against an authoritative expected encounter set. A valid subset of the 27 manifest visits can pass. `B_rows` is recorded but never gated. Neither nonempty form/ledger coverage nor registration existence is universally required in equal mode.

Thus B6 closes the P12 `{}`/`{}` hole; it does not establish complete coverage in every comparator.

**Fresh-B is right for this fresh-clone experiment, not a general provenance proof.**

Current acceptance:

```python
fb[0] == 1 and fb[1] == 1 and fb[2] == 1
```

correctly implements exactly one recorded INSERT, by `benchmark@`, at/after start. But it lacks:

- a run-end bound;
- connection/run identity;
- rejection of subsequent UPDATE/DELETE activity;
- an assertion of the current payment-row cardinality.

P13 also permits omitting `--since`, making `win = "1"`. Its CLI can still label an undated historical INSERT “fresh.” Require a timestamp for freshness, as P15 does.

**Cleanup is safer, not proven safe.**

The PID guard accepts:

```bash
[ "$st" -le $((fm + 1)) ]
```

That is not “started no later than the PID file.” Same-second/next-second reuse can pass; PID identity can also change between checking and signalling. TERM is sent without waiting for confirmed death. Retargeting or teardown can follow while a writer remains alive.

P13 additionally sets `CREATED=1` after an **unchecked** CREATE DATABASE command. Under a race or creation failure it can claim ownership it never established. The advisory lock does not exclude manual writers.

P14’s successful exit ignores XML restore failure:

```bash
$DBXML restore ... && RETARGETED=0
res "database.xml restored"
```

The decision tail can still exit zero. Its wiring test uses `DBXML=true`, so cannot catch this.

### Recovery checks

- **E1/R1:** Missing evidence now yields ERROR in `nc_status_e`; the extracted-function tests demonstrate that. They do not delete evidence during a complete NC-runner execution. NC2/NC5 now require specific failure evidence, which is a substantive improvement.
- **E2/R2:** Both hash arms now receive the same drift hook; the contrast is properly isolated. However, the SQL updates **all billing rows for the encounter**, not “one row,” and does not assert affected rows.
- **E3/R3:** A28′ now requires `R28 = restored`, confines compensation to the NC arm, and checks the before-image hash. Good. A31′ still does not propagate a false `stage_restore()` result into its verdict.
- **E4/R4–R5:** Missing snapshot refusal is demonstrated; expected stage inventory now derives from specification. Timestamp freshness is still not run binding.
- **R6:** Exact-1 activation is fixed at the shown layers; runtime evidence directly covers the backup switch, with code inspection covering the other edited sites.
- **R7–R8:** Holder liveness, `{}` rejection and missing-grant checks improve recovery. But `set(privs) - set(back)` verifies inclusion, not exact restored-grant equality. Override recovery can issue grants before a readable marker is subsequently validated. No actual before-revoke crash-boundary experiment is supplied.

Finally, the new safety-control script itself starts setup with unconditional `DROP DATABASE IF EXISTS` and selects a dummy using global `pgrep ... | head -1`. **The safety tester needs the ownership discipline it demands from the drivers.**

**Score: 7/10** — major named holes closed; several acceptance and cleanup false-pass paths remain.

## ORACLE-VALIDITY

### EQUAL-SRC removes circular selection—not uncertainty about the form’s code

The crucial change is:

```python
insrc = sorted(k for k in cand if k in S.get(c, set()))
```

`S` comes from `rawat_jl_dr` and `detail_pemberian_obat`, not the expected ledger. That closes the v11 mechanism where the expected answer selected the alleged actual answer.

C2 demonstrates this rather than merely asserting it:

> Old: `verdict=EQUAL-CTX ... outcome=MATCH`  
> New: `verdict=DIFFER ... outcome=MISMATCH`

The independent reviewer also checked the collision’s preconditions: J000840 and J000844 share the display name and price, while the source row identifies J000840. This is good adversarial design.

However, C2 changes the **ledger**, not the form’s actual code choice. It demonstrates that a source-disagreeing expected code no longer gets laundered into the observed result. It does not demonstrate detection of a form using the wrong colliding code.

The stated C3 limitation is therefore essential and accurate:

> “The 119 EQUAL-SRC encounters agree with their own source rows; that is not an independent observation of the code the form used.”

For globally unique names, EQUAL is stronger identification under the lookup assumptions. It still relies on the display-name mapping being faithful and on the form output containing enough information to identify the intended charge.

### What the reruns establish

The P16 real run has a coherent evidence chain:

- 300 requested encounters;
- 300 distinct successful form executions;
- oracle exit 0;
- 300 comparator passes;
- 300 payment equalities;
- 300 fresh-B successes;
- 181 EQUAL and 119 EQUAL-SRC;
- zero differing entries among 1,240 compared entries.

The arithmetic is consistent:

\[
181+119=300,\qquad 119/300=39.67\%
\]

But **1,240 “lines” are aggregated per-encounter/component/code comparison entries**, not necessarily 1,240 original billing rows. The implementation unions keys and aggregates quantities and amounts; it does not compare a row multiset.

For the fixture:

\[
12\ \text{DIFFER}+12\ \text{EQUAL}+3\ \text{EQUAL-SRC}=27
\]

These 27 expected outcomes are useful evidence of characterized behavior, including known disagreement. The fixture oracle’s exit 4 is explicitly expected; it must not be promoted to an oracle-equivalence pass.

This substantially addresses v11’s concern about the weaker comparator standing in for the oracle: the comparator is stronger now and its expected-mode interpretation is clearer. It does not erase the distinction.

### Ranked residual oracle risks

**1. Unobserved form-side charge-code identity.**

This is the largest financial-oracle gap. Source rows and the ledger can agree while the form uses another code with the same rendered name and price. More samples cannot expose information the measurement does not collect.

**2. Shared-source and shared-model errors.**

The ledger, source-row resolver and authored fixture predictions share assumptions and mappings. Agreement is good evidence of implementation consistency, not independent hospital-policy correctness.

The expected-mode model also omits unit prices and row multiplicity. That is a gate weakness and an oracle-resolution weakness.

**3. X2: preservation checks share the oracle implementation.**

The supposed independent hash path imports the oracle module. Recomputing a hash in another process is not an independently implemented verification of the serialized state or table inventory. A shared omission can make both sides agree.

Specification-derived stage inventory is better than deriving expectations from the observation, but using the oracle’s own `RESET_TABLES` cannot detect a table the specification itself wrongly excludes.

**4. Incomplete recovery-state authority.**

A11’s operation inventory, inner restore order, comprehensive privilege sources, publication-boundary faults and general power-loss durability remain open. Atomic rename and unit-tested marker decisions are not a general restoration oracle.

### Fitness for use

The oracle is now **fit for a scoped consistency claim on the measured installation and selected encounters**. It is not fit to certify actual charge-code correctness under name collisions, independent preservation completeness, or hospital billing-policy correctness.

The v11 strongest properties remain valid and stronger: actual form execution, audited saves, retained consumer baselines and targeted financial mutations. The distinction between “different implementation” and “independent financial truth” must remain explicit.

**Score: 8/10** — the circularity fix earns credit; C3 and X2 still cap the claim.

## REPRODUCIBILITY

P16 improves **local repeatability and evidence attribution**. It does not establish independent reproducibility.

### What is genuinely stronger

**Frozen-current-byte discipline is better evidenced.**

The record now contains:

> `frozen P16: 21/21 OK`  
> `lsattr i-flag: 21/21`

and after the test-script repair:

> `frozen P16 (b): 22/22 OK; lsattr i-flag: 22`

The pre-unfreeze transcript shows the P15 set carrying `i` flags. This supplies the observation missing from the P15 review.

Do not overinterpret it: seeing P15 files immutable at 14:02 does not retroactively prove they were immutable throughout the earlier P15 execution. Historical hash checks support byte consistency at their recorded endpoints; later `lsattr` proves later attribute state.

**The partial rerun after P16 fix 1 is legitimate.**

The manifest amendment says only `p15_line_negctl.sh` changed, with `p16_chain_b.sh` added. Consequently, unchanged comparator, driver, oracle and recovery-suite evidence from chain A need not be discarded. Rebuilding the fixture and rerunning the affected line controls is a reasonable dependency-scoped rerun.

It would be wrong to say every result was obtained in one flawless run of manifest b. The report generally avoids that.

**Lock evidence is now properly bounded.**

P16 records:

> `RUNLOCK-FREE` before acquisition

and:

> `RUNLOCK-RELEASED`  
> `RUNLOCK-FREE`

afterward. That establishes the reported P16 endpoints. It does not establish P14 release, and P16 correctly withdraws that inference.

**The builder pin now gates execution.**

Repeated fresh clones reproduce:

> `356355:a66a3a54... REPRODUCES-PIN`

This is stronger than the v11 print-only check. A mutated copy fails the checker, and the driver’s pin branch is wiring-tested.

**Positive summaries are retained for the rerun.**

The 300-encounter denominator, verdict distribution, payment equality and freshness counts are now saved in machine-readable summaries, with per-encounter output supported by the source. This closes the missing-positive-summary problem for the **new 300 run**, not retrospectively for all original P13 stages.

### Ranked third-party blockers

**1. No complete, durable, independently obtainable reconstruction bundle.**

The manifest itself now admits:

> “The pins identify the bytes; they do not supply the Khanza tree, the DB dumps or the secrets.”

Correct. A hash identifies an artifact; it does not distribute it. The unpushed commits and `.bak_*` directories on the sole VPS remain availability risks. Old/new controls are not independently reproducible if the old bytes disappear.

The planned box expiry around November 20 makes this operationally urgent.

**2. No independently operated clean-box rebuild.**

No third party has demonstrated provisioning the runtime, loading the required database state, rebuilding the ledger and reproducing the gates without relying on the existing installation.

The report’s broad “deterministic and reproducible” banner therefore still needs a qualifier: **repeatable on the existing installation**.

**3. External state and dependencies remain incompletely closed.**

Jar, source tree, schema, fixture seed dump, database content, SQL mode and operational credentials are not interchangeable dependencies. A jar plus schema alone is insufficient for these numerical results.

Secrets need not be published. Their required roles, privileges and provisioning procedure do need to be reproducible.

The relaxed SQL-mode workaround remains installation knowledge, not demonstrated portability.

**4. Evidence binding remains weaker than the strongest wording.**

The preservation snapshots retain global filenames. Checking their timestamps against an evidence filename is not cryptographic or structural run binding.

Similarly:

- matching six table row counts is not clone content equality;
- matching live row counts and one ledger hash is not all-live-state equality;
- the grant-line hash covers the printed grant surface, not every possible effective privilege source.

**5. The release manifest is an accretion, not a clean release specification.**

Supersession rules are present, which is good. But multiple historical pin rows, stale component descriptions and locally held artifacts make selecting the effective dependency set unnecessarily error-prone. Produce one machine-readable current release inventory alongside the history.

### v11 reproducibility disposition

- **D1/D2 overclaims:** substantially corrected.
- **D8 P14 release:** still unevidenced, honestly acknowledged.
- **Ledger pin enforcement:** fixed.
- **NC fixture selection by `ls | head`:** replaced with an explicit pinned input.
- **Independent rebuild/durable publication:** still open.
- **P13 original positive summaries:** not repaired by rerunning only 300.

**Score: 7/10** — improved local reproducibility evidence, still no independent reconstruction.

## E2E-DESIGN

This is now a reasonably strong **controlled integration experiment**, but its evidence levels must not be collapsed into one “E2E passed” headline.

### The layers are useful and distinct

1. **Full-cohort A–C reconciliation:** consumer settlement versus the DR reference ledger.
2. **3,330 sampled real-form re-bills:** wider encounter-level consistency evidence under the historical P13 machinery.
3. **300 rerun encounters:** current per-code financial comparison, stricter payment/model/freshness handling and saved positive summaries.
4. **27 authored edge encounters:** directed tests of known financial behavior and discrepancies.
5. **Mutation and recovery controls:** evidence that named checks can reject named failures.

These are complementary. None substitutes for the others.

The denominator arithmetic can be reconciled:

\[
86{,}676-86{,}455=221
\]

matching the reported non-DR registration bridge, and:

\[
86{,}455-86{,}101=354
\]

matching the stated Stage-A seed difference. But:

\[
86{,}455-85{,}387=1{,}068
\]

encounters lie outside the P13 eligible sampling denominator. Every headline should identify which population it describes.

The sampled coverage is:

\[
3{,}330/85{,}387=3.900\%
\]

The current source-resolved line experiment covers only:

\[
300/85{,}387=0.351\%
\]

or about 9.01% of the 3,330 sampled re-bills. **The other 3,030 do not inherit the current comparator’s guarantees merely because the tool was subsequently repaired.**

### Freshness is a genuine design improvement—with a narrow contract

Exactly one total audit INSERT is defensible here because the experiment uses a fresh audit context and selects visits intended to receive a fresh form save. B5c proves the code does not silently ignore prior recorded INSERTs, and B5d checks the inclusive boundary.

It is not a universal billing correctness rule. Legitimate retries or multiple payments may produce several INSERTs. A proper generalization would use run/connection attribution and a domain-appropriate payment cardinality contract, not weaken the benchmark rule whenever it becomes inconvenient.

Within this experiment, also distinguish:

- “one recorded INSERT”;
- “one current payment row”;
- “the final payment value came from this form invocation.”

The current gate establishes the first more directly than the latter two.

### The safety prerequisite is substantially, not universally, satisfied

The v11 demand to fix destructive refusal before rerunning was followed for the P13/P14 drivers. Their paired controls precede the C4 run. P16 then repairs the preservation-check omission.

That is a legitimate closure of the immediate prerequisite. It is not general cleanup certification:

- no confirmed-dead writer barrier follows TERM;
- XML restore failure does not necessarily fail the driver;
- ownership and refusal safety are inconsistent across test helpers;
- the lock remains advisory;
- the full stop-rule failure has not been injected through the driver.

The process is now safer to operate, but “every validation before cleanup” and “cleanup only undoes this run” remain broader than the implementation.

### Fair E2E claim

A defensible statement is:

> On one pinned synthetic Khanza installation, full-cohort consumer totals reconcile to the DR ledger; selected encounters were re-billed through the real outpatient form; a 300-encounter rerun matched per-code aggregated financial values using source-resolved names and audited fresh saves; and 27 authored edge cases matched their specified outcomes, including expected disagreements.

Do not replace that with “charge-code correctness demonstrated” or “all 86,455 encounters independently verified through the form.”

### Top three remaining issues

1. **Observable financial identity:** C3 is still absent, and expected-mode unit/cardinality checks remain incomplete.
2. **End-to-end failure and cleanup acceptance:** the driver can report success despite restoration problems, while process termination is not verified.
3. **Independent reconstruction and durable artifacts:** the only installation remains a single point of evidence loss.

### Single most important next step

**Complete the existing 300-encounter experiment with form-side charge-code provenance—not a larger sample.**

Capture identifiers from the form model or save-path instrumentation independently of the ledger and source-row resolver. Compare a specified line representation including quantity, unit price, amount, adjustments and required cardinality. Inject a same-name/same-price **wrong form-side code**, then require that exact mutation to fail while the baseline passes.

Before executing it, close the identified cleanup-success paths: confirmed writer termination and a mandatory XML-restored assertion. Separately, archive the current inputs immediately; that should not wait for the next experimental wave.

This completes the intent of the v11 next step. P15–P16 completed its ledger-independent-resolution portion, not the full “actual charge identifiers” requirement.

**Score: 8.5/10** — strong layered integration design; the weakest leg remains the measurement of actual form-side identity.

## EXTERNAL-VALIDITY

P15–P16 improve internal validity. They add essentially no external validity.

### What is—and is not—covered

The benchmark remains:

- one Khanza application configuration;
- one MySQL configuration;
- outpatient only;
- a synthetic DR cohort;
- authored edge cases;
- an uncalibrated clinical and payer distribution.

C1–C4 remain untested. The 27 fixtures exercise behaviors that ordinary synthetic encounters may never reach, which is valuable. They do not estimate how frequently those behaviors occur in hospitals or whether the benchmark’s expected rules are the correct rules there.

The report’s own discovery illustrates the limitation: every DR visit has exactly one procedure, no embalase/tuslah, and the same registration-fee structure. That regularity makes agreement easier and suppresses interactions common in less constrained data.

The reported drug revenue share of approximately 82.7%, absent payer-mix exercise and uncalibrated diagnoses remain material external-validity gaps.

### The top external risk

**Shared synthetic assumptions can make all implementations agree on behavior that is wrong for real hospital billing policy.**

DR tariff authority is a legitimate benchmark reference. It is not independent evidence of:

- payer-specific contractual rates;
- exemptions and discounts;
- registration eligibility;
- packaging or service fees;
- cancellation and correction workflows;
- actual clinical utilization.

The known ledger gaps—fractional quantities, embalase/tuslah and DR-owned fees where Khanza bills zero—are particularly important. Reporting those discrepancies is honest. Treating them as “expected” in fixtures does not resolve which behavior is operationally correct.

### Statistical scope must remain narrow

The 300-encounter bounds are mathematically correct under the stated assumptions, but they cannot support general hospital accuracy. They also exclude error classes the comparator cannot observe.

Likewise, for 3,330 zero-mismatch encounters:

\[
1-0.05^{1/3330}\approx0.0899\%
\]

and the two-sided upper endpoint is approximately 0.1107%. Those are conditional binomial bounds, not population guarantees established by this study.

Neither repeated execution of the same 300 visits nor repeated zero results expands the independent encounter sample size.

The billing scope bridge is arithmetically sound:

\[
34{,}895{,}128{,}580-34{,}870{,}243{,}633
=24{,}884{,}947
\]

But reconciling the 221 non-DR registrations explains a benchmark scope difference; it does not validate real-world billing policy.

### Scoping honesty

The RC-9 paper-safe statement is appropriate and should lead any publication:

> “...does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products.”

That limitation is stronger and more useful than the broad “PASS” banners elsewhere. Keep it attached to every summary of the result.

An external-validity next step would require independently adjudicated, appropriately governed hospital cases spanning payer and financial workflows—not simply a second synthetic installation. A second installation would first strengthen portability.

### Final score and trajectory

| Criterion | v11 | v12 | Change |
|---|---:|---:|---:|
| Claim-honesty | 7 | 7.5 | +0.5 |
| Gate-correctness | 6 | 7 | +1 |
| Oracle-validity | 7.5 | 8 | +0.5 |
| Reproducibility | 6.5 | 7 | +0.5 |
| E2E-design | 8 | 8.5 | +0.5 |
| External-validity | 4.5 | 4.5 | 0 |

\[
\operatorname{round}\left(
\frac{7.5+7+8+7+8.5+4.5}{6}\times10
\right)
=\operatorname{round}(70.83)=\boxed{71/100}
\]

**Trajectory:** 35 → 43 → 43 → 52 → 58 → 60 → 62 → 63 → 66 → **71**.

**Verdict: Needs targeted rework.** The gain is earned: the central circular comparator and several dangerous refusal paths have been repaired with real evidence. The next gain requires better observation and stronger failure contracts—not another wave of reassuring pass counts.

**Score: 4.5/10** — appropriately scoped, but still externally unvalidated.
