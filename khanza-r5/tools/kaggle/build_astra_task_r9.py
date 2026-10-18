"""Build the GPT-6 Astra v9 re-assessment task (post P1..P9) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment). Merged method only (as v8): ONE call with BASE +
CONTENT answers all six section asks under fixed headings, then the synthesis over the six.
Embeds: the v8 verdict (run 4897654, 60/100), R5 report (incl. §20), P9 task doc + rubric, the
P9 suite transcript, the terminal-path check and its suite evidence, the builder check, the unit
test, the manifest, and every gate/oracle/suite source.
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
P9TASK = read(DOCS / "khanza_r5_task_p9_recovery_contract.md")
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
SUITE_RUN = newest("p9", "r5_p6_acceptance_*.md")
TERMINAL = newest("p9", "r5_p9_terminal_path_2*.md")
TERMINAL_SUITE = newest("p9", "r5_p9_terminal_path_suite_*.md")
UNIT = newest("p9", "r5_p9_recovery_unit_test.txt")
ALLCHECK = newest("p9", "r5_p9_builder_all_check.txt")
V8 = read(EVID / "astra_v8_4897654_output.md")
V8_VERDICT = V8[V8.index("## VERDICT"):V8.index("## RAW MERGED RESPONSE")]
if len(V8_VERDICT.strip()) < 1000:
    raise SystemExit("V8_VERDICT too short - wrong source file?")

tool_sources = []
for name, lang in [("sampled_real_form_diff_r5.py", "python"), ("dbutil.py", "python"),
                   ("build_dr_charge_ledger_p2.py", "python"),
                   ("charge_delta_per_component_p2.py", "python"),
                   ("three_count_reconcile_p2.py", "python"), ("p6_dbxml.py", "python"),
                   ("p6_acceptance_suite.sh", "bash"), ("p6_run_suite_fresh.sh", "bash"),
                   ("p7_tax_rule_check.py", "python"), ("p8_recovery_unit_test.py", "python"),
                   ("p8_builder_all_check.sh", "bash"), ("p9_terminal_path_check.sh", "bash")]:
    tool_sources.append("### SOURCE: %s\n```%s\n%s\n```" % (name, lang, read(TOOLS / name)))

P9_SUMMARY = """== P9 SUMMARY (what changed since your v8 assessment, and what is NOT claimed) ==

Your v8 'single most important next step' was: one pinned-fixture, production-wrapper recovery
acceptance experiment that deliberately invalidates a previously verified state before retry;
fence writers; require a current, batch-specific digest or a newly verified restore; force a
real suite failure through the normal terminal path; nonzero wrapper exit with the failed
fixture and recovery artifacts retained.

Every v8 code claim acted on was checked against the source first (P9 task doc §0, E1-E11); all
held. Delivered (sources, transcripts and R5 §20 embedded below):
- Per-batch hash files (stage_content_hash_<prefix>_<date>.json); A23 two dates -> 2 files.
- Retry from the CURRENT state: --retry-failed compares current content with the batch's
  pre-reset hash (not the stored flag). A22: a row changed after verification -> detected,
  re-restored and verified from the kept stage tables, re-billed. A22b: recovery tables also
  gone -> RETRY-REFUSED, nothing deleted, nothing reset. FAILED batches keep their stage tables
  until billed or released by --abandon-failed (also current-state checked). stage_restore
  refuses before its DELETE when stage tables are missing.
- Resume stops at the first FAILED batch (A23: batch 2 stays PENDING).
- Server-side fencing before a restore: stray mysql clients naming the target killed, every
  other server session on the target KILLed and waited out; never on sik/sik_bench. A24: a
  second session holding a locking read and sleeping was killed (sessions_killed=1), restore
  verified, re-bill exit 0.
- verify_frozen now compares the source-content hash (A25: one quantity changed after freeze
  -> SOURCE-CONTENT DRIFT, exit 3, nothing reset).
- Terminal path: P9_FORCE_FAIL_CHECK fails one real check; the wrapper keeps a failed fixture
  (FIXTURE-KEPT) until --teardown-kept. p9_terminal_path_check.sh: wrapper exit 1, fixture kept,
  evidence FAIL=1 with the forced A0 marked, A13 live guard PASS, then teardown. (That run used
  P9_QUICK=1, which skips the middle checks; the suite still ends through its normal final
  line.) A14 relabelled as an early-branch self-test only.
- Suite cleanup drops stage tables only after a verified restore; A11 counts
  STAGE-RESTORE-ERROR; the builder check exits 1 on a difference (shown on a planted mismatch);
  the FAILED log line states the actual restore result; §13 'B3 bound ~0.3%' restated as a
  sample statement.
- Result: suite 34/34 on a fresh fixture; terminal-path check PASS; unit test 20/20; builder
  reproduces the live ledger; live state unchanged.

NOT claimed / not done in P9: reproducibility closure (stagea_common.py without secrets, Java
sources, STRATA SQL); matched-encounter B-C reconciliation and the R4 0/999 re-examination;
fault modes not injected (power loss, MySQL crash, disk full, a writer that ignores SIGKILL);
fencing on the live databases; concurrent-overlap isolation; C1-C4 external validity."""

BASE = """You are a tough but fair principal-engineer assessor performing a SEVENTH assessment (v9) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365) -> 43/100 (run 4769794) -> 43/100 (run 4795743) -> 52/100 (run 4818826) -> 58/100 (v7: runs 4880158 + 4894730) -> 60/100 (v8: run 4897654, 'Needs targeted rework'). Your v8 verdict is embedded verbatim below; the owner has since executed wave P9. Your job:
1. VERIFY each v8 finding (genuinely fixed / merely claimed / still open, the P7-exposed problems, the top-3 issues, the single next step) against the CURRENT embedded evidence: the suite SOURCE and TRANSCRIPT, the unit test, the builder check, all tool sources, R5 §20, the P9 rubric. Confirm what is fixed in code AND demonstrated by an asserted run; reject what is only claimed; identify NEW problems P9 introduced.
2. Read the recovery code and checks critically: can each new check (A22, A22b, A23, A24, A25, the terminal-path check) fail when its property is violated? Is the fencing in fence_sessions/reap_writers sound, and does retry really decide from the current state? Is anything still asserted beyond what was run?
3. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P9. Do R5 §20, the P9 rubric, the suite's per-property summary and
the struck-through/annotated lines match the embedded transcripts and code? Recompute 34/34 and
the A11 counts. Does any stale wording still assert a withdrawn property (crash safety, 'every
restore verified', integer/no-float end-to-end, B-settlement)? Are the not-claimed items stated
as such? Give: what is honest, any remaining or NEW overclaim, a 0-10 score."""),
    ("gate-correctness", """
RE-READ the suite, three_count, builder, tax check and oracle sources:
(a) the terminal-path check and A14: is the production exit path now tested, and is a failed
    fixture really kept?
(b) the builder's cohort-scoped DELETE (A10e): is delete scope now equal to insert scope for
    every --window/--cohort combination, including rows with no reg_periksa row?
(c) A17 and the oracle's live guard: which paths can still mutate live sik?
(d) A11 after the relabel: can a non-deliberate unverified restore still pass?
(e) NEW gate defects P9 introduced.
Give: concrete code-level findings (file + function + behaviour) and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P9: per-batch hash files, current-state retry (A22/A22b), stop at FAILED
(A23), server-side fencing (A24, unit test), source-content verification (A25), on top of the
P8 recovery checks (A18-A21). Is the fencing sufficient, or can a writer survive it? Rank the residual oracle risks and
say whether the oracle is fit for the stated claims. Give a 0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P9: the re-pinned manifest (local = VPS tool hashes), the builder
ALL check reproducing the ledger content hash, the one-command wrapper, archived results. What
still blocks a third party (pack D not done: stagea_common.py, Java sources, STRATA SQL, DB images,
credentials, the VPS)? Give blockers ranked and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after P9 (unchanged since v7 except recovery): the form writes billing
(P7 audit), three_count's note-level B, the aggregate B-C comparison. What is a fair E2E claim
now, what is the weakest leg, and what is the fix? Give a 0-10 score."""),
    ("external-validity", """
ASSESS external validity after P9 (unchanged surface: one Khanza/MySQL configuration,
outpatient, synthetic edge strata with no observable embalase/tuslah billing, C1-C4 NOT
TESTED). Score scoping honesty and the remaining external gap. Give the top external risk and a
0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your six prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743; 52/100 run 4818826; 58/100 v7 runs 4880158+4894730; 60/100 v8 run 4897654).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5 / 6 / 6 / 6; gate-correctness 3 / 3 / 3 / 5 / 6 / 6; oracle-validity 4 / 4 / 3 / 5 / 6 / 7; reproducibility 3 / 5 / 6 / 5 / 6 / 6; e2e-design 4 / 5 / 5 / 6 / 7 / 7; external-validity 3 / 4 / 4 / 4 / 4 / 4)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v8 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run), which are merely claimed, which are still open
2. Any NEW problems P9 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35, 43, 52, 58 and 60
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    P9_SUMMARY
    + "\n\n== YOUR v8 VERDICT (run 4897654, 60/100) - the findings to re-verify ==\n"
    + V8_VERDICT
    + "\n\n== R5 REPORT (incl. §19 P8, §20 P9) ==\n"
    + REPORT
    + "\n\n== P9 TASK DOC + RUBRIC ==\n"
    + P9TASK
    + "\n\n== P9 ACCEPTANCE SUITE TRANSCRIPT (34 checks, fresh fixture) ==\n"
    + SUITE_RUN
    + "\n\n== P9 TERMINAL-PATH CHECK ==\n"
    + TERMINAL
    + "\n\n== ITS SUITE EVIDENCE (forced A0 failure, P9_QUICK=1) ==\n"
    + TERMINAL_SUITE
    + "\n\n== RECOVERY UNIT TEST OUTPUT ==\n"
    + UNIT
    + "\n\n== BUILDER --window ALL CHECK (clean, then planted mismatch) ==\n"
    + ALLCHECK
    + "\n\n== RELEASE MANIFEST (P9 re-pin) ==\n"
    + MANIFEST
    + "\n\n== GATE / ORACLE / SUITE SOURCES (P9 build) ==\n"
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
GPT-6 Astra v9 assessment of the DR->Khanza E2E billing benchmark (post P1-P9 remediation).
%s
All evidence/report/task-doc/v8-verdict/manifest/tool and suite sources embedded inline.
Assessment history: 4701365 = 35/100; 4769794 = 43/100; 4795743 = 43/100; 4818826 = 52/100; 4880158+4894730 = 58/100; 4897654 = 60/100.
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


@kbench.task(name="dr-khanza-e2e-full-assessment", description="GPT-6 v9 assessment of DR->Khanza E2E benchmark after P1-P9 remediation" + LABEL)
def dr_khanza_e2e_assessment(llm) -> dict:
    """Astra v9 assessment of the DR->Khanza E2E benchmark."""
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
    lines = ["# Astra v9 assessment: dr-khanza-e2e-full-assessment (post P1-P9)" + LABEL, ""]
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
        "then the synthesis over all six — the method of v8 (run 4897654).")
name, maxtok = "task_r9_merged.py", 24000
text = body % (note, BASE, CONTENT, sections, synth, ORDER, prior, label, keys, maxtok)
out = R5.parent / "kaggle" / "deers-rock-assessment" / name
out.write_text(text, encoding="utf-8")
(HERE / name).write_text(text, encoding="utf-8")
import hashlib
print("wrote %s (%d bytes)" % (out, out.stat().st_size))
print("sections: %s (merged) · synthesis: True · max_tokens %d" % (keys, maxtok))
print("CONTENT chars: %d · sha256 %s" % (len(CONTENT), hashlib.sha256(CONTENT.encode()).hexdigest()[:16]))
