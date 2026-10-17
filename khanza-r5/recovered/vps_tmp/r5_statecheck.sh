cd /opt/dr-benchmark
echo "=== is run1 still alive? ==="
pgrep -f "sampled_real_form_diff_r5" || echo "run1 not running"
echo "=== current state ==="
python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));bs={k:v.get('status') for k,v in d.get('batches',{}).items()};import collections;print('batch status counts=',dict(collections.Counter(bs.values())));print('total batches=',len(bs))"
echo "=== run1 log tail ==="
tail -8 /tmp/r5_run1.log 2>/dev/null
echo "=== crash flag ==="
cat /tmp/r5_crashed.flag 2>/dev/null || echo "no flag yet"
