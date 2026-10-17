set -e
cd /opt/dr-benchmark
# Control test: does the SAME hardened tool bill sukses=true on LIVE sik (proven R4 target)?
# Pick 3 clean non-drift visits + 1 historical drift visit
python3 - <<PY
import csv, hashlib, os
path = "results/r4_b2_1000/B3_sampled_form_diff.csv"
seen = [r["no_rawat"] for r in csv.DictReader(open(path))]
clean = [v for v in seen if v not in ("2027/09/23/800080","2027/09/23/800214","2027/09/28/800109","2027/09/28/800164")]
clean.sort(key=lambda v: hashlib.md5(v.encode()).hexdigest())
sel = clean[:3] + ["2027/09/23/800080"]
open("/tmp/r5_visits4_live.txt","w").write("\n".join(sel)+"\n")
print("live control set:", sel)
PY
export DBUTIL_FORCE_ROOT=0   # use benchmark user for live sik
export RUN_ID="r5_live_control"
rm -rf /opt/dr-benchmark/results/r5_live_control
# point harness back at live sik for this control
INIFILE=/opt/simrs-khanza/setting/database.ini
sed -i "s/^database=.*/database=sik/" $INIFILE
grep -E "^database=" $INIFILE
echo "=== live control: freeze + run (no crash) on 4 visits ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5_visits4_live.txt --freeze-only 2>&1 | tail -4
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5_visits4_live.txt --cap-min 20 2>&1 | grep -E "date |FINAL|ORACLE_DRIFT|sukses" | head -20
