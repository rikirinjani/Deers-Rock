#!/usr/bin/env python3
r"""dx_patch.py — add opt-in ICD-10 diagnosis content to
generate_scale_encounters.py (backup .bak-dx taken by the caller).

Design (grounded; honesty rules applied):
- Codes come ONLY from the real sik.penyakit master (FK-safe).
  Tier A: codes with real usage in diagnosa_pasien (this hospital's actual
          outpatient prevalence proxy) — weight = observed count.
  Tier B: penyakit codes with accpdx='Y' AND validcode='1' (the master's own
          "acceptable as principal diagnosis" flag) — deterministic uniform
          subset of 2000 via md5(seed|dx|tierB).
- Per-TEMPLATE candidate set (K=3 codes, stable via md5(seed|dx|<template
  source no_rawat>)): same visit shape -> same small dx set. This is a
  visit-shape correlation, NOT claimed therapy logic.
- Per-visit draw via md5(seed|dxv|<no_rawat>): primary always; secondary
  (from the same template set, != primary) with p=0.25.
- Drug-basket->dx plausibility NOT implemented: no on-box data grounds it
  (no rx-dx corpus); left primary(+optional secondary)-dx-only by rule.
- DX line emitted inline right after ENC: `DX <no_rawat> <kode>[,<kode2>]`.
  The consumer parser skips non-ENC/OBAT lines inside a block (verified:
  KhanzaBillingConsumer.java lines 194-200) — consumer needs no change.
- Default OFF. With --dx absent: zero extra RNG calls, zero extra queries,
  byte-identical encounters output (B1 replay invariant preserved).
"""
import sys

PATH = sys.argv[1]
src = open(PATH, encoding="utf-8").read()
misses = []


def rep(old, new, label):
    global src
    if new in src:
        print("ALREADY " + label)
        return
    if old in src:
        src = src.replace(old, new, 1)
        print("OK      " + label)
    else:
        misses.append(label)
        print("MISS    " + label)


# 1. helpers before generate()
rep(
    "def generate(days, out_path, seed, start, lowered, tool):\n"
    '    mode = "lowered" if lowered else "base"',
    '''def build_dx_pools(tool, seed):
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
    tier_b = rng.sample(all_b, min(2000, len(all_b))) if all_b else []
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
    mode = "lowered" if lowered else "base"''',
    "helpers + signature")

# 2. dx init after template fetch
rep(
    '''    templates, reg_cols = fetch_templates(tool)
    if not templates:
        raise SystemExit("no DR template visits found in sik")

    lines = []            # encounter file lines''',
    '''    templates, reg_cols = fetch_templates(tool)
    if not templates:
        raise SystemExit("no DR template visits found in sik")

    tier_a, tier_b = build_dx_pools(tool, seed) if dx else (None, None)
    dx_tsets = {}

    lines = []            # encounter file lines''',
    "dx init")

# 3. per-visit DX line right after ENC
rep(
    '            lines.append("ENC %s %s %s" % (nr, diso, jam))\n'
    '            subttl = 0.0',
    '            lines.append("ENC %s %s %s" % (nr, diso, jam))\n'
    '            if dx:\n'
    '                tkey = t["reg"]["no_rawat"]\n'
    '                if tkey not in dx_tsets:\n'
    '                    dx_tsets[tkey] = dx_template_set(tkey, seed,\n'
    '                                                    tier_a, tier_b)\n'
    '                lines.append("DX %s %s"\n'
    '                             % (nr, ",".join(dx_visit_codes(\n'
    '                                 nr, seed, dx_tsets[tkey]))))\n'
    '            subttl = 0.0',
    "dx emit")

# 4. return dx count in gen dict
rep(
    '    return {"lines": lines, "reg_values": reg_values, "rawat_rows": rawat_rows,\n'
    '            "ledger_rows": ledger_rows, "per_day": per_day, "totals": totals,\n'
    '            "reg_cols": reg_cols, "sha256": sha}',
    '    return {"lines": lines, "reg_values": reg_values, "rawat_rows": rawat_rows,\n'
    '            "ledger_rows": ledger_rows, "per_day": per_day, "totals": totals,\n'
    '            "reg_cols": reg_cols, "sha256": sha,\n'
    '            "dx_lines": sum(1 for l in lines if l.startswith("DX ")),\n'
    '            "dx_enabled": bool(dx)}',
    "gen dict")

# 5. --dx flag
rep(
    '    ap.add_argument("--no-ledger", action="store_true",\n'
    '                    help="skip dr_charge_ledger rows (load reg/rawat only)")',
    '    ap.add_argument("--no-ledger", action="store_true",\n'
    '                    help="skip dr_charge_ledger rows (load reg/rawat only)")\n'
    '    ap.add_argument("--dx", action="store_true",\n'
    '                    help="emit inline DX lines (ICD-10 from penyakit master; '
    'default off)")',
    "arg flag")

# 6. pass dx through
rep(
    '    gen = generate(args.days, args.out, args.seed, start, lowered, tool)',
    '    gen = generate(args.days, args.out, args.seed, start, lowered, tool,\n'
    '                   dx=args.dx)',
    "main pass-through")

# 7. manifest note
rep(
    '        f.write("- encounters sha256: %s\\n" % gen["sha256"])',
    '        f.write("- encounters sha256: %s\\n" % gen["sha256"])\n'
    '        if args.dx:\n'
    '            f.write("- dx: enabled — inline DX lines (per-visit '
    'ICD-10; tier A usage-weighted + tier B accpdx=Y; per-template '
    'candidate sets; md5(seed|*) deterministic)\\n")',
    "manifest note")

if misses:
    sys.stderr.write("ABORT: missed anchors: %s\n" % ", ".join(misses))
    sys.exit(2)
open(PATH, "w", encoding="utf-8", newline="\n").write(src)
print("PATCHED -> %s" % PATH)
