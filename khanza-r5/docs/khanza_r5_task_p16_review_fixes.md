# R5-P16 Task: fixes from the independent P15 review

Written 2026-10-26 BEFORE execution, per task-before-hands. Nothing in this wave has been run or changed.
Source: `docs/khanza_r5_p15_review.md` (independent read-only reviewer, no box access). It re-scored P15
**17/24, Accept with fixes** (self-score 23/24), with R2 (driver safety) and R8 (frozen-byte
discipline) at 1. The reviewer's remedies are the scope here. Every finding was checked against the
source before this doc was written (§1).

**Out of scope (unchanged from P15):** the clean-box rebuild; the P14 ledger scope gaps; C3 form-side
provenance; X2; any Khanza jar/source edit; any live write; any paid run. `p12_perencounter_reconcile.py`
and other P12 files that use `COALESCE` on payments are not changed unless §1 says so.

## 0. Hard rules (unchanged from P15)

- No Kaggle push/run, no git push without the owner. Live `sik`/`sik_bench` are read-only; the ledger
  pin `356355:a66a3a546cc322…` must hold at the start and in the final proof.
- Frozen tools are edited only by the unfreeze/re-freeze procedure: `chattr -i`, originals to
  `.bak_p16_*`, LF bytes, local = box, `chattr +i`, new manifest, re-pin the release manifest.
  **New in P16: an `lsattr` transcript of every frozen file is captured before the unfreeze and after the
  re-freeze** (reviewer R8).
- Run lock `P16-CLAUDE-20261026` for every driver run; its **free state is captured before acquisition**
  and its release after (reviewer R10: the P15 claim "RUNLOCK-FREE at start" had no file behind it).
- No secrets in committed files. No sub-agents. A first attempt that is invalid is kept and recorded.
- Every number comes from a named file. A claim without a file is struck through, not repeated.

## 1. Verification of the reviewer's findings (source read, 2026-10-26)

C = confirmed in the code; P = partly (qualifier says what holds).

| ID | Finding | Where | Verdict | P16 action |
|---|---|---|---|---|
| N1 | `p10_preservation_check.sh` installs `trap pcleanup EXIT` before its refusals; `pcleanup` restores `database.xml` and REVOKEs the fixture grant unconditionally | trap l.70; `exit 3` at l.82, 111, 121, 122, 138; cleanup l.63–66 | **C**. Qualifier: the run lock is held, so no other *run* is harmed; what is touched is state this run did not create (a kept fixture's grant, an xml target). The lock refusal itself (l.9–12) is already before the trap. | A1 |
| N2 | `--since $SINCE` unquoted in the line controls, so the comparator got `2026-10-26`, not the run start | `p15_line_negctl.sh:39`; `chain/line_negctl.txt` shows `"since": "2026-10-26"` | **C** | B1 |
| N3 | Fresh-B ignores INSERTs before `--since`: "exactly one" means one in the window | `p15_line_identity.py` l.137–143, 204; same cond in `p13_sample_compare.py` l.89 | **C** | B2 |
| N4 | A NULL payment becomes 0 | `p15_line_identity.py:129`; `p13_sample_compare.py:64` | **C** | B3 |
| N5 | A28′ predicate does not assert `R28`; the "−5" runs in either arm | `p6_acceptance_suite.sh` l.792–806 | **P**. The predicate does require `H28POST == H28PRE`, so most restore failures still fail; but the conditional −5 can turn a failed restore into a PASS, and "the restore result is asserted" (R5 §27) is not accurate. | E1 |
| N6 | The suite turns any non-empty switch (`=0`) into `=1` | suite l.745–748, 817–818, 864–869 | **C** | E2 |
| N7 | B6 plants assert `>= 1` rows, not an exact count | `p15_b6_negctl.sh:35–36` | **C** | B4 |
| N8 | `p15_kill_run_harness`: `kill -TERM -- -$pid` assumes a group leader; a reused pid is signalled | `p15_lib.sh:31–32` | **C** (low) | A2 |
| N9 | Evidence missing: lsattr transcript; E1 and E4 controls; A2 control on the preservation check; A5 driver stop-rule; P15 retrace; lock state before acquisition; the `ae5da20e…` line hash | `evidence/p15/` | **C** | G1–G6 |
| N10 | R5 §27 "4 partly true" but the table has 3 P rows | R5 l.1391 | **C**: the count is recomputed from the §1 table of the P15 doc and corrected | D1 |
| R3b | A5/A6 were shown at function level only | `chain/a_lib_test.txt` | **C** | A3 |
| R11 | One failure record per defect class (S, G, R, D) was required; only S has one; the retrace is not evidenced | `records/failures/` | **C** | G5, G6 |
| R10b | D8 for P14 ("RUNLOCK-FREE at P15 start") is not evidenced | R5 §27 | **C** | D2 |

## 2. Work packages

**A. Safety**
- **A1 (N1).** In `p10_preservation_check.sh` the cleanup acts only on what this run did: set
  `XML_TOUCHED=1` immediately before the first `retarget`, `GRANTED=1` immediately before the first
  `GRANT`; `pcleanup` restores the xml / revokes only when the flag is set. All refusals stay before
  those flags. Control `p16_a_negctl.sh`: an existing foreign `sik_p6f` (no r6_p10 stage tables) with a
  benchmark grant on it; the OLD bytes (`.bak_p16`) exit 3 and revoke the grant (the defect), the NEW
  bytes exit 3 and leave grant and database unchanged.
- **A2 (N8).** `p15_kill_run_harness` signals a recorded pid only if (i) it is alive, (ii) it is a process
  group leader (`ps -o pgid=` equals the pid), and (iii) it started at or before the pid file was
  written (a reused pid starts later). Three lib tests: legitimate leader killed; non-leader not
  signalled; process started after the file was written not signalled.
- **A3 (R3b, A5/A6 driver level).** `p16_a_negctl.sh` runs the **actual tail bytes** of `p14_edge_run.sh`
  (extracted by marker) with `oracle_run` stubbed: fixture rc 4 + real rc 10 (stop rule) → driver exit 1;
  fixture rc 4 + real rc 0 → exit 0; fixture rc 0 → exit 1. The pin-check segment is run with
  `p15_ledger_pin_check` stubbed to fail → `exit 3` with the clone kept. These are **wiring tests of the
  driver's own lines, not full clone runs**; the full run is the C4 rerun (§3 step 5).

**B. Predicates**
- **B1 (N2).** Quote `--since "$SINCE"`. Every line control asserts that the comparator's summary
  records the full run-start string (a `since` check), so the midnight form cannot recur silently.
- **B2 (N3).** Fresh-B in `p15_line_identity.py` and `p13_sample_compare.py`: an encounter is fresh iff
  `p7_write_audit` holds **exactly one** `detail_nota_jalan` INSERT for it **in total** (no time
  condition), that one is by `benchmark@`, and it is at or after `--since`. Counts before and after
  the window are reported separately in the CSV. The P15 clone was dropped, so the rule cannot be
  checked on kept data; it is validated on the rerun (§3 step 5). If a real visit already carries a
  pre-run INSERT, the rerun fails loudly and the rule is revisited, not weakened.
  New plants: **B5c** an audit INSERT by `benchmark@` at `since − 1 µs` for an encounter that also has its
  legitimate fresh row → MISMATCH (OLD `p15_line_identity.py` passes it: the hole); **B5d** the
  legitimate row at exactly `since` → passes (boundary inclusive).
- **B3 (N4).** `besar_bayar` / `besarppn` NULL in any `detail_nota_jalan` row of a visit → input error
  (exit 2) in both comparators. Plant on the scratch copy (`ALTER … NULL` first, as for B4c).
- **B4 (N7).** B6 plants count the rows before the DELETE and assert deleted = counted > 0.

**E. Recovery checks**
- **E1 (N5).** A28′: the predicate also requires `R28 = restored`; the conditional −5 runs only in the
  NC (autocommit) arm. Control: a textual mutation of the restore's printed result to
  `restore-not-verified`, applied identically to the OLD and NEW suite copies, `P11_ONLY=28`: OLD →
  A28′ PASS (masked: the defect), NEW → FAIL.
- **E2 (N6).** The suite activates a switch only on exactly `1` (helper `sw()`), at every site.
  Control: `R5_NEGCTL_BACKUP_NO_TXN=0`, `P11_ONLY=28`: OLD shows `mode=NC-autocommit`, NEW does not and
  passes. Static check: no `${…:+…}` or `[ -n "$NO_TXN" ]` activation of an `R5_NEGCTL_*` / `R5_FAULT_*`
  switch remains in the suite.
- **E3 (E1 observed).** `p16_e_negctl.sh` extracts `nc_status_e` from the NC runner bytes and shows:
  missing file → ERROR; file without the verdict line → ERROR; `A28: FAIL` → FAIL; `A28: PASS` → PASS.
- **E4 (E4 observed).** On a dummy `sik_p6f` that has an `r5_stage_B3_r6_p10_*` table, with
  `P15_SUITE_EV` set to an existing suite evidence file and `p11_preserve_preop.json` moved aside
  (restored afterwards): `p10_preservation_check.sh` exits 3 with `ABORT: pre-operation snapshot missing`.

**G. Evidence and records**
- **G1.** `lsattr` of all frozen files (P15 manifest b files + the P16 files) before unfreeze and after
  re-freeze, in `evidence/p16/`.
- **G2.** Lock `status` (free) captured before acquisition; release captured after.
- **G3.** `grant_line_hashes.txt`: the sha256 of the standing-grant lines computed from the three P15
  live-state files and from the P16 baseline/final. If it reproduces `ae5da20e…`, the claim is attached; if
  not, the claim is struck.
- **G4.** Retrace run on this wave: `trace-clean` quoted.
- **G5.** Failure records for the G, R and D classes of P15 plus one for this review (N1–N7).
- **G6.** QMS record `VER-2026-10-26-DR-KHANZA-R5-P16-001.json`, pm1 traces, copies under `records/`.

**D. Documents** (no box)
- **D1.** R5 §27: "4 partly true" → the recounted number; "A refusal touches nothing" qualified for the
  preservation check until P16; "the restore result is asserted" qualified; "B5b moved before the run
  start" qualified (tested against a midnight `--since`). Strike-through with reasons, as in P15.
- **D2.** R5 §27 "RUNLOCK-FREE at P15 start" struck (no file); the P14 release remains unevidenced and is
  stated as such. The P16 start and end are evidenced (G2).
- **D3.** Release manifest: P16 pins; handoff items; ROADMAP Epic XI; R5 §28 (P16 result).

## 3. Required runs (order)

1. Capture lock `status` (free), live-state baseline, `lsattr` before (G1/G2).
2. Acquire `P16-CLAUDE-20261026`; backup originals to `.bak_p16_20261026/`; `chattr -i`; deploy the
   patched LF bytes; local = box; `chattr +i`; manifest `p16_frozen_20261026.sha256`; `lsattr` after.
3. `p15_lib_test.sh` (old tests + A2/N8 tests), `p15_a_negctl.sh` (A1–A3 unchanged, old = `.bak_p15`).
4. `p16_a_negctl.sh` (A1 N1 old vs new, A3 wiring, E4 observed), `p16_e_negctl.sh` (E1 observed, E2 and
   E1 mutation controls old vs new).
5. **C4 rerun** (the comparators and the lib changed): `p14_edge_run.sh` fixture + the 300 real visits on a
   fresh clone; `p15_line_identity.py` on the fixture (`--expect`) and the 300 vs the live-pinned ledger;
   `p13_sample_compare.py` B4/B5 checks; `p15_line_negctl.sh` (now with B5c/B5d/B3 and the `since` check);
   `p15_b6_negctl.sh`; teardown.
6. Regression on the changed suite/preservation bytes: full fresh suite, preservation check, recovery unit
   test, P11 negative controls 5/5.
7. Final live-state proof, frozen sets re-checked, lock released and captured. Retrace (G4).

## 4. Records

R5 §28; release manifest pins; this task doc §7; QMS record; failure records (G5); traces
`r5-p16-task-doc`, `r5-p16-fixes`, `r5-p16-evidence`; copies under `records/`; the retrace must report
trace-clean.

## 5. Acceptance criteria

- **AC-1.** Live state identical at baseline and final (ledger pin; standing grants; 0 fixture rows).
- **AC-2.** Frozen bytes: the manifest verifies before and after every phase; `lsattr` shows the `i` flag
  on every frozen file after re-freeze and no flag during the unfreeze window as expected.
- **AC-3.** A1 control shows OLD revoking and NEW not; A2 tests 3/3; A3 wiring tests pass.
- **AC-4.** B2/B3/B5c/B5d/B4 controls each show the plant (`ROW_COUNT` equals the counted number) and fail
  only their own encounter; the `since` recorded in each summary is the full timestamp.
- **AC-5.** C4 rerun: fixture 27/27 and real 300/300 still pass under the stricter fresh-B rule, or the
  failure is recorded and the rule's validity examined.
- **AC-6.** E1 and E2 mutation/switch controls discriminate (OLD bad, NEW good); E3 and E4 observed.
- **AC-7.** Suite, preservation, unit, NC 5/5 pass on the final bytes.
- **AC-8.** G1–G6 present; D1–D3 done; retrace trace-clean.

## 6. Rubric (0/1/2; the reviewer's R1–R12 scale, /24)

Re-scored by a second independent review, not by the executor. Critical items: R2, R4, R5, R8, R9 must
be 2 for Accept. The executor's self-score in §7 is stated with the evidence line beside each item.

## 7. Result and self-score

Executed 2026-10-26 under lock `P16-CLAUDE-20261026` (14:02:16Z to 15:01:16Z). Result: R5 §28.
Amendments made during execution: (1) E2 also covers `p10_preservation_check.sh` (`R5_NEGCTL_SKIP_IMMEDIATE_RESTORE`
was tested with `-n`); (2) `p13_sample_compare.py` gets the same B2/B3 changes as `p15_line_identity.py`; (3) the first chain
ended 32/33 on a patch bug of mine (glued echo line), recorded and re-run as `p16_chain_b.sh` (33/33), manifest b (22 files).

Executor self-score (the reviewer scale; to be re-scored by an independent review, not by me):

| # | Self | Evidence |
|---|---|---|
| R1 | 2 | §1 of this doc: 13 rows with locations; N5 marked partly with its reason |
| R2 | **1** | A1 old-vs-new on the preservation check, A2 3 tests (`chain/p16_a_negctl.txt` 25/25, `a_lib_test.txt` 23/23). A5/A6 are **wiring tests** of the driver's lines, not a full run with an injected failure |
| R3 | 2 | `chain_b/line_negctl.txt` 33/33 (B5c/B5d at the full timestamp, B3 both comparators), `chain/b6_negctl.txt` exact counts. `p12_perencounter_reconcile.py` still uses COALESCE (out of scope, stated) |
| R4 | 2 | unchanged source-row provenance; 300/300 under the stricter rule, 0 AMBIGUOUS (`chain/real300_lines_summary.json`) |
| R5 | 2 | C2 old EQUAL-CTX/MATCH vs new DIFFER/MISMATCH, rerun (`chain_b/line_negctl.txt`) |
| R6 | 2 | fixture 27/27 and real 300/300 on a fresh clone, pin REPRODUCES (`chain/c4_driver.log`) |
| R7 | 2 | E1 (N5) and E2 (N6) old-vs-new, E3 and E4 observed (`chain/p16_e_negctl.txt` 20/20); suite 39/39, NC 5/5, unit 44/44 |
| R8 | 2 | `lsattr` before / after / chain start and end (`evidence/p16/`), 21/21 and 22/22, local = box 11/11 |
| R9 | 2 | baseline = chain final = chain-b final; grant-line hash reproduced for P15 and P16 files |
| R10 | 2 | D1, D2 struck through in §27 with reasons; the P14 lock release stated as unevidenced |
| R11 | 2 | failure records for G, R, D, the review and the chain bug; QMS record; traces; retrace trace-clean (see the commit) |
| R12 | 2 | the first-chain failure kept and recorded; wiring-level limit and COALESCE in P12 stated |
| | **23** | R2 at 1 for the stated reason |
