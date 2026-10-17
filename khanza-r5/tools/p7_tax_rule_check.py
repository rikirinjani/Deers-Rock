#!/usr/bin/env python3
"""P7-5: does exact integer half-up tax ever differ from the consumer's double rounding?

Consumer (KhanzaBillingConsumer.java l.410): Math.round(subttl * 0.11) on a double, i.e.
floor(subttl * 0.11 + 0.5) in IEEE-754 doubles. Exact integer half-up: (subttl * 11 + 50) // 100.
Runs over every per-visit drug subtotal in the ledger (read-only) and lists any visit
where the two rules give different tax, plus the stored tax row(s) for comparison.

P8-B2: exits 1 when any DIFF, MISSING, STORED or DUPLICATE count is non-zero (it used to
print the counts and always exit 0). `--db` selects the ledger database (default
sik_bench) so a scratch fixture with a planted defect can prove the failing exit.
"""
import argparse
import math
import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
import dbutil  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--db", default="sik_bench")
db = ap.parse_args().db

rows = dbutil.query(db,
    "SELECT x.no_rawat, x.s, COUNT(t.no_rawat), CAST(SUM(t.amount) AS SIGNED) FROM "
    "(SELECT no_rawat, CAST(SUM(amount) AS SIGNED) s FROM dr_charge_ledger "
    " WHERE component='drug' GROUP BY no_rawat) x "
    "LEFT JOIN dr_charge_ledger t ON t.no_rawat=x.no_rawat AND t.component='tax' "
    "GROUP BY x.no_rawat, x.s",
    force_root=True)
diff, missing, mism_stored, dup = [], [], [], []
for nr, s, n_tax, stored in rows:
    s, n_tax = int(s), int(n_tax or 0)
    java = math.floor(s * 0.11 + 0.5)
    exact = (s * 11 + 50) // 100
    if java != exact:
        diff.append((nr, s, java, exact, stored))
    if exact > 0 and n_tax == 0:
        missing.append((nr, s, exact))
    if n_tax > 1:
        dup.append((nr, s, n_tax, stored))
    elif n_tax == 1 and int(stored) != java:
        mism_stored.append((nr, s, java, stored))
print("ledger db: %s" % db)
print("visits with drug rows: %d" % len(rows))
print("java-double vs exact-integer differences: %d" % len(diff))
for d in diff[:20]:
    print("  DIFF %s subtotal=%d java=%d exact=%d stored=%s" % d)
print("visits with drug subtotal > 0 but NO tax row: %d" % len(missing))
for m in missing[:20]:
    print("  MISSING %s subtotal=%d expected_tax=%d" % m)
print("visits with more than one tax row: %d" % len(dup))
for m in dup[:20]:
    print("  DUPLICATE %s subtotal=%d tax_rows=%d tax_sum=%s" % m)
print("stored tax != java rule: %d" % len(mism_stored))
for m in mism_stored[:20]:
    print("  STORED %s subtotal=%d java=%d stored=%s" % m)
bad = len(diff) + len(missing) + len(dup) + len(mism_stored)
print("TAX-RULE-CHECK %s (%d defects)" % ("PASS" if bad == 0 else "FAIL", bad))
sys.exit(0 if bad == 0 else 1)
