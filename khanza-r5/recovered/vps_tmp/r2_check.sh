#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
echo "=== r2_finish process ==="
pgrep -af r2_finish || echo "r2_finish not running"
echo
echo "=== r2_finish.log tail ==="
tail -n 12 "$OUT/r2_finish.log" 2>/dev/null || echo "log not present yet"
echo
echo "=== R2-2 corrected raw ==="
cat "$OUT/r2_2_corrected.txt" 2>/dev/null
echo
echo "=== per-visit billing breakdown (PPN vs pre-PPN split) ==="
for v in "2027/09/23/800080" "2027/09/23/800214" "2027/09/28/800109" "2027/09/28/800164"; do
  echo "--- $v ---"
  mysql -uroot sik -N -B -e "SELECT status, ROUND(SUM(biaya*COALESCE(jumlah,1)),2) AS nilai_pre_ppn, ROUND(SUM(totalbiaya),2) AS totalbiaya_sum, COUNT(*) AS rows FROM billing WHERE no_rawat='$v' AND status NOT LIKE 'Ttl%' GROUP BY status ORDER BY status;"
done
echo
echo "=== R2-3 latency json progress ==="
if [ -f "$OUT/r2_3_latency.json" ]; then
  tail -n 25 "$OUT/r2_3_latency.json"
else
  echo "not written yet"
fi
echo
echo "=== lqt / pool state ==="
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
