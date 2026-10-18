#!/usr/bin/env python3
"""P10-B6: independent hashes of the state a recovery must preserve (read-only).

Usage: python3 p10_hash_state.py <fixture_db> <run_id> <sample_visits_file> <protected_visits_file>
Prints one JSON object:
  stage     : {stage table: CHECKSUM TABLE ... EXTENDED} for r5_stage_B3_<run_id>_* on the fixture
  sample    : output-table content hash of the sample visits (same function the oracle uses)
  protected : output-table content hash of the protected (non-sample) visits
  live      : CHECKSUM TABLE ... EXTENDED of the live sik output tables
Computed with root, without the oracle's process (so the hashes are independent of the run
being checked). Exits 1 if any part could not be computed.
"""
import json
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
import dbutil  # noqa: E402
import sampled_real_form_diff_r5 as o  # noqa: E402

LIVE_TABLES = ["billing", "nota_jalan", "detail_nota_jalan", "piutang_pasien",
               "detail_piutang_pasien", "reg_periksa"]


def visits(path):
    with open(path) as f:
        return [l.strip() for l in f if l.strip()]


def main():
    db, run_id, sample_f, prot_f = sys.argv[1:5]
    pfx = o._stage_prefix(run_id, "B3")
    names = [r[0] for r in dbutil.query(db,
        "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() "
        "AND table_name LIKE '%s\\_%%' ORDER BY table_name" % pfx, force_root=True)]
    stage = {}
    for n in names:
        rows = dbutil.query(db, "CHECKSUM TABLE `%s` EXTENDED" % n, force_root=True)
        stage[n] = str(rows[0][1]) if rows else None
    log = lambda *a: None
    out = {
        "stage_prefix": pfx,
        "stage": stage,
        "stage_rows": {n: int(dbutil.scalar(db, "SELECT COUNT(*) FROM `%s`" % n, force_root=True) or 0)
                       for n in names},
        "sample": o._content_hash(visits(sample_f), db, log),
        "protected": o._content_hash(visits(prot_f), db, log),
        "protected_n": len(visits(prot_f)),
        "live": ":".join(str(r[1]) for r in dbutil.query(
            "sik", "CHECKSUM TABLE %s EXTENDED" % ", ".join("sik." + t for t in LIVE_TABLES),
            force_root=True)),
    }
    print(json.dumps(out, sort_keys=True))
    bad = (not names) or any(v is None for v in stage.values()) or not out["live"]
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
