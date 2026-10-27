# R5-P20 Task: independent P19 review (20/24 vs 23/24), fixes O1-O6, documents that no longer say more than the code does

Written 2026-10-27 BEFORE execution, per task-before-hands. Nothing in this wave has been run or changed on the box.
The commands run so far were local and read-only (greps and `sed` over the committed tree, `git log`, one `pm1-retrace`
run, a JSON recount). Source: `docs/khanza_r5_p19_review.md` (independent, local, read-only): **20/24** against the
executor's **23/24**; R4, R9 and R12 are 1, so the Accept rule (R2, R3, R6, R9 = 2) fails on R9. The P19 self-score is
withdrawn. The review says the **bytes are fit for Astra v13 and the documents are not yet**; it confirms N1, the
equal-mode unit gate (AC-5), N5a, N6 and the final-state ordering as real. P20 is small: one missing log pattern, one
control that cannot fail for the reason it names, and the sentences and records that again said more than the evidence.

**Order (owner instruction):** verify each finding against the source (§1, done), write this doc, **stop for the owner's
OK**, then execute on `mac-mini-vultr` under the run lock with the unfreeze/re-freeze procedure. The documents-only
items (§2 C) need no box access and are done after the last box operation. The final live-state proof is the last box
capture.

**Out of scope:** the clean-box rebuild and the third home (the box ends ~2026-11-20); the P14 ledger scope gaps; V6, V13,
X2, A11; the P13 driver's EXIT-trap restore and A8's failing branch (stated limits, accepted by the review for v13); any
Khanza jar/source edit; any Kaggle run; any git push.

## 0. Hard rules (unchanged from P19, with two clarifications)

- No Kaggle push/run and no git push without the owner. Live `sik`/`sik_bench` are read-only; the ledger pin
  `356355:a66a3a546cc322…` must hold at the start and in the final proof.
- Frozen tools are edited only by the unfreeze/re-freeze procedure (`chattr -i`, originals to `.bak_p20_*`, LF bytes,
  local = box by hash, `chattr +i`, new manifest, `lsattr` before and after, a hashed transcript for **every** re-freeze).
- Run lock `P20-CLAUDE-<date>`; free state captured before acquisition and after release.
- Controls are paired (OLD arm = the right predecessor's bytes) or labelled "new bytes only" everywhere the claim is
  repeated. **Clarified (the review found §0 and B6 of P19 disagreeing):** a NEW arm that expects an error asserts the
  reason text; an OLD arm that expects "the defect" asserts the exit code **the old code actually gives** and the summary
  line, never a range that a crash would also satisfy.
- Every plant asserts its affected-row count. After a text patch, read back the lines around every anchor.
- **Pre-flight rule, now without an exception:** every file in the new manifest is run once on the unfrozen bytes before
  the freeze and again after any later edit — the wrapper (`p20_chain.sh`, via a `P20_SHORT=1` mode that skips the clone
  builds, the suite and the real-300 run but runs every new assertion) and the inventory generator's success path
  included. Each pre-flight transcript starts with `sha256sum` lines of the files under test (the review could not
  show that the pre-flighted bytes are the frozen bytes).
- **A sentence in a document that states what a gate or a control does is checked against the code line it describes
  before it is written** (open the line; run the exact lines on the shape the sentence names). A cause stated in a report
  is checked against the data that shows it (O3).
- A number in a claim is copied from the transcript line that printed it. Records are stamped with `date -u` at write
  time. No secrets in committed files. No sub-agents. A first attempt that is invalid is kept and recorded, and every
  pre-flight iteration is listed.

## 1. Verification of the review's findings (source read, 2026-10-27)

| ID | Sev | Claim | What I read | Verdict | Package |
|---|---|---|---|---|---|
| O1 | major (claim) / minor (impact) | `p15_oracle_batch_failed` misses the oracle's stage-drop failure; handoff item 25 says a FAILED batch can no longer end `P15E OK` | `tools/p15_lib.sh:57` greps `': FAILED \(\|STAGE-RESTORE-ERROR\|NOT restored'`. `sampled_real_form_diff_r5.py:943` logs `STAGE-DROP-FAILED %s_*: errors=… (box NOT clean; verdict forced fail-closed)` (neither `NOT restored` nor `: FAILED (`); `:1801,1806` log `STAGE-KEEP … (box NOT clean)`; `:1811-1817`: `drop_ok = False` → `failed_batches = failed_batches or ["stage-drop"]` → `exit_code = 4`. `docs/khanza_session_handoff_20261025.md:48` contains the sentence. A clean run has no such line: the P19 `c4_driver.log` shows none of the patterns, but the driver log only contains a grep subset of the oracle log, so the false-trigger test has to use the oracle's own logs | **Confirmed.** A stage-drop failure with all visits `sukses=true` ends `P15E OK` | B1, C2 |
| O2 | minor | The N5b NEW arm passes without the fix | `tools/p19_a_negctl.sh:81` `kill_rc` runs `bash -c … 2>/dev/null; echo $?` and the arm asserts `rc/child` only. With the `ga = 2` branch deleted, the dead-leader branch continues to `p15_group_is_harness`, which also needs `ps`, finds no member, and returns 1 with a different message. The outcome is the same, so the pair does not show the fix. (I read the code path; the review's mutant run is the evidence for "passes without the fix".) Also nothing exercises value 2 in the TERM wait loop or the post-KILL confirmation (`p15_lib.sh:101-103`) | **Confirmed by reading** | B2 |
| O3 | minor | R5 §31 gives a wrong cause for `pass` being False on live | R5 l.1811 "because the payment sum differs there"; `evidence/p19/preflight/a2_live_equal_encounters.json`: `B == ""` and `B_rows == 0` for **all 300** (my recount): there is no payment row on live for these visits. The sentence and `a2_live_equal.txt` ("it is the payment column") are mine | **Confirmed**; my statement of a cause I had not looked up | C1 |
| O4 | minor | The AMBIGUOUS/UNMAPPED exclusion from the unit count is in no plan item, amendment or control | `tools/p15_line_identity.py:196` `… and not str(key[1]).startswith(("AMBIGUOUS:", "UNMAPPED:"))`; P19 §2 B1 says only "drop `exp is not None`"; §7 lists 8 amendments, none is this. Not a hole: such an encounter's verdict is `AMBIGUOUS`/`UNMAPPED`, which fails equal mode (`pass` needs EQUAL/EQUAL-SRC) and expect mode (`line_ok` is `verdict == "DIFFER"` when a delta is expected, else EQUAL/EQUAL-SRC) | **Confirmed** (deviation unrecorded, no control) | B3, C3 |
| O5 | minor | AC-7 ("repeatable from the committed traces") is not met and is scored as met | `evidence/p19/retrace_trace_clean.txt:31` `UNTRACED: 44 file(s)` (second run, cut to 20 lines); task doc l.189 and l.286 | **Confirmed** | C4 |
| O6a | minor | No copy transcript for the read-only evidence copies after the final capture | `evidence/p19/` has none; P19 §3 step 6 says "each copy is listed" | **Confirmed** | B4 (wrapper), C5 |
| O6b | minor | QMS P19 `not_done` omits the pre-flight gaps and O5 | `records/qms/VER-2026-10-27-DR-KHANZA-R5-P19-001.json` `not_done` | **Confirmed** | C5 |
| O6c | minor | Stale step labels in the frozen chain | `tools/p19_chain.sh` step 1e and 3d read "(history, on the P18 bytes)" where the bytes are the P19 bytes | **Confirmed** | B4 (new chain) |
| O6d | minor | An empty or garbled pid file is skipped with rc 0 | `tools/p15_lib.sh:72-73`: `pid=$(tr -dc 0-9 < "$f"); [ -n "$pid" ] \|\| continue` | **Confirmed by reading** (not plausible with the harness's `f.write(str(p.pid))`, but not "fails closed") | B1 |
| R4/R12 notes | — | "never `exit <= 1`" (P19 §0) vs "0 or 1" (B6) | task doc P19 §0 and §2 B6 disagree; the code follows B6 and asserts the summary line | **Confirmed**, N2 closed in substance | §0 clarification |

Net: all findings hold. O3 is a wrong cause I wrote without looking it up; O1 is a sentence in the handoff that the code
contradicted for the second time (P18 N1 was the first).

## 2. Work packages

### A. Read-only on the box (first, under the lock, before any byte changes)

- **A1.** Lock status free → `lsattr` of the 35 files → live-state baseline (`p14_live_state.sh p20-baseline`) plus
  `performance_schema` consumers → acquire `P20-CLAUDE-<date>`. The transcript names the command behind each line
  (the review could not tell what produced "processes … 0").
- **A2.** Read-only provenance the review could not verify: `ls -l --time-style=full-iso` of
  `/opt/dr-benchmark/p19/preflight/` (when the A2 discovery ran relative to the 08:42:32Z unfreeze), `sha256sum` of
  `/opt/dr-benchmark/p19/preflight/p15_line_identity.py` and of the frozen `p15_line_identity.py` (the A2 bytes),
  and the file list of the clean P19 oracle logs under `/opt/dr-benchmark/p15/runs/fixture/` and `…/real/`
  (`oracle_<TS>.log` of the P19 chain's C4 run, `TS` `20261027T0921…`), which B1's false-trigger control uses.

### B. Frozen bytes (new manifest `p20_frozen_<date>.sha256`; **every** file pre-flighted on unfrozen bytes)

- **B1 (O1, O6d). `p15_lib.sh`** (the only changed existing file; originals to `.bak_p20_*`):
  1. `p15_oracle_batch_failed` also matches `STAGE-DROP-FAILED` and `STAGE-KEEP` (the oracle's own words for a stage drop
     it could not verify and for stage tables it holds because a batch is not restored or is FAILED).
  2. `p15_kill_run_harness`: a `.pid` file that exists but contains no digits is "NOT CONFIRMED" (message, `rc=1`,
     `continue`) instead of a silent skip. A file that does not exist, or a pid with no process and no group, is unchanged.
- **B2 (O2). `p20_a_negctl.sh`** (new): 
  1. **O1 control, one pattern at a time** (the P19 control put all three patterns into one canned log): `oracle_run`
     extracted from the OLD (P19) and the NEW driver (the driver bytes are unchanged, so both arms run it; the pair is the
     OLD and NEW **lib**) and run with the oracle shadowed by a function and `p15_count_sukses` all `true`: six canned
     logs, one pattern each (`: FAILED (`, `STAGE-RESTORE-ERROR`, `NOT restored`, `STAGE-DROP-FAILED`, `STAGE-KEEP …
     not verifiably restored`, `STAGE-KEEP … held for --retry-failed`). The first three return 10 in both arms; the last
     three return 4 with OLD (the defect) and 10 with NEW. A clean canned log returns 4 in both arms.
  2. **False-trigger test on real oracle logs:** the helper applied to the P19 chain's clean oracle logs (from A2) returns
     "no match", and to the P18 B4 log (`/opt/dr-benchmark/p18/chain/b4_stop_rule_driver.log`) returns "match". In the chain
     (§3) it is also applied to the chain's own C4 oracle logs and must return "no match".
  3. **O2 control:** `kill_rc` keeps stderr. N5b NEW asserts rc 1, the child alive **and** the message `ps failed while
     looking for group`; the same case against a **mutant** of the NEW lib (the `if [ "$ga" = 2 ]` block deleted by `sed`,
     checked to differ from the NEW lib) asserts rc 1 but the *other* message (`no member looks like this run's harness`),
     so the reason text distinguishes the fix; a case where `ps` fails only after the TERM (a shadow `kill` creates a flag
     file that makes `ps` fail), which exercises the wait loop and the confirmation step: rc 1 and `still alive (or
     unknown) after KILL` (OLD-P19 and NEW behave the same there; it is new coverage, not a pair).
  4. **O6d control:** an empty pid file and a pid file with letters only: OLD rc 0, NEW rc 1 and the message; a pid that
     names no process and no group: rc 0 in both; a missing pid file: rc 0 in both.
- **B3 (O4). `p20_b_negctl.sh`** (new, on the chain's fixture clone scratch copy as `p19_b_negctl.sh`): an AMBIGUOUS
  encounter in **each** mode (a duplicate `jns_perawatan` row with the same name and a new code, plus a copy of the
  encounter's `rawat_jl_dr` row under that code, so both candidates are in the source rows; ROW_COUNT asserted for both
  plants): the encounter's verdict is `AMBIGUOUS` and it fails in expect mode (outcome MISMATCH) and in equal mode
  (`pass` False) with `unit_keys_unchecked` = 0 for it. The comparator bytes are unchanged, so this is **new coverage on
  the same bytes**, labelled as such; the plant shape is discovered once under the unfrozen pre-flight before it is asserted.
- **B4. `p20_chain.sh`** (new): the P19 chain with the labels corrected (O6c), `p20_a` and `p20_b` added, the helper applied
  to the chain's own C4 oracle logs (step 3, asserted), `P20_SHORT=1` mode for the pre-flight, and a step that copies the
  evidence **through a wrapper that logs every read-only box command with its time** into
  `evidence/p20/copy_log.txt` (O6a). `p20_release_inventory.py` (new): the P19 inventory script with the P20 manifest in
  `ORDER` (its success path is pre-flighted too).

The new frozen set = the 35 P19 files (with `p15_lib.sh` re-pinned) plus `p20_a_negctl.sh`, `p20_b_negctl.sh`,
`p20_chain.sh`, `p20_release_inventory.py` = **39** files.

### C. Documents and records (documents-only items first; none needs the box)

- **C1 (O3).** Strike-through (not edit) of R5 §31 l.1811 "because the payment sum differs there" with the corrected cause
  ("live has no payment row for these visits: `B` empty and `B_rows` 0 for all 300"); `evidence/p20/erratum_p19.md` also
  corrects `evidence/p19/a2_live_equal.txt` ("the payment column").
- **C2 (O1).** Handoff item 25: the sentence "a FAILED oracle batch can no longer end `P15E OK`" struck with the P19 limit
  (the stage-drop path was missing) and, after the P20 chain, re-stated with the exact patterns the helper matches.
- **C3 (O4).** Amendment 9 to the P19 task doc §7, appended as a dated addendum (not an edit of amendments 1–8): the
  AMBIGUOUS/UNMAPPED exclusion in the unit count, its reason, and the B3 control.
- **C4 (O5).** AC-7 of P19 marked "partly" in an addendum. To make the retrace repeatable from the repository, the traces
  in `~/self-harness/traces` whose `key_files` name `khanza-r5` paths and are not yet in `records/traces/` are copied there
  **if their number is at most 300** (otherwise the full second-run list is committed instead, with the count); the second
  retrace run is committed in full (not cut to 20 lines). The two gitignored env-file names it lists are explained; no
  content is read. The claim of the retrace file is the run it actually shows.
- **C5 (O6a, O6b).** `evidence/p20/copy_log.txt`; the amendment note on the P19 QMS record (the pre-flight gaps, O5, the
  withdrawn self-score, the independent 20/24); the `evidence/p19/local_eq_box_manifest.txt` header (command and time) is
  regenerated as `evidence/p20/local_eq_box_manifest_p19.txt` with the command, and the same for P20.
- **C6. Records.** R5 §32; QMS `VER-…-R5-P20-001`; failure records (a sentence from intent for the second time: O1; a
  control that cannot fail for the reason it names: O2; a stated cause not looked up: O3), each stamped with `date -u` at
  write time; traces `r5-p20-*`; the retrace committed after tracing its own placeholder; release manifest pins;
  handoff item 26; ROADMAP.

## 3. Required runs (order)

1. Lock status (free), `lsattr` of the 35 files, live-state baseline, ledger pin; acquire `P20-CLAUDE-<date>`.
2. A1 and A2 (read-only).
3. Unfreeze `p15_lib.sh`; patch on the unfrozen bytes; deploy the new files; **pre-flight every file**, each transcript
   starting with `sha256sum` of the files under test: `p15_lib_test.sh` (23/23), the history controls that extract or stub
   lib text (`p15_a`, `p17_a`, `p18_a`, `p19_a`), `p20_a_negctl.sh`, `p20_chain.sh` with `P20_SHORT=1`,
   `p20_release_inventory.py` (a temporary manifest copy so that the success path runs), and on a fixture clone
   `p20_b_negctl.sh`, `p19_b`, `p18_b`, `p17_b`, `p15_line_negctl.sh`. Read every output; fix; pre-flight again after any edit.
4. Deploy LF, local = box by hash, re-freeze (39 files), manifest, `lsattr` after, hashed transcript.
5. Chain (`p20_chain.sh`): lib tests; P15 A / P16 A and E / P17 A and B / P18 A and B / P19 A and B (history, on the new
   bytes); P20 A and B; C4 rerun (fixture 27/27, real 300/300); the helper on the chain's own oracle logs; line controls,
   B6, suite, preservation, unit, NC; the inventory on the box; teardown of every clone.
6. **Final live-state proof, taken last** (databases, `database.xml`, grants, ledger pin, consumers, harness processes
   with a filter that cannot match itself, the 39-file `sha256sum -c`, `lsattr`); release the lock; `RUNLOCK-FREE`.
   After this the box is touched only by `dr_runlock.sh status` and the read-only evidence copies, each logged with its
   time by the wrapper.
7. Local: C1–C6, retrace (C4), commit locally, report; wait for the owner before any push.

## 4. Acceptance criteria and stated limits

- **AC-1.** The final live-state proof is the last box capture; copies after it are logged (`copy_log.txt`).
- **AC-2.** 39 files frozen, `sha256sum -c` 39/39, `lsattr` `i` 39/39, local = box 39/39; **every** file pre-flighted on
  the unfrozen bytes, with `sha256sum` lines in the transcripts that equal the frozen hashes.
- **AC-3.** O1: the three new-pattern canned logs are OLD 4 / NEW 10; the three old-pattern logs are 10 in both arms; the
  clean logs return 4 in both; the helper does not match the chain's own clean oracle logs.
- **AC-4.** O2: the N5b NEW arm asserts the message; the mutant gives the other message; the post-TERM case gives
  `still alive (or unknown) after KILL`.
- **AC-5.** O6d: empty and letters-only pid files OLD 0 / NEW 1; the other cases unchanged.
- **AC-6.** O4: the AMBIGUOUS encounter fails in both modes (same bytes, labelled new coverage).
- **AC-7.** The retrace is repeatable from the committed traces, or the committed output says exactly what is not covered.
- **AC-8.** Suite 39/39, preservation PASS, unit 44/44, NC 5/5, lib tests, fixture 27/27, real 300/300 on the final bytes.
- **AC-9.** Every number in R5 §32 is copied from a committed transcript; the claim-vs-transcript table is re-run and attached
  to §7; every sentence that states what a gate does is checked against its code line.
- **Stated limits kept:** the P13 driver's EXIT-trap restore; A8's failing branch; B4 has no OLD arm; N3 not exercised by a
  second live driver run with a restore-only failure (O1's patterns are covered by canned logs of the oracle's own
  words, not by a live stage-drop failure); the B1 comparison against the source row's unit; the command-line identity
  of a dead leader's group; V6, V13, X2, A11, the clean-box rebuild and third home, the P14 ledger scope gaps, the P13
  original summaries, the P14 lock release unevidenced, the advisory lock, external validity; who dropped the P17 T0 clone;
  `.bak_p17fix1` never hashed; the lost P16 retrace.

## 5. Risks and decisions for the owner

- **Wall time.** About the P19 chain (~1 h 10 min) plus ~40 min pre-flight: the lib change touches the drivers, so the
  C4 rerun is repeated; the comparator bytes are unchanged.
- **Retrace repeatability (C4).** Copying older traces into the repository is optional; the default is to copy them when
  there are at most 300 and to commit the full list otherwise. Say if you would rather not add them.
- **O6d** is a small behaviour change (an empty `.pid` file now makes the cleanup exit 3 and leave state) that no review
  asked for beyond the "no review has named" remark. It is in B1 because it is the same function and one case; say if you
  want it out.
- **After P20.** The reviewer's recommendation for Astra v13: bytes fit, documents to be fixed. Whether to run a further
  independent re-score of P20 before v13 is your call; the executor's scores were 6, 7, 3 and 3 above the reviews.

## 6. Rubric (0/1/2, /24)

R1 verification table (§1, every finding opened) · R2 safety bytes (B1: the helper patterns and the pid-file case, paired,
real words of the oracle) · R3 control strength (B2: reason text asserted and distinguished by a mutant; B3 plants) · R4
document corrections (C1–C3: struck not edited; sentences checked against code; a stated cause checked against data) · R5
frozen-byte discipline (39 files, hashed transcripts, every file pre-flighted with `sha256sum` lines) · R6 live-state proof
(last; copies logged) · R7 regression on the final bytes (full chain incl. C4 27 + 300) · R8 inventory and manifests (box-verified
pins, 39 files) · R9 evidence integrity (retrace repeatable or exactly scoped; claim table; no claim without its file; AC-7
scored as it is) · R10 records (`date -u` stamps, every pre-flight iteration listed, QMS amendment) · R11 honesty (limits
carried forward and new ones stated; no overclaim in handoff/ROADMAP/R5) · R12 owner decisions recorded and followed.
Critical items: **R2, R3, R6, R9 must be 2** for Accept. Re-scored independently before Astra v13.

## 7. Result and self-score

*(filled after execution)*
