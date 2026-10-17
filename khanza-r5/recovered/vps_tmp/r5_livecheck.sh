cd /opt/dr-benchmark
echo "=== live control run status ==="
if pgrep -f "sampled_real_form_diff_r5" >/dev/null 2>&1; then echo "still running"; else echo "finished"; fi
echo "--- log tail ---"
tail -20 /tmp/r5_live_run.log 2>/dev/null
echo "=== state ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_live_control/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batches=',{k:(v.get('status'),v.get('rc')) for k,v in d.get('batches',{}).items()})" 2>&1
echo "=== harness sukses lines ==="
grep -rE "sukses|DONE" /opt/dr-benchmark/results/r5_live_control/B3_oracle_run_r5/harness_*.log 2>/dev/null | head -12
