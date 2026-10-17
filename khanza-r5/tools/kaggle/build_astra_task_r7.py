"""Build the GPT-6 Astra v7 re-assessment task (post P1..P7) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment); supersedes task_r6_reassess.py. Everything is
read from khanza-r5/ at build time; re-run after any report/evidence change.
Embeds: the v6 verdict (run 4818826, 52/100) as the findings to re-verify, R5 report (incl.
§16-§18), P7 task doc + rubric, the P7 suite transcript, the write-provenance audit, the live
ledger rebuild, the integer-builder check, the manifest, and every gate/oracle/suite source.
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
    return read(hits[-1]) if hits else "(%s/%s not present at build time)" % (folder, pattern)


REPORT = read(DOCS / "khanza_benchmark_report_R5.md")
P7TASK = read(DOCS / "khanza_r5_task_p7_failclosed_gates.md")
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
SUITE_RUN = newest("p7", "r5_p6_acceptance_*.md")
PROVENANCE = newest("p7", "r5_p7_write_provenance_*.md")
REBUILD = newest("p7", "r5_p7_ledger_rebuild_*.md")
INTCHECK = newest("p7", "r5_p7_integer_builder_all_check.txt")
V6 = read(EVID / "astra_v6_4818826_output.md")
V6_VERDICT = V6[V6.index("## VERDICT"):]

tool_sources = []
for name, lang in [("sampled_real_form_diff_r5.py", "python"), ("dbutil.py", "python"),
                   ("build_dr_charge_ledger_p2.py", "python"),
                   ("charge_delta_per_component_p2.py", "python"),
                   ("three_count_reconcile_p2.py", "python"), ("p6_dbxml.py", "python"),
                   ("p6_acceptance_suite.sh", "bash"), ("p6_run_suite_fresh.sh", "bash"),
                   ("p7_write_provenance.sh", "bash"), ("p7_three_count_contract_test.py", "python"),
                   ("p7_tax_rule_check.py", "python")]:
    tool_sources.append("### SOURCE: %s\n```%s\n%s\n```" % (name, lang, read(TOOLS / name)))

P7_SUMMARY = """== P7 SUMMARY (what changed since your v6 assessment, and what is NOT claimed) ==

Your v6 'single most important next step' was: repair and rerun a small, fail-closed recovery
acceptance gate on an enforced disposable target that rejects missing/corrupt hashes and exits
nonzero on any failed assertion, with claims limited to what passed.

Every v6 code claim acted on was checked against the source first; all held.

Delivered (sources, transcripts and R5 §18 embedded below):
- Suite fails closed: it now exits non-zero on any FAIL (it used to end on an echo). A14 runs
  the suite's exit path with a forced failure (exit 1) and a forced pass (exit 0).
- Restore fails closed: a missing pre-reset hash now yields STAGE-RESTORE-UNVERIFIED, FAILED,
  restored=False, stage tables kept (STAGE-KEEP), exit 4. A15 deletes the hash mid-run.
- three_count: exit 0 for PASS or PARTIAL as documented (the old expression returned 1 for
  PARTIAL); --verify-form-save now enforces B (it was parsed and ignored). Contract test 4/4.
- Integer tax: builder uses (subtotal*11+50)//100. Before switching, the consumer's
  Math.round(subttl*0.11) was compared with it over all 70,056 real drug subtotals: 0
  differences. A10b is exact (tolerance 0; missing and orphan tax rows fail). The integer
  builder, run --window ALL into an empty scratch table, reproduces the live ledger
  byte-identically.
- Live guards: A13 also requires identical CHECKSUMs of six live sik output tables before and
  after the suite; a billing run against sik now needs --allow-live (A16 asserts the refusal).
- Suite result: 21/21 on a fresh full-clone fixture through the one-command wrapper.

Your v6 'core data defect': the live ledger was rebuilt from source with owner approval, after
a verified backup (dr_charge_ledger_bak_20261017): 0 key/amount/unit-price changes, 1 quantity
corrected, 260,800 source labels filled; rows/total unchanged; line-diff now PASS on both
windows; new content hash pinned.

Your v6 'write provenance is unresolved' note: resolved by an audited form run (row-level
triggers recording account and connection). Khanza's own DlgBilingRalan save, running in the
harness JVM (which contains no SQL), wrote 17 billing rows plus the nota rows. The report's
long-standing caveat that the form writes 'the verification layer, not billing' is therefore
WITHDRAWN (struck through in §0/§1/§13, explained in §18): the oracle's billing comparison is a
same-encounter form-vs-consumer check on the sampled visits.

Deferred to P8 (NOT claimed): interruption during restoration; hard-crash resume with a
surviving JVM descendant; concurrent-overlap isolation; retryable FAILED/unrestored batches;
re-validation of pre-P6 clone-mode runs; whether the R4 0/999 sample (pre-R5 oracle) already
measured same-encounter billing; C1-C4 external validity."""

BASE = """You are a tough but fair principal-engineer assessor performing a FIFTH assessment (v7) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365) -> 43/100 (run 4769794) -> 43/100 (run 4795743) -> 52/100 (run 4818826, 'Needs targeted rework'). Your v6 verdict is embedded verbatim below; the owner has since executed wave P7. Your job:
1. VERIFY each v6 finding (the 'claimed, narrowed or substituted' list, the 'still open' list, the new problems, the top-3 issues) against the CURRENT embedded evidence: the suite SOURCE and TRANSCRIPT, the provenance audit, the ledger rebuild, all tool sources, R5 §18, the P7 rubric. Confirm what is fixed in code AND demonstrated by an asserted run; reject what is only claimed; identify NEW problems P7 introduced.
2. Read the suite source critically: can each check fail when the property is violated? Does the exit path now really propagate a failure? Is the evidence from a target the form really used, with live state proven untouched?
3. Judge the provenance audit and the withdrawal of the B-subset caveat: is the audit design sound (triggers, accounts, the harness having no SQL), and is the restated claim scoped correctly?
4. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P7. Do R5 §18, the P7 rubric and the struck-through §0/§1/§13
statements match the embedded transcripts and code? Recompute 21/21, the rebuild diff and the
ledger totals against the manifest. Does any stale wording elsewhere still assert a withdrawn
property (the B-subset caveat, 'every restore verified', 'live untouched')? Are the deferred
items stated as not claimed? Give: what is honest, any remaining or NEW overclaim, a 0-10 score."""),
    ("gate-correctness", """
RE-READ the suite, three_count, builder and oracle sources:
(a) the suite's exit path and A14: can a failing check still end in exit 0 anywhere (early
    aborts, the wrapper, the EXIT trap)?
(b) three_count's exit contract and --verify-form-save against the contract test;
(c) the integer tax rule, A10b's exactness, and the claim that the integer builder reproduces the
    live ledger;
(d) A16 and the --allow-live refusal: which modes can still touch live sik?
(e) NEW gate defects P7 introduced.
Give: concrete code-level findings (file + function + behaviour) and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P7: the fail-closed restore on a missing hash (A15), STAGE-KEEP, the
resume and timeout paths (A4/A4b/A8), and the provenance audit's implication that the billing
comparison is same-encounter form-vs-consumer. Rank the residual oracle risks, including the
deferred P8 items, and say whether the oracle is fit for the stated (narrower) claims. Give a
0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P7: the re-pinned manifest (tools, ledger content hash, backup
table), the one-command fixture wrapper, the integer-builder reproduction, database.xml
retargeting, grants. What still blocks a third party (DB images, credentials, the VPS)? Give
blockers ranked and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after the provenance finding. If the form writes billing, what is now a
fair E2E claim, what is the weakest remaining leg, and is three_count's note-level B still a
meaningful independent source? Give a fix for the weakest leg and a 0-10 score."""),
    ("external-validity", """
ASSESS external validity after P7 (unchanged surface: one Khanza/MySQL configuration,
outpatient, synthetic edge strata with no observable embalase/tuslah billing, C1-C4 NOT
TESTED). Score scoping honesty and the remaining external gap. Give the top external risk and a
0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your four prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743; 52/100 run 4818826).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5 / 6; gate-correctness 3 / 3 / 3 / 5; oracle-validity 4 / 4 / 3 / 5; reproducibility 3 / 5 / 6 / 5; e2e-design 4 / 5 / 5 / 6; external-validity 3 / 4 / 4 / 4)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v6 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run), which are merely claimed, which are still open
2. Any NEW problems P7 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35, 43 and 52
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    P7_SUMMARY
    + "\n\n== YOUR v6 VERDICT (run 4818826, 52/100) - the findings to re-verify ==\n"
    + V6_VERDICT
    + "\n\n== R5 REPORT (incl. §16 P6, §17 post-P6 corrections, §18 P7) ==\n"
    + REPORT
    + "\n\n== P7 TASK DOC + RUBRIC ==\n"
    + P7TASK
    + "\n\n== P7 ACCEPTANCE SUITE TRANSCRIPT (21 checks, fresh fixture) ==\n"
    + SUITE_RUN
    + "\n\n== WRITE-PROVENANCE AUDIT TRANSCRIPT ==\n"
    + PROVENANCE
    + "\n\n== LIVE LEDGER REBUILD TRANSCRIPT ==\n"
    + REBUILD
    + "\n\n== INTEGER BUILDER --window ALL CHECK ==\n"
    + INTCHECK
    + "\n\n== RELEASE MANIFEST (P7 re-pin) ==\n"
    + MANIFEST
    + "\n\n== GATE / ORACLE / SUITE SOURCES (P7 build) ==\n"
    + "\n\n".join(tool_sources)
)

# ---------------------------------------------------------------------------
# Task template. One template serves the full run (all six sections + synthesis)
# and the budget split (--step 1|2|3): a step runs a SUBSET of the same section
# calls with the same BASE/CONTENT/asks; step 3 also runs the synthesis, fed the
# same digest a full run would build (last 2,500 chars of every section, in the
# canonical order), taking steps 1-2 from their saved outputs. A $10/day model
# quota cannot fit a full run (~$11-12), so the split keeps the score comparable.
# ---------------------------------------------------------------------------
import re
import sys

ORDER = [k for k, _ in SECTIONS]
STEPS = {1: ["claim-honesty"],
         2: ["gate-correctness", "oracle-validity", "reproducibility"],
         3: ["e2e-design", "external-validity"]}


def load_prior(step):
    """Section texts of earlier steps, from evidence/astra_v7_step<N>_*_output.md."""
    prior = {}
    for s in range(1, step):
        hits = sorted(EVID.glob("astra_v7_step%d_*_output.md" % s))
        if not hits:
            raise SystemExit("step %d output not found in evidence/ — run step %d first" % (s, s))
        text = read(hits[-1])
        for key in STEPS[s]:
            m = re.search(r"^## %s\n" % re.escape(key.upper()), text, re.M)
            if not m:
                raise SystemExit("section %s missing from %s" % (key, hits[-1].name))
            rest = text[m.end():]
            nxt = [rest.find("\n## %s\n" % k.upper()) for k in ORDER] + [rest.find("\n## VERDICT\n")]
            nxt = [i for i in nxt if i >= 0]
            prior[key] = rest[:min(nxt)].strip() if nxt else rest.strip()
    return prior


body = '''"""
GPT-6 Astra v7 assessment of the DR->Khanza E2E billing benchmark (post P1-P7 remediation).
%s
All evidence/report/task-doc/v6-verdict/manifest/tool and suite sources embedded inline.
Assessment history: 4701365 = 35/100; 4769794 = 43/100; 4795743 = 43/100; 4818826 = 52/100.
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
ORDER = %r
PRIOR = %r
LABEL = %r


@kbench.task(name="dr-khanza-e2e-full-assessment", description="GPT-6 v7 assessment of DR->Khanza E2E benchmark after P1-P7 remediation" + LABEL)
def dr_khanza_e2e_assessment(llm) -> dict:
    """Astra v7 assessment of the DR->Khanza E2E benchmark."""
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
    lines = ["# Astra v7 assessment: dr-khanza-e2e-full-assessment (post P1-P7)" + LABEL, ""]
    for key in sections:
        lines += ["## " + key.upper(), "", sections[key], ""]
    if SYNTH:
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
    kbench.assertions.assert_true(len(sections) == len(SECTIONS),
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

step = int(sys.argv[sys.argv.index("--step") + 1]) if "--step" in sys.argv else 0
if step:
    keys = STEPS[step]
    sections = [(k, a) for k, a in SECTIONS if k in keys]
    synth = SYNTH if step == 3 else ""
    prior = load_prior(step) if step == 3 else {}
    label = " [step %d/3: %s%s]" % (step, ", ".join(keys), " + synthesis" if synth else "")
    note = ("BUDGET SPLIT step %d of 3 (sections: %s%s). Same BASE, CONTENT and section asks as a "
            "full run; the three steps together equal one full assessment." % (step, ", ".join(keys), "; plus the synthesis over all six" if synth else ""))
    name = "task_r7_step%d.py" % step
else:
    sections, synth, prior, label = SECTIONS, SYNTH, {}, ""
    note = "Full run: all six sections + synthesis."
    name = "task_r7_reassess.py"

text = body % (note, BASE, CONTENT, sections, synth, ORDER, prior, label)
out = R5.parent / "kaggle" / "deers-rock-assessment" / name
out.write_text(text, encoding="utf-8")
(HERE / name).write_text(text, encoding="utf-8")
print("wrote %s (%d bytes)" % (out, out.stat().st_size))
print("sections: %s · synthesis: %s · prior sections embedded: %s" % ([k for k, _ in sections], bool(synth), list(prior)))
print("CONTENT chars: %d" % len(CONTENT))
