set -e
cd /opt/dr-benchmark
# --- build the 50-visit demo set: 4 historical + 46 by MD5 from the 999-set ---
python3 - <<'PY'
import csv, hashlib
hist = ["2027/09/23/800080","2027/09/23/800214","2027/09/28/800109","2027/09/28/800164"]
path = "results/r4_b2_1000/B3_sampled_form_diff.csv"
seen999 = [r["no_rawat"] for r in csv.DictReader(open(path)) if not r.get("mismatch","").strip() in ("True","TRUE","true")]
cand = [v for v in seen999 if v not in hist]
cand.sort(key=lambda v: hashlib.md5(v.encode()).hexdigest())
sel = hist + cand[:46]
open("/tmp/r5_visits50.txt","w").write("\n".join(sel)+"\n")
print("demo set: 4 historical + 46 sampled = %d visits" % len(sel))
print("historical:", ", ".join(hist))
PY
echo "=== visits file ==="
wc -l /tmp/r5_visits50.txt
head -8 /tmp/r5_visits50.txt
