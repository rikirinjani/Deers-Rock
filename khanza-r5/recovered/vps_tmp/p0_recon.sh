#!/usr/bin/env bash
# P0 recon: confirm no_rawat format + unbilled-visit query shape before writing the P1 chain.
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "=== no_rawat column type ==="
mysql -uroot sik -N -B -e "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME='reg_periksa' AND COLUMN_NAME='no_rawat';"
echo
echo "=== sample no_rawat values (raw) ==="
mysql -uroot sik -N -B -e "SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' LIMIT 5;"
echo
echo "=== month extraction test (substring 1-7, expect YYYY/MM) ==="
mysql -uroot sik -N -B -e "SELECT SUBSTRING_INDEX(no_rawat,'/',2) AS ym, COUNT(*) FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY ym ORDER BY ym;"
echo
echo "=== UNBILLED: DR reg visits with NO billing row (LEFT ANTI JOIN), by month ==="
mysql -uroot sik -N -B -e "
SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) AS ym,
       COUNT(*) AS dr_visits,
       SUM(CASE WHEN b.no_rawat IS NULL THEN 1 ELSE 0 END) AS unbilled
FROM reg_periksa r
LEFT JOIN billing b ON b.no_rawat = r.no_rawat
WHERE r.no_rkm_medis LIKE 'DR%'
GROUP BY ym ORDER BY ym;"
echo
echo "=== total unbilled ==="
mysql -uroot sik -N -B -e "
SELECT COUNT(*) AS total_unbilled_dr_visits
FROM reg_periksa r
LEFT JOIN billing b ON b.no_rawat = r.no_rawat
WHERE r.no_rkm_medis LIKE 'DR%' AND b.no_rawat IS NULL;"
echo
echo "=== the 4 drifted visits: are they billed? ==="
for nr in "2027/09/23/800080" "2027/09/23/800214" "2027/09/28/800109" "2027/09/28/800164"; do
  c=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat='$nr';" 2>/dev/null)
  echo "  $nr billing_rows=$c"
done
echo
echo "=== general_log_B3 has these visits? ==="
for nr in 800080 800214 800109 800164; do
  n=$(grep -c "$nr" $R/general_log_B3.log 2>/dev/null)
  echo "  general_log_B3 hits for $nr: $n"
done
echo
echo "=== consumer_B3.log lines for the 4 visits ==="
for nr in "2027/09/23/800080" "2027/09/23/800214" "2027/09/28/800109" "2027/09/28/800164"; do
  echo "  $nr:"; grep -F "$nr" $R/consumer_B3.log 2>/dev/null | head -3
done
echo
echo "=== any ERROR/timeout/reject in consumer_B3.log tail? ==="
grep -iE "error|fail|timeout|reject|skip|warn" $R/consumer_B3.log 2>/dev/null | head -10
echo "(none-if-empty)"
