#!/usr/bin/env python3
"""stagea_common.py — shared helpers for Phase 4 Stage A (GATE G2) tools.

Everything here is benchmark tooling around the existing dbutil.py. It adds:

  * reversible DATABASE retarget of the two setting/database.xml copies
    (consumer cwd /opt/simrs-khanza + harness cwd /opt/simrs-khanza/run-env)
    via RetargetDbXml.java + the Khanza AES class — HOST/PORT/USER/PAS are
    preserved; only the DATABASE property changes; backups are kept and
    restored by the composite gate (stage_a_g2.py) in a finally block.
  * per-date Xvfb+faketime real-form runner (same pattern GATE G1 used).
  * billing/nota snapshot + per-component classification (registration /
    procedure / drug / PPN) per the G2 charge model.
  * G1-style stable content hash of source tables.
  * output-table reset (G1 RESET_TABLES semantics) for the DR cohort.

No secrets (passwords, AES key/IV, usere key) and no public IPs are ever
printed or logged.
"""
import hashlib
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil  # noqa: E402

BENCH_DB = "sik_bench"
SRC_DB = "sik"
KHANZA_DIR = dbutil.KHANZA_DIR
RUNENV_DIR = "/opt/simrs-khanza/run-env"
DB_XMLS = [
    os.path.join(KHANZA_DIR, "setting", "database.xml"),
    os.path.join(RUNENV_DIR, "setting", "database.xml"),
]
RETARGET_CP = "consumer:KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar"
HARNESS_CP = (".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/"
              "dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*")

COMPONENTS = ("registration", "procedure", "drug", "ppn")

# real-form OUTPUT tables cleared before a re-bill (G1 RESET_TABLES semantics)
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

# scratch tables the form/reports write (cleared on load for a clean target)
SCRATCH_TABLES = ["jurnal", "detailjurnal", "temporary", "temporary2",
                  "temporary_bayar_ralan", "temporary_tambahan_potongan",
                  "tampjurnal"]

# source tables hashed for the replay drift check (task list)
SRC_TABLES = ["resep_obat", "resep_dokter", "detail_pemberian_obat",
              "rawat_jl_dr", "reg_periksa", "databarang", "jns_perawatan",
              "poliklinik"]

# NOTE: single-% SQL below — never %-format a string that embeds these.
COHORT_WHERE = ("no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'")


# ------------------------------------------------------------------ cohort

def cohort_visits():
    """The DR-only 2026/10 visits [(no_rawat, tgl, jam)], ordered by no_rawat."""
    rows = dbutil.query(SRC_DB,
        "SELECT no_rawat, tgl_registrasi, COALESCE(jam_reg,'08:00:00') "
        "FROM reg_periksa WHERE " + COHORT_WHERE + " ORDER BY no_rawat")
    return [(r[0], r[1], r[2]) for r in rows]


def in_clause(nr_list):
    return ",".join("'%s'" % n for n in nr_list)


# ------------------------------------------------------- database retarget

def _xml_current_db(xml_path):
    p = subprocess.run(["java", "-cp", RETARGET_CP, "RetargetDbXml", xml_path],
                       cwd=KHANZA_DIR, capture_output=True, text=True, timeout=60)
    out = (p.stdout or "").strip().splitlines()
    out = out[-1].strip() if out else ""
    if p.returncode != 0 or out.startswith("FAIL") or out.startswith("ERR") or " " in out:
        raise RuntimeError("RetargetDbXml probe failed on %s: %s"
                           % (xml_path, (out or (p.stderr or "").strip())[:120]))
    return out


def retarget_database(log, dbname=BENCH_DB):
    """Point BOTH database.xml copies at the benchmark DB (backup + verify)."""
    for xml in DB_XMLS:
        cur = _xml_current_db(xml)
        if cur == dbname:
            log("database.xml already targets " + dbname + ": " + xml)
            continue
        bak = xml + ".stagea_bak"
        if not os.path.exists(bak):
            subprocess.run(["cp", "-p", xml, bak], check=True)
            log("backup kept: " + bak + " (original DATABASE=" + cur + ")")
        p = subprocess.run(["java", "-cp", RETARGET_CP, "RetargetDbXml",
                            xml, dbname],
                           cwd=KHANZA_DIR, capture_output=True, text=True,
                           timeout=60)
        log("retarget " + xml + ": " + ((p.stdout or p.stderr or "").strip().splitlines() or ["?"])[-1][:140])
        if p.returncode != 0 or _xml_current_db(xml) != dbname:
            raise RuntimeError("retarget failed for " + xml)
    return True


def restore_database(log):
    """Restore the .stagea_bak backups (idempotent)."""
    for xml in DB_XMLS:
        bak = xml + ".stagea_bak"
        if os.path.exists(bak):
            subprocess.run(["cp", "-p", bak, xml], check=True)
            os.remove(bak)
            log("restored original database.xml: " + xml)
    return True


# ------------------------------------------------------------- real form

def _ensure_display(disp="99"):
    """Reuse a live Xvfb or start one. Returns (display, pid_or_None)."""
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


def run_harness(visits, logdir, tag_prefix=""):
    """Real form (BilingHarness save-mode) per distinct visit date under
    Xvfb + faketime. Returns (per_date_results, sukses_map)."""
    by_date = {}
    for nr, tgl, jam in visits:
        by_date.setdefault(tgl, []).append(nr)
    display, xvfb_pid = _ensure_display("99")
    results = []
    try:
        for dte in sorted(by_date):
            nr = sorted(by_date[dte])  # matches the consumer's per-date order
            tag = tag_prefix + dte.replace("/", "_")
            log_path = os.path.join(logdir, "harness_%s.log" % tag)
            script = (
                "cd " + RUNENV_DIR + "; export DISPLAY=':" + display + "'; "
                "faketime '" + dte + " 08:00:00' "
                "java -cp '" + HARNESS_CP + "' BilingHarness " + " ".join(nr) +
                " > " + log_path + " 2>&1; exit $?")
            try:
                p = subprocess.run(["bash", "-c", script], capture_output=True,
                                   text=True, timeout=3600)
                rc = p.returncode
            except subprocess.TimeoutExpired:
                rc = -1
            out = ""
            try:
                with open(log_path, errors="ignore") as f:
                    out = f.read()
            except OSError:
                pass
            results.append({"date": dte, "rc": rc, "visits": nr,
                            "log": log_path, "out_tail": out[-400:]})
    finally:
        if xvfb_pid:
            try:
                os.kill(xvfb_pid, 15)
            except OSError:
                pass
    sukses = {}
    for r in results:
        try:
            with open(r["log"], errors="ignore") as f:
                for m in re.finditer(r"=== VISIT (\S+) DONE sukses=(true|false)", f.read()):
                    sukses[m.group(1)] = (m.group(2) == "true")
        except OSError:
            pass
    return results, sukses


# ---------------------------------------------------------- snapshot/diff

def billing_rows(nr_list):
    """Full billing rows for the cohort, ordered (visit, noindex)."""
    rows = dbutil.query(BENCH_DB,
        "SELECT no_rawat, noindex, no, nm_perawatan, pemisah, biaya, jumlah, "
        "tambahan, totalbiaya, status, tgl_byr FROM billing WHERE no_rawat "
        "IN (" + in_clause(nr_list) + ") ORDER BY no_rawat, noindex, status")
    return [tuple(r) for r in rows]


def nota_rows(nr_list):
    rows = dbutil.query(BENCH_DB,
        "SELECT no_rawat, no_nota, tanggal, jam FROM nota_jalan WHERE no_rawat "
        "IN (" + in_clause(nr_list) + ") ORDER BY no_rawat, no_nota")
    return [tuple(r) for r in rows]


def _f(x):
    try:
        return round(float(x or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def is_value_row(status, nm, biaya, totalbiaya):
    """Value row = not a Ttl* structural total and carries money."""
    if str(status).startswith("Ttl"):
        return False
    return (_f(biaya) > 0 or _f(totalbiaya) > 0)


def component_of(status, nm, no=None):
    """Component classification per the G2 charge model (billing side).

    Column reality (consumer == real form, G1-validated): section headers put
    their label in `no` and ':' in `nm_perawatan`; item rows put the item name
    in `nm_perawatan`. The reliable discriminators are `status` + `no` +
    'PPN' in nm_perawatan, so the task's indicative WHERE clauses are mapped
    onto those (e.g. registration rows: status='Registrasi', no='Registrasi').
    """
    s, n = str(status or ""), str(nm or "")
    o = str(no or "")
    if "PPN" in n.upper():
        return "ppn"
    if s == "Registrasi" or o == "Registrasi" or n.lower().startswith("registrasi"):
        return "registration"
    if s in ("Ralan Dokter", "Ranap Dokter"):
        return "procedure"
    if s == "Obat":
        return "drug"
    return None


def component_stats(rows):
    """Per-component value-row count + money sum from billing rows."""
    stats = {c: {"rows": 0, "money": 0.0} for c in COMPONENTS}
    for r in rows:
        c = component_of(r[9], r[3], r[2])
        if c is None or not is_value_row(r[9], r[3], r[5], r[8]):
            continue
        stats[c]["rows"] += 1
        stats[c]["money"] += _f(r[8])
    for c in COMPONENTS:
        stats[c]["money"] = round(stats[c]["money"], 2)
    return stats


def ledger_stats(nr_list=None):
    """Per-component expected rows + money from dr_charge_ledger.

    Procedure row count is normalized to the billing granularity
    (DISTINCT (no_rawat, nm_perawatan) via the jns_perawatan join) because
    the consumer/real form group procedures by NAME while the ledger groups
    by CODE and 36 jns_perawatan codes share names in this dataset
    (grouping artifact; money unaffected — documented in
    stageA_G2_validation.md and DECISIONS.md).
    """
    stats = {c: {"rows": 0, "money": 0.0} for c in COMPONENTS}
    r = dbutil.query(BENCH_DB,
        "SELECT COUNT(*), ROUND(SUM(amount),2) FROM dr_charge_ledger "
        "WHERE component='registration'")
    if r and r[0][0]:
        stats["registration"] = {"rows": int(r[0][0]), "money": round(_f(r[0][1]), 2)}
    r = dbutil.query(BENCH_DB,
        "SELECT COUNT(DISTINCT l.no_rawat, j.nm_perawatan), ROUND(SUM(l.amount),2), "
        "COUNT(*) FROM dr_charge_ledger l "
        "JOIN jns_perawatan j ON j.kd_jenis_prw=l.code "
        "WHERE l.component='procedure'")
    if r and r[0][0]:
        stats["procedure"] = {"rows": int(r[0][0]), "money": round(_f(r[0][1]), 2),
                              "raw_code_rows": int(r[0][2])}
    r = dbutil.query(BENCH_DB,
        "SELECT COUNT(*), ROUND(SUM(amount),2) FROM dr_charge_ledger "
        "WHERE component='drug'")
    if r and r[0][0]:
        stats["drug"] = {"rows": int(r[0][0]), "money": round(_f(r[0][1]), 2)}
    r = dbutil.query(BENCH_DB,
        "SELECT COUNT(*), ROUND(SUM(amount),2) FROM dr_charge_ledger "
        "WHERE component='tax'")
    if r and r[0][0]:
        stats["ppn"] = {"rows": int(r[0][0]), "money": round(_f(r[0][1]), 2)}
    return stats


def value_rows(rows):
    out = []
    for r in rows:
        if is_value_row(r[9], r[3], r[5], r[8]):
            out.append(r)
    return out


# ------------------------------------------------------------- source hash

def cols_of(db, table):
    return [r[0] for r in dbutil.query(db, "SHOW COLUMNS FROM " + table)]


def source_hash(db, tables, exclude_status_bayar=False):
    """Stable content hash: per-table COUNT + MD5(GROUP_CONCAT(CRC32(row)))."""
    h = hashlib.sha256()
    detail = {}
    for t in tables:
        try:
            cols = cols_of(db, t)
            sel = [c for c in cols
                   if not (exclude_status_bayar and t == "reg_periksa" and c == "status_bayar")]
            selstr = ", ".join("`" + c + "`" for c in sel)
            rows = dbutil.query(db,
                "SET SESSION group_concat_max_len=4294967295;\n"
                "SELECT COUNT(*), MD5(GROUP_CONCAT(CRC32(CONCAT_WS('#','" + t + "'," + selstr + ")) "
                "ORDER BY " + selstr + " SEPARATOR '|')) FROM " + t + ";")
            cnt, chk = rows[0][0], rows[0][1]
            h.update(("%s:%s:%s:" % (t, cnt, chk)).encode())
            detail[t] = {"count": int(cnt), "md5": chk}
        except Exception as e:
            h.update(("%s:ERR:" % t).encode())
            detail[t] = {"error": str(e)[:80]}
    return h.hexdigest(), detail


# ---------------------------------------------------------------- resets

def reset_outputs(nr_list):
    """G1 reset: delete every real-form output row for the cohort and set the
    visits back to 'Belum Bayar' so BtnSimpan can re-bill cleanly."""
    ic = in_clause(nr_list)
    stats = {}
    for t, key in RESET_TABLES.items():
        n = dbutil.scalar(BENCH_DB,
            "SELECT COUNT(*) FROM " + t + " WHERE " + key + " IN (" + ic + ")")
        dbutil.execute(BENCH_DB,
            "DELETE FROM " + t + " WHERE " + key + " IN (" + ic + ")")
        stats["deleted_" + t] = n
    dbutil.execute(BENCH_DB,
        "UPDATE reg_periksa SET status_bayar='Belum Bayar' WHERE no_rawat IN (" + ic + ")")
    return stats


def clear_billing_nota(nr_list):
    """Replay clean snapshot: remove consumer outputs for the cohort."""
    ic = in_clause(nr_list)
    dbutil.execute(BENCH_DB, "DELETE FROM billing WHERE no_rawat IN (" + ic + ")")
    dbutil.execute(BENCH_DB, "DELETE FROM nota_jalan WHERE no_rawat IN (" + ic + ")")


def write_json(path, obj):
    import json
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, default=str)
