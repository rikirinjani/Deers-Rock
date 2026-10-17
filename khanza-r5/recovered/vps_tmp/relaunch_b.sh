#!/usr/bin/env bash
# Relaunch B-series: reset failed unit, fresh RUN_ID, resume stageB_ladder.
set -uo pipefail
systemctl reset-failed dr-bench 2>/dev/null || true
RUN_ID="Bseries_$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "/opt/dr-benchmark/results/$RUN_ID"
systemd-run --unit=dr-bench --property=Type=exec \
  -p Environment=RUN_ID="$RUN_ID" \
  /usr/bin/bash /opt/dr-benchmark/run_all.sh --resume stageB_ladder
echo "LAUNCHED run_id=$RUN_ID"
sleep 20
echo "=== unit status ==="
systemctl status dr-bench --no-pager 2>&1 | head -8
echo "=== console tail ==="
tail -8 /opt/dr-benchmark/run_console.log
echo "=== results dir ==="
ls -la "/opt/dr-benchmark/results/$RUN_ID/" 2>/dev/null
