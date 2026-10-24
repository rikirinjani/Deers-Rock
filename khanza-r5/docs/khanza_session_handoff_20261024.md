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
| Latest wave | **P11 accepted, 26/28** (opencode against frozen bytes; reviewed read-only 2026-10-24: R3 = 1 and R12 = 1 until retrace, now clean). Then the **run lock** (R5 §23, 2026-10-24). |
| Live box | **mac-mini-vultr** (`ssh mac-mini-vultr`) is fully current and becomes the **only** home. The old box is **not** on Vultr and terminates **~2026-10-25**. `khanza-r5/.vps.env` still points at the old box: flip it to the `.vps-mac-mini.env` values on the owner's word, or just source `.vps-mac-mini.env` explicitly. |
| Second deadline | mac-mini-vultr itself ends **~2026-11-20** (Vultr credit expiry ~11-22). A third home or a paid plan is needed before then; rebuild-from-repo on it is the rehearsal (§4). |
| sshd hardening | **DONE** on mac-mini-vultr — verified read-only 2026-10-24: `sshd -T` → `passwordauthentication no`, `kbdinteractiveauthentication no`, `permitrootlogin without-password`, `pubkeyauthentication yes`. The 10-17 "owner-deferred" item is stale. |
| Live data | Only `sik` (1179 tables) and `sik_bench` (23). Ledger 356,355 rows / Rp 34,870,243,633, content `a66a3a54…`. Both `database.xml` copies → `sik`. Nothing running; **no `LOCK` file held**. |
| Frozen tools | Nine files, manifest `evidence/runlock/r5_frozen_manifest_20261024.sha256` (`chattr +i`, `sha256sum -c` OK on the box and the workstation). The old box still holds the pre-lock bytes (`p11_frozen_20261020T0739Z.sha256`); it is not updated and dies tomorrow. |
| Assessment quota | ~$0.69 left as of 2026-10-18 → **no assessment until the quota resets** (owner to confirm the reset date). |
| Records | Retrace trace-clean after this wave (see §6); everything committed locally, **not pushed** (ask the owner first). |

### Open items
| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Flip `.vps.env` to mac-mini-vultr | owner's word | pending, due before ~10-25 |
| 2 | Old-box decommission | owner | pending (~10-25) |
| 3 | Third home before ~11-20 | owner | undecided |
| 4 | MemPalace outbox delivery (`self-harness/outbox/mempalace-queue-20261020T0133Z.md`) | next session | PENDING |
| 5 | Repeat the 39-check suite and NC 5/5 on the re-pinned bytes under a held lock | next session | not done (R5 §23 states it) |
| 6 | Ledger backup table `sik_bench.dr_charge_ledger_bak_20261017` retention | owner | undecided |
| 7 | "Published artifact" in R5 §12 item 7 | owner | undefined, ask |
| 8 | Untracked `kaggle/deers-rock-assessment/` task files and downloads | owner | uncommitted, leave |
| 9 | Push of the local commits | owner | ask first |
| 10 | Lock is advisory and covers two tools; `p6_acceptance_suite.sh` run directly is not guarded | next session | known limit |

## 2. Standing rules (updated to today)

- **Run lock (new).** Every run of `p6_run_suite_fresh.sh` / `p11_negative_controls.sh` (and so the
  preservation check) needs the lock. On the box:
  `bash /opt/Deers-Rock/tools/dr_runlock.sh acquire <your-session-id> "<note>"`, run with
  `DR_LOCK_SESSION=<your-session-id>` exported, then `dr_runlock.sh release <your-session-id>`.
  Without it, or as another session, the tools exit **3** and touch nothing. `status` shows the
  holder. A stale lock is broken only with `release --force` after reading `status` (the pid is
  informational: a one-shot ssh acquire shows a dead pid). Never run while another session holds
  it; this is what failed on 2026-10-19/20. Negative control: `bash runlock_negctl.sh`
  (9 checks, ~6 min, fixture only).
- **Suite.** `p6_run_suite_fresh.sh` = fixture `sik_p6f` (full clone ~3 min) + **39 checks, ~45 min**
  (it used to be 21 checks / ~7 min). On failure it **keeps the fixture** (`KEEP_ON_FAIL=1`), exits
  with the suite's code, and a kept fixture blocks the next run until
  `bash p6_run_suite_fresh.sh --teardown-kept`. `P11_ONLY=<ids>` runs selected checks only.
- **Frozen tools.** The nine files in the manifest above are `chattr +i`. Before editing any of them,
  on **each box**: `cd /opt/Deers-Rock/tools && chattr -i <files>`; keep the originals in a `.bak_*`
  dir; deploy; then `sha256sum <all nine> > p11_frozen_<date>.sha256`, `chattr +i <files>`,
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

## 4. Next wave (P12) — from the v10 top-3 that P11 did not address
1. **Reproducibility closure** (v10 #2; the score has been 6 for five assessments). Publish
   `stagea_common.py` with secrets read from the environment, the Java harness/consumer sources and
   the STRATA SQL; pin the STRATA dump by hash instead of `ls … | head -1` (that line is still in
   `p6_run_suite_fresh.sh`). Doubles as the third-home rehearsal: rebuild on a clean box from the
   repo plus the export, before ~11-20. Include open item 5 (re-run suite + NC on the new bytes).
2. **Independent financial validation** (v10 #3): per-encounter B–C reconciliation on identical
   encounter sets, and re-examine the R4 0/999 sample (`r4_b2_1000`, live `sik`, pre-R5 oracle).
3. **Next assessment (v11):** only after the quota resets; merged method, content capped at v10's
   316k chars, embed this handoff, not the stacked one.
Delegation: opencode can do grunt work, but only against frozen bytes and a held lock, with a
rubric, followed by a read-only review here.

## 5. Map of the folder
`docs/` R5 report (§0–§23), task docs P5–P11, manifest, handoffs, assessment · `tools/` deployed tools
(= `/opt/Deers-Rock/tools/`) · `tools/kaggle/` Astra builders · `evidence/` Astra outputs, `p6/`–`p11/`,
`runlock/` · `records/` copies of QMS/failure/trace records · `recovered/` VPS copies of the lost set.

## 6. This session's work (2026-10-24)
Run lock (`dr_runlock.sh`, `runlock_negctl.sh`, guards in the wrapper and NC driver; R5 §23; evidence
`evidence/runlock/`); sshd check; P11 report wording corrected by strike-through; retrace gaps
closed by trace `r5-handoff-runlock-retrace-closure`. Quote of the proof: `PASS=9 FAIL=0`, live
state identical before/after.
