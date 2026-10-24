# R5-P13 handoff for opencode: a wider real-form sample (form vs consumer vs ledger, per encounter)

**Who this is for:** an opencode agent doing the implementation and the long runs. **Who reviews
it:** the owner hands your report to the orchestrator (Claude), who checks every claim against the
repo, the evidence files and the box (read-only). Write only what you can point to.

**Output you must produce:** a deterministic sample, a run driver, a comparator, the pilot and
main runs, evidence files, records, and **one report** at
`khanza-r5/docs/khanza_r5_p13_opencode_report.md` using the template in §8.

**Why this task exists.** Today the real Khanza form has been run on only 1,068 of the 86,455
encounters (1.2 %); only for those does a form-saved payment (B) exist. For the other 98.8 % the
evidence is consumer-vs-ledger, and the consumer is our own code. P13 widens the form-vs-ledger
evidence on a **fresh, seeded, stratified** sample, with B re-taken fresh (see §1, the stale-payment
finding), on a disposable fixture. It measures; it does not fix.

---

## 0. Hard rules (breaking any of these fails the whole task)

1. **No paid model runs.** No Kaggle push/run, no LLM API calls from scripts.
2. **No git push.** Commit locally on `khanza-r5-p6` (§7). Never force, rebase, reset, stash or switch branches.
3. **Live databases are read-only.** `sik` and `sik_bench` are never written, dropped, re-granted or
   fenced. Every mutation happens on your own throwaway clone (`sik_p13w`, created and dropped by your
   driver). Live proof at the end (§4.6) must match the baseline you capture at the start, including
   the ledger hash `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`.
   If any check says live state changed: **stop**, do not repair, write the report.
4. **Frozen tools are not edited.** The 15 files in `evidence/p12/r5_frozen_manifest_20261024c.sha256`
   are `chattr +i` on the box. **Do not run `chattr -i` on any of them.** Run
   `cd /opt/Deers-Rock/tools && sha256sum -c p11_frozen_20261024c.sha256` (all 15 `OK`) before every
   run and after the last one, and quote it. If a frozen tool seems to need a change, stop and report;
   do not work around it. You may **add** new files (your sampler, driver, comparator) and freeze
   those afterwards with `chattr +i` and a new manifest (`p13_frozen_<date>.sha256`, new files only).
5. **The run lock is mandatory and is yours only while you hold it.**
   `bash /opt/Deers-Rock/tools/dr_runlock.sh acquire P13-OPENCODE-<UTC date> "<note>"`, export
   `DR_LOCK_SESSION` with that id for everything you run, release at the end with
   `dr_runlock.sh release <id>`. If `acquire` exits 3 (someone holds it): **stop and report**; never
   `release --force` a lock you did not create. Keep the lock between your runs only if a run is in
   progress; release it when you stop for the day.
6. **No secrets in any committed file or report:** no VPS address or host, no DB passwords, no Khanza
   AES key/IV. Use `ssh mac-mini-vultr` or `. khanza-r5/.vps.env` (gitignored; never print it).
   Before committing, scan: `git diff --cached | grep -cE '([0-9]{1,3}\.){3}[0-9]{1,3}|([0-9a-fA-F]{1,4}:){4,}'`
   must print `0`, and the host values in `.vps.env` must not occur in the diff.
7. **Do not delete or rewrite evidence or records.** Correct text by strike-through
   (`~~old~~ *new*`). Old evidence stays.
8. **Verify before you claim.** Every number comes from a file you name, with the line quoted. If
   something was not done or not verified, say so.
9. **Stop rules.** Stop the current stage and write the report (do not continue to the next stage) if:
   a form run ends `sukses=false` for more than 2 % of a stage's visits; the harness crashes twice in a
   row on the same date; free disk on `/` falls below 20 GB; any encounter differs in §2 T4 (keep the
   fixture and its data for the reviewer, §4); or `database.xml` is not on `sik` after a run and you
   cannot restore it with `python3 /opt/Deers-Rock/tools/p6_dbxml.py restore`.
10. **No sub-agents.**

## 1. Context pack (read in this order)

| File | Why |
|---|---|
| `khanza-r5/docs/khanza_session_handoff_20261024.md` | Current state, standing rules, traps |
| `khanza-r5/docs/khanza_benchmark_report_R5.md` §23, §24 | The run lock, the per-encounter reconciliation and the two follow-ups |
| `khanza-r5/tools/p12_visit_replay.sh` | **A working example**: clone, audit triggers, retarget, `--freeze-only`, real-form run of a visit list, restore, teardown. Copy its structure |
| `khanza-r5/tools/p12_perencounter_reconcile.py`, `p12_reconcile_negctl.sh` | The existing comparator and its negative-control style (assert the mutation took effect) |
| `khanza-r5/tools/sampled_real_form_diff_r5.py` | The oracle (frozen). Read `main`, the arguments (`--visits-file`, `--cap-min`, `--db-name`, `--freeze-only`, resume behaviour, `--retry-failed`), `reset_visits`, `RESET_TABLES` |
| `khanza-r5/tools/p6_dbxml.py` | `retarget <db>` / `restore` / `probe` of both `database.xml` copies |
| `khanza-r5/docs/khanza_r5_release_manifest.md`, `docs/khanza_r5_reproduce.md` | Pins and what is published |
| `khanza-r5/src/consumer/KhanzaBillingConsumer.java` | What the consumer writes (it never writes `detail_nota_jalan`) |

**Key facts (do not re-discover):**
- **Stale payments.** The consumer deletes only `billing` and `nota_jalan` before a re-bill. A
  `detail_nota_jalan` row from an earlier form run survives (visit `2026/10/23/000408`: live
  payment 62,873.2, ledger 204,506; a fresh form run writes 204,506). So on live, B can be stale. The
  oracle's reset (`RESET_TABLES`) deletes `detail_nota_jalan` for the sampled visits before the form
  runs, which makes B fresh. **Your comparison must use B written in your run**, and you must show it
  (audit triggers as in `p12_visit_replay.sh`: the `detail_nota_jalan` INSERTs come from
  `benchmark@localhost`, i.e. the form).
- The box is **mac-mini-vultr**: 2 vCPU, 15 GB RAM, ~71 GB free. One visit through the form took ~6 s
  in the replay (JVM start included). The old 999-visit sample took 8,393 s over 312 date batches
  (~8.4 s/visit). **Measure your own rate in the pilot and report it.**
- The form runs per date batch under Xvfb + faketime; the oracle handles it. Run long jobs detached:
  `(setsid nohup bash X.sh > /tmp/X.log 2>&1 < /dev/null &)`, poll the log. Write remote scripts to a
  file and `scp` them (inline quoting breaks); deploy **LF** copies and compare `sha256sum`.
- Charset: Khanza tables are latin1, the ledger is utf8mb4. Convert the ledger side in joins.
- Cohort: 86,455 DR encounters, 365 days (avg 237/day), 2026-10-01 .. 2027-09-30. 354 of them are
  the October "seed" visits (native-numbered, not `…/8xxxxx`). 1,068 already have a form-saved
  payment; 999 of those are the R4 sample (`/opt/dr-benchmark/r4_sample/B3_sampled_form_diff.csv`).
- After every run both `database.xml` copies must be on `sik` (`python3 /opt/Deers-Rock/tools/p6_dbxml.py probe`),
  no `/opt/dr-benchmark/results/.writer_exclusion_*` file, no benchmark grant on your clone.

## 2. Tasks. Each needs code + a check + a NEGATIVE CONTROL where it is a check

| ID | What | Check | Negative control |
|---|---|---|---|
| T1 | **Sampler** `tools/p13_draw_sample.py` (SELECT-only, deterministic). Eligible = DR encounters **without** any `detail_nota_jalan` row (so previously unsampled), excluding the R4 999. Stratify by month (12) × {seed, generated}; allocate N proportionally with at least 5 per non-empty stratum; draw with `random.Random(20261024)` over `ORDER BY no_rawat`. Output a visits file (one `no_rawat` per line), a CSV with the stratum of each visit, and its sha256. | Run twice: identical sha256. Assert: no ineligible visit, no duplicate, per-stratum counts match the allocation printed. | Plant one ineligible visit (a known R4 visit) into a copy of the output; a verification mode `--verify <file>` must exit 1 and name it. |
| T2 | **Run driver** `tools/p13_wide_sample.sh <stage-name> <visits-file>`: acquire/verify the lock, capture the live-state baseline, build the clone `sik_p13w` (same steps as `p12_visit_replay.sh`, with the 8 audit triggers), retarget `database.xml`, run the oracle `--freeze-only` then the real run for the visit list (read the oracle for how to run a list larger than one 45-minute cap and how to resume: same RUN_ID, same list), restore `database.xml`, keep the clone **until the comparator has run**, then drop it (or keep it if a stop rule fired), live-state proof, release. EXIT trap restores `database.xml` and revokes the grant even on failure. | A run that is interrupted (kill the driver once on a **pilot** of 5 visits) leaves `database.xml` on `sik`, no grant, no writer marker, and the clone listed as KEPT or dropped, never half-state. | The kill test above is the control; show the before/after probe lines. |
| T3 | **Comparator** `tools/p13_sample_compare.py <visits-file> --db sik_p13w` (SELECT-only), per sampled encounter, from the clone after the form run: **A_form** (`billing` value rows bucketed as in `three_count_reconcile_p2.bucket`) vs the ledger **C** per component (rows and amount); **B** (`detail_nota_jalan` besar_bayar+besarppn, exact Decimal half-up) vs C total; and a check that every sampled encounter has exactly one fresh B row written by `benchmark@localhost` (from the audit table). Prints counts, writes a per-encounter CSV, exit 0 only if every encounter is equal on all three. | Counts printed for: encounters, with B, A_form==C, B==C. | On a scratch copy of the clone, change one billing amount by +1 and one payment by +1; the comparator must exit 1 and name **exactly** those two encounters. Assert `ROW_COUNT()=1` for each plant (a first version of the P12 control planted nothing and was vacuous). |
| T4 | **Pilot, then stages.** Stage 0: N=30. Stage 1: N=300. Stage 2: N=3000. Draw each stage separately with T1 (disjoint from the earlier stages: exclude visits already drawn, and say how). Run stage k+1 only if stage k ended with every encounter equal and no stop rule. | Comparator exit 0 per stage; quote its summary line. | Stages are the control for themselves; also quote the rate (visits/min). |
| T5 | **Analysis** in the report (no new tool needed): per stage the counts; the rate; the time per visit; the stratum coverage; any differing encounter with its raw rows (billing lines, payment row, ledger lines). If you give an upper bound on a mismatch rate, give an exact binomial (Clopper–Pearson) 95 % bound and say it assumes simple random draws within strata of a synthetic cohort; **do not claim a population bound beyond that** (R5 §24 and P9-A7 already warn against the rule-of-three claim). | Numbers recomputable from the CSV. | n/a |
| T6 | Freeze the new tools (`chattr +i`, new manifest), pin them in the release manifest, and publish the three scripts + the sample files (visits files and CSVs, sha256) under `khanza-r5/evidence/p13/`. | `sha256sum -c` OK on the box and locally. | n/a |

Do not modify any tool outside your new files. All switches you add are inert unless set.

## 3. What a mismatch means (do not interpret beyond the evidence)

Any differing encounter is a **finding**, not something to fix or explain away. Keep the clone
(your driver needs a keep mode), copy the raw rows into `evidence/p13/`, run the single-visit replay
`DR_LOCK_SESSION=<id> bash p12_visit_replay.sh <no_rawat>` to see whether it reproduces, and stop
(§0.9). Say what you observed; label any cause as a hypothesis unless the evidence proves it.

## 4. Required runs (in this order)

1. `sha256sum -c` of the frozen manifest (15 OK) and the live-state baseline (databases, ledger hash,
   `database.xml` probe, markers, grants, `df -h /`).
2. T1 sampler twice (identical sha256) and its verify negative control.
3. T3 comparator negative control (scratch copy of a clone; both plants named).
4. T2 kill-test on a 5-visit pilot.
5. Stage 0, Stage 1, Stage 2 per T4 and the stop rules.
6. Live-state proof after everything: databases exactly `sik sik_bench`, both `database.xml` on `sik`,
   ledger hash as in §0.3, no writer marker, no benchmark grant on `sik_p13w`/`sik_p6f`, frozen
   manifest 15 OK, lock released.

If a run fails, keep its transcript with `_FAILED` in the name, fix (only in your own files), re-run.
Report every failed run.

## 5. Evidence to save (into `khanza-r5/evidence/p13/`)

Visits files + stratum CSVs + sha256; sampler runs; both negative-control transcripts; the kill test;
each stage's driver log, oracle result files (`B3_sampled_form_diff.csv/.md`), comparator CSV and
summary; the live-state baseline and final proof (addresses redacted); the frozen-manifest checks.
Large raw logs: `tar czf` them, but keep the summary files unpacked.

## 6. Records

- Task doc `khanza-r5/docs/khanza_r5_task_p13_wide_sample.md`, written **before** you change anything
  (copy the P11 task doc layout; fill the rubric at the end).
- R5 report: new `## 25. P13: …` (what ran, every number with its file, "Still not claimed").
- Release manifest: pin the new tools (full SHA-256 of the LF file; local = box).
- QMS record `khanza-r5/records/qms/VER-<date>-DR-KHANZA-R5-P13-001.json` (copy to
  `C:\Users\think\Agentic Layer\qms\records\verifications\`).
- A failure record (`records/failures/` + `C:\Users\think\self-harness\failures\`) for each defect you
  find on the way, and one for any stop rule that fired.
- pm1 trace: `pm1-trace trace --agent opencode --outcome <pass|partial|fail> --slug r5-p13-wide-sample --encoding morse --action "<one paragraph>" --key-files <every file you touched>`,
  copy the `.pm1` to `khanza-r5/records/traces/`, then
  `python C:/Users/think/self-harness/tools/retrace.py --project-root C:/Users/think/Project_v2/Deers-Rock/khanza-r5 --traces-dir C:/Users/think/self-harness/traces`
  must print `Directory is trace-clean.`
- Handoff: add a short `UPDATE (P13)` line to the open-items table of `khanza_session_handoff_20261024.md`.

## 7. Commit (local only)

Commits on `khanza-r5-p6`, message starting `khanza-r5: P13 …`, body listing what changed and the
evidence, ending with `Co-Authored-By: opencode <noreply@opencode.ai>`. Run the secret scan (§0.6)
before every commit. **Do not push.** Put the final hash in the report.

**Time box.** The box is decommissioned around 2026-11-20. Finish stage 2 (or stop by a rule) by
2026-11-10. Expect the main stage to take on the order of 4–8 hours of box time; run it detached and
release the lock if you stop overnight.

## 8. Report template (`khanza-r5/docs/khanza_r5_p13_opencode_report.md`)

```markdown
# P13 opencode report

## Summary
- Outcome: PASS | PARTIAL | FAIL (one sentence why)
- Stages completed: 0 / 1 / 2 (N visits each) and why you stopped, if you did
- Commits (local, not pushed): <hash> <subject>
- Tool SHA-256 (LF, local = box): <file> <sha>

## Results
| Stage | N | with fresh B | A_form == C | B == C | differing encounters | rate (visits/min) |
(quote the comparator summary line for each)

## Per task T1 … T6
- Change / evidence file / exact quoted line / negative-control with-and-without lines / deviations / not done

## Runs
| # | Command | Start–end (UTC) | Exit | Evidence file | Result line (quoted) |
(every run, FAILED ones included)

## Live-state proof (baseline and final, quoted)

## Differing encounters (raw rows) or "none"

## Records
R5 §25, task doc, manifest, QMS, failure records, pm1 trace, retrace output (quoted)

## Rubric self-score (§9)

## Problems found, open items, and anything you are unsure about
```

## 9. Rubric (the orchestrator scores the report against this)

Each item 0 / 1 / 2: 0 = missing or false, 1 = partly done or partly evidenced, 2 = done and evidenced
with quoted lines the reviewer can find. **Any §0 violation caps the total at 0.**

| # | Item | 2 points requires |
|---|---|---|
| R1 | T1 sampler | deterministic (two identical sha256), eligibility/exclusion/allocation asserted, `--verify` negative control exits 1 naming the planted visit |
| R2 | T2 driver | trap restores `database.xml`/grant/marker; kill test shows a clean state; clone never left half-built |
| R3 | T3 comparator | all three comparisons; fresh-B-from-`benchmark` assertion; both plants named, `ROW_COUNT()=1` asserted |
| R4 | Pilot (stage 0) | run, comparator summary quoted, rate reported |
| R5 | Stage 1 | run or a stop rule documented with evidence |
| R6 | Stage 2 | run or a stop rule documented with evidence |
| R7 | Lock and frozen set | lock acquired/released by own id; manifest 15 OK before and after every run, quoted |
| R8 | Live-state proof | baseline and final both quoted, identical; no live writes |
| R9 | Analysis honesty | counts recomputable from CSVs; no population bound beyond the stated assumption; any mismatch shown with raw rows and labelled hypothesis |
| R10 | Mismatch handling | if none, the report says how it would have been handled; if any, kept clone, replay run, stopped per §0.9 |
| R11 | Evidence files | all items of §5 present, summaries unpacked, failed runs kept |
| R12 | Records | task doc written first, R5 §25, manifest pins, QMS, failure records, trace-clean |
| R13 | Report honesty | every claim has a file + quoted line; "not done" stated; deviations listed |
| R14 | Hygiene | LF deploy; secret scan 0; no push; no Kaggle; no frozen-tool edit; commit messages per §7 |

**Evaluation:** total out of 28. **Accept** = no §0 violation, ≥ 24/28, and R1, R3, R7, R8, R9 all at 2.
**Accept with fixes** = no §0 violation, 18–23. **Reject** = any §0 violation or < 18. The orchestrator
re-runs nothing that costs model quota; it checks evidence files, diffs and box state (read-only).
