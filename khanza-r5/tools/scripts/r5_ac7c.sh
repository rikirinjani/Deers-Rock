cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
python3 - <<PYEOF
import json, os, subprocess
from collections import Counter

def q(sql):
    p = subprocess.run(["mysql","-uroot","-N","-B","sik_r5"], input=sql,
                       capture_output=True, text=True, env=dict(os.environ))
    rows=[]
    for line in p.stdout.split("\n"):
        if line=="": continue
        rows.append([None if c=="NULL" else c for c in line.split("\t")])
    return rows

d = json.load(open("results/r5_p1_demo/B3_oracle_run_r5/.state.json"))
frozen_dir = "results/r5_p1_demo/B3_oracle_run_r5/baseline_frozen"
drift=0; total=0; parse_err=0; hist_check={}
hist = {"2027/09/23/800080","2027/09/23/800214","2027/09/28/800109","2027/09/28/800164"}
for n in d["nrs"]:
    rows = q("SELECT status,nm_perawatan,biaya,jumlah,totalbiaya FROM billing WHERE no_rawat='%s' ORDER BY noindex"%n)
    vals=[]
    for status,nm,b,j,t in rows:
        try:
            b=round(float(b or 0),2); j=round(float(j or 0),2); t=round(float(t or 0),2)
        except: parse_err+=1; continue
        if str(status).startswith("Ttl") or not (b>0 or t>0): continue
        vals.append((str(status),str(nm),b,j,t))
    fv = json.load(open("%s/%s.json"%(frozen_dir, n.replace("/","_"))))["rows"]
    fv_t = [tuple(r) for r in fv]
    mc, mr = Counter(fv_t), Counter(vals)
    if mc!=mr:
        drift+=1
        print("DRIFT",n,"frozen_only=%d real_only=%d"%(len(mc-mr),len(mr-mc)))
    if n in hist:
        hist_check[n] = "MATCH" if mc==mr else "DRIFT"
    total+=1
print("AC-7 TOTAL=%d MISMATCH=%d PARSE_ERRORS=%d"%(total,drift,parse_err))
print("4 historical drift visits:", hist_check)
PYEOF
