#!/usr/bin/env bash
set -euo pipefail
systemd-run --unit=p-chain --property=Type=exec /usr/bin/bash /opt/dr-benchmark/p-chain/run_p_chain.sh
sleep 15
echo "=== unit state ==="
systemctl is-active p-chain
systemctl status p-chain --no-pager -n 5 | head -12
echo
echo "=== PSTATUS.json ==="
cat /opt/dr-benchmark/p-chain/PSTATUS.json
echo
echo "=== p1.log head ==="
head -8 /opt/dr-benchmark/p-chain/p1.log 2>/dev/null || echo "(p1.log not yet)"
echo
echo "=== master log tail ==="
tail -4 /opt/dr-benchmark/p-chain/p_master.log 2>/dev/null || true
