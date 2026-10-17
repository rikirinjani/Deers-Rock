#!/bin/bash
# Launch B-series ladder on DR→Khanza benchmark VPS
set -e
RUN_ID="Bseries_$(date -u +%Y%m%dT%H%M%SZ)"
echo "Launching B-series with RUN_ID=$RUN_ID"

cd /opt/dr-benchmark

# Launch via systemd as dr-bench service
systemd-run --unit=dr-bench -- /usr/bin/bash /opt/dr-benchmark/run_all.sh --run-id "$RUN_ID" --resume stageB_ladder

echo "Launch command issued. Checking service status..."
sleep 5

echo "=== Service Status ==="
systemctl status dr-bench --no-pager 2>&1 | head -8

echo
echo "=== Console Start ==="
tail -10 /opt/dr-benchmark/run_console.log 2>/dev/null || echo "No console yet"

echo
echo "=== Results Dir ==="
ls -la /opt/dr-benchmark/results/$RUN_ID/ 2>/dev/null | head || echo "Results dir not yet created"

echo
echo "LAUNCH_COMPLETE_RUN_ID=$RUN_ID"
