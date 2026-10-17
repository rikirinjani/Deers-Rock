#!/usr/bin/env python3
"""write_diagnosa.py — post-consumer diagnosis writer for the DR dx pipeline.

Reads inline DX lines (`DX <no_rawat> <kode>[,<kode2>]`) from an encounters
file and idempotently writes sik.diagnosa_pasien:
  - delete-then-insert scoped to the DX no_rawat set (re-runs never duplicate;
    PK = no_rawat + kd_penyakit + status)
  - status='Ralan' (outpatient), prioritas=1 primary / 2 secondary
  - status_penyakit left NULL (no grounded Lama/Baru data — not faked)
  - FK guard: every code must exist in penyakit (violations refused, logged)

Why a separate writer: KhanzaBillingConsumer.java has NO diagnosis path
(grep evidence, P5) and Khanza sources are off-limits; this keeps the
consumer untouched and the write reversible:
  mysql -uroot sik -e "DELETE FROM diagnosa_pasien WHERE no_rawat LIKE '2026/10/8%'"
(adapt the LIKE to the generated window when wiping a dx corpus).

Usage: RUN_ID=<id> python3 write_diagnosa.py --enc <path> [--stage <label>]
Exit 0 ok; 2 usage; 3 FK violations refused; 1 other.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil

CHUNK = 500


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--enc", required=True, help="encounters file with DX lines")
    ap.add_argument("--stage", default="dx")
    args = ap.parse_args()

    tool = dbutil.Tool("write_diagnosa_%s" % args.stage)
    dx = {}
    with open(args.enc, "r", encoding="utf-8") as f:
        for line in f:
            if not line.startswith("DX "):
                continue
            parts = line.split()
            if len(parts) != 3:
                tool.log("SKIP malformed DX line: %r" % line[:80])
                continue
            dx[parts[1]] = parts[2].split(",")
    if not dx:
        tool.log("no DX lines found in %s (generator run without --dx?)" % args.enc)
        return 0

    nrs = sorted(dx)
    codes = sorted({c for cs in dx.values() for c in cs})
    tool.log("dx corpus: %d visits, %d distinct codes" % (len(nrs), len(codes)))

    # FK guard against the real master (codes are [A-Z0-9.]; literal IN list)
    lit = ",".join("'%s'" % c for c in codes)
    valid = {r[0] for r in dbutil.query(
        "sik", "SELECT kd_penyakit FROM penyakit WHERE kd_penyakit IN (%s)" % lit)}
    bad = [c for c in codes if c not in valid]
    if bad:
        tool.log("FK VIOLATIONS (refusing): %d codes not in penyakit: %s"
                 % (len(bad), ", ".join(bad[:10])))
        return 3
    tool.log("FK guard: all %d codes exist in penyakit" % len(codes))

    # idempotent: delete scoped to the DX set, then insert
    deleted = 0
    for i in range(0, len(nrs), CHUNK):
        chunk = nrs[i:i + CHUNK]
        dbutil.query(
            "sik",
            "DELETE FROM diagnosa_pasien WHERE no_rawat IN (%s)"
            % ",".join("'%s'" % n for n in chunk))
        deleted += len(chunk)
    tool.log("scoped delete done for %d visits" % deleted)

    values, n_prim, n_sec = [], 0, 0
    for nr in nrs:
        for pri, code in enumerate(dx[nr], start=1):
            values.append("('%s','%s','Ralan',%d,NULL)"
                          % (nr, code, 1 if pri == 1 else 2))
            if pri == 1:
                n_prim += 1
            else:
                n_sec += 1
    for i in range(0, len(values), CHUNK):
        dbutil.query(
            "sik",
            "INSERT INTO diagnosa_pasien (no_rawat, kd_penyakit, status, "
            "prioritas, status_penyakit) VALUES %s"
            % ",".join(values[i:i + CHUNK]))
    tool.log("inserted %d rows (%d primary, %d secondary) for %d visits — "
             "IDEMPOTENT (rerun yields same state)" % (len(values), n_prim,
                                                       n_sec, len(nrs)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
