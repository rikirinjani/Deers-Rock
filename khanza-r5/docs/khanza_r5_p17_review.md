# R5-P17 independent review (read-only)

Reviewer: independent; no stake in the score. Repo `rikirinjani/Deers-Rock`, branch `khanza-r5-p6`, commit
`a60b100`. Scope: `khanza-r5/` only. Nothing was run against a database or a VPS. All paths below are relative
to `khanza-r5/` unless they start with `ROADMAP.md`.

What I ran locally (self-contained, no network, no DB):
- `sha256sum` of every file in `evidence/p17/r5_p17_frozen_manifest_20261027b.sha256`, compared with the
  committed `tools/` bytes after removing CR. Result: 27/27 equal. I also checked the 9 `.bak_p17` hashes in
  `evidence/p17/lock_acquire_unfreeze.txt` against `git show bb3a6d8:…`: 9/9 equal.
- Every `pinned_sha256` in `evidence/release_inventory.json` compared with the git bytes: 47/47 equal.
- Counted outcomes in `evidence/p17/chain/*_encounters.json` and `*_lines.csv` with Python.
- One `procps-ng 4.0.4` experiment on what `ps -o stat= -g <n>` selects (see M3).
- `git diff bb3a6d8 a60b100 -- khanza-r5/tools`, `git diff 6d1b48d a60b100` on the task doc.

## 1. Verdict

- **My total: 11/18 with R4–R6 not applicable (11/24 if R4–R6 are scored), against the self-score of 18/18.**
- **The self-score is not earned.** The two critical items R2 and R9 are 1, so the task's own Accept rule fails.
  The paired A/B controls that exist are mostly real and well built.
- **Most important defect:** the "final" live-state proof was taken before the last operation on the box (the
  C3 T0 driver run). That run's own transcript ends with `sik_p14e` still present, and nothing shows it was
  dropped. Second: the A7 patch put two `basename` lines between `p10_hash_state.py` and `RCH=$?`
  (`tools/p6_acceptance_suite.sh:700-704`). This is the P16 glue-defect class again, and the executor's
  regression run did not catch it.

## 2. Rubric (§6 of the task doc, 0/1/2)

| # | Mine | Theirs | Reason | Citation |
|---|---|---|---|---|
| R1 | 2 | 2 | All 26 rows give locations. I checked V2, V8, V9, V11, V12 and V17 against the `bb3a6d8` bytes, and the cited lines are correct. V22 is refuted with hashes I could re-verify for `.bak_p17`. One miss: V9's class also exists in the P13 driver (M4). That is a scope gap, not a table error. | task doc §1; `git show bb3a6d8:khanza-r5/tools/p15_line_identity.py` l.177, `p14_edge_run.sh` l.218 |
| R2 | 1 | 2 | A1, A2, A3, A3d, A4, A5 and A12 are paired on the same setup, and the OLD arm really fails (`chain/p17_a_negctl.txt`). But: the kill function still reports success in three cases where processes may survive (M3); the P13 driver still exits 0 with `database.xml` unrestored and has no A13 gate (M4); and A9 never exercised the stop rule (0 `sukses=false` lines), so V10's "full run with an injected stop-rule failure" is still open and is not listed (M7). | `tools/p15_lib.sh:37-61`; `tools/p13_wide_sample.sh:144-149`; `evidence/p17/chain/a9_driver.log:58-59` |
| R3 | 1 | 2 | B1, B2, B3a, B3b and B4 are paired, and each plant asserts `ROW_COUNT()=1` (`chain/p17_b_negctl.txt`). But: N2 is a bash word-splitting check that cannot fail, and it counts as 2 of the 31 passes; B5 asked for the OLD negctl's midnight summary, which was not done. B1 was implemented against the source row's unit price instead of the spec's manifest `predicted_unit`, and that change is not in the §7 amendments. The NEW-arm exit-2 checks (B3a, B4, N4) do not assert the reason, and the OLD arms accept any exit ≠ 2, crashes included (M9, M10). | `tools/p17_b_negctl.sh:41-47,83-85,116-119` |
| R4 | n/a | n/a | T0 stop, pre-registered (see §6 below). | task doc §2 C, AC-6 at `6d1b48d` |
| R5 | n/a | n/a | same | |
| R6 | n/a | n/a | same | |
| R7 | 1 | 2 | A6 (the R31 clause of A31′) has no control at all. A6b's NEW FAIL is overdetermined: the fixture hash also differs (`61ba0f72…` / `dcbee946…`), which contradicts the §2 premise "hashes stay equal", so the control does not isolate R28. A6b pairs P15 against P17, but the R28 clause dates from P16. A7's patch broke `RCH` (M2). A8's cited evidence line does not exist anywhere in `evidence/p17` (M5). | `chain/p17_a_negctl.txt` A6b block; `tools/p6_acceptance_suite.sh:700-704`; R5 l.1645 |
| R8 | 2 | 2 | Manifest b equals git 27/27 (I verified this). On the box, `sha256sum -c` gives 27/27 and `lsattr` shows `i` on 27 (`chain_b.log` step 0 and 3). There are full `lsattr` lists before the unfreeze and at chain start and end. Weaknesses are minor (M14): no transcript for the fix1 cycle, "4/4" has no file, and `refreeze_lsattr_after.txt` is garbled and truncated. | `evidence/p17/*` |
| R9 | 1 | 2 | Baseline, chain final and chain-b final are identical (I checked the grant-line hashes and counts). But chain-b final (22:06:14Z) comes before the C3 T0 run (22:06:44Z). That run toggled server-global `performance_schema` consumers and ends with `sik_dbs=sik,sik_bench,sik_p14e` and "clone sik_p14e KEPT". No later live-state capture and no drop exist (M1). | `evidence/p17/c3_t0.log:14,50`; `c3/driver.log` last line; R5 l.1702 |
| R10 | 1 | 2 | Several items are incomplete. D1: §28 l.1590 "1,240 lines" is unannotated, and the §28 header "Control (old bytes vs new bytes)" still covers the N2/N4 rows. A10: the `p16_a_negctl.sh:7` header still says "oracle_run / the pin check stubbed". D2: the handoff §1 still says "Frozen tools 21 files", the Records row is stale, and item 22 still says "not yet verified". D3: `evidence/p16/retrace_trace_clean.txt` does not exist. D4: the inventory silently skips the P13 manifest and `p6_dbxml.py` (M11, M12). | see M11, M12 |
| R11 | 1 | 2 | The committed retrace output itself says `UNTRACED: 1 file(s)`. "Trace-clean" rests on an appended note, not on a transcript: the V20 pattern repeated (M6). Both failure records carry `timestamp_utc` values (`2026-10-27T06:00Z`) that come after the commit time (`2026-10-26 22:16Z`). | `evidence/p17/retrace_trace_clean.txt`; `records/failures/20261027T06*` |
| R12 | 1 | 2 | The invalid first chain is kept, which is good. But: "A1–A13 with paired controls" appears in the commit message, `ROADMAP.md:338`, handoff item 23 and the QMS title, although A8, A9 and A13 are unpaired and A6 has no control. The A8 citation is not found. Trace-clean is contradicted. The live state is "identical" only up to a point that is not final. Unlisted limits: M4, M7, A6, the B1 deviation, no new unit cases (AC-7). | M5, M6, M13 |
| **Total** | **11/18** | **18/18** | Scored literally (R4–R6 = 0 each): **11/24**. | |

**R4–R6 for a stop.** I accept "not applicable". The stop rule and AC-6 were committed in `6d1b48d` (20:51Z)
before the lock was taken (21:03Z). The §1–§6 text is unchanged in `a60b100`, and the captured query text
supports the stop (§6 below). Scoring R4–R6 as 0 would punish an honest, pre-registered null result. If they
are scored literally against their wording (form-side source, mutation, attributable windows on 27 + 300),
nothing was delivered, and the total is 11/24.

## 3. Findings (most severe first)

**M1, major. The final live-state proof is not final; the T0 clone is left with no evidence of its drop.**
- Where: R5 §29 l.1702; QMS `live_state`; `evidence/p17/chain_b.log` step 3 (22:06:14Z);
  `evidence/p17/c3_t0.log` (driver starts 22:06:44Z; last line "clone sik_p14e KEPT …");
  `c3/driver.log` last line `cleanup-final: sik_dbs=sik,sik_bench,sik_p14e`; `lock_release.txt` (22:10:24Z).
- Failure scenario: the next session's driver refuses to start ("sik_p14e exists"), or a stale clone carrying
  the benchmark fixture rows sits next to live for weeks. Meanwhile the report says the live state ended
  identical to the baseline. The `performance_schema` restore is shown only by T0's own `restore()` echo, not by
  a live-state capture.
- Smallest fix: under a lock, run `p14_drop_clone.sh sik_p14e` and then `p14_live_state.sh p17-post-c3`,
  include the consumer states, commit the transcript, and reword l.1702 to name it.

**M2, major (P16 glue class). The A7 sidecar lines swallowed the post-failure hash's exit code.**
- Where: `tools/p6_acceptance_suite.sh:700-704`. The code is `python3 p10_hash_state.py … > p10_preserve_pre.json`,
  then two `basename "$OUT" > ….run` lines, then `RCH=$?`. So `RCH` is the exit code of `basename`, which is always 0.
  Line 707 then prints `pre-hash exit=$RCH` (`chain/e_preservation.log:3` "pre-hash exit=0" no longer means
  anything), and check 30's `[ "$RCH" = "0" ]` clause is vacuous.
- Failure scenario: `p10_hash_state.py` fails (for example "HASH-STATE ERROR" after a dropped stage table). The
  suite still records exit 0, and both sidecars stamp the failed or empty snapshot as "written by this run".
  Mitigation: in the P10_INJECT flow, check 30 is forced to FAIL anyway, and `p10_preservation_check.sh:157-179`
  would probably fail on `json.load` of an empty file. So the damage is a false evidence line and a dead
  predicate, not a known false PASS. Neither the A7 control (which extracts only the reader block) nor the
  39/39 suite can see it. The P16 rule "read back around the patched lines" was not followed.
- Smallest fix: put `RCH=$?` right after line 700. Write each sidecar only if its own snapshot's exit was 0. Add
  one fault case (`p10_hash_state.py` exit 1, then check 30's RCH clause fails).

**M3, major. `p15_kill_run_harness` can return success while harness processes survive.**
- Where: `tools/p15_lib.sh:50`, `:54`, `:37-38`.
  - (a) l.50 `kill -0 "$pid" || continue`: if the recorded leader (the `bash -c` started with
    `start_new_session`, `sampled_real_form_diff_r5.py:987`) has exited but its children (the JVM) are still in
    the group, the group is skipped and `rc` stays 0.
  - (b) l.54: an alive group leader whose start time is unreadable, or more than 50 ms after its pid file, is
    "not signalled" with `rc` still 0. A genuine reused pid deserves that, but an unverifiable one does not.
  - (c) l.38: `ps -o stat= -g N` selects by **session id** in procps, not by process group. I verified this
    locally: for a background job with pgid 1330 inside session 1326, `ps -g 1330` printed nothing (rc 1) and
    `ps -g 1326` listed it. It is correct today only because the leader is also its session leader. If the
    harness is ever started with `setpgid` instead of `setsid`, the check reports "dead" immediately and skips
    the wait and the KILL.
- Failure scenario for (a): the oracle's timeout handling kills the `bash` leader, or the leader dies, while
  the JVM is still saving. Driver cleanup then sees no live leader, returns 0, restores `database.xml`, revokes
  the grant and drops the clone under a live writer. That is exactly what A3 was meant to prevent.
- Smallest fix: test group liveness by pgid without relying on the leader (`ps -e -o pgid=,stat=` filtered
  on the pgid), and do it even when `kill -0` on the leader fails. Return 1 when a recorded leader is alive but
  its identity cannot be verified. Add a control where the leader exits but a group child survives.

**M4, major (unlisted limit). The P13 driver still reports success with `database.xml` unrestored and has no
FORM-INCOMPLETE gate.**
- Where: `tools/p13_wide_sample.sh:144-149`: `restore`, then
  `[ "$XML_POST" = "sik" ] || res "WARN: …"`, then `exit "$ORACLE_RC"` (l.174). A1 and A13 were applied
  only to `p14_edge_run.sh:208-213,228-235`. The P13 stop rule (l.138) has the same ok=0/bad=0 hole as A13.
- Failure scenario: the restore fails or only half-applies, the oracle exits 0, and the P13 driver exits 0
  while the Khanza app's `database.xml` still points at `sik_p13w`. The trap's retry (l.39) is not verified.
- Smallest fix: port the A1 block and the A13 check into `p13_wide_sample.sh`, with the same paired control as
  A1. Or list it under "Not closed".

**M5, major (claim from intent). A8's cited evidence line does not exist.**
- Where: R5 l.1645 cites "`ALL n billing rows … drifted`" in `chain/r5_p6_acceptance_20261026T214227Z.md`.
  `grep -rn "stage-hash FAULT\|drifted"` over `evidence/p17` finds only the A31′ check label in the NC files.
  The only "all 17 billing rows" line is A22's, a P9 check (`chain/e_suite.log:109`). The hook
  (`sampled_real_form_diff_r5.py:528-539`) runs only in P11_ONLY=31 NC runs, whose oracle log output is not
  captured.
- Failure scenario: `n_u != n_b` raises inside `try`, is logged as "drift UPDATE failed", and leaves
  `drift_done=False`. Indirect evidence that the drift happened: NC4 is DISCRIMINATING (`chain/e_nc.log`).
- Smallest fix: copy the hook's log line from an NC4 run into evidence, or change the citation to "not
  captured; indirect evidence NC4 DISCRIMINATING".

**M6, major (records). The retrace is not trace-clean by its own output, and D3's P16 output is missing.**
- Where: `evidence/p17/retrace_trace_clean.txt`: "UNTRACED: 1 file(s) … Total untraced: 1", plus a hand-written
  note saying it was traced afterwards (`records/traces/r5-p17-retrace.pm1`). No clean run is committed.
  `evidence/p16/retrace_trace_clean.txt`, which §2 D3 requires, does not exist.
- Failure scenario: the same as V20, which this wave set out to fix: "trace-clean" is asserted, not shown.
- Smallest fix: rerun `retrace` after the trace commit, write its output under a name that is itself traced or
  excluded, and commit it. Commit the P16 output, or state that it cannot be recovered.

**M7, major (unlisted limit). A9 does not exercise the stop rule.**
- Where: `evidence/p17/chain/a9_driver.log:58-59`: `sukses=true 0, sukses=false 0`, then FORM-INCOMPLETE. The
  driver exits 1 only because of the new A13 gate. The STOP RULE path (`p14_edge_run.sh:205-206`, `return 10`
  after `bad*100 > 2*total`) is still shown only by the P16 wiring test. Self-score R2 says "A9 a full injected
  run", and R5 §28's "Not closed: a full driver run with an injected stop-rule failure" is not carried forward
  in §29 l.1697.
- Smallest fix: inject a failure that makes the harness write `sukses=false` lines for more than 2 % of visits,
  assert the `STOP RULE[` line and exit 1. Or list it as open.

**M8, minor. A6 has no control, and A6b does not isolate the clause it claims to test.**
- Where: `chain/p17_a_negctl.txt` A6b. OLD hashes are `61ba…/61ba…` and A28 PASS. NEW hashes are
  `61ba…/dcbe…` and A28 FAIL. The NEW FAIL follows from the hash clause alone, which P15 already had. The task's
  premise ("without touching the fixture, so the hashes stay equal") is false in the NEW arm. A6's
  `R31 = restored` clause (`p6_acceptance_suite.sh` A31′ block) never ran with a failing restore.
- Smallest fix: run `P11_ONLY=31 R5_FAULT_RESTORE_FAIL=1` on the P16 and P17 suites. For A6b, print which clause
  failed.

**M9, minor. B1 differs from its spec and can report MATCH vacuously.**
- Where: `tools/p15_line_identity.py` (P17 B1 lines). The comparison is against `rawat_jl_dr.biaya_rawat` /
  `detail_pemberian_obat.biaya_obat`, not the manifest `predicted_unit` the spec required.
  `p14_edge_fixture.py` was not changed or re-frozen, and §7 has no amendment for this. `unit_src_bad` is set
  only when `exp is not None and su is not None and f is not None`. Any key without source rows is skipped,
  `unit_src` defaults to `"MATCH"`, and no count of checked keys is reported. In equal mode (the real 300) there
  is no source-unit gate, although R5 l.1677 speaks of "unit and shape gates". On the fixture, every encounter
  has drug or procedure lines (I checked `chain/fixture_lines.csv`), so the 27/27 is not empty in practice.
- Smallest fix: add a §7 amendment, emit `unit_keys_checked`, and require it to be greater than 0 when drug or
  procedure lines exist.

**M10, minor. Some checks cannot fail or are not anchored to their reason.**
- N2 (`p17_b_negctl.sh:116-119`) tests bash itself, not any tool, and counts as 2 of the 31.
- A12's OLD arm (`p17_a_negctl.sh:45`) greps for a string the OLD code can never print, so it also passes if
  the OLD function crashes. The echoed message saves it as evidence.
- B4 and N4 OLD arms accept "exit ≠ 2", so a crash (exit 1) also passes.
- B3a, B4 and N4 NEW arms assert exit 2 without the `INPUT-ERROR` text. Their output files (`/tmp/p17b_*`) are
  not committed.
- The N7 header says "with a plant that removed 1 of 18". No plant runs; the numbers are injected (the "judge
  level" label is honest, but the header is not).
- In `p17_chain.sh:52-56`, the P13 comparator results are printed with "(x expected)" but not asserted or
  counted in the final line.
- Smallest fix: grep the INPUT-ERROR line, require exit 0 and a summary line from the OLD arms, and drop N2
  from the pass count or label it "not a test".

**M11, minor. D1, D2 and A10 are incomplete.**
- R5 l.1590 "1,240 lines" is unannotated (V19).
- R5 l.1574 header "Control (old bytes vs new bytes)" still covers N2 ("every summary records …") and N4
  ("exit 2 and 2"), with no V18 note.
- `tools/p16_a_negctl.sh:7` still says "run with oracle_run / the pin check stubbed". A10 required that wording
  to change.
- `docs/khanza_session_handoff_20261025.md` §1: the "Frozen tools: 21 files total" and "Records … Latest commits
  db603eb" rows are stale. Item 22 says v12's claims are "not yet verified against the source", which
  contradicts the P17 §1 table. Item 16 still says "119 EQUAL-CTX" with no "historical" mark (D2).
- `ROADMAP.md:367` still says "unit 33/33" (it has been 44/44 since P15).

**M12, minor. The D4 "single effective inventory" is incomplete.**
- `tools/p17_release_inventory.py:15` globs `p13_frozen_*.sha256` in `/opt/Deers-Rock/tools`, but the box P13
  manifest is at `/opt/dr-benchmark/evidence/p13/r5_p13_frozen_manifest_20261025.sha256`
  (`tools/p14_live_state.sh:25`). `manifests_in_order` in `evidence/release_inventory.json` has no P13 entry,
  so `p13_draw_sample.py`, `p13_drop_clone.sh` and `p13_compare_negctl.sh` are missing.
- `p6_dbxml.py`, whose `probe` output format the A1 fix depends on, is in no `.sha256` manifest; it appears
  only in `docs/khanza_r5_release_manifest.md:33`.
- "47/47 agree" is true only of the 47 files listed.
- Smallest fix: correct the path, make the script fail when an `ORDER` entry matches nothing, and add
  `p6_dbxml.py`.

**M13, minor. Summary documents overclaim the pairing.** "A1–A13 with paired controls" appears in the commit
message, `ROADMAP.md:338`, handoff item 23, the QMS `title` and the `r5-p17-fixes` trace. R5's own table labels
A8, A9 and A13 correctly as unpaired or no-control. Fix: "A1–A5, A7, A12 paired; A6b P15-vs-P17; A8, A9, A13
new-bytes-only".

**M14, minor. The fix1 re-freeze has no transcript.** No `lsattr` before or after for `.bak_p17fix1_20261027`
and no hashes. "Local = box … 4/4" (R5 l.1634) has no evidence file. `local_eq_box.txt` is a single assertion
line with no hashes. `refreeze_lsattr_after.txt` has `uniq -c` prefixes on 3 lines and a truncated last line.
Mitigated: manifest b equals git (I verified 27/27) and the box `sha256sum -c` gives 27/27 (`chain_b.log`).

**M15, minor. Dates and amendments.**
- §7 says "Executed 2026-10-27 … 21:03:10Z", but the transcripts say `2026-10-26T21:03Z`. The failure-record
  `timestamp_utc` values are local time labelled Z.
- Amendment 4 ("E2 also covers the preservation check") describes a P16 change. The P17 diff of
  `p10_preservation_check.sh` adds only the sidecar block.
- AC-7 asks for "44/44 (plus new cases)"; there are no new unit cases (`chain/e_unit.txt` 44/44).

**M16, minor.**
- B2's T0 discovery (`SELECT DISTINCT jumlah`) has no transcript. Indirect support: 27/27 and 300/300 pass with
  the `reg_shape` gate.
- B3's "exactly one payment row" is enforced only inside `fresh`, so it is not checked under `--no-fresh-b`.
- The C3 poller (`p17_c3_t0.sh:43`) captures only statements that contain a fixture `no_rawat`,
  `jns_perawatan` or `databarang`, so "0 code literals" is conditional on that filter. The stop does not
  depend on it (§6 below).

**Secrets check:** I found no IP, password or key in the P17 diff. A box hostname appears on the `host=` line of
`evidence/p17/lock_acquire_unfreeze.txt`. I did not quote it.

## 4. Claim vs transcript

| Claim (where) | Transcript line | Status |
|---|---|---|
| 37/37 (§7 R2, R5) | `chain/p17_a_negctl.txt` last line `P17-A-NC: PASS=37 FAIL=0` | matched |
| 31/31 (§7 R3) | `chain/p17_b_negctl.txt` `P17-B-NC: PASS=31 FAIL=0` | matched (2 of the 31 are N2, see M10) |
| 23/23 lib (QMS) | `chain.log` 1a `P15-LIB-TEST: PASS=23 FAIL=0` | matched |
| 9/9 P15 A1–A3 | `chain.log` 1b `P15-A-NC: PASS=9` | matched |
| 27/27 fixture, DIFFER 12 / EQUAL 12 / EQUAL-SRC 3 | `chain/fixture_lines_summary.json`; my count of `fixture_lines_encounters.json`: 27 MATCH, `unit_src` 27 MATCH, `reg_shape` 27 MATCH | matched |
| 300/300, 1,240 comparison entries, EQUAL 181 / EQUAL-SRC 119, B = A 300, fresh-B 300 | `chain/real300_lines_summary.json`; `real300_lines.csv` has 1,241 lines including the header; `B_rows` = 1 for all 300 | matched |
| P13: ALL-EQUAL 300/300, no `--since` exit 2, future exit 1, duplicate exit 2 | `chain.log` 3c | matched (printed, not asserted) |
| 33/33 line controls | `chain/line_negctl.txt` `P15-LINE-NC: PASS=33` | matched |
| 6/6 B6 | `chain/b6_negctl.txt` `P15-B6-NC: PASS=6` | matched |
| PASS=39 | `chain.log` 4a | matched |
| Preservation PASS, sidecar-bound | `chain.log` 4b `SNAPSHOT-BINDING … written by this run`, `PRESERVATION-CHECK PASS` | matched (but see M2: the A30 "pre-hash exit=0" line in `e_preservation.log:3` is meaningless) |
| 44/44 | `chain/e_unit.txt` last line | matched; "(plus new cases)" not found |
| NC 5/5 | `chain.log` 4d `DISCRIMINATING=5` | matched |
| 27 files (manifest b) | 27 lines; I verified 27/27 against git; `chain_b.log` "27/27 OK; lsattr i-flag: 27" | matched |
| 27 files `.bak` equal git (V22) | `bak_equals_git.txt`: 10 + 8 + 9 MATCH lines | matched (no hashes listed; `.bak_p17` independently matched by me) |
| 25/25 manifest a | `chain.log` steps 0 and 5 | matched |
| Local = box 12/12 | `local_eq_box.txt` one line | matched (as an assertion only) |
| Local = box 4/4; `.bak_p17fix1` (2 files) | none | **not found** |
| A12 1,179 tables | `chain.log` step 2, `chain/p17_a_negctl.txt` "tables=1179 (= sik)" | matched |
| A9: 0 of 27 `sukses=true`, exit 1, xml on sik, no grant, clone kept then dropped | `chain/a9_driver.log:58-62`, `p17_a_negctl.txt` A9 block | matched |
| A8 "`ALL n billing rows … drifted`" in the suite evidence | none in `evidence/p17` | **not found** |
| A6b "real restore failure … hashes stay equal" (task doc §2) | NEW arm `61ba0f72… / dcbee946…` | **contradicted** (R5 §29 does not repeat the claim) |
| C3: 2,874 statements; long=NO restored; (iv) 27/27 | `c3_t0.log`; `c3/fixture_lines_summary.json` | matched |
| C3: 0 code literals | `c3_t0.log` "rows with a kd_jenis_prw literal: 0 …" | matched (conditional on the poller filter) |
| Retrace trace-clean (§7 R11, R5 l.1693, AC-8) | `retrace_trace_clean.txt` "UNTRACED: 1 file(s)" | **contradicted** |
| Live state identical at the final (R5 l.1702, QMS) | `chain_b.log` final (22:06Z) identical; then `c3/driver.log` `sik_dbs=…,sik_p14e` | **contradicted for the end state** |
| Grant-line hash ×3 | `grant_line_hashes_p17.txt` | matched |
| Inventory 47 / 47 agree | `release_inventory.json`; 47/47 equal git by my check | matched (incomplete scope, M12) |
| Lock 21:03:10Z – 22:10:24Z, free before and after | `lock_free_and_lsattr_before.txt`, `lock_acquire_unfreeze.txt`, `lock_release.txt` | matched (the date is 2026-10-26, not -27) |

## 5. Not verifiable from the repo alone

- Whether `sik_p14e` was dropped after T0, and the box state at lock release. A post-T0 `p14_live_state.sh`
  transcript would settle it.
- Whether the box's `p6_dbxml.py probe` always prints `[dbxml] …` lines. A1's NEW branch depends on it; the C4
  and A9 logs show it working once. Settled by a pinned hash of `p6_dbxml.py` plus a probe transcript.
- Whether A8's `n_u == n_b` assertion ever ran. Settled by the oracle log of an NC4 run.
- The OLD-arm outputs for B4 and N4 (`/tmp/p17b_p13old.txt`, `/tmp/p17b_n4old.txt`, not committed), which would
  show whether OLD exited 0 for the right reason.
- The B2 discovery read of a real registration row.
- `.bak_p17fix1` contents and the local = box 4/4 comparison.
- Whether `retrace` is clean now. Settled by a fresh committed run.

## 6. C3 stop: is it supported?

Yes. `c3/form_queries.txt` holds the full procedure and drug queries (544 and 644 characters, both
ending in their `group by`, so not truncated at the 1024-character limit). Its select list is `jns_perawatan.nm_perawatan, rawat_jl_dr.biaya_rawat, count(…), sum(…)`
and it ends `group by jns_perawatan.nm_perawatan`. The drug query selects `databarang.nama_brng, jenis.nama, …`
and groups by `kode_brng`. No code column is selected, so no channel, whether SQL text or result set, carries
a code to the form. The R5 remark that a JDBC proxy could capture result sets is beside the point, because the
result sets carry names too.

Astra's mutation (source row J000840 changed to J000844, same name and price) changes only the source rows. The
form then bills the same name and price, and only the ledger can disagree. That was already shown discriminating
in P15 C2. The stop was pre-registered (§2 C stop rule, AC-6 at `6d1b48d`) and was not premature. It is
incompletely closed out, though (M1).

## 7. Astra v13 on these bytes?

**No, not yet.** A paid external run would read R5 §29 claims that this review found unsupported (M1, M5, M6)
and assess frozen bytes with a known new defect (M2). Fix these first, under a lock, in a short P18:
1. M1: drop or confirm `sik_p14e` and take a post-T0 live-state capture.
2. M2: the `RCH` placement, with a one-case control.
3. M3: kill function fails closed (pgid-based liveness, unverifiable leader means rc 1) and a
   leader-dead/child-alive control.
4. M4: A1 and A13 ported to the P13 driver, or listed.
5. M5 and M6: a real A8 line and a committed clean retrace (P16 and P17).
6. M7: a stop-rule full run, or list it.
7. M11, M12, M13: the wording fixes.

Then rerun the regression (suite, preservation, NC, the P17 A/B controls) on a new manifest. C3 needs no more
work. v13 should be told that C3 is closed as "not observable by construction" and should not ask for a form-side
mutation.
