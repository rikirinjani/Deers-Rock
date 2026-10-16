set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export RUN_ID="r5_p1_demo"
# harness already points at sik_r5; verify
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
echo "=== resume run (picks up from FREEZE_DONE, bills all 47 pending batches) ==="
nohup python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50.txt --cap-min 45 > /tmp/r5_resume.log 2>&1 &
RPID=$!
echo "resume pid=$RPID"
echo "=== watching for DONE or a crash point (kill -9 to prove AC-8) ==="
for i in $(seq 1 240); do
  if ! kill -0 $RPID 2>/dev/null; then echo "resume exited at poll $i"; break; fi
  ph=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json')).get('phase'))" 2>/dev/null || echo NONE)
  st_batch=$(python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print(dict(collections.Counter(v.get('status') for v in d.get('batches',{}).values())))" 2>/dev/null || echo NONE)
  echo "poll $i phase=$ph batches=$st_batch"
  # crash injection: once a batch is mid-bill (RUNNING + at least one BILLED), kill -9
  if [ "$ph" = "RUNNING" ]; then
    billed=$(python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print(sum(1 for v in d.get('batches',{}).values() if v.get('status')=='BILLED'))" 2>/dev/null || echo 0)
    if [ "$billed" -ge 1 ]; then
      echo "CRASH INJECTION: phase=RUNNING, $billed batches BILLED -> kill -9 pid=$RPID"
      kill -9 $RPID
      echo "CRASHED=yes" > /tmp/r5_crashed.flag
      break
    fi
  fi
  if [ "$ph" = "DONE" ]; then echo "reached DONE (clean, no crash needed)"; break; fi
  sleep 5
done
echo "=== resume log tail ==="
tail -15 /tmp/r5_resume.log
echo "=== final state ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batch counts=',dict(collections.Counter(v.get('status') for v in d.get('batches',{}).values())))"
cat /tmp/r5_crashed.flag 2>/dev/null || true
