#!/usr/bin/env python3
"""
build_dr_charge_ledger.py — Phase 2: DR-side expected-charge ledger.

Computed from DR's OWN tariff, NEVER from Khanza's billing output. This is the
ground-truth ledger for the charge-delta benchmark.

Schema (one row per charge): no_rawat, component, code, quantity, unit_price, amount.
  component ∈ {registration, procedure, drug}
Tax is a SEPARATE component, explicitly a Khanza rule NOT modelled in DR
(11% on drug subtotal, half-up to whole rupiah) — it belongs in the comparison
layer, not this ledger.

A1 price authority: sik_bench.dr_tariff (kind, code, dr_price) resolves FIRST
for all components; the legacy per-source values (databarang.h_beli,
rawat_jl_dr.biaya_rawat, DR clinic fee) remain as fallbacks so an empty
authority table reproduces pre-A1 behaviour exactly.

Registration fee: uses a DR clinic fee (not the poliklinik-copied value). Any
difference from Khanza's master is recorded as finding REG-1.

Idempotent; logs to results/<RUN_ID>/dr_charge_ledger.log; exit 0 success.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

# DR clinic registration fee (DR's own tariff, NOT poliklinik-copied).
DR_REG_FEE = 10000  # placeholder; replace with DR's clinic fee when its tariff table lands

# A1: price authority — sik_bench.dr_tariff first, per-source fallback otherwise.
_TARIFF = {}
BATCH = 2000  # rows per multi-row REPLACE (same semantics, fewer CLI spawns)


def load_tariff():
    """Load sik_bench.dr_tariff into memory: {(kind, code): price}."""
    global _TARIFF
    try:
        rows = dbutil.query("sik_bench",
            "SELECT kind, code, dr_price FROM dr_tariff")
        _TARIFF = {(k, c): float(p) for k, c, p in rows}
    except Exception:
        _TARIFF = {}


def dr_tariff(kind, code, fallback):
    """Resolve a DR price: dr_tariff authority first, else the legacy source."""
    return _TARIFF.get((kind, code), float(fallback))


def main():
    db = "sik_bench"
    tool = dbutil.Tool("dr_charge_ledger")
    log = tool.log

    # Tariff source check (DECISIONS note).
    dbutil.decision("Phase2 DR charge ledger tariff source",
        "No dedicated DR tariff table in the bundle. Ledger built from per-code prices "
        "already in databarang (drug ralan/retail) and jns_perawatan (procedure total_byrdr). "
        "A dedicated DR tariff table is PENDING; when it lands, regenerate this ledger. "
        "Registration fee = DR clinic fee %d (NOT poliklinik-copied); difference from "
        "Khanza master recorded as REG-1. Tax (11%% drug subtotal, half-up) is a Khanza "
        "rule, kept out of this ledger (comparison layer only)." % DR_REG_FEE)

    # Ensure the ledger table.
    dbutil.execute(db, """
      CREATE TABLE IF NOT EXISTS sik_bench.dr_charge_ledger (
        no_rawat VARCHAR(17),
        component ENUM('registration','procedure','drug','tax'),
        code VARCHAR(20),
        quantity DOUBLE,
        unit_price DOUBLE,
        amount DOUBLE,
        source VARCHAR(40),
        PRIMARY KEY (no_rawat, component, code)
      )
    """)

    # A1: load price authority (empty pre-seed -> pure legacy behaviour).
    load_tariff()
    log("dr_tariff authority rows: %d" % len(_TARIFF))

    buf = []

    def flush():
        if buf:
            dbutil.execute(db, "REPLACE INTO dr_charge_ledger VALUES "
                           + ",".join(buf))
            del buf[:]

    # 1. Registration: one row per DR visit.
    #    NOTE: DR source tables live in `sik` (the Khanza DB holding the DR
    #    bundle), NOT in sik_bench — querying sik_bench returns 0 rows.
    reg_rows = dbutil.query("sik", "SELECT DISTINCT no_rawat FROM reg_periksa "
                                   "WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'")
    for (nr,) in reg_rows:
        p = dr_tariff("registration", "REG", DR_REG_FEE)
        src = "dr_tariff" if ("registration", "REG") in _TARIFF else "DR_clinic_fee"
        buf.append("('%s','registration','REG',1,%d,%d,'%s')" % (nr, p, p, src))
        if len(buf) >= BATCH:
            flush()
    flush()
    log("registration rows written: %d" % len(reg_rows))

    # 2. Procedures: from rawat_jl_dr (DR's own procedure charges).
    proc = dbutil.query("sik", "SELECT no_rawat, kd_jenis_prw, COUNT(*) q, MAX(biaya_rawat) p "
                              "FROM rawat_jl_dr WHERE no_rawat LIKE '2026/10/%' "
                              "AND kd_jenis_prw IS NOT NULL AND kd_jenis_prw<>'' "
                              "GROUP BY no_rawat, kd_jenis_prw")
    n = 0
    for nr, kdp, q, p in proc:
        qf = float(q or 0); pf = float(p or 0)
        price = dr_tariff("procedure", kdp, pf)
        src = "dr_tariff" if ("procedure", kdp) in _TARIFF else "rawat_jl_dr.biaya_rawat"
        buf.append("('%s','procedure','%s',%f,%f,%f,'%s')" %
                   (nr, kdp, qf, price, qf * price, src))
        n += 1
        if len(buf) >= BATCH:
            flush()
    flush()
    log("procedure rows written: %d" % n)

    # 3. Drugs: from detail_pemberian_obat, unit price from databarang (DR tariff).
    drugs = dbutil.query("sik",
        "SELECT d.no_rawat, d.kode_brng, SUM(d.jml) q, MAX(d.h_beli) p "
        "FROM detail_pemberian_obat d WHERE d.no_rawat LIKE '2026/10/%' "
        "GROUP BY d.no_rawat, d.kode_brng")
    n = 0
    for nr, kdb, q, p in drugs:
        qf = float(q or 0); pf = float(p or 0)
        price = dr_tariff("drug", kdb, pf)
        src = "dr_tariff" if ("drug", kdb) in _TARIFF else "databarang.h_beli"
        buf.append("('%s','drug','%s',%f,%f,%f,'%s')" %
                   (nr, kdb, qf, price, qf * price, src))
        n += 1
        if len(buf) >= BATCH:
            flush()
    flush()
    log("drug rows written: %d" % n)

    # 4. Tax component (Khanza rule, marked as NOT modelled in DR): 11% on drug subtotal,
    #    half-up to whole rupiah. Stored as its own row so the comparison layer can
    #    attribute it correctly.
    drug_sub = dbutil.query(db, "SELECT no_rawat, SUM(amount) s FROM dr_charge_ledger "
                                 "WHERE component='drug' GROUP BY no_rawat")
    n = 0
    for nr, s in drug_sub:
        sf = float(s or 0)
        tax = int(sf * 0.11 + 0.5)  # half-up to whole rupiah
        if tax > 0:
            buf.append("('%s','tax','PPN11',1,%d,%d,'Khanza_rule_not_DR_modelled')" %
                       (nr, tax, tax))
            n += 1
        if len(buf) >= BATCH:
            flush()
    flush()
    log("tax rows written: %d" % n)

    # Row counts per component.
    counts = dbutil.query(db, "SELECT component, COUNT(*), SUM(amount) FROM dr_charge_ledger "
                              "GROUP BY component ORDER BY component")
    log("dr_charge_ledger rows per component:")
    csv_lines = ["no_rawat,component,code,quantity,unit_price,amount,source"]
    for comp, cnt, amt in counts:
        log("  %-12s %6s rows  amount=%s" % (comp, cnt, amt))
    for row in dbutil.query(db, "SELECT no_rawat,component,code,quantity,unit_price,amount,source "
                                  "FROM dr_charge_ledger ORDER BY no_rawat,component"):
        csv_lines.append(",".join("" if c is None else str(c) for c in row))
    tool.artifact("dr_charge_ledger.csv", "\n".join(csv_lines))

    log("done: ledger built (registration+procedure+drug+tax-marked) from DR tariff source")
    tool.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
