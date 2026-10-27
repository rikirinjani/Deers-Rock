# Prompt: independent local review and re-score of R5-P19

Run this in a **fresh local Claude Code session** (new conversation, not this one), started with the working directory
`C:\Users\think\Project_v2\Deers-Rock`. No push is needed: everything is committed locally on branch `khanza-r5-p6`
(HEAD `9d91d80`, plus this prompt file if you commit it). Paste everything below the line.

---

You are an independent reviewer. You did not write this work and you have no stake in its score. Your job is to find
out whether the executor's self-score of **23/24 (R5 = 1; the critical items R2, R3, R6, R9 are scored 2)** is earned,
and whether the P19 fixes really close the findings of the previous independent review. History of the executor's
self-scores against the independent reviews: P15 23 vs 17 (+6), P17 18 vs 11 (+7), P18 23 vs 20 (+3). Each review found
claims written from intent, not from transcripts, and the last one found a sentence in a report that the code
contradicted. Assume this may be true again and check, especially every sentence that says what a gate or a control does.

## Ground rules (local, read-only)
- Working directory `C:\Users\think\Project_v2\Deers-Rock`. The work is under `khanza-r5\` (plus `ROADMAP.md`). Start with
  `git status` and `git log --oneline -6`; HEAD should be `9d91d80` (or a docs-only commit after it). If the tree has
  uncommitted changes to `khanza-r5\tools\`, `khanza-r5\evidence\p19\` or the P19 task doc, say so and review the
  committed bytes (`git show HEAD:path`), not the working copy.
- **Read-only. Create exactly one file: `khanza-r5\docs\khanza_r5_p19_review.md`.** Edit nothing else, commit nothing,
  push nothing.
- **No box access.** Do not `ssh` anywhere, do not read `.vps*.env` or `~/.ssh`, do not call any Kaggle tool. The review
  is on the committed evidence only; what the repo cannot show goes in "could not verify".
- **Independence.** Do not read the previous conversation's transcript (`~/.claude/projects/...`), any scratchpad or temp
  directory, or the memory directory. Use only the repo.
- You may run self-contained local code (hashing with `sha256sum`, `bash -n`, `python -m py_compile`, the comparator or
  the extracted gate lines on tiny synthetic inputs, `git show`/`git diff`) and must say what you ran. Local files are
  CRLF on disk; the frozen bytes are LF, so hash with CR removed (`tr -d '\r' < file | sha256sum`) or compare against
  `git show`.
- The repo is public. Never write or quote an IP address, password or key; report a location instead. The ssh alias of
  the box is, by the owner's decision, not a secret.

## What to read first
1. `khanza-r5\docs\khanza_r5_p18_review.md` (the review P19 answers: findings N1-N9) and
   `khanza-r5\docs\khanza_r5_task_p19_p18_review_fixes.md`: §1 verification table, §2 work packages A-C, §4 AC-1..8 and
   limits, §5 owner decisions, §6 rubric (R1-R12, 0/1/2, /24; critical items R2, R3, R6, R9), §7 result, amendments,
   claim table, self-score.
2. `khanza-r5\docs\khanza_benchmark_report_R5.md` §31 and the strike-throughs it added in §30.
3. `khanza-r5\evidence\p19\`: `chain.log.txt`, `chain\` (all transcripts), `preflight\` (kept, including the faulty
   script), `a2_live_equal.txt`, `unfreeze_cycle1.txt`, `refreeze_cycle1.txt`, `r5_p19_frozen_manifest_20261027.sha256`,
   `local_eq_box_manifest.txt`, `bak_equals_git.txt`, `lock_*`, `erratum_p18.md`, `release_inventory_local.json`,
   `retrace_trace_clean.txt`; and `khanza-r5\evidence\release_inventory.json` (now the box output),
   `khanza-r5\evidence\p17\NOTE_refreeze_lsattr_after_garbled.md`.
4. `git diff 63ef8ca 9d91d80 -- khanza-r5/tools` and the new tools `khanza-r5\tools\p19_a_negctl.sh`, `p19_b_negctl.sh`,
   `p19_chain.sh`, `p19_release_inventory.py`.
5. `khanza-r5\records\failures\20261027T10*`, `khanza-r5\records\qms\VER-2026-10-27-DR-KHANZA-R5-P19-001.json` and the
   amendment note on the P18 record, `khanza-r5\records\traces\r5-p19-*`.

## What to check (cite file:line or the transcript line for each)
1. **Claim vs transcript.** For every number in §7 and R5 §31 (23/23, 9/9, 26/26, 20/20, 37/37, 31/31, 50/50, 33/33,
   19/19, 28/28, fixture 27/27 with DIFFER 12 / EQUAL 12 / EQUAL-SRC 3 and `unit_keys_checked` 57, real 300/300 with 1,240
   entries, 181/119, `unit_keys_checked` 698, unchecked 0, P13 comparator, 33/33, 6/6, PASS=39, 44/44, NC 5, 35/35 frozen
   and `lsattr`, inventory 58/58 and 11/11 P14-only) find the line that printed it. Mark: matched / not found /
   contradicted. Re-run the hash comparisons you can: the manifest `evidence\p19\r5_p19_frozen_manifest_20261027.sha256`
   against the committed `tools\` bytes (CR removed), and the `.bak_p19` hashes in `unfreeze_cycle1.txt` against
   `git show 63ef8ca:khanza-r5/tools/<file>` (CR removed).
2. **Does each fix close its finding?** Walk N1-N9 and the equal-mode gap against the diff and the evidence. For each:
   closed / partly / not closed, and why.
3. **The comparator gate (N1, AC-5) — the sentence-versus-code check the last review failed on.** Read
   `tools\p15_line_identity.py`. Extract the exact unit-gate lines and run them on synthetic encounters of your own:
   one sourced key only; one sourced and one unsourced key (the mixed case); no sourced key; a registration-only
   encounter; an AMBIGUOUS/UNMAPPED key (they are excluded from the count: does the encounter still fail some other
   way, in **both** modes?); a key whose billed unit set has two values. Does what R5 §31 and the control headers say
   the gate does match what it does? Can `unit_keys_checked` be 0 while an encounter passes in either mode? Is the
   exclusion of AMBIGUOUS/UNMAPPED keys a hole?
4. **The equal-mode discovery (A2).** It ran an unfrozen patched comparator from a scratch path on live data, read-only.
   Is the decision rule in the task doc honoured and the result (300/300 MATCH, 698, 0) what the transcript shows? Is
   the executor's remark that `pass` was False for all 300 on live adequately handled?
5. **N3 gate.** Read `p15_oracle_batch_failed` and the gate in `oracle_run`. Could the grep patterns match on a clean
   run (false trigger) or miss a FAILED batch (false pass)? Is the control (canned log through the extracted
   `oracle_run`, with `env` shadowed by a function) a faithful exercise of the real function, or can it pass for the wrong
   reason? The task doc admits there is no second live driver run with a restore-only failure: is that acceptable?
6. **N5 kill function.** Read `p15_group_alive` and `p15_kill_run_harness`. Check every return path: is there still any
   path that returns 0 with a harness process alive, or signals an unrelated process? Are the callers' handling of
   return value 2 correct in the wait loop and the confirmation step? Are the shadowing-`ps` controls faithful?
7. **Paired controls.** For every control labelled paired (N1 mixed plant, AC-5 b/c/d, N2, N3, N5a/b/c, and the history
   controls re-run), confirm both arms run on the same setup, the OLD arm is the right predecessor, the OLD arm really
   exhibits the defect, and the NEW arm asserts a reason, not only an exit code. Look for assertions that cannot fail,
   `sed` range extractions that could silently extract nothing, greps that match their own echo.
8. **Final-state ordering.** Is the final live-state capture really the last box capture (timestamps in `chain.log.txt`,
   `lock_release.txt`, evidence copies)? Is anything after it a write to the box? Was the P14-only-tools gap (N6)
   actually closed by running the inventory on the box before the final capture?
9. **Frozen-byte discipline and the pre-flight rule.** Manifest vs git for the 35 files, `lsattr` before/after, one
   cycle, new tools frozen. The executor admits two files (`p19_chain.sh`, the inventory's success path) were not
   pre-flighted unfrozen and scores R5 = 1: is that fair, or too lenient/harsh? Any tool changed after its manifest hash?
10. **Records and retrace.** `retrace_trace_clean.txt`: what does each of its two runs say, and does R5 §31 describe them
    correctly? Are the three failure records accurate, and are their `timestamp_utc` values plausible write times
    (compare with `git log -1 --format=%cI 9d91d80` and the chain timestamps)? Does `erratum_p18.md` correct what it says?
11. **Honesty of the limits.** §4 and R5 §31 list limits (N3 not live-tested with a restore-only failure, B4 unpaired,
    A8 failing branch, the P13 trap path, who dropped the T0 clone, `.bak_p17fix1`, the lost P16 retrace, the B1
    deviation, the pre-flight gaps, the command-line identity, V6, V13, X2, A11, clean-box rebuild, P14 ledger scope, P13
    original summaries). Are there limits the executor did not list? Any sentence in R5 §31, the handoff, `ROADMAP.md`
    or the QMS records that overclaims (look for "paired", "closed", "all", "identical", "built")?
12. **Inventory.** `evidence\release_inventory.json` (box output, 58 files, 8 manifests) vs
    `evidence\p19\release_inventory_local.json`: is the claim "same files, same pinned and on-disk hashes" true (the
    manifest names differ)? Run `python -I tools/p19_release_inventory.py --local khanza-r5` into a temp file and compare.

## Scoring
Re-score §6 R1-R12 on the 0/1/2 scale from the repo evidence only. For each item give your score, the executor's, and one
to three sentences with a citation. Give the total of 24, and say whether the plan's Accept rule (R2, R3, R6, R9 all 2)
is met. Do not round up for effort. If an item the executor left at 2 is lower, say why, with the line you opened.

## Output (`khanza-r5\docs\khanza_r5_p19_review.md`)
1. Verdict in three lines: your total vs 23, whether the self-score is earned, the one most important defect.
2. Rubric table (R1-R12: yours, theirs, reason, citation).
3. N1-N9 and AC-5 closure table (closed / partly / not closed, with the evidence).
4. New findings, most severe first: ID (O1, O2, ...), severity (blocker / major / minor), what is wrong, exact location,
   a concrete failure scenario, the smallest fix.
5. Claim-vs-transcript table from check 1.
6. What you could not verify from the repo alone, and what evidence would settle it.
7. Recommendation: may Astra v13 (a paid external run) go ahead on these bytes and documents? If not, what must change
   first. Say which of the remaining stated limits (P13 trap path, A8 failing branch, B4 unpaired, N3 not live-tested)
   you would require closed before v13 and which are acceptable.

Be adversarial and specific. "Looks fine" is not a finding; say what you opened and what you saw. If a check finds
nothing, say so in one line.
