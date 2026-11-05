# Prompt: independent local review and re-score of R5-P23

Run this in a **fresh local Claude Code session** (new conversation, not this one), working directory
`C:\Users\think\Project_v2\Deers-Rock-khanza` (a git worktree on branch `khanza-r5-p6`; do not use `C:\Users\think\Project_v2\Deers-Rock`,
its checkout is on another branch and `khanza-r5\` is empty there). P23 is commit `530a63f`; docs-only commits follow it (`f488560`,
`c525f97`, `c1bb78b`). Paste everything below the line.

---

You are an independent reviewer. You did not write this work and have no stake in its score. Decide whether the executor's
self-score of **20/24 (R1, R4, R5, R10 = 1)** for P23 is right, too harsh or too lenient, and whether P23 closes the findings of the
clean-box rehearsal it answers. History of executor self-scores against independent reviews: P15 23 vs 17, P17 18 vs 11, P18 23 vs 20,
P19 23 vs 20, P20 22 vs 19, P22 20 vs 18. Every review found sentences that the code or data contradicted, mostly in records written
from the plan and not re-read. Assume more are hiding.

## Ground rules (local, read-only)
- Start with `git status` and `git log --oneline -14`. If `khanza-r5\tools\`, `khanza-r5\evidence\p23\` have uncommitted changes, review
  the committed bytes (`git show HEAD:path`).
- **Read-only. Create exactly one file: `khanza-r5\docs\khanza_r5_p23_review.md`.** Edit, commit and push nothing.
- **No box access.** No `ssh`, no `instabox` CLI, no `.vps*.env`, no `~/.ssh`, no Kaggle tool. What the repo cannot show goes in
  "could not verify".
- **Independence.** Do not read the previous conversation transcript (`~/.claude/projects/...`), any scratchpad or temp directory, the
  memory directory, or `~/self-harness/`. Use only the repo.
- You may run self-contained local code (`sha256sum`, `bash -n`, `python -m py_compile`, the changed shell functions on tiny synthetic
  inputs, `git show`/`git diff`) and must say what you ran. Local files are CRLF; frozen bytes are LF: hash with CR removed
  (`tr -d '\r' < f | sha256sum`). When you source `p15_lib.sh` use a POSIX path and check `type -t <function>` first.
- The repo is public. Never write or quote an IP address, hostname, e-mail address, account name, machine or snapshot id, or credential.

## Read first
1. `khanza-r5\docs\khanza_r5_cleanbox_rehearsal_report.md` (the second operator's findings, the input of P23),
   `docs\khanza_r5_plan_cleanbox_rehearsal.md` (with its erratum), `docs\khanza_r5_instabox_chroot.md`.
2. `docs\khanza_benchmark_report_R5.md` §35 and §36. **There is no P23 task doc** (the executor says so in §36): judge the scope from §36
   and the rehearsal report, and use the rubric R1-R12 of `docs\khanza_r5_task_p22_astra_v13_and_p20_review.md` §5.
3. `git diff e61f604 530a63f -- khanza-r5/tools khanza-r5/src` and the new tools `tools\p23_a_negctl.sh`, `p23_chain.sh`,
   `p23_release_inventory.py`; for context `tools\p14_edge_run.sh`, `p22_chain.sh`, `src\verify_published.sh`.
4. `khanza-r5\evidence\p23\`: `vultr\`, `instabox\`, `fix1\`, `preflight\` (note `p23_a_preflight1.txt`), `chain_start.txt`,
   `lock_*`, `refreeze.txt`, both manifests (`...20261101.sha256`, `...20261101b.sha256`), `copy_log.txt`, `local_git_hashes_before.txt`;
   `evidence\cleanbox_rehearsal\`; `evidence\instabox_home\` (a later `BOX=local` run); records
   `records\failures\20261101T0710Z-*`, `records\qms\VER-2026-11-01-DR-KHANZA-R5-P23-001.json`; handoff "Live box", "Latest wave" and
   items 28 and 29; `ROADMAP.md` (Epic XI).

## What to check (cite file:line for each)
1. **Claim vs transcript.** Every number in R5 §36 against the line that printed it, on **both** machines: lib 23/23, P15 A 9/9, P16
   26/26 and 20/20, P17 37/37 and 31/31, P18 50/50 and 33/33, P19 19/19 and 28/28, P20 A 27/27 and B 10/10, P22 A 25/25, `p23-a`
   19/19 (and 18/1 for the old bytes), C4 fixture 27/27 (57 keys / 0 unchecked) and real 300/300 (1,240 lines, 698 / 0), line 33/33, B6 6/6,
   suite PASS=39, unit 44/44, NC 5, 29 ASSERT PASS, inventory 68 files / 12 manifests, 45 frozen files and `lsattr`, lock times. Mark
   matched / not found / contradicted. Re-hash manifest a and b against the committed `tools\` bytes; compare the `.bak_p23*` hashes
   with `local_git_hashes_before.txt` and `git show e61f604:...`.
2. **Do the P23 fixes close the rehearsal's findings?** Make a table: each finding of the rehearsal report (disk rule, stale files that
   pass, unrecorded chain argv, ssh-only `verify_published.sh`, conflicting grants, javac encoding, others you find in the report) →
   closed / partly / not closed, with the diff line and the evidence line.
3. **`P14_MIN_FREE_GB` (`p14_edge_run.sh`).** Read the validation (`case`) and the comparison. Any input that is accepted but wrong
   (leading zeros such as `08`, very long numbers, `0`), any that is refused but valid? Does the value reach the driver through every
   caller (`sudo`, chroot, `env -i`, the chain)? Is the control (`p23_a_negctl.sh`, `sed`-extracted lines with a shadowed `df`) faithful, and can
   OLD 4 / NEW 10-style differences come from anything but the changed lines? On InstaBox the threshold was 8 on a machine with about
   15 GB free: is lowering a safety stop for the proof run honest and disclosed? Does the 8 GB value cover the clone and stage tables the
   driver creates (check the sizes in the evidence)?
4. **Fresh-output guard (`p23_chain.sh`).** `.t0` marker, `p23_isfresh`, moving an old `$B/chain` aside, `argv.txt`. Can a stale file still
   pass (equal mtimes, clock skew, `touch`, a file that is empty but newer)? Can the guard fail a legitimate run? Is the assertion list
   complete (the 6 step-3 outputs and the newest oracle logs): which output is not covered? Does moving the old chain aside hide
   evidence or fill the 20 GB disk?
5. **The fix-up cycle.** `p23_a_negctl.sh` failed 1 of 19 on InstaBox (the "variable unset" case inherited the variable). Read
   `evidence\p23\fix1\` and `instabox\i3_fix1.txt`. Was the fix applied under the unfreeze/re-freeze procedure on both machines? Is
   manifest b exactly manifest a with one line changed? Is the claim "old frozen bytes reproduce the fault; new bytes 19/19 with the
   variable at 8 and unset on both machines" supported by a log line each? Is R5 = 1 (no single full chain on manifest b) fair, too harsh or too lenient?
6. **The second-machine claim.** "C4 results reproduce on a different machine, numbers equal to Vultr." Diff the Vultr and InstaBox chain
   logs line by line: which lines differ and why? What is actually different (kernel, CPU, memory, host userland) and what is the same
   (the same export, the same bytes, the same operator, the same database dump and ledger pin)? Is "different machine" over-stated, or is
   "reproduces" the right word? Is anything in the InstaBox runs unfaithful to the Vultr runs (threshold 8, chroot, `DBUTIL_FORCE_ROOT`,
   `MSYS_NO_PATHCONV` restarts)?
7. **`BOX=local`.** In P23 it was untested; `evidence\instabox_home\` ran it later. Read `src\verify_published.sh` and that evidence:
   does ALL-MATCH mean what the note says (repo copy stripped of CR vs box files; the repo blobs carry CRLF while `PUBLISHED.sha256` is LF)? Is there a
   way for it to pass while the box files differ (e.g. both sides read the same path)?
8. **Records written after the work.** Reopen every changed record line (R5 §35, §36, handoff "Latest wave", "Live box", items 28 and 29, ROADMAP
   Epic XI, QMS P23, failure record 0710Z, the grants correction in `docs\asset_export_20261023.md`, reproduce §5 and §6). Look for
   "closed", "all", "every", "identical", "reproduced", "no longer", "durable" and open the file each names. Is the handoff "pushed
   through ..." true against `git log origin/khanza-r5-p6`?
9. **Near misses and addresses.** Scan the added lines of `git diff 11cf629 HEAD` for IPv4/IPv6, Tailscale-style numbers, hostnames,
   e-mail addresses, account names, machine ids, snapshot ids, tokens and keys. Software version strings are not hits. State the scan you ran.
10. **Honesty of the limits.** §36 "Not done / stated limits": anything missing (the 30-minute idle pause and `mysqld`, `JdbcProbe`,
    AC-7, `.bak_p17fix1`, X2, C3, P14 ledger scope, P22 review S2-S4)? Is "the InstaBox free machine is the durable home" (handoff, ROADMAP)
    supported by what was probed, or a decision written as a finding?

## Scoring
Re-score R1-R12 (0/1/2, /24; critical R2, R3, R6, R9) from the repo evidence only: your score, the executor's, one to three sentences
with a citation. State whether the Accept rule is met. Do not round up for effort. Note that R1 (task doc before execution) is fixed
by what the repo shows, not by what the executor says.

## Output (`khanza-r5\docs\khanza_r5_p23_review.md`)
1. Verdict in three lines: your total vs 20, whether the self-score is earned, the most important defect.
2. Rubric table. 3. Rehearsal-finding closure table. 4. New findings, most severe first: ID (S1, S2, ...), severity (blocker / major /
minor), what is wrong, exact location, a concrete failure scenario, the smallest fix. 5. Claim-vs-transcript table (both machines).
6. What you could not verify, and what would settle it. 7. Recommendation: (a) is the tool set good enough to stop iterating on bytes
and treat the benchmark as handed over, (b) what must be fixed first, (c) what from this benchmark is reusable for an international
(non-Khanza) version and what is Khanza-specific, (d) whether the iteration pattern itself says stop.

Be adversarial and specific. "Looks fine" is not a finding; say what you opened and what you saw. If a check finds nothing, say so in one line.
