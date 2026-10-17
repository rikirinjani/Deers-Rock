#!/usr/bin/env python3
"""P7-5: does exact integer half-up tax ever differ from the consumer's double rounding?

Consumer (KhanzaBillingConsumer.java l.410): Math.round(subttl * 0.11) on a double, i.e.
floor(subttl * 0.11 + 0.5) in IEEE-754 doubles. Exact integer half-up: (subttl * 11 + 50) // 100.
Runs over every per-visit drug subtotal in the live ledger (read-only) and lists any visit
where the two rules give different tax, plus the stored tax row for comparison.
"""
import math
import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
import dbutil  # noqa: E402

rows = dbutil.query("sik_bench",
    "SELECT d.no_rawat, CAST(SUM(d.amount) AS SIGNED), "
    "(SELECT CAST(t.amount AS SIGNED) FROM dr_charge_ledger t WHERE t.no_rawat=d.no_rawat "
    "AND t.component='tax') FROM dr_charge_ledger d WHERE d.component='drug' GROUP BY d.no_rawat",
    force_root=True)
diff, missing, mism_stored = [], [], []
for nr, s, stored in rows:
    s = int(s)
    java = math.floor(s * 0.11 + 0.5)
    exact = (s * 11 + 50) // 100
    if java != exact:
        diff.append((nr, s, java, exact, stored))
    if exact > 0 and stored is None:
        missing.append((nr, s, exact))
    if stored is not None and int(stored) != java:
        mism_stored.append((nr, s, java, stored))
print("visits with drug rows: %d" % len(rows))
print("java-double vs exact-integer differences: %d" % len(diff))
for d in diff[:20]:
    print("  DIFF %s subtotal=%d java=%d exact=%d stored=%s" % d)
print("visits with drug subtotal > 0 but NO tax row: %d" % len(missing))
for m in missing[:20]:
    print("  MISSING %s subtotal=%d expected_tax=%d" % m)
print("stored tax != java rule: %d" % len(mism_stored))
for m in mism_stored[:20]:
    print("  STORED %s subtotal=%d java=%d stored=%s" % m)
