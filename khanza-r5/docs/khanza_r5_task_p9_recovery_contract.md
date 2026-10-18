# R5-P9 Task: Recovery acceptance contract (fencing, current-state retry, preserved failures)

Written 2026-10-18 BEFORE execution, per task-before-hands. Scope agreed with the owner
2026-10-18: **packs A (acceptance integrity) + B (recovery correctness)**. Not in P9: C
(reproducibility closure: `stagea_common.py` with secrets removed, Java sources, STRATA SQL) and
D (matched-encounter B–C reconciliation, R4 0/999). Budget: the owner reports **$5.6** left on
the model quota. One Astra v9 run (merged, ~$3–3.5) after P9, with the owner confirming spend
first.

Sources: Astra v8 (`evidence/astra_v8_4897654_output.md`, **60/100** "Needs targeted rework";
`evidence/astra_v8_4897654_NOTE.md`).

Astra v8's single most important next step: "Complete one pinned-fixture, production-wrapper
recovery acceptance experiment that deliberately invalidates a previously verified state
before retry. Fence writers; require a current, batch-specific digest or newly verified
restore; assert protected sample and non-sample hashes; force a real suite failure through the
normal terminal path; and demonstrate a nonzero wrapper exit with the failed fixture and
recovery artifacts retained."

## 0. Defects to close (each verified against source on 2026-10-18)

| ID | Defect | Where (verified) | Consequence |
|---|---|---|---|
| E1 | **Retry trusts a stored flag.** `--retry-failed` re-bills when `b["restored"] is True`, without re-checking that the visits' current content still equals the pre-reset hash. | `sampled_real_form_diff_r5.py` ~l.980 | A state changed after the original verification is re-billed over, logged as "pre-reset state verified". |
| E2 | **One hash file per run+stage.** `stage_content_hash_<pfx>.json` has no batch/date component, so a later batch's backup overwrites an earlier batch's hash. | l.396, l.456 | A multi-batch run cannot verify a restore of any batch but the last; FAILED earlier batches lose their recovery metadata. |
| E3 | **Resume advances past a FAILED batch.** In the resume loop a FAILED batch sets `failed=True` and `continue`s, so later dates are still billed. | resume loop after `reap_writers` | Contradicts "a FAILED batch stops the run" (P5-2). |
| E4 | **No server-side fencing.** `reap_writers` kills OS processes; a killed client's statement keeps running on the server (seen on 2026-10-18: a DELETE ran ~7 min after its client was killed and blocked a DROP). A crashed oracle's own `mysql` child (dbutil runs the mysql CLI) is not in `_harness_writers()`. | `reap_writers`, `_harness_writers`, `dbutil._mysql` | A restore can race a statement still executing on the server. |
| E5 | **Unconditional success wording.** `_bill_date` logs "pre-reset state restored, run stops" even when the restore was unverified. | ~l.1088 | The log line contradicts `restored=False`. |
| E6 | **`verify_frozen` skips the source-content hash.** The P6-2g docstring says it checks it; the code never compares `source_content_hash`. | `verify_frozen` l.251– | Source-content drift between freeze and bill is not detected (only counts). |
| E7 | **A14 does not test the production terminal path.** `P7_EXIT_TEST` exits from an early branch (l.38–41); breaking the final `exit` line would leave A14 green. The wrapper always drops the fixture, even after a failed suite. | `p6_acceptance_suite.sh` l.37–41, end; `p6_run_suite_fresh.sh` teardown | A failing suite's fixture and recovery tables are destroyed; the real exit path is untested. |
| E8 | **Suite cleanup drops recovery tables after a failed restore.** `restore_kept()` calls `stage_drop` even when `restore_verified` is False. | `p6_acceptance_suite.sh` l.292– | Destroys the only copy of the pre-reset rows. |
| E9 | **A11 does not count `STAGE-RESTORE-ERROR`.** | A11 block | A restore that errored can pass A11. |
| E10 | **`p8_builder_all_check.sh` cannot fail.** It prints DIFFERS and exits 0; two failed hash reads (empty strings) compare equal. | script end | Cited as a reproduction check. |
| E11 | **§13 "B3 bound ~0.3% (rule of three)"** reads as a population bound without stated sampling assumptions. | R5 l.365 | Overclaim (external validity). |

## 1. In scope

| ID | Requirement |
|---|---|
| P9-B1 | **Per-batch hash files** `stage_content_hash_<pfx>_<date>.json` (date = batch key), written at backup and read at restore/retry; the old name is never read. |
| P9-B2 | **Retry from current state:** `--retry-failed` requires `_content_hash(visits) == pre-reset hash` *now* (computed at retry time from the per-batch file), else it restores from the kept stage tables and verifies; neither → `RETRY-REFUSED`, stays FAILED. Stage tables of a FAILED batch are kept until it is BILLED or explicitly abandoned. |
| P9-B3 | **Resume stops at the first FAILED batch** (no later dates billed) unless `--retry-failed` repairs it. |
| P9-B4 | **Server-side fencing before any restore:** list `information_schema.processlist` sessions of the benchmark account (and any session other than the oracle's own whose `db` is the target); `KILL` them; wait until none remain and none of the target visits' rows change over the quiet interval; also kill stray `mysql` CLI children of a dead oracle (cmdline names the target DB). Log `FENCE … sessions_killed=N remaining=0`; otherwise `WRITER-ALIVE`, exit 4. |
| P9-A1 | `_bill_date` logs "restored (verified)" or "NOT restored (unverified/mismatch/error)" from the actual result. |
| P9-A2 | `verify_frozen` compares the recorded `source_content_hash` with a recomputed one (drift → FAIL), or the docstring is corrected; prefer the check. Negative test in the suite (perturb one sampled source line after freeze → RESUME blocked, exit 3). |
| P9-A3 | **Real terminal-path test:** `P9_FORCE_FAIL_CHECK=<id>` makes one REAL check's assertion fail (no early exit); the suite then runs to its normal end. The wrapper (`p6_run_suite_fresh.sh`) must exit non-zero and **keep** the fixture and all stage tables when the suite failed (`KEEP_ON_FAIL=1` default; the fixture is dropped only by an explicit `--teardown-kept` run or on success). A14 replaced by A14' asserting: wrapper exit ≠ 0, fixture still present, evidence file says FAIL for exactly that check; then explicit teardown. |
| P9-A4 | `restore_kept()` drops stage tables only after `restore_verified True`; otherwise keeps them and the check fails. |
| P9-A5 | A11 counts `STAGE-RESTORE-ERROR` with the other restore failures. |
| P9-A6 | `p8_builder_all_check.sh` exits 1 on DIFFERS or on any empty/failed hash read. |
| P9-A7 | R5 §13 "B3 bound ~0.3%" struck through and restated as a sample statement (0/999 sampled visits, method and assumptions), not a population bound. |
| P9-C (checks) | New suite checks: **A22** retry after a deliberate post-verification change (mutate one restored row, then `--retry-failed`): must re-restore from kept stage tables and verify, or refuse; never re-bill over the change. **A23** two batches in one run (two dates): each has its own hash file; batch 1 FAILED → resume stops before batch 2. **A24** fencing: a blocking statement held open on the target by a second benchmark-account session (e.g. `SELECT … FOR UPDATE` in an open transaction, or `SELECT SLEEP(120)`) during a resume → `FENCE sessions_killed≥1`, restore verified. **A25** source-content drift after freeze → verify_frozen FAIL, exit 3. Live guard A13 must still hold. |
| P9-R | Records: suite on a fresh fixture (≥ 33 checks) exit 0, plus the A14' forced-failure wrapper run (exit ≠ 0, fixture kept, then torn down); R5 §20; manifest re-pin (local LF = VPS); rubric §4; QMS VER-…-P9-001; failure record; pm1 trace; retrace clean. Then build v9 (merged) and run once on gpt-6-astra after the owner confirms spend. |

## 2. Acceptance criteria
- **AC-1 retry/current state:** A22 passes; no re-bill over a post-verification change.
- **AC-2 per-batch metadata + stop-at-FAILED:** A23 passes.
- **AC-3 fencing:** A24 passes; a session still holding the target is killed before restore.
- **AC-4 terminal path + preservation:** forced real check failure → wrapper exit ≠ 0, fixture and stage tables retained, evidence shows the FAIL; explicit teardown afterwards leaves only `sik`, `sik_bench`.
- **AC-5 honest outputs:** log wording conditional (P9-A1); A11 counts ERROR; builder check can fail (shown on a planted mismatch); §13 restated; verify_frozen source check (A25).
- **AC-6 records + v9.**

## 3. Guardrails
- Live `sik`/`sik_bench`: read-only. All mutation on `sik_p6f` (or a scratch DB created by the
  script). A kept failed fixture is torn down by the same wrapper; nothing else is dropped
  without the owner's approval.
- Fencing kills only sessions on the **fixture** DB (and the benchmark account's sessions there);
  it must refuse to run when the target is `sik` or `sik_bench`.
- No secrets in commits; no subagents; verify every Astra claim in source before acting on it.
- Deploy LF copies (`tr -d '\r'`) and compare LF hashes local vs VPS.
- Mind the charset trap: any new join from utf8mb4 tables to Khanza's latin1 tables converts the
  utf8mb4 side (P8 regression).

## 4. Rubric cross-check (fill at close)
| AC | Evidence | PASS/FAIL | Notes |
|---|---|---|---|
| AC-1 retry/current state | A22 (current ≠ pre-reset detected, re-restored + verified, re-billed exit 0); A22b (recovery tables gone → RETRY-REFUSED, nothing deleted, no reset) | PASS | |
| AC-2 per-batch metadata + stop-at-FAILED | A23: 2 hash files; plain resume stops at FAILED with batch 2 PENDING; retry bills both | PASS | |
| AC-3 fencing | A24: `FENCE sik_p6f: sessions_killed=1 remaining=0`, restore verified, blocker gone; unit test: refused on live, surviving session → WRITER-ALIVE | PASS | |
| AC-4 terminal path + preservation | `evidence/p9/r5_p9_terminal_path_20261018T011818Z.md`: wrapper exit 1, fixture kept, A0 FORCED FAIL, FAIL=1, A13 PASS, xml on sik, grant 0, teardown-kept removed it | PASS | Middle checks skipped with P9_QUICK=1; the full suite ends through the same final line |
| AC-5 honest outputs | conditional FAILED log line; A11 counts ERROR (0 outside the deliberate checks); builder check exit 0 clean / 1 planted; §13 restated; A25 | PASS | |
| AC-6 records + v9 | R5 §20, manifest P9 re-pin (local LF = VPS), QMS VER-2026-10-18-DR-KHANZA-R5-P9-001, failure record, traces; v9 pending the owner's confirmation of spend | PARTIAL | v9 not yet run |

Evidence: `evidence/p9/` (suite 34/34, terminal-path check and its suite evidence, builder check, unit test 20/20). R5 §20.
