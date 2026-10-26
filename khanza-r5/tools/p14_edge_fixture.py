#!/usr/bin/env python3
"""P14 T1: author the B3 edge-strata fixture (deterministic, clone-only).

Reads live `sik` / `sik_bench` with SELECT only, to pick codes and prices, then writes:
  <out>/p14_edge_fixture.sql     INSERTs for reg_periksa / rawat_jl_dr / detail_pemberian_obat,
                                 unqualified table names: load it into the CLONE only
  <out>/p14_edge_visits.txt      one no_rawat per line
  <out>/p14_edge_manifest.json   per visit: stratum, description, predicted form lines,
                                 predicted ledger lines, expected A_form - C per component

Reserved range: no_rawat 2027/12/31/9000NN, tgl_registrasi 2027-12-31 (T0: unused in sik).

Prediction models (stated so the run can falsify them):
  form   = the DR consumer's replica of DlgBilingRalan: registration = biaya_reg; procedure =
           sum(biaya_rawat) per code; drug = sum(total) per kode_brng (total includes
           embalase + tuslah); PPN = Java Math.round(subttl * 0.11) on doubles.
  ledger = build_dr_charge_ledger_p2.py: registration = dr_tariff REG; procedure = tariff * count
           (else sum(biaya_rawat)); drug = tariff * int(sum(jml)) (else source); tax =
           (drug_subtotal * 11 + 50) // 100, row only when > 0.

Usage:
  python3 p14_edge_fixture.py --out DIR            author the files
  python3 p14_edge_fixture.py --verify DIR         exit 1 naming any violation
"""
import hashlib
import json
import math
import os
import sys
from decimal import Decimal, ROUND_HALF_UP

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil  # noqa: E402

LIVE, BENCH = "sik", "sik_bench"
DATE = "2027-12-31"
PREFIX = "2027/12/31/9000"
TEMPLATE = "2026/10/01/800162"   # a real DR visit (T0): its reg_periksa row supplies FKs
REG_TARIFF = 10000


def q(db, sql):
    assert sql.lstrip().upper().startswith("SELECT"), "read-only tool"
    return dbutil.query(db, sql, force_root=True)


def irup(x):
    return int(Decimal(str(x)).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def java_round(x):
    return math.floor(x + 0.5)


def pick():
    """Deterministic code/price selection (ORDER BY code everywhere)."""
    dr_drugs = q(LIVE,
        "SELECT DISTINCT d.kode_brng FROM detail_pemberian_obat d JOIN reg_periksa r "
        "ON r.no_rawat=d.no_rawat WHERE r.no_rkm_medis LIKE 'DR%'")
    dr_drugs = {r[0] for r in dr_drugs}
    names = {}
    for kode, nama, jen, ralan in q(LIVE,
            "SELECT b.kode_brng, b.nama_brng, j.nama, b.ralan FROM databarang b "
            "JOIN jenis j ON j.kdjns=b.kdjns"):
        names.setdefault("%s (%s)" % (nama, jen), []).append(kode)
    disp = {k: n for n, ks in names.items() for k in ks}
    tariff = {(k, c): irup(p) for k, c, p in q(BENCH, "SELECT kind, code, dr_price FROM dr_tariff")}
    drugs = []
    for kode, ralan in q(LIVE, "SELECT kode_brng, ralan FROM databarang ORDER BY kode_brng"):
        ralan = irup(ralan or 0)
        if kode not in dr_drugs or ("drug", kode) not in tariff or not ralan:
            continue
        if tariff[("drug", kode)] != ralan or len(names[disp[kode]]) != 1:
            continue
        drugs.append((kode, ralan))
    dr_procs = {r[0] for r in q(LIVE,
        "SELECT DISTINCT rj.kd_jenis_prw FROM rawat_jl_dr rj JOIN reg_periksa r "
        "ON r.no_rawat=rj.no_rawat WHERE r.no_rkm_medis LIKE 'DR%'")}
    pnames = {}
    prow = q(LIVE, "SELECT kd_jenis_prw, nm_perawatan, total_byrdr FROM jns_perawatan ORDER BY kd_jenis_prw")
    for kd, nm, _ in prow:
        pnames.setdefault(nm, []).append(kd)
    procs, zero = [], []
    for kd, nm, tot in prow:
        tot = irup(tot or 0)
        uniq = len(pnames[nm]) == 1
        if kd in dr_procs and ("procedure", kd) in tariff and uniq and tot and \
                tot == tariff[("procedure", kd)]:
            procs.append((kd, tot))
        if uniq and tot == 0 and ("procedure", kd) not in tariff:
            zero.append(kd)
    by_price = {}
    for kd, p in procs:
        by_price.setdefault(p, []).append(kd)
    pair_price = min(p for p, ks in by_price.items() if len(ks) >= 2)
    pA, pB = sorted(by_price[pair_price])[:2]
    p1, p2 = [kd for kd, _ in procs if kd not in (pA, pB)][:2]
    return {"drugs": drugs, "procs": dict(procs), "pA": pA, "pB": pB, "p1": p1, "p2": p2,
            "pz": zero[0], "tariff": tariff, "pnames": pnames, "names": names, "disp": disp}


def e4_drugs(drugs):
    """Single drugs at qty 1..3 (or pairs at qty 1) whose subtotal mod 100 hits 50, 50, 50, 49, 51."""
    want, got, used = [50, 50, 50, 49, 51], [], set()
    for t in want:
        hit = None
        for qty in (1, 2, 3):
            for kode, p in drugs:
                s = p * qty
                if s % 100 == t and s not in used:
                    hit = [(kode, qty, p)]; break
            if hit:
                break
        if not hit:
            for i, (k1, a) in enumerate(drugs):
                for k2, b in drugs[i + 1:]:
                    if (a + b) % 100 == t and (a + b) not in used:
                        hit = [(k1, 1, a), (k2, 1, b)]; break
                if hit:
                    break
        assert hit, "no E4 drug combination for mod %d" % t
        used.add(sum(qty * p for _, qty, p in hit))
        got.append(hit)
    return got


def visits(P):
    d = P["drugs"]
    d1, d2, d3 = d[0], d[1], d[2]
    odd = [x for x in d if x[1] % 2 == 1][0]          # odd price: 0.5 x price has a half rupiah
    pr = P["procs"]
    pA, pB, p1, p2, pz = P["pA"], P["pB"], P["p1"], P["p2"], P["pz"]
    V = []

    def v(stratum, desc, procs=(), drugs=(), reg=10000):
        V.append({"stratum": stratum, "desc": desc, "reg": reg,
                  "procs": list(procs), "drugs": list(drugs)})
    # procs: (code, biaya_rawat);  drugs: (kode, price, jml, embalase, tuslah)
    for emb, dd in ((100, [d1]), (250, [d1, d2]), (1000, [d3])):
        v("E1", "embalase %d" % emb, [(p1, pr[p1])],
          [(k, p, 2 if dd == [d3] else 1, emb if k == dd[-1][0] else 0, 0) for k, p in dd])
    for tus, dd in ((100, [d1]), (250, [d1, d2]), (1000, [d3])):
        v("E2", "tuslah %d" % tus, [(p1, pr[p1])],
          [(k, p, 2 if dd == [d3] else 1, 0, tus if k == dd[-1][0] else 0) for k, p in dd])
    v("E3", "3 procs: equal-tariff pair + 1", [(pA, pr[pA]), (pB, pr[pB]), (p1, pr[p1])])
    v("E3", "same code twice + pair partner + drug", [(pA, pr[pA]), (pA, pr[pA]), (pB, pr[pB])],
      [(d1[0], d1[1], 1, 0, 0)])
    v("E3", "4 procs", [(pA, pr[pA]), (pB, pr[pB]), (p1, pr[p1]), (p2, pr[p2])])
    for hit in e4_drugs(d):
        s = sum(qq * p for _, qq, p in hit)
        v("E4", "drug subtotal %d (mod 100 = %d)" % (s, s % 100), [(p1, pr[p1])],
          [(k, p, qq, 0, 0) for k, qq, p in hit])
    v("E5a", "biaya_reg 0 + zero-priced untariffed proc + drug", [(pz, 0)],
      [(d1[0], d1[1], 1, 0, 0)], reg=0)
    v("E5a", "biaya_reg 0 + tariffed proc", [(p1, pr[p1])], reg=0)
    v("E5b", "tariffed proc billed 0 + drug", [(p1, 0)], [(d1[0], d1[1], 1, 0, 0)])
    v("E5b", "equal-tariff proc billed 0", [(pA, 0)])
    v("E6", "jml 0.5 (odd price)", [(p1, pr[p1])], [(odd[0], odd[1], 0.5, 0, 0)])
    v("E6", "jml 1.5 (odd price)", [(p1, pr[p1])], [(odd[0], odd[1], 1.5, 0, 0)])
    v("E6", "split: same drug in 2 rows of jml 1", [(p1, pr[p1])],
      [(d1[0], d1[1], 1, 0, 0), (d1[0], d1[1], 1, 0, 0)])
    v("E7", "drugs only", [], [(d1[0], d1[1], 1, 0, 0), (d2[0], d2[1], 1, 0, 0)])
    v("E7", "procedure only", [(p1, pr[p1])])
    v("E7", "two procedures only", [(p1, pr[p1]), (p2, pr[p2])])
    # E8: real name collisions from T0
    ambi_drug = "B000000208"
    ambi_proc = "J000840"
    pd = irup(q(LIVE, "SELECT ralan FROM databarang WHERE kode_brng='%s'" % ambi_drug)[0][0])
    pp = irup(q(LIVE, "SELECT total_byrdr FROM jns_perawatan WHERE kd_jenis_prw='%s'" % ambi_proc)[0][0])
    v("E8", "colliding drug name", [(p1, pr[p1])], [(ambi_drug, pd, 1, 0, 0)])
    v("E8", "colliding procedure name", [(ambi_proc, pp)], [(d1[0], d1[1], 1, 0, 0)])
    v("E8", "both collide", [(ambi_proc, pp)], [(ambi_drug, pd, 1, 0, 0)])
    return V


def predict(vis, P):
    T = P["tariff"]
    form, led = {}, {}
    form["registration|REG"] = [1, float(vis["reg"])]
    led["registration|REG"] = [1, T.get(("registration", "REG"), REG_TARIFF)]
    for kd, b in vis["procs"]:
        f = form.setdefault("procedure|" + kd, [0, 0.0]); f[0] += 1; f[1] += float(b)
    for kd in {k for k, _ in vis["procs"]}:
        n = sum(1 for k, _ in vis["procs"] if k == kd)
        s = sum(b for k, b in vis["procs"] if k == kd)
        led["procedure|" + kd] = [n, T[("procedure", kd)] * n if ("procedure", kd) in T else irup(s)]
    subttl = 0.0
    for kode, p, jml, emb, tus in vis["drugs"]:
        f = form.setdefault("drug|" + kode, [0, 0.0])
        f[0] += jml; f[1] += float(p) * jml + emb + tus
        subttl += float(p) * jml + emb + tus
    dsub = 0
    for kode in sorted({x[0] for x in vis["drugs"]}):
        qq = sum(x[2] for x in vis["drugs"] if x[0] == kode)
        if ("drug", kode) in T:
            amt = T[("drug", kode)] * int(qq)
        else:
            amt = irup(sum(x[1] * int(Decimal(str(x[2])).quantize(Decimal(1), rounding=ROUND_HALF_UP))
                           for x in vis["drugs"] if x[0] == kode))
        led["drug|" + kode] = [int(qq), amt]
        dsub += amt
    if subttl > 0:
        form["tax|PPN11"] = [1, float(java_round(subttl * 0.11))]
    tax = (dsub * 11 + 50) // 100
    if tax > 0:
        led["tax|PPN11"] = [1, tax]
    comp = {}
    for side, sign in ((form, 1), (led, -1)):
        for key, (_, a) in side.items():
            c = key.split("|")[0]
            comp[c] = comp.get(c, Decimal(0)) + sign * Decimal(str(a))
    delta = {c: str(v.normalize()) if v != v.to_integral() else str(int(v))
             for c, v in sorted(comp.items()) if v != 0}
    return ({k: [str(a), str(b)] for k, (a, b) in sorted(form.items())},
            {k: [str(a), str(b)] for k, (a, b) in sorted(led.items())}, delta, subttl)


def author(out):
    P = pick()
    tmpl = q(LIVE, "SELECT kd_dokter, kd_poli, p_jawab, almt_pj, hubunganpj, kd_pj, umurdaftar "
                   "FROM reg_periksa WHERE no_rawat='%s'" % TEMPLATE)[0]
    pdok = q(LIVE, "SELECT kd_dokter FROM rawat_jl_dr WHERE no_rawat='%s'" % TEMPLATE)[0][0]
    V = visits(P)
    sql, man, nrs = ["-- P14 edge-strata fixture: load into the CLONE only", "SET autocommit=0;"], {}, []
    for i, vis in enumerate(V, 1):
        nr = "%s%02d" % (PREFIX, i)
        rm = "DR%06d" % i
        jam = "09:%02d:00" % i
        nrs.append(nr)
        sql.append("INSERT INTO reg_periksa (no_reg,no_rawat,tgl_registrasi,jam_reg,kd_dokter,"
                   "no_rkm_medis,kd_poli,p_jawab,almt_pj,hubunganpj,biaya_reg,stts,stts_daftar,"
                   "status_lanjut,kd_pj,umurdaftar,sttsumur,status_bayar,status_poli) VALUES "
                   "('9000%02d','%s','%s','%s','%s','%s','%s','%s','%s','%s',%d,'Belum','Lama',"
                   "'Ralan','%s',%d,'Th','Belum Bayar','Lama');"
                   % (i, nr, DATE, jam, tmpl[0], rm, tmpl[1], tmpl[2], tmpl[3], tmpl[4],
                      vis["reg"], tmpl[5], int(tmpl[6])))
        for j, (kd, b) in enumerate(vis["procs"]):
            sql.append("INSERT INTO rawat_jl_dr (no_rawat,kd_jenis_prw,kd_dokter,tgl_perawatan,"
                       "jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,biaya_rawat,stts_bayar) "
                       "VALUES ('%s','%s','%s','%s','09:%02d:%02d',0,0,0,0,0,%d,NULL);"
                       % (nr, kd, pdok, DATE, i, j, b))
        for j, (kode, p, jml, emb, tus) in enumerate(vis["drugs"]):
            tot = float(p) * jml + emb + tus
            sql.append("INSERT INTO detail_pemberian_obat (tgl_perawatan,jam,no_rawat,kode_brng,"
                       "h_beli,biaya_obat,jml,embalase,tuslah,total,status,kd_bangsal,no_batch,"
                       "no_faktur) VALUES ('%s','09:%02d:%02d','%s','%s',%d,%d,%s,%d,%d,%s,"
                       "'Ralan',NULL,'','');" % (DATE, i, 30 + j, nr, kode, p, p, repr(jml),
                                                emb, tus, repr(tot)))
        form, led, delta, subttl = predict(vis, P)
        man[nr] = {"stratum": vis["stratum"], "desc": vis["desc"], "no_rkm_medis": rm,
                   "predicted_form": form, "predicted_ledger": led,
                   "expected_delta": delta, "form_drug_subtotal": repr(subttl)}
    sql.append("COMMIT;")
    meta = {"pair_price_codes": [P["pA"], P["pB"]], "p1": P["p1"], "p2": P["p2"],
            "zero_proc": P["pz"], "template": TEMPLATE, "date": DATE}
    os.makedirs(out, exist_ok=True)
    files = {"p14_edge_fixture.sql": "\n".join(sql) + "\n",
             "p14_edge_visits.txt": "\n".join(nrs) + "\n",
             "p14_edge_manifest.json": json.dumps({"meta": meta, "visits": man},
                                                  indent=1, sort_keys=True) + "\n"}
    for name, body in files.items():
        with open(os.path.join(out, name), "w", newline="\n") as f:
            f.write(body)
        print("%s  %s" % (hashlib.sha256(body.encode()).hexdigest(), name))
    print("P14-FIXTURE: %d visits, strata %s" % (len(V), sorted({x["stratum"] for x in V})))
    return 0


def verify(out):
    bad = []
    nrs = [l.strip() for l in open(os.path.join(out, "p14_edge_visits.txt")) if l.strip()]
    man = json.load(open(os.path.join(out, "p14_edge_manifest.json")))["visits"]
    inl = ",".join("'%s'" % n for n in nrs)
    for (nr,) in q(LIVE, "SELECT no_rawat FROM reg_periksa WHERE no_rawat IN (%s)" % inl):
        bad.append("EXISTS-IN-LIVE %s" % nr)
    rms = sorted({m["no_rkm_medis"] for m in man.values()})
    have = {r[0] for r in q(LIVE, "SELECT no_rkm_medis FROM pasien WHERE no_rkm_medis IN (%s)"
                            % ",".join("'%s'" % r for r in rms))}
    bad += ["NO-PATIENT %s" % r for r in rms if r not in have]
    for nr in nrs:
        if nr not in man:
            bad.append("NO-MANIFEST %s" % nr)
        elif "expected_delta" not in man[nr]:
            bad.append("NO-EXPECTATION %s" % nr)
    strata = {}
    for m in man.values():
        strata[m["stratum"]] = strata.get(m["stratum"], 0) + 1
    for s in ("E1", "E2", "E3", "E4", "E6", "E7", "E8"):
        if strata.get(s, 0) < 3:
            bad.append("STRATUM-UNDER-3 %s=%d" % (s, strata.get(s, 0)))
    if strata.get("E5a", 0) + strata.get("E5b", 0) < 3:
        bad.append("STRATUM-UNDER-3 E5")
    for i, line in enumerate(open(os.path.join(out, "p14_edge_fixture.sql")), 1):
        low = line.lower()
        if "sik." in low or "sik_bench" in low or low.startswith("use ") or " use " in low:
            bad.append("LIVE-REFERENCE line %d: %s" % (i, line.strip()[:80]))
    for b in bad:
        print("VERIFY-FAIL " + b)
    print("P14-VERIFY: %d visits, %d violations, strata %s"
          % (len(nrs), len(bad), dict(sorted(strata.items()))))
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--out":
        sys.exit(author(sys.argv[2]))
    if len(sys.argv) == 3 and sys.argv[1] == "--verify":
        sys.exit(verify(sys.argv[2]))
    print(__doc__)
    sys.exit(2)
