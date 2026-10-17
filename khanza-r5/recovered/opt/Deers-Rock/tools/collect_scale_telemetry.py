#!/usr/bin/env python3
"""collect_scale_telemetry.py — Phase 5 Stage B per-rung telemetry snapshot.

Called by run_all.sh right after the rung's consumer pass. Collects:

  consumer pass   — parsed from results/<RUN_ID>/consumer_<stage>.log:
                    visits, wall time, visits/min overall and per-5k-visit
                    bucket (timeline reconstructed from cumulative per-visit
                    ms — the consumer log has no per-line timestamps), ms/visit
                    p50/p95/p99, WARN/SKIP/ERROR counts
  data dir        — @@datadir size on disk (du) + per-schema table bytes
  top-20 tables   — information_schema by data+index length
  8 report SQL    — representative Khanza/HMS reports (visits by clinic, by
                    day, by doctor, revenue by month, revenue by clinic, drug
                    usage, top diagnoses, top-billed visits), each timed over
                    repeated executions -> p50/p95/p99 latency (min 3 runs,
                    per-query budget 25 s, global budget 300 s)
  MySQL globals  — Slow_queries, Questions, Threads_*, Uptime
  InnoDB counters — buffer pool pages (total/free/dirty) + hit rate, row lock
                    waits/time, log waits, data reads/writes
  OS              — vmstat 1 5 and sar -u/-r 1 3 (CPU + memory)

Artifacts: results/<RUN_ID>/telemetry_<stage>.json + .md. No secrets: only
numbers, table names and status counters.

B3 wall-clock feed: when --stage is B3 (or B3_lowered_rate) the consumer wall
hours are written to /opt/dr-benchmark/state/state.json as b3_wall_hours —
the key run_all.sh's headline-volume rule reads to decide the 300->200/day
lowered-rate re-run.

Usage: python3 collect_scale_telemetry.py --stage B1
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

DB = "sik"
STATE_FILE = "/opt/dr-benchmark/state/state.json"
PER_QUERY_BUDGET_S = 25.0
GLOBAL_BUDGET_S = 300.0
MIN_RUNS = 3
DEFAULT_ITERS = 10
BUCKET = 5000

REPORT_QUERIES = [
    ("visits_by_clinic",
     "SELECT p.nm_poli, COUNT(*) FROM reg_periksa r "
     "JOIN poliklinik p ON p.kd_poli=r.kd_poli "
     "WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY p.nm_poli ORDER BY 2 DESC"),
    ("visits_by_day",
     "SELECT tgl_registrasi, COUNT(*) FROM reg_periksa "
     "WHERE no_rkm_medis LIKE 'DR%' GROUP BY tgl_registrasi "
     "ORDER BY tgl_registrasi"),
    ("visits_by_doctor",
     "SELECT d.nm_dokter, COUNT(*) FROM reg_periksa r "
     "JOIN dokter d ON d.kd_dokter=r.kd_dokter "
     "WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY d.nm_dokter "
     "ORDER BY 2 DESC LIMIT 50"),
    ("revenue_by_month",
     "SELECT DATE_FORMAT(r.tgl_registrasi,'%Y-%m') per, ROUND(SUM(b.totalbiaya),2) "
     "FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat "
     "WHERE r.no_rkm_medis LIKE 'DR%' AND (b.biaya>0 OR b.totalbiaya>0) "
     "AND b.status NOT LIKE 'Ttl%' GROUP BY per ORDER BY per"),
    ("revenue_by_clinic",
     "SELECT p.nm_poli, ROUND(SUM(b.totalbiaya),2) FROM billing b "
     "JOIN reg_periksa r ON r.no_rawat=b.no_rawat "
     "JOIN poliklinik p ON p.kd_poli=r.kd_poli "
     "WHERE r.no_rkm_medis LIKE 'DR%' AND (b.biaya>0 OR b.totalbiaya>0) "
     "AND b.status NOT LIKE 'Ttl%' GROUP BY p.nm_poli ORDER BY 2 DESC"),
    ("drug_usage_top20",
     "SELECT db.nama_brng, COUNT(*), SUM(d.jml), ROUND(SUM(d.total),2) "
     "FROM detail_pemberian_obat d "
     "JOIN reg_periksa r ON r.no_rawat=d.no_rawat "
     "JOIN databarang db ON db.kode_brng=d.kode_brng "
     "WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY db.nama_brng "
     "ORDER BY 4 DESC LIMIT 20"),
    ("top_diagnoses",
     "SELECT pk.nm_penyakit, COUNT(*) FROM reg_periksa r "
     "LEFT JOIN diagnosa_pasien dp ON dp.no_rawat=r.no_rawat "
     "LEFT JOIN penyakit pk ON pk.kd_penyakit=dp.kd_penyakit "
     "WHERE r.no_rkm_medis LIKE 'DR%' AND pk.nm_penyakit IS NOT NULL "
     "GROUP BY pk.nm_penyakit ORDER BY 2 DESC LIMIT 20"),
    ("top_billed_visits",
     "SELECT b.no_rawat, ROUND(SUM(b.totalbiaya),2) FROM billing b "
     "JOIN reg_periksa r ON r.no_rawat=b.no_rawat "
     "WHERE r.no_rkm_medis LIKE 'DR%' AND (b.biaya>0 OR b.totalbiaya>0) "
     "AND b.status NOT LIKE 'Ttl%' GROUP BY b.no_rawat "
     "ORDER BY 2 DESC LIMIT 100"),
]

VISIT_RE = re.compile(r"^\s+(\S+): (\d+)ms \| nota=(\S+) \| Rp ([\d,\.]+)")
START_RE = re.compile(r"=== KhanzaBillingConsumer v2 start (.+) ===")
DONE_RE = re.compile(r"=== KhanzaBillingConsumer v2 done (.+) ===")
OK_RE = re.compile(r"OK: Processed (\d+) visits, (\d+) billing rows, "
                   r"total Rp ([\d,\.]+), avg ([\d\.]+)ms/visit")


def pct(sorted_vals, q):
    if not sorted_vals:
        return None
    idx = min(len(sorted_vals) - 1, int(round(q * (len(sorted_vals) - 1))))
    return sorted_vals[idx]


def parse_consumer_log(path, log):
    out = {"log_path": path, "exists": os.path.exists(path)}
    if not out["exists"]:
        log("consumer log missing: %s" % path)
        return out
    ms, visits, errors, warn_skip = [], [], 0, 0
    start_s = done_s = None
    ok = None
    with open(path, errors="ignore") as f:
        for line in f:
            m = VISIT_RE.match(line)
            if m:
                visits.append(m.group(1))
                ms.append(int(m.group(2)))
                continue
            m = START_RE.search(line)
            if m:
                start_s = m.group(1)
                continue
            m = DONE_RE.search(line)
            if m:
                done_s = m.group(1)
                continue
            m = OK_RE.search(line)
            if m:
                ok = {"visits": int(m.group(1)),
                      "billing_rows": int(m.group(2)),
                      "total_rp": m.group(3),
                      "avg_ms": float(m.group(4))}
                continue
            up = line.upper()
            if "WARN" in up or "SKIP" in up:
                warn_skip += 1
            elif "ERROR" in up or "EXCEPTION" in up or "FAIL" in up:
                errors += 1

    wall_s = None
    try:
        if start_s and done_s:
            fmt = "%a %b %d %H:%M:%S %Z %Y"
            t0 = time.strptime(start_s.strip(), fmt)
            t1 = time.strptime(done_s.strip(), fmt)
            wall_s = time.mktime(t1) - time.mktime(t0)
    except ValueError:
        wall_s = None
    if wall_s is None and ms:
        wall_s = sum(ms) / 1000.0
    if wall_s is None and ok:
        wall_s = None

    n = len(visits)
    out.update({
        "visits": n,
        "distinct_visits": len(set(visits)),
        "billing_rows": ok["billing_rows"] if ok else None,
        "total_rp": ok["total_rp"] if ok else None,
        "wall_s": round(wall_s, 1) if wall_s is not None else None,
        "visits_per_min": round(n / (wall_s / 60.0), 1)
        if wall_s and wall_s > 0 else None,
        "avg_ms_per_visit": ok["avg_ms"] if ok else
        (round(sum(ms) / n, 1) if n else None),
        "ms_p50": pct(sorted(ms), 0.50),
        "ms_p95": pct(sorted(ms), 0.95),
        "ms_p99": pct(sorted(ms), 0.99),
        "warn_skip_lines": warn_skip,
        "error_lines": errors,
    })
    # throughput per 5k bucket, reconstructed from cumulative per-visit ms
    buckets = []
    cum = 0.0
    cums = []
    for v in ms:
        cum += v
        cums.append(cum)
    for b in range(BUCKET, n + 1, BUCKET):
        t_end = cums[b - 1] / 1000.0
        t_start = cums[b - BUCKET - 1] / 1000.0 if b > BUCKET else 0.0
        span = t_end - t_start
        buckets.append({"bucket_visits": "%d-%d" % (b - BUCKET + 1, b),
                        "visits_per_min": round(BUCKET / (span / 60.0), 1)
                        if span > 0 else None})
    if buckets:
        out["throughput_buckets"] = buckets
        out["note_buckets"] = ("reconstructed from cumulative per-visit ms "
                               "(consumer log has no per-line timestamps)")
    log("consumer: %s visits, wall %ss, %s visits/min, p95 %sms, errors %d"
        % (n, out.get("wall_s"), out.get("visits_per_min"),
           out.get("ms_p95"), errors))
    return out


def timed_reports(log):
    results = {}
    budget_left = GLOBAL_BUDGET_S
    for name, sql in REPORT_QUERIES:
        times, rows_n, t_spent = [], 0, 0.0
        it = 0
        while it < DEFAULT_ITERS:
            if it >= MIN_RUNS and (t_spent > PER_QUERY_BUDGET_S
                                   or t_spent > budget_left):
                break
            t0 = time.perf_counter()
            try:
                rows = dbutil.query(DB, sql, timeout=300)
            except RuntimeError as e:
                results[name] = {"error": str(e)[:200]}
                rows = None
                break
            dt = time.perf_counter() - t0
            if rows is not None:
                times.append(dt * 1000.0)
                rows_n = len(rows)
            t_spent += dt
            it += 1
        budget_left -= t_spent
        if times:
            st = sorted(times)
            results[name] = {
                "runs": len(times),
                "rows": rows_n,
                "p50_ms": round(pct(st, 0.50), 1),
                "p95_ms": round(pct(st, 0.95), 1),
                "p99_ms": round(pct(st, 0.99), 1),
                "max_ms": round(st[-1], 1)}
            log("  report %-20s rows=%-6d p50=%-8.0f p95=%-8.0f p99=%-8.0f ms"
                % (name, rows_n, results[name]["p50_ms"],
                   results[name]["p95_ms"], results[name]["p99_ms"]))
        elif name not in results:
            results[name] = {"error": "not run"}
    return results


def mysql_snapshot(log):
    out = {}
    for pat in ("Slow_queries", "Questions", "Uptime", "Threads_%",
                "Innodb_buffer_pool%", "Innodb_row_lock%", "Innodb_log%",
                "Innodb_data_%", "Innodb_os_log_%", "Innodb_page_size"):
        try:
            for var, val in dbutil.query(DB,
                                         "SHOW GLOBAL STATUS LIKE '%s'" % pat):
                out[var] = val
        except RuntimeError:
            pass
    try:
        for var, val in dbutil.query(DB,
                                     "SHOW GLOBAL VARIABLES LIKE "
                                     "'long_query_time'"):
            out[var] = val
    except RuntimeError:
        pass
    bp_tot = float(out.get("Innodb_buffer_pool_pages_total", 0) or 0)
    bp_free = float(out.get("Innodb_buffer_pool_pages_free", 0) or 0)
    br = float(out.get("Innodb_buffer_pool_read_requests", 0) or 0)
    bp_reads = float(out.get("Innodb_buffer_pool_reads", 0) or 0)
    out["_derived"] = {
        "buffer_pool_used_pct": round(100.0 * (bp_tot - bp_free) / bp_tot, 2)
        if bp_tot else None,
        "buffer_pool_hit_pct": round(100.0 * (br - bp_reads) / br, 3)
        if br else None,
        "row_lock_waits": out.get("Innodb_row_lock_waits"),
        "row_lock_time_s": out.get("Innodb_row_lock_time"),
    }
    log("innodb: hit=%s%% row_lock_waits=%s slow_queries=%s"
        % (out["_derived"]["buffer_pool_hit_pct"],
           out["_derived"]["row_lock_waits"], out.get("Slow_queries")))
    return out


def tables_snapshot():
    rows = dbutil.query(
        DB,
        "SELECT table_name, engine, table_rows, "
        "ROUND((data_length+index_length)/1048576,1) "
        "FROM information_schema.tables WHERE table_schema='sik' "
        "ORDER BY (data_length+index_length) DESC LIMIT 20")
    return [{"table": r[0], "engine": r[1], "rows_est": r[2],
             "total_mb": r[3]} for r in rows]


def datadir_size(log):
    try:
        dd = dbutil.scalar(DB, "SELECT @@datadir").rstrip("/")
    except RuntimeError:
        dd = None
    out = {"datadir": dd}
    if dd:
        p = subprocess.run(["du", "-sm", dd], capture_output=True, text=True,
                           timeout=120)
        if p.returncode == 0 and p.stdout.strip():
            out["datadir_mb"] = int(p.stdout.split()[0])
    try:
        out["sik_total_mb"] = dbutil.scalar(
            DB, "SELECT ROUND(SUM(data_length+index_length)/1048576,1) "
            "FROM information_schema.tables WHERE table_schema='sik'")
    except RuntimeError:
        pass
    log("datadir: %s MB; sik tables: %s MB"
        % (out.get("datadir_mb"), out.get("sik_total_mb")))
    return out


def run_cmd(cmd):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        return p.stdout.strip() if p.returncode == 0 else None
    except Exception:
        return None


def os_snapshot():
    out = {}
    vm = run_cmd(["vmstat", "1", "5"])
    if vm:
        lines = [l for l in vm.splitlines() if l.strip()]
        hdr = lines[1].split()
        last = lines[-1].split()
        out["vmstat"] = dict(zip(hdr, last))
    sar_u = run_cmd(["sar", "-u", "1", "3"])
    if sar_u:
        avgs = [l for l in sar_u.splitlines() if "Average" in l]
        if avgs:
            out["sar_cpu"] = avgs[-1].split()
    sar_r = run_cmd(["sar", "-r", "1", "3"])
    if sar_r:
        avgs = [l for l in sar_r.splitlines() if "Average" in l]
        if avgs:
            out["sar_mem"] = avgs[-1].split()
    load = run_cmd(["cat", "/proc/loadavg"])
    if load:
        out["loadavg"] = load.split()[:3]
    return out


def write_md(path, stage, data):
    c = data["consumer"]
    rep = data["reports"]
    der = data["mysql"]["_derived"]
    with open(path, "w") as f:
        f.write("# Stage B telemetry — %s @ %s\n"
                % (stage, datetime.datetime.now(datetime.timezone.utc)
                   .strftime("%Y-%m-%dT%H:%M:%SZ")))
        f.write("- run_id: %s\n" % data["run_id"])
        f.write("\n## Consumer pass\n")
        f.write("| visits | wall_s | visits/min | avg ms | p50 | p95 | p99 |"
                " errors | warn/skip |\n|---|---|---|---|---|---|---|---|---|\n")
        f.write("| %s | %s | %s | %s | %s | %s | %s | %s | %s |\n"
                % (c.get("visits"), c.get("wall_s"), c.get("visits_per_min"),
                   c.get("avg_ms_per_visit"), c.get("ms_p50"), c.get("ms_p95"),
                   c.get("ms_p99"), c.get("error_lines"),
                   c.get("warn_skip_lines")))
        if c.get("throughput_buckets"):
            f.write("\nthroughput per %d-visit bucket (reconstructed): %s\n"
                    % (BUCKET, ", ".join(
                        "%s: %s/min" % (b["bucket_visits"],
                                        b["visits_per_min"])
                        for b in c["throughput_buckets"])))
        f.write("\n## Data size\n- datadir: %s MB | sik tables: %s MB\n"
                % (data["datadir"].get("datadir_mb"),
                   data["datadir"].get("sik_total_mb")))
        f.write("\n## Top-20 tables by size\n| table | engine | rows(est) |"
                " MB |\n|---|---|---|---|\n")
        for t in data["tables"]:
            f.write("| %s | %s | %s | %s |\n"
                    % (t["table"], t["engine"], t["rows_est"], t["total_mb"]))
        f.write("\n## Report query latency (p50/p95/p99, ms)\n")
        f.write("| report | rows | runs | p50 | p95 | p99 | max |\n"
                "|---|---|---|---|---|---|---|\n")
        for name in [n for n, _ in REPORT_QUERIES]:
            r = rep.get(name, {})
            if "p50_ms" in r:
                f.write("| %s | %s | %s | %s | %s | %s | %s |\n"
                        % (name, r["rows"], r["runs"], r["p50_ms"],
                           r["p95_ms"], r["p99_ms"], r["max_ms"]))
            else:
                f.write("| %s | %s |\n" % (name, r.get("error", "n/a")))
        f.write("\n## InnoDB / server\n")
        f.write("- buffer pool hit: %s%% | used: %s%%\n"
                % (der.get("buffer_pool_hit_pct"),
                   der.get("buffer_pool_used_pct")))
        f.write("- row lock waits: %s | row lock time (s): %s\n"
                % (der.get("row_lock_waits"), der.get("row_lock_time_s")))
        f.write("- slow_queries (server lifetime): %s | long_query_time: %s\n"
                % (data["mysql"].get("Slow_queries"),
                   data["mysql"].get("long_query_time")))
        f.write("- questions: %s | threads_connected: %s\n"
                % (data["mysql"].get("Questions"),
                   data["mysql"].get("Threads_connected")))
        f.write("\n## OS (snapshot)\n- vmstat: %s\n- loadavg: %s\n"
                % (data["os"].get("vmstat"), data["os"].get("loadavg")))
        if data["os"].get("sar_cpu"):
            f.write("- sar -u (avg): %s\n" % " ".join(data["os"]["sar_cpu"]))
        if data["os"].get("sar_mem"):
            f.write("- sar -r (avg): %s\n" % " ".join(data["os"]["sar_mem"]))
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True)
    args = ap.parse_args()
    stage = args.stage
    tool = dbutil.Tool("collect_scale_telemetry")
    run_id = tool.run_id
    rdir = os.path.join(dbutil.RESULTS_ROOT, run_id)
    os.makedirs(rdir, exist_ok=True)
    log = tool.log
    t0 = time.time()
    log("=== Stage B telemetry snapshot (stage=%s, run_id=%s) ==="
        % (stage, run_id))

    data = {
        "stage": stage,
        "run_id": run_id,
        "captured_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "consumer": parse_consumer_log(
            os.path.join(rdir, "consumer_%s.log" % stage), log),
        "datadir": datadir_size(log),
        "tables": tables_snapshot(),
        "reports": timed_reports(log),
        "mysql": mysql_snapshot(log),
        "os": os_snapshot(),
    }

    jpath = os.path.join(rdir, "telemetry_%s.json" % stage)
    with open(jpath, "w") as f:
        json.dump(data, f, indent=1, default=str)
    mpath = write_md(os.path.join(rdir, "telemetry_%s.md" % stage), stage, data)
    log("artifacts: %s, %s" % (jpath, mpath))

    # feed run_all.sh's headline-volume rule (B3 > 12h -> lowered rate)
    if stage.startswith("B3"):
        wall = data["consumer"].get("wall_s")
        if wall:
            hours = int(round(float(wall) / 3600.0))
            try:
                st = json.load(open(STATE_FILE)) if os.path.exists(
                    STATE_FILE) else {}
                st["b3_wall_hours"] = str(hours)
                os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
                json.dump(st, open(STATE_FILE, "w"), indent=2)
                log("state b3_wall_hours=%d written" % hours)
            except OSError as e:
                log("WARN: could not update state.json: %s" % e)

    log("=== telemetry %s done in %.0fs ===" % (stage, time.time() - t0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
