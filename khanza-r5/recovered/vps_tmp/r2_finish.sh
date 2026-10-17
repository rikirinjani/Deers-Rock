#!/usr/bin/env bash
# R2 finish: correct R2-2 (value_sum), reframe R2-4 (gate coverage), run R2-3 latency curve, db_freeze.
# All on-box. No secrets/IPs in output. Buffer pool stays tuned. lqt->1 for R2-3, restore 10.
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TOOLS=/opt/Deers-Rock/tools
TS=$(date -u +%Y%m%dT%H%M%SZ)
LOG="$OUT/r2_finish.log"
{
echo "=== R2 finish start $TS ==="

# ---------- R2-2 CORRECTION: value_sum is the real-form total; delta = consumer - value_sum ----------
echo "### R2-2 corrected (value_sum basis)"
mysql -uroot sik -N -B -e "
SELECT no_rawat,
  MAX(CASE WHEN status LIKE 'Ttl%' AND totalbiaya>0 THEN totalbiaya ELSE NULL END) AS ttl_real,
  COALESCE(SUM(CASE WHEN status NOT LIKE 'Ttl%' AND (biaya>0 OR totalbiaya>0) THEN biaya*COALESCE(jumlah,1)+totalbiaya ELSE 0 END),0) AS value_sum
FROM billing
WHERE no_rawat IN ('2027/09/23/800080','2027/09/23/800214','2027/09/28/800109','2027/09/28/800164')
GROUP BY no_rawat ORDER BY no_rawat;" | tee "$OUT/r2_2_corrected.txt"
# consumer amounts
echo "consumer: 800080=981474 800214=34000 800109=1058723 800164=1002530"
{
echo
echo "## R2: rupiah equality (CORRECTED — value_sum basis)"
echo
echo "Real-form total per visit = value_sum (sum of non-Ttl value rows: biaya*jumlah + totalbiaya),"
echo "which is exactly what the form bills. The Ttl structural row (totalbiaya=0.0) is a placeholder,"
echo "NOT the total — the original p1_r2.log mis-used it. Corrected per-visit table:"
echo
echo "| visit | consumer (OK-line) | real-form value_sum | delta |"
echo "|---|---|---|---|"
paste -d' ' "$OUT/r2_2_corrected.txt" | while read nr _ _ vs _; do :; done
# build table in python for clarity
python3 - "$OUT/r2_2_corrected.txt" <<'PY'
import sys
cons={"2027/09/23/800080":981474,"2027/09/23/800214":34000,"2027/09/28/800109":1058723,"2027/09/28/800164":1002530}
print("| visit | consumer | real-form value_sum | delta |")
print("|---|---|---|---|")
allok=True
for line in open(sys.argv[1]):
    p=line.split()
    if len(p)<4: continue
    nr=p[0]; vs=float(p[-1])
    d=cons.get(nr,0)-vs
    if abs(d)>0.5: allok=False
    print(f"| {nr} | {cons.get(nr)} | {int(vs)} | {int(d)} |")
print()
if allok:
    print("Verdict: value_sum == consumer for ALL 4 drift visits (delta 0). The 4-drift explanation CLOSES completely:")
    print("the real form billed exactly what the consumer logged. (Any half-rupiah PPN rounding, if present,")
    print("would be within 1 Rp and is covered by the Java Math.round floor(x+0.5) rule.)")
else:
    print("Verdict: NON-zero deltas remain — see values; a half-rupiah PPN diff would cite Math.round floor(x+0.5).")
PY
echo
echo "_Corrected $(date -u); supersedes the ttl_row-basis lines in p1_r2.log._"
} >> "$OUT/p1_rootcause.md"
echo "[R2-2] corrected section appended to p1_rootcause.md"

# ---------- R2-4 REFRAME: gate-coverage finding (honest) ----------
{
echo
echo
echo "## R2-4 REFRAME — gate-coverage finding (supersedes the 'gates detect faults' framing)"
echo
echo "Honest result: the injected faults (wrong-price 99999, unmappable drug XX9999, reg-without-billing 899002)"
echo "did NOT trip the three hard gates — they returned PASS / rc=0 under injection. This is itself the finding:"
echo
echo "1. charge_delta: normalizes BOTH sides to the shared databarang.ralan price master, so a wrong ledger price"
echo "   (99999 vs 10000) is re-derived to the master price on both sides → delta 0. Confirms the documented"
echo "   limitation: zero-delta validates quantity+arithmetic only, NOT price mapping (open item: DR-owned tariff)."
echo "2. three_count: A==B==C per-component counts stay balanced when a visit's rows are added consistently on"
echo "   both sides (an unmappable drug is a reject/net-zero on both), so counts match → PASS. It does not catch"
echo "   a price-level fault."
echo "3. check_billed_eq_dr: the expected UNBILLED-2026/10 for the reg-only visit 899002 was NOT emitted. Either a"
echo "   coverage gap in the gate's predicate or an extraction issue — flagged for follow-up (it is the one hard"
echo "   gate that SHOULD catch reg-without-billing, and it did not fire here)."
echo
echo "Conclusion: the gates are necessary-but-not-sufficient; a gate that never fails on an injected fault is not"
echo "proven (per Reviewer B). Gate-coverage gaps: (a) price-mapping faults (shared tariff), (b) reg-without-billing"
echo "on a scratch no_rawat (check_billed_eq_dr did not emit UNBILLED). Both feed open items 2 and 4."
} >> "$OUT/r2_gatefail.md"
echo "[R2-4] gate-coverage reframe appended to r2_gatefail.md"

# ---------- R2-3: staged-size latency curve (single tuned pool) ----------
echo "### R2-3 latency curve"
LQT_BEFORE=$(mysql -uroot -N -B -e "SELECT ROUND(@@long_query_time,1);" 2>/dev/null)
mysql -uroot -e "SET GLOBAL long_query_time=1;" 2>/dev/null
SLOW_BEFORE=$(mysql -uroot -N -B -e "SHOW GLOBAL STATUS LIKE 'Slow_queries';" 2>/dev/null | awk '{print $2}')

# cutoffs from real cumulative DR daily counts
mysql -uroot sik -N -B -e "SELECT DATE(tgl_registrasi), COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY 1 ORDER BY 1;" > "$OUT/r2_3_daily.txt" 2>&1
python3 - "$OUT/r2_3_daily.txt" > "$OUT/r2_3_cutoffs.txt" <<'PY'
import sys
cum=0; rows=[]
for line in open(sys.argv[1]):
    p=line.split()
    if len(p)<2: continue
    try: c=int(p[1])
    except: continue
    cum+=c; rows.append((p[0],cum))
def first_reach(t):
    for d,c in rows:
        if c>=t: return d
    return "NOT_REACHED"
for t in (10000,30000,60000):
    print(f"{t}={first_reach(t)}")
print("86k=NO_CUTOFF")
print("total=",cum)
PY
cat "$OUT/r2_3_cutoffs.txt"
C10=$(awk -F= '/^10000=/{print $2}' "$OUT/r2_3_cutoffs.txt")
C30=$(awk -F= '/^30000=/{print $2}' "$OUT/r2_3_cutoffs.txt")
C60=$(awk -F= '/^60000=/{print $2}' "$OUT/r2_3_cutoffs.txt")

python3 - "$TOOLS/collect_scale_telemetry.py" "$C10" "$C30" "$C60" "$OUT/r2_3_latency.json" <<'PY'
import importlib.util,json,sys,time
path,c10,c30,c60,outp=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5]
spec=importlib.util.spec_from_file_location("cst",path)
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
sys.path.insert(0,"/opt/Deers-Rock/tools"); import dbutil
Q=m.REPORT_QUERIES
def pref(sql,c):
    if not c or c in ("NO_CUTOFF","NOT_REACHED"): return sql
    s=sql
    s=s.replace("WHERE r.no_rkm_medis LIKE 'DR%'",
                "WHERE r.no_rkm_medis LIKE 'DR%' AND r.tgl_registrasi <= '"+c+"'",1)
    s=s.replace("WHERE no_rkm_medis LIKE 'DR%'",
                "WHERE no_rkm_medis LIKE 'DR%' AND tgl_registrasi <= '"+c+"'",1)
    return s
def pctl(st,q):
    if not st: return None
    return round(st[min(len(st)-1,int(round(q*(len(st)-1))))],1)
res={}
for label,c in (("10k",c10),("30k",c30),("60k",c60),("86k","NO_CUTOFF")):
    res[label]={"cutoff":c,"q":{}}
    for name,sql in Q:
        ts=[]
        for _ in range(20):
            t0=time.perf_counter()
            try: dbutil.query("sik",pref(sql,c),timeout=300)
            except Exception: pass
            ts.append((time.perf_counter()-t0)*1000.0)
        st=sorted(ts)
        res[label]["q"][name]={"p50":pctl(st,.5),"p95":pctl(st,.95),"p99":pctl(st,.99),"max":round(st[-1],1)}
    print(label,c,"done",flush=True)
json.dump(res,open(outp,"w"),indent=1)
PY
echo "r2_3_latency.json written"

SLOW_AFTER=$(mysql -uroot -N -B -e "SHOW GLOBAL STATUS LIKE 'Slow_queries';" 2>/dev/null | awk '{print $2}')
mysql -uroot -e "SET GLOBAL long_query_time=10;" 2>/dev/null
LQT_AFTER=$(mysql -uroot -N -B -e "SELECT ROUND(@@long_query_time,1);" 2>/dev/null)
echo "slow_queries before=$SLOW_BEFORE after=$SLOW_AFTER delta=$((SLOW_AFTER-SLOW_BEFORE))"
echo "lqt before=$LQT_BEFORE restored=$LQT_AFTER"

python3 - "$OUT/r2_3_latency.json" "$OUT/r2_3_cutoffs.txt" "$OUT/p3_latency_curve.md" "$SLOW_BEFORE" "$SLOW_AFTER" "$LQT_AFTER" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
mdp=sys.argv[5] and sys.argv[6]
cutl=open(sys.argv[2]).read()
slowb,slowa,lqt=sys.argv[3],sys.argv[4],sys.argv[5]
names=list(next(iter(d.values()))["q"].keys())
L=[]
L.append("# R2-3 staged-size latency curve — single tuned pool (3.2 GB), long_query_time=1 during session")
L.append("")
L.append("Cutoffs (real cumulative DR visit counts): "+"; ".join(x for x in cutl.split() if "=" in x and not x.startswith("total")))
L.append("")
L.append("| query | 10k p50 | 30k p50 | 60k p50 | 86k p50 | 86k p99 |")
L.append("|---|---|---|---|---|---|")
for n in names:
    row=[str(d[s]["q"].get(n,{}).get("p50","n/a")) for s in ("10k","30k","60k","86k")]
    L.append("| %s | %s | %s | %s | %s | %s |"%(n,row[0],row[1],row[2],row[3],d["86k"]["q"].get(n,{}).get("p99","n/a")))
L.append("")
L.append("p95/p99 per cell: see r2_3_latency.json (full structure).")
L.append("")
L.append("Slow_queries delta over session (1 s threshold): %s -> %s (delta %s)"%(slowb,slowa,int(slowa)-int(slowb)))
L.append("long_query_time restored to %s."%lqt)
L.append("")
L.append("> Honest label: prefix-size proxy at a single tuned pool (3.2 GB), 20 runs per query; the per-rung")
L.append("> restore-stub means rungs can't be rebuilt from scratch, so sizes are data-prefix approximations of")
L.append("> cumulative DB growth; B1/B2 originals were measured at 128 MB and are NOT directly comparable to this curve.")
open(sys.argv[3],"w").write("\n".join(L)+"\n")
print("wrote p3_latency_curve.md")
PY

# ---------- db_freeze json ----------
python3 - "$OUT" "$TS" <<'PY'
import json,subprocess,sys
out,ts=sys.argv[1],sys.argv[2]
def q(db,sql):
    return subprocess.run(["mysql","-uroot","-N","-B",db,"-e",sql],capture_output=True,text=True).stdout
counts={}
for db in ("sik","sik_bench"):
    t={}
    for line in q(db,"SELECT TABLE_NAME,TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='%s' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;"%db).splitlines():
        p=line.split("\t")
        if len(p)>=2:
            try: t[p[0]]=int(float(p[1] or 0))
            except: pass
    counts[db]=t
pool=q("","SELECT @@innodb_buffer_pool_size;").strip()
lqt=q("","SELECT ROUND(@@long_query_time,1);").strip()
mb=q("sik","SELECT ROUND(SUM(data_length+index_length)/1048576,1) FROM information_schema.TABLES WHERE TABLE_SCHEMA IN ('sik','sik_bench');").strip()
json.dump({"ts":ts,"tables":counts,
  "innodb_buffer_pool_size_bytes":int(pool) if pool else None,
  "long_query_time":float(lqt) if lqt else None,
  "innodb_data_idx_total_mb":float(mb) if mb else None},
  open("%s/db_freeze_%s.json"%(out,ts),"w"),indent=1)
print("db_freeze_%s.json written"%(ts))
PY

echo "=== R2 finish done $TS ==="
} > "$LOG" 2>&1
RC=$?
echo "[R2-finish] rc=$RC; log=$LOG"
tail -20 "$LOG"
