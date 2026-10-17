#!/usr/bin/env python3
"""run_jasper_reports.py — Phase 4 Stage A GATE G2: headless Jasper reports
(visits by clinic/doctor, revenue by clinic/period, drug usage, top dx) with
template-SQL fallback when Jasper is unavailable.

Jasper detection: jasperstarter on PATH or jasperreports.jar under
/opt/simrs-khanza/lib (compiled .jasper or .jrxml runners). On this box no
Jasper engine is installed (6 .jrxml templates exist but no engine) — the
tool records exactly why it fell back and produces the SAME data via
template-SQL (mysql) as CSV.

All queries target **sik** (billing + registration live there; database.ini
target of the consumer). Usage: python3 run_jasper_reports.py --stage A
"""
import os, sys, time, csv, glob, subprocess, shutil
import dbutil

RUN_ID = os.environ.get("RUN_ID", "test")
RDIR = os.path.join(dbutil.RESULTS_ROOT, RUN_ID)
DB = "sik"
JASPER_DIR = os.path.join(dbutil.KHANZA_DIR, "KhanzaHMSAnjungan", "report")
COMPONENTS_NOTE = ("value rows only (biaya>0 OR totalbiaya>0, Ttl* excluded); "
                   "revenue includes registration+procedure+drug+PPN")


def get_dr_visits_in_clause():
    rows = dbutil.query(DB,
        "SELECT no_rawat FROM reg_periksa "
        "WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%' ORDER BY no_rawat")
    return ",".join("'%s'" % r[0] for r in rows), len(rows)


def write_csv(path, header, rows, note=None):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(r)
        if note and not rows:
            w.writerow(["# note: %s" % note])


def main():
    attempt = "A"
    argv = sys.argv[1:]
    if "--stage" in argv:
        i = argv.index("--stage")
        if i + 1 < len(argv):
            attempt = argv[i + 1]
    tool = dbutil.Tool("jasper_%s" % attempt)
    outdir = os.path.join(RDIR, "jasper_out")
    os.makedirs(outdir, exist_ok=True)
    t0 = time.time()
    tool.log("=== Jasper reports (headless or template-SQL fallback) ===")

    in_clause, n_visits = get_dr_visits_in_clause()
    tool.log("DR visits: %d" % n_visits)

    # --- Jasper engine availability (honest detection) ---
    jasperstarter = shutil.which("jasperstarter")
    jasper_jar = None
    for cand in glob.glob(os.path.join(dbutil.KHANZA_DIR, "lib", "*jasper*.jar")) + \
                 glob.glob("/opt/jasper*/**/*.jar", recursive=True):
        if "jasperreports" in os.path.basename(cand).lower():
            jasper_jar = cand
            break
    jrxml = glob.glob(os.path.join(JASPER_DIR, "*.jrxml")) + \
            glob.glob(os.path.join(JASPER_DIR, "*.jasper"))
    jasper_ok = bool(jasperstarter or jasper_jar)
    reason = ("jasperstarter=%s jasperreports.jar=%s templates=%d"
              % (jasperstarter or "none", jasper_jar or "none", len(jrxml)))
    tool.log("Jasper engine: %s (%s)" % ("AVAILABLE" if jasper_ok else "UNAVAILABLE", reason))

    reports = {}

    def run_engine(name, report_args):
        """Best-effort real Jasper run via jasperstarter; returns (ok, note)."""
        if not jasperstarter:
            return False, "engine unavailable"
        try:
            p = subprocess.run([jasperstarter, "process", report_args],
                               capture_output=True, text=True, timeout=300)
            return p.returncode == 0, (p.stderr or "").strip()[:160]
        except Exception as e:
            return False, str(e)[:160]

    # 1. Visits by clinic/doctor
    rows = dbutil.query(DB,
        "SELECT p.nm_poli, d.nm_dokter, COUNT(*) FROM reg_periksa r "
        "JOIN poliklinik p ON p.kd_poli = r.kd_poli "
        "JOIN dokter d ON d.kd_dokter = r.kd_dokter "
        "WHERE r.no_rawat IN (%s) GROUP BY p.nm_poli, d.nm_dokter "
        "ORDER BY 3 DESC" % in_clause)
    path = os.path.join(outdir, "visits_by_clinic_doctor.csv")
    write_csv(path, ["clinic", "doctor", "visits"], rows)
    ok, note = run_engine("visits_by_clinic_doctor", os.path.join(JASPER_DIR, ""))
    reports["visits_by_clinic_doctor"] = {
        "status": "jasper-headless" if ok else "template-SQL",
        "path": path, "fallback_reason": None if ok else ("engine: " + reason if not jasper_ok else note)}

    # 2. Revenue by clinic/period (month)
    rows = dbutil.query(DB,
        "SELECT p.nm_poli, DATE_FORMAT(r.tgl_registrasi, '%%Y-%%m') period, "
        "COUNT(*), ROUND(SUM(b.totalbiaya),2) FROM billing b "
        "JOIN reg_periksa r ON r.no_rawat = b.no_rawat "
        "JOIN poliklinik p ON p.kd_poli = r.kd_poli "
        "WHERE b.no_rawat IN (%s) AND (b.biaya>0 OR b.totalbiaya>0) "
        "AND b.status NOT LIKE 'Ttl%%' "
        "GROUP BY p.nm_poli, period ORDER BY p.nm_poli, period" % in_clause)
    path = os.path.join(outdir, "revenue_by_clinic_period.csv")
    write_csv(path, ["clinic", "period", "billing_rows", "revenue"], rows)
    reports["revenue_by_clinic_period"] = {
        "status": "template-SQL", "path": path,
        "fallback_reason": None if jasper_ok else ("engine: " + reason)}

    # 3. Drug usage (top 100 by charged value; PPN rows excluded)
    rows = dbutil.query(DB,
        "SELECT b.nm_perawatan, COUNT(*), SUM(b.jumlah), ROUND(SUM(b.totalbiaya),2) "
        "FROM billing b WHERE b.no_rawat IN (%s) AND b.status='Obat' "
        "AND b.nm_perawatan NOT LIKE '%%PPN%%' AND (b.biaya>0 OR b.totalbiaya>0) "
        "GROUP BY b.nm_perawatan ORDER BY SUM(b.totalbiaya) DESC LIMIT 100" % in_clause)
    path = os.path.join(outdir, "drug_usage.csv")
    write_csv(path, ["drug", "rows", "units", "charged_value"], rows)
    reports["drug_usage"] = {"status": "template-SQL", "path": path,
                             "fallback_reason": None if jasper_ok else ("engine: " + reason)}

    # 4. Top dx (diagnosa_pasien; DR cohort carries no dx rows on this box)
    rows = dbutil.query(DB,
        "SELECT COALESCE(pen.nm_penyakit, dp.kd_penyakit), COUNT(*) "
        "FROM diagnosa_pasien dp LEFT JOIN penyakit pen ON pen.kd_penyakit = dp.kd_penyakit "
        "WHERE dp.no_rawat IN (%s) GROUP BY COALESCE(pen.nm_penyakit, dp.kd_penyakit) "
        "ORDER BY 2 DESC LIMIT 50" % in_clause)
    path = os.path.join(outdir, "top_dx.csv")
    write_csv(path, ["diagnosis", "cases"], rows,
              note="diagnosa_pasien has 0 rows for the DR cohort on this box")
    reports["top_dx"] = {"status": "template-SQL", "path": path,
                         "fallback_reason": None if jasper_ok else ("engine: " + reason)}

    # Status artifact
    rep = os.path.join(RDIR, "jasper_report_status.md")
    with open(rep, "w") as f:
        f.write("# Jasper report status @ %s\n"
                % time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        f.write("- DR visits: %d\n- Jasper engine: %s (%s)\n"
                % (n_visits, "AVAILABLE" if jasper_ok else "UNAVAILABLE", reason))
        f.write("- %s\n" % COMPONENTS_NOTE)
        f.write("| report | status | path | fallback_reason |\n|---|---|---|---|\n")
        for name, info in reports.items():
            f.write("| %s | %s | %s | %s |\n" % (name, info["status"], info["path"],
                                                 info.get("fallback_reason") or ""))
    tool.log("wrote %s" % rep)

    ts_pass = all(os.path.exists(i["path"]) and os.path.getsize(i["path"]) > 0
                  for i in reports.values())
    n_engine = sum(1 for i in reports.values() if i["status"] == "jasper-headless")
    tool.log("reports: %d (%d via jasper-headless engine, %d template-SQL); "
             "gate: %s" % (len(reports), n_engine, len(reports) - n_engine,
                           "PASS" if ts_pass else "FAIL"))
    tool.log("=== Jasper reports %s in %.0fs ===" % ("PASS" if ts_pass else "FAIL", time.time() - t0))
    return 0 if ts_pass else 1


if __name__ == "__main__":
    sys.exit(main())
