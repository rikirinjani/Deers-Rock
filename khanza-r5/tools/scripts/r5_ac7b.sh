cd /opt/dr-benchmark
echo "=== FINAL line from tool log ==="
grep -E "FINAL|ORACLE_DRIFT|sampled=|mismatch" results/r5_p1_demo/sampled_real_form_diff_r5.log | tail -12
echo "=== where did _finalize write? ==="
find results/r5_p1_demo -name "*.csv" -o -name "*form_diff_r5.md" 2>/dev/null | grep -v harness | head
echo "=== recompute AC-7 tally from state (authoritative) ==="
python3 - <<PY
import json, collections, hashlib, os, subprocess
d = json.load(open("results/r5_p1_demo/B3_oracle_run_r5/.state.json"))
frozen_dir = "results/r5_p1_demo/B3_oracle_run_r5/baseline_frozen"
man = json.load(open(frozen_dir + "/manifest.json"))
# For each BILLED batch, read real rows from sik_r5 and compare to frozen baseline.
import dbutil
DBUTIL=""
PY
export DBUTIL_FORCE_ROOT=1
python3 - <<PY
import json, collections
from collections import Counter
d = json.load(open("results/r5_p1_demo/B3_oracle_run_r5/.state.json"))
frozen_dir = "results/r5_p1_demo/B3_oracle_run_r5/baseline_frozen"
# compare real (current sik_r5) vs frozen for all 50
import subprocess, os
def q(sql):
    p = subprocess.run(["mysql","-uroot","-N","-B","sik_r5"], input=sql,
                       capture_output=True, text=True, env=dict(os.environ))
    rows=[]
    for line in p.stdout.split("\n"):
        if line=="": continue
        rows.append([None if c=="NULL" else c for c in line.split("\t")])
    return rows
drift=0; total=0; parse_err=0
for n in d["nrs"]:
    rows=q("SELECT status,nm_perawatan,biaya,jumlah,totalbiaya FROM billing WHERE no_rawat='%s' ORDER BY noindex"%n)
    vals=[]
    for status,nm,b,j,t in rows:
        try:
            b=round(float(b or 0),2); j=round(float(j or 0),2); t=round(float(t or 0),2)
        except: parse_err+=1; continue
        if str(status).startswith("Ttl") or not (b>0 or t>0): continue
        vals.append((str(status),str(nm),b,j,t))
    fv=json.load(open("%s/%s.json"%(frozen_dir, n.replace("/","_"))))["rows"]
    mc, mr = Counter(fv), Counter(vals)
    ok = (mc==mr)
    if not ok:
        drift+=1
        print("DRIFT", n, "frozen_only=%d real_only=%d"%(len(mc-mr), len(mr-mc)))
    total+=1
print("AC-7: total=%d mismatch=%d parse_errors=%d"%(total, drift, parse_err))
PY
