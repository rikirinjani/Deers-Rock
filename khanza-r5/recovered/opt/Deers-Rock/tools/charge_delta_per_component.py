#!/usr/bin/env python3
"""charge_delta_per_component.py — Phase 4 Stage A GATE G2: per-visit +
per-component charge delta between Khanza billing (sik.billing) and the DR
charge ledger (sik_bench.dr_charge_ledger).

Normalizations applied BEFORE the unexplained-delta test (documented, not
silent):
  - price-source: ledger drug unit price = databarang.ralan — the SAME tariff
    the DR export/consumer charges. detail_pemberian_obat.h_beli (purchase
    price) is deliberately NOT used (diverges on 287 visits).
  - tax: the consumer's PPN rows (nm_perawatan LIKE '%PPN%') are bucketed as
    'tax' and compared against ledger tax rows (11% per-visit drug subtotal,
    Java Math.round half-up). After bucketing, tax is an explained component,
    not an exemption.
  - structural rows (Ttl*, zero-value, ':') are never value rows (G1 brief
    item 10).

Gate: every per-visit, per-component delta must be exactly 0 (tolerance
Rp 0.005). Unexplained-delta count must be 0.

Usage: python3 charge_delta_per_component.py --stage A
"""
import os, sys, time, csv
import dbutil

RUN_ID = os.environ.get("RUN_ID", "test")
RDIR = os.path.join(dbutil.RESULTS_ROOT, RUN_ID)
CONSUMER_DB = "sik"
LEDGER_DB = "sik_bench"

PROC_STATUS = ("ralan dokter", "ranap dokter", "ralan dokter paramedis",
               "ranap dokter paramedis", "ralan paramedis", "ranap paramedis")
COMPONENTS = ("registration", "procedure", "drug", "tax")
TOL = 0.005


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


def khanza_matrix(in_clause):
    """Per-visit per-component totals from sik.billing value rows."""
    m = {}
    for status, nm, nr, tb in dbutil.query(CONSUMER_DB,
        "SELECT status, nm_perawatan, no_rawat, totalbiaya FROM billing "
        "WHERE no_rawat IN (%s) AND (biaya>0 OR totalbiaya>0) "
        "AND status NOT LIKE 'Ttl%%'" % in_clause):
        c = bucket(status, nm)
        m.setdefault(nr, {}).setdefault(c, 0.0)
        m[nr][c] += float(tb or 0)
    return m


def ledger_matrix(in_clause):
    """Per-visit per-component totals from the DR ledger."""
    m = {}
    for nr, comp, amt in dbutil.query(LEDGER_DB,
        "SELECT no_rawat, component, amount FROM dr_charge_ledger "
        "WHERE no_rawat IN (%s)" % in_clause):
        m.setdefault(nr, {}).setdefault(comp, 0.0)
        m[nr][comp] += float(amt or 0)
    return m


def main():
    attempt = "A"
    argv = sys.argv[1:]
    if "--stage" in argv:
        i = argv.index("--stage")
        if i + 1 < len(argv):
            attempt = argv[i + 1]
    tool = dbutil.Tool("stageA_charge_delta_%s" % attempt)
    os.makedirs(RDIR, exist_ok=True)
    t0 = time.time()
    tool.log("=== Stage A charge delta per component (Khanza sik vs DR ledger) ===")

    nr = get_dr_visits()
    in_clause = ",".join("'%s'" % n for n in nr)
    tool.log("DR visits: %d" % len(nr))

    kx, dr = khanza_matrix(in_clause), ledger_matrix(in_clause)
    if not any(dr.values()):
        tool.log("FAIL: DR ledger empty — run load_354_dr_visits.py first")
        return 1

    kx_total = sum(sum(v.values()) for v in kx.values())
    dr_total = sum(sum(v.values()) for v in dr.values())
    overall = kx_total - dr_total
    tool.log("Khanza total: %.0f (%d visits) | DR ledger total: %.0f (%d visits) | "
             "overall delta: %.0f" % (kx_total, len(kx), dr_total, len(dr), overall))

    # Per-component totals
    comp_kx = {c: sum(v.get(c, 0.0) for v in kx.values()) for c in COMPONENTS}
    comp_dr = {c: sum(v.get(c, 0.0) for v in dr.values()) for c in COMPONENTS}
    for c in COMPONENTS:
        tool.log("  %s: khanza=%.0f ledger=%.0f delta=%.0f"
                 % (c, comp_kx[c], comp_dr[c], comp_kx[c] - comp_dr[c]))

    # Per-visit per-component deltas (post-normalization residual = unexplained)
    unexplained, per_visit_rows = [], []
    for v in sorted(set(nr)):
        kv, dv = kx.get(v, {}), dr.get(v, {})
        for c in COMPONENTS:
            d = kv.get(c, 0.0) - dv.get(c, 0.0)
            if abs(d) > TOL:
                unexplained.append((v, c, kv.get(c, 0.0), dv.get(c, 0.0), d))
        per_visit_rows.append((v, kv, dv))

    tool.log("normalizations: price-source=databarang.ralan (both sides); "
             "tax=11%% half-up bucketed as component; Ttl*/zero rows excluded")
    tool.log("unexplained-delta count: %d (threshold: >Rp 0 fails)"
             % len(unexplained))
    for v, c, k, d, delta in unexplained[:10]:
        tool.log("  UNEXPLAINED %s %s: khanza=%.0f ledger=%.0f delta=%.0f"
                 % (v, c, k, d, delta))
    gate_pass = (len(unexplained) == 0) and abs(overall) <= TOL
    tool.log("gate (all deltas == 0): %s" % ("PASS" if gate_pass else "FAIL"))

    rep = os.path.join(RDIR, "stageA_G2_validation.md")
    with open(rep, "a") as f:
        f.write("\n# Stage A charge delta per component @ %s\n"
                % time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        f.write("- DR visits: %d\n- Khanza total: %.0f\n- DR ledger total: %.0f\n"
                "- Overall delta: %.0f\n- Unexplained deltas: %d\n"
                % (len(nr), kx_total, dr_total, overall, len(unexplained)))
        f.write("| component | khanza | ledger | delta |\n|---|---|---|---|\n")
        for c in COMPONENTS:
            f.write("| %s | %.0f | %.0f | %.0f |\n"
                    % (c, comp_kx[c], comp_dr[c], comp_kx[c] - comp_dr[c]))
        f.write("- normalizations: price-source databarang.ralan both sides; "
                "tax bucketed as component; structural rows excluded\n")
        if unexplained:
            f.write("\n## Unexplained per-visit deltas (top 20 by |delta|)\n")
            f.write("| no_rawat | component | khanza | ledger | delta |\n|---|---|---|---|---|\n")
            for v, c, k, d, delta in sorted(unexplained, key=lambda x: -abs(x[4]))[:20]:
                f.write("| %s | %s | %.0f | %.0f | %.0f |\n" % (v, c, k, d, delta))
        f.write("- gate (unexplained delta == 0): %s\n" % ("PASS" if gate_pass else "FAIL"))
    tool.log("wrote %s" % rep)

    csv_path = os.path.join(RDIR, "stageA_charge_delta_per_visit.csv")
    with open(csv_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["no_rawat"] + ["khanza_%s" % c for c in COMPONENTS]
                   + ["ledger_%s" % c for c in COMPONENTS]
                   + ["delta_%s" % c for c in COMPONENTS])
        for v, kv, dv in per_visit_rows:
            w.writerow([v] + ["%.2f" % kv.get(c, 0.0) for c in COMPONENTS]
                       + ["%.2f" % dv.get(c, 0.0) for c in COMPONENTS]
                       + ["%.2f" % (kv.get(c, 0.0) - dv.get(c, 0.0)) for c in COMPONENTS])
    tool.log("per-visit CSV: %s" % csv_path)
    tool.log("=== charge delta %s in %.0fs ===" % ("PASS" if gate_pass else "FAIL", time.time() - t0))
    return 0 if gate_pass else 1


if __name__ == "__main__":
    sys.exit(main())
