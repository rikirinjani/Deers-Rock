#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
echo "=== p1_b1_rerun.md ==="
cat "$OUT/p1_b1_rerun.md" 2>/dev/null
echo
echo "=== p1_b2_rerun.md ==="
cat "$OUT/p1_b2_rerun.md" 2>/dev/null
echo
echo "=== gl / rerun files under p-chain ==="
ls -la "$OUT"/*gl* "$OUT"/*rerun* 2>/dev/null
echo
echo "=== current general_log_file ==="
mysql -uroot -N -B -e "SHOW VARIABLES LIKE 'general_log_file';"
