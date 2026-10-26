# R5-P15 Task: driver safety, acceptance predicates, discriminating line identity

Written 2026-10-26 BEFORE execution, per task-before-hands. Nothing in this wave has been run or changed.
Source: Astra v11 (`evidence/astra_v11_5496287_output.md`, run 5496287, **66/100** "Needs targeted
rework"). Every v11 finding below was checked against the current source **before** this doc was
written (§1). The verdict column records what the code actually does, not what v11 said.

**Order (owner instruction):** safety fixes first (§2 A), then the line-identity rework and its
rerun (§2 C). The gate fixes (§2 B) go in before the rerun because the rerun depends on them. The
recovery-check repairs (§2 E) and the document corrections (§2 D) come last. D needs no box.

**Out of scope:**
- the clean-box rebuild (still blocked: no third home);
- the P14 ledger scope gaps (fractional `jml`, embalase/tuslah, DR-own fees), which stay owner
  decisions;
- external validity C1–C4;
- any Khanza jar/source edit;
- any live write.

## 0. Hard rules (unchanged from P14)

- No paid model runs (no Kaggle push/run without the owner); no git push without the owner.
- Live `sik`/`sik_bench` are read-only. The ledger pin `356355:a66a3a546cc322…` must hold at the
  start and in the final proof.
- **Frozen tools are edited only by the unfreeze/re-freeze procedure:**
  - `chattr -i`;
  - keep the originals in `.bak_p15_*`;
  - deploy LF bytes;
  - check local = box;
  - `chattr +i`;
  - write a new manifest;
  - re-pin `khanza_r5_release_manifest.md`.

  Evidence is valid only for the bytes it names.
- The run lock is mandatory for every driver run (`P15-<agent>-<date>`).
- No secrets in committed files. No sub-agents. One working tree per session.
- Every number comes from a named file, with the line quoted.
- A first attempt that is invalid is kept and recorded, never deleted.

## 1. Verification of the v11 findings (2026-10-26, source read)

Verdicts:
- **C** = confirmed in the code.
- **P** = partly true (the qualifier says what holds and what does not).
- **N** = not confirmed.

| ID | v11 finding | Where (current bytes) | Verdict | P15 action |
|---|---|---|---|---|
| S1 | Existing-clone refusal drops the clone | `p13_wide_sample.sh` cleanup l.29–40: the `else` branch runs `DROP DATABASE` when `BUILT=0`; the refusal is at l.55, after `trap` (l.47) | **C for P13**, **N for P14** (`p14_edge_run.sh` drops only when `BUILT=1`) | A1 |
| S2 | Cleanup runs before validation and is not run-scoped (xml restore, `pkill`, REVOKE on a clone another run may hold) | P13 l.34, P14 l.46 (`pkill -f`); P14 `trap` l.59 before the xml/clone checks l.73–77; `p10_preservation_check.sh` `trap` l.67 with no lock check | **C** | A2 |
| S3 | `mysqldump \| mysql` without `pipefail` | P13, P14 (no `pipefail` anywhere in the drivers) | **C** | A3 |
| S4 | Stop rule uses integer division (2.9 % → 2, not > 2) | P13 l.125–127, P14 l.183 | **C** | A4 |
| S5 | P14 accepts the stop function's return 1 as an allowed fixture result; real-run failures are not propagated; the driver exits 0 | P14 l.193 (`case 0\|1\|4`), l.205 `exit 0` | **C** | A5 |
| S6 | P14 ledger pin check prints `DIFFERS-FROM-PIN` but does not fail | P14 l.123 | **C** | A6 |
| S7 | *(new, found during verification)* The P13 kill-test grant probe is vacuous: `grantee='"benchmark"@"localhost"'` never matches (information_schema stores `'benchmark'@'localhost'`), so its "no grant" proves nothing | `p13_kill_test.sh` l.46 | **C** | A7 + D |
| G1 | Line identity resolves name collisions using the **expected** ledger (EQUAL-CTX is circular) | `p14_line_identity.py` l.138–141 | **C** (it was disclosed, but it is still circular) | C1 |
| G2 | `--expect` MATCH ignores payment equality and the predicted form/ledger models | l.196 | **C** | B1 |
| G3 | Ledger duplicate keys are overwritten | l.114 | **P**: the code would overwrite, but `dr_charge_ledger` has `PRIMARY KEY (no_rawat, component, code)`, so a duplicate cannot exist in the table; rejecting one is cheap | B2 |
| G4 | Aggregate per (component, code), not a line multiset; registration/tax qty/unit not compared | l.150–170 | **C** (the design was stated in §2a, but the "line identity" name overstates it) | B3 + D |
| G5 | Empty visit file passes 0/0 | l.234 | **C** | B4 |
| G6 | NULL/empty numerics become 0 | `D()` l.53 | **C** | B4 |
| G7 | No NC for a same-name, same-price collision where the expected code is present | `p14_line_negctl.sh` | **C** | C2 |
| G8 | P13 fresh-B allows other accounts' INSERTs (`bcnt == 1 and cnt >= 1`); no run/time boundary | `p13_sample_compare.py` l.162 | **C** (P14 requires 1/1, but also has no time boundary) | B5 |
| G9 | P13 silently de-duplicates the visit list | `p13_sample_compare.py` l.114 | **C** | B4 |
| G10 | P12 reconciliation prints coverage instead of asserting it; an encounter missing from both A and C agrees as `{}` == `{}` | `p12_perencounter_reconcile.py` l.77 | **P**: coverage is printed, not asserted | B6 |
| R1 | NC runner turns a missing evidence file into PASS; evidence is picked by `ls -t … \| head -1` | `p11_negative_controls.sh` l.61, 72, 75, 112–155 | **C** | E1 |
| R2 | NC4 is confounded: its NC arm adds a live UPDATE and compares stage vs live, so it fails with or without the switch | `p6_acceptance_suite.sh` l.792–836 | **C** | E2 |
| R3 | A28′ subtracts 5 unconditionally after a restore that already removed the +5, ignores `stage_restore()`'s result, and drops stage tables regardless | suite l.733, 773–777 | **C** | E3 |
| R4 | Preservation check re-records a missing pre-op snapshot after the failure and labels it pre-operation | `p10_preservation_check.sh` l.114 | **C** | E4 |
| R5 | Expected stage names come from the post-failure observation | preservation l.127 | **C** | E4 |
| R6 | NC switches use truthiness (`=0` activates the fault) | oracle l.462, 512, 1483, 1593 | **C** | E5 |
| R7 | `_recover_grants_expected` deletes the marker without checking holder liveness and does not compare restored grants to the requested set | oracle l.779–800 | **C** | E6 |
| R8 | Marker publication: no parent-directory fsync; `{}` passes as a valid marker | oracle `_write_marker_atomic` | **P** (no power-loss claim is made; the schema check is real) | E6 |
| D1 | Manifest says "re-derivable without the original live box" | manifest l.9 | **C** (stale overclaim) | D |
| D2 | "DB images are too large to pin by hash" | manifest l.163 | **C** (a 25 MB dump hashes trivially) | D |
| D3 | R5 §12 item 4 still says edge strata NOT TESTED | R5 l.336 | **C** (only the human-gated row was updated in P14) | D |
| D4 | Handoff says "No benchmark grants on sik/sik_bench"; the app account holds DML on `sik` and broad privileges on `sik_bench` | handoff §1 | **C** (stale; it came from the vacuous probe, S7) | D |
| D5 | P14 bound labelled "line-level mismatch rate" with n = 300 encounters | R5 §26.8 | **C** (per-encounter rate) | D |
| D6 | P14 §2a E6 amendment has the wrong sign (A−C is positive) | task doc l.109 | **C** | D |
| D7 | P14 self-score 28/28 not defensible (R3, R4, R6, R9, R11, R14) | task doc §10 | **C** (re-score honestly) | D |
| D8 | P14 final proof shows the lock still held (the release was not captured in evidence) | `live_state_final2.txt` | **C** | D (append the release transcript) |
| D9 | "One held lock" over the P12 chain is imprecise (released and re-acquired for the lock NC) | chain log l.50 | **C** | D |
| X1 | Run lock is advisory; direct suite/helpers/manual SQL bypass it | `dr_runlock.sh` | **C** (already stated as a limit) | A2 adds the guard to the preservation check; no claim change |
| X2 | Independent hashes share the oracle implementation (`import sampled_real_form_diff_r5 as o`) | `p10_hash_state.py` | **C** | not in P15 (P16 candidate) |

**Not in P15 (recorded):**
- X2;
- A11's expected-operation inventory;
- inner restore order;
- comprehensive privilege-source coverage;
- the clean-box rebuild.

## 2. Work packages

### A. Driver safety (first; P13/P14 drivers, preservation check)

| ID | Change | Check | Negative control |
|---|---|---|---|
| A1 | P13 driver: never drop a clone it did not create (`BUILT=1` and created-by-this-run marker); refusal exits before `trap` | Refusal leaves an existing clone untouched | Pre-create `sik_p13w` with a sentinel table; run the driver; exit 3; sentinel still present |
| A2 | All drivers + `p10_preservation_check.sh`: `dr_runlock_require` and all validation **before** `trap`; cleanup only touches objects this run created (track created clone, harness PIDs from this run's process group, grant added by this run) | Cleanup on refusal is a no-op | Second session with an existing clone and a running dummy `BilingHarness`-named process: refusal leaves both alive, grant intact |
| A3 | `set -o pipefail` in every driver; clone validated by table count + row count of 4 key tables vs `sik` | Producer failure fails the clone step | Run the clone step with a mysqldump wrapper that exits 2 mid-stream: driver exits 3, half-clone dropped |
| A4 | Stop rule in integer-safe form: `bad*100 > 2*total` | 3/100 stops, 2/100 does not | Unit test on the shell function with 2/100, 3/100, 7/300 |
| A5 | P14 driver: distinguish expected fixture exit 4 from 1 (mismatch) and stop-rule return; propagate real-run failures; final exit non-zero on any unexpected outcome | Exit code table in the script header | Force the stop rule (inject `sukses=false` lines into a copy of a harness log): driver exits non-zero |
| A6 | Ledger pin mismatch fails the run (exit 3, clone kept for inspection) | `DIFFERS-FROM-PIN` → exit 3 | Alter one non-fixture ledger row on the clone before the check |
| A7 | Every grant probe uses `grantee = "'benchmark'@'localhost'"` (or `LIKE '%benchmark%'`) and is asserted non-vacuous by a positive case (the probe must see the grant the driver itself adds) | Positive and negative case both observed | Probe while the driver's grant exists must report it |

### B. Acceptance predicates (before the rerun)

| ID | Change | Negative control |
|---|---|---|
| B1 | `--expect` PASS requires: component delta = expected **and** line verdict as expected **and** fresh-B **and** B = A_form total **and** `form_model = MATCH` **and** `ledger_model = MATCH` | Plant B −1 on a fixture visit: MISMATCH. Plant one form row qty change that keeps the component delta (via the E1 embalase path): MISMATCH through `form_model` |
| B2 | Reject duplicate ledger keys (exit 2) | Inject a duplicate in a scratch copy without the PK |
| B3 | Compare registration/tax qty and amount; report row multiplicity per key; rename the verdict to "per-code financial identity" in docs | Plant registration qty 2: DIFFER |
| B4 | Non-empty, unique, expected-cardinality visit list (exit 2 on empty or duplicate); NULL/empty numeric = parse error (exit 2), never 0 | Empty file → exit 2; a NULL `totalbiaya` row → exit 2 |
| B5 | Fresh-B = exactly one `detail_nota_jalan` INSERT for the encounter, by `benchmark@`, with `at >=` the run's start timestamp (passed by the driver); the same in P13's comparator | Pre-insert an audit row before the run start: fails |
| B6 | P12 reconcile: assert DR coverage (every DR encounter present in both A and C, or listed) | Delete one encounter's ledger rows on a scratch copy: listed, exit 1 |

### C. Discriminating line identity (then rerun)

| ID | Change | Check | Negative control |
|---|---|---|---|
| C1 | Resolve a colliding display name using the **encounter's own source rows** (`rawat_jl_dr.kd_jenis_prw`, `detail_pemberian_obat.kode_brng` in the clone), never the expected ledger. One candidate in the source rows → `EQUAL-SRC` / `DIFFER`. Zero or more than one → AMBIGUOUS (fails). EQUAL-CTX is removed. | The 300 real visits are re-classified; report EQUAL vs EQUAL-SRC vs AMBIGUOUS counts | C2 |
| C2 | New NC: **same-name, same-price wrong code with the expected code present.** On a scratch copy, change the *ledger* code of one colliding line from the source code Y to its collision partner X (same name, same price). | The old comparator passes it (EQUAL-CTX, demonstrating the hole); the new one says DIFFER | (this is the control) |
| C3 | Optional stretch: the harness (our `BilingHarness`, not the Khanza jar) dumps the form's table model including the code columns, giving form-side provenance independent of the source tables | Codes captured for every billed line | Compare harness codes vs source-resolved codes on the 300 |
| C4 | Rerun: the same 300 P13 stage-1 visits + the 27-visit fixture, on fresh clones (P15 driver), with B1–B5 in force. Per-encounter JSON and machine-readable summary (denominator, coverage, verdict counts, fresh-B counts) saved. | Pass = all 300 EQUAL/EQUAL-SRC, 0 AMBIGUOUS (or each AMBIGUOUS listed and explained), fixture 27/27 under B1 | C2, B1–B6 NCs |

Residual stated limit: with C1 only (no C3), a form that bills code Y under a name shared with the
source's code X is not detectable. Only form-side provenance (C3) closes it.

### D. Document corrections (no box)

Strike through, never delete:
- D1–D9 above.
- Add S7 to the P13 record: the kill-test grant line proved nothing.
- Re-score the P14 rubric honestly. The v11 ceiling is 22/28; record a self-re-score with reasons.
- Rename P14's bound to a per-encounter rate.
- Attach the lock-release transcript.

### E. Recovery-check repairs (after C; frozen suite/oracle/NC bytes)

| ID | Change | Negative control |
|---|---|---|
| E1 | NC runner: an evidence file is returned by the run itself (path printed by the suite), missing file or missing assertion line = ERROR (not PASS); NC2/NC5 require the specific assertion to fail | Delete the evidence file between the run and the judge → ERROR |
| E2 | NC4 rebuilt: both arms do the same live UPDATE after the backup and compare **stage content vs stored metadata hash**; correct stage hashing passes, live-late hashing fails | the two arms differ only by the switch |
| E3 | A28′: no unconditional −5; restore result asserted; stage tables dropped only after a verified restore; fixture equality to its pre-test hash asserted at the end | Fixture hash before/after A28′ equal |
| E4 | Preservation: a missing pre-op snapshot aborts (exit 3), never re-recorded; snapshots named per run id and fixture; expected stage inventory from the suite's specification, not the post-failure observation | Delete the pre-op snapshot → exit 3 |
| E5 | NC switches: activate only on the exact value `1`; refuse on live targets inside each helper, not only at entry points | `=0` → inactive (unit test) |
| E6 | `_recover_grants_expected`: refuse when the marker's holder is alive; compare restored grants with the requested set; the main path validates the marker before deleting it; reject `{}` | Live-holder marker → refused; mismatched grant set → failure |

## 3. Required runs (in order)

1. Baseline:
   - frozen manifests (15 + 6 + 12);
   - live-state proof with the corrected grant probe (positive case: the app account's standing
     grants are listed and unchanged);
   - lock acquired.
2. A1–A7 changes; unfreeze and re-freeze each changed file under the procedure in §0. Run the A
   negative controls.
3. B1–B6 and C1–C2 in the comparators. Run their negative controls on scratch copies. The C2 old/new
   pair must show the hole and its closure.
4. C4 rerun on fresh clones: the fixture first, then the 300.
5. E1–E6 suite/oracle/NC repairs. Full fresh suite, then the NC 5/5 under the repaired runner, then
   preservation, under one held lock.
6. Final live-state proof (identical apart from time, corrected grant probe), clones dropped, lock
   release **captured** in evidence.

Expected box time: about 2.5–3.5 h (clones ~65 s each; the 300-visit form run ~26 min; the full suite
and NC chain ~25 min; NC scratch copies a few minutes each).

## 4. Records

- This doc first.
- R5 §27.
- Manifest re-pins.
- QMS `VER-<date>-DR-KHANZA-R5-P15-001`.
- One failure record per confirmed defect class (S, G, R, D) and per stop rule fired.
- pm1 trace and retrace trace-clean.
- Handoff update.
- Commit locally; push only on the owner's word.

## 5. Acceptance criteria

- **AC-1** Live state unchanged; the corrected grant probe shows the standing app grants identical before and after; ledger pin.
- **AC-2** Every changed frozen file goes through the full unfreeze/re-freeze procedure; local = box; new manifest; re-pinned.
- **AC-3** A1–A7: each negative control observed (refusal leaves an existing clone and process untouched; pipefail; stop rule; non-zero exits; pin mismatch fails; non-vacuous grant probe).
- **AC-4** B1–B6: each negative control observed, with `ROW_COUNT()=1` (or exact count) asserted for every plant.
- **AC-5** C2 shows the hole (old comparator passes the same-name wrong code) **and** its closure (new comparator: DIFFER).
- **AC-6** C4: 300/300 EQUAL or EQUAL-SRC with 0 AMBIGUOUS (or every AMBIGUOUS listed and explained); fixture 27/27 under the stricter B1 predicate; machine-readable summaries saved.
- **AC-7** E1–E6: each repaired check discriminates (FAIL with its switch, PASS without), judged by the repaired runner; suite and NC pass under one held lock.
- **AC-8** D1–D9 corrected by strike-through; records complete; retrace trace-clean.

## 6. Rubric (0/1/2; same scale as P14)

| # | Item | 2 means |
|---|---|---|
| R1 | Verification table | every v11 finding checked against the source, verdict + location; nothing repeated unchecked |
| R2 | A safety | A1–A7 with observed negative controls |
| R3 | B predicates | B1–B6 with observed negative controls |
| R4 | C1 provenance | no expected-ledger input to the actual-code mapping; AMBIGUOUS fails |
| R5 | C2 control | hole demonstrated on the old comparator and closed on the new |
| R6 | C4 rerun | 300 + 27 on fresh clones, summaries saved, result stated with a per-encounter bound and scope |
| R7 | E repairs | E1–E6 discriminating under the repaired runner |
| R8 | Frozen-byte discipline | every change through unfreeze/re-freeze; evidence names its bytes |
| R9 | Live-state proof | corrected grant probe, positive case shown, identical before/after |
| R10 | Document corrections | D1–D9 struck through with reasons; P14 re-scored |
| R11 | Records | doc first; R5 §27; QMS; failure records; trace; retrace |
| R12 | Honesty | invalid first attempts kept and recorded; no claim beyond the run |
| **Total** | | **/24** |

**Accept:** ≥ 20/24 **and** R2, R4, R5, R8, R9 at 2. **Accept with fixes:** 16–19, or one of
those five at 1. **Reject:** < 16, or any of those five at 0. An independent read-only review
re-scores from the evidence alone. The executor's self-score is reported as such.

## 7. Result and self-score (2026-10-26, after execution; pending the independent review)

Results: R5 §27. Evidence: `evidence/p15/`. Final bytes: manifest `r5_p15_frozen_manifest_20261026b`.

| # | Score | Evidence / note |
|---|---|---|
| R1 | 2 | §1 table: every v11 finding checked against the source, with verdict and location; S7 added |
| R2 | 2 | `chain/a_lib_test.txt` 19/19, `chain/a_negctl.txt` 9/9; old bytes shown failing on the same setup |
| R3 | 2 | `chain/line_negctl.txt` 24/24 (B1–B5), `chain_e/b6_negctl.txt` 6/6, P13 comparator B4/B5 exits 0/1/2 |
| R4 | 2 | collisions resolved from source rows only; AMBIGUOUS fails; 0 AMBIGUOUS on 300 |
| R5 | 2 | C2: old comparator EQUAL-CTX/MATCH (hole), new DIFFER/MISMATCH (closed), same scratch copy |
| R6 | 2 | 300 + 27 on a fresh clone; summaries saved; per-encounter bound and the name-only limit stated |
| R7 | 1 | E1–E6 discriminating under the repaired runner (5/5), **but only after fix 2**: the first frozen bytes had NC1 not discriminating and a broken B6 old arm |
| R8 | 2 | unfreeze/re-freeze for all changes; manifests a and b; local = box; evidence names its bytes |
| R9 | 2 | corrected grant probe with a positive case; standing grants identical at three points; ledger pin |
| R10 | 2 | D1–D7, D9 struck through with reasons; P14 re-scored 22/28; D8 via the captured P15 release |
| R11 | 2 | doc first; R5 §27; manifest; QMS; failure records; trace; retrace (see the commit) |
| R12 | 2 | both invalid first results kept (`chain/`), recorded and re-run; no claim beyond the runs |
| **Total** | **23/24 (self)** | Critical items R2, R4, R5, R8, R9 all at 2 → **Accept** under §6, pending review |
