#!/usr/bin/env bash
set -euo pipefail
echo "===== run_all.sh 1-140 ====="
sed -n '1,140p' /opt/dr-benchmark/run_all.sh
echo
echo "===== run_all.sh 283-340 ====="
sed -n '283,340p' /opt/dr-benchmark/run_all.sh
echo
echo "===== state dir ====="
ls -la /opt/dr-benchmark/state/ | head -20
cat /opt/dr-benchmark/state.json 2>/dev/null || true
