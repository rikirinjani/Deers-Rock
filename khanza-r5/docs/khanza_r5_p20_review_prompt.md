# Prompt: independent local review and re-score of R5-P20

Run this in a **fresh local Claude Code session** (new conversation, not this one), started with the working directory
`C:\Users\think\Project_v2\Deers-Rock`. No push is needed: everything is committed locally on branch `khanza-r5-p6`
(HEAD `875d55a` or a docs-only commit after it). Paste everything below the line.

---

You are an independent reviewer. You did not write this work and you have no stake in its score. Your job is to find out
whether the executor's self-score of **22/24 (R5 = 1 and R9 = 1; R9 is a critical item, so the executor says the plan's
Accept rule is not met)** is the right score, too harsh or too lenient, and whether the P20 fixes really close the findings
of the previous independent review. History of the executor's self-scores against the independent reviews: P15 23 vs 17,
P17 18 vs 11, P18 23 vs 20, P19 23 vs 20. Every review found claims written from intent, not from transcripts, and the last
two found a sentence that the code or the data contradicted. This wave also contains two incidents the executor reports
itself (a harness hang in the first chain, two vacuous assertions of its own new wrapper). Assume more may be hiding, and
check, especially every sentence that says what a gate or a control does, or why something happened.

## Ground rules (local, read-only)
- Working directory `C:\Users\think\Project_v2\Deers-Rock`. The work is under `khanza-r5\` (plus `ROADMAP.md`). Start with
  `git status` and `git log --oneline -6`; HEAD should be `875d55a` (or a docs-only commit after it). If the tree has
  uncommitted changes to `khanza-r5\tools\`, `khanza-r5\evidence\p20\` or the P20 task doc, say so and review the committed
  bytes (`git show HEAD:path`), not the working copy.
- **Read-only. Create exactly one file: `khanza-r5\docs\khanza_r5_p20_review.md`.** Edit nothing else, commit nothing, push nothing.
- **No box access.** Do not `ssh` anywhere, do not read `.vps*.env` or `~/.ssh`, do not call any Kaggle tool. What the repo
  cannot show goes in "could not verify".
- **Independence.** Do not read the previous conversation's transcript (`~/.claude/projects/...`), any scratchpad or temp
  directory, the memory directory, or `~/self-harness/` (the executor's trace store). Use only the repo.
- You may run self-contained local code (hashing with `sha256sum`, `bash -n`, `python -m py_compile`, the helper or gate
  lines on tiny synthetic inputs, `git show`/`git diff`) and must say what you ran. Local files are CRLF on disk; the frozen
  bytes are LF, so hash with CR removed (`tr -d '\r' < file | sha256sum`) or compare against `git show`.
- The repo is public. Never write or quote an IP address, hostname or credential; report a location instead. **Check, as part
  of the review, that the committed tree contains none** (IPv4/IPv6 patterns, Tailscale-style addresses, password words) in
  the files P20 added or changed.

## What to read first
1. `khanza-r5\docs\khanza_r5_p19_review.md` (the review P20 answers: findings O1-O6) and
   `khanza-r5\docs\khanza_r5_task_p20_p19_review_fixes.md`: §1 verification table, §2 work packages, §4 AC-1..9 and limits,
   §5 owner decisions, §6 rubric (R1-R12, 0/1/2, /24; critical items R2, R3, R6, R9), §7 result, amendments, claim table,
   self-score.
2. `khanza-r5\docs\khanza_benchmark_report_R5.md` §32 and the strike-throughs it added in §31.
3. `khanza-r5\evidence\p20\`: `chain.log.txt`, `chain\` (the first chain), `rerun.log.txt`, `rerun\`, `c4_rerun.sh` (the ad hoc
   C4 re-run script), `chain_b\` (the fix-up chain), `preflight\`, `a2_provenance.txt`, `unfreeze_cycle1.txt`,
   `refreeze_cycle1.txt`, `fixup1_lock_unfreeze.txt`, `refreeze_fixup1.txt`, both manifests (`r5_p20_frozen_manifest_20261027.sha256`
   and `…b.sha256`), `local_eq_box_manifest*.txt`, `copy_log.txt`, `lock_*`, `erratum_p19.md`, `release_inventory_local.json`,
   `retrace_trace_clean.txt`; and `khanza-r5\evidence\release_inventory.json`.
4. `git diff 9d91d80 875d55a -- khanza-r5/tools` and the new tools `khanza-r5\tools\p20_a_negctl.sh`, `p20_b_negctl.sh`,
   `p20_chain.sh`, `p20_release_inventory.py`; and for context `tools\p15_lib.sh` and `tools\p14_edge_run.sh` (`oracle_run`).
5. `khanza-r5\records\failures\20261027T14*`, `khanza-r5\records\qms\VER-2026-10-27-DR-KHANZA-R5-P20-001.json` and the amendment
   note on the P19 record, `khanza-r5\records\traces\r5-p20-*`.
6. The oracle source `khanza-r5\tools\sampled_real_form_diff_r5.py` (around `stage_drop`, the finalize block that sets `exit_code`
   and `failed_batches`), which is what the O1 helper has to recognise.

## What to check (cite file:line or the transcript line for each)
1. **Claim vs transcript.** Every number in §7 and R5 §32 (23/23, 9/9, 26/26, 20/20, 37/37, 31/31, 50/50, 33/33, 19/19, 28/28,
   25/25, 10/10, fixture 27/27 with 57/0, real 300/300 with 1,240 entries, 181/119, 698/0, P13 comparator, 33/33, 6/6, PASS=39,
   44/44, NC 5, 39/39 frozen and `lsattr`, inventory 62/62 with 10 manifests, 11/11 P14-only, the lock times) against the line
   that printed it. Mark: matched / not found / contradicted. Re-run what you can: both manifests against the committed
   `tools\` bytes (CR removed); `.bak_p20` and `.bak_p20fix1` hashes against `git show 9d91d80:…` and `git show 875d55a^:…`
   where applicable; the manifests differ in exactly one line.
2. **Does each fix close its finding?** Walk O1-O6 against the diff and evidence: closed / partly / not closed, and why.
3. **O1, the helper, against the producer's source.** Read the oracle. List **every** code path that sets `exit_code = 4`
   (failed batches, out-of-envelope strata, the stage-drop path, STAGE-KEEP, WRITER-ALIVE, abandon/retry paths) and the log
   line each one writes. For each, does `p15_oracle_batch_failed` (`p15_lib.sh`) match a line written on that path when the
   path is a *failure*, and does it stay silent on the paths that are normal for the fixture strata? Run the helper on
   synthetic one-line logs of your own. Is the false-trigger evidence (real clean oracle logs, none) adequate, given that the
   driver log only holds a grep subset of the oracle log?
4. **The O1 control.** `oracle_run` is extracted from the driver and run with `env` and `p15_count_sukses` shadowed by shell
   functions. Is it faithful to the real function, and can OLD=4/NEW=10 come from anything other than the helper patterns?
5. **O2 and the mutant.** Read the mutant construction (`sed` range deletion in `p20_a_negctl.sh`). Does it delete exactly the
   `ga = 2` block and nothing else? Does the "other message" really come from the code path you expect? Is the after-TERM
   `ps` shadow (a `kill` function that creates a flag file) a faithful exercise of the wait loop and the confirmation step?
6. **O6d.** The empty/letters-only pid-file case: could it make a normal cleanup exit 3 where it did not before (a legitimate
   empty or not-yet-written `.pid` file in the harness's flow)? Check how and when `sampled_real_form_diff_r5.py` writes the
   `.pid` file.
7. **O4.** `p20_b_negctl.sh`: is the AMBIGUOUS plant really what it says (read the comparator's `name_maps` and the
   `insrc` rule), and is the claim "new coverage on the same bytes, no OLD arm" honest?
8. **The two incidents.** (a) The first chain's real-300 hang: do the logs support the executor's account (timeout 1800 s,
   `harness rc=-1`, `FORM-INCOMPLETE`, 115/300, the other results green)? Is "cause not established" and "environmental flake"
   fair, or is there evidence it was caused by a P20 byte? (b) The vacuous assertions: is the diagnosis right (`command not
   found` ×2 per run; the lib not sourced)? Is the fix (sourcing, step `3z`, a positive control that depends on a log file
   left by the first chain) sound? Does `3z` still pass for the wrong reason in any mode? Does the chain-b evidence show it?
9. **The C4 re-run.** `c4_rerun.sh` is described as the same commands as steps 3-3c, 3g, 4e and 5 of the frozen chain. Diff
   it against `p20_chain.sh` and say whether that is true. Is a re-run of C4 alone, on the same product bytes but not under
   the frozen wrapper, acceptable evidence for "C4 27/27 and 300/300 on the final bytes"? There is no single full chain on
   manifest b: is that adequately disclosed, and does it change any score?
10. **Final-state ordering.** The wave has three "final" captures (first chain 14:09:20Z, C4 re-run 14:39:03Z, chain b
    14:43:02Z) and two lock releases. Is the last box capture really the last, and was the box touched afterwards other
    than by logged reads and the release (`copy_log.txt`)? Is `copy_log.txt` complete against what the evidence shows was
    read after the capture?
11. **Frozen-byte discipline and the pre-flight rule.** Manifest a and b vs git for the 39 files, `lsattr` before/after,
    the pre-flight transcripts' `sha256sum` headers against the frozen hashes (note `p20_b` has a second header file), one
    fix-up cycle with a hashed transcript. The executor admits the pre-flight did not exercise the block with the new
    helper assertions (the `P20_SHORT` mode) and scores R5 = 1: fair?
12. **The near miss.** Fifteen older traces were copied into `records/traces/` and removed again because four held network
    addresses. Verify against the committed tree and the git history of this branch (`git log --stat 9d91d80..875d55a`) that
    none of them, and no other address, was committed. State the scan you ran.
13. **Retrace.** `retrace_trace_clean.txt`: what do the two runs say, and does R5 §32 describe them correctly (first run
    clean; second run 44 uncovered; AC-7 partly)? Is R9 = 1 the right score?
14. **Honesty of the limits.** §4 and R5 §32 list limits. Are there limits the executor did not list? Any sentence in R5
    §32, the handoff, `ROADMAP.md` or the QMS records that overclaims ("paired", "closed", "all", "can no longer", "fails
    closed", "identical")?
15. **Inventory.** `evidence\release_inventory.json` (box output, 62 files, 10 manifests) vs
    `evidence\p20\release_inventory_local.json`: same pins and on-disk hashes? Note that the local run used a temporary copy of
    the frozen script with manifest b added to its list: is that disclosed and acceptable?

## Scoring
Re-score §6 R1-R12 on the 0/1/2 scale from the repo evidence only. For each item give your score, the executor's, and one to
three sentences with a citation. Give the total of 24, and say whether the plan's Accept rule (R2, R3, R6, R9 all 2) is met.
Do not round up for effort. If an item the executor left at 2 is lower (or one it left at 1 is higher), say why, with the
line you opened.

## Output (`khanza-r5\docs\khanza_r5_p20_review.md`)
1. Verdict in three lines: your total vs 22, whether the self-score is earned, the one most important defect.
2. Rubric table (R1-R12: yours, theirs, reason, citation).
3. O1-O6 closure table (closed / partly / not closed, with the evidence).
4. New findings, most severe first: ID (Q1, Q2, ...), severity (blocker / major / minor), what is wrong, exact location,
   a concrete failure scenario, the smallest fix.
5. Claim-vs-transcript table from check 1.
6. What you could not verify from the repo alone, and what evidence would settle it.
7. Recommendation: may Astra v13 (a paid external run) go ahead on these bytes and documents? If not, what must change
   first. Say which of the remaining stated limits (the P13 trap path, A8's failing branch, B4 unpaired, the O1 patterns not
   exercised by a live stage-drop failure, no full chain on manifest b, the 44 uncovered retrace files) you would require
   closed before v13 and which are acceptable. Say also whether the iteration pattern itself (each wave's review finds the
   previous wave's overclaims) suggests stopping and running v13, and why.

Be adversarial and specific. "Looks fine" is not a finding; say what you opened and what you saw. If a check finds nothing,
say so in one line.
