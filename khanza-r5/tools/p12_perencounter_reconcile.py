#!/usr/bin/env python3
"""P12: per-ENCOUNTER reconciliation of the three sources, READ-ONLY (SELECT only).

The existing three-count gate compares TOTALS per component, so offsetting errors between
encounters cancel. This tool compares the same quantities encounter by encounter:

  A = consumer/form `sik.billing` value rows       (bucketed like three_count_reconcile_p2.bucket)
  B = form-save `sik.detail_nota_jalan` paid sum   (besar_bayar + besarppn, exact Decimal half-up)
  C = DR ground-truth ledger `sik_bench.dr_charge_ledger`

Checks (each over an explicit, printed encounter set):
  S1  A vs C, every DR encounter, per component: rows and amount equal
  S2  B vs C, the encounters that HAVE form-save rows (identical set on both sides):
      paid sum == ledger total; B vs A likewise
  S3  the R4 sample (`--sample-csv` of r4_b2_1000): coverage by B, and A vs C on those encounters
Exit 0 = every comparison equal; 1 = any difference (details in --out CSV); 2 = bad input.
Writes nothing to any database. Usage:
  python3 p12_perencounter_reconcile.py [--sample-csv r4.csv] [--out diffs.csv]
"""
import csv
import os
import sys
from decimal import Decimal, ROUND_HALF_UP

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil  # noqa: E402
from three_count_reconcile_p2 import bucket  # noqa: E402

# test override (negative control): point the ledger at a scratch copy; defaults are the live DBs
CONSUMER_DB = os.environ.get("P12_CONSUMER_DB", "sik")
LEDGER_DB = os.environ.get("P12_LEDGER_DB", "sik_bench")
COMPS = ("registration", "procedure", "drug", "tax", "other")


def q(db, sql):
    assert sql.lstrip().upper().startswith("SELECT"), "read-only tool"
    return dbutil.query(db, sql)


def main():
    argv = sys.argv[1:]
    sample_csv = argv[argv.index("--sample-csv") + 1] if "--sample-csv" in argv else None
    out = argv[argv.index("--out") + 1] if "--out" in argv else "/tmp/p12_perencounter_diffs.csv"
    diffs = []
    dr = {r[0] for r in q(CONSUMER_DB, "SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%'")}
    print("DR encounters in sik.reg_periksa: %d" % len(dr))

    # A
    A = {}
    for nr, status, nm, tb in q(CONSUMER_DB,
            "SELECT b.no_rawat, b.status, b.nm_perawatan, CAST(b.totalbiaya AS SIGNED) "
            "FROM billing b JOIN reg_periksa r ON r.no_rawat=b.no_rawat "
            "WHERE r.no_rkm_medis LIKE 'DR%' AND (b.biaya>0 OR b.totalbiaya>0) "
            "AND b.status NOT LIKE 'Ttl%'"):
        d = A.setdefault(nr, {}).setdefault(bucket(status, nm), [0, 0])
        d[0] += 1
        d[1] += int(tb or 0)
    # C
    C = {}
    for nr, comp, n, a in q(LEDGER_DB,
            "SELECT no_rawat, component, COUNT(*), SUM(amount) FROM dr_charge_ledger "
            "GROUP BY no_rawat, component"):
        C.setdefault(nr, {})[comp] = [int(n or 0), int(a or 0)]
    # B
    B = {}
    for nr, paid in q(CONSUMER_DB,
            "SELECT no_rawat, SUM(COALESCE(besar_bayar,0)+COALESCE(besarppn,0)) "
            "FROM detail_nota_jalan GROUP BY no_rawat"):
        B[nr] = int(Decimal(str(paid if paid is not None else 0)).quantize(Decimal(1), rounding=ROUND_HALF_UP))

    ok = True

    # S1 A vs C per encounter per component
    s1_bad = 0
    ledger_enc = set(C)
    print("S1 set: DR encounters %d | with ledger rows %d | with billing rows %d"
          % (len(dr), len(ledger_enc & dr), len(set(A) & dr)))
    for nr in sorted(dr | ledger_enc):
        a, c = A.get(nr, {}), C.get(nr, {})
        for comp in COMPS:
            av, cv = a.get(comp, [0, 0]), c.get(comp, [0, 0])
            if av != cv:
                s1_bad += 1
                diffs.append(("S1", nr, comp, av[0], av[1], cv[0], cv[1]))
    print("S1 A vs C per encounter x component: %d differences" % s1_bad)
    ok &= (s1_bad == 0)

    # S2 B vs C on the form-saved set
    sb = sorted(set(B) & dr)
    print("S2 set: encounters with detail_nota_jalan rows (identical set for B, A, C): %d" % len(sb))
    s2c = s2a = 0
    for nr in sb:
        ctot = sum(v[1] for v in C.get(nr, {}).values())
        atot = sum(v[1] for v in A.get(nr, {}).values())
        if B[nr] != ctot:
            s2c += 1
            diffs.append(("S2_B_vs_C", nr, "total", 1, B[nr], 0, ctot))
        if B[nr] != atot:
            s2a += 1
            diffs.append(("S2_B_vs_A", nr, "total", 1, B[nr], 0, atot))
    print("S2 B(paid) vs C(total) per encounter: %d of %d differ" % (s2c, len(sb)))
    print("S2 B(paid) vs A(total) per encounter: %d of %d differ" % (s2a, len(sb)))
    ok &= (s2c == 0 and s2a == 0)

    # S3 R4 sample
    if sample_csv:
        smp = [r["no_rawat"] for r in csv.DictReader(open(sample_csv, encoding="utf-8"))]
        sset = set(smp)
        inb = sset & set(B)
        bad = [nr for nr in sset if any(A.get(nr, {}).get(c, [0, 0]) != C.get(nr, {}).get(c, [0, 0]) for c in COMPS)]
        print("S3 R4 sample: %d visits (%d unique); with form-save rows (B available): %d; "
              "A vs C per-encounter differences: %d" % (len(smp), len(sset), len(inb), len(bad)))
        ok &= (len(bad) == 0)

    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["check", "no_rawat", "component", "left_rows", "left_amount", "right_rows", "right_amount"])
        w.writerows(diffs)
    print("differences written: %d -> %s" % (len(diffs), out))
    print("RESULT: %s" % ("ALL-EQUAL" if ok else "DIFFERENCES"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
