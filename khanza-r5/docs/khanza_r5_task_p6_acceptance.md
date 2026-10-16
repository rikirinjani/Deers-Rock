# R5-P6 Task: Executable acceptance suite + gate atomicity/robustness

Written 2026-10-15 BEFORE execution, per task-before-hands. Source: Astra v5 re-assessment
(gpt-6-astra, run 4795743, 43/100 "Needs targeted rework") — its single most important next
step: "After fixing the SQL predicates and transaction semantics, run one current-pinned,
populated disposable-clone acceptance suite that produces machine-checkable verdicts,
injected-failure evidence, and exact pre/post restoration hashes."

## 0. Defects to close (verified against source before patching)

### From the v5 validation model (gemini-3.8-flash run 4795485 — caught the first-pass
evidence defects BEFORE the gpt-6-astra run could execute):
1. **STRATA demo date-None crash path**: visits with no `reg_periksa` row yield
   `tgl = None` -> `by_date[None]` -> `dates = [None]` -> `d.replace("-", "_")`
   AttributeError. Demo A (STRATA) re-anchored to live `sik` after the scratch fixture was
   dropped could not follow the claimed path. A populated fixture must be used.
2. **`REPAIR-SKIPPED` unreachable on the FAILED-batch path**: the log line lives only in the
   BILLED branch (where every `ok_flag` is true by construction, so it never fires there
   either — it fires only for a BILLED batch with a per-visit `sukses=false`, which P5-2
   now makes impossible for freshly billed batches). AC-4 as worded was wrong.

### From the gpt-6-astra v5 source read (run 4795743):
3. **Builder "transactional" replace is not a transaction**: each `dbutil.execute` opens a
   new mysql session; `START TRANSACTION; DELETE` on session A rolls back when A closes,
   REPLACEs commit independently on their own sessions, the final `COMMIT` runs on yet
   another session. Obsolete ledger keys can survive; a failed build can leave partial
   state. (Astra's "unterminated SQL literal" sub-claim was a misread — the Python `%` is
   inside the SQL string, closing quotes are present; verified.)
4. **Timeout can restore underneath a still-running JVM**: `p.kill()` kills the bash
   wrapper, not the Java descendant; no process-group termination, no post-kill wait.
5. **Restore is asserted, not verified**: separate DELETE/REPLACE calls, no transaction,
   no post-restore content hash.
6. **Frozen-baseline verification weaker than advertised**: fingerprint checks
   `count_billing` (no longer populated -> None==None) + `count_reg_periksa`; per-visit
   files hash-checked against their OWN stored hash, not against the manifest's pinned
   per-visit hash; aggregate manifest hash never recomputed.
7. **Resume does not bind the original sample**: a changed visits file can add encounters
   that never enter existing batches while finalize succeeds on the old ones.
8. **Cleanup claimed even when it fails**: `stage_drop` swallows exceptions, then logs
   "box left clean" unconditionally.
9. **Maintenance-mode exit-0 ambiguity**: `--freeze-only`/`--verify-frozen` return 0 without
   performing a billing comparison; the "0 only on a clean in-envelope pass" contract needs
   the billing-run qualifier.
10. **Same-RUN_ID/different-stage stage-table sharing**: prefix includes run_id but not
    stage; two stages under one RUN_ID share tables under separate locks.

Out of scope for P6: C1-C4 external calibration, cross-machine D2, DOI, populated-clone
edge-strata FINANCIAL equivalence (B-subset structural limit stands; P6 proves the
enforcement suite, not settlement equivalence).

## 1. In scope

| ID | Requirement |
|---|---|
| P6-1 | Populated disposable-clone fixture `sik_p6`: CREATE DATABASE `sik_p6` from a targeted dump of the 12 required output tables + `reg_periksa`/`detail_pemberian_obat`/`rawat_jl_dr`/`databarang` + the 5 P4-authored STRATA- reg rows (re-authored with real patient FK + billing rows), plus a small DR-cohort slice. `database.ini` temporarily -> `sik_p6`; FORCE_ROOT=1 for this run; restore `sik` after. |
| P6-2 | Oracle patches: (a) structured rejection of `tgl is None` visits (logged + classified `MISSING-REG`, exit 2 path, never a traceback); (b) `REPAIR-SKIPPED` moved to a reachable, correctly-worded log (fires at FINALIZE for ENVELOPE visits whose batch did not BILL, with the exact condition stated); (c) exit-code docstring qualifier: "0 only on a clean in-envelope billing run" + maintenance modes documented as administrative; (d) stage prefix now includes STAGE (`r5_stage_<stage>_<runid>_*`); (e) `stage_drop` verifies drop success (re-check table absence; on failure log STAGE-DROP-FAILED and force verdict >= 4, no "clean" claim); (f) resume binds the supplied visits file to the frozen manifest visit set (changed sample -> structured abort); (g) frozen verification checks ALL recorded source counts + per-visit manifest-pinned hashes + recomputed aggregate hash; (h) timeout handling: kill the process group (`start_new_session=True` + `os.killpg`), bounded SIGTERM->SIGKILL escalation, wait() proof the writer is dead before restore. |
| P6-3 | Builder atomicity: one persistent mysql session for the whole replace (add `dbutil.session(db)` returning a handle that feeds all statements to a single `mysql` process via streaming stdin; or `mysql ... -e` with a single multi-statement string) so `START TRANSACTION; DELETE; ...INSERTs...; COMMIT` is ONE session. Add a mid-build-failure test: corrupt one source value, assert the cohort is byte-identical to pre-build (rollback proven), and a stale-key test: pre-seed an obsolete ledger key, assert it is deleted by a clean window-scoped build. |
| P6-4 | Acceptance suite `acceptance_suite_p6.sh` (or .py) on `sik_p6` with the CURRENT pinned tools (oracle `70f37ba3...` + P6 patches, dbutil `7ce404a1...` + P6 patches, builder + P6-3). 10 checks, each machine-asserted (grep the exact log line / exit code), producing `p-chain/r5_p6_acceptance_*.md`: A1 nonempty clean baseline -> matching output -> exit 0; A2 controlled in-envelope row mismatch -> exit 1 via verdict path; A3 forced nonzero JVM rc (inject harness env that makes java exit 3) -> FAILED + exit 4; A4 timeout (sleep-injected harness, 30s cap) -> writer dead proof + FAILED + exit 4; A5 missing reg row -> structured MISSING-REG rejection exit 2, no traceback; A6 real edge fixtures (5 P4 STRATA- visits WITH reg rows) -> 5 OUT-OF-ENVELOPE rows + exit 4; A7 missing-settlement (delete one visit's billing rows pre-freeze so baseline is empty, form writes rows) -> mismatch exit 1 (baseline-completeness assertion: a zero-row baseline is recorded as EMPTY-BASELINE and the run requires `--allow-empty-baseline` to proceed, else exit 2); A8 restore-injection (kill the tool mid-restore via SIGTERM to the python process, resume) -> stage tables survive, resume restores, no false "restored/clean" claim; A9 same-RUN_ID/different-stage + overlapping-visit concurrency test -> the second invocation refuses (lock) or the prefix collision is provably absent; A10 stale-key + mid-build-failure on the scratch ledger copy. |
| P6-5 | Pre/post content hashes: SHA-256 of every reset-table row set (per no_rawat multiset) captured BEFORE and AFTER the suite, proving complete state restoration for the populated fixture. |
| P6-6 | Evidence + records: `p-chain/r5_p6_acceptance_<ts>.md`, R5 report §16 P6 section, manifest tool SHAs re-pinned, task rubric §5 filled, QMS verification record, pm1 trace. Failure record for the first-pass P5 evidence defects (the two validation-caught items). |

## 2. Acceptance criteria
- **AC-1 suite green:** all 10 checks A1-A10 PASS with machine-asserted log lines + exit codes in one file; suite re-runnable idempotently.
- **AC-2 no traceback paths:** A5/A7 structured exits (2/4), never AttributeError/RuntimeError traceback for missing reg or empty baseline.
- **AC-3 transaction proven:** stale-key deletion + mid-build rollback both PASS on the scratch ledger copy.
- **AC-4 writer-dead proof:** A4 log shows SIGTERM->SIGKILL escalation + `wait()` return + zero surviving java pids (pgrep proof).
- **AC-5 restore proven:** A8 resume completes, post-state hashes equal pre-state hashes (P6-5), and the run log shows STAGE-RESTORED-VERIFIED, not just "restored".
- **AC-6 no overclaim:** "box left clean" appears in logs ONLY when the drop re-check passed; STAGE-DROP-FAILED forces verdict >= 4.
- **AC-7 report/manifest:** §16 added, manifest SHAs updated to the P6 build, first-pass P5 defect disclosure included (not erased).
- **AC-8 records:** evidence file + rubric + QMS + pm1 trace + failure record for the P5 first-pass evidence defect.

## 3. Deliverables
1. Patched `sampled_real_form_diff_r5.py` + `dbutil.py` (P6-2/P6-3) local + VPS.
2. Rebuilt `build_dr_charge_ledger_p2.py` single-session replace (P6-3) local + VPS.
3. `sik_p6` populated fixture on VPS (dropped after the suite; live `sik` untouched, gates re-verified green).
4. `acceptance_suite_p6` script + `p-chain/r5_p6_acceptance_<ts>.md`.
5. R5 §16 + manifest + rubric §5 + QMS + traces.

## 4. Rubric cross-check (fill at close)
| AC | Evidence | PASS/FAIL | Notes |
|---|---|---|---|
| AC-1 suite green | `evidence/p6/r5_p6_acceptance_20261016T051552Z.md` | PASS | 18/18 (A0–A13 incl. A4b/A8b/A10b/A10c). Suite rewritten before use: the handed-off one had no freeze step (every billing run exits 3), false-pass paths in A5/A7/A8/A9, and A10 on the live ledger. Fixture `sik_p6f` (full clone), not the hollow `sik_p6`. |
| AC-2 no traceback | A5, A7, A2, A3 lines | PASS | A5 `MISSING-REG` exit 2 and A7 `EMPTY-BASELINE` exit 2, each reached past the eligibility gate (`--allow-strata`); traceback count 0 asserted in A2/A3/A5. |
| AC-3 transaction proven | A10, A10b, A10c | PASS | Stale in-window key gone; tax consistent; injected trigger failure (`ERROR 1644`) → rollback, scratch ledger byte-identical. |
| AC-4 writer-dead proof | A4, A4b | PASS | Proof is group-level (`killpg(pgid,0)` → ESRCH, `group_empty=true`) plus pgrep 0; SIGKILL escalation only fires if SIGTERM leaves members. A4b adds the SIGTERM-handler path (3 → 0 java). |
| AC-5 restore proven | A4, A4b, A8, A11 | PASS (amended) | `STAGE-RESTORED-VERIFIED` (content hash = pre-reset hash) on every restore, 0 mismatches. "Post-state == pre-state" cannot hold for A8 because resume legitimately re-bills; asserted instead: verified restore, then 0-drift re-bill. |
| AC-6 no overclaim | oracle source + A9/A12 | PASS | "box left clean" only after the re-check; re-check bug (missing `force_root`) fixed; unverified restores now keep the stage tables (`STAGE-KEEP`). |
| AC-7 report/manifest | R5 §16, manifest | PASS | §16 includes the P5 first-pass defect, the `database.xml` finding, the hollow fixture and the live-ledger drift. |
| AC-8 records | QMS P6-001, traces `r5-p6-acceptance` + `r5-khanza-r5-asset-gather`, 2 failure records | PASS | Traces via `pm1-trace` (morse); `retrace` over `khanza-r5/` reports trace-clean. |

**P6 = PASS** (AC-1..AC-5 executable proof green; AC-6..AC-8 logged). Cleanup done
2026-10-16 05:25 UTC: stray live ledger row removed (356,355 / Rp 34,870,243,633), `sik_p6` +
`sik_p6f` dropped, `sik_p6f` grant revoked, live gates re-verified. Open: `--window ALL`
Stage-A scoping not tested.

Scoring: P6 = PASS iff AC-1..AC-5 PASS (the executable proof Astra asked for) and the rest
PASS with logged evidence.

## 5. Execution order
1. Patch oracle + dbutil + builder locally -> syntax check.
2. Build `sik_p6` fixture on VPS; scp patched tools.
3. Run the 10-check acceptance suite; capture machine-asserted evidence.
4. Pre/post hash verification; drop `sik_p6`; restore `database.ini` -> `sik`; re-verify live gates.
5. §16 + manifest + rubric + QMS + trace + failure record.

Estimated: ~40 min patching, ~40 min fixture + suite, ~20 min records.
