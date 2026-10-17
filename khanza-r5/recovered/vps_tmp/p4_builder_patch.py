#!/usr/bin/env python3
r"""P4 rewording patch for build_benchmark_report.py (on-box runner).

Usage: python3 p4_builder_patch.py /opt/Deers-Rock/tools/build_benchmark_report.py

Fixes over the orchestrator draft:
- target path from argv (was a Windows-local path)
- idempotent: an edit already present counts as ALREADY, not MISS
- 3c anchor is dash-tolerant: tries em-dash (U+2014, what the file actually
  contains) then plain hyphen
- NEW edits 1c/1d/1e: the old "general_log files are 0 bytes / capture NOT
  obtained" claims became FALSE once B3 got a real 6.7 MB capture — replaced
  with data-driven, truthful wording.

Exit 0 = all edits applied or already present; exit 2 = any anchor MISS.
"""
import sys

PATH = sys.argv[1]
src = open(PATH, encoding="utf-8").read()
orig = src
misses = []


def rep(old, new, label):
    global src
    if new in src:
        print("ALREADY " + label)
        return
    if old in src:
        src = src.replace(old, new, 1)
        print("OK      " + label)
        return
    misses.append(label)
    print("MISS    " + label)


def rep3c(new, label):
    """Dash-tolerant variant for the publishable footnote block."""
    global src
    if new in src:
        print("ALREADY " + label)
        return
    for dash in ("\u2014", "-"):
        old = ('    a("\\\\* Count B is derived (B == A; real form not re-run at '
               'Stage A) ' + dash + ' "\n'
               '      "two independent counts per rung, not three. Both reconcile '
               'gates "\n'
               '      "cover the October window only; rungs beyond October are '
               'covered by "\n'
               '      "generation manifests, telemetry and sampled real-form '
               'diffs.")')
        if old in src:
            src = src.replace(old, new, 1)
            print("OK      " + label + " (matched dash=%r)" % dash)
            return
    misses.append(label)
    print("MISS    " + label)


# ---- 1a. overall verdict: scoped, not "ALL GATES PASS" ----
rep(
    '    if verdicts and all(v == "PASS" for v in verdicts):\n'
    '        overall = "ALL GATES PASS"\n'
    '    elif any(v == "FAIL" for v in verdicts):\n'
    '        overall = "FAIL \u2014 see gate table"\n'
    '    else:\n'
    '        overall = "PASS WITH GAPS (missing evidence: %d item(s))" % \\\n'
    '                  sum(1 for v in verdicts if v is None)',
    '    if verdicts and all(v == "PASS" for v in verdicts):\n'
    '        overall = ("PASS (scoped) \u2014 reconciliation exact on the gated "\n'
    '                   "October slice only; B3 sampled drift 1.85% (4/216) is a "\n'
    '                   "comparison artifact (population unbilled=0, P1); oracle "\n'
    '                   "NOT validated at scale; Nov-onward rows covered by "\n'
    '                   "manifest + telemetry + sampled diff only")\n'
    '    elif any(v == "FAIL" for v in verdicts):\n'
    '        overall = "FAIL \u2014 see gate table"\n'
    '    else:\n'
    '        overall = "PASS WITH GAPS (missing evidence: %d item(s))" % \\\n'
    '                  sum(1 for v in verdicts if v is None)',
    "1a overall=scoped verdict")

# ---- 1b. stdout log line ----
rep(
    '    log("overall: %s" % ("ALL PASS" if verdicts and all(\n'
    '        v == "PASS" for v in verdicts) else "SEE REPORT"))',
    '    log("overall: %s" % ("SCOPED PASS (Oct slice; oracle not validated "\n'
    '        "at scale)" if verdicts and all(\n'
    '        v == "PASS" for v in verdicts) else "SEE REPORT"))',
    "1b log overall=scoped")

# ---- 1c. evidence-basis general-log line: data-driven (B3 now has a real capture) ----
rep(
    '    a("- No real-form SQL capture for Stage B: the general_log files are "\n'
    '      "0 bytes%s \u2014 sampled-form verdicts rest on the sampled-diff drift, "\n'
    '      "not on full SQL capture." %\n'
    '      (" (%s)" % ", ".join("%s=%d B" % (r["stage"], r["general_log_bytes"])\n'
    '                           for r in rungs\n'
    '                           if r["general_log_bytes"] is not None)\n'
    '       if any(r["general_log_bytes"] is not None for r in rungs) else ""))',
    '    gl_zero = [r["stage"] for r in rungs if r["general_log_bytes"] == 0]\n'
    '    gl_have = ["%s=%d B" % (r["stage"], r["general_log_bytes"])\n'
    '               for r in rungs\n'
    '               if (r["general_log_bytes"] or 0) > 0]\n'
    '    a("- Real-form SQL capture: %s%s \u2014 sampled-form verdicts rest on the "\n'
    '      "sampled-diff drift. A 0-byte log means the capture was not obtained "\n'
    '      "(mysqld cannot write under the results dir); a non-zero log contains "\n'
    '      "real-form SQL only (it starts after the consumer has finished)." %\n'
    '      (", ".join(gl_have) if gl_have else "none",\n'
    '       ("; NOT obtained for %s" % "/".join(gl_zero)) if gl_zero else ""))',
    "1c evidence-basis capture line data-driven")

# ---- 1d. ladder drift footnote: conditional, not all-rungs-are-zero ----
rep(
    '    a("- \'sampled drift\' is a sample estimate (25 per 10k, 45-min cap), "\n'
    '      "not a full-population check; with the real-form SQL capture empty "\n'
    '      "(0-byte general_log files), the drift sample is the only real-form "\n'
    '      "evidence for Stage B.")',
    '    a("- \'sampled drift\' is a sample estimate (25 per 10k, 45-min cap), "\n'
    '      "not a full-population check. For rungs whose general log is 0 bytes "\n'
    '      "the drift sample is the only real-form evidence; rungs with a real "\n'
    '      "capture also have the real-form SQL trail.")',
    "1d ladder drift footnote conditional")

# ---- 2. charge-delta section: shared price source caveat ----
rep(
    '    a("SCOPE: charge-delta covers October-only, same as three-count "\n'
    '      "(no_rawat LIKE \'2026/10/%\'). The PASS verdicts above apply to the "\n'
    '      "October slice of each rung; November-onward visits are reconciled "\n'
    '      "via manifest + telemetry + sampled diff only.")',
    '    a("SCOPE: charge-delta covers October-only, same as three-count "\n'
    '      "(no_rawat LIKE \'2026/10/%\'). The PASS verdicts above apply to the "\n'
    '      "October slice of each rung; November-onward visits are reconciled "\n'
    '      "via manifest + telemetry + sampled diff only.")\n'
    '    a("PRICE-SOURCE CAVEAT: the price source is shared \u2014 databarang.ralan "\n'
    '      "on BOTH the Khanza and DR-ledger sides. A zero charge-delta therefore "\n'
    '      "validates quantity + arithmetic only, NOT price mapping; a price-mapping "\n'
    '      "bug that affects both sides equally cannot appear. To detect price "\n'
    '      "errors, a DR-owned independent tariff table (not the shared master list) "\n'
    '      "is required as the ledger price source.")',
    "2 charge-delta shared-price-source caveat")

# ---- 3a. exec gate row relabel ----
rep(
    '    a(gate_row("G2 three-count (A == B == C)", "per rung",',
    '    a(gate_row("G2 two-count (A & C independent + derived B)", "per rung",',
    "3a exec gate row relabel")

# ---- 3b. 3.1 heading relabel ----
rep(
    '    a("### 3.1 Three-count reconcile (A == B == C per component)")',
    '    a("### 3.1 Two-count reconcile (A & C independent + derived B)")',
    "3b 3.1 heading relabel")

# ---- 3c. publishable gate footnote relabel + shared-price (dash-tolerant) ----
rep3c(
    '    a("\\\\* The reconcile gate is TWO independent counts (A consumer, "\n'
    '      "C DR ledger) plus a DERIVED B (B == A; real form not re-run at "\n'
    '      "Stage A) \u2014 not three independent counts. Both reconcile gates cover "\n'
    '      "the October window only; rungs beyond October are covered by "\n'
    '      "generation manifests, telemetry and sampled real-form diffs. The "\n'
    '      "price source is shared (databarang.ralan both sides), so a zero "\n'
    '      "delta validates quantity + arithmetic only, not price mapping.")',
    "3c publishable gate relabel + shared-price")

# ---- 4. B3 Oct slice == B2 Oct slice note ----
rep(
    '    a("SCOPE: three-count covers October-only (no_rawat LIKE \'2026/10/%\'). "\n'
    '      "B2+ rungs\' November-onward visits are reconciled via generate "\n'
    '      "manifest + telemetry + sampled diff, not by this gate \u2014 do not read "\n'
    '      "the PASS lines above as full-ladder coverage.")',
    '    a("SCOPE: three-count covers October-only (no_rawat LIKE \'2026/10/%\'). "\n'
    '      "B2+ rungs\' November-onward visits are reconciled via generate "\n'
    '      "manifest + telemetry + sampled diff, not by this gate \u2014 do not read "\n'
    '      "the PASS lines above as full-ladder coverage. B3\'s October slice is "\n'
    '      "identical to B2\'s by construction (same seed/dates), so B3 adds no "\n'
    '      "new reconciliation information on that slice.")',
    "4 B3==B2 Oct slice note")

# ---- 1e. publishable notes line: truthful about captures ----
rep(
    '    a("- Real-form SQL capture was NOT obtained for Stage B (the general-"\n'
    '      "log files are 0 bytes) \u2014 sampled-form verdicts rest on the sampled "\n'
    '      "diff drift, not on full SQL capture.")',
    '    a("- Real-form SQL capture: 0-byte logs mean the capture was not "\n'
    '      "obtained; non-zero logs contain real-form SQL only. Sampled-form "\n'
    '      "verdicts rest on the sampled diff drift.")',
    "1e publishable capture note truthful")

if misses:
    sys.stderr.write("ABORT: %d edit(s) missed anchors: %s\n"
                     % (len(misses), ", ".join(misses)))
    sys.exit(2)
if src == orig:
    print("NO CHANGES NEEDED (all edits already present)")
else:
    open(PATH, "w", encoding="utf-8", newline="\n").write(src)
    print("PATCHED -> %s" % PATH)
