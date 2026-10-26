# R5-P17 Task: Astra v12 findings, safety first, then C3 form-side charge-code provenance

Written 2026-10-27 BEFORE execution, per task-before-hands. Nothing in this wave has been run or changed
on the box; the only box commands so far were read-only (`sha256sum` of the `.bak_*` files, a
`COUNT(*)` on `information_schema.tables`, `dr_runlock.sh status`).
Source: Astra v12 (`evidence/astra_v12_5514025_output.md`, run 5514025, **71/100** "Needs targeted
rework"; next step named by Astra: C3, "not a larger sample", preceded by mandatory writer-death and
XML-restore conditions and an archive of the existing inputs). Every v12 finding below was checked
against the source before this doc was written (§1). Astra qualified its own synthesis as resting on the
six supplied assessments, not on a fresh inspection of the repository.

**Order (owner instruction):** safety fixes first (§2 A), then the gate and paired-control gaps (§2 B), the
document corrections (§2 D), and C3 last (§2 C), because C3 needs a clean driver and a discovery gate
before anything is built.

**Out of scope:** the clean-box rebuild (blocked: no third home; the box ends ~2026-11-20); the P14 ledger
scope gaps; X2; external validity C1–C4; any Khanza jar/source edit; any live write; any Kaggle run.

## 0. Hard rules (unchanged from P16)

- No Kaggle push/run and no git push without the owner. Live `sik`/`sik_bench` are read-only; the ledger
  pin `356355:a66a3a546cc322…` must hold at the start and in the final proof.
- Frozen tools are edited only by the unfreeze/re-freeze procedure (`chattr -i`, originals to
  `.bak_p17_*`, LF bytes, local = box, `chattr +i`, new manifest, `lsattr` transcripts before and after,
  re-pin the release manifest). Evidence is valid only for the bytes it names.
- Run lock `P17-CLAUDE-<date>` for every driver run; its free state is captured before acquisition and
  its release after.
- **Controls must be paired:** the old bytes (from `.bak_*`, or `git show <commit>:<file>`) fail the same
  setup that the new bytes pass, or the control is labelled "new bytes only" in the doc and the record.
- Every plant asserts `ROW_COUNT()` equal to the number counted before it. A patch that edits text is
  read back around the patched lines, not only syntax-checked (P16 failure record 20261026T1500Z).
- No secrets in committed files. No sub-agents. A first attempt that is invalid is kept and recorded.

## 1. Verification of the v12 findings (source read, 2026-10-27)

C = confirmed in the code; P = partly (the qualifier says what holds); N = not confirmed.

| ID | v12 finding | Where (current bytes) | Verdict | P17 action |
|---|---|---|---|---|
| V1 | The clone check prints a row count as the table count | `p15_lib.sh` `p15_clone_matches_sik`: `a` is reused in the key-table loop, so the final echo prints `tables=$a` = the `detail_nota_jalan` row count (1100). The table-count equality check itself runs first and is real; `information_schema` shows **1,179** tables in `sik` | **C**. R5 §27 "1,100 tables" is **wrong** | A12, D1 |
| V2 | Registration quantity is synthesized (billing `jumlah` ignored) | `p15_line_identity.py:177` `f["qty"] += Decimal(1) if c == "registration" else jml`; the B3 plant mutates the ledger | **C** | B2 |
| V3 | Expected-mode unit-price changes can pass | l.225–227: `predicted_form` / `obs_form` carry `[qty, amount]` only; units are compared only in the line verdict, which is already DIFFER for keys with an expected delta | **C** | B1 |
| V4 | Cardinality incomplete: a subset of the manifest visits passes; `B_rows` is recorded, never gated | `p15_line_identity.py` ~l.212, 219 | **C** | B3 |
| V5 | P13 comparator accepts omitting `--since` (`win = "1"`) | `p13_sample_compare.py` fetch_audit, argv parse | **C** | B4 |
| V6 | Fresh-B has no run-end bound, no connection identity, UPDATEs not audited | audit triggers are INSERT/DELETE only | **P**: a later second INSERT or a DELETE+INSERT fails the total-count rule; an UPDATE of the payment row after the INSERT is not seen | stated limit (§5) |
| V7 | PID guard `st <= fm+1`; TERM without confirmed death | `p15_lib.sh` `p15_kill_run_harness` | **C** | A3, A4 |
| V8 | P13 sets `CREATED=1` after an unchecked `CREATE DATABASE` | `p13_wide_sample.sh` l.62–63 (no `||`) | **C** (race window only; the exists-check is before the trap) | A2 |
| V9 | P14 success ignores an XML restore failure | `p14_edge_run.sh` l.218 `$DBXML restore … && RETARGETED=0`, then the exit decision | **C** | A1 |
| V10 | A5/A6 "wiring tests" assign `FIX_RC`/`REAL_RC`, not a stubbed `oracle_run`; the pin test does not assert exit 3 | `p16_a_negctl.sh` `tailrc`, `segrc` | **C** (my own wording "oracle stubbed" in R5 §28 and the script header is inaccurate) | A9, A10, D1 |
| V11 | A31′ ignores the result of its final `stage_restore()` | `p6_acceptance_suite.sh` ~l.842–850 | **C** | A6 |
| V12 | The drift hook updates all billing rows of the encounter; the comment says "one live row"; no row count | `sampled_real_form_diff_r5.py` ~l.529–534 | **C** | A8 |
| V13 | Grant recovery checks inclusion, not equality; the override grants before the marker is validated | `recover_writer_exclusion`, `_recover_grants_expected` | **P**: inclusion is what §27 claims ("visible afterwards"); the override ordering is documented operator behaviour | stated limit |
| V14 | The safety controls need the discipline they test: unconditional `DROP DATABASE IF EXISTS`, global `pgrep … \| head -1` | `p15_a_negctl.sh` `setup`, `teardown` | **C** (`p16_a_negctl.sh` refuses an existing `sik_p6f`; the P15 one does not) | A5 |
| V15 | "Snapshots written by this run" rests on `mtime >= suite_start` only | `p10_preservation_check.sh` SNAPSHOT-BINDING block | **C** | A7 |
| V16 | The handoff "current state" is stale | `khanza_session_handoff_20261025.md` §1: v10/63, P13, EQUAL-CTX, "28/28" | **C** | D2 |
| V17 | The handoff keeps the doubled-count bug open | handoff item 14, but `p13_wide_sample.sh` l.130–133 counts once per visit since P15 | **C** (stale) | D2 |
| V18 | "Old vs new controls for each N1–N8" is false as a blanket statement | builder SUMMARY l.132 and the failure record say it. Paired: N1, N3, N5, N6. Not paired: N2 (no old arm), N4 (new bytes only), N7 (no defective-plant experiment), N8 (no old-arm run) | **C** | B5, D1 |
| V19 | "1,240 lines" are aggregated entries, not billing rows | `p15_line_identity.py` aggregates per (component, code) | **C** | D1 (call them comparison entries) |
| V20 | "Retrace trace-clean" is "see the commit", with no output | R5 §28, P16 doc §7 | **C** | D3 |
| V21 | A28′ does not demonstrate an actual failed restore being masked | the control mutates the printed word after a real, successful restore | **C** (stated in R5 §28 as a mutation, but the framing "failed restore" overreaches) | A6b |
| V22 | Historical `.bak_*` bytes exist only on the sole VPS | box `.bak_p15_20261026` (10 files) equals `git show 60b19c7`; `.bak_p16_20261026` (8 files) equals `git show 3d96c96` (CR stripped, sha256 compared 2026-10-27) | **N for the tool bytes** (they are in the pushed repo). **C for** the Khanza tree, DB dumps, secrets and box state (external) | record in D4; the third home is an owner decision |
| V23 | The release manifest is an accretion with no single effective inventory | `khanza_r5_release_manifest.md` | **C** | D4 |
| V24 | C3, X2, A11, inner restore order, original P13 positive summaries, clean-box rebuild, external validity | – | **C** (all known open) | C3 is §2 C; the rest stay open |
| V25 | "27/27" means 27 expected outcomes (12 DIFFER), not 27 equivalence passes | R5 §26–28 wording | **agree** | D1 (reword) |
| V26 | The 0.99 % / 1.22 % bounds are correct | recomputed | **agree** | – |

## 2. Work packages

**A. Safety (first)**
- **A1 (V9).** `p14_edge_run.sh`: after the final xml restore, `probe` must show `sik`; otherwise log
  `ABORT: database.xml not restored` and exit 3, keeping the clone. Paired control `p17_a_negctl.sh`:
  the real tail with `DBXML` set to a command that fails; OLD exits 0 (or 1 by the unrelated decision),
  NEW exits 3.
- **A2 (V8).** `p13_wide_sample.sh`: `CREATE DATABASE … || { exit 3; }` before `CREATED=1`. Control: a
  `mysql` PATH shim that answers `SHOW DATABASES LIKE 'sik_p13w'` with nothing while a sentinel database of
  that name exists (so `CREATE` fails naturally); OLD drops the sentinel database in its cleanup (the
  defect), NEW exits 3 and the sentinel survives.
- **A3 (V7).** `p15_kill_run_harness`: after TERM wait up to 10 s for the group to die, then KILL, then
  confirm; return non-zero if a member is still alive. Drivers: if the harness is not confirmed dead, do not
  retarget/restore and exit 3. Control: a dummy group leader that ignores TERM; OLD returns with it
  alive, NEW kills it and confirms.
- **A4 (V7).** The identity guard compares sub-second times: process start (from `/proc/<pid>/stat`
  starttime + boot time) must be ≤ the pid file's mtime (`stat -c %.Y`), no `+1` slack. Control: a leader
  started 200 ms after a pid file that is 100 ms old: OLD signals it, NEW does not.
- **A5 (V14).** `p15_a_negctl.sh` and `p16_a_negctl.sh`: refuse (exit 3, touch nothing) if the clone name
  already exists; the dummy process is the pid the script itself spawned (`$!`), never `pgrep | head -1`.
  Control: run the NEW helper with an existing `sik_p13w` sentinel: exit 3, database intact; the OLD
  helper drops it.
- **A6 (V11).** A31′ requires its final `stage_restore` to return true and folds that into check 31.
  **A6b (V21).** A real restore failure for A28′: a test-only fault hook `R5_FAULT_RESTORE_FAIL=1` in the
  oracle (exact-`1`, refused on live) makes `stage_restore` return false without touching the fixture, so the
  hashes stay equal. OLD A28′ (no `R28` in the predicate) passes, masking the failed restore; NEW fails on
  `R28`. If this pair cannot be made discriminating, the doc and the record say so and V21 stays
  "mutation only".
- **A7 (V15).** The suite writes a sidecar `<snapshot>.run` holding the basename of its own evidence file;
  the preservation check requires the sidecar to equal `EV`, besides the `mtime` window. Control: a
  snapshot made "newer" with `touch` from another run: OLD passes the binding, NEW exits 3.
- **A8 (V12).** The drift hook asserts the affected-row count equals the encounter's billing row count and
  logs it; the comment is corrected. Evidence line quoted in R5 §29.
- **A9 (V10).** A full driver run with an **injected stop-rule failure**: `R5_HARNESS_TIMEOUT_S=3`
  (existing test-only variable) on the P14 driver, so every visit times out. Assertions: the driver
  exits 1, a `STOP RULE` line, `database.xml` back on `sik`, no clone grant, the clone kept, then dropped.
  This replaces "wiring only" for A5/A6 of P15.
- **A10 (V10).** The pin-segment test asserts exit 3 as well as the output lines; the headers and R5
  wording say "the driver's decision tail with the return codes assigned", not "oracle stubbed".
- **A12 (V1).** `p15_clone_matches_sik` keeps the table count in its own variables and prints
  `tables=<n> (= sik)`. Control: the printed number equals `information_schema` for `sik` (1,179 today).

**B. Predicates and paired controls**
- **B1 (V3).** Expected mode compares units: the fixture manifest gains `predicted_unit` per key
  (`p14_edge_fixture.py`, re-frozen), and the comparator requires observed units to equal it. Plant: a
  unit price changed with quantity and total unchanged on a key that has an expected delta: OLD passes,
  NEW MISMATCH.
- **B2 (V2).** Registration quantity is the sum of billing `jumlah`, not +1 per row. A discovery step
  (T0) first shows `SELECT DISTINCT jumlah` for registration rows over the fixture and the 300; if any
  real row has a value other than 1, the rule is reported and the owner decides. Plant: a billing
  registration row with `jumlah=2` and the total unchanged: OLD passes, NEW MISMATCH.
- **B3 (V4).** Expected mode requires the visit list to equal the manifest's visit set (exact);
  `B_rows` must equal the audited INSERT count (1 for a fresh-B run). Plants: a subset of the 27 → exit 2;
  a second payment row → MISMATCH.
- **B4 (V5).** `p13_sample_compare.py` requires `--since` unless `--no-fresh-b` is given (exit 2).
- **B5 (V18).** Paired controls for the rest: N4 (NULL payment on the OLD comparators: not exit 2), N7
  (a plant that removes 1 of 18 rows: the OLD `>=1` B6 judge accepts it, the NEW exact judge fails it), N8
  (the OLD kill function signals a non-leader pid), N2 (the OLD negctl passes `--since` cut at the space:
  the summary shows the midnight value).

**D. Documents** (no box needed except D3)
- **D1.** R5 §27/§28 strike-throughs with reasons: "1,100 tables" → 1,179 (V1); "controls for each" (V18);
  "oracle stubbed" (V10); "lines" → comparison entries (V19); the 27/27 wording (V25).
- **D2.** The handoff §1 rewritten to the current state (Astra v12 = 71, P16 done, P17 in progress);
  item 14 marked fixed in P15 with the line cited; EQUAL-CTX marked historical.
- **D3.** The retrace output of P16 captured and committed (`evidence/p16/retrace_trace_clean.txt`) and of
  P17 at the end.
- **D4.** A machine-readable current release inventory `evidence/release_inventory.json` (file → sha256 →
  the wave that last changed it → manifest), generated by a script from the manifests; the release
  manifest points at it. The `.bak`-equals-git result (V22) is recorded with the commands.

**C. C3: form-side charge-code provenance** (after A, B, D are green)
The comparator sees names and prices; the ledger and the source rows say which code *should* be billed.
C3 asks what code the form *actually used*. The form reads `rawat_jl_dr` / `detail_pemberian_obat`
(source codes) and looks up names and tariffs by code; it writes names, not codes, into `billing`.
- **T0 discovery gate (read-only, on a P17 clone, under the lock).** Establish, before building anything:
  (i) whether `performance_schema` statement history can be enabled at runtime
  (`events_statements_history_long`, consumers dynamic, no restart) without a persistent or live-visible
  change; (ii) whether the harness's JDBC statements carry literal `kd_jenis_prw` / `kode_brng` values
  (client-side prepared statements) so the SQL text shows the codes; (iii) whether statements can be
  attributed to an encounter (the `no_rawat` literal in neighbouring statements, thread id, or the
  per-visit time window of the harness log); (iv) that the instrumentation does not change any billed
  value (a clean run with it on equals a clean run with it off, on the fixture).
  **Stop rule:** if form-side codes are not observable without editing Khanza jars or sources, or without
  a persistent change to the live MySQL server, C3 stops at T0 and the doc records "not observable",
  with the evidence. No Khanza edit is ever made.
- **C1 observation.** If T0 passes: for each encounter, the set of (component, code) the form queried
  during its save, from the statement history filtered to the clone schema and the visit window, joined
  with the billed lines by display name. The form-side code set becomes a third source beside the ledger
  and the source rows.
- **C2 comparator.** `p17_c3_codes.py`: per encounter, form-side codes ⊇ the billed (component, code)
  entries and equal to the source-row codes; any code the form used that the source rows do not name, or a
  source code the form never used, is a MISMATCH; a statement window that cannot be attributed is an error
  (exit 2), never a pass.
- **C3 mutation (the one Astra asked for).** In a scratch copy of the clone, make the form pick a
  same-name/same-price wrong code: change the source row `kd_jenis_prw` J000840 → J000844 for one fixture
  visit (the two share display name and price), and for a drug visit likewise. The baseline must pass and
  that mutation must fail **on the form-side observation**, not on the ledger or the source rows; the
  OLD comparator (no form-side source) passes it. Record both outcomes with `ROW_COUNT()` asserted.
- **C4 rerun.** The fixture (27) and the real 300 on a fresh clone with the instrumentation on; report how
  many encounters have an attributable statement window, how many agree, and the per-encounter bound
  restated honestly (it bounds only the errors the form-side observation can see).

## 3. Required runs (order)

1. Lock status (free) and `lsattr` before; live-state baseline; acquire `P17-CLAUDE-<date>`.
2. Unfreeze, patch, deploy LF, local = box, re-freeze, manifest, `lsattr` after.
3. Safety controls A1–A12 (paired). Predicates and paired controls B1–B5 on a fixture clone.
4. A9 full-driver injected failure (its own clone build).
5. Regression on the changed suite/preservation/oracle bytes: full fresh suite, preservation check, unit
   test, P11 negative controls, P16 lib tests and controls.
6. T0 discovery (read-only). If it passes: C1–C4. If not: record the stop.
7. Final live-state proof, lock release captured, retrace, release inventory.

## 4. Records

R5 §29; release manifest pins and the new inventory; this doc §7; QMS `VER-…-R5-P17-001`; failure records
for any defect found in P17's own bytes and one for the P16 overclaims (V1, V10, V18, V20); traces
`r5-p17-task-doc`, `r5-p17-fixes`, `r5-p17-evidence`; the retrace must report trace-clean and its output
is committed.

## 5. Acceptance criteria and stated limits

- **AC-1.** Live state identical at baseline and final; ledger pin holds.
- **AC-2.** Frozen bytes verified before and after every phase; `lsattr` `i` on every frozen file.
- **AC-3.** A1–A8, A12: each paired control shows the OLD bytes failing and the NEW bytes passing, or is
  labelled new-bytes-only with the reason. A9: the real driver exits 1 on the injected failure with the
  assertions listed.
- **AC-4.** B1–B5: each plant asserts its row count; the OLD comparator passes the unit, registration and
  subset plants; the NEW one fails each.
- **AC-5.** D1–D4 done; V22 recorded with its commands.
- **AC-6.** C3: T0 passes and C1–C4 run, or T0 fails and the stop is recorded. No third outcome.
- **AC-7.** Suite 39/39, preservation PASS, unit 44/44 (plus new cases), NC 5/5 on the final bytes.
- **AC-8.** The retrace is trace-clean and its output committed.

Stated limits kept: V6 (an UPDATE of the payment row is not audited; no run-end bound), V13 (recovery
checks inclusion), X2, A11, the clean-box rebuild, the P14 ledger scope gaps, the P13 original summaries,
external validity, the advisory lock.

## 6. Rubric (0/1/2, /24; the P16 scale)

R1 verification table · R2 safety (A1–A12 paired, A9 full run) · R3 predicates (B1–B5 paired, rows
counted) · R4 C3 source independence (form-side observation, not ledger or source rows) · R5 C3 mutation
(OLD passes, NEW fails on the form-side source) · R6 C4 rerun (27 + 300, attributable windows reported) ·
R7 recovery repairs (A6, A6b, A7, A8) · R8 frozen-byte discipline (`lsattr` before/after, local = box) ·
R9 live-state proof · R10 document corrections (D1–D4, V22 commands) · R11 records and retrace output ·
R12 honesty (invalid first attempts kept, limits stated). Critical items: R2, R4, R5, R8, R9 must be 2
for Accept; a T0 stop scores R4–R6 as "not applicable" with the stop recorded, and the total is out of 18.
Re-scored by an independent review before Astra v13; the executor's self-score is not the verdict.

## 7. Result and self-score

*(filled after execution)*
