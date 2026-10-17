#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
RES=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "=== R2-6 B1/B2 rerun artifacts ==="
for f in p1_b1_rerun.md p1_b2_rerun.md; do
  echo "--- $f ---"
  grep -iE "drift|rate|total|Rupee|Rp |billing|general_log|bytes" "$OUT/$f" 2>/dev/null | head -20 || echo "missing"
done
echo
echo "=== B1/B2 general_log sizes (canonical dir) ==="
ls -la "$RES"/general_log_B1.log "$RES"/general_log_B2.log 2>/dev/null
echo
echo "=== B1/B2 sampled_form_diff drift lines (canonical) ==="
grep -iE "drift" "$RES/B1_sampled_form_diff.md" "$RES/B2_sampled_form_diff.md" 2>/dev/null | head
echo
echo "=== db_freeze summary ==="
python3 -c "
import json
d=json.load(open('$OUT/db_freeze_20261013T031059Z.json'))
print('ts',d['ts'])
print('pool_bytes',d.get('innodb_buffer_pool_size_bytes'))
print('lqt',d.get('long_query_time'))
print('total_mb',d.get('innodb_data_idx_total_mb'))
for db,ts in d['tables'].items():
    print(db, 'tables=',len(ts))
" 2>/dev/null
echo
echo "=== p3_latency_curve.md (final) ==="
cat "$OUT/p3_latency_curve.md"
echo
echo "=== r2_gatefail.md (reframed tail) ==="
tail -22 "$OUT/r2_gatefail.md"
