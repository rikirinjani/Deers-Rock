set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=0
export RUN_ID="r5_live_control"
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
echo "=== run full bill on live sik (4 visits) ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik \
  --visits-file /tmp/r5_visits4_live.txt --cap-min 20 > /tmp/r5_live_run.log 2>&1
echo "exit=$?"
grep -E "date 20|FINAL|ORACLE_DRIFT|sukses_true" /tmp/r5_live_run.log | head -20
echo "=== state ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_live_control/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batches=',{k:(v.get('status'),v.get('rc'),v.get('sukses')) for k,v in d.get('batches',{}).items()})"
echo "=== a harness log: sukses? ==="
HL=$(ls /opt/dr-benchmark/results/r5_live_control/B3_oracle_run_r5/harness_*.log 2>/dev/null | head -1)
grep -E "sukses|DONE|reaper" "$HL" 2>/dev/null | head -8
