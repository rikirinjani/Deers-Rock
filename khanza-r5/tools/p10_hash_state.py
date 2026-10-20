#!/usr/bin/env python3
"""P10-B6 / P11-T3: independent hashes of the state a recovery must preserve (read-only).

Usage: python3 p10_hash_state.py <fixture_db> <run_id> <sample_visits_file> <protected_visits_file>
       [--stage-tables-list <comma-separated expected r5_stage_B3_<run_id>_* table names>]
       [--live-db sik]

Prints one JSON object:
  stage     : {stage table: CHECKSUM TABLE ... EXTENDED} for r5_stage_B3_<run_id>_* on the fixture
  sample    : output-table content hash of the sample visits (same function the oracle uses)
  protected : output-table content hash of the protected (non-sample) visits
  live      : CHECKSUM TABLE ... EXTENDED of the live sik output tables
Computed with root, without the oracle's process (so the hashes are independent of the run
being checked).

P11-T3: a missing stage table, a NULL checksum, or (in strict mode) an incomplete inventory
is an ERROR exit (1) and the affected value is set to a non-comparable sentinel
"ERROR:<table>" that can never equal a real checksum. When --stage-tables-list is given the
inventory must contain exactly that set (asserted, not merely non-empty). Without the list
the PRE-operation snapshot is allowed to have an EMPTY inventory: it is taken before the run
creates any stage table, so emptiness is only a warning there. Exits 1 if any part could not
be computed, or if a strict inventory check fails / has a NULL.
"""
import json
import sys

sys.path.insert(0, "/opt/Deers-Rock/tools")
import dbutil  # noqa: E402
import sampled_real_form_diff_r5 as o  # noqa: E402

LIVE_TABLES = ["billing", "nota_jalan", "detail_nota_jalan", "piutang_pasien",
               "detail_piutang_pasien", "reg_periksa"]
ERR = lambda t: "ERROR:%s" % t  # non-comparable sentinel, never equals a real checksum


def visits(path):
    with open(path) as f:
        return [l.strip() for l in f if l.strip()]


def main():
    db, run_id, sample_f, prot_f = sys.argv[1:5]
    expected = None
    extra = sys.argv[5:]
    i = 0
    while i < len(extra):
        if extra[i] == "--stage-tables-list" and i + 1 < len(extra):
            expected = [t.strip() for t in extra[i + 1].split(",") if t.strip()]
            i += 2
        else:
            i += 1
    pfx = o._stage_prefix(run_id, "B3")
    names = [r[0] for r in dbutil.query(db,
        "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() "
        "AND table_name LIKE '%s\\_%%' ORDER BY table_name" % pfx, force_root=True)]
    stage = {}
    for n in names:
        rows = dbutil.query(db, "CHECKSUM TABLE `%s` EXTENDED" % n, force_root=True)
        # P11-T3: a NULL/missing checksum is an error value, not the string "None"
        stage[n] = str(rows[0][1]) if rows and rows[0][1] is not None else ERR(n)
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
    # P11-T3: completeness / NULL / empty checks
    errors = []
    if not names:
        # P11-T2: the PRE-operation snapshot is taken BEFORE the run creates any
        # stage table, so an empty inventory is legitimate there. Completeness is
        # asserted only in strict mode (--stage-tables-list <expected>).
        msg = "empty stage inventory (no r5_stage tables for %s)" % pfx
        if expected is not None:
            errors.append(msg)
        else:
            print("HASH-STATE WARN: %s (allowed outside strict mode)" % msg, file=sys.stderr)
    for n, v in stage.items():
        if v.startswith("ERROR:"):
            errors.append("NULL/missing checksum for %s" % n)
    # P11-T3: a missing table is an ERROR, not an empty inventory. A re-hash that
    # drops a stage table from the expected inventory is incomplete and must fail;
    # the caller asserts the complete inventory (the expected table list), which is
    # why dropping one table before the post-hash makes this check FAIL.
    if expected is not None:
        missing = [t for t in expected if t not in out["stage"]]
        extra = [n for n in out["stage"] if n not in expected]
        if missing:
            errors.append("expected stage tables missing: %s" % missing)
        if extra:
            errors.append("unexpected stage tables: %s" % extra)
    if not out["live"]:
        errors.append("live sik checksum empty")
    if errors:
        for e in errors:
            print("HASH-STATE ERROR: %s" % e, file=sys.stderr)
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
