# R5-P19 independent review (read-only)

Reviewer: independent; no stake in the score. Branch `khanza-r5-p6`, HEAD `9d91d80` (committed
2026-10-27T17:18:10+07:00 = 10:18:10Z). The only uncommitted item in the tree is the untracked review prompt
`docs/khanza_r5_p19_review_prompt.md`. Nothing under `tools/`, `evidence/p19/` or the P19 task doc differs from the
commit, so the working copy is the committed bytes. Nothing was run against a database or the box. Paths are relative
to `khanza-r5/` unless they start with `ROADMAP.md`.

What I ran (local, self-contained, no network, no DB; scratch files in the OS temp dir, none committed):
- Every entry of `evidence/p19/r5_p19_frozen_manifest_20261027.sha256` against `git show HEAD:khanza-r5/tools/<f>` and
  against the working copy with CR removed: **35/35 equal** on both.
- The three `.bak_p19_20261027/` hashes in `evidence/p19/unfreeze_cycle1.txt` against `git show 63ef8ca:khanza-r5/tools/<f>`:
  **3/3 equal** (`p14_edge_run.sh a2e333e0…`, `p15_lib.sh c24c05a1…`, `p15_line_identity.py ae2185e4…`).
- `evidence/p19/preflight/p15_line_identity.py` (the A2 scratch comparator) against HEAD: **byte-equal** (`8c7a13a8…`), so the
  live discovery ran the final gate bytes.
- `python -I tools/p19_release_inventory.py --local khanza-r5` into a temp file: 58 files, 58 ok, `not_ok` []; the output is
  **identical** to the committed `evidence/p19/release_inventory_local.json`.
- A Python comparison of the box inventory (`evidence/release_inventory.json` = `evidence/p19/chain/release_inventory_box.json`,
  identical) with the local one: same 58 file names, same `pinned_sha256` and `on_disk_sha256` for all 58; the only
  difference is the `manifest` field, in 44 entries (box copies are named `p11_frozen_…`, `p15_frozen_…` etc.). 11 entries
  have a `p14_` manifest, all `ok`.
- The exact unit-gate lines of HEAD `tools/p15_line_identity.py` (l.190-209, the per-key loop, and l.234, the `unit_src`
  line), extracted by line number with an assertion on their content, and `exec`'d on ten synthetic encounters (check 3).
- The N3 helper regex (`p15_lib.sh:57`) on the committed P18/P19 driver logs and on synthetic one-line logs (check 5).
- A mutant of HEAD `p15_lib.sh` with the `ga = 2` branch (l.92-94) deleted, run with a function `ps() { return 1; }` and a
  pid file for a non-existent pid, against the unmutated lib (check 6).
- Python recounts of `chain/*_encounters.json`, `*_lines.csv`, `preflight/a2_live_equal_encounters.json`; `diff` of
  `lsattr_chain_start/end` and of `live_state_baseline/final` (minus the header line); `git diff 63ef8ca 9d91d80` on
  `tools/`, the R5 report, the handoff, `ROADMAP.md` and the QMS records.

## 1. Verdict

- **My total: 20/24, against the self-score of 23/24.** I disagree on R4, R9 and R12 (each 1, not 2) and agree with the
  executor's R5 = 1.
- **The self-score is not earned, and the plan's Accept rule is not met: R9 = 1.** The core work is real: N1 and the
  equal-mode gate do what R5 §31 says (I executed the lines), the hashes hold, the final capture is last, and the box
  inventory closes N6.
- **Most important defect (O1):** the new N3 gate does not see the oracle's own **stage-drop** failure. When the stage drop
  fails, the oracle sets `failed_batches = ["stage-drop"]` and exits 4 (`sampled_real_form_diff_r5.py:1813-1817`). It logs
  `STAGE-DROP-FAILED …` (l.943), which none of the three patterns in `p15_lib.sh:57` matches. The P18 review named this
  case in N3. Handoff item 25 still says "a FAILED oracle batch can no longer end `P15E OK`". Once again a sentence says
  more than the code does.

## 2. Rubric (§6 of the task doc, 0/1/2)

| # | Mine | Theirs | Reason | Citation |
|---|---|---|---|---|
| R1 | 2 | 2 | §1 opens each finding at a line and records the reviewer's 23 vs 21 file count. N4 traces back to the executor's own `SELECT NOW()`. | task doc l.49-61 |
| R2 | 2 | 2 | The N3 gate is in `oracle_run` (`p14_edge_run.sh:215-217`) and paired on the extracted real function. N5a/N5b are fixed (`p15_lib.sh:78-95,101-103`) and paired with a shadowing `ps`. I found no path that signals an unrelated process. The residual (O1, stage drop) is review-named but narrow: only the fixture rc is ambiguous, and the stage tables live in the clone that 3g drops. So it does not reach 1. | `chain.log.txt:46-62`; oracle l.943, l.1811-1817 |
| R3 | 2 | 2 | I executed the extracted gate lines: mixed gives `UNCHECKED`, a missing source gives `UNCHECKED`, a different unit gives `DIFF`, in both modes (§3, check 3). The mixed plant and the equal-mode plants (b), (c) are paired on one scratch, and OLD really passes (`chain/p19_b_negctl.txt` N1, AC-5 blocks). Fixture and real-300 `unchecked == 0`, `checked > 0` and "all `unit_src` MATCH" are asserted in the chain (`chain.log.txt:96-101`). | `tools/p15_line_identity.py:196-202,234,262-264` |
| R4 | 1 | 2 | The N5b NEW arm asserts only `rc 1 / child alive` and drops stderr (`p19_a_negctl.sh:81` `2>/dev/null`). I deleted the `ga = 2` branch: the mutant also returns rc 1, by way of `p15_group_is_harness` (which also needs `ps`) and "no member looks like this run's harness". So the arm passes without the fix. That breaks §0 ("a NEW arm that expects an error asserts the reason text"). The single canned FAILED log holds all three patterns at once (`p19_a_negctl.sh:34-36`), so no pattern is tested alone. Nothing exercises value 2 in the TERM wait loop or in the post-KILL confirm (l.101-103). | §3 checks 5, 6 |
| R5 | 1 | 1 | Manifest = git 35/35, `.bak_p19` = `63ef8ca` 3/3, `lsattr` `i` 31 before (`lock_free_and_lsattr_before.txt`), 35 after the re-freeze (`refreeze_cycle1.txt`), and 35 at chain start = end. One cycle, and the pre-flight timestamps (08:48-09:00Z) are before the 09:05:51Z freeze. But two final files were first run in the chain, against the executor's own §0 rule (admitted). 1 is fair: this is the rule the plan added for exactly this purpose. | `evidence/p19/preflight/*`; failure record `T1016Z-test` |
| R6 | 2 | 2 | Step 4e (box inventory, 58/58, the 11 P14-only pins `ok`) runs before step 5. Step 5 is the last capture (10:12:48Z). Release follows at 10:13:12Z. Baseline and final are textually identical apart from the header (my `diff`). Minor: §3 step 6 says "each copy is listed", but no copy transcript exists (§6). | `chain.log.txt:224-246`; `lock_release.txt` |
| R7 | 2 | 2 | All 20 fields in the DONE line are 0, `asserts-failed=0`. The history controls ran on the P19 bytes. Fixture 27/27, real 300/300. | `chain.log.txt:248` |
| R8 | 2 | 2 | R5 §30 l.1742/1743, "four places" and the B4 description are struck or annotated, not edited. Handoff 24 is annotated. The erratum and the P17 NOTE exist and say what they claim. | `git diff 63ef8ca 9d91d80 -- docs/` |
| R9 | 1 | 2 | (a) AC-7 and the rubric require the retrace to be "repeatable from the committed traces". The second run in `retrace_trace_clean.txt` prints **`UNTRACED: 44 file(s)`**, and its output is cut to 20 lines, so a reader cannot check R5 §31's word "older" (l.1859). AC-7 is therefore not met, yet §7 scores R9 = 2 with "the retrace says clean". (b) R5 §31 l.1811 says `pass` was False on live "because the payment sum differs". `preflight/a2_live_equal_encounters.json` shows `B=""` and `B_rows=0` for all 300: there is no payment row, not a different sum. (c) Handoff item 25 overclaims N3 (O1). | `evidence/p19/retrace_trace_clean.txt`; task doc l.189, l.286 |
| R10 | 2 | 2 | I reproduced the local inventory exactly. The box inventory has the same pins and on-disk hashes, and its manifest names differ as stated. All 8 manifests are present; an empty glob raises (`p19_release_inventory.py:49-50`). | §0 above |
| R11 | 2 | 2 | The three failure records are stamped 10:15:23Z-10:16:04Z. The commit is at 10:18:10Z and the retrace at 10:17:35Z, so the stamps are plausible write times. The records' content is accurate. The erratum matches the P18 files. Minor: the QMS `not_done` list leaves out the pre-flight gaps and the retrace-from-repo gap. | `records/failures/20261027T10*`; QMS P19 `not_done` |
| R12 | 1 | 2 | Unlisted: O1 (stage-drop path); the AMBIGUOUS/UNMAPPED exclusion added to the unit count, which is in no plan item, no §7 amendment, and no control (O4); AC-7 not marked as unmet; the missing copy list. Overclaims: handoff 25 (O1) and R5 l.1811 (O3). | as cited |
| **Total** | **20/24** | **23/24** | **Accept rule not met: R9 = 1.** | |

## 3. N1-N9 and AC-5 closure

| ID | Status | Evidence |
|---|---|---|
| N1 | **closed** | `p15_line_identity.py:234`: `"UNCHECKED" if unit_unchecked`. I executed it: one sourced key gives MATCH 1/0; sourced plus unsourced gives **UNCHECKED** 1/1; no sourced key gives UNCHECKED 0/1. The mixed plant is paired: OLD `MATCH/MATCH checked=2 unchecked=1`, NEW `UNCHECKED/MISMATCH` (`chain/p19_b_negctl.txt` N1 block, ROW_COUNT 1). R5 l.1818 and the `p19_b_negctl.sh:4-6` header now describe the code correctly. |
| AC-5 (equal-mode gap) | **closed** | `exp is not None` dropped (l.196); `pass` in equal mode requires `unit_src == "MATCH"` (l.264). Plants (b) DIFF and (c) UNCHECKED: OLD passes, NEW fails, exactly 3 fail in NEW and 0 in OLD. Real 300: 698/0, all MATCH, asserted (`chain.log.txt:99-101`). A2 honoured its decision rule on the final bytes. |
| N2 | **closed in substance** | `p19_b_negctl.sh:135` asserts `^P13 compare:` = 1, no `INPUT-ERROR`, rc ≤ 1. The transcript shows the summary and `RESULT: DIFFERENCES`. §0 says "never 'exit <= 1'" while B6 allows "0 or 1". The plan contradicts itself, and the code follows B6. That is acceptable, because the summary line rules out a crash. |
| N3 | **partly** | The gate exists and is paired on the real `oracle_run` (control faithful: `env` and `p15_count_sukses` are shadowed, n = 3 = ok, so RC 10 can only come from the new gate, and the reason line is asserted at l.63-67). But a failed stage drop (`STAGE-DROP-FAILED`, oracle l.943) and `STAGE-KEEP … (box NOT clean)` (l.1801-1809) are not matched (O1). I checked on synthetic one-liners: the helper returns "none" for both. `STAGE-RESTORE-UNVERIFIED/MISMATCH` alone are also unmatched, but every caller of `stage_restore` then logs `date …: FAILED (` (l.1563, l.1657), so they are covered. No false trigger: the clean P18 and P19 `c4_driver.log` do not match; `ABANDON-FAILED`/`RETRY-FAILED` do not match `: FAILED \(`. |
| N4 | **closed** | `erratum_p18.md` §1-2: the `SELECT NOW()` label and the self-matching `pgrep`. The T0 clone's fate is still stated as unevidenced. The P19 pre-lock process check is labelled "filter that cannot match this command", but the command itself is not in the file (minor). |
| N5a | **closed** | `p15_lib.sh:78-84`: an empty `pg` leaves `lead=gone` and goes to the dead-leader branch. Paired: OLD `0/alive`, NEW `0/dead` (`chain.log.txt:54-55`). |
| N5b | **closed in code; control weak** | `p15_group_alive` returns 2 when `ps` fails (l.41-43). The dead-leader branch sets rc 1 (l.92-94); the wait and confirm steps use `-eq 1` / `-ne 1`. The control passes even with l.92-94 deleted (my mutant), see O2. N5c tests the return value 2 directly and is sound. |
| N6 | **closed** | Box inventory at step 4e before the final capture: 58/58, and the 11 `p14_*` pins ok (`chain/release_inventory_box.json`, my count). `p14_live_state.sh` is among them. |
| N7 | **closed** | P19 records are stamped at write time; the erratum §3 lists the P18 iterations; the P19 pre-flight fault and gaps are recorded (`T1016Z-test`). |
| N8 | **closed by owner decision** | Not a secret; the redaction claim is dropped (P18 QMS amendment). The P19 lock transcript shows `host=<alias>`, which is harmless and admitted (§7 amendment 6). |
| N9 | **closed** (marked, not replaced) | `evidence/p17/NOTE_refreeze_lsattr_after_garbled.md` points to the P18 captures. |

## 4. New findings (most severe first)

**O1, major (claim) / minor (impact). The N3 gate misses the oracle's stage-drop failure, and handoff item 25 says a
FAILED batch can no longer end `P15E OK`.**
- Where: `tools/p15_lib.sh:57` greps `': FAILED \(|STAGE-RESTORE-ERROR|NOT restored'`. In the oracle, a failed stage drop
  logs `STAGE-DROP-FAILED %s_*: errors=… (box NOT clean; verdict forced fail-closed)` (`sampled_real_form_diff_r5.py:943`).
  Its finalize step then sets `failed_batches = failed_batches or ["stage-drop"]` and `exit_code = 4` (l.1813-1817).
  `STAGE-KEEP …` (l.1801, l.1806) also forces exit 4 without a `: FAILED (` line when it follows a batch the oracle
  did not mark FAILED. The claim is in `docs/khanza_session_handoff_20261025.md:48` ("a FAILED oracle batch can no longer
  end `P15E OK`"). The P18 review's N3 failure scenario named "a failed stage drop".
- Scenario: a fixture run in which all 27 visits log `sukses=true`, but the finalize drop of `r5_stage_<run>_*` fails (a
  lock wait, a permissions change). The oracle exits 4, the stop rule and FORM-INCOMPLETE do not fire, the helper finds
  none of its strings, `oracle_run` returns 4, and the driver prints `P15E OK`. The comparators then run on a clone whose
  oracle verdict was "box NOT clean". The impact is limited because the stage tables are in the clone, which is dropped in 3g.
- Smallest fix: add `STAGE-DROP-FAILED|STAGE-KEEP` to the helper, or gate on the oracle's own `- FAILED batches` line or its
  verdict in the run's `.md`. Add one canned line per pattern to `p19_a_negctl.sh`. If no byte change is made, reword
  handoff 25 and add a stated limit.

**O2, minor. The N5b NEW arm cannot fail for the reason it names.**
- Where: `tools/p19_a_negctl.sh:80-82,103-105`. `kill_rc` discards stderr, and the arm asserts `1/alive`.
- What I ran: HEAD `p15_lib.sh` with l.92-94 (`if [ "$ga" = 2 ] … NOT CONFIRMED … rc=1; continue`) deleted, with
  `ps() { return 1; }` and a dead pid. The result is `rc=1`, with stderr "group … is alive but no member looks like this run's
  harness - not signalled, NOT CONFIRMED". The unmutated lib also gives `rc=1`, with stderr "ps failed while looking for
  group … - NOT CONFIRMED". Both arms of the control therefore pass with or without the fix. The outcome is safe either
  way, but the control does not evidence the fix.
- Smallest fix: keep stderr in `kill_rc` and assert `grep -c 'ps failed while looking for group'` = 1. Add one case in which
  `ps` fails only after the TERM, which exercises l.101-103.

**O3, minor. R5 §31 misdescribes why `pass` was False for all 300 on live.**
- Where: `docs/khanza_benchmark_report_R5.md:1811` "because the payment sum differs there". In
  `evidence/p19/preflight/a2_live_equal_encounters.json`, all 300 encounters have `B = ""` and `B_rows = 0`: no
  `detail_nota_jalan` row on live at all. `a2_live_equal.txt:305` says only "it is the payment column".
- Scenario: a reader (or Astra v13) takes it that live payments disagree with the ledger.
- Fix: "because live has no payment row (`B_rows` 0) for these visits".

**O4, minor (unlisted deviation). The AMBIGUOUS/UNMAPPED exclusion in the unit count is in no plan item, amendment or
control.**
- Where: `p15_line_identity.py:196` `and not str(key[1]).startswith(("AMBIGUOUS:", "UNMAPPED:"))`. Plan B1 says only
  "drop `exp is not None`". §7 lists 8 amendments, and none is this. It is mentioned only in R5 l.1818.
- Is it a hole? No, by my run: an encounter whose only key is AMBIGUOUS gets `unit_src=MATCH 0/0`, but its verdict is
  AMBIGUOUS. That fails equal mode (l.262 needs EQUAL/EQUAL-SRC) and expect mode (l.243: AMBIGUOUS is neither
  EQUAL/EQUAL-SRC nor DIFFER). Under the P18 code such a key counted as unchecked, so the count semantics changed silently.
- Fix: an amendment line, and one plant (rename a procedure so that it maps to two codes) in each mode.

**O5, minor. AC-7 is not met, and that is not said where AC-7 is scored.**
- Where: `evidence/p19/retrace_trace_clean.txt` second run, `UNTRACED: 44 file(s)`, output cut after 5 of the 44. The task doc
  l.189 says "repeatable from the committed traces"; §7 R9 says "the retrace says clean". My rough check of committed
  files against basenames in `records/traces/*.pm1` found no P19 deliverable among the uncovered files, only the trace
  files themselves. This is consistent with "older", but the committed output cannot show it.
- Fix: commit the full second-run list, and mark AC-7 "partly (the repo copies cover P16+)".

**O6, minor. A gap in the plan's own process and in the records.** §3 step 6 requires "each copy is listed"; there is no copy
transcript in `evidence/p19/`. The QMS P19 `not_done` list omits the two pre-flight gaps and O5. Stale step labels:
`chain.log.txt:36` "history, on the P18 bytes" and l.113, where the bytes are the P19 bytes. A remaining pre-existing
fail-open in `p15_kill_run_harness` that no review has named: an empty or garbled pid file is skipped with rc 0
(`p15_lib.sh:72-73`). That path is not plausible with `echo $$ >`, but it is not "fails closed".

## 5. Claim vs transcript

| Claim (where) | Transcript line | Status |
|---|---|---|
| lib 23/23; P15 A 9/9; P16 A 26/26, E 20/20 | `chain.log.txt:21,25,29,33` | matched |
| P17 A 37/37, B 31/31; P18 A 50/50, B 33/33 | `chain.log.txt:37,114,41,151` | matched |
| P19 A 19/19; P19 B 28/28 | `chain.log.txt:64,183` | matched |
| fixture 27/27, DIFFER 12 / EQUAL 12 / EQUAL-SRC 3, checked 57, unchecked 0 | `chain.log.txt:89`; my recount of `fixture_lines_encounters.json` (27 MATCH, sums 57/0) | matched |
| real 300/300, 1,240 entries, 181/119, checked 698, unchecked 0, all `unit_src` MATCH | `chain.log.txt:93,99-101`; `real300_lines.csv` 1,241 lines incl. header; recount 698/0 | matched |
| P13 comparator 300/300; exit-code asserts; 0 failed | `chain.log.txt:104-111,248` | matched |
| line 33/33; B6 6/6 | `chain.log.txt:187,191` | matched |
| suite PASS=39; preservation PASS; unit 44/44; NC 5 | `chain.log.txt:200,206,211,220` | matched |
| 35/35 frozen and `lsattr` at start and end | `chain.log.txt:3-4,229-230`; `lsattr_chain_start` = `_end` (35 `i`) | matched |
| local = box 35/35 | `local_eq_box_manifest.txt` (35 EQUAL; no timestamp or command) | matched |
| manifest = git; `.bak_p19` = `63ef8ca` | my hashing: 35/35, 3/3 | matched |
| inventory on the box 58/58, 8 manifests; P14-only 11/11 | `chain.log.txt:225-226`; my count in `release_inventory_box.json` | matched |
| "same files, same pinned and on-disk hashes; manifest names differ" | my comparison: 58 = 58, hashes equal, 44 `manifest` fields differ | matched |
| A2 live: 300/300 MATCH, 698, 0, 181/119 | `a2_live_equal.txt:301-304`; recount of the encounters json | matched |
| A2 "pass False because the payment sum differs" (R5 l.1811) | `a2_live_equal_encounters.json`: `B` empty, `B_rows` 0 ×300 | **contradicted** (O3) |
| N1 OLD `MATCH/MATCH checked=2 unchecked=1`, NEW `UNCHECKED/MISMATCH` | `chain/p19_b_negctl.txt` N1 lines | matched |
| AC-5 (b) DIFF, (c) UNCHECKED, ROW_COUNT 1 / 4, 3 fail NEW, 0 OLD | `chain/p19_b_negctl.txt` AC-5 lines | matched |
| N3 OLD 4 / NEW 10; clean 4/4; real logs match/none | `chain.log.txt:47-53`; my regex run on the committed P18 logs gives the same | matched |
| N3 "a FAILED oracle batch can no longer end P15E OK" (handoff l.48) | oracle l.943, l.1813-1817; helper on a synthetic `STAGE-DROP-FAILED` line: none | **overclaim** (O1) |
| N5a/b/c | `chain.log.txt:54-62` | matched (N5b passes for a second reason, O2) |
| final capture 10:12:48Z last; release 10:13:12Z; lock free before and after | `chain.log.txt:228`; `lock_release.txt:1,5`; `lock_free_and_lsattr_before.txt:1-3` | matched |
| live counts 86,676 / 1,464,593 / 86,488 / 1,100; pin; consumers | `chain.log.txt:237-244` = l.11-18 (my `diff`) | matched |
| one freeze cycle, no fix-up | one unfreeze (08:42:32Z) and one re-freeze (09:05:51Z) transcript; no other | matched |
| first pre-flight: 7 control scripts exit 0 | `preflight/pre1_summary.txt` (7 lines, all 0) | matched |
| retrace "says no untraced files" (§7, AC-7) | first run clean; second run `UNTRACED: 44` | **partly** (O5) |
| failure records "stamped with `date -u` at write time" | 10:15:23Z / 10:16:04Z ×2, before the 10:18:10Z commit | plausible |

## 6. Could not verify from the repo alone

- That the three pre-flight runs happened on the unfrozen bytes that were then frozen. The preflight files carry timestamps
  (08:48-09:00Z, before the 09:05:51Z freeze) but no hashes, except the comparator copy. A `sha256sum` line at the top of
  each pre-flight transcript would settle it.
- What was copied off the box between 10:12:48Z and 10:13:12Z, and that nothing else touched it. A copy transcript would settle it.
- The command behind "processes (filter that cannot match this command) 0" in `lock_free_and_lsattr_before.txt` and the
  command and time of `local_eq_box_manifest.txt`. Both files lack them.
- When A2 ran relative to the 08:42:32Z unfreeze. `a2_live_equal.txt` has no timestamp. Its bytes are the final bytes, so
  the result stands either way.
- The first retrace run (the self-harness traces are outside this repo), and the full list of the 44 files of the second run.
- Whether the stage tables of a fixture run are always inside the clone (I read `stage_drop(db, …)` with `db` = the clone and
  conclude yes, but did not trace every path).
- The box-side `.bak_p17`/`.bak_p16`/`.bak_p18` directories used by the history controls (not re-hashed in P19).

## 7. Recommendation

**Astra v13 should not run on these documents yet. The bytes are fit for it.** The frozen set is what the manifest says,
the critical predicate now matches its description, and the live state is proven last. What v13 would read and find wanting
is in the documents: a handoff sentence that the code contradicts (O1), a wrong cause in R5 §31 (O3), and an AC scored as
met that the committed evidence shows as unmet (O5). The minimum before v13 is a **documents-only** commit, with no box access:
1. Reword handoff item 25 and add a stated limit for O1, or, better, take the byte fix below.
2. Correct R5 l.1811 (O3).
3. Mark AC-7 "partly" and commit the full second-run list (O5). Add the O4 amendment. Complete the QMS `not_done` list.

Recommended, and needing one unfreeze cycle: add `STAGE-DROP-FAILED|STAGE-KEEP` to `p15_oracle_batch_failed`, with one
canned line per pattern; assert the reason text in the N5b arm (O2). This is small enough to do under one lock, followed by
an independent re-check.

On the stated limits:
- **N3 not live-tested with a restore-only failure:** acceptable. The canned-log control runs the real `oracle_run` with
  only its externals shadowed, and I found it faithful. The gap that matters is the missing pattern (O1), not the missing
  live run.
- **B4 unpaired:** acceptable. The stop-rule branch predates P17, and B4 is a real form failure.
- **A8 failing branch:** acceptable as stated for v13, provided v13 is told that only the success line is evidenced.
- **P13 driver EXIT-trap restore:** acceptable for v13 only if v13 does not rely on the P13 driver's restore. If it does,
  close it first.
