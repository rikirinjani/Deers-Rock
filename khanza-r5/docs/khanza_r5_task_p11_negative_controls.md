# R5-P11 Task: discriminating recovery checks (negative controls)

Written 2026-10-19 BEFORE execution, per task-before-hands. Source: the handoff
`docs/khanza_r5_task_p11_opencode_handoff.md` and Astra v10
(`evidence/astra_v10_4918967_NOTE.md`, run 4918967, **63/100**), whose 9 findings were all
confirmed in source on 2026-10-18. This task closes the open failure record
`records/failures/20261018T1630Z-evidence-integrity-r5-p10-nondiscriminating-checks.json`:
several P10 checks would also pass without the property they claim, and R5 §21 wording was
broader than the runs.

**Scope:** make the recovery checks discriminating — for each, add a test-only negative control
(an inert switch, `R5_NEGCTL_*` / `P11_*`) that deliberately breaks the property and shows the
check **FAILS** with the switch on and **PASSES** without it. A check without a demonstrated
negative control is not accepted as evidence. No new check types, no paid model runs, no git
push; local commits on `khanza-r5-p6` only. Live `sik`/`sik_bench` read-only; all mutation on
the disposable `sik_p6f` fixture (or a scratch DB created and dropped by the script itself).

## 0. Defects to close (v10 NOTE #, verified against source on 2026-10-18)

| ID | Defect | Where | Consequence |
|---|---|---|---|
| D1 | #8 A28 cannot see a missing rollback: the retry re-backs-up the same rows already staged, so stage checksums are equal with or without the transaction | `sampled_real_form_diff_r5.py` `stage_backup` + suite A28 | The non-destructive-backup claim is unevidenced |
| D2 | #4 the preservation baseline is taken too late: `p10_hash_state.py` runs after the injected run's failure and its restore | `p10_preservation_check.sh`, suite `P10_INJECT` block, `p10_hash_state.py` | A wrong immediate restore would be recorded as the baseline and pass |
| D3 | #1 a missing table / NULL checksum compares equal: `stage[n] = str(rows[0][1]) if rows else None` turns a missing value into the string "None" | `p10_hash_state.py` | An incomplete or broken hash inventory passes |
| D4 | #7 the exclusion marker is not fsynced; a malformed marker is read as `{}` → grants nothing back, deletes the marker (fails open) | `sampled_real_form_diff_r5.py` `stage_restore` / `recover_writer_exclusion` | A crash between marker write and revoke loses the recovery record |
| D5 | #3 `RETRY-REFUSED` leaves an earlier `restored=True` in the state file | `main` resume loop in the oracle | The state file claims a restore that did not happen |
| D6 | #2 the pre-reset hash and the staged rows are not one snapshot: the hash is taken from the LIVE tables after the stage copy commits | `stage_backup` in the oracle | "restore verified" does not mean "live equals what was staged" |
| D7 | #5 the preservation check prints but does not assert the perturbation's changed-row count; #6 no EXIT trap for its own grant/database.xml changes, and it tears down the fixture even after a failed assertion | `p10_preservation_check.sh` | A failed assertion loses the kept fixture and may leave grants/xml changed |
| D8 | #9 R5 §21 wording: "13 populated stage tables" (13 tables, 21 rows total, some empty), "crash-safe via the marker" (one SIGKILL placement tested; marker not fsynced, malformed fails open), A10e "delete scope = insert scope" (the DELETE also removes orphan rows) | `khanza_benchmark_report_R5.md` §21 | Claim-honesty |

## 1. In scope (T1–T8, per the handoff §2)

| ID | Finding | Required change | Check | Negative control |
|---|---|---|---|---|
| T1 | #8 | Make A28 discriminating: between the first backup and the faulty retry, change the live rows of the batch and restore them with the verified path, so a non-transactional re-backup would leave different stage content. Compare stage checksums before and after. | A28' | `R5_NEGCTL_BACKUP_NO_TXN=1`: `stage_backup` runs its DELETE/REPLACE as separate autocommit statements (pre-P10 behaviour). A28' must FAIL with it |
| T2 | #4 | In `p10_preservation_check.sh` and the `P10_INJECT` block, take an independent **pre-operation** snapshot (before the injected run resets anything) of the sample visits' output rows and the protected visits. Assert separately: (a) after immediate failure handling, sample equals the pre-operation snapshot; (b) the stage tables equal their state at the failure; (c) after the retry, protected visits and live tables equal the pre-operation snapshot | preservation check | `R5_NEGCTL_SKIP_IMMEDIATE_RESTORE=1`: the failure path in `_bill_date` skips `stage_restore` but records `restored=True`. The preservation check must FAIL with it |
| T3 | #1 | `p10_hash_state.py`: a missing table, NULL checksum or empty inventory is an error (exit 1, a non-comparable value such as `"ERROR:<table>"` that never equals anything). Assert the inventory is complete (expected table list) and non-null | preservation check + unit test | Drop one stage table on the kept fixture before the post-hash: the check must FAIL |
| T4 | #7 | Write the marker atomically (temp file + `os.fsync` + `os.replace`). A malformed or unreadable marker must fail closed: keep the file, log `WRITER-EXCLUSION marker unreadable`, refuse to proceed (exit 3), never delete it. Add the expected-privilege fallback: `--recover-grants DELETE,INSERT,UPDATE` (document it) | unit tests: malformed marker → refuse and keep; valid marker → grant back; crash between marker write and revoke → recovery grants back or no-ops; old fail-open path shown by monkeypatching | Unit test with the old behaviour (monkeypatched) shows the fail-open path; the new code passes |
| T5 | #3 | On `RETRY-REFUSED` set `b["restored"] = False` and `b["restore_state"] = "refused"` and save state; `_finalize` must show it | A22b extended: the state file shows `restored=False` after the refusal | `R5_NEGCTL_KEEP_STALE_FLAG=1` keeps the old flag; the extended A22b must FAIL |
| T6 | #2 | Compute the pre-reset hash **from the staged rows** (the stage tables are what a restore copies back), with the same canonical form as `_content_hash` on the live tables, so "restore verified" means "live equals what was staged". Add a unit test that the two functions agree on identical data | A31-style check: immediately after a backup, hash(stage) == hash(live) for the batch | `R5_NEGCTL_HASH_FROM_LIVE_LATE=1`: change one live row between commit and hashing (old order); the check must FAIL |
| T7 | #5/#6 | Assert the perturbing UPDATE changed exactly the number of rows counted before it. Add an EXIT trap that always restores `database.xml` (`p6_dbxml.py restore`) and revokes the benchmark grant on the fixture. On any failed assertion, keep the fixture (no `--teardown-kept`) and print the teardown command | the check's own transcript | `P11_FORCE_FAIL=<n>`: force one assertion to fail; the transcript shows FAIL, the fixture kept, `database.xml` on `sik`, the grant removed |
| T8 | #9 | R5 §21: strike through and correct "13 populated stage tables" (13 tables, 21 rows total, and how many were non-empty), "crash-safe via the marker" (which fault placements were actually tested), A10e "delete scope = insert scope" (it also deletes orphan rows: say so). Re-derive each number from the evidence file and quote it | — | — |

All NC switches are inert unless set, named `R5_NEGCTL_*`/`P11_*`, and listed in the oracle
docstring and the suite header. Existing behaviour and the other checks are otherwise unchanged.

## 2. Acceptance criteria

- **AC-1 discriminating A28 (T1):** A28' PASS in the full suite; with `R5_NEGCTL_BACKUP_NO_TXN=1`
  the targeted NC run FAILS; without it PASSES. Transcript in `evidence/p11/`.
- **AC-2 pre-operation baseline (T2):** the `P10_INJECT` block records the pre-operation snapshot
  **before** the injected run; the preservation check asserts (a) immediate restoration of the
  sample, (b) stage preservation, (c) protected + live unchanged after the retry — separately.
  `R5_NEGCTL_SKIP_IMMEDIATE_RESTORE=1` makes the check FAIL.
- **AC-3 hash integrity (T3):** `p10_hash_state.py` exits 1 on a missing/NULL/empty inventory
  with a non-comparable `"ERROR:<table>"` value; the expected stage-table list is asserted;
  dropping one stage table on the kept fixture makes the preservation check FAIL.
- **AC-4 marker crash-safety (T4):** marker written with temp+fsync+replace; malformed/unreadable
  marker → log `WRITER-EXCLUSION marker unreadable`, exit 3, file kept, grants NOT restored until
  an operator passes `--recover-grants DELETE,INSERT,UPDATE`; unit tests cover the malformed
  (refuse+keep), valid (grant back, marker removed), and crash-between-write-and-revoke (recovery
  grants back or no-ops) cases, and show the old fail-open path via monkeypatch.
- **AC-5 no stale flag (T5):** after `RETRY-REFUSED` the state file shows `restored=False`,
  `restore_state=refused`; `_finalize` reports it; `R5_NEGCTL_KEEP_STALE_FLAG=1` makes the
  extended A22b FAIL.
- **AC-6 snapshot coherence (T6):** the pre-reset hash is computed from the staged rows in the
  same canonical form; a unit test proves stage-hash and live-hash agree on identical data;
  `R5_NEGCTL_HASH_FROM_LIVE_LATE=1` (live row changed between commit and hashing) makes the
  equality check FAIL.
- **AC-7 honest preservation check (T7):** the perturbation's changed-row count is asserted equal
  to the before count; the EXIT trap restores `database.xml` to `sik` and revokes the benchmark
  grant on the fixture on every exit; a forced failure (`P11_FORCE_FAIL=<n>`) keeps the fixture,
  prints the teardown command, and the transcript shows FAIL + kept + xml-on-sik + no-grant.
- **AC-8 wording (T8):** §21 struck-through corrections with re-derived numbers quoted from
  `evidence/p10/r5_p10_preservation_20261018T154610Z.md`.
- **AC-9 NC script:** `tools/p11_negative_controls.sh` runs each NC on a fixture twice (with
  switch → expect FAIL; without → expect PASS) and exits 0 only when every NC is DISCRIMINATING;
  a `P11_ONLY=<ids>` selective mode is added to the suite (named checks + A0 + A13).
- **AC-10 runs (§4 of the handoff):** unit tests all pass; NC script all DISCRIMINATING; full
  fresh suite exit 0; preserved-preservation check PASS; builder check exit 0 (live ledger
  reproduced); live-state proof (databases `sik sik_bench`, both `database.xml` on `sik`, live
  ledger hash `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`,
  no `.writer_exclusion_*` marker, no benchmark grant on `sik_p6f`).

## 3. Guardrails (handoff §0)

- **No paid model runs.** No `kaggle b t push/run`; no LLM API calls from scripts.
- **No git push.** Local commits only on `khanza-r5-p6`; no force/rebase/reset/stash/branch switch.
- **Live databases read-only.** Every mutation on `sik_p6f` (built and dropped by
  `p6_run_suite_fresh.sh`) or a scratch DB created and dropped by the script itself
  (`sik_p11*`). If any check reports a change to live state (A13 FAIL, live checksum differs,
  ledger hash differs from `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`),
  stop, do not repair, write the report.
- **No secrets in any committed file or report:** no VPS IP/hostname, no DB passwords, no Khanza
  AES key/IV. VPS access via `khanza-r5/.vps.env` (gitignored; source it, never print it).
  Before every commit: `. khanza-r5/.vps.env && git diff --cached | grep -cF "$VPS_HOST"` must print `0`.
- **No deletion or rewriting of evidence or records.** Correct report text by striking through
  (`~~old~~ *new*`), never by deleting; old evidence files stay.
- **Verify before claiming.** Every number in the report comes from a file that is named, with the
  exact line quoted.
- **Deploy LF copies** (`tr -d '\r' < f > deploy/f`, scp, compare `sha256sum` local-LF vs VPS).
- No sub-agents for this work (standing owner directive; handoff §0.7).

## 4. Rubric cross-check (fill at close)

| AC | Evidence | PASS/FAIL | Notes |
|---|---|---|---|
| AC-1 A28' discriminating | `evidence/p11/r5_p11_nc1_clean_20261020T010740Z.log` (with=FAIL / without=PASS, fresh fixture); A28 PASS in `r5_p6_acceptance_20261019T212302Z_FROZEN_39PASS.md` | PASS | The first frozen-byte NC run reported NC1 NOT-DISCRIMINATING because a fixture left by the other session was reused (`…003440Z_4of5_NC1-CONTAMINATED.md`); the clean re-run discriminates. Both kept. |
| AC-2 pre-operation baseline | `r5_p10_preservation_20261019T210238Z_NC5WITHOUT_PASS.md` ("stage: pre-op vs post-fail = DIFFERENT", "PRESERVATION-RESULT a(sample-immediate)=EQUAL b(stage-preservation)=EQUAL c(protected-live)=EQUAL"); NC2 with=FAIL(2) / without=PASS | PASS | (a)/(b)/(c) asserted separately, baseline before the injected run. |
| AC-3 hash inventory | NC5 with=FAIL(2) / without=PASS (`…003440Z` transcript, "dropping stage table: r5_stage_B3_r6_p10_billing"); `--stage-tables-list` + `ERROR:<table>` in `p10_hash_state.py` | PASS | Dropping one stage table fails the check; the inventory is asserted complete. |
| AC-4 marker | `r5_p11_unit_test_frozen_20261020T003254Z.log`: "PASS  T4 OLD behaviour (monkeypatched fail-open)…got=(True, False, [])", "PASS  T4 NEW behaviour: …REFUSED and KEPT…", 33/33 | PASS | Old fail-open path shown by monkeypatch; new path refuses and keeps. |
| AC-5 stale flag | NC3 with=FAIL / without=PASS; `A22b: PASS — …state shows restored=False, restore_state=refused, nothing re-billed` | PASS | |
| AC-6 hash coherence | NC4 with=FAIL / without=PASS; unit test "PASS  T6 _content_hash (live) and _stage_content_hash (staged) agree on identical data" | PASS | |
| AC-7 perturbation + trap | `r5_p10_preservation_20261019T210740Z_FORCEFAIL_FAIL1_PASS.md`: one `- **FAIL**: perturbation row count asserted`, "fixture sik_p6f is KEPT", keep-path PASS, `PRESERVATION-CHECK FAIL (1)` | PASS | EXIT trap left `database.xml` on `sik` and the grant removed. |
| AC-8 wording | R5 §21 strike-throughs + `r5_p11_preserve_after_fail_20261019T2111Z.json` (13 tables, 21 rows, 5 non-empty; `protected_n: 20`) | PASS | Numbers quoted in §22. |
| AC-9 NC script | 5/5 DISCRIMINATING, but across two invocations (`…003440Z` for NC2–NC5, `…010740Z` for NC1); `NC-EXIT=1` on the first | **PARTIAL** | The script exits 0 only on 5/5; no single uncontended invocation achieved it. The cause of the NC1 miss (fixture reuse on a foreign fixture) is diagnosed, not fixed in the driver. |
| AC-10 runs | unit 33/33; NC 5/5 (two invocations); suite 39/39 exit 0; preservation PASS; builder exit 0 (`356355:a66a3a54…` both sides); live-state file `r5_p11_live_state_frozen_20261020T0120Z.txt` | PASS | All after the byte freeze (`FROZEN.sha256`, `chattr +i`); SHAs verified before/after. |

Evidence: `evidence/p11/` (unit test, NC transcripts incl. the contaminated one, full suite transcript
+ raw logs, preservation transcript + its suite evidence + retry log, forced-fail transcript, builder
output, live-state proofs, `FROZEN.sha256` manifest). R5 §22.
