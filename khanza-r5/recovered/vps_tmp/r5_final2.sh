set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
export RUN_ID="r5_p1_demo"
echo "=== RESUME (AC-3: restore+rebill RESET batch, finish all PENDING) ==="
nohup python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50.txt --cap-min 45 > /tmp/r5_resume_final.log 2>&1 &
RPID=$!
echo "resume pid=$RPID"
for i in $(seq 1 400); do
  if ! kill -0 $RPID 2>/dev/null; then echo "resume exited at poll $i"; break; fi
  ph=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json')).get('phase'))" 2>/dev/null || echo NONE)
  billed=$(python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print(sum(1 for v in d.get('batches',{}).values() if v.get('status')=='BILLED'))" 2>/dev/null || echo 0)
  if [ $((i % 8)) -eq 0 ]; then echo "poll $i phase=$ph billed=$billed"; fi
  if [ "$ph" = "DONE" ]; then echo "reached DONE at poll $i"; break; fi
  sleep 5
done
echo "=== resume log: restore+rebill lines ==="
grep -E "stage-restore|reset|RESUME|verify-frozen|date 2027-09" /tmp/r5_resume_final.log | head -30
echo "=== resume log tail ==="
tail -12 /tmp/r5_resume_final.log
echo "=== final state ==="
python3 -c "import json,collections;d=json.load(open('/opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batch counts=',dict(collections.Counter(v.get('status') for v in d.get('batches',{}).values())))"
