"""Build the GPT-6 Astra v10 re-assessment task (post P1..P10) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment). Merged method only (as v8/v9). Budget: the owner
reported $3.99 left, so CONTENT is capped at v9's size (MAX_CONTENT chars) and the section
output cap is 20k tokens. Tool sources unchanged since v9 are listed by SHA (manifest) instead of
being re-embedded; the summary says so.
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
P10TASK = read(DOCS / "khanza_r5_task_p10_integrated_recovery.md")
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
SUITE_RUN = newest("p10", "r5_p6_acceptance_*.md")
SUITE_FAILED = newest("p10", "r5_p10_suite_run1_FAILED_*.md")
PRESERVE = newest("p10", "r5_p10_preservation_2*.md")
PRESERVE_RETRY = newest("p10", "r5_p10_preservation_retry_*.log")
UNIT = newest("p10", "r5_p10_recovery_unit_test.txt")
ALLCHECK = newest("p10", "r5_p10_builder_all_check.txt")
V9 = read(EVID / "astra_v9_4898353_output.md")
V9_VERDICT = V9[V9.index("## VERDICT"):V9.index("## RAW MERGED RESPONSE")]
if len(V9_VERDICT.strip()) < 1000:
    raise SystemExit("V9_VERDICT too short - wrong source file?")
MAX_CONTENT = 317000
# keep only the summary + verdict lines of the FAILED run (its per-check table repeats run 2's)
SUITE_FAILED = "\n".join(l for l in SUITE_FAILED.split("\n")
                         if l.startswith(("A2", "A12", "A13", "A31", "PASS=", "# ", "Date")))

tool_sources = []
# changed in P10 (or needed to read them): embedded in full
for name, lang in [("sampled_real_form_diff_r5.py", "python"), ("build_dr_charge_ledger_p2.py", "python"),
                   ("p6_acceptance_suite.sh", "bash"), ("p10_preservation_check.sh", "bash"),
                   ("p10_hash_state.py", "python"), ("p8_recovery_unit_test.py", "python"),
                   ]:
    tool_sources.append("### SOURCE: %s\n```%s\n%s\n```" % (name, lang, read(TOOLS / name)))
UNCHANGED = ("### NOT RE-EMBEDDED (byte-identical to the v9 task; SHA-256 pinned in the manifest): "
             "charge_delta_per_component_p2.py, three_count_reconcile_p2.py, p6_dbxml.py, dbutil.py, "
             "p6_run_suite_fresh.sh, "
             "p7_tax_rule_check.py, p8_builder_all_check.sh, p9_terminal_path_check.sh")

P10_SUMMARY = """== P10 SUMMARY (what changed since your v9 assessment, and what is NOT claimed) ==

Your v9 'single most important next step' was: one integrated, pinned-fixture recovery-preservation
experiment - immediate harness-failure restoration and resume under effective writer exclusion; a
real failure with populated recovery artifacts; independent hashes of those artifacts and of
protected sample/non-sample rows; the normal terminal failure; asserted retention, nonzero exit and
per-operation verification before explicit teardown.

Every v9 code claim acted on was checked against the source first (P10 task doc §0, F1-F8); all
held. Delivered (sources, transcripts and R5 §21 embedded below):
- Integrated experiment p10_preservation_check.sh (through the production wrapper): a real
  timeout failure on a two-batch set -> batch 1 FAILED, 13 populated stage tables (21 rows);
  independent root hashes of every stage table, the sample, 20 protected non-sample visits and the
  live sik tables; A30 forced to FAIL -> normal terminal path, wrapper exit 1, fixture kept; all
  hashes equal on the kept fixture; the batch's 17 billing rows then changed so the retry had to
  restore: current != pre-reset detected, restore under writer exclusion (DML revoked, fenced),
  hash-verified, grants back as before, both batches BILLED; protected + live unchanged; explicit
  teardown. (A first run passed without needing a restore; the script was changed to force one.)
- Writer exclusion on every fixture restore (benchmark DML revoked, target fenced, restore as root,
  re-grant in finally). Suite run 1 FAILED 30/38 because of it: A20 SIGKILLs a resume inside the
  window, the finally never ran, the harness account kept only SELECT and later billing failed. Fix:
  a durable marker before the revoke and recovery at the next start; A31 asserts grants equal at
  start and end. Run 1's evidence is kept (summary lines below); run 2: 39/39.
- Source-content hash covers biaya_obat/total/h_beli and procedure tariffs, and a query error fails
  (A27: price drift after freeze detected). Transactional stage backup: a failed re-backup rolls
  back and earlier staged rows survive (A28). Quiet interval before a FAILED retry. irup raises on
  NULL/empty/non-numeric (A26). Result file states each FAILED batch's real restore state.
- Honesty: A22 label (17 rows), R5 §20 corrections, A11 counts markers outside the excluded logs
  (16 of 16: the excluded logs hold none, so P9's figure was right in value, wrong in derivation).
- Budget note: to fit the model budget, tool sources unchanged since v9 are listed by SHA, not
  re-embedded (see the list after the sources); the manifest pins them.

NOT claimed / not done in P10: reproducibility closure (stagea_common.py without secrets, Java
sources, STRATA SQL, an immutable fixture); matched-encounter B-C reconciliation and the R4 0/999
re-examination; fault modes not injected (power loss, MySQL crash, disk full, a writer that ignores
SIGKILL); grant changes or fencing on the live databases; concurrent-overlap isolation; C1-C4."""

BASE = """You are a tough but fair principal-engineer assessor performing an EIGHTH assessment (v10) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365) -> 43/100 (run 4769794) -> 43/100 (run 4795743) -> 52/100 (run 4818826) -> 58/100 (v7: runs 4880158 + 4894730) -> 60/100 (v8: run 4897654) -> 62/100 (v9: run 4898353, 'Needs targeted rework'). Your v9 verdict is embedded verbatim below; the owner has since executed wave P10. Your job:
1. VERIFY each v9 finding (genuinely fixed / merely claimed / still open, the P7-exposed problems, the top-3 issues, the single next step) against the CURRENT embedded evidence: the suite SOURCE and TRANSCRIPT, the unit test, the builder check, all tool sources, R5 §21, the P10 rubric. Confirm what is fixed in code AND demonstrated by an asserted run; reject what is only claimed; identify NEW problems P10 introduced.
2. Read the recovery code and checks critically: can each new check (A26, A27, A28, A29, A31, the preservation check) fail when its property is violated? Is the writer exclusion (revoke + fence + marker recovery) effective and crash-safe? Does the preservation experiment establish what v9 asked for? Is anything still asserted beyond what was run?
3. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P10. Do R5 §21, the P10 rubric, the suite's per-property summary and
the struck-through/annotated lines match the embedded transcripts and code? Recompute 39/39 and
the A11 counts. Does any stale wording still assert a withdrawn property (crash safety, 'every
restore verified', integer/no-float end-to-end, B-settlement)? Are the not-claimed items stated
as such? Give: what is honest, any remaining or NEW overclaim, a 0-10 score."""),
    ("gate-correctness", """
RE-READ the suite, three_count, builder, tax check and oracle sources:
(a) the preservation check and A30/A31: is the production exit path tested with populated
    recovery artifacts, and are the independent hashes sufficient?
(b) the builder's cohort-scoped DELETE (A10e): is delete scope now equal to insert scope for
    every --window/--cohort combination, including rows with no reg_periksa row?
(c) A17 and the oracle's live guard: which paths can still mutate live sik?
(d) A11 after the relabel: can a non-deliberate unverified restore still pass?
(e) NEW gate defects P10 introduced.
Give: concrete code-level findings (file + function + behaviour) and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P10: complete source-content hash (A25/A27), transactional stage backup
(A28), quiet interval before retry, writer exclusion with crash recovery (A29/A31, unit test), on
top of the P8/P9 recovery checks. Can a writer still race a restore, and is the exclusion safe? Rank the residual oracle risks and
say whether the oracle is fit for the stated claims. Give a 0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P10: the re-pinned manifest (local = VPS tool hashes), the builder
ALL check reproducing the ledger content hash, the one-command wrapper, archived results. What
still blocks a third party (pack D not done: stagea_common.py, Java sources, STRATA SQL, DB images,
credentials, the VPS)? Give blockers ranked and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after P10 (unchanged since v7 except recovery): the form writes billing
(P7 audit), three_count's note-level B, the aggregate B-C comparison. What is a fair E2E claim
now, what is the weakest leg, and what is the fix? Give a 0-10 score."""),
    ("external-validity", """
ASSESS external validity after P10 (unchanged surface: one Khanza/MySQL configuration,
outpatient, synthetic edge strata with no observable embalase/tuslah billing, C1-C4 NOT
TESTED). Score scoping honesty and the remaining external gap. Give the top external risk and a
0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your seven prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743; 52/100 run 4818826; 58/100 v7 runs 4880158+4894730; 60/100 v8 run 4897654; 62/100 v9 run 4898353).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5 / 6 / 6 / 6 / 7; gate-correctness 3 / 3 / 3 / 5 / 6 / 6 / 6; oracle-validity 4 / 4 / 3 / 5 / 6 / 7 / 7; reproducibility 3 / 5 / 6 / 5 / 6 / 6 / 6; e2e-design 4 / 5 / 5 / 6 / 7 / 7 / 7; external-validity 3 / 4 / 4 / 4 / 4 / 4 / 4)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v9 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run), which are merely claimed, which are still open
2. Any NEW problems P10 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35, 43, 52, 58, 60 and 62
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    P10_SUMMARY
    + "\n\n== YOUR v9 VERDICT (run 4898353, 62/100) - the findings to re-verify ==\n"
    + V9_VERDICT
    + "\n\n== R5 REPORT (incl. §20 P9, §21 P10) ==\n"
    + REPORT
    + "\n\n== P10 TASK DOC + RUBRIC ==\n"
    + P10TASK
    + "\n\n== P10 ACCEPTANCE SUITE TRANSCRIPT, RUN 2 (39 checks, fresh fixture) ==\n"
    + SUITE_RUN
    + "\n\n== P10 SUITE RUN 1 (FAILED 30/38; summary lines kept) ==\n"
    + SUITE_FAILED
    + "\n\n== P10 INTEGRATED PRESERVATION CHECK ==\n"
    + PRESERVE
    + "\n\n== RECOVERY UNIT TEST OUTPUT ==\n"
    + UNIT
    + "\n\n== BUILDER --window ALL CHECK ==\n"
    + ALLCHECK
    + "\n\n== RELEASE MANIFEST (P10 re-pin) ==\n"
    + MANIFEST
    + "\n\n== GATE / ORACLE / SUITE SOURCES (P10 build; changed or needed) ==\n"
    + "\n\n".join(tool_sources)
    + "\n\n" + UNCHANGED
)
if len(CONTENT) > MAX_CONTENT:
    raise SystemExit("CONTENT %d chars > cap %d - trim before building" % (len(CONTENT), MAX_CONTENT))

# ---------------------------------------------------------------------------
# Task template (shared with build_astra_task_r7.py's merged mode): ONE call with
# BASE + CONTENT answers every section ask under '## KEY' headings; the task splits
# the response by heading, then runs the synthesis over the six sections.
# ---------------------------------------------------------------------------
import re
import sys

ORDER = [k for k, _ in SECTIONS]


body = '''"""
GPT-6 Astra v10 assessment of the DR->Khanza E2E billing benchmark (post P1-P10 remediation).
%s
All evidence/report/task-doc/v9-verdict/manifest/tool and suite sources embedded inline.
Assessment history: 4701365 = 35/100; 4769794 = 43/100; 4795743 = 43/100; 4818826 = 52/100; 4880158+4894730 = 58/100; 4897654 = 60/100; 4898353 = 62/100.
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


@kbench.task(name="dr-khanza-e2e-full-assessment", description="GPT-6 v10 assessment of DR->Khanza E2E benchmark after P1-P10 remediation" + LABEL)
def dr_khanza_e2e_assessment(llm) -> dict:
    """Astra v10 assessment of the DR->Khanza E2E benchmark."""
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
    lines = ["# Astra v10 assessment: dr-khanza-e2e-full-assessment (post P1-P10)" + LABEL, ""]
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
        "then the synthesis over all six — the method of v8/v9.")
name, maxtok = "task_r10_merged.py", 20000
text = body % (note, BASE, CONTENT, sections, synth, ORDER, prior, label, keys, maxtok)
out = R5.parent / "kaggle" / "deers-rock-assessment" / name
out.write_text(text, encoding="utf-8")
(HERE / name).write_text(text, encoding="utf-8")
import hashlib
print("wrote %s (%d bytes)" % (out, out.stat().st_size))
print("sections: %s (merged) · synthesis: True · max_tokens %d" % (keys, maxtok))
print("CONTENT chars: %d · sha256 %s" % (len(CONTENT), hashlib.sha256(CONTENT.encode()).hexdigest()[:16]))
