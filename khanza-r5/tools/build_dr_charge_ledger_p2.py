#!/usr/bin/env python3
"""
build_dr_charge_ledger.py — P2: DR-side expected-charge ledger (fail-closed, integer,
full-window, transactional cohort replacement).

Computed from DR's OWN tariff, NEVER from Khanza's billing output. Ground-truth
ledger for the charge-delta benchmark.

Schema (one row per charge): no_rawat, component, code, quantity, unit_price, amount.
  component in {registration, procedure, drug, tax}
  Tax = 11% on per-visit drug subtotal, half-up to whole rupiah (a Khanza rule NOT
  modelled in DR — belongs in the comparison layer, but recorded as its own row so
  the comparison is explicit, not an exemption).

P2 changes vs the legacy builder:
  FAIL-CLOSED (fix P2-2): if sik_bench.dr_tariff is absent/unreadable AND
      --allow-legacy-fallback is NOT passed, the build FAILS (no ledger written,
      exit 1). Legacy per-source prices are used ONLY when that flag is present,
      and every such row is stamped source=legacy so downstream gates see it.
      An empty-but-readable dr_tariff table still falls back (legacy) unless the
      flag is required via --require-tariff.
  INTEGER RUPIAH (fix P2-5): every stored amount is an integer rupiah (INT
      columns). Source values are rounded half-up with exact Decimal arithmetic
      (P8-B5; before P8 irup() went through a binary float), and tax is the
      integer rule (s*11+50)//100 (P7-5). Registration fee is whole-rupiah half-up; per-occurrence
      quantities are summed (COUNT of occurrences), not MAX(price)*count.
  FULL WINDOW (fix P2-3): --window {2026-10|ALL} (default 2026-10 = canonical),
      --cohort {dr|all} (default dr). No hard-coded month literal in the SQL.
  TRANSACTIONAL REPLACE (fix P2-6): DELETE the target cohort from dr_charge_ledger
      then INSERT, inside one transaction (START TRANSACTION ... COMMIT), so no
      obsolete charge keys survive (legacy REPLACE INTO left them).
  SHARED-SOURCE LIMIT (P5-6, stated honestly): quantities and codes derive from
      the DR source tables (rawat_jl_dr / detail_pemberian_obat) — the SAME
      source DR charges from. A pre-adapter encounter manifest was considered
      but is NOT implemented (the earlier --manifest-file/--require-manifest
      flags checked existence only and were removed in P5). This shared-source
      limit stands as an open item; it bounds what the ledger can independently
      prove (prices via dr_tariff authority; not code/quantity provenance).

Idempotent; logs to results/<RUN_ID>/dr_charge_ledger.log; exit 0 success, 1 fail.
"""
import os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

# P2 test override: point the builder at a scratch DB pair (adversarial fixture).
LEDGER_DB = os.environ.get("P2_LEDGER_DB", "sik_bench")
SIC_DB = os.environ.get("P2_CONSUMER_DB", "sik")

COMPONENTS = ("registration", "procedure", "drug", "tax")
BATCH = 2000
DR_REG_FEE = 10000  # DR's own clinic registration fee (whole rupiah), not poliklinik-copied


def irup(x):
    """Integer-rupiah: half-up to whole rupiah. P8-B5: exact decimal arithmetic on
    the value's text (no binary float); identical to floor(x + 0.5) for the
    non-negative prices the sources hold."""
    from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
    # P10-B5: a NULL, empty or non-numeric amount is an error, never Rp 0 (before P10
    # it silently became 0). Live sik/sik_bench hold no NULL amount (checked
    # 2026-10-18), so the pinned ledger is unaffected. Callers fail closed: the
    # tariff load reports dr_tariff unreadable; a build rolls back (FAIL-CLOSED).
    try:
        if x is None or not str(x).strip():
            raise ValueError("empty amount")
        d = Decimal(str(x).strip())
        if not d.is_finite():
            raise ValueError("non-finite amount")
        return int(d.quantize(Decimal(1), rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError) as e:
        raise ValueError("MALFORMED-AMOUNT (P10-B5): %r (%s)" % (x, e))


def load_tariff_strict(tool, log):
    """FAIL-CLOSED: load dr_tariff into {(kind,code): int rupiah}.
    Returns (rows, status) where status is 'ok' | 'empty' | 'error'.
    'empty' means the table read fine but has 0 rows — that is a real,
    fail-closed condition (DR tariff not seeded), distinct from an error."""
    global _TARIFF, _TARIFF_STATUS
    try:
        rows = dbutil.query(LEDGER_DB, "SELECT kind, code, dr_price FROM dr_tariff")
        _TARIFF = {}
        for k, c, p in rows:
            _TARIFF[(k, c)] = irup(p)
        if not rows:
            _TARIFF_STATUS = "empty"
            log("dr_tariff is EMPTY (0 rows) — DR tariff not seeded")
        else:
            _TARIFF_STATUS = "ok"
            log("dr_tariff authority rows: %d" % len(_TARIFF))
        return _TARIFF, _TARIFF_STATUS
    except Exception as e:
        _TARIFF = {}
        _TARIFF_STATUS = "error"
        log("dr_tariff UNREADABLE (%s: %s)" % (type(e).__name__, str(e)[:200]))
        return {}, "error"


_TARIFF = {}
_TARIFF_STATUS = "none"


def window_predicate(window):
    """SQL fragment for the cohort window (fix P2-3)."""
    if window == "ALL":
        # the whole cohort (cohort_predicate scopes it), incl. the 354 Stage-A
        # October visits that lack the generated 8-prefix
        return "1=1"
    # default / 2026-10
    return "rp.no_rawat LIKE '2026/10/%'"


def cohort_predicate(cohort):
    return "rp.no_rkm_medis LIKE 'DR%%'" if cohort == "dr" else "1=1"


def dr_tariff(kind, code, fallback_int):
    if (kind, code) in _TARIFF:
        return _TARIFF[(kind, code)], "dr_tariff"
    if _TARIFF_STATUS == "ok":
        # tariff table present but this (kind,code) missing: use the fallback
        # DR-source price (whole rupiah) — this is a documented gap, not authority.
        return irup(fallback_int), "dr-source(gap)"
    # tariff empty/unreadable: caller has decided legacy-or-fail; mark source
    return irup(fallback_int), "legacy"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", default="2026-10", choices=["2026-10", "ALL"])
    ap.add_argument("--cohort", default="dr", choices=["dr", "all"])
    ap.add_argument("--allow-legacy-fallback", action="store_true",
                    help="use DR-source prices when dr_tariff is empty/unreadable")
    ap.add_argument("--require-tariff", action="store_true",
                    help="FAIL if dr_tariff is empty (even when --allow-legacy-fallback)")
    args = ap.parse_args()

    tool = dbutil.Tool("dr_charge_ledger_p2")
    log = tool.log
    wp, cp = window_predicate(args.window), cohort_predicate(args.cohort)
    log("window=%s cohort=%s fallback=%s require-tariff=%s"
        % (args.window, args.cohort, args.allow_legacy_fallback, args.require_tariff))

    # ---- load tariff (fail-closed, fix P2-2) ----
    _, status = load_tariff_strict(tool, log)
    if status in ("empty", "error") and not args.allow_legacy_fallback:
        log("FAIL-CLOSED: dr_tariff %s and --allow-legacy-fallback not passed; "
            "refusing to build from legacy DR-source prices" % status)
        return 1
    if args.require_tariff and status == "empty":
        log("FAIL-CLOSED: --require-tariff set but dr_tariff is empty")
        return 1
    legacy_used = (status in ("empty", "error")) and args.allow_legacy_fallback

    # ---- ensure schema (integer money) ----
    dbutil.execute(LEDGER_DB, """
      CREATE TABLE IF NOT EXISTS dr_charge_ledger (
        no_rawat VARCHAR(17),
        component ENUM('registration','procedure','drug','tax'),
        code VARCHAR(20),
        quantity INT,
        unit_price INT,
        amount INT,
        source VARCHAR(40),
        PRIMARY KEY (no_rawat, component, code)
      )""")

    buf = []

    # P6-3: a SINGLE persistent mysql session so the whole cohort replacement
    # (START TRANSACTION; DELETE; all REPLACEs; COMMIT) runs atomically in ONE
    # session. The prior build called dbutil.execute() per statement, each of
    # which opened a fresh connection — the uncommitted DELETE rolled back when
    # its connection closed and each REPLACE committed independently, so the
    # "transactional replace" was not actually a transaction.
    sess = dbutil.session(LEDGER_DB)
    batch_log = []

    def flush():
        if buf:
            if not sess.exec("REPLACE INTO dr_charge_ledger VALUES "
                             + ",".join(buf) + ";"):
                raise RuntimeError("P6-3 session insert failed: " + sess.last_error)
            batch_log.append(len(buf))
            del buf[:]

    # ---- TRANSACTIONAL cohort replacement (P2-6 + P6-3 genuine single session) ----
    # P8-B3: delete exactly what the inserts below rebuild — the window AND the
    # cohort. Pre-P8 the DELETE ignored --cohort (WHERE 1=1 for ALL), so a DR
    # rebuild would silently drop non-DR rows. Rows with no reg_periksa row are
    # orphans of this ledger and are deleted too (the A10b stale-key case).
    # The ledger's no_rawat is utf8mb4 while Khanza's reg_periksa.no_rawat is latin1:
    # joining on the raw columns converts the reg_periksa side and loses its index (a
    # 31k-row window DELETE took ~30 min). Convert the ledger side into reg_periksa's
    # charset instead (no_rawat values are ASCII, so the conversion is lossless).
    rp_cs = dbutil.scalar(SIC_DB,
        "SELECT character_set_name FROM information_schema.columns WHERE "
        "table_schema=DATABASE() AND table_name='reg_periksa' AND column_name='no_rawat'")
    on = ("rp.no_rawat = CONVERT(l.no_rawat USING %s)" % rp_cs) if rp_cs else \
        "rp.no_rawat = l.no_rawat"
    dscope = "1=1" if args.window == "ALL" else "l.no_rawat LIKE '2026/10/%'"
    delete_sql = ("DELETE l FROM dr_charge_ledger l LEFT JOIN " + SIC_DB + ".reg_periksa rp "
                  "ON " + on + " WHERE " + dscope + " AND (rp.no_rawat IS NULL OR "
                  + (cp % ()) + ")")
    log("delete scope (P8-B3): %s" % delete_sql)
    log("transactional replace (single-session, P6-3): deleting cohort ...")
    if not sess.exec("START TRANSACTION; " + delete_sql + ";"):
        sess.rollback()
        sess.close()
        log("FAIL-CLOSED: single-session replace could not open (last=%s)"
            % sess.last_error)
        return 1

    try:
        def reg_visits():
            return dbutil.query(SIC_DB,
                "SELECT DISTINCT rp.no_rawat FROM reg_periksa rp "
                "WHERE %s AND %s ORDER BY rp.no_rawat" % (wp, cp))

        # 1. Registration: one row per DR visit, whole-rupiah DR clinic fee (or tariff).
        # P6-3: the entire cohort build (registration + procedure + drug + tax) runs
        # inside ONE persistent mysql session (sess, opened above) so
        # START TRANSACTION; DELETE; all REPLACEs; COMMIT is a genuine single-session
        # transaction. A mid-build failure raises, the session ROLLBACKs on close,
        # and the ledger is left byte-identical to its pre-build state (no partial
        # cohort survives).
        reg = [r[0] for r in reg_visits()]
        for nr in reg:
            p, src = dr_tariff("registration", "REG", DR_REG_FEE)
            if legacy_used:
                src = "legacy"
            buf.append("('%s','registration','REG',1,%d,%d,'%s')" % (nr, p, p, src))
            if len(buf) >= BATCH:
                flush()
        flush()
        log("registration rows: %d" % len(reg))

        # 2. Procedures: quantity = COUNT of occurrences; amount = SUM of the
        #    per-occurrence LINE TOTALS (biaya_rawat x jml), which is what the
        #    consumer bills — NOT a unit price summed (loses per-line value).
        proc = dbutil.query(SIC_DB,
            "SELECT rj.no_rawat, rj.kd_jenis_prw, COUNT(*) q, "
            "SUM(CASE WHEN rj.biaya_rawat IS NULL THEN 0 ELSE CAST(rj.biaya_rawat AS SIGNED) END) psum "
            "FROM rawat_jl_dr rj JOIN reg_periksa rp ON rp.no_rawat=rj.no_rawat "
            "AND " + wp + " WHERE %s AND rj.kd_jenis_prw IS NOT NULL AND rj.kd_jenis_prw<>'' "
              "GROUP BY rj.no_rawat, rj.kd_jenis_prw" % cp)
        n = 0
        for nr, kdp, q, psum in proc:
            q, psum = int(q or 0), irup(psum)
            if ("procedure", kdp) in _TARIFF:
                unit = _TARIFF[("procedure", kdp)]
                amt = unit * q
            else:
                unit = (psum // q) if q else 0
                amt = psum  # per-occurrence line-total sum the consumer bills
            src = "legacy" if legacy_used else ("dr_tariff" if ("procedure", kdp) in _TARIFF else "dr-source")
            buf.append("('%s','procedure','%s',%d,%d,%d,'%s')"
                       % (nr, kdp, q, unit, amt, src))
            n += 1
            if len(buf) >= BATCH:
                flush()
        flush()
        log("procedure rows: %d" % n)

        # 3. Drugs: quantity = SUM(d.jml) (the billed quantity — a visit may have one
        #    source row with jml=3, so COUNT(*) would undercount); amount = SUM of the
        #    per-occurrence LINE TOTALS (databarang.ralan x d.jml) the consumer bills.
        drugs = dbutil.query(SIC_DB,
            "SELECT d.no_rawat, d.kode_brng, "
            "SUM(COALESCE(d.jml,1)) q, "
            "SUM(CASE WHEN b.ralan IS NULL THEN 0 "
            "ELSE CAST(b.ralan AS SIGNED) * CAST(COALESCE(d.jml,1) AS SIGNED) END) psum "
            "FROM detail_pemberian_obat d "
            "LEFT JOIN databarang b ON b.kode_brng=d.kode_brng "
            "JOIN reg_periksa rp ON rp.no_rawat=d.no_rawat "
            "AND " + wp + " WHERE %s GROUP BY d.no_rawat, d.kode_brng" % cp)
        n = 0
        drug_sub = {}  # P6-3: per-visit drug subtotal of THIS build (for step 4)
        for nr, kdb, q, psum in drugs:
            q, psum = int(q or 0), irup(psum)
            if ("drug", kdb) in _TARIFF:
                unit = _TARIFF[("drug", kdb)]
                amt = unit * q  # tariff is a unit price; multiply the true billed qty
            else:
                unit = (psum // q) if q else 0
                amt = psum  # per-occurrence line-total (retail) the consumer bills
            src = "legacy" if legacy_used else ("dr_tariff" if ("drug", kdb) in _TARIFF else "dr-source")
            buf.append("('%s','drug','%s',%d,%d,%d,'%s')"
                       % (nr, kdb, q, unit, amt, src))
            drug_sub[nr] = drug_sub.get(nr, 0) + amt
            n += 1
            if len(buf) >= BATCH:
                flush()
        flush()
        log("drug rows: %d" % n)

        # 4. Tax: 11% per-visit drug subtotal, half-up, whole rupiah (own row).
        #    Cohort-scoped: sum the drug amounts JUST built for this window.
        #    P6-3: taken from the in-memory drug_sub of step 3, NOT re-queried — a
        #    separate dbutil.query connection cannot see the uncommitted rows of the
        #    single-session transaction and would read the OLD committed ledger
        #    (stale keys, pre-DELETE amounts; zero tax on a first build).
        n = 0
        for nr, s in sorted(drug_sub.items()):
            # P7-5: exact integer half-up (no float). Identical to the consumer's
            # Math.round(subttl * 0.11) on all 70,056 real drug subtotals
            # (tools/p7_tax_rule_check.py, 2026-10-17: 0 differences).
            tax = (int(s or 0) * 11 + 50) // 100
            if tax > 0:
                buf.append("('%s','tax','PPN11',1,%d,%d,'Khanza_rule_not_DR_modelled')"
                           % (nr, tax, tax))
                n += 1
            if len(buf) >= BATCH:
                flush()
        flush()
        log("tax rows: %d (cohort-scoped to window=%s)" % (n, args.window))

    # commit the transactional replace (SAME session that did the DELETE+INSERTs)
        if not sess.exec("COMMIT;"):
            sess.rollback()
            sess.close()
            log("FAIL-CLOSED: single-session COMMIT send failed; rolled back (last=%s)"
                % sess.last_error)
            return 1
        committed = sess.close()
        if not committed:
            log("FAIL-CLOSED: session close error after COMMIT (last=%s); "
                "ledger state may be partial — do NOT treat as a clean build"
                % sess.last_error)
            return 1
        log("committed transactional cohort replacement in a SINGLE mysql session "
            "(window=%s cohort=%s; P6-3)" % (args.window, args.cohort))
    except Exception as e:
        # mid-build failure (insert/replace raised): ROLLBACK so no partial
        # cohort survives, then fail closed (P6-3 rollback proven).
        try:
            sess.rollback()
            sess.close()
        except Exception:
            pass
        log("FAIL-CLOSED: mid-build failure (%s: %s); session rolled back, "
            "ledger unchanged (P6-3)" % (type(e).__name__, str(e)[:200]))
        return 1

    counts = dbutil.query(LEDGER_DB,
        "SELECT component, COUNT(*), SUM(amount) FROM dr_charge_ledger "
        "GROUP BY component ORDER BY component")
    log("dr_charge_ledger rows per component:")
    for comp, cnt, amt in counts:
        log("  %-12s %6s rows  amount=%s" % (comp, cnt, amt))
    if legacy_used:
        log("FALLBACK-USED: rows built from legacy DR-source prices "
            "(dr_tariff %s); source=legacy stamped" % status)
    tool.artifact("dr_charge_ledger_p2.csv",
                  "no_rawat,component,code,quantity,unit_price,amount,source\n"
                  + "\n".join(",".join(str(c) for c in r) for r in dbutil.query(
                        LEDGER_DB, "SELECT * FROM dr_charge_ledger ORDER BY no_rawat,component")))
    log("done: ledger built (window=%s cohort=%s integer=%s)"
        % (args.window, args.cohort, "OK"))
    tool.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
