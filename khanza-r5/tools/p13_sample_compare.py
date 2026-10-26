#!/usr/bin/env python3
"""P13 T3: per-encounter comparison of form output vs consumer vs ledger on a P13 clone.

For each sampled encounter (from the visits file, in the clone after the form run):
  A_form = sik_p13w.billing value rows, bucketed like three_count_reconcile_p2.bucket
  B      = sik_p13w.detail_nota_jalan (besar_bayar + besarppn, exact Decimal half-up)
  C      = sik_bench.dr_charge_ledger per component (rows and amount)
  Fresh-B check: exactly one detail_nota_jalan INSERT written by benchmark@localhost
                  for this visit (from the p7_write_audit trigger table).

Batched: all A, B, C, audit rows are fetched in a small number of queries (not
one per visit), so N=3000 completes in reasonable time. The per-encounter
bucketing is done in Python exactly like p12_perencounter_reconcile.py.

Exit 0 only if every encounter is equal on all three.
Exit 1 if any encounter differs (per-encounter CSV with the raw rows).
Exit 2 if bad input.

Usage:
  python3 p13_sample_compare.py <visits-file> --db sik_p13w [--out CSV]

No writes to any database. SELECT only.
"""
import csv
import os
import sys
from decimal import Decimal, ROUND_HALF_UP

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil  # noqa: E402
from three_count_reconcile_p2 import bucket  # noqa: E402

COMPS = ("registration", "procedure", "drug", "tax", "other")
LEDGER_DB = os.environ.get("P13_LEDGER_DB", "sik_bench")
IN_CHUNK = 500  # split the IN() clause into chunks so no query gets absurdly long


def q(db, sql):
    assert sql.lstrip().upper().startswith("SELECT"), "read-only tool"
    return dbutil.query(db, sql, timeout=600)


def in_chunks(nrs, chunk=IN_CHUNK):
    for i in range(0, len(nrs), chunk):
        yield i, nrs[i:i + chunk]


def fetch_all(cl, nrs):
    """Batch-fetch A_form rows, B rows, and audit counts for every sampled encounter."""
    A = {}
    B = {}
    for _, chunk in in_chunks(nrs):
        inl = ",".join("'%s'" % n for n in chunk)
        # A_form: value rows per encounter, per component
        for nr, status, nm, tb in q(cl,
                "SELECT no_rawat, status, nm_perawatan, CAST(totalbiaya AS SIGNED) "
                "FROM billing WHERE no_rawat IN (%s) "
                "AND (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%%'" % inl):
            d = A.setdefault(nr, {}).setdefault(bucket(status, nm), [0, 0])
            d[0] += 1
            d[1] += int(tb or 0)
        # B: paid sums per encounter
        for row in q(cl,
                "SELECT no_rawat, SUM(besar_bayar+besarppn), COUNT(*), "
                "SUM(besar_bayar IS NULL OR besarppn IS NULL) "
                "FROM detail_nota_jalan WHERE no_rawat IN (%s) GROUP BY no_rawat" % inl):
            if int(Decimal(str(row[3] or 0))):   # P16 B3 (N4): a NULL payment is an input error, never 0
                print("INPUT-ERROR: NULL payment column in detail_nota_jalan for %s" % row[0])
                sys.exit(2)
            p = row[1] if row[1] is not None else 0
            B[row[0]] = [int(Decimal(str(p)).quantize(Decimal(1), rounding=ROUND_HALF_UP)),
                         int(row[2] or 0)]
    return A, B


def fetch_c(nrs):
    """Batch-fetch C (ledger) per encounter, per component."""
    C = {}
    for _, chunk in in_chunks(nrs):
        inl = ",".join("'%s'" % n for n in chunk)
        for nr, comp, n, a in q(LEDGER_DB,
                "SELECT no_rawat, component, COUNT(*), SUM(amount) FROM dr_charge_ledger "
                "WHERE no_rawat IN (%s) GROUP BY no_rawat, component" % inl):
            C.setdefault(nr, {})[comp] = [int(n or 0), int(a or 0)]
    return C


def fetch_audit(cl, nrs, since=None):
    """Batch-fetch the audit-table fresh-B counts: total detail_nota_jalan INSERTs
    and how many were written by benchmark@localhost (P15 B5: only rows at or after
    `since`, the run start, when given)."""
    audit = {}
    win = ("at >= '%s'" % since) if since else "1"   # P16 B2: all INSERTs counted, the window counted apart
    for _, chunk in in_chunks(nrs):
        inl = ",".join("'%s'" % n for n in chunk)
        for nr, cnt, bcnt, wcnt in q(cl,
                "SELECT no_rawat, COUNT(*), "
                "SUM(CASE WHEN acct LIKE CONCAT('benchmark@', CHAR(37)) THEN 1 ELSE 0 END), SUM(%s) "
                "FROM p7_write_audit "
                "WHERE tbl='detail_nota_jalan' AND op='INSERT' AND no_rawat IN (%s) "
                "GROUP BY no_rawat" % (win, inl)):
            audit[nr] = [int(cnt or 0), int(bcnt or 0), int(wcnt or 0)]
    return audit


def main():
    argv = sys.argv[1:]
    if not argv or argv[0].startswith("--"):
        print("usage: p13_sample_compare.py <visits-file> --db <clone> [--out CSV] [--since 'Y-m-d H:M:S.f']")
        return 2
    visits_file = argv[0]
    cl = argv[argv.index("--db") + 1] if "--db" in argv else "sik_p13w"
    out = argv[argv.index("--out") + 1] if "--out" in argv else "/tmp/p13_compare_diffs.csv"
    since = argv[argv.index("--since") + 1] if "--since" in argv else None
    if since is None and "--no-fresh-b" not in argv:   # P17 B4: freshness needs a run start
        print("INPUT-ERROR: --since is required for fresh-B (or pass --no-fresh-b)")
        return 2

    with open(visits_file) as f:
        nrs = [l.strip() for l in f if l.strip()]
    if not nrs:
        print("no visits in %s" % visits_file)
        return 2
    if len(set(nrs)) != len(nrs):   # P15 B4: a duplicate is an input error, not silently merged
        print("duplicate visits in %s (%d listed, %d unique)" % (visits_file, len(nrs), len(set(nrs))))
        return 2
    nrs = sorted(nrs)
    print("fetching A/B/audit for %d encounters from %s ..." % (len(nrs), cl))
    A, B = fetch_all(cl, nrs)
    print("fetching C for %d encounters from %s ..." % (len(nrs), LEDGER_DB))
    C = fetch_c(nrs)

    ok = True
    with_b = 0
    a_eq = 0
    b_eq = 0
    fresh_ok = 0
    diffs = []
    diffs.append(("A_vs_C", None, None, 0, 0, 0, 0))  # placeholder removed below
    diffs = []

    for nr in nrs:
        a = A.get(nr, {})
        c = C.get(nr, {})

        # A_form == C per component
        a_match = True
        for comp in COMPS:
            av = a.get(comp, [0, 0])
            cv = c.get(comp, [0, 0])
            if av != cv:
                a_match = False
                diffs.append(("A_vs_C", nr, comp, av[0], av[1], cv[0], cv[1]))
        if a_match:
            a_eq += 1
        else:
            ok = False

        # B == C total
        btot, brow_count = B.get(nr, [0, 0])
        ctot = sum(v[1] for v in c.values())
        if btot == ctot:
            b_eq += 1
        else:
            ok = False
            diffs.append(("B_vs_C", nr, "total", brow_count, btot,
                          sum(v[0] for v in c.values()), ctot))
        if brow_count > 0:
            with_b += 1

    print("fetching audit (fresh-B) for %d encounters ..." % len(nrs))
    audit = fetch_audit(cl, nrs, since) if "--no-fresh-b" not in argv else {}
    for nr in (nrs if "--no-fresh-b" not in argv else []):
        cnt, bcnt, wcnt = audit.get(nr, [0, 0, 0])
        if bcnt == 1 and cnt == 1 and wcnt == 1:   # P16 B2: exactly one in total, by benchmark@, at/after the run start
            fresh_ok += 1
        else:
            ok = False
            diffs.append(("FRESH_B", nr, "audit", 0, cnt, 0, bcnt))

    # Per-encounter CSV
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["check", "no_rawat", "component",
                    "left_rows", "left_amount", "right_rows", "right_amount"])
        w.writerows(diffs)

    print("P13 compare: %d encounters | with B: %d | A_form==C: %d/%d | B==C: %d/%d | "
          "fresh-B(benchmark,1): %d/%d | differences: %d -> %s"
          % (len(nrs), with_b, a_eq, len(nrs), b_eq, len(nrs),
             fresh_ok, len(nrs), len(diffs), out))
    print("RESULT: %s" % ("ALL-EQUAL" if ok else "DIFFERENCES"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
