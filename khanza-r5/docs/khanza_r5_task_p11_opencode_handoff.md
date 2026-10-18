# R5-P11 handoff for opencode: discriminating recovery checks (negative controls)

**Who this is for:** an opencode agent doing the implementation and test work. **Who reviews
it:** the owner hands your report to the orchestrator (Claude), who checks every claim against
the repo and the evidence files. Write only what you can point to.

**Output you must produce:** the code and test changes below, evidence files, records, and **one
report** at `khanza-r5/docs/khanza_r5_p11_opencode_report.md`, using the template in §8.

---

## 0. Hard rules (read first; breaking any of these fails the whole task)

1. **No paid model runs.** Do not push or run any Kaggle task (`kaggle b t push/run`). Do not
   call any LLM API from scripts. The assessment budget is exhausted for the month.
2. **No git push.** Commit locally on the current branch `khanza-r5-p6` (§7). Never force,
   rebase, reset, stash or switch branches.
3. **Live databases are read-only.** `sik` and `sik_bench` on the VPS must never be written,
   dropped, re-granted or fenced. Every mutation happens on the disposable fixture `sik_p6f`
   (built and dropped by `tools/p6_run_suite_fresh.sh`) or on a scratch DB that your script
   creates and drops itself (for example `sik_p11*`). If any check or command reports a change to
   live state (A13 FAIL, live checksum differs, ledger hash differs from
   `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`), **stop**, do
   not try to repair it, and write the report.
4. **No secrets in any committed file or report:** no VPS IP or hostname, no DB passwords, no
   Khanza AES key/IV. VPS access comes from `khanza-r5/.vps.env` (gitignored; source it, never
   print it). Before committing, scan the staged diff:
   `. khanza-r5/.vps.env && git diff --cached | grep -cF "$VPS_HOST"` must print `0`.
5. **Do not delete or rewrite evidence or records.** Correct report text by striking through
   (`~~old~~ *new*`), never by deleting. Old evidence files stay.
6. **Verify before you claim.** Every number in the report comes from a file you name, with the
   exact line quoted. If something was not done, or not verified, say so plainly.
7. **No sub-agents spawning other tools that bypass these rules.**

## 1. Context pack (read these, in this order)

| File | Why |
|---|---|
| `khanza-r5/evidence/astra_v10_4918967_NOTE.md` | **The task source:** the 9 confirmed v10 findings you are fixing |
| `khanza-r5/records/failures/20261018T1630Z-evidence-integrity-r5-p10-nondiscriminating-checks.json` | The open failure record you must close |
| `khanza-r5/docs/khanza_session_handoff_20261017.md` (UPDATE blocks at the top, §4, §5) | State, standing directives, known traps |
| `khanza-r5/docs/khanza_benchmark_report_R5.md` §19–§21 | What P8–P10 claim (you will correct §21) |
| `khanza-r5/docs/khanza_r5_task_p10_integrated_recovery.md` | The previous wave's task doc and rubric (format to copy) |
| `khanza-r5/docs/khanza_r5_release_manifest.md` | Tool SHA pins (you will re-pin) |
| `khanza-r5/tools/sampled_real_form_diff_r5.py` | The oracle: `stage_backup`, `_content_hash`, `stage_restore`, `_stage_restore_inner`, `recover_writer_exclusion`, `reap_writers`, `fence_sessions`, `main` resume loop, `_finalize` |
| `khanza-r5/tools/p6_acceptance_suite.sh` | The 39-check suite (A28, A31, `P10_INJECT`/A30, `restore_kept`, `check()`, `P9_FORCE_FAIL_CHECK`) |
| `khanza-r5/tools/p10_preservation_check.sh`, `p10_hash_state.py` | The integrated experiment you will repair |
| `khanza-r5/tools/p8_recovery_unit_test.py` | Mocked unit tests (26 cases); extend them |
| `khanza-r5/tools/p6_run_suite_fresh.sh` | The wrapper: fixture build, `KEEP_ON_FAIL`, `--teardown-kept` |
| `khanza-r5/evidence/p10/` | The latest passing evidence (format of transcripts) |

**Key facts (do not re-discover):**
- The tools are deployed on the VPS at `/opt/Deers-Rock/tools/`, and the repo copy is
  `khanza-r5/tools/`. **Deploy LF copies** (Windows working copies can be CRLF):
  `tr -d '\r' < f > deploy/f`, scp, then compare `sha256sum` local (LF) vs VPS; they must be identical.
- Remote access: `. khanza-r5/.vps.env` then `ssh $VPS_OPTS -p $VPS_PORT root@$VPS_HOST …` and
  `scp $VPS_OPTS -P $VPS_PORT …`. Long jobs run **detached**:
  `(setsid nohup bash /opt/Deers-Rock/tools/X.sh > /tmp/X.log 2>&1 < /dev/null &)`, then poll the log.
  Always redact IPs from anything you paste (`sed -E 's/[0-9]{1,3}(\.[0-9]{1,3}){3}/<ip>/g'`).
- One full suite run: `bash /opt/Deers-Rock/tools/p6_run_suite_fresh.sh` (fixture build ~3 min
  + suite ~25–45 min). A failing suite **keeps** `sik_p6f`; inspect it, save the evidence, then
  `bash p6_run_suite_fresh.sh --teardown-kept`. A fresh run refuses while `sik_p6f` exists.
- The harness/consumer read `setting/database.xml` (retarget only with `tools/p6_dbxml.py`).
  After every run both copies must be on `sik`: `python3 /opt/Deers-Rock/tools/p6_dbxml.py probe`.
- Charset trap: Khanza tables are latin1, the ledger is utf8mb4. Any new join must convert the
  utf8mb4 side (`CONVERT(l.no_rawat USING latin1)`), or it loses the index and takes ~30 min.
- All reset tables are InnoDB; transactions work. `dbutil.session(db)` streams one session.
- Writer exclusion revokes the benchmark account's INSERT/UPDATE/DELETE on the **fixture** during
  restores and must never touch `sik`/`sik_bench` (`LIVE_DBS`).
- Windows Git Bash heredocs can mangle backslashes: write patch scripts with a file editor, not
  `python - <<EOF` with `\\` inside.
- `pm1-trace` and `C:/Users/think/self-harness/tools/retrace.py` are available locally (§7).

## 2. Tasks (P11). Each needs code + a check + a NEGATIVE CONTROL

**Negative control (NC) means:** a test-only switch (an env var, inert unless set) that
deliberately breaks the property, plus a run showing the check **FAILS** with the switch on and
**PASSES** without it. A check without a demonstrated NC is not accepted as evidence.

| ID | Finding (v10 NOTE #) | Required change | Check | Negative control |
|---|---|---|---|---|
| T1 | #8 A28 cannot see a missing rollback | Make A28 discriminating: between the first backup and the faulty retry, make the live rows of the batch **differ** from the staged rows (for example change them, then restore them with the verified path), so a non-transactional re-backup would leave different stage content. Compare stage checksums before and after. | A28' | `R5_NEGCTL_BACKUP_NO_TXN=1`: `stage_backup` runs its DELETE/REPLACE as separate autocommit statements (the pre-P10 behaviour). A28' must FAIL with it. |
| T2 | #4 baseline too late | In `p10_preservation_check.sh` and the `P10_INJECT` block, take an independent **pre-operation** snapshot (before the injected run resets anything) of the sample visits' output rows and the protected visits. Then assert separately: (a) after the immediate failure handling, the sample equals the pre-operation snapshot (immediate restoration); (b) the stage tables equal their state at the failure (preservation); (c) after the retry, the protected visits and live tables equal the pre-operation snapshot. | preservation check | `R5_NEGCTL_SKIP_IMMEDIATE_RESTORE=1`: the failure path in `_bill_date` skips `stage_restore` but records `restored=True`. The preservation check must FAIL with it. |
| T3 | #1 NULL checksum compares equal | `p10_hash_state.py`: a missing table, NULL checksum or empty inventory is an error (exit 1, a non-comparable value such as `"ERROR:<table>"` that never equals anything). The check must assert the inventory is complete (the expected table list) and non-null. | preservation check + unit test | Drop one stage table on the kept fixture before the post-hash: the check must FAIL. |
| T4 | #7 marker not fsynced; a malformed marker fails open | Write the marker atomically (temp file + `os.fsync` + `os.replace`). A malformed or unreadable marker must **fail closed**: keep the file, log `WRITER-EXCLUSION marker unreadable`, refuse to proceed (exit 3), and never delete it. Add the expected-privilege fallback: if the marker is unreadable, the operator must restore grants with an explicit `--recover-grants DELETE,INSERT,UPDATE` flag (document it). | unit tests (malformed marker → refuse, kept; valid marker → grant back; a crash between the marker write and the revoke → recovery grants back or no-ops) | Unit test with the old behaviour (monkeypatched) shows the fail-open path; the new code passes. |
| T5 | #3 stale `restored=True` after RETRY-REFUSED | On `RETRY-REFUSED` set `b["restored"] = False` and `b["restore_state"] = "refused"`, and save state. `_finalize` must show it. | A22b extended: the state file shows `restored=False` after the refusal | `R5_NEGCTL_KEEP_STALE_FLAG=1` keeps the old flag; the extended A22b must FAIL. |
| T6 | #2 hash and staged rows not one snapshot | Compute the pre-reset hash **from the staged rows** (the stage tables are what a restore copies back), with the same canonical form as `_content_hash` on the live tables, so that "restore verified" means "live equals what was staged". Add a unit test that the two functions agree on identical data. | A31-style check: immediately after a backup, hash(stage) == hash(live) for the batch | `R5_NEGCTL_HASH_FROM_LIVE_LATE=1`: change one live row between commit and hashing (old order); the check must FAIL. |
| T7 | #5 perturbation not asserted; #6 no trap | Preservation check: assert the perturbing UPDATE changed exactly the number of rows counted before it (`ROW_COUNT()` or before/after counts). Add an EXIT trap that always restores `database.xml` (`p6_dbxml.py restore`) and revokes the benchmark grant on the fixture. **On any failed assertion, keep the fixture** and do not call `--teardown-kept`; print the teardown command instead. | the check's own transcript | Force one assertion to fail (`P11_FORCE_FAIL=<n>`): the transcript shows FAIL, the fixture kept, `database.xml` on `sik`, the grant removed. |
| T8 | #9 wording | R5 §21: strike through and correct "13 populated stage tables" (state tables and rows: 13 tables, 21 rows total, and how many tables were non-empty), "crash-safe via the marker" (which fault placements were actually tested), A10e "delete scope = insert scope" (it also deletes orphan rows: say so). Re-derive each number from the evidence file and quote it. | — | — |

Keep existing behaviour and checks otherwise unchanged. All NC switches are inert unless set,
named `R5_NEGCTL_*`/`P11_*`, and listed in the oracle docstring and the suite header.

## 3. How to run the negative controls

Write `tools/p11_negative_controls.sh`. For each NC it runs the **targeted** check on a fixture
twice: once with the switch (expect FAIL) and once without (expect PASS). It prints one line per
NC: `NC <id>: with-switch=<FAIL|PASS> without=<PASS|FAIL> -> DISCRIMINATING|NOT-DISCRIMINATING`,
and it exits 0 only if every NC is DISCRIMINATING. It may reuse the wrapper with `P9_QUICK`-style
selective modes (add a `P11_ONLY=<check ids>` mode to the suite that runs only the named checks,
plus A0 and A13). The fixture rules in §0 apply.

## 4. Required runs (in this order)

1. Unit tests: `python3 /opt/Deers-Rock/tools/p8_recovery_unit_test.py` (all pass, new cases included).
2. `bash /opt/Deers-Rock/tools/p11_negative_controls.sh` (all NCs DISCRIMINATING).
3. A full fresh suite: `bash /opt/Deers-Rock/tools/p6_run_suite_fresh.sh` → exit 0, every check PASS.
4. The repaired preservation check: `bash /opt/Deers-Rock/tools/p10_preservation_check.sh` → PASS.
5. The builder reproduction: `bash /opt/Deers-Rock/tools/p8_builder_all_check.sh` → exit 0, live
   ledger reproduced.
6. Live-state proof after everything: databases are exactly `sik sik_bench`, both `database.xml`
   copies are on `sik`, the live ledger hash is as in §0.3, no `/opt/dr-benchmark/results/.writer_exclusion_*`
   file exists, and the benchmark account has no grant on `sik_p6f`.

If a run fails, keep its evidence (copy the transcript into `evidence/p11/` with `_FAILED` in the
name), fix, and re-run. Report every failed run; do not hide it.

## 5. Evidence to save (into `khanza-r5/evidence/p11/`)

- the unit test output with its header (tool SHAs);
- the NC transcript;
- the full suite transcript (`r5_p6_acceptance_<ts>.md`) and any FAILED ones;
- the preservation check transcript plus its suite evidence and retry log;
- the builder check output;
- `r5_p11_live_state.txt` (the §4.6 proof, IPs redacted).

## 6. Records (copy the P10 formats)

- R5 report: new `## 22. P11: …` section (what changed, every number with its evidence file, "Still not claimed").
- Task doc: `khanza-r5/docs/khanza_r5_task_p11_negative_controls.md`, written **before** you
  change code (copy the P10 task doc layout; §4 rubric filled at the end).
- Manifest: re-pin every changed tool (full SHA-256 of the LF file; local = VPS).
- QMS record `khanza-r5/records/qms/VER-<date>-DR-KHANZA-R5-P11-001.json` (copy it to
  `C:\Users\think\Agentic Layer\qms\records\verifications\`).
- Close failure record `20261018T1630Z-…` (status `corrected`, add `done` + `verification`), and
  add a new failure record for any defect you find on the way.
- pm1 trace: `pm1-trace trace --agent opencode --outcome <pass|partial|fail> --slug r5-p11-negative-controls --encoding morse --action "<one paragraph>" --key-files <every file you touched, full Windows paths>`,
  copy the `.pm1` into `khanza-r5/records/traces/`, then
  `python C:/Users/think/self-harness/tools/retrace.py --project-root C:/Users/think/Project_v2/Deers-Rock/khanza-r5 --traces-dir C:/Users/think/self-harness/traces`
  must print `Directory is trace-clean.`
- Handoff: add a short `UPDATE (P11)` block at the top of `khanza_session_handoff_20261017.md`.

## 7. Commit (local only)

One or more commits on `khanza-r5-p6`. The message starts with `khanza-r5: P11 …`; the body
lists what changed and the evidence; it ends with `Co-Authored-By: opencode <noreply@opencode.ai>`.
Run the secret scan (§0.4) before every commit. **Do not push.** Put the final commit hash in the
report.

## 8. Report template (write it to `khanza-r5/docs/khanza_r5_p11_opencode_report.md`)

```markdown
# P11 opencode report

## Summary
- Outcome: PASS | PARTIAL | FAIL (one sentence why)
- Commits (local, not pushed): <hash> <subject> (one line each)
- Tool SHA-256 (LF, local = VPS): <file> <sha> (one line each)

## Per task
### T1 … T8 (one block each)
- Change: <file>:<function> — what changed (2–4 lines)
- Check: <check id> — evidence file + the exact PASS line, quoted
- Negative control: <switch> — with-switch result line, without-switch result line (quoted), verdict
- Deviations from the handoff, and why
- Not done / not verified

## Runs
| # | Command | Start–end (UTC) | Exit | Evidence file | Result line (quoted) |
(every run, including FAILED ones)

## Live-state proof
(quote r5_p11_live_state.txt)

## Records
R5 §22, task doc, manifest, QMS, failure records (closed/new), pm1 trace, retrace output (quoted)

## Rubric self-score
(fill the table from §9 honestly; the orchestrator will re-score)

## Problems found, open items, and anything you are unsure about
```

## 9. Rubric (the orchestrator scores the report against this)

Each item scores 0 / 1 / 2: 0 = missing or false, 1 = partly done or partly evidenced,
2 = done and evidenced with quoted lines that the reviewer can find. **Any hard-rule violation
(§0) caps the total at 0**, whatever else was done.

| # | Item | 2 points requires |
|---|---|---|
| R1 | T1 A28 discriminating | A28' code + PASS line + NC `R5_NEGCTL_BACKUP_NO_TXN` FAIL line |
| R2 | T2 pre-operation baseline | Snapshot before reset; immediate-restoration and retry assertions separate; NC skip-restore FAILS the check |
| R3 | T3 hash inventory | NULL/missing → error and non-comparable; inventory asserted; dropped-table run FAILS |
| R4 | T4 marker | Atomic + fsync; malformed → refuse and keep; unit tests incl. the old fail-open path shown |
| R5 | T5 stale flag | State shows `restored=False` after refusal; NC FAILS the extended A22b |
| R6 | T6 hash coherence | Hash from staged rows; equality unit test; NC FAILS |
| R7 | T7 trap + perturbation + keep-on-fail | Row-count assertion; EXIT trap; forced failure keeps the fixture with xml on sik and no grant |
| R8 | T8 wording | Each correction struck through, with the re-derived number quoted from evidence |
| R9 | NC script | `p11_negative_controls.sh` exits 0, every NC DISCRIMINATING, transcript saved |
| R10 | Full suite + preservation + builder | All exit 0; transcripts saved; FAILED runs (if any) kept and reported |
| R11 | Live-state proof | All §4.6 items quoted |
| R12 | Records | R5 §22, task doc (written first), manifest re-pin local = VPS, QMS, failure records, trace-clean |
| R13 | Report honesty | Every claim has a file + quoted line; "not done" stated; no number without a source |
| R14 | Hygiene | LF deploy; secret scan 0; no push; no Kaggle; no live writes; commit messages per §7 |

**Evaluation:** total out of 28. **Accept** = no §0 violation, ≥ 24/28, and R1, R2, R9, R10,
R11 all at 2. **Accept with fixes** = no §0 violation, 18–23. **Reject** = any §0 violation or
< 18. The orchestrator re-runs nothing that costs model quota; it checks the evidence files,
the diffs and the VPS state (read-only) against the report.
