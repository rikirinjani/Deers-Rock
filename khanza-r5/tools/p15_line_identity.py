#!/usr/bin/env python3
"""P15 C1/B1-B5: per-encounter, per-code financial identity, form-written billing vs dr_charge_ledger.

Successor of p14_line_identity.py (kept frozen and unchanged). Differences (P15 task doc s2 B, C):
  C1  A display name shared by several codes is resolved with the ENCOUNTER'S OWN SOURCE ROWS in
      <db> (rawat_jl_dr.kd_jenis_prw for procedures, detail_pemberian_obat.kode_brng for drugs),
      never with the expected ledger. One candidate in the source rows -> EQUAL-SRC/DIFFER; zero
      or several -> AMBIGUOUS (fails). EQUAL-CTX no longer exists.
  B1  --expect PASS also requires B == A_form total and form_model == ledger_model == MATCH.
  B2  a duplicate (no_rawat, component, code) ledger row is an input error (exit 2).
  B3  quantity is compared for every component, unit for procedure/drug/tax, amount for all.
  B4  the visit list must be non-empty and unique; a NULL/empty numeric is an input error (exit 2).
  B5  fresh-B = exactly one detail_nota_jalan INSERT for the encounter, by benchmark@, at or after
      --since (the run start the driver recorded).

Limit (stated): billing rows carry names, not codes. A form that bills code Y under a name it
shares with the source's code X cannot be told apart here; only form-side provenance can.

Usage: p15_line_identity.py <visits-file> --db <clone> [--ledger-db sik_bench] [--since 'Y-m-d H:M:S.f']
                            [--expect manifest.json] [--out CSV] [--no-fresh-b]
Exit 0 all PASS, 1 any FAIL, 2 bad input. SELECT only.
"""
import csv
import json
import os
import sys
from decimal import Decimal, InvalidOperation

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil  # noqa: E402

PROC_STATUS = ("ralan dokter", "ranap dokter", "ralan dokter paramedis",
               "ranap dokter paramedis", "ralan paramedis", "ranap paramedis")
CHUNK = 500


class InputError(Exception):
    pass


def q(db, sql):
    assert sql.lstrip().upper().startswith("SELECT"), "read-only tool"
    return dbutil.query(db, sql, timeout=600)


def D(x, what):
    """B4: a NULL/empty/non-numeric value is an input error, never 0."""
    if x is None or str(x).strip() in ("", "NULL"):
        raise InputError("NULL/empty numeric in %s" % what)
    try:
        return Decimal(str(x)).normalize()
    except InvalidOperation:
        raise InputError("non-numeric %r in %s" % (x, what))


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


def run():
    if len(sys.argv) < 2 or not os.path.isfile(sys.argv[1]) or "--db" not in sys.argv:
        raise InputError("usage: see docstring")
    raw = [l.strip() for l in open(sys.argv[1]) if l.strip()]
    if not raw:
        raise InputError("empty visit list")
    if len(set(raw)) != len(raw):
        raise InputError("duplicate visits in list (%d listed, %d unique)" % (len(raw), len(set(raw))))
    nrs = raw
    db, ldb = arg("--db"), arg("--ledger-db", "sik_bench")
    since = arg("--since")
    out = arg("--out", "/tmp/p15_line_identity.csv")
    exp = json.load(open(arg("--expect")))["visits"] if "--expect" in sys.argv else None
    fresh_required = "--no-fresh-b" not in sys.argv
    if fresh_required and not since:
        raise InputError("--since is required for fresh-B (or pass --no-fresh-b)")
    pm, dm = name_maps(db)
    rows, led, pay, audit, src = {}, {}, {}, {}, {}
    has_audit = q(db, "SELECT COUNT(*) FROM information_schema.tables WHERE "
                      "table_schema='%s' AND table_name='p7_write_audit'" % db)[0][0] != "0"
    if fresh_required and not has_audit:
        raise InputError("fresh-B required but %s has no p7_write_audit table" % db)
    for i in range(0, len(nrs), CHUNK):
        inl = ",".join("'%s'" % n for n in nrs[i:i + CHUNK])
        for r in q(db, "SELECT no_rawat, noindex, no, nm_perawatan, pemisah, biaya, jumlah, "
                       "tambahan, totalbiaya, status FROM billing WHERE no_rawat IN (%s) "
                       "ORDER BY no_rawat, noindex" % inl):
            nr, _, no, nm, pem, biaya, jml, tamb, tot, st = r
            st = st or ""
            if st == "Registrasi" or ((no or "") == "" and (pem or "") == ":"
                                      and not st.startswith("Ttl")):
                w = "billing %s %s" % (nr, nm)
                rows.setdefault(nr, []).append((nm, D(biaya, w), D(jml, w), D(tamb, w), D(tot, w), st))
        for nr, comp, code, qty, unit, amt in q(ldb,
                "SELECT no_rawat, component, code, quantity, unit_price, amount FROM "
                "dr_charge_ledger WHERE no_rawat IN (%s)" % inl):
            key = (comp, code)
            if key in led.setdefault(nr, {}):
                raise InputError("duplicate ledger key %s %s" % (nr, key))  # B2
            w = "ledger %s %s" % (nr, key)
            led[nr][key] = (D(qty, w), D(unit, w), D(amt, w))
        for nr, s, n, nn in q(db, "SELECT no_rawat, SUM(besar_bayar+besarppn), COUNT(*), "
                                  "SUM(besar_bayar IS NULL OR besarppn IS NULL) FROM detail_nota_jalan "
                                  "WHERE no_rawat IN (%s) GROUP BY no_rawat" % inl):
            if int(Decimal(str(nn or 0))):
                raise InputError("NULL payment column in detail_nota_jalan for %s" % nr)   # B3 (P16 N4)
            pay[nr] = (D(s, "payment %s" % nr), int(n))
        for nr, kd in q(db, "SELECT no_rawat, kd_jenis_prw FROM rawat_jl_dr WHERE no_rawat IN (%s)" % inl):
            src.setdefault(nr, {}).setdefault("procedure", set()).add(kd)
        for nr, kd in q(db, "SELECT no_rawat, kode_brng FROM detail_pemberian_obat WHERE no_rawat IN (%s)" % inl):
            src.setdefault(nr, {}).setdefault("drug", set()).add(kd)
        if has_audit:
            # P16 B2 (N3): count ALL INSERTs of the encounter (no time condition) and, separately,
            # those at or after the run start; fresh-B needs exactly one in total, by benchmark@,
            # inside the window
            win = ("at >= '%s'" % since) if since else "1"
            for nr, n_all, n_bench, n_win in q(db,
                    "SELECT no_rawat, COUNT(*), SUM(acct LIKE CONCAT('benchmark@', CHAR(37))), SUM(%s) "
                    "FROM p7_write_audit WHERE tbl='detail_nota_jalan' AND op='INSERT' "
                    "AND no_rawat IN (%s) GROUP BY no_rawat" % (win, inl)):
                audit[nr] = (int(n_all or 0), int(Decimal(str(n_bench or 0))), int(Decimal(str(n_win or 0))))
    res, lines_out = [], []
    for nr in nrs:
        L = led.get(nr, {})
        S = src.get(nr, {})
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
                    insrc = sorted(k for k in cand if k in S.get(c, set()))   # C1: source rows, not ledger
                    if len(insrc) == 1:
                        code, how = insrc[0], "src"
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
                ok = f["amt"] == l[2] and f["qty"] == l[0]            # B3: qty for every component
                if key[0] in ("procedure", "drug", "tax"):
                    ok = ok and f["units"] == {l[1]}
            differ = differ or not ok
            lines_out.append([nr, key[0], key[1],
                              fmt(f["qty"]) if f else "", ";".join(fmt(u) for u in sorted(f["units"])) if f else "",
                              fmt(f["amt"]) if f else "", fmt(f["tamb"]) if f else "", f["rows"] if f else 0,
                              fmt(l[0]) if l else "", fmt(l[1]) if l else "", fmt(l[2]) if l else "",
                              "EQUAL" if ok else "DIFFER"])
        verdict = ("AMBIGUOUS" if "ambiguous" in flags else "UNMAPPED" if "unmapped" in flags
                   else "DIFFER" if differ else "EQUAL-SRC" if "src" in flags else "EQUAL")
        comp = {}
        for (c, _), f in F.items():
            comp[c] = comp.get(c, Decimal(0)) + f["amt"]
        for (c, _), l in L.items():
            comp[c] = comp.get(c, Decimal(0)) - l[2]
        delta = {c: fmt(v) for c, v in sorted(comp.items()) if v != 0}
        a_tot = sum((f["amt"] for f in F.values()), Decimal(0))
        c_tot = sum((l[2] for l in L.values()), Decimal(0))
        b = pay.get(nr, (None, 0))
        fb = audit.get(nr, (0, 0, 0))
        fresh = (not fresh_required) or (fb[0] == 1 and fb[1] == 1 and fb[2] == 1)   # B5 (P16): exactly one in total, by benchmark@, at/after the run start
        b_eq_a = b[0] is not None and b[0] == a_tot
        rec = {"no_rawat": nr, "verdict": verdict, "delta": delta, "A": fmt(a_tot), "C": fmt(c_tot),
               "B": fmt(b[0]) if b[0] is not None else "", "B_rows": b[1], "B_eq_A": b_eq_a,
               "fresh_b": "%d/%d" % (fb[1], fb[0]) if has_audit else "n/a",
               "fresh_b_ok": fresh, "fresh_b_window": fb[2], "fresh_b_pre_run": fb[0] - fb[2],
               "form_rows": len(rows.get(nr, [])), "ledger_rows": len(L)}
        if exp is not None:
            e = exp.get(nr)
            if e is None:
                rec["outcome"] = "NO-EXPECTATION"
            else:
                rec["stratum"] = e["stratum"]
                want = e["expected_delta"]
                line_ok = (verdict in ("EQUAL", "EQUAL-SRC")) if not want else (verdict == "DIFFER")
                obs_form = {"%s|%s" % k: [fmt(f["qty"]), fmt(f["amt"])] for k, f in F.items()}
                pf = {k: [fmt(D(a, "manifest")), fmt(D(b2, "manifest"))] for k, (a, b2) in e["predicted_form"].items()}
                obs_led = {"%s|%s" % k: [fmt(l[0]), fmt(l[2])] for k, l in L.items()}
                pl = {k: [fmt(D(a, "manifest")), fmt(D(b2, "manifest"))] for k, (a, b2) in e["predicted_ledger"].items()}
                rec["form_model"] = "MATCH" if obs_form == pf else "DIFF"
                rec["ledger_model"] = "MATCH" if obs_led == pl else "DIFF"
                if rec["form_model"] == "DIFF":
                    rec["form_obs"], rec["form_pred"] = obs_form, pf
                if rec["ledger_model"] == "DIFF":
                    rec["ledger_obs"], rec["ledger_pred"] = obs_led, pl
                rec["expected"] = want
                ok_all = (delta == want and line_ok and fresh and b_eq_a          # B1
                          and rec["form_model"] == "MATCH" and rec["ledger_model"] == "MATCH")
                rec["outcome"] = "MATCH" if ok_all else "MISMATCH"
            rec["pass"] = rec["outcome"] == "MATCH"
        else:
            rec["pass"] = (verdict in ("EQUAL", "EQUAL-SRC") and not delta and fresh
                           and b[0] is not None and b[0] == c_tot)
        res.append(rec)
    with open(out, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["no_rawat", "component", "code", "form_qty", "form_unit", "form_amount",
                    "form_tambahan", "form_rows", "ledger_qty", "ledger_unit", "ledger_amount", "line"])
        w.writerows(lines_out)
    counts = {}
    for r in res:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    npass = sum(1 for r in res if r["pass"])
    summary = {"encounters": len(res), "pass": npass, "fail": len(res) - npass, "verdicts": counts,
               "lines": len(lines_out), "line_differ": sum(1 for x in lines_out if x[-1] != "EQUAL"),
               "fresh_b_ok": sum(1 for r in res if r["fresh_b"] != "n/a" and r["fresh_b_ok"]),
               "b_eq_a": sum(1 for r in res if r["B_eq_A"]),
               "mode": "expect" if exp is not None else "equal", "db": db, "ledger": ldb, "since": since}
    base = out.rsplit(".", 1)[0]
    with open(base + "_encounters.json", "w") as fh:
        json.dump(res, fh, indent=1, sort_keys=True)
    with open(base + "_summary.json", "w") as fh:
        json.dump(summary, fh, indent=1, sort_keys=True)
    for r in res:
        if not r["pass"] or exp is not None:
            print("ENC %s %s verdict=%s delta=%s A=%s B=%s C=%s freshB=%s%s" % (
                r["no_rawat"], r.get("stratum", ""), r["verdict"], json.dumps(r["delta"]),
                r["A"], r["B"], r["C"], r["fresh_b"],
                (" expected=%s outcome=%s form_model=%s ledger_model=%s"
                 % (json.dumps(r["expected"]), r["outcome"], r["form_model"], r["ledger_model"]))
                if "expected" in r else ""))
    print("P15-LINE-IDENTITY: " + json.dumps(summary, sort_keys=True))
    return 0 if npass == len(res) else 1


if __name__ == "__main__":
    try:
        sys.exit(run())
    except InputError as e:
        print("P15-LINE-IDENTITY INPUT-ERROR: %s" % e)
        sys.exit(2)
