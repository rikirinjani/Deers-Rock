#!/usr/bin/env bash
# r2_wave1_launch.sh — upload point; launch wave1 detached, show early progress.
set -euo pipefail
rm -f /tmp/r2w1.done
nohup bash /tmp/r2_wave1.sh > /tmp/r2w1.out 2>&1 &
echo "wave1 launched pid=$!"
sleep 40
echo "--- p1_r2.log after 40s ---"
tail -10 /opt/dr-benchmark/p-chain/p1_r2.log 2>/dev/null || echo "(not yet)"
