#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
echo "=== r2_finish process ==="
pgrep -af r2_finish || echo "r2_finish NOT running (finished)"
echo
echo "=== r2_finish.log tail ==="
tail -n 18 "$OUT/r2_finish.log" 2>/dev/null
echo
echo "=== raw rows per visit ==="
for v in "2027/09/23/800080" "2027/09/23/800214" "2027/09/28/800109" "2027/09/28/800164"; do
  echo "--- $v ---"
  mysql -uroot sik -N -B -e "SELECT status, nm_perawatan, biaya, jumlah, totalbiaya, tgl_byr FROM billing WHERE no_rawat='$v' ORDER BY noindex;"
done
echo
echo "=== two candidate totals (non-Ttl only) ==="
for v in "2027/09/23/800080" "2027/09/23/800214" "2027/09/28/800109" "2027/09/28/800164"; do
  echo "--- $v ---"
  mysql -uroot sik -N -B -e "SELECT ROUND(SUM(totalbiaya),2) AS sum_totalbiaya, ROUND(SUM(biaya*jumlah),2) AS sum_biaya_jml, COUNT(*) AS n_rows FROM billing WHERE no_rawat='$v' AND status NOT LIKE 'Ttl%';"
done
echo
echo "=== R2-3 latency json ==="
if [ -f "$OUT/r2_3_latency.json" ]; then
  python3 -c "
import json
d=json.load(open('$OUT/r2_3_latency.json'))
for s in d:
    print(s, d[s]['cutoff'], {n:d[s]['q'][n]['p50'] for n in d[s]['q']})
" 2>/dev/null | head -12
  echo "json present"
else
  echo "not written yet"
fi
echo
echo "=== lqt / pool ==="
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size, @@long_query_time;"
