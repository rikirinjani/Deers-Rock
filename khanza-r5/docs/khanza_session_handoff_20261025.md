# Session Handoff — DR→Khanza E2E Benchmark (2026-10-25)

**Read this first.** It replaces `khanza_session_handoff_20261024.md` (kept as history).
Everything lives in `C:\Users\think\Project_v2\Deers-Rock\khanza-r5\` (branch `khanza-r5-p6`,
**public** GitHub repo). No IP address, hostname or credential goes into any tracked file —
connection details live only in the gitignored `khanza-r5/.vps-mac-mini.env` and `~/.ssh/config`.
Use `ssh mac-mini-vultr` or `. khanza-r5/.vps-mac-mini.env`.

## 1. Current state (one screen, 2026-10-25T12:39Z box check)

| Item | State |
|---|---|
| External score | Astra **v10 = 63/100** "Needs targeted rework" (7/6.5/7.5/6/7/4; run 4918967). Next assessment v11 only after quota resets (assumed next month). |
| Latest wave | **P13 done** (R5 §25): wide sample N=30/300/3000, form vs consumer vs ledger per encounter, **0/3330 differing**, B re-taken fresh (audit-trigger proof from `benchmark@localhost`). Report: `docs/khanza_r5_p13_opencode_report.md` (~~28/28~~ *21/28 on the orchestrator's re-score: Accept with fixes; the per-stage comparator counts were not saved, see the report*). |
| Live box | **mac-mini-vultr** is the only home; it ends **~2026-11-20** (Vultr credit expiry ~11-22). A third home is needed before then; rebuild-from-repo on it is the rehearsal (§4). |
| Live data | Only `sik` (1179 tables) and `sik_bench` (23). Ledger **356,355 rows / Rp 34,870,243,633**, content hash `a66a3a546cc322…`. Both `database.xml` copies → `sik`. 0 writer markers. ~~No benchmark grants on `sik`/`sik_bench`.~~ *(P15 D4: wrong, from a vacuous probe. The Khanza app account `benchmark@localhost` holds SELECT/INSERT/UPDATE/DELETE on `sik` and broad privileges on `sik_bench`. These are its standing grants, unchanged by the benchmark. There are no benchmark grants on clones after teardown.)* **No `LOCK` held.** 71 GB free on `/`. |
| Frozen tools | **21 files total**: the P12 set of 15 (`evidence/p12/r5_frozen_manifest_20261024c.sha256`, box copy `p11_frozen_20261024c.sha256`) **plus** the 6 P13 tools (`evidence/p13/r5_p13_frozen_manifest_20261025.sha256`, `sha256sum -c` 6/6 OK on the box; all 21 `chattr +i`). |
| Assessment quota | ~$1.07 left, reset date unknown, **assume next month**. A merged assessment costs ~$2.85 (max ~$3.5): not affordable now; no Kaggle task until the owner says so. |
| Records | Retrace **trace-clean** after this wave; everything committed locally on `khanza-r5-p6`, **not pushed** (ask the owner first). Latest commits: `db603eb` (P13 session close) and `f378e33` (P13 main). |

### Open items
| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Flip `.vps.env` to mac-mini-vultr | done 2026-10-24 | **done** |
| 2 | Old-box decommission | owner | treated as done; terminates ~10-25 |
| 3 | **Third home before ~11-20**, and durable off-box storage of the export archives (`docs/khanza_r5_reproduce.md` §2) | owner | undecided (owner is considering it) — **now urgent: P13 evidence is in `evidence/p13/` and the box terminates ~11-20** |
| 4 | MemPalace outbox delivery (`self-harness/outbox/mempalace-queue-20261020T0133Z.md`) | next session | PENDING |
| 5 | Re-run the suite and NC 5/5 on the re-pinned bytes under a held lock | done 2026-10-24 (R5 §24) | **done** |
| 6 | Ledger backup table `sik_bench.dr_charge_ledger_bak_20261017` retention | owner | **decided 2026-10-25: keep** (revisit at the third-home move) |
| 7 | **REMINDER — query-provenance disclosure** (R5 §12 item 7) | every session | **decided 2026-10-25:** applies to any future publication (none yet). Before any paper/preprint/README/external page reports these query results, add the `top_diagnoses` + raw-`billing` disclosure. Do not drop this item. |
| 8 | Untracked `kaggle/deers-rock-assessment/` task files and downloads | owner | **decided 2026-10-25:** gitignored, left on disk |
| 9 | Push of the local commits | owner | ask first |
| 10 | Lock is advisory and covers two tools; `p6_acceptance_suite.sh` run directly is not guarded | known limit | |
| 11 | `2026/10/23/000408`: stale payment 62,873.2 (a form re-run writes 204,506); live row left as is | owner | **decided 2026-10-25: keep the row as is** (R5 §24.5); cleaning stale `detail_nota_jalan` rows would be a live write and needs approval |
| 12 | Clean-box rebuild from the repo + export (the third-home rehearsal) | next session | not done; needs a box |
| 13 | P13 wide-sample (N=30/300/3000) | opencode | **done** 2026-10-25 (R5 §25); 0/3330 differing; report `docs/khanza_r5_p13_opencode_report.md` |
| 14 | **Known cosmetic bug:** the P13 driver's `sukses` count and rate line are doubled (two matching lines per visit). The stop-rule percentage and all comparator results are unaffected. Corrected true rates: stage 0 ≈ 9.6/min, stage 1 ≈ 11.5/min, stage 2 ≈ 17.0/min. ~~Fixed in the local working copy (`p13_wide_sample.sh`), but the box copy still has the old count~~ *Not fixed anywhere: the local copy is byte-identical to the frozen box copy and still has the doubled `grep -hc` (orchestrator review 2026-10-25). Fixing it needs un-freezing, re-freezing and re-pinning the P13 manifest.* | next session | documented in the report §Problems item 2; decide whether to re-run |
| 15 | **P13 evidence is 3.9 % of the cohort.** The zero-mismatch result is scoped: 3,330 of 85,387 eligible DR encounters (without form-saved payments). No population bound is claimed beyond the stated assumption (simple random draws within strata of a synthetic cohort; Clopper–Pearson 95 % upper bound ~~≈ 0.022 %~~ *≈ 0.090 % one-sided, 0.111 % two-sided* for n=3330, k=0). | owner | the full cohort would take ~3-8 days of box time; not recommended unless a stage shows a difference |
| 16 | **P14: edge strata (B3) + charge-line identity** | done 2026-10-26 | **done** (R5 §26): fixture 27/27 match pre-registration; line identity 300/300 real visits (181 EQUAL, 119 EQUAL-CTX); NC discriminating; live unchanged; 12 tools frozen |
| 17 | **P15 candidates from P14** (owner decisions): (a) builder crashes fail-closed on fractional `jml` (one 0.5 dispense blocks the whole build); (b) ledger has no embalase/tuslah; (c) ledger bills DR's own reg fee/tariff where Khanza bills 0; (d) display-name collisions make 40 % of real visits EQUAL-CTX only | owner | open |
| 18 | **HOE Epic V branch** `epic-v-dashboard`: merged into `main` as `0d60971` and pushed 2026-10-26 | done | **done** |
| 19 | **Astra v11 = 66/100** (run 5496287, $3.53 incl. gemini; `evidence/astra_v11_*`). P15 task doc written from it: `docs/khanza_r5_task_p15_safety_and_line_identity.md` (every v11 finding verified against the source; safety first, then discriminating line identity) | done 2026-10-26 | **done**: P15 run (R5 §27) |
| 20 | **P15 done** (R5 §27): driver safety, stricter predicates, source-row line identity (300/300, 0 AMBIGUOUS, C2 hole closed), recovery repairs (suite 39/39, NC 5/5, unit 44/44). Frozen set now P15 manifest b (18 files) on top of the P12/P13/P14 sets. Open: C3 form-side provenance, X2, clean-box rebuild, P14 ledger scope decisions | owner | committed locally, not pushed |
| 21 | **P15 independent review → P16 done** (R5 §28): the reviewer re-scored P15 17/24 (self 23); N1–N8 fixed under lock `P16-CLAUDE-20261026` (released, free captured). Frozen set is now manifest b of 22 files (`evidence/p16/r5_p16_frozen_manifest_20261026b.sha256`; box `p16_frozen_20261026b.sha256`). Open, stated: driver stop-rule is wiring-tested only; `p12_perencounter_reconcile.py` still uses COALESCE on payments; the P14 lock release is unevidenced. Next owner call: second independent re-score of P16, then Astra v12 (costs money, needs your OK). | done | **done** |

## 2. Standing rules (unchanged from 10-24, repeated for the next session)

- **Run lock.** Every run of `p6_run_suite_fresh.sh` / `p11_negative_controls.sh` / the P13
  driver needs the lock. On the box: `bash /opt/Deers-Rock/tools/dr_runlock.sh acquire
  <your-session-id> "<note>"`, export `DR_LOCK_SESSION=<your-session-id>`, then `release`
  at the end. Without it, or as another session, the tools exit **3** and touch nothing.
  `bash p12_rerun_chain.sh <session-id>` is the whole evidence chain (acquires and releases
  itself, ~25 min on this box). A stale lock is broken only with `release --force` after
  reading `status`.
- **P13 driver (new).** `p13_wide_sample.sh <stage-name> <visits-file>` builds the
  throwaway clone `sik_p13w` with 8 audit triggers, retargets `database.xml`, runs the
  oracle (`--freeze-only` then the real form run), restores `database.xml`, and **keeps the
  clone for the comparator**. Run `p13_sample_compare.py <visits-file> --db sik_p13w` next,
  then `p13_drop_clone.sh` (or `p13_drop_clone.sh --keep` if a stop rule fired). The EXIT
  trap restores `database.xml` and revokes the benchmark grant even on failure. The
  comparator's third check (fresh-B from `p7_write_audit`, `acct LIKE 'benchmark@%'`)
  is the proof that B was written by the form in this run, not a stale surviving row
  (R5 §24.5).
- **Frozen tools.** The 21 files (15 P12 + 6 P13) are `chattr +i`. Before editing any of
  them: `chattr -i` on **each box**, keep the originals in a `.bak_*` dir, deploy, then
  `sha256sum <files> > p11_frozen_<date>.sha256`, `chattr +i <files>`, `sha256sum -c`,
  `lsattr`; copy the manifest into `evidence/…`; re-pin `khanza_r5_release_manifest.md`.
  Evidence is valid only for the bytes it names.
- **LF deploy.** Windows working copies may be CRLF. Deploy LF copies, then compare
  `sha256sum` of local and box; git blobs must be `i/lf`.
- **Heredoc-backslash trap.** Writing remote scripts through `ssh '…'` or an unquoted
  heredoc eats or doubles backslashes. Write the script to a file, `scp` it, run with
  `bash`; use `<<'EOF'` quoted heredocs.
- **latin1/utf8mb4 join trap.** Khanza tables mix latin1 and utf8mb4 collations; a join on
  a text key across them errors or silently mismatches. Cast/`CONVERT(… USING utf8mb4)`
  the key, or `COLLATE` it explicitly, and check the row count against a one-sided count.
- **Live databases.** `sik` and `sik_bench` are **read-only**; destructive or live actions
  need the owner's explicit approval. The oracle refuses `--db-name sik` without
  `--allow-live`.
- **No secrets** (DB passwords, VPS addresses, Khanza AES key/IV) in any committed file;
  scan every diff before a push. No subagents. No push without the owner. No Kaggle task
  without the owner's OK.
- **Verify before repeating.** Re-check any claim against the source before relying on it.
- **Records per wave:** R5 section, manifest re-pin, task doc, QMS record, failure record
  per defect, pm1 trace (`pm1-trace trace … --encoding morse`), copies under `records/`,
  then `python C:/Users/think/self-harness/tools/retrace.py --project-root
  C:/Users/think/Project_v2/Deers-Rock/khanza-r5 --traces-dir C:/Users/think/self-harness/traces`
  must report trace-clean.
- **One working tree per agent session** and the run lock on the box.
- Long jobs: launch detached `(setsid nohup bash job.sh > /tmp/job.log 2>&1 < /dev/null &)`
  as its own ssh call, then poll.
- Commit messages end with the attribution line the session gives.

## 3. Key facts (carried from 10-17/24; do not rediscover)

The harness/consumer read `setting/database.xml` (AES), not `database.ini`: retarget only with
`tools/p6_dbxml.py retarget|restore`; a scratch DB needs a temporary grant to
`benchmark@localhost`. Khanza's own `DlgBilingRalan` writes `billing` (R5 §18). Tax is the
integer rule `(s*11+50)//100`. A billing run needs a prior `--freeze-only` on the same
RUN_ID/stage; clean visits are the DR cohort (`2026-10-01/800085`, `800128`). Migration
facts (classpath, the all-five-properties AES fact, `PatchDbXml`): `docs/asset_export_20261023.md`.
Never name a tracked folder `tmp…` (gitignored).

**P13 new facts (do not rediscover):**
- The P13 sampler (`p13_draw_sample.py`) is SELECT-only and deterministic
  (`random.Random(20261024)`). It draws from the 85,387 DR encounters that have no
  `detail_nota_jalan` row and are not in the R4 999-visit sample. Eligibility is asserted
  by `--verify <file>` (exit 1 naming the offender).
- The P13 driver (`p13_wide_sample.sh`) builds `sik_p13w` from `sik` via `mysqldump
  --single-transaction`, adds 8 `p7a_*` audit triggers on the 4 write targets, grants
  `benchmark@localhost` on the clone only, retargets `database.xml` to the clone, runs the
  oracle, restores `database.xml`, and keeps the clone for the comparator. The EXIT trap
  restores `database.xml` and revokes the grant even on failure; the clone is dropped only
  on a freeze-only failure (half-built) or explicitly by `p13_drop_clone.sh`.
- The P13 comparator (`p13_sample_compare.py`) is SELECT-only, batched (500-visit chunks),
  and checks three things per encounter: `A_form == C` (billing value rows bucketed by
  component vs `dr_charge_ledger`), `B == C` (`detail_nota_jalan` paid sum vs ledger total,
  exact Decimal half-up), and **fresh-B** (exactly one `detail_nota_jalan` INSERT from
  `benchmark@localhost` in the `p7_write_audit` trigger table). Exit 0 = all equal; exit 1
  = differences written to the CSV.
- The stale-payment row `2026-10-23/000408` is **excluded** from the P13 sample (it has a
  `detail_nota_jalan` row) and remains un-cleaned (a live write, needs owner approval).
- The P13 frozen manifest is `evidence/p13/r5_p13_frozen_manifest_20261025.sha256`
  (6 files, new P13 tools only; the 15 P12 files remain under their existing manifest).
  Both manifests are `chattr +i` on the box and `sha256sum -c` OK.

## 4. Next wave — from the v10 top-3 (P12/P13 remaining)

Done in P12 step 1 (R5 §24): evidence re-taken on the final bytes; per-encounter
reconciliation; R4 0/999 re-read; sources published; STRATA dump pinned.
Done in P13 (R5 §25): wide sample N=30/300/3000 on a disposable clone, B re-taken fresh,
0/3330 differing.

Still open:
1. **Clean-box rebuild rehearsal** (reproducibility closure's missing half): needs the third
   home. Do it before ~11-20 from the repo plus the export; the export archives must first
   be copied somewhere durable. **This is now the highest-priority open item** (the box
   terminates ~11-20 and P13 evidence is local-only until pushed).
2. **The full cohort (86,455 visits)** is not recommended unless a stage shows a difference
   (P13 stage 2 was 0/3000; no stage fired a stop rule). It would take ~3-8 days of box
   time at the observed rate (~17 visits/min for the form run, plus clone build ~20 min per
   stage). The owner should decide whether to run it before the box terminates.
3. **v11 assessment:** only after the quota resets (assumed next month); merged method,
   content capped at v10's 316k chars, embed this handoff and R5 §24-25, not the stacked
   one.
4. **The P13 driver's double-counted rate** (open item 14): decide whether to un-freeze,
   fix, re-freeze, and re-pin the P13 manifest, or leave it as a documented cosmetic
   defect (the stop-rule percentage and all comparator results are unaffected).

Delegation: opencode can do grunt work, but only against frozen bytes and a held lock,
with a rubric, followed by a read-only review here.

## 5. Map of the folder

`docs/` R5 report (§0–§25), task docs P5–P13, manifest, handoffs, assessment · `tools/`
deployed tools (= `/opt/Deers-Rock/tools/`) · `tools/kaggle/` Astra builders · `evidence/`
Astra outputs, `p6/`–`p13/`, `runlock/`, `p12/` · `src/` published consumer/harness sources
+ `verify_published.sh` · `records/` copies of QMS/failure/trace records · `recovered/`
VPS copies of the lost set.

## 6. This session's work (2026-10-25)

Commit `f378e33` (P13 main, local, not pushed): 6 new P13 tools, R5 §25, task doc, opencode
report, QMS `VER-2026-10-25-DR-KHANZA-R5-P13-001`, pm1 trace `r5-p13-wide-sample`, all
evidence under `evidence/p13/` (stage 0/1/2 driver + oracle + comparator, sampler, both NC
transcripts, kill test, live-state proof, P13 frozen manifest).
Commit `db603eb` (P13 session close, local, not pushed): synced the local P13 tool files
to the box bytes (byte-identical to the frozen manifest), expanded the trace's key_files
from 14 to 44 entries, updated the report's commit hash to `f378e33`.
Retrace: `Directory is trace-clean.`

## 7. Owner decisions 2026-10-25 (after the P13 review)

- Third home: **waits** (open item 3 stays open; deadline ~11-20 still applies).
- Astra v11: **waits** for quota, unless another provider offers Astra (`gpt-6-astra`; the OpenAI API is the first candidate — not checked yet).
- P13 doubled rate (item 14): **leave as documented**, no re-freeze.
- Full cohort: **skipped**. MemPalace (item 4): **skipped for now**.
- Items 6, 7, 8, 11 decided as recorded in the table above.

## 8. P14 session (2026-10-26)

P14 ran on mac-mini-vultr under lock `P14-CLAUDE-20261026` (released). Results in R5 §26, task doc
`docs/khanza_r5_task_p14_edge_strata_line_identity.md` (self-score 28/28, pending independent review),
evidence `evidence/p14/`, QMS `VER-2026-10-26-DR-KHANZA-R5-P14-001`, four failure records
(`records/failures/20261026T*`). Frozen tools now 33 files: 15 P12 + 6 P13 + 12 P14
(`evidence/p14/r5_p14_frozen_manifest_20261026.sha256`).

New facts (do not rediscover):
- Every DR visit has exactly 1 procedure, 0 embalase/tuslah, `biaya_reg = 10000` (T0).
- Clone builds take ~65 s (not ~20 min); the frozen builder rebuilds the full DR ledger on a clone in
  ~5 s and reproduces the pin on non-fixture rows.
- The oracle has `--allow-strata` for out-of-envelope visits (exit 4 expected).
- The consumer bills from an ENC-only input without rewriting `detail_pemberian_obat` (fixture baseline).
- Strict `sql_mode` rejects legacy zero dates in `databarang`: copy lookup tables with a relaxed session mode.
- The real form rounds PPN half-up at exact half rupiah and keeps the half rupiah in fractional line amounts.
