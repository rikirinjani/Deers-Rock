set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export RUN_ID="r5_p1_demo"
echo "=== RESUME (AC-3: finish all 44 PENDING) ==="
nohup python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50_fresh.txt --cap-min 45 > /tmp/r5_resume_final.log 2>&1 &
RPID=$!
echo "resume pid=$RPID"
for i in $(seq 1 400); do
  kill -0 $RPID 2>/dev/null || { echo "resume exited poll $i"; break; }
  ph=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json')).get('phase'))" 2>/dev/null || echo NONE)
  billed=$(python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print(sum(1 for v in d.get('batches',{}).values() if v.get('status')=='BILLED'))" 2>/dev/null || echo 0)
  [ $((i % 8)) -eq 0 ] && echo "poll $i phase=$ph billed=$billed"
  [ "$ph" = "DONE" ] && { echo "DONE at poll $i"; break; }
  sleep 5
done
echo "=== FINAL state ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batch counts=',dict(collections.Counter(v.get('status') for v in d.get('batches',{}).values())))"
echo "=== FINAL tool log lines ==="
grep -E "FINAL|ORACLE_DRIFT|RESUME|stage-restore|verify-frozen" /tmp/r5_resume_final.log | head -15
echo "=== AC-7: authoritative 0/50 recompute vs frozen baseline ==="
python3 - <<PY
import json, os, subprocess
from collections import Counter
def q(sql):
    p = subprocess.run(["mysql","-uroot","-N","-B","sik_r5"], input=sql,
                       capture_output=True, text=True, env=dict(os.environ))
    return [[None if c=="NULL" else c for c in line.split("\t")] for line in p.stdout.split("\n") if line!=""]
d = json.load(open("results/r5_p1_demo/B3_oracle_run_r5/.state.json"))
fd = "results/r5_p1_demo/B3_oracle_run_r5/baseline_frozen"
drift=0; total=0; parse_err=0
for n in d["nrs"]:
    rows = q("SELECT status,nm_perawatan,biaya,jumlah,totalbiaya FROM billing WHERE no_rawat='%s' ORDER BY noindex"%n)
    vals=[]
    for status,nm,b,j,t in rows:
        try:
            b=round(float(b or 0),2); j=round(float(j or 0),2); t=round(float(t or 0),2)
        except: parse_err+=1; continue
        if str(status).startswith("Ttl") or not (b>0 or t>0): continue
        vals.append((str(status),str(nm),b,j,t))
    fv = [tuple(r) for r in json.load(open("%s/%s.json"%(fd,n.replace("/","_"))))["rows"]]
    if Counter(fv)!=Counter(vals):
        drift+=1; print("DRIFT",n,"frozen_only=%d real_only=%d"%(len(Counter(fv)-Counter(vals)),len(Counter(vals)-Counter(fv))))
    total+=1
print("AC-7 TOTAL=%d MISMATCH=%d PARSE_ERRORS=%d"%(total,drift,parse_err))
PY
echo "=== live sik post-fingerprint (expect unchanged) ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
