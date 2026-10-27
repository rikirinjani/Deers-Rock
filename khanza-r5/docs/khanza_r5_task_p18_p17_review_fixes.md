# R5-P18 Task: independent P17 review (11/18 vs 18/18), fixes M1-M16, final state proven last

Written 2026-10-27 BEFORE execution, per task-before-hands. Nothing in this wave has been run or changed on
the box. The commands run so far were local and read-only (greps and `sed` over the committed tree, `git log`).
Source: `docs/khanza_r5_p17_review.md` (to be committed with this doc; reviewer's file
`khanza_r5_p17_review.md`), total **11/18** against the executor's **18/18**; R2 and R9, both critical, are 1,
so the P17 Accept rule fails. The executor's P17 self-score is withdrawn.

**Order (owner instruction):** verify each finding against the source (§1, done), write this doc, **stop for
the owner's OK**, then execute on `mac-mini-vultr` under the run lock with the unfreeze/re-freeze procedure.
Within the execution: first make the box state true (§2 A, M1), then the safety and predicate bytes (§2 B),
then the document and record corrections (§2 C), and the final live-state proof **after the last operation
that touches the box** (§3 step 8). That ordering is the lesson of M1.

**Out of scope:** C3 (closed as "not observable by construction", the review agrees, §6 of the review); the
clean-box rebuild and the third home (the box ends ~2026-11-20); the P14 ledger scope gaps; X2; any Khanza
jar/source edit; any Kaggle run; any git push (all need the owner).

## 0. Hard rules (unchanged from P17, plus two from this review)

- No Kaggle push/run and no git push without the owner. Live `sik`/`sik_bench` are read-only; the ledger pin
  `356355:a66a3a546cc322…` must hold at the start and in the final proof.
- Frozen tools are edited only by the unfreeze/re-freeze procedure (`chattr -i`, originals to
  `.bak_p18_*`, LF bytes, local = box, `chattr +i`, new manifest, `lsattr` transcripts before and after, **with
  hashes in a committed file for every re-freeze, including a fix-up cycle** (M14), re-pin the release
  manifest). Evidence is valid only for the bytes it names.
- Run lock `P18-CLAUDE-<date>` for every driver run; free state captured before acquisition and after release.
- Controls are paired (OLD bytes from `.bak_*` or `git show <commit>:<file>` fail the same setup that the NEW
  bytes pass) or are labelled "new bytes only" **in every place the claim is repeated** (M13). A control is
  described only as strong as its assertion: a NEW arm that expects an error asserts the reason text, an OLD
  arm that expects "the defect" asserts exit 0 and the summary line, not "exit != 2" (M10).
- Every plant asserts `ROW_COUNT()`. **After any text patch, read back the lines around every patched anchor
  and run the changed script's own regression once on the unfrozen bytes before freezing** (P16 and now M2:
  the same defect class twice).
- Before freezing a change to code that other controls extract or stub, grep the controls for the text being
  changed and run them on the unfrozen bytes (P17 failure record 20261027T0600Z).
- A number in a claim is copied from the transcript line that printed it, with its name. A claim whose
  evidence file does not exist is not written (M5, M6, M14).
- No secrets in committed files (the review found a box hostname on the `host=` line of
  `evidence/p17/lock_acquire_unfreeze.txt`; **P18 removes it from the committed copy** and keeps the original
  only in the gitignored area). No sub-agents. A first attempt that is invalid is kept and recorded.

## 1. Verification of the review's findings (source read, 2026-10-27)

"Confirmed" means I opened the line the finding cites and saw it. "Needs box" means the claim is about the
box and cannot be settled from the repository; §2 says which step settles it.

| ID | Sev | Claim | What I read | Verdict | Package |
|---|---|---|---|---|---|
| M1 | major | The "final" live-state proof was taken before the last box operation (the C3 T0 run); the T0 clone is left | `evidence/p17/c3/driver.log` last line: `cleanup-final: sik_dbs=sik,sik_bench,sik_p14e …`; the line before it: `cleanup: clone sik_p14e KEPT`. The chain-b live state was captured at 22:06:14Z, the T0 run started 22:06:44Z, the lock was released 22:10:24Z | **Confirmed.** Whether the clone was dropped afterwards is **needs box** (no transcript exists either way) | A1, E5 |
| M2 | major | The A7 patch put two `basename` lines between `p10_hash_state.py` and `RCH=$?` | `tools/p6_acceptance_suite.sh:700-704`: `python3 … p10_hash_state.py … > p10_preserve_pre.json 2> …hash.err`, then `basename "$OUT" > …p11_preserve_preop.json.run`, `basename "$OUT" > …p10_preserve_pre.json.run`, then `RCH=$?`. `RCH` is the exit code of the second `basename`. Check 30 (`:708`) tests `[ "$RCH" = "0" ]` | **Confirmed.** The check-30 clause is vacuous; both sidecars are written whatever the hash step did | B1 |
| M3a | major | `p15_kill_run_harness` skips a group whose recorded leader has exited | `tools/p15_lib.sh:50`: `[ -n "$pid" ] && kill -0 "$pid" 2>/dev/null \|\| continue`; `rc` stays 0 | **Confirmed by reading.** A leader that is gone while a child survives returns 0 | B2 |
| M3b | major | A live leader whose start time is unreadable is skipped with `rc=0` | `:54`: the `continue` after "not signalled" does not set `rc` | **Confirmed.** A genuine pid reuse deserves a skip; an unverifiable start time does not | B2 |
| M3c | major | `ps -o stat= -g N` selects by session id, not process group | `:38` uses `ps -o stat= -g "$1"`. Git Bash has no procps (`ps: unknown option -- o`), so I could not repeat the reviewer's `procps-ng 4.0.4` experiment locally | **Needs box.** Step 3 repeats it on the box. The fix does not depend on the answer (it filters `ps -e -o pgid=,stat=` by pgid) | B2 |
| M4 | major | `p13_wide_sample.sh` still exits 0 with `database.xml` unrestored; no FORM-INCOMPLETE gate | `tools/p13_wide_sample.sh:144-149`: `$DBXML restore`, `XML_POST=$($DBXML probe …)`, `[ "$XML_POST" = "sik" ] \|\| res "WARN: …"`, no exit. A1/A13 were applied only to `p14_edge_run.sh` | **Confirmed** for the restore. The stop-rule hole (ok=0, bad=0) is read at execution (B3, step 4) | B3 |
| M5 | major | A8's cited evidence line does not exist | `grep -rn drifted evidence/p17` finds only the A31′ check label in `e_nc.log` and `r5_p11_negative_controls_*.md`. The log line is in the source (`sampled_real_form_diff_r5.py:539`, `ALL %d billing rows … drifted`) but runs only inside a P11_ONLY=31 NC run whose oracle log was not copied | **Confirmed.** The hook exists; its output was never captured | B6 |
| M6 | major | The retrace is not trace-clean and D3's P16 output is missing | `evidence/p17/retrace_trace_clean.txt` says `UNTRACED: 1 file(s)` and lists itself. `ls evidence/p16 \| grep retrace` is empty | **Confirmed** | C1 |
| M7 | major | A9 does not exercise the stop rule | `evidence/p17/chain/p17_a_negctl.txt` A9 block: `sukses=true 0, sukses=false 0 (of 27)`, then `FORM-INCOMPLETE`. The stop-rule branch (`p14_edge_run.sh:205-206`, `return 10` when `bad*100 > 2*total`) was not reached. R5 §28's "Not closed: a full driver run with an injected stop-rule failure" is not repeated in §29 l.1697 | **Confirmed**, and the limit was dropped between sections | B4 |
| M8 | minor | A6 has no control; A6b's NEW FAIL is overdetermined | A6b OLD hashes `61ba0f72fb03b6a7 / 61ba0f72fb03b6a7` (A28 PASS); NEW hashes `61ba0f72fb03b6a7 / dcbee9467096d28b` (A28 FAIL). The task doc's premise "the hashes stay equal" is false in the NEW arm | **Confirmed.** The NEW FAIL follows from the hash clause alone, which P15 had | B5 |
| M9 | minor | B1 differs from its spec and can be vacuous | Spec (task doc B1): the manifest gains `predicted_unit`. Implemented: source-row unit prices (`p15_line_identity.py:108,140,143,191-196`). The gate runs only when `exp is not None and su is not None and f is not None`; `unit_src` defaults to `"MATCH"`; no count is emitted. No §7 amendment | **Confirmed** | B7 |
| M10 | minor | Some checks cannot fail or are not anchored to their reason | `p17_b_negctl.sh:116-119` N2 (bash word splitting, no tool); `:41-47` B3a, `:83-85` B4 and N4 NEW arms assert only the exit code; `:45` and the B4/N4 OLD arms accept "exit != 2"; `p17_a_negctl.sh:45` A12 OLD greps a string the OLD code cannot print; the N7 header says "a plant that removed 1 of 18" but no plant runs; `p17_chain.sh:52-56` prints the P13 comparator results with "(x expected)" and asserts none | **Confirmed**, all six | B8 |
| M11 | minor | D1, D2, A10 incomplete | R5 §28 l.1590 "1,240 lines" unannotated; the §28 table header "Control (old bytes vs new bytes)" covers N2/N4 rows; `tools/p16_a_negctl.sh:7` still says "run with oracle_run / the pin check stubbed"; handoff §1 l.17 "21 files total", l.19 Records row "db603eb", l.45 item 22 and l.39 item 16 "119 EQUAL-CTX"; `ROADMAP.md:329,367` "unit 33/33" | **Confirmed**, all five | C3 |
| M12 | minor | The D4 inventory is incomplete | `tools/p17_release_inventory.py:13-14`: the glob `p13_frozen_*.sha256` runs in `/opt/Deers-Rock/tools`; the P13 manifest is at `/opt/dr-benchmark/evidence/p13/r5_p13_frozen_manifest_20261025.sha256` (`p14_live_state.sh:25`). `p6_dbxml.py` is in no `.sha256`, only `docs/khanza_r5_release_manifest.md` | **Confirmed**; `ORDER` entries that match nothing are silently skipped | C2 |
| M13 | minor | Summary documents overclaim "A1-A13 paired" | `ROADMAP.md:338`, handoff item 23, QMS `title` all say "A1-A13 with paired controls"; R5's own table labels A8, A9, A13 unpaired | **Confirmed** | C4 |
| M14 | minor | The fix1 re-freeze has no transcript | `ls evidence/p17`: no file names `.bak_p17fix1`; `local_eq_box.txt` is one line | **Confirmed.** The garbling of `refreeze_lsattr_after.txt` is read at execution (it is a committed file; I did not open it) | C5 |
| M15 | minor | Dates and amendments | Task doc l.219: "Executed 2026-10-27 … 21:03:10Z"; the transcripts say 2026-10-26. `git log -1 a60b100`: `2026-10-27T05:16:11+07:00` = 22:16Z on the 26th; the failure records carry `2026-10-27T06:00:00Z` and `06:10:00Z`, after the commit. AC-7 says "44/44 (plus new cases)" | **Confirmed** for dates. Amendment 4 and "no new unit cases" are the reviewer's reading; I confirm 44/44 and that no unit case was added | C6 |
| M16 | minor | B2 discovery has no transcript; B3's payment-row rule is only inside `fresh`; the C3 poller filter | `p15_line_identity.py:221`: `b[1] == 1` is in the `fresh` expression only, so `--no-fresh-b` skips it. The C3 poller filter and the B2 `SELECT DISTINCT jumlah` transcript are not in `evidence/p17` | **Confirmed** for the code; the two transcripts are **needs box** (reconstructible read-only, step 3) | B7, C7 |

Net: 16 of 16 hold as findings. One (M3c) and two parts (M1's box state, M16's transcripts) need the box.
Two corrections to my own P17 text beyond the review: the P17 task doc's "the hashes stay equal" premise for
A6b was never checked before it was written (M8), and "trace-clean" was written before the output existed (M6).

## 2. Work packages

### A. Make the box state true (first, under the lock)

- **A1 (M1).** Lock free → `lsattr` and live-state baseline (`p14_live_state.sh p18-baseline`, consumer states
  included) → acquire `P18-CLAUDE-<date>`. List databases. If `sik_p14e` (or any `sik_p*` clone from P17)
  exists: confirm it is ours (the P17 T0 run), capture its table count and `database.xml` target, run
  `p14_drop_clone.sh sik_p14e`, capture the drop. Capture `performance_schema.setup_consumers` for
  `events_statements_history_long` and the `performance_schema` variable; assert both are in their baseline
  state. Capture `p14_live_state.sh p18-after-drop`. **If a clone exists that is not ours, stop and report.**
- **A2 (M5 prerequisite, M16).** Read-only discovery on the box, committed as transcripts: (i) `ps` semantics:
  `ps -o stat= -g <pgid>` against `ps -e -o pgid=,stat=` for a leader that is also a session leader and for a
  `setpgid` child (no change to any tool, scratch processes only); (ii) the B2 discovery query
  `SELECT DISTINCT jumlah, biaya, tambahan` on the real billing registration rows of the fixture and a few
  real encounters; (iii) the C3 poller filter: how many statements the unfiltered history had against the
  filtered count, if the T0 data still exists (if not, say so).

### B. Frozen bytes (new manifest `p18_frozen_<date>.sha256`; every changed byte pre-flighted unfrozen)

- **B1 (M2).** `p6_acceptance_suite.sh`: `RCH=$?` immediately after the `p10_hash_state.py` line; each `.run`
  sidecar is written only if its own snapshot step exited 0. Control (new `p18_a_negctl.sh`, paired): extract
  the A30 block, run it with `p10_hash_state.py` stubbed to exit 1; OLD (`.bak_p17`) reports `pre-hash exit=0`
  and check 30's clause passes; NEW reports the failing exit and the clause fails. Read back lines 695-710.
- **B2 (M3).** `p15_lib.sh`: group liveness by pgid without relying on the leader
  (`ps -e -o pgid=,stat= | awk` on the pgid, zombies excluded); a recorded leader that is dead while a group
  member is alive is signalled by pgid (TERM, wait, KILL, confirm); a live leader whose identity cannot be
  verified returns 1 and is not signalled; a genuine pid reuse (started after the pid file) is still skipped
  with a message and `rc` 0 only when the pid is not the leader of any live group of ours. Controls (paired,
  scratch processes in a `run` directory the harness does not use): (a) leader exits, child survives: OLD
  returns 0 with the child alive, NEW kills it and returns 0; (b) unreadable start time on a live leader: OLD
  rc 0, NEW rc 1; (c) the ps selection by session id vs pgid case from A2 (i). Keep all existing A2-A4
  controls and the lib tests 23/23.
- **B3 (M4).** `p13_wide_sample.sh`: port the A1 block (`probe` verified restore, exit 3, `KEEP=1`) and the
  A13 gate (every visit `sukses=true`, else `FORM-INCOMPLETE`, return 10) from `p14_edge_run.sh`, reusing
  the same lines. Control: the A1 and A13 cases of `p17_a_negctl.sh` retargeted at this tail (paired against
  `.bak_p17`). If the P13 driver's structure makes a faithful port impossible, state it and list M4 as a
  limit in R5 §30 instead; the decision is made at step 4 and recorded either way.
- **B4 (M7).** A full driver run whose harness writes `sukses=false` for more than 2 % of visits. Mechanism
  to be chosen at execution after reading the harness log writer: an existing fault hook, or a test-only
  `R5_FAULT_*` env switch in `sampled_real_form_diff_r5.py` (a Khanza-side harness file, not a Khanza jar),
  guarded exactly as the other `R5_FAULT_*` hooks. Assertions: a `STOP RULE[` line, driver exit 1,
  `database.xml` on `sik`, no grant, clone kept. Paired against `.bak_p17` if the OLD driver stops the same
  way (it should: the stop rule is older than A13); otherwise labelled "new bytes only". If no safe injection
  exists, M7 is listed as an open limit in §29's successor and in every summary (M13).
- **B5 (M8).** (i) `P11_ONLY=31 R5_FAULT_RESTORE_FAIL=1` on the P16 suite (`.bak_p16fix1`) and the P17 suite:
  A6's `R31 = restored` clause fails only on NEW. (ii) A6b: the control prints which clause of A28′ failed; an
  arm in which the fixture hash is held equal (a restore-only failure) is added, or A6b is relabelled "the
  hash clause and the R28 clause together" and the §2 premise corrected. Old arm for A6b is P16, not P17, as the
  `R28` clause dates from P16.
- **B6 (M5).** Copy the oracle log of the NC4 run (`R5_FAULT_DRIFT_AFTER_STAGE_COPY`) that contains
  `stage-hash FAULT: ALL … drifted` into `evidence/p18/`. The NC runner is not changed; the log is captured by
  the P18 chain wrapper after the run. If no line appears, A8 is relabelled "indirect: NC4 DISCRIMINATING".
- **B7 (M9, M16).** `p15_line_identity.py`: emit `unit_keys_checked` per encounter and in the summary;
  in expect mode fail an encounter (`unit_src = "UNCHECKED"`, outcome mismatch) when it has drug or procedure
  lines and `unit_keys_checked == 0`; move the exactly-one-payment-row rule (`b[1] == 1`) out of `fresh` so
  `--no-fresh-b` keeps it; record the B1 deviation as an amendment (§7): the comparison is against the source
  row's own unit price, because `p14_edge_fixture.py` stays frozen and the predicted unit is not in the
  manifest. Paired plants (clean scratch, `ROW_COUNT` asserted): a key with source rows but no unit compare
  (OLD MATCH, NEW fails); a second payment row under `--no-fresh-b`.
- **B8 (M10).** `p17_b_negctl.sh` and `p17_a_negctl.sh` (also frozen, so a new `p18_b_negctl.sh` carries
  the corrected versions and the old files are re-run unchanged as history): NEW arms grep the `INPUT-ERROR`
  text; OLD arms require exit 0 plus the summary line; A12 OLD asserts the OLD message is non-empty and
  contains `tables=` without ` (= sik)`; the N7 header is corrected to say the numbers are injected; N2 is
  labelled "not a test of any tool" and removed from the pass count; `p17_chain.sh`'s P13 comparator lines are
  asserted and counted in the final line (new `p18_chain.sh`). Pre-flight each corrected check against the old
  bytes (it must fail where it claims to).
- Also: `p16_a_negctl.sh:7` header (A10) is corrected in the same freeze.

### C. Documents and records (after the last box operation, never before)

- **C1 (M6).** Retrace output committed, **traced first**: create `evidence/p18/retrace_trace_clean.txt` as a
  placeholder, run `pm1-trace` on it (`r5-p18-retrace`), run `retrace`, and only then overwrite the file with
  that run's output (same path, so it stays traced), and commit. The output must say `UNTRACED: 0`. For P16:
  rerun `retrace` now and commit it as `evidence/p16/retrace_trace_clean.txt` with a header saying it was
  produced in P18, or say in R5 that the P16 output cannot be recovered.
- **C2 (M12).** `p17_release_inventory.py` → `p18_release_inventory.py` (still not box-frozen): the P13
  manifest path corrected; `ORDER` entries that match nothing are an error; `p6_dbxml.py` pinned by a new
  line in the P18 manifest. State the inventory scope in the file (the number of files and the manifests
  consulted).
- **C3 (M11).** R5 §28: annotate "1,240 lines" (it is 1,240 comparison entries, V19) and retitle the control
  column of the N2/N4 rows. Handoff: §1 frozen-tool count, Records row, items 16 and 22. `ROADMAP.md`
  unit count 44/44. Strike-throughs in the style of D1 (the old text stays, struck, with the correction).
- **C4 (M13).** Replace "A1–A13 with paired controls" in `ROADMAP.md`, handoff item 23, QMS `title`, and the
  `r5-p17-fixes` trace note with "A1–A5, A7, A12 paired; A6b P15-vs-P17; A8, A9, A13 new-bytes-only". The git
  commit message cannot be changed (pushed); R5 §30 says so.
- **C5 (M14).** Commit the fix1 re-freeze transcript if it still exists on the box (`ls` of
  `.bak_p17fix1_20261027`, `sha256sum` of both files against git `bb3a6d8` and against the manifest b entry);
  regenerate `local_eq_box.txt` with hashes for the 27 files; replace `refreeze_lsattr_after.txt` with a clean
  capture (`lsattr` of the 27 files) and mark the old file as the garbled original.
- **C6 (M15).** Task doc P17 §7: the lock date is 2026-10-26 (strike-through, not an edit); the failure-record
  `timestamp_utc` values are stated as local time labelled Z; AC-7's "plus new cases" is struck as not done.
- **C7 (M16).** The B2 discovery transcript from A2 (ii) and the poller-filter count from A2 (iii) are
  committed under `evidence/p18/`; R5 §30 states that "0 code literals" holds for the filtered statements and
  says what the filter was.
- **Records:** R5 §30; QMS `VER-…-R5-P18-001`; failure records for P17's own defects (M2: a patch glue defect
  twice, with the rule "read back and run the regression before freezing" strengthened to a checklist item in
  this doc; M1: a final proof placed before the last operation; M6/M14: an evidence claim without its file);
  traces `r5-p18-task-doc`, `r5-p18-fixes`, `r5-p18-evidence`, `r5-p18-retrace`; release manifest pins;
  removal of the hostname from the committed `lock_acquire_unfreeze.txt` (a note in the commit says the line
  was redacted, the hash of the original is recorded).

## 3. Required runs (order)

1. Lock status (free), `lsattr` of the 27+ frozen files, live-state baseline, ledger pin; acquire
   `P18-CLAUDE-<date>`.
2. A1: clone check, drop, live state after the drop, consumers.
3. A2: read-only box discovery (ps semantics, B2 discovery, poller filter).
4. Unfreeze, patch on the unfrozen bytes, pre-flight (the changed scripts' own tests and the controls that
   extract or stub the changed text), then deploy LF, local = box, re-freeze, manifest, `lsattr` after,
   transcript with hashes (and again for any fix-up cycle).
5. New controls: `p18_a_negctl.sh` (B1, B2, B3, B5), `p18_b_negctl.sh` (B7, B8). Old controls re-run
   unchanged on the new bytes: lib tests 23/23, `p15_a_negctl`, `p16_a_negctl`, `p16_e_negctl`,
   `p17_a_negctl`, `p17_b_negctl`.
6. B4: the full stop-rule run (own clone, own driver run, dropped after).
7. Regression and C4 rerun on the final bytes (full fresh suite, preservation check, unit test, P11 negative
   controls with the NC4 log captured, line controls, B6, fixture 27/27, real 300/300). This builds clones; each
   is dropped.
8. **Final live-state proof, taken after the last clone drop and the last consumer restore**: databases,
   `database.xml`, grants, ledger pin, grant-line hash, `performance_schema` state, `sha256sum -c` and `lsattr`
   of the frozen files, lock status. Release the lock and capture `RUNLOCK-FREE`. Nothing touches the box
   after this step except `dr_runlock.sh status`.
9. Local: records, R5 §30, retrace (C1), inventory (C2), docs; commit locally; report; wait for the owner
   before any push.

## 4. Acceptance criteria and stated limits

- **AC-1.** The live-state proof is the last box capture and is taken after the last operation; the T0 clone is
  accounted for with a transcript (dropped) or reported (not ours).
- **AC-2.** Frozen bytes verified before and after every phase; `lsattr` `i` on every frozen file; a hashed
  transcript for each re-freeze including any fix-up.
- **AC-3.** B1, B2, B3, B5 and B8: paired as specified, or labelled new-bytes-only everywhere they appear.
- **AC-4.** B4: a `STOP RULE[` line, exit 1, xml back on `sik`, no grant, or an explicit open limit.
- **AC-5.** B7: both plants fail OLD-passes/NEW-fails; `unit_keys_checked` > 0 on the fixture and the real 300.
- **AC-6.** Suite 39/39, preservation PASS, unit 44/44 (stated as no new cases), NC 5/5, lib tests, fixture
  27/27, real 300/300 on the final bytes.
- **AC-7.** The retrace says `UNTRACED: 0` and its output file is committed and traced; the P16 output is
  committed or declared lost.
- **AC-8.** Every number in R5 §30 is copied from a committed transcript line; the claim-vs-transcript table of
  the review is re-run by the executor against the new evidence and attached to §7.
- **Stated limits kept:** V6 (no run-end bound; UPDATEs of the payment row not audited), V13 (grant recovery
  checks inclusion), X2, A11, the clean-box rebuild, the P14 ledger scope gaps, the P13 original summaries, the
  P14 lock release unevidenced, external validity, the advisory lock. **Carried forward explicitly this time:**
  the OLD driver on the A9 injection, A8 without its own control (unless B6 supplies one), the B1 deviation.

## 5. Risks and decisions for the owner

- **B4 injection mechanism.** A test-only hook in `sampled_real_form_diff_r5.py` is a new frozen byte in the
  harness path. Alternative: list M7 as open. I recommend the hook only if its guard matches the existing
  `R5_FAULT_*` pattern and the oracle path is unchanged without the env var (checked by the C4 rerun).
- **B3 port.** If the P13 driver cannot take the A1/A13 lines without a restructure, I list it as a limit
  rather than restructure frozen code under time pressure.
- **Scope of the C4 rerun.** The 300-visit rerun is needed only because `p15_line_identity.py` changes (B7).
  It is the same cost as in P17 (about the same wall time on the box).
- **No Astra v13 before a second independent re-score of P18.** The P17 executor's score was 7 points too high;
  the same author is scoring P18. My P18 self-score is written but not the verdict.

## 6. Rubric (0/1/2, /24)

R1 verification table (§1, every finding opened) · R2 safety (B2, B3, B4; kill function fails closed; P13
driver; stop-rule run) · R3 predicates and control strength (B7, B8; pairs assert their reasons) · R4 recovery
repairs (B1, B5, B6; A6 and A8 evidence) · R5 frozen-byte discipline (hashed transcripts, local = box, `lsattr`,
fix-up cycles) · R6 live-state proof (taken last; the T0 clone accounted for) · R7 regression on the final
bytes (suite, preservation, NC, unit, lib, P16/P17 controls, C4 27 + 300) · R8 document corrections (C3, C4,
C6) · R9 evidence integrity (C1 retrace UNTRACED 0, C5 transcripts, C7 discovery, the A8 line, no claim without
its file) · R10 inventory and manifests (C2, pins) · R11 records (failure records, QMS, traces, hostname
redaction) · R12 honesty (invalid first attempts kept; unlisted limits carried forward; limits restated). Critical
items: R2, R3, R6, R9 must be 2 for Accept. The total is out of 24 (no C3 here). Re-scored by an independent
review before Astra v13.

## 7. Result and self-score

*(filled after execution)*
