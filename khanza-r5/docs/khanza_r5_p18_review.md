# R5-P18 independent review (read-only)

Reviewer: independent; no stake in the score. Branch `khanza-r5-p6`, HEAD `63ef8ca` (committed
2026-10-27T09:41:16+07:00 = 02:41:16Z). The only uncommitted change in the tree is the untracked review prompt
`docs/khanza_r5_p18_review_prompt.md`. Nothing under `tools/`, `evidence/p18/` or the P18 task doc differs from the
commit, so the working copy is the committed bytes. Nothing was run against a database or a VPS. Paths are
relative to `khanza-r5/` unless they start with `ROADMAP.md`.

What I ran (local, self-contained, no network, no DB):
- I hashed every entry of `evidence/p18/r5_p18_frozen_manifest_20261027.sha256` against `git show HEAD:khanza-r5/tools/<f>`
  and against the working copy, both with CR removed. **31/31 equal** on both.
- I checked the five `.bak_p18_20261027/` hashes in `evidence/p18/unfreeze_cycle1.txt` against
  `git show a60b100:khanza-r5/tools/<f>` with CR removed: **5/5 equal**. I also checked the nine `.bak_p17` hashes in
  `evidence/p17/lock_acquire_unfreeze.txt` against `bb3a6d8`: 9/9 equal.
- I checked the three "original" hashes in `evidence/p18/redaction_note.txt` against `git show a60b100:…`: 3/3 equal
  (see N8).
- I ran `python -I tools/p18_release_inventory.py --local khanza-r5` into a temp file. The result is 54 files,
  54 ok, `not_ok` [], and its `inventory` object is identical to the committed `evidence/release_inventory.json`.
- I extracted the exact P18 unit-gate lines of `tools/p15_line_identity.py` (HEAD l.192-202 and the `rec["unit_src"]`
  line) and executed them on four synthetic encounters (see N1). The script is in my scratchpad and was not
  committed.
- I counted outcomes, `unit_src`, `B_rows`, `unit_keys_checked` and verdicts in `evidence/p18/chain/*_encounters.json`
  and counted lines in `*_lines.csv` with Python.
- `git diff a60b100 63ef8ca` on `tools/`, the R5 report, the P17 task doc, `ROADMAP.md`, the handoff and the P17 QMS
  record; `git grep` for `host=` values and for the redacted alias. I did not print the alias.

## 1. Verdict

- **My total: 20/24, against the self-score of 23/24.** The two disagreements beyond the self-score's own R3 = 1
  are R9 = 1 and R11 = 1, plus R12 = 1.
- **The self-score is not earned.** By the plan's own rule (R2, R3, R6, R9 must be 2), P18 does not Accept: R3 and
  R9 are 1. The executor already conceded R3. The safety work (B1, B2, B3, B5) is real and paired, and the final
  live-state proof is truly last.
- **Most important defect (N1):** R5 §30 l.1742 and `tools/p18_b_negctl.sh:8-9` say "a billed procedure/drug key with
  no source row is `UNCHECKED` -> MISMATCH". The code makes an encounter `UNCHECKED` only when **no** key in it was
  checked (`tools/p15_line_identity.py` `rec["unit_src"]` line). An encounter with one sourced key and one unsourced
  key is `MATCH`. I executed the exact lines to confirm this. It is a claim about the critical predicate written from
  intent, not from the code: the same pattern as P15 and P17.

## 2. Rubric (§6 of the task doc, 0/1/2)

| # | Mine | Theirs | Reason | Citation |
|---|---|---|---|---|
| R1 | 2 | 2 | All 16 rows cite lines. I spot-checked M2 (suite l.700-704 at `a60b100`), M3a/b (`p15_lib.sh:50,54` at `a60b100`), M9 and M12, and they are correct. M3c was settled on the box with a transcript. | task doc §1; `evidence/p18/a2_ps_semantics.txt:5-8` |
| R2 | 2 | 2 | B2 has four real pairs. The OLD arms really exhibit the defect (`chain.log.txt:50,52,57`), and the scratch shapes match the real launch (`sampled_real_form_diff_r5.py:980,987`: `bash -c` with `start_new_session`, the JVM names `BilingHarness`). B3's tail pair is real (l.60-63). B4 is a real form failure. The residuals are narrow, unlisted, and do not reach 1: a race and a `ps`-failure path in the kill function (N5), and the ambiguity of the fixture's exit 4 (N3). | `tools/p15_lib.sh:57-87`; `tools/p18_a_negctl.sh:79-145`; `chain/b4_stop_rule_driver.log:56-62` |
| R3 | 1 | 1 | B7a, B7b, B3a, N4 and A12 are paired, and their NEW arms assert the reason. But: the UNCHECKED gate is weaker than claimed (N1); there is no source-unit gate in equal mode, so `unit_keys_checked` is 0 on the real 300 (AC-5 not met, stated); `unit_keys_unchecked` is printed but never gated in the chain; and B4's OLD arm still accepts exit 1 with no summary assertion (N2). | `tools/p15_line_identity.py:196-202,246`; `tools/p18_b_negctl.sh:61`; `chain.log.txt:116,120` |
| R4 | 2 | 2 | B1 is paired on the extracted A30 step: OLD `RCH=0` with the sidecar written, NEW `RCH=1` with none (`chain.log.txt:45-46`). I read suite l.695-709, and `RCH=$?` is now on l.701, straight after the hash step. B5 isolates the restore clause of both A28′ and A31′ with the hashes held equal, and the through-suite A31′ arm shows equal hashes `61ba0f72…` on both sides (`chain/p18_a_negctl.txt` B5 block), which closes M8's overdetermination. The A8 line is captured. Weak points: the `PREOP_RC≠0` branch of the new sidecar logic is not exercised, and A8's failing branch has no control (stated). | `tools/p6_acceptance_suite.sh:700-709`; `chain/a8_drift_hook_line.txt` |
| R5 | 2 | 2 | I verified manifest = git for 31/31 and `.bak_p18` = `a60b100` for 5/5. `lsattr` shows `i` on 27 before the unfreeze (`lock_free_and_lsattr_before.txt:5-31`), 31 after the re-freeze (`refreeze_cycle1.txt:38-70`), and 31 at chain start and end (identical files). There was one cycle with no fix-up. `p6_dbxml.py` is unchanged since `0ad629e` and is pinned. One process gap: the final `p18_a_negctl.sh` (its third B5 assertion) was never pre-flighted unfrozen. Its first run is in the chain at 01:32:56Z, after the 01:25:07Z freeze (N7). | `evidence/p18/unfreeze_cycle1.txt`, `refreeze_cycle1.txt`, `chain/lsattr_chain_*.txt` |
| R6 | 2 | 2 | The final capture (`chain.log.txt:212-230`, 02:31:39Z) is the chain's last step, after the last clone drop (3g, 02:10:20Z) and the NC runner. The lock was released at 02:32:25Z. Baseline and final are textually identical in grants, ledger, counts and consumers (l.9-18 vs l.219-228). The pre-lock capture (`lock_free_and_lsattr_before.txt:34-35`) shows the T0 clone was already absent, and R5 §30 says so honestly. Minor: an unexplained "drop time" line inside the lock window (N4). | `chain.log.txt`; `lock_release.txt` |
| R7 | 2 | 2 | All 18 sub-results exit 0 on the 31 frozen files, checked at chain start and end (`chain.log.txt:3-4,213-214,232`). | `chain.log.txt:232` |
| R8 | 2 | 2 | §27-§29 annotations are struck and corrected; the handoff §1 rows and items 16 and 22 are corrected; ROADMAP has 44/44 and the per-control wording (C4 asked for a replacement there, so an edit is per plan); the P17 dates and AC-7 are struck. | `git diff a60b100 63ef8ca` on those files |
| R9 | 1 | 2 | The retrace output is committed and trace-clean, the A8 line and the A2 discovery are committed, and every number in R5 §30 matched a transcript (§5). But "no claim without its file" fails twice in R5 §30 itself: l.1742 (N1, contradicted by the code) and l.1743 "OLD arms assert exit 0 and the summary line (… B4 vs the P16 `p13_sample_compare.py`)", which `p18_b_negctl.sh:61` contradicts (N2). The executor's own §7 R3 note admits the second. C5's planned replacement of the garbled `evidence/p17/refreeze_lsattr_after.txt` was silently dropped (N9). | R5 l.1742-1743; `tools/p18_b_negctl.sh:8-9,61` |
| R10 | 2 | 2 | The inventory reproduces exactly (I ran it). It covers the P13 manifest and `p6_dbxml.py`, an empty glob raises, and the scope is stated. Minor (N6): the 11 files whose effective pin is the P14 manifest, including `p14_live_state.sh`, which produces the final proof, and `p14_drop_clone.sh`, were not hash-checked on the box in this wave. The script's docstring premise "local files equal the box files" is shown for 31 files only. | `tools/p18_release_inventory.py:7-8`; `chain.log.txt:14-15,224-225` |
| R11 | 1 | 2 | The QMS P18 record and the P17 amendment are good, and the traces exist. But the failure-record timestamps are again not write times (the M15 class). `20261027T0105Z` cites the C1 retrace output, which was produced at 02:40:43Z. `20261027T0120Z` describes `preflight/p18_b_negctl_run2.txt` and `c4_fixture_only2.log`, both at 01:22:47Z. The hostname redaction is cosmetic: the same alias is in 23 committed files, including this wave's task doc (l.10), and the unredacted originals are in pushed history. I verified their hashes against `a60b100` (N8). | `records/failures/20261027T01*`; `evidence/p18/redaction_note.txt` |
| R12 | 1 | 2 | Faulty first runs are kept, which is good. But some limits are unlisted: the fixture exit-4 ambiguity and the compound restore failure in B4 (N3), the dropped C5 item (N9), and the box P14 tools (N6). The preflight history is understated. `preflight/p18_a_negctl_run2.txt` shows a second, wrong B5 hypothesis ("the P16 A31′ never calls the restore at all", refuted by its own result 1/0), and the assertion was then rewritten a third time; record `0120Z` and R5 l.1748-1750 mention only the first faults. The handoff item 24 phrase "kill function fails closed" overstates (N5). | as cited |
| **Total** | **20/24** | **23/24** | **Accept rule not met: R3 = 1 and R9 = 1.** | |

## 3. M1-M16 closure

| ID | Status | Evidence |
|---|---|---|
| M1 | **closed** (ordering); clone fate is a stated limit | Final capture is last (`chain.log.txt:212`, 02:31:39Z; release 02:32:25Z). The clone was absent before the lock (`lock_free_and_lsattr_before.txt:34-35`). Who dropped it is unevidenced, and R5 l.1718-1720 says so. See N4 for the misleading "drop time" line. |
| M2 | **closed** | `p6_acceptance_suite.sh:700-705`: `RCH=$?` on l.701, the `rm -f` of both sidecars, then each sidecar is written only if its own exit is 0. Check 30 (l.709) is now live. Paired control `chain.log.txt:45-48`. I read l.695-709 for glue: nothing sits between the hash step and `RCH`. Untested: `PREOP_RC≠0`. |
| M3 | **closed**, with minor residuals (N5) | (a) dead leader with a live group goes through `p15_group_alive` by pgid, then the identity check, then TERM/KILL (`p15_lib.sh:73-83`); (b) unreadable start time sets rc 1 (l.69-71); (c) `ps -e -o pgid=,stat=` (l.40). The identity-by-command-line check is sound in practice: a pid in use as a pgid is not reused by Linux, and the real JVM's command line names `BilingHarness` (oracle l.980). The B2a-d pairs are real (`chain.log.txt:49-58`). Residuals: a race on l.65-67, and a `ps` failure that reads as "dead". |
| M4 | **closed** (tail); trap path stated | `p13_wide_sample.sh:142-158` ports the FORM-INCOMPLETE gate and the verified restore with exit 3. The pair is in `chain.log.txt:59-67`. Deviation from the plan's "`KEEP=1`": after the exit 3 on l.157, the EXIT trap still retries `$DBXML restore` (l.39, since `RETARGETED` is still 1), so "the xml is left for inspection" (comment l.155) is not what happens. If `ORACLE_RC` happens to be 3, the clone is also dropped despite "clone kept". Both are minor. |
| M5 | **closed** | `chain/a8_drift_hook_line.txt:1`; asserted at `p18_a_negctl.sh:178-179`. The failing branch has no control (stated). |
| M6 | **closed** for P18; P16 declared lost | `evidence/p18/retrace_trace_clean.txt:13-14` "All project files appear in at least one trace". The placeholder trace is at 02:40:42.77Z (`records/traces/r5-p18-retrace.pm1`), the retrace at 02:40:43Z. I could not re-run it (its traces dir is outside this repo). The literal string "UNTRACED: 0" that §7 and AC-7 cite does not appear; the meaning is the same. |
| M7 | **closed**, new bytes only | `chain/b4_stop_rule_driver.log:56-62`: `sukses=false 1`, `STOP RULE[fixture]: 1/27`, exit 1, xml on `sik`, 0 grants, clone kept then dropped. The trigger also broke the oracle's stage restore (l.34, l.36), which R5 does not mention (N3). |
| M8 | **closed** | Predicate-level: A28′ is OLD-P15 0 vs NEW 1/0, and A31′ is OLD-P16 0 vs NEW 1/0, with equal hashes (`chain.log.txt:69-74`). Through-suite A31′ has equal hashes on both sides, OLD PASS and NEW FAIL (`chain/p18_a_negctl.txt` B5). The NEW injection is evidenced by `restore=restore-not-verified`; the clean NEW run passes. |
| M9 | **partly** | `unit_keys_checked` is emitted, and B7a is paired (all source rows of 900007 deleted: NEW `UNCHECKED`/MISMATCH, OLD MATCH). But a mixed encounter passes (N1), `unit_keys_unchecked` is not gated, and equal mode has no gate (stated, AC-5 not met). The B1 deviation is now an amendment (§7 item 5). |
| M10 | **partly** | Done: B3a and N4 assert the reason and OLD exit 0 plus the summary; A12 OLD asserts a figure that is not the real count; N2 is out of the count; N7 is relabelled; the P13 asserts are counted (`chain.log.txt:124-131`). Not done: B4 OLD still accepts `exit ≤ 1` with no summary assertion (`p18_b_negctl.sh:61`), while R5 l.1743 says otherwise (N2). |
| M11 | **closed** | R5 l.1574, l.1590; handoff l.17, l.19, items 16, 22; `ROADMAP.md:329,368`; `tools/p16_a_negctl.sh:7`. |
| M12 | **closed** | `p18_release_inventory.py:25-34,47-49`; reproduced 54/54. Scope stated (local mode; box not read). |
| M13 | **closed** | ROADMAP P17 line, handoff item 23, P17 QMS title plus amendment. The commit message and the `r5-p17` traces are stated as immutable (R5 l.1791-1792). |
| M14 | **partly** | The fix1 transcript is unrecoverable (stated). `local_eq_box` was regenerated with hashes for the 31 P18 files (`local_eq_box_manifest.txt`). But the garbled `evidence/p17/refreeze_lsattr_after.txt` was neither replaced nor marked, as C5 required, and this is not listed (N9). |
| M15 | **closed** for P17; **recurs** in P18 (N7) | P17 task doc §7 and AC-7 are struck. P18's own record stamps are nominal. |
| M16 | **closed** | `a2_c3_poller_and_b2_discovery.txt` (filter stated; 2,874 / 0 / 216; 300 registration rows `0 0 0`). `b[1] == 1` is moved into `ok_all` and equal mode (`p15_line_identity.py:256,263`). B7b is paired (`chain.log.txt:160-162`). |

## 4. New findings (most severe first)

**N1, major. The UNCHECKED gate fails an encounter only when none of its keys was checked; the report and the
control header claim it fails any unsourced key.**
- Where: `tools/p15_line_identity.py` (HEAD) `rec["unit_src"] = "DIFF" if unit_src_bad else "UNCHECKED" if (unit_unchecked and not unit_checked) else "MATCH"`.
  The claims are in R5 l.1742 ("a billed procedure/drug key with no source row is `UNCHECKED` -> MISMATCH") and
  `tools/p18_b_negctl.sh:8-9`. The chain prints `unit_keys_unchecked` (`chain.log.txt:116`) but never asserts it;
  only the clean-scratch control does (`p18_b_negctl.sh:44`).
- What I ran: the exact gate lines on synthetic inputs. "one sourced key, one key whose source row is gone (billed
  unit 999)" gives `unit_src=MATCH checked=1 unchecked=1`. "B7a shape, no key sourced" gives `UNCHECKED`. "registration
  only" gives `MATCH checked=0 unchecked=0`, which is correct.
- Failure scenario: in an expect-mode encounter with a procedure and a drug, the drug's source row is missing (deleted,
  or written under a different code). The billed drug unit is then never compared to a source row, and the encounter
  still counts in the 27/27. The other gates (form vs ledger, `form_model` vs the manifest) may still catch a price
  error, but the property R5 states is not the property the code has. B7a cannot see this, because it deletes every
  source row of a one-kind encounter.
- Smallest fix: `"UNCHECKED" if unit_unchecked else …`; assert `unit_keys_unchecked == 0` on the fixture in the
  chain; add a mixed plant (delete the source rows of one key of a two-key encounter, OLD MATCH and NEW MISMATCH).
  Alternatively, correct the two sentences to "only when no key of the encounter has source rows".

**N2, minor. R5 §30 says B4's OLD arm asserts exit 0 and the summary line; the code accepts exit 0 or 1 with no
summary check.**
- Where: R5 l.1743, against `tools/p18_b_negctl.sh:61` (`[ $RC -le 1 ]` and no `INPUT-ERROR`). The executor's own §7 R3
  reason admits this, so the documents disagree with each other.
- Failure scenario: the OLD comparator crashes with a traceback (exit 1) and the arm still passes. In this run the
  transcript shows a real summary (`RESULT: DIFFERENCES`, `chain/p18_b_negctl.txt` B4 block), so the evidence is fine
  and the assertion is weak.
- Smallest fix: assert `RESULT:` in the OLD output, or reword l.1743.

**N3, minor (unlisted limit). B4's trigger also broke the oracle's stage restore, and a FAILED fixture batch exits 4,
the value the driver treats as normal.**
- Where: `chain/b4_stop_rule_driver.log:34` `STAGE-RESTORE-ERROR … p18 injected save failure (NOT restored …)`, l.36
  `FAILED … pre-reset state NOT restored`, l.55 `exit 4`. In `tools/p14_edge_run.sh:219-221`, fixture rc 4 is "the
  only expected value"; l.195 greps `FAILED` into the log but gates nothing. Oracle docstring l.31-33: exit 4 covers
  FAILED batches and out-of-envelope visits alike.
- Failure scenario: a fixture batch FAILS for a non-form reason after all 27 visits logged `sukses=true`, for example
  the WRITER-ALIVE path (oracle l.78) or a failed stage drop. The oracle exits 4, neither the stop rule nor
  FORM-INCOMPLETE fires, the driver reports `P15E OK`, and the comparators run on a clone the oracle marked FAILED.
  B4 passed for the right reason (the sukses count), but it was a compound injection that R5 §30 describes as a
  single save failure.
- Smallest fix: in the driver, treat `date …: FAILED` or `STAGE-RESTORE-(ERROR|UNVERIFIED|MISMATCH)` in the fixture log
  as rc 1, and add one sentence to R5 §30 about the compound failure.

**N4, minor. `a1_clone_state.txt` carries an unexplained "drop time" inside P18's own lock window.**
- Where: `evidence/p18/a1_clone_state.txt:33-34` `mysql binlog/ddl drop time: 2026-10-27 00:51:28`. The lock was
  acquired at 00:50:54Z, the baseline was taken at 00:51:12Z and already shows no clone, and the pre-lock capture
  shows none either. So this value cannot be the clone's drop time. It matches the file's own write time to within
  about 1 s. The file has no timestamp header and no command. Line 5, `harness/java procs: 1` at the start, is also
  unexplained, and the final check uses a different filter (`chain.log.txt:230`).
- Failure scenario: a reader concludes that P18 dropped the clone under its own lock with no transcript, which
  contradicts R5 l.1718-1720.
- Smallest fix: annotate the line with what the command printed (most likely the query time) and name the process
  counted on l.5.

**N5, minor. Two fail-open paths remain in `p15_kill_run_harness`, and handoff item 24 says it "fails closed".**
- (a) `p15_lib.sh:65-67`: if the leader exits between `kill -0` and `ps -o pgid= -p`, `pg` is empty, the code prints
  "not a process-group leader - not signalled", and `rc` stays 0 while the JVM may still be in the group. This is
  the M3a scenario in a narrow window.
- (b) `p15_group_alive` (l.40) reads a failing `ps` as "no live member". The dead-leader branch then `continue`s with
  rc 0, and the TERM loop declares the group dead.
- Smallest fix: when `pg` is empty, fall through to the dead-leader branch; have `p15_group_alive` return 2 when `ps`
  fails, and make the caller set rc 1.

**N6, minor. In this wave the box bytes of 11 tools pinned only by the P14 manifest were not verified.** Those tools
are `p14_live_state.sh` (it produces the final proof), `p14_drop_clone.sh`, `p14_edge_fixture.py` and eight others
(my count of `manifest` in `evidence/release_inventory.json`). The chain checks only the 31-file P18 manifest
(`p18_chain.sh:26-28`). The live state checks P12 (9/15) and P13 (3/6) by count only. These counts are consistent
with 9 and 3 effective pins, but they name no files. The inventory is `--local`. Fix: add a read-only
`sha256sum -c` of the P14 manifest to step 5.

**N7, minor. Record timestamps and preflight history.**
- Failure records `20261027T0105Z` and `T0120Z` describe events after their stamps (the 02:40Z retrace; the 01:22:47Z
  preflight runs). This is the M15 class again.
- `preflight/p18_a_negctl_run2.txt` shows a second, wrong B5 hypothesis that its own result refutes. Neither `0120Z`
  nor R5 l.1748-1750 lists it.
- The final `p18_a_negctl.sh` was first run after the freeze. This breaks §0's rule "run the changed script's own
  regression once on the unfrozen bytes before freezing". It happened to pass, so no fix-up cycle was needed.
- Fix: stamp records with their write time, and list every preflight iteration.

**N8, minor. The hostname redaction does not achieve anything.** The alias replaced in three lock transcripts appears
in 23 committed files. These include this wave's own task doc (`docs/khanza_r5_task_p18_p17_review_fixes.md` l.10,
written after the review flagged it), `ROADMAP.md` and the handoff. The unredacted originals remain in pushed commit
`a60b100`; I matched their hashes from `redaction_note.txt`. The note admits the alias "also appears in public docs".
Fix: decide the policy. If the alias is not secret, drop the redaction claim from R11. If it is, it needs a history
rewrite, which needs the owner.

**N9, minor (unlisted). C5 was partly dropped.** The plan required replacing `evidence/p17/refreeze_lsattr_after.txt`
with a clean capture and marking the garbled original. The file is unchanged (`git diff --name-only a60b100 63ef8ca`
touches only `evidence/p17/lock_acquire_unfreeze.txt` under p17), and §7 amendment 7 does not mention it.

## 5. Claim vs transcript

| Claim (where) | Transcript line | Status |
|---|---|---|
| lib 23/23 | `chain.log.txt:21`; `chain/a_lib_test.txt` | matched |
| P15 A 9/9; P16 A 26/26; P16 E 20/20 | `chain.log.txt:25,29,33` | matched |
| P17 A 37/37; P17 B 31/31 | `chain.log.txt:37,134` | matched (history) |
| P18 A 50/50; P18 B 33/33 | `chain.log.txt:91,171` | matched |
| fixture 27/27, DIFFER 12 / EQUAL 12 / EQUAL-SRC 3, `unit_keys_checked` 57, unchecked 0 | `chain.log.txt:116`; my count: 27 MATCH, `unit_src` 27 MATCH, `B_rows`=1 ×27, per-encounter checked ≥ 1 for all 27 | matched |
| real 300/300, 1,240 entries, EQUAL 181 / EQUAL-SRC 119, fresh-B 300, `unit_keys_checked` 0 | `chain.log.txt:120`; `real300_lines.csv` 1,241 lines including the header; `B_rows`=1 ×300 | matched |
| P13 comparator 300/300; no-since 2, future 1, duplicate 2; 0 failed | `chain.log.txt:124-131,232` (`p13-asserts-failed=0`) | matched |
| line 33/33; B6 6/6 | `chain.log.txt:175,179` | matched |
| suite PASS=39 | `chain.log.txt:188` | matched |
| preservation PASS; `pre-hash exit=0` now real | `chain/e_preservation.log:3,8,31` | matched |
| unit 44/44 (no case added) | `chain.log.txt:199` | matched |
| NC DISCRIMINATING=5 | `chain.log.txt:208` | matched |
| 31/31 frozen, `lsattr` 31/31, local = box 31/31 | `chain.log.txt:3-4,213-214`; `lsattr_chain_start.txt` = `lsattr_chain_end.txt` (31 with `i`); `local_eq_box_manifest.txt` 31 EQUAL; I verified manifest = git 31/31 | matched |
| `.bak_p18` = git `a60b100` | `bak_equals_git.txt`; I verified 5/5 by hash | matched |
| inventory 54 files, 7 manifests, 54/54 | `evidence/release_inventory.json`; I re-ran it and the result is identical | matched (repo vs pins only, as stated) |
| B4: true 26 / false 1, `STOP RULE[fixture]: 1/27`, exit 1, xml `sik`, no grant | `chain/b4_stop_rule_driver.log:56-62`; `chain.log.txt:81-90` | matched (compound failure not mentioned, N3) |
| B4 "one fixture visit's save really fails" | `b4_stop_rule_driver.log:34,56` | matched; the restore also failed |
| A8 `ALL 17 billing rows … drifted` | `chain/a8_drift_hook_line.txt:1` | matched |
| M3c: `-g <pgid>` rc 1, `-g <sid>` 7 lines | `a2_ps_semantics.txt:6-7` | matched |
| B2 discovery 300/300 registration rows `0/0/0` | `a2_c3_poller_and_b2_discovery.txt:8,11` | matched (l.10 shows two columns for a three-column DISTINCT; cosmetic) |
| C3 poller 2,874 / 0 / 0 / 216, filtered | `a2_c3_poller_and_b2_discovery.txt:1-6` | matched |
| T0 clone absent at the start | `lock_free_and_lsattr_before.txt:34-35`; `a1_clone_state.txt:2-4` | matched (see N4) |
| live counts 86,676 / 1,464,593 / 86,488 / 1,100; ledger pin; consumers restored | `chain.log.txt:221-228`, identical to l.11-18 | matched |
| final capture 02:31:39Z, last; release 02:32:25Z | `chain.log.txt:212`; `lock_release.txt:1-6` | matched |
| lock 00:50:54Z-02:32:25Z, free before and after | `lock_free_and_lsattr_before.txt:1-3,44`; `lock_release.txt:5-6` | matched |
| retrace "UNTRACED: 0" (§7, AC-7, record 0105Z) | `retrace_trace_clean.txt:13-14` | matched in meaning; the literal string is not in the file |
| "a billed key with no source row is UNCHECKED -> MISMATCH" (R5 l.1742) | `p15_line_identity.py` `unit_src` line; my synthetic run | **contradicted** (N1) |
| "OLD arms assert exit 0 and the summary line (… B4 …)" (R5 l.1743) | `p18_b_negctl.sh:61` | **contradicted** (N2) |
| "first runs faulty in four places" (R5 l.1748) | `preflight/` (run1 a: 9 FAIL; run2 a: 1 FAIL with a new wrong hypothesis; run1 b: 3 FAIL) | **understated** (N7) |
| redaction with hashes of the originals | `redaction_note.txt`; 3/3 match `a60b100` | matched; ineffective (N8) |

## 6. Could not verify from the repo alone

- Whether `retrace` is clean now. Its traces dir (`self-harness/traces`) is outside this repository. A run against the
  committed `records/traces/` would settle it.
- That nothing wrote to the box between 02:31:39Z and 02:32:25Z besides the lock release. The evidence copy is not
  transcribed. A copy transcript with timestamps would settle it.
- What the `a1` "drop time" query and the `harness/java procs` count actually selected (N4). The command text would
  settle it.
- The box bytes of the 11 P14-pinned tools in this wave (N6). A `sha256sum -c` of the P14 manifest would settle it.
- The exact moment the B4 trigger was created relative to the selected visit's save. There is no timestamp. The
  result (1 false, the restore error) shows the trigger was active in the real run, and a late trigger could only
  fail the control, not pass it.
- The `.bak_p17` / `.bak_p16` directories used as the P16 and P15 OLD arms were not re-hashed in P18. I re-verified
  `.bak_p17` against `bb3a6d8` from the P17 transcript; `.bak_p16` relies on earlier waves.
- Who dropped the P17 T0 clone.

## 7. Recommendation

**Astra v13 should not run on these bytes and documents yet.** The fixes v12 and the P17 review asked for are mostly
real, but v13 would read R5 §30 sentences that the code contradicts (N1, N2), and P18's own Accept rule fails (R3,
R9). A short P19 under one lock, with one freeze cycle, would close it:
1. N1: fail any unsourced key in expect mode; assert `unit_keys_unchecked == 0` in the chain; add a mixed plant.
2. The equal-mode unit gate. **It is worth doing in P19 rather than leaving it as a limit.** It is the same few lines
   (drop `exp is not None` from the source-unit compare and count UNCHECKED in equal mode). The 300-visit compare has
   to be rerun for N1 anyway. Without it, R3 cannot reach 2. If the owner declines, it is an acceptable stated limit,
   because the equal-mode ledger is built from the same source rows and its pin reproduces. But R3 then stays 1 and
   the plan's Accept rule cannot be met.
3. N3: a driver gate on a FAILED fixture batch; one sentence on B4's compound failure.
4. N2, N4, N7, N9 wording and records; N5 (a) and (b); a P14-manifest `sha256sum -c` in the final step (N6); an owner
   decision on N8.

Then rerun the fixture compare, the real-300 compare, `p18_b_negctl.sh`, and the final live-state capture taken last.
That should take well under the P18 wall time. After that, an independent re-score, then v13.
