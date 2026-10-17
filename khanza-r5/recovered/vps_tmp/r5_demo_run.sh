set -e
cd /opt/dr-benchmark
RUN_ID="r5_p1_demo"
export RUN_ID
INIFILE=/opt/simrs-khanza/setting/database.ini
cp $INIFILE /tmp/r5_database.ini.bak
echo "=== snapshot live sik pre-fingerprint ==="
PRE=$(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;")
echo "sik pre: $PRE"
# point the harness at the clone
sed -i "s/^database=.*/database=sik_r5/" $INIFILE
grep -E "^(database|user)=" $INIFILE
echo "=== harness DB target now: sik_r5 ==="
echo "=== step 1: freeze baseline (AC-1) on the clone ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50.txt --freeze-only 2>&1 | tail -15
echo "=== freeze-only exit done ==="
echo "=== step 2: full run with crash injection (AC-3/AC-8) ==="
# Launch the tool in the background; it will bill dates one by one.
( cd /opt/Deers-Rock/tools && RUN_ID=$RUN_ID python3 sampled_real_form_diff_r5.py \
    --stage B3 --db-name sik_r5 --visits-file /tmp/r5_visits50.txt --cap-min 45 \
    > /tmp/r5_run1.log 2>&1 &
  echo $! > /tmp/r5_run1.pid )
R1PID=$(cat /tmp/r5_run1.pid)
echo "run1 pid=$R1PID; waiting for first date to reach RESET, then crash it..."
# wait until a batch is in RESET state (harness running), then kill -9 the tool
for i in $(seq 1 60); do
  st=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5/.state.json'))['phase'])" 2>/dev/null || echo NONE)
  echo "poll $i phase=$st"
  if [ "$st" = "RUNNING" ]; then
    echo "CRASH: kill -9 run1 pid=$R1PID (mid-run, phase=$st)"
    kill -9 $R1PID
    break
  fi
  if [ -f /opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5/.state.json ]; then
    ph=$(python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5/.state.json'));print(d.get('phase'))" 2>/dev/null)
    if [ "$ph" = "DONE" ]; then echo "run1 finished cleanly (no crash chance); still resuming to prove AC-3"; break; fi
  fi
  sleep 5
done
sleep 2
echo "=== run1 log tail ==="
tail -25 /tmp/r5_run1.log
echo "=== state after crash ==="
python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batches=',{k:v.get('status') for k,v in d.get('batches',{}).items()})"
