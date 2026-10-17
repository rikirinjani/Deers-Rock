"""Build the GPT-6 Astra v8 re-assessment task (post P1..P8) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment); supersedes the v7 tasks. Everything is read
from khanza-r5/ at build time. Budget: $8/month for the model, so v8 runs MERGED only (the
method v7 finished with, run 4894730): ONE call with BASE + CONTENT answers all six section
asks under fixed headings, then the usual synthesis call over the six sections.
Embeds: the v7 verdict (merged run 4894730, 58/100) plus v7 step 1's claim-honesty section
(run 4880158, which the v7 synthesis did not see), R5 report (incl. §19), P8 task doc + rubric,
the P8 suite transcript, the recovery unit test, the builder ALL check, the manifest, and every
gate/oracle/suite source.
"""
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
R5 = HERE.parent.parent                      # khanza-r5/
TOOLS = R5 / "tools"
DOCS = R5 / "docs"
EVID = R5 / "evidence"


def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8")


def newest(folder, pattern):
    hits = sorted((EVID / folder).glob(pattern))
    if not hits:
        raise SystemExit("evidence %s/%s missing" % (folder, pattern))
    return read(hits[-1])


REPORT = read(DOCS / "khanza_benchmark_report_R5.md")
P8TASK = read(DOCS / "khanza_r5_task_p8_claims_gates_recovery.md")
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
SUITE_RUN = newest("p8", "r5_p6_acceptance_*.md")
UNIT = newest("p8", "r5_p8_recovery_unit_test.txt")
ALLCHECK = newest("p8", "r5_p8_builder_all_check.txt")
V7 = read(EVID / "astra_v7_merged_4894730_output.md")
V7_VERDICT = V7[V7.index("## VERDICT"):V7.index("## RAW MERGED RESPONSE")]
V7S1 = read(EVID / "astra_v7_step1_4880158_output.md")
V7_CLAIM = V7S1[V7S1.index("## CLAIM-HONESTY"):]
for name, text in (("V7_VERDICT", V7_VERDICT), ("V7_CLAIM", V7_CLAIM)):
    if len(text.strip()) < 1000:
        raise SystemExit("%s too short (%d chars) - wrong source file?" % (name, len(text)))

tool_sources = []
for name, lang in [("sampled_real_form_diff_r5.py", "python"), ("dbutil.py", "python"),
                   ("build_dr_charge_ledger_p2.py", "python"),
                   ("charge_delta_per_component_p2.py", "python"),
                   ("three_count_reconcile_p2.py", "python"), ("p6_dbxml.py", "python"),
                   ("p6_acceptance_suite.sh", "bash"), ("p6_run_suite_fresh.sh", "bash"),
                   ("p7_tax_rule_check.py", "python"), ("p8_recovery_unit_test.py", "python"),
                   ("p8_builder_all_check.sh", "bash")]:
    tool_sources.append("### SOURCE: %s\n```%s\n%s\n```" % (name, lang, read(TOOLS / name)))

P8_SUMMARY = """== P8 SUMMARY (what changed since your v7 assessment, and what is NOT claimed) ==

Your v7 'single most important next step' was: replace the blanket PASS with a fail-closed
recovery acceptance test through the actual production wrapper on an immutable disposable clone;
inject corrupt recovery metadata, a surviving child writer, and interruption during restoration;
require verified writer termination, state checks, nonzero failure propagation and preserved
evidence.

How v7 was run (so you know what you saw): step 1 (claim-honesty, run 4880158) was one call;
the other five sections were answered in ONE merged call (run 4894730) because the model budget
fell to $8/month. A builder defect fed the v7 synthesis an EMPTY claim-honesty section (your
synthesis said so); step 1's own claim-honesty text is embedded below. v8 uses the merged method
for all six sections.

Every v7 code claim acted on was checked against the source first (P8 task doc §0, D1-D10); all
held. Delivered (sources, transcripts and R5 §19 embedded below):
- Recovery (pack C), all through p6_run_suite_fresh.sh on the disposable sik_p6f clone:
  A18a garbled hash file -> STAGE-RESTORE-UNVERIFIED (it used to raise a traceback); A18b wrong
  sha256 -> STAGE-RESTORE-MISMATCH; A19 SIGKILL to the oracle leaves the harness JVM alive -> the
  resume kills every recorded harness group and any BilingHarness naming a run visit, then
  requires none left AND unchanged output over a quiet interval before restoring (WRITER-ALIVE,
  no restore, exit 4 otherwise); A20 SIGKILL in the middle of a restore -> next resume redoes it,
  hash-verified; A21 FAILED stays FAILED unless --retry-failed, which re-bills only from a
  hash-verified state. Unit test (DB mocked) covers an unkillable writer and foreign hash files.
- Gates (pack B): A10b now also checks the number of tax rows; A10d plants a duplicate
  correct-amount tax row (the old amount query sees 0) and a wrong amount; p7_tax_rule_check
  exits 1 on any defect; the builder DELETE uses window AND cohort (A10e: a non-DR row survives
  2026-10 and ALL rebuilds); Decimal half-up instead of float rounding; earlier results archived,
  not deleted; a live database as fixture refused (A17).
- Wording (pack A): A11 no longer claims every restore (A15/A18a/A18b's deliberate failures are
  counted separately); the oracle no longer writes crash_safe=YES; stale report lines struck
  through or annotated.
- Result: 29/29 on a fresh fixture; unit test 11/11; the P8 builder reproduces the live ledger
  byte-identically; live sik output tables and ledger unchanged.
- Found and fixed during P8 (in R5 §19 and a failure record): the first cohort-scoped DELETE
  lost its index on a utf8mb4-to-latin1 join (~30 min); suite run 1 was stopped, torn down,
  live state verified unchanged, then the join was fixed and run 2 produced the evidence.

NOT claimed / not done in P8: reproducibility closure (stagea_common.py without secrets, Java
sources, STRATA SQL - pack D); matched-encounter B-C reconciliation and the R4 0/999
re-examination (pack E); concurrent-overlap isolation; fault modes not injected (power loss,
MySQL crash, disk full, a writer that ignores SIGKILL); re-validation of pre-P6 clone-mode runs;
C1-C4 external validity."""

BASE = """You are a tough but fair principal-engineer assessor performing a SIXTH assessment (v8) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365) -> 43/100 (run 4769794) -> 43/100 (run 4795743) -> 52/100 (run 4818826) -> 58/100 (v7: runs 4880158 + 4894730, 'Needs targeted rework'). Your v7 verdict and v7 claim-honesty section are embedded verbatim below; the owner has since executed wave P8. Your job:
1. VERIFY each v7 finding (genuinely fixed / merely claimed / still open, the P7-exposed problems, the top-3 issues, the single next step) against the CURRENT embedded evidence: the suite SOURCE and TRANSCRIPT, the unit test, the builder check, all tool sources, R5 §19, the P8 rubric. Confirm what is fixed in code AND demonstrated by an asserted run; reject what is only claimed; identify NEW problems P8 introduced.
2. Read the recovery code and checks critically: can each new check (A10d, A10e, A17, A18a, A18b, A19, A20, A21) fail when its property is violated? Is the writer-death proof in reap_writers sound? Is anything still asserted beyond what was run?
3. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P8. Do R5 §19, the P8 rubric, the suite's per-property summary and
the struck-through/annotated lines match the embedded transcripts and code? Recompute 29/29 and
the A11 counts. Does any stale wording still assert a withdrawn property (crash safety, 'every
restore verified', integer/no-float end-to-end, B-settlement)? Are the not-claimed items stated
as such? Give: what is honest, any remaining or NEW overclaim, a 0-10 score."""),
    ("gate-correctness", """
RE-READ the suite, three_count, builder, tax check and oracle sources:
(a) A10b/A10d: does the tax-row count query close the duplicate-row gap, and can p7_tax_rule_check
    still exit 0 on a defect?
(b) the builder's cohort-scoped DELETE (A10e): is delete scope now equal to insert scope for
    every --window/--cohort combination, including rows with no reg_periksa row?
(c) A17 and the oracle's live guard: which paths can still mutate live sik?
(d) A11 after the relabel: can a non-deliberate unverified restore still pass?
(e) NEW gate defects P8 introduced.
Give: concrete code-level findings (file + function + behaviour) and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P8: stage_restore's hash-file validation (A18a/A18b), reap_writers' kill
and quiet-interval proof (A19, unit test), restore idempotence under interruption (A20), and
--retry-failed (A21). Is the writer-death proof sufficient (process match by command line and
visit, group kill, quiet interval) or can a writer survive it? Rank the residual oracle risks and
say whether the oracle is fit for the stated claims. Give a 0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P8: the re-pinned manifest (local = VPS tool hashes), the builder
ALL check reproducing the ledger content hash, the one-command wrapper, archived results. What
still blocks a third party (pack D not done: stagea_common.py, Java sources, STRATA SQL, DB images,
credentials, the VPS)? Give blockers ranked and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after P8 (unchanged since v7 except recovery): the form writes billing
(P7 audit), three_count's note-level B, the aggregate B-C comparison. What is a fair E2E claim
now, what is the weakest leg, and what is the fix? Give a 0-10 score."""),
    ("external-validity", """
ASSESS external validity after P8 (unchanged surface: one Khanza/MySQL configuration,
outpatient, synthetic edge strata with no observable embalase/tuslah billing, C1-C4 NOT
TESTED). Score scoping honesty and the remaining external gap. Give the top external risk and a
0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your five prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743; 52/100 run 4818826; 58/100 v7 runs 4880158+4894730).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5 / 6 / 6; gate-correctness 3 / 3 / 3 / 5 / 6; oracle-validity 4 / 4 / 3 / 5 / 6; reproducibility 3 / 5 / 6 / 5 / 6; e2e-design 4 / 5 / 5 / 6 / 7; external-validity 3 / 4 / 4 / 4 / 4)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v7 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run), which are merely claimed, which are still open
2. Any NEW problems P8 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35, 43, 52 and 58
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    P8_SUMMARY
    + "\n\n== YOUR v7 VERDICT (merged run 4894730, 58/100) - the findings to re-verify ==\n"
    + V7_VERDICT
    + "\n\n== YOUR v7 CLAIM-HONESTY SECTION (step 1, run 4880158; not seen by the v7 synthesis) ==\n"
    + V7_CLAIM
    + "\n\n== R5 REPORT (incl. §18 P7, §19 P8) ==\n"
    + REPORT
    + "\n\n== P8 TASK DOC + RUBRIC ==\n"
    + P8TASK
    + "\n\n== P8 ACCEPTANCE SUITE TRANSCRIPT (29 checks, fresh fixture) ==\n"
    + SUITE_RUN
    + "\n\n== P8 RECOVERY UNIT TEST OUTPUT ==\n"
    + UNIT
    + "\n\n== P8 BUILDER --window ALL REPRODUCTION CHECK ==\n"
    + ALLCHECK
    + "\n\n== RELEASE MANIFEST (P8 re-pin) ==\n"
    + MANIFEST
    + "\n\n== GATE / ORACLE / SUITE SOURCES (P8 build) ==\n"
    + "\n\n".join(tool_sources)
)

# ---------------------------------------------------------------------------
# Task template (shared with build_astra_task_r7.py's merged mode): ONE call with
# BASE + CONTENT answers every section ask under '## KEY' headings; the task splits
# the response by heading, then runs the synthesis over the six sections.
# ---------------------------------------------------------------------------
import re
import sys

ORDER = [k for k, _ in SECTIONS]


body = '''"""
GPT-6 Astra v8 assessment of the DR->Khanza E2E billing benchmark (post P1-P8 remediation).
%s
All evidence/report/task-doc/v7-verdict/manifest/tool and suite sources embedded inline.
Assessment history: 4701365 = 35/100; 4769794 = 43/100; 4795743 = 43/100; 4818826 = 52/100; 4880158+4894730 = 58/100.
"""
import os
import re

os.environ.setdefault("LLM_DEFAULT", "gpt-6-astra")
os.environ.setdefault("LLM_DEFAULT_JUDGE", "gpt-6-astra")
os.environ.setdefault("LLMS_AVAILABLE", "gpt-6-astra")

import kaggle_benchmarks as kbench

BASE = %r

CONTENT = %r

SECTIONS = %r
SYNTH = %r
ORDER = %r
PRIOR = %r
LABEL = %r
EXPECT = %r
MAXTOK = %r
# section heading, tolerant of numbering/bold, e.g. "## 2. **GATE-CORRECTNESS** (re-read)"
HEAD = r"^#+\\s*(?:\\d+[.)]\\s*)?\\**\\s*%%s\\b[^\\n]*$"


@kbench.task(name="dr-khanza-e2e-full-assessment", description="GPT-6 v8 assessment of DR->Khanza E2E benchmark after P1-P8 remediation" + LABEL)
def dr_khanza_e2e_assessment(llm) -> dict:
    """Astra v8 assessment of the DR->Khanza E2E benchmark."""
    sections = {}
    errors = 0
    raw = ""
    for key, ask in SECTIONS:
        try:
            with kbench.chats.new("sec_" + key):
                resp = llm.prompt(BASE + "\\n\\n" + CONTENT + "\\n\\n" + ask,
                                  extra_api_params={"max_tokens": MAXTOK})
        except Exception as e:
            resp = "[ERROR] " + type(e).__name__ + ": " + str(e)[:300]
            errors += 1
        if key == "merged":
            # one call answered every key in EXPECT under '## KEY' headings: split it
            raw = resp
            for k in EXPECT:
                m = re.search(HEAD %% re.escape(k.upper()), resp, re.M)
                if not m:
                    continue
                rest = resp[m.end():]
                ends = [mm.start() for k2 in EXPECT if k2 != k
                        for mm in [re.search(HEAD %% re.escape(k2.upper()), rest, re.M)] if mm]
                sections[k] = (rest[:min(ends)] if ends else rest).strip()
        else:
            sections[key] = resp
    verdict = ""
    if SYNTH:
        allsec = dict(PRIOR)
        allsec.update(sections)
        digest = "\\n\\n".join("### " + k + "\\n" + allsec[k][-2500:] for k in ORDER if k in allsec)
        try:
            with kbench.chats.new("synthesis"):
                verdict = llm.prompt(SYNTH + "\\n\\n" + digest[:20000],
                                     extra_api_params={"max_tokens": 10000})
        except Exception as e:
            verdict = "[SYNTHESIS ERROR] " + type(e).__name__ + ": " + str(e)[:300]
            errors += 1
    lines = ["# Astra v8 assessment: dr-khanza-e2e-full-assessment (post P1-P8)" + LABEL, ""]
    for key in sections:
        lines += ["## " + key.upper(), "", sections[key], ""]
    if SYNTH:
        lines += ["## VERDICT", "", verdict, ""]
    if raw:
        lines += ["## RAW MERGED RESPONSE", "", raw, ""]
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
    kbench.assertions.assert_true(all(k in sections for k in EXPECT),
                                  expectation="all requested assessment sections produced")
    for key in sections:
        kbench.assertions.assert_true(len(sections[key].strip()) > 100,
                                      expectation=f"section {key} non-empty")
    kbench.assertions.assert_true(errors == 0,
                                  expectation="all LLM calls succeeded")
    if SYNTH:
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
'''

keys = ORDER
merged_ask = ("MERGED CALL: answer ALL SIX assessment asks below in this one response, "
              "in this order, each under its own heading line written exactly as shown "
              "(e.g. '## CLAIM-HONESTY'). Give each section comparable depth and end each "
              "with its own 0-10 score.\n\n"
              + "\n\n".join("## %s\n%s" % (k.upper(), a.strip()) for k, a in SECTIONS))
sections, synth, prior = [("merged", merged_ask)], SYNTH, {}
label = " [merged: all six sections in one call + synthesis]"
note = ("MERGED (budget $8/month): one call with BASE and CONTENT answers the six section asks, "
        "then the synthesis over all six — the method v7 finished with (run 4894730).")
name, maxtok = "task_r8_merged.py", 24000
text = body % (note, BASE, CONTENT, sections, synth, ORDER, prior, label, keys, maxtok)
out = R5.parent / "kaggle" / "deers-rock-assessment" / name
out.write_text(text, encoding="utf-8")
(HERE / name).write_text(text, encoding="utf-8")
import hashlib
print("wrote %s (%d bytes)" % (out, out.stat().st_size))
print("sections: %s (merged) · synthesis: True · max_tokens %d" % (keys, maxtok))
print("CONTENT chars: %d · sha256 %s" % (len(CONTENT), hashlib.sha256(CONTENT.encode()).hexdigest()[:16]))
