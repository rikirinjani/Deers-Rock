set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
RUN_ID="r5_p1_demo"
export RUN_ID
INIFILE=/opt/simrs-khanza/setting/database.ini
cp $INIFILE /tmp/r5_database.ini.bak 2>/dev/null || true
rm -rf /opt/dr-benchmark/results/r5_p1_demo
# point harness at the clone
sed -i "s/^database=.*/database=sik_r5/" $INIFILE
grep -E "^database=" $INIFILE
PRE=$(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;")
echo "sik pre-fingerprint: $PRE"
echo "=== step 1: freeze baseline (AC-1) ==="
python3 /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py --stage B3 --db-name sik_r5 \
  --visits-file /tmp/r5_visits50.txt --freeze-only 2>&1 | tail -12
echo "=== step 2: run1 with crash injection (AC-3/AC-8) ==="
( cd /opt/Deers-Rock/tools && RUN_ID=$RUN_ID DBUTIL_FORCE_ROOT=1 python3 sampled_real_form_diff_r5.py \
    --stage B3 --db-name sik_r5 --visits-file /tmp/r5_visits50.txt --cap-min 45 \
    > /tmp/r5_run1.log 2>&1 & echo $! > /tmp/r5_run1.pid )
R1PID=$(cat /tmp/r5_run1.pid)
echo "run1 pid=$R1PID; watching for RUNNING then crash..."
CRASHED=no
for i in $(seq 1 120); do
  if [ ! -d /opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5 ]; then sleep 5; continue; fi
  st=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5/.state.json'))['phase'])" 2>/dev/null || echo NONE)
  if [ "$st" = "RUNNING" ]; then
    echo "poll $i phase=RUNNING -> CRASH kill -9 pid=$R1PID"
    kill -9 $R1PID
    CRASHED=yes
    break
  fi
  if [ "$st" = "DONE" ]; then echo "poll $i phase=DONE (clean finish; still will resume)"; break; fi
  sleep 5
done
sleep 3
echo "=== run1 log tail ==="
tail -20 /tmp/r5_run1.log
echo "=== state after crash ==="
python3 -c "import json;d=json.load(open('/opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5/.state.json'));print('phase=',d.get('phase'));print('batch statuses=',{k:v.get('status') for k,v in d.get('batches',{}).items()})"
echo "CRASHED=$CRASHED" > /tmp/r5_crashed.flag
echo "=== run1 log + state saved; will resume in next step ==="
