# R5 P23: independent review (2026-11-05)

Reviewer: a fresh session. I did not write P23. I used only the repo, with no box access and no transcripts or memory. I reviewed worktree `Deers-Rock-khanza`, branch `khanza-r5-p6`, HEAD `7f40255`. The tree was clean, so committed bytes = working bytes. Origin is at `c525f97`.

## 1. Verdict

1. **11/24** against the executor's 20/24. The Accept rule is **not met** (R3, R6, R9 = 1).
2. **The self-score is not earned.** The main result holds. C4 fixture 27/27 (57/0) and real 300/300 (1,240 lines, 698/0) appear on both machines, and the line CSVs are byte-equal across machines and to P22. But at least seven record sentences are contradicted by the repo's own transcripts, and the final release was never fully proven on InstaBox.
3. **Most important defect:** the records describe the fix-up cycle in a way the evidence contradicts. They say "19/19 with the variable at 8 **and unset on both machines**" (failure record 0710Z, R5 §36, QMS). InstaBox only ran "set" (`evidence/p23/instabox/i3_fix1.txt:7-8`). The stated root cause, "on the Vultr box (variable not set)", is also false: the Vultr chain exported `P14_MIN_FREE_GB=20` (`evidence/p23/vultr/chain/argv.txt`, `tools/p23_chain.sh:33`). So the Vultr in-chain "unset" cases never tested "unset" either.

## 2. Rubric (R1-R12, rubric of `khanza_r5_task_p20_p19_review_fixes.md` §6 via P22 task doc §5)

| R | Mine | Exec | Reason (citation) |
|---|---|---|---|
| R1 | **0** | 1 | No P23 task doc exists. §36 admits it (`khanza_benchmark_report_R5.md:2061`). `p23_a_negctl.sh:2` still cites "task doc s2", a document that does not exist. Under the P20 meaning (a verification table with every finding opened), the §36 table names 5 of the rehearsal's 12 (b-1…b-12) findings. b-11 and b-12 are not mentioned. Both readings fall short. |
| R2 | 2 | 2 | The driver change is three lines (`tools/p14_edge_run.sh:95-97`). The default is unchanged, non-digits are refused before anything is touched, and it is paired OLD/NEW on the real extracted lines. Two residual weaknesses are logged as S6, not scored here: `0` is accepted, and the success path does not log the threshold. |
| R3 | **1** | 2 | The new control had a leak, and it failed in its own chain (`instabox/chain_stdout.log:133,148`). The same leak was silently present on Vultr, where the inherited value 20 happened to equal the default. F2 covers neither an equal mtime, a future mtime nor a missing `.t0`. The freshness list leaves out `fixture_lines.csv`, `fixture_lines_encounters.json` and the run-start files (S4). |
| R4 | **0** | 1 | At least seven sentences are contradicted by data (S1-S3, S7, S8, table §5). The grants correction is appended below the wrong command instead of striking it (`asset_export_20261023.md:69,74`). |
| R5 | 1 | 1 | Agreed on the score, for different reasons. Manifest b = manifest a with one line changed (verified). The `.bak_p23` hash equals `e61f604` and `local_git_hashes_before.txt`. But on InstaBox the install/freeze ran **before** the lock was acquired (`instabox/i1_install.txt:4-12`, lock at line 12). There is no unfreeze transcript there. The manifest-a `p23_a_negctl.sh` bytes (`aafcfaec…`), which ran in both full chains, are in no commit (S5). |
| R6 | **1** | 2 | Vultr's last capture (chain b, `fix1/chain_b.log`) is complete. The InstaBox last capture keeps only 3 lines: label, databases, `database.xml` (`instabox/i3_fix1.txt:13`). It has no ledger pin, grants or writer markers. The last full InstaBox capture is the chain's step 5 at 07:03:02, before the fix-up. |
| R7 | **1** | 2 | Manifest b never had a full chain. On Vultr it had a `P23_SHORT` chain b. On InstaBox only `p23_a` was run, with the variable set. The product bytes on the C4 path are the same in a and b, so the C4 result carries over. The final control bytes were not run unset on InstaBox. |
| R8 | **1** | 2 | Box inventory 68/68 on both chain-a runs, and 68/68 with 13 manifests on Vultr chain b. On InstaBox the inventory was never run on manifest b. The committed `--local` mode does not know manifest b: run against HEAD it gives **67/68, not_ok `p23_a_negctl.sh`** (S2). |
| R9 | **1** | 2 | Claims without a file or against a file: "every step exit 0 on both", and "set and unset on both machines". Freshness rests on mtimes, which git cannot preserve, so the `fresh` lines are transcript-only. The chain-b directory was not copied (disclosed). |
| R10 | 1 | 1 | `date -u` stamps are present, both SHORT pre-flights are listed ("x2", the two `chain.prev_*` dirs), and a QMS record exists. The first InstaBox job log is "kept" (§36) but is not in the repo. No task doc. |
| R11 | **1** | 2 | Not stated anywhere: the lock-after-install on InstaBox; the unset case not run on InstaBox; the Vultr "unset" cases running with 20; `--local` inventory stale; 8 GB not measured; `JdbcProbe` missing from the §36 limits. "Different machine (… userland in a chroot)" counts identical package versions as a difference. |
| R12 | **1** | 2 | The P23 scope exists only as a paraphrase of a chat answer. The handoff says later commits stay local and asks the owner "OK to push" (item 29). Origin already contains `c525f97`, the commit that asks. No push approval is recorded. Choosing 8 GB was the executor's call, not an owner decision. |
| **Σ** | **11** | 20 | |

## 3. Closure of the rehearsal's findings (`khanza_r5_cleanbox_rehearsal_report.md`)

| Finding | Status | Fix (diff line) | Evidence line |
|---|---|---|---|
| b-9 disk rule (blocking) | **closed, with residue** | `p14_edge_run.sh:95-97`; doc `khanza_r5_reproduce.md` §5.1 | InstaBox driver passed with 15 GB free at 8 (`instabox/chain_stdout.log:18,151-170`, C4 exit 0). Residue: 8 GB is not measured, `0` disables the stop (S6) |
| b-10 stale files pass | **mostly closed** | `p23_chain.sh:31-32,37-39,86-87,123` | 6+2 `fresh` asserts PASS on both (`vultr/chain.log:188-195`). Not covered: `fixture_lines.csv`, `fixture_lines_encounters.json`, `*_run_start_*.txt`; a future-dated file passes (S4) |
| b-3 chain argv unrecorded | **closed** (narrower than the doc says) | `p23_chain.sh:34` | `vultr/chain/argv.txt`, `instabox/chain/argv.txt`. Records the args plus 2 variables, not the launcher, stdout path or other env; reproduce §5.2 calls it "the exact command line" |
| b-6 ssh-only `verify_published.sh` | **closed** (later, not in P23) | `src/verify_published.sh:14-15` | `evidence/instabox_home/verify_published_local_20261105.txt:16` ALL-MATCH (11-05) |
| b-4 conflicting grants | **partly** | note `asset_export_20261023.md:74` | Wrong `GRANT ALL ON sik.*` is still in the command block at `:69`; an operator who copies the block gets the wrong grant |
| b-5 javac encoding | **doc only** | reproduce §5.5 | Not re-run (disclosed) |
| b-1 MSYS path rewrite | **doc only, recurred** | reproduce §5.6 | The executor hit it again (`instabox/i2_chain_start.txt:4`) |
| b-2 upload speed / split | doc only | reproduce §5.6 | – |
| b-7 `.bak` source commits | **closed in doc** | reproduce §5.4 | Gap: the manifest-a `p23_a_negctl.sh` bytes are in no commit, so `.bak_p23fix1` cannot be rebuilt by that recipe (S5) |
| b-8 `JdbcProbe` | not closed (documented) | reproduce §5.7 | Not in the §36 limits |
| b-11 shipped `evidence/p13` dependency | **not closed** | – | Not mentioned in reproduce §5 or §36 |
| b-12 transient exec 502s | not addressed | – | – |
| (c) B4 watcher 20-min wait when C4 cannot run | not addressed | – | Bounded; unchanged |
| (f) 30-min idle pause | not closed (disclosed) | – | – |
| `.bak` `SHA256SUMS` not reconstructable | documented | reproduce §5.4 | – |

## 4. New findings, most severe first

**S1 (major): fix-up records contradicted by their own evidence.**
- *What is wrong:* `records/failures/20261101T0710Z-*.json` ("correction.applied"), R5 §36 ("What went wrong") and the QMS `kept_failures` all say the new bytes passed 19/19 "with the variable at 8 and unset on both machines". On InstaBox only "set" was run (`instabox/i3_fix1.txt:7-8`); there is no unset run there. The root cause says "on the Vultr box (variable not set) it passed 19/19 … in the chain". The chain always exports the variable (`tools/p23_chain.sh:33`), and Vultr's `argv.txt` shows `P14_MIN_FREE_GB=20`.
- *Failure scenario:* the in-chain Vultr 19/19 is cited as proof that the "unset" path works, although it never ran unset. The InstaBox final bytes were never run in the configuration the record names.
- *Fix:* correct the three records. Run the fixed `p23_a` unset on InstaBox, or say it was not run.

**S2 (major): `p23_release_inventory.py --local` does not know manifest b.**
- *What is wrong:* `tools/p23_release_inventory.py:38` lists only `r5_p23_frozen_manifest_20261101.sha256`. I ran it locally against HEAD (`python -B -I … --local <khanza-r5>`) and got `files 68, ok 67, not_ok ['p23_a_negctl.sh']`, with 11 manifests.
- *Failure scenario:* the documented use is "after the final box capture, local files equal the box files". That use now reports the release as broken. Anyone who trusts it either "fixes" the good file back or stops trusting the inventory.
- *Fix:* add `…20261101b.sha256` (a tool change: a new frozen line). Or record it as a known limit, and use the box glob mode only.

**S3 (major): "every step exit 0 on both" (R5 §36, result paragraph) and "both 45 files all green" (handoff Latest wave, ROADMAP P23 line).**
- *What is wrong:* InstaBox ends `p23-a=1` (`instabox/chain_stdout.log:367`). The chain also prints `chain exit=0` (`:368`), even though a step failed. Its exit code is not a verdict.
- *Failure scenario:* a reader of the handoff or ROADMAP believes the second machine was clean on the first run.
- *Fix:* reword to "every step exit 0 except p23-a on InstaBox (control fault)", as the QMS record already says.

**S4 (minor): gaps in the freshness guard.**
- The 6-file list (`p23_chain.sh:87`) leaves out `fixture_lines.csv`, `fixture_lines_encounters.json` and the run-start files. `FS`/`RS` (`:67`) take the name-sorted newest `*_run_start_*.txt`, which on a rebuilt box can be a shipped file.
- `-nt` passes a file with a future mtime. I tested the extracted helper on synthetic files: future-dated → `fresh`, equal mtime → `stale`, empty → `stale`. If `touch .t0` fails (`:32`, not checked), every existing file is `fresh`: with no marker, `-nt` is true.
- The 3z oracle-log freshness is skipped in SHORT mode.
- No legitimate run is failed by the guard: outputs are written minutes after `.t0`. Moving `$B/chain` aside costs about 0.5 MB per run (`du`: 477K full, 65K short), so it is no disk risk. It hides nothing: Vultr's two prev dirs are both in the repo.
- *Fix:* add the 3 files, assert that `.t0` exists, and assert `-nt` and not newer than now.

**S5 (minor): the InstaBox wave was not run under the lock discipline.**
- `instabox/i1_install.txt` installs and freezes the 45 files (lines 4-9). The lock is acquired at line 12, after the files were changed.
- No `chattr -i` / per-file unfreeze transcript and no "prospective manifest == final" check exist for InstaBox (compare Vultr `lock_acquire_unfreeze.txt`, `refreeze.txt`).
- Manifest-a `p23_a_negctl.sh` (`aafcfaec…`) is in no commit. Only `dea74fd9…` was committed (`git rev-list --all -- tools/p23_a_negctl.sh` = one commit), so the bytes that ran in both full chains cannot be rebuilt from git.
- *Fix:* state it in the records; commit the old bytes under `evidence/p23/fix1/`.

**S6 (minor): threshold semantics.**
- `P14_MIN_FREE_GB=0` and `00` are accepted, and `0` passes even with 0 GB free. That silently turns off the stop rule. My synthetic runs of the extracted lines confirm it.
- `08` and `099` are read as decimal (correct).
- 19- and 20-digit values fail closed, but with `[: integer expected` and a misleading `STOP RULE: <…GB` message, not "not a whole number".
- The success path never logs the threshold in use. Only `argv.txt` shows it for the chain; `p15_a`/`p17_a`/`p18_a` call the driver with the inherited environment, and no transcript shows the value they saw.
- The 8 GB value is disclosed (§36, handoff, reproduce §5.1) but not derived. "Roughly 2 GB" (reproduce §5.1) has no measured peak behind it; the only figure is "data is 1.8 GB" (`khanza_r5_thirdbox_spec.md:59`). On InstaBox, free space fell from 15 to 14 GB across the chain (`instabox/chain_stdout.log:18,362`), and the peak during the clone was not captured.
- Lowering a safety stop for the proof run is honest as disclosed, but it is a deviation from the Vultr run, not "the same chain".
- *Fix:* require a value of at least 3, log `MINFREE` and `df` at the check, and record the peak once.

**S7 (minor): wrong reason in item 29 and reproduce §6.4.**
- Both say "the repo blobs carry CRLF". The blobs are LF: `git show HEAD:…` has 0 CRs for all 13 `DEPLOY_MAP` files, and blob hash = `PUBLISHED.sha256`. The CRs come from `git archive` applying `core.autocrlf=true` (31 CRs in `MiniParse.java` from `git archive`).
- The procedure works. The reason given is wrong and misleads a non-Windows operator.

**S8 (minor): stale push records.**
- Handoff "Records" (line 19) says "pushed through `f771e04` (P21), later commits local only". Item 29 asks "OK to push". `origin/khanza-r5-p6` = `c525f97`, which contains P22, P23 and item 29 itself.

**S9 (minor): names in the public repo.**
- The rehearsal scrubbed the machine name (`SCRUB_NOTE.txt`). P23 and the 11-05 docs name the machine in 16 added lines, two snapshot names in 6, the exec account name once, the ssh alias in 4 new lines, and two job ids.
- No address, e-mail or credential (scan in §6).
- *Fix:* replace with placeholders, as the rehearsal did.

**S10 (minor): "different machine (kernel, CPU, RAM, host userland, userland in a chroot)" (R5 §36).**
- The benchmark userland is the same: identical package versions (`khanza_r5_instabox_chroot.md:31`). What is the same: export, dumps, ledger pin, frozen bytes, `.bak` dirs, operator for P23, Java/MySQL versions, `DBUTIL_FORCE_ROOT=1`.
- What differs: kernel, CPU count and model, RAM, buffer pool (3G vs 6G), disk size, host OS, chroot, threshold 8. The Vultr kernel is not recorded in P23 evidence.
- "Reproduces" is right for this (same inputs, different hardware and host). It is a portability check by the same operator, not an independent reproduction.

## 5. Claim vs transcript (V = `evidence/p23/vultr/chain.log`, I = `evidence/p23/instabox/chain_stdout.log`)

| Claim (R5 §36) | V | I | Status |
|---|---|---|---|
| every step exit 0 on both | :366 all 0 | :367 `p23-a=1` | **contradicted** (I) |
| 45 frozen, lsattr 45 start/end | :3-4, :347-348 | :4-5, :348-349 | matched |
| lib 23/23 | :21 | :22 | matched |
| P15 A 9/9 | :25 | :26 | matched |
| P16 26/26, 20/20 | :29, :33 | :30, :34 | matched |
| P17 A 37/37, B 31/31 | :37, :207 | :38, :208 | matched |
| P18 A 50/50, B 33/33 | :41, :244 | :42, :245 | matched |
| P19 A 19/19, B 28/28 | :64, :276 | :65, :277 | matched |
| P20 A 27/27, B 10/10 | :95, :290 | :96, :291 | matched |
| P22 A 25/25 | :124 | :125 | matched |
| p23-a 19/19 | :147 | :148 = 18/1 | V matched, I **contradicted** (disclosed later in §36) |
| old bytes 18/1 at 8 | `fix1/vultr_fix1.txt:9-10` | `i3_fix1.txt:9-10` | matched |
| new bytes 19/19 "set and unset on both" | set :7, unset :12 | set :8 only | **contradicted** (I unset not run) |
| C4 fixture 27/27, 57/0 | :172 | :173 | matched |
| real 300/300, 1,240 lines, 698/0 | :176 | :177 | matched; CSVs byte-equal V=I=P22 (my `cmp`) |
| line 33/33, B6 6/6 | :294, :298 | :295, :299 | matched |
| suite PASS=39, unit 44/44, NC 5 | :307, :318, :327 | :308, :319, :328 | matched |
| 29 ASSERT PASS / 0 FAIL | 29 / 0 (`grep -c`) | 29 / 0 | matched |
| inventory 68 ok, 12 manifests | :343 | :344 | matched (chain a). Final state: Vultr 13 manifests (`chain_b.log`), I not run on b |
| "InstaBox numbers equal Vultr" | – | – | matched for counts and line files. Elapsed and rates differ (V 1564 s / 11.51 per min, I 1485 s / 12.12 per min) |
| hang did not recur (3 clean C4) | :162-163 | :163-164; P22 `chain.log:139` | matched |
| locks: Vultr released 07:06:25, IB 1 s later | `lock_release.txt:1-3` | `:4-7` | matched. IB acquire **after** install (S5) |
| manifest b = a with one line changed | `diff`: line 39 only | – | matched. b = HEAD 45/45 (my re-hash, CR removed); a = 530a63f except `p23_a_negctl.sh` |
| `.bak_p23` = P22 bytes | `lock_acquire_unfreeze.txt:7` = `local_git_hashes_before.txt` = `git show e61f604` (`8b6c1ea6…`) | `i1_install.txt:6` same | matched |
| `.bak_p23fix1` = manifest a | `vultr_fix1.txt:2` | `i3_fix1.txt:5` | matched (`aafcfaec…`) |
| 3 pre-flight starts | `chain.prev_*` (05:55:07, 05:55:42) + full 05:56:47 | – | matched (`preflight/p23_chain_short.txt` "x2") |

## 6. Could not verify, and what would settle it

- File mtimes behind the `fresh` asserts (git keeps no mtimes). Would settle it: a `stat` listing of the chain dir in the transcript.
- The peak disk use during the clone on InstaBox. Would settle it: a `df` sampler during step 3.
- The filesystem that holds MySQL's datadir inside the chroot. `du` in `cleanbox_rehearsal/s7_final.txt` shows 4.0K for `var/lib/mysql`, probably from running `du` without sudo. If the datadir sits on the host root, `df /` in the chroot measures the wrong disk. Would settle it: `SELECT @@datadir` plus `df` of that path.
- Where the repo copy sat for the 11-05 `BOX=local` run. If it was unpacked so that `tools/` is the box's `/opt/Deers-Rock/tools`, the `stagea_common.py` line compares a file with itself. Every other line compares a different path. A missing repo file gives `SAME` on lines 13-16, because both hashes are empty, but step 1 (`PUBLISHED.sha256`, all 13 listed) catches that. Would settle it: the extraction path in the transcript.
- The launcher of the InstaBox chain (how the variable crossed `sudo chroot`), and the first job's log.
- The Vultr kernel and CPU model during P23.
- Whether the owner approved the push of `c525f97`.
- Scan run: added lines of `git diff 11cf629 HEAD` (36,809 lines), regex checks for IPv4, Tailscale 100.64/10, IPv6, e-mail, `ts.net`, `.local/.lan`, `hf_`/`ghp_`/`sk-`/`AKIA`/PEM, `passw|secret|aes_key|aes_iv|token [=:]`. Hits:
  - IPv4: only the version string `17.0.20.1`.
  - IPv6: 18, all colon-joined counter strings in negctl output.
  - Others: 0.
  - Names: see S9.

**What I ran:** `git status/log/diff/show/rev-list/archive`, `sha256sum` with CR stripped (both manifests against HEAD and `530a63f`, the `.bak` hashes, the `DEPLOY_MAP` blobs), `bash -n` on the three shell tools (OK), `python -m py_compile` (OK; this created `tools/__pycache__/`, which I deleted at once), `p23_release_inventory.py --local` (output to the scratch dir), and the extracted threshold lines and `p23_isfresh` on synthetic inputs in a scratch dir. I wrote no other file in the repo.

## 7. Recommendation

**(a) Stop iterating on bytes?** Yes, for the product and driver. C4 holds on two machines, and the line files are byte-equal to P22. Do not call the benchmark "handed over" until the records match the transcripts. Today the handoff, ROADMAP, R5 §36, QMS and the failure record each hold at least one false sentence.

**(b) Fix first (one batch, then stop):**
1. Documents only: S1, S3, S7, S8, S9, S10, the grants block (strike `:69`), and the missing limits from R11.
2. One last small tool batch under the usual unfreeze, only if the owner wants it:
   - add manifest b to the inventory `--local` ORDER (S2);
   - refuse `P14_MIN_FREE_GB` below 3 and log the threshold (S6);
   - add the 3 missing files and a `.t0` existence check to the freshness asserts (S4).
3. Then one full chain on InstaBox, with the lock taken before any install, and the unset case run there. Otherwise, write S2, S4 and S6 down as limits and stop.

**(c) Reusable for an international version:**
- the run lock;
- freeze/unfreeze/re-freeze with hashed transcripts;
- paired OLD/NEW controls on lines extracted from the real tool with shadowed externals (`df`, `res`);
- the fail-closed helper idiom;
- the move-aside plus `argv.txt` plus mtime-freshness pattern;
- env-parameterised stop rules with validation;
- the release inventory (with S2 fixed);
- the source-row line-identity comparator with unit-gate asserts;
- `verify_published.sh` with `BOX=local`;
- an exact-version userland in a chroot on a host of any distribution;
- encrypted off-box archives with a pull test;
- the two-machine comparison (byte-equal line files).

Khanza-specific:
- the SIMRS schema;
- `sik`/`sik_bench` and the charge-ledger pin;
- tariff/PPN folding;
- `database.xml` AES wiring, the Java harness and consumer;
- the 27+300 samples;
- the `p14` clone procedure and its disk need;
- the P15-P23 history arms of the chain. Do not carry over the eight `.bak` arguments: start the international chain with a small fresh set.

**(d) Does the pattern say stop?** Yes. Self-score gaps are 6, 7, 3, 3, 3, 2 and now 9. The defect class has not changed in eight waves: sentences written from the plan or memory and not checked against the transcript. Another byte wave will not fix that. A mechanical claim extractor would: a script that pulls every count in the R5 table from the chain logs and fails on a mismatch. Make the next deliverable the corrected records plus that check, then hand over.
