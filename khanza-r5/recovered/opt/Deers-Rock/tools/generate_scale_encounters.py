#!/usr/bin/env python3
"""generate_scale_encounters.py — Phase 5 Stage B scale-ladder encounter generator.

Generates N days of DR class-C arrival-profile encounters (weekday 300/day,
Saturday 120/day, Sunday 30/day, Poisson-distributed counts, arrival times
sorted-uniform within 08:00-14:00 — the Poisson-process order statistics),
writes them in the DR export line format (ENC/OBAT/END) for
KhanzaBillingConsumer, AND loads the visit population so the rung's toolchain
works end-to-end:

  sik.reg_periksa          — one row per generated visit (INSERT ... ON
                             DUPLICATE KEY UPDATE; no_rkm_medis LIKE 'DR%',
                             biaya_reg = 10000 DR clinic fee). The consumer
                             REQUIRES a reg_periksa row per ENC block and
                             skips non-DR visits (seed-leakage guard).
  sik.rawat_jl_dr          — procedure rows (DELETE+INSERT per generated
                             no_rawat; zero material/menejemen/kso only —
                             the validated envelope).
  sik.detail_pemberian_obat — pre-deleted per generated no_rawat so the
                             consumer's UPSERT rebuilds exact totals even if
                             a prior generation differed.
  sik_bench.dr_charge_ledger — APPEND-ONLY ground truth for the generated
                             visits (existing 354-visit ledger untouched):
                             registration 10000/visit, drug = jml x
                             databarang.ralan per line, procedure =
                             biaya_rawat, tax = Java Math.round half-up of
                             11% of the per-visit drug subtotal. These are
                             EXACTLY the amounts the consumer bills (same
                             tariff source, same rounding), so three_count /
                             charge_delta reconcile per component.

Visit composition: templates sampled (deterministically, fixed seed) from the
real 354-visit October DR cohort — patient/poli/doctor/drug-basket/procedure
copied, no_rawat = YYYY/MM/DD/8NNNNN (per-day sequence from 800001; the real
registration counter never reaches 800000, so the '8' prefix at position 11 is
the generated-visit marker used by the other Stage B tools).

Determinism: master seed (default 20261012) + per-day RNG seeded from
md5("<seed>|<date>|<rate-mode>") — re-runs and overlapping rungs (B1 days are
a prefix of B2 days) generate byte-identical content for shared dates.
B3_lowered_rate: run_all.sh passes --days 365 with NO extra flag; the lowered
mode is auto-detected from 'lowered' in the --out basename (or --lowered-rate)
and lowers the WEEKDAY lambda 300 -> 200/day (Sat/Sun unchanged).

G2-tool scope note: three_count_reconcile.py / charge_delta_per_component.py
hard-scope to no_rawat LIKE '2026/10/%'. Days beyond 2026-10-31 (B2/B3) are
loaded + billed + ledgered identically but are reconciled only by this tool's
manifest, telemetry and the sampled real-form diff — recorded in DECISIONS.md.

Usage (run_all.sh): python3 generate_scale_encounters.py --days N --out PATH
No secrets in output. RUN_ID env selects the results dir for artifacts.
"""
import argparse
import datetime
import hashlib
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

DEFAULT_SEED = 20261012
DEFAULT_START = datetime.date(2026, 10, 1)
SEQ_BASE = 800001          # per-day sequence start; real counter max ~600
DR_REG_FEE = 10000         # DR clinic fee (== biaya_reg of the real cohort)
LAM_WEEKDAY = 300
LAM_WEEKDAY_LOWERED = 200
LAM_SAT = 120
LAM_SUN = 30
WINDOW_START_S = 8 * 3600  # 08:00:00
WINDOW_END_S = 14 * 3600   # 14:00:00
CHUNK = 500

RAWAT_COLS = ("no_rawat", "kd_jenis_prw", "kd_dokter", "tgl_perawatan",
              "jam_rawat", "material", "bhp", "tarif_tindakandr", "kso",
              "menejemen", "biaya_rawat")
# generated-visit marker: no_rawat sequence starting at position 11 with '8'
# (real registration counter never reaches 800000). Template fetches MUST
# exclude it or re-runs would sample previously generated visits as templates
# (non-deterministic pool) — the determinism bug caught by the smoke test.
REAL_ONLY = "no_rawat NOT LIKE '____/__/__/8_____'"


def sq(v):
    """SQL-quote a dbutil cell (cells are strings or None)."""
    if v is None:
        return "NULL"
    s = str(v).replace("\\", "\\\\").replace("'", "''")
    return "'%s'" % s


def num(v):
    """Ledger number literal: int when integral (load_354 convention)."""
    f = float(v)
    if f == int(f):
        return str(int(f))
    return repr(f)


def day_rng(seed, date, mode):
    key = "%d|%s|%s" % (seed, date.isoformat(), mode)
    return _Random(int(hashlib.md5(key.encode()).hexdigest()[:16], 16))


class _Random(object):
    """random.Random proxy (imported late to keep the poisson() together)."""

    def __init__(self, seed):
        import random
        self._r = random.Random(seed)

    def random(self):
        return self._r.random()

    def randrange(self, n):
        return self._r.randrange(n)


def poisson(rng, lam):
    """Knuth: Poisson draw via uniform products (stdlib has no poisson)."""
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while True:
        p *= rng.random()
        if p <= L:
            return k
        k += 1


def java_round(x):
    """Java Math.round: floor(x+0.5) — half-UP (Python round is half-even)."""
    return int(math.floor(x + 0.5))


def fetch_templates(tool):
    """Deterministic visit templates from the real 354-visit DR cohort."""
    reg_cols = [r[0] for r in dbutil.query(
        "sik", "SHOW COLUMNS FROM reg_periksa")]
    colsel = ",".join("`%s`" % c for c in reg_cols)
    reg_rows = dbutil.query(
        "sik", "SELECT %s FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%%' "
        "AND no_rawat LIKE '2026/10/%%' AND %s ORDER BY no_rawat"
        % (colsel, REAL_ONLY))
    templates = []
    by_nr = {}
    for row in reg_rows:
        d = dict(zip(reg_cols, row))
        t = {"reg": d, "drugs": [], "proc": None}
        templates.append(t)
        by_nr[d["no_rawat"]] = t
    tool.log("template reg rows: %d (cols=%d)" % (len(templates), len(reg_cols)))

    # drug baskets: resep_dokter x resep_obat, price = databarang.ralan with a
    # valid jenis join (the consumer's billing query INNER JOINs jenis — a
    # kode without the join would silently vanish from billing and break the
    # ledger reconciliation)
    drugs = dbutil.query(
        "sik",
        "SELECT ro.no_rawat, rd.kode_brng, rd.jml, b.ralan, b.nama_brng "
        "FROM resep_obat ro "
        "JOIN resep_dokter rd ON rd.no_resep = ro.no_resep "
        "JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat "
        "JOIN databarang b ON b.kode_brng = rd.kode_brng "
        "JOIN jenis j ON j.kdjns = b.kdjns "
        "WHERE rp.no_rkm_medis LIKE 'DR%%' AND rp.%s "
        "ORDER BY ro.no_rawat, rd.kode_brng" % REAL_ONLY)
    n_price_drop = 0
    all_drug = dbutil.query(
        "sik",
        "SELECT COUNT(*) FROM resep_obat ro "
        "JOIN resep_dokter rd ON rd.no_resep = ro.no_resep "
        "JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat "
        "WHERE rp.no_rkm_medis LIKE 'DR%%' AND rp.%s" % REAL_ONLY)[0][0]
    for nr, kode, jml, ralan, nama in drugs:
        t = by_nr.get(nr)
        if t is None:
            continue
        try:
            jml_f, ralan_f = float(jml or 0), float(ralan or 0)
        except ValueError:
            n_price_drop += 1
            continue
        if jml_f <= 0 or ralan_f <= 0:
            n_price_drop += 1
            continue
        t["drugs"].append({"kode": kode, "jml": jml_f, "ralan": ralan_f,
                           "nama": nama or kode})
    # procedures: first per visit, zero material/menejemen/kso only (envelope)
    procs = dbutil.query(
        "sik",
        "SELECT rw.no_rawat, rw.kd_jenis_prw, rw.biaya_rawat, rw.kd_dokter, "
        "rw.material, rw.menejemen, rw.kso, rw.bhp, rw.tarif_tindakandr "
        "FROM rawat_jl_dr rw JOIN reg_periksa rp ON rp.no_rawat = rw.no_rawat "
        "JOIN jns_perawatan jp ON jp.kd_jenis_prw = rw.kd_jenis_prw "
        "WHERE rp.no_rkm_medis LIKE 'DR%%' AND rp.%s "
        "ORDER BY rw.no_rawat, rw.kd_jenis_prw" % REAL_ONLY)
    for nr, kd, biaya, kddok, mat, men, kso, bhp, tarif in procs:
        t = by_nr.get(nr)
        if t is None or t["proc"] is not None:
            continue
        if any(float(x or 0) != 0 for x in (mat, men, kso)):
            continue  # sarpras surcharge outside validated envelope
        try:
            bf = float(biaya or 0)
        except ValueError:
            continue
        if bf <= 0:
            continue
        t["proc"] = {"kd": kd, "biaya": bf, "kd_dokter": kddok,
                     "bhp": float(bhp or 0), "tarif": float(tarif or 0)}
    n_drug_visits = sum(1 for t in templates if t["drugs"])
    n_proc_visits = sum(1 for t in templates if t["proc"])
    tool.log("templates: %d visits, %d with drugs, %d with procedure, "
             "%d drug lines dropped (price/join filter; source lines=%s)"
             % (len(templates), n_drug_visits, n_proc_visits, n_price_drop,
                all_drug))
    return templates, reg_cols


def build_dx_pools(tool, seed):
    """Two-tier ICD-10 pool from the real penyakit master (FK-safe)."""
    usage = dbutil.query(
        "sik", "SELECT kd_penyakit, COUNT(*) c FROM diagnosa_pasien "
               "GROUP BY kd_penyakit ORDER BY c DESC")
    tier_a = []
    for code, n in usage:
        tier_a.extend([code] * int(n))
    rows = dbutil.query(
        "sik", "SELECT kd_penyakit FROM penyakit "
               "WHERE accpdx='Y' AND validcode='1' ORDER BY kd_penyakit")
    rng = _Random(int(hashlib.md5(
        ("%d|dx|tierB" % seed).encode()).hexdigest()[:16], 16))
    all_b = [r[0] for r in rows]
    n_b = min(2000, len(all_b))
    idx = set()
    while len(idx) < n_b:
        idx.add(rng.randrange(len(all_b)))
    tier_b = [all_b[i] for i in sorted(idx)] if all_b else []
    tool.log("dx pools: tier A (usage-weighted) %d tickets over %d codes; "
             "tier B (accpdx=Y,validcode=1) %d of %d codes"
             % (len(tier_a), len(usage), len(tier_b), len(all_b)))
    return tier_a, tier_b


def dx_template_set(tkey, seed, tier_a, tier_b):
    """Stable K=3 candidate codes per template (visit-shape correlation)."""
    rng = _Random(int(hashlib.md5(
        ("%d|dx|%s" % (seed, tkey)).encode()).hexdigest()[:16], 16))
    picks = []
    for _ in range(3):
        if tier_a and rng.random() < 0.7:
            picks.append(tier_a[rng.randrange(len(tier_a))])
        elif tier_b:
            picks.append(tier_b[rng.randrange(len(tier_b))])
        elif tier_a:
            picks.append(tier_a[rng.randrange(len(tier_a))])
    seen, out = set(), []
    for c in picks:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out or [tier_a[0]]


def dx_visit_codes(nr, seed, tset):
    """Per-visit draw: primary always; secondary (p=0.25, != primary)."""
    rng = _Random(int(hashlib.md5(
        ("%d|dxv|%s" % (seed, nr)).encode()).hexdigest()[:16], 16))
    primary = tset[rng.randrange(len(tset))]
    codes = [primary]
    if len(tset) > 1 and rng.random() < 0.25:
        sec = tset[rng.randrange(len(tset))]
        if sec != primary:
            codes.append(sec)
    return codes


def generate(days, out_path, seed, start, lowered, tool, dx=False):
    mode = "lowered" if lowered else "base"
    lam_w = LAM_WEEKDAY_LOWERED if lowered else LAM_WEEKDAY
    tool.log("generating %d days from %s (mode=%s, weekday lambda=%d, "
             "Sat=%d, Sun=%d, seed=%d)" % (days, start.isoformat(), mode,
                                           lam_w, LAM_SAT, LAM_SUN, seed))

    templates, reg_cols = fetch_templates(tool)
    if not templates:
        raise SystemExit("no DR template visits found in sik")

    tier_a, tier_b = build_dx_pools(tool, seed) if dx else (None, None)
    dx_tsets = {}

    lines = []            # encounter file lines
    reg_values = []       # reg_periksa value tuples (as SQL fragment strings)
    rawat_rows = []       # dicts for rawat_jl_dr
    ledger_rows = []      # (no_rawat, component, code, qty, unit, amount)
    per_day = []
    totals = {"visits": 0, "drug_lines": 0, "proc_visits": 0, "reg_only": 0}

    for i in range(days):
        date = start + datetime.timedelta(days=i)
        wd = date.weekday()  # Mon=0 .. Sun=6
        lam = LAM_SAT if wd == 5 else (LAM_SUN if wd == 6 else lam_w)
        rng = day_rng(seed, date, mode)
        n = poisson(rng, lam)
        day_kind = "sat" if wd == 5 else ("sun" if wd == 6 else "weekday")
        # arrival times: sorted uniforms in [08:00,14:00) — order statistics
        secs = sorted(int(WINDOW_START_S +
                          rng.random() * (WINDOW_END_S - WINDOW_START_S))
                      for _ in range(n))
        made = 0
        for j, s in enumerate(secs):
            t = templates[rng.randrange(len(templates))]
            jam = "%02d:%02d:%02d" % (s // 3600, (s % 3600) // 60, s % 60)
            nr = "%04d/%02d/%02d/%06d" % (date.year, date.month, date.day,
                                          SEQ_BASE + j)
            diso = date.isoformat()

            # reg_periksa: template row, overridden identity/date/fee
            reg = dict(t["reg"])
            reg["no_rawat"] = nr
            reg["tgl_registrasi"] = diso
            reg["jam_reg"] = jam
            reg["biaya_reg"] = str(DR_REG_FEE)
            reg["status_bayar"] = "Belum Bayar"
            reg_values.append("(%s)" % ",".join(sq(reg[c]) for c in reg_cols))

            # encounter block
            lines.append("ENC %s %s %s" % (nr, diso, jam))
            if dx:
                tkey = t["reg"]["no_rawat"]
                if tkey not in dx_tsets:
                    dx_tsets[tkey] = dx_template_set(tkey, seed,
                                                    tier_a, tier_b)
                lines.append("DX %s %s"
                             % (nr, ",".join(dx_visit_codes(
                                 nr, seed, dx_tsets[tkey]))))
            subttl = 0.0
            seen_kode = set()
            for d in t["drugs"]:
                if d["kode"] in seen_kode:
                    continue  # one line per kode: consumer MAX-rule stays trivial
                seen_kode.add(d["kode"])
                hbeli = num(d["ralan"])
                lines.append("OBAT %s %s %s %s %s" % (
                    nr, d["kode"], str(d["nama"]).replace(" ", "_"), hbeli,
                    num(d["jml"])))
                amt = d["jml"] * d["ralan"]
                subttl += amt
                totals["drug_lines"] += 1
                ledger_rows.append((nr, "drug", d["kode"], d["jml"],
                                    d["ralan"], amt))
            lines.append("END")

            ledger_rows.append((nr, "registration", "REG", 1,
                                float(DR_REG_FEE), float(DR_REG_FEE)))
            p = t["proc"]
            if p is not None:
                rawat_rows.append({"no_rawat": nr, "kd_jenis_prw": p["kd"],
                                   "kd_dokter": p["kd_dokter"],
                                   "tgl_perawatan": diso, "jam_rawat": jam,
                                   "material": 0, "bhp": p["bhp"],
                                   "tarif_tindakandr": p["tarif"], "kso": 0,
                                   "menejemen": 0, "biaya_rawat": p["biaya"]})
                ledger_rows.append((nr, "procedure", p["kd"], 1, p["biaya"],
                                    p["biaya"]))
                totals["proc_visits"] += 1
            if subttl > 0:
                ppn = java_round(subttl * 0.11)
                ledger_rows.append((nr, "tax", "PPN11", 1, float(ppn),
                                    float(ppn)))
            if not t["drugs"] and p is None:
                totals["reg_only"] += 1
            made += 1
        per_day.append({"date": diso, "kind": day_kind, "lambda": lam,
                        "visits": made})
        totals["visits"] += made

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    sha = hashlib.sha256(open(out_path, "rb").read()).hexdigest()
    tool.log("wrote %s: %d visits, sha256=%s" % (out_path, totals["visits"],
                                                 sha[:16]))
    return {"lines": lines, "reg_values": reg_values, "rawat_rows": rawat_rows,
            "ledger_rows": ledger_rows, "per_day": per_day, "totals": totals,
            "reg_cols": reg_cols, "sha256": sha,
            "dx_lines": sum(1 for l in lines if l.startswith("DX ")),
            "dx_enabled": bool(dx)}


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def load_to_db(gen, tool):
    """Idempotent load: reg UPSERT, rawat/dpo delete+insert, ledger upsert."""
    nrs = []
    # collect generated no_rawats from ledger rows (every visit has >=1 row)
    seen = set()
    for nr, comp, code, q, u, a in gen["ledger_rows"]:
        if nr not in seen:
            seen.add(nr)
            nrs.append(nr)
    tool.log("loading %d reg rows, %d rawat rows, %d ledger rows "
             "(%d visits)" % (len(gen["reg_values"]), len(gen["rawat_rows"]),
                              len(gen["ledger_rows"]), len(nrs)))

    # 1. reg_periksa upsert (INSERT .. ON DUPLICATE KEY UPDATE — never
    #    DELETE, so no REPLACE-side-effects even if FKs existed)
    cols = gen["reg_cols"]
    colsel = ",".join("`%s`" % c for c in cols)
    upd = ",".join("`%s`=VALUES(`%s`)" % (c, c) for c in cols)
    for ch in chunked(gen["reg_values"], CHUNK):
        dbutil.execute("sik", "INSERT INTO reg_periksa (%s) VALUES %s "
                       "ON DUPLICATE KEY UPDATE %s;"
                       % (colsel, ",".join(ch), upd))

    # 2. pre-delete consumer-owned detail rows for generated visits
    for table in ("detail_pemberian_obat",):
        for ch in chunked(nrs, CHUNK):
            inl = ",".join("'%s'" % n for n in ch)
            dbutil.execute("sik", "DELETE FROM %s WHERE no_rawat IN (%s);"
                           % (table, inl))

    # 3. rawat_jl_dr: delete-then-insert per generated visit
    for ch in chunked(nrs, CHUNK):
        inl = ",".join("'%s'" % n for n in ch)
        dbutil.execute("sik", "DELETE FROM rawat_jl_dr WHERE no_rawat IN (%s);"
                       % inl)
    rc = RAWAT_COLS
    rcolsel = ",".join(rc)
    vals = []
    for r in gen["rawat_rows"]:
        vals.append("(%s)" % ",".join(
            sq(r[c]) if c in ("no_rawat", "kd_jenis_prw", "kd_dokter",
                              "tgl_perawatan", "jam_rawat")
            else num(r[c]) for c in rc))
    for ch in chunked(vals, CHUNK):
        dbutil.execute("sik", "INSERT INTO rawat_jl_dr (%s) VALUES %s;"
                       % (rcolsel, ",".join(ch)))

    # 4. ledger: upsert generated rows only (existing 354-visit ledger intact)
    lvals = []
    for nr, comp, code, q, u, a in gen["ledger_rows"]:
        lvals.append("('%s','%s','%s',%s,%s,%s)" % (nr, comp, code, num(q),
                                                    num(u), num(a)))
    for ch in chunked(lvals, CHUNK):
        dbutil.execute("sik_bench",
                       "INSERT INTO dr_charge_ledger (no_rawat,component,code,"
                       "quantity,unit_price,amount) VALUES %s "
                       "ON DUPLICATE KEY UPDATE quantity=VALUES(quantity),"
                       "unit_price=VALUES(unit_price),amount=VALUES(amount);"
                       % ",".join(ch))
    led = {c: int(n or 0) for c, n in dbutil.query(
        "sik_bench", "SELECT component, COUNT(*) FROM dr_charge_ledger "
        "GROUP BY component")}
    tool.log("ledger totals now: %s" % led)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--days", type=int, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--lowered-rate", action="store_true",
                    help="lower weekday arrival 300->200/day (B3_lowered_rate)")
    ap.add_argument("--seed", type=int, default=DEFAULT_SEED)
    ap.add_argument("--start-date", default=DEFAULT_START.isoformat())
    ap.add_argument("--no-load", action="store_true",
                    help="write the encounters file only (no DB load)")
    ap.add_argument("--no-ledger", action="store_true",
                    help="skip dr_charge_ledger rows (load reg/rawat only)")
    ap.add_argument("--dx", action="store_true",
                    help="emit inline DX lines (ICD-10 from penyakit master; default off)")
    args = ap.parse_args()

    lowered = args.lowered_rate or "lowered" in os.path.basename(args.out).lower()
    start = datetime.date.fromisoformat(args.start_date)
    tool = dbutil.Tool("generate_scale_encounters")

    gen = generate(args.days, args.out, args.seed, start, lowered, tool,
                   dx=args.dx)
    if not args.no_load:
        if args.no_ledger:
            gen["ledger_rows"] = []
        load_to_db(gen, tool)

    # manifest artifact
    label = os.path.basename(args.out).replace(".encounters.txt", "")
    d = os.path.join(dbutil.RESULTS_ROOT, tool.run_id)
    os.makedirs(d, exist_ok=True)
    comp_counts = {}
    for nr, comp, code, q, u, a in gen["ledger_rows"]:
        comp_counts[comp] = comp_counts.get(comp, 0) + 1
    with open(os.path.join(d, "%s_generate_manifest.md" % label), "w") as f:
        f.write("# %s generate manifest @ %s\n"
                % (label, datetime.datetime.now(datetime.timezone.utc)
                   .strftime("%Y-%m-%dT%H:%M:%SZ")))
        f.write("- days: %d (from %s, mode=%s)\n"
                % (args.days, start.isoformat(),
                   "lowered(weekday 200)" if lowered else "base(weekday 300)"))
        f.write("- seed: %d (fixed; per-day RNG = md5(seed|date|mode))\n"
                % args.seed)
        f.write("- visits: %d (weekday/sat/sun profile, Poisson, "
                "08:00-14:00)\n" % gen["totals"]["visits"])
        f.write("- drug lines: %d | procedure visits: %d | reg-only: %d\n"
                % (gen["totals"]["drug_lines"], gen["totals"]["proc_visits"],
                   gen["totals"]["reg_only"]))
        f.write("- ledger rows: %s\n" % comp_counts)
        f.write("- encounters sha256: %s\n" % gen["sha256"])
        if args.dx:
            f.write("- dx: enabled — inline DX lines (per-visit ICD-10; tier A usage-weighted + tier B accpdx=Y; per-template candidate sets; md5(seed|*) deterministic)\n")
        f.write("- note: days beyond 2026-10-31 are outside the G2 tools' "
                "2026/10 scope (reconciled via manifest+telemetry+sampled "
                "diff; see DECISIONS.md)\n")
        f.write("| date | kind | lambda | visits |\n|---|---|---|---|\n")
        for day in gen["per_day"]:
            f.write("| %s | %s | %s | %d |\n"
                    % (day["date"], day["kind"], day["lambda"], day["visits"]))
    tool.log("manifest written: %s/%s_generate_manifest.md"
             % (d, label))

    dbutil.decision("Stage B synthetic corpus design",
        "generate_scale_encounters.py builds the scale corpus by deterministic "
        "(seed %d, per-day md5 RNG) template sampling from the real 354-visit "
        "October DR cohort: patient/poli/doctor/drug-basket/procedure copied; "
        "no_rawat YYYY/MM/DD/8NNNNN from 800001 (position-11 '8' = generated "
        "marker); Poisson arrivals weekday %d Sat 120 Sun 30 within "
        "08:00-14:00; lowered mode weekday %d. Ledger rows use the consumer's "
        "exact semantics (reg 10000, drug jml x databarang.ralan, PPN "
        "Math.round half-up 11%%) so three_count/charge_delta reconcile. "
        "B2/B3 days beyond 2026-10-31 fall outside the G2 tools' hardcoded "
        "2026/10 scope — covered by generate manifest + telemetry + sampled "
        "real-form diff instead (G2 tools not modified, per instructions)."
        % (DEFAULT_SEED, LAM_WEEKDAY, LAM_WEEKDAY_LOWERED))
    return 0


if __name__ == "__main__":
    sys.exit(main())
