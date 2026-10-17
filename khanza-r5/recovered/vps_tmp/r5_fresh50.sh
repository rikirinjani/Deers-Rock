set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
# Build a fresh-50 set: generated DR visits that (a) are consumer-billed on the clone,
# (b) are NOT in the R4-consumed 999-set, so the real form can freshly bill them.
python3 - <<PY
import csv, hashlib, os, subprocess
def q(sql):
    p = subprocess.run(["mysql","-uroot","-N","-B","sik_r5"], input=sql,
                       capture_output=True, text=True, env=dict(os.environ))
    out=[]
    for line in p.stdout.split("\n"):
        if line=="": continue
        out.append([None if c=="NULL" else c for c in line.split("\t")])
    return out
r4set = set(r["no_rawat"] for r in csv.DictReader(open("results/r4_b2_1000/B3_sampled_form_diff.csv")))
# generated DR visits that have consumer billing rows on the clone
gen = q("SELECT DISTINCT no_rawat FROM billing WHERE no_rawat LIKE '____/__/__/8_____'")
cand = [r[0] for r in gen if r[0] not in r4set]
print("r4-set size:", len(r4set), "fresh candidates:", len(cand))
cand.sort(key=lambda v: hashlib.md5(v.encode()).hexdigest())
sel = cand[:50]
open("/tmp/r5_visits50_fresh.txt","w").write("\n".join(sel)+"\n")
print("fresh-50 written; first 5:", sel[:5])
PY
echo "=== eligibility check of fresh-50 on the clone (AC-6) ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50_fresh.txt --freeze-only 2>&1 | tail -6
