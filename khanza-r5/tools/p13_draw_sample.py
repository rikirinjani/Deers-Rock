#!/usr/bin/env python3
"""P13 T1: deterministic stratified sample of DR encounters WITHOUT form-saved payments.

Eligibility (handoff §2 T1):
  - DR encounters: reg_periksa.no_rkm_medis LIKE 'DR%'
  - NO detail_nota_jalan row for the visit (previously unsampled)
  - NOT in the R4 999-visit sample (/opt/dr-benchmark/r4_sample/B3_sampled_form_diff.csv)

Strata: month of no_rawat (12 months in the 365-day cohort) × {seed, generated}.
  seed      = no_rawat NOT LIKE '____/__/__/8_____%' (the 354 October "seed" visits)
  generated = no_rawat LIKE  '____/__/__/8_____%'   (the 86,101 synthetic visits)

Allocation: N proportional to stratum size, minimum 5 per non-empty stratum.
Draw: random.Random(20261024) over the ordered (no_rawat-sorted) candidate list.

Output:
  visits file      (one no_rawat per line, in draw order)
  stratum CSV      (no_rawat, stratum, allocated, drawn)
  sha256 of the visits file

Usage:
  python3 p13_draw_sample.py --n 30 [--r4-csv <path>] [--out-dir <path>]
  python3 p13_draw_sample.py --verify <visits-file>   # exit 1 if any ineligible visit

No writes to any database. SELECT only.
"""
import argparse
import csv
import datetime
import hashlib
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dbutil  # noqa: E402

CONSUMER_DB = os.environ.get("P13_CONSUMER_DB", "sik")
R4_DEFAULT = "/opt/dr-benchmark/r4_sample/B3_sampled_form_diff.csv"
SEED = 20261024


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def month_of(no_rawat):
    """Extract YYYY-MM from no_rawat (format YYYY/MM/DD/NNNNNN)."""
    parts = no_rawat.split("/")
    if len(parts) >= 2:
        return "%s-%s" % (parts[0], parts[1])
    return "??"


def is_seed(no_rawat):
    """Seed visits are NOT in the 8-prefix pattern (the 354 October native-numbered
    visits, e.g. 2026/10/01/000298). Generated visits have the 8-prefix
    (e.g. 2026/10/01/800085, matching GEN_LIKE '____/__/__/8_____' from the oracle)."""
    tail = no_rawat.split("/")[-1]
    return not tail.startswith("8")


def is_generated(no_rawat):
    """Generated visits carry the 8-prefix in the last path component."""
    tail = no_rawat.split("/")[-1]
    return tail.startswith("8")


def load_r4(r4_csv):
    """Return the set of no_rawat values from the R4 sample CSV."""
    if not os.path.exists(r4_csv):
        print("WARN: R4 CSV not found at %s — skipping R4 exclusion" % r4_csv, file=sys.stderr)
        return set()
    s = set()
    with open(r4_csv, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            nr = row.get("no_rawat", "").strip()
            if nr:
                s.add(nr)
    print("R4 sample: %d visits excluded" % len(s), file=sys.stderr)
    return s


def draw(n, r4_csv, out_dir):
    r4_set = load_r4(r4_csv)
    # Candidates: DR encounters with no detail_nota_jalan row, not in R4
    sql = (
        "SELECT r.no_rawat FROM reg_periksa r "
        "WHERE r.no_rkm_medis LIKE 'DR%%' "
        "AND NOT EXISTS (SELECT 1 FROM detail_nota_jalan d WHERE d.no_rawat = r.no_rawat)"
    )
    if r4_set:
        inl = ",".join("'%s'" % v for v in sorted(r4_set))
        sql += " AND r.no_rawat NOT IN (%s)" % inl
    sql += " ORDER BY r.no_rawat"
    rows = dbutil.query(CONSUMER_DB, sql)
    all_candidates = [r[0] for r in rows]
    print("candidates (DR, no form-saved payment, not R4): %d" % len(all_candidates), file=sys.stderr)

    # Stratify
    strata = {}
    for nr in all_candidates:
        m = month_of(nr)
        s = "seed" if is_seed(nr) else "generated"
        key = "%s|%s" % (m, s)
        strata.setdefault(key, []).append(nr)

    # Allocation: proportional with min 5 per non-empty stratum
    total = len(all_candidates)
    alloc = {}
    for key in sorted(strata):
        size = len(strata[key])
        if size <= 0:
            alloc[key] = 0
            continue
        # Proportional share, minimum 5 if the stratum has at least 5 members
        raw = n * size / total
        if size >= 5:
            alloc[key] = max(5, int(raw + 0.5))
        else:
            alloc[key] = size  # take all (can't allocate 5 from <5)
    # Rescale to exactly n: shrink the largest strata first, fill from the largest
    for _ in range(100):  # bounded loop
        s = sum(alloc.values())
        if s == n:
            break
        if s > n:
            for k in sorted(alloc, key=lambda k: alloc[k], reverse=True):
                if alloc[k] > 1:
                    alloc[k] -= 1
                    break
            else:
                break
        else:
            for k in sorted(alloc, key=lambda k: len(strata[k]) - alloc[k], reverse=True):
                if alloc[k] < len(strata[k]):
                    alloc[k] += 1
                    break
            else:
                break

    rng = random.Random(SEED)
    chosen = []
    alloc_report = {}
    for key in sorted(strata):
        pool = list(strata[key])
        k = min(alloc[key], len(pool))
        picked = rng.sample(pool, k)
        for nr in picked:
            chosen.append(nr)
        alloc_report[key] = {"size": len(pool), "allocated": alloc[key], "drawn": k}

    chosen.sort()
    os.makedirs(out_dir, exist_ok=True)
    visits_path = os.path.join(out_dir, "p13_stage_%d_visits.txt" % n)
    csv_path = os.path.join(out_dir, "p13_stage_%d_stratum.csv" % n)
    with open(visits_path, "w") as f:
        for nr in chosen:
            f.write(nr + "\n")
    with open(csv_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["no_rawat", "stratum", "allocated", "drawn"])
        stratum_map = {}
        for key in strata:
            for nr in strata[key]:
                stratum_map[nr] = key
        for nr in chosen:
            key = stratum_map.get(nr, "?")
            ar = alloc_report.get(key, {})
            w.writerow([nr, key, ar.get("allocated", 0), ar.get("drawn", 0)])
    h = sha256_file(visits_path)
    print("N=%d | unique=%d | sha256=%s" % (n, len(chosen), h), file=sys.stderr)
    for key in sorted(alloc_report):
        ar = alloc_report[key]
        print("  %s: size=%d alloc=%d drawn=%d" % (key, ar["size"], ar["allocated"], ar["drawn"]), file=sys.stderr)
    print("visits=%s csv=%s sha256=%s" % (visits_path, csv_path, h))
    return 0


def verify(visits_file, r4_csv, out_dir):
    """Exit 1 if any visit in the file is ineligible (has detail_nota_jalan row
    or is in the R4 sample). Names the offender."""
    r4_set = load_r4(r4_csv)
    ineligible = []
    with open(visits_file) as f:
        for line in f:
            nr = line.strip()
            if not nr:
                continue
            # Check detail_nota_jalan
            cnt = dbutil.scalar(CONSUMER_DB,
                "SELECT COUNT(*) FROM detail_nota_jalan WHERE no_rawat='%s'" % nr)
            if cnt and int(cnt) > 0:
                ineligible.append((nr, "HAS detail_nota_jalan row"))
            if nr in r4_set:
                ineligible.append((nr, "IN R4 sample"))
    if ineligible:
        for nr, reason in ineligible:
            print("INELIGIBLE: %s (%s)" % (nr, reason))
        return 1
    print("verify: all visits eligible")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int)
    ap.add_argument("--verify")
    ap.add_argument("--r4-csv", default=R4_DEFAULT)
    ap.add_argument("--out-dir", default="/tmp/p13_sample")
    args = ap.parse_args()
    if args.verify:
        return verify(args.verify, args.r4_csv, args.out_dir)
    if not args.n:
        ap.error("--n or --verify required")
    return draw(args.n, args.r4_csv, args.out_dir)


if __name__ == "__main__":
    sys.exit(main())
