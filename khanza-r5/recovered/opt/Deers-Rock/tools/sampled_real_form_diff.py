#!/usr/bin/env python3
"""sampled_real_form_diff.py — Phase 5 Stage B sampled real-form (oracle) diff.

Samples `--rate` per `--per` visits (default 25 per 10,000) from the Stage B
GENERATED visit population (reg_periksa rows whose no_rawat sequence starts
with 8 at position 11 — the generate_scale_encounters marker
YYYY/MM/DD/8NNNNN; real registrations never reach 800000), ordered by
MD5(no_rawat) for determinism, capped at --cap-min minutes wall clock per
stage.

For each sampled visit: snapshot the consumer's billing value rows, reset the
visit to a re-billable state (the G1 oracle_diff reset: every real-form output
table deleted, status_bayar -> 'Belum Bayar'), then run the REAL DlgBilingRalan
via BilingHarness headless under Xvfb + per-date faketime (one JVM per distinct
visit date — the proven G1 pattern), and diff the value-row multisets
bidirectionally per visit.

Drift = any of: JVM rc != 0, sukses != true, consumer multiset != real-form
multiset. A mismatch logs `ORACLE_DRIFT` and exit code 1 (run_all.sh only
WARNs — the final verdict reports the drift rate; the stage does not fail).

State repair: if the real form did NOT complete for a visit (sukses=false /
JVM died), the visit would be left unbilled and three_count would fail the
rung downstream — so the consumer is re-run over a reconstructed single-visit
encounter file (reg_periksa date/jam + detail_pemberian_obat lines) to restore
the billed state. The repair is logged and counted as drift.

general_log: owned by run_all.sh's sampled_real_form_diff helper (ON to
results/<RUN_ID>/general_log_<stage>.log before this tool, OFF after). This
tool never repoints or toggles it — standalone runs simply have it off.

Envelope (G1 precedent): reg-only visits (no drugs, no procedures) and
visits with non-zero embalase/tuslah or >2 procedures are excluded from the
sample and reported as not-covered. Generated visits are 0-embalase and
<=1 procedure by construction.

Usage (run_all.sh):
  python3 sampled_real_form_diff.py --stage B1 --rate 25 --per 10000 --cap-min 45
No secrets in output. RUN_ID env selects the results dir.
"""
import argparse
import csv
import datetime
import math
import os
import re
import subprocess
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

DB = "sik"
KHANZA_DIR = dbutil.KHANZA_DIR
HARNESS_CP = (".:harness:shim:../dist/SIMRSKhanza.jar:"
              "../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:"
              "../lib/mariadb.jar:../resumepasien/lib/*")
VAL_COLS = ["status", "nm_perawatan", "biaya", "jumlah", "totalbiaya"]
RESET_TABLES = {
    "billing": "no_rawat",
    "nota_jalan": "no_rawat",
    "detail_nota_jalan": "no_rawat",
    "piutang_pasien": "no_rawat",
    "detail_piutang_pasien": "no_rawat",
    "tambahan_biaya": "no_rawat",
    "pengurangan_biaya": "no_rawat",
    "tagihan_sadewa": "no_nota",       # the form writes no_rawat INTO no_nota
    "tagihan_mandiri": "no_rawat",
    "tagihan_bpd_jateng": "no_rawat",
    "tagihan_bpd_papua": "no_rawat",
    "tagihan_bpd_jabar": "no_rawat",
}
GEN_LIKE = "____/__/__/8_____"   # 17 chars, position-11 '8' = generated marker


def _f(x):
    try:
        return round(float(x or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def java_round(x):
    return int(math.floor(x + 0.5))


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def cohort(tool, log):
    """Generated (synthetic) DR visits, excluding outside-envelope shapes."""
    rows = dbutil.query(
        DB,
        "SELECT rp.no_rawat, rp.tgl_registrasi, COALESCE(rp.jam_reg,'08:00:00'), "
        "(SELECT COUNT(*) FROM detail_pemberian_obat d WHERE d.no_rawat=rp.no_rawat) n_dpo, "
        "(SELECT COUNT(*) FROM rawat_jl_dr rw WHERE rw.no_rawat=rp.no_rawat) n_proc, "
        "(SELECT COUNT(*) FROM detail_pemberian_obat d WHERE d.no_rawat=rp.no_rawat "
        " AND (d.embalase<>0 OR d.tuslah<>0)) n_etc "
        "FROM reg_periksa rp "
        "WHERE rp.no_rkm_medis LIKE 'DR%%' AND rp.no_rawat LIKE '%s' "
        "ORDER BY rp.no_rawat" % GEN_LIKE)
    total = len(rows)
    kept, excluded = [], {"reg_only": 0, "embalase_tuslah": 0, "gt2_proc": 0}
    for nr, tgl, jam, n_dpo, n_proc, n_etc in rows:
        n_dpo, n_proc, n_etc = int(n_dpo or 0), int(n_proc or 0), int(n_etc or 0)
        if n_dpo == 0 and n_proc == 0:
            excluded["reg_only"] += 1
            continue
        if n_etc > 0:
            excluded["embalase_tuslah"] += 1
            continue
        if n_proc > 2:
            excluded["gt2_proc"] += 1
            continue
        kept.append({"no_rawat": nr, "tgl": tgl, "jam": jam})
    log("cohort: %d generated visits (%d in DB, excluded: %s)"
        % (len(kept), total, excluded))
    return kept


def sample_visits(coh, rate, per, log):
    import math as _m
    n_desired = _m.ceil(len(coh) * float(rate) / float(per)) if coh else 0
    if not coh:
        return [], 0
    # ORDER BY MD5 for determinism — do it in SQL to avoid loading all rows
    rows = dbutil.query(
        DB,
        "SELECT rp.no_rawat, rp.tgl_registrasi, COALESCE(rp.jam_reg,'08:00:00') "
        "FROM reg_periksa rp "
        "WHERE rp.no_rkm_medis LIKE 'DR%%' AND rp.no_rawat LIKE '%s' "
        "AND (EXISTS(SELECT 1 FROM detail_pemberian_obat d WHERE d.no_rawat=rp.no_rawat "
        "     AND d.embalase=0 AND d.tuslah=0) "
        "  OR EXISTS(SELECT 1 FROM rawat_jl_dr rw WHERE rw.no_rawat=rp.no_rawat)) "
        "AND NOT (SELECT COUNT(*) FROM rawat_jl_dr rw2 WHERE rw2.no_rawat=rp.no_rawat) > 2 "
        "ORDER BY MD5(rp.no_rawat) LIMIT %d" % (GEN_LIKE, n_desired))
    sel = [{"no_rawat": r[0], "tgl": r[1], "jam": r[2]} for r in rows]
    log("sample: %d desired (%s per %s of %d), selected %d, "
        "ORDER BY MD5(no_rawat)" % (n_desired, rate, per, len(coh), len(sel)))
    return sel, n_desired


def value_rows(nr_list):
    """Consumer/current billing value rows per visit (multiset per visit)."""
    per = {}
    for n in nr_list:
        rows = dbutil.query(DB,
                            "SELECT status,nm_perawatan,biaya,jumlah,totalbiaya "
                            "FROM billing WHERE no_rawat='%s' ORDER BY noindex" % n)
        vals = []
        for status, nm, biaya, jml, tb in rows:
            b, j, t = _f(biaya), _f(jml), _f(tb)
            if str(status).startswith("Ttl") or not (b > 0 or t > 0):
                continue  # structural row
            vals.append((str(status), str(nm), b, j, t))
        per[n] = vals
    return per


def reset_visits(nr_list):
    inl = ",".join("'%s'" % n for n in nr_list)
    for t, key in RESET_TABLES.items():
        try:
            dbutil.execute(DB, "DELETE FROM %s WHERE %s IN (%s)" % (t, key, inl))
        except RuntimeError:
            pass
    dbutil.execute(DB, "UPDATE reg_periksa SET status_bayar='Belum Bayar' "
                       "WHERE no_rawat IN (%s)" % inl)


def ensure_display(disp="99"):
    sock = "/tmp/.X11-unix/X%d" % int(disp)
    if os.path.exists(sock):
        return disp, None
    p = subprocess.Popen(["Xvfb", ":%s" % disp, "-screen", "0",
                          "1280x1024x24"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        time.sleep(0.25)
        if os.path.exists(sock):
            time.sleep(0.5)
            return disp, p.pid
        if p.poll() is not None:
            break
    return disp, None


def run_harness(nrs, display, dte, log_path, timeout_s):
    script = (
        "cd %s/run-env; export DISPLAY=':%s'; "
        "faketime '%s 08:00:00' java -cp '%s' BilingHarness %s "
        "> %s 2>&1; exit $?"
        % (KHANZA_DIR, display, dte, HARNESS_CP, " ".join(nrs), log_path))
    try:
        p = subprocess.run(["bash", "-c", script], capture_output=True,
                           text=True, timeout=timeout_s)
    except subprocess.TimeoutExpired:
        return -1, "TIMEOUT"
    out = ""
    try:
        with open(log_path, errors="ignore") as f:
            out = f.read()
    except OSError:
        pass
    return p.returncode, out


def rebill_via_consumer(nr, rdir, tool):
    """Restore billed state for a visit the real form failed on: rebuild a
    single-visit encounter file from reg_periksa + detail_pemberian_obat and
    re-run KhanzaBillingConsumer over it (idempotent delete+rebuild)."""
    tgl, jam = None, None
    for r in dbutil.query(DB, "SELECT tgl_registrasi, COALESCE(jam_reg,"
                          "'08:00:00') FROM reg_periksa WHERE no_rawat='%s'" % nr):
        tgl, jam = r[0], r[1]
    if not tgl:
        tool.log("REBILL impossible: %s has no reg_periksa row" % nr)
        return False
    lines = ["ENC %s %s %s" % (nr, tgl, jam)]
    for kode, nama, hbeli, jml in dbutil.query(
            DB,
            "SELECT d.kode_brng, COALESCE(b.nama_brng,d.kode_brng), d.h_beli, d.jml "
            "FROM detail_pemberian_obat d LEFT JOIN databarang b "
            "ON b.kode_brng=d.kode_brng WHERE d.no_rawat='%s' "
            "ORDER BY d.kode_brng" % nr):
        lines.append("OBAT %s %s %s %s %s"
                     % (nr, kode, str(nama).replace(" ", "_"),
                        _fmt_num(float(hbeli or 0)), _fmt_num(float(jml or 0))))
    lines.append("END")
    mini = os.path.join(rdir, "rebill_%s.txt" % nr.replace("/", "_"))
    with open(mini, "w") as f:
        f.write("\n".join(lines) + "\n")
    clog = os.path.join(rdir, "rebill_%s.log" % nr.replace("/", "_"))
    p = subprocess.run(["java", "-cp", dbutil.CONSUMER_CP,
                        "KhanzaBillingConsumer", mini, clog],
                       cwd=KHANZA_DIR, capture_output=True, text=True,
                       timeout=600)
    ok = p.returncode == 0
    tool.log("REBILL %s via consumer: rc=%d %s"
             % (nr, p.returncode, "restored" if ok else "FAILED"))
    return ok


def _fmt_num(v):
    return str(int(v)) if v == int(v) else repr(v)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True)
    ap.add_argument("--rate", type=float, default=25)
    ap.add_argument("--per", type=float, default=10000)
    ap.add_argument("--cap-min", type=float, default=45)
    args = ap.parse_args()
    stage = args.stage

    tool = dbutil.Tool("sampled_real_form_diff")
    rdir = os.path.join(dbutil.RESULTS_ROOT, tool.run_id)
    rundir = os.path.join(rdir, "%s_oracle_run" % stage)
    os.makedirs(rundir, exist_ok=True)
    log = tool.log
    t0 = time.time()
    deadline = t0 + args.cap_min * 60.0
    log("=== Stage B sampled real-form diff (stage=%s, %s per %s, cap %s min, "
        "run_id=%s) ===" % (stage, args.rate, args.per, args.cap_min,
                            tool.run_id))

    coh = cohort(tool, log)
    if not coh:
        log("no generated visits found — nothing to sample (fresh restore? "
            "run generate_scale_encounters first)")
        return 2
    sel, n_desired = sample_visits(coh, args.rate, args.per, log)
    if not sel:
        log("empty sample")
        return 0
    nrs = [v["no_rawat"] for v in sel]

    # 1. snapshot the consumer's value rows (before any reset)
    cons_rows = value_rows(nrs)
    unbilled = [n for n in nrs if not cons_rows[n]]
    if unbilled:
        log("WARN: %d sampled visits have no consumer billing rows "
            "(consumer pass incomplete?): %s%s"
            % (len(unbilled), ", ".join(unbilled[:5]),
               " ..." if len(unbilled) > 5 else ""))

    # 2. reset all sampled visits to re-billable
    reset_visits(nrs)
    log("reset %d visits (output tables cleared, status_bayar=Belum Bayar)"
        % len(nrs))

    # 3. run the real form per date batch under Xvfb + faketime
    by_date = {}
    for v in sel:
        by_date.setdefault(v["tgl"], []).append(v["no_rawat"])
    log("running real form: %d visits over %d distinct dates"
        % (len(nrs), len(by_date)))
    display, xvfb_pid = ensure_display("99")
    sukses, attempted, batches = {}, [], []
    try:
        for dte in sorted(by_date):
            if time.time() + 150 > deadline:
                log("CAP: deadline within ~2.5 min before date %s — stopping "
                    "(%d/%d visits attempted)" % (dte, len(attempted), len(nrs)))
                break
            batch = by_date[dte]
            log_path = os.path.join(rundir, "harness_%s.log"
                                    % dte.replace("-", "_"))
            remaining = max(60.0, deadline - time.time())
            rc, out = run_harness(batch, display, dte, log_path,
                                  min(1800.0, remaining + 60.0))
            for m in re.finditer(r"=== VISIT (\S+) DONE sukses=(true|false)",
                                 out or ""):
                sukses[m.group(1)] = (m.group(2) == "true")
            attempted.extend(batch)
            batches.append({"date": dte, "rc": rc, "visits": len(batch),
                            "sukses_true": sum(1 for v in batch
                                               if sukses.get(v)),
                            "log": log_path})
            log("  date %s: rc=%d visits=%d sukses_true=%d"
                % (dte, rc, len(batch), batches[-1]["sukses_true"]))
    finally:
        if xvfb_pid:
            try:
                os.kill(xvfb_pid, 15)
            except OSError:
                pass

    # 4. snapshot real-form rows and diff
    real_rows = value_rows(attempted)
    results, drift, repaired = [], [], []
    for n in attempted:
        c, r = cons_rows.get(n, []), real_rows.get(n, [])
        ok_flag = sukses.get(n)
        mc, mr = Counter(c), Counter(r)
        missing_in_consumer = list((mc - mr).elements())   # consumer-only
        missing_in_real = list((mr - mc).elements())       # real-only
        mismatch = bool(missing_in_consumer or missing_in_real) or not ok_flag
        # PPN diagnostic (informational; a wrong PPN also breaks the multiset)
        sub = _f(dbutil.scalar(DB, "SELECT COALESCE(SUM(total+embalase+"
                               "tuslah),0) FROM detail_pemberian_obat "
                               "WHERE no_rawat='%s'" % n))
        ppn_exp = java_round(sub * 0.11) if sub > 0 else 0
        results.append({
            "no_rawat": n, "sukses": ok_flag,
            "consumer_value_rows": len(c), "real_value_rows": len(r),
            "consumer_only_rows": len(missing_in_consumer),
            "real_only_rows": len(missing_in_real),
            "ppn_expected": ppn_exp, "drug_subtotal": sub,
            "mismatch": mismatch})
        if mismatch:
            drift.append(n)
            for row in missing_in_consumer[:3]:
                log("  %s consumer-only row: %s" % (n, row))
            for row in missing_in_real[:3]:
                log("  %s real-only row: %s" % (n, row))
        if not ok_flag:
            if rebill_via_consumer(n, rundir, tool):
                repaired.append(n)
            else:
                log("  CRITICAL: %s left unbilled after rebill attempt" % n)

    truncated = len(attempted) < len(nrs)
    drift_rate = (float(len(drift)) / len(attempted)) if attempted else 0.0
    coverage = (float(len(attempted)) / len(nrs)) if nrs else 0.0

    # 5. artifacts
    csvp = os.path.join(rdir, "%s_sampled_form_diff.csv" % stage)
    with open(csvp, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["no_rawat", "sukses", "consumer_value_rows",
                    "real_value_rows", "consumer_only_rows", "real_only_rows",
                    "ppn_expected", "drug_subtotal", "mismatch"])
        for r in results:
            w.writerow([r["no_rawat"], r["sukses"], r["consumer_value_rows"],
                        r["real_value_rows"], r["consumer_only_rows"],
                        r["real_only_rows"], r["ppn_expected"],
                        r["drug_subtotal"], r["mismatch"]])
    mdp = os.path.join(rdir, "%s_sampled_form_diff.md" % stage)
    with open(mdp, "w") as f:
        f.write("# Stage B sampled real-form diff — %s @ %s\n"
                % (stage, datetime.datetime.now(datetime.timezone.utc)
                   .strftime("%Y-%m-%dT%H:%M:%SZ")))
        f.write("- cohort: %d generated visits | sample desired: %d | "
                "attempted: %d | coverage: %.1f%%\n"
                % (len(coh), n_desired, len(attempted), 100.0 * coverage))
        f.write("- drift: %d visits | drift rate: %.4f (%.2f%%)\n"
                % (len(drift), drift_rate, 100.0 * drift_rate))
        f.write("- cap: %s min (%s) | state-repaired via consumer: %d\n"
                % (args.cap_min,
                   "TRUNCATED" if truncated else "completed",
                   len(repaired)))
        if drift:
            f.write("- ORACLE_DRIFT visits: %s\n" % ", ".join(drift))
        f.write("\n| visit | sukses | cons rows | real rows | cons-only | "
                "real-only | ppn exp | mismatch |\n"
                "|---|---|---|---|---|---|---|---|\n")
        for r in results:
            f.write("| %s | %s | %s | %s | %s | %s | %s | %s |\n"
                    % (r["no_rawat"], r["sukses"], r["consumer_value_rows"],
                       r["real_value_rows"], r["consumer_only_rows"],
                       r["real_only_rows"], r["ppn_expected"],
                       "YES" if r["mismatch"] else ""))
    log("artifacts: %s, %s" % (csvp, mdp))

    if drift:
        log("ORACLE_DRIFT: %d/%d sampled visits differ (rate %.4f) — final "
            "verdict must report drift rate (brief §5)" % (len(drift),
                                                           len(attempted),
                                                           drift_rate))
    if truncated:
        log("CAP_EXCEEDED: only %d/%d sampled visits verified within %.0f min"
            % (len(attempted), len(nrs), args.cap_min))
    log("=== sampled real-form diff %s done in %.0fs (drift rate %.4f) ==="
        % (stage, time.time() - t0, drift_rate))
    return 1 if (drift or truncated) else 0


if __name__ == "__main__":
    sys.exit(main())
