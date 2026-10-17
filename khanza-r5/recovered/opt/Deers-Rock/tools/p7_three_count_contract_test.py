#!/usr/bin/env python3
"""P7-3 contract test for three_count_reconcile_p2.main(): exit codes on fixture data.

The real main() runs; only its data sources are replaced by fixtures (no database read):
  1. A == C, B absent                          -> PARTIAL -> exit 0
  2. A == C, B absent, --verify-form-save      -> FAIL    -> exit 1
  3. A == C, B present and equal to C          -> PASS    -> exit 0
  4. A != C, B absent                          -> FAIL    -> exit 1
"""
import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
import three_count_reconcile_p2 as tc  # noqa: E402

COMP = {"registration": {"rows": 2, "amount": 20000}, "procedure": {"rows": 2, "amount": 150000},
        "drug": {"rows": 3, "amount": 5280}, "tax": {"rows": 2, "amount": 580}}
TOTAL = sum(v["amount"] for v in COMP.values())


def run(a, b, b_verified, argv):
    tc.dbutil.query = lambda *x, **k: [["2026/10/01/800085"], ["2026/10/01/800128"]]
    tc.count_consumer = lambda *x, **k: a
    tc.count_form_save = lambda *x, **k: (b, b_verified)
    tc.count_ledger = lambda *x, **k: COMP
    sys.argv = ["three_count_reconcile_p2.py"] + argv
    return tc.main()


worse = dict(COMP, drug={"rows": 3, "amount": 5281})
cases = [
    ("A==C, B absent", COMP, {}, False, [], 0),
    ("A==C, B absent, --verify-form-save", COMP, {}, False, ["--verify-form-save"], 1),
    ("A==C, B==C", COMP, {"note": {"rows": 2, "amount": TOTAL}}, True, [], 0),
    ("A!=C, B absent", worse, {}, False, [], 1),
]
bad = 0
for name, a, b, bv, argv, want in cases:
    got = run(a, b, bv, ["--stage", "P7T"] + argv)
    ok = got == want
    bad += 0 if ok else 1
    print("%s  %-40s exit=%s expected=%s" % ("PASS" if ok else "FAIL", name, got, want))
print("P7-3 CONTRACT %s (%d/%d)" % ("PASS" if bad == 0 else "FAIL", len(cases) - bad, len(cases)))
sys.exit(1 if bad else 0)
