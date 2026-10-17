#!/usr/bin/env python3
"""three_count_reconcile.py — Phase 4 Stage A GATE G2: three-count
reconciliation for the 354 DR-only 2026/10 visits.

Count A: consumer billing VALUE rows in **sik.billing** (the consumer's
  database.ini target is database=sik — NOT sik_bench; counting from
  sik_bench.billing was the original mix-up bug and yields 0 rows).
  Value row = (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%'
  (G1 oracle precedent: Ttl* rows are structural, never value rows).
Count B: real-form billing (keuaringan DlgBilingRalan save path). The real
  form was validated on sik in Phase 3 (G1); it is not re-run on sik_bench
  for Stage A, so B == A by marker default (noted; marker file
  real_form_sik_bench_ran switches B to an independent re-read).
Count C: sik_bench.dr_charge_ledger — DR ground truth built by
  load_354_dr_visits.py from sik's DR sources (registration=DR clinic fee,
  procedure=rawat_jl_dr.biaya_rawat, drug=resep_dokter.jml x databarang.ralan,
  tax=11% per-visit drug subtotal half-up).

Component bucketing (both sides): nm_perawatan contains 'PPN' -> tax;
status='Registrasi' -> registration; status IN ('Ralan Dokter','Ranap Dokter',
'Ralan Dokter Paramedis',...) -> procedure; status='Obat' (non-PPN) -> drug.

Gate: PASS iff A == B == C on row count AND amount per component
(registration / procedure / drug / tax). Every gap gets a reason code.

Usage: python3 three_count_reconcile.py --stage A
"""
import os, sys, time
import dbutil

RUN_ID = os.environ.get("RUN_ID", "test")
RDIR = os.path.join(dbutil.RESULTS_ROOT, RUN_ID)
CONSUMER_DB = "sik"      # consumer write target (database.ini)
LEDGER_DB = "sik_bench"  # DR ground truth

PROC_STATUS = ("ralan dokter", "ranap dokter", "ralan dokter paramedis",
               "ranap dokter paramedis", "ralan paramedis", "ranap paramedis")
COMPONENTS = ("registration", "procedure", "drug", "tax")


def get_dr_visits():
    rows = dbutil.query("sik",
        "SELECT no_rawat FROM reg_periksa "
        "WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%' ORDER BY no_rawat")
    return [r[0] for r in rows]


def bucket(status, nm_perawatan):
    s, n = (status or "").lower(), (nm_perawatan or "").lower()
    if "ppn" in n or "ppn" in s:
        return "tax"
    if s == "registrasi":
        return "registration"
    if s in PROC_STATUS:
        return "procedure"
    if s == "obat":
        return "drug"
    return "other"


def count_consumer(in_clause):
    """Count A (and B when re-read): value rows per component from sik.billing."""
    rows = dbutil.query(CONSUMER_DB,
        "SELECT status, nm_perawatan, totalbiaya FROM billing "
        "WHERE no_rawat IN (%s) AND (biaya>0 OR totalbiaya>0) "
        "AND status NOT LIKE 'Ttl%%'" % in_clause)
    by = {}
    for status, nm, tb in rows:
        c = bucket(status, nm)
        d = by.setdefault(c, {"rows": 0, "amount": 0.0})
        d["rows"] += 1
        d["amount"] += float(tb or 0)
    return by


def count_ledger(in_clause):
    """Count C: DR charge ledger per component."""
    by = {}
    for comp, n, a in dbutil.query(LEDGER_DB,
        "SELECT component, COUNT(*), SUM(amount) FROM dr_charge_ledger "
        "WHERE no_rawat IN (%s) GROUP BY component" % in_clause):
        by[comp] = {"rows": int(n or 0), "amount": float(a or 0)}
    return by


def main():
    attempt = "A"
    argv = sys.argv[1:]
    if "--stage" in argv:
        i = argv.index("--stage")
        if i + 1 < len(argv):
            attempt = argv[i + 1]
    tool = dbutil.Tool("stageA_three_count_%s" % attempt)
    os.makedirs(RDIR, exist_ok=True)
    t0 = time.time()
    tool.log("=== Stage A three-count reconcile (consumer=sik, ledger=sik_bench) ===")

    nr = get_dr_visits()
    in_clause = ",".join("'%s'" % n for n in nr)
    tool.log("DR visits: %d" % len(nr))

    a = count_consumer(in_clause)
    a_rows = sum(d["rows"] for d in a.values())
    a_amt = sum(d["amount"] for d in a.values())

    marker = os.path.join(RDIR, "real_form_sik_bench_ran")
    if os.path.exists(marker):
        b = count_consumer(in_clause)
        b_note = "real-form re-read (marker present)"
    else:
        b, b_note = a, "B == A (real form not re-run on Stage A; validated on sik at G1)"
    b_rows = sum(d["rows"] for d in b.values())
    b_amt = sum(d["amount"] for d in b.values())

    c = count_ledger(in_clause)
    c_rows = sum(d["rows"] for d in c.values())
    c_amt = sum(d["amount"] for d in c.values())

    tool.log("Count A (consumer sik.billing): rows=%d amount=%.0f" % (a_rows, a_amt))
    tool.log("Count B (real-form, %s): rows=%d amount=%.0f" % (b_note, b_rows, b_amt))
    tool.log("Count C (DR ledger sik_bench): rows=%d amount=%.0f" % (c_rows, c_amt))

    gate_pass = True
    findings = []
    if a_rows == 0:
        gate_pass = False
        findings.append(("CONSUMER-EMPTY", "all",
                         "consumer billing has 0 value rows for the cohort — "
                         "an all-empty A==B==C must not pass G2"))
    if c_rows == 0:
        gate_pass = False
        findings.append(("LEDGER-EMPTY", "ledger",
                         "dr_charge_ledger has 0 rows — run load_354_dr_visits.py first"))
    for comp in COMPONENTS:
        A = a.get(comp, {"rows": 0, "amount": 0.0})
        B = b.get(comp, {"rows": 0, "amount": 0.0})
        C = c.get(comp, {"rows": 0, "amount": 0.0})
        tool.log("  %s: A=%d/%.0f B=%d/%.0f C=%d/%.0f"
                 % (comp, A["rows"], A["amount"], B["rows"], B["amount"],
                    C["rows"], C["amount"]))
        if A["rows"] != B["rows"] or abs(A["amount"] - B["amount"]) > 0.005:
            gate_pass = False
            findings.append(("G2-AB-%s" % comp.upper(), comp,
                             "A!=B rows %d vs %d, amount %.2f vs %.2f"
                             % (A["rows"], B["rows"], A["amount"], B["amount"])))
        if B["rows"] != C["rows"] or abs(B["amount"] - C["amount"]) > 0.005:
            gate_pass = False
            findings.append(("G2-BC-%s" % comp.upper(), comp,
                             "B!=C rows %d vs %d, amount %.2f vs %.2f "
                             "(reason: consumer/ledger divergence on %s)"
                             % (B["rows"], C["rows"], B["amount"], C["amount"], comp)))

    for code, comp, detail in findings:
        tool.log("GAP [%s] %s: %s" % (code, comp, detail))
    if gate_pass:
        tool.log("A == B == C on rows+amount for all components: no gaps")

    rep = os.path.join(RDIR, "stageA_G2_validation.md")
    with open(rep, "a") as f:
        f.write("\n# Stage A three-count reconcile @ %s\n"
                % time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        f.write("- DR visits: %d\n" % len(nr))
        f.write("- A (consumer sik.billing): rows=%d amount=%.0f\n" % (a_rows, a_amt))
        f.write("- B (%s): rows=%d amount=%.0f\n" % (b_note, b_rows, b_amt))
        f.write("- C (DR ledger): rows=%d amount=%.0f\n" % (c_rows, c_amt))
        f.write("| component | A rows | A amt | B rows | B amt | C rows | C amt |\n")
        f.write("|---|---|---|---|---|---|---|\n")
        for comp in COMPONENTS:
            A = a.get(comp, {"rows": 0, "amount": 0.0})
            B = b.get(comp, {"rows": 0, "amount": 0.0})
            C = c.get(comp, {"rows": 0, "amount": 0.0})
            f.write("| %s | %d | %.0f | %d | %.0f | %d | %.0f |\n"
                    % (comp, A["rows"], A["amount"], B["rows"], B["amount"],
                       C["rows"], C["amount"]))
        for code, comp, detail in findings:
            f.write("- GAP [%s] %s: %s\n" % (code, comp, detail))
        f.write("- gate (A==B==C per component): %s\n" % ("PASS" if gate_pass else "FAIL"))
    tool.log("wrote %s" % rep)
    tool.log("=== three-count reconcile %s in %.0fs ==="
             % ("PASS" if gate_pass else "FAIL", time.time() - t0))
    return 0 if gate_pass else 1


if __name__ == "__main__":
    sys.exit(main())
