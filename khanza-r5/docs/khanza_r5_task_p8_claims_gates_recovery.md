# R5-P8 Task: Claim wording, gate defects, recovery fault injection

Written 2026-10-18 BEFORE execution, per task-before-hands. Scope agreed with the owner
2026-10-18: packs **A (claim wording) + B (gate defects) + C (recovery fault injection)**;
one Astra v8 assessment after all of P8, merged method (~$2.5 of the ~$5.4 left this month).
Not in P8: D (reproducibility closure), E (matched-encounter reconciliation, R4 0/999).

Sources: Astra v7 (`evidence/astra_v7_merged_4894730_output.md` + step 1
`astra_v7_step1_4880158_output.md`; **58/100** "Needs targeted rework"; method and caveats in
`evidence/astra_v7_merged_4894730_NOTE.md`) and the P8 list in
`docs/khanza_session_handoff_20261017.md` §3.

Astra v7's single most important next step: "Replace the blanket PASS with a fail-closed
recovery acceptance test through the actual production wrapper on an immutable disposable
clone. Inject corrupt recovery metadata, a surviving child writer, and interruption during
restoration; require verified writer termination, state/protected-cohort checks, correct
nonzero failure propagation, and preserved evidence before declaring success."

## 0. Defects to close (each verified against source on 2026-10-18)

| ID | Defect | Where (verified) | Consequence |
|---|---|---|---|
| D1 | **A11 label contradicts A15.** A11 says "every restore across the suite hash-verified", while A15 deliberately produces an unverified restore (`STAGE-RESTORE-UNVERIFIED`). | `tools/p6_acceptance_suite.sh` l.329 (A11), l.251 (A15) | A PASS label that is false by design. |
| D2 | **Oracle prints `crash_safe=YES` unconditionally** in every result file. | `tools/sampled_real_form_diff_r5.py` ~l.1115 | A blanket guarantee the deferred items (interrupted restore, surviving descendant) contradict. |
| D3 | **Stale report wording:** §16-area "B-settlement equivalence is structurally unclaimable" (withdrawn in §18); builder docstring "integer rupiah end-to-end … no float" while `irup()` still converts via `float()` for tariff/fallback/price sums; three_count `int(round(float(paid)))`. | R5 report l.595; `build_dr_charge_ledger_p2.py` l.22-23, 53-56; `three_count_reconcile_p2.py` l.133 | Overclaims an assessor can quote. |
| D4 | **A10b cannot detect a duplicate tax row.** Label: "exactly one tax row"; the query only flags a tax row whose amount differs, so two tax rows with the correct amount pass. Expected-zero-tax visits with a stray tax row are only caught if they have no drug rows. | `tools/p6_acceptance_suite.sh` l.292-295 | Cardinality claim not enforced. |
| D5 | **`p7_tax_rule_check.py` never fails.** It prints DIFF/MISSING/STORED counts and exits 0 regardless. | `tools/p7_tax_rule_check.py` (end) | Cited as a check but cannot fail. |
| D6 | **Builder delete scope ≠ insert scope.** `--window ALL` deletes `WHERE 1=1`; `2026-10` deletes every `2026/10/%` row; inserts are cohort-scoped (`--cohort dr` default). Dormant today: all 356,355 live ledger rows are DR-cohort (read-only check 2026-10-18). | `tools/build_dr_charge_ledger_p2.py` l.178-180 | A non-DR row in the ledger would be silently destroyed by a DR rebuild. |
| D7 | **Suite deletes prior evidence** (`rm -rf /opt/dr-benchmark/results/r6_*` at start). | `tools/p6_acceptance_suite.sh` l.100 | A failing run's artifacts vanish on the next run. |
| D8 | **Suite accepts `FX=sik`.** `FX=${FX:-sik_p6f}` is overridable; the oracle's live guard checks only the DB name, and `--freeze-only` is exempt. | `tools/p6_acceptance_suite.sh` l.14; oracle `main()` ~l.701 | The suite's direct SQL could mutate live `sik`. |
| D9 | **Resume never retries FAILED batches** (`if b["status"] in ("BILLED", "FAILED")`: skip). | `tools/sampled_real_form_diff_r5.py` l.859 | Recovery stops at the first failure; deferred P7 item. |
| D10 | **Recovery paths untested under fault:** corrupt (not just missing) hash metadata; a surviving harness/JVM child writing after the parent is killed; interruption *during* restoration. | oracle restore/resume code | The only remaining source of the `crash_safe` claim is untested. |

## 1. In scope

| ID | Requirement |
|---|---|
| P8-A1 | A11 relabelled and recomputed: "every restore hash-verified **except A15's deliberate unverified restore**"; A15's run is excluded by RUN_ID, and its `STAGE-RESTORE-UNVERIFIED` is counted separately and must equal 1. |
| P8-A2 | Replace `crash_safe=YES` with properties the run actually measured, e.g. `restores_verified=N/M`, `failed_batches=K`, `stage_drop_verified=YES/NO`. No blanket field. Suite summary prints each property's status instead of only "PASS=n". |
| P8-A3 | Report: old §16 line struck through with a pointer to §18; builder/three_count docstrings say exactly where float is still used (or the float uses are removed, see P8-B5); a note that VPS and evidence timestamps are UTC (doc dates are local UTC+7). Strike-through, never delete. |
| P8-B1 | A10b: per window visit, `COUNT(tax rows)` = 1 if expected tax > 0, else 0; amount equals the integer rule; orphan rule kept. A planted duplicate correct-amount tax row must make A10b FAIL (new check A10c, negative test). |
| P8-B2 | `p7_tax_rule_check.py` exits 1 on any DIFF/MISSING/STORED > 0; a fixture with one planted wrong stored tax proves the non-zero exit. |
| P8-B3 | Builder DELETE uses the same window **and cohort** predicate as the inserts. Negative test on a scratch ledger: plant one non-DR row, run a DR rebuild, assert the row survives. |
| P8-B4 | Suite moves an existing `results/r6_*` into `results/archive/<UTC ts>/` instead of deleting it; refuses `FX` = `sik` or `sik_bench` (exit 3, `LIVE-FIXTURE-REFUSED`), new check A17 asserts the refusal. |
| P8-B5 | Decide per float site (`irup`, `paid`): replace with `Decimal`/integer parsing, or keep and state it. Any change must reproduce the live ledger content hash `a66a3a54…` on a scratch `--window ALL` build. |
| P8-C1 | **Corrupt metadata:** hash file present but altered/truncated → `STAGE-RESTORE-UNVERIFIED` (not a crash, not ok=True), FAILED, `restored=False`, stage kept, exit ≥ 4. Check A18. |
| P8-C2 | **Surviving writer:** kill the oracle parent during billing while the harness JVM child keeps running; on resume the oracle must prove no writer remains (process check + no new `billing` rows for the batch over a quiet interval) **before** restoring, or refuse (exit ≥ 4, `WRITER-ALIVE`). Check A19. |
| P8-C3 | **Interrupted restore:** kill during restoration; resume detects the partial restore (hash mismatch), re-restores from the kept stage tables and hash-verifies, or fails closed. Check A20. |
| P8-C4 | **Retry FAILED (D9):** `--retry-failed` re-runs a FAILED batch only after its restore is hash-verified; without the flag, behaviour is unchanged. Check A21. |
| P8-C5 | All C checks run through `p6_run_suite_fresh.sh` (the production wrapper) on the disposable `sik_p6f` clone, with live `sik` output-table checksums equal pre/post (A13). |
| P8-R | Records: suite (≥ 25 checks) on a fresh fixture, exit 0 only if all pass; forced-failure A14 still non-zero; R5 §19; manifest re-pin (tool SHAs local = VPS); rubric §4; QMS VER-…-P8-001; failure records for D1/D4/D5 class (a check that could not fail or was mislabelled); pm1 trace; retrace clean. Then build v8 with `--merged` (no step split) and run once on gpt-6-astra (owner confirms spend first). |

## 2. Acceptance criteria
- **AC-1 wording:** no blanket PASS/`crash_safe` output remains; A11/A15 consistent; stale lines struck through.
- **AC-2 tax gates:** A10c and the tax-check fixture both fail on planted defects, pass on clean data.
- **AC-3 scope:** a non-DR scratch row survives a DR rebuild; scratch `--window ALL` rebuild reproduces `a66a3a54…`.
- **AC-4 suite hygiene:** previous results archived, not deleted; `FX=sik` refused (A17).
- **AC-5 recovery:** A18–A21 pass through the real wrapper; each injected fault yields its fail-closed outcome or a hash-verified recovery; live `sik` untouched.
- **AC-6 records + v8:** §19, manifest, rubric, QMS, trace, failure records; v8 run with cost read from run.json.

## 3. Guardrails
- Live `sik`/`sik_bench`: read-only. All mutation on `sik_p6f` (or a scratch ledger table inside it); any DROP or live edit needs explicit owner approval.
- No secrets (VPS address, DB passwords, Khanza AES key/IV) in commits.
- No subagents. Verify every Astra claim against source before acting on or repeating it.
- Budget: ~$5.4 for the rest of the month. v8 ~$2.5 merged; a synthesis-only re-run ~$0.5.

## 4. Rubric cross-check (fill at close)
| AC | Evidence | PASS/FAIL | Notes |
|---|---|---|---|
