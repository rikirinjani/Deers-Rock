"""Build the GPT-6 Astra v5 re-assessment task (post P1..P5) for DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment) as v4; this supersedes task_r5_reassess.py.
Embeds: R5 report (incl. new §15), P5 task doc + rubric, P5 evidence summary, the six
prior re-assessment findings (run 4769794, 43/100) being re-verified, updated tool sources.
"""
import pathlib

ROOT = pathlib.Path(r"C:\Users\think")
TOOLS = ROOT / "AppData" / "Local" / "Temp" / "opencode"
REPORT = (ROOT / "khanza_benchmark_report_R5.md").read_text(encoding="utf-8")
P5TASK = (ROOT / "khanza_r5_task_p5_failclosed.md").read_text(encoding="utf-8")
MANIFEST = (ROOT / "khanza_r5_release_manifest.md").read_text(encoding="utf-8")

P5_EVIDENCE = """== P5 EVIDENCE SUMMARY (p-chain/r5_p5_failclosed_20261015T2200Z.md, full file on the live box) ==

Code changes to sampled_real_form_diff_r5.py:
- P5-1 exit contract: 0 clean in-envelope pass; 1 in-envelope drift/parse errors; 4 FAILED
  batches or out-of-envelope (PARTIAL-NOT-COVERED). Priority 4 > 1. main() now propagates
  the _finalize exit code via sys.exit (the pre-P5 code returned 0 unconditionally).
- P5-2 conditional BILLED: BILLED only on rc==0 AND all visits sukses=true; otherwise FAILED
  (+fail_reason), the batch is restored from its stage backup (complete pre-run state
  re-applied), and the run stops (no further batches).
- P5-3 eligibility-based classification: the out-of-envelope set is captured AT LOAD
  (st['out_of_envelope']), labeled OUT-OF-ENVELOPE via a 'classification' column in the
  result CSV/MD, excluded from the drift rate (rate denominator = in-envelope diffable
  rows only), and forces verdict PARTIAL-NOT-COVERED. Per-visit rows are emitted for
  EVERY batch including FAILED ones (CSV/MD carry batch_status + fail_reason columns;
  a FAILED-batch row has mismatch=null - no diff is claimed for it). This replaces the
  pre-P5 attempt-based 'not in attempted' logic.
- P5-4 repair gated: consumer rebill now requires --repair-consumer; default logs
  REPAIR-SKIPPED and leaves drift as drift (pre-P5 auto-repair ran by default, masking
  form failure and mutating the target).
- P5-5 per-run stage tables r5_stage_<runid>_<table>; dropped at finalize (box left
  clean); a mid-run crash keeps them for resume.
- P5-5b privilege split (v5-validation pass): stage-table DDL (CREATE/DROP) runs as
  root via dbutil.execute(..., force_root=True); ALL DML stays on the minimally-
  privileged benchmark user (the benchmark user lacks CREATE). DBUTIL_FORCE_ROOT=1
  routes every op to root for scratch-clone runs. A stage-backup failure marks the
  batch FAILED and stops the run (fail-closed infra path - no partial-billing state
  left behind).
- build_dr_charge_ledger_p2.py (P5-6): --manifest-file/--require-manifest (existence-only
  checks that were never consumed) REMOVED; docstring states the shared-source limit
  (quantities/codes derive from the DR source tables; a pre-adapter encounter manifest
  was considered but is NOT implemented) as an open item.

NOTE ON THE v5 VALIDATION PASS: the initial P5 build (oracle SHA c729ad06, built
2026-10-15 ~22:00 UTC) shipped with two defects that its own evidence summary had
overstated - (1) _finalize emitted result rows only for BILLED batches, so the STRATA
demo's result CSV was header-only (the summary claimed 5 OUT-OF-ENVELOPE rows that
were not there); and (2) the drift demo exited 1 via an UNCAUGHT CREATE-privilege
traceback (benchmark user lacks CREATE), not via the exit contract. The Kaggle task
validation model (gemini-3.8-flash, run 4795485) caught both from the embedded source
before the gpt-6-astra run could execute. The current embedded source (oracle SHA
70f37ba3, dbutil SHA 7ce404a1, built ~23:15 UTC) contains the re-patch and the
re-run evidence below; treat the c729ad06-era evidence as SUPERSEDED.

Demo A - STRATA fail-closed (re-run 2026-10-15 ~23:05 UTC, live sik under
DBUTIL_FORCE_ROOT=1 since the sik_p2 scratch fixture had been dropped by post-demo
cleanup; equivalent disposable-clone semantics: the 5 STRATA- visits are synthetic
no_rawat values with no live reg_periksa rows, so the harness bills empty output,
sukses=false fires, and stage-restore re-applies the pre-reset state):
- 5 STRATA- visits, --allow-strata, no --repair-consumer.
- Log: ALLOW-STRATA 5 OUT-OF-ENVELOPE; stage-backup -> r5_stage_r5p5_strata_*;
  date 2026-10-01: FAILED (sukses=false for 5/5) - pre-reset state restored,
  run stops (P5-2); ORACLE_PARTIAL-NOT-COVERED: EXIT CODE 4.
- REPAIR-SKIPPED fired (zero REBILL lines).
- Result CSV now carries all 5 rows with classification=OUT-OF-ENVELOPE,
  batch_status=FAILED, fail_reason=sukses=false for 5/5 visits, mismatch=null
  (no diff claimed for a restored/failed batch). Drift rate denominator excludes
  them. Stage tables dropped; live box left clean (0 r5_stage_* tables on sik).
- state.json: phase DONE, out_of_envelope lists all 5, batch FAILED
  restored=true.

Demo B - drift fail-closed (re-run ~23:05 UTC, live sik): 2 in-envelope visits
(2026/10/01/000254, 000289), frozen consumer baseline (3+1 value rows), run ->
in-envelope mismatch (real rows after form billing differ from the frozen
consumer baseline) -> verdict FAIL, EXIT CODE 1. The mismatch is the B-subset
fixture behavior (the headless form save writes the verification layer, not the
consumer's billing settlement rows) PLUS the F1-precedented databarang.ralan
B000001135 +1000 tamper applied before the bill; the causal split between the two
is not established (disclosed in the evidence file). What IS proven: a
mismatched in-envelope run exits 1 through the _finalize verdict path (not a
traceback), and can no longer report success. Price reverted to 34,584; the 2
visits re-billed to canonical; post-restore charge_delta PASS (delta 0, A==C
31,750 / Rp 3,113,533,580).

Demo C - clean pass (live sik): 2 in-envelope visits, no tamper -> rc=0
visits=2 sukses_true=2 -> BILLED; drift=0; CLEAN RUN EXIT CODE 0; box left clean.

Ops finding: live oracle runs need DBUTIL_FORCE_ROOT=1 (benchmark user lacks
CREATE for per-run stage tables AND has no grants at all on scratch DBs);
post-P5-5b the DDL escalates per-op via dbutil force_root, so live runs work
with the env flag unset and only the two DDL ops touch root.

Post-demo state (verified ~23:15 UTC): charge_delta live PASS (delta 0, all
four components exact); three_count A==C 31,750 / Rp 3,113,533,580 (Count B
moved 149 -> 151 notes / Rp 49,738,954 -> Rp 49,903,019 because the re-demos
billed 2 more visits through the form's save path - B is the form-save subset
and legitimately grows as form runs complete; the P2-BC-TOTAL FAIL verdict is
the expected honest state); ledger 356,355 / Rp 34,870,243,633; 0 r5_stage_*
tables on live sik; harness setting/database.ini = sik; scratch DBs dropped.

R5 report P5-7 consistency patches applied: section 13 MySQL '8.4' -> '8.0.46'
(the manifest/server pin); section 14 E2 burst now carries BOTH ms/visit
figures (65.5 wall vs 64.2 consumer-internal, 916 v/min); section 14
line-diff restated as the QUANTITY slice closed (aggregate), not code-level;
section 5 footnote clarifies 8,353 dx rows (native diagnosa table) vs
'empty-set' (generated-cohort prefix-cutoff slices - different scopes);
section 14 B3-edge wording updated to P5 eligibility-based behavior (exit 4,
OUT-OF-ENVELOPE column); new section 15 P5 added (incl. the P5-5b
v5-validation-pass note); release-manifest tool SHAs updated (oracle
70f37ba3..., dbutil 7ce404a1... newly pinned, builder 6f81ec1f...).
"""

tool_sources = []
for name in ["sampled_real_form_diff_r5.py", "build_dr_charge_ledger_p2.py",
             "charge_delta_per_component_p2.py", "three_count_reconcile_p2.py",
             "dbutil.py"]:
    src = (TOOLS / name).read_text(encoding="utf-8")
    tool_sources.append("### SOURCE: %s\n```python\n%s\n```" % (name, src))

PRIOR = """== PRIOR RE-ASSESSMENT FINDINGS (run 4769794, 43/100, 'Not ready' - the code-level defects P5 targeted) ==

1. FAIL-OPEN (oracle-validity, gate-correctness): _finalize() logged ORACLE_DRIFT but main()
   returned 0; _bill_date() assigned BILLED unconditionally after run_harness regardless of
   rc or sukses. A drifted/destructive run reported process success.
2. NOT-COVERED MISCLASSIFIED BY ATTEMPT, NOT ELIGIBILITY: with --allow-strata every visit was
   attempted, so STRATA visits surfaced as plain MISMATCH and the not-covered markers never
   fired. The R5 section-14 'not-covered' claim did not match behavior.
3. MANIFEST NEVER CONSUMED: build_dr_charge_ledger_p2.py --require-manifest/--manifest-file
   checked file existence only, never consumed the manifest - an unimplemented control
   presented as one.
4. LINE-DIFF SCOPE OVERSTATED: --line-diff is a per-visit per-component QUANTITY aggregate
   (drug+procedure), not a code-level line diff; pure same-price code-label swaps remain
   invisible (billing stores item names, not codes). The R5 section-14 'line-diff closed the
   (b) limit' wording overstated it.
5. REPORT INCONSISTENCIES: MySQL '8.4' (section 13) vs 8.0.46 (manifest/server); 916 v/min
   stated with the consumer-internal 64.2 ms/visit when the wall figure is 65.5 ms/visit;
   section-5 '8,353 rows' vs 'empty-set' apparent contradiction; section-14 B3-edge wording
   not matching the attempt-based not-covered behavior.
6. GLOBAL STAGE-TABLE HAZARD: r5_stage_<table> names were global while locks were per-run-dir
   - cross-run interference (later run could restore an earlier run's state).

Genuinely fixed in v4 (verified against code, NOT to be re-challenged): hybrid benchmark
scope disclosure; 0/50 treated as a diagnostic refusal, not a gap; the '5x headroom'
withdrawal (916 cold vs 1,802 warm); B3 encounter-set replay byte-identical + seeds + pins.

7. (Introduced by the P5 first-pass build, caught by the v5 task VALIDATION model
   gemini-3.8-flash run 4795485 before the gpt-6-astra run could execute, and re-fixed
   in the current embedded source - verify the fix holds rather than assuming it:)
   (a) _finalize emitted result rows only for BILLED batches, so a FAILED STRATA batch
       wrote a header-only CSV - the evidence summary's claim of '5 OUT-OF-ENVELOPE rows'
       was contradicted by the artifact it pointed at.
   (b) The drift demo's exit-1 was an uncaught CREATE-privilege traceback (benchmark
       user lacks CREATE), NOT the fail-closed exit contract - the evidence file's
       'DRIFT RUN EXIT CODE: 1' mislabeled a crash as a contract proof.
   The re-patch (current embedded source): per-visit rows for non-BILLED batches
   (batch_status + fail_reason columns), stage DDL via root / DML via benchmark user
   (dbutil force_root split), stage-backup failure -> FAILED + stop. Judge whether the
   re-patch genuinely closes (a) and (b), and whether re-running the demos on the live
   box (post-demo cleanup had dropped the scratch sik_p2 fixture, so Demo A was
   re-anchored to live sik with synthetic STRATA- no_rawat values) is an equivalent
   demonstration."""

BASE = """You are a tough but fair principal-engineer assessor performing a THIRD assessment (v5) of a DR->Khanza E2E billing benchmark. History: first assessment 35/100 NOT READY; after remediation waves P1-P4 your re-assessment scored 43/100 'Not ready' and listed six code-level defects (embedded above as 'PRIOR RE-ASSESSMENT FINDINGS'). The owner has now executed wave P5: executable fail-closed enforcement + report consistency. The P5 first-pass build itself was found (by the Kaggle task validation model, run 4795485) to contain two evidence defects (finding #7 in the embedded prior-findings block), which the current embedded source re-patches. Your job:
1. VERIFY each of the seven prior findings against the CURRENT embedded evidence (R5 report incl. new section 15, P5 task doc + rubric, P5 evidence summary, and the full tool sources incl. dbutil.py): confirm what is genuinely fixed in code, reject what is still merely claimed, and identify any NEW problems P5 introduced.
2. Pay attention to what P5 does NOT claim: the same-encounter form-vs-consumer financial equivalence remains structurally unclaimable (B-subset finding from P1); the drift demo proves the exit contract, not the tamper's causal chain (stated honestly in the evidence summary). Judge whether that honesty boundary holds in the report wording.
3. Judge the demo re-anchoring: post-demo cleanup dropped the scratch sik_p2 fixture, so Demo A (STRATA) was re-run on live sik with synthetic STRATA- no_rawat values (no live reg_periksa rows -> harness bills empty -> sukses=false). Is that an equivalent demonstration of the fail-closed contract, or does it weaken Demo A's claim?
4. Re-score the same 6 equally-weighted 0-10 criteria:
   (1) claim-honesty - are claims scoped, evidenced, internally consistent? Do the P5 section-15 claims match the actual code behavior (exit codes, conditional BILLED, eligibility classification, gated repair, per-run stage tables, P5-5b DDL/DML split)?
   (2) gate-correctness - read the five embedded tool sources (incl. dbutil.py). Is the fail-closed exit contract real (main() propagates _finalize; no unconditional return 0 path)? Is BILLED truly conditional? Does finding #7(a) - the header-only CSV - now genuinely not recur? Is the three_count/charge_delta surface still sound?
   (3) oracle-validity - is the not-covered marker now eligibility-based and firing? Is a mismatched in-envelope run provably unable to exit 0? Does the P5-5b privilege split open any new oracle risk? Are the remaining oracle risks acceptable for the stated claims?
   (4) reproducibility - P5 updated the release-manifest tool SHAs (oracle 70f37ba3..., dbutil 7ce404a1... newly pinned); B3 replay + seeds + pins from P4; what remains genuinely open (cross-machine, DOI)?
   (5) e2e-design - is the hybrid characterization still honest after P5? Weakest remaining leg?
   (6) external-validity - C1-C4/cross-machine/DOI human-gated and NOT TESTED; ICD-10 mapper opt-in and explicitly uncalibrated. Score scoping honesty.
Be specific; quote the code and the report. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty for the P5 state. Check specifically:
- Does R5 section 15 match the code? (exit 1/4/0 contract; BILLED conditional on rc==0 AND
  all sukses; FAILED -> stage-restore + run stop; eligibility-based OUT-OF-ENVELOPE;
  REPAIR-SKIPPED default; per-run r5_stage_<runid>_* dropped at finalize.) Read the embedded
  sampled_real_form_diff_r5.py source and confirm each claim.
- Is the drift-demo honesty note correct and well-placed (B-subset-driven mismatch, tamper
  causal role NOT established, exit contract proven)?
- The five P5-7 report consistency patches (MySQL 8.0.46, dual ms/visit figures, line-diff
  quantity-slice restatement, 8,353 vs empty-set clarification, B3-edge P5 wording) - do they
  now hold, and did P5 introduce any NEW internal contradiction (e.g., section 14 vs section 15)?
- Is the builder honesty fix real (unconsumed manifest flags removed, shared-source limit
  stated as open item)?
Give: what is now genuinely honest, any remaining or NEW overclaim, and a 0-10 score with a
one-sentence justification."""),
    ("gate-correctness", """
RE-READ the four embedded tool sources and verify the P5 gate fixes:
(a) sampled_real_form_diff_r5.py: find every path that reaches sys.exit. Confirm exit 0 is
    unreachable when any in-envelope visit mismatches/parse-errors OR any batch FAILED OR
    out-of-envelope visits exist. Check the --freeze-only/--verify-frozen early-returns and
    the resume loop for any path that could still return 0 on a failed batch.
(b) BILLED assignment: confirm it requires rc==0 AND all sukses; confirm FAILED triggers
    stage_restore + batch-stop.
(c) classification: confirm OUT-OF-ENVELOPE comes from st['out_of_envelope'] captured at
    load (eligibility), not from attempted sets; confirm the drift-rate denominator excludes
    out-of-envelope rows.
(d) build_dr_charge_ledger_p2.py: confirm no --manifest-file/--require-manifest flags remain;
    confirm the fail-closed tariff path + transactional replace are intact.
(e) any NEW gate defects P5 introduced (e.g., stage_drop dropping tables another run needs;
    REPAIR-SKIPPED hiding a real mismatch that should still fail; per-run stage tables
    colliding with an identical RUN_ID on re-entry).
Give: concrete code-level findings (file + function + behavior), any gate you still would not
trust, and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the P5 oracle changes. Prior finding #1 (fail-open) and #2 (attempt-based not-covered)
are the ones to verify hardest:
- Is a mismatched in-envelope run now UNABLE to report process success? (trace main() ->
  _bill_date -> _finalize -> sys.exit)
- Do the STRATA not-covered markers now fire by construction (eligibility at load)?
- Demo A (STRATA, exit 4, restored=true, REPAIR-SKIPPED, stage-drop) - does the evidence
  summary actually prove AC-1..AC-5, or does it prove a weaker variant?
- Demo B (drift, exit 1) - the evidence says the mismatch was B-subset-driven, not
  tamper-causal. Is that an acceptable proof of the exit contract for a 'fail-closed oracle'
  claim, or does the oracle still need a settlement-level tamper demo to be trustworthy?
- Residual risks: timeouts (rc=-1 path), missing settlement rows, missing reg_periksa rows,
  stage_restore partial failure mid-restore.
Give: residual oracle risks ranked, whether the oracle is now fit for its stated claims, and
a 0-10 score."""),
    ("reproducibility", """
ASSESS the P5 reproducibility state. The manifest now pins the P5 tool SHAs
(sampled_real_form_diff_r5.py c729ad06..., build_dr_charge_ledger_p2.py 6f81ec1f...;
charge_delta/three_count unchanged from P4). B3 encounter-set replay (sha256
84991ca4...), seeds, jar/JDK/MySQL pins all from P4.
- Does the P5 manifest update close the 'manifest never consumed' critique (finding #3)?
  (It removes the unimplemented control rather than implementing it - is that the right
  call for a benchmark manifest?)
- What remains genuinely open: second-VPS cross-machine hash, DOI/Zenodo archival, and now
  the new operational dependency DBUTIL_FORCE_ROOT=1 for live oracle runs (benchmark user
  lacks CREATE) - is that operational burden documented well enough for a third party?
Give: reproducibility blockers ranked and a 0-10 score."""),
    ("e2e-design", """
ASSESS the P5 state of the e2e design. The hybrid characterization (direct-DB fixtures +
sampled real-form + simulator scale), B-subset structural limit, 7.14 vs 1,802 v/min
separation, BilingHarness v4, edge-strata envelope, E2 burst reframing are all from P1-P4.
P5 adds: executable fail-closed enforcement (exit contract) and the two ms/visit figures
kept separate.
- Is the design now internally consistent (no section claiming a property the code lacks)?
- Weakest remaining leg: is it still the B-subset settlement gap, or something P5 introduced?
- Is 'fail-closed' an overclaim now that the drift demo is B-subset-driven rather than
  tamper-causal?
Give: whether E2E is fairly claimed, the weakest leg + a fix, and a 0-10 score."""),
    ("external-validity", """
ASSESS external-validity for the P5 state. Nothing P5 did changes the external surface:
C1-C4 NOT TESTED (human-gated), cross-machine D2 human, DOI human, ICD-10 mapper opt-in and
explicitly UNCALIBRATED (master-sampled; FK integrity PASS, determinism MATCH, zero billing
impact; calibration not claimed). P5's report patches (MySQL 8.0.46, dual ms/visit) improve
internal consistency only.
- Score the scoping honesty and the size of the remaining external gap. What single external
  item most limits publication value? Is the paper-safe boundary sentence (R5 section 13)
  still sufficient protection?
Give: the top external risk, whether the boundary wording is publication-safe, and a 0-10
score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your two prior assessments (35/100 run 4701365; 43/100 run 4769794).

For each criterion score (0-10), give:
- The score, and the DELTA vs your two prior scores (prior: claim-honesty 4 then 5; gate-correctness 3 then 3; oracle-validity 4 then 4; reproducibility 3 then 5; e2e-design 4 then 5; external-validity 3 then 4)
- One sentence of justification quoting specific evidence (code or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which of the six prior re-assessment findings (run 4769794) are GENUINELY fixed in code (verified), which are merely claimed fixed, and which are still open
2. Any NEW problems the P5 remediation introduced
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35 and vs 43
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    P5_EVIDENCE
    + "\n\n== R5 REPORT (superseding close-out, now includes P5 section 15) ==\n"
    + REPORT
    + "\n\n== P5 TASK DOC + RUBRIC (task-first, filled at close) ==\n"
    + P5TASK
    + "\n\n" + PRIOR
    + "\n\n== RELEASE MANIFEST (P5 tool-SHA update) ==\n"
    + MANIFEST
    + "\n\n== GATE/ORACLE TOOL SOURCES (P5 build) ==\n"
    + "\n\n".join(tool_sources)
)

body = '''"""
GPT-6 Astra v5 assessment of the DR->Khanza E2E billing benchmark (post P1-P5 remediation).
All P5 evidence/report/task-doc/prior-findings/manifest/tool sources embedded inline - no
[SKIP], no provisional scoring.
Assessment history: run 4701365 = 35/100 NOT READY; run 4769794 = 43/100 NOT READY.
"""
import os

os.environ.setdefault("LLM_DEFAULT", "gpt-6-astra")
os.environ.setdefault("LLM_DEFAULT_JUDGE", "gpt-6-astra")
os.environ.setdefault("LLMS_AVAILABLE", "gpt-6-astra")

import kaggle_benchmarks as kbench

BASE = %r

CONTENT = %r

SECTIONS = %r
SYNTH = %r


@kbench.task(name="dr-khanza-e2e-full-assessment", description="GPT-6 v5 assessment of DR->Khanza E2E benchmark after P1-P5 remediation")
def dr_khanza_e2e_assessment(llm) -> dict:
    """Astra v5 assessment of the DR->Khanza E2E benchmark."""
    sections = {}
    errors = 0
    for key, ask in SECTIONS:
        try:
            with kbench.chats.new("sec_" + key):
                resp = llm.prompt(BASE + "\\n\\n" + CONTENT + "\\n\\n" + ask,
                                  extra_api_params={"max_tokens": 8000})
        except Exception as e:
            resp = "[ERROR] " + type(e).__name__ + ": " + str(e)[:300]
            errors += 1
        sections[key] = resp
    digest = "\\n\\n".join("### " + k + "\\n" + v[-2500:] for k, v in sections.items())
    try:
        with kbench.chats.new("synthesis"):
            verdict = llm.prompt(SYNTH + "\\n\\n" + digest[:20000],
                                 extra_api_params={"max_tokens": 10000})
    except Exception as e:
        verdict = "[SYNTHESIS ERROR] " + type(e).__name__ + ": " + str(e)[:300]
        errors += 1
    lines = ["# Astra v5 assessment: dr-khanza-e2e-full-assessment (post P1-P5)", ""]
    for key in sections:
        lines += ["## " + key.upper(), "", sections[key], ""]
    lines += ["## VERDICT", "", verdict, ""]
    report = "\\n".join(lines)
    for p in ["dr-khanza-e2e-full-assessment_output.md", "/kaggle/working/dr-khanza-e2e-full-assessment_output.md"]:
        try:
            with open(p, "w", encoding="utf-8") as f:
                f.write(report)
        except Exception:
            pass
    for i in range(0, len(report), 3000):
        print(f"---REPORT-CHUNK {i // 3000}---")
        print(report[i:i + 3000])
    kbench.assertions.assert_true(len(sections) == 6,
                                  expectation="all six assessment sections produced")
    for key in sections:
        kbench.assertions.assert_true(len(sections[key].strip()) > 100,
                                      expectation=f"section {key} non-empty")
    kbench.assertions.assert_true(errors == 0,
                                  expectation="all LLM calls succeeded")
    kbench.assertions.assert_true(len(verdict.strip()) > 100,
                                  expectation="verdict produced")
    return {"sections": list(sections), "errors": errors,
            "verdict": verdict[:2500], "report_chars": len(report)}


# Kaggle creation-time smoke run: no model bound, all LLM calls fail; that is
# expected and must not block creation. Model runs via `kaggle b t run` bind a
# real model and call .run() themselves. We still invoke .run() at import so
# the kernel produces run output during task creation (Kernel_Without_Run fix).
try:
    _reg = getattr(kbench, "llms", None) or {}
    _target = _reg.get("gpt-6-astra")
    if _target is None:
        try:
            _target = kbench.llm("gpt-6-astra")
        except Exception:
            _target = getattr(kbench, "llm", None)
    run = dr_khanza_e2e_assessment.run(llm=_target)
    _res = getattr(run, "result", None)
    print("FINAL:", str(_res)[:2000])
except Exception as _e:
    print("IMPORT-RUN skipped/failed (expected at creation-time):",
          type(_e).__name__, str(_e)[:300])
''' % (BASE, CONTENT, SECTIONS, SYNTH)

out = ROOT / "Project_v2" / "Deers-Rock" / "kaggle" / "deers-rock-assessment" / "task_r5p5_reassess.py"
out.write_text(body, encoding="utf-8")
print("wrote %s (%d bytes)" % (out, out.stat().st_size))
print("CONTENT chars: %d" % len(CONTENT))
