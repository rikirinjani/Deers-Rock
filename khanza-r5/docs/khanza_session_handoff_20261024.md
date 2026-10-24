# Session Handoff — DR→Khanza E2E Benchmark (2026-10-24)

**Read this first.** It replaces `khanza_session_handoff_20261017.md` (kept as history: its body and
twelve UPDATE blocks describe 2026-10-17 and contradict each other). Everything lives in
`C:\Users\think\Project_v2\Deers-Rock\khanza-r5\` (branch `khanza-r5-p6`, **public** GitHub repo).
Assessment of the old handoff and of P11: `khanza_handoff_assessment_20261024.md`.

**No IP address, hostname or credential goes into any tracked file.** Connection details live only
in the gitignored `khanza-r5/.vps-mac-mini.env` (`VPS_HOST`, `VPS_TAILNET_HOST`, key, options) and
in `~/.ssh/config`. Use `ssh mac-mini-vultr` or `. khanza-r5/.vps-mac-mini.env`.

## 1. Current state (one screen)

| Item | State |
|---|---|
| External score | Astra **v10 = 63/100** "Needs targeted rework" (7/6.5/7.5/6/7/4; run 4918967). History 35 → … → 52 (v6) → 58 → 60 → 62 → 63. |
| Latest wave | **P11 accepted, 26/28** (opencode against frozen bytes; reviewed read-only 2026-10-24: R3 = 1 and R12 = 1 until retrace, now clean). Then the **run lock** (R5 §23) and **P12 step 1** (R5 §24): the whole evidence chain re-run on the final bytes (suite 39/39, preservation PASS, unit 33/33, builder identical, NC 5/5, lock NC 9/9), per-encounter reconciliation, reproducibility sources published. |
| Live box | **mac-mini-vultr** (`ssh mac-mini-vultr`) is the **only** home; the old box is treated as decommissioned (owner, 2026-10-24; it terminates ~2026-10-25 and was never updated with the lock). `khanza-r5/.vps.env` was **flipped to mac-mini-vultr on 2026-10-24** (tailnet host, `-i` key; the public IPv6 is not reachable from the workstation). The old values are in `~/.vps-old-box.env.bak`, outside the repo. |
| Second deadline | mac-mini-vultr itself ends **~2026-11-20** (Vultr credit expiry ~11-22). A third home or a paid plan is needed before then; rebuild-from-repo on it is the rehearsal (§4). |
| sshd hardening | **DONE** on mac-mini-vultr — verified read-only 2026-10-24: `sshd -T` → `passwordauthentication no`, `kbdinteractiveauthentication no`, `permitrootlogin without-password`, `pubkeyauthentication yes`. The 10-17 "owner-deferred" item is stale. |
| Live data | Only `sik` (1179 tables) and `sik_bench` (23). Ledger 356,355 rows / Rp 34,870,243,633, content `a66a3a54…`. Both `database.xml` copies → `sik`. Nothing running; **no `LOCK` file held**. |
| Frozen tools | **15 files**, manifest `evidence/p12/r5_frozen_manifest_20261024c.sha256` (box copy `p11_frozen_20261024c.sha256`; `chattr +i`, `sha256sum -c` OK on the box and the workstation): the 7 P11 tools, `dr_runlock.sh`, `runlock_negctl.sh`, `p12_perencounter_reconcile.py`, `p12_reconcile_negctl.sh`, `p12_rerun_chain.sh`, `stagea_common.py`, `dbutil.py`, `three_count_reconcile_p2.py`. |
| Assessment quota | Owner, 2026-10-24: **~$1.07 left**, reset date unknown, **assume next month**. A merged assessment costs ~$2.85 (max ~$3.5): not affordable now; no Kaggle task until the owner says so. |
| Records | Retrace trace-clean after this wave (see §6); everything committed locally, **not pushed** (ask the owner first). |

### Open items
| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Flip `.vps.env` to mac-mini-vultr | done 2026-10-24 | **done** |
| 2 | Old-box decommission | owner | treated as done; terminates ~10-25 |
| 3 | Third home before ~11-20, and durable off-box storage of the export archives (`docs/khanza_r5_reproduce.md` §2) | owner | undecided (owner is considering it) |
| 4 | MemPalace outbox delivery (`self-harness/outbox/mempalace-queue-20261020T0133Z.md`) | next session | PENDING |
| 5 | Re-run the suite and NC 5/5 on the re-pinned bytes under a held lock | next session | **done** 2026-10-24 (R5 §24); one of its steps failed and was fixed, see §24 |
| 6 | Ledger backup table `sik_bench.dr_charge_ledger_bak_20261017` retention | owner | undecided |
| 7 | "Published artifact" in R5 §12 item 7 | owner | undefined, ask |
| 8 | Untracked `kaggle/deers-rock-assessment/` task files and downloads | owner | uncommitted, leave |
| 9 | Push of the local commits | owner | ask first |
| 10 | Lock is advisory and covers two tools; `p6_acceptance_suite.sh` run directly is not guarded | next session | known limit |
| 11 | `2026/10/23/000408` (DR000174): payment 62,873.2 vs charges 204,506, the one B≠C encounter (R5 §24) | next session | cause unknown; read-only follow-up |
| 12 | Clean-box rebuild from the repo + export (the third-home rehearsal) | next session | not done; needs a box |

## 2. Standing rules (updated to today)

- **Run lock (new).** Every run of `p6_run_suite_fresh.sh` / `p11_negative_controls.sh` (and so the
  preservation check) needs the lock. On the box:
  `bash /opt/Deers-Rock/tools/dr_runlock.sh acquire <your-session-id> "<note>"`, run with
  `DR_LOCK_SESSION=<your-session-id>` exported, then `dr_runlock.sh release <your-session-id>`.
  Without it, or as another session, the tools exit **3** and touch nothing. The whole evidence chain is `bash p12_rerun_chain.sh <session-id>` (acquires and releases the lock itself, ~25 min on this box). `status` shows the
  holder. A stale lock is broken only with `release --force` after reading `status` (the pid is
  informational: a one-shot ssh acquire shows a dead pid). Never run while another session holds
  it; this is what failed on 2026-10-19/20. Negative control: `bash runlock_negctl.sh`
  (9 checks, ~6 min, fixture only).
- **Suite.** `p6_run_suite_fresh.sh` = fixture `sik_p6f` (full clone) + **39 checks**: **~45 min on the old box, ~8 min on mac-mini-vultr** (it used to be 21 checks). On failure it **keeps the fixture** (`KEEP_ON_FAIL=1`), exits
  with the suite's code, and a kept fixture blocks the next run until
  `bash p6_run_suite_fresh.sh --teardown-kept`. `P11_ONLY=<ids>` runs selected checks only.
- **Frozen tools.** The 15 files in the manifest above are `chattr +i`; decide the COMPLETE set of changes before starting an evidence chain (a chain on bytes about to change was aborted once, R5 §24). Before editing any of them,
  on **each box**: `cd /opt/Deers-Rock/tools && chattr -i <files>`; keep the originals in a `.bak_*`
  dir; deploy; then `sha256sum <all 15> > p11_frozen_<date>.sha256`, `chattr +i <files>`,
  `sha256sum -c`, `lsattr`; copy the manifest into `evidence/…`; re-pin `khanza_r5_release_manifest.md`.
  Evidence is valid only for the bytes it names: a re-pin invalidates earlier runs for those tools.
- **LF deploy.** Windows working copies may be CRLF. Deploy LF copies (`tr -d '\r'`), then compare
  `sha256sum` of local and box; git blobs must be `i/lf`.
- **Heredoc-backslash trap.** Writing remote scripts through `ssh '…'` or an unquoted heredoc eats
  or doubles backslashes (and expands `$`). Write the script to a file, `scp` it, run with `bash`;
  use `<<'EOF'` quoted heredocs.
- **latin1/utf8mb4 join trap.** Khanza tables mix latin1 and utf8mb4 collations; a join on a text
  key across them errors or silently mismatches. Cast/`CONVERT(… USING utf8mb4)` the key, or
  `COLLATE` it explicitly, and check the row count against a one-sided count.
- **Live databases.** `sik` and `sik_bench` are **read-only**; destructive or live actions need the
  owner's explicit approval. The oracle refuses `--db-name sik` without `--allow-live`.
- **No secrets** (DB passwords, VPS addresses, Khanza AES key/IV) in any committed file; scan every
  diff (`git diff origin/khanza-r5-p6` for IPv4/IPv6) before a push. No subagents. No push without
  the owner. Do not run a Kaggle task without the owner's OK.
- **Verify before repeating.** Re-check any claim against the source before relying on it.
- **Records per wave:** R5 section, manifest re-pin, task doc, QMS record
  (`C:\Users\think\Agentic Layer\qms\records\verifications\`), failure record per defect
  (`C:\Users\think\self-harness\failures\`), pm1 trace (`pm1-trace trace … --encoding morse`),
  copies under `records/`, then `python C:/Users/think/self-harness/tools/retrace.py
  --project-root C:/Users/think/Project_v2/Deers-Rock/khanza-r5 --traces-dir
  C:/Users/think/self-harness/traces` must report trace-clean.
- **One working tree per agent session** (a git worktree per session) and the run lock on the box.
- Long jobs: launch detached `(setsid nohup bash job.sh > /tmp/job.log 2>&1 < /dev/null &)` as its
  own ssh call, then poll.
- Commit messages end with the attribution line the session gives.

## 3. Key facts (carried from 10-17; do not rediscover)
The harness/consumer read `setting/database.xml` (AES), not `database.ini`: retarget only with
`tools/p6_dbxml.py retarget|restore`; a scratch DB needs a temporary grant to `benchmark@localhost`.
Khanza's own `DlgBilingRalan` writes `billing` (R5 §18). Tax is the integer rule `(s*11+50)//100`.
A billing run needs a prior `--freeze-only` on the same RUN_ID/stage; clean visits are the DR cohort
(`2026/10/01/800085`, `800128`). Migration facts (classpath, the all-five-properties AES fact,
`PatchDbXml`): `docs/asset_export_20261023.md`. Never name a tracked folder `tmp…` (gitignored).

## 4. Next wave (P12, remaining) — from the v10 top-3
Done in P12 step 1 (R5 §24): evidence re-taken on the final bytes; per-encounter reconciliation (A==C on all
86,455 encounters; B==C on 1,067 of 1,068 form-saved ones; all 999 of the R4 sample); R4 0/999 re-read;
sources published (`src/`, `docs/khanza_r5_reproduce.md`), STRATA dump pinned by sha256.
Still open:
1. **Clean-box rebuild rehearsal** (reproducibility closure's missing half): needs the third home. Do it before ~11-20
   from the repo plus the export; the export archives must first be copied somewhere durable.
2. **Widen B**: only 1,068 of 86,455 encounters (1.2 %) have a form-saved payment. A larger independent
   form-vs-ledger sample needs real-form runs (fixture only, under the lock), not more SQL.
3. Explain `2026/10/23/000408` (item 11) and the older 4/216 drift sample.
4. **Next assessment (v11):** only after the quota resets (assumed next month); merged method, content capped at
   v10's 316k chars, embed this handoff and R5 §24, not the stacked one.
Delegation: opencode can do grunt work, but only against frozen bytes and a held lock, with a rubric, followed by
a read-only review here.

## 5. Map of the folder
`docs/` R5 report (§0–§23), task docs P5–P11, manifest, handoffs, assessment · `tools/` deployed tools
(= `/opt/Deers-Rock/tools/`) · `tools/kaggle/` Astra builders · `evidence/` Astra outputs, `p6/`–`p11/`,
`runlock/`, `p12/` · `src/` published consumer/harness sources + `verify_published.sh` · `records/` copies of QMS/failure/trace records · `recovered/` VPS copies of the lost set.

## 6. This session's work (2026-10-24)
Commit `780447c` (pushed): run lock, handoff, sshd check, P11 wording, retrace. Then P12 step 1 (local,
not pushed): `.vps.env` flipped; chain re-run on the final bytes; `p12_perencounter_reconcile.py` and its
negative control; sources published and `src/verify_published.sh`; STRATA pin; R5 §24; two failure records;
QMS `VER-2026-10-24-DR-KHANZA-R5-P12-001`; trace `r5-p12-rerun-reconcile-repro`.
