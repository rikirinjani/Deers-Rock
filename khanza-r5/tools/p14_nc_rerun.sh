#!/bin/bash
# P14 NC re-run after the scratch-copy fix: rebuild sik_p14e with the fixture only,
# run p14_line_negctl.sh, drop the clone, final live state.
# Usage: DR_LOCK_SESSION=<id> bash p14_nc_rerun.sh <fixture-dir>
set -u
cd /opt/Deers-Rock/tools
B=/opt/dr-benchmark/p14
echo "=== P14 NC rerun $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
bash p14_edge_run.sh "$1" > $B/nc_rerun_driver.log 2>&1; echo "driver_exit=$?"
grep -E "REPRODUCES|DIFFERS|oracle\[|form\[|P14E|ABORT|cleanup" $B/nc_rerun_driver.log
bash p14_line_negctl.sh; echo "negctl_exit=$?"
bash p14_drop_clone.sh sik_p14e
bash p14_live_state.sh final-after-nc-rerun | tee $B/live_state_final2.txt
echo "=== P14 NC rerun done $(date -u +%H:%M:%S) ==="
