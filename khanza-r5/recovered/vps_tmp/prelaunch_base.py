#!/usr/bin/env python3
r"""build_benchmark_report.py — Phase 6 benchmark report builder.

Invoked by run_all.sh Phase 6:
    python3 /opt/Deers-Rock/tools/build_benchmark_report.py --run-id "$RUN_ID"

Reads the artifacts actually produced by the earlier phases under
/opt/dr-benchmark/results/<RUN_ID>/ (telemetry_<stage>.json/.md, <stage>.log,
<stage>_generate_manifest.md, <stage>_sampled_form_diff.md,
stageA_three_count_<stage>.log, stageA_charge_delta_<stage>.log,
stageA_G2_validation.md, consumer_<stage>.log, phase logs). For G1 / replay /
Jasper evidence that lives in an earlier run's directory (Stage A history),
it scans sibling run dirs newest-first and records which dir the evidence
came from (internal report only).

Outputs (written into the run dir unless --out-dir overrides — used for
scratch dry-runs that must not touch the live results tree):
  BENCHMARK_REPORT.md                — internal, full detail
  BENCHMARK_REPORT_publishable.md    — scrubbed, safe to publish

The publishable report is BUILT FROM STRUCTURED DATA ONLY (never a
string-replace of the internal one): only curated numbers/labels are emitted,
so no IP, DB password token, AES key/IV, DB username or host string ever
enters the file. As a belt-and-braces measure the composed text is run through
scrub_publishable.scrub_text() and re-verified against the orchestrator grep
    ([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|
    <KHANZA_AES_IV>|usere
and must return ZERO matches or the tool fails (exit 4).

Exit codes: 0 ok | 2 run dir missing | 3 no parseable telemetry artifacts |
4 publishable scrub verification failed. Missing OPTIONAL artifacts are noted
in the report and do not fail the build.

Usage:
  python3 build_benchmark_report.py --run-id <RUN_ID>
      [--results-root DIR] [--out-dir DIR]
"""
import argparse
import datetime
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scrub_publishable

DEFAULT_RESULTS_ROOT = "/opt/dr-benchmark/results"
RUNG_ORDER = ["B1", "B2", "B3", "B3_lowered_rate"]
RUNG_WINDOW = {"B1": "30 d", "B2": "90 d", "B3": "365 d",
               "B3_lowered_rate": "365 d (lowered 200/d)"}
REPORT_QUERIES = ["visits_by_clinic", "visits_by_day", "visits_by_doctor",
                  "revenue_by_month", "revenue_by_clinic", "drug_usage_top20",
                  "top_diagnoses", "top_billed_visits"]
TOOL_DIR = "/opt/Deers-Rock/tools"

# the exact orchestrator Phase-6 scrub grep (ERE source)
PUB_RE = re.compile(r"([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES"
                    r"|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere")


def now_utc():
    return datetime.datetime.now(datetime.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ")


def log(msg):
    print("[%s] %s" % (datetime.datetime.now().strftime("%H:%M:%S"), msg),
          flush=True)


def read_text(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def fmt_int(n):
    try:
        return "{:,}".format(int(str(n).replace(",", "")))
    except (TypeError, ValueError):
        return str(n)


# ---------------------------------------------------------------- parsers
RE_BILLING_LINE = re.compile(
    r"Billing rows inserted:\s*(\d+)\s*\|\s*Total revenue:\s*Rp\s*([\d,\.]+)")
RE_TC_VERDICT = re.compile(r"=== three-count reconcile (PASS|FAIL)")
RE_CD_VERDICT = re.compile(r"=== charge delta (PASS|FAIL)")
RE_DR_VISITS = re.compile(r"DR visits:\s*(\d+)")
RE_COUNT_A = re.compile(r"Count A [^:]*: rows=(\d+) amount=(\d+)")
RE_CD_TOTALS = re.compile(
    r"Khanza total:\s*(\d+)(?: \((\d+) visits\))? \| DR ledger total:\s*(\d+)")
RE_CD_COMP = re.compile(
    r"\s{2}(\w+):\s*khanza=(-?\d+)\s*ledger=(-?\d+)\s*delta=(-?\d+)")
RE_DIFF_COHORT = re.compile(
    r"cohort:\s*(\d+) generated visits\s*\|\s*sample desired:\s*(\d+)\s*\|"
    r"\s*attempted:\s*(\d+)\s*\|\s*coverage:\s*([\d\.]+)%")
RE_DIFF_DRIFT = re.compile(
    r"drift:\s*(\d+) visits\s*\|\s*drift rate:\s*([\d\.]+)\s*\(([\d\.]+)%\)")
RE_MAN_DAYS = re.compile(r"^- days:\s*(\d+)")
RE_MAN_VISITS = re.compile(r"^- visits:\s*(\d+)")
RE_MAN_SHA = re.compile(r"^- encounters sha256:\s*([0-9a-f]+)")
RE_G1_VERDICT = re.compile(r"##\s*VERDICT:\s*(PASS|FAIL)")
RE_GATE_PASS = re.compile(r"gate[^:]*:\s*(PASS|FAIL)", re.IGNORECASE)
RE_DONE_PASS = re.compile(r"===\s*.*\s(PASS|FAIL)")


def parse_rung_log(path):
    out = {}
    txt = read_text(path)
    if txt is None:
        return out
    m = RE_BILLING_LINE.search(txt)
    if m:
        out["billing_rows"] = int(m.group(1))
        out["total_rp"] = m.group(2)
    m = RE_DR_VISITS.search(txt)
    if m:
        out["dr_visits"] = int(m.group(1))
    return out


def parse_three_count(path):
    out = {}
    txt = read_text(path)
    if txt is None:
        return out
    m = RE_TC_VERDICT.search(txt)
    if m:
        out["verdict"] = m.group(1)
    m = RE_DR_VISITS.search(txt)
    if m:
        out["dr_visits"] = int(m.group(1))
    m = RE_COUNT_A.search(txt)
    if m:
        out["a_rows"], out["a_amount"] = int(m.group(1)), int(m.group(2))
    return out


def parse_charge_delta(path):
    out = {"components": {}}
    txt = read_text(path)
    if txt is None:
        return out
    m = RE_CD_VERDICT.search(txt)
    if m:
        out["verdict"] = m.group(1)
    m = RE_CD_TOTALS.search(txt)
    if m:
        out["khanza_total"] = int(m.group(1))
        out["ledger_total"] = int(m.group(3))
    for m in RE_CD_COMP.finditer(txt):
        out["components"][m.group(1)] = {"khanza": int(m.group(2)),
                                         "ledger": int(m.group(3)),
                                         "delta": int(m.group(4))}
    return out


def parse_sampled_diff(path):
    out = {}
    txt = read_text(path)
    if txt is None:
        return out
    m = RE_DIFF_COHORT.search(txt)
    if m:
        out["cohort"], out["sample_desired"] = int(m.group(1)), int(m.group(2))
        out["attempted"], out["coverage_pct"] = int(m.group(3)), m.group(4)
    m = RE_DIFF_DRIFT.search(txt)
    if m:
        out["drift_visits"] = int(m.group(1))
        out["drift_rate_pct"] = m.group(3)
    return out


def parse_manifest(path):
    out = {}
    txt = read_text(path)
    if txt is None:
        return out
    for regex, key in ((RE_MAN_DAYS, "days"), (RE_MAN_VISITS, "visits"),
                       (RE_MAN_SHA, "sha256")):
        m = regex.search(txt, re.MULTILINE)
        if m:
            out[key] = m.group(1)
    return out


def parse_verdict_generic(txt):
    """PASS/FAIL from any gate-flavoured log text."""
    if txt is None:
        return None
    m = RE_GATE_PASS.search(txt) or RE_DONE_PASS.search(txt)
    if m:
        return m.group(1).upper()
    if re.search(r"\bFAIL\b", txt):
        return "FAIL"
    if re.search(r"\bPASS\b", txt):
        return "PASS"
    return None


def find_artifacts(run_dir, root, patterns):
    """Yield candidate artifact paths in pattern-priority order (newest
    match first within a pattern); run dir before sibling run dirs."""
    bases = [run_dir] + sorted(
        (os.path.join(root, d) for d in os.listdir(root)
         if os.path.isdir(os.path.join(root, d))
         and os.path.join(root, d) != run_dir),
        key=os.path.getmtime, reverse=True)
    for pat in patterns:
        for base in bases:
            hits = sorted(glob.glob(os.path.join(base, pat)),
                          key=os.path.getmtime)
            for h in reversed(hits):
                yield h


def find_artifact(run_dir, root, patterns):
    """First candidate (legacy single-result helper)."""
    for p in find_artifacts(run_dir, root, patterns):
        return p
    return None


# ------------------------------------------------------------- collectors
def collect_rungs(run_dir):
    rungs = []
    for stage in RUNG_ORDER:
        tel = read_json(os.path.join(run_dir, "telemetry_%s.json" % stage))
        rlog = parse_rung_log(os.path.join(run_dir, "%s.log" % stage))
        man = parse_manifest(
            os.path.join(run_dir, "%s_generate_manifest.md" % stage))
        diff = parse_sampled_diff(
            os.path.join(run_dir, "%s_sampled_form_diff.md" % stage))
        tc = parse_three_count(
            os.path.join(run_dir, "stageA_three_count_%s.log" % stage))
        cd = parse_charge_delta(
            os.path.join(run_dir, "stageA_charge_delta_%s.log" % stage))
        has_any = any([tel, rlog, man, diff, tc.get("verdict"),
                       cd.get("verdict")])
        if not has_any:
            continue
        row = {"stage": stage, "telemetry": tel, "rung_log": rlog,
               "manifest": man, "diff": diff, "three_count": tc,
               "charge_delta": cd}
        cons = (tel or {}).get("consumer") or {}
        row["visits"] = (cons.get("visits")
                         or man.get("visits") or rlog.get("dr_visits"))
        row["billing_rows"] = (cons.get("billing_rows")
                               or rlog.get("billing_rows"))
        row["total_rp"] = cons.get("total_rp") or rlog.get("total_rp")
        row["general_log_bytes"] = general_log_bytes(run_dir, stage)
        row["billing_rows_est"], row["billing_mb_est"] = billing_est(tel)
        verdicts = [v for v in (tc.get("verdict"), cd.get("verdict"))
                    if v]
        if verdicts and all(v == "PASS" for v in verdicts):
            row["verdict"] = "PASS"
        elif verdicts:
            row["verdict"] = "FAIL"
        else:
            row["verdict"] = None  # not yet run / incomplete
        rungs.append(row)
    return rungs


def collect_history(run_dir, root):
    """G1 / replay / jasper evidence possibly living in earlier run dirs.
    Candidates are tried in pattern-priority order until one yields a
    parseable verdict (a status artifact without a verdict falls through
    to the next candidate)."""
    hist = {}
    for p in find_artifacts(run_dir, root,
                            ["g1_validation.md", "g1_oracle.log"]):
        txt = read_text(p)
        m = RE_G1_VERDICT.search(txt or "")
        v = m.group(1) if m else parse_verdict_generic(txt)
        if v:
            hist["g1_path"], hist["g1_verdict"] = p, v
            break
    for p in find_artifacts(run_dir, root, ["stageA_replay_*.log",
                                            "replay_run*_consumer.log"]):
        v = parse_verdict_generic(read_text(p))
        if v:
            hist["replay_path"], hist["replay_verdict"] = p, v
            break
    for p in find_artifacts(run_dir, root, ["jasper_report_status.md",
                                            "jasper_*.log"]):
        txt = read_text(p) or ""
        v = parse_verdict_generic(txt)
        m = re.search(r"Jasper engine:\s*(\S+)", txt)
        if m:
            hist["jasper_engine"] = m.group(1)
        n_fb = len(re.findall(r"\|\s*template-SQL\s*\|", txt))
        if n_fb:
            hist["jasper_fallback_reports"] = n_fb
        if v:
            hist["jasper_path"], hist["jasper_verdict"] = p, v
            break
    return hist


# --------------------------------------------------------------- writers
def gate_row(name, verdict, scope, evidence):
    return "| %s | %s | %s | %s |" % (name, verdict or "n/a", scope, evidence)


def max_report_latencies(tel):
    """Worst-case p50/p95/p99 across the 8 report queries (ms)."""
    reps = (tel or {}).get("reports") or {}
    vals = {"p50": [], "p95": [], "p99": []}
    for q in REPORT_QUERIES:
        d = reps.get(q)
        if not d:
            continue
        if d.get("p50_ms") is not None:
            vals["p50"].append(d["p50_ms"])
        if d.get("p95_ms") is not None:
            vals["p95"].append(d["p95_ms"])
        if d.get("p99_ms") is not None:
            vals["p99"].append(d["p99_ms"])
    return (max(vals["p50"]) if vals["p50"] else None,
            max(vals["p95"]) if vals["p95"] else None,
            max(vals["p99"]) if vals["p99"] else None)


def innodb_hit(tel):
    try:
        return "%.3f%%" % float(tel["mysql"]["_derived"]["buffer_pool_hit_pct"])
    except (KeyError, TypeError, ValueError):
        return None


def slow_queries(tel):
    try:
        return int(tel["mysql"]["Slow_queries"])
    except (KeyError, TypeError, ValueError):
        return None


def general_log_bytes(run_dir, stage):
    """Size of the real-form SQL capture file for a rung (0 = silently
    empty capture)."""
    p = os.path.join(run_dir, "general_log_%s.log" % stage)
    try:
        return os.path.getsize(p)
    except OSError:
        return None


def billing_est(tel):
    """(rows_est, mb) of the billing table from the top-20 stats."""
    for t in (tel or {}).get("tables") or []:
        if t.get("table") == "billing":
            return t.get("rows_est"), t.get("total_mb")
    return None, None


def size_rows(rungs):
    """Per-rung raw + marginal MB per 1,000 visits (datadir cumulative)."""
    out = []
    prev_mb, prev_v, prev_stage = None, None, None
    for r in rungs:
        tel = r["telemetry"] or {}
        try:
            mb = int(((tel.get("datadir") or {}).get("datadir_mb")))
        except (TypeError, ValueError):
            mb = None
        v = r.get("visits")
        try:
            v = int(v)
        except (TypeError, ValueError):
            v = None
        raw = "%.1f" % (mb / (v / 1000.0)) if (mb and v) else None
        marg, marg_vs = None, None
        if prev_mb and prev_v and mb and v and v > prev_v:
            marg = "%.1f" % ((mb - prev_mb) / ((v - prev_v) / 1000.0))
            marg_vs = prev_stage
        out.append({"stage": r["stage"], "datadir_mb": mb, "visits": v,
                    "raw_mb_per_1k": raw, "marginal_mb_per_1k": marg,
                    "marginal_vs": marg_vs})
        if mb and v:
            prev_mb, prev_v, prev_stage = mb, v, r["stage"]
    return out


def render_internal(run_id, run_dir, root, rungs, hist, meta):
    L = []
    a = L.append
    a("# DR→Khanza E2E benchmark report — run `%s`" % run_id)
    a("")
    a("- generated: %s (build_benchmark_report.py)" % now_utc())
    a("- results root: `%s`" % root)
    a("- artifacts in run dir: %d files, %s bytes" %
      (meta["n_files"], fmt_int(meta["n_bytes"])))
    if meta["done_marker"]:
        a("- run completion marker: `%s` present" % meta["done_marker"])
    a("")

    # ---- 1. executive summary
    a("## 1. Executive summary")
    a("")
    a("| gate | scope | verdict | evidence |")
    a("|---|---|---|---|")
    a(gate_row("G1 oracle exactness", "30-50 DR-only visits",
               hist.get("g1_verdict"), hist.get("g1_path", "not found")))
    a(gate_row("G2 replay determinism", "Stage A, 354 DR visits",
               hist.get("replay_verdict"), hist.get("replay_path",
                                                    "not found")))
    a(gate_row("G2 Jasper reports", "headless / template-SQL fallback",
               hist.get("jasper_verdict"), hist.get("jasper_path",
                                                    "not found")))
    tc_v = [r["three_count"].get("verdict") for r in rungs
            if r["three_count"].get("verdict")]
    cd_v = [r["charge_delta"].get("verdict") for r in rungs
            if r["charge_delta"].get("verdict")]
    a(gate_row("G2 three-count (A == B == C)", "per rung",
               ("PASS" if all(v == "PASS" for v in tc_v) else "FAIL")
               if tc_v else None,
               "stageA_three_count_*.log (run dir)"))
    a(gate_row("G2 charge delta == 0", "per rung",
               ("PASS" if all(v == "PASS" for v in cd_v) else "FAIL")
               if cd_v else None,
               "stageA_charge_delta_*.log (run dir)"))
    for r in rungs:
        a(gate_row("Stage B %s" % r["stage"],
                   RUNG_WINDOW.get(r["stage"], ""),
                   r["verdict"],
                   "three-count + charge-delta logs in run dir"))
    verdicts = ([hist.get(k) for k in ("g1_verdict", "replay_verdict")]
                + [r["verdict"] for r in rungs])
    if verdicts and all(v == "PASS" for v in verdicts):
        overall = "ALL GATES PASS"
    elif any(v == "FAIL" for v in verdicts):
        overall = "FAIL — see gate table"
    else:
        overall = "PASS WITH GAPS (missing evidence: %d item(s))" % \
                  sum(1 for v in verdicts if v is None)
    a("")
    a("**Overall: %s**" % overall)
    a("")
    a("Evidence basis (read before trusting any single number below):")
    a("")
    a("- No real-form SQL capture for Stage B: the general_log files are "
      "0 bytes%s — sampled-form verdicts rest on the sampled-diff drift, "
      "not on full SQL capture." %
      (" (%s)" % ", ".join("%s=%d B" % (r["stage"], r["general_log_bytes"])
                           for r in rungs
                           if r["general_log_bytes"] is not None)
       if any(r["general_log_bytes"] is not None for r in rungs) else ""))
    a("- Count B in the three-count gate is derived (B == A, real form not "
      "re-run at Stage A%s) — two independent counts per rung, not three."
      % ("; no real_form_sik_bench_ran marker present"
         if not meta.get("real_form_marker") else
         "; real_form_sik_bench_ran marker PRESENT — B was re-read"))
    a("- Reconcile gates (three-count, charge-delta) cover October-only "
      "(no_rawat LIKE '2026/10/%'); rungs beyond October are covered by "
      "manifest + telemetry + sampled diff only.")
    a("")

    # ---- 2. G1
    a("## 2. Gate G1 — oracle exactness (30-50 DR-only visits)")
    a("")
    if hist.get("g1_path"):
        a("- verdict: **%s** (source: `%s`)" %
          (hist.get("g1_verdict") or "n/a", hist["g1_path"]))
    else:
        a("- no g1_validation.md found in run dir or history")
    a("")

    # ---- 3. G2
    a("## 3. Gate G2 — reconciliation")
    a("")
    a("### 3.1 Three-count reconcile (A == B == C per component)")
    a("")
    a("| rung | DR visits | A rows | A amount | verdict |")
    a("|---|---|---|---|---|")
    for r in rungs:
        tc = r["three_count"]
        if tc:
            a("| %s | %s | %s | %s | %s |" %
              (r["stage"], fmt_int(tc.get("dr_visits", "")),
               fmt_int(tc.get("a_rows", "")),
               fmt_int(tc.get("a_amount", "")), tc.get("verdict", "n/a")))
        else:
            a("| %s | — | — | — | not run |" % r["stage"])
    a("")
    a("NOTE: Count B is derived, not independently measured — B == A "
      "(real form not re-run at Stage A; validated at sik at G1; "
      "real_form_sik_bench_ran marker %s). The A == B == C headline is two "
      "independent counts per rung, not three."
      % ("present" if meta.get("real_form_marker") else "absent"))
    a("SCOPE: three-count covers October-only (no_rawat LIKE '2026/10/%'). "
      "B2+ rungs' November-onward visits are reconciled via generate "
      "manifest + telemetry + sampled diff, not by this gate — do not read "
      "the PASS lines above as full-ladder coverage.")
    a("")
    a("### 3.2 Charge delta per component")
    a("")
    for r in rungs:
        cd = r["charge_delta"]
        a("#### %s" % r["stage"])
        a("")
        if cd.get("components"):
            a("| component | khanza (Rp) | ledger (Rp) | delta (Rp) |")
            a("|---|---|---|---|")
            for comp in ("registration", "procedure", "drug", "tax"):
                d = cd["components"].get(comp)
                if d:
                    a("| %s | %s | %s | %s |" %
                      (comp, fmt_int(d["khanza"]), fmt_int(d["ledger"]),
                       fmt_int(d["delta"])))
            a("")
            a("- khanza total: Rp %s | ledger total: Rp %s | verdict: %s" %
              (fmt_int(cd.get("khanza_total", 0)),
               fmt_int(cd.get("ledger_total", 0)),
               cd.get("verdict", "n/a")))
        else:
            a("- not run")
        a("")
    a("SCOPE: charge-delta covers October-only, same as three-count "
      "(no_rawat LIKE '2026/10/%'). The PASS verdicts above apply to the "
      "October slice of each rung; November-onward visits are reconciled "
      "via manifest + telemetry + sampled diff only.")
    a("")
    last_cd = None
    for r in rungs:
        if r["charge_delta"].get("components"):
            last_cd = r["stage"]
    csv = os.path.join(run_dir, "stageA_charge_delta_per_visit.csv")
    if os.path.exists(csv):
        n = sum(1 for _ in open(csv, "r", encoding="utf-8",
                                errors="replace")) - 1
        a("- per-visit CSV: `%s` (%s visit rows)" % (csv, fmt_int(n)))
        a("- the per-visit CSV is LATEST RUNG ONLY — one shared file, "
          "overwritten each rung (currently reflects the %s run's October "
          "slice); it is not a per-rung archive."
          % (last_cd or "most recent"))
    a("")
    a("### 3.3 Replay determinism")
    a("")
    if hist.get("replay_path"):
        a("- verdict: **%s** (source: `%s`)" %
          (hist.get("replay_verdict") or "n/a", hist["replay_path"]))
    else:
        a("- no replay log found")
    a("")
    a("### 3.4 Jasper reports")
    a("")
    if hist.get("jasper_path"):
        a("- verdict: **%s** (source: `%s`)" %
          (hist.get("jasper_verdict") or "n/a", hist["jasper_path"]))
        if hist.get("jasper_engine"):
            a("- depth: Jasper engine %s on the bench box — %s report(s) "
              "produced via template-SQL fallback. PASS means the "
              "extraction queries succeeded, not that the Jasper engine "
              "rendered the reports."
              % (hist["jasper_engine"],
                 hist.get("jasper_fallback_reports", "?")))
    else:
        a("- no Jasper status artifact found")
    a("")

    # ---- 4. Stage B ladder
    a("## 4. Stage B scale ladder")
    a("")
    a("| rung | window | visits | wall (min) | visits/min | billing rows |"
      " total Rp billed | max report p50/p95/p99 (ms) | InnoDB hit "
      "(lifetime) | slow q (lifetime) | sampled drift | verdict |")
    a("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in rungs:
        tel = r["telemetry"] or {}
        cons = tel.get("consumer") or {}
        p50, p95, p99 = max_report_latencies(tel)
        wall_min = None
        try:
            wall_min = "%.1f" % (float(cons.get("wall_s")) / 60.0)
        except (TypeError, ValueError):
            pass
        a("| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |" % (
            r["stage"], RUNG_WINDOW.get(r["stage"], ""),
            fmt_int(r["visits"]) if r["visits"] else "—",
            wall_min or "—",
            cons.get("visits_per_min", "—"),
            fmt_int(r["billing_rows"]) if r["billing_rows"] else "—",
            r["total_rp"] or "—",
            ("%s/%s/%s" % (p50, p95, p99)) if p50 is not None else "—",
            innodb_hit(tel) or "—", slow_queries(tel),
            (r["diff"].get("drift_rate_pct", "—") + "%"
             if r["diff"].get("drift_rate_pct") else "—"),
            r["verdict"] or "incomplete"))
    a("")
    a("Ladder footnotes:")
    a("")
    a("- InnoDB hit rate and buffer-pool usage are server-lifetime "
      "cumulative globals (not per-rung deltas); so is the slow-query "
      "count. long_query_time = %s s here, so 'slow q = 0' means none over "
      "%s s — it is structurally blind below that threshold while the max "
      "observed report p99 in this run is %.1f s."
      % (meta.get("long_query_time", "10"), meta.get("long_query_time",
                                                     "10"),
         meta.get("max_p99_s", 0.0)))
    a("- 'billing rows' and 'total Rp billed' above come from the consumer "
      "OK lines (authoritative full counts of the rung's pass). The "
      "top-20-table rows/MB figures in the telemetry are stale "
      "information_schema estimates — e.g. billing shows rows_est %s / "
      "%s MB on the last rung while %s billing rows were inserted across "
      "rungs — use the OK-line counts, not the table stats."
      % (fmt_int(meta.get("billing_rows_est", 0)) or "n/a",
         meta.get("billing_mb_est") or "n/a",
         fmt_int(meta.get("inserted_billing_rows", 0))
         or "an unknown number of"))
    a("- 'sampled drift' is a sample estimate (25 per 10k, 45-min cap), "
      "not a full-population check; with the real-form SQL capture empty "
      "(0-byte general_log files), the drift sample is the only real-form "
      "evidence for Stage B.")
    a("")
    a("### Data size per 1,000 visits")
    a("")
    a("| rung | datadir MB (cumulative) | visits | raw MB/1k | "
      "marginal MB/1k |")
    a("|---|---|---|---|---|")
    for s in meta.get("size_rows", []):
        marg = s["marginal_mb_per_1k"]
        if marg:
            marg = "%s (vs %s)" % (marg, s["marginal_vs"])
        a("| %s | %s | %s | %s | %s |" %
          (s["stage"], fmt_int(s["datadir_mb"]) if s["datadir_mb"] else "—",
           fmt_int(s["visits"]) if s["visits"] else "—",
           s["raw_mb_per_1k"] or "—", marg or "—"))
    a("")
    a("Prefer the marginal figure for per-visit sizing claims: datadir is "
      "cumulative across rungs because the per-rung 'fresh restore' is a "
      "logging-only stub, and no pre-run baseline snapshot exists in this "
      "run dir — raw MB/1k therefore embeds an unknown baseline.")
    a("")
    for r in rungs:
        tel = r["telemetry"] or {}
        reps = tel.get("reports") or {}
        if not reps:
            continue
        a("### %s report-query latency detail (p50/p95/p99, ms)" % r["stage"])
        a("")
        a("| report | rows | runs | p50 | p95 | p99 |")
        a("|---|---|---|---|---|---|")
        for q in REPORT_QUERIES:
            d = reps.get(q)
            if d:
                label = q
                if q == "top_diagnoses" and str(d.get("rows")) == "0":
                    label = ("top_diagnoses (0 rows — entity empty in this "
                             "cohort; latency is the empty-set cost, not a "
                             "representative query)")
                a("| %s | %s | %s | %s | %s | %s |" %
                  (label, d.get("rows"), d.get("runs"), d.get("p50_ms"),
                   d.get("p95_ms"), d.get("p99_ms")))
        a("")
        cons = tel.get("consumer") or {}
        buckets = cons.get("throughput_buckets") or []
        if buckets:
            a("- throughput per 5k-visit bucket: %s" % ", ".join(
                "%s: %s/min" % (b.get("bucket_visits"), b.get("visits_per_min"))
                for b in buckets))
            a("")
    # ---- 5 (charge-delta summary already in 3.2; add cross-rung rollup)
    a("## 5. Charge-delta-per-component rollup (all rungs, delta Rp)")
    a("")
    comps = ["registration", "procedure", "drug", "tax"]
    a("| rung | " + " | ".join(comps) + " | overall |")
    a("|---|" + "---|" * (len(comps) + 1))
    for r in rungs:
        cd = r["charge_delta"]
        cells = []
        for c in comps:
            d = (cd.get("components") or {}).get(c)
            cells.append(fmt_int(d["delta"]) if d else "—")
        overall = "0" if (r.get("verdict") == "PASS") else \
            (cd.get("verdict") or "—")
        a("| %s | %s | %s |" % (r["stage"], " | ".join(cells), overall))
    a("")

    # ---- 6 reproduce
    a("## 6. How to reproduce")
    a("")
    a("```bash")
    a("# full benchmark (phases 0-7, resumable, heartbeat + disk guard)")
    a("RUN_ID=%s /opt/dr-benchmark/run_all.sh" % run_id)
    a("")
    a("# this report alone, from an existing run dir")
    a("python3 %s/build_benchmark_report.py --run-id %s" % (TOOL_DIR, run_id))
    a("```")
    a("")
    a("Per-rung toolchain (Stage B): generate_scale_encounters.py → "
      "KhanzaBillingConsumer over the export → collect_scale_telemetry.py → "
      "sampled_real_form_diff.py → three_count_reconcile.py → "
      "charge_delta_per_component.py; Stage A adds "
      "replay_determinism_check.py and run_jasper_reports.py. Deterministic "
      "seed 20261012; per-day RNG keyed md5(seed|date|mode).")
    a("")

    # ---- 7 limitations
    a("## 7. Limitations and caveats")
    a("")
    a("1. **G2 reconcile scope is October-only.** three_count_reconcile.py "
      "and charge_delta_per_component.py hard-scope `no_rawat LIKE "
      "'2026/10/%'`. The B2 (Nov-Dec 2026) and B3 (Nov 2026 - Sep 2027) "
      "generated rows are loaded, billed and ledgered identically but are "
      "**not** covered by the three-count / charge-delta gates; their "
      "coverage is the generate manifest + telemetry + sampled real-form "
      "diff (see DECISIONS.md).")
    a("2. **`sql_sik_bench_restore_clean` is a logging-only stub** in "
      "run_all.sh — the per-rung \"fresh restore\" is not a true DB restore; "
      "correctness relies on idempotent upsert/delete+insert loads instead.")
    a("3. Sampled real-form diff samples 25 visits per 10k (45-min cap); "
      "the drift rate is a sample estimate, not a full-population check.")
    a("4. Throughput per-bucket figures are reconstructed from cumulative "
      "per-visit milliseconds (the consumer log carries no timestamps).")
    a("5. `slow_queries` is a server-lifetime counter, not per-rung.")
    a("6. Replay-determinism and Jasper evidence may come from the Stage A "
      "history run dir rather than this run dir (source path recorded in "
       "sections 3.3/3.4).")
    next_n = 7
    if any(r["stage"] == "B3_lowered_rate" for r in rungs):
        a("7. B3_lowered_rate re-ran the year at weekday 200/day per the "
          "headline-volume rule; both B3 variants are reported above.")
        next_n = 8
    a("%d. Real-form SQL capture was NOT obtained for Stage B: the "
      "general_log files are 0 bytes%s. Sampled-form verdicts rest on the "
      "sampled-diff drift, not on full SQL capture."
      % (next_n,
         " (%s)" % ", ".join(
             "general_log_%s.log=%d B" % (r["stage"],
                                          r["general_log_bytes"])
             for r in rungs
             if r["general_log_bytes"] is not None)
         if any(r["general_log_bytes"] is not None for r in rungs) else ""))
    a("%d. Top-20-table rows/MB figures in the telemetry are stale "
      "information_schema estimates, not measured: billing shows rows_est "
      "%s / %s MB on the last rung while %s billing rows were inserted "
      "across rungs (consumer OK lines). Consumer OK-line counts are the "
      "authoritative row totals."
      % (next_n + 1,
         fmt_int(meta.get("billing_rows_est", 0)) or "n/a",
         meta.get("billing_mb_est") or "n/a",
         fmt_int(meta.get("inserted_billing_rows", 0))
         or "an unknown number of"))
    a("%d. top_diagnoses returns 0 rows in the DR cohort — the entity is "
      "empty here; its latency is the empty-set cost, not a representative "
      "query (labeled in the per-rung tables)." % (next_n + 2))
    a("%d. InnoDB hit rate and buffer-pool usage are server-lifetime "
      "cumulative counters (as is the slow-query count). "
      "long_query_time = %s s makes the slow-query count structurally "
      "blind below %s s; max observed report p99 here is %.1f s, so '0 "
      "slow queries' means none over %s s, not 'no slow queries'."
      % (next_n + 3, meta.get("long_query_time", "10"),
         meta.get("long_query_time", "10"),
         meta.get("max_p99_s", 0.0),
         meta.get("long_query_time", "10")))
    a("%d. Count B in the three-count gate is derived (B == A; real form "
      "not re-run at Stage A; real_form_sik_bench_ran marker %s) — two "
      "independent counts per rung, not three."
      % (next_n + 4,
         "present" if meta.get("real_form_marker") else "absent"))
    a("%d. The per-visit charge-delta CSV is one shared file overwritten "
      "each rung — latest rung only (%s run), not a per-rung archive."
      % (next_n + 5, last_cd or "most recent"))
    a("%d. Scope split, stated next to the ladder numbers: three-count "
      "and charge-delta PASS lines cover October-only; B2+ sampled diffs "
      "span November-onward. Do not read a PASS line as full-ladder "
      "coverage." % (next_n + 6))
    a("")
    a("---")
    a("_Internal report — contains box-local paths; do NOT publish. "
      "Publishable counterpart: BENCHMARK_REPORT_publishable.md._")
    return "\n".join(L) + "\n"


def render_publishable(run_id, rungs, hist, meta):
    """Curated, structured-data-only report. No paths, versions, hosts."""
    L = []
    a = L.append
    a("# DR→Khanza end-to-end billing benchmark — public results summary")
    a("")
    a("- run: %s" % run_id)
    a("- generated: %s" % now_utc())
    a("- workload: deterministic DR-only outpatient visits (class-C arrival "
      "profile, weekday 300/day base rate; Poisson arrivals 08:00-14:00)")
    a("")
    a("## Gates")
    a("")
    a("| gate | verdict |")
    a("|---|---|")
    a("| G1 oracle exactness (30-50 sampled visits) | %s |" %
      (hist.get("g1_verdict") or "n/a"))
    a("| G2 three-count reconcile (A == B == C)* | %s |" %
      ("PASS" if all(r["three_count"].get("verdict") == "PASS"
                     for r in rungs if r["three_count"].get("verdict"))
       and any(r["three_count"].get("verdict") for r in rungs)
       else ("FAIL" if any(r["three_count"].get("verdict") == "FAIL"
                           for r in rungs) else "n/a")))
    a("| G2 charge delta (unexplained delta = 0)* | %s |" %
      ("PASS" if all(r["charge_delta"].get("verdict") == "PASS"
                     for r in rungs if r["charge_delta"].get("verdict"))
       and any(r["charge_delta"].get("verdict") for r in rungs)
       else ("FAIL" if any(r["charge_delta"].get("verdict") == "FAIL"
                           for r in rungs) else "n/a")))
    a("| G2 replay determinism | %s |" % (hist.get("replay_verdict")
                                          or "n/a"))
    a("| G2 Jasper reports | %s |" % (hist.get("jasper_verdict") or "n/a"))
    a("")
    a("\\* Count B is derived (B == A; real form not re-run at Stage A) — "
      "two independent counts per rung, not three. Both reconcile gates "
      "cover the October window only; rungs beyond October are covered by "
      "generation manifests, telemetry and sampled real-form diffs.")
    if hist.get("jasper_engine"):
        a("- Jasper depth: engine %s — reports ran via template-SQL "
          "fallback (%s report(s)); PASS = extraction queries succeeded, "
          "not engine-rendered reports."
          % (hist["jasper_engine"],
             hist.get("jasper_fallback_reports", "?")))
    a("")
    a("## Stage B scale ladder")
    a("")
    a("| rung | window | visits | wall (min) | visits/min | billing rows |"
      " total billed (Rp) | max report p50/p95/p99 (ms) | buffer hit "
      "(lifetime) | sampled drift |")
    a("|---|---|---|---|---|---|---|---|---|---|")
    for r in rungs:
        tel = r["telemetry"] or {}
        cons = tel.get("consumer") or {}
        p50, p95, p99 = max_report_latencies(tel)
        wall_min = None
        try:
            wall_min = "%.1f" % (float(cons.get("wall_s")) / 60.0)
        except (TypeError, ValueError):
            pass
        rp = r["total_rp"]
        a("| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s%% |" % (
            r["stage"], RUNG_WINDOW.get(r["stage"], ""),
            fmt_int(r["visits"]) if r["visits"] else "—",
            wall_min or "—", cons.get("visits_per_min", "—"),
            fmt_int(r["billing_rows"]) if r["billing_rows"] else "—",
            rp or "—",
            ("%s/%s/%s" % (p50, p95, p99)) if p50 is not None else "—",
            innodb_hit(tel) or "—",
            r["diff"].get("drift_rate_pct", "—")))
    a("")
    marg = [s for s in meta.get("size_rows", []) if s["marginal_mb_per_1k"]]
    if marg:
        a("- Data size: %s MB per 1,000 incremental visits (marginal, "
          "%s→%s rungs). Datadir is cumulative across rungs (restore is a "
          "stub; no pre-run baseline), so cumulative MB/1k understates "
          "per-rung cost — the marginal figure is the honest one."
          % (marg[-1]["marginal_mb_per_1k"],
             marg[-1]["marginal_vs"], marg[-1]["stage"]))
    a("- Buffer hit and the slow-query count are server-lifetime "
      "cumulative counters; the slow-query threshold is %s s, so '0 slow "
      "queries' means none over %s s (max observed report p99 here is "
      "%.1f s), not 'no slow queries'."
      % (meta.get("long_query_time", "10"),
         meta.get("long_query_time", "10"),
         meta.get("max_p99_s", 0.0)))
    a("- Billing-row and Rp totals come from the consumer's own summary "
      "lines (full counts). Table-level rows/MB in telemetry are stale "
      "information_schema estimates and are not reported here.")
    a("- One of the eight report queries (top_diagnoses) returns 0 rows "
      "in this cohort — its latency is the empty-set cost, not a "
      "representative query; the max p50/p95/p99 column is driven by the "
      "revenue queries, which do return data.")
    a("")
    last = None
    for r in reversed(rungs):
        if r["charge_delta"].get("components"):
            last = r
            break
    if last:
        a("## Charge delta per component (%s rung, Rp)" % last["stage"])
        a("")
        a("| component | khanza | ledger | delta |")
        a("|---|---|---|---|")
        for comp in ("registration", "procedure", "drug", "tax"):
            d = last["charge_delta"]["components"].get(comp)
            if d:
                a("| %s | %s | %s | %s |" % (comp, fmt_int(d["khanza"]),
                                              fmt_int(d["ledger"]),
                                              fmt_int(d["delta"])))
        a("")
    a("## Notes and limitations")
    a("")
    a("- Reconciliation gates cover the October window only; rungs beyond "
      "October are covered by generation manifests, telemetry and sampled "
      "real-form diffs.")
    a("- The per-rung \"fresh restore\" step is a logging stub; loads are "
      "idempotent upserts rather than true restores.")
    a("- Real-form SQL capture was NOT obtained for Stage B (the general-"
      "log files are 0 bytes) — sampled-form verdicts rest on the sampled "
      "diff drift, not on full SQL capture.")
    a("- Sampled real-form diff: 25 visits per 10k (45-min cap) — a sample "
      "estimate, not a full population check.")
    a("- The per-visit charge-delta CSV is one shared file overwritten "
      "each rung — it reflects the latest rung only, not every rung.")
    a("- Throughput buckets are reconstructed from per-visit latency; "
      "buffer hit and the slow-query counter are server-lifetime values.")
    a("")
    a("---")
    a("_Scrubbed public summary. Internal full report kept separately._")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--results-root", default=DEFAULT_RESULTS_ROOT)
    ap.add_argument("--out-dir", default=None,
                    help="scratch output dir (default: the run dir)")
    args = ap.parse_args()

    root = args.results_root
    run_dir = os.path.join(root, args.run_id)
    if not os.path.isdir(run_dir):
        sys.stderr.write("ERROR: run dir not found: %s\n" % run_dir)
        return 2
    out_dir = args.out_dir or run_dir
    os.makedirs(out_dir, exist_ok=True)

    log("building benchmark report for run %s (root=%s, out=%s)" %
        (args.run_id, root, out_dir))

    rungs = collect_rungs(run_dir)
    if not any(r["telemetry"] for r in rungs):
        sys.stderr.write("ERROR: no telemetry_<stage>.json artifacts found "
                         "in %s — nothing to report\n" % run_dir)
        return 3
    hist = collect_history(run_dir, root)

    n_files, n_bytes = 0, 0
    for dirpath, _dirs, files in os.walk(run_dir):
        for fn in files:
            n_files += 1
            try:
                n_bytes += os.path.getsize(os.path.join(dirpath, fn))
            except OSError:
                pass
    done_marker = None
    for cand in ("DONE", "DONE.md"):
        if os.path.exists(os.path.join(run_dir, cand)):
            done_marker = cand
            break
    meta = {"n_files": n_files, "n_bytes": n_bytes, "done_marker": done_marker,
            "real_form_marker": os.path.exists(
                os.path.join(run_dir, "real_form_sik_bench_ran")),
            "size_rows": size_rows(rungs)}
    # honest-labeling metadata: authoritative vs estimated row counts,
    # counter scopes, worst-case latency for the slow-query-blindness note
    meta["inserted_billing_rows"] = sum(
        int(r["billing_rows"]) for r in rungs
        if r["billing_rows"] is not None)
    for r in reversed(rungs):
        if r["billing_rows_est"] is not None:
            meta["billing_rows_est"] = r["billing_rows_est"]
            meta["billing_mb_est"] = r["billing_mb_est"]
            break
    lq = None
    try:
        f = float([r for r in reversed(rungs) if r["telemetry"]][-1]
                  ["telemetry"]["mysql"]["long_query_time"])
        lq = str(int(f)) if f == int(f) else str(f)
    except (IndexError, KeyError, TypeError, ValueError):
        pass
    meta["long_query_time"] = lq or "10"
    max_p99 = None
    for r in rungs:
        _p50, _p95, p99 = max_report_latencies(r["telemetry"])
        if p99 is not None:
            max_p99 = max(max_p99 or 0.0, float(p99))
    meta["max_p99_s"] = (max_p99 / 1000.0) if max_p99 is not None else 0.0

    internal = render_internal(args.run_id, run_dir, root, rungs, hist, meta)
    pub = render_publishable(args.run_id, rungs, hist, meta)
    pub, scrub_counts = scrub_publishable.scrub_text(pub)
    leftovers = PUB_RE.findall(pub)
    if leftovers:
        sys.stderr.write("ERROR: publishable report still matches scrub "
                         "grep after scrub_text: %r\n" % leftovers[:5])
        return 4
    if scrub_counts and any(scrub_counts.values()):
        log("NOTE: publishable composer self-scrubbed %r (structured leak)"
            % {k: v for k, v in scrub_counts.items() if v})

    ipath = os.path.join(out_dir, "BENCHMARK_REPORT.md")
    ppath = os.path.join(out_dir, "BENCHMARK_REPORT_publishable.md")
    with open(ipath, "w", encoding="utf-8", newline="\n") as f:
        f.write(internal)
    with open(ppath, "w", encoding="utf-8", newline="\n") as f:
        f.write(pub)
    log("wrote %s (%d bytes)" % (ipath, len(internal.encode("utf-8"))))
    log("wrote %s (%d bytes)" % (ppath, len(pub.encode("utf-8"))))
    log("publishable scrub grep: 0 matches")
    verdicts = ([hist.get(k) for k in ("g1_verdict", "replay_verdict")]
                + [r["verdict"] for r in rungs])
    log("rungs reported: %s" % ", ".join(
        "%s=%s" % (r["stage"], r["verdict"] or "incomplete") for r in rungs))
    log("overall: %s" % ("ALL PASS" if verdicts and all(
        v == "PASS" for v in verdicts) else "SEE REPORT"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
