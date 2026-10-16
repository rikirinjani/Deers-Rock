"""Build the GPT-6 Astra v6 re-assessment task (post P1..P6) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment) as v4/v5; supersedes task_r5p5_reassess.py.
Everything is read from khanza-r5/ at build time (the %TEMP%\\opencode sources the v5
builder used no longer exist). Re-run this after any report/evidence change.
Embeds: R5 report (incl. §16 P6 and §17 post-P6 corrections), P6 task doc + rubric, the
v5 verdict (run 4795743, 43/100) as the findings to re-verify, the release manifest, the
P6 acceptance-suite source + its 18/18 transcript, and every gate/oracle tool source.
"""
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
R5 = HERE.parent.parent                      # khanza-r5/
TOOLS = R5 / "tools"
DOCS = R5 / "docs"
EVID = R5 / "evidence"


def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8")


REPORT = read(DOCS / "khanza_benchmark_report_R5.md")
P6TASK = read(DOCS / "khanza_r5_task_p6_acceptance.md")
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
SUITE_RUN = read(sorted((EVID / "p6").glob("r5_p6_acceptance_*.md"))[-1])  # newest run
V5 = read(EVID / "astra_v5_4795743_output.md")
V5_VERDICT = V5[V5.index("## VERDICT"):]
STRATA = sorted((EVID / "p4_strata_recheck").glob("r5_p4_strata_recheck_*.md"))
STRATA_RUN = read(STRATA[-1]) if STRATA else "(P4 strata re-check transcript not present at build time)"

tool_sources = []
for name, lang in [("sampled_real_form_diff_r5.py", "python"), ("dbutil.py", "python"),
                   ("build_dr_charge_ledger_p2.py", "python"),
                   ("charge_delta_per_component_p2.py", "python"),
                   ("three_count_reconcile_p2.py", "python"), ("p6_dbxml.py", "python"),
                   ("p6_acceptance_suite.sh", "bash"), ("p6_strata_recheck.sh", "bash")]:
    tool_sources.append("### SOURCE: %s\n```%s\n%s\n```" % (name, lang, read(TOOLS / name)))

P6_SUMMARY = """== P6 SUMMARY (what changed since your v5 assessment, and what is NOT claimed) ==

Your v5 'single most important next step' was: fix the SQL predicates and transaction
semantics, then run one current-pinned, populated disposable-clone acceptance suite with
machine-checkable verdicts, injected failures and exact pre/post restoration hashes.

Delivered (embedded below: suite source, its transcript, all tool sources, R5 §16/§17):
- Acceptance suite p6_acceptance_suite.sh: 18/18 PASS on sik_p6f (twice: run 20261016T051552Z,
  then re-run 20261016T054920Z on the current pinned tools via p6_run_suite_fresh.sh), a
  full mysqldump clone of live sik + 5 STRATA- registration rows. Each check asserts the
  gate's own log line AND the exit code (not an exit code that another gate can also emit).
- Transaction: dbutil.session() keeps ONE mysql process for START TRANSACTION; DELETE;
  REPLACEs; COMMIT. A10c injects a trigger failure on the first tax row (after the DELETE and
  all other REPLACEs) -> mysql ERROR 1644 surfaces in the log, FAIL-CLOSED, exit 1, scratch
  ledger byte-identical. Two P6-era bugs in this path were found by the suite and fixed:
  close() raised after a clean COMMIT (every good build reported failure) and the tax step
  re-read the uncommitted ledger over a second connection.
- --window ALL (your v5 gate-correctness finding): you were RIGHT. The predicate
  "no_rawat LIKE '____/__/__/8_____%" had no closing quote; every --window ALL gate run died
  with MySQL 1064. The previous handoff (and, briefly, R5 §16) called your finding a misread;
  §17 retracts that. Fixed, and the pattern was also wrong in scope: it covered 86,101 of the
  86,455 DR visits (skipping the 354 Stage-A visits). ALL now means the whole cohort; live
  --window ALL: charge_delta delta 0 over 86,455 visits; three_count A==C = 356,355 rows /
  Rp 34,870,243,633 (the ledger pin).
- Harness target (your v5 'new problems' note: '--db-name also does not configure the Java
  harness target'): also RIGHT, and worse than stated. The harness and consumer read
  setting/database.xml (AES-encrypted DATABASE), never database.ini. Every earlier
  'scratch clone' form run that edited database.ini had the form on live sik. P6 retargets
  both database.xml copies with p6_dbxml.py (backup + round-trip verify), restores them in
  an EXIT trap, and the suite asserts both are back on sik (A13).
- Restore/recovery: content-hash-verified restore (STAGE-RESTORED-VERIFIED) on every
  restore path; process-group kill with a group-level writer-dead proof on timeout (A4) and
  a SIGTERM handler (A4b); resume binding (A8b); stage-aware prefixes (A9); a batch whose
  restore is not verified keeps its stage tables (STAGE-KEEP) instead of the verified drop.

Post-P6 findings (R5 §17), disclosed rather than hidden:
- The live, pinned ledger holds one internally inconsistent row: 2026/10/01/000298 drug
  B000000240 quantity 23 with amount 745,800 = 25 x 29,832; source and billing say 25. The
  quantity line-diff gate flags it (LINE-DELTA ... FAIL), so the P4 statement 'clean canonical
  ledger -> LINE-DELTA=0' does not hold for the current ledger. A rebuild of the full ledger
  from source into a scratch copy reproduces every key, amount and unit price exactly and
  corrects this quantity; 260,800 rows outside October carry source=NULL from an older
  builder. The live ledger has NOT been rewritten (owner decision pending).
- P4 edge strata (R5 §14): P4 ran the form via database.ini, i.e. against live sik where the
  STRATA- visits did not exist; its fixtures were also thinner than reported (TUSLAH/HALFPPN
  registration-only). Re-checked: the >2-procedure stratum with 4 real visits (A3/A6, billed
  sukses=true on the clone, OUT-OF-ENVELOPE, exit 4) and EMBALASE/TUSLAH authored from a DR
  visit the form bills (transcript embedded): both BILLED sukses=true on the clone,
  OUT-OF-ENVELOPE, exit 4 - but the form's bill was identical to the template (no embalase
  Rp 2,500 / tuslah Rp 1,500 line), i.e. in this Khanza configuration these charges do not
  reach the outpatient bill, so the strata carry no observable billing difference here.
  ZEROFEE/HALFPPN are in-envelope by the eligibility predicate and are NOT re-tested.
- An earlier suite run planted a STALE-TEST-KEY row in the live ledger (removed with owner
  approval; ledger back at 356,355 / Rp 34,870,243,633).

Not claimed (unchanged): same-encounter form-vs-consumer settlement equivalence (the form
writes nota_jalan, not billing; B stays a verified subset); same-price code-label swaps;
C1-C4, cross-machine D2, DOI (human-gated, NOT TESTED); clone-mode form runs before P6
that relied on database.ini (now unproven, not re-verified individually)."""

BASE = """You are a tough but fair principal-engineer assessor performing a FOURTH assessment (v6) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365, NOT READY) -> 43/100 (run 4769794) -> 43/100 (run 4795743, 'Needs targeted rework'). Your v5 verdict is embedded verbatim below; the owner has since executed wave P6. Your job:
1. VERIFY each v5 finding (the disposition table, the 'new problems', the top-3 issues) against the CURRENT embedded evidence: the acceptance-suite SOURCE and its TRANSCRIPT, all tool sources, R5 §16/§17, the P6 task rubric. Confirm what is genuinely fixed in code AND demonstrated by an asserted run; reject what is only claimed; identify NEW problems P6 introduced.
2. Read the suite source critically: for each check, does the asserted log line actually prove the property named, or could the check pass for another reason? Does the run evidence come from a target the form really used (database.xml retarget), with the live state proven untouched?
3. Weigh the post-P6 disclosures (R5 §17): a latent quantity defect in the pinned ledger, retracted §16 and §14 statements, earlier clone-mode runs now unproven. Judge whether the disclosure is complete and whether it changes what may be claimed.
4. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P6. Check specifically:
- Do R5 §16 (P6) and §17 (post-P6 corrections) match the embedded suite transcript and code?
  Recompute: 18/18, the A10c ledger hashes, the --window ALL totals vs the manifest pin.
- Are the retractions (the 'misread' ALL-predicate claim, P4's edge-strata 'scratch clone'
  claim, P4's 'LINE-DELTA=0' statement) complete, or does stale wording survive elsewhere in
  the report (§0-§15) that still asserts a retracted property?
- Is 'earlier clone-mode form runs are unproven' applied consistently to every section that
  cites such a run (P1 demos, P4, P5 Demo A/B)?
Give: what is now honest, any remaining or NEW overclaim, and a 0-10 score."""),
    ("gate-correctness", """
RE-READ the gate and builder sources:
(a) window_predicate in charge_delta / three_count / builder: is ALL now valid SQL with the
    intended scope (whole DR cohort incl. the 354 Stage-A visits)? Any remaining place where
    the window and the DELETE scope disagree?
(b) builder single-session transaction: trace START TRANSACTION -> DELETE -> REPLACEs ->
    COMMIT -> close(). Any path where a failure is reported as success, or success as failure?
    Is the tax computation now from the same build?
(c) the latent ledger row (qty 23 vs 25): does the gate surface catch it by default, or only
    with --line-diff? Is the default gate set adequate for the stated claims?
(d) NEW gate defects P6 introduced.
Give: concrete code-level findings (file + function + behaviour), and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P6, using the suite source + transcript:
- A1/A2: is a clean in-envelope run exit 0 and a source-perturbed run exit 1 via the verdict
  path, on a target the form actually used?
- A4/A4b/A8/A8b: timeout kill, SIGTERM handler, resume restore, resume binding - is the
  writer-dead proof group-level and is each restore hash-verified?
- A3/A6 and the P4 strata re-check: does out-of-envelope classification fire on real form
  output, and is the edge-strata evidence now adequate?
- Residual risks: anything that can still leave a target partially restored, or a run that
  can still exit 0 while wrong.
Give: residual oracle risks ranked and a 0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P6: manifest re-pin (incl. the disclosed pin drift), the suite as
a re-runnable artifact, database.xml retarget as a documented step, grants, the full-clone
fixture recipe, B3 replay + seeds from P4, and the full-ledger rebuild result (keys/amounts
exact; one quantity and the source labels differ from the pinned ledger).
- Can a third party re-run the acceptance suite from what is described?
- Does the pinned ledger being non-reproducible in one quantity and in source labels weaken
  the 'byte-for-byte reproducible ledger' claim, and is that disclosed adequately?
Give: blockers ranked and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after P6. Is the hybrid characterization (direct-DB fixtures + sampled
real-form + simulator scale) still honest? Weakest remaining leg: the B-subset settlement
gap, the unproven pre-P6 clone-mode runs, or something P6 introduced?
Give: whether E2E is fairly claimed, the weakest leg + a fix, and a 0-10 score."""),
    ("external-validity", """
ASSESS external-validity after P6. P6 changes nothing on the external surface: C1-C4 NOT
TESTED (human-gated), cross-machine D2 human, DOI human, no real embalase/tuslah in the data
(edge strata synthetic only). Score scoping honesty and the size of the remaining external
gap; is the R5 §13 boundary sentence still sufficient?
Give: the top external risk, whether the boundary wording is publication-safe, and a 0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your three prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5; gate-correctness 3 / 3 / 3; oracle-validity 4 / 4 / 3; reproducibility 3 / 5 / 6; e2e-design 4 / 5 / 5; external-validity 3 / 4 / 4)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v5 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run), which are merely claimed, which are still open
2. Any NEW problems P6 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35 and vs 43
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    P6_SUMMARY
    + "\n\n== YOUR v5 VERDICT (run 4795743, 43/100) - the findings to re-verify ==\n"
    + V5_VERDICT
    + "\n\n== R5 REPORT (incl. §16 P6 and §17 post-P6 corrections) ==\n"
    + REPORT
    + "\n\n== P6 TASK DOC + RUBRIC ==\n"
    + P6TASK
    + "\n\n== P6 ACCEPTANCE SUITE TRANSCRIPT (newest run, current pinned tools) ==\n"
    + SUITE_RUN
    + "\n\n== P4 EDGE-STRATA RE-CHECK TRANSCRIPT ==\n"
    + STRATA_RUN
    + "\n\n== RELEASE MANIFEST (P6 re-pin) ==\n"
    + MANIFEST
    + "\n\n== GATE / ORACLE / SUITE SOURCES (P6 build) ==\n"
    + "\n\n".join(tool_sources)
)

body = '''"""
GPT-6 Astra v6 assessment of the DR->Khanza E2E billing benchmark (post P1-P6 remediation).
All evidence/report/task-doc/v5-verdict/manifest/tool and suite sources embedded inline.
Assessment history: run 4701365 = 35/100; run 4769794 = 43/100; run 4795743 = 43/100.
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


@kbench.task(name="dr-khanza-e2e-full-assessment", description="GPT-6 v6 assessment of DR->Khanza E2E benchmark after P1-P6 remediation")
def dr_khanza_e2e_assessment(llm) -> dict:
    """Astra v6 assessment of the DR->Khanza E2E benchmark."""
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
    lines = ["# Astra v6 assessment: dr-khanza-e2e-full-assessment (post P1-P6)", ""]
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

out = R5.parent / "kaggle" / "deers-rock-assessment" / "task_r6_reassess.py"
out.write_text(body, encoding="utf-8")
(HERE / "task_r6_reassess.py").write_text(body, encoding="utf-8")
print("wrote %s (%d bytes)" % (out, out.stat().st_size))
print("CONTENT chars: %d (v5 task file was 153,503 bytes)" % len(CONTENT))
