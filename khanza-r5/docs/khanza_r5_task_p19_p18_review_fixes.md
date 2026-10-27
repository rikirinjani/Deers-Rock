# R5-P19 Task: independent P18 review (20/24 vs 23/24), fixes N1-N9, the equal-mode unit gate, state proven last

Written 2026-10-27 BEFORE execution, per task-before-hands. Nothing in this wave has been run or changed on the box.
The commands run so far were local and read-only (greps and `sed` over the committed tree, `git diff`, `git grep`).
Source: `docs/khanza_r5_p18_review.md` (independent, local, read-only): total **20/24** against the executor's
**23/24**; R3 and R9 are 1, so the plan's Accept rule (R2, R3, R6, R9 = 2) fails. The P18 self-score is withdrawn.
The review also confirms the P18 safety work (B1, B2, B3, B5) as real and paired, and the final live-state proof as
truly last. P19 is therefore small: one predicate defect, one gate that was named and not built, one driver gap, two
fail-open paths, and the documents and records that overclaimed again.

**Order (owner instruction):** verify each finding against the source (§1, done), write this doc, **stop for the
owner's OK**, then execute on `mac-mini-vultr` under the run lock with the unfreeze/re-freeze procedure. Inside the
execution: read-only discovery first (§2 A), then the frozen bytes with a pre-flight of every final script on unfrozen
bytes (§2 B), then the chain, then **a final live-state proof that is the last box capture** (§3), and only then the
documents (§2 C).

**Out of scope:** the clean-box rebuild and the third home (the box ends ~2026-11-20); the P14 ledger scope gaps;
V6, V13, X2, A11; any Khanza jar/source edit; any Kaggle run; any git push (all need the owner). History rewrite
(N8) is not done by this wave.

## 0. Hard rules (unchanged from P18, plus three from this review)

- No Kaggle push/run and no git push without the owner. Live `sik`/`sik_bench` are read-only; the ledger pin
  `356355:a66a3a546cc322…` must hold at the start and in the final proof.
- Frozen tools are edited only by the unfreeze/re-freeze procedure (`chattr -i`, originals to `.bak_p19_*`, LF bytes,
  local = box by hash, `chattr +i`, new manifest, `lsattr` before and after, a hashed transcript for **every**
  re-freeze including a fix-up cycle). Evidence is valid only for the bytes it names.
- Run lock `P19-CLAUDE-<date>` for every driver run; free state captured before acquisition and after release.
- Controls are paired (the OLD arm is the right predecessor's bytes, from `.bak_*` or `git show <commit>:<file>`, and
  fails the same setup the NEW arm passes) or are labelled "new bytes only" in **every** place the claim is repeated.
  A NEW arm that expects an error asserts the reason text; an OLD arm that expects "the defect" asserts exit 0 **and the
  summary line**, never "exit != 2" or "exit <= 1" (N2).
- Every plant asserts `ROW_COUNT()`. After any text patch, read back the lines around every patched anchor.
- **New (N7): every final script is pre-flighted once on the unfrozen bytes before the freeze, and a script edited
  after its last pre-flight is pre-flighted again.** P18 froze `p18_a_negctl.sh` after its last assertion edit
  without a re-run; it passed by luck.
- **New (N1, N2): a sentence in a document that states what a predicate does is checked against the code line it
  describes before it is written** (open the line, run the exact lines on synthetic input when it is a gate).
- **New (N7): a record's `timestamp_utc` is `date -u` at the moment the file is written, never a nominal slot.**
- A number in a claim is copied from the transcript line that printed it; a claim that names an evidence file is
  written after that file exists. No secrets in committed files. No sub-agents. A first attempt that is invalid is
  kept and recorded, and **every** pre-flight iteration is listed in the record (N7), not only the first.

## 1. Verification of the review's findings (source read, 2026-10-27)

"Confirmed" means I opened the cited line (or ran the check) and saw it. The count of committed files holding the
box alias is 21 by `git grep -l` on HEAD (the review says 23); the point of N8 is unaffected.

| ID | Sev | Claim | What I read | Verdict | Package |
|---|---|---|---|---|---|
| N1 | major | The UNCHECKED gate fails an encounter only when **none** of its keys was checked; R5 §30 and the control header say any unsourced key fails | `tools/p15_line_identity.py:246`: `rec["unit_src"] = "DIFF" if unit_src_bad else "UNCHECKED" if (unit_unchecked and not unit_checked) else "MATCH"`; counters at `:191,198,200`. R5 l.1742 and `p18_b_negctl.sh:8-9` say "a billed procedure/drug key with no source row is `UNCHECKED` -> MISMATCH". The chain prints `unit_keys_unchecked` (`chain.log.txt:116`) and asserts it nowhere; only the clean-scratch control does. B7a deletes every source row of a one-kind encounter, so it cannot see a mixed one | **Confirmed.** A two-key encounter with one sourced and one unsourced key is `MATCH` | B1 |
| N2 | minor | R5 §30 says B4's OLD arm asserts exit 0 and the summary; the code accepts exit 0 or 1 with no summary check | `tools/p18_b_negctl.sh:61`: `[ $RC -le 1 ] && [ "$(grep -c -e 'INPUT-ERROR' …)" = 0 ]`; R5 l.1743 says "OLD arms assert exit 0 and the summary line (… B4 …)". The task doc §7 R3 reason already admits the weaker assertion | **Confirmed**, and the documents disagree with each other | B6, C2 |
| N3 | minor | B4's trigger also broke the oracle's stage restore; a FAILED fixture batch exits 4, which the driver treats as normal | `chain/b4_stop_rule_driver.log:34` `STAGE-RESTORE-ERROR … p18 injected save failure (NOT restored …)`, `:36` `date 2027-12-31: FAILED … NOT restored`. `tools/p14_edge_run.sh:195` greps `FAILED` into the log and gates nothing; `:219-221` says rc 4 "is the only expected value". Oracle docstring (`sampled_real_form_diff_r5.py:31`): exit 4 "when any batch FAILED", and out-of-envelope visits also give 4. A clean run has 0 such lines (`evidence/p18/chain/c4_driver.log`: grep count 0) | **Confirmed.** A batch that FAILS for a non-form reason with all visits `sukses=true` ends `P15E OK` | B2 |
| N4 | minor | `a1_clone_state.txt` carries an unexplained "drop time" inside P18's lock window | `evidence/p18/a1_clone_state.txt:33-34`: the label `mysql binlog/ddl drop time:` and `2026-10-27 00:51:28`. **This is my error:** I echoed that label and then ran `SELECT NOW()`; the value is the query time, not a drop time. Line 5 `harness/java procs: 1` came from `pgrep -fc` run inside an `ssh` command line that contains the pattern (most likely counting itself; the final capture uses `ps` and shows 0) | **Confirmed**; wrong label, not an event | C1 |
| N5a | minor | If the leader exits between `kill -0` and `ps -o pgid= -p`, the empty `pg` reads as "not a leader" and rc stays 0 | `tools/p15_lib.sh:66-67` | **Confirmed by reading** (narrow race) | B3 |
| N5b | minor | `p15_group_alive` reads a failing `ps` as "no live member" | `tools/p15_lib.sh:39-40`: the pipeline's status is the awk's; a `ps` failure gives empty input, `exit 1` = "dead" | **Confirmed by reading** | B3 |
| N6 | minor | The box bytes of 11 tools pinned only by the P14 manifest were not verified in P18 | `evidence/release_inventory.json`: 11 entries with `manifest` `p14_*`: `p14_drop_clone.sh`, `p14_edge_fixture.py`, `p14_fixture_split.py`, `p14_kill_test.sh`, `p14_line_identity.py`, `p14_line_negctl.sh`, `p14_live_state.sh`, `p14_nc_rerun.sh`, `p14_post.sh`, `p14_t0_discovery.sh`, `p14_t1_negctl.sh`. The chain checks the 31-file P18 manifest only; `p14_live_state.sh` produces the final proof. The P18 inventory was `--local` | **Confirmed** | B7 |
| N7 | minor | Record timestamps are nominal; preflight history understated; a final script was not pre-flighted | records `20261027T0105Z` (cites the C1 retrace produced at 02:40Z) and `T0120Z` (describes runs at 01:22Z); `evidence/p18/preflight/p18_a_negctl_run2.txt` shows a second, wrong B5 hypothesis ("the P16 A31' never calls the restore at all", refuted by its own `got 1/0`); R5 l.1748 says "four places"; the last edit of `p18_a_negctl.sh` came after run 2 and before the 01:25:07Z freeze, and its first run is in the chain at 01:32:56Z | **Confirmed** | C1, §0 |
| N8 | minor | The hostname redaction achieves nothing | `git grep -l` of the alias on HEAD: 21 files, including this wave's task doc (`docs/khanza_r5_task_p18_p17_review_fixes.md`) and `ROADMAP.md`; the unredacted originals are in pushed `a60b100` (their hashes in `redaction_note.txt` match). The alias is the ssh alias (14 characters, no IP, no domain) | **Confirmed.** A policy question, not a code defect | §5 owner decision |
| N9 | minor | C5 was partly dropped | `git diff --name-only a60b100 63ef8ca -- evidence/p17` lists only `lock_acquire_unfreeze.txt`; `evidence/p17/refreeze_lsattr_after.txt` is unchanged and starts with `uniq -c` prefixes (`      1 ----i-…`) and ends truncated (`p6_acceptance_suite`). §7 amendment 7 does not mention it | **Confirmed** | C1 |
| AC-5 | major (own) | The equal mode (the real 300) has no source-unit gate; `unit_keys_checked` is 0 there; R3 stayed 1 | `tools/p15_line_identity.py:192` (`if exp is not None and …`) and `:240-246` (`unit_src` is set only inside `if exp is not None:`); `chain.log.txt:120` `"unit_keys_checked": 0` | **Confirmed** (stated in P18; to be built or declined by the owner, §5) | B1 |

Net: 9 of 9 findings hold, plus the self-identified AC-5 gap. N4 is an error of mine in a label, not an unexplained
event. Two corrections to my own P18 text beyond the review: R5 §30 l.1742-1743 (N1, N2), and "first runs faulty in
four places" (N7).

## 2. Work packages

### A. Read-only discovery on the box (first, under the lock, before any byte changes)

- **A1.** Lock status free → `lsattr` of the 31 frozen files → live-state baseline (`p14_live_state.sh p19-baseline`)
  plus `performance_schema` consumers → acquire `P19-CLAUDE-<date>`. Capture `ps -eo pid,etime,cmd` filtered for
  `BilingHarness|sampled_real` with a filter that cannot match the capture command itself (N4).
- **A2. Equal-mode unit-gate discovery (read-only, live `sik`).** Run the **patched but unfrozen** comparator in equal
  mode on the real 300 against live data: `python3 p15_line_identity.py <real300> --db sik --ledger-db sik_bench
  --no-fresh-b --out <scratch>`; read `unit_keys_checked`, `unit_keys_unchecked` and the per-encounter
  `unit_src` counts. It reads only (`SELECT`); `--no-fresh-b` because live has no audit table. **Decision rule (fixed
  now):** if `unit_src` is `MATCH` for all 300 and `unit_keys_unchecked` is 0 → the gate becomes a hard condition of
  `rec["pass"]` in equal mode. If any encounter is `DIFF` or `UNCHECKED` for a reason that is a property of the data
  (merged same-name procedures, a drug billed from `detail_pemberian_obat` rows under a different code) → **stop,
  list them in the evidence, and ask the owner**; the gate is not weakened to make the number pass.
- **A3.** The same run is repeated on the fixture clone after the driver builds it (§3 step 6), so the gate is
  evidenced on bytes that produce the clone.

### B. Frozen bytes (new manifest `p19_frozen_<date>.sha256`; every final script pre-flighted on unfrozen bytes)

- **B1 (N1, AC-5). `p15_line_identity.py`.**
  1. `rec["unit_src"] = "DIFF" if unit_src_bad else "UNCHECKED" if unit_unchecked else "MATCH"`: any billed
     procedure/drug key without source rows fails the encounter, in both modes.
  2. The source-unit compare runs in **equal mode too** (drop `exp is not None` from the compare), `unit_src`,
     `unit_keys_checked` and `unit_keys_unchecked` are recorded in both modes, and `rec["pass"]` in equal mode
     requires `unit_src == "MATCH"` (subject to the A2 decision rule).
  3. Controls (new `p19_b_negctl.sh`, paired against the P18 bytes `.bak_p19`): (a) **mixed plant** in expect mode: a
     two-key no-delta encounter, the source rows of one key deleted (ROW_COUNT asserted): OLD `MATCH`, NEW `MISMATCH`
     with `unit_keys_checked >= 1` and `unit_keys_unchecked >= 1` (this is the case B7a could not see); (b) **equal
     mode** on the same scratch: a source unit price changed so it differs from the form's billed unit (ROW_COUNT 1):
     OLD passes, NEW fails; (c) equal mode with all source rows of one encounter deleted: OLD passes, NEW `UNCHECKED`;
     (d) the clean fixture and the clean scratch in both modes pass with `unit_keys_unchecked == 0`.
  4. Chain asserts (counted in the final line): fixture `unit_keys_unchecked == 0` and `unit_keys_checked > 0`; real
     300 `unit_keys_unchecked == 0` and `unit_keys_checked > 0`.
- **B2 (N3). `p14_edge_run.sh`** (and the shared helper in `p15_lib.sh`, B3). After the stop-rule and FORM-INCOMPLETE
  gates, a new gate in `oracle_run`: if the oracle log shows a failed batch (`: FAILED (` or `STAGE-RESTORE-ERROR` or
  `NOT restored`), print `ORACLE-BATCH-FAILED[$label]: …` and `return 10`. Control (new `p19_a_negctl.sh`, paired
  against `.bak_p19`): `oracle_run` extracted from the OLD and NEW driver and run with `env` defined as a shell
  function (a function shadows the external command) that prints a canned log with a `FAILED` batch line and returns
  4, with `p15_count_sukses` stubbed to all `true`: OLD returns 4 (the value that is treated as normal) and reaches
  `P15E OK`, NEW returns 10. A clean canned log (no such lines) returns 4 in both arms. B4's real-run log of P18
  (`b4_stop_rule_driver.log`) is also fed to the helper: it matches; the clean `c4_driver.log` does not.
  *B4 is described as a compound failure everywhere it is cited (the save and the stage restore both failed).*
- **B3 (N5). `p15_lib.sh`.** (a) In `p15_kill_run_harness`, an empty `pg` from `ps -o pgid= -p` with a leader that
  passed `kill -0` is treated as "leader gone": fall through to the dead-leader branch (group liveness, identity by
  command line, TERM/KILL, confirm) instead of "not a leader". (b) `p15_group_alive` returns 0 alive, 1 dead, **2
  unknown** when `ps` itself fails; every caller treats 2 as "not confirmed dead" (the wait loop does not break, the
  confirmation step sets `rc=1`, the dead-leader branch sets `rc=1` and does not skip). Controls (new
  `p19_a_negctl.sh`, paired against `.bak_p19`, shell function `ps` shadowing the command inside `bash -c`): (a) a
  live leader whose `ps -o pgid= -p` returns nothing, with the harness (`exec -a BilingHarness_p19`): OLD rc 0 and the
  process alive, NEW kills it and rc 0; (b) a dead leader with a live harness child and `ps` failing: OLD rc 0 and
  the child alive, NEW rc 1 and the child alive; (c) `ps` working: the P18 B2 cases are re-run unchanged as history.
  `p15_lib_test.sh` stays 23/23; the new return value is added as one lib-test case in a **new** test file (the
  frozen lib test is not edited).
- **B4.** None of the N7 items is a byte change.
- **B5 (N6). `p19_release_inventory.py`** (new, frozen, deployed to the box): the P18 script with the P19 manifest
  added to `ORDER`. Chain step 4e runs it **on the box** (read-only, before the final capture) so that every pin of
  the 54+ files, including the 11 P14-only tools and `p14_live_state.sh`, is compared with the on-disk bytes; the
  committed `evidence/release_inventory.json` is that box output, with the `--local` result kept beside it for
  comparison.
- **B6 (N2). `p19_b_negctl.sh` and `p19_a_negctl.sh`:** the B4-comparator OLD arm (P16 `p13_sample_compare.py`
  without `--since`) asserts exit 0 or 1 **and** the `P13 compare:` summary line, and no `INPUT-ERROR`. Pre-flight the
  OLD arm alone first and read its output (P18 rule).
- **B7. `p19_chain.sh`:** the P18 chain plus: the new controls; the P14-manifest check through B5; the unit-gate
  asserts of B1.4; the final capture last, after every clone drop and every read.

The new frozen set = the 31 P18 files with the changed ones re-pinned (`p15_line_identity.py`, `p14_edge_run.sh`,
`p15_lib.sh`) plus `p19_a_negctl.sh`, `p19_b_negctl.sh`, `p19_chain.sh`, `p19_release_inventory.py` and a new lib-test
file = **36** files.

### C. Documents and records (after the last box operation, never before)

- **C1 (N4, N7, N9).** `evidence/p19/erratum_p18.md`: the `a1_clone_state.txt` line is `SELECT NOW()` mislabelled
  (and the `pgrep -fc` count), the T0 clone's drop is still unevidenced; all three P18 preflight iterations listed
  (`p18_a` run 1: 9 FAIL, run 2: 1 FAIL with a second wrong hypothesis, `p18_b` run 1: 3 FAIL, run 2: 0), and the
  unpreflighted final edit of `p18_a_negctl.sh`. `evidence/p17/NOTE_refreeze_lsattr_after_garbled.md` marks the
  garbled file and points to `evidence/p18/chain/lsattr_chain_start.txt` for the same 27 files. Struck-through
  corrections (not edits) in R5 §30: l.1742 (N1), l.1743 (N2), the "four places" sentence (N7), the B4 description
  (N3); handoff item 24 ("fails closed" → "fails closed for the cases listed in §30; N5 residuals fixed in P19").
- **C2 (N2, N7).** The P18 task doc §7 R3 reason is left as written; its R9 and R11 notes are not edited. The
  independent score (20/24) is recorded next to the self-score in the QMS P18 amendment.
- **C3 (N8).** Per the owner's decision (§5): the redaction claim is dropped from the P18 R11 note and the QMS record,
  or nothing else is done. No history rewrite in this wave.
- **C4.** R5 §31; QMS `VER-…-R5-P19-001` and an amendment note on the P18 record; failure records for N1 (a gate
  described from intent), N3/N5 (the same shape as P17's M3/M4: fixes at the named call site only) and the P19
  pre-flight iterations, each stamped with `date -u` at write time; traces `r5-p19-task-doc`, `r5-p19-fixes`,
  `r5-p19-evidence`; the retrace output committed after tracing its own placeholder (the P18 method: placeholder →
  `pm1-trace` → `pm1-retrace --project-root khanza-r5 --traces-dir <traces>` → overwrite the placeholder with the
  output) and **also** run against the committed `records/traces/` so that a reader can repeat it from the repo;
  release manifest pins; handoff item 25; ROADMAP.

## 3. Required runs (order)

1. Lock status (free), `lsattr` of the 31 files, live-state baseline, ledger pin; acquire `P19-CLAUDE-<date>`.
2. A1 and A2 (read-only discovery; the equal-mode decision rule is applied here, before any freeze).
3. Unfreeze the changed files, patch on the unfrozen bytes, **pre-flight each final script once** (the history
   controls that extract or stub the changed text first: `p15_lib_test.sh`, `p17_a_negctl.sh`, `p18_a_negctl.sh`; then
   the new `p19_a_negctl.sh`; then the driver plus `p19_b_negctl.sh` on a fixture clone), read each output, fix, and
   pre-flight again after any edit.
4. Deploy LF, local = box by hash, re-freeze (the 36 files), manifest, `lsattr` after, hashed transcript.
5. Chain (`p19_chain.sh`): lib tests; P15 A / P16 A and E / P17 A and B / P18 A and B (history, on the new bytes);
   P19 A; C4 rerun (fixture 27/27, real 300/300 with the unit gate in both modes and the P13 comparator asserted);
   line controls, B6, suite, preservation, unit, NC; step 4e inventory on the box; teardown of every clone.
6. **Final live-state proof, taken last**: `p14_live_state.sh p19-chain-final`, consumers, databases, harness
   processes (`ps` with a non-self-matching filter), the 36-file `sha256sum -c`, `lsattr`. Release the lock;
   `RUNLOCK-FREE`. After step 6 the box is touched only by `dr_runlock.sh status` and read-only copying of evidence
   files; each copy is listed.
7. Local: records, R5 §31, retrace (C4), docs, `ROADMAP.md`; commit locally; report; wait for the owner before any push.

## 4. Acceptance criteria and stated limits

- **AC-1.** The final live-state proof is the last box capture; the P14-manifest tools are verified on the box
  (`p19_release_inventory.py` run on the box: every pin agrees, or the disagreement is reported).
- **AC-2.** 36 files frozen, `sha256sum -c` 36/36, `lsattr` `i` 36/36, local = box 36/36, one cycle or every cycle
  hashed; each final script pre-flighted on unfrozen bytes after its last edit.
- **AC-3.** N1: the mixed plant is OLD `MATCH` / NEW `MISMATCH`; `UNCHECKED` fires on any unsourced key.
- **AC-4.** AC-5 of P18: `unit_keys_checked > 0` and `unit_keys_unchecked == 0` on the fixture and on the real 300,
  asserted in the chain; the equal-mode plants (b), (c) are OLD-passes / NEW-fails. If A2 stops on a data-property
  disagreement, the stop is the outcome and the gate is not claimed.
- **AC-5.** N3 and N5: the paired controls of B2 and B3 pass; the P18 B2 cases and B4 still pass.
- **AC-6.** Suite 39/39, preservation PASS, unit 44/44, NC 5/5, lib tests, fixture 27/27, real 300/300 on the final
  bytes.
- **AC-7.** The retrace output is committed, traced, and says no untraced files; it is repeatable from the committed
  traces.
- **AC-8.** Every number in R5 §31 is copied from a committed transcript; the executor re-runs the review's
  claim-vs-transcript table against the new evidence and attaches it to §7. Every sentence in R5 §31 and the QMS
  record that describes a gate or a control is checked against the code line it describes.
- **Stated limits kept:** V6, V13, X2, A11, the clean-box rebuild and the third home, the P14 ledger scope gaps, the
  P13 original summaries, the P14 lock release unevidenced, the advisory lock, external validity; who dropped the P17
  T0 clone; `.bak_p17fix1` never hashed; the P16 retrace output; the P13 driver's EXIT-trap restore (unverified, as in
  the P14 driver); A8's failing branch (no control); B4 has no OLD arm (the stop-rule branch is older than P17).

## 5. Risks and decisions for the owner

- **Equal-mode unit gate.** Build it (recommended: it is a few lines and the 300-visit compare has to be rerun for
  N1 anyway), or decline it and keep it a stated limit; declining leaves R3 at 1 and the Accept rule unmeetable.
  If A2 shows a data-property disagreement the executor stops and asks; the gate is not weakened.
- **N8 (hostname/alias).** Is the ssh alias a secret? If **no** (my reading: it is a 14-character alias, no IP, no
  domain, used in 21 committed files and in this task doc), the redaction claim is dropped and nothing else is done.
  If **yes**, it needs a history rewrite of a pushed branch, which is outside this wave and needs the owner's explicit
  go-ahead; this wave would then only stop adding it to new files.
- **Wall time.** About the P18 chain (~1 h 10 min of chain) plus ~35 min pre-flight and discovery.
- **No Astra v13 before a further independent re-score of P19.** The executor's scores were 6, 7 and 3 points above
  the reviews. My P19 self-score is written, not the verdict.

## 6. Rubric (0/1/2, /24)

R1 verification table (§1, every finding opened) · R2 safety bytes (B2 driver gate, B3 kill-function residuals;
paired; real shapes) · R3 predicates (B1: N1 mixed plant, the equal-mode unit gate, both modes asserted) · R4 control
strength (B6 and the P18 weak assertions; reasons asserted; OLD arms right) · R5 frozen-byte discipline (36 files,
hashed transcripts, pre-flight of every final script) · R6 live-state proof (last; the P14-manifest tools verified on
the box) · R7 regression on the final bytes (chain, history controls, C4 27 + 300) · R8 document corrections (C1,
C2: struck, not edited; sentences checked against code) · R9 evidence integrity (retrace repeatable from the repo;
no claim without its file; claim table re-run) · R10 inventory and manifests (box-verified, 36 pins) · R11 records
(`date -u` stamps, every pre-flight iteration listed, erratum) · R12 honesty (limits carried forward; the N8
decision recorded; no overclaim). Critical items: **R2, R3, R6, R9 must be 2** for Accept. Re-scored by an
independent review before Astra v13.

## 7. Result and self-score

Executed 2026-10-27 under lock `P19-CLAUDE-20261027` (08:37:52Z to 10:13:12Z). Result: R5 §31. §1–§6 above are unchanged
since commit `129b72c` (written before the run).

**Amendments (what differed from the plan, and why).**
1. **Frozen set = 35, not 36.** The plan counted a separate new lib-test file; the `p15_group_alive` return-value cases
   went into `p19_a_negctl.sh` (N5c) instead, so the frozen lib test is still unedited (23/23) and the new set is the 31
   P18 files plus `p19_a_negctl.sh`, `p19_b_negctl.sh`, `p19_chain.sh`, `p19_release_inventory.py` = 35.
2. **N3 control.** The plan's "extract `oracle_run` and run it with `env` as a shell function" was done as planned; the
   plan's "feed the real B4 log to the helper" was done on the P18 box copies
   (`/opt/dr-benchmark/p18/chain/b4_stop_rule_driver.log` matches, `c4_driver.log` does not). **No second full driver
   run with a restore-only failure was made**; N3's gate is evidenced by the canned-log pair, not by a live run.
3. **N5 control.** Both fail-open paths are exercised with a shell function that shadows `ps` inside `bash -c`; the
   P18 B2 cases are re-run unchanged by `p18_a_negctl.sh` (history, 50/50 on the P19 bytes).
4. **A2.** Done as written; the discovery agreed with the plan, so no stop was needed (698 keys, 0 unchecked, 300/300
   MATCH on live). The patched comparator was run from a scratch path outside the frozen tools directory.
5. **N6.** `p19_release_inventory.py` ran on the box (chain step 4e, read-only, before the final capture): 58 files,
   58 ok, 8 manifests. The committed `evidence/release_inventory.json` is that box output; the `--local` result is kept
   beside it. The 44 manifest names differ between box and repo copies; pins and on-disk hashes are identical.
6. **N8.** Owner decision at the go-ahead: the ssh alias is not a secret; the redaction claim is dropped and nothing else
   is done. (My own P19 lock transcript replaced the alias by `<alias>` out of habit; that line is harmless and not a claim.)
7. **N9 / C1.** Marked, not replaced: `evidence/p17/NOTE_refreeze_lsattr_after_garbled.md` points to the P18 captures of the
   same 27 files.
8. **Pre-flight gaps (stated).** `p19_chain.sh` and the success path of `p19_release_inventory.py` were first run in the
   chain; a pre-flight script of mine lacked `DBUTIL_FORCE_ROOT` (a script fault). See
   `records/failures/20261027T1016Z-test-r5-p19-preflight-gaps.json`. This breaks §0's pre-flight rule for two files.

**Claim vs transcript (AC-8).**

| Claim | Transcript line | Status |
|---|---|---|
| lib 23/23; P15 A 9/9; P16 A 26/26, E 20/20 | `chain/a_lib_test.txt`, `p15_a_negctl.txt`, `p16_a_negctl.txt`, `p16_e_negctl.txt` last lines | matched |
| P17 A 37/37, B 31/31; P18 A 50/50, B 33/33 | `chain/p17_a_negctl.txt`, `p17_b_negctl.txt`, `p18_a_negctl.txt`, `p18_b_negctl.txt` | matched |
| P19 A 19/19; P19 B 28/28 | `chain/p19_a_negctl.txt` `P19-A-NC: PASS=19 FAIL=0`; `chain/p19_b_negctl.txt` `P19-B-NC: PASS=28 FAIL=0` | matched |
| fixture 27/27, DIFFER 12 / EQUAL 12 / EQUAL-SRC 3, `unit_keys_checked` 57, unchecked 0 | `chain/fixture_compare.txt` last line | matched |
| real 300/300, 1,240 entries, EQUAL 181 / EQUAL-SRC 119, `unit_keys_checked` 698, unchecked 0 | `chain/real300_compare.txt` last line | matched |
| P13 comparator 300/300; unit-gate asserts and exit-code checks; 0 failed | `chain/p13cmp_pos.txt`; `chain.log.txt` `asserts-failed=0` | matched |
| line 33/33; B6 6/6; suite PASS=39; preservation PASS; unit 44/44; NC 5 | `chain/line_negctl.txt`, `b6_negctl.txt`, `e_suite.log`, `e_preservation.log`, `e_unit.txt`, `e_nc.log` | matched |
| 35/35 frozen, `lsattr` 35/35, local = box 35/35 | `chain.log.txt` step 0 and 5; `refreeze_cycle1.txt`; `local_eq_box_manifest.txt` | matched |
| inventory on the box 58 files, 58 ok, 8 manifests; P14-only 11/11 | `chain/release_inventory_box.json`; `chain.log.txt` step 4e | matched |
| N1 mixed plant: OLD MATCH/MATCH, NEW UNCHECKED/MISMATCH, checked 2 unchecked 1 | `chain/p19_b_negctl.txt` N1 block | matched |
| AC-5 b DIFF, c UNCHECKED, three planted fail in NEW, none in OLD | `chain/p19_b_negctl.txt` AC-5 block | matched |
| N3 OLD 4 / NEW 10; helper on the real logs | `chain/p19_a_negctl.txt` N3 block | matched |
| N5a/b/c OLD defect and NEW fix | `chain/p19_a_negctl.txt` N5 block | matched |
| A2 live: 300/300 MATCH, 698 checked, 0 unchecked | `a2_live_equal.txt` | matched |
| final capture 10:12:48Z last; release 10:13:12Z | `chain/live_state_final.txt`; `lock_release.txt` | matched |
| retrace says no untraced files | `evidence/p19/retrace_trace_clean.txt` | see the file (written last) |

**Rubric (self-score, not the verdict).**

| # | Self | Reason |
|---|---|---|
| R1 | 2 | §1: all findings opened; N4's cause identified as my own mislabelled `SELECT NOW()`; the review's 23 vs my 21 file count noted |
| R2 | 2 | N3 gate (paired on `oracle_run`), N5a/N5b (paired with a shadowing `ps`); the live driver was not re-run with a restore-only failure (stated) |
| R3 | 2 | N1 mixed plant and the equal-mode gate paired in both modes; fixture and real 300 asserted (698 / 0) |
| R4 | 2 | N2 summary line asserted; reasons asserted in the new arms; OLD arms are the right predecessors |
| R5 | 1 | 35 files, hashed one-cycle transcript, local = box 35/35, but two final files (`p19_chain.sh`, the inventory's success path) were not pre-flighted on the unfrozen bytes (the rule I wrote in §0) |
| R6 | 2 | the final capture is the last box capture; the P14-only tools verified on the box (11/11, 58/58) |
| R7 | 2 | the full chain on the final bytes incl. all history controls and C4 27 + 300 |
| R8 | 2 | R5 §30 struck not edited, handoff, erratum, NOTE for the garbled file |
| R9 | 2 | the retrace says clean (traced as a placeholder first); the claim table above re-run; no claim without its file |
| R10 | 2 | 58 pins verified against the box bytes; the `--local` result kept beside it |
| R11 | 2 | three failure records with `date -u` stamps; every pre-flight iteration listed; QMS P19 and the P18 amendment |
| R12 | 2 | limits carried forward and new ones stated (N3 not live-tested; pre-flight gaps; command-line identity) |
| **Total** | **23/24** | R5 = 1 (not a critical item); the critical items R2, R3, R6, R9 are 2 by my scoring. **Not the verdict:** the scores were 6, 7 and 3 over the independent reviews. Re-score independently before Astra v13. |
