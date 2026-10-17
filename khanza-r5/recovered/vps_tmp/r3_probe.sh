#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
TS=$(cat "$OUT/r3_RUN_TS")
echo "=== run dir contents ==="
ls -la "$OUT/r3_run_$TS"/ 2>/dev/null || echo "no run dir"
echo
echo "=== p-chain contents matching TS ==="
ls -la "$OUT"/*${TS}* 2>/dev/null
echo
echo "=== log: which sections completed ==="
grep -nE "^=== |wrote |verdict|VERDICT" "$OUT/r3_EXEC_${TS}.log" | head -40
echo
echo "=== consumer_snapshot present? ==="
ls -la "$OUT"/consumer_snapshot_*.json "$OUT"/.sampled_diff_state 2>/dev/null
