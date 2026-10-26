# R5-P15 independent review

- **Reviewer:** independent session (did not write or run P15)
- **Date:** 2026-10-26
- **Mode:** read-only, no box access. No ssh, no database, no lock. The only file written is this one.
- **Branch / commit read:** `khanza-r5-p6` at `3d96c96` (task doc commit `06e8a8e` precedes it)
- **Files read:**
  - `docs/khanza_r5_task_p15_safety_and_line_identity.md` (§1, §2, §5, §6, §7)
  - `docs/khanza_benchmark_report_R5.md` §27; spot lines 336, 1131, 1373
  - `evidence/p15/`: `chain.log`, `chain_e.log`, `lock_release.txt`, `live_state_baseline.txt`, all of `chain/` and `chain_e/` that are cited below, both manifests
  - tools (all 18 in manifest b hash-match the working copy with CR stripped):
    - new: `p15_line_identity.py`, `p15_line_negctl.sh`, `p15_a_negctl.sh`, `p15_b6_negctl.sh`, `p15_lib.sh`, `p15_chain.sh`, `p15_chain_e.sh`
    - changed: `p14_edge_run.sh`, `p13_wide_sample.sh`, `p10_preservation_check.sh`, `p11_negative_controls.sh`, `p6_acceptance_suite.sh` (P11 block)
    - old comparator, for comparison: `p14_line_identity.py`
    - also read: `p14_live_state.sh` l.12
  - `evidence/p14/t0_discovery.txt`
  - `docs/khanza_r5_release_manifest.md` (P15 pins)
  - `docs/khanza_r5_task_p14_edge_strata_line_identity.md` §10a
  - `docs/khanza_session_handoff_20261025.md` l.16
  - `records/failures/20261026T1240Z-*`, `20261026T0930Z-*`, `records/qms/…P15-001.json` (presence)

**Bottom line: 17/24, Accept with fixes** (self-score 23/24). Two critical items are at 1, not 2: R2 (driver safety) and R8 (frozen-byte discipline).

---

## 1. Rubric R1–R12

| # | Item | Self | Review | Evidence (quoted) | Reason |
|---|---|---|---|---|---|
| R1 | Verification table | 2 | **2** | Task doc §1: 37 verdict rows with locations, e.g. G1 "`p14_line_identity.py` l.138–141 \| **C**". I checked this against `p14_line_identity.py:138-141` (`inled = sorted(k for k in cand if (c, k) in L)`), and it matches. | Complete, with code locations. Small inconsistency: R5 §27 says "33 confirmed, **4 partly** true, 1 not confirmed", but the table has 3 P rows (G3, G10, R8). |
| R2 | A safety | 2 | **1** | `chain/a_negctl.txt`: "PASS A1 NEW P13 refusal leaves clone, grant, process (got sentinel=1 grant=4 dummy=alive)", "PASS A2 NEW P14 refusal …", "PASS A3 half-clone created by this run is dropped (got 0)". `chain/a_lib_test.txt`: "PASS A4 7/300 stops", "PASS A5 decide fixture 10 (stop rule) -> fail", "PASS A6 altered copy fails the pin check", "PASS A7 probe sees the grant (positive case)". | P13/P14 are fixed and shown. Two gaps keep this at 1: **(a)** A2 also named `p10_preservation_check.sh`, and it still installs its EXIT trap (`p10_preservation_check.sh:70`) before its refusals (l.79–82, 111, 121–122, 138). Its `pcleanup` (l.63–64) unconditionally restores `database.xml` and REVOKEs the benchmark grant on the fixture, whether this run added them or not. No A2 control was run on it. **(b)** A5 and A6 were shown only at function level (`p15_decide_exit`, `p15_ledger_pin_check` on a copy), not with the specified driver-level controls ("driver exits non-zero"; "alter one non-fixture ledger row on the clone before the check"). |
| R3 | B predicates | 2 | **1** | `chain/line_negctl.txt` 24/24 and `chain_e/b6_negctl.txt` 6/6. However, the same transcript shows the comparator ran with `"since": "2026-10-26"` (twice). | **B5 was not tested at the run-start boundary.** `p15_line_negctl.sh:39` passes `--since $SINCE` unquoted, so the value is split at the space and the comparator gets midnight, not `11:56:53.211266`. B5b moved the row back a whole day (`TIMESTAMPADD(DAY,-1,…)`, l.56), so it fails under either boundary. The specified B5 control ("pre-insert an audit row before the run start: fails") was not run. The code would **not** fail it: `p15_line_identity.py:138,204` counts only rows at or after `--since`, so a stale pre-run INSERT is ignored. Also, B4 "NULL numeric is never 0" is broken for payments: `p15_line_identity.py:129` uses `COALESCE(besar_bayar,0)+COALESCE(besarppn,0)`. Finally, B6 plants assert `ROW_COUNT() >= 1` (`p15_b6_negctl.sh:35-36`), not an exact count (AC-4). |
| R4 | C1 provenance | 2 | **2** | `p15_line_identity.py:160` `insrc = sorted(k for k in cand if k in S.get(c, set()))   # C1: source rows, not ledger`. `S` is built only from `rawat_jl_dr` and `detail_pemberian_obat` (l.133–136); `L` is never consulted in the mapping (l.149–168). AMBIGUOUS fails: l.192 sets the verdict and l.217/234 accept only EQUAL/EQUAL-SRC. `chain/real300_lines_summary.json`: `"EQUAL": 181, "EQUAL-SRC": 119`, no AMBIGUOUS. | Holds. The stated limit is honest: EQUAL-SRC agrees with the source rows, which is not form-side provenance (C3 not done). |
| R5 | C2 control | 2 | **2** | `chain/line_negctl.txt`: "ENC 2027/12/31/900026 E8 verdict=EQUAL-CTX … outcome=MATCH" (old) and "verdict=DIFFER … outcome=MISMATCH" (new), "PASS plant C2 ROW_COUNT (got 1)". | The plant is genuine (spot-check a). The closure comes from the line verdict (DIFFER), not only from `ledger_model`. |
| R6 | C4 rerun | 2 | **2** | `chain.log`: "fixture 27/27 … real 300/300", "REPRODUCES-PIN", "driver exit=0". `chain/fixture_lines_summary.json` `"pass": 27`; `chain/real300_lines_summary.json` `"pass": 300, "lines": 1240, "line_differ": 0`. R5 §27 states a per-encounter bound and the name-only limit. | Holds. Minor: the fixture and the 300 ran on **one** fresh clone (`sik_p14e`), where the spec says "fresh clones". This is harmless here, because the fixture visits and the real visits are disjoint. |
| R7 | E repairs | 1 | **1** | `chain_e/e_nc.log` "DISCRIMINATING=5 NOT-DISCRIMINATING=0"; `chain_e/e_suite.log` "PASS=39 FAIL=0"; `chain/e_unit.txt` E5/E6 cases PASS. | I agree with 1, for more reasons than the self-score gives. Besides "only after fix 2": **(a)** the E1 control ("delete the evidence file … → ERROR") and the E4 control ("delete the pre-op snapshot → exit 3") were never observed; only the code exists (`p11_negative_controls.sh:60-65`, `p10_preservation_check.sh:121`). **(b)** E3's "restore result asserted" is not in the code: `R28` is printed (`p6_acceptance_suite.sh:798`) but not part of the check-28 predicate (l.806). The conditional "−5" (l.792–796) runs in either arm whenever the hash differs, so a failed restore in the non-NC arm would be masked. **(c)** E5 holds in the oracle, but the suite turns any non-empty value into `=1` (`p6_acceptance_suite.sh:745,748` and `:817-818` `${LATE:+…=1}`), so `R5_NEGCTL_*=0` still activates the fault through the suite. |
| R8 | Frozen-byte discipline | 2 | **1** | `chain_e.log` "frozen P15 (b): 18/18 OK" at start and end. Manifest a→b diff: only `p6_acceptance_suite.sh` and `p15_b6_negctl.sh` changed, plus `p15_chain_e.sh` added. Working copy = manifest b 18/18 (my check), so local = box holds transitively. `.bak_p15_20261026/` exists on the box (the old-byte arms ran from it). Release manifest l.77–96 re-pinned. | The `chattr -i/+i` steps are **claimed, not evidenced**: no `lsattr`/`chattr` transcript exists anywhere in `evidence/p15/`, and the only mention is prose in the release manifest l.96. Under this review's rule ("missing evidence → cannot be 2"), that keeps R8 at 1. One `lsattr` transcript of the 18 files would lift it to 2. |
| R9 | Live-state proof | 2 | **2** | `chain/live_state_baseline.txt`, `chain/live_state_final.txt` and `chain_e/live_state_final.txt` are byte-identical apart from the header/disk lines (same sha256 of the remaining lines). Each lists the standing grants "sik:SELECT sik:INSERT sik:UPDATE sik:DELETE sik_bench:SELECT …" (a non-empty, positive case) and "live ledger: 356355:a66a3a54…". The probe is `grantee LIKE '%benchmark%'` (`p14_live_state.sh:12`), which A7 allows. The clone positive case: `chain.log` "probe sees 4 privileges". | Holds. Two caveats. The "line hash `ae5da20e…` three times" in R5 §27 is **claimed, not evidenced**: no file contains it, though the lines themselves are visibly identical. The 09:19Z top-level baseline differs from the final in "frozen P12: 15/15 → 9/15, P13: 6/6 → 3/6" (expected from the replaced bytes), so "identical apart from time" is slightly loose. |
| R10 | Document corrections | 2 | **1** | Strike-throughs with reasons: R5 l.336 (D3), l.1131 (D9), l.1373 (D5); release manifest l.9 (D1), l.184 (D2); handoff l.16 (D4); P14 task doc l.109/261 (D6), §10a (D7, 28→22). | D1–D7 and D9 are done. **D8 is not closed for P14.** R5 §27 says "the P14 release is shown indirectly by `RUNLOCK-FREE` at P15 start", but the only `RUNLOCK-FREE` in `evidence/p15/` is the P15 **end** (`lock_release.txt`). The 09:19Z baseline already shows "lock: session=P15-CLAUDE-20261026". So that claim is not evidenced. |
| R11 | Records | 2 | **1** | Doc first: commit `06e8a8e` precedes `3d96c96`. R5 §27 present; QMS `VER-2026-10-26-DR-KHANZA-R5-P15-001.json`; traces `r5-p15-*.pm1`; failure records `20261026T1240Z-…a28-hash-helper…`, `…b6-old-arm-importerror`, `20261026T0930Z-…vacuous-grant-probe`. | Task §4 asks for "one failure record per confirmed defect class (S, G, R, D)". Only S has one (S7); there are no G, R or D class records. The self-score's "retrace (see the commit)" is **claimed, not evidenced**: the commit message does not mention retrace, and no P15 retrace trace exists among the `retrace-*` traces. |
| R12 | Honesty | 2 | **1** | Both invalid first results are kept (`chain/r5_p11_negative_controls_20261026T123509Z.md` "NOT-DISCRIMINATING=1"; `chain/b6_negctl.txt` "FAIL B6 OLD bytes …"), recorded and re-run. | Keeping and recording the failures is exemplary. Several claims go beyond the evidence or the code: "the restore result is asserted" (E3, see R7); "B5b, the fresh row moved before the run start" (true, but tested against a midnight boundary, see R3); "a refusal touches nothing" (false for the preservation check, see R2); "RUNLOCK-FREE at P15 start" (R10); "`ae5da20e…` three times" (R9); "4 partly true" (R1); "retrace" (R11). |
| | **Total** | **23** | **17** | | |

---

## 2. Acceptance criteria AC-1..AC-8

| AC | Status | Quoted evidence / reason |
|---|---|---|
| AC-1 | **Met** | The three in-chain live-state files have identical content apart from the header lines. Standing grants are listed and unchanged; "live ledger: 356355:a66a3a546cc322…" appears at baseline and final. |
| AC-2 | **Partly** | `chain_e.log` "frozen P15 (b): 18/18 OK"; local = manifest b 18/18; the manifest is re-pinned. `chattr -i/+i` is not evidenced (R8). |
| AC-3 | **Partly** | P13/P14 refusal, pipefail, stop rule, pin and probe are observed (`chain/a_negctl.txt` 9/9, `chain/a_lib_test.txt` 19/19). `p10_preservation_check.sh` refusal safety is not fixed and has no control. The A5 and A6 driver-level controls were not run. |
| AC-4 | **Partly** | Every `p15_line_negctl.sh` plant shows "ROW_COUNT (got 1)". But B5 ran at a midnight `--since` ("since": "2026-10-26"), the specified pre-run-row control is missing, and the B6 plants are `>= 1`, not exact. |
| AC-5 | **Met** | "C2 old verdict … (got EQUAL-CTX)", "C2 old outcome (the hole: wrong code passes) (got MATCH)", "C2 new verdict … (got DIFFER)", "C2 new outcome (got MISMATCH)" in `chain/line_negctl.txt`. |
| AC-6 | **Met** | `real300_lines_summary.json` `"pass": 300`, `"EQUAL": 181, "EQUAL-SRC": 119`; `fixture_lines_summary.json` `"pass": 27`, `"b_eq_a": 27`, `"fresh_b_ok": 27`. |
| AC-7 | **Partly** | NC 5/5 under the repaired runner and suite 39/39 inside the held lock (released 13:11:37Z, after chain-E finished at 13:10:39Z). But the E1 and E4 controls are not observed, the E3 restore result is not asserted, and E5 is bypassed at the suite layer. |
| AC-8 | **Partly** | D1–D7 and D9 are struck through. D8 is not closed for P14. Failure records are missing for the G/R/D classes. The retrace is not evidenced. |

---

## 3. Spot checks

**a. C2 plant genuine?** Yes.
- `p15_line_negctl.sh:51` changes the ledger code J000840 → J000844 for 900026, with "ROW_COUNT (got 1)".
- `evidence/p14/t0_discovery.txt:371` lists both codes under the same `nm_perawatan` "Periksa Poliklinik Umum / IGD" (14-way collision).
- l.217 lists both in the 100000.00 `dr_tariff` price group.
- Source row: `fx_c/p14_edge_fixture.sql:81` `'2027/12/31/900026','J000840'`.

So the plant is "same name, same price, wrong code present in the ledger", on the same scratch copy. The old comparator gives EQUAL-CTX/MATCH (it even shows `form_model=DIFF ledger_model=DIFF` and still MATCHes, which is G2). The new one gives DIFFER/MISMATCH.

**b. C1 never uses the expected ledger to pick the actual code.** Confirmed.
- `p15_line_identity.py:155-166` uses only `pm`/`dm` (name → codes from `jns_perawatan`/`databarang`) and `S` (the encounter's source rows, l.133–136).
- `L` is used only in comparison (l.178+).

**c. B1.** Confirmed: `p15_line_identity.py:229-230`
`ok_all = (delta == want and line_ok and fresh and b_eq_a and rec["form_model"] == "MATCH" and rec["ledger_model"] == "MATCH")`.
`b_eq_a` = B == A_form total (l.205). An encounter without an expectation gets `NO-EXPECTATION` and fails (l.213, 232).

**d. B5.** The code (l.137–143, 204) counts `detail_nota_jalan` INSERTs `at >= since` and requires `(all, benchmark) == (1, 1)`. The `--since` values match the driver output:

| Run | `chain.log` 3a/3b `--since` | Driver output |
|---|---|---|
| Fixture | `"since": "2026-10-26 11:56:53.211266"` | "run start … = 2026-10-26 11:56:53.211266" |
| Real | `"since": "2026-10-26 11:58:44.832062"` | "run start … = 2026-10-26 11:58:44.832062" |

The run-start files under `runs/` agree with both. Two problems:
- **The negative control did not use the run start** ("since": "2026-10-26", from the unquoted `$SINCE`, `p15_line_negctl.sh:39`).
- **Stale pre-run INSERTs are ignored**, so "exactly one INSERT" means exactly one *in the window*, not exactly one in total.

**e. A1/A2 old failing / new safe; trap order.**
- `chain/a_negctl.txt` old P13: "after: sentinel=0 grant=0 dummy=dead"; old P14: "sentinel=1 grant=0 dummy=dead"; new: "sentinel=1 grant=4 dummy=alive" for both.
- Trap order in the new drivers is correct:
  - `p13_wide_sample.sh`: lock l.20, xml l.55, clone-exists l.58, `trap cleanup EXIT` l.59.
  - `p14_edge_run.sh`: fixture verify, lists, xml, clone-exists and disk at l.81–89, then `trap cleanup EXIT` l.90.
  - Cleanup is gated on `CREATED`/`GRANTED`/`RETARGETED`.
- **Not so for `p10_preservation_check.sh`:** trap at l.70, before the refusals at l.79–82/111/121/122/138, and with an ungated revoke and xml restore (l.63–64).

**f. First chain vs chain_e; is keeping A/B/C evidence legitimate?** Yes.
- Diffing manifests a and b, only `p6_acceptance_suite.sh` (`4c7a8b…` → `6a0715…`) and `p15_b6_negctl.sh` (`17a271…` → `7b2202…`) changed, plus the new `p15_chain_e.sh`. None of the A/B/C bytes (`p15_lib*.sh`, drivers, `p15_line_identity.py`, `p15_line_negctl.sh`, `p15_a_negctl.sh`, oracle, `p13_sample_compare.py`) changed, so the first-chain A/B/C evidence names bytes that are still current.
- Chain-E checks "18/18 OK" before and after its steps.
- The NC evidence names its bytes: `chain_e/r5_p11_…125926Z.md` "Tools: 6a071595c45b p6_acceptance_suite.sh".
- Note: `chain_e/e_unit.txt` is **byte-identical** to `chain/e_unit.txt`. That is plausible, since the unit test and oracle bytes did not change and the output carries no timestamp. But the file alone cannot show it was re-run; only the timestamped `chain_e.log` step header does.

**g. Live state.**
- `chain/live_state_baseline.txt` (11:55Z), `chain/live_state_final.txt` (12:46Z) and `chain_e/live_state_final.txt` (13:10Z) have the same sha256 over all non-header, non-disk lines.
- The top-level `live_state_baseline.txt` (09:19Z) differs only in "frozen P12: 15/15 OK / frozen P13: 6/6 OK" vs "9/15 / 3/6" afterwards. That is explained by the P15 replacement of 6 + 3 files.
- Lock release captured: "RUNLOCK-RELEASED", "RUNLOCK-FREE".

**h. Clopper–Pearson, n = 300, k = 0.** Correct.
- One-sided 95 %: 1 − 0.05^(1/300) = 0.00994 → **0.99 %**.
- Two-sided 95 % (upper, α/2): 1 − 0.025^(1/300) = 0.01222 → **1.22 %**.
- Correctly labelled per-encounter, with "under the P13 sampling assumption".

---

## 4. New problems found

| # | File:line | Problem | Severity |
|---|---|---|---|
| N1 | `tools/p10_preservation_check.sh:70` (with l.63–64, 79–82, 111, 121–122, 138) | The EXIT trap is installed before the refusal checks; `pcleanup` unconditionally restores `database.xml` and REVOKEs the benchmark grant on the fixture. This is v11 S2 left unfixed in a file A2 named. R5 §27 says "A refusal touches nothing". | High (critical item R2) |
| N2 | `tools/p15_line_negctl.sh:39` | `--since $SINCE` is unquoted. The timestamp contains a space, so the comparator received "2026-10-26" (see `chain/line_negctl.txt` `"since": "2026-10-26"`). B5 was therefore tested against midnight, not the run start. | Medium |
| N3 | `tools/p15_line_identity.py:138,204` | Fresh-B counts only rows `at >= since`. A stale INSERT before the run start is ignored, which contradicts the task's B5 control ("pre-insert an audit row before the run start: fails"). There is also no upper bound on the window. | Medium |
| N4 | `tools/p15_line_identity.py:129` | `COALESCE(besar_bayar,0)+COALESCE(besarppn,0)` turns a NULL payment into 0, contrary to B4 ("NULL/empty numeric = parse error, never 0"). | Low–medium |
| N5 | `tools/p6_acceptance_suite.sh:806` (with l.792–798) | The A28′ check does not assert the restore result `R28`. The conditional "−5" runs in either arm when the hash differs, so a failed restore in the non-NC arm can be masked into a PASS. R5 §27 says "the restore result is asserted". | Medium |
| N6 | `tools/p6_acceptance_suite.sh:745,748,817-818` | The suite maps any non-empty switch value (including `0`) to `=1` before calling the oracle, which undoes E5's exact-`1` rule at the suite layer. | Low–medium |
| N7 | `tools/p15_b6_negctl.sh:35-36` | B6 plants assert `ROW_COUNT() >= 1`, not an exact count (AC-4 asks for exact). | Low |
| N8 | `tools/p15_lib.sh:31-32` | `kill -TERM -- -$pid` assumes the recorded pid is a process-group leader. A non-leader pid is a silent no-op, and a reused pid of a foreign group leader would be signalled (only `kill -0` is checked). | Low |
| N9 | `evidence/p15/` (absent) | Evidence that is missing: the chattr/lsattr transcript; the E1 and E4 controls; the A2 control on the preservation check; the A5 driver-level stop-rule control; the P15 retrace; `RUNLOCK-FREE` before acquisition; the `ae5da20e…` grant-line hash. | Evidence gaps |
| N10 | `docs/khanza_benchmark_report_R5.md` §27 l.1391 | "4 partly true": the §1 table has 3 P verdicts (G3, G10, R8). | Trivial |

---

## 5. Total and verdict

**Total: 17/24** (self-score 23/24; difference −6).

| Item | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Review | 2 | **1** | 1 | 2 | 2 | 2 | 1 | **1** | 2 | 1 | 1 | 1 |

**Verdict under §6: Accept with fixes.**
- The total of 17 is in the 16–19 band.
- R4, R5 and R9 are at 2; R2 and R8 are at 1; none of the five critical items is at 0, so it is not Reject.
- §6 names "one of those five at 1" as Accept with fixes and does not address two. I read two at 1 as still Accept with fixes, because the band rule already places 17 there; the owner may read it more strictly.

**The core result stands.** The C1/C2 line-identity rework is real and well evidenced: the hole is shown open on the old comparator and closed on the new one, and the 300 + 27 rerun is clean. The deductions come from the safety and evidence edges around it.

## 6. Top 3 fixes before Astra v12

1. **Finish A2 on `p10_preservation_check.sh`.** Move every refusal (foreign fixture, suite evidence, snapshot checks) before `trap pcleanup EXIT`. Gate the revoke and xml restore on flags set by this run. Run the same old-vs-new control as `p15_a_negctl.sh` (existing fixture + grant + dummy process). This lifts R2.
2. **Make B5 and E3 test what they claim.**
   - Quote `--since "$SINCE"` in `p15_line_negctl.sh:39` and re-run the line controls; the summary must show the full run-start timestamp.
   - Decide and implement the B5 semantics: exactly one INSERT **in total**, and it at or after the start. Add the specified "pre-run audit row → fail" plant.
   - Make the A28′ check assert `R28 = restored` and confine the −5 compensation to the NC arm.
   - Remove the `COALESCE` on payments and the non-empty→`1` switch mapping in the suite.
3. **Close the evidence gaps** (these lift R8, R10, R11 and R12):
   - an `lsattr` transcript of the 18 frozen files;
   - the observed E1 control (delete the evidence file → ERROR) and E4 control (delete the pre-op snapshot → exit 3);
   - an A5 driver-level stop-rule run;
   - the P15 retrace output;
   - failure records for the G, R and D defect classes;
   - in R5 §27, withdraw by strike-through the "RUNLOCK-FREE at P15 start", "`ae5da20e…`" and "4 partly" claims, or attach the evidence for them.
