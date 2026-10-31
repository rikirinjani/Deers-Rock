# Prompt: independent local review and re-score of R5-P22

Run this in a **fresh local Claude Code session** (new conversation, not this one), working directory
`C:\Users\think\Project_v2\Deers-Rock`. Everything is committed locally on branch `khanza-r5-p6` (HEAD `246564c` or a docs-only
commit after it; origin is at `f771e04`). Paste everything below the line.

---

You are an independent reviewer. You did not write this work and have no stake in its score. Decide whether the executor's
self-score of **20/24 (R4, R5, R9, R10 = 1; R9 is critical, so the executor says the Accept rule is not met)** is right, too harsh or
too lenient, and whether the P22 fixes close the findings they answer. History of executor self-scores against independent reviews:
P15 23 vs 17, P17 18 vs 11, P18 23 vs 20, P19 23 vs 20, P20 22 vs 19. Every review so far found sentences that the code or data
contradicted, mostly in records written from the plan and not re-read. Assume more are hiding.

## Ground rules (local, read-only)
- Start with `git status` and `git log --oneline -8`. If `khanza-r5\tools\`, `khanza-r5\evidence\p22\` or the P22 task doc have
  uncommitted changes, review the committed bytes (`git show HEAD:path`).
- **Read-only. Create exactly one file: `khanza-r5\docs\khanza_r5_p22_review.md`.** Edit, commit and push nothing.
- **No box access.** No `ssh`, no `.vps*.env`, no `~/.ssh`, no Kaggle tool. What the repo cannot show goes in "could not verify".
- **Independence.** Do not read the previous conversation transcript (`~/.claude/projects/...`), any scratchpad or temp
  directory, the memory directory, or `~/self-harness/`. Use only the repo.
- You may run self-contained local code (`sha256sum`, `bash -n`, `python -m py_compile`, the changed shell functions on tiny synthetic
  inputs, `git show`/`git diff`) and must say what you ran. Local files are CRLF; frozen bytes are LF: hash with CR removed
  (`tr -d '\r' < f | sha256sum`). When you source `p15_lib.sh` use a POSIX path and check `type -t <function>` first (a Windows path
  makes every case read "none").
- The repo is public. Never write or quote an IP address, hostname or credential. Scan the files P22 added or changed for them.

## Read first
1. `khanza-r5\docs\khanza_r5_p20_review.md` (the review P21/P22 answer), `evidence\astra_v13_5766429_NOTE.md` (Astra v13, 74/100, and
   which of its findings were verified), then `docs\khanza_r5_task_p22_astra_v13_and_p20_review.md` (§1 findings R1-R8, §2 packages,
   §3 AC, §4 limits, §5 rubric, §7 result) and `docs\khanza_benchmark_report_R5.md` §33 and §34.
2. `git diff 875d55a 246564c -- khanza-r5/tools` and the new tools `tools\p22_a_negctl.sh`, `p22_chain.sh`, `p22_release_inventory.py`;
   for context `tools\p15_lib.sh`, `p14_edge_run.sh` (`oracle_run`, `cleanup`), `p13_wide_sample.sh` (`cleanup`), `p20_chain.sh`.
3. `khanza-r5\evidence\p22\`: `chain.log`, `chain\`, `preflight\` (note `p22_a_preflight1.txt` is a failed first run kept on purpose),
   `lock_*`, `refreeze.txt`, `r5_p22_frozen_manifest_20261031.sha256`, `copy_log.txt`, `local_git_hashes_before.txt`;
   `khanza-r5\records\failures\20261031T1600Z-*`, `records\qms\VER-2026-10-31-DR-KHANZA-R5-P22-001.json`, handoff §1 and item 27, `ROADMAP.md`.

## What to check (cite file:line for each)
1. **Claim vs transcript.** Every number in R5 §34 and task doc §7 against the line that printed it (lib 23/23, P15 A 9/9, P16 26/26 and
   20/20, P17 37/37 and 31/31, P18 50/50 and 33/33, P19 19/19 and 28/28, P20 A 27/27 and B 10/10, P22 A 25/25, C4 fixture 27/27 with
   57/0 and real 300/300 with 1,240 lines and 698/0, line 33/33, B6 6/6, suite PASS=39, unit 44/44, NC 5, 21 ASSERT PASS, inventory
   65 files / 11 manifests, 42/42 frozen and lsattr, lock times). Mark matched / not found / contradicted. Re-hash the manifest against
   the committed `tools\` bytes (42 files) and the `.bak_p22` hashes against `local_git_hashes_before.txt` and `git show 875d55a:...`.
2. **Does each fix close its finding?** R1-R8 against the diff and evidence: closed / partly / not closed.
3. **R1, the helper (`p15_lib.sh` `p15_oracle_batch_failed`).** It now returns "failed" for a missing, empty, non-regular or unreadable
   log and for a grep error. Could that make a *legitimate* run fail: list every caller of the helper and every case where the log can
   be empty or absent on a normal path (including oracle runs whose `exit_code = 4` for out-of-envelope strata with nothing logged).
   Run the helper on your own synthetic logs, including a log with only CRs, a log without a final newline, and a FIFO or symlink.
4. **R2, the EXIT-trap restore (`p14_edge_run.sh`, `p13_wide_sample.sh`).** `exit 3` inside `cleanup()` runs inside an EXIT trap: what
   exit status does the driver finally return, and does it skip the clone drop and the grant revoke that come after (read the whole
   function)? Is leaving them "as they are" consistent with the existing CLEANUP-INCOMPLETE branch and with the later
   `cleanup-final` line? Is the control (`sed`-extracted `cleanup()`, `$DBXML` shadowed) faithful to the real function, and can OLD
   rc 0 / NEW rc 3 come from anything but the changed lines? There is no run with an induced restore failure: judge whether that is
   adequately disclosed.
5. **R3, the clone check.** The `case` patterns and the empty tests: any input where a valid count is rejected (leading zeros,
   whitespace, CR, a `mysql` that prints a warning on stderr) and does the message change break a downstream grep in any tool or
   control (grep all of `tools\` for `row-equal`, `tables=`, `clone matches`)?
6. **R4/R5/R6.** Step `3z` in `p22_chain.sh`: can it still pass for the wrong reason (read each assertion; the positive control is a
   log of the first P20 chain left on the box)? R5: read `evidence\p22\preflight\r5_mutant_control.txt`: is the mutant construction
   exact, which of the two new assertions discriminates, and is the disclosure accurate? R6: any other canned log holding two patterns?
7. **`p22_chain.sh` vs `p20_chain.sh`.** Diff them. Is every difference listed in the header or task doc? The live-state header label
   `p20-chain-final` is disclosed: are there other stale strings (`P20`, `p20`) in the new wrapper that change behaviour or mislead?
8. **Final-state ordering.** Final capture 14:24:06Z (chain step 5), lock released 15:59:21Z. Was the box touched in between other
   than by the logged copies? Is `copy_log.txt` complete and correctly anchored (the P20 review found its header wrong)? Is the
   statement that the box "stayed locked" accurate and harmless?
9. **Frozen-byte discipline and pre-flight.** Manifest vs git for the 42 files; `lsattr` before and after; pre-flight transcripts' hash
   headers vs the frozen hashes (the pre-flight ran `p22_a_negctl.sh`, `p20_a_negctl.sh`, a SHORT chain and the inventory; the full chain
   was not pre-flighted unfrozen: is R5 = 1 fair?). Does R5 §34 say "every file" or similar anywhere it should not?
10. **Records written after the plan.** Reopen every changed record line (R5 §33/§34, handoff §1 "Latest wave", "Records" and item 27,
    ROADMAP row XI, QMS P22, failure record 1600Z, task doc §7) against the data. The P20 review found the cause was records written from
    the plan: look for the verbs "closed", "paired", "all", "every", "identical", "no longer", "fail closed" and open the file each names.
    Is the handoff "pushed through `f771e04`" true against `git branch -r`/`git log origin/khanza-r5-p6`?
11. **Near misses and addresses.** Scan `git diff 875d55a 246564c` added lines for IPv4/IPv6, Tailscale-style numbers, hostnames,
    credentials. State the scan you ran.
12. **Honesty of the limits.** Limits not listed? What does "one full chain on the final frozen bytes closes the earlier limit" really
    cover (note the first-chain hang of P20 and that C4 ran only once here)?
13. **Astra v13.** `evidence\astra_v13_5766429_NOTE.md` lists five findings as TRUE and two as not confirmed. Open the cited lines and
    confirm or contradict each. Anything Astra raised that P22 neither fixed nor listed in §4?

## Scoring
Re-score R1-R12 from the task doc §5 (0/1/2, /24; critical R2, R3, R6, R9) from the repo evidence only: your score, the executor's,
one to three sentences with a citation. State whether the Accept rule is met. Do not round up for effort.

## Output (`khanza-r5\docs\khanza_r5_p22_review.md`)
1. Verdict in three lines: your total vs 20, whether the self-score is earned, the most important defect.
2. Rubric table. 3. R1-R8 closure table. 4. New findings, most severe first: ID (S1, S2, ...), severity (blocker / major / minor), what is
wrong, exact location, a concrete failure scenario, the smallest fix. 5. Claim-vs-transcript table. 6. What you could not verify, and what
would settle it. 7. Recommendation: (a) is the tool set good enough to stop iterating on bytes and put the effort into the clean-box
rehearsal Astra v13 named as the next step (the box ends about 2026-11-20), (b) what must be fixed first, (c) what from this benchmark is
reusable for an international (non-Khanza) version and what is Khanza-specific, (d) whether the iteration pattern itself says stop.

Be adversarial and specific. "Looks fine" is not a finding; say what you opened and what you saw. If a check finds nothing, say so in one line.
