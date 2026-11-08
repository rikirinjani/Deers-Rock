# R5-P24 task: the P23 independent review's findings (written before execution, 2026-11-05)

Source: `docs/khanza_r5_p23_review.md` (independent review, **11/24 against the executor's 20/24**, Accept rule not met). Owner decision
2026-11-05: docs, tools and a new full chain (scope "Docs + tools + chain"); the next work after it is the international version.
Home: the InstaBox machine (owner decision 2026-11-05). The Vultr box is a second copy until ~2026-11-20 and is **not** updated in this wave
(it stays on the P23 bytes; stated limit). Rules unchanged: run lock for every driver run (taken **before** any install or unfreeze this
time), unfreeze/re-freeze procedure, hashed transcripts, every new file run once unfrozen (pre-flight), final live-state proof last, no address
or credential committed, no push without the owner. This task doc is written before any action (P23 had none: review R1).

## 1. Findings, verified against the source (not copied from the review)
| ID | Verdict | What I opened |
|---|---|---|
| S1 | **true** | `evidence/p23/instabox/i3_fix1.txt:5-13` runs the new bytes with the variable exported (8) only; `evidence/p23/vultr/chain/argv.txt` shows `P14_MIN_FREE_GB=20` (the chain exports it, `tools/p23_chain.sh:33`): the in-chain "unset" cases never ran unset. The records say "set and unset on both machines" and "Vultr (variable not set)". |
| S2 | **true** | `tools/p23_release_inventory.py:31-38`: the `--local` ORDER names manifest a only; manifest b (`evidence/p23/r5_p23_frozen_manifest_20261101b.sha256`) is missing, so `--local` reports `p23_a_negctl.sh` as not ok. |
| S3 | **true** | `evidence/p23/instabox/chain_stdout.log:367-368`: `p23-a=1`, then `chain exit=0`. R5 §36 says "every step exit 0 on both"; the handoff and ROADMAP say "both ... all green". |
| S4 | **true** | `tools/p23_chain.sh:87` lists 6 files; `fixture_lines.csv`, `fixture_lines_encounters.json` and the run-start files are not asserted fresh; `touch .t0` is unchecked (`:32`); `-nt` passes a future-dated file. |
| S5 | **true** | `evidence/p23/instabox/i1_install.txt`: install and freeze 05:58:58Z, lock acquired 05:58:59Z (after). The manifest-a bytes of `p23_a_negctl.sh` (`aafcfaec...`) ran in both full chains and are in no commit. |
| S6 | **true** | `tools/p14_edge_run.sh:96-97`: `0` is a whole number and disables the stop rule; the success path does not log the threshold; the 8 GB value was never measured. |
| S7 | **true** | the repo blobs are LF (`git cat-file -p HEAD:<path>` has no CR); the CRs come from checkout or `git archive` with `core.autocrlf=true`. Handoff item 29 and reproduce §6.4 give the wrong reason. |
| S8 | **true** | handoff "Records" says "pushed through f771e04"; origin is at `c525f97` (pushed 2026-11-05 on the owner's "Yes, push" in chat; the repo did not record it: review R12). |
| S9 | **partly** | the machine name and snapshot names are in 16 added lines. They are operational names, the same class as the ssh alias (not a secret). No address, e-mail or id was found. Left as they are; stated. |
| S10 | accepted | "different machine" in §36 counts identical package versions as a difference; reworded (portability check by the same operator). |
| R1 | true | no P23 task doc; `tools/p23_a_negctl.sh:2` cites "task doc s2" which does not exist (frozen, cannot be edited; stated here). |
Also from the review: the grants block in `docs/asset_export_20261023.md:69` still holds the wrong command; the rehearsal findings b-11/b-12 and `JdbcProbe` are missing from the limits; the lock-after-install on InstaBox is undisclosed.

## 2. Packages
- **A (documents).** S1, S3, S7, S8, S10, the grants block (struck, not only footnoted), the missing limits, the push approval; R5 §37 (this wave) and §36 amended in place with strike-through (old text kept).
- **B (tools, frozen, under unfreeze/re-freeze).**
  - `p14_edge_run.sh` (S6): after the existing STOP RULE line, refuse a threshold below 3 (`ABORT`, rc 3, nothing touched) and log the threshold and free GB. The three existing lines stay byte-identical so `p23_a_negctl.sh` (F1) still extracts them.
  - `p24_release_inventory.py` (S2): ORDER (local and box) names manifest b and the P24 manifest; an entry that matches no file stays an error.
  - `p24_chain.sh` (S4, S6): from `p23_chain.sh`; `touch .t0` checked; freshness helper also requires `.t0` to exist and the file not to be newer than now; the asserted list adds `fixture_lines.csv`, `fixture_lines_encounters.json` and both run-start files; a `df` sampler during step 3 (peak use of the clone); stale labels `p20-chain-*` renamed; one more OLD arm (`.bak_p24` = the P23 bytes of `p14_edge_run.sh`).
  - `p24_a_negctl.sh` (new controls): G1 the threshold floor and the log line (OLD accepts 0 / NEW refuses 0, 1, 2 and accepts 3; the success line shows threshold and free GB); G2 the inventory ORDER names manifest b and the P24 manifest; G3 the freshness helper (fresh, old, empty, missing, **future-dated**, missing marker); G4 the asserted list holds the 3 new names. Run **both ways** (variable unset and exported) before freezing, and again unset on the frozen bytes.
- **C (chain).** InstaBox only, full chain, lock first, manifest of 48 files (the 45 of P23 manifest b, `p14_edge_run.sh` changed, 3 new), final live-state proof last. `p24_a` unset on the frozen bytes before the chain; the chain runs it exported (8). Manifest-a bytes of `p23_a_negctl.sh` copied from the box into `evidence/p23/fix1/` (S5).
- **D (claim check).** `tools/p24_claim_check.py` (local, read-only, not deployed): a claims file (`docs/p24_claims.json`) names each count of R5 §36/§37 with the log and a regex; the script prints matched / not found / contradicted. This answers the review's recommendation (d).

## 3. Acceptance criteria
1. AC-1 Task doc committed before any box action (this file).
2. AC-2 Lock acquired before the first install or `chattr -i`; unfreeze transcript for `p14_edge_run.sh`; `.bak_p24` hash = `local_git_hashes_before.txt` = `git show` of the P23 commit.
3. AC-3 `p24_a` passes unfrozen with the variable unset and exported, and on the frozen bytes unset (InstaBox), with OLD arms failing where stated.
4. AC-4 One full chain on the frozen 48 files: every step exit 0 (a failing step is reported as such, not as "chain exit"); C4 27/27 and 300/300 again; inventory ok 71 files (box glob) with the P24 manifest; local `--local` inventory ok (run against the committed bytes).
5. AC-5 `p24_claim_check.py` over the P23 claims and the P24 claims: no "contradicted".
6. AC-6 Review findings S1, S3, S7, S8, S10 and the grants block corrected in the records; each corrected sentence reopened against its log.
7. AC-7 Public-repo scan of every added line (plain pattern, every hit read).

## 4. Limits stated in advance
- Vultr is not updated (P23 bytes there). The chain runs on one machine only. No independent re-score of P24 until a fresh session does one.
- S9 names left; `JdbcProbe`, b-11 (the chain reads the shipped `evidence/p13` tree), b-12 (transient exec 502), AC-7 retrace, `.bak_p17fix1`, X2, C3, the P14 ledger scope, the 30-minute idle pause: listed, not worked.
- The 8 GB figure: this wave measures the peak of the clone once (the `df` sampler); one measurement is not a margin.
- `p23_a_negctl.sh:2` keeps its stale "task doc" reference (frozen file).

## 5. Rubric
R1-R12 as in `docs/khanza_r5_task_p22_astra_v13_and_p20_review.md` §5. Self-score is written after the independent review, not before; the executor's scores have been 3 to 9 points high every time.

## 7. Result
See `docs/khanza_benchmark_report_R5.md` section 37 (result) and section 38 (the independent review of this wave, 16/24, and the dispositions).
