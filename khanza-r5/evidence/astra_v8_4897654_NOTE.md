# Astra v8 — result and method (read with `astra_v8_4897654_output.md`)

**v8 overall: 60/100 "Needs targeted rework"** (history 35 → 43 → 43 → 52 → 58 → 60).

| Criterion | v8 | v7 |
|---|---:|---:|
| claim-honesty | 6 | 6 |
| gate-correctness | 6 | 6 |
| oracle-validity | **7** | 6 |
| reproducibility | 6 | 6 |
| e2e-design | 7 | 7 |
| external-validity | 4 | 4 |

round((6+6+7+6+7+4) × 10/6) = 60.

**Method:** Kaggle task version 10, merged (one gpt-6-astra call with BASE + CONTENT answering
all six section asks, then the synthesis), built by `tools/kaggle/build_astra_task_r8.py`.
CONTENT sha256 `130fafbe40afc259…` (288,027 chars). Run 4897654: **$2.782** (177,718 input /
20,102 output tokens), 9/9 assertions. Gemini validation run 4897634: $0.295. The synthesis
saw all six sections, including claim-honesty.

**Budget ($8 for the month):** gpt-6-astra spent $2.389 (v7 merged) + $2.782 (v8) = $5.171;
gemini validation $0.257 + $0.295 = $0.552. Left: $2.83 if only gpt-6-astra counts, $2.28 if
gemini counts too.

## v8 findings checked against the source (2026-10-18)
Each one below holds in the code:
1. `p8_builder_all_check.sh` prints `DIFFERS` but always exits 0, and two failed hash reads would
   compare equal.
2. The suite's `restore_kept()` (A18 cleanup) drops the stage tables even when
   `restore_verified` is False, destroying the recovery copy.
3. `--retry-failed` trusts the stored `restored=True` flag (`sampled_real_form_diff_r5.py`
   `if b.get("restored") is not True`) instead of re-verifying the current state.
4. A11 does not count `STAGE-RESTORE-ERROR`.
5. `_bill_date` logs "pre-reset state restored" even when the restore was not verified.
6. `verify_frozen()` never checks `source_content_hash`, although the P6-2g docstring says it
   does (an older overclaim).
7. The stage hash file is one per run and stage (`stage_content_hash_<pfx>.json`), so a later
   batch's backup overwrites an earlier batch's hash.

v8's single next step: one pinned-fixture, production-wrapper recovery acceptance run that
invalidates a previously verified state before retry. That means fencing writers, a current
batch-specific digest, protected-hash checks, a real suite failure through the normal exit
path, and a nonzero wrapper exit with the failed fixture and recovery artifacts retained.
