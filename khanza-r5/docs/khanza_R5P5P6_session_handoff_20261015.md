# Session Handoff — DR→Khanza E2E Benchmark (2026-10-15)

## TL;DR
- Astra v5 (gpt-6-astra run 4795743) scored **43/100 "Needs targeted rework"** — flat vs v4, +8 vs v1.
- P5 (fail-closed oracle + report consistency) was closed, then **re-opened** when the v5 task-validation model (gemini-3.8-flash run 4795485) caught two evidence defects in my first-pass P5 re-demos. Both re-fixed; P5 records corrected.
- **P6 task written + patched + fixture built, but the 10-check acceptance suite has NOT yet run.** That's the single next action.

## One-paragraph state
The benchmark's fail-closed oracle (P5) now has a real exit contract (0/1/4), conditional BILLED, eligibility-based OUT-OF-ENVELOPE, gated repair, per-run stage tables, and the P5-5b DDL/DML privilege split (stage CREATE/DROP as root, DML as the minimally-privileged benchmark user; `DBUTIL_FORCE_ROOT=1` for scratch clones). The v5 validation model found that my first-pass P5 re-demos were anchored to live `sik` after the scratch fixture was dropped, so (a) the STRATA CSV was header-only (claimed 5 OUT-OF-ENVELOPE rows that weren't there) and (b) the drift demo exited 1 via an uncaught CREATE-privilege traceback rather than the verdict path. I re-patched the oracle to emit per-visit rows for non-BILLED batches + the P5-5b privilege split, re-ran the demos, and re-corrected R5 §15 + manifest SHAs. Astra v5 then read the full source (including dbutil.py, now embedded) and confirmed the P5 code fixes are genuine but surfaced NEW gate defects: the builder's "transactional" replace is not a transaction (each dbutil.execute opens a fresh session), `--window ALL` scoping excludes the 354 Stage-A visits, timeout kills the bash wrapper not the JVM descendant, restore is asserted not hash-verified, frozen-baseline verification is weaker than claimed, resume doesn't bind the original sample, and stage-drop claims "clean" even when it fails. P6 (task doc written) addresses all of these with a populated disposable-clone acceptance suite.

## P6 — what's done vs what's left
**Done (local, syntax-checked, NOT yet deployed/verified):**
- P6-2 oracle patches in `C:\Users\think\AppData\Local\Temp\opencode\sampled_real_form_diff_r5.py`:
  - P6-2a MISSING-REG structured rejection (exit 2, no None.replace traceback) + EMPTY-BASELINE gate (`--allow-empty-baseline`, else exit 2 on a zero value-row baseline).
  - P6-2b REPAIR-SKIPPED moved to a reachable spot (finalize loop over FAILED-batch ENVELOPE visits) so it actually fires.
  - P6-2c exit-0 qualifier documented (freeze-only/verify-frozen = administrative, not a billing verdict).
  - P6-2d stage-aware prefix `r5_stage_<stage>_<runid>_*` (same-RUN_ID/different-stage hazard closed).
  - P6-2e hash-verified `stage_restore` (STAGE-RESTORED-VERIFIED) + verified `stage_drop` (re-checks table absence; a failed drop forces verdict ≥ 4, no false "clean").
  - P6-2f resume binding (changed visits file on resume → structured abort exit 3).
  - P6-2g strengthened `verify_frozen` (all source counts + manifest-pinned per-visit hash + recomputed aggregate + source-content hash).
  - P6-4 process-group timeout kill (`start_new_session=True` + bounded SIGTERM→SIGKILL on the group + wait-dead proof before restore).
- P6-3 in `dbutil.py`: `dbutil.session(db)` — ONE persistent mysql process for a true single-session transaction.
- P6-3 in `build_dr_charge_ledger_p2.py`: cohort replace now runs in that single session (START TRANSACTION; DELETE; all REPLACEs; COMMIT), mid-build failure → ROLLBACK + exit 1.
- `sik_p6` populated fixture on VPS (targeted copy of live sik + 5 P4 STRATA- reg rows, FK-safe patient 000002).
- `C:\Users\think\AppData\Local\Temp\opencode\p6_acceptance_suite.sh` — the 10-check machine-asserted suite (A1 clean exit 0 … A10 single-session builder + in-window stale-key delete).
- `C:\Users\think\khanza_r5_task_p6_acceptance.md` — P6 task doc (10 ACs + rubric, unfilled).

**Left to do (the actual P6 execution, in order):**
1. `scp` the 3 patched local tools (`sampled_real_form_diff_r5.py`, `dbutil.py`, `build_dr_charge_ledger_p2.py`) to `/opt/Deers-Rock/tools/` and re-pin their SHAs in `khanza_r5_release_manifest.md` (superseding the P5-era pins 70f37ba3/7ce404a1/6f81ec1f).
2. Run `p6_acceptance_suite.sh` on VPS against `sik_p6` (it points harness `database.ini`→sik_p6, restores to sik after). Capture the 10 machine-asserted results + pre/post content hashes into `p-chain/r5_p6_acceptance_<ts>.md`.
3. **If any check fails for a real code reason** (not a fixture/harness glitch), patch the tool locally, syntax-check, re-pin SHA, re-sync, re-run that check. Known risk spots: A4 (timeout writer-dead proof depends on the process-group kill actually reaping the java descendant), A8 (restore-injection resume hash match), A10 (single-session builder under the real sik_bench ledger + sik_p6 consumer source).
4. Records: R5 §16 (P6 section), manifest SHA re-pin, task P6 rubric §5 filled, QMS `VER-...-P6-001.json`, pm1 trace `r5-p6-acceptance`, and a **failure record** for the P5 first-pass evidence defect (STRATA header-only CSV + drift-exit-via-traceback) that the v5 validation model caught.
5. Drop `sik_p6`; confirm harness `database.ini` = `sik`; re-verify live gates green (charge_delta delta 0, three_count A==C 31,750/3,113,533,580, ledger 356,355/34,870,243,633).
6. Optional: push a **v6 Astra re-assessment** (reuse/extend `task_r5p5_reassess.py` builder + `build_astra_task_r5p5.py`) embedding the P6 suite evidence to measure the delta off 43.

## Critical honesty constraints (keep stated, never overclaim)
- B-settlement equivalence is structurally unclaimable (headless form save writes the verification layer, not the consumer's `billing` settlement rows). P5/P6 prove the enforcement suite, **not** settlement equivalence.
- Same-price wrong-code-label swaps remain invisible to the line-diff (quantity aggregate only).
- External validity (C1–C4, cross-machine D2, DOI) remains NOT TESTED, human-gated.
- Astra's "unterminated ALL-predicate SQL literal" claim was a misread — the Python `%` sits inside the SQL string; closing quotes are present (verified in source). Don't propagate that as a real defect.
- The 999-visit sample is a consumer-oracle measurement (~0.3% rule-of-three bound), not population proof.

## Key files
- Report: `C:\Users\think\khanza_benchmark_report_R5.md` (§0–§15; add §16 for P6). R3 superseded-but-kept.
- Task docs: `C:\Users\think\khanza_r5_task_p6_acceptance.md` (P6, unfilled), `C:\Users\think\khanza_r5_task_p5_failclosed.md` (§4 SUPERSEDED, §4b = v5-validation-pass re-execution).
- Manifest: `C:\Users\think\khanza_r5_release_manifest.md` (re-pin tool SHAs after P6 deploy).
- Fix list: `C:\Users\think\khanza_fixes_astra_r4.md` (60 items; P1–P5 done; P6 targets the residual).
- Local tools (P6-patched, syntax-checked, **not yet deployed**): `C:\Users\think\AppData\Local\Temp\opencode\{sampled_real_form_diff_r5.py, dbutil.py, build_dr_charge_ledger_p2.py, charge_delta_per_component_p2.py, three_count_reconcile_p2.py}`.
- P6 suite: `C:\Users\think\AppData\Local\Temp\opencode\p6_acceptance_suite.sh`.
- Astra v5 output: `C:\Users\think\Project_v2\Deers-Rock\kaggle\deers-rock-assessment\dr-khanza-e2e-full-assessment\6\gpt-6-astra\4795743\dr-khanza-e2e-full-assessment_output.md` (VERDICT at line 1505; 43/100).
- v5 task source: `C:\Users\think\Project_v2\Deers-Rock\kaggle\deers-rock-assessment\task_r5p5_reassess.py` (+ builder `build_astra_task_r5p5.py`).
- QMS: `C:\Users\think\Agentic Layer\qms\records\verifications\VER-2026-10-15-DR-KHANZA-R5-P5-001.json` (add P6-001).
- Traces: `C:\Users\think\self-harness\traces\r5-p5-failclosed-enforcement.pm1`, `r5-astra-reassessment-v5-43of100.pm1`.

## Standing directives (unchanged)
- **No subagents** for the improvement work — handle directly (the board's ICD-10 mapper `fix-1` stays unused). External kaggle gpt-6-astra runs ARE allowed.
- No secrets (DB pw, VPS IP) in reports/logs. No Khanza jar/source edits.
- VPS: `root@$VPS_HOST` ssh/scp `-p/-P 20153`, key `~/.ssh/id_ed25519_dr_vps` (host/port in khanza-r5/.vps.env, gitignored), always `-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`. PowerShell mangles inline remote SQL/quotes → use the file-based `.sh`-scp-`bash /tmp/x.sh` pattern.
- Records are a hard gate: pm1 trace per task, QMS record, failure record for any defect, retrace clean before session close.

## Failure record to file (Rule 2) — P5 first-pass evidence defect
- Category: evidence-integrity / process.
- What went wrong: the P5 close-out records (R5 §15 demo bullets, task rubric §4 first-pass table, QMS P5-001) were written to match the *intended* demo behavior, not the *actual* transcript. Because the scratch `sik_p2` fixture had been dropped by post-demo cleanup, the P5 STRATA re-demo ran against live `sik` where the 5 STRATA- visits had **no `reg_periksa` rows** → the None-date crash path (so the claimed "restored FAILED batch via verdict path" didn't actually occur) and the STRATA CSV was header-only (the claimed 5 OUT-OF-ENVELOPE rows were absent). The drift demo's exit 1 was an **uncaught CREATE-privilege traceback**, not the fail-closed verdict path.
- Root cause: re-anchoring the demo to a different database without re-validating the fixture's preconditions (reg rows present for date-resolution), and writing the close-out record before cross-checking it against the on-box transcript.
- Caught by: the Kaggle task-validation model (gemini-3.8-flash, run 4795485) reading the embedded source — before the gpt-6-astra run could execute. This is the exact failure mode the P6 populated-fixture + machine-asserted suite is designed to prevent.
- Disposition: re-fixed in P5-5b + the P6-2a/P6-2b oracle patches; P6 will close it with a populated `sik_p6` fixture where the STRATA- visits DO have reg rows.
