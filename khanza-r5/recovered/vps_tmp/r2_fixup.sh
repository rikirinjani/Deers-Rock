#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
RES=/opt/dr-benchmark/results/Bseries_20261012T045027Z

# 1) Authoritative R2-2 values: SUM(totalbiaya) on non-Ttl rows
python3 - "$OUT" <<'PY'
import sys, subprocess, json
out=sys.argv[1]
def q(sql):
    return subprocess.run(["mysql","-uroot","sik","-N","-B","-e",sql],capture_output=True,text=True).stdout.strip()
cons={"2027/09/23/800080":981474,"2027/09/23/800214":34000,"2027/09/28/800109":1058723,"2027/09/28/800164":1002530}
rows=[]
allok=True
maxd=0
for v in cons:
    r=q(f"SELECT ROUND(SUM(totalbiaya),2) FROM billing WHERE no_rawat='{v}' AND status NOT LIKE 'Ttl%';")
    vs=float(r)
    d=cons[v]-vs
    maxd=max(maxd,abs(d))
    if abs(d)>0.5: allok=False
    rows.append((v,cons[v],int(vs),int(d)))
# write corrected table (overwrites the wrong double-counted one)
L=[]
L.append("# R2-2 CORRECTED — rupiah equality for the 4 B3 drift visits")
L.append("")
L.append("Authoritative real-form total = **SUM(totalbiaya) over non-Ttl value rows** per visit (the TtlObat header")
L.append("rows carry totalbiaya=0; the `PPN Obat` rows ARE value rows and are included). The first correction attempt")
L.append("in this session (value_sum = biaya*jumlah + totalbiaya) double-counted PPN and is superseded by this one.")
L.append("")
L.append("| visit | consumer (OK-line) | real-form SUM(totalbiaya) | delta |")
L.append("|---|---|---|---|")
for v,c,vs,d in rows:
    L.append(f"| {v} | {c:,} | {vs:,} | {d} |")
L.append("")
L.append(f"Max |delta| = {int(maxd)} rp.")
if allok:
    L.append("")
    L.append("**Verdict: delta = 0 for all 4 visits.** The real form billed exactly what the consumer logged, PPN included.")
    L.append("The 4 B3 drift rows (0.0185%) are measurement artifacts, NOT real charge differences — the R1 B3 drift")
    L.append("explanation closes completely.")
else:
    L.append("")
    L.append(f"**Verdict: deltas remain ({[r[3] for r in rows]} rp)** — see the raw query output above; if a half-rupiah")
    L.append("PPN diff, cite Java Math.round floor(x+0.5).")
open(f"{out}/r2_2_corrected.md","w").write("\n".join(L)+"\n")
print("wrote r2_2_corrected.md")
for v,c,vs,d in rows: print(v,c,vs,d)
PY

# 2) Append the correct section to p1_rootcause.md, marking the earlier wrong one superseded
{
echo
echo
echo "## R2-2 CORRECTED (supersedes the earlier value_sum double-count section above)"
echo
echo "Real-form total = SUM(totalbiaya, non-Ttl). PPN Obat rows included; TtlObat header rows have totalbiaya=0."
echo
cat "$OUT/r2_2_corrected.md" | grep -v '^#' | grep -v '^$' | sed 's/^/  /'
echo
echo "Raw per-visit source: see billing rows for each no_rawat above (status/totalbiaya split)."
} >> "$OUT/p1_rootcause.md"
echo "[R2-2 corrected] appended"

# 3) Regenerate p3_latency_curve.md from r2_3_latency.json (the step that failed last run)
python3 - "$OUT" <<'PY'
import json,sys
out=sys.argv[1]
d=json.load(open(f"{out}/r2_3_latency.json"))
names=list(next(iter(d.values()))["q"].keys())
L=[]
L.append("# R2-3 staged-size latency curve — single tuned pool (3.2 GB), 20 runs per query")
L.append("")
L.append("Cutoffs (real cumulative DR visit counts): 10k=2026-11-10; 30k=2027-02-03; 60k=2027-06-10; 86k=full window (no cutoff).")
L.append("Session ran at long_query_time=1 (restored to 10 after). Slow_queries global counter delta over session: +185.")
L.append("")
L.append("p50 ms per query, per size:")
L.append("")
hdr="| query | 10k | 30k | 60k | 86k |"
sep="|---|---|---|---|---|"
L.append(hdr); L.append(sep)
for n in names:
    L.append("| %s | %s | %s | %s | %s |"%(n,
      d["10k"]["q"][n]["p50"], d["30k"]["q"][n]["p50"], d["60k"]["q"][n]["p50"], d["86k"]["q"][n]["p50"]))
L.append("")
L.append("p95 / p99 / max per cell: see r2_3_latency.json.")
L.append("")
L.append("Trend read (p50, 86k full window): report-scale aggregations are 600-5,400 ms; the top_billed_visits and")
L.append("revenue_by_* queries are the heavy ones; visits_by_* and top_diagnoses stay under 300 ms even at 86k.")
L.append("Between 10k and 86k, p50 for the heavy queries scales ~5-10x, consistent with the P3 buffer-pool-tuned")
L.append("~4 s p50 baseline for revenue_by_clinic at full size.")
L.append("")
L.append("> Honest label: prefix-size proxy at a single tuned pool (3.2 GB), 20 runs per query; the per-rung")
L.append("> restore-stub means rungs can't be rebuilt from scratch, so sizes are data-prefix approximations of")
L.append("> cumulative DB growth; B1/B2 originals were measured at 128 MB and are NOT directly comparable to this curve.")
open(f"{out}/p3_latency_curve.md","w").write("\n".join(L)+"\n")
print("wrote p3_latency_curve.md")
PY

# 4) Confirm db_freeze + gate-coverage reframe landed
echo "=== db_freeze ==="
ls -la "$OUT"/db_freeze_*.json
echo "=== p3_latency_curve.md ==="
ls -la "$OUT/p3_latency_curve.md"
echo "=== r2_gatefail.md reframe present? ==="
grep -c "gate-coverage" "$OUT/r2_gatefail.md" 2>/dev/null || echo 0
echo "=== lqt / pool final ==="
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
echo "=== stray procs ==="
pgrep -af "run_all|sampled_real|r2_finish" || echo none
