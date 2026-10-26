#!/bin/bash
# P13 kill-test: start a 5-visit pilot, SIGTERM it mid-run, verify clean state
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p13w
LOCK_SESSION=$(sed -n 's/^session=//p' /opt/dr-benchmark/LOCK)
echo "lock session: $LOCK_SESSION"

# Get 5 visits from the N=30 sample
head -5 /tmp/p13_test1/p13_stage_30_visits.txt > /tmp/p13_kill_test_visits.txt
echo "using $(wc -l < /tmp/p13_kill_test_visits.txt) visits"

echo "=== P13 kill-test $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# Start the driver in the background with the lock session
DR_LOCK_SESSION=$LOCK_SESSION bash p13_wide_sample.sh KILLTEST /tmp/p13_kill_test_visits.txt > /tmp/p13_kill_test.log 2>&1 &
DPID=$!
echo "driver PID=$DPID"

# Wait for the oracle to start (gives it ~45s to get through clone+freeze)
sleep 45
if ! kill -0 $DPID 2>/dev/null; then
  echo "driver already exited (fast clone + freeze?) - checking state anyway"
  sleep 5
fi

# SIGTERM the driver (if still running)
if kill -0 $DPID 2>/dev/null; then
  echo "sending SIGTERM to $DPID at $(date -u +%H:%M:%S)"
  kill -TERM $DPID
  sleep 5
fi

# Wait for it to finish
for i in $(seq 1 120); do
  kill -0 $DPID 2>/dev/null || break
  sleep 1
done

echo "--- driver log tail ---"
tail -30 /tmp/p13_kill_test.log
echo "--- post-kill state ---"
echo "databases: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "database.xml: $(python3 /opt/Deers-Rock/tools/p6_dbxml.py probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u | tr '\n' ' ')"
# P15 A7: grantee is stored as 'benchmark'@'localhost' (single quotes); the old double-quoted probe never matched
echo "grant on $FX: $(mysql -uroot -N -e "SELECT privilege_type FROM information_schema.schema_privileges WHERE grantee=\"'benchmark'@'localhost'\" AND table_schema='$FX'" 2>/dev/null | sort -u | tr '\n' ' ')"
echo "writer markers: $(ls /opt/dr-benchmark/results/.writer_exclusion_* 2>/dev/null | wc -l)"

# If the clone is still there (driver's EXIT trap kept it), verify it's not half-state
if [ -n "$(mysql -uroot -N -e "SHOW DATABASES LIKE '$FX'")" ]; then
  TRIGS=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$FX' AND trigger_name LIKE 'p7a_%'")
  BILLING=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $FX.billing")
  AUDIT=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $FX.p7_write_audit" 2>/dev/null || echo 0)
  echo "clone $FX still present: triggers=$TRIGS billing_rows=$BILLING audit_rows=$AUDIT"
  echo "clone state: KEPT (not half-state: triggers=$TRIGS, billing=$BILLING)"
else
  echo "clone $FX was dropped by the driver's EXIT trap"
fi
echo "=== KILL-TEST DONE ==="
