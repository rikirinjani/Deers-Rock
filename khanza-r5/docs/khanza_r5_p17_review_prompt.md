# Prompt: independent review and re-score of R5-P17

Paste everything below the line into a fresh Cloud session (repo `rikirinjani/Deers-Rock`, branch `khanza-r5-p6`, commit `a60b100`). The session has no access to the box; the review is read-only on what is committed.

---

You are an independent reviewer. You did not write this work and you have no stake in its score. Your job is to find out whether the executor's self-score of **18/18 (R4-R6 not applicable)** is earned. A previous wave (P15) self-scored 23/24 and an independent review gave 17/24, so assume the self-score may be inflated and check it.

## Setup
- Repo `rikirinjani/Deers-Rock`, branch `khanza-r5-p6`, commit `a60b100`. Work only under `khanza-r5/`.
- Read-only. Create exactly one file: `khanza-r5/docs/khanza_r5_p17_review.md`. Do not edit anything else. Do not run anything against a database or a VPS (you have none). You may run the Python/shell tools locally if they are self-contained, and say what you ran.
- The repo is public. Do not write or quote any IP address, hostname, password or key if you happen to see one; report its location instead.

## What to read first
1. `khanza-r5/docs/khanza_r5_task_p17_astra_v12_safety_and_c3.md`: §1 (26 verified findings V1-V26), §2 (work packages A-D), §5 (acceptance criteria and stated limits), §6 (rubric R1-R12, 0/1/2), §7 (the executor's result and self-score).
2. `khanza-r5/docs/khanza_benchmark_report_R5.md` §27, §28, §29.
3. `khanza-r5/evidence/p17/` (chain, chain_b, c3, lock files, manifests, `bak_equals_git.txt`, `retrace_trace_clean.txt`) and `khanza-r5/evidence/release_inventory.json`.
4. The tools named in §7 under `khanza-r5/tools/`, and `git diff bb3a6d8 a60b100 -- khanza-r5/tools`.
5. Records: `khanza-r5/records/failures/20261027T06*`, `records/qms/VER-2026-10-27-DR-KHANZA-R5-P17-001.json`.

## What to check (do each; cite file and line or the transcript line)
1. **Claim vs transcript.** For every number in §7 and in R5 §29 (37/37, 31/31, 23/23, 9/9, 27/27, 300/300, 1,240 comparisons, EQUAL 181 / EQUAL-SRC 119, 33/33, 6/6, PASS=39, 44/44, NC 5/5, 27 files), find the evidence line that printed it. Mark each as: matched, not found, or contradicted. P15's failures were claims written from intent, not from transcripts.
2. **Paired controls.** For each control described as "old vs new" or "paired" (A1-A5, A12, B1-B4, N4, N7, N8), confirm that both arms ran on the same setup and that the old arm really fails. Check that plants assert `ROW_COUNT()`. Flag any control whose wording is stronger than what it does (the executor labels N7 judge-level, N2 mechanism-only, A8 unpaired, A9 new-bytes-only; check those labels are honest and complete).
3. **Test-the-test.** Read the new tools for tests that cannot fail: stubs that always succeed, greps that match their own echo, counts that are not asserted, shell glue like `: > file` swallowed into a neighbouring line (this happened in P16).
4. **Safety logic.** Read `p15_kill_run_harness`, `p15_proc_start_ms`, `p15_group_alive`, the cleanup exit-3 paths in `p14_edge_run.sh` and `p13_wide_sample.sh`, and the A13 `FORM-INCOMPLETE` gate. Look for a path where cleanup reports success while a process survives, an xml restore is unverified, or a flag is set for something the run did not do.
5. **Predicates (B1-B4).** In `p15_line_identity.py` and `p13_sample_compare.py`: does fresh-B (exactly one INSERT total, by `benchmark@`, at or after run start, one payment row), the expect-mode visit-set equality, source unit price compare (B1) and registration shape `jumlah=0, biaya=0, tambahan=0` (B2) do what §2 says? Can any of them pass vacuously on empty input?
6. **C3 stop.** The executor stopped at the discovery gate: the Khanza billing form never receives a charge code, so form-side provenance is not observable. Read `evidence/p17/c3/`. Is that conclusion supported by the captured queries and shapes, or was stopping premature? Was the stop pre-registered as an allowed outcome in §5 (AC-6)? Is "R4-R6 n/a" a fair scoring of a stop, or should a stop cost points?
7. **Frozen-byte discipline.** Do the manifests, `lsattr` captures and `bak_equals_git.txt` support "local = box = git" for the 27 files? Is any tool changed after its manifest hash?
8. **Honesty of the limits.** §5/§7 list: OLD driver not run on A9; A8 no own control; V6 no run-end bound or UPDATE audit; V13 inclusion-only; X2; A11; clean-box rebuild; P14 ledger scope; P14 lock release unevidenced. Are there limits the executor did not list? Any statement in R5 §29, the handoff or ROADMAP that overclaims?
9. **Strike-throughs (D1).** Confirm the P15/P16 overclaims (V1 "1,100 tables", V10 "oracle stubbed", V18 "N1-N8 paired", V20 retrace) are corrected in the documents and not repeated in new text.

## Scoring
Re-score §6 rubric R1-R12 on the 0/1/2 scale, using only what the repo evidences. Give each item: your score, the executor's score, and one to three sentences of reason with a citation. Treat R4-R6 as the task doc defines them for a T0 stop; if you think a stop should score differently, state your score and why, and also give the total both ways (with R4-R6 excluded, and with them scored). Do not round up for effort.

## Output format (`khanza_r5_p17_review.md`)
1. Verdict in three lines: your total vs 18, whether the self-score is earned, the one most important defect.
2. Rubric table (R1-R12: yours, theirs, reason, citation).
3. Findings, most severe first, each with: ID (M1, M2, ...), severity (blocker / major / minor), what is wrong, the exact location, a concrete failure scenario, and the smallest fix.
4. Claim-vs-transcript table from check 1.
5. Things you could not verify from the repo alone, and what evidence would settle them.
6. Whether Astra v13 (a paid external run) should go ahead on these bytes, and what must be fixed first.

Be adversarial and specific. "Looks fine" is not a finding; say what you opened and what you saw. If a check finds nothing, say so in one line.
