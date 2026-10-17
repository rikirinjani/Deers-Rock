#!/usr/bin/env bash
set -euo pipefail
echo "=== dr-bench unit ==="
systemctl is-active dr-bench || true
echo
echo "=== tools dir ==="
ls -la /opt/Deers-Rock/tools/
echo
echo "=== results dir ==="
ls -la /opt/dr-benchmark/results/
echo
for d in /opt/dr-benchmark/results/*/; do
  echo "=== $d ==="
  ls -la "$d" | head -60
  echo
done
echo "=== run_all.sh (phases) ==="
grep -n "Phase" /opt/dr-benchmark/run_all.sh | head -40
