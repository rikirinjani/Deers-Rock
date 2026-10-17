#!/bin/bash
# R4 point 2: baseline comparison — real-form SUM(totalbiaya) vs consumer OK-line total
# for ALL sampled visits of B1/B2/B3 (216/54/19). Read-only.
set -uo pipefail
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/p4_baseline_allsamples_${TS}.md
python3 - "$R" "$OUT" "$TS" <<'PYEOF'
import re, sys, subprocess, json, hashlib
R, OUT, TS = sys.argv[1], sys.argv[2], sys.argv[3]
VISIT_RE = re.compile(r"^\s+(\S+): (\d+)ms \| nota=(\S+) \| Rp ([\d,]+)")

def consumer_totals(stage):
    d = {}
    with open(f"{R}/consumer_{stage}.log", encoding="utf-8", errors="replace") as f:
        for line in f:
            m = VISIT_RE.match(line)
            if m:
                d[m.group(1)] = int(m.group(4).replace(",", ""))
    return d

def sample(stage):
    vs = []
    with open(f"{R}/{stage}_sampled_form_diff.csv", encoding="utf-8") as f:
        hdr = f.readline()
        for line in f:
            nr = line.split(",")[0].strip()
            if nr: vs.append(nr)
    return vs

# real-form totals from DB (post sampled-diff re-bill = real-form output)
def db_totals(visits):
    if not visits: return {}
    ph = ",".join(["%s"]*len(visits))
    q = ("SELECT no_rawat, COALESCE(SUM(CASE WHEN status NOT LIKE 'Ttl%%' THEN totalbiaya ELSE 0 END),0) "
         "FROM billing WHERE no_rawat IN (%s) GROUP BY no_rawat" % ph)
    import mysql.connector  # may not exist
    return {}

# fallback: use mysql CLI
def db_totals_cli(visits):
    if not visits: return {}
    ph = ",".join("'%s'" % v for v in visits)
    q = ("SELECT no_rawat, COALESCE(SUM(CASE WHEN status NOT LIKE 'Ttl%%' THEN totalbiaya ELSE 0 END),0) "
         "FROM billing WHERE no_rawat IN (%s) GROUP BY no_rawat" % ph)
    p = subprocess.run(["mysql","-uroot","sik","-N","-B","-e",q], capture_output=True, text=True)
    out = {}
    for line in p.stdout.splitlines():
        parts = line.split("\t")
        if len(parts)==2:
            out[parts[0]] = int(round(float(parts[1])))
    return out

lines = []
lines.append("# P4 — baseline comparison: real-form SUM(totalbiaya) vs consumer OK-line total (ALL samples)")
lines.append("")
lines.append(f"Run ts: {TS}. Source of consumer per-visit totals: `{R}/consumer_<stage>.log` (original consumer run, immutable, pre-reset).")
lines.append("Source of real-form totals: `sik.billing` SUM(totalbiaya) over non-Ttl value rows per sampled no_rawat (state after the sampled real-form diff re-bill).")
lines.append("Scope note: this comparison is log-based (consumer log captured at the original run), so it does NOT depend on the mid-run snapshot that the interrupted 06:44 attempt could have contaminated.")
lines.append("")
total = {"n":0, "match":0, "missing_log":0, "missing_db":0, "mismatch":0}
detail_rows = []
for stage in ("B1","B2","B3"):
    vs = sample(stage)
    ct = consumer_totals(stage)
    dbt = db_totals_cli(vs)
    n = len(vs); match=0; ml=0; md=0; mm=0
    for v in vs:
        c = ct.get(v); d = dbt.get(v)
        if c is None: ml+=1; continue
        if d is None: md+=1; continue
        if c == d: match+=1
        else:
            mm+=1
            detail_rows.append((stage, v, c, d, d-c))
    lines.append(f"## {stage}: sampled visits = {n}")
    lines.append(f"- consumer OK-line found in log: {n-ml}")
    lines.append(f"- real-form DB total found: {n-md}")
    lines.append(f"- **match (delta = 0): {match}/{n}**")
    lines.append(f"- missing from consumer log: {ml}; missing in DB: {md}; **mismatch: {mm}**")
    lines.append("")
    total["n"]+=n; total["match"]+=match; total["missing_log"]+=ml; total["missing_db"]+=md; total["mismatch"]+=mm

lines.append("## Aggregate")
lines.append(f"- **{total['match']}/{total['n']} sampled visits match exactly (delta = 0)** across B1+B2+B3.")
lines.append(f"- missing-log {total['missing_log']}, missing-DB {total['missing_db']}, mismatch {total['mismatch']}.")
lines.append("")
if detail_rows:
    lines.append("## Mismatch detail (stage, no_rawat, consumer, realform, delta)")
    for r in detail_rows[:50]:
        lines.append("| %s | %s | %d | %d | %+d |" % r)
else:
    lines.append("No mismatches.")

txt = "\n".join(lines) + "\n"
with open(OUT, "w", encoding="utf-8") as f:
    f.write(txt)
print(txt)
PYEOF
echo "=== WROTE $OUT ==="
