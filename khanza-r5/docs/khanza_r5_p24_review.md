# R5 P24: independent review (2026-11-08)

Reviewer: a fresh session. I did not write P24. I used only the repo: no box, no transcripts, no memory, no scratch dirs of the executor.
The shared checkout is on `epic-x-international`, where `khanza-r5/` holds only untracked local env files, so I reviewed the **committed bytes**
of `0903b95` (P24 final; `b3008c0` task doc, `a5717d0` tools) via `git archive 0903b95 khanza-r5 ROADMAP.md` into a scratch dir.
`origin/khanza-r5-p6` = `0903b95`. Citations are paths inside `khanza-r5/` at `0903b95` unless they say otherwise.

## 1. Verdict

1. **16/24** (P23 was 11/24; the executor gave no self-score). The Accept rule is **not met**: R3 = 1 and R9 = 1.
2. **Most important defect (T1):** the correction of the P23 review's S1 adds a new false sentence, in three records. It cites the P24 frozen run of
   **`p24_a`** (`evidence/p24/refreeze.txt`, `box/p24/p24_a_frozen_unset.txt`, 29/29) as the first InstaBox run of **`p23_a`** with the
   variable unset. That file is a different control (G1-G4, not F1). The real first InstaBox run of `p23_a` unset is pre-flight 1 (`evidence/p24/preflight1_stdout.txt`, "p23_a ... unset and 8", 19/19), on unfrozen bytes. This is the defect class every review has found: a sentence written from intent and not reopened against its log.
3. **AC-4 disclosure:** honest at the headline ("not met as written", R5 §37 l.2114), **incomplete underneath**:
   - The hang's process state was never captured, although the P24 failure record's own rule requires it.
   - The record's root cause ("the harness has no wall-clock limit") is contradicted by the code: there is a default `R5_HARNESS_TIMEOUT_S` of 1800 s at `tools/sampled_real_form_diff_r5.py:1609`. The manual kill at about 16 minutes therefore pre-empted the designed timeout path.
   - The 4d re-run's command and script are not in the repo.

## 2. Rubric (R1-R12 of `docs/khanza_r5_task_p20_p19_review_fixes.md` §6, via the P22 task doc §5; critical R2, R3, R6, R9)

| R | Score | Reason (citation) |
|---|---|---|
| R1 | 2 | The task doc `b3008c0` (05:25:46Z) is earlier than the first box action (`evidence/p24/deploy.txt:1`, 05:28:56Z). Its table opens S1-S10 and R1 with file:line each. Residue: its §7 "Result" still reads "(filled after execution)" (`docs/khanza_r5_task_p24_p23_review_fixes.md:55`), and the review it answers entered the repo only in `0903b95` (absent from `b3008c0` and `a5717d0`, my `git cat-file -e`). |
| R2 | 2 | The driver change is two added lines after the three P23 lines, which are unchanged (`git diff 530a63f 0903b95 -- tools/p14_edge_run.sh`). I ran the extracted lines: 0 and 00 are refused at any free space, 2 is refused (by the floor or the STOP RULE), 3 and 08 pass and are logged, `' 8'` is refused. Residue: T9 and T12 (minor). |
| R3 | **1** | G1-G3 are real paired controls (`tools/p24_a_negctl.sh:23-72`; I re-ran G3's cases plus equal-mtime and sub-second). G4, the control for the S3 verdict fix, only counts strings (`:75-80`). It never executes the verdict loop. No control covers what the loop leaves out: `frozen`/`lsattr`, the inventory exit `IV`, the teardown (T4). Its first version was itself vacuous-adjacent (it matched a comment, pre-flight 1). |
| R4 | **1** | Strike-through, with the old text kept, is used everywhere. But: the S1 correction is false in 3 places (T1); the new failure record's root cause is contradicted by the code (T2); the handoff "Records" row and item 30 were contradicted by the push 3.5 min after the commit (T3); the handoff "Live data" and "Frozen tools" rows and the ROADMAP status line are stale (T10). |
| R5 | **1** | Lock before the first change (`deploy.txt:3-4`). Manifest = P23 manifest b with `p14_edge_run.sh` changed plus 3 new lines (my `diff`). It re-hashes 48/48 against the committed `tools/` (CR removed), and `.bak_p24` `04abd58d…` = `git show 530a63f:…/p14_edge_run.sh` (mine). But the G4-fix redeploy of `p24_a_negctl.sh` (`24d3e8be…` → `87940be7…`) and the manifest regeneration between pre-flight 1 and 2 have **no transcript**. `deploy.txt:15` stages a manifest (`d3af8416…`) that is not the frozen one. There is no `chattr -i` line under "unfreeze p14_edge_run.sh only" and no `local_git_hashes_before.txt` (AC-2 names it). (T5) |
| R6 | 2 | The final capture comes after the re-run (`box/p24/nc_rerun_stdout.log:14-28`, 07:00:13Z): databases, `database.xml`, writer markers 0, grants, ledger pin, live counts, frozen 48/48, lock. It is complete and last, except the lock release at 07:01:28Z (`lock_release.txt`). It was made by an ad hoc script that is not in the repo (noted under R9). |
| R7 | **1** | One full chain on the 48 final bytes with C4 27/27 and 300/300 (`chain_stdout.log:206,210`). Step 4d failed (`:366-369`) and was re-run alone, so AC-4 is not met (disclosed). |
| R8 | 2 | Box: 71/71 with 14 manifests (`chain_stdout.log:383`; the box JSON pins `p24_a_negctl.sh` = `87940be7…` from the P24 manifest). `--local` on the committed bytes: I ran it and got **71 files, 71 ok, not_ok [], 13 manifests**. No transcript of the executor's `--local` run is committed. |
| R9 | **1** | The claim checker proves log text, not the record (§5, T7). Statements without a file: the hang state ("futex_wait", "load 0.00", "processlist idle"; the note's only `ps` output was taken after the kill and is empty, `chain_harness_hang_note.txt:2-3`); the 502s; "hash checked against the box" for the manifest-a bytes; the pre-flight 2 environments (`preflight_stdout.txt` holds an exec-CLI error, not a transcript; the set/unset outputs are byte-identical, `cmp`). The P24 AC-7 (scan) result is reported nowhere. |
| R10 | **1** | `date -u` stamps are present, both `chain.prev_*` dirs are kept, and there is a QMS record. But pre-flight 2 has no stdout (the file of that name is the CLI error), the task doc §7 is unfilled, and the re-run has no argv record. |
| R11 | **1** | AC-4 is stated honestly and there is no self-score. Not stated or overstated: AC-5 "met" (the AC asks for the P23 claims; 2 of them are encoded); AC-6 "met" (T1); "AC-7 below" (l.2114) points at nothing, and the AC-7 in the limits is the P20 retrace, a different item. Also missing: the 1800 s harness timeout pre-empted; the df resolution and the clone steps not sampled (T8); the datadir/`df /` question carried from the P23 review. |
| R12 | **1** | The P23 push approval is now recorded (handoff l.19, item 30). The scope and home decisions are recorded. But `0903b95`, whose own handoff says "later commits stay local until the owner says" and lists "owner: OK to push", was pushed at 14:07:14 +0700, 3.5 min after the commit time (`git reflog show --date=iso origin/khanza-r5-p6`). No approval for that push is recorded (T3). |
| **Σ** | **16** | Accept needs R2, R3, R6, R9 = 2: **not met**. No single item meets it: R3 and R9 each need one. The smallest pair: (R3) a control that runs the extracted verdict loop with each step variable set to 1 in turn, and adds `frozen`/`lsattr`/`IV` to the loop; (R9) a re-run of the claim file built from the record's own numbers (§7e), plus T1 corrected. |

## 3. Closure of the P23 review's findings

| Finding | Status | Fix (diff line) | Evidence |
|---|---|---|---|
| S1 fix-up records | **partly; new false sentence** | R5 l.2078, §37 l.2093, failure record `20261101T0710Z…:7,14`, P23 QMS | The removed claim is gone and Vultr's in-chain 20 is right (`evidence/p23/vultr/chain/argv.txt`). The added "unset on InstaBox first ran on the P24 frozen bytes (`refreeze.txt`)" cites a `p24_a` run. The `p23_a` unset run on InstaBox is `evidence/p24/box/p24/preflight1/p23_a_unset.txt:22`, unfrozen (T1) |
| S2 `--local` lacks manifest b | **closed** | `tools/p24_release_inventory.py:39-40` | my `--local` run: 71/71, 13 manifests; G2 dynamic 13/13 (`chain_stdout.log`, G2 line) |
| S3 "every step exit 0" | **closed** (residue T4) | R5 l.2072; handoff l.14; `tools/p24_chain.sh:147-149` | P23 `CHAIN DONE` lines: InstaBox `p23-a=1` only, Vultr all 0 (my grep), so the amendment is exact. The verdict printed STEP-FAILED and `chain exit=1` (`chain_stdout.log:407-408`); ALL-STEPS-OK in pre-flight 2 (`preflight/p24_chain_short.txt`, last line) |
| S4 freshness gaps | **closed** | `p24_chain.sh:34,39-42,93-96` | 11 `fresh` asserts plus the marker (`chain_stdout.log:222-233`). My helper runs: equal mtime is stale, +2 s is stale, +0.5 s after the marker is fresh, with no marker everything is stale. A failed `touch .now` fails closed (`-nt` against a missing file is true, then negated) |
| S5 order, manifest-a bytes | **mostly closed** | `deploy.txt:2-4`; `evidence/p23/fix1/p23_a_negctl.manifest_a_bytes.sh` | The lock comes before any change. The committed bytes hash to `aafcfaec…` (mine) = `evidence/p23/fix1/vultr_fix1.txt:2`. Gap: the redeploy of the second version has no transcript (T5) |
| S6 threshold semantics | **partly** | `tools/p14_edge_run.sh:98-99` | Floor and log line work (G1; my synthetic runs; `chain/c4_driver.log:2` "threshold 8GB, 14GB free"). Not closed: the 8 GB is still unmeasured in a useful sense (T8); 20-digit values still give `integer expected` plus a misleading STOP RULE (T12); the log line re-reads `df` (T9) |
| S7 CRLF reason | **closed** | handoff l.52; `docs/khanza_r5_reproduce.md:62` | The wording now matches the P23 review's own measurement |
| S8 stale push record | **partly; recurred** | handoff l.19, l.53 | The `c525f97` approval is recorded; `0903b95` was pushed with no recorded approval, against its own text (T3) |
| S9 names | **not closed (by decision)** | task doc l.21, §37 l.2101 | See §4 T11 and the scan in §6 |
| S10 "different machine" | **closed** | R5 l.2075 | Accurate, except "kernel ... differ": the Vultr kernel is not recorded (P23 review §6), so that one part is asserted, not shown |
| R1 (no P23 task doc) | **closed for P24** | `b3008c0` | Commit time is before `deploy.txt:1` |
| R12 (push approval) | **partly** | handoff l.19 | T3 |
| Grants block | **closed** | `docs/asset_export_20261023.md:69,74` | The block itself now has the four privileges; the note says so. It agrees with "Post-restore wiring" l.107 |
| b-11, b-12, `JdbcProbe` in limits | **closed** | R5 l.2115; QMS `not_done` | – |

## 4. New findings, most severe first

**T1 (major): the S1 correction is a new false sentence, in three records.**
- *What:* R5 §36 l.2078 ("on InstaBox the unset case first ran on the P24 frozen bytes (`evidence/p24/refreeze.txt`)"), §37 l.2093 ("The unset case ran on InstaBox for the first time on the P24 frozen bytes (`…p24_a_frozen_unset.txt`, 29/29)") and failure record `20261101T0710Z…:14`.
- *Why it is false:* both cited files are runs of `p24_a_negctl.sh` (G1-G4; `p24_a_frozen_unset.txt:2` reads "## G1"). The P23 finding is about `p23_a_negctl.sh` F1. The first InstaBox `p23_a` unset run is pre-flight 1, at 05:29-05:30Z, on unfrozen P24 bytes (`preflight1_stdout.txt`: "p23_a … unset and 8 … rc=0 … 19/19"; `box/p24/preflight1/p23_a_unset.txt:22`). It ran against the P24 driver, not the P23 driver. So the P23 state of InstaBox (the P23 driver with the fixed control, unset) was never run at all.
- *Failure scenario:* a reader takes `p24_a` 29/29 as proof that the P23 F1 leak is closed on InstaBox. The claim checker passes it (claim 14 is true for `p24_a`).
- *Fix:* in the three places, replace the clause with: "`p23_a` (fixed bytes) ran unset on InstaBox first in P24 pre-flight 1 and 2 (`box/p24/preflight1/p23_a_unset.txt`, `preflight/p23_a_unset.txt`), against the P24 `p14_edge_run.sh`; the P23 driver with the variable unset was never run on InstaBox."

**T2 (major): the hang record states a cause the code contradicts, and its own rule was not followed.**
- *What:* `records/failures/20261105T0710Z…:11` says "the harness has no wall-clock limit under the NC runner". The only harness call is `run_harness(…, int(os.environ.get("R5_HARNESS_TIMEOUT_S", "1800")))` (`tools/sampled_real_form_diff_r5.py:1608-1609`, `p.wait(timeout=timeout_s)` at `:995`). `p11_negative_controls.sh` does not override it (grep). So the hung `java` was about 14 minutes from the designed timeout, the writer-dead proof and the hash-verified restore (the path that worked in P20, `20261027T1446Z…`).
- *The rule:* the record (`:18`) says a hung child is terminated "only after the process state is written to the evidence". The only state in the repo is prose (`chain_harness_hang_note.txt:1`). The `ps` output in that file was taken after the kill at 06:50:20 and has no rows (`:2-3`). `detection` (`:12`) cites "the process list during step 4d", which is not in the repo.
- *Failure scenario:* the next wave copies "no wall-clock limit" as the cause, adds a second timeout, and still has no diagnostics. Meanwhile the real mechanism (a 30-min timeout that a 26-min NC step never reached) stays unexamined.
- *Fix:* correct the root cause ("a 1800 s timeout exists; it was pre-empted by a manual TERM at about 16 min"). State that the futex/load/processlist facts are uncaptured. Next time capture `ps -o pid,stat,wchan,etime`, `/proc/<pid>/stack` and `jstack` to a file before any signal.

**T3 (major): the push record is contradicted again (the P23 S8/R12 class).**
- *What:* handoff l.19: "later commits stay local until the owner says". Item 30 (l.53): "owner: OK to push". The remote-tracking reflog shows `0903b95` "update by push" at 2026-11-05 14:07:14 +0700, 3 min 30 s after its commit time. No approval for that push is in the repo.
- *Failure scenario:* the next session reads "local only, ask the owner", asks again, or force-reasons about divergence. Or an auditor cannot tell whether the push was approved.
- *Fix:* one handoff line: "pushed through `0903b95` on <date>, owner approval <where>"; drop "OK to push" from items 29/30.

**T4 (major for the S3 claim, minor for the result): the chain verdict does not cover every check.**
- *What:* the loop at `tools/p24_chain.sh:147` lists 24 step variables and `AF`. These are outside it:
  - `frozen` and `lsattr` at start and end (`:46-48`, printed, never asserted);
  - the inventory exit `IV` (`:139`, covered only indirectly: a crash empties the JSON and the `not_ok` assert fails);
  - the teardown `p14_drop_clone.sh` (`:117`, exit not captured);
  - the `sik_p6f` leftover note (`:127`);
  - the step-5 live-state script.
- *Failure scenario:* a box where one frozen file lost its `i` flag, or the clone drop failed, ends `chain verdict: ALL-STEPS-OK`, exit 0. §37 l.2095 calls this "the first time the chain's exit code was a verdict".
- *Also:* the sampler is started with `&` and has no EXIT/TERM trap (`:69`, `:118`). If the chain is killed in step 3 (for example by the 480-min job limit), the sampler keeps writing every 10 s.
- *Fix (next chain, not another Khanza wave):* `asrt` the two `frozen` counts against `$(grep -c . $MAN)`, add `IV` and a teardown rc to the loop, `trap 'kill $DFP' EXIT`. Add a control that runs the extracted loop with each variable set to 1.

**T5 (minor): the second staging has no transcript.**
- *What:* `deploy.txt:9-16` stages `p24_a_negctl.sh` `24d3e8be…` and a manifest `d3af8416…`. Pre-flight 2 ran `87940be7…` (`box/p24/preflight/hash_header.txt:3`), and the frozen manifest hashes to `41079381…` (mine). The redeploy, the regenerated manifest and its "deployed vs manifest" check are in no file. Pre-flight 2 did run on the bytes that were frozen: its hash header = the manifest lines = `refreeze.txt` 48/48 = box inventory pin. There is no `chattr -i` line under "unfreeze p14_edge_run.sh only" (`deploy.txt:7`), and no `local_git_hashes_before.txt` (AC-2).
- *Failure scenario:* an auditor cannot show that nothing else changed in the 90 s between 05:30:35Z and 05:32:07Z.
- *Fix:* state it in §37; in future, a deploy transcript per staging.

**T6 (minor): pre-flight 2 has no stdout; the set/unset runs cannot be told apart.**
- *What:* `evidence/p24/preflight_stdout.txt` is the exec CLI's refusal of a 1500 s timeout, not a pre-flight transcript. `preflight/p24_a_unset.txt` and `p24_a_set8.txt` are byte-identical, and so are the `p23_a` pair and the pre-flight 1 pair (`cmp`). The controls unset the variable internally, so the outputs cannot show the environment.
- *What still proves it:* the "exported" case is proven by the full chain (`chain/argv.txt` `=8`, `p24_a` 29/29). The "unset" case on the frozen bytes rests only on the label in `refreeze.txt:4`.
- *Fix:* print `P14_MIN_FREE_GB=${P14_MIN_FREE_GB-<unset>}` as the first line of every control run; rename or annotate `preflight_stdout.txt`.

**T7 (minor): acceptance statements overstate.**
- *What:* AC-5 (task doc l.41) asks for the claim check "over the P23 claims and the P24 claims". The claims file has 2 P23 claims (`docs/p24_claims.json`, the last two). §37 l.2114 still says "AC-5 met (32/32)".
- AC-6 "met": see T1.
- "AC-7 below": there is no AC-7 result below. The "AC-7 retrace (44 files)" in the limits (l.2115) is the **P20** AC-7, not the P24 public-repo scan (task doc l.43).
- *Fix:* "AC-5 met for the P24 numbers only; AC-6 not met (S1 clause); AC-7 (scan): <result or not run>".

**T8 (minor): the df sampler cannot measure the clone, and its coverage is narrower than "the clone".**
- *Resolution:* `df -BG` rounds up to whole GB. Of 167 samples, 5 read 14 (the first 50 s) and 162 read 13 (`awk … | uniq -c`), including the sample 2 s after the drop (06:14:55). So the clone's footprint cannot be seen at all at this resolution.
- *Coverage:* the sampler covers step 3 only. Step 1f (`p18_a`, "B4 builds its own clone", `chain_stdout.log:41`), 4a (suite, `sik_p6f`) and 4d (NC builds) are not sampled. Free space was 14 GB in both live-state captures (`chain_stdout.log:19,402`).
- §37 l.2098 says "one measurement, not a margin", which is honest, but it calls the result "the peak use of the clone" in the task doc. In fact it is "no visible change at 1 GB resolution".
- *Fix:* sample `df -B1M` (or `--output=avail` in KB) over the whole chain; record `@@datadir` and `df` of it (open since the P23 review §6).

**T9 (minor): the new log line re-reads `df`.**
- *What:* `p14_edge_run.sh:99` calls `df` again after the check at `:97`. With a shadowed `df` that returns 14 and then 2, the extracted lines print "threshold 8GB, 2GB free on /" and pass. The log line can contradict the value that passed.
- *Fix:* read once into a variable, compare it, log it.

**T10 (minor): stale state rows the P24 records left in place.**
- Handoff "Live data" (l.16) still says "No `LOCK` held. 71 GB free on `/`": that is the Vultr figure; the home has about 14 GB in the chroot.
- "Frozen tools" (l.17) says 39 files (P20); now 48.
- The ROADMAP Epic XI status (`ROADMAP.md:310`) says "through P23 … Open: independent re-score of P23", and `- [ ] Independent re-score of P23` (l.350) is unticked, although the re-score (11/24) is in the repo and P24 is listed at l.352.

**T11 (minor): names in the public repo.** Over `11cf629..HEAD` the added lines contain:
- the machine name (16 lines), two snapshot names, an exec job id and a hung-process pid;
- in P23-era evidence, the local **Windows account name** in Windows paths (10 lines) and as the box exec user (`docs/khanza_r5_reproduce.md:59`);
- a **Claude session UUID** inside a scratch path (`evidence/cleanbox_rehearsal/chain_run_sha256.txt`).

I agree with S9 for machine and snapshot names (operational, not secrets). I do not agree for the account name and the session UUID: they identify a person and a session, and the rehearsal scrubbed the same class (`SCRUB_NOTE.txt`). Fix: placeholders in those lines.

**T12 (minor, carried): 19- and 20-digit thresholds.** `99999999999999999999` still prints `[: integer expected` and `STOP RULE: <99999999999999999999GB free` (my run). It fails closed, but the message is misleading. The P23 review noted it (S6), and P24 neither fixed it nor listed it.

**T13 (minor): provenance of the reviewed review.** `docs/khanza_r5_p23_review.md` first appears in `0903b95`, the same commit as the corrections. The task doc (`b3008c0`) cites it before it existed in the repo. Nothing shows the committed review equals the one delivered. Fix: commit an independent review on its own before the response wave.

Checks that found nothing:
- The `p23_a` F1 extraction on the new driver bytes: still 3 lines, 19/19 unset and at 8 (`preflight1_stdout.txt`; `chain_stdout.log:148`).
- The OLD/NEW difference in G1 can only come from the two added lines: the ranges share the same first three lines (`diff` of the extractions).
- The renamed labels and the `P24_SHORT` rename are the only other differences between `p23_chain.sh` and `p24_chain.sh` besides the reviewed hunks (`diff`).
- No frozen wrapper calls `p24_chain.sh` (`grep -rl` finds only the controls and the chain itself), so `exit $RC` changes no other tool's behaviour. The only consumer is the exec CLI's job status, which now reports failure correctly.

## 5. Claim vs transcript (C = `evidence/p24/box/p24/chain_stdout.log`, N = `…/nc_rerun_stdout.log`)

| Claim (R5 §37 unless noted) | Line | Status |
|---|---|---|
| lib (as in P23, 23/23) | C:22 | matched |
| P15 A 9/9, P16 26/26 + 20/20, P17 A 37/37, P18 A 50/50, P19 A 19/19 | C:26,30,34,38,42,65 | matched |
| P20 A 27/27, P22 A 25/25, P23 A 19/19, P24 A 29/29 | C:96,125,148,181 | matched |
| P17 B 31/31, P18 B 33/33, P19 B 28/28, P20 B 10/10 | C:246,283,315,329 | matched |
| C4 fixture 27/27 (57/0) | C:206 | matched |
| real 300/300, 1,240 lines, 0 fail (698/0) | C:210 | matched |
| line 33/33, B6 6/6 | C:333,337 | matched |
| suite PASS=39, unit 44/44 | C:347,358 | matched |
| every step exit 0 except nc=1; STEP-FAILED | C:406-408 | matched (with T4: not every check is a "step") |
| NC5 `without=FAIL -> NOT-DISCRIMINATING` | C:366 | matched |
| NC5 java in futex_wait about 16 min, load 0.00 | hang note l.1 (prose only) | **not found** in any captured output |
| inventory 71/71, 14 manifests (box) | C:383 | matched |
| `--local` 71/71 | no transcript | **not found** in the repo; **reproduced** by me (71/71, 13 manifests) |
| df 14 → 13 GB, 167 samples | C:344; `chain/df_samples.txt` | matched (T8: GB ceiling; 162/167 at 13) |
| 48 frozen, `lsattr` 48/48 start and end | C:4-5, 387-388 | matched |
| all freshness asserts `fresh` | C:222-233, 374, 377 | matched |
| lock 05:28:57Z → 07:01:28Z | `deploy.txt:2-4`; `lock_release.txt:3` | matched |
| chain 05:33:22Z → 06:50:27Z | C:1, 408 | matched |
| 4d re-run 06:51:03Z, 5/5 | N:1, 10 | matched |
| final capture 07:00:13Z: `sik`/`sik_bench`, xml → `sik`, 0 markers, pin, 48/48, lock | N:14-27 | matched |
| `.bak_p24` = `04abd58d…` = `git show 530a63f` | `deploy.txt:8`; my hash | matched |
| manifest = 45 of b, 1 changed, 3 new | my `diff` and re-hash 48/48 | matched |
| pre-flight 1 `p24_a` 28/1 (G4 matched a comment) | `preflight1_stdout.txt`; `git diff a5717d0 0903b95` (the pattern fix) | matched |
| pre-flight 2: `p24_a` 29/29 unset **and exported**, `p23_a` 19/19 both ways, SHORT ALL-STEPS-OK | `box/p24/preflight/*` | counts matched; **environment not shown** (T6) |
| unset `p23_a` first on the P24 frozen bytes (S1 row) | `p24_a_frozen_unset.txt` | **contradicted** (it is `p24_a`; T1) |
| manifest-a bytes "hash checked against the box" | committed file = `aafcfaec…` = `vultr_fix1.txt:2` | hash matched; box check **not found** |
| 502s for about 10 min | – | **not found** |
| AC-5 met (32/32) | `docs/p24_claims.json` | **overstated** (2 P23 claims; T7) |
| "32 claims, 0 not matched" | my run, exit 0 | matched (as a statement about log text) |

**The claim checker.**
- *What I ran:* `python -B -I tools/p24_claim_check.py docs/p24_claims.json` gives 32 MATCHED, exit 0.
- *Five claims spot-checked* (13, 16, 22, 23, 27): each matched line says what the claim says (C:181, C:210, C:383, C:344, N:10).
- *Weak points:*
  - Unanchored patterns: `44/44 cases PASS`, `min_free_GB=13 `, `writer markers: 0` (would also match `…: 07`).
  - `count` is a lower bound (`>=`).
  - `forbid` is a file-wide search, used once (claim 25), with no link to the claim's line.
  - Most important: nothing ties a claim to a record sentence. It cannot catch a record that cites the right log line for the wrong statement (T1: claim 14 is true, and the §37 sentence that uses it is false). It also cannot catch a record number with no claim: the lock and chain times, df start 14 and n = 167, `--local`, `.bak_p24`, final-capture content, 06:51:03Z and 07:00:13Z have no claim.
- **"32 claims, 0 not matched" proves the logs' text, not the record.** The script's own docstring says so (`:6`). The §37 table presents it as closing recommendation (d).

## 6. Could not verify, and what would settle it

- The hang itself (state, duration, cause), and whether the 1800 s timeout would have fired. Would settle it: a captured `ps`/`wchan`/`jstack` before the TERM, or a re-run under `R5_HARNESS_TIMEOUT_S` with diagnostics.
- That nothing changed on the box during the uncaptured redeploy (T5). The frozen-set equality at re-freeze and in the box inventory bounds this to the 48 manifest files.
- The command, script and lock handling of the 4d re-run and of the 07:00:13Z capture (no script in the repo).
- That the re-run alone leaves the same state as a full chain. What is captured matches: databases, xml, markers, pin, grants, counts. Stage tables in `sik_bench` and the NC fixture dirs are not captured, in either path.
- Whether the owner approved the `0903b95` push (T3).
- MySQL datadir vs `df /` in the chroot (open since P23).
- The 502 episode and "C:\c" (laptop-side, outside the repo).
- **Scan I ran:** added lines of `git diff 11cf629 0903b95` (51,940 lines) and of `7f40255..0903b95` (15,142, the P24 part). Regexes: IPv4, 100.64/10, IPv6-like, e-mail, `.ts.net/.local/.lan/.internal`, `hf_`/`ghp_`/`sk-`/`AKIA`/PEM, `passw|secret|aes_key|aes_iv|token [=:]`, UUIDs, home paths, and the known machine, snapshot and account names. Hits:
  - IPv4: only the version string `17.0.20.1`.
  - IPv6-like: counter strings only.
  - E-mail, hosts, tokens, credentials: 0.
  - Names and ids: see T11.
  - In the P24 part alone: the machine name, one snapshot name, the job id and a pid, once each.

**What I ran:**
- `git status/log/show/diff/archive/cat-file/reflog/branch -r --contains`;
- `sha256sum` with CR stripped (manifest 48/48 vs `tools/`, `.bak_p24` vs `530a63f`, manifest-a bytes, `a5717d0` vs final `p24_a_negctl.sh`);
- `bash -n` on the three shell tools (OK) and `ast.parse` on the two Python tools (OK);
- `p24_release_inventory.py --local` and `p24_claim_check.py` on the extracted tree;
- the extracted threshold lines (inputs 08, 003, 3, 2, 0, 00, 20- and 19-digit, `' 8'`, empty, at 14 and 1 GB, and a `df` that changes between calls);
- the extracted `p24_isfresh` on synthetic files;
- `cmp` of the set/unset outputs.

All of this ran in a scratch dir. This file is the only file I wrote in the repo.

## 7. Recommendation

**(a) Close Epic XI with the stated limits and move to the international version?** Yes, after one documents-only commit, with no new box wave.
- The product result is stable: C4 27/27 and 300/300 with byte-equal line files across P22 Vultr, P23 Vultr, P23 InstaBox and P24 InstaBox.
- The P24 tools close S2 and S4 and most of S3, S5 and S6.
- What remains is record accuracy and diagnostics, which another chain will not fix.

**(b) Fix first (one commit, documents only):**
- T1 (three places);
- T2 (failure record root cause and rule-compliance statement);
- T3 (push line);
- T7 (AC-5/6/7 wording and the P24 scan result);
- T6 (label the pre-flight 2 stdout file);
- T10 (handoff rows, ROADMAP status and checkbox);
- T11 (account name and session UUID to placeholders);
- add T4, T8, T9, T12 and the datadir question to §37 "Not done".

Do not reopen the Khanza box for T4/T9; carry them into the international chain.

**(c) Reusable for a non-Khanza version:**
- the run lock taken before any change;
- freeze/unfreeze/re-freeze with per-staging hashed transcripts;
- paired OLD/NEW controls on lines extracted from the real tool with shadowed externals;
- the fail-closed freshness helper (marker exists, newer than the marker, not newer than now) with move-aside and `argv.txt`;
- validated env thresholds with a floor;
- a verdict line and exit code (with T4 fixed);
- the release inventory (box glob and local order);
- the line-identity comparator with unit-gate asserts;
- `verify_published.sh` with `BOX=local`;
- the two-machine byte comparison;
- the claim checker (strengthened, see e).

Khanza-specific:
- the SIMRS schema, `sik`/`sik_bench` and the ledger pin;
- tariff/PPN folding;
- `database.xml` wiring;
- the Java form harness and its timeouts;
- the 27 + 300 samples and the clone procedure and its disk need;
- the P15-P24 history arms and the ten `.bak` arguments. Start the international chain without them.

**(d) Does the pattern say stop?** Yes. Independent scores: P15 17, P17 11, P18 20, P19 20, P20 19, P22 18, P23 11, P24 16. The defect class is the same in the ninth wave. A sentence written from intent and not reopened is now present inside the corrections themselves (T1), and another byte wave adds surface without removing that class. Stop the Khanza waves after (b).

**(e) Make the claim checker mandatory?** Yes, as a gate before every record commit, but only after three changes; as it stands it would have passed T1.
1. **Record-driven:** each number or time in the record's new paragraphs carries a claim id. The script fails on a number without an id.
2. **Line-anchored regexes:** each regex is anchored (`^…$`) and must include the control's own tag (`P23-A-NC` vs `P24-A-NC`), so a claim cannot cite another control's line.
3. **A "reopen" pass:** for every struck-and-replaced sentence, its replacement cites a file:line that the script prints next to the sentence for a human (or a second session) to read.

A checker that proves only that a log contains a string is necessary but not sufficient, and §37 must not present it as closing the review's recommendation (d).
