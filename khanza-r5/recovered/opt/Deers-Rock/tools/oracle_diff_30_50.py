#!/usr/bin/env python3
"""oracle_diff_30_50.py — Phase 3 GATE G1 stratified oracle-validation (DR consumer vs real DlgBilingRalan). v2.

Selects a stratified sample of 30-50 DR-only 2026/10 visits (ORDER BY MD5(no_rawat),
deterministic), snapshots the consumer's billing/nota_jalan rows (value rows =
non-zero biaya/totalbiaya; structural rows captured but flagged separately), resets
the sample to a re-billable state, runs the REAL form headlessly (BilingHarness
under Xvfb + per-date faketime, general_log ON to a fresh truncated per-date file),
then diffs value rows BIDIRECTIONALLY per visit.

GATE G1 PASSES (exit 0) iff ALL of:
  1. every per-date JVM exited 0
  2. every in-envelope selected visit has sukses=true from the real form
  3. per-visit consumer value-row multiset == real-form value-row multiset
     (billing; nota_jalan carries no value columns — recorded structurally)
  4. PPN Obat: consumer stored PPN == real-form stored PPN == Java
     Math.round(subttl*0.11) (floor(x+0.5), half-up) for every sample visit;
     half-rupiah cases (|frac-0.5| < 1e-6) verified exactly
  5. no source drift (source-table checksum before == after,
     reg_periksa.status_bayar excluded — the form flips it on save)
  6. single clean general_log: general_log ON for every JVM, OFF otherwise,
     and the captured `insert into billing` count == real-form billing rows
     now present for the sample (not a multiple: fresh truncated files per
     attempt, so re-runs cannot accumulate)

v2 fixes over v1 (2026-10-11, after g1test forensics):
  - reset now deletes EVERY real-form output side table for the sample
    (billing, nota_jalan, detail_nota_jalan, piutang_pasien,
    detail_piutang_pasien, tambahan_biaya, pengurangan_biaya, tagihan_sadewa
    [keyed no_nota, which the form fills with the no_rawat — src line 6159],
    tagihan_mandiri, tagihan_bpd_*): v1's leftovers aborted BtnSimpan with
    duplicate-PKs layer by layer (first detail_nota_jalan, then tagihan_sadewa)
    and the transactional save rolled back, so visits failed with sukses=false.
  - match rate is bidirectional per visit (v1 divided matched by real-row count
    only, so consumer-only rows never failed the gate: 106 unmatched rows
    "passed").
  - every visit must save (v1 required only sukses_true > 0).
  - PPN expected uses Java Math.round semantics (v1 used Python round() =
    banker's rounding — wrong at exactly .5).
  - general_log files live in a fresh per-attempt dir and are TRUNCATED, and
    single-clean is a hard gate condition (v1 appended across attempts and
    downgraded the check to a diagnostic).
  - TtlObat (and all Ttl* total rows) are structural zero-value rows, never
    value rows (brief: do not require exactness on them).

Usage:  RUN_ID=<id> python3 oracle_diff_30_50.py --attempt N
Reuses dbutil.py (benchmark user; password read at runtime, never printed).
No secrets, no public IPs in any output. Idempotent-safe: re-running re-selects
+ re-snapshots; the only DB mutations are the real-form saves (and the sample
reset that makes them possible) on the sik side.
"""
import os, re, sys, time, csv, math, subprocess, hashlib
from collections import defaultdict, Counter
import dbutil

TOOL_NAME = "g1_oracle"
RESULTS = os.environ.get("RESULTS", "/opt/dr-benchmark/results")
RUN_ID = os.environ.get("RUN_ID", "g1")
RDIR = os.path.join(RESULTS, RUN_ID)
KHANZA_DIR = dbutil.KHANZA_DIR
DB = "sik"   # database.xml target: DR data + benchmark billing live in sik
           # (sik_bench is the zero-seed master/reference copy; see DECISIONS.md
           # 2026-10-11T05:04:30Z — the brief's "sik_bench" naming maps to the
           # sik copy on this box)

VAL_COLS = ["status", "nm_perawatan", "biaya", "jumlah", "totalbiaya"]
# source tables hashed for drift; reg_periksa.status_bayar excluded (form flips it)
SRC_TABLES = ["resep_obat", "resep_dokter", "detail_pemberian_obat", "rawat_jl_dr",
              "reg_periksa", "databarang", "jns_perawatan", "poliklinik"]
# real-form OUTPUT tables cleared by the reset so BtnSimpan can re-bill cleanly.
# key column differs: tagihan_sadewa is keyed by no_nota but the form writes the
# no_rawat INTO no_nota (DlgBilingRalan src line 6159; its own cleanup at line
# 2850 deletes it by no_nota likewise). Mirrors the form's own paid-visit
# cleanup (src 2839-2850), which does NOT run when status_bayar is already
# 'Belum Bayar'. Gateway tables (tagihan_*) are written conditionally on the
# payment account; they are deleted defensively where the key allows.
RESET_TABLES = {
    "billing": "no_rawat",
    "nota_jalan": "no_rawat",
    "detail_nota_jalan": "no_rawat",
    "piutang_pasien": "no_rawat",
    "detail_piutang_pasien": "no_rawat",
    "tambahan_biaya": "no_rawat",
    "pengurangan_biaya": "no_rawat",
    "tagihan_sadewa": "no_nota",       # no_nota holds the no_rawat (form quirk)
    "tagihan_mandiri": "no_rawat",
    "tagihan_bpd_jateng": "no_rawat",
    "tagihan_bpd_papua": "no_rawat",
    "tagihan_bpd_jabar": "no_rawat",
}
ENVELOPE = ("INTENDED validated envelope (until this run confirms it): outpatient "
            "(ralan) visits only; <=2 procedures per visit; zero embalase/tuslah; "
            "registration fee from the poliklinik master as loaded in reg_periksa.biaya_reg; "
            "collapsed (stand-in) doctor set (DOC-1); drug PPN 11% whole-rupiah half-up; "
            "real-form save path via keuangan.DlgBilingRalan BtnSimpan under Xvbf+faketime")


def _q(sql):
    return dbutil.query(DB, sql)


def _scalar(sql):
    return dbutil.scalar(DB, sql)


def _cols(table):
    return [r[0] for r in _q("SHOW COLUMNS FROM %s" % table)]


def _f(x):
    try:
        return round(float(x or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _root_mysql(sql, timeout=60):
    """Root-socket SQL (general_log control needs SUPER; benchmark lacks it)."""
    p = subprocess.run(["mysql", "-uroot", "-N", "-B", "-e", sql],
                       capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout.strip(), p.stderr.strip()


# ---------------------------------------------------------------- selection

HALF_RUPIAH_SUBQ = (
    "(SELECT d.no_rawat FROM detail_pemberian_obat d GROUP BY d.no_rawat "
    "HAVING ABS(((SUM(d.total+d.embalase+d.tuslah)*0.11) MOD 1) - 0.5) < 0.000001)"
)


def _visit_rows(where_extra=""):
    q = (
        "SELECT rp.no_rawat, rp.tgl_registrasi AS tgl, COALESCE(rp.jam_reg,'08:00:00') AS jam, "
        "rp.no_rkm_medis, COALESCE(p.nm_pasien,'?') AS nama, rp.kd_poli, "
        "rp.kd_dokter, "
        "(SELECT COUNT(*) FROM resep_obat ro WHERE ro.no_rawat=rp.no_rawat) AS n_obat, "
        "(SELECT COUNT(*) FROM rawat_jl_dr rw WHERE rw.no_rawat=rp.no_rawat) AS n_proc, "
        "(SELECT COUNT(DISTINCT rd.kode_brng) FROM resep_obat ro "
        " JOIN resep_dokter rd ON rd.no_resep=ro.no_resep WHERE ro.no_rawat=rp.no_rawat) AS n_drugs, "
        "(SELECT COUNT(*) FROM detail_pemberian_obat d WHERE d.no_rawat=rp.no_rawat "
        " AND (d.embalase<>0 OR d.tuslah<>0)) AS n_etc, "
        "COALESCE(rp.biaya_reg,0) AS biaya_reg, "
        "COALESCE((SELECT po.registrasi FROM poliklinik po WHERE po.kd_poli=rp.kd_poli),0) AS poli_reg, "
        "DAYOFWEEK(rp.tgl_registrasi) AS weekday "
        "FROM reg_periksa rp LEFT JOIN pasien p ON p.no_rkm_medis=rp.no_rkm_medis "
        "WHERE rp.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%' " + where_extra +
        " ORDER BY MD5(rp.no_rawat) LIMIT 200"
    )
    cols = ["no_rawat", "tgl", "jam", "no_rkm_medis", "nama", "kd_poli", "kd_dokter",
            "n_obat", "n_proc", "n_drugs", "n_etc", "biaya_reg", "poli_reg", "weekday"]
    out = []
    for r in _q(q):
        v = dict(zip(cols, r))
        for k in ("n_obat", "n_proc", "n_drugs", "n_etc", "weekday"):
            v[k] = int(v[k] or 0)
        v["biaya_reg"] = float(v["biaya_reg"] or 0)
        v["poli_reg"] = float(v["poli_reg"] or 0)
        v["half_rupiah"] = False
        if v["n_obat"] == 0 and v["n_proc"] == 0:
            v["stratum"] = "reg_only"
        elif v["n_drugs"] >= 2 and v["n_proc"] >= 1:
            v["stratum"] = "multi_drug_proc"
        elif v["n_drugs"] == 1 and v["n_proc"] == 0:
            v["stratum"] = "single_drug"
        else:
            v["stratum"] = "mixed"
        out.append(v)
    return out


def select_visits(min_n=30, max_n=50):
    """Stratified deterministic sample of DR-only 2026/10 visits + strata tags.

    Half-rupiah PPN visits (|subttl*0.11 mod 1 - 0.5| < 1e-6) are force-included
    (brief item 5) by swapping out the last fill-pass visits — deterministic.
    """
    cand = _visit_rows()
    # half-rupiah membership for every candidate (brief item 5)
    half_set = {r[0] for r in _q(
        "SELECT no_rawat FROM detail_pemberian_obat GROUP BY no_rawat "
        "HAVING ABS(((SUM(total+embalase+tuslah)*0.11) MOD 1) - 0.5) < 0.000001")}
    for v in cand:
        if v["no_rawat"] in half_set:
            v["half_rupiah"] = True
    # half-rupiah visits outside the 200-candidate pool still must be covered
    protected = _visit_rows("AND rp.no_rawat IN " + HALF_RUPIAH_SUBQ + " ")
    for v in protected:
        v["half_rupiah"] = True

    pools = defaultdict(list)
    for v in cand:
        pools[v["stratum"]].append(v)
    sel, seen = [], set()
    # quota pass: first 6 (MD5 order) of every stratum that has members
    for s in ("reg_only", "single_drug", "multi_drug_proc", "mixed"):
        for v in pools[s][:6]:
            if v["no_rawat"] not in seen and len(sel) < max_n:
                sel.append(v); seen.add(v["no_rawat"])
    # protected pass: every half-rupiah PPN visit (never swapped out later)
    for v in protected:
        if v["no_rawat"] not in seen and len(sel) < max_n:
            sel.append(v); seen.add(v["no_rawat"])
    # fill pass: MD5-deterministic remainder
    for v in cand:
        if len(sel) >= max_n:
            break
        if v["no_rawat"] not in seen:
            sel.append(v); seen.add(v["no_rawat"])

    tags = defaultdict(list)
    for v in sel:
        tags[v["stratum"]].append(v["no_rawat"])
        if v["biaya_reg"] > 0:
            tags["nz_reg"].append(v["no_rawat"])
        if v["half_rupiah"]:
            tags["half_rupiah"].append(v["no_rawat"])
    cov = {
        "total_selected": len(sel),
        "reg_only": len(tags["reg_only"]),
        "single_drug": len(tags["single_drug"]),
        "multi_drug_proc": len(tags["multi_drug_proc"]),
        "mixed": len(tags["mixed"]),
        "nz_reg": len(tags["nz_reg"]),
        "half_rupiah": len(tags["half_rupiah"]),
        "distinct_poliklinik": len({v["kd_poli"] for v in sel}),
        "distinct_poliklinik_nz_reg": len({v["kd_poli"] for v in sel if v["biaya_reg"] > 0}),
        "distinct_doctors": len({v["kd_dokter"] for v in sel}),
        "distinct_weekdays": len({v["weekday"] for v in sel}),
    }
    shortfalls = []
    if len(sel) < min_n:
        shortfalls.append("selected %d < %d target" % (len(sel), min_n))
    if cov["distinct_poliklinik"] < 4:
        shortfalls.append("distinct poliklinik %d < 4" % cov["distinct_poliklinik"])
    for s in ("reg_only", "single_drug"):
        if cov[s] == 0:
            n_in_db = _scalar(
                "SELECT COUNT(*) FROM (SELECT rp.no_rawat, "
                "(SELECT COUNT(*) FROM resep_obat ro WHERE ro.no_rawat=rp.no_rawat) n_obat, "
                "(SELECT COUNT(*) FROM rawat_jl_dr j WHERE j.no_rawat=rp.no_rawat) n_proc, "
                "(SELECT COUNT(DISTINCT rd.kode_brng) FROM resep_obat ro JOIN resep_dokter rd "
                "ON rd.no_resep=ro.no_resep WHERE ro.no_rawat=rp.no_rawat) n_drugs "
                "FROM reg_periksa rp WHERE rp.no_rawat LIKE '2026/10/%%' "
                "AND rp.no_rkm_medis LIKE 'DR%%') x WHERE " +
                ("n_obat=0 AND n_proc=0" if s == "reg_only" else
                 "n_drugs=1 AND n_proc=0"))
            shortfalls.append("no %s stratum in sample (%s in dataset: %s)"
                              % (s, "visits", n_in_db))
    return sel, cov, shortfalls, tags


# ------------------------------------------------------------- source hash

def source_hash():
    """Stable content hash of source tables, EXCLUDING reg_periksa.status_bayar."""
    h = hashlib.sha256()
    for t in SRC_TABLES:
        try:
            cols = _cols(t)
            sel = [c for c in cols if not (t == "reg_periksa" and c == "status_bayar")]
            selstr = ",".join("`%s`" % c for c in sel)
            rows = _q(
                "SET SESSION group_concat_max_len=4294967295;"
                "SELECT COUNT(*), MD5(GROUP_CONCAT(CRC32(CONCAT_WS('#','%s',%s)) "
                "ORDER BY %s SEPARATOR '|')) FROM %s;" % (t, selstr, selstr, t))
            cnt, chk = rows[0][0], rows[0][1]
            h.update(("%s:%s:%s:" % (t, cnt, chk)).encode())
        except Exception:
            h.update(("%s:ERR:" % t).encode())
    return h.hexdigest()[:24]


# ------------------------------------------------------------ output dumps

def dump_billing_rows(nr_list):
    """(value_rows, structural_rows) for billing.

    value row  = (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%'
                 (TtlObat and friends are structural totals rows by definition —
                  brief item 10: do not require exactness on TtlObat)
    structural = everything else (headers, pemisah, zero-fee, Ttl* rows)
    """
    value, structural = [], []
    for n in nr_list:
        rows = _q("SELECT status,nm_perawatan,biaya,jumlah,totalbiaya FROM billing "
                  "WHERE no_rawat='%s' ORDER BY noindex" % n)
        for status, nm, biaya, jml, tb in rows:
            b, j, t = _f(biaya), _f(jml), _f(tb)
            key = ("billing", n, str(status), str(nm), b, j, t)
            if str(status).startswith("Ttl") or not (b > 0 or t > 0):
                structural.append(key)
            else:
                value.append(key)
    return value, structural


def dump_nota_rows(nr_list):
    """nota_jalan rows per visit (structural — the table has no value columns)."""
    out = []
    for n in nr_list:
        for r in _q("SELECT no_rawat,no_nota,tanggal,jam FROM nota_jalan "
                    "WHERE no_rawat='%s' ORDER BY no_nota" % n):
            out.append(tuple(str(c) if c is not None else "" for c in r))
    return out


def write_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(list(r))
    return path


# ------------------------------------------------------------ sample reset

def reset_to_unpaid(nr_list):
    """Restore the sample to a re-billable state for the REAL form.

    DlgBilingRalan's save is transactional (billing writes roll back on error)
    but several side tables are written through a separate autocommit tracking
    connection (nota_jalan via Sequel.SimpanTrack) or before the failure point
    (tagihan_sadewa keyed by no_nota=no_rawat), so leftovers from ANY earlier
    partial/committed save block re-billing with duplicate-PK errors — the
    onion v1 hit layer by layer: detail_nota_jalan, then tagihan_sadewa. The
    form's own cleanup (src 2839-2850) only runs when status_bayar='Sudah
    Bayar' at load; we reset to 'Belum Bayar' per the brief, so we delete every
    output table that cleanup would have removed. Source tables are NOT touched.
    """
    in_clause = ",".join("'%s'" % n for n in nr_list)
    stats = {}
    for t, key in RESET_TABLES.items():
        try:
            stats["deleted_" + t] = _scalar(
                "SELECT COUNT(*) FROM %s WHERE %s IN (%s)" % (t, key, in_clause))
            dbutil.execute(DB, "DELETE FROM %s WHERE %s IN (%s)" % (t, key, in_clause))
        except Exception as e:
            stats["deleted_" + t] = "n/a(%s)" % str(e)[:40]
    stats["restored_status_bayar"] = _scalar(
        "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat IN (%s) AND status_bayar='Sudah Bayar'" % in_clause)
    dbutil.execute(DB, "UPDATE reg_periksa SET status_bayar='Belum Bayar' "
                       "WHERE no_rawat IN (%s)" % in_clause)
    return stats


# ------------------------------------------------------------- real form

def _ensure_display(disp="99"):
    """Return (display, started_pid|None). Reuses an existing Xvfb when alive."""
    sock = "/tmp/.X11-unix/X%d" % int(disp)
    if os.path.exists(sock):
        return disp, None
    p = subprocess.Popen(["Xvfb", ":%s" % disp, "-screen", "0", "1280x1024x24"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        time.sleep(0.25)
        if os.path.exists(sock):
            time.sleep(0.5)
            return disp, p.pid
        if p.poll() is not None:
            break
    return disp, None


HARNESS_CP = (".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/"
              "KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*")


def _run_harness(nr_list, display, logdir, tag, dte):
    log_path = os.path.join(logdir, "harness_%s.log" % tag)
    script = (
        "cd /opt/simrs-khanza/run-env; "
        "export DISPLAY=':%s'; "
        "faketime '%s 08:00:00' "
        "java -cp '%s' BilingHarness %s "
        "> %s 2>&1; exit $?" % (display, dte, HARNESS_CP, " ".join(nr_list), log_path)
    )
    try:
        p = subprocess.run(["bash", "-c", script], capture_output=True, text=True, timeout=1800)
        out = ""
        try:
            with open(log_path, errors="ignore") as f:
                out = f.read()
        except OSError:
            pass
        return p.returncode, out
    except subprocess.TimeoutExpired:
        return -1, "TIMEOUT"


def gl_off():
    _root_mysql("SET GLOBAL general_log=OFF;")


def gl_point_on(path):
    """Point general_log at a FRESH TRUNCATED file, ON, verified."""
    d = os.path.dirname(path)
    subprocess.run(["bash", "-c",
                    "mkdir -p '%s' && : > '%s' && chown -R mysql:mysql '%s' 2>/dev/null; "
                    "chown mysql:mysql '%s' 2>/dev/null; chmod 660 '%s'" % (d, path, d, path, path)],
                   capture_output=True, text=True)
    rc, _, _ = _root_mysql("SET GLOBAL general_log_file='%s';" % path)
    rc2, on, _ = _root_mysql("SET GLOBAL general_log=ON; SELECT @@global.general_log;")
    return on == "1"


_REDACTIONS = [
    # the real form's admin login query carries Khanza's hardcoded AES key
    # material (admin.usere/passworde) — redact from archived artifacts
    (re.compile(r"AES_ENCRYPT\('[^']*'\s*,\s*'[^']*'\)"), "AES_ENCRYPT(<redacted>)"),
]


def _redact(text):
    for rx, repl in _REDACTIONS:
        text = rx.sub(repl, text)
    return text


def run_real_form(visits, logdir, attempt):
    """One JVM per distinct visit date under Xvfb+faketime; gl ON only in-JVM.

    Returns (per_date_results, concat_gl_path, sukses_map).
    """
    by_date = defaultdict(list)
    for v in visits:
        by_date[v["tgl"]].append(v["no_rawat"])
    gl_dir = os.path.join(logdir, "gl")
    os.makedirs(gl_dir, exist_ok=True)
    # fresh per-attempt dir: re-runs physically cannot accumulate (single clean)
    tmp_gl = "/tmp/g1_gl/%s_a%d" % (RUN_ID, attempt)
    subprocess.run(["bash", "-c", "rm -rf '%s'; mkdir -p '%s'" % (tmp_gl, tmp_gl)],
                   capture_output=True, text=True)
    gl_off()  # OFF during selection/consumer/reset phases; ON only below
    display, xvfb_pid = _ensure_display("99")
    results = []
    try:
        for dte in sorted(by_date):
            nr = by_date[dte]
            tag = dte.replace("/", "_")
            glf = os.path.join(tmp_gl, "general_log_G1.%s" % tag)
            gl_on = gl_point_on(glf)
            rc, out = _run_harness(nr, display, logdir, tag, dte)
            # rotate gl to a scratch name so the next date's file starts empty
            _root_mysql("SET GLOBAL general_log_file='%s.off'; SET GLOBAL general_log=OFF;" % glf)
            subprocess.run(["bash", "-c", "cp '%s' '%s/general_log_G1.%s' 2>/dev/null || true"
                            % (glf, gl_dir, tag)], capture_output=True, text=True)
            results.append({"date": dte, "rc": rc, "out": out, "gl_on": gl_on,
                            "visits": nr, "gl_file": os.path.join(gl_dir, "general_log_G1.%s" % tag)})
    finally:
        gl_off()
        if xvfb_pid:
            try:
                os.kill(xvfb_pid, 15)
            except OSError:
                pass
    # per-visit sukses from harness output: "[<nr>] ... DONE sukses=<bool>"
    sukses = {}
    for r in results:
        for m in re.finditer(r"=== VISIT (\S+) DONE sukses=(true|false)", r["out"] or ""):
            sukses[m.group(1)] = (m.group(2) == "true")
    # single concatenated artifact for the whole sampled run
    concat = os.path.join(logdir, "general_log_G1.log")
    with open(concat, "w", encoding="utf-8", errors="ignore") as out:
        for r in sorted(results, key=lambda x: x["date"]):
            try:
                with open(r["gl_file"], errors="ignore") as f:
                    out.write(f.read())
            except OSError:
                pass
    # canonical copy at the location run_all.sh points general_log_G1.log at
    # (mysqld cannot write /opt directly — errno 13 — so we capture in /tmp
    #  and copy; the copy IS the single clean run evidence). Copy + per-date
    # archived files are REDACTED (no AES key material in logs); the raw /tmp
    # capture dir is removed after concatenation.
    try:
        with open(concat, errors="ignore") as f:
            data = _redact(f.read())
        with open(concat, "w", encoding="utf-8") as f:
            f.write(data)
        for r in results:
            try:
                with open(r["gl_file"], errors="ignore") as f:
                    red = _redact(f.read())
                with open(r["gl_file"], "w", encoding="utf-8") as f:
                    f.write(red)
            except OSError:
                pass
        with open(os.path.join(RESULTS, RUN_ID, "general_log_G1.log"), "w",
                  encoding="utf-8") as f:
            f.write(data)
    except OSError:
        pass
    subprocess.run(["bash", "-c", "rm -rf '%s'" % tmp_gl], capture_output=True, text=True)
    return results, concat, sukses


def count_gl_inserts(path):
    """Count DML lines by table in the concatenated general_log.

    Observed FILE format on this box (MySQL 8.0.46): Time \t " Id Command" \t SQL
    (3 tab-separated fields); accept a 4-field variant too.
    """
    counts = Counter()
    if not os.path.exists(path):
        return counts
    with open(path, errors="ignore") as f:
        for line in f:
            parts = line.split("\t", 2)
            sql = parts[2].strip() if len(parts) == 3 else (parts[3].strip() if len(parts) > 3 else "")
            if not sql:
                continue
            m = re.match(r"insert\s+into\s+`?([a-z_0-9]+)`?", sql, re.I)
            if m:
                counts["insert:" + m.group(1).lower()] += 1
                continue
            m = re.match(r"delete\s+from\s+`?([a-z_0-9]+)`?", sql, re.I)
            if m:
                counts["delete:" + m.group(1).lower()] += 1
    return counts


# ---------------------------------------------------------------- PPN

def java_round(x):
    """Java Math.round(double): floor(x + 0.5) — half-UP (Python round() is half-even)."""
    return int(math.floor(x + 0.5))


def ppn_check(nr_list, cons_value_rows, real_value_rows):
    """(issues, examples, half_cases). subttl = SUM(total+embalase+tuslah) of dpo."""
    cons_ppn = defaultdict(list)
    for r in cons_value_rows:
        if "PPN" in r[3].upper():
            cons_ppn[r[1]].append(r[6])       # totalbiaya
    real_ppn = defaultdict(list)
    for r in real_value_rows:
        if "PPN" in r[3].upper():
            real_ppn[r[1]].append(r[6])
    issues, examples, half_cases = [], [], []
    for n in nr_list:
        subttl = _f(_scalar("SELECT COALESCE(SUM(total+embalase+tuslah),0) "
                            "FROM detail_pemberian_obat WHERE no_rawat='%s'" % n))
        raw = subttl * 0.11
        expected = java_round(raw) if subttl > 0 else 0
        c_vals = cons_ppn.get(n, [])
        r_vals = real_ppn.get(n, [])
        frac = raw - math.floor(raw)
        is_half = subttl > 0 and abs(frac - 0.5) < 1e-6
        if is_half:
            half_cases.append((n, subttl, raw))
        if subttl > 0:
            if len(c_vals) != 1 or len(r_vals) != 1:
                issues.append("%s: PPN row count consumer=%d real=%d (expected 1/1)"
                              % (n, len(c_vals), len(r_vals)))
            for side, vals in (("consumer", c_vals), ("real", r_vals)):
                for v in vals:
                    if _f(v) != float(expected):
                        issues.append("%s: %s PPN %s != Math.round(%s*0.11)=%d"
                                      % (n, side, _f(v), subttl, expected))
        else:
            if c_vals or r_vals:
                issues.append("%s: PPN row present with zero drug subtotal" % n)
        if c_vals or r_vals or subttl > 0:
            examples.append("%s: subttl=%s subttl*0.11=%r Math.round=%d consumer=%s real=%s"
                            % (n, subttl, raw, expected,
                               c_vals[0] if c_vals else "-",
                               r_vals[0] if r_vals else "-"))
    # dataset-wide half-rupiah census (informational)
    try:
        rows = _q("SELECT d.no_rawat, SUM(d.total+d.embalase+d.tuslah) s "
                  "FROM detail_pemberian_obat d JOIN reg_periksa rp ON rp.no_rawat=d.no_rawat "
                  "WHERE rp.no_rkm_medis LIKE 'DR%' GROUP BY d.no_rawat")
        ds_half = [r[0] for r in rows
                   if abs(((float(r[1]) * 0.11) % 1.0) - 0.5) < 1e-6]
    except Exception:
        ds_half = []
    return issues, examples, half_cases, ds_half


# ---------------------------------------------------------------- main

def main():
    attempt = 1
    argv = sys.argv[1:]
    if "--attempt" in argv:
        i = argv.index("--attempt")
        if i + 1 < len(argv):
            attempt = int(argv[i + 1])
    tool = dbutil.Tool(TOOL_NAME)
    logdir = os.path.join(RDIR, "g1_attempt%d" % attempt)
    os.makedirs(logdir, exist_ok=True)
    t0 = time.time()
    tool.log("=== GATE G1 stratified oracle-diff attempt %d (tool v2) ===" % attempt)

    # 1. select
    sel, cov, shortfalls, tags = select_visits()
    nr = [v["no_rawat"] for v in sel]
    tool.log("selected %d visits; coverage=%s; shortfalls=%s" % (len(nr), cov, shortfalls or "none"))
    not_covered = []
    for v in sel:
        reasons = []
        if v["n_etc"] > 0:
            reasons.append("non-zero embalase/tuslah")
        if v["n_proc"] > 2:
            reasons.append(">2 procedures")
        if v["stratum"] == "reg_only":
            reasons.append("reg-only visit (not exported by the pipeline; outside envelope)")
        if reasons:
            not_covered.append((v["no_rawat"], reasons))
    gated = [v for v in sel if v["no_rawat"] not in {x[0] for x in not_covered}]
    gnr = [v["no_rawat"] for v in gated]
    for n, reasons in not_covered:
        tool.log("NOT-COVERED marker: %s: %s (outside validated envelope; not computed)" % (n, "; ".join(reasons)))

    # 2. consumer snapshot (gl must be OFF here)
    gl_off()
    rc_exp, _ = dbutil.run_export()
    if rc_exp != 0:
        tool.log("FAIL: dr_export.sh rc=%d" % rc_exp)
        sys.exit(1)
    clog = os.path.join(logdir, "consumer.log")
    rc_cons, ctail = dbutil.run_consumer(clog)
    tool.log("consumer rc=%s; tail=%s" % (rc_cons, ctail.strip()[-160:]))
    if rc_cons != 0:
        tool.log("FAIL: consumer rc=%d" % rc_cons)
        sys.exit(1)
    cons_value, cons_struct = dump_billing_rows(nr)
    cons_nota = dump_nota_rows(nr)
    write_csv(os.path.join(logdir, "consumer_value_rows.csv"),
              ["table", "no_rawat", "status", "nm_perawatan", "biaya", "jumlah", "totalbiaya"],
              cons_value)
    write_csv(os.path.join(logdir, "consumer_structural_rows.csv"),
              ["table", "no_rawat", "status", "nm_perawatan", "biaya", "jumlah", "totalbiaya"],
              cons_struct)
    write_csv(os.path.join(logdir, "consumer_nota_jalan.csv"),
              ["no_rawat", "no_nota", "tanggal", "jam"], cons_nota)
    tool.log("consumer rows: value=%d structural=%d nota_jalan=%d"
             % (len(cons_value), len(cons_struct), len(cons_nota)))

    # 3. reset sample to re-billable (incl. detail_nota_jalan — v2 fix)
    reset_stats = reset_to_unpaid(nr)
    tool.log("reset_to_unpaid: %s" % reset_stats)

    # 4. real form with source-hash + gl (fresh truncated per-attempt files)
    h_before = source_hash()
    rf, concat_gl, sukses = run_real_form(sel, logdir, attempt)
    real_value, real_struct = dump_billing_rows(nr)
    real_nota = dump_nota_rows(nr)
    h_after = source_hash()
    drifted = h_before != h_after
    write_csv(os.path.join(logdir, "real_value_rows.csv"),
              ["table", "no_rawat", "status", "nm_perawatan", "biaya", "jumlah", "totalbiaya"],
              real_value)
    write_csv(os.path.join(logdir, "real_structural_rows.csv"),
              ["table", "no_rawat", "status", "nm_perawatan", "biaya", "jumlah", "totalbiaya"],
              real_struct)
    write_csv(os.path.join(logdir, "real_nota_jalan.csv"),
              ["no_rawat", "no_nota", "tanggal", "jam"], real_nota)
    tool.log("real rows: value=%d structural=%d nota_jalan=%d; source hash %s -> %s drifted=%s"
             % (len(real_value), len(real_struct), len(real_nota), h_before, h_after, drifted))
    jvm_rcs = [r["rc"] for r in rf]
    tool.log("JVM rcs=%s (all zero: %s)" % (jvm_rcs, all(rc == 0 for rc in jvm_rcs)))
    save_failures = [n for n in gnr if not sukses.get(n, False)]
    tool.log("real-form per-visit sukses: %d/%d gated visits true; failures=%s"
             % (len(gnr) - len(save_failures), len(gnr), save_failures or "none"))

    # 5. bidirectional per-visit value-row diff (Counters = multisets)
    cons_by = defaultdict(Counter)
    real_by = defaultdict(Counter)
    for r in cons_value:
        cons_by[r[1]][r[2:]] += 1
    for r in real_value:
        real_by[r[1]][r[2:]] += 1
    per_visit, only_cons, only_real = [], [], []
    for v in gated:
        n = v["no_rawat"]
        c, r = cons_by.get(n, Counter()), real_by.get(n, Counter())
        matched = sum((c & r).values())
        denom = max(sum(c.values()), sum(r.values()), 1)
        ok_v = (c == r) and sukses.get(n, False)
        per_visit.append((n, v["stratum"], v["kd_poli"], v["weekday"],
                          sum(c.values()), sum(r.values()), matched,
                          round(100.0 * matched / denom, 2), ok_v))
        for k, cnt in (c - r).items():
            only_cons.append((n,) + tuple(k) + (cnt,))
        for k, cnt in (r - c).items():
            only_real.append((n,) + tuple(k) + (cnt,))
    tot_c = sum(cons_by[n].total() for n in gnr)
    tot_r = sum(real_by[n].total() for n in gnr)
    tot_m = sum(pv[6] for pv in per_visit)
    match_rate = 100.0 * tot_m / max(tot_c, tot_r, 1)
    exact = (not only_cons) and (not only_real)
    tool.log("value-row diff (gated %d visits): consumer=%d real=%d matched=%d "
             "rate=%.2f%% only_consumer=%d only_real=%d exact=%s"
             % (len(gnr), tot_c, tot_r, tot_m, match_rate,
                len(only_cons), len(only_real), exact))

    # 6. PPN (Java Math.round) + half-rupiah
    ppn_issues, ppn_examples, half_cases, ds_half = ppn_check(gnr, cons_value, real_value)
    tool.log("PPN issues=%s; half-rupiah in sample=%s; dataset-wide half-rupiah visits=%d"
             % (ppn_issues or "none", half_cases or "none", len(ds_half)))

    # 7. reg-fee check (REG-1 context: biaya_reg vs poliklinik master vs billed)
    reg_rows = []
    for v in gated:
        n = v["no_rawat"]
        c_reg = [r[6] for r in cons_value if r[1] == n and r[2] == "Registrasi"]
        r_reg = [r[6] for r in real_value if r[1] == n and r[2] == "Registrasi"]
        reg_rows.append((n, v["biaya_reg"], v["poli_reg"],
                         c_reg[0] if c_reg else "-", r_reg[0] if r_reg else "-"))
    reg_mismatch = [x for x in reg_rows if str(x[3]) != str(x[4])]
    tool.log("reg-fee: %d visits checked, consumer-vs-real mismatches=%d (values in report)"
             % (len(reg_rows), len(reg_mismatch)))

    # 8. single clean general_log
    ins = count_gl_inserts(concat_gl)
    in_clause = ",".join("'%s'" % n for n in nr)
    real_billing_rows = int(_scalar("SELECT COUNT(*) FROM billing WHERE no_rawat IN (%s)" % in_clause) or 0)
    billing_inserts = ins.get("insert:billing", 0)
    gl_all_on = all(r["gl_on"] for r in rf) and len(rf) > 0
    gl_clean = gl_all_on and billing_inserts > 0 and billing_inserts == real_billing_rows
    tool.log("general_log: on_all_jvms=%s billing INSERTs=%d vs real billing rows=%d "
             "clean=%s (also captured: nota_jalan=%d detail_nota_jalan=%d)"
             % (gl_all_on, billing_inserts, real_billing_rows, gl_clean,
                ins.get("insert:nota_jalan", 0), ins.get("insert:detail_nota_jalan", 0)))

    # 9. observed, not replicated (finance tables)
    obs_piutang = _scalar("SELECT COUNT(*) FROM piutang_pasien WHERE no_rawat IN (%s)" % in_clause)
    obs_jurnal = _scalar(
        "SELECT COUNT(*) FROM jurnal WHERE no_bukti IN "
        "(SELECT no_nota FROM nota_jalan WHERE no_rawat IN (%s))" % in_clause)
    obs_detailjurnal = _scalar(
        "SELECT COUNT(*) FROM detailjurnal WHERE no_jurnal IN "
        "(SELECT no_jurnal FROM jurnal WHERE no_bukti IN "
        "(SELECT no_nota FROM nota_jalan WHERE no_rawat IN (%s)))" % in_clause)
    obs = {"piutang_pasien": obs_piutang, "jurnal": obs_jurnal, "detailjurnal": obs_detailjurnal}
    tool.log("observed (not replicated) finance rows for sample: %s" % obs)

    # 10. nota_jalan structural parity
    nota_by_c = Counter(r[0] for r in cons_nota)
    nota_by_r = Counter(r[0] for r in real_nota)
    nota_parity = all(nota_by_c.get(n, 0) == 1 and nota_by_r.get(n, 0) == 1 for n in gnr)
    tool.log("nota_jalan structural parity (1 row/visit both sides): %s" % nota_parity)

    # verdict
    ok = (len(gnr) > 0
          and all(rc == 0 for rc in jvm_rcs)
          and not save_failures
          and exact
          and not ppn_issues
          and not drifted
          and gl_clean)
    verdict = "PASS" if ok else "FAIL"

    rep = os.path.join(RDIR, "g1_validation.md")
    with open(rep, "w", encoding="utf-8") as f:
        f.write("# GATE G1 validation — attempt %d @ %s\n\n" % (
            attempt, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())))
        f.write("## VERDICT: %s%s\n\n" % (verdict, " (with divergence)" if verdict == "FAIL" else ""))
        f.write("- tool: oracle_diff_30_50.py v2 (bidirectional per-visit exactness; "
                "detail_nota_jalan reset; Java Math.round PPN; fresh-truncated general_log)\n")
        f.write("- attempt: %d of 3\n\n" % attempt)
        f.write("## Selected visits (%d, target 30-50, ORDER BY MD5(no_rawat), DR-only 2026/10)\n\n" % len(sel))
        f.write("| no_rawat | stratum | poli | weekday | drugs | procs | biaya_reg | halfPPN | in-gate |\n")
        f.write("|---|---|---|---|---|---|---|---|---|\n")
        for v in sel:
            f.write("| %s | %s | %s | %s | %d | %d | %s | %s | %s |\n" % (
                v["no_rawat"], v["stratum"], v["kd_poli"], v["weekday"],
                v["n_drugs"], v["n_proc"], v["biaya_reg"],
                "HALF" if v.get("half_rupiah") else "",
                "no" if v["no_rawat"] in {x[0] for x in not_covered} else "yes"))
        f.write("\n## Strata coverage\n\n`%s`\n\nShortfalls: %s\n\n" % (
            cov, shortfalls or "none"))
        f.write("## Intended envelope (validated scope statement)\n\n%s\n\n" % ENVELOPE)
        if not_covered:
            f.write("## Not-covered markers (NOT silently computed)\n\n")
            for n, reasons in not_covered:
                f.write("- NOT-COVERED: %s — %s\n" % (n, "; ".join(reasons)))
            f.write("\n")
        else:
            f.write("## Not-covered markers\n\nnone (every selected visit inside the envelope)\n\n")
        f.write("## Per-visit value-row match (billing value rows, bidirectional multiset)\n\n")
        f.write("| no_rawat | stratum | consumer | real | matched | rate % | sukses | verdict |\n")
        f.write("|---|---|---|---|---|---|---|---|\n")
        for n, st, poli, wd, c, r, m, rate, ok_v in per_visit:
            f.write("| %s | %s | %d | %d | %d | %.2f | %s | %s |\n" % (
                n, st, c, r, m, rate, sukses.get(n, False), "OK" if ok_v else "DIVERGED"))
        f.write("\n**Overall value-row match rate (billing + nota_jalan value rows): "
                "%.2f%% (%d/%d)** — consumer-only rows: %d, real-only rows: %d, exact: %s\n\n"
                % (match_rate, tot_m, max(tot_c, tot_r, 1), len(only_cons), len(only_real), exact))
        f.write("nota_jalan structural parity (exactly 1 row/visit on both sides): %s "
                "(nota_jalan carries no value columns; recorded structurally)\n\n" % nota_parity)
        if only_cons:
            f.write("### Consumer-only value rows (divergence)\n\n")
            for x in only_cons[:25]:
                f.write("- %s | %s | %s | biaya=%s jml=%s total=%s x%d\n" % (x[0], x[1], x[2], x[3], x[4], x[5], x[6]))
            f.write("\n")
        if only_real:
            f.write("### Real-form-only value rows (divergence)\n\n")
            for x in only_real[:25]:
                f.write("- %s | %s | %s | biaya=%s jml=%s total=%s x%d\n" % (x[0], x[1], x[2], x[3], x[4], x[5], x[6]))
            f.write("\n")
        f.write("## PPN Obat (Java Math.round semantics, half-up)\n\n")
        f.write("Math.round(x) == floor(x + 0.5); x = subttl * 0.11; "
                "subttl = SUM(detail_pemberian_obat.total + embalase + tuslah)\n\n")
        for e in ppn_examples[:12]:
            f.write("- %s\n" % e)
        # half-rupiah examples are REQUIRED in the report (brief item 5) — always
        # include them explicitly even if beyond the 12-example cutoff
        shown = set(ppn_examples[:12])
        for n, subttl, raw in half_cases:
            e = next((x for x in ppn_examples if x.startswith(n + ":")), None)
            if e and e not in shown:
                f.write("- %s  (HALF-RUPIAH case: |%.4f - 0.5| < 1e-6, "
                        "Java Math.round rounds half-UP)\n" % (e, raw - math.floor(raw)))
            elif not e:
                f.write("- %s: subttl=%s subttl*0.11=%r (HALF-RUPIAH case, "
                        "no PPN rows observed)\n" % (n, subttl, raw))
        f.write("\nPPN issues: %s\n\n" % (ppn_issues or "none"))
        f.write("Half-rupiah cases in sample (|subttl*0.11 mod 1 - 0.5| < 1e-6): %s\n" % (half_cases or "none"))
        f.write("Dataset-wide half-rupiah DR visits (census, informational): %d%s\n\n"
                % (len(ds_half), (" " + ",".join(ds_half[:10])) if ds_half else ""))
        f.write("## Reg-fee check (REG-1 context)\n\n")
        f.write("| no_rawat | reg_periksa.biaya_reg | poliklinik master | consumer Registrasi tb | real Registrasi tb |\n")
        f.write("|---|---|---|---|---|\n")
        for n, br, pr, c, r in reg_rows:
            f.write("| %s | %s | %s | %s | %s |\n" % (n, br, pr, c, r))
        f.write("\nconsumer-vs-real Registrasi mismatches: %d\n\n" % len(reg_mismatch))
        f.write("## Source-drift check\n\n- before: `%s`\n- after: `%s`\n- drifted: %s "
                "(reg_periksa.status_bayar excluded — the form flips it on save)\n\n"
                % (h_before, h_after, drifted))
        f.write("## Single clean general_log\n\n")
        f.write("- general_log ON in %d/%d JVM windows, OFF otherwise (consumer/export ran with gl OFF)\n"
                % (sum(1 for r in rf if r["gl_on"]), len(rf)))
        f.write("- billing INSERTs captured: %d; real-form billing rows now in DB for sample: %d; "
                "equal (single clean run, not a multiple): %s\n"
                % (billing_inserts, real_billing_rows, billing_inserts == real_billing_rows and billing_inserts > 0))
        f.write("- also captured: nota_jalan INSERTs=%d, detail_nota_jalan INSERTs=%d "
                "(informational)\n\n" % (ins.get("insert:nota_jalan", 0), ins.get("insert:detail_nota_jalan", 0)))
        f.write("## Observed, not replicated (finance tables)\n\n")
        f.write("Row counts for the sample (NOT required to match the consumer; "
                "jurnal linkage via jurnal.no_bukti IN (nota_jalan.no_nota)):\n\n`%s`\n\n" % obs)
        f.write("## Real-form execution\n\n- JVM return codes: %s\n- per-visit save failures: %s\n\n"
                % (jvm_rcs, save_failures or "none"))
        f.write("## Reset (idempotency note)\n\n`%s`\n\n"
                "Re-running the tool re-selects (same MD5 order) and re-snapshots; the sample "
                "reset + real-form saves are the only mutations (sik side only).\n" % reset_stats)
        if verdict == "FAIL":
            f.write("## Divergence summary\n\n")
            if save_failures:
                f.write("- visits the real form failed to save: %s\n" % ",".join(save_failures))
            if only_cons:
                f.write("- %d consumer-only value rows (see above)\n" % len(only_cons))
            if only_real:
                f.write("- %d real-only value rows (see above)\n" % len(only_real))
            if ppn_issues:
                f.write("- PPN issues: %s\n" % ppn_issues[:10])
            if drifted:
                f.write("- source drift: %s -> %s\n" % (h_before, h_after))
            if not gl_clean:
                f.write("- general_log single-clean check failed (on_all=%s inserts=%d rows=%d)\n"
                        % (gl_all_on, billing_inserts, real_billing_rows))
            f.write("\n")
    # keep per-attempt copy for history
    with open(os.path.join(logdir, "g1_validation.md"), "w", encoding="utf-8") as f:
        with open(rep, encoding="utf-8") as src:
            f.write(src.read())
    tool.log("wrote %s (+ per-attempt copy in %s)" % (rep, logdir))

    dbutil.decision(
        "GATE G1 oracle v2 run (attempt %d) — %s" % (attempt, verdict),
        "oracle_diff_30_50.py v2: bidirectional per-visit value-row exactness; reset clears "
        "detail_nota_jalan (+piutang/detail_piutang/tambahan/pengurangan) fixing v1's duplicate-PK "
        "save failures; PPN via Java Math.round (floor(x+0.5)); general_log fresh-truncated "
        "per attempt in /tmp/g1_gl and single-clean is a hard gate condition. Result: %s "
        "(match rate %.2f%%, only_consumer=%d, only_real=%d, source_drift=%s, gl_clean=%s)."
        % (verdict, match_rate, len(only_cons), len(only_real), drifted, gl_clean))

    tool.log("=== GATE G1 attempt %d %s in %.0fs ===" % (attempt, verdict, time.time() - t0))
    tool.close()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
