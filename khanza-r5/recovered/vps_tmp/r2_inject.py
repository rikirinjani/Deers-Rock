#!/usr/bin/env python3
r"""r2_inject.py — gate-fail injection for R2-4 (inject / cleanup / verify).

Scratch visit 2026/10/05/899001 (no_rkm_medis DR099901):
  reg_periksa row (cloned from a real Oct-5 generated visit, identity overridden)
  sik_bench.dr_charge_ledger: registration @ 99999 (WRONG price; khanza will bill
    10000) + drug 'XX9999' (NOT in databarang — un-mappable code) qty 1 @ 500
  sik.billing: one Registrasi value row @ 10000 (mismatch vs ledger 99999)
Scratch visit 2026/10/05/899002 (reg_periksa ONLY — exercises the
  check_billed_eq_dr UNBILLED fail path; not in ledger, not billed).
Cleanup deletes exactly these two no_rawats from all three tables.
"""
import subprocess
import sys

NR1 = "2026/10/05/899001"
NR2 = "2026/10/05/899002"
RKM = "DR099901"
CLONE_REG = "2026/10/05/800001"


def q(db, sql):
    p = subprocess.run(["mysql", "-uroot", db, "-N", "-B", "-e", sql],
                       capture_output=True, text=True, timeout=300)
    if p.returncode != 0:
        raise SystemExit("mysql(%s) failed: %s\nsql=%s" % (db, p.stderr[:300], sql[:200]))
    return p.stdout.strip()


def cols(db, table):
    out = q("information_schema",
            "SELECT COLUMN_NAME FROM COLUMNS WHERE TABLE_SCHEMA='%s' AND "
            "TABLE_NAME='%s' ORDER BY ORDINAL_POSITION" % (db, table))
    return out.split()


def clone_row(db, table, where, overrides):
    cs = cols(db, table)
    sel = ", ".join(overrides.get(c, "`%s`" % c) for c in cs)
    vals = q(db, "SELECT %s FROM %s WHERE %s" % (sel, table, where))
    collist = ", ".join("`%s`" % c for c in cs)
    return "INSERT INTO %s (%s) SELECT %s FROM %s WHERE %s" % (
        table, collist, sel, table, where), vals


def counts():
    reg = q("sik", "SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%%'")
    bil = q("sik", "SELECT COUNT(*) FROM billing b JOIN reg_periksa r ON "
                   "r.no_rawat=b.no_rawat WHERE r.no_rkm_medis LIKE 'DR%%'")
    led = q("sik_bench", "SELECT COUNT(*) FROM dr_charge_ledger")
    return reg, bil, led


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "verify":
        reg, bil, led = counts()
        s1 = q("sik", "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat IN ('%s','%s')" % (NR1, NR2))
        s2 = q("sik", "SELECT COUNT(*) FROM billing WHERE no_rawat IN ('%s','%s')" % (NR1, NR2))
        s3 = q("sik_bench", "SELECT COUNT(*) FROM dr_charge_ledger WHERE no_rawat IN ('%s','%s')" % (NR1, NR2))
        print("STATE reg_dr=%s billing_dr=%s ledger=%s | scratch: reg=%s billing=%s ledger=%s"
              % (reg, bil, led, s1, s2, s3))
        return 0
    if mode == "inject":
        reg, bil, led = counts()
        print("PRE-INJECT reg_dr=%s billing_dr=%s ledger=%s" % (reg, bil, led))
        ov1 = {"no_rawat": "'%s'" % NR1, "no_rkm_medis": "'%s'" % RKM,
               "tgl_registrasi": "'2026-10-05'"}
        sql, probe = clone_row("sik", "reg_periksa",
                               "no_rawat='%s'" % CLONE_REG, ov1)
        q("sik", sql)
        print("injected reg_periksa 899001 <- clone of %s (identity overridden)" % CLONE_REG)
        led_cols = cols("sik_bench", "dr_charge_ledger")
        base = {c: "NULL" for c in led_cols}
        base.update({"no_rawat": "'%s'" % NR1})
        # keep required non-null fields from a real ledger row shape
        sample = q("sik_bench", "SELECT * FROM dr_charge_ledger LIMIT 1")
        print("ledger columns: %s" % ",".join(led_cols))
        for comp, code, qty, unit, amt in (
                ("registration", "REG", 1, 99999.0, 99999.0),
                ("drug", "XX9999", 1, 500.0, 500.0)):
            vals = dict(base)
            vals.update({"component": "'%s'" % comp, "code": "'%s'" % code,
                         "qty": str(qty), "unit": str(unit), "amount": str(amt)})
            collist = ", ".join("`%s`" % c for c in led_cols)
            vallist = ", ".join(vals[c] for c in led_cols)
            q("sik_bench", "INSERT INTO dr_charge_ledger (%s) VALUES (%s)"
              % (collist, vallist))
        print("injected dr_charge_ledger: registration@99999 (wrong price), "
              "drug XX9999@500 (un-mappable code)")
        # billing: clone a Registrasi row, override amounts + identity
        bcols = cols("sik", "billing")
        sel = []
        for c in bcols:
            if c == "no_rawat":
                sel.append("'%s'" % NR1)
            elif c in ("biaya", "totalbiaya"):
                sel.append("10000")
            else:
                sel.append("`%s`" % c)
        collist = ", ".join("`%s`" % c for c in bcols)
        q("sik", "INSERT INTO billing (%s) SELECT %s FROM billing WHERE "
                 "no_rawat='%s' AND status='Registrasi' LIMIT 1"
              % (collist, ", ".join(sel), CLONE_REG))
        print("injected billing: Registrasi value row @10000 (mismatch vs ledger 99999)")
        reg, bil, led = counts()
        print("POST-INJECT reg_dr=%s billing_dr=%s ledger=%s" % (reg, bil, led))
        return 0
    if mode == "inject2":
        ov2 = {"no_rawat": "'%s'" % NR2, "no_rkm_medis": "'%s'" % RKM,
               "tgl_registrasi": "'2026-10-05'"}
        sql, _ = clone_row("sik", "reg_periksa",
                           "no_rawat='%s'" % CLONE_REG, ov2)
        q("sik", sql)
        print("injected reg_periksa 899002 (reg ONLY — unbilled fail path)")
        return 0
    if mode == "cleanup":
        q("sik", "DELETE FROM billing WHERE no_rawat IN ('%s','%s')" % (NR1, NR2))
        q("sik", "DELETE FROM reg_periksa WHERE no_rawat IN ('%s','%s')" % (NR1, NR2))
        q("sik_bench", "DELETE FROM dr_charge_ledger WHERE no_rawat IN ('%s','%s')"
          % (NR1, NR2))
        print("cleanup done (exact no_rawat scope: %s, %s)" % (NR1, NR2))
        return 0
    print("usage: r2_inject.py inject|cleanup|verify")
    return 2


if __name__ == "__main__":
    sys.exit(main())
