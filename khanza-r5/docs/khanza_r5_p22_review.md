# Independent review of R5-P22 (reviewer, 2026-10-31)

Scope: committed bytes at `c52ddbc` (tree clean at start; `git log` head `c52ddbc`, P22 = `246564c`). Read-only. No box access, no transcript, no memory directory.

What I ran locally: `sha256sum` (CR removed) of the 42 manifest files against `git show HEAD:`; the 4 `.bak_p22` hashes against `git show 875d55a:`; `bash -n` on `p13_wide_sample.sh` and `p14_edge_run.sh`; `p15_oracle_batch_failed` (sourced from a POSIX path, `type -t` = `function`) on synthetic logs; a bash EXIT-trap test with `exit 3` inside the handler; `p15_clone_matches_sik` with shadowed `mysql`; `diff` of `p20_chain.sh` vs `p22_chain.sh` and of the two inventory scripts; a regex scan of `git diff 875d55a 246564c` added lines for IPs, hostnames, credentials.

## 1. Verdict

- **My score 18/24 vs the executor's 20.** The self-score is not earned (2 too high), but this is the smallest gap of the series (history: 6, 7, 3, 3, 3).
- **Accept rule not met**: R9 = 1 (critical, as the executor says) and, in my scoring, R3 = 1 (critical).
- **Most important defect:** the P22 evidence adds a tailnet-range (100.x) address to the public repo (`evidence/p22/chain_start.txt:4`, an ssh "connection reset" line), which breaks the task's own AC-5 ("no address in the diff") and the review rules. §34 and §7 never report an AC-5 scan. The commit is **not pushed** (`origin/khanza-r5-p6` = `f771e04`), so it can still be fixed before it leaves the machine.

The tool fixes themselves are sound: I found no wrong behaviour in R1-R3.

## 2. Rubric (task doc §5, 0/1/2)

| # | Item | Mine | Exec | Basis |
|---|---|---|---|---|
| R1 | Verification table | 2 | 2 | Lines cited in task doc §1 match the P20 bytes (`p15_lib.sh:59-61`, `p14_edge_run.sh:58`). R8 is "taken from review", not opened, and then not worked (§34 "not done"), disclosed. |
| R2 | Safety bytes (critical) | 2 | 2 | Helper, trap restore, clone check each have a real OLD/NEW pair, `chain.log:98-122`. Behaviour verified by me (§3 below). |
| R3 | Control strength (critical) | **1** | 2 | R5 second assertion non-discriminating (disclosed); R6 no old arm; R4 (3z) has no control that the *wrapper* assertion fails on a missing log (only the helper unit control); the R5 mutant is ad hoc and its lib file is not committed (`preflight/r5_mutant_control.txt` is a transcript only); the R2 control calls `cleanup()` directly, not as an EXIT trap. Three of seven fixes lack a discriminating control. |
| R4 | Document corrections | 1 | 1 | Sentences contradicted by code/data: see S6, S7, S9. |
| R5 | Frozen-byte discipline | 1 | 1 | Hashing is strong (42/42 matches, pre-flight hash headers equal the frozen hashes). But `p13_wide_sample.sh` is never executed whole in the chain or pre-flight (only its sed-extracted `cleanup()`), no `bash -n` transcript, and the full chain was only pre-flighted in SHORT mode. Fair at 1. |
| R6 | Live-state proof (critical) | 2 | 2 | Final capture is the last state capture (`chain.log:313-332`, 14:24:06Z), identical to baseline except two added lines; copies logged and anchored (`copy_log.txt:1`, 44 local chain files = 41 + 3). Caveats: S8 (label), unlogged reads cannot be excluded. |
| R7 | Regression on final bytes | 2 | 2 | One full chain on the frozen manifest, all exit 0. |
| R8 | Inventory/manifests | 2 | 2 | 65 files / 65 ok / 11 manifests (`chain.log:310`); my re-hash 42/42. |
| R9 | Evidence integrity (critical) | **1** | 1 | S1 (address), S9 (no transcript for "local = box 42/42" and for "44 uncovered"). |
| R10 | Records | 1 | 1 | Plan-text errors never corrected (S6). Pushed-through claim is true. |
| R11 | Honesty of limits | **1** | 2 | Unlisted: S1, S2, S3, S5; "closes the earlier limit" from n=1 (S10); "frozen P12 9/15, P13 3/6" in the final capture unexplained. |
| R12 | Owner decisions | 2 | 2 | Preamble records them; no push made. |
| | **Total** | **18** | **20** | |

## 3. R1-R8 closure

| ID | Verdict | Evidence |
|---|---|---|
| R1 helper | **Closed** | `p15_lib.sh:59-66`. My synthetic runs: CR-only log = clean (non-empty, grep rc 1); log without final newline = clean/FAILED by content; empty file, directory, missing file, dangling symlink = FAILED; FIFO with no reader = FAILED (rc 0, `-s` false); symlink to a clean file = clean; `STAGE-KEEP` = FAILED. Only production caller is `p14_edge_run.sh:218` (log is truncated by `>` at line 186, then appended). The "exit 4 with empty log" case is a shadowed-oracle case; whether the real freeze-only run prints anything into the same log (so that "empty" can never happen on a normal path) is not in the repo. No normal path I can find yields a legitimately empty log: out-of-envelope strata print `ALLOW-STRATA` (`p20_a_negctl.sh:31`). |
| R2 trap restore | **Closed (extraction-level)** | Bash test: `exit 3` inside an EXIT-trap handler makes the script return 3 and skips the rest of the handler. So the clone drop, the revoke and the `cleanup-final` line are skipped. This matches the CLEANUP-INCOMPLETE branch (`p14_edge_run.sh:54-57`, also `exit 3` before the rest), and the message says "grant and clone left as they are". Skipping is also logically needed (database.xml still points at the clone). The control (`p22_a_negctl.sh` `cl_test`) extracts the real `cleanup()` with `sed`, shadows `$DBXML`/`SQL`/`p15_kill_run_harness`; only the 3 changed lines differ OLD/NEW, so rc 0 → 3 can come from nothing else. It sets `CREATED=0 GRANTED=0`, so it never shows what is skipped (S3). Not run as a real trap and not an induced driver failure: adequately disclosed (§34 "Not done"). |
| R3 clone check | **Closed** | `p15_lib.sh:124-135`. Empty or non-digit counts rejected. Leading/trailing space rejected (I ran `" 5"`). A stderr warning from `mysql` is not captured by `$(...)` and does not break the check. CR is rejected on Linux; Git-Bash strips CR in `$()` so I could not show it locally. Leading zeros pass the digit test and then fail the string compare as "!=" (fail closed; `mysql -N` does not print them). Note: the task doc §2A says "each `mysql` rc is checked"; the code checks output only, not rc (S6). Message change: nothing in `tools/` greps `row-equal`; `tables=${CNT} (= sik)` greps (`p17_a_negctl.sh:46`, `p18_a_negctl.sh:46`) still match; `clone matches` greps in the chains still match. `docs/khanza_benchmark_report_R5.md:1421` still says "row-equal" for history. |
| R4 step 3z | **Closed** | `p22_chain.sh:108-117`. Negative side: the helper is fail-closed, so a missing/empty log gives "match" and the "none" assertion fails; it cannot pass for the wrong reason. Positive side: file presence + `STAGE-KEEP` are asserted independently, so a fail-closed "match" cannot fake it. Weak spots: "newest" log is not tied to this chain's C4 run (name `oracle_20261031T133309Z` matches the C4 time in this run only by inspection); the step duplicates `p22_chain.sh:76`. |
| R5 after-TERM | **Partly** | `r5_mutant_control.txt`: mutant differs from NEW lib in 1 line (stated); output: timing FAIL (elapsed 1 s), count assertion PASS, 26/27. So only the timing assertion discriminates, and the disclosure (§34 R5 row, "Not done") is accurate. Mutant lib not committed. |
| R6 split canned log | **Closed (no old arm)** | `p20_a_negctl.sh:32` diff; `p20-a 27/27` (`chain.log:94`). |
| R7 handoff | **Closed** | `handoff:14,19` rewritten; "pushed through `f771e04`" is true (`git log origin/khanza-r5-p6` = `f771e04`). The "44 uncovered" figure is carried from P20, not re-run (S9). |
| R8 minor points | **Not worked**, disclosed (§34 last paragraph). The task doc §2D said D covers R8; it does not. |

## 4. New findings, most severe first

**S1, major (policy breach).** `evidence/p22/chain_start.txt:4` holds a tailnet-range address in an ssh error line ("Read from remote host …: Connection reset by peer"). Repo is public; task preamble and AC-5 forbid it; the P20 retrace file already records an earlier case. My scan of added lines found only this one address; no credentials; no IPv6 other than checksum strings. §34/§7 do not report an AC-5 scan. Scenario: owner pushes `246564c` as is. Fix: replace the host in that line with `<host>` and rewrite `246564c` before any push (commit is local; needs owner decision), then record the scan in §34. Also: the ssh host alias is committed in 76 lines of earlier evidence plus `copy_log.txt`; it names the hosting provider; pre-existing, not new.

**S2, minor.** `p13_wide_sample.sh` changed but is never run whole in P22 (no mention in `chain.log`; only the extracted `cleanup()` is exercised, `chain.log:115-118`); there is no `bash -n`/parse transcript. AC-4 ("every new file run once on unfrozen bytes") is therefore not met for it. I ran `bash -n` locally: OK. Fix: add `bash -n` for every changed `.sh` to the pre-flight and say so.

**S3, minor.** On the new failure path `exit 3` skips `cleanup-final` (`p14_edge_run.sh:58-61`, `p13_wide_sample.sh:39-42`), so the one case that most needs a final state line writes none; and the control never sets `CREATED=1/GRANTED=1`, so it does not show what stays behind. Not disclosed. Fix: print the probe/DB state line before `exit 3`, and add `CREATED=1 GRANTED=1` to the control.

**S4, minor.** The R5 TERM/KILL-count assertion (`p20_a_negctl.sh:112-113`) is decorative; the mutant that proves the timing assertion is not committed. Disclosed in part. Fix: commit the mutant lib as a one-line `sed` in the control.

**S5, minor.** Unlisted limits: the P20 first-chain C4 hang (harness rc=-1, source of the positive-control log) was never explained; one clean C4 in P22 (`chain.log:127-147`, 29 min) does not show it is gone; p13 driver never run; `frozen P12: 9/15 OK`, `frozen P13: 3/6 OK` appear in both baseline and final capture (`chain.log:14-15,325-326`) with no sentence saying they are superseded manifests; a stray `tools/__pycache__/p22_release_inventory.cpython-312.pyc` was committed.

**S6, minor (records written from the plan).** Task doc §2A: "OLD 10 / NEW 4" for the empty-log oracle_run case; the transcript says OLD 4 / NEW 10 (`chain.log:108`). §2C: "runs 3z first"; `p22_chain.sh` keeps 3z after 4d (`chain.log:300`). §2A "each `mysql` rc is checked": not in the code. §7 corrects none of these. Fix: strike and correct in the task doc.

**S7, minor.** §34 says the `p20-chain-final` label is stale; the baseline capture has the same stale label (`p22_chain.sh:40`, `chain.log:3`). The failure record `20261031T1600Z-*` ("rule: grep the new file for the old wave's name") applies to both, but names only the final one.

**S8, minor.** Wrapper diff vs `p20_chain.sh` (my `diff`): all differences are in the header or task doc §2C/E except the added `2>/dev/null` on the helper calls in 3z and the dropped `basename` from the assertion text at the "newest log" line (neither listed). Neither changes a result.

**S9, minor.** §34 "local = box 42/42" has no transcript file in `evidence/p22/` (P20 had `local_eq_box_*`); it holds transitively (box = manifest at `chain.log:3,314`; manifest = local, my re-hash). Handoff line 19 states "44 uncovered files" as a P22 fact; no P22 retrace output exists, the number is P20's (`evidence/p20/retrace_trace_clean.txt:32`), and P22 added 7 new files.

**S10, minor.** "This closes the earlier limit 'no single full chain on the final wrapper'" (§34): true for the wrapper, but the evidence is one run (n=1) and the chain has already shown one hang in P20.

## 5. Claim vs transcript

| Claim (R5 §34 / task doc §7) | Where | Result |
|---|---|---|
| lib 23/23 | `chain.log:21` | matched |
| P15 A 9/9; P16 A 26/26, E 20/20 | `:25,:29,:33` | matched |
| P17 A 37/37, B 31/31 | `:37,:176` | matched |
| P18 A 50/50, B 33/33 | `:41,:213` | matched |
| P19 A 19/19, B 28/28 | `:62-66,:245` | matched |
| P20 A 27/27, B 10/10 | `:94,:259` | matched |
| P22 A 25/25 | `:123` (25 checks: counted) | matched |
| C4 fixture 27/27, 57 keys / 0 | `:148-151` | matched |
| real 300/300, 1,240 lines, 698/0 | `:152-155`, `chain/real300_lines.csv` = 1,241 lines incl. header | matched |
| `all unit_src MATCH` | `:160` | matched |
| line 33/33; B6 6/6 | `:263-268` | matched |
| suite PASS=39 | `:276`; `e_suite.log`; acceptance md | matched |
| unit 44/44; NC 5 | `:287,:291-296` | matched |
| 21 ASSERT PASS, `asserts-failed=0` | grep count 21; `:333` | matched |
| inventory 65/65, 11 manifests | `:310` | matched |
| 42/42 frozen and lsattr | `:314-315`; `lsattr_chain_end.txt` 42 lines | matched |
| lock 13:11:29Z-15:59:21Z | `lock_acquire_unfreeze.txt`, `lock_release.txt` | matched |
| chain 13:17:28Z to 14:24:06Z | `chain.log:2,313` | matched |
| manifest 42 = 39 + 3 new, 4 changed | my diff (7 files) | matched |
| `.bak_p22` hashes = git | `local_git_hashes_before.txt` vs `git show 875d55a:` | matched (4/4) |
| manifest vs committed `tools/` | my re-hash | matched 42/42 |
| R1 control: OLD 4 / NEW 10 | `:108` | matched (task doc §2A reversed: contradicted) |
| local = box 42/42 | no file | not found |
| 44 uncovered (handoff) | no P22 file | not found (carried) |
| `p20-chain-final` label only on final | `chain.log:3` also stale | partly contradicted |
| "pushed through f771e04" | `git log origin/khanza-r5-p6` | matched |

## 6. Could not verify

- Any box-side fact beyond what is printed: unlogged ssh reads between 14:24Z and 15:58Z (settle: box shell history / auditd). Whether the real oracle's freeze-only output makes an empty log impossible (settle: size of `/tmp/p15e_*.log` after freeze-only). A real EXIT-trap restore failure (settle: induced failure of `p6_dbxml.py restore`). CR handling of `mysql` on the box (Git-Bash differs).
- The two Astra items marked "not confirmed" (`.bak_p17fix1`, P18 vs P17 dating): R5 `:1785,:1869` do say "never hashed" (consistent with the NOTE); dating not compared by me.

## 7. Recommendation

(a) **Yes, stop iterating on bytes.** R1-R3 do what they say; the remaining control gaps (S2-S4) are small and do not hide a defect I could find. Put the effort into the clean-box rehearsal Astra v13 named.

(b) **Fix first:** S1 (remove the address before any push; add the AC-5 scan line to §34); then S6 (strike the three plan-text errors), S9 (state that "44" is carried), S2 (`bash -n` on every changed script).

(c) **Reusable for an international version:** the lock/freeze/unfreeze/re-freeze procedure, hashed transcripts, OLD/NEW paired controls, the fail-closed helper idiom, the release inventory, the line-identity comparator pattern (source-row identity, unit-gate asserts). **Khanza-specific:** the SIMRS Khanza schema (`sik`, `reg_periksa`, `billing`…), the charge-ledger builder, tariff/PPN folding and the 27+300 visit samples, the oracle/harness for that form, and the box layout.

(d) **Yes, the iteration pattern says stop for tool bytes.** Review-then-patch has found sentences the data contradicted in every wave (S6, S7, S9 again here), while the code defects shrank to hygiene. Further waves on the same bytes will mostly find more record errors, not safety defects. Stop adding controls; run the rehearsal; and, for records, generate numbers from the transcript instead of typing them.
