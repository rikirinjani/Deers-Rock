"""Build the GPT-6 Astra v12 re-assessment task (post P1..P16) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment). Merged method only (as v8-v11). CONTENT is capped
at v11's size (MAX_CONTENT chars). New since v11: P15 (driver safety, acceptance predicates, source-row
line identity, recovery repairs), the independent P15 review (17/24 against a self-score of 23/24)
and P16 (the review's fixes). Tools v11 saw in full are given as unified diffs since the commit that
v11 was built from (60b19c7); new tools are embedded in full except small controls / chains, which are
pinned by SHA in the manifest. The task template is taken verbatim from build_astra_task_r10.py with
the version strings changed, so the run logic is v10's (as in v11).
"""
import pathlib
import re
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
R5 = HERE.parent.parent                      # khanza-r5/
TOOLS = R5 / "tools"
DOCS = R5 / "docs"
EVID = R5 / "evidence"
V11_COMMIT = "60b19c7"


def read(p):
    return pathlib.Path(p).read_text(encoding="utf-8")


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


def diff_since_v11(name):
    d = subprocess.run(["git", "diff", V11_COMMIT, "HEAD", "--", "khanza-r5/tools/" + name],
                       cwd=R5.parent, capture_output=True, text=True, encoding="utf-8").stdout
    if not d.strip():
        raise SystemExit("empty diff for %s - wrong commit?" % name)
    return d


def grep(path, keys):
    return "\n".join(l for l in read(path).split("\n") if any(k in l for k in keys))


R5_CLAIMS = r5_sections({"0", "1", "12", "13"})
R5_NEW = r5_sections({"27", "28"})
_h = read(DOCS / "khanza_session_handoff_20261025.md")
HANDOFF = _h[:_h.index("## 2. Standing rules")] + _h[_h.index("## 7. Owner decisions"):]
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
P15TASK = read(DOCS / "khanza_r5_task_p15_safety_and_line_identity.md")
P16TASK = read(DOCS / "khanza_r5_task_p16_review_fixes.md")
REVIEW = read(DOCS / "khanza_r5_p15_review.md")
V11 = read(EVID / "astra_v11_5496287_output.md")
V11_VERDICT = V11[V11.index("## VERDICT"):V11.index("## RAW MERGED RESPONSE")]
if len(V11_VERDICT.strip()) < 1000:
    raise SystemExit("V11_VERDICT too short - wrong source file?")
MAX_CONTENT = 317000

TRANSCRIPTS = [
    ("P15 chain (A/B/C/E steps, one held lock)", "p15/chain.log",
     ["===", "PASS", "FAIL", "exit", "frozen", "REPRODUCES", "DIFFERS", "oracle[", "form[", "P15E", "ABORT", "run starts", "LINE-IDENTITY", "ALL-EQUAL", "RESULT"]),
    ("P15 chain-E (after fix 2)", "p15/chain_e.log", None),
    ("P15 A1-A3 controls, old bytes vs new bytes", "p15/chain/a_negctl.txt", ["PASS", "FAIL", "old driver", "P15-A-NC"]),
    ("P15 library tests A4-A7", "p15/chain/a_lib_test.txt", None),
    ("P15 line controls B1-B5, C2 old vs new", "p15/chain/line_negctl.txt", ["PASS", "FAIL", "ENC ", "P15-LINE-NC", "INPUT-ERROR"]),
    ("P15 B6 control (after fix 2)", "p15/chain_e/b6_negctl.txt", ["PASS", "FAIL", "P15-B6", "coverage"]),
    ("P15 first-chain P11 negative controls: NC1 NOT-DISCRIMINATING (kept)", "p15/chain/r5_p11_negative_controls_20261026T123509Z.md", ["NC ", "DISCRIMINATING", "A28"]),
    ("P15 real-300 line identity summary", "p15/chain/real300_lines_summary.json", None),
    ("P15 fixture line identity summary", "p15/chain/fixture_lines_summary.json", None),
    ("P15 lock release", "p15/lock_release.txt", None),
    ("P16 chain (lib, controls, C4 rerun, comparators, regression)", "p16/chain.log", None),
    ("P16 chain-b (fix 1: fixture-only driver + line controls)", "p16/chain_b.log", None),
    ("P16 A1/A3/E4 controls", "p16/chain/p16_a_negctl.txt", None),
    ("P16 E1/E2/E3 controls", "p16/chain/p16_e_negctl.txt", ["PASS", "FAIL", "P16-E-NC", "A28"]),
    ("P16 real-300 line identity summary", "p16/chain/real300_lines_summary.json", None),
    ("P16 lock: free before acquisition, lsattr before unfreeze", "p16/lock_free_and_lsattr_before.txt", None),
    ("P16 lock release", "p16/lock_release.txt", None),
    ("P16 grant-line hashes (P15 files)", "p16/grant_line_hashes_p15.txt", None),
    ("P16 grant-line hashes (P16 files)", "p16/grant_line_hashes_p16.txt", None),
]
transcripts = []
for title, rel, keys in TRANSCRIPTS:
    path = EVID / rel
    text = grep(path, keys) if keys else read(path)
    transcripts.append("### %s (`evidence/%s`)\n```\n%s\n```" % (title, rel, text.strip()))

diffs = []
for name in ["sampled_real_form_diff_r5.py", "p6_acceptance_suite.sh", "p10_preservation_check.sh",
             "p8_recovery_unit_test.py", "p11_negative_controls.sh", "p12_perencounter_reconcile.py",
             "p13_wide_sample.sh", "p13_sample_compare.py", "p14_edge_run.sh", "p13_kill_test.sh"]:
    diffs.append("### DIFF since v11 (%s..HEAD): %s\n```diff\n%s\n```" % (V11_COMMIT, name, diff_since_v11(name)))

tool_sources = []
for name, lang in [("p15_line_identity.py", "python"), ("p15_lib.sh", "bash"),
                   ("p15_line_negctl.sh", "bash"), ("p15_a_negctl.sh", "bash"),
                   ("p15_b6_negctl.sh", "bash"), ("p16_a_negctl.sh", "bash"), ("p16_e_negctl.sh", "bash")]:
    tool_sources.append("### SOURCE: %s\n```%s\n%s\n```" % (name, lang, read(TOOLS / name)))
UNCHANGED = ("### NOT EMBEDDED (SHA-256 pinned in the embedded manifest): unchanged since v11: "
             "p14_line_identity.py (superseded by p15_line_identity.py), p14_edge_fixture.py, "
             "build_dr_charge_ledger_p2.py, charge_delta_per_component_p2.py, three_count_reconcile_p2.py, "
             "p6_dbxml.py, dbutil.py, p7_tax_rule_check.py, p8_builder_all_check.sh, p9_terminal_path_check.sh, "
             "dr_runlock.sh. By SHA only for budget: p15_lib_test.sh, p15_chain.sh, p15_chain_e.sh, p16_chain.sh, "
             "p16_chain_b.sh (their transcripts are embedded above).")

SUMMARY = """== P15-P16 SUMMARY (what changed since your v11 assessment, and what is NOT claimed) ==

Your v11 verdict (66/100, 'Needs targeted rework') named as the single next step: make the 300-encounter
line identity discriminating without using the expected ledger to pick the actual code (EQUAL-CTX), add a
same-name same-price wrong-code mutation, gate on payment/model equality and cardinality, retain
per-encounter results; first fix clone-refusal and cleanup safety (global pkill, cleanup before
validation). Each of your v11 findings was checked against the source first (task doc P15 s1, R5 s27):
32 confirmed, 3 partly true, 1 mixed (S1), and one new defect (S7, a vacuous grant probe) found during the check.

- P15 (R5 s27): driver safety (validation before the EXIT trap, run-scoped cleanup, pipefail, integer-safe
  stop rule, ledger pin check fails), source-row line identity (EQUAL-SRC, AMBIGUOUS fails), stricter
  --expect (B==A, form_model and ledger_model MATCH), fresh-B, input errors exit 2, the same C2 plant shown
  passing on the old comparator and failing on the new one, recovery-check repairs E1-E6. C4 rerun: fixture
  27/27, real 300/300, 1,240 lines, 0 line differences. Two defects in P15's own first bytes were recorded
  and re-run (NC1 NOT-DISCRIMINATING; a B6 old-arm ImportError).
- An INDEPENDENT read-only review of P15 (embedded in full) re-scored it 17/24 'Accept with fixes' against
  the executor's 23/24, and found residual defects: the preservation check's EXIT trap before its
  refusals (N1), an unquoted --since so B5 ran at midnight (N2), fresh-B ignoring pre-run INSERTs (N3),
  NULL payments read as 0 (N4), the A28' restore result not asserted (N5), switch value 0 treated as on
  (N6), B6 plants not exact (N7), an unguarded process-group kill (N8), and several claims without evidence.
- P16 (R5 s28): N1-N8 fixed with old-bytes-vs-new-bytes controls for each; fresh-B is now exactly one
  INSERT in total by benchmark@ at or after the run start; lsattr transcripts; lock state captured
  before acquisition and after release; C4 rerun under the stricter rule: fixture 27/27, real 300/300,
  0 pre-run INSERTs; suite 39/39, preservation PASS, unit 44/44, NC 5/5. A patch bug of the executor in the
  first P16 chain (a glued echo line, 32/33) was recorded and re-run (33/33). Executor self-score 23/24
  with R2 at 1.

NOT claimed / not done: the driver stop-rule is wiring-tested (the driver's own lines with the oracle
stubbed), not a full run with an injected failure; p12_perencounter_reconcile.py still sums payments with
COALESCE; the P14 lock release is unevidenced; C3 form-side code provenance (billing rows carry names, not
codes, so a wrong code under a shared display name is still invisible to the form-side check); X2
(independent hashes share the oracle module); the clean-box rebuild (no third box); P13 is 3.9 % of the
eligible cohort and the line identity covers 300 visits; the P14 ledger scope gaps (fractional jml,
embalase/tuslah, DR-own fees) are reported, not fixed; C1-C4 external validity. Budget note: tools you saw in
full in v11 are given as diffs since 60b19c7; small scripts by SHA."""

BASE = """You are a tough but fair principal-engineer assessor performing a TENTH assessment (v12) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365) -> 43/100 (run 4769794) -> 43/100 (run 4795743) -> 52/100 (run 4818826) -> 58/100 (v7: runs 4880158 + 4894730) -> 60/100 (v8: run 4897654) -> 62/100 (v9: run 4898353) -> 63/100 (v10: run 4918967) -> 66/100 (v11: run 5496287, 'Needs targeted rework'). Your v11 verdict is embedded verbatim below; the owner has since executed waves P15 and P16, and had an independent reviewer re-score P15. Your job:
1. VERIFY each v11 finding (genuinely fixed / merely claimed / still open, the top-3 issues, the single next step) against the CURRENT embedded evidence: the transcripts, the diffs since v11, the new tool sources, R5 s27-s28, the P15 and P16 task docs, the independent review and how P16 answered it, the manifest. Confirm what is fixed in code AND demonstrated by an asserted run on the old bytes failing and the new bytes passing; reject what is only claimed; identify NEW problems P15-P16 introduced.
2. Read the new checks critically: can each control (A1-A3, A5/A6 wiring, B1-B5d, C2, B6, E1-E4) fail when its property is violated? Is the source-row line identity (EQUAL-SRC) sound, and what does it still not prove? Is the fresh-B rule right? Are the stated limits honest and complete? Did P16 overclaim anywhere, as P15 did according to the reviewer?
3. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P15-P16. Do R5 s27-s28, the P15 and P16 task docs and self-scores (P15 23/24
against the reviewer's 17/24; P16 23/24) and the handoff match the embedded transcripts and code? Which
P15 overclaims did the independent review find, and are the strike-throughs and P16's own claims
accurate? Recompute the per-encounter Clopper-Pearson bounds (n=300, k=0). Is the first-chain bug in P16
disclosed honestly? Any remaining or NEW overclaim? Give a 0-10 score."""),
    ("gate-correctness", """
RE-READ the diffs and new sources: (a) p15_lib.sh and the drivers (validation before the trap, flags,
run-scoped kill with the leader/start-time guard, stop rule, pin check); (b) p15_line_identity.py and
p13_sample_compare.py (source-row identity, --expect gates, fresh-B total-count rule, NULL handling);
(c) the suite/preservation/NC-runner changes (A28' restore assertion, exact-1 switches, E1/E4);
(d) the controls: do they discriminate old from new on the same setup? (e) NEW gate defects, incl.
anything the A5/A6 wiring tests cannot catch. Give concrete code-level findings and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P15-P16 (diffs, the 27/27 and 300/300 reruns through it, EQUAL-SRC vs EQUAL, the
stated limit that billing rows carry names not codes). Is the real-form comparison independent enough at
line level now? Rank residual oracle risks (incl. C3, X2) and say whether it is fit for the stated
claims. Give a 0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P15-P16: frozen byte sets with manifests (22 files, lsattr transcripts,
local = box), old/new byte controls from .bak dirs, the run lock with free state captured, the builder
reproducing the ledger pin on fresh clones, deterministic sampler and fixture. What still blocks a
third party (no clean-box rebuild; Khanza tree, dumps, secrets external; one VPS)? Give blockers ranked
and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after P15-P16: A vs C on all 86,455 encounters, B fresh via audit trigger with the
exactly-one-in-total rule, 3,330 sampled re-bills, line identity on 300 from source rows, edge strata
with pre-registered deltas. What is a fair E2E claim now, what is the weakest leg, and what is the
fix? Give a 0-10 score."""),
    ("external-validity", """
ASSESS external validity after P16 (one Khanza/MySQL configuration, outpatient, synthetic cohort;
edge strata exercised but synthetic; C1-C4 NOT TESTED). Score scoping honesty and the remaining
external gap. Give the top external risk and a 0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your nine prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743; 52/100 run 4818826; 58/100 v7 runs 4880158+4894730; 60/100 v8 run 4897654; 62/100 v9 run 4898353; 63/100 v10 run 4918967; 66/100 v11 run 5496287).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5 / 6 / 6 / 6 / 7 / 7 / 7; gate-correctness 3 / 3 / 3 / 5 / 6 / 6 / 6 / 6.5 / 6; oracle-validity 4 / 4 / 3 / 5 / 6 / 7 / 7 / 7.5 / 7.5; reproducibility 3 / 5 / 6 / 5 / 6 / 6 / 6 / 6 / 6.5; e2e-design 4 / 5 / 5 / 6 / 7 / 7 / 7 / 7 / 8; external-validity 3 / 4 / 4 / 4 / 4 / 4 / 4 / 4 / 4.5)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v11 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run on old-vs-new bytes), which are merely claimed, which are still open
2. Any NEW problems P15-P16 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35, 43, 52, 58, 60, 62, 63 and 66
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    SUMMARY
    + "\n\n== YOUR v11 VERDICT (run 5496287, 66/100) - the findings to re-verify ==\n"
    + V11_VERDICT
    + "\n\n== R5 REPORT: claim sections (s0, s1, s12, s13) ==\n"
    + R5_CLAIMS
    + "\n\n== R5 REPORT: new sections since v11 (s27 P15, s28 P16) ==\n"
    + R5_NEW
    + "\n\n== INDEPENDENT REVIEW OF P15 (read-only reviewer, no box access) ==\n"
    + REVIEW
    + "\n\n== CURRENT HANDOFF (state, open items, standing rules) ==\n"
    + HANDOFF
    + "\n\n== P15 TASK DOC (verification table, packages, rubric, self-score) ==\n"
    + P15TASK
    + "\n\n== P16 TASK DOC (answers to the review, controls, rubric, self-score) ==\n"
    + P16TASK
    + "\n\n== TRANSCRIPTS ==\n"
    + "\n\n".join(transcripts)
    + "\n\n== RELEASE MANIFEST ==\n"
    + MANIFEST
    + "\n\n== DIFFS OF TOOLS YOU SAW IN FULL IN v11 ==\n"
    + "\n\n".join(diffs)
    + "\n\n== NEW TOOL SOURCES (P15-P16) ==\n"
    + "\n\n".join(tool_sources)
    + "\n\n" + UNCHANGED
)
print("CONTENT chars: %d (cap %d)" % (len(CONTENT), MAX_CONTENT))
for lbl, s in [("SUMMARY", SUMMARY), ("V11_VERDICT", V11_VERDICT), ("R5_CLAIMS", R5_CLAIMS), ("R5_NEW", R5_NEW),
               ("REVIEW", REVIEW), ("HANDOFF", HANDOFF), ("P15TASK", P15TASK), ("P16TASK", P16TASK),
               ("transcripts", "\n".join(transcripts)), ("MANIFEST", MANIFEST), ("diffs", "\n".join(diffs)),
               ("tool_sources", "\n".join(tool_sources))]:
    print("  %-13s %7d" % (lbl, len(s)))
if len(CONTENT) > MAX_CONTENT:
    raise SystemExit("CONTENT %d chars > cap %d - trim before building" % (len(CONTENT), MAX_CONTENT))

# Task template: v10's, verbatim, with the version strings changed (same run logic).
v10src = read(HERE / "build_astra_task_r10.py")
marker = "# ---------------------------------------------------------------------------\n# Task template"
TEMPLATE = v10src[v10src.index(marker):]
REPL = [
    ("GPT-6 Astra v10 assessment of the DR->Khanza E2E billing benchmark (post P1-P10 remediation).",
     "GPT-6 Astra v12 assessment of the DR->Khanza E2E billing benchmark (post P1-P16 remediation)."),
    ("All evidence/report/task-doc/v9-verdict/manifest/tool and suite sources embedded inline.",
     "All evidence/report/task-doc/v11-verdict/review/manifest/transcripts, diffs and tool sources embedded inline."),
    ("4898353 = 62/100.\n", "4898353 = 62/100; 4918967 = 63/100; 5496287 = 66/100.\n"),
    ('description="GPT-6 v10 assessment of DR->Khanza E2E benchmark after P1-P10 remediation"',
     'description="GPT-6 v12 assessment of DR->Khanza E2E benchmark after P1-P16 remediation"'),
    ('"""Astra v10 assessment of the DR->Khanza E2E benchmark."""',
     '"""Astra v12 assessment of the DR->Khanza E2E benchmark."""'),
    ('"# Astra v10 assessment: dr-khanza-e2e-full-assessment (post P1-P10)"',
     '"# Astra v12 assessment: dr-khanza-e2e-full-assessment (post P1-P16)"'),
    ('note = ("MERGED (budget $8/month): one call with BASE and CONTENT answers the six section asks, "\n'
     '        "then the synthesis over all six — the method of v8/v9.")',
     'note = ("MERGED: one call with BASE and CONTENT answers the six section asks, "\n'
     '        "then the synthesis over all six — the method of v8-v11.")'),
    ('name, maxtok = "task_r10_merged.py", 20000', 'name, maxtok = "task_r12_merged.py", 20000'),
]
for a, b in REPL:
    if TEMPLATE.count(a) != 1:
        raise SystemExit("template anchor not found exactly once: %r" % a[:70])
    TEMPLATE = TEMPLATE.replace(a, b)
exec(compile(TEMPLATE, "build_astra_task_r10.py:template", "exec"))
