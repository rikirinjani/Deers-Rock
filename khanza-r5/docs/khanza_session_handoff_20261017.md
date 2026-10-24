# Session Handoff — DR→Khanza E2E Benchmark (2026-10-17)

> **HISTORY — SUPERSEDED 2026-10-24.** Read `khanza_session_handoff_20261024.md` instead. This file is kept as a record only: its body describes 2026-10-17 and several UPDATE blocks below are stale or contradict each other (e.g. "hardening DONE" vs "owner-deferred" — verified DONE on 2026-10-24; the 21-check/7-min suite is now 39 checks/~45 min).

**Read this first.** It replaces `khanza_session_handoff_20261016.md` (kept for history).

> **UPDATE 2026-10-23 (VPS migration) — the benchmark asset now lives on TWO boxes.** The asset was
> exported from the old box, pushed, restored and verified on a replacement VPS labeled
> **mac mini vultr** (owner's naming; the older vultr box keeps its role until the owner decides
> otherwise). Details: `docs/asset_export_20261023.md`, commits `af97c45`..`0d985b0`.
> **Connection (owner-directed exception to the no-IP rule, 2026-10-23 — owner asked for the creds
> to be written here):**
> - host `<public IPv6: VPS_HOST in khanza-r5/.vps-mac-mini.env>` (IPv6) — preferred path now: **tailnet `<tailnet IP: VPS_TAILNET_HOST in khanza-r5/.vps-mac-mini.env>`**
>   (box joined the tailnet as `mac-mini-vultr`, same account as the owner's other devices)
> - port 22, user `root`
> - auth: the workstation ed25519 key `~/.ssh/id_ed25519_dr_vps` (public half installed in
>   `/root/.ssh/authorized_keys` via the Vultr console); alias `ssh mac-mini-vultr`
>   (`~/.ssh/config`, points at the tailnet IP)
> - env: `khanza-r5/.vps-mac-mini.env` (gitignored); **hardening DONE 2026-10-23** — password auth
>   disabled, key-only root (`00-hardening.conf` overrides cloud-init's drop-in); no password is
>   stored anywhere in this repo
> - hostname `mac-mini-vultr`, label file `/etc/machine-label`
> - **⚠️ OWNERSHIP TIMELINE (owner, 2026-10-23 — supersedes earlier "both boxes live"):** the
>   **old/source box is NOT on Vultr and terminates ~2026-10-25 (≈2 days)** — this migration existed
>   because of that. Final delta sync 2026-10-23: 0 files changed since the 06:33Z export, so
>   **mac-mini-vultr is fully current and becomes the ONLY durable home on ~2026-10-25**. Flip
>   `khanza-r5/.vps.env` to it when the old box stops responding or on owner's word (not while the
>   parallel session has work in flight). **Next deadline: ~2026-11-20** — mac-mini-vultr itself
>   decommissions then (Vultr credit expiry ~11-22); a third home or paid plan is needed before.
> **Verified on the box:** export manifest 5/5 OK; jar md5 `25acbbbe…`; seven frozen tools OK vs
> `p11_frozen_20261020T0739Z.sha256`, re-`chattr +i`; `sik` 1179 tables, `sik_bench` 23; restored
> ledger `356355:a66a3a54…` MATCH; `benchmark@localhost` fresh password with old-box-identical
> grants; both `database.xml` re-encoded (PatchDbXml; classpath and the all-five-properties AES
> fact are in the migration doc — do NOT rediscover this); `results/` copied 1.3 GB / 8633 files;
> MySQL buffer pool 6 G, binlog off. Parity probe identical on both boxes.
> **Current open items:** (1) `chattr -i` the seven tools before ANY tool edit — on BOTH boxes;
> (2) sshd hardening on mac mini vultr (owner-deferred); (3) MemPalace outbox delivery
> (`self-harness/outbox/mempalace-queue-20261020T0133Z.md`, still PENDING); (4) old-box
> decommission decision (owner). Note: earlier "AC-9 can't be closed right now" notes are OBSOLETE —
> AC-9 was closed later the same day (see the P11 UPDATE below).

> **UPDATE 2026-10-20 (P11) — P11 DONE against a FROZEN byte set** (task doc
> `docs/khanza_r5_task_p11_negative_controls.md`, R5 §22, report
> `docs/khanza_r5_p11_opencode_report.md`, QMS `VER-2026-10-19-DR-KHANZA-R5-P11-001`). Every P10
> recovery check now has a negative control: unit **33/33**; negative controls **5/5
> DISCRIMINATING** (NC1 from a clean re-run — see below); full fresh suite **39/39, exit 0**;
> preservation check **PASS**; forced-failure control one FAIL, fixture kept, `database.xml` on
> `sik`, grant removed; builder exit 0 reproducing `356355:a66a3a54…`; live proof matches §4.6.
> **AC-9 is closed (revision 07:32Z)**: the NC driver's fixture reuse was fixed (`ensure_fx` now
> verifies the 5 `STRATA-` reg rows and rebuilds an unusable fixture), the NC script was
> re-pinned (`a3f44721.` -> `0bba1931.`) and all seven tools re-frozen, and ONE uncontended run
> returned 5/5: `r5_p11_negative_controls_20261020T073218Z.md`,
> `DISCRIMINATING=5 NOT-DISCRIMINATING=0`, exit 0, fixture dropped. Suite 39/39, preservation
> PASS, builder byte-identical and the live proof were re-taken on the same bytes.
> **Critical process finding:** a **second agent session on this machine, sharing this working tree
> and the VPS**, was developing the same P11 tooling concurrently — it rewrote three tools at
> 21:02:19Z, 19 s before an evidence run, ran sixteen-plus P11 experiments between 17:00 and 20:50Z,
> and re-created the NC runner three times. All earlier P11 evidence (NC 5/5 at 13:56Z, suite 39/39
> at 15:10Z) was produced by bytes that no longer exist and is retained but **not relied on**. The
> seven tools were therefore frozen (`chattr +i` + `FROZEN.sha256` in
> `/opt/Deers-Rock/tools/p11_frozen_20261019/`) and every required run re-executed with
> `sha256sum -c` before and after. Records: `20261019T2135Z-…-concurrent-writer-evidence-unbinding`,
> `20261019T1450Z-…-stray-launcher-interference`, `20261019T1545Z-…-post-deploy-drift`,
> `20261019T1605Z-…-forcefail-counter`, `20261018T1630Z` (closed, `corrected`).
> **Next session must:** (1) `chattr -i` the seven tools before any tool change (they are frozen
> again after the 07:39Z re-freeze: `evidence/p11/r5_p11_frozen_manifest_20261020T0739Z.sha256`);
> (2) still take an **exclusive** window on `sik_p6f` as well as frozen bytes -- the other session
> was active until at least 01:45Z; (3) ~~fix the NC driver's fixture reuse so each arm starts from
> a known state, then obtain one clean 5/5 invocation to close AC-9~~ **done** in commit `20ea324`
> (see the AC-9 revision above).

> **UPDATE 2026-10-18 (v10) — Astra v10 = 63/100** "Needs targeted rework" (7/6.5/7.5/6/7/4; run
> 4918967, $3.064 + $0.235 gemini). `evidence/astra_v10_4918967_NOTE.md`: 9 findings, all confirmed
> in source - several P10 checks are non-discriminating (A28, the preservation baseline) and some
> §21 wording is too broad (open failure record 20261018T1630Z). About $0.69 of quota left: no
> more assessments this month. Next wave should add NEGATIVE CONTROLS (show each check fails on
> broken code) before any new check.
>
> **UPDATE 2026-10-18 (P10) — P10 DONE** (packs A+B; task doc
> `docs/khanza_r5_task_p10_integrated_recovery.md`, R5 §21): suite run 1 FAILED 30/38 (writer
> exclusion not crash-safe; evidence kept; failure record 20261018T0430Z), fixed; run 2 **39/39**;
> integrated preservation check PASS; unit test 26/26; builder reproduces `a66a3a54…`; manifest
> re-pinned; QMS P10-001; failure record 20261018T0215Z closed.
> **Next:** Astra v10 = `build_astra_task_r10.py` -> push/run `task_r10_merged.py` (content 315,919
> chars, cap 317k; expected ~$2.85, max ~$3.53 + ~$0.29 gemini; owner reported $3.99 left; needs
> the owner's OK). Writer exclusion leaves a marker in `/opt/dr-benchmark/results/.writer_exclusion_*`
> only while a restore runs; a leftover marker is recovered at the next oracle start.
>
> **UPDATE 2026-10-18 (v9) — Astra v9 = 62/100** "Needs targeted rework" (7/6/7/6/7/4; run 4898353,
> $2.848; `evidence/astra_v9_4898353_NOTE.md`: 7 findings, all confirmed in source, incl. two P9
> report overclaims — open failure record 20261018T0215Z). Quota left ~ $2.75 (astra) / ~ $2.47
> (with gemini): not enough for another merged run this month.
>
> **UPDATE 2026-10-18 (P9) — P9 DONE** (packs A+B; task doc
> `docs/khanza_r5_task_p9_recovery_contract.md`, R5 §20): suite **34/34** on a fresh fixture,
> terminal-path check PASS (failed suite -> wrapper exit 1, fixture KEPT until
> `p6_run_suite_fresh.sh --teardown-kept`), unit test 20/20, builder check exit 0 clean / 1
> planted; evidence in `evidence/p9/`; manifest re-pinned; QMS P9-001; failure record.
> **Next:** Astra v9 = `build_astra_task_r9.py` -> push/run `task_r9_merged.py` (expected ~$3.0,
> max ~$3.7 + ~$0.32 gemini; owner reported $5.6 quota left; needs the owner's OK).
> Not done: pack C (reproducibility closure), pack D (matched encounters, R4 0/999).
>
> **UPDATE 2026-10-18 (latest) — Astra v8 = 60/100** "Needs targeted rework" (6/6/7/6/7/4; run
> 4897654, $2.782; `evidence/astra_v8_4897654_NOTE.md` lists 7 findings, all confirmed in source).
> Budget left this month: ~$2.83 (astra only) or ~$2.28 (if gemini validation counts). P9 should
> start from that NOTE (retry re-verification, restore_kept, builder-check exit, A11
> STAGE-RESTORE-ERROR, per-batch hash files, verify_frozen source hash).
>
> **UPDATE 2026-10-18 (later) — P8 DONE** (packs A+B+C; task doc
> `docs/khanza_r5_task_p8_claims_gates_recovery.md`, R5 §19): suite **29/29** on a fresh
> fixture (`evidence/p8/`), recovery unit test 11/11, P8 builder reproduces `a66a3a54…`, live
> state unchanged, manifest re-pinned (local LF = VPS), QMS P8-001, retrace clean. Deploy
> trap: Windows working copies may be CRLF — deploy `tr -d '\r'` copies and compare LF hashes.
> **Next:** Astra v8 = `python khanza-r5/tools/kaggle/build_astra_task_r8.py` → push/run
> `task_r8_merged.py` (expected ~$2.9, max ~$3.45 + ~$0.3 gemini validation; needs the
> owner's OK). Not done: packs D (reproducibility closure) and E (matched encounters, R4 0/999).
>
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
