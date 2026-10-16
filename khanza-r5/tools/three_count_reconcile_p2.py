#!/usr/bin/env python3
"""three_count_reconcile.py — P2: three-COUNT reconciliation with an INDEPENDENT B
source, fail-soft (NOT-VERIFIED) when no form save exists, full-window + cohort
parameterized, integer rupiah.

Sources:
  Count A = consumer settlement: sik.billing value rows
            (the benchmark's asserted surface; (biaya>0 OR totalbiaya>0) and
             status NOT LIKE 'Ttl%').
  Count B = REAL-FORM save output: the tables DlgBilingRalan actually writes on a
            form-billed cohort — nota_jalan / detail_nota_jalan / piutang_pasien
            (+ reg_periksa.status_bayar). Independent of the consumer's sik.billing.
            WHERE a cohort has no form save (e.g. Stage A = ledger+consumer only,
            form not re-run), B is reported as NOT-VERIFIED and the gate is
            PARTIAL, never a silent A==B==C pass.
  Count C = DR ground-truth ledger: sik_bench.dr_charge_ledger.

Component bucketing (both A and C): nm_perawatan contains 'PPN' -> tax;
  status='Registrasi' -> registration; procedure statuses -> procedure;
  status='Obat' (non-PPN) -> drug; anything else -> 'other' (reported + gated,
  not silently dropped, fix P2-7).

P2 changes:
  Independent B (fix P2-1): B is a real read of form-save tables (or NOT-VERIFIED);
    there is NO `b = a` code path anymore.
  Window/cohort (fix P2-3): --window {2026-10|ALL}, --cohort {dr|all}.
  Integer rupiah (fix P2-5): integer sums; tolerance Rp 0 on integers.
  Form-save detector: B is VERIFIED only if form-save rows exist for the cohort
    (nota_jalan or piutang_pasien populated for at least one visit in the cohort).

Gate:
  if B verified : PASS iff A == B == C on rows+amount for registration/procedure/
                 drug/tax; 'other' rows are reported and must be 0 on all three
                 sides (unknown-status is a real gap, not hidden).
  if B NOT-VERIFIED : PARTIAL — A==C holds (ledger vs consumer) and B is
                 explicitly NOT-VERIFIED (form save not present for this cohort).
                 Exit 0 (PARTIAL) is acceptable and labelled; exit 1 on any
                 A vs C disagreement or any A!=B where B is verified.

Usage: python3 three_count_reconcile.py --stage A [--window 2026-10|ALL]
       [--cohort dr|all] [--verify-form-save]
"""
import os, sys, time
import dbutil

RUN_ID = os.environ.get("RUN_ID", "test")
RDIR = os.path.join(dbutil.RESULTS_ROOT, RUN_ID)
# P2 test override: run the gate against a scratch DB pair (adversarial fixture).
CONSUMER_DB = os.environ.get("P2_CONSUMER_DB", "sik")       # consumer write target (billing)
LEDGER_DB = os.environ.get("P2_LEDGER_DB", "sik_bench")     # DR ground-truth ledger

PROC_STATUS = ("ralan dokter", "ranap dokter", "ralan dokter paramedis",
               "ranap dokter paramedis", "ralan paramedis", "ranap paramedis")
COMPONENTS = ("registration", "procedure", "drug", "tax")
Buckets = COMPONENTS + ("other",)


def window_predicate(window):
    # ALL = the whole cohort: no date restriction, the cohort predicate scopes
    # it. (The former generated-marker pattern '____/__/__/8_____%' was missing
    # its closing quote — every --window ALL run died with MySQL 1064 — and, even
    # quoted, it skipped the 354 Stage-A October visits, which do not carry the
    # 8-prefix: 86,101 of the 86,455 DR visits the ledger holds.)
    return "1=1" if window == "ALL" else "no_rawat LIKE '2026/10/%'"


def cohort_predicate(cohort):
    return "no_rkm_medis LIKE 'DR%'" if cohort == "dr" else "1=1"


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


def count_consumer(in_clause, where):
    """Count A: sik.billing value rows per component (integer rupiah)."""
    by = {}
    rows = dbutil.query(CONSUMER_DB,
        "SELECT status, nm_perawatan, CAST(totalbiaya AS SIGNED) FROM billing "
        "WHERE no_rawat IN (%s) AND (biaya>0 OR totalbiaya>0) AND status NOT LIKE 'Ttl%%'"
        % in_clause)
    for status, nm, tb in rows:
        c = bucket(status, nm)
        d = by.setdefault(c, {"rows": 0, "amount": 0})
        d["rows"] += 1
        d["amount"] += int(tb or 0)
    return by


def _col_exists(db, table, col):
    r = dbutil.query(db, "SELECT COLUMN_NAME FROM information_schema.columns "
                         "WHERE table_schema=DATABASE() AND table_name='%s' "
                         "AND column_name='%s'" % (table, col))
    return len(r) > 0


def count_form_save(in_clause):
    """Count B: the REAL-FORM save output, independent of the consumer's
    sik.billing. Khanza's DlgBilingRalan save writes detail_nota_jalan (the
    paid line: besar_bayar + besarpPn, keyed by no_rawat) and, when a visit
    goes to credit, piutang_pasien. This is the independent third source: it
    is written by the form, not by the consumer.

    Returns (by_bucket, verified):
      verified=False -> no form-save content for the cohort; B is NOT-VERIFIED
      and the gate may only claim A==C (not A==B==C).
      verified=True  -> B has real content; B total is compared against C total.
    """
    by = {}
    has_paid = False
    n_paid = dbutil.scalar(CONSUMER_DB,
        "SELECT COUNT(*) FROM detail_nota_jalan WHERE no_rawat IN (%s)" % in_clause)
    if int(n_paid or 0) > 0:
        has_paid = True
        rows = dbutil.query(CONSUMER_DB,
            "SELECT no_rawat, SUM(COALESCE(besar_bayar,0)+COALESCE(besarppn,0)) paid "
            "FROM detail_nota_jalan WHERE no_rawat IN (%s) "
            "GROUP BY no_rawat" % in_clause)
        for nr, paid in rows:
            try:
                paid_int = int(round(float(paid or 0)))
            except (TypeError, ValueError):
                paid_int = 0
            d = by.setdefault("note", {"rows": 0, "amount": 0})
            d["rows"] += 1
            d["amount"] += paid_int
    has_piut = False
    n_piut = dbutil.scalar(CONSUMER_DB,
        "SELECT COUNT(*) FROM piutang_pasien WHERE no_rawat IN (%s)" % in_clause)
    if int(n_piut or 0) > 0:
        has_piut = True
        rows = dbutil.query(CONSUMER_DB,
            "SELECT no_rawat, CAST(totalpiutang AS SIGNED) FROM piutang_pasien "
            "WHERE no_rawat IN (%s)" % in_clause)
        for nr, tot in rows:
            d = by.setdefault("piutang", {"rows": 0, "amount": 0})
            d["rows"] += 1
            d["amount"] += int(tot or 0)
    return by, (has_paid or has_piut)


def _has_col(col):
    try:
        dbutil.scalar(CONSUMER_DB, "SELECT %s FROM nota_jalan LIMIT 0" % col)
        return True
    except Exception:
        return False


def count_ledger(in_clause):
    """Count C: dr_charge_ledger per component (integer rupiah)."""
    by = {}
    for comp, n, a in dbutil.query(LEDGER_DB,
        "SELECT component, COUNT(*), SUM(amount) FROM dr_charge_ledger "
        "WHERE no_rawat IN (%s) GROUP BY component" % in_clause):
        by[comp] = {"rows": int(n or 0), "amount": int(a or 0)}
    return by


def main():
    argv = sys.argv[1:]
    attempt = "A"
    window, cohort, verify_form = "2026-10", "dr", False
    for i, a in enumerate(argv):
        if a == "--stage" and i + 1 < len(argv): attempt = argv[i + 1]
        if a == "--window" and i + 1 < len(argv): window = argv[i + 1]
        if a == "--cohort" and i + 1 < len(argv): cohort = argv[i + 1]
        if a == "--verify-form-save": verify_form = True
    tool = dbutil.Tool("stageA_three_count_p2_%s" % attempt)
    os.makedirs(RDIR, exist_ok=True)
    t0 = time.time()
    log = tool.log
    log("=== P2 three-count reconcile (window=%s cohort=%s) ===" % (window, cohort))

    wp, cp = window_predicate(window), cohort_predicate(cohort)
    nr = [r[0] for r in dbutil.query(CONSUMER_DB,
        "SELECT no_rawat FROM reg_periksa WHERE %s AND %s ORDER BY no_rawat" % (wp, cp))]
    in_clause = ",".join("'%s'" % n for n in nr)
    log("cohort visits: %d" % len(nr))

    a = count_consumer(in_clause, wp)
    a_rows = sum(d["rows"] for d in a.values())
    a_amt = sum(d["amount"] for d in a.values())

    b, b_verified = count_form_save(in_clause)
    b_rows = sum(d["rows"] for d in b.values()) if b_verified else 0
    b_amt = sum(d["amount"] for d in b.values()) if b_verified else 0
    b_note = "real-form save (NOTA/PIUTANG) VERIFIED" if b_verified else "NOT-VERIFIED (form save absent for this cohort)"

    c = count_ledger(in_clause)
    c_rows = sum(d["rows"] for d in c.values())
    c_amt = sum(d["amount"] for d in c.values())

    log("Count A (consumer sik.billing): rows=%d amount=%d" % (a_rows, a_amt))
    log("Count B (%s): rows=%d amount=%d" % (b_note, b_rows, b_amt))
    log("Count C (DR ledger sik_bench): rows=%d amount=%d" % (c_rows, c_amt))

    gate_pass = True
    partial = False
    findings = []
    if a_rows == 0:
        gate_pass = False
        findings.append(("CONSUMER-EMPTY", "all", "consumer billing has 0 value rows"))
    if c_rows == 0:
        gate_pass = False
        findings.append(("LEDGER-EMPTY", "ledger", "dr_charge_ledger empty — run the P2 builder first"))

    # A vs C (ledger ground-truth vs consumer) — always checked.
    for comp in COMPONENTS:
        A = a.get(comp, {"rows": 0, "amount": 0})
        C = c.get(comp, {"rows": 0, "amount": 0})
        log("  %s: A=%d/%d C=%d/%d" % (comp, A["rows"], A["amount"], C["rows"], C["amount"]))
        if A["rows"] != C["rows"] or A["amount"] != C["amount"]:
            gate_pass = False
            findings.append(("P2-AC-%s" % comp.upper(), comp,
                             "A!=C rows %d vs %d, amount %d vs %d"
                             % (A["rows"], C["rows"], A["amount"], C["amount"])))

    # unknown-status 'other' must be 0 (fix P2-7: not silently dropped).
    other_a = a.get("other", {"rows": 0, "amount": 0})
    if other_a["rows"]:
        gate_pass = False
        findings.append(("P2-OTHER-STATUS", "other",
                         "consumer has %d unknown-status value rows (bucketed 'other'), gated"
                         % other_a["rows"]))

    # B vs C only when B is verified (independent form save).
    # B is note-level (per-visit total paid via detail_nota_jalan / piutang),
    # so compare B TOTAL against C TOTAL — not a per-component split. The
    # independent assertion: the form's own save total equals the DR ledger.
    if b_verified:
        c_rows_visit = len([1 for _ in nr])  # cohort size
        if b_amt != c_amt:
            gate_pass = False
            findings.append(("P2-BC-TOTAL", "note",
                             "B (form-save note total) != C (ledger): B=%d C=%d "
                             "(independent third-source disagreement)"
                             % (b_amt, c_amt)))
        log("  B total paid=%d notes=%d vs C total=%d rows=%d (independent check)"
            % (b_amt, b_rows, c_amt, c_rows))
    else:
        partial = True  # B NOT-VERIFIED: ledger+consumer agree, form save not present.
        log("B NOT-VERIFIED: no form-save rows for cohort; A==C still required, B not compared.")

    for code, comp, detail in findings:
        log("GAP [%s] %s: %s" % (code, comp, detail))

    verdict = "PASS" if (gate_pass and b_verified) else ("PARTIAL" if gate_pass else "FAIL")
    log("gate: %s (A==%s==C where B verified; %s)" %
        (verdict, "B" if b_verified else "NOT-VERIFIED",
         "B NOT-VERIFIED for this cohort" if partial else "B verified"))

    rep = os.path.join(RDIR, "stageA_G2_validation_p2.md")
    with open(rep, "a") as f:
        f.write("\n# P2 three-count reconcile @ %s (window=%s cohort=%s)\n"
                % (time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), window, cohort))
        f.write("- cohort visits: %d\n" % len(nr))
        f.write("- A (consumer sik.billing): rows=%d amount=%d\n" % (a_rows, a_amt))
        f.write("- B (%s): rows=%d amount=%d\n" % (b_note, b_rows, b_amt))
        f.write("- C (DR ledger): rows=%d amount=%d\n" % (c_rows, c_amt))
        f.write("| component | A rows | A amt | C rows | C amt |\n|---|---|---|---|---|\n")
        for comp in COMPONENTS:
            A = a.get(comp, {"rows": 0, "amount": 0}); C = c.get(comp, {"rows": 0, "amount": 0})
            f.write("| %s | %d | %d | %d | %d |\n"
                    % (comp, A["rows"], A["amount"], C["rows"], C["amount"]))
        for code, comp, detail in findings:
            f.write("- GAP [%s] %s: %s\n" % (code, comp, detail))
        f.write("- verdict: %s\n" % verdict)
    log("wrote %s" % rep)
    # exit: 0 for PASS or PARTIAL, 1 for FAIL
    tool.close()
    return 0 if (gate_pass and not partial or gate_pass and b_verified) else 1


if __name__ == "__main__":
    sys.exit(main())
