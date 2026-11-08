# Prompt: independent local review and re-score of R5-P24

Run this in a **fresh local Claude Code session** (new conversation, not this one), working directory
`C:\Users\think\Project_v2\Deers-Rock-khanza` (a git worktree on branch `khanza-r5-p6`; do not use `C:\Users\think\Project_v2\Deers-Rock`,
its checkout is on another branch and `khanza-r5\` is empty there). P24 is commit `0903b95` (task doc `b3008c0`, tools `a5717d0`); later commits
may be docs-only. Everything is pushed. Paste everything below the line.

---

You are an independent reviewer. You did not write this work and have no stake in its score. Decide whether P24 closes the findings of the
independent P23 review, and score it. **The executor gave no self-score** (its history against independent reviews: P15 23 vs 17, P17 18 vs 11,
P18 23 vs 20, P19 23 vs 20, P20 22 vs 19, P22 20 vs 18, P23 20 vs 11): the executor says the acceptance criterion AC-4 ("one chain with every
step exit 0") is **not met as written**. Judge whether that disclosure is complete. Every review so far found sentences that the code or data
contradicted, mostly in records written from the plan and not re-read. Assume more are hiding, including in the corrections P24 made.

## Ground rules (local, read-only)
- Start with `git status` and `git log --oneline -10`. Review the committed bytes (`git show HEAD:path`) if anything is uncommitted.
- **Read-only. Create exactly one file: `khanza-r5\docs\khanza_r5_p24_review.md`.** Edit, commit and push nothing.
- **No box access.** No `ssh`, no `instabox` CLI, no `.vps*.env`, no `~/.ssh`, no Kaggle tool. What the repo cannot show goes in "could not verify".
- **Independence.** Do not read the previous conversation transcript (`~/.claude/projects/...`), any scratchpad or temp directory, the memory
  directory, or `~/self-harness/`. Use only the repo.
- You may run self-contained local code (`sha256sum`, `bash -n`, `python -B -I`, the extracted shell lines on tiny synthetic inputs,
  `git show`/`git diff`) and must say what you ran. Local files are CRLF; frozen bytes are LF: hash with CR removed (`tr -d '\r' < f | sha256sum`).
- The repo is public. Never write or quote an IP address, hostname, e-mail address, account name, machine or snapshot id, or credential.

## Read first
1. `khanza-r5\docs\khanza_r5_p23_review.md` (the review P24 answers; S1-S10 and the rubric), `docs\khanza_r5_task_p24_p23_review_fixes.md`
   (written before execution: findings table, packages A-D, AC-1..7, limits), `docs\khanza_benchmark_report_R5.md` §36 (with the P24
   strike-through amendments) and §37.
2. `git diff 530a63f 0903b95 -- khanza-r5/tools khanza-r5/src` and the new tools `tools\p24_chain.sh`, `p24_a_negctl.sh`,
   `p24_release_inventory.py`, `p24_claim_check.py`; for context `p14_edge_run.sh`, `p23_chain.sh` (diff it against `p24_chain.sh`).
3. `khanza-r5\evidence\p24\` (`deploy.txt`, `refreeze.txt`, `lock_release.txt`, `preflight1_stdout.txt`, `preflight_stdout.txt`,
   `chain_harness_hang_note.txt`, `r5_p24_frozen_manifest_20261105.sha256`, `box\p24\` incl. `chain_stdout.log`, `nc_rerun_stdout.log`,
   `p24_a_frozen_unset.txt`, `chain\`, `chain.prev_*`, `preflight\`, `preflight1\`), `evidence\p23\fix1\p23_a_negctl.manifest_a_bytes.sh`,
   `docs\p24_claims.json`, `records\qms\VER-2026-11-05-DR-KHANZA-R5-P24-001.json`, `records\failures\20261105T0710Z-*`,
   handoff "Live box", "Latest wave", "Records" and items 28-30, `ROADMAP.md` (Epic XI).

## What to check (cite file:line for each)
1. **Claim vs transcript.** Every number in R5 §37 against the line that printed it (P15-P24 control counts, C4 27/27 and 300/300 with 1,240
   lines, line 33/33, B6 6/6, suite 39, unit 44/44, inventory 71/71 with 14 manifests, `--local` 71/71, df 14 to 13 GB and 167 samples, 48
   frozen and `lsattr` 48/48, lock times 05:28:57Z to 07:01:28Z, 4d re-run 5/5, final capture 07:00:13Z). Mark matched / not found /
   contradicted. Re-hash the P24 manifest against the committed `tools\` bytes; compare `.bak_p24` with `git show 530a63f:...`.
2. **The claim checker is itself a claim.** Read `tools\p24_claim_check.py` and `docs\p24_claims.json`. Can a claim pass vacuously (a regex
   that also matches an unrelated line, `count` too low, a `forbid` that never fires, a claim that names the wrong file)? Run it. Pick five
   claims at random and confirm the matched line says what the claim says. Is "32 claims, 0 not matched" a proof of the record, or of the logs' text only?
3. **Closure of the P23 review's findings S1-S10, R1, R12 and the grants block.** For each: closed / partly / not closed, with the diff line
   and the evidence. In particular reopen every corrected sentence in R5 §36, the P23 failure record and QMS record, handoff item 29 and
   "Records", reproduce §6.4, `asset_export_20261023.md` against the logs it names: did the correction introduce a new false sentence?
4. **`p14_edge_run.sh` floor and log line.** Read the three-line change. Inputs: `08`, `003`, very long numbers, `3`, `2`. The log line
   calls `df` a second time: can it differ from the value that passed the check? Is the control (`p24_a_negctl.sh` G1: extracted lines, shadowed `df`
   and `res`) faithful, and can the OLD/NEW difference come from anything but the changed lines? Did `p23_a_negctl.sh` still extract the old three lines (19/19 on the new bytes)?
5. **`p24_chain.sh` vs `p23_chain.sh`.** Diff them. Is every difference in the header or task doc? Check: `p24_isfresh` (`.now` touch, `-nt`
   with sub-second mtimes, a file written in the same second), the `df` sampler (kill and wait, a sampler left running after an abort), the
   verdict loop (is every step variable in it: which exit codes are NOT, e.g. the inventory step `IV`?), `exit $RC`, the renamed labels.
   Does the verdict line change any behaviour of a frozen wrapper in a way not tested?
6. **The hang and the split result.** Read `chain_harness_hang_note.txt`, the NC5 part of `chain_stdout.log` and `nc_rerun_stdout.log`. Was
   terminating one `java` process under the held lock legitimate and recorded early enough? Does the 4d re-run on its own leave the box in the same
   state a full chain would (stage tables, clones, `database.xml`)? The final capture is after the re-run: is that ordering correct and is "AC-4 not met as written" a complete statement,
   or should some scores (R7, R8, R9) be lower? Is "second occurrence of this hang class" accurate against the P20 records?
7. **Lock and freeze discipline.** `deploy.txt`: lock before the first `chattr -i`? Unfreeze transcript for `p14_edge_run.sh` only? Manifest
   (48) = manifest b of P23 with `p14_edge_run.sh` changed and 3 new lines (diff them). Pre-flight 1 is kept: is its failure (28/1) explained
   correctly and did pre-flight 2 run on the bytes that were frozen (compare hash headers)? Was `p24_a` run unset and exported before freezing and unset after?
8. **Records written after the work.** R5 §37, handoff "Latest wave" and item 30, ROADMAP Epic XI, QMS P24, failure record. Look for "closed",
   "all", "every", "identical", "met", "reproduced", "no longer", "durable" and open the file each names. Is the handoff statement about the push
   true against `git log origin/khanza-r5-p6`? Is "InstaBox is the durable home" supported by what was probed, or a decision written as a finding?
9. **Near misses and addresses.** Scan the added lines of `git diff 11cf629 HEAD` for IPv4/IPv6, Tailscale-style numbers, hostnames, e-mail
   addresses, account names, machine and snapshot ids, tokens and keys (version strings are not hits). State the scan. Machine and snapshot
   names appear on purpose (task doc S9): say whether you agree.
10. **Honesty of the limits.** §37 "Not done": anything missing (the idle pause and `mysqld`, the NC5 hang cause, Vultr on older bytes, the
   8 GB figure from one measurement, `JdbcProbe`, b-11, b-12, AC-7, `.bak_p17fix1`, X2, C3, P14 ledger scope)?

## Scoring
Score R1-R12 (0/1/2, /24; critical R2, R3, R6, R9) from the repo evidence only, using `docs\khanza_r5_task_p22_astra_v13_and_p20_review.md` §5; one to
three sentences with a citation each. Do not round up for effort. State whether the Accept rule is met and, if not, what single item would meet it.

## Output (`khanza-r5\docs\khanza_r5_p24_review.md`)
1. Verdict in three lines: your total (the previous review gave P23 11/24), the most important defect, whether AC-4's disclosure is complete.
2. Rubric table. 3. S1-S10 closure table. 4. New findings, most severe first: ID (T1, T2, ...), severity (blocker / major / minor), what is wrong,
exact location, a concrete failure scenario, the smallest fix. 5. Claim-vs-transcript table. 6. What you could not verify, and what would settle it.
7. Recommendation: (a) is Epic XI done enough to close with the stated limits and move to the international version, (b) what must be fixed first if
not, (c) what from this benchmark is reusable for a non-Khanza version and what is Khanza-specific, (d) whether the iteration pattern itself says stop,
(e) whether the claim checker should become a mandatory step of every future wave.

Be adversarial and specific. "Looks fine" is not a finding; say what you opened and what you saw. If a check finds nothing, say so in one line.
