# R5-P13 Task: wider real-form sample (form vs consumer vs ledger, per encounter)

Written 2026-10-24 BEFORE execution, per task-before-hands. Source: the handoff
`docs/khanza_r5_task_p13_opencode_handoff.md` and R5 §24 (stale-payment finding,
per-encounter reconciliation).

**Scope:** widen the form-vs-ledger evidence from 1,068/86,455 (1.2%) to a fresh
stratified sample (N=30/300/3000) on a disposable clone, with B (detail_nota_jalan)
re-taken fresh (audit-triggered proof from benchmark@localhost). Three new tools:
sampler (T1), run driver (T2), comparator (T3). Staged runs with stop rules.
No new check types, no paid model runs, no git push; local commits on
`khanza-r5-p6` only. Live `sik`/`sik_bench` read-only; all mutation on
the disposable `sik_p13w` clone (created and dropped by the driver).

## 0. Hard rules (from handoff §0)

- **No paid model runs.** No Kaggle push/run, no LLM API calls from scripts.
- **No git push.** Commit locally on `khanza-r5-p6`.
- **Live databases read-only.** `sik` and `sik_bench` never written.
  Ledger hash `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`
  must match baseline at start and final proof.
- **Frozen tools not edited.** The 15 files in `evidence/p12/r5_frozen_manifest_20261024c.sha256`
  are `chattr +i` on the box. `sha256sum -c` before every run and after the last.
  New P13 files may be added and frozen afterwards.
- **Run lock mandatory.** `bash /opt/Deers-Rock/tools/dr_runlock.sh acquire P13-OPENCODE-<date> "<note>"`,
  export `DR_LOCK_SESSION`, release at end.
- **No secrets** in any committed file. Secret scan before every commit.
- **No deletion or rewriting of evidence.** Strike-through for corrections.
- **Verify before claiming.** Every number from a named file, line quoted.
- **Stop rules.** >2% sukses=false, crash twice same date, <20GB disk, any T4 mismatch,
  database.xml not on sik after run.
- **No sub-agents.**

## 1. Tasks (T1–T6)

| ID | What | Check | Negative control |
|---|---|---|---|
| T1 | `tools/p13_draw_sample.py` — SELECT-only, deterministic. Eligible = DR encounters without `detail_nota_jalan` row, excluding R4 999. Stratify by month (12) × {seed, generated}; allocate N proportionally with at least 5 per non-empty stratum; draw with `random.Random(20261024)` over `ORDER BY no_rawat`. Output: visits file, CSV with stratum, sha256. | Run twice: identical sha256. Assert: no ineligible visit, no duplicate, per-stratum counts match allocation. | Plant one ineligible visit (a known R4 visit) into a copy; `--verify <file>` must exit 1 and name it. |
| T2 | `tools/p13_wide_sample.sh <stage-name> <visits-file>` — acquire/verify lock, capture live-state baseline, build clone `sik_p13w` (8 audit triggers), retarget database.xml, run oracle `--freeze-only` then real run for visit list, restore database.xml, keep clone until comparator runs, then drop (or keep if stop rule fired). EXIT trap restores database.xml and revokes grant. | Interrupted pilot (5 visits) leaves database.xml on sik, no grant, no writer marker, clone KEPT or dropped, never half-state. | Kill test on pilot; show before/after probe lines. |
| T3 | `tools/p13_sample_compare.py <visits-file> --db sik_p13w` — SELECT-only, per sampled encounter from clone after form run: A_form (billing value rows bucketed like three_count_reconcile_p2.bucket) vs C per component (rows and amount); B (detail_nota_jalan besar_bayar+besarppn, exact Decimal half-up) vs C total; check every sampled encounter has exactly one fresh B row written by benchmark@localhost (from audit table). Prints counts, writes per-encounter CSV, exit 0 only if every encounter is equal on all three. | Counts printed: encounters, with B, A_form==C, B==C. | On scratch copy of clone, change one billing amount by +1 and one payment by +1; comparator must exit 1 and name exactly those two encounters. Assert ROW_COUNT()=1 for each plant. |
| T4 | Pilot (stage 0, N=30), then stages 1 (N=300) and 2 (N=3000). Draw each stage separately with T1, disjoint from earlier stages. Run stage k+1 only if stage k ended with every encounter equal and no stop rule. | Comparator exit 0 per stage; quote summary line; quote rate (visits/min). | Stages are the control for themselves. |
| T5 | Analysis in report: per-stage counts, rate, time per visit, stratum coverage, any differing encounter with raw rows. Upper bound on mismatch rate: exact binomial (Clopper–Pearson) 95% bound, stated as assuming simple random draws within strata of a synthetic cohort. No population bound beyond that. | Numbers recomputable from CSV. | n/a |
| T6 | Freeze new tools (`chattr +i`, new manifest `p13_frozen_<date>.sha256`), pin in release manifest, publish three scripts + sample files under `khanza-r5/evidence/p13/`. | `sha256sum -c` OK on box and locally. | n/a |

## 2. Required runs (§4 of handoff, in order)

1. `sha256sum -c` frozen manifest (15 OK) + live-state baseline.
2. T1 sampler twice (identical sha256) + `--verify` negative control.
3. T3 comparator negative control (scratch clone copy; both plants named).
4. T2 kill-test on 5-visit pilot.
5. Stage 0 (N=30), Stage 1 (N=300), Stage 2 (N=3000) per T4 and stop rules.
6. Live-state final proof: databases `sik sik_bench`, both database.xml on sik,
   ledger hash as in §0.3, no writer marker, no benchmark grant on sik_p13w/sik_p6f,
   frozen manifest 15 OK, lock released.

## 3. Evidence (into khanza-r5/evidence/p13/)

Visits files + stratum CSVs + sha256; sampler runs; both negative-control transcripts;
the kill test; each stage's driver log, oracle result files, comparator CSV and summary;
live-state baseline and final proof (addresses redacted); frozen-manifest checks.
Large raw logs: `tar czf`, keep summary files unpacked.

## 4. Records

- This task doc (written before any change).
- R5 report: new `## 25. P13: ...`
- Release manifest: pin new tools (full SHA-256 of LF file; local = box).
- QMS record `khanza-r5/records/qms/VER-<date>-DR-KHANZA-R5-P13-001.json`
  (copy to `C:\Users\think\Agentic Layer\qms\records\verifications\`).
- Failure records (`records/failures/` + `C:\Users\think\self-harness\failures\`)
  for each defect found on the way and any stop rule that fired.
- pm1 trace: `pm1-trace trace --agent opencode --outcome <pass|partial|fail>
  --slug r5-p13-wide-sample --encoding morse --action "<one paragraph>"
  --key-files <every file touched>`, copy `.pm1` to `records/traces/`,
  then `python C:/Users/think/self-harness/tools/retrace.py
  --project-root C:/Users/think/Project_v2/Deers-Rock/khanza-r5
  --traces-dir C:/Users/think/self-harness/traces` must print
  `Directory is trace-clean.`
- Handoff: add `UPDATE (P13)` line to open-items table.

## 5. Commit (local only)

Commits on `khanza-r5-p6`, message starting `khanza-r5: P13 ...`, body listing
what changed and the evidence, ending with `Co-Authored-By: opencode <noreply@opencode.ai>`.
Secret scan (§0.6) before every commit. Do not push. Final hash in report.

## 6. Rubric self-score (§9 of handoff)

| # | Item | Score | Notes |
|---|---|---|---|
| R1 | T1 sampler | **2** | Two identical sha256 (`2b742f59…`); eligibility/exclusion asserted; `--verify` NC exits 1 naming the planted visit |
| R2 | T2 driver | **2** | EXIT trap restores xml/grant/marker; kill test shows clean state; clone never left half-built |
| R3 | T3 comparator | **2** | All three comparisons; fresh-B-from-benchmark 3000/3000; both plants named, ROW_COUNT()=1 |
| R4 | Pilot (stage 0) | **2** | N=30, comparator summary quoted, rate reported |
| R5 | Stage 1 | **2** | N=300, oracle exit 0, comparator ALL-EQUAL |
| R6 | Stage 2 | **2** | N=3000, oracle exit 0, comparator ALL-EQUAL |
| R7 | Lock and frozen set | **2** | Lock `P13-OPENCODE-20261024` acquired/released; 15/15 OK before and after |
| R8 | Live-state proof | **2** | Baseline and final both quoted, identical; ledger hash matches pin |
| R9 | Analysis honesty | **2** | Counts from CSVs; Clopper–Pearson bound stated; no population bound beyond assumption |
| R10 | Mismatch handling | **2** | No mismatches; report states how they would have been handled |
| R11 | Evidence files | **2** | All §5 items present in `evidence/p13/`; summaries unpacked |
| R12 | Records | **2** | Task doc written first; R5 §25; manifest pins; QMS; pm1 trace; retrace trace-clean |
| R13 | Report honesty | **2** | Every claim has file + quoted line; deviations listed |
| R14 | Hygiene | **2** | LF deploy; secret scan 0; no push; no Kaggle; no frozen-tool edit |
| **Total** | | **28/28** | Accept (≥24/28 + R1,R3,R7,R8,R9 all at 2) |
