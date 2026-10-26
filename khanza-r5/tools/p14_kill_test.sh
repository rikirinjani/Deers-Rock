#!/bin/bash
# P14 T2 kill test: start a 3-visit fixture pilot, SIGTERM the driver's whole process group
# during the oracle's real form run, then prove a clean state.
# Usage: DR_LOCK_SESSION=<id> bash p14_kill_test.sh <fixture-dir>   (launch detached)
set -u
cd /opt/Deers-Rock/tools
FXDIR=${1:?fixture dir}
FX=sik_p14e
B=/opt/dr-benchmark/p14
head -3 "$FXDIR/p14_edge_visits.txt" > $B/kill_visits.txt
echo "=== P14 kill test $(date -u +%Y-%m-%dT%H:%M:%SZ), visits: $(tr '\n' ' ' < $B/kill_visits.txt)==="
setsid env P14_FIXTURE_VISITS=$B/kill_visits.txt bash p14_edge_run.sh "$FXDIR" > $B/kill_driver.log 2>&1 &
DPID=$!
sleep 2
PGID=$(ps -o pgid= -p $DPID | tr -d ' ')
echo "driver pid=$DPID pgid=$PGID"
for i in $(seq 1 3600); do
  grep -q "oracle\[fixture\]: freeze-only exit=0" $B/kill_driver.log && break
  kill -0 $DPID 2>/dev/null || break
  sleep 1
done
if ! kill -0 $DPID 2>/dev/null; then
  echo "KILL-TEST-NOT-EXERCISED: the driver exited before the kill point"; tail -20 $B/kill_driver.log; exit 1
fi
for i in $(seq 1 60); do pgrep -f '[B]ilingHarness' >/dev/null && break; sleep 1; done
sleep 2
echo "harness alive before kill: $(pgrep -fc '[B]ilingHarness')"
echo "sending SIGTERM to process group $PGID at $(date -u +%H:%M:%S)"
kill -TERM -- -$PGID
for i in $(seq 1 180); do kill -0 $DPID 2>/dev/null || break; sleep 1; done
echo "driver alive after wait: $(kill -0 $DPID 2>/dev/null && echo yes || echo no)"
echo "--- driver log tail ---"; tail -25 $B/kill_driver.log
echo "--- post-kill state ---"
echo "harness processes: $(pgrep -fc '[B]ilingHarness')"
echo "databases: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "database.xml: $(python3 p6_dbxml.py probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u | tr '\n' ' ')"
echo "grant on $FX: $(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.schema_privileges WHERE grantee LIKE '%benchmark%' AND table_schema='$FX'")"
echo "writer markers: $(ls /opt/dr-benchmark/results/.writer_exclusion_* 2>/dev/null | wc -l)"
if [ -n "$(mysql -uroot -N -e "SHOW DATABASES LIKE '$FX'")" ]; then
  echo "clone $FX present: triggers=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$FX' AND trigger_name LIKE 'p7a_%'") fixture_reg=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $FX.reg_periksa WHERE no_rawat LIKE '2027/12/31/%'") ledger_rows=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $FX.dr_charge_ledger")"
else
  echo "clone $FX dropped by the EXIT trap"
fi
echo "=== KILL TEST DONE $(date -u +%H:%M:%S) ==="
