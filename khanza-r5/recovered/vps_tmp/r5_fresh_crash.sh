set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export RUN_ID="r5_p1_demo"
grep -E "^database=" /opt/simrs-khanza/setting/database.ini || sed -i "s/^database=.*/database=sik_r5/" /opt/simrs-khanza/setting/database.ini
rm -rf /opt/dr-benchmark/results/r5_p1_demo
rm -f /tmp/r5_crashed.flag
PRE=$(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;")
echo "live sik pre: $PRE"
echo "=== step 1: freeze (AC-1) ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50_fresh.txt --freeze-only 2>&1 | tail -4
echo "=== step 2: run1 + crash injection (AC-3/AC-8) ==="
nohup python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50_fresh.txt --cap-min 45 > /tmp/r5_run1.log 2>&1 &
R1PID=$!
echo "run1 pid=$R1PID"
CRASHED=no
for i in $(seq 1 120); do
  kill -0 $R1PID 2>/dev/null || { echo "run1 exited early poll $i"; break; }
  ph=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json')).get('phase'))" 2>/dev/null || echo NONE)
  billed=$(python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print(sum(1 for v in d.get('batches',{}).values() if v.get('status')=='BILLED'))" 2>/dev/null || echo 0)
  [ $((i % 4)) -eq 0 ] && echo "poll $i phase=$ph billed=$billed"
  if [ "$ph" = "RUNNING" ] && [ "$billed" -ge 2 ]; then
    echo "CRASH at poll $i: kill -9 pid=$R1PID ($billed BILLED)"; kill -9 $R1PID; CRASHED=yes; break
  fi
  [ "$ph" = "DONE" ] && { echo "clean DONE poll $i"; break; }
  sleep 5
done
sleep 2
echo "=== post-crash state ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batch counts=',dict(collections.Counter(v.get('status') for v in d.get('batches',{}).values())))"
echo "CRASHED=$CRASHED"
