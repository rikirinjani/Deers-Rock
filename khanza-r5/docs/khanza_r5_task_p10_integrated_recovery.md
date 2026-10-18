# R5-P10 Task: Integrated recovery-preservation experiment and honesty fixes

Written 2026-10-18 BEFORE execution, per task-before-hands. Scope agreed with the owner
2026-10-18: **packs A (honesty fixes, closes failure record 20261018T0215Z) + B (recovery
integrity + one integrated experiment)**. Not in P10: C (reproducibility closure) and D
(matched-encounter B–C reconciliation, R4 0/999). Budget: the owner reports **$3.99** left.
One Astra v10 run after P10: merged method, CONTENT capped at v9's size (≤ 317k chars),
section output cap 20k tokens. Worst case about $3.5 plus about $0.3 for the gemini validation.
The owner confirms the spend first.

Sources: Astra v9 (`evidence/astra_v9_4898353_output.md`, **62/100**;
`evidence/astra_v9_4898353_NOTE.md`, findings 1–7 verified in source).

Astra v9's single next step: "Deliver one integrated, pinned-fixture recovery-preservation
experiment — not another increase in test counts. Exercise both immediate harness-failure
restoration and resume under effective writer exclusion; induce a real failure with populated
recovery artifacts; independently hash those artifacts and protected sample/non-sample rows;
force the normal terminal failure; and assert artifact retention, nonzero exit and
per-operation verification before explicit teardown."

## 0. Defects to close (verified against source on 2026-10-18)

| ID | Defect | Where | Consequence |
|---|---|---|---|
| F1 | `_finalize()` writes "FAILED batches (restored from stage backup)" for every FAILED batch. | `sampled_real_form_diff_r5.py` `_finalize` (~l.1447) | The result artifact claims a restore that may have been refused or unverified. |
| F2 | `source_content_hash()` omits `detail_pemberian_obat.biaya_obat`/`total`, which the form bills, and swallows query exceptions (`except Exception: pass`). | `source_content_hash` (l.196–) | A price change after freeze is missed; a failed query hashes as "no rows". |
| F3 | `stage_backup` DELETEs the batch's staged rows and then REPLACEs them, outside a transaction. A failed re-backup destroys the kept rows. A batch whose backup failed is excluded from `unrestored`, so its stage tables can be dropped. | `stage_backup` (l.407–); `_finalize` `unrestored` | Recovery material lost exactly when backup fails. |
| F4 | The quiet-interval check runs only for STAGED/RESET batches, not before a FAILED-batch retry restore. | `reap_writers` (l.820–) | A retry restore can race a late writer. |
| F5 | Fencing drains sessions once; nothing stops a new writer connecting during the restore. | `fence_sessions` (l.788–) | No writer exclusion. |
| F6 | `irup()` returns 0 for a malformed numeric. | `build_dr_charge_ledger_p2.py` l.55–64 | A corrupt tariff or price becomes Rp 0 silently. |
| F7 | Report and label overclaims (open failure record 20261018T0215Z): A22 changes 17 rows, not "a billing row"; "14 verified outside" counts all logs; F1. | suite A22 label; R5 §20 | Claim-honesty. |
| F8 | No single experiment preserves a real failure *with populated recovery artifacts*. The P9 terminal-path run had 0 stage tables and skipped the recovery checks. | `p9_terminal_path_check.sh` | v9's central open claim. |

## 1. In scope

| ID | Requirement |
|---|---|
| P10-A1 | A22 label and R5 §20 corrected (strike-through): "all 17 billing rows of the visit (+Rp 1 each)". A11 reports verification markers *outside* the excluded logs (`RV_OTH`) and requires `RV_OTH ≥ 1`; the res line names both counts. |
| P10-A2 | `_finalize` writes, per FAILED batch, its actual state: `restored (hash-verified)` / `NOT restored (stage tables kept)` / `backup failed (stage tables kept)`. |
| P10-B1 | `source_content_hash` includes `biaya_obat` and `total` (and `rawat_jl_dr` amount columns); a query error raises (verify_frozen → FAIL, never a hash of nothing). Freezes made before P10 fail verification by design (source hash format changed); the suite freezes fresh. |
| P10-B2 | **Non-destructive backup:** `stage_backup` writes a new batch's rows into the stage tables inside one transaction (`dbutil.session`: START TRANSACTION; DELETE batch rows; INSERT…SELECT; COMMIT). On any failure it rolls back, so the previously kept rows survive. A batch whose backup failed keeps its stage tables (removed from the `unrestored` exclusion). |
| P10-B3 | **Quiet interval before any restore,** including a FAILED-batch retry (`reap_writers` quiet check over STAGED/RESET *and* FAILED visits when a retry or abandon is requested). |
| P10-B4 | **Writer exclusion during restore (fixture only):** before restoring, `REVOKE INSERT, UPDATE, DELETE ON <fixture>.* FROM benchmark@localhost` (the harness account), fence, restore, verify, then re-grant (always, in `finally`). Refused on `sik`/`sik_bench`. Log `WRITER-EXCLUSION on/off`. A check proves that a benchmark-account write attempted during the restore window is rejected. |
| P10-B5 | `irup` raises on a malformed numeric. The builder logs and fails the build (`FAIL-CLOSED: malformed amount`). A missing tariff entry stays the documented `dr-source(gap)` fallback, stated as such (not "fail-closed authority"). |
| P10-B6 | **Integrated experiment** `p10_preservation_check.sh` (one run, the production wrapper): with `P10_INJECT=1` the suite runs a real harness failure (timeout) on the **two-batch** set so batch 1 is FAILED with **populated stage tables**. Before the suite's normal end it records independent hashes of (a) every stage table (`CHECKSUM TABLE … EXTENDED`), (b) the sample visits' output rows, (c) a protected non-sample visit set (10 non-DR and 10 DR visits outside the sample), and (d) the live `sik` checksums. A forced FAIL then goes through the normal terminal path. The wrapper must exit 1 and keep the fixture. The check then re-hashes (a)–(d) on the kept fixture (all equal), runs `--retry-failed` under writer exclusion (per-operation verification lines: FENCE, WRITER-EXCLUSION, STAGE-RESTORED-VERIFIED or current-state verified, BILLED), and finally runs the explicit `--teardown-kept`. |
| P10-C | New suite checks: **A26** malformed tariff value → builder FAIL-CLOSED (scratch); **A27** price change after freeze (`biaya_obat`) → SOURCE-CONTENT DRIFT; **A28** forced backup failure on a retry (stage-table DDL privilege or injected error) keeps the earlier stage rows (checksum equal); **A29** writer-exclusion: a benchmark-account INSERT during the restore window is rejected and access is restored afterwards. |
| P10-R | Records: suite on a fresh fixture (≥ 38 checks) exit 0; `p10_preservation_check.sh` PASS; R5 §21; manifest re-pin (local LF = VPS); rubric §4; QMS VER-…-P10-001; close failure record 20261018T0215Z; pm1 trace; retrace clean. Then build v10 (merged, CONTENT ≤ 317k chars, output cap 20k) and run once after the owner confirms the spend. |

## 2. Acceptance criteria
- **AC-1 honesty:** A22 label, §20, A11 counts and the `_finalize` line match what the code does; failure record closed.
- **AC-2 source + amounts:** A25 (quantity) and A27 (price) drift detected; A26 malformed amount fails the build.
- **AC-3 non-destructive backup:** A28 earlier stage rows survive a failed re-backup.
- **AC-4 writer exclusion:** A29; restore logs show exclusion on/off around every restore on the fixture; never on live.
- **AC-5 integrated preservation:** `p10_preservation_check.sh` PASS. Populated stage tables (> 0), all independent hashes equal before/after the failed terminal path, wrapper exit 1, fixture kept, retry under exclusion verified per operation, then explicit teardown leaving `sik`, `sik_bench`.
- **AC-6 records + v10.**

## 3. Guardrails
- Live `sik`/`sik_bench`: read-only; fencing and grant changes refused there in code. The
  benchmark account's grants on **live** `sik` are never touched (only `<fixture>.*`).
- Re-grant in `finally`, and verify grants after every run (`SHOW GRANTS`).
- No secrets in commits; no subagents; verify every Astra claim in source first.
- Deploy LF copies; compare LF hashes. Watch the latin1/utf8mb4 join trap.
- Keep v10's CONTENT ≤ 317k chars (drop unchanged sources or older sections if needed, and say
  so in the summary) so that the worst case stays under the $3.99 left.

## 4. Rubric cross-check (fill at close)
| AC | Evidence | PASS/FAIL | Notes |
|---|---|---|---|
