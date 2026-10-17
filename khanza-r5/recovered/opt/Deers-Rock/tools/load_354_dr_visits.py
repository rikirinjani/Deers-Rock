#!/usr/bin/env python3
"""load_354_dr_visits.py — Phase 4 Stage A: load/verify the 354 DR-only
2026/10 visit population and ensure the DR charge ledger ground truth exists.

On-box reality (verified 2026-10-11):
  - sik       : holds the 354 DR reg_periksa + prescriptions/procedures and is
                the consumer's write target (setting/database.ini database=sik).
  - sik_bench : clean benchmark schema; holds dr_charge_ledger (DR ground
                truth). It has NO DR encounter rows, so the ledger MUST be
                built from sik's DR source tables (verified: building from
                sik_bench yields 0 rows — the empty-ledger bug).

Ledger tariff sources (mirror exactly what DR's own export charges):
  - registration: DR clinic fee 10,000 (verified == consumer Registrasi rows)
  - procedure   : rawat_jl_dr.biaya_rawat per (no_rawat, kd_jenis_prw)
  - drug        : resep_dokter.jml x databarang.ralan per dispensing line
                  (NOT detail_pemberian_obat.h_beli — that purchase price
                  diverges on 287 visits; price-source normalization)
  - tax         : Khanza rule 11% of per-visit drug subtotal, Java
                  Math.round half-up (floor(x+0.5)), one row per drug visit
                  (matches the consumer's PPN billing rows 1:1)

Also stages the DR export for the orchestrator: run_all.sh's
run_consumer_over_export reads $RESULTS/$RUN_ID/A.encounters.txt, so this tool
runs dr_export.sh and copies /tmp/dr_encounters.txt there.

Idempotent: ledger rebuild is DELETE+INSERT (deterministic); sik is never
mutated. Usage: RUN_ID=<id> python3 load_354_dr_visits.py
"""
import os, sys, time, hashlib, shutil, math
import dbutil

TOOL_NAME = "stageA_load"
RUN_ID = os.environ.get("RUN_ID", "test")
RESULTS_ROOT = dbutil.RESULTS_ROOT
RDIR = os.path.join(RESULTS_ROOT, RUN_ID)

DR_REG_FEE = 10000
DR_SRC_TABLES = ["reg_periksa", "resep_obat", "resep_dokter",
                 "detail_pemberian_obat", "rawat_jl_dr"]


def get_dr_visits():
    rows = dbutil.query("sik",
        "SELECT no_rawat FROM reg_periksa "
        "WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%' "
        "ORDER BY no_rawat")
    return [r[0] for r in rows]


def java_round(x):
    """Java Math.round: floor(x+0.5) — half-UP (Python round() is half-even)."""
    return int(math.floor(x + 0.5))


def expected_components(nr):
    """Compute expected ledger rows from sik's DR source data."""
    in_clause = ",".join("'%s'" % n for n in nr)
    reg = [("'%s'" % n, "'registration'", "'REG'", 1, DR_REG_FEE, DR_REG_FEE)
           for n in nr]
    proc = []
    for n, kdp, q, p in dbutil.query("sik",
        "SELECT no_rawat, kd_jenis_prw, COUNT(*), MAX(biaya_rawat) "
        "FROM rawat_jl_dr WHERE no_rawat IN (%s) "
        "GROUP BY no_rawat, kd_jenis_prw" % in_clause):
        qf, pf = float(q or 0), float(p or 0)
        if qf * pf > 0:
            proc.append(("'%s'" % n, "'procedure'", "'%s'" % kdp, qf, pf, qf * pf))
    drug, subtl = [], {}
    for n, kdb, q, p in dbutil.query("sik",
        "SELECT ro.no_rawat, rd.kode_brng, rd.jml, COALESCE(b.ralan,0) "
        "FROM resep_dokter rd "
        "JOIN resep_obat ro ON ro.no_resep = rd.no_resep "
        "LEFT JOIN databarang b ON b.kode_brng = rd.kode_brng "
        "WHERE ro.no_rawat IN (%s) ORDER BY ro.no_rawat, rd.kode_brng" % in_clause):
        qf, pf = float(q or 0), float(p or 0)
        amt = qf * pf
        if amt > 0:
            drug.append(("'%s'" % n, "'drug'", "'%s'" % kdb, qf, pf, amt))
            subtl[n] = subtl.get(n, 0.0) + amt
    tax = [("%s" % ("'%s'" % n), "'tax'", "'PPN11'", 1, java_round(subtl[n] * 0.11),
            java_round(subtl[n] * 0.11)) for n in sorted(subtl) if subtl[n] > 0]
    return {"registration": reg, "procedure": proc, "drug": drug, "tax": tax}


def ledger_insert(rows, tool):
    """DELETE + batched INSERT of ledger rows for one component."""
    for chunk_start in range(0, len(rows), 200):
        chunk = rows[chunk_start:chunk_start + 200]
        vals = ",".join("(%s,%s,%s,%s,%s,%s)" % (a, b, c,
                 ("%.6f" % d).rstrip("0").rstrip(".") if d == int(d) else repr(d),
                 ("%.6f" % e).rstrip("0").rstrip(".") if e == int(e) else repr(e),
                 ("%.6f" % f).rstrip("0").rstrip(".") if f == int(f) else repr(f))
                 for a, b, c, d, e, f in chunk)
        dbutil.execute("sik_bench",
            "INSERT INTO dr_charge_ledger (no_rawat,component,code,quantity,"
            "unit_price,amount) VALUES %s;" % vals)


def build_ledger(tool, exp):
    dbutil.execute("sik_bench", "DELETE FROM dr_charge_ledger;")
    for comp, rows in exp.items():
        dbutil.execute("sik_bench",
            "DELETE FROM dr_charge_ledger WHERE component='%s';" % comp)
        if rows:
            ledger_insert(rows, tool)
        tool.log("  ledger %s: %d rows inserted" % (comp, len(rows)))


def main():
    tool = dbutil.Tool(TOOL_NAME)
    os.makedirs(RDIR, exist_ok=True)
    t0 = time.time()
    tool.log("=== Stage A load: verify 354 DR cohort + build ledger + stage export ===")

    nr = get_dr_visits()
    tool.log("DR visits in sik: %d" % len(nr))
    if len(nr) < 300:
        tool.log("FAIL: only %d DR visits found; expected ~354" % len(nr))
        return 1
    in_clause = ",".join("'%s'" % n for n in nr)

    # --- source-table manifest (sik holds the DR cohort) ---
    manifest_rows = []
    for t in DR_SRC_TABLES:
        sik_total = dbutil.scalar("sik", "SELECT COUNT(*) FROM %s" % t)
        sik_cohort = dbutil.scalar("sik",
            "SELECT COUNT(*) FROM %s WHERE no_rawat IN (%s)" % (t, in_clause)
            if t != "resep_dokter" else
            "SELECT COUNT(*) FROM resep_dokter WHERE no_resep IN "
            "(SELECT no_resep FROM resep_obat WHERE no_rawat IN (%s))" % in_clause)
        manifest_rows.append((t, sik_total, sik_cohort))
        tool.log("  %s: sik_total=%s sik_cohort=%s" % (t, sik_total, sik_cohort))
    for t in ("pasien", "dokter", "poliklinik", "jns_perawatan", "databarang"):
        s = dbutil.scalar("sik", "SELECT COUNT(*) FROM %s" % t)
        b = dbutil.scalar("sik_bench", "SELECT COUNT(*) FROM %s" % t)
        tool.log("  MASTER %s: sik=%s sik_bench=%s %s"
                 % (t, s, b, "(match)" if s == b else "(DIFFER)"))

    # --- ledger ground truth: build if empty or counts mismatch ---
    exp = expected_components(nr)
    exp_counts = {c: len(r) for c, r in exp.items()}
    exp_tot = sum(len(r) for r in exp.values())
    cur = {c: int(n or 0) for c, n in dbutil.query("sik_bench",
        "SELECT component, COUNT(*) FROM dr_charge_ledger GROUP BY component")}
    cur_tot = dbutil.scalar("sik_bench", "SELECT COUNT(*) FROM dr_charge_ledger")
    tool.log("ledger now: %s (total %s); expected: %s (total %d)"
             % (cur, cur_tot, exp_counts, exp_tot))
    if cur_tot == 0 or any(cur.get(c, 0) != n for c, n in exp_counts.items()):
        why = "empty" if cur_tot == 0 else "count mismatch"
        tool.log("rebuilding dr_charge_ledger (%s) from sik DR sources" % why)
        dbutil.execute("sik_bench", """
          CREATE TABLE IF NOT EXISTS sik_bench.dr_charge_ledger (
            no_rawat VARCHAR(17), component ENUM('registration','procedure','drug','tax'),
            code VARCHAR(20), quantity DOUBLE, unit_price DOUBLE, amount DOUBLE,
            source VARCHAR(40), PRIMARY KEY (no_rawat, component, code))""")
        build_ledger(tool, exp)
        dbutil.decision("Stage A ledger rebuild from sik DR sources",
            "dr_charge_ledger rebuilt in sik_bench from sik's DR source tables "
            "(registration=DR clinic fee 10000; procedure=rawat_jl_dr.biaya_rawat; "
            "drug=resep_dokter.jml x databarang.ralan — NOT detail_pemberian_obat.h_beli, "
            "which diverges on 287 visits (price-source normalization); "
            "tax=11% per-visit drug subtotal, Java Math.round half-up). "
            "Reason: sik_bench contains no DR encounter rows; building from sik_bench "
            "yielded 0 rows (empty-ledger bug).")
    else:
        tool.log("ledger already matches expected counts; no rebuild")

    led = {c: (int(n or 0), float(a or 0)) for c, n, a in dbutil.query("sik_bench",
        "SELECT component, COUNT(*), SUM(amount) FROM dr_charge_ledger GROUP BY component")}
    for c in ("registration", "procedure", "drug", "tax"):
        n, a = led.get(c, (0, 0.0))
        tool.log("  ledger %s: rows=%d amount=%.0f" % (c, n, a))

    # --- stage the DR export for run_all.sh's run_consumer_over_export ---
    rc, out = dbutil.run_export()
    tool.log("dr_export.sh rc=%d; %s" % (rc, out.strip().splitlines()[-1] if out.strip() else ""))
    if rc != 0:
        tool.log("FAIL: dr_export.sh failed")
        return 1
    stage = os.path.join(RDIR, "A.encounters.txt")
    shutil.copyfile(dbutil.ENCOUNTERS, stage)
    data = open(stage, "rb").read()
    enc = sum(1 for l in data.splitlines() if l.startswith(b"ENC "))
    obat = sum(1 for l in data.splitlines() if l.startswith(b"OBAT "))
    tool.log("staged %s: ENC=%d OBAT=%d sha256=%s"
             % (stage, enc, obat, hashlib.sha256(data).hexdigest()[:16]))

    # --- manifest artifact ---
    rep = os.path.join(RDIR, "stageA_load_manifest.md")
    with open(rep, "a") as f:
        f.write("\n# Stage A load manifest @ %s\n"
                % time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        f.write("- DR visits in sik: %d\n- export: ENC=%d OBAT=%d\n" % (len(nr), enc, obat))
        f.write("- ledger rows: %s\n" % led)
        f.write("| table | sik_total | sik_cohort |\n|---|---|---|\n")
        for t, st, sc in manifest_rows:
            f.write("| %s | %s | %s |\n" % (t, st, sc))
    tool.log("wrote %s" % rep)
    tool.log("=== Stage A load PASS in %.0fs ===" % (time.time() - t0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
