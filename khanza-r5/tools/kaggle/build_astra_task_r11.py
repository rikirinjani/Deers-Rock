"""Build the GPT-6 Astra v11 re-assessment task (post P1..P14) for the DR->Khanza E2E benchmark.

Same task name (dr-khanza-e2e-full-assessment). Merged method only (as v8-v10). CONTENT is capped
at v10's size (MAX_CONTENT chars). New since v10: P11 (negative controls), the VPS run lock, P12
(evidence chain re-run, per-encounter reconciliation, published sources), P13 (wide sample) and
P14 (edge strata + charge-line identity). Tools v10 saw in full are given as unified diffs since
the v10 build commit 39deb3a; new tools are embedded in full except small negative-control/kill
scripts, which are pinned by SHA in the manifest. The task template (TEMPLATE) is taken verbatim
from build_astra_task_r10.py with the version strings changed, so the run logic is v10's.
"""
import hashlib
import pathlib
import re
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
R5 = HERE.parent.parent                      # khanza-r5/
TOOLS = R5 / "tools"
DOCS = R5 / "docs"
EVID = R5 / "evidence"
V10_COMMIT = "39deb3a"


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


def diff_since_v10(name):
    d = subprocess.run(["git", "diff", V10_COMMIT, "HEAD", "--", "khanza-r5/tools/" + name],
                       cwd=R5.parent, capture_output=True, text=True, encoding="utf-8").stdout
    if not d.strip():
        raise SystemExit("empty diff for %s - wrong commit?" % name)
    return d


def grep(path, keys):
    return "\n".join(l for l in read(path).split("\n") if any(k in l for k in keys))


R5_CLAIMS = r5_sections({"0", "1", "12", "13"})
R5_NEW = r5_sections({"22", "23", "24", "25", "26"})
_h = read(DOCS / "khanza_session_handoff_20261025.md")
# state only (s1 current state + open items, s7 owner decisions, s8 P14); the standing rules and
# key facts (s2-s6) repeat R5 and the task docs
HANDOFF = _h[:_h.index("## 2. Standing rules")] + _h[_h.index("## 7. Owner decisions"):]
MANIFEST = read(DOCS / "khanza_r5_release_manifest.md")
P14TASK = read(DOCS / "khanza_r5_task_p14_edge_strata_line_identity.md")
V10 = read(EVID / "astra_v10_4918967_output.md")
V10_VERDICT = V10[V10.index("## VERDICT"):V10.index("## RAW MERGED RESPONSE")]
if len(V10_VERDICT.strip()) < 1000:
    raise SystemExit("V10_VERDICT too short - wrong source file?")
MAX_CONTENT = 317000

SUMMARY_KEYS = ["P13W", "oracle:", "form:", "sukses:", "rate:", "clone", "cleanup", "STOP"]
TRANSCRIPTS = [
    ("P12 evidence chain (one held lock, frozen set of 15)", "p12/r5_p12_rerun_chain_20261024T112518Z.log", None),
    ("P12 acceptance suite transcript (39 checks; verdict lines only)", "p12/r5_p6_acceptance_20261024T112620Z.md",
     ["# ", ": PASS", ": FAIL", "PASS=", "FAIL=", "exit="]),
    ("P12 P11 negative controls re-run", "p12/r5_p11_negative_controls_20261024T113529Z.md", None),
    ("P12 preservation check", "p12/r5_p10_preservation_20261024T113326Z.md", None),
    ("Run-lock negative control", "p12/r5_runlock_negctl_20261024T114634Z.md", None),
    ("P12 reconcile NC, FAILED first (plant changed 0 rows)", "p12/r5_p12_reconcile_negctl_FAILED_plant_noop_20261024T114800Z.log", None),
    ("P12 reconcile NC, fixed", "p12/r5_p12_reconcile_negctl_20261024T1155Z.log", None),
    ("P12 visit replay 2026/10/23/000408", "p12/r5_p12_visit_replay_20261024T132443Z.md", None),
    ("P13 stage 0 driver (summary lines)", "p13/stage0/driver.log", SUMMARY_KEYS),
    ("P13 stage 1 driver (summary lines)", "p13/stage1/driver.log", SUMMARY_KEYS),
    ("P13 stage 2 driver (summary lines)", "p13/stage2/driver.log", SUMMARY_KEYS),
    ("P13 comparator summary", "p13/comparator_summary.txt", None),
    ("P14 main run (summary lines)", "p14/main_run.log",
     ["clone", "fixture", "builder", "REPRODUCES", "DIFFERS", "grant", "RETARGET", "consumer",
      "oracle[", "form[", "P14E", "cleanup", "STOP", "ABORT", "verdict"]),
    ("P14 builder FAIL-CLOSED on fractional jml (kill-test attempt 1)", "p14/kill_driver_attempt1.log", None),
    ("P14 kill test (attempt 2)", "p14/t2_kill_test.txt", None),
    ("P14 guard self-test", "p14/t2_guard_selftest.txt", None),
    ("P14 T1 fixture negative controls", "p14/t1_negctl.txt", None),
    ("P14 post chain: T4 fixture comparator, first (vacuous) NC, T5 real 300, teardown, final state", "p14/post.log", None),
    ("P14 NC re-run (fixed scratch copy)", "p14/nc_rerun.log", None),
    ("P14 live state baseline", "p14/live_state_baseline.txt", None),
    ("P14 live state final", "p14/live_state_final2.txt", None),
]
transcripts = []
for title, rel, keys in TRANSCRIPTS:
    path = EVID / rel
    text = grep(path, keys) if keys else read(path)
    transcripts.append("### %s (`evidence/%s`)\n```\n%s\n```" % (title, rel, text.strip()))

diffs = []
for name in ["sampled_real_form_diff_r5.py", "p6_acceptance_suite.sh", "p10_preservation_check.sh",
             "p10_hash_state.py", "p8_recovery_unit_test.py", "p6_run_suite_fresh.sh"]:
    diffs.append("### DIFF since v10 (%s..HEAD): %s\n```diff\n%s\n```" % (V10_COMMIT, name, diff_since_v10(name)))

tool_sources = []
for name, lang in [("p14_line_identity.py", "python"), ("p14_edge_fixture.py", "python"),
                   ("p14_edge_run.sh", "bash"), ("p14_line_negctl.sh", "bash"),
                   ("p13_sample_compare.py", "python"), ("p13_wide_sample.sh", "bash"),
                   ("p12_perencounter_reconcile.py", "python"), ("p11_negative_controls.sh", "bash")]:
    tool_sources.append("### SOURCE: %s\n```%s\n%s\n```" % (name, lang, read(TOOLS / name)))
UNCHANGED = ("### NOT EMBEDDED (SHA-256 pinned in the embedded manifest): unchanged since v10: "
             "build_dr_charge_ledger_p2.py, charge_delta_per_component_p2.py, three_count_reconcile_p2.py, "
             "p6_dbxml.py, dbutil.py, p7_tax_rule_check.py, p8_builder_all_check.sh, p9_terminal_path_check.sh. "
             "New, by SHA only for budget: dr_runlock.sh, p13_draw_sample.py, p12_visit_replay.sh. "
             "New but small (negative controls / kill tests / drop scripts): runlock_negctl.sh, "
             "p12_reconcile_negctl.sh, p12_rerun_chain.sh, p13_compare_negctl.sh, p13_kill_test.sh, "
             "p13_drop_clone.sh, p14_t0_discovery.sh, p14_live_state.sh, p14_fixture_split.py, "
             "p14_kill_test.sh, p14_drop_clone.sh, p14_t1_negctl.sh, p14_post.sh, p14_nc_rerun.sh. "
             "Published in P12: stagea_common.py without secrets, consumer/harness Java sources under src/.")

SUMMARY = """== P11-P14 SUMMARY (what changed since your v10 assessment, and what is NOT claimed) ==

Your v10 verdict (63/100, 'Needs targeted rework') named as the single next step: repair the
preservation experiment (pre-operation independent snapshots, immediate and retry restoration
asserted separately, a discriminating A28 fault point, complete hash inventories, fixture retained
on failure); top-3: recovery/acceptance integrity, independent reproducibility, independent
encounter-level financial validation (incl. the same-price code-swap blind spot). Each of your nine
v10 findings was checked against the source first (R5 s22). Delivered since (R5 s22-s26 embedded):

- P11: every P10 recovery check gets an inert test-only switch that breaks the property it tests;
  5/5 negative controls DISCRIMINATING (FAIL with the switch, PASS without), suite 39/39, unit 33/33,
  preservation PASS, a forced-failure control with exactly one failing assertion and the fixture kept.
  A second agent session rewrote tools 19 s before an evidence run (recorded) -> run lock.
- Run lock (R5 s23): advisory exclusive VPS lock; guarded tools exit 3 before any write unless the
  caller holds it; negative control PASS=9. Limits stated (not a security boundary; the suite run
  directly is unguarded).
- P12 (R5 s24): the whole P11 evidence chain re-taken on the frozen run-lock bytes under one held
  lock (suite 39/39, preservation PASS, unit 33/33, builder byte-identical, NC 5/5, run-lock NC 9/9).
  Per-encounter reconciliation: A vs C on all 86,455 DR encounters, 0 differences; B vs C on the 1,068
  with form-save rows: 1 differs (2026/10/23/000408, a stale payment row, shown by a replay on a
  throwaway clone: a fresh form run writes 204,506 = ledger). Sources published (stagea_common.py
  without secrets, Java consumer/harness, STRATA pinned). A reconcile NC that first planted nothing
  was caught and fixed (ROW_COUNT()=1 asserted).
- P13 (R5 s25): fresh disjoint random samples N=30/300/3000 re-billed through the real form on a
  disposable clone with B taken fresh (an audit trigger proves a new detail_nota_jalan row written by
  benchmark@): 0/3330 differing on A_form==C, B==C, fresh-B. Corrections: the Clopper-Pearson bound
  was first written 4x too small (now 0.090% one-sided); the driver's rate line double-counts
  (documented, frozen, not fixed).
- P14 (R5 s26): (a) B3 edge strata, never tested before (every DR visit has 1 procedure, no
  embalase/tuslah, biaya_reg 10000): 27 authored visits / 8 strata through the real form on a clone,
  27/27 match their pre-registered A_form-C per component to the rupiah; (b) a per-encounter
  charge-line identity comparator (component, code, qty, unit, amount): 300/300 real visits, 1,240
  lines, 0 differences against the live-pinned ledger; the same-price code swap is caught at line
  level while component totals stay equal (NC discriminating). Findings: the frozen builder crashes
  (fail-closed) on fractional jml; the ledger has no embalase/tuslah and bills DR's own fees where
  Khanza bills 0; 119/300 real visits identify only through EQUAL-CTX (display-name collisions).
  Two invalid first attempts (an unexercised kill test, a vacuous NC) were recorded and re-run.
- Clone ledgers rebuilt by the frozen builder reproduce the pinned ledger hash (P11, P12, P14 x3).
- Live sik/sik_bench unchanged throughout (ledger 356,355 rows, hash a66a3a54..., per proof files).

NOT claimed / not done: a clean-box rebuild from the repo (no third box yet; the Khanza tree, DB
dumps and secrets remain external inputs); population-wide correctness (P13 is 3.9% of the eligible
cohort); line identity beyond 300 visits; fault modes not injected (power loss, MySQL crash, disk
full); C1-C4 calibration/clinical review; inpatient/BPJS; the P15 ledger gaps above are reported,
not fixed. Budget note: tools you saw in full in v10 are given as diffs; small new scripts by SHA."""

BASE = """You are a tough but fair principal-engineer assessor performing a NINTH assessment (v11) of a DR->Khanza E2E billing benchmark. History: 35/100 (run 4701365) -> 43/100 (run 4769794) -> 43/100 (run 4795743) -> 52/100 (run 4818826) -> 58/100 (v7: runs 4880158 + 4894730) -> 60/100 (v8: run 4897654) -> 62/100 (v9: run 4898353) -> 63/100 (v10: run 4918967, 'Needs targeted rework'). Your v10 verdict is embedded verbatim below; the owner has since executed waves P11, P12, P13 and P14 plus a VPS run lock. Your job:
1. VERIFY each v10 finding (genuinely fixed / merely claimed / still open, the top-3 issues, the single next step) against the CURRENT embedded evidence: the transcripts, the diffs since v10, the new tool sources, R5 s22-s26, the P14 task doc and rubric, the manifest. Confirm what is fixed in code AND demonstrated by an asserted run; reject what is only claimed; identify NEW problems P11-P14 introduced.
2. Read the new checks critically: can each negative control, the run lock, the per-encounter reconciliation, the P13 comparator and the P14 line-identity comparator fail when its property is violated? Is the EQUAL-CTX mapping sound? Are the P14 pre-registrations and their amendments honest? Is anything asserted beyond what was run?
3. Re-score the same 6 equally-weighted 0-10 criteria: (1) claim-honesty, (2) gate-correctness, (3) oracle-validity, (4) reproducibility, (5) e2e-design, (6) external-validity.
Be specific; quote the code and the transcript. Do the math on stated figures. Do not be polite - be useful."""

SECTIONS = [
    ("claim-honesty", """
ASSESS claim-honesty after P11-P14. Do R5 s22-s26, the P14 rubric/self-score (28/28 self) and the
handoff match the embedded transcripts and code? Recompute the P13 bound (n=3330, k=0) and the P14
bound (n=300, k=0). Are the recorded failures (vacuous NCs, unexercised kill test, 4x bound error,
doubled rate) disclosed honestly? Any remaining or NEW overclaim? Give a 0-10 score."""),
    ("gate-correctness", """
RE-READ the diffs and new sources: (a) the P11 negative-control switches: inert in production,
discriminating when set? (b) the run lock: what can still bypass it? (c) p12_perencounter_reconcile
and the P13 comparator: per-encounter, per-component, collation-safe? (d) the P14 line-identity
comparator: value-row selection, name->code mapping, EQUAL-CTX, aggregation per (component, code),
the --expect logic; can a wrong line pass? (e) NEW gate defects. Give concrete code-level findings
and a 0-10 score."""),
    ("oracle-validity", """
ASSESS the oracle after P11-P14 (diffs since v10, the P13/P14 runs through it, --allow-strata, the
consumer ENC-only baseline for the fixture). Is the real-form comparison now independent enough at
encounter and line level? Rank residual oracle risks and say whether it is fit for the stated
claims. Give a 0-10 score."""),
    ("reproducibility", """
ASSESS reproducibility after P12-P14: frozen byte sets with manifests (15+6+12), local = box hashes,
the builder reproducing the ledger pin on clones, published sources, the deterministic P13 sampler
and P14 fixture. What still blocks a third party (no clean-box rebuild; Khanza tree, dumps, secrets
external; one VPS)? Give blockers ranked and a 0-10 score."""),
    ("e2e-design", """
ASSESS the e2e design after P12-P14: A vs C on all 86,455 encounters, B fresh via audit trigger,
3,330 sampled form re-bills, line identity on 300, edge strata with pre-registered deltas. What is
a fair E2E claim now, what is the weakest leg, and what is the fix? Give a 0-10 score."""),
    ("external-validity", """
ASSESS external validity after P14 (one Khanza/MySQL configuration, outpatient, synthetic cohort;
edge strata now exercised but synthetic; C1-C4 NOT TESTED). Score scoping honesty and the remaining
external gap. Give the top external risk and a 0-10 score."""),
]

SYNTH = """Synthesize the six ASSESSMENT sections into an overall verdict, and compare against your eight prior assessments (35/100 run 4701365; 43/100 run 4769794; 43/100 run 4795743; 52/100 run 4818826; 58/100 v7 runs 4880158+4894730; 60/100 v8 run 4897654; 62/100 v9 run 4898353; 63/100 v10 run 4918967).

For each criterion score (0-10), give:
- The score, and the DELTA vs your prior scores (prior: claim-honesty 4 / 5 / 5 / 6 / 6 / 6 / 7 / 7; gate-correctness 3 / 3 / 3 / 5 / 6 / 6 / 6 / 6.5; oracle-validity 4 / 4 / 3 / 5 / 6 / 7 / 7 / 7.5; reproducibility 3 / 5 / 6 / 5 / 6 / 6 / 6 / 6; e2e-design 4 / 5 / 5 / 6 / 7 / 7 / 7 / 7; external-validity 3 / 4 / 4 / 4 / 4 / 4 / 4 / 4)
- One sentence of justification quoting specific evidence (code, transcript or report)
- One sentence on the biggest remaining risk

Then provide:
1. Which v10 findings are GENUINELY fixed (verified in code AND demonstrated by an asserted run), which are merely claimed, which are still open
2. Any NEW problems P11-P14 introduced or exposed
3. Top-3 remaining issues in priority order
4. Top-3 strongest properties to lead with
5. An overall score out of 100 (sum of six criteria scaled x10/6), rounded, and the delta vs 35, 43, 52, 58, 60, 62 and 63
6. An overall verdict: "Ready for paper submission" / "Needs targeted rework" / "Not ready"
7. The single most important next step"""

CONTENT = (
    SUMMARY
    + "\n\n== YOUR v10 VERDICT (run 4918967, 63/100) - the findings to re-verify ==\n"
    + V10_VERDICT
    + "\n\n== R5 REPORT: claim sections (s0, s1, s12, s13) ==\n"
    + R5_CLAIMS
    + "\n\n== R5 REPORT: new sections since v10 (s22 P11, s23 run lock, s24 P12, s25 P13, s26 P14) ==\n"
    + R5_NEW
    + "\n\n== CURRENT HANDOFF (state, open items, standing rules) ==\n"
    + HANDOFF
    + "\n\n== P14 TASK DOC (pre-registration, amendments, rubric, self-score) ==\n"
    + P14TASK
    + "\n\n== TRANSCRIPTS ==\n"
    + "\n\n".join(transcripts)
    + "\n\n== RELEASE MANIFEST ==\n"
    + MANIFEST
    + "\n\n== DIFFS OF TOOLS YOU SAW IN FULL IN v10 ==\n"
    + "\n\n".join(diffs)
    + "\n\n== NEW TOOL SOURCES (P11-P14) ==\n"
    + "\n\n".join(tool_sources)
    + "\n\n" + UNCHANGED
)
print("CONTENT chars: %d (cap %d)" % (len(CONTENT), MAX_CONTENT))
if len(CONTENT) > MAX_CONTENT:
    raise SystemExit("CONTENT %d chars > cap %d - trim before building" % (len(CONTENT), MAX_CONTENT))

# Task template: v10's, verbatim, with the version strings changed (same run logic).
v10src = read(HERE / "build_astra_task_r10.py")
marker = "# ---------------------------------------------------------------------------\n# Task template"
TEMPLATE = v10src[v10src.index(marker):]
REPL = [
    ("GPT-6 Astra v10 assessment of the DR->Khanza E2E billing benchmark (post P1-P10 remediation).",
     "GPT-6 Astra v11 assessment of the DR->Khanza E2E billing benchmark (post P1-P14 remediation)."),
    ("All evidence/report/task-doc/v9-verdict/manifest/tool and suite sources embedded inline.",
     "All evidence/report/task-doc/v10-verdict/manifest/transcripts, diffs and tool sources embedded inline."),
    ("4898353 = 62/100.\n", "4898353 = 62/100; 4918967 = 63/100.\n"),
    ('description="GPT-6 v10 assessment of DR->Khanza E2E benchmark after P1-P10 remediation"',
     'description="GPT-6 v11 assessment of DR->Khanza E2E benchmark after P1-P14 remediation"'),
    ('"""Astra v10 assessment of the DR->Khanza E2E benchmark."""',
     '"""Astra v11 assessment of the DR->Khanza E2E benchmark."""'),
    ('"# Astra v10 assessment: dr-khanza-e2e-full-assessment (post P1-P10)"',
     '"# Astra v11 assessment: dr-khanza-e2e-full-assessment (post P1-P14)"'),
    ('note = ("MERGED (budget $8/month): one call with BASE and CONTENT answers the six section asks, "\n'
     '        "then the synthesis over all six — the method of v8/v9.")',
     'note = ("MERGED: one call with BASE and CONTENT answers the six section asks, "\n'
     '        "then the synthesis over all six — the method of v8-v10.")'),
    ('name, maxtok = "task_r10_merged.py", 20000', 'name, maxtok = "task_r11_merged.py", 20000'),
]
for a, b in REPL:
    if TEMPLATE.count(a) != 1:
        raise SystemExit("template anchor not found exactly once: %r" % a[:70])
    TEMPLATE = TEMPLATE.replace(a, b)
exec(compile(TEMPLATE, "build_astra_task_r10.py:template", "exec"))
