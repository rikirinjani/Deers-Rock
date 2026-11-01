# R5 clean-box rehearsal, second operator (2026-11-01)

Repo HEAD `1dbd378` (branch `khanza-r5-p6`), machine = InstaBox free `<box>`, Ubuntu 24.04 chroot. Transcripts: `evidence/cleanbox_rehearsal/` (`sN_*.txt` have `date -u` stamps; `scripts_sha256.txt` hashes the scripts I ran; `chain_stdout.log` is the chain; `chain_p23/chain/` its outputs). Hostname and machine name were scrubbed to `<host>`/`<box>` (`SCRUB_NOTE.txt`).

**Headline: the rebuild reproduced (archives, DBs, ledger pin, published sources, 42 frozen files, 65/65 inventory, suite 39/39, unit 44/44, NC 5/5). The full chain did NOT reproduce: C4 fixture 27/27 and real 300/300 never ran, because the driver's `STOP RULE: <20GB free` fired on a 20 GiB machine. Chain end line: `asserts-failed=3`, eleven non-zero exit codes. I did not bypass the guard and did not re-run (a re-run hits the same rule).**

## (a) What I did, in order (UTC, 2026-11-01)

| Time | Step | Result |
|---|---|---|
| 00:38 | start machine, mounts, check stack (`s0_state.txt`) | kernel 6.18.54-instabox, MySQL 8.0.46-0ubuntu0.24.04.4, OpenJDK 17.0.20.1 |
| 00:38-01:26 | `push` whole archive dir | **failed after 48 min** (see b-1) |
| 01:28-01:31 | re-push per file; `simrs-khanza.tar.gz` single push died 02:05 (`host_unavailable`) | `s1_push.txt` |
| 02:07-02:21 | `simrs-khanza.tar.gz` re-sent as 12 parallel parts, 14 min | reassembled |
| 02:21 | `sha256sum -c MANIFEST.sha256` on the machine | 6/6 OK (`s1_verify.txt`); local check 6/6 OK before push |
| 01:31-01:36 | MySQL up (3G pool), restore `sik` 116 s, `sik_bench` 27 s | `s2_restore.txt`; 1179 / 23 tables |
| 01:36 | ledger | `356355:a66a3a54…7aea7` reproduced (`s2_ledger.txt:8`) |
| 01:32 | unpack tools + dr-benchmark; step-3z log present | `oracle_20261027T130408Z.log` 57,042 bytes, 1 line with `STAGE-KEEP` (`s2_unpack.txt`) |
| 02:21-02:23 | unpack Khanza tree (jar md5 `25acbbbe…` match), new password generated on the box, grants, `database.xml` re-encode (both copies, round-trip OK), compile | `s2_wire*.txt` |
| 02:23 | install 42 frozen files from repo, manifest 42/42, `verify_published.sh` | **ALL-MATCH** (`s2_install.txt:19`) |
| 02:23 | `chattr +i` 42/42, lock `P23-REHEARSAL-OP2`, live-state preflight identical to P22 baseline | `s5_freeze.txt` |
| 02:24:05-03:28:56 | one full `p22_chain.sh` (65 min), exactly one run | `chain_stdout.log` |
| 03:32 | lock released, plaintext archives deleted, suspend/resume test, final suspend | `s6_suspend_resume.txt` |

## Task 3: the seven OLD-byte directories

Built with `git show <commit>:khanza-r5/tools/<file>` (raw bytes, no CR strip needed) at the commit of the previous wave: p15=`60b19c7`, p16=`3d96c96`, p17=`bb3a6d8` (those three commits are named in `evidence/p17/bak_equals_git.txt`), p18=`a60b100`, p19=`63ef8ca`, p20=`9d91d80`, p22=`875d55a` (**my inference**, see b-7). 40 files. Checks:
- full hashes in evidence: p19 (3 files, `evidence/p19/bak_equals_git.txt`), p20 (1, `evidence/p20/bak_equals_git.txt`), p22 (4, `evidence/p22/local_git_hashes_before.txt`): all 8 equal on the machine (`s3_bak.txt`).
- p15-p18 (28 files): evidence gives only a file list and `MATCH`; I confirmed them by comparing to the `.bak_*` dirs inside `Deers-Rock-tools.tar.gz` (`bak_rebuild_git_vs_archive.txt`: 40/40 byte-identical, on the machine `cmp` too). That is a cross-check against an archive, not an independent hash.
- **Not reconstructed:** `SHA256SUMS` in `.bak_p16_20261026` and `.bak_p17_20261027` (not in git, no recorded hash; no tool references them; the paths inside them do not even match). Not rebuilt: the other 10 `.bak_*` dirs (`fix1`, `p7`…); not needed by the chain.
- Note the plan doc says the dirs "exist only on the box"; the 2026-10-31 tools archive actually already carries them. I moved those aside and ran the chain on the git-built ones.

## (b) Guesses and doc errors, with fixes

1. **`instabox push DIR /abs/path` from Git Bash:** MSYS rewrote `/data/...` to `C:/Program Files/Git/data/...`; the CLI only reported `missing_parent` **after uploading all 650 MB** (48 min lost, `s1_push.txt:7`). Fix doc: use `MSYS_NO_PATHCONV=1` with `C:/` local paths, or create the parent first and push one file. My wrapper also printed `rc=0` from the wrong `$?`.
2. **Upload speed** about 0.25 MB/s per stream (single 635 MB push would take about 45 min and has no resume; it died at 37 min on a 2-min `host_unavailable`). Parallel parts scale: 14 min. Doc should say split, push parts, reassemble, verify.
3. **Chain command line is not recorded.** `evidence/p22/chain_start.txt` shows only the pid and the script hash. I guessed: `cd /opt/Deers-Rock/tools; DR_LOCK_SESSION=<id> bash p22_chain.sh <7 relative .bak dirs> <absolute manifest path>`; stdout to `/opt/dr-benchmark/p22/chain_stdout.log` (`chain_run.sh`). Fix: record the argv in `chain_start.txt`.
4. **Grants conflict inside `asset_export_20261023.md`:** step 5 says `ALL` on `sik`; "Post-restore wiring" says SELECT/INSERT/UPDATE/DELETE on `sik`. The chain baseline (`chain.log` line 8) confirms the second. I used the second (22 rows match the baseline). Remove step 5's grant text.
5. **`javac` needs `-encoding UTF-8`** in the POSIX-locale chroot (49 errors otherwise). No compile commands are in the docs; I took the harness one from `recovered/vps_tmp/r5h_compile.sh` and the consumer classpath from the export doc. All 8 classes came out **byte-identical** to the shipped ones. `JasperHeadless.java` does not compile with that classpath (no jasper jars) and has no shipped `.class`; not used by the chain.
6. **`verify_published.sh` hard-codes `ssh <alias>`.** On a rebuilt box it cannot run as written. I supplied a local `ssh` stand-in (`scripts/inst.sh`) that runs the command in the chroot; result ALL-MATCH. Fix: give the script a local mode.
7. **`.bak_p19/p20/p22` source commits** are not stated anywhere; I inferred "commit of the wave before" and validated against hashes/archive.
8. **`JdbcProbe` does not do what the export doc says.** It connects as `root` with an empty password and fails on this box; there is no probe of the AES-decoded `database.xml` path in `src/`. I did not substitute one; the credential path was exercised by the suite instead.
9. **The disk precondition is undocumented:** `tools/p14_edge_run.sh:95` requires `df --output=avail -BG /` ≥ 20. Source box had 70 GB free; this machine has a 20 GiB disk (about 14 GiB free, never reachable). Nothing in the reproduce doc or the plan says a ≥20 GB-free root is needed. **This is the blocking finding.** Fix: state it in the doc, or make the threshold a parameter (tool change = a new wave, not done here).
10. **The chain passes vacuously on stale files.** Because the shipped `dr-benchmark.tar.gz` contains the source box's `p22/chain/` outputs and `p15/runs/` logs, step 3b' (5 asserts) and step 3z "newest oracle log" (4 asserts) read the **source box's** files after C4 failed. Verified: `fixture_lines_summary.json`, `real300_lines_summary.json`, `*_encounters.json`, `*_lines.csv` in my chain dir are byte-identical to `evidence/p22/chain/` (`cmp`), and the 3z newest log is `oracle_20261031T133309Z.log` from the archive. So those 9 `ASSERT PASS` lines are not evidence about this run. Fix: the chain should clear its output dir (or compare timestamps/run id) before step 3.
11. `p14_live_state.sh` and others work only because the archive ships `/opt/dr-benchmark/evidence/p13/…`; fine, but undocumented.
12. Transient 502s from the exec API during the first minutes of load (`s2`-era, about 02:28); retries worked.

## (c) Comparison with the P22 chain (`evidence/p22/chain.log`)

| Item | P22 source | This rebuild | Cause |
|---|---|---|---|
| frozen 42/42, lsattr 42/42 (start and end) | yes | yes | |
| baseline/final live state, ledger pin, counts 86676/1464593/86488/1100 | same | **same** | |
| lib test | 0, 23/0 | 0, 23/0 | |
| p15-a | 0, 9/0 | **1**, 8/1 (A3) | STOP RULE |
| p16-a, p16-e | 0 | 0 (26/0, 20/0) | |
| p17-a | 0 | **1**, 35/2 (A9) | STOP RULE |
| p18-a | 0, 50/0 | **1**, 45/5 (B4) | STOP RULE |
| p19-a | 0, 19/0 | **1**, 18/1 (N3 needs the B4 log) | consequence of p18 B4 |
| p20-a, p22-a | 0 (27/0, 25/0) | 0 (27/0, 25/0) | |
| C4 driver | 0 | **3** | `STOP RULE: <20GB free` (`chain_stdout.log:136`) |
| C4 fixture 27/27 (57 unit keys / 0 unchecked) | pass | **not run** (compare exit 1, clone missing) | |
| real 300/300 (1,240 lines, 698/0) | pass | **not run** (exit 1) | |
| ASSERT PASS | 21 | 18 (9 of them on stale files, b-10) | |
| ASSERT FAIL / `asserts-failed` | 0 | **3** | p13 positive, fixture compare, real compare |
| p17-b, p18-b, p19-b, p20-b, line-nc | 0 | **3** each | need the C4 clone |
| b6 | 0 | 0 (6/0) | |
| suite | 0, PASS=39 | 0, **PASS=39 FAIL=0** | |
| preservation | PASS | PASS | |
| unit | 44/44 | **44/44** | |
| NC | 5 DISCRIMINATING | **5** | |
| inventory | 65 files, 11 manifests, 0 not_ok | **identical** | |
| wall time | 13:17-14:24 (67 min, C4 about 29 min) | 02:24-03:29 (65 min) | step 1f hung 23 min in the B4 watcher (bounded 12000×0.1 s) |

The hang to watch: B4 waits for a driver line that never comes, about 20 min; it is bounded, not infinite.

## (d) Deviations from the source box

- Kernel 6.18.54-instabox (KVM guest, AMD EPYC, 4 vCPU, 8 GiB) vs source 2 vCPU / 16 GB Ubuntu 24.04.5 (`asset_export_20261023.md:95`, `chain.log:18` disk line).
- Host userland Debian 13; benchmark userland Ubuntu 24.04 in a chroot on `/data`. Package versions equal the doc list (mysqld 8.0.46-0ubuntu0.24.04.4, OpenJDK 17.0.20.1 confirmed on the box).
- MySQL buffer pool 3G (source 6G); MySQL started by hand, no systemd.
- **Disk: 20 GiB total vs 94 GB** (the one that mattered). Locale POSIX in chroot.
- Run lock acquired as `P23-REHEARSAL-OP2`; 42 files frozen from the repo, not from the archive (identical anyway: all 42 `cmp`-equal).

## (e) What this establishes and what it does not

Establishes: someone who did not write it can, from the repo plus the six archives and the docs, restore both DBs to the pinned ledger hash, rebuild all compiled classes byte-for-byte, reach `verify_published = ALL-MATCH`, freeze 42/42, and get suite 39/39, preservation PASS, unit 44/44, NC 5/5 and inventory 65/65 on a different kernel, CPU and userland. The `.bak` dirs can be rebuilt from git (40/40 equal to the archive).

Does **not** establish: that the C4 evidence (27/27, 300/300, 1,240 lines) reproduces on a clean box, nor that the controls that depend on a fresh clone (p15-a A3, p17-a A9, p18-a B4, p19-a N3, all `*-b`, line-nc) pass: none ran. The "ASSERT PASS" and "3z" lines in this chain are partly on shipped files and must not be cited as reproduction. Running C4 needs a box with at least 20 GB free on `/` (not this free plan). The external inputs (Khanza tree, dumps, secrets) remain external.

## (f) Background jobs and pauses

Observed: the chain ran 65 min as an `exec --background` job and finished; a 2-minute `host_unavailable` blip (about 02:05-02:07) left `mysqld` and the three mounts intact (`s1_push.txt`). An explicit `suspend` then `start` (5 s each) also preserved `mysqld`, the mounts and uptime (`s6_suspend_resume.txt`; `processesPreserved: true`). I did **not** observe a true 30-minute idle pause, so that remains untested. The 480-min run limit was not approached (about 3 h of run time).

## Housekeeping

Plaintext archives deleted from the machine (`find` finds none); lock released; machine suspended; nothing committed or pushed; no file under `tools/` edited; no secret or address written to the repo. The DB password lives only in the machine's `run-env/benchmark_pw`. Archives remain on the machine only as the extracted trees under `/data/noble/opt`.
