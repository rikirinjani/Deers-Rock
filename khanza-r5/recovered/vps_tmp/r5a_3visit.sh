set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export RUN_ID="r5a_smoke"
# pick 3 generated DR visits that HAVE consumer billing rows on the clone (the real sampled set)
python3 - <<PY
import csv, hashlib
# reuse the R4 sample list; restrict to visits present in sik_r5.billing
import subprocess, os
def q(sql):
    p = subprocess.run(["mysql","-uroot","-N","-B","sik_r5"], input=sql,
                       capture_output=True, text=True, env=dict(os.environ))
    return [l for l in p.stdout.split("\n") if l!=""]
cand = q("SELECT DISTINCT no_rawat FROM billing WHERE no_rawat LIKE \"____/__/__/8_____\" LIMIT 200")
sel = sorted(cand, key=lambda v: hashlib.md5(v.encode()).hexdigest())[:3]
open("/tmp/r5a_visits3.txt","w").write("\n".join(sel)+"\n")
print("3-visit set:", sel)
for v in sel:
    print("  rows for", v, "=", q("SELECT COUNT(*) FROM billing WHERE no_rawat=\"%s\""%v)[0])
PY
# ensure harness still points at the clone
grep -E "^database=" /opt/simrs-khanza/setting/database.ini || sed -i "s/^database=.*/database=sik_r5/" /opt/simrs-khanza/setting/database.ini
rm -rf /opt/dr-benchmark/results/r5a_smoke
echo "=== tool: freeze + run 3 visits (bill them on the clone) ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5a_visits3.txt --freeze-only 2>&1 | tail -3
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5a_visits3.txt --cap-min 20 > /tmp/r5a_smoke_run.log 2>&1
echo "tool exit=$?"
grep -E "date 20|FINAL|ORACLE_DRIFT|verify-frozen" /tmp/r5a_smoke_run.log | head -10
echo "=== harness sukses for these 3 (the decisive check) ==="
grep -E "sukses|akunrows|payment" /opt/dr-benchmark/results/r5a_smoke/B3_oracle_run_r5/harness_*.log 2>/dev/null | head -10
echo "=== 3-visit drift tally vs frozen ==="
python3 - <<PY
import json, os, subprocess
from collections import Counter
d = json.load(open("/opt/dr-benchmark/results/r5a_smoke/B3_oracle_run_r5/.state.json"))
fd = "/opt/dr-benchmark/results/r5a_smoke/B3_oracle_run_r5/baseline_frozen"
def q(sql):
    p = subprocess.run(["mysql","-uroot","-N","-B","sik_r5"], input=sql,
                       capture_output=True, text=True, env=dict(os.environ))
    return [[None if c=="NULL" else c for c in l.split("\t")] for l in p.stdout.split("\n") if l!=""]
drift=0
for n in d["nrs"]:
    rows = q("SELECT status,nm_perawatan,biaya,jumlah,totalbiaya FROM billing WHERE no_rawat='%s' ORDER BY noindex"%n)
    vals=[]
    for s,nm,b,j,t in rows:
        try: b=round(float(b or 0),2); j=round(float(j or 0),2); t=round(float(t or 0),2)
        except: continue
        if str(s).startswith("Ttl") or not (b>0 or t>0): continue
        vals.append((str(s),str(nm),b,j,t))
    fv=[tuple(r) for r in json.load(open("%s/%s.json"%(fd,n.replace("/","_"))))["rows"]]
    if Counter(fv)!=Counter(vals):
        drift+=1; print("DRIFT",n,"frozen=%d real=%d"%(len(fv),len(vals)))
print("3-visit TOTAL=%d MISMATCH=%d"%(len(d["nrs"]),drift))
PY
