#!/usr/bin/env python3
"""charge_delta_per_component.py — P2: per-visit + per-component charge delta between
Khanza billing (sik.billing) and the DR charge ledger (sik_bench.dr_charge_ledger),
with full-window + cohort parameterization, integer rupiah, and an explicit
unknown-status ('other') gate.

Normalizations (documented, not silent):
  - price-source: ledger drug unit price = dr_tariff authority when present, else
    databarang.h_beli (the DR tariff the consumer charges). Never the purchase price.
  - tax: the consumer's PPN rows (nm_perawatan LIKE '%PPN%') are bucketed as 'tax'
    and compared against ledger tax rows (11% per-visit drug subtotal, half-up).
  - structural rows (Ttl*, zero-value, ':') are never value rows.
  - unknown-status rows (status not in any known component) are bucketed 'other' and
    GATED (must be 0), not silently dropped (fix P2-7).

P2 changes vs the legacy tool:
  Integer rupiah (fix P2-5): all sums are integer; tolerance Rp 0 on integers.
  Window/cohort (fix P2-3): --window {2026-10|ALL}, --cohort {dr|all}; the default
    (2026-10, dr) reproduces the canonical Stage-A result exactly.
  Chunked IN-lists for ALL windows (no single giant literal; safe at full scale).

Gate: every per-visit, per-component delta must be exactly 0; unexplained-delta
count must be 0; 'other' bucket count must be 0.

Usage: python3 charge_delta_per_component.py --stage A [--window 2026-10|ALL]
       [--cohort dr|all]
"""
import os, sys, time, csv
import dbutil

RUN_ID = os.environ.get("RUN_ID", "test")
RDIR = os.path.join(dbutil.RESULTS_ROOT, RUN_ID)
# P2 test override: run the gate against a scratch DB pair (adversarial fixture).
CONSUMER_DB = os.environ.get("P2_CONSUMER_DB", "sik")
LEDGER_DB = os.environ.get("P2_LEDGER_DB", "sik_bench")
CHUNK = 1500  # no_rawat per IN-list (chunked, not one giant literal)

PROC_STATUS = ("ralan dokter", "ranap dokter", "ralan dokter paramedis",
               "ranap dokter paramedis", "ralan paramedis", "ranap paramedis")
COMPONENTS = ("registration", "procedure", "drug", "tax")
# P4-LD: only the components that have consumer billing rows with a meaningful
# per-line quantity are line-diffable. Registration is a DR-clinic fee with no
# sik.billing value row (khanza_qty is always 0); tax rows carry jumlah=0. Both
# are amount-gated only; line-diffing them yields schema false-positives.
LINE_DIFF_COMPONENTS = ("procedure", "drug")
TOL = 0  # integer rupiah tolerance


def window_predicate(window):
    return ("no_rawat LIKE '____/__/__/8_____%" if window == "ALL"
            else "no_rawat LIKE '2026/10/%'")


def cohort_predicate(cohort):
    return "no_rkm_medis LIKE 'DR%'" if cohort == "dr" else "1=1"


def get_dr_visits(window, cohort):
    return [r[0] for r in dbutil.query(CONSUMER_DB,
        "SELECT no_rawat FROM reg_periksa WHERE %s AND %s ORDER BY no_rawat"
        % (window_predicate(window), cohort_predicate(cohort)))]


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


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


def khanza_matrix(nrs):
    """Per-visit per-component integer totals from sik.billing value rows."""
    m = {}
    for inl in chunked(nrs, CHUNK):
        clause = ",".join("'%s'" % x for x in inl)
        for status, nm, nr, tb in dbutil.query(CONSUMER_DB,
            "SELECT status, nm_perawatan, no_rawat, CAST(totalbiaya AS SIGNED) FROM billing "
            "WHERE no_rawat IN (%s) AND (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%%'"
            % clause):
            c = bucket(status, nm)
            m.setdefault(nr, {}).setdefault(c, 0)
            m[nr][c] += int(tb or 0)
    return m


def khanza_qty_matrix(nrs):
    """P4-LD: per-visit per-component integer QUANTITY totals from sik.billing
    (`jumlah`). The billing table has no code column, so the independent
    line-granularity signal is quantity-by-component — it catches
    same-price wrong-quantity / wrong-code-quantity swaps that the per-visit
    *amount* gate (khanza_matrix) is blind to."""
    m = {}
    for inl in chunked(nrs, CHUNK):
        clause = ",".join("'%s'" % x for x in inl)
        for status, nm, nr, jml in dbutil.query(CONSUMER_DB,
            "SELECT status, nm_perawatan, no_rawat, COALESCE(jumlah,0) FROM billing "
            "WHERE no_rawat IN (%s) AND (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%%'"
            % clause):
            c = bucket(status, nm)
            m.setdefault(nr, {}).setdefault(c, 0)
            m[nr][c] += int(jml or 0)
    return m


def ledger_qty_matrix(nrs):
    """P4-LD: per-visit per-component integer quantity totals from the ledger."""
    m = {}
    for inl in chunked(nrs, CHUNK):
        clause = ",".join("'%s'" % x for x in inl)
        for nr, comp, q in dbutil.query(LEDGER_DB,
            "SELECT no_rawat, component, SUM(quantity) FROM dr_charge_ledger "
            "WHERE no_rawat IN (%s) GROUP BY no_rawat, component" % clause):
            m.setdefault(nr, {}).setdefault(comp, 0)
            m[nr][comp] += int(q or 0)
    return m


def ledger_matrix(nrs):
    """Per-visit per-component integer totals from the DR ledger."""
    m = {}
    for inl in chunked(nrs, CHUNK):
        clause = ",".join("'%s'" % x for x in inl)
        for nr, comp, amt in dbutil.query(LEDGER_DB,
            "SELECT no_rawat, component, SUM(amount) FROM dr_charge_ledger "
            "WHERE no_rawat IN (%s) GROUP BY no_rawat, component" % clause):
            m.setdefault(nr, {}).setdefault(comp, 0)
            m[nr][comp] += int(amt or 0)
    return m


def main():
    argv = sys.argv[1:]
    attempt, window, cohort = "A", "2026-10", "dr"
    line_diff = False
    for i, a in enumerate(argv):
        if a == "--stage" and i + 1 < len(argv): attempt = argv[i + 1]
        if a == "--window" and i + 1 < len(argv): window = argv[i + 1]
        if a == "--cohort" and i + 1 < len(argv): cohort = argv[i + 1]
        if a == "--line-diff": line_diff = True
    tool = dbutil.Tool("stageA_charge_delta_p2_%s" % attempt)
    os.makedirs(RDIR, exist_ok=True)
    t0 = time.time()
    log = tool.log
    log("=== P2 charge delta per component (window=%s cohort=%s line-diff=%s) ==="
        % (window, cohort, line_diff))

    nr = get_dr_visits(window, cohort)
    log("cohort visits: %d" % len(nr))
    kx, dr = khanza_matrix(nr), ledger_matrix(nr)
    if not dr:
        log("FAIL: DR ledger empty — run the P2 builder first")
        return 1

    kx_total = sum(sum(v.values()) for v in kx.values())
    dr_total = sum(sum(v.values()) for v in dr.values())
    overall = kx_total - dr_total
    log("Khanza total: %d | DR ledger total: %d | overall delta: %d"
        % (kx_total, dr_total, overall))

    comp_kx = {c: sum(v.get(c, 0) for v in kx.values()) for c in COMPONENTS}
    comp_dr = {c: sum(v.get(c, 0) for v in dr.values()) for c in COMPONENTS}
    for c in COMPONENTS:
        log("  %s: khanza=%d ledger=%d delta=%d"
            % (c, comp_kx[c], comp_dr[c], comp_kx[c] - comp_dr[c]))

    # 'other' (unknown-status) gate — fix P2-7: must be 0, not silently dropped.
    other_total = sum(v.get("other", 0) for v in kx.values())
    if other_total:
        log("GAP [P2-OTHER-STATUS] consumer has %d unknown-status value rows" % other_total)

    unexplained = []
    for v in sorted(set(nr)):
        kv, dv = kx.get(v, {}), dr.get(v, {})
        for c in COMPONENTS:
            d = kv.get(c, 0) - dv.get(c, 0)
            if d:
                unexplained.append((v, c, kv.get(c, 0), dv.get(c, 0), d))

    log("integer rupiah; Tolerance Rp %d; 'other' bucket gated" % TOL)
    log("unexplained-delta count: %d" % len(unexplained))
    for v, c, k, d, delta in unexplained[:10]:
        log("  UNEXPLAINED %s %s: khanza=%d ledger=%d delta=%d" % (v, c, k, d, delta))

    gate_pass = (len(unexplained) == 0) and (overall == 0) and (other_total == 0)

    # P4-LD: per-visit, per-component QUANTITY line-diff (independent signal
    # that catches same-price wrong-quantity / wrong-code-quantity swaps the
    # amount gate is blind to). billing has no code column, so the line key is
    # (component, quantity) — a quantity re-allocated between codes within a
    # component still shifts the per-visit per-component quantity total.
    line_delta = []
    if line_diff:
        kxq, drq = khanza_qty_matrix(nr), ledger_qty_matrix(nr)
        for v in sorted(set(nr)):
            kv, dv = kxq.get(v, {}), drq.get(v, {})
            for c in LINE_DIFF_COMPONENTS:
                d = kv.get(c, 0) - dv.get(c, 0)
                if d:
                    line_delta.append((v, c, kv.get(c, 0), dv.get(c, 0), d))
        if line_delta:
            gate_pass = False
            log("GAP [P2-LINE-DELTA] %d per-visit per-component quantity disagreements "
                "(line-level, independent of the amount gate)" % len(line_delta))
            for v, c, k, d, delta in line_delta[:10]:
                log("  LINE-DELTA %s %s: khanza_qty=%d ledger_qty=%d delta=%d"
                    % (v, c, k, d, delta))
        else:
            log("line-diff (P4-LD): per-visit per-component quantities all match — LINE-DELTA=0")

    log("gate (all deltas == 0, other == 0%s): %s"
        % (", LINE-DELTA == 0" if line_diff else "", "PASS" if gate_pass else "FAIL"))

    rep = os.path.join(RDIR, "stageA_G2_validation_p2.md")
    with open(rep, "a") as f:
        f.write("\n# P2 charge delta per component @ %s (window=%s cohort=%s)\n"
                % (time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), window, cohort))
        f.write("- cohort visits: %d\n- Khanza total: %d\n- DR ledger total: %d\n"
                "- Overall delta: %d\n- Unexplained deltas: %d\n- other-bucket rows: %d\n"
                % (len(nr), kx_total, dr_total, overall, len(unexplained), other_total))
        f.write("| component | khanza | ledger | delta |\n|---|---|---|---|\n")
        for c in COMPONENTS:
            f.write("| %s | %d | %d | %d |\n"
                    % (c, comp_kx[c], comp_dr[c], comp_kx[c] - comp_dr[c]))
        if unexplained:
            f.write("\n## Unexplained per-visit deltas (top 20 by |delta|)\n"
                    "| no_rawat | component | khanza | ledger | delta |\n|---|---|---|---|---|\n")
            for v, c, k, d, delta in sorted(unexplained, key=lambda x: -abs(x[4]))[:20]:
                f.write("| %s | %s | %d | %d | %d |\n" % (v, c, k, d, delta))
        f.write("- gate: %s\n" % ("PASS" if gate_pass else "FAIL"))
    log("wrote %s" % rep)

    csv_path = os.path.join(RDIR, "stageA_charge_delta_p2_per_visit.csv")
    with open(csv_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["no_rawat"] + ["khanza_%s" % c for c in COMPONENTS]
                   + ["ledger_%s" % c for c in COMPONENTS]
                   + ["delta_%s" % c for c in COMPONENTS])
        for v in sorted(set(nr)):
            kv, dv = kx.get(v, {}), dr.get(v, {})
            w.writerow([v] + [str(kv.get(c, 0)) for c in COMPONENTS]
                       + [str(dv.get(c, 0)) for c in COMPONENTS]
                       + [str(kv.get(c, 0) - dv.get(c, 0)) for c in COMPONENTS])
    log("per-visit CSV: %s" % csv_path)
    log("=== P2 charge delta %s in %.0fs ===" % ("PASS" if gate_pass else "FAIL", time.time() - t0))
    tool.close()
    return 0 if gate_pass else 1


if __name__ == "__main__":
    sys.exit(main())
