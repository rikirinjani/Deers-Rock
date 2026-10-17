#!/usr/bin/env python3
"""stage_a_g2.py — Phase 4 Stage A GATE G2 composite runner.

Runs the 5 Stage A sub-steps in the same order as run_all.sh's run_stageA:
  1. load_354_dr_visits.py       — verify 354 DR cohort, build dr_charge_ledger
                                   if empty (from sik DR sources), stage the export
  2. consumer over the export    — dbutil.run_export + run_consumer (writes sik.billing)
  3. three_count_reconcile.py    — A == B == C per component (rows + amount)
  4. charge_delta_per_component.py — per-visit/per-component delta == 0
  5. replay_determinism_check.py — double-run identical (hash/counts/totals)
  6. run_jasper_reports.py       — headless Jasper or template-SQL fallback

Gate: G2 PASSES (exit 0) iff every sub-step exits 0.

Usage: RUN_ID=<id> python3 stage_a_g2.py --stage A
"""
import os, sys, time, subprocess
import dbutil

TOOLS_DIR = "/opt/Deers-Rock/tools"
RUN_ID = os.environ.get("RUN_ID", "test")
RDIR = os.path.join(dbutil.RESULTS_ROOT, RUN_ID)
tool = None  # set in main(); module-global so _write_report can log


def _run_tool(name, args=None):
    cmd = ["python3", os.path.join(TOOLS_DIR, name)] + (args or [])
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=3600,
                       env=dict(os.environ, RUN_ID=RUN_ID))
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def main():
    global tool
    attempt = "A"
    argv = sys.argv[1:]
    if "--stage" in argv:
        i = argv.index("--stage")
        if i + 1 < len(argv):
            attempt = argv[i + 1]
    tool = dbutil.Tool("stageA_g2_%s" % attempt)
    os.makedirs(RDIR, exist_ok=True)
    t0 = time.time()
    tool.log("=== Stage A GATE G2 composite (attempt %s) ===" % attempt)
    results = {}

    tool.log("[1/6] load_354_dr_visits.py")
    rc, out = _run_tool("load_354_dr_visits.py")
    results["load"] = rc
    tool.log("  rc=%d; %s" % (rc, out.strip().splitlines()[-1] if out.strip() else ""))
    if rc != 0:
        return _write_report(results, False)

    tool.log("[2/6] consumer over DR export (dbutil.run_export + run_consumer)")
    rc_exp, out = dbutil.run_export()
    if rc_exp != 0:
        tool.log("FAIL: dr_export.sh rc=%d" % rc_exp)
        results["export"] = rc_exp
        return _write_report(results, False)
    clog = os.path.join(RDIR, "stageA_consumer.log")
    rc_cons, tail = dbutil.run_consumer(clog)
    results["consumer"] = rc_cons
    tool.log("  consumer rc=%d; tail=%s" % (rc_cons, tail.strip().splitlines()[-1][:160]
                                            if tail.strip() else ""))
    if rc_cons != 0:
        return _write_report(results, False)

    for key, name in (("three_count", "three_count_reconcile.py"),
                      ("charge_delta", "charge_delta_per_component.py"),
                      ("replay", "replay_determinism_check.py"),
                      ("jasper", "run_jasper_reports.py")):
        tool.log("[+] %s" % name)
        rc, out = _run_tool(name, ["--stage", attempt])
        results[key] = rc
        tool.log("  rc=%d; %s" % (rc, out.strip().splitlines()[-1] if out.strip() else ""))

    all_pass = all(rc == 0 for rc in results.values())
    tool.log("sub-step results: %s" % results)
    tool.log("composite gate: %s" % ("PASS" if all_pass else "FAIL"))
    return _write_report(results, all_pass)


def _write_report(results, all_pass):
    rep = os.path.join(RDIR, "stageA_G2_validation.md")
    with open(rep, "a") as f:
        f.write("\n# GATE G2 composite @ %s\n"
                % time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        f.write("- VERDICT: %s\n- sub-steps: %s\n" % ("PASS" if all_pass else "FAIL", results))
    if tool:
        tool.log("wrote %s" % rep)
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
