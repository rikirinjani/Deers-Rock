# Session Handoff — DR→Khanza E2E Benchmark (2026-10-17)

**Read this first.** It replaces `khanza_session_handoff_20261016.md` (kept for history).

> **UPDATE 2026-10-18 — Astra v7 is DONE: 58/100 "Needs targeted rework"** (6/6/6/6/7/4).
> The budget is now **$8 for the whole month** (not $10/day), so steps 2–3 were replaced by
> one owner-approved merged call (run 4894730, $2.389; see
> `evidence/astra_v7_merged_4894730_NOTE.md` for the method, caveats and the synthesis
> empty-prior defect). About **$5.4** is left this month (spent: $2.389 astra + $0.257 gemini
> validation). A future assessment should use `--merged` style (~$2.5), not 5–6 separate
> 143k-token calls. The freeze in §2 is lifted; §2's step 2/3 plan is superseded.
> The P8 list in §3 still applies; v7's own top issues are in the NOTE's source output
> (§3 "Top three remaining issues", §7 next step).
Everything referenced lives in `C:\Users\think\Project_v2\Deers-Rock\khanza-r5\`
(git branch `khanza-r5-p6`, pushed to the **public** repo `rikirinjani/Deers-Rock`).

## 1. Where things stand
| Item | State |
|---|---|
| External score | Astra **v6 = 52/100** "Needs targeted rework" (run 4818826). History 35 → 43 → 43 → 52. |
| Latest wave | **P7 done**: suite 21/21, fail-closed (R5 §18, `docs/khanza_r5_task_p7_failclosed_gates.md`). |
| Astra v7 | **3-step budget split, step 1 done** (claim-honesty **6/10**, run 4880158, $1.72). Steps 2–3 pending. |
| Live ledger | Rebuilt from source 2026-10-17 (owner-approved). 356,355 rows / Rp 34,870,243,633, content `a66a3a54…`. Backup table `sik_bench.dr_charge_ledger_bak_20261017` (old content `d2b65d8e…`) kept until v7 is done. |
| Live gates | charge_delta PASS and `--line-diff` PASS (windows 2026-10 and ALL); three_count A==C on both (exit 1 = documented B-subset state). |
| VPS | Only `sik` and `sik_bench`; both `database.xml` copies → `sik`; nothing running. |

## 2. Next action: Astra v7 steps 2 and 3 (owner-approved plan)
Daily gpt-6-astra quota is **$10**; a full v7 run (~$11–12) cannot fit, so it runs as 3 steps
with identical prompts/evidence (comparable with v6). Cost is fixed per call: 143k input
tokens ≈ $1.43 + output capped at 8k ≈ $0.40 → **max $1.83/section**; synthesis max ~$0.57.

| Step | Sections | Max cost | Status |
|---|---|---|---|
| 1 | claim-honesty | — | **done**: 6/10, $1.72, `evidence/astra_v7_step1_4880158_output.md` |
| 2 | gate-correctness, oracle-validity, reproducibility | $5.49 | **next** |
| 3 | e2e-design, external-validity + synthesis | $4.23 | after step 2 |

**Rule (owner):** run step 2 → read its actual cost → run step 3 the **same day only if ≥ $4.23
of the daily $10 remains**, else the next day.

Commands (from `C:\Users\think\Project_v2\Deers-Rock`; `PYTHONUTF8=1` is required on Windows):
```bash
python khanza-r5/tools/kaggle/build_astra_task_r7.py --step 2
cd kaggle/deers-rock-assessment
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 kaggle b t push dr-khanza-e2e-full-assessment -f task_r7_step2.py
# wait until `kaggle b t status dr-khanza-e2e-full-assessment` shows Status: Completed (gemini validation)
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 kaggle b t run dr-khanza-e2e-full-assessment -m gpt-6-astra --wait 3600
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 kaggle b t download dr-khanza-e2e-full-assessment -o dr-khanza-e2e-full-assessment
```
- Cost: sum `inputTokensCostNanodollars + outputTokensCostNanodollars` over the step's
  `*.run.json` (÷1e9 = USD). The 2026-10-17 session did this with a short inline Python walk.
- Save the astra output as `khanza-r5/evidence/astra_v7_step2_<run>_output.md` (and the gemini
  validation output as `astra_v7_step2_validation_gemini_<run>_output.md`) **before building
  step 3** — `--step 3` embeds steps 1–2 from those files and fails if they are missing.
- Step 3 = same commands with `--step 3` / `task_r7_step3.py`; save as
  `evidence/astra_v7_step3_<run>_output.md`. Its VERDICT is the v7 overall score.
- Download path quirk: files land under
  `kaggle/deers-rock-assessment/dr-khanza-e2e-full-assessment/dr-khanza-e2e-full-assessment/<version>/<model>/<run>/`.

**FREEZE:** until step 3 has run, change **no** evidence, report, task doc or tool that the
builder embeds (R5 report, P7 task doc, manifest, `evidence/p7/*`, the tools listed in
`build_astra_task_r7.py`). The three steps must assess identical evidence.
**Freeze check:** step 1 was assessed on CONTENT sha256 `f2778fd9b785327a…` (BASE
`10fa067709d41efc…`). `task_r7_step2.py` is already built and verified identical. Before
pushing any step, re-check with the snippet below; a different hash means the evidence
changed and the steps are no longer one assessment.
```python
import hashlib; ns = {}
src = open("khanza-r5/tools/kaggle/task_r7_step2.py", encoding="utf-8").read()
exec("\n".join(l for l in src.split("\n") if l.startswith(("BASE =", "CONTENT ="))), ns)
print(hashlib.sha256(ns["CONTENT"].encode()).hexdigest()[:16])   # must print f2778fd9b785327a
```

## 3. After v7 (P8 candidates, in priority order)
Fixes Astra flagged in step 1 (do them only after step 3):
1. A11's label "every restore across the suite hash-verified" contradicts A15's deliberate
   unverified restore — exclude A15's run or count `STAGE-RESTORE-UNVERIFIED` explicitly.
2. Replace blanket "PASS" with per-property statuses; remove stale `crash_safe=YES` output and
   other blanket guarantees in older report sections.
3. Note that VPS/evidence timestamps are UTC (doc dates are local, UTC+7).

Deferred from P7: interruption *during* restoration; hard-crash resume with a surviving JVM;
concurrent-overlap isolation; retryable FAILED/unrestored batches; re-validate pre-P6
clone-mode runs (P1 `sik_r5`, P4 `sik_p2`); ZEROFEE/HALFPPN strata (need a consumer-billed
baseline). **High value:** re-examine the R4 0/999 sample (`r4_b2_1000`, live `sik`, pre-R5
oracle) — since the form writes `billing`, it may already be a same-encounter
form-vs-consumer equivalence result on 999 visits.

Other: decide retention of the ledger backup table; the "published artifact" in R5 §12
item 7 is undefined (ask the owner); untracked files in `kaggle/deers-rock-assessment/`
(older task files, downloaded outputs) are not committed.

Human-gated: C1–C4 realism, second-VPS replay, DOI/Zenodo, pharmacist review,
preregistration. Commercialization brainstorm (Indonesia / US / EU tabs, pack
architecture): https://claude.ai/code/artifact/b07a4278-ece7-4fb9-a052-0e7924b6c57a

## 4. Key facts learned (do not re-discover)
- **The harness/consumer read `setting/database.xml` (AES-encrypted DATABASE), not
  `database.ini`.** Retarget only with `tools/p6_dbxml.py retarget <db>` / `restore`
  (verified round-trip). Any scratch DB also needs
  `GRANT SELECT, INSERT, UPDATE, DELETE ON <db>.* TO benchmark@localhost` (revoke after).
- **Khanza's own `DlgBilingRalan` save writes `billing`** (audited, R5 §18 item 2);
  `BilingHarness.java` contains no SQL. The old "form writes only the verification layer"
  caveat is withdrawn.
- Tax: the consumer's `Math.round(subttl*0.11)` equals integer `(s*11+50)//100` on all 70,056
  real subtotals; the builder now uses the integer rule.
- A billing run needs a prior `--freeze-only` on the same RUN_ID/stage. Clean visits must be
  DR-cohort (`2026/10/01/800085`, `800128`); native visits are rejected by the form.
- The oracle refuses `--db-name sik` without `--allow-live`.
- One-command acceptance run: `bash /opt/Deers-Rock/tools/p6_run_suite_fresh.sh` (builds the
  `sik_p6f` full clone ~3 min, runs the 21-check suite ~7 min, always tears down).
- Repo `.gitignore` ignores `tmp*` — never name a tracked folder `tmp…`.
- `%TEMP%\opencode` was wiped 2026-10-16; its surviving VPS copies are in `recovered/`
  (secrets redacted; see `recovered/README.md`). Never use temp folders as storage.

## 5. How to work here (standing directives)
- **VPS access:** `. khanza-r5/.vps.env` (gitignored; key `~/.ssh/id_ed25519_dr_vps`), then
  `ssh $VPS_OPTS -p $VPS_PORT root@$VPS_HOST …` / `scp $VPS_OPTS -P $VPS_PORT …`.
  Long jobs: launch fully detached `(setsid nohup bash job.sh > /tmp/job.log 2>&1 < /dev/null &)`
  as its own ssh call, then poll; attached launches surface later as harmless "exit code 255"
  notifications. Write remote scripts to a file and `bash` them (inline quoting breaks).
- **No secrets** (DB passwords, VPS IP, Khanza AES key/IV) in any committed file or
  report — the repo is public. Scan diffs before every push.
- **No subagents** for this work (owner directive); external Kaggle runs are allowed.
- **Destructive or live-data actions need explicit owner approval** (dropping DBs, editing
  live `sik`/`sik_bench`). The auto-mode classifier also blocks `DROP DATABASE` on data it
  did not see created this session.
- **Verify before repeating:** any claim that dismisses an external finding is re-checked
  against the source first (failure record 20261016T0600Z). Report evidence from asserted
  runs on a verified target only.
- **Records per wave:** R5 report section, manifest re-pin (tool SHAs identical local/VPS),
  task-doc rubric, QMS record (`C:\Users\think\Agentic Layer\qms\records\verifications\`),
  failure record for each defect (`C:\Users\think\self-harness\failures\`), pm1 trace via
  `pm1-trace trace … --encoding morse` (build the key-file list in Python; Windows paths),
  copies under `khanza-r5/records/`, then `python C:/Users/think/self-harness/tools/retrace.py
  --project-root C:/Users/think/Project_v2/Deers-Rock/khanza-r5 --traces-dir
  C:/Users/think/self-harness/traces` must report trace-clean.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 6. Map of the folder
`docs/` R5 report (§0–§18), task docs P5/P6/P7, manifest, handoffs ·
`tools/` deployed tools (= `/opt/Deers-Rock/tools/`), `tools/kaggle/` Astra builders/tasks ·
`evidence/` Astra outputs, `p6/`, `p7/`, `window_all/`, `p4_strata_recheck/` ·
`records/` copies of QMS/failure/trace records · `recovered/` VPS copies of the lost working set.

## 7. Commit log of the 2026-10-16/17 sessions (newest first)
`75940f0` recovered vps_tmp · `dc3bb32` recovered set · `24345a4` v7 step plan ·
`3381ccd` v7 split + step 1 · `91c9efa` P7 · `7a1a222` live ledger rebuild · `e17da8f` P7 task
doc · `410328c` Astra v6 result · `80bc3be`…`0ad629e` gather, P6, window-ALL fix, handoffs.
