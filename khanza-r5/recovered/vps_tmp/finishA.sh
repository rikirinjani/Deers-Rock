#!/usr/bin/env bash
# finishA.sh — turn OFF general log, move capture into run dir, show evidence.
set -euo pipefail
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
mysql -uroot -e "SET GLOBAL general_log=OFF;"
echo "general_log OFF at $(date -u +%H:%M:%S)"
cp -p /tmp/general_log_B3.log "$R/general_log_B3.log"
echo "general_log_B3.log bytes in run dir: $(stat -c %s "$R/general_log_B3.log")"
echo "capture head/tail (first/last 2 lines, no data):"
head -2 "$R/general_log_B3.log" | cut -c1-100
tail -2 "$R/general_log_B3.log" | cut -c1-100

echo
echo "=== B3 three-count log ==="
cat "$R/stageA_three_count_B3.log"
echo
echo "=== B3 charge-delta log (key lines) ==="
grep -E "DR visits|Khanza total|unexplained|gate|PASS" "$R/stageA_charge_delta_B3.log"
echo
echo "=== B3 sampled diff md head ==="
head -6 "$R/B3_sampled_form_diff.md"
echo "--- drift rows ---"
grep -v " | True | .* | 0 | 0 |" "$R/B3_sampled_form_diff.md" | grep "^| 20" || echo "(no drift rows in table?)"
grep "YES" "$R/B3_sampled_form_diff.md" || true
echo "--- csv mismatch=True rows ---"
grep ",True$" "$R/B3_sampled_form_diff.csv" || echo "(csv: no True rows)"
grep "800080\|800109\|800164\|800214" "$R/B3_sampled_form_diff.csv"

echo
echo "=== the 4 no-consumer-billing visits: billing rows? (read-only) ==="
PW=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
for nr in "2027/09/23/800080" "2027/09/28/800109" "2027/09/28/800164" "2027/09/23/800214"; do
  n=$(MYSQL_PWD="$PW" mysql -ubenchmark -N -B sik -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM billing WHERE no_rawat='$nr'" 2>/dev/null)
  r=$(MYSQL_PWD="$PW" mysql -ubenchmark -N -B sik -e "SELECT status_bayar FROM reg_periksa WHERE no_rawat='$nr'" 2>/dev/null)
  echo "$nr billing=[$n] reg=[$r]"
done
echo "(password used via MYSQL_PWD only, not printed)"
