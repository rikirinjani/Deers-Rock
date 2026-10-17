#!/usr/bin/env python3
"""burst_test.py — Phase 7 OPTIONAL stress burst (3-day window at 5x rate).

Invoked by run_all.sh Phase 7 as:
    python3 /opt/Deers-Rock/tools/burst_test.py 2>&1 | tee -a "$RESULTS/$RUN_ID/burst.log"
RUN_ID and RESULTS come from the environment (exported by run_all.sh).

What it does (only when ALL gates passed and the orchestrator reached the
optional Phase 7):
  1. generate a 3-day encounter window (2026-11-02..04, Mon-Wed) at 5x the
     class-C weekday arrival rate — weekday lambda 1500/day instead of 300
     (Sat/Sun profile untouched; window chosen all-weekday on purpose)
  2. load it with the SAME machinery as the Stage B ladder
     (generate_scale_encounters.generate + load_to_db — imported, not
     duplicated: reg UPSERT, rawat/dpo delete+insert, ledger upsert)
  3. run KhanzaBillingConsumer over the export (consumer_burst.log)
  4. snapshot telemetry (collect_scale_telemetry.py --stage burst)
  5. write burst_benchmark.md into the run dir

Corpus isolation: the burst monkeypatches the generator module in-process —
LAM_WEEKDAY 300->1500 and SEQ_BASE 800001->900001 — so burst no_rawats are
YYYY/MM/DD/9NNNNN. That marker, plus a distinct seed (20261103) and the
November window, guarantees ZERO no_rawat overlap with the B-series corpus
(position-11 '8' rows) even though sql_sik_bench_restore_clean is currently
a logging-only stub. B-series behavior of generate_scale_encounters.py is
unchanged (no file edit; overrides are process-local to this tool).

Defensive by contract: if state.json's all_gates_passed != 1, logs a note
and exits 0 WITHOUT doing any work.

--dry-run: prints the exact generator parameters / commands it would use,
verifies the module import + in-process overrides, and touches NOTHING
(no DB, no files) — for validation while a live run owns the box.

Exit: 0 success (or clean skip); non-zero on real failure (consumer crash,
telemetry crash) so run_all logs "burst incomplete".
"""
import datetime
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

STAGE = "burst"
STATE_FILE = "/opt/dr-benchmark/state/state.json"
BURST_DAYS = 3
BURST_START = datetime.date(2026, 11, 2)   # Mon-Wed, all-weekday window
BURST_SEED = 20261103                      # distinct from B-series 20261012
BURST_LAM_WEEKDAY = 1500                   # 5x the 300/day class-C rate
BURST_SEQ_BASE = 900001                    # '9' marker — no B-series overlap
CONSUMER_TIMEOUT_S = 7200
TELEMETRY_TIMEOUT_S = 900

RE_OK = re.compile(r"OK: Processed (\d+) visits in (\d+)s \(avg ([\d\.]+)ms")
RE_BILL = re.compile(r"Billing rows inserted:\s*(\d+)\s*\|\s*Total "
                     r"revenue:\s*Rp\s*([\d,\.]+)")


def _plog(msg):
    print("[%s] %s" % (datetime.datetime.now().strftime("%H:%M:%S"), msg),
          flush=True)


def read_state_gate():
    """Return (all_gates_passed:str, phase:str) — ('', '') if unreadable."""
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            d = json.load(f)
        return str(d.get("all_gates_passed", "")), str(d.get("phase", ""))
    except (OSError, ValueError):
        return "", ""


def build_plan(results_root, run_id):
    rdir = os.path.join(results_root, run_id)
    return {
        "rung": STAGE,
        "days": BURST_DAYS,
        "start": BURST_START.isoformat(),
        "seed": BURST_SEED,
        "weekday_lambda": BURST_LAM_WEEKDAY,
        "base_weekday_lambda": 300,
        "multiplier": 5,
        "seq_base": BURST_SEQ_BASE,
        "encounters": os.path.join(rdir, "burst.encounters.txt"),
        "consumer_log": os.path.join(rdir, "consumer_burst.log"),
        "telemetry_json": os.path.join(rdir, "telemetry_burst.json"),
        "summary_md": os.path.join(rdir, "burst_benchmark.md"),
        "run_dir": rdir,
    }


def run(results_root, run_id):
    import generate_scale_encounters as gse

    plan = build_plan(results_root, run_id)
    os.makedirs(plan["run_dir"], exist_ok=True)
    tool = dbutil.Tool(STAGE + "_test")
    tool.log("=== Phase 7 burst: %d days from %s at 5x weekday rate "
             "(lambda %d, seed %d, seq_base %d — '9' marker, no B-series "
             "overlap) ===" % (plan["days"], plan["start"],
                               plan["weekday_lambda"], plan["seed"],
                               plan["seq_base"]))

    # in-process generator overrides (module left untouched on disk)
    gse.LAM_WEEKDAY = plan["weekday_lambda"]
    gse.SEQ_BASE = plan["seq_base"]
    tool.log("generate_scale_encounters overrides applied: "
             "LAM_WEEKDAY=%d SEQ_BASE=%d" % (gse.LAM_WEEKDAY, gse.SEQ_BASE))

    gen = gse.generate(plan["days"], plan["encounters"], plan["seed"],
                       BURST_START, False, tool)
    gse.load_to_db(gen, tool)
    tool.log("burst corpus loaded: %d visits, %d ledger rows" %
             (gen["totals"]["visits"], len(gen["ledger_rows"])))

    # consumer pass (same argv shape as run_all's run_consumer_over_export)
    tool.log("running KhanzaBillingConsumer over %s" % plan["encounters"])
    t0 = time.time()
    with open(plan["consumer_log"], "w", encoding="utf-8") as lf:
        p = subprocess.run(
            ["java", "-cp", dbutil.CONSUMER_CP, "KhanzaBillingConsumer",
             plan["encounters"], plan["consumer_log"]],
            cwd=dbutil.KHANZA_DIR, stdout=lf, stderr=subprocess.STDOUT,
            timeout=CONSUMER_TIMEOUT_S)
    tool.log("consumer rc=%d in %.0fs (log: %s)" %
             (p.returncode, time.time() - t0, plan["consumer_log"]))
    if p.returncode != 0:
        tool.log("=== burst FAILED at consumer pass (rc=%d) ==="
                 % p.returncode)
        return 1

    # telemetry snapshot (writes telemetry_burst.json/.md into the run dir)
    tool.log("collecting telemetry (stage=%s)" % STAGE)
    tp = subprocess.run(
        ["python3", os.path.join(os.path.dirname(
            os.path.abspath(__file__)), "collect_scale_telemetry.py"),
         "--stage", STAGE],
        capture_output=True, text=True, timeout=TELEMETRY_TIMEOUT_S,
        env=dict(os.environ, RUN_ID=run_id))
    tool.log("telemetry rc=%d" % tp.returncode)
    if tp.returncode != 0:
        tool.log("telemetry output tail: %s" %
                 ((tp.stdout or "")[-400:] + (tp.stderr or "")[-400:]))
        return 1

    _write_summary(tool, plan, gen)
    dbutil.decision("Phase 7 burst corpus isolation",
                    "burst_test.py ran a 3-day all-weekday window "
                    "(2026-11-02..04) at 5x class-C rate (weekday lambda "
                    "1500) with in-process generator overrides only "
                    "(LAM_WEEKDAY, SEQ_BASE 900001 — no_rawat marker '9'); "
                    "seed %d. Zero no_rawat overlap with the B-series "
                    "'8' corpus even though the restore step is a stub."
                    % BURST_SEED)
    tool.log("=== burst complete ===")
    return 0


def _write_summary(tool, plan, gen):
    tel = {}
    try:
        with open(plan["telemetry_json"], "r", encoding="utf-8") as f:
            tel = json.load(f)
    except (OSError, ValueError):
        tool.log("WARN: telemetry json unreadable; summary from consumer log")
    cons = (tel.get("consumer") or {})
    visits = cons.get("visits")
    wall_s = cons.get("wall_s")
    vpm = cons.get("visits_per_min")
    rows, rp = cons.get("billing_rows"), cons.get("total_rp")
    if visits is None or rows is None:
        txt = ""
        try:
            with open(plan["consumer_log"], "r", encoding="utf-8",
                      errors="replace") as f:
                txt = f.read()
        except OSError:
            pass
        m = RE_OK.search(txt)
        if m and visits is None:
            visits, wall_s = int(m.group(1)), float(m.group(2))
            vpm = round(visits / (wall_s / 60.0), 1) if wall_s else None
        m = RE_BILL.search(txt)
        if m and rows is None:
            rows, rp = int(m.group(1)), m.group(2)
    hit = None
    try:
        hit = "%.3f%%" % float(
            tel["mysql"]["_derived"]["buffer_pool_hit_pct"])
    except (KeyError, TypeError, ValueError):
        pass

    L = []
    L.append("# Phase 7 burst benchmark — %s @ %s" %
             (plan["rung"], time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                          time.gmtime())))
    L.append("")
    L.append("- window: %d days from %s (all-weekday) at 5x class-C rate"
             % (plan["days"], plan["start"]))
    L.append("- arrival profile: weekday lambda %d (base %d x%d); "
             "Poisson, 08:00-14:00; seed %d; no_rawat marker '9' "
             "(seq base %d)" % (plan["weekday_lambda"],
                                plan["base_weekday_lambda"],
                                plan["multiplier"], plan["seed"],
                                plan["seq_base"]))
    L.append("- visits generated: %d | ledger rows: %d" %
             (gen["totals"]["visits"], len(gen["ledger_rows"])))
    L.append("- consumer: %s visits | wall %s s | %s visits/min | "
             "billing rows %s | total Rp %s" %
             (visits, wall_s, vpm, rows, rp))
    if hit:
        L.append("- InnoDB buffer pool hit during telemetry: %s" % hit)
    L.append("- baseline comparison: B-rung weekday-300 throughput is in "
             "telemetry_B1/B2 (see BENCHMARK_REPORT.md ladder)")
    L.append("- notes: no sampled real-form diff in the burst; restore step "
             "is a logging-only stub, isolation comes from the '9' no_rawat "
             "marker + distinct seed")
    txt = "\n".join(L) + "\n"
    with open(plan["summary_md"], "w", encoding="utf-8", newline="\n") as f:
        f.write(txt)
    tool.log("summary written: %s" % plan["summary_md"])


def dry_run(results_root, run_id):
    plan = build_plan(results_root, run_id)
    import generate_scale_encounters as gse
    base_lam, base_seq = gse.LAM_WEEKDAY, gse.SEQ_BASE
    gse.LAM_WEEKDAY = plan["weekday_lambda"]
    gse.SEQ_BASE = plan["seq_base"]
    ok = (gse.LAM_WEEKDAY == BURST_LAM_WEEKDAY
          and gse.SEQ_BASE == BURST_SEQ_BASE
          and base_lam == 300 and base_seq == 800001)
    gse.LAM_WEEKDAY, gse.SEQ_BASE = base_lam, base_seq  # restore

    _plog("=== burst_test --dry-run (no DB, no files touched) ===")
    _plog("plan: %s" % json.dumps(plan, sort_keys=True))
    _plog("generator module check: generate_scale_encounters imported; "
          "LAM_WEEKDAY %d->%d (5x), SEQ_BASE %d->%d ('9' marker) "
          "override%s OK" % (base_lam, plan["weekday_lambda"], base_seq,
                             plan["seq_base"], "" if ok else " FAILED"))
    _plog("consumer cmd (not run): cd %s && java -cp <consumer jars> "
          "KhanzaBillingConsumer %s %s" %
          (dbutil.KHANZA_DIR, plan["encounters"], plan["consumer_log"]))
    _plog("telemetry cmd (not run): python3 collect_scale_telemetry.py "
          "--stage %s (RUN_ID=%s)" % (STAGE, run_id))
    _plog("state gate (defensive): all_gates_passed must equal '1' before "
          "any real work")
    _plog("=== dry-run %s ===" % ("OK" if ok else "FAILED"))
    return 0 if ok else 1


def main():
    results_root = os.environ.get("RESULTS") or dbutil.RESULTS_ROOT
    run_id = os.environ.get("RUN_ID") or "burst_standalone"

    if "--dry-run" in sys.argv:
        return dry_run(results_root, run_id)

    gate, phase = read_state_gate()
    if gate != "1":
        _plog("=== burst skipped: all_gates_passed=%r (!= 1) — no work "
              "done, exit 0 ===" % gate)
        return 0
    if phase and phase not in ("burst", "reports", "done"):
        _plog("NOTE: state phase=%r looks mid-run; proceeding only because "
              "all_gates_passed=1 (Phase 7 gate)" % phase)
    try:
        return run(results_root, run_id)
    except subprocess.TimeoutExpired as e:
        _plog("=== burst FAILED: %s ===" % e)
        return 1
    except Exception as e:  # noqa: BLE001 — unattended tool must not stacktrace
        _plog("=== burst FAILED: %s: %s ===" %
              (type(e).__name__, str(e)[:300]))
        return 1


if __name__ == "__main__":
    sys.exit(main())
