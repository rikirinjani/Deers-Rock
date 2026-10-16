# Session Handoff — DR→Khanza E2E Benchmark (2026-10-16, updated 2026-10-17)

## Update 2026-10-17 (read this first)
- **Astra v6 = 52/100** (run 4818826, +9). Output: `evidence/astra_v6_4818826_output.md`.
- **P7 done** (`docs/khanza_r5_task_p7_failclosed_gates.md`, R5 §18): suite 21/21 and now
  fails closed; restore fails closed on a missing hash; three_count exit contract fixed;
  exact integer tax; live `sik` guards + `--allow-live`.
- **Live ledger rebuilt** (owner-approved): backup `sik_bench.dr_charge_ledger_bak_20261017`;
  new content `a66a3a54…`, totals unchanged; line-diff PASS.
- **The form writes `billing`** (audited): R5's B-subset caveat is withdrawn (§18 item 2).
- **Next:** push `kaggle/deers-rock-assessment/task_r7_reassess.py` (Astra v7) with
  `PYTHONUTF8=1 kaggle b t push dr-khanza-e2e-full-assessment -f task_r7_reassess.py`, then
  `kaggle b t run dr-khanza-e2e-full-assessment -m gpt-6-astra`. P8 = the deferred items in
  the P7 doc's "Out of scope" list.


Supersedes `khanza_R5P5P6_session_handoff_20261015.md` (kept for history — several of its
statements turned out wrong; see "Corrections to the previous handoff").

## TL;DR
- Everything lives in `Project_v2/Deers-Rock/khanza-r5/` (branch `khanza-r5-p6`). The old
  `%TEMP%\opencode` working folder was wiped by a temp cleanup on 2026-10-16 — never use temp
  folders as storage again.
- P6 acceptance suite **18/18 PASS**, twice; the second run is on the current pinned tools
  via `tools/p6_run_suite_fresh.sh` (one command: fixture → suite → teardown).
- **Next action: push the Astra v6 task when the Kaggle quota resets.** The task file is
  built and parses: `kaggle/deers-rock-assessment/task_r6_reassess.py` (~225 KB; v5 was
  153 KB, so expect higher quota use). Rebuild it first if anything in `khanza-r5/` changed:
  `python khanza-r5/tools/kaggle/build_astra_task_r6.py`.

## State of the live box (verified 2026-10-16 ~06:00 UTC)
- Databases: `sik`, `sik_bench` only (all scratch DBs dropped; temporary grants revoked).
- Both `setting/database.xml` copies → `sik` (`python3 /opt/Deers-Rock/tools/p6_dbxml.py probe`).
- Ledger `sik_bench.dr_charge_ledger` = 356,355 rows / Rp 34,870,243,633 (pin).
- Gates: charge_delta PASS (Oct and ALL); three_count A==C (Oct 31,750 / Rp 3,113,533,580;
  ALL 356,355 / Rp 34,870,243,633); B-subset `P2-BC-TOTAL` FAIL as documented.
- Tools on the VPS = `khanza-r5/tools/` (hashes in the manifest, verified identical).

## Open decisions for the owner
1. **Live ledger rebuild?** One pinned row (2026/10/01/000298, drug B000000240) has quantity
   23 vs 25 in source and billing (amount correct). A `--window ALL` rebuild reproduces
   every key/amount/price and fixes it, and fills 260,800 NULL `source` labels — but changes
   the pinned ledger's content hash. Not done; R5 §17 item 2. **Owner decision
   (2026-10-16): keep the pin as-is for now; decide after the Astra v6 result.**
2. Push `khanza-r5-p6` to GitHub? (Not pushed.)

## Agent-runnable work left
- Astra v6 run (tomorrow) → save output to `khanza-r5/evidence/astra_v6_<run>_output.md`,
  then a P7 task from its findings.
- ZEROFEE / HALFPPN strata: need a consumer-billed baseline (run KhanzaBillingConsumer on the
  clone for the authored visits) — not done.
- Re-verify pre-P6 clone-mode form runs (P1 on `sik_r5`, P4 on `sik_p2`) or keep them
  labelled unproven (R5 §17 item 5).
- Query-provenance disclosure in the published artifact (R5 §12 item 7) — which artifact is
  "published" is not defined in the repo; ask the owner.
- Second-HMS smoke (E2, OpenMRS/OpenEMR FHIR): multi-day.

## Corrections to the previous handoff (2026-10-15)
- "Astra's unterminated ALL-predicate claim was a misread" — **false**; Astra was right (R5 §17).
- "Harness `database.ini` → sik_p6" — the harness reads `database.xml`; editing `database.ini`
  never moved the form off live `sik`.
- "`sik_p6` populated fixture" — 570 reference tables were empty; nothing could bill on it.
- "P6 not yet deployed" — an intermediate P6 build was already on the VPS; P5 manifest pins
  matched nothing deployed.
- Its suite planted a `STALE-TEST-KEY` row in the live ledger (removed).

## How to run things
- VPS access: `. khanza-r5/.vps.env` (gitignored; key `~/.ssh/id_ed25519_dr_vps`), then
  `ssh $VPS_OPTS -p $VPS_PORT root@$VPS_HOST …`. Long runs: launch fully detached so nothing
  holds the SSH session open — `(setsid nohup bash job.sh > /tmp/job.log 2>&1 < /dev/null &)` as
  its own ssh call, then poll the log in separate calls. A job chained with `&&` before `&`, or
  left attached to the session's output, keeps the connection open and later surfaces as a
  late "exit code 255" background notification (2026-10-16: about a dozen, all harmless).
- Any form run on a scratch DB: grant `benchmark@localhost` DML on it, then
  `p6_dbxml.py retarget <db>` … `p6_dbxml.py restore` (in an EXIT trap). Never `database.ini`.
- Every claim that dismisses an external finding gets re-checked against the artifact before
  it is repeated (failure record 20261016T0600Z).

## Commercialization (for later)
A brainstorm on commercial potential (assets, blockers, ranked directions, scorecard,
validation steps with stop criteria) lives in the doc "Deers-Rock × Khanza —
Commercialization Considerations": https://claude.ai/code/artifact/b07a4278-ece7-4fb9-a052-0e7924b6c57a
Revisit after the Astra v6 result or the first vendor interviews.

## Records
R5 §16–§17; manifest (§17 re-pin); QMS `VER-2026-10-16-DR-KHANZA-R5-P6-001` + `-P6-002`;
failure records `20261016T0520Z-*` (2) and `20261016T0600Z-*`; traces `r5-p6-acceptance`,
`r5-khanza-r5-asset-gather`, `r5-p6-post-corrections`. Copies under `khanza-r5/records/`.
