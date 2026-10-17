#!/bin/bash
# r4_b2_1000_waiter.sh — wait for sampled_real_form_diff r4_b2_1000 to exit,
# then run coverage check (prior 289 union subset of new CSV) + drift summary.
# Writes evidence to /opt/dr-benchmark/p-chain/r4_b2_1000_postcheck_<ts>.md
set -u
LOG=/tmp/r4_b2_1000.log
CSV=/opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv
MD=/opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.md
while pgrep -f 'sampled_real_form_diff.py' >/dev/null 2>&1; do sleep 60; done
OUT=/opt/dr-benchmark/p-chain/r4_b2_1000_postcheck_$(date -u +%Y%m%dT%H%M%SZ).md
{
echo "# r4_b2_1000 post-check (auto-generated on sample exit)"
echo "generated: $(date -u)"
echo
echo "## run log tail"
tail -25 "$LOG"
echo
echo "## artifacts"
ls -la "$(dirname "$CSV")" 2>/dev/null || echo "results dir missing"
echo
[ -f "$MD" ] && { echo "## tool MD head"; head -20 "$MD"; echo; }
if [ ! -f "$CSV" ]; then echo "COVERAGE: MISSING CSV"; exit 1; fi
echo "## new CSV"
head -1 "$CSV"
echo "rows: $(($(wc -l < "$CSV")-1))"
echo
echo "## coverage: prior 289 union subset of new sample"
python3 - <<'PY'
import csv
prior=set()
for p in [
 "/opt/dr-benchmark/results/Bseries_20261012T045027Z/B1_sampled_form_diff.csv",
 "/opt/dr-benchmark/results/Bseries_20261012T045027Z/B2_sampled_form_diff.csv",
 "/opt/dr-benchmark/results/Bseries_20261012T045027Z/B3_sampled_form_diff.csv"]:
    with open(p) as f:
        for row in csv.DictReader(f):
            prior.add(row["no_rawat"])
with open("/opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv") as f:
    new={row["no_rawat"] for row in csv.DictReader(f)}
missing=sorted(prior-new)
print(f"prior union: {len(prior)}; new sample: {len(new)}; missing: {len(missing)}")
print("COVERAGE_OK" if not missing else "COVERAGE_FAIL: "+",".join(missing[:20]))
PY
echo
echo "## drift rows in new sample (mismatch=True)"
python3 - <<'PY'
import csv
with open("/opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv") as f:
    rows=[r for r in csv.DictReader(f) if r.get("mismatch")=="True"]
print(f"drift: {len(rows)} visits")
for r in rows:
    print(r["no_rawat"],
          "cons_only="+r.get("consumer_only_rows","?"),
          "real_only="+r.get("real_only_rows","?"))
PY
echo
echo "## 4 historical drift visits in new sample"
python3 - <<'PY'
import csv
hist={"2027/09/23/800080","2027/09/23/800214","2027/09/28/800109","2027/09/28/800164"}
with open("/opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv") as f:
    found={r["no_rawat"]: r for r in csv.DictReader(f) if r["no_rawat"] in hist}
for v in sorted(hist):
    r=found.get(v)
    if r is None: print(v, "ABSENT from new sample")
    else: print(v, "mismatch="+r.get("mismatch","?"),
                "cons_only="+r.get("consumer_only_rows","?"),
                "real_only="+r.get("real_only_rows","?"))
PY
} > "$OUT" 2>&1
echo "WROTE $OUT"
