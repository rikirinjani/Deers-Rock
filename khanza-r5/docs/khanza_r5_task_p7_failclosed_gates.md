# R5-P7 Task: Fail-closed gates, write provenance, integer tax, live-state guards

Written 2026-10-17 BEFORE execution, per task-before-hands. Source: Astra v6 re-assessment
(gpt-6-astra, run 4818826, **52/100** "Needs targeted rework", +9 vs v5) and the Kaggle
validation model (gemini-3.8-flash, run 4818700). Evidence:
`evidence/astra_v6_4818826_output.md`, `evidence/astra_v6_validation_gemini_4818700_output.md`.

Astra v6's single most important next step: "Repair and rerun a small, fail-closed recovery
acceptance gate on an enforced disposable target … exit nonzero on any failed assertion;
publish its machine-checkable results with claims limited to what actually passed."

## 0. Defects to close (each verified against source on 2026-10-17)

| ID | Defect | Where (verified) | Consequence |
|---|---|---|---|
| D1 | **Suite exits 0 even when checks FAIL.** The script ends with `echo "=== P6 SUITE DONE: PASS=$PASS FAIL=$FAIL ==="` and has no `exit` on `$FAIL`; `p6_run_suite_fresh.sh` then reports `suite exit=0` regardless. | `tools/p6_acceptance_suite.sh` (last lines); `tools/p6_run_suite_fresh.sh` | "suite exit=0" proves nothing; the 18/18 claim rests only on the printed counts. |
| D2 | **Restore is fail-open when the pre-reset hash is missing.** `stage_restore` logs "pre-reset hash file absent; restore applied, NOT hash-verified" and still returns `ok=True`. | `tools/sampled_real_form_diff_r5.py` ~l.447-450 | An unverified restore counts as verified; the batch is re-billed over it and the stage tables are dropped. |
| D3 | **`--verify-form-save` is parsed but never used**, and **three_count's exit contract contradicts itself**: the comment and docstring say exit 0 for PARTIAL (A==C, B absent), but `return 0 if (gate_pass and not partial or gate_pass and b_verified) else 1` returns 1 when B is absent. | `tools/three_count_reconcile_p2.py` l.172/177 (flag), l.279-281 (exit) | A documented control does nothing; the gate's exit code cannot be trusted for the no-B case. |
| D4 | **Form-writes-billing contradiction.** R5 §0 (table, source B), §1 and §13 state the headless form save writes `nota_jalan`/`detail_nota_jalan`/`piutang_pasien`, *not* `billing`. But the oracle resets `billing` (`RESET_TABLES`), A1 passes by comparing the `billing` rows present after the form run with the frozen baseline, and the §17 strata re-check shows `billing` rows written after the form ran. Which code path writes `billing` (Khanza's `DlgBilingRalan` save, or `BilingHarness`) is not established. | `docs/khanza_benchmark_report_R5.md` l.31, 61, 349-350; `RESET_TABLES` in the oracle; `evidence/p4_strata_recheck/` | Either the B-subset limitation (the paper's main structural caveat) is wrong, or the oracle compares something other than the form's own output. Both change claims. |
| D5 | **Tax is not integer end-to-end, and its check is tolerant and missing-row-blind.** The builder computes `irup(float(s or 0) * 0.11)`; suite A10b accepts `ABS(tax - drug*0.11) > 1` as a pass margin and only inspects visits that already have a tax row (a visit with drugs but no tax row is never flagged). | `tools/build_dr_charge_ledger_p2.py` l.278; `tools/p6_acceptance_suite.sh` A10b | The "integer rupiah, tolerance Rp 0" claim does not hold for tax; a missing tax row escapes the check. |
| D6 | **Live-state guards are partial and there is no disposable-target enforcement.** A13 checks only the `sik_bench` ledger hash and the two `database.xml` targets. Nothing proves live `sik` output tables (`billing`, `nota_jalan`, `detail_nota_jalan`, `piutang_pasien`, `reg_periksa.status_bayar`) are untouched, and the oracle accepts `--db-name sik` for a destructive reset run without an explicit opt-in. | `tools/p6_acceptance_suite.sh` A13; oracle `main()` | A misconfigured run can reset live billing state; the suite would not notice. |
| D7 | **Pinned ledger row inconsistent** (`2026/10/01/000298` drug `B000000240`: quantity 23 vs 25 in source and billing; amount correct) and 260,800 `source=NULL` rows. Both assessors cite it. | R5 §17 item 2 | Decision in §5 below. |

**Out of scope for P7** (Astra v6 items deferred to P8, listed so they are not forgotten):
interruption *during* restoration; hard-crash resume with a surviving JVM descendant; true
concurrent-overlap isolation; FAILED/unrestored batches being retryable; matched B–C
reconciliation beyond the D4 provenance finding; individual re-validation of pre-P6
clone-mode runs; C1-C4 external validity.

## 1. In scope

| ID | Requirement |
|---|---|
| P7-1 | **Suite fails closed.** `p6_acceptance_suite.sh` ends with `exit $([ "$FAIL" = 0 ] && echo 0 || echo 1)`; an aborted precondition exits 3. `p6_run_suite_fresh.sh` propagates it. New check A14 runs the suite against a deliberately broken assertion (env `P7_FORCE_FAIL=1` makes one check fail) and asserts the wrapper's exit code is non-zero. |
| P7-2 | **Restore fails closed.** A missing or unreadable pre-reset hash file → `stage_restore` returns False with `STAGE-RESTORE-UNVERIFIED`; the batch is FAILED, `restored=False`, stage tables kept (`STAGE-KEEP`), exit ≥ 4. New check A15 deletes the hash file mid-run (after reset, before restore) and asserts all four outcomes. |
| P7-3 | **three_count contract repaired.** Exit code matches the documented contract: 0 for PASS or PARTIAL (A==C, B absent), 1 for FAIL (A≠C, or B verified and B≠C beyond the documented subset rule). `--verify-form-save` either does what its help text says (require B verified; PARTIAL becomes exit 1) or is removed. Unit check: three fixtures (A==C no B; A==C with B; A≠C) → exit 0/0-or-1 per rule/1. |
| P7-4 | **Write provenance established (D4).** On a disposable clone, enable a row-level audit (temporary `AFTER INSERT` triggers on `billing`, `nota_jalan`, `detail_nota_jalan`, `piutang_pasien` writing `CONNECTION_ID()`, `USER()`, time and table into an audit table; or the MySQL general log for one run) while one visit is billed through the form. Record which connection (harness JVM vs consumer vs oracle) writes `billing`. Then restate R5 §0/§1/§13 to match: if the form writes `billing`, the B-subset caveat is withdrawn and replaced by what is actually true; if the harness writes it, say so and qualify every A1/A2-style claim. |
| P7-5 | **Integer tax.** Builder computes tax as integer half-up `(drug_subtotal * 11 + 50) // 100`. Note: today's `irup` deliberately mimics Java `Math.round` on a double, so the consumer may round the same floating value; read the consumer's tax code first. The ledger must reproduce the consumer's results, so if the two rules ever differ on real subtotals, list those visits and decide explicitly which one is ground truth. A10b becomes exact: for every window visit with drug rows, a tax row exists and equals the integer rule exactly; tolerance 0; visits with drugs and no tax row fail. A full `--window ALL` rebuild into scratch must keep every amount identical to the current ledger (proving the integer rule is what the ledger already holds) or the differences are listed. |
| P7-6 | **Live-state guards + disposable-target enforcement.** (a) Suite pre/post hashes of live `sik` output tables for a fixed sample of DR visits plus the full-table row counts and amount sums of `billing`, `nota_jalan`, `piutang_pasien`; A13 extended to require all equal. (b) The oracle refuses a destructive run against `sik` unless `--allow-live` is passed, exit 3 with `LIVE-TARGET-REFUSED`; check A16 asserts the refusal. |
| P7-7 | **Re-run and record.** Suite (now ≥ 21 checks) on a fresh `sik_p6f` via `p6_run_suite_fresh.sh`, exit 0 only if all pass. R5 §18, manifest re-pin, rubric §4, QMS VER-…-P7-001, pm1 trace, failure record for D1 (a suite that cannot fail was presented as evidence). Rebuild the Astra v7 task with the new evidence. |

## 2. Acceptance criteria
- **AC-1 fail-closed suite:** a forced failure makes `p6_run_suite_fresh.sh` exit non-zero (A14); a clean run exits 0 with every check PASS.
- **AC-2 fail-closed restore:** a missing hash yields `STAGE-RESTORE-UNVERIFIED`, FAILED, `restored=False`, stage tables kept, exit ≥ 4 (A15).
- **AC-3 three_count contract:** exit codes match the documented contract on all three fixtures; `--verify-form-save` works or is gone.
- **AC-4 provenance:** an audit transcript names the writer of `billing` during a form run; R5 statements updated to match, with the old wording struck through, not deleted.
- **AC-5 integer tax:** exact A10b (tolerance 0, missing tax rows detected); a full rebuild keeps amounts identical or lists every difference.
- **AC-6 live guards:** live-table hashes and sums equal pre/post; `--db-name sik` refused without `--allow-live` (A16).
- **AC-7 records:** §18, manifest, rubric, QMS, trace, failure record, v7 task built.

## 3. Deliverables
1. Patched `p6_acceptance_suite.sh`, `p6_run_suite_fresh.sh`, `sampled_real_form_diff_r5.py`, `three_count_reconcile_p2.py`, `build_dr_charge_ledger_p2.py` (local + VPS, hashes identical).
2. `tools/p7_write_provenance.sh` + its transcript in `evidence/p7/`.
3. Suite transcript `evidence/p7/r5_p6_acceptance_<ts>.md` from the fresh-fixture run.
4. R5 §18 + manifest + rubric + QMS + trace + failure record.
5. `tools/kaggle/build_astra_task_r7.py` → `task_r7_reassess.py`.

## 4. Rubric cross-check (fill at close)
| AC | Evidence | PASS/FAIL | Notes |
|---|---|---|---|
| AC-1 fail-closed suite | | | |
| AC-2 fail-closed restore | | | |
| AC-3 three_count contract | | | |
| AC-4 write provenance | | | |
| AC-5 integer tax | | | |
| AC-6 live guards | | | |
| AC-7 records | | | |

Scoring: P7 = PASS iff AC-1, AC-2, AC-4 and AC-6 PASS (the fail-closed and provenance
evidence Astra asked for) and the rest PASS with logged evidence.

## 5. Ledger-row decision (D7) — owner decision required

Deferred on 2026-10-16 "until after Astra v6". Astra v6 and the validation model both count
the uncorrected row against the benchmark ("core data defect uncorrected").

| Option | What happens | Pin after | Risk |
|---|---|---|---|
| **A. Rebuild the live ledger (recommended)** | Back up `sik_bench.dr_charge_ledger` to `dr_charge_ledger_bak_20261017` (and its content hash into the manifest), run the pinned builder `--window ALL` against live `sik_bench`, re-run all gates including `--line-diff`. | Rows and total unchanged (356,355 / Rp 34,870,243,633 — the scratch rebuild proved keys, amounts and unit prices identical); new content hash; quantity 25 on the one row; `source` filled on 260,800 rows; `LINE-DELTA = 0`. | Changes a pinned artifact; mitigated by the backup table, the old hash kept in the manifest, and the scratch rebuild already showing the exact diff. |
| B. Keep the pin, document only | Nothing changes; §17 stays the disclosure. | Unchanged. | Assessors keep scoring it as an uncorrected known defect; the line-diff gate stays red on the canonical ledger. |
| C. Patch the one quantity in place | `UPDATE` one row to 25; leave `source` labels. | New hash; `source` NULLs remain. | A hand-edited ground truth is worse evidence than a rebuild from source. |

**Recommendation: A**, executed as the first step of P7 (it is independent of the code
changes and makes P7-5's "amounts identical" check meaningful against a ledger the current
builder actually produced).

## 6. Execution order
1. Owner decision on §5; if A: backup, rebuild, gates incl. `--line-diff`, re-pin.
2. P7-4 provenance run on a disposable clone (it may change what P7-3/P7-5 must assert).
3. Patches P7-1, P7-2, P7-3, P7-5, P7-6 locally → syntax check → deploy, hashes compared.
4. Suite on a fresh fixture via `p6_run_suite_fresh.sh`; fix real failures, re-run.
5. Records (P7-7), Astra v7 task build.
