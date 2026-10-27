# Prompt: independent local review and re-score of R5-P18

Run this in a **fresh local Claude Code session** (new conversation, not this one), started with the working directory
`C:\Users\think\Project_v2\Deers-Rock`. No push is needed: everything is committed locally on branch `khanza-r5-p6`
(HEAD `63ef8ca`, plus this prompt file if you commit it). Paste everything below the line.

---

You are an independent reviewer. You did not write this work and you have no stake in its score. Your job is to find
out whether the executor's self-score of **23/24 (R3 = 1, a critical item)** is earned, and whether the P18 fixes
really close the findings of the previous independent review. History: P15 self-scored 23/24 and was reviewed at 17/24;
P17 self-scored 18/18 and was reviewed at 11/18. Both reviews found claims written from intent, not from transcripts.
Assume the same may be true here and check.

## Ground rules (local, read-only)
- Working directory `C:\Users\think\Project_v2\Deers-Rock`. The work is under `khanza-r5\` (plus `ROADMAP.md`).
  Start with `git status` and `git log --oneline -6`; HEAD should be `63ef8ca` (or a docs-only commit after it). If the
  tree has uncommitted changes to `khanza-r5\tools\`, `khanza-r5\evidence\p18\` or the P18 task doc, say so and review
  the committed bytes (`git show HEAD:path`), not the working copy.
- **Read-only. Create exactly one file: `khanza-r5\docs\khanza_r5_p18_review.md`.** Edit nothing else, commit nothing,
  push nothing.
- **No box access.** Do not `ssh` anywhere, do not read `.vps*.env` or `~/.ssh`, do not call any Kaggle tool. The review
  is on the committed evidence only; what the repo cannot show goes in "could not verify".
- **Independence.** Do not read the previous conversation's transcript (`~/.claude/projects/...`), any scratchpad or
  temp directory, or the memory directory. Use only the repo.
- You may run self-contained local code (hashing with `sha256sum`, `bash -n`, `python -m py_compile`, the comparator
  on tiny synthetic inputs, `git show`/`git diff`) and must say what you ran. Local files are CRLF on disk; the frozen
  bytes are LF, so hash with CR removed (`tr -d '\r' < file | sha256sum`) or compare against `git show`.
- The repo is public. Never write or quote an IP address, hostname, password or key; report a location instead.

## What to read first
1. `khanza-r5\docs\khanza_r5_p17_review.md` (the review P18 answers: findings M1-M16) and
   `khanza-r5\docs\khanza_r5_task_p18_p17_review_fixes.md`: §1 verification table, §2 work packages A-C, §4 AC-1..8 and
   limits, §6 rubric (R1-R12, 0/1/2, /24; critical items R2, R3, R6, R9), §7 result, amendments, claim table, self-score.
2. `khanza-r5\docs\khanza_benchmark_report_R5.md` §30 and the strike-throughs added in §27-§29.
3. `khanza-r5\evidence\p18\`: `chain.log.txt`, `chain\` (all transcripts), `preflight\` (the faulty first runs, kept),
   `a1_clone_state.txt`, `a2_*.txt`, `unfreeze_cycle1.txt`, `refreeze_cycle1.txt`, `r5_p18_frozen_manifest_20261027.sha256`,
   `local_eq_box_manifest.txt`, `bak_equals_git.txt`, `lock_*`, `redaction_note.txt`, `retrace_trace_clean.txt`.
4. `git diff a60b100 63ef8ca -- khanza-r5/tools` and the new tools `khanza-r5\tools\p18_a_negctl.sh`, `p18_b_negctl.sh`,
   `p18_chain.sh`, `p18_release_inventory.py`.
5. `khanza-r5\records\failures\20261027T01*`, `khanza-r5\records\qms\VER-2026-10-27-DR-KHANZA-R5-P18-001.json`,
   `khanza-r5\records\traces\r5-p18-*`.

## What to check (cite file:line or the transcript line for each)
1. **Claim vs transcript.** For every number in §7 and R5 §30 (23/23, 9/9, 26/26, 20/20, 37/37, 31/31, 50/50, 33/33,
   27/27 with DIFFER 12 / EQUAL 12 / EQUAL-SRC 3 and `unit_keys_checked` 57, 300/300 with 1,240 entries and 181/119,
   P13 comparator 300/300, 33/33, 6/6, PASS=39, 44/44, NC 5, 31/31 frozen and `lsattr`, 54/54 inventory) find the line
   that printed it. Mark: matched / not found / contradicted. Re-run the hash comparisons you can: the manifest
   `evidence\p18\r5_p18_frozen_manifest_20261027.sha256` against the committed `tools\` bytes (CR removed), and the
   `.bak_p18` hashes in `unfreeze_cycle1.txt` against `git show a60b100:khanza-r5/tools/<file>` (CR removed).
2. **Does each fix close its finding?** Walk M1-M16 against the diff and the evidence. For each: closed / partly / not
   closed, and why. Pay particular attention to: M2 (`RCH=$?` now directly after the hash step, sidecars only on exit 0;
   read the lines around the patch, the P16 glue class), M3 (`p15_kill_run_harness`, `p15_group_alive`,
   `p15_group_is_harness`: any path that still returns 0 with a harness process alive, any path that signals an
   unrelated process, whether the dead-leader identity check by command line is sound), M4 (the P13 tail), M7 (B4).
3. **Paired controls.** For every control labelled paired (B1, B2a-d, B3, the A28′/A31′ predicate pairs, B7a, B7b, B3a,
   B4-comparator, N4, A12, N7), confirm both arms run on the same setup, the OLD arm is the right predecessor bytes, the
   OLD arm really exhibits the defect, and the NEW arm asserts a reason, not just an exit code. Look for assertions that
   cannot fail, greps matching their own echo, `sed` range extractions that could silently extract nothing, shell glue.
4. **The B4 stop-rule run.** Is the injected failure real (a form save that actually fails)? Is creating the trigger
   after `oracle[fixture]: run start` sound (race)? Can the run pass for the wrong reason? Is "new bytes only" honest?
5. **B7 and the stated AC-5 gap.** Read `tools\p15_line_identity.py`. Can `unit_keys_checked` be 0 while an encounter
   passes in expect mode? Is `UNCHECKED -> MISMATCH` reachable and tested? Is the equal-mode (real 300) absence of a
   source-unit gate adequately disclosed, and does it justify R3 = 1, or lower, or higher?
6. **Final-state ordering (the P17 M1 defect).** Is the final live-state capture really the last box capture of the wave
   (timestamps in `chain.log.txt`, `lock_release.txt`, the evidence copies)? Is anything after it a write to the box? Is
   the T0-clone situation (absent at the start, drop not evidenced) honestly stated?
7. **Frozen-byte discipline.** Manifest vs git for the 31 files, `lsattr` before/after, one cycle, new tools frozen,
   `p6_dbxml.py` pinned unchanged. Any tool changed after its manifest hash?
8. **Retrace and records.** What does `retrace_trace_clean.txt` say, and is it traced the way the plan describes? Does
   "the P16 retrace output is unrecoverable" hold up? Are the failure records accurate and dated before the commit
   (`git log -1 --format=%cI 63ef8ca`)? Is the `host=` redaction complete in the committed tree (do not quote the value)?
9. **Honesty of the limits.** §4 and §7 list limits (equal-mode unit gate, B4 unpaired, A8 failing branch, P13 trap path,
   who dropped the T0 clone, `.bak_p17fix1` never hashed, P16 retrace lost, V6, V13, X2, A11, clean-box rebuild, P14
   ledger scope, P13 original summaries). Are there limits the executor did not list? Any sentence in R5 §30, the
   handoff, `ROADMAP.md` or the QMS record that overclaims (look for "paired", "closed", "identical", "all")?
10. **Inventory.** `evidence\release_inventory.json` (54 files, 7 manifests, `--local`): is "54/54 agree" what the script
    computes (`tools\p18_release_inventory.py`), and is the scope statement honest given the box was not read?

## Scoring
Re-score §6 R1-R12 on the 0/1/2 scale from the repo evidence only. For each item give your score, the executor's, and
one to three sentences with a citation. Give the total of 24, and say whether the plan's Accept rule (R2, R3, R6, R9
must be 2) is met. Do not round up for effort. If an item the executor left at 2 is lower, say why, with the line you
opened.

## Output (`khanza-r5\docs\khanza_r5_p18_review.md`)
1. Verdict in three lines: your total vs 23, whether the self-score is earned, the one most important defect.
2. Rubric table (R1-R12: yours, theirs, reason, citation).
3. M1-M16 closure table (closed / partly / not closed, with the evidence).
4. New findings, most severe first: ID (N1, N2, ...), severity (blocker / major / minor), what is wrong, exact location,
   a concrete failure scenario, the smallest fix.
5. Claim-vs-transcript table from check 1.
6. What you could not verify from the repo alone, and what evidence would settle it.
7. Recommendation: may Astra v13 (a paid external run) go ahead on these bytes? If not, what must change first, and is
   the equal-mode unit gate worth a short P19 or acceptable as a stated limit?

Be adversarial and specific. "Looks fine" is not a finding; say what you opened and what you saw. If a check finds
nothing, say so in one line.
