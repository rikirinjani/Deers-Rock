#!/usr/bin/env python3
"""replay_determinism_check.py — Phase 4 Stage A GATE G2: replay determinism.

Runs the consumer TWICE from the same seed/export (clean, seed-excluded DR
population) and requires:
  1. event-log hash: canonical (line-sorted) SHA-256 of the dr_export.sh
     output identical across both exports (ordering is not guaranteed by the
     export SQL, so the canonical form sorts lines first);
  2. row counts: billing value-row multiset (status, nm_perawatan, biaya,
     jumlah, totalbiaya per visit) identical after run1 vs run2, plus
     per-component row counts and totals identical;
  3. billing totals: per-component and overall totals identical;
  4. no source drift: content checksum (COUNT + BIT_XOR(CRC32(row))) of the
     source tables before/after, with reg_periksa.status_bayar excluded
     (the save path flips it — G1 precedent).

nota_jalan is recorded structurally (rows per visit) — no_nota is a
monotonic sequence number assigned at insert time and is NOT deterministic
across replays (observed RJ0477 -> RJ0489 for the same visit in prior idem
runs); value columns: the table has none (G1 precedent).

All billing/source reads target **sik** (the consumer's database.ini target).
Usage: python3 replay_determinism_check.py --stage A
"""
import os, sys, time, hashlib
import dbutil

RUN_ID = os.environ.get("RUN_ID", "test")
RDIR = os.path.join(dbutil.RESULTS_ROOT, RUN_ID)
DB = "sik"

COMPONENTS = ("registration", "procedure", "drug", "tax")
PROC_STATUS = ("ralan dokter", "ranap dokter", "ralan dokter paramedis",
               "ranap dokter paramedis", "ralan paramedis", "ranap paramedis")
SRC_TABLES = ["reg_periksa", "resep_obat", "resep_dokter", "rawat_jl_dr",
              "detail_pemberian_obat", "databarang", "jns_perawatan", "poliklinik"]


def get_dr_visits():
    rows = dbutil.query(DB,
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


def export_hash():
    """Canonical hash + line counts of /tmp/dr_encounters.txt."""
    data = open(dbutil.ENCOUNTERS, "rb").read()
    lines = sorted(data.splitlines())
    enc = sum(1 for l in data.splitlines() if l.startswith(b"ENC "))
    obat = sum(1 for l in data.splitlines() if l.startswith(b"OBAT "))
    return hashlib.sha256("\n".join(repr(l) for l in lines).encode()).hexdigest(), enc, obat


def billing_snapshot(in_clause):
    """Value-row multiset + per-component rows/totals + nota structural count."""
    rows = dbutil.query(DB,
        "SELECT no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya "
        "FROM billing WHERE no_rawat IN (%s) AND (biaya>0 OR totalbiaya>0) "
        "AND status NOT LIKE 'Ttl%%'" % in_clause)
    multiset = sorted((str(r[0]), str(r[1]), str(r[2]),
                       float(r[3] or 0), float(r[4] or 0), float(r[5] or 0)) for r in rows)
    comp = {}
    for r in rows:
        c = bucket(r[1], r[2])
        d = comp.setdefault(c, [0, 0.0])
        d[0] += 1
        d[1] += float(r[5] or 0)
    nota_n = dbutil.scalar(DB,
        "SELECT COUNT(*) FROM nota_jalan WHERE no_rawat IN (%s)" % in_clause)
    return {"multiset": multiset, "comp": comp, "nota_rows": int(nota_n or 0)}


def source_checksum():
    """COUNT + BIT_XOR(CRC32(row)) per source table (status_bayar excluded)."""
    parts = []
    for t in SRC_TABLES:
        cols = [c[0] for c in dbutil.query(DB, "SHOW COLUMNS FROM %s" % t)]
        sel = [c for c in cols if not (t == "reg_periksa" and c == "status_bayar")]
        expr = ",".join("`%s`" % c for c in sel) if sel else "0"
        r = dbutil.query(DB,
            "SELECT COUNT(*), COALESCE(BIT_XOR(CRC32(CONCAT_WS('#', %s))),0) FROM %s"
            % (expr, t))
        parts.append("%s:%s:%s" % (t, r[0][0], r[0][1]))
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:24]


def main():
    attempt = "A"
    argv = sys.argv[1:]
    if "--stage" in argv:
        i = argv.index("--stage")
        if i + 1 < len(argv):
            attempt = argv[i + 1]
    tool = dbutil.Tool("stageA_replay_%s" % attempt)
    os.makedirs(RDIR, exist_ok=True)
    t0 = time.time()
    tool.log("=== Stage A replay determinism (2x consumer from same export) ===")

    nr = get_dr_visits()
    in_clause = ",".join("'%s'" % n for n in nr)
    tool.log("DR visits: %d" % len(nr))

    results = {}
    for run in (1, 2):
        rc_exp, _ = dbutil.run_export()
        if rc_exp != 0:
            tool.log("FAIL: dr_export.sh rc=%d (run %d)" % (rc_exp, run))
            return 1
        eh, enc, obat = export_hash()
        if run == 1:
            h_src_before = source_checksum()
        clog = os.path.join(RDIR, "replay_run%d_consumer.log" % run)
        rc_cons, tail = dbutil.run_consumer(clog)
        if rc_cons != 0:
            tool.log("FAIL: consumer rc=%d (run %d); tail=%s"
                     % (rc_cons, run, tail.strip()[-150:]))
            return 1
        snap = billing_snapshot(in_clause)
        results[run] = {"export_hash": eh, "enc": enc, "obat": obat, "snap": snap}
        tool.log("run%d: export sha=%s ENC=%d OBAT=%d; billing value rows=%d "
                 "nota_rows=%d; consumer tail=%s"
                 % (run, eh[:16], enc, obat, len(snap["multiset"]), snap["nota_rows"],
                    tail.strip().splitlines()[-1][:120] if tail.strip() else ""))
    h_src_after = source_checksum()

    r1, r2 = results[1], results[2]
    export_same = r1["export_hash"] == r2["export_hash"]
    counts_same = (r1["enc"], r1["obat"]) == (r2["enc"], r2["obat"])
    multiset_same = r1["snap"]["multiset"] == r2["snap"]["multiset"]
    comp_same = r1["snap"]["comp"] == r2["snap"]["comp"]
    nota_same = r1["snap"]["nota_rows"] == r2["snap"]["nota_rows"]
    src_same = h_src_before == h_src_after

    tool.log("event-log hash: %s (%s)" % ("identical" if export_same else "DIFFER",
                                          r1["export_hash"][:16]))
    tool.log("row counts: %s (ENC %d/%d, OBAT %d/%d, value rows %d/%d)"
             % ("identical" if counts_same and multiset_same else "DIFFER",
                r1["enc"], r2["enc"], r1["obat"], r2["obat"],
                len(r1["snap"]["multiset"]), len(r2["snap"]["multiset"])))
    for c in COMPONENTS:
        n1 = r1["snap"]["comp"].get(c, [0, 0.0])
        n2 = r2["snap"]["comp"].get(c, [0, 0.0])
        tool.log("  %s: run1 rows=%d amt=%.0f | run2 rows=%d amt=%.0f"
                 % (c, n1[0], n1[1], n2[0], n2[1]))
    tool.log("billing totals: %s" % ("identical" if comp_same else "DIFFER"))
    tool.log("nota_jalan structural rows: %s (%d/%d; no_nota excluded — "
             "sequence numbers, observed non-deterministic)"
             % ("identical" if nota_same else "DIFFER",
                r1["snap"]["nota_rows"], r2["snap"]["nota_rows"]))
    tool.log("source checksum: %s (%s -> %s)"
             % ("no drift" if src_same else "DRIFTED", h_src_before, h_src_after))

    gate_pass = all([export_same, counts_same, multiset_same, comp_same, src_same])
    if len(r1["snap"]["multiset"]) == 0 or len(r2["snap"]["multiset"]) == 0:
        gate_pass = False
        tool.log("FAIL: billing value rows empty in run%d/run%d — empty-vs-empty "
                 "identity must not pass" % (1 if not r1["snap"]["multiset"] else 2,
                                             2 if not r2["snap"]["multiset"] else 1))
    tool.log("gate (hash+counts+totals identical, no source drift): %s"
             % ("PASS" if gate_pass else "FAIL"))

    rep = os.path.join(RDIR, "stageA_G2_validation.md")
    with open(rep, "a") as f:
        f.write("\n# Stage A replay determinism @ %s\n"
                % time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        f.write("- DR visits: %d\n" % len(nr))
        f.write("- event-log canonical hash: %s (%s)\n"
                % (r1["export_hash"][:16], "identical" if export_same else "DIFFER"))
        f.write("- value rows: %d vs %d; ENC %d/%d; OBAT %d/%d\n"
                % (len(r1["snap"]["multiset"]), len(r2["snap"]["multiset"]),
                   r1["enc"], r2["enc"], r1["obat"], r2["obat"]))
        for c in COMPONENTS:
            n1 = r1["snap"]["comp"].get(c, [0, 0.0])
            n2 = r2["snap"]["comp"].get(c, [0, 0.0])
            f.write("- %s: run1 rows=%d amt=%.0f | run2 rows=%d amt=%.0f\n"
                    % (c, n1[0], n1[1], n2[0], n2[1]))
        f.write("- nota_jalan structural rows: %d vs %d (no_nota excluded: "
                "sequence numbers non-deterministic)\n"
                % (r1["snap"]["nota_rows"], r2["snap"]["nota_rows"]))
        f.write("- source checksum: %s -> %s (%s)\n"
                % (h_src_before, h_src_after, "no drift" if src_same else "DRIFTED"))
        f.write("- gate: %s\n" % ("PASS" if gate_pass else "FAIL"))
    tool.log("wrote %s" % rep)
    tool.log("=== replay determinism %s in %.0fs ==="
             % ("PASS" if gate_pass else "FAIL", time.time() - t0))
    return 0 if gate_pass else 1


if __name__ == "__main__":
    sys.exit(main())
