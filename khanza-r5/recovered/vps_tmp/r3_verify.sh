#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TS=$(cat "$OUT/r3_RUN_TS" 2>/dev/null)
echo "TS=$TS"
echo
echo "=== R3 artifacts present ==="
ls -la "$OUT"/a*_${TS}.* "$OUT"/d*_${TS}.* "$OUT"/e*_${TS}.* "$OUT"/consumer_snapshot_${TS}.json 2>/dev/null
echo
echo "=== residual injection check (correct db scoping) ==="
echo -n "reg_periksa 899%: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';"
echo -n "billing 899%: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';"
echo
echo "=== dr_tariff row count ==="
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM dr_tariff;"
echo
echo "=== a2a verdict ==="
python3 - "$OUT" "$TS" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]+"/a2a_gate_rootcause_%s.json"%sys.argv[2]))
print('gate_fn_present:', 'NOT FOUND' not in d.get('gate_function_text',''))
print('oct_row_in_predicate:', d.get('oct_row_in_predicate'))
print('oct_unbilled:', d.get('oct_unbilled'))
print('after_cleanup_oct:', d.get('after_cleanup_oct'))
PY
echo
echo "=== a3 monthly table head ==="
head -14 "$OUT/a3_fullwindow_monthly_${TS}.md" 2>/dev/null
echo
echo "=== pool / lqt / units ==="
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
systemctl is-active dr-bench; systemctl is-active p-chain
echo
echo "=== stray procs ==="
pgrep -af "run_all|sampled_real|r2_finish|r3_run" || echo none
echo
echo "=== write the missing r3_STATUS json ==="
python3 - "$OUT" "$TS" <<'PY'
import json,sys,subprocess,os,glob
out,ts=sys.argv[1],sys.argv[2]
def qv(sql,db=""):
    cmd=["mysql","-uroot","-N","-B"]+([db] if db else [])+["-e",sql]
    return subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
arts=[]
for pat in ("a*_gate_rootcause_%s.json","a*_tariff_%s.md","a*_battery_%s.md","a*_fullwindow_%s.md",
            "d1_restore_%s.sh","d1_baseline_%s.json","e1_claims_ledger_%s.md","consumer_snapshot_%s.json"):
    for p in glob.glob(out+(pat%((ts,)*pat.count('%s')))):
        arts.append(os.path.basename(p))
status={
 "ts":ts,
 "completed":["B1-rest detector+snapshots","A2-a gate root cause","A3 full-window 12-month",
             "A1 DR tariff seed","A2-b battery contract","D1 per-rung restore","E1 claims ledger"],
 "deferred_human_gated":["B2 1000-visit sample","B3 edge strata","C1-C4 calibration",
                        "D2 cross-machine","D3 release packaging","E2 burst+2nd HMS","pharmacist review"],
 "artifacts":arts,
 "pool_mb":int(float(qv("SELECT @@innodb_buffer_pool_size;","")or 0))//1048576,
 "lqt":qv("SELECT @@long_query_time;",""),
 "residual_reg_899":qv("SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/05/899%';","sik"),
 "residual_billing_899":qv("SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/10/05/899%';","sik"),
 "dr_tariff_rows":qv("SELECT COUNT(*) FROM dr_tariff;","sik_bench"),
}
json.dump(status,open(out+"/r3_STATUS_%s.json"%ts,"w"),indent=1)
print("wrote r3_STATUS_%s.json"%ts)
print(json.dumps({k:status[k] for k in ("pool_mb","lqt","residual_reg_899","residual_billing_899","dr_tariff_rows")},indent=1))
print("artifacts:",len(arts))
PY
