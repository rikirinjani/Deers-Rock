# R5-P20 independent review (read-only)

Reviewer: independent; no stake in the score. Branch `khanza-r5-p6`. HEAD is `962a88d`, one commit after `875d55a`. It
adds `evidence/p20/c4_rerun.sh` and `docs/khanza_r5_p20_review_prompt.md`, so it is evidence plus the prompt, not docs-only.
The tree was clean (`git status` empty), so the working copy is the committed bytes. Nothing was run against a database or
the box. Paths are relative to `khanza-r5/` unless they start with `ROADMAP.md`.

What I ran (local, self-contained, no network, no DB; scratch files in the OS temp dir, none committed):
- Both manifests against `git show 962a88d:khanza-r5/tools/<f>` and against the working copy with CR removed. Manifest b:
  **39/39 equal** on both. Manifest a: **38/39**. Its `p20_chain.sh` (`cb1545da…`) is in no commit, because `p20_chain.sh`
  first appears in `875d55a` and is already wrapper b there. The two manifests differ in exactly one line (`diff`).
- I **reconstructed wrapper a**: `git show 875d55a:…/p20_chain.sh` with line 22 (`. ./p15_lib.sh`) and lines 105-112 (step
  `3z`) deleted hashes to **`cb1545da…`**, the manifest-a pin and the `.bak_p20fix1` hash in `fixup1_lock_unfreeze.txt`. So
  the fix-up changed exactly those lines and nothing else.
- `.bak_p20_20261027/p15_lib.sh` `5c1fa983…` (`unfreeze_cycle1.txt`) = `git show 9d91d80:khanza-r5/tools/p15_lib.sh`. `.bak_p20fix1`
  cannot be checked against `875d55a^` (the file does not exist there). The reconstruction above settles it.
- `refreeze_cycle1.txt` / `refreeze_fixup1.txt` manifest blocks against manifests a / b: identical. `lsattr` files of chain a
  (start, end), the rerun (end) and chain b (start, end): 39 `i` each.
- `diff` of `c4_rerun.sh` (lines 4-82) against wrapper a (check 9).
- The mutant `sed` of `p20_a_negctl.sh:92` on HEAD `p15_lib.sh`: it deletes exactly l.97-99 (the `ga = 2` block), nothing else.
- The OLD (`9d91d80`) and NEW `p15_oracle_batch_failed` on 14 synthetic one-line logs built from the oracle's own format
  strings, plus a missing-file argument (check 3). My first attempt passed a Windows path and the lib did not source. Every
  case then read "none", the same failure mode as the executor's incident. I re-ran with a POSIX path and a `type -t` guard.
- `python -I` on a temp copy of `tools/p20_release_inventory.py` with manifest b added to its `--local` list. Output
  **byte-identical** to `evidence/p20/release_inventory_local.json`. Python comparison with `evidence/release_inventory.json`
  (= `chain_b/chain/release_inventory_box.json`, `cmp` equal): same 62 names, same pinned and on-disk hashes; 48 `manifest`
  fields differ only by box vs repo naming; 11 `p14_*` entries, 11 ok.
- Address scan: every `+` line of `git diff 9d91d80 962a88d` (152 files) for IPv4 (none at all), RFC1918 / CGNAT
  (`100.64/10`) ranges (none), IPv6 (only colon-joined checksum strings in `A28'` lines), `ts.net|tailscale|passw|secret|token|
  BEGIN … KEY`. Only prose about the rule matched. `git log --all` for the four withdrawn trace names gives no commit
  (check 12).

## 1. Verdict

- **My total: 19/24, against the self-score of 22/24.** I agree with R5 = 1 and R9 = 1. I score R4, R10 and R11 at 1, not 2.
- **The self-score is not earned, and the plan's Accept rule is not met (R9 = 1).** The bytes are good. The O1 helper now
  matches every oracle path that ends in exit 4 and needs it. The O2 mutant really separates the fix. Wrapper a/b differ
  exactly as stated. The final capture is last. The inventory reproduces. What fails is again the documents.
- **Most important defect (Q1):** two P20 records state the opposite of what P20 did. The P19 QMS amendment says "P20 made
  the retrace repeatable from the repository". P19 task-doc addendum 10 says P20 "copied the 15 missing older khanza-r5
  traces into `records/traces/` and committed the full run". The traces were removed. The committed second run still prints
  `UNTRACED: 44` and still hides 16 names ("... and 16 more"). These are sentences written from intent before the traces
  were withdrawn, and never re-read. It is the fifth wave in a row with a sentence that the data contradicts.

## 2. Rubric (task doc §6, 0/1/2)

| # | Mine | Theirs | Reason | Citation |
|---|---|---|---|---|
| R1 | 2 | 2 | Every O-finding was opened at a line before execution, and O2's evidence status ("by reading") is stated honestly. | task doc l.46-57 |
| R2 | 2 | 2 | The helper now matches `STAGE-DROP-FAILED` and both `STAGE-KEEP` forms. I ran OLD vs NEW on the oracle's own format strings (l.943, l.1801, l.1806): none→match for all three, and no false trigger on clean-path lines (`FINAL`, `ORACLE_PARTIAL-NOT-COVERED`, `ALLOW-STRATA`, `stage-drop … verified`, `REPAIR-SKIPPED`, `ABANDON-FAILED`). O6d is paired. The one exit-4 path still unmatched, `WRITER-ALIVE` (l.1218, l.1496), bills nothing, so the A13 gate (`ok != n`) catches it. | `tools/p15_lib.sh:59-61`; §3 check 3 |
| R3 | 2 | 2 | The O2 mutant is exact (3 lines deleted). It gives the other text through `p15_group_is_harness` (l.100-101), so the reason text separates fix from absence. The O4 plant matches `name_maps` + `insrc` (l.78-85, l.170-177). Two weaknesses are not critical (Q4, Q5): the after-TERM case asserts only l.108, and 3z's "none" passes on a missing file. Neither bit in the recorded runs: chain b printed the log names it read. | `chain_b/chain_b.log:40-42,54-57` |
| R4 | 1 | 2 | C1-C3 are struck, not edited, and correct. But the plan's own rule ("a cause stated in a report is checked against the data", §0) is broken twice. The hang record gives `root_cause` "an environmental flake … not a product defect" two lines after saying "Cause of the hang: not established". The new P19 addendum 10 is itself a false correction (Q1). The control sentence "one canned log per pattern" is contradicted by the first canned log (Q6). | `records/failures/20261027T1446Z-…json:9,11`; `docs/khanza_r5_task_p19_p18_review_fixes.md:297-298`; `tools/p20_a_negctl.sh:32` |
| R5 | 1 | 1 | Manifests = git (b 39/39; a 38/39 plus the reconstruction), lsattr 39 everywhere, one fix-up cycle with hashed transcripts. But the new block was not pre-flighted (admitted). §32 l.1905 "every file was run once on the unfrozen bytes" is untrue for the 39-file set: the headers cover 7 files. `p13_wide_sample.sh`, which sources the changed lib, ran neither in pre-flight nor in any chain (Q3). Wrapper a, which ran the full chain, is in no commit. 1 is fair. | `preflight/pre_hashes.txt`; `p13_wide_sample.sh:35` |
| R6 | 2 | 2 | Chain b's step 5 (14:43:02Z) is the last capture. After it come only `copy_log.txt` [6] (a tar read) and [7] (the release, 14:43:20Z), and `lock_release.txt` agrees (14:43:21Z). The header of `copy_log.txt` is wrong (Q2), but that is a document defect, not a state defect. Every box write between 14:39:03Z and 14:43:02Z is evidenced in the fix-up transcripts. | `chain_b/chain_b.log:63-81`; `copy_log.txt:1,12-15` |
| R7 | 2 | 2 | No full chain ran on manifest b. But my reconstruction shows wrapper b = wrapper a + the source line + 3z, so every other step of the full chain ran byte-identically on the 38 shared files. C4 27/27 and 300/300 come from the rerun, which runs wrapper a's lines exactly (check 9). Its two helper assertions were vacuous, but chain b's 3z re-checked those two rerun logs with the lib sourced (`none`, `none`). | `rerun.log.txt:41-67`; `chain_b/chain_b.log:55-56` |
| R8 | 2 | 2 | I reproduced the local inventory byte for byte. Box and local agree on all 62 pins and on-disk hashes, with 10 manifests. The temporary script copy is disclosed (§32 l.1952-1954; §7 amendment 5). Minor: the JSON's own `generated_by` names the frozen script, not the temp copy. | `evidence/p20/release_inventory_local.json` |
| R9 | 1 | 1 | AC-7 is scored "partly" in §7, in §32 and in QMS P20, which is honest. But the retrace is not "exactly scoped": the plan (C4) required the second run "committed in full (not cut …)", and it still hides 16 of 44 names (`retrace_trace_clean.txt`, "... and 16 more"). Two records also claim the opposite (Q1). Not 0, because the primary documents say it correctly. | `evidence/p20/retrace_trace_clean.txt`; task doc l.124-128 |
| R10 | 1 | 2 | The QMS P19 amendment carries a false sentence (Q1). Three failure records share the identical stamp `14:44:27Z` under file names T1444Z/T1445Z/T1446Z, which does not look like one stamp per record at write time. Not every pre-flight iteration is listed in §32: the fix-up pre-flight ended `ASSERT FAIL inventory … not_ok (got 1)`, `asserts-failed=1` (expected on unfrozen bytes, but unreported), and the second pre-flight driver run (`driver (2nd)`, `c4_fixture_only2.log`) is not explained. | `records/qms/VER-…-P19-001.json:108`; `preflight/fixup1_chain_short.txt:64,86`; `preflight/pre_summary.txt` |
| R11 | 1 | 2 | Overclaims: §32 l.1905 "every file"; the `copy_log.txt` header ("All are reads … the only write"); the hang record's "not a product defect"; handoff 26 "one pattern per canned log"; ROADMAP row XI "P1–P20 done" while P20 fails its own Accept rule. Unlisted limits: Q3 (`p13_wide_sample.sh` and O6d never run), Q5 (3z vacuous modes), and the first chain's full oracle log not committed (the `STAGE-KEEP` claim rests on code reading and an unlogged-output read, `copy_log.txt` [5]). | as cited |
| R12 | 2 | 2 | O6d kept as the owner decided. The trace copy was done and then withdrawn for a reason that is recorded. Minor: all 15 traces were withdrawn, not just the 4 with addresses, and that choice is not explained. | `records/failures/20261027T1449Z-…json` |
| **Total** | **19/24** | **22/24** | **Accept rule not met: R9 = 1** (R2, R3, R6 = 2). | |

## 3. O1-O6 closure

| ID | Status | Evidence |
|---|---|---|
| O1 | **closed (code); claim fixed** | `p15_lib.sh:60` adds `STAGE-DROP-FAILED\|STAGE-KEEP`. Exit-4 paths of the oracle (§4 check 3 table): every path that can follow a run where all visits are `sukses=true` now matches. The paired canned control (`chain.log.txt:70-77`) is faithful: the only difference between arms is the sourced lib, and the three P19 patterns returning 10 under OLD prove the OLD lib was really sourced. Handoff 25 is struck and annotated. The false-trigger evidence is adequate: the helper reads the full `/tmp/p15e_<label>.log` (`p14_edge_run.sh:213`), not the driver's grep subset, and the "real clean" logs are full copies of it (l.200). |
| O2 | **closed** | `p20_a_negctl.sh:85` keeps stderr. NEW gives `ps failed…` (1/alive/1), MUTANT gives 1/0/1 with "no member looks like" (`chain.log.txt:83-84`). I checked that the `sed` range removes exactly l.97-99. The after-TERM case reaches the wait loop and the confirmation step, but only l.108 is discriminated (Q4). |
| O3 | **closed** | R5 l.1811 struck with the right cause; `erratum_p19.md` §1 matches `a2_live_equal_encounters.json` (`B` empty, `B_rows` 0). |
| O4 | **closed** | Amendment 9 (P19 addendum) plus `p20_b_negctl.sh`. The plant gives two codes for one name, both in the source rows, so `insrc` has length 2 and the result is `AMBIGUOUS` (`p15_line_identity.py:170-177`). The comparator also reaches verdict AMBIGUOUS ahead of DIFFER (l.215). Labelled "same bytes, new coverage", which is honest: the P18 comparator would also have failed it (as UNCHECKED), so no OLD arm can discriminate. |
| O5 | **partly** | AC-7 is marked "partly" in §7, §32 and the erratum. But the second run is still truncated (16 names hidden), so the plan's C4 "committed in full" is not done, and two records claim the opposite (Q1). |
| O6a | **partly** | `copy_log.txt` exists and covers everything after the true final capture. Its header anchors to the wrong capture and claims "All are reads" (Q2). |
| O6b | **closed** | P19 QMS `amendments` adds the pre-flight gaps and AC-7. But see Q1 for its last O5 line. |
| O6c | **closed** | `p20_chain.sh:45-47` labels say "on the P20 bytes"; `p19_chain.sh` stays frozen as history. |
| O6d | **closed** | `p15_lib.sh:76-78`; paired 0→1 for empty and letters-only (`chain.log.txt:86-89`). Check 6: no normal flow breaks. The oracle writes the `.pid` file once, right after `Popen` (`sampled_real_form_diff_r5.py:989-991`), and never truncates it. The file is empty only in the microsecond window between `open` and close, while a harness group already runs. Old code silently skipped a live harness there; new code says NOT CONFIRMED, which is the correct result. |

## 4. New findings (most severe first)

**Q1, major (claim) / minor (impact). Two P20 records say P20 made the retrace repeatable and committed the full run; it did neither.**
- Where: `records/qms/VER-2026-10-27-DR-KHANZA-R5-P19-001.json:108`: "P20 O5: … P20 made the retrace repeatable from the
  repository". `docs/khanza_r5_task_p19_p18_review_fixes.md:297-298` (addendum 10): "P20 copied the 15 missing older khanza-r5
  traces into `records/traces/` and committed the full run".
- Data: `git log --stat 9d91d80..962a88d -- khanza-r5/records/traces` adds only the four `r5-p20-*` traces.
  `evidence/p20/retrace_trace_clean.txt` second run: `UNTRACED: 44`, `[evidence/] (31 files)` with "... and 16 more". R5 §32,
  §7 amendment 4 and the erratum §6 all say the traces were removed and AC-7 is partly met. The two records were written from
  the plan, not re-read after the withdrawal.
- Scenario: Astra v13 or a later reviewer reads the P19 QMS record and takes AC-7 as met.
- Fix: amend both lines (strike, not edit). Commit the full 44-name list (the tool's per-directory cap can be bypassed by
  scoping `--project-root` to `evidence/p11`, or by a one-off script).

**Q2, minor. `copy_log.txt` header anchors to a capture that is not final and claims all later box commands were reads.**
- Where: `evidence/p20/copy_log.txt:1`: "every box command after the final live-state capture (rerun chain step 5,
  2026-10-27T14:39:03Z). All are reads (tar/cat); the lock release is logged at the end." [4] says "(the only write: the lock
  release)".
- Data: between [5] (14:39:58Z) and [6] (14:43:18Z) the box was re-locked, unfrozen, edited (deploy of wrapper b, a write that
  no transcript shows as a command), pre-flighted (a `P20_SHORT` run, which spawns processes and writes into `results/`),
  re-frozen and run as chain b (`fixup1_lock_unfreeze.txt`, `refreeze_fixup1.txt`, `chain_b.log`). None of this is in the log,
  and it contradicts the header relative to its own anchor. Chain b also overwrote the first chain's box copies of
  `live_state_*`, `lsattr_chain_*`, `release_inventory_box.json`, `a_lib_test.txt` and `p20_a_negctl.txt` in
  `/opt/dr-benchmark/p20/chain`. The local `chain/` keeps the first-chain versions (header 14:09:20Z), because [1] copied them first.
- Fix: re-anchor the header to 14:43:02Z (chain b step 5), and state that [1]-[5] predate the final capture.

**Q3, minor (unlisted limit). `p13_wide_sample.sh` sources the changed lib and was never run in P20; the "every file" sentence overclaims.**
- Where: R5 l.1905 "every file was run once on the unfrozen bytes, each transcript starting with `sha256sum` lines that equal
  the frozen hashes". `preflight/pre_hashes.txt` hashes 7 files, and its `p20_b_negctl.sh` hash (`376d907b…`) is not the frozen
  one (`56694cfb…` is in `pre_hashes_b2.txt`; disclosed in §32). Of the 39 frozen files, about 17 ran in pre-flight. The plan's
  §0 says "every file in the new manifest". `p13_wide_sample.sh:35` calls `p15_kill_run_harness`, whose behaviour O6d changed,
  and it appears in no pre-flight, no chain and no control.
- Scenario: a P13-driver cleanup that meets an empty pid file now exits 3 where it used to continue. That is correct, but
  unexercised, and the P13 driver's trap path is already a stated limit.
- Fix: replace "every file" with the list that actually ran, and add `p13_wide_sample.sh` (O6d) to the stated limits.

**Q4, minor. The after-TERM case asserts only the post-KILL message, not the wait loop.**
- Where: `p20_a_negctl.sh:104-110`; R5 l.1899 "a `ps` that fails only after the TERM gives rc 1 and `still alive (or unknown)
  after KILL`". The header says it "exercises the wait loop and the confirmation step".
- Analysis: `p15_lib.sh:106` (wait loop, `-eq 1`) and l.107 (`-ne 1` → KILL) both run. But if either were changed to treat 2 as
  dead, l.108 would still print the message and the case would pass. Only l.108 is discriminated. The text says "exercised",
  which is true, so this is weak coverage rather than an overclaim.
- Fix: assert the elapsed time (≥ 10 s means the loop did not break on 2), or count the shadow `kill -KILL` calls.

**Q5, minor. 3z's "none" assertions pass on a missing log, and its positive control can be silently skipped.**
- Where: `p20_chain.sh:107-112` (and l.74). `OL=$(ls -t … | head -1)`; with no log, `p15_oracle_batch_failed ""` is `grep` exit 2,
  so the result is "none" and the assertion passes (I ran it: `grep: : No such file or directory` / `none`). The positive control is
  `if [ -f "$PL" ]; then asrt …; else echo "… absent"; fi`, so an absent file adds no failure to `AF`. The fix-up record's own
  rule ("an assertion of 'no match' always has a positive control in the same run") is therefore not enforced.
- Scenario: a box rebuild or a cleaned `p15/runs/` (the third home), where step 3z passes with only the `type -t` assertion doing any work.
- Evidence it did not bite: `chain_b.log:55-57` prints the two log names and `match` for the positive control.
- Fix: `asrt … "$([ -f "$OL" ] && … || echo missing)" none`, and make an absent `$PL` an `asrt` failure.

**Q6, minor. "One canned log per pattern" is not true of the first canned log.**
- Where: `p20_a_negctl.sh:32`: the `failed` line holds both `: FAILED (` and `NOT restored` (my `grep -c` per pattern: 1 and 1).
  Handoff 26 (l.49) and R5 l.1898 say "one canned log per pattern". The `notrestored` line (l.34) is also invented text, not one
  of the oracle's own `NOT restored` strings, which all sit inside `STAGE-RESTORE-ERROR` or `: FAILED (` lines.
- Impact: the `: FAILED (` pattern is never tested alone in a canned log. The real logs (B4, the first chain's failed real-300
  log) do carry it, so the gap is in the sentence, not in coverage of the real shapes.
- Fix: drop `NOT restored` from the `failed` line, or reword the claim.

**Q7, minor (claim). The hang record gives a root cause that it says is not established.**
- Where: `records/failures/20261027T1446Z-test-r5-p20-first-chain-harness-hang.json:9` "Cause of the hang: not established" vs
  l.11 `"root_cause": "An environmental flake of the GUI harness, not a product defect"`.
- My own assessment (check 8a): no P20-changed byte executes during the oracle's batch loop. The lib functions run only
  before and after `env RUN_ID=… $ORACLE` (`p14_edge_run.sh:177-218`); the oracle and harness bytes are unchanged; `p20_a`
  finished at 13:04:08Z and its stray-process cleanup names `BilingHarness_p20`, which `_harness_writers` would not take as a run
  visit. The hang began in batch 2027-02-19 at about 13:17:30Z, after 115 visits billed (`c4_driver.log:193-205`). So "not caused
  by P20" is well supported. But "environmental, not a product defect" is not: the harness log of that batch and the system load
  are not in the repo, and the harness is part of the product under test.
- Fix: `root_cause`: "not established; no P20 byte runs inside the batch loop; harness log not kept".

**Q8, minor. Small accuracy points.**
- The 1445 record quotes `p20_chain.sh: line 73: … command not found` "twice per run, in the first chain and in the rerun". The
  rerun prints `/opt/dr-benchmark/p20/c4_rerun.sh: line 65` (`rerun.log.txt:54,56`).
- The rerun's step-5 banner says "the last box capture of this wave", copied from the chain; it was not the last (`rerun.log.txt:78`).
- The rerun's `asserts-failed=0` includes the two vacuous helper assertions. §32 does not say so next to "asserts-failed 0",
  though chain b re-checked those logs.
- ROADMAP row XI (l.370) "P1–P20 done" while P20 fails its own Accept rule.

## 5. Claim vs transcript

| Claim (R5 §32 / §7) | Transcript line | Status |
|---|---|---|
| lib 23/23; P15 A 9/9; P16 A 26/26, E 20/20; P17 A 37/37; P18 A 50/50; P19 A 19/19 | `chain.log.txt:21,25,29,33,37,41,64` | matched |
| P17 B 31/31; P18 B 33/33; P19 B 28/28 | `chain.log.txt:148,185,217` | matched |
| P20 A 25/25; P20 B 10/10 | `chain.log.txt:93,231`; `chain_b.log:50` | matched |
| line 33/33; B6 6/6; suite PASS=39; preservation PASS; unit 44/44; NC 5 | `chain.log.txt:235,239,248,254,259,268` | matched (first chain, wrapper a) |
| O1 three new OLD 4 / NEW 10; three old 10/10; clean 4/4; real none/none/match | `chain.log.txt:70-81` | matched (Q6: the first log holds two patterns) |
| O2 text, mutant other text, after-TERM text | `chain.log.txt:83-85` | matched (Q4) |
| O6d 0→1 ×2; two unchanged | `chain.log.txt:86-91` | matched |
| First chain: timeout 1800 s, `harness rc=-1`, 115/300, FORM-INCOMPLETE, `P15E FAILED` | `chain/c4_driver.log:201,205`; `chain.log.txt:108-112` | matched |
| "the oracle's timeout, writer-dead proof and hash-verified stage restore worked" | `c4_driver.log:201-205` (`group_empty=true`, `STAGE-RESTORED-VERIFIED`) | matched |
| first chain `c4=1 real=1 asserts-failed=2` (p13 positive, real compare) | `chain.log.txt:138,145,296` | matched |
| vacuous assertions, `command not found` ×2 per run | `chain.log.txt:132,134`; `rerun.log.txt:54,56` | matched (rerun names `c4_rerun.sh: line 65`, Q8) |
| the failed real-300 log "contained a FAILED batch and STAGE-KEEP" | `c4_driver.log:205` shows the FAILED line; STAGE-KEEP is **not** in the committed driver subset; the full oracle log is not committed; `copy_log.txt` [5] read it but its output is not kept | **not found** (consistent with code: FAILED + `restored=True` → `held` → l.1806) |
| rerun fixture 27/27, DIFFER 12 / EQUAL 12 / EQUAL-SRC 3, 57/0 | `rerun.log.txt:41` | matched |
| rerun real 300/300, 1,240 entries, 181/119, fresh-B 300, 698/0, all `unit_src` MATCH | `rerun.log.txt:45,53` | matched |
| real run 1,565 s; P13 300/300; asserts-failed 0 | `rerun.log.txt:31,61,98` | matched (Q8: includes 2 vacuous) |
| rerun = "same commands as steps 3-3c, 3g, 4e and 5" | my `diff` of `c4_rerun.sh:4-82` vs wrapper a: identical apart from a rerun-specific step 0 (no `lsattr_chain_start`, no consumers line) and `B=…/rerun` | matched |
| 3z: function / none / none / match | `chain_b.log:54-57` | matched |
| inventory on the box 62/62, 10 manifests; 11 P14-only 11/11 | `chain_b.log:60`; my count in `release_inventory.json` (11/11) | matched |
| local inventory "same files, same pinned and on-disk hashes" | my reproduction: byte-identical; hashes equal to box | matched |
| 39/39 frozen, `lsattr` 39/39 (a and b) | `chain.log.txt:3-4,277-278`; `chain_b.log:3-4,64-65`; `refreeze_*`; my `lsattr` file counts | matched |
| manifests = git; differ in exactly one line | my hashing: b 39/39; a 38/39 + reconstruction `cb1545da` | matched |
| local = box 39/39 for manifest b | `local_eq_box_manifest_b.txt` (39 EQUAL, command and time in header) | matched |
| `.bak_p20` = git `9d91d80` | `bak_equals_git.txt`; my `git show` hash `5c1fa983` | matched |
| lock 12:20:30Z-14:39:40Z and 14:40:42Z-14:43:21Z | `lock_free_and_lsattr_before.txt (first and last blocks)`; `lock_release.txt`; `fixup1_lock_unfreeze.txt:1-4` | matched |
| final capture 14:43:02Z last; afterwards only logged reads and the release | `chain_b/chain/live_state_final.txt:1`; `copy_log.txt:12-15` | matched (Q2: the header names a different "final" capture) |
| "every file was run once on the unfrozen bytes … sha256sum lines that equal the frozen hashes" (R5 l.1905) | `preflight/pre_hashes.txt` (7 files; `p20_b` = `376d…`, not frozen), `pre_hashes_b2.txt`, `pre_summary.txt` | **contradicted** for "every file" (Q3) |
| P19 QMS amendment "P20 made the retrace repeatable from the repository" | `retrace_trace_clean.txt` second run `UNTRACED: 44` | **contradicted** (Q1) |
| P19 addendum 10 "copied the 15 … traces … and committed the full run" | `git log --stat`; retrace "... and 16 more" | **contradicted** (Q1) |
| `copy_log.txt` "All are reads … the only write" after 14:39:03Z | `fixup1_lock_unfreeze.txt`, `refreeze_fixup1.txt`, `chain_b.log` (14:40:42Z-14:43:02Z) | **contradicted** (Q2) |
| retrace: first run clean; second 44 uncovered; AC-7 partly | `retrace_trace_clean.txt` | matched (full list not committed) |

## 6. Check-by-check notes not covered above

- **Check 3, O1 against the producer.** Paths that set exit 4 (`sampled_real_form_diff_r5.py`) and the line each one logs:
  (a) a FAILED batch, as `date d: FAILED (…)` (l.1599, l.1632, l.1657, l.1563), which both versions match;
  (b) out-of-envelope strata, with no failure line, which both are silent on (correct for the fixture);
  (c) a stage-drop failure, as `STAGE-DROP-FAILED` (l.943, l.1811-1817), which only NEW matches;
  (d) unrestored stage tables, as `STAGE-KEEP … not verifiably restored` (l.1801), which only NEW matches;
  (e) a held batch, as `STAGE-KEEP … held for --retry-failed` (l.1806), which only NEW matches;
  (f) `WRITER-ALIVE` (l.1218 → return 4 at l.1496), which neither matches, but nothing is billed, so `FORM-INCOMPLETE` fires;
  (g) `failed and rc == 0` (l.1580), which always follows (a);
  (h) `ABANDON-*`/`RETRY-*`, which only run with `--retry-failed/--abandon-failed`, flags the driver never passes. `ABANDON-FAILED (`
  and `RETRY-FAILED (` do not match `: FAILED \(` (verified).
  `STAGE-RESTORE-UNVERIFIED/MISMATCH` alone do not match, but each caller then logs a `FAILED (` line (l.1657).
  No false trigger on the clean path.
- **Check 4.** `od_test` (`p20_a_negctl.sh:39-52`) shadows `env`, `SQL`, `res` and `p15_count_sukses` *after* sourcing the lib,
  and extracts `oracle_run` verbatim by `sed` range. `p15_stop_rule_fires` is identical in both libs (my diff touches only l.56-60
  and l.76-78). So OLD 4 / NEW 10 can only come from the helper. stderr is discarded, but a missing OLD lib would make the three
  P19-pattern rows read 4/10 and fail, so the pair carries its own positive control.
- **Check 8b.** The diagnosis is right. Wrapper a had no `. ./p15_lib.sh` (my reconstruction). `f && echo match || echo none`
  turned "command not found" into "none". The fix (source the lib, `type -t` assertion, positive control) is sound, apart from Q5.
- **Check 10.** First chain 14:09:20Z, rerun 14:39:03Z, chain b 14:43:02Z, in that order. Chain b is last. `lock_release.txt`
  agrees. Only Q2 is wrong.
- **Check 13.** The retrace file describes its two runs correctly. The first run (3,881 traces, outside the repo) cannot be reproduced.
- **Check 15.** The temporary script copy is disclosed (§32, §7 amendment 5). It is acceptable: the output equals the box run's
  hashes, and I reproduced it byte for byte.

## 7. Could not verify from the repo alone

- The first chain's full real-300 oracle log (`oracle_20261027T130408Z.log`, 57,042 bytes on the box) and the output of the
  `copy_log.txt` [5] grep: these would show the `STAGE-KEEP` line and the batch-2027-02-19 harness log, which bears on the hang's cause.
- The deploy command and time of wrapper b (between 14:40:42Z and 14:41:29Z). Only the unfreeze and re-freeze are transcribed.
- That `c4_rerun.sh` as committed (in `962a88d`, after the P20 commit) is the byte sequence that ran. Its line numbers match
  `rerun.log.txt:54` ("line 65"), but no hash was taken at run time.
- The full 44-name list of the second retrace run (16 hidden), and the first retrace run.
- "Nothing else of mine ran on the box at the time" of the hang; the system load during it.
- The `.bak_p15` … `.bak_p19` box directories used as OLD arms by the history controls (not re-hashed in P20).

## 8. Recommendation

**Astra v13 may go ahead on these bytes after a documents-only fix-up, with no box access needed.** The frozen bytes are what
the manifests say, I found no safety path the helper misses that the A13 gate does not catch, and the final state is proven last.
What v13 would trip on is again in the records. Before v13, I would require:
1. Q1: strike the two false lines (P19 QMS amendment, P19 addendum 10), and commit the full 44-name retrace list.
2. Q2: re-anchor the `copy_log.txt` header. Q7: correct the hang record's `root_cause`.
3. Q3: replace "every file" in R5 l.1905 with the list that ran, and add `p13_wide_sample.sh`/O6d to the limits.

Recommended at the next unfreeze, but not blocking v13: Q5 (3z missing-file guard, positive control as an `asrt`), Q4, Q6.

On the stated limits:
- **P13 EXIT-trap restore:** acceptable only if v13 does not drive `p13_wide_sample.sh`. If it does, close it first, together with Q3.
- **A8's failing branch:** acceptable, if v13 is told that only the success line is evidenced.
- **B4 unpaired:** acceptable. It is a real form failure, and the stop-rule branch predates P17.
- **O1 not exercised by a live stage-drop failure:** acceptable. The canned control is faithful and the patterns are the oracle's literal words.
- **No full chain on manifest b:** acceptable. Wrapper b differs from a by exactly the source line and 3z (I reconstructed the hash), and 3z ran on b.
- **44 uncovered retrace files:** acceptable for v13 once the full list is committed and the two contradicting records are fixed.
  Coverage of P11-era files does not bear on what v13 evaluates.

**On the iteration pattern: stop iterating and run v13 after the documents-only fix-up.** Each wave's review has found smaller
defects: P19's O1 was a real missed safety path, while P20's findings are a stale record sentence, a misanchored header, an
unchecked cause and a missing-file guard. The bytes have converged, and the remaining defect class is that the executor writes
records from the plan and does not re-read them after the plan changes. Another fix-and-review wave on the bytes will not cure
that. A mechanical check will: before each commit, grep every new record line for the plan's verbs ("copied", "committed",
"made … repeatable", "every", "all") and open the file each one names. An external evaluator (v13) is now the better use of
the budget than a seventh internal review.
