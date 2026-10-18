# Astra v9 — result and method (read with `astra_v9_4898353_output.md`)

**v9 overall: 62/100 "Needs targeted rework"** (history 35 → 43 → 43 → 52 → 58 → 60 → 62).

| Criterion | v9 | v8 |
|---|---:|---:|
| claim-honesty | **7** | 6 |
| gate-correctness | 6 | 6 |
| oracle-validity | 7 | 7 |
| reproducibility | 6 | 6 |
| e2e-design | 7 | 7 |
| external-validity | 4 | 4 |

round((7+6+7+6+7+4) × 10/6) = 62.

**Method:** Kaggle task version 11, merged (one gpt-6-astra call answering all six section asks,
then the synthesis), built by `tools/kaggle/build_astra_task_r9.py`. CONTENT sha256
`3fbc099ab38fb391…` (316,746 chars). Run 4898353: **$2.848** (197,126 input / 17,534 output
tokens), 9/9 assertions. Gemini validation run 4898337: $0.286.

**Budget:** the owner reported $5.6 left before v9. After v9: about $2.75 if only gpt-6-astra
counts, about $2.47 if the gemini validation counts too. That is less than one more merged run
(about $3).

## v9 findings checked against the source (2026-10-18)
Each one below holds in the code:
1. `_finalize()` writes "FAILED batches (restored from stage backup; P5-2)" for every FAILED
   batch, even when the restore was refused or unverified (`sampled_real_form_diff_r5.py`
   ~l.1447).
2. `source_content_hash()` hashes `jml, embalase, tuslah, databarang.ralan` and
   `rawat_jl_dr.biaya_rawat`. It omits `detail_pemberian_obat.biaya_obat` and `total`, which
   the form actually bills (the suite's A2 comment says so). Its query exceptions are
   swallowed.
3. A batch whose stage backup failed is excluded from `unrestored`
   (`not fail_reason.startswith("stage-backup")`), so its stage tables can be dropped. P9's
   per-batch DELETE-then-REPLACE in `stage_backup` runs outside a transaction, so a failed
   re-backup can destroy the kept rows.
4. The quiet-interval check runs only for STAGED/RESET batches, not before a FAILED-batch
   retry restore.
5. **My overclaims in P9:** A22's label and R5 §20 say "a billing row changed", but the
   mutation updates all 17 billing rows of the visit (+Rp 17 in total). R5 §20 says "outside the
   four deliberate fault checks: 14 verified", but `RV_ALL` counts verification markers across
   *all* logs, including the excluded ones. Failure record
   `records/failures/20261018T0215Z-evidence-integrity-r5-p9-report-overclaims.json`.
6. `irup()` returns 0 for a malformed numeric, and a tariff entry that is present but empty
   falls back to the source price, so "fail-closed tariff authority" is broader than the code.
7. Fencing drains the target's sessions at one point in time. It does not exclude new writers
   during the restore (no lock or grant revocation).

v9's single next step: one integrated, pinned-fixture recovery-preservation experiment. Cover
both immediate harness-failure restoration and resume under effective writer exclusion; a real
failure with populated recovery artifacts; independent hashes of those artifacts and of
protected sample and non-sample rows; the normal terminal failure; and asserted retention,
nonzero exit and per-operation verification before an explicit teardown.
