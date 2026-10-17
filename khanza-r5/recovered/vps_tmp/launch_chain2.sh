#!/usr/bin/env bash
set -uo pipefail
systemd-run --unit=p-chain --property=Type=exec /usr/bin/bash /opt/dr-benchmark/p-chain/run_p_chain.sh
sleep 20
echo "=== unit state ==="
systemctl is-active p-chain
echo
echo "=== PSTATUS.json ==="
cat /opt/dr-benchmark/p-chain/PSTATUS.json 2>/dev/null || echo "(still missing!)"
echo
echo "=== master log tail ==="
tail -6 /opt/dr-benchmark/p-chain/p_master.log 2>/dev/null || true
echo
echo "=== current step ==="
pgrep -af "pchain_p" || true
