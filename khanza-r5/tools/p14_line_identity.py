#!/usr/bin/env python3
"""P14 T3: per-encounter charge-line identity, form-written billing vs dr_charge_ledger.

For each encounter in the visits file:
  form lines   = value rows of <db>.billing (the Registrasi row, plus rows with no='' and
                 pemisah=':' that are not Ttl*), mapped to (component, code):
                   registration -> REG, 'PPN' -> tax PPN11,
                   procedure    -> jns_perawatan.kd_jenis_prw by nm_perawatan,
                   drug         -> databarang.kode_brng by "nama_brng (jenis.nama)".
                 A name with one code maps by name. A name with several codes maps only if
                 exactly one of them is in this encounter's ledger rows (EQUAL-CTX, reported
                 apart); otherwise AMBIGUOUS. No candidate -> UNMAPPED. Zero-amount rows count.
  ledger lines = <ledger-db>.dr_charge_ledger rows (component, code, quantity, unit_price, amount).
  Per (component, code), quantity and amount are summed on both sides; the form's unit is
  `biaya` (one distinct value expected). A line is equal when qty, amount and unit match
  (registration and tax compare amount only).

Encounter verdict: AMBIGUOUS > UNMAPPED > DIFFER > EQUAL-CTX > EQUAL.
Also per encounter: A_form - C per component (exact Decimal), B (detail_nota_jalan
besar_bayar + besarppn) vs the form total, fresh-B (detail_nota_jalan INSERTs by benchmark@
in p7_write_audit, when that table exists).

--expect <manifest.json> (P14 fixture): an encounter PASSES when its observed component delta
equals the pre-registered expected_delta exactly, its line verdict is EQUAL/EQUAL-CTX when no
delta is expected (DIFFER when one is), and fresh-B holds. Without --expect: PASS = line
verdict EQUAL/EQUAL-CTX, no component delta, B == C total, fresh-B holds.
Also reported with --expect: FORM-MODEL / LEDGER-MODEL = observed lines vs predicted lines.

Usage: p14_line_identity.py <visits-file> --db <clone> [--ledger-db sik_bench]
                            [--expect manifest.json] [--out CSV] [--no-fresh-b]
Exit 0 all PASS, 1 any FAIL, 2 bad input. SELECT only.
"""
import csv
import json
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil  # noqa: E402

PROC_STATUS = ("ralan dokter", "ranap dokter", "ralan dokter paramedis",
               "ranap dokter paramedis", "ralan paramedis", "ranap paramedis")
RANK = {"AMBIGUOUS": 4, "UNMAPPED": 3, "DIFFER": 2, "EQUAL-CTX": 1, "EQUAL": 0}
CHUNK = 500


def q(db, sql):
    assert sql.lstrip().upper().startswith("SELECT"), "read-only tool"
    return dbutil.query(db, sql, timeout=600)


def D(x):
    return Decimal(str(x if x not in (None, "", "NULL") else 0)).normalize()


def fmt(d):
    d = Decimal(d).normalize()
    return str(int(d)) if d == d.to_integral() else str(d)


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def component(status, nm):
    s, n = (status or "").lower(), (nm or "").lower()
    if s == "registrasi":
        return "registration"
    if "ppn" in n:
        return "tax"
    if s in PROC_STATUS:
        return "procedure"
    if s == "obat":
        return "drug"
    return "other"


def name_maps(db):
    pm, dm = {}, {}
    for kd, nm in q(db, "SELECT kd_jenis_prw, nm_perawatan FROM jns_perawatan"):
        pm.setdefault(nm, set()).add(kd)
    for kd, nm, jn in q(db, "SELECT b.kode_brng, b.nama_brng, j.nama FROM databarang b "
                            "JOIN jenis j ON j.kdjns=b.kdjns"):
        dm.setdefault("%s (%s)" % (nm, jn), set()).add(kd)
    return pm, dm


def main():
    if len(sys.argv) < 2 or not os.path.isfile(sys.argv[1]) or "--db" not in sys.argv:
        print(__doc__); return 2
    nrs = [l.strip() for l in open(sys.argv[1]) if l.strip()]
    db, ldb = arg("--db"), arg("--ledger-db", "sik_bench")
    out = arg("--out", "/tmp/p14_line_identity.csv")
    exp = json.load(open(arg("--expect")))["visits"] if "--expect" in sys.argv else None
    fresh_required = "--no-fresh-b" not in sys.argv
    pm, dm = name_maps(db)
    rows, led, pay, audit = {}, {}, {}, {}
    has_audit = bool(q(db, "SELECT COUNT(*) FROM information_schema.tables WHERE "
                           "table_schema='%s' AND table_name='p7_write_audit'" % db)[0][0] != "0")
    for i in range(0, len(nrs), CHUNK):
        inl = ",".join("'%s'" % n for n in nrs[i:i + CHUNK])
        for r in q(db, "SELECT no_rawat, noindex, no, nm_perawatan, pemisah, biaya, jumlah, "
                       "tambahan, totalbiaya, status FROM billing WHERE no_rawat IN (%s) "
                       "ORDER BY no_rawat, noindex" % inl):
            nr, _, no, nm, pem, biaya, jml, tamb, tot, st = r
            st = st or ""
            if st == "Registrasi" or ((no or "") == "" and (pem or "") == ":"
                                      and not st.startswith("Ttl")):
                rows.setdefault(nr, []).append((nm, D(biaya), D(jml), D(tamb), D(tot), st))
        for nr, comp, code, qty, unit, amt in q(ldb,
                "SELECT no_rawat, component, code, quantity, unit_price, amount FROM "
                "dr_charge_ledger WHERE no_rawat IN (%s)" % inl):
            led.setdefault(nr, {})[(comp, code)] = (D(qty), D(unit), D(amt))
        for nr, s, n in q(db, "SELECT no_rawat, SUM(COALESCE(besar_bayar,0)+COALESCE(besarppn,0)), "
                              "COUNT(*) FROM detail_nota_jalan WHERE no_rawat IN (%s) "
                              "GROUP BY no_rawat" % inl):
            pay[nr] = (D(s), int(n))
        if has_audit:
            for nr, n, b in q(db, "SELECT no_rawat, COUNT(*), SUM(acct LIKE CONCAT('benchmark@', "
                                  "CHAR(37))) FROM p7_write_audit WHERE tbl='detail_nota_jalan' "
                                  "AND op='INSERT' AND no_rawat IN (%s) GROUP BY no_rawat" % inl):
                audit[nr] = (int(n or 0), int(D(b)))
    res, lines_out = [], []
    for nr in nrs:
        L = led.get(nr, {})
        F, flags = {}, set()
        for nm, biaya, jml, tamb, tot, st in rows.get(nr, []):
            c = component(st, nm)
            if c == "registration":
                code, how = "REG", "name"
            elif c == "tax":
                code, how = "PPN11", "name"
            elif c in ("procedure", "drug"):
                cand = (pm if c == "procedure" else dm).get(nm, set())
                if len(cand) == 1:
                    code, how = next(iter(cand)), "name"
                elif len(cand) > 1:
                    inled = sorted(k for k in cand if (c, k) in L)
                    if len(inled) == 1:
                        code, how = inled[0], "ctx"
                    else:
                        code, how = "AMBIGUOUS:" + nm, "ambiguous"
                else:
                    code, how = "UNMAPPED:" + nm, "unmapped"
            else:
                code, how = "UNMAPPED:" + (nm or ""), "unmapped"
            flags.add(how)
            f = F.setdefault((c, code), {"qty": Decimal(0), "amt": Decimal(0), "units": set(),
                                         "tamb": Decimal(0), "rows": 0})
            f["qty"] += Decimal(1) if c == "registration" else jml
            f["amt"] += tot
            f["units"].add(biaya)
            f["tamb"] += tamb
            f["rows"] += 1
        differ = False
        for key in sorted(set(F) | set(L)):
            f, l = F.get(key), L.get(key)
            if f is None or l is None:
                ok = False
            else:
                ok = f["amt"] == l[2]
                if key[0] in ("procedure", "drug"):
                    ok = ok and f["qty"] == l[0] and f["units"] == {l[1]}
            differ = differ or not ok
            lines_out.append([nr, key[0], key[1],
                              fmt(f["qty"]) if f else "", ";".join(fmt(u) for u in sorted(f["units"])) if f else "",
                              fmt(f["amt"]) if f else "", fmt(f["tamb"]) if f else "", f["rows"] if f else 0,
                              fmt(l[0]) if l else "", fmt(l[1]) if l else "", fmt(l[2]) if l else "",
                              "EQUAL" if ok else "DIFFER"])
        verdict = ("AMBIGUOUS" if "ambiguous" in flags else "UNMAPPED" if "unmapped" in flags
                   else "DIFFER" if differ else "EQUAL-CTX" if "ctx" in flags else "EQUAL")
        comp = {}
        for (c, _), f in F.items():
            comp[c] = comp.get(c, Decimal(0)) + f["amt"]
        for (c, _), l in L.items():
            comp[c] = comp.get(c, Decimal(0)) - l[2]
        delta = {c: fmt(v) for c, v in sorted(comp.items()) if v != 0}
        a_tot = sum((f["amt"] for f in F.values()), Decimal(0))
        c_tot = sum((l[2] for l in L.values()), Decimal(0))
        b = pay.get(nr, (None, 0))
        fb = audit.get(nr, (0, 0))
        fresh = (not fresh_required) or (fb[0] == 1 and fb[1] == 1)
        rec = {"no_rawat": nr, "verdict": verdict, "delta": delta, "A": fmt(a_tot), "C": fmt(c_tot),
               "B": fmt(b[0]) if b[0] is not None else "", "B_rows": b[1],
               "fresh_b": "%d/%d" % (fb[1], fb[0]) if has_audit else "n/a"}
        if exp is not None:
            e = exp.get(nr)
            if e is None:
                rec["outcome"] = "NO-EXPECTATION"
            else:
                rec["stratum"] = e["stratum"]
                want = e["expected_delta"]
                line_ok = (verdict in ("EQUAL", "EQUAL-CTX")) if not want else (verdict == "DIFFER")
                rec["expected"] = want
                rec["outcome"] = "MATCH" if (delta == want and line_ok and fresh) else "MISMATCH"
                obs_form = {"%s|%s" % k: [fmt(f["qty"]), fmt(f["amt"])] for k, f in F.items()}
                pf = {k: [fmt(D(a)), fmt(D(b2))] for k, (a, b2) in e["predicted_form"].items()}
                obs_led = {"%s|%s" % k: [fmt(l[0]), fmt(l[2])] for k, l in L.items()}
                pl = {k: [fmt(D(a)), fmt(D(b2))] for k, (a, b2) in e["predicted_ledger"].items()}
                rec["form_model"] = "MATCH" if obs_form == pf else "DIFF"
                rec["ledger_model"] = "MATCH" if obs_led == pl else "DIFF"
                if rec["form_model"] == "DIFF":
                    rec["form_obs"], rec["form_pred"] = obs_form, pf
                if rec["ledger_model"] == "DIFF":
                    rec["ledger_obs"], rec["ledger_pred"] = obs_led, pl
            rec["pass"] = rec["outcome"] == "MATCH"
        else:
            rec["pass"] = (verdict in ("EQUAL", "EQUAL-CTX") and not delta and fresh
                           and b[0] is not None and b[0] == c_tot)
        res.append(rec)
    with open(out, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["no_rawat", "component", "code", "form_qty", "form_unit", "form_amount",
                    "form_tambahan", "form_rows", "ledger_qty", "ledger_unit", "ledger_amount", "line"])
        w.writerows(lines_out)
    with open(out.rsplit(".", 1)[0] + "_encounters.json", "w") as fh:
        json.dump(res, fh, indent=1, sort_keys=True)
    counts = {}
    for r in res:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    for r in res:
        if not r["pass"] or exp is not None:
            print("ENC %s %s verdict=%s delta=%s A=%s B=%s C=%s freshB=%s%s" % (
                r["no_rawat"], r.get("stratum", ""), r["verdict"], json.dumps(r["delta"]),
                r["A"], r["B"], r["C"], r["fresh_b"],
                (" expected=%s outcome=%s form_model=%s ledger_model=%s"
                 % (json.dumps(r["expected"]), r["outcome"], r["form_model"], r["ledger_model"]))
                if "expected" in r else ""))
    npass = sum(1 for r in res if r["pass"])
    print("P14-LINE-IDENTITY: encounters=%d pass=%d fail=%d verdicts=%s mode=%s db=%s ledger=%s out=%s"
          % (len(res), npass, len(res) - npass, json.dumps(counts, sort_keys=True),
             "expect" if exp is not None else "equal", db, ldb, out))
    return 0 if npass == len(res) else 1


if __name__ == "__main__":
    sys.exit(main())
