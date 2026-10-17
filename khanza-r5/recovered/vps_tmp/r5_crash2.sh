set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export RUN_ID="r5_p1_demo"
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
# fresh run dir to re-freeze with the corrected fingerprint
rm -rf /opt/dr-benchmark/results/r5_p1_demo
rm -f /tmp/r5_crashed.flag
echo "=== step 1: re-freeze (AC-1, corrected fingerprint) ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50.txt --freeze-only 2>&1 | tail -8
echo "=== step 2: run1 with crash injection ==="
nohup python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50.txt --cap-min 45 > /tmp/r5_run1.log 2>&1 &
R1PID=$!
echo "run1 pid=$R1PID"
CRASHED=no
for i in $(seq 1 60); do
  if ! kill -0 $R1PID 2>/dev/null; then echo "run1 exited early at poll $i"; break; fi
  ph=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json')).get('phase'))" 2>/dev/null || echo NONE)
  billed=$(python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print(sum(1 for v in d.get('batches',{}).values() if v.get('status')=='BILLED'))" 2>/dev/null || echo 0)
  if [ $((i % 4)) -eq 0 ]; then echo "poll $i phase=$ph billed=$billed"; fi
  if [ "$ph" = "RUNNING" ] && [ "$billed" -ge 2 ]; then
    echo "CRASH at poll $i: kill -9 pid=$R1PID (2 batches BILLED)"
    kill -9 $R1PID; CRASHED=yes; break
  fi
  sleep 5
done
sleep 2
echo "=== state after crash ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batch counts=',dict(collections.Counter(v.get('status') for v in d.get('batches',{}).values())))"
echo "CRASHED=$CRASHED"
