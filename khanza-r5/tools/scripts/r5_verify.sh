set -e
echo "=== sik_r5 table/row check ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_r5';"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing;" 2>&1 | head -1
echo "=== live sik billing pre-fingerprint ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
echo "=== r4_b2_1000 csv head ==="
head -2 /opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv
echo "=== historical drift visits present in sik_r5? ==="
mysql -uroot -N -e "SELECT no_rawat FROM sik_r5.reg_periksa WHERE no_rawat IN ('2027/09/23/800080','2027/09/23/800214','2027/09/28/800109','2027/09/28/800164');"
