"""Build the GPT-6 Astra v13 re-assessment task (post P1..P21) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment). Merged method only (as v8-v12). CONTENT is capped
at v12's size (MAX_CONTENT chars). New since v12: P17 (Astra v12 findings, safety, C3 discovery), the
independent reviews of P17, P18, P19 and P20 (11/18, 20/24, 20/24, 19/24 against executor self-scores
18/18, 23/24, 23/24, 22/24) and the waves P18-P21 that answered them. Tools v12 saw in full are given as
unified diffs since the commit v12 was built from (accf3f9); the new P17-P20 chains, controls and
inventories are pinned by SHA in the manifest. The task template is taken verbatim from
build_astra_task_r10.py with the version strings changed, so the run logic is v10's (as in v11, v12).
"""
import pathlib
import re
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
R5 = HERE.parent.parent                      # khanza-r5/
TOOLS = R5 / "tools"
DOCS = R5 / "docs"
EVID = R5 / "evidence"
V12_COMMIT = "accf3f9"


def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8").replace("\r\n", "\n")


def r5_sections(nums):
    s = read(DOCS / "khanza_benchmark_report_R5.md")
    idx = [(m.group(1), m.start()) for m in re.finditer(r"^## (\d+)\.", s, re.M)]
    out = []
    for i, (n, p) in enumerate(idx):
        if n in nums:
            e = idx[i + 1][1] if i + 1 < len(idx) else len(s)
            out.append(s[p:e].rstrip())
    if len(out) != len(nums):
        raise SystemExit("R5 sections missing: wanted %s" % sorted(nums))
    return "\n\n".join(out)


def diff_since_v12(name):
    d = subprocess.run(["git", "diff", V12_COMMIT, "HEAD", "--", "khanza-r5/tools/" + name],
                       cwd=R5.parent, capture_output=True, text=True, encoding="utf-8").stdout
    if not d.strip():
        raise SystemExit("empty diff for %s - wrong commit?" % name)
    return d.replace("\r\n", "\n")


def grep(path, keys):
    return "\n".join(l for l in read(path).split("\n") if any(k in l for k in keys))


def head(path, marker):
    s = read(path)
    return s[:s.index(marker)] if marker in s else s[:6000]


R5_CLAIMS = r5_sections({"0", "1", "12", "13"})
R5_NEW = r5_sections({"29", "30", "31", "32", "33"})
_h = read(DOCS / "khanza_session_handoff_20261025.md")
HANDOFF = _h[:_h.index("## 2. Standing rules")] + _h[_h.index("## 7. Owner decisions"):]
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
REVIEW_P17 = head(DOCS / "khanza_r5_p17_review.md", "## 3.")
REVIEW_P18 = head(DOCS / "khanza_r5_p18_review.md", "## 3.")
REVIEW_P19 = read(DOCS / "khanza_r5_p19_review.md")
REVIEW_P20 = read(DOCS / "khanza_r5_p20_review.md")
V12 = read(EVID / "astra_v12_5514025_output.md")
V12_VERDICT = V12[V12.index("## VERDICT"):V12.index("## RAW MERGED RESPONSE")]
if len(V12_VERDICT.strip()) < 1000:
    raise SystemExit("V12_VERDICT too short - wrong source file?")
MAX_CONTENT = 317000

TRANSCRIPTS = [
    ("P17 chain", "p17/chain.log", ["===", "PASS", "FAIL", "exit", "frozen", "RESULT", "asserts"]),
    ("P18 chain", "p18/chain.log.txt", ["===", "PASS", "FAIL", "exit", "frozen", "RESULT", "asserts", "P15E"]),
    ("P19 chain", "p19/chain.log.txt", ["===", "PASS", "FAIL", "exit", "frozen", "RESULT", "asserts", "P15E"]),
    ("P20 first chain (C4 real-300 hang kept)", "p20/chain.log.txt", ["===", "PASS", "FAIL", "exit", "frozen", "RESULT", "asserts", "P15E", "command not found"]),
    ("P20 C4 re-run (alone)", "p20/rerun.log.txt", None),
    ("P20 chain b (fix-up)", "p20/chain_b/chain_b.log", None),
    ("P20 copy log (box commands after the capture)", "p20/copy_log.txt", None),
    ("P20 lock release", "p20/lock_release.txt", None),
]
transcripts = []
for title, rel, keys in TRANSCRIPTS:
    path = EVID / rel
    text = grep(path, keys) if keys else read(path)
    transcripts.append("### %s (`evidence/%s`)\n```\n%s\n```" % (title, rel, text.strip()))

diffs = []
for name in ["p15_lib.sh", "p15_line_identity.py", "p14_edge_run.sh", "p6_acceptance_suite.sh",
             "p13_wide_sample.sh", "p16_a_negctl.sh"]:
    diffs.append("### DIFF since v12 (%s..HEAD): %s\n```diff\n%s\n```" % (V12_COMMIT, name, diff_since_v12(name)))

UNCHANGED = ("### NOT EMBEDDED (SHA-256 pinned in the embedded manifest): p17_*/p18_*/p19_*/p20_* chains, negative-control "
             "scripts and release inventories (their transcripts are embedded above), and every tool v12 saw that did not change.")

SUMMARY = """== P17-P21 SUMMARY (what changed since your v12 assessment, and what is NOT claimed) ==

Your v12 verdict (71/100, 'Needs targeted rework') named as the single next step: C3 form-side charge-code
provenance, preceded by writer-death and XML-restore checks. The owner executed P17 (your findings verified
against the source first; V22 refuted), then had an INDEPENDENT reviewer re-score each wave. The executor's
self-score ran above the reviewer every time: P15 23 vs 17, P17 18 vs 11, P18 23 vs 20, P19 23 vs 20,
P20 22 vs 19. P18 closed M1-M16 (kill by pgid that fails closed, verified restore, form-failure stop rule,
unit/payment gates, final live-state proof taken last), P19 closed N1-N9 (UNCHECKED fails, the equal-mode source-unit
gate, the ORACLE-BATCH-FAILED gate), P20 closed O1-O6 (the helper now matches STAGE-DROP-FAILED and STAGE-KEEP,
reason-text mutant control, empty pid file) and P21 corrected records only. Each wave's review found sentences
about gates or causes written from intent rather than from code or data; the reviewers' last verdict is that the bytes
have converged and the remaining defect class is records written from the plan and not re-read.

NOT claimed / not done: C3 form-side provenance is a discovery gate, not an observation of actual charge codes; the
first P20 chain's real-300 harness hang (cause not established; the C4 re-run alone passed 27/27 and 300/300);
no single full chain on the final frozen bytes; the O1 patterns are covered by canned and real logs, not by a live
stage-drop failure; A8's failing branch; the P13 EXIT-trap restore and p13_wide_sample.sh with an empty pid file; B4
unpaired; the retrace from the repository leaves 44 files uncovered (AC-7 partly); the independent P20 score is
19/24 and the plan's Accept rule is not met (R9 = 1); X2, the clean-box rebuild (the box ends about 2026-11-20),
the P14 ledger scope gaps, C1-C4 external validity. Budget note: tools you saw in v12 are given as diffs
since accf3f9; new chains and controls by SHA."""

BASE = """You are a tough but fair principal-engineer assessor performing an ELEVENTH assessment (v13) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365) -> 43/100 (run 4769794) -> 43/100 (run 4795743) -> 52/100 (run 4818826) -> 58/100 (v7: runs 4880158 + 4894730) -> 60/100 (v8: run 4897654) -> 62/100 (v9: run 4898353) -> 63/100 (v10: run 4918967) -> 66/100 (v11: run 5496287) -> 71/100 (v12: run 5514025, 'Needs targeted rework'). Your v12 verdict is embedded verbatim below; the owner has since executed waves P17-P21 and had an independent reviewer re-score P17, P18, P19 and P20 (all embedded). Your job:
1. VERIFY each v12 finding (genuinely fixed / merely claimed / still open, the top-3 issues, the single next step) against the CURRENT embedded evidence: the transcripts, the diffs since v12, R5 s29-s33, the four independent reviews and the handoff.
2. Read the new checks critically: can each control fail when its property is violated? Is the pattern 'each independent review finds the previous wave's overclaims' evidence of a process defect or of convergence? Is C3 now observed or only gated? What would you require before the benchmark is called complete?
3. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P17-P21. Do R5 s29-s33, the handoff and the self-scores (P17 18/18 vs 11/18;
P18 23 vs 20; P19 23 vs 20; P20 22 vs 19) match the embedded transcripts and code? Which overclaims did each
independent review find, and are the strike-throughs and corrections accurate? Is the recurring pattern a
stable property of the process? Any remaining or NEW overclaim? Give a 0-10 score."""),
    ("gate-correctness", """
RE-READ the diffs and sources: p15_lib.sh (group liveness by pgid, harness identity, kill that fails closed,
oracle-batch-failed helper and its patterns, empty pid file), p14_edge_run.sh (stop rule, FORM-INCOMPLETE,
ORACLE-BATCH-FAILED), p15_line_identity.py (equal-mode source-unit gate, UNCHECKED fails, AMBIGUOUS),
p13_wide_sample.sh and the suite change. Do the controls discriminate old from new bytes? NEW gate defects,
including paths the canned and real logs cannot reach. Give concrete code-level findings and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P17-P21: the 27/27 and 300/300 reruns, source-unit gating (698 keys checked, 0
unchecked), the C3 discovery gate, EQUAL-SRC, and the stated limit that billing rows carry names, not codes.
Is the real-form comparison independent enough at line and unit level now? Rank residual oracle risks
(C3, X2) and say whether it is fit for the stated claims. Give a 0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P17-P21: 39-file frozen sets with manifests and lsattr transcripts, local = box,
old/new byte controls, the run lock, the release inventory (62 files, 10 manifests), the retrace (44 files
uncovered), the final live-state proof taken last, a first chain that hung and a C4 re-run alone. What
still blocks a third party (no clean-box rebuild; one VPS that ends about 2026-11-20)? Give blockers ranked
and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after P17-P21: A vs C on all 86,455 encounters, B fresh via audit trigger, 3,330 sampled
re-bills, line identity on 300 from source rows, edge strata, a stop rule driven by a real form failure.
What is a fair E2E claim now, what is the weakest leg, and what is the fix? Give a 0-10 score."""),
    ("external-validity", """
ASSESS external validity after P21 (one Khanza/MySQL configuration, outpatient, synthetic cohort; edge
strata exercised but synthetic; C1-C4 NOT TESTED). Score scoping honesty and the remaining external gap.
Give the top external risk and a 0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your ten prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743; 52/100 run 4818826; 58/100 v7 runs 4880158+4894730; 60/100 v8 run 4897654; 62/100 v9 run 4898353; 63/100 v10 run 4918967; 66/100 v11 run 5496287; 71/100 v12 run 5514025).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5 / 6 / 6 / 6 / 7 / 7 / 7 / 7.5; gate-correctness 3 / 3 / 3 / 5 / 6 / 6 / 6 / 6.5 / 6 / 7; oracle-validity 4 / 4 / 3 / 5 / 6 / 7 / 7 / 7.5 / 7.5 / 8; reproducibility 3 / 5 / 6 / 5 / 6 / 6 / 6 / 6 / 6.5 / 7; e2e-design 4 / 5 / 5 / 6 / 7 / 7 / 7 / 7 / 8 / 8.5; external-validity 3 / 4 / 4 / 4 / 4 / 4 / 4 / 4 / 4.5 / 4.5)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v12 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run on old-vs-new bytes), which are merely claimed, which are still open
2. Any NEW problems P17-P21 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35, 43, 52, 58, 60, 62, 63, 66 and 71
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    SUMMARY
    + "\n\n== YOUR v12 VERDICT (run 5514025, 71/100) - the findings to re-verify ==\n"
    + V12_VERDICT
    + "\n\n== R5 REPORT: claim sections (s0, s1, s12, s13) ==\n"
    + R5_CLAIMS
    + "\n\n== R5 REPORT: new sections since v12 (s29 P17 ... s33 P21) ==\n"
    + R5_NEW
    + "\n\n== INDEPENDENT REVIEW OF P17 (verdict, rubric, findings; read-only reviewer) ==\n" + REVIEW_P17
    + "\n\n== INDEPENDENT REVIEW OF P18 (verdict, rubric, findings) ==\n" + REVIEW_P18
    + "\n\n== INDEPENDENT REVIEW OF P19 ==\n" + REVIEW_P19
    + "\n\n== INDEPENDENT REVIEW OF P20 ==\n" + REVIEW_P20
    + "\n\n== CURRENT HANDOFF (state, open items, standing rules) ==\n"
    + HANDOFF
    + "\n\n== TRANSCRIPTS ==\n"
    + "\n\n".join(transcripts)
    + "\n\n== RELEASE MANIFEST ==\n"
    + MANIFEST
    + "\n\n== DIFFS OF TOOLS YOU SAW IN FULL IN v12 ==\n"
    + "\n\n".join(diffs)
    + "\n\n" + UNCHANGED
)
print("CONTENT chars: %d (cap %d)" % (len(CONTENT), MAX_CONTENT))
for lbl, s in [("SUMMARY", SUMMARY), ("V12_VERDICT", V12_VERDICT), ("R5_CLAIMS", R5_CLAIMS), ("R5_NEW", R5_NEW),
               ("REV_P17", REVIEW_P17), ("REV_P18", REVIEW_P18), ("REV_P19", REVIEW_P19), ("REV_P20", REVIEW_P20),
               ("HANDOFF", HANDOFF), ("transcripts", "\n".join(transcripts)), ("MANIFEST", MANIFEST),
               ("diffs", "\n".join(diffs))]:
    print("  %-13s %7d" % (lbl, len(s)))
if len(CONTENT) > MAX_CONTENT:
    raise SystemExit("CONTENT %d chars > cap %d - trim before building" % (len(CONTENT), MAX_CONTENT))

# Task template: v10's, verbatim, with the version strings changed (same run logic).
v10src = read(HERE / "build_astra_task_r10.py")
marker = "# ---------------------------------------------------------------------------\n# Task template"
TEMPLATE = v10src[v10src.index(marker):]
REPL = [
    ("GPT-6 Astra v10 assessment of the DR->Khanza E2E billing benchmark (post P1-P10 remediation).",
     "GPT-6 Astra v13 assessment of the DR->Khanza E2E billing benchmark (post P1-P21 remediation)."),
    ("All evidence/report/task-doc/v9-verdict/manifest/tool and suite sources embedded inline.",
     "All evidence/report/v12-verdict/reviews/manifest/transcripts and diffs embedded inline."),
    ("4898353 = 62/100.\n", "4898353 = 62/100; 4918967 = 63/100; 5496287 = 66/100; 5514025 = 71/100.\n"),
    ('description="GPT-6 v10 assessment of DR->Khanza E2E benchmark after P1-P10 remediation"',
     'description="GPT-6 v13 assessment of DR->Khanza E2E benchmark after P1-P21 remediation"'),
    ('"""Astra v10 assessment of the DR->Khanza E2E benchmark."""',
     '"""Astra v13 assessment of the DR->Khanza E2E benchmark."""'),
    ('"# Astra v10 assessment: dr-khanza-e2e-full-assessment (post P1-P10)"',
     '"# Astra v13 assessment: dr-khanza-e2e-full-assessment (post P1-P21)"'),
    ('note = ("MERGED (budget $8/month): one call with BASE and CONTENT answers the six section asks, "\n'
     '        "then the synthesis over all six — the method of v8/v9.")',
     'note = ("MERGED: one call with BASE and CONTENT answers the six section asks, "\n'
     '        "then the synthesis over all six — the method of v8-v12.")'),
    ('name, maxtok = "task_r10_merged.py", 20000', 'name, maxtok = "task_r13_merged.py", 20000'),
]
for a, b in REPL:
    if TEMPLATE.count(a) != 1:
        raise SystemExit("template anchor not found exactly once: %r" % a[:70])
    TEMPLATE = TEMPLATE.replace(a, b)
exec(compile(TEMPLATE, "build_astra_task_r10.py:template", "exec"))
