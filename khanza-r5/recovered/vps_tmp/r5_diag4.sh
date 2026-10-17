set -e
cd /opt/dr-benchmark
echo "=== sik_r5.admin columns ==="
mysql -uroot -N -e "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema='sik_r5' AND table_name='admin' ORDER BY ordinal_position;"
echo "=== sik_r5 admin rows (masked) ==="
mysql -uroot -N -e "SELECT username FROM sik_r5.admin;" 2>/dev/null || mysql -uroot -N -e "SELECT * FROM sik_r5.admin LIMIT 3;" 2>&1 | head
echo "=== does sik_r5 have the same admin as sik? ==="
echo "sik admin count: $(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik.admin;')"
echo "r5  admin count: $(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik_r5.admin;')"
echo "=== re-bill repair path: did the consumer restore billing? sample ==="
mysql -uroot -N -e "SELECT no_rawat, COUNT(*) FROM sik_r5.billing WHERE no_rawat='2027/01/07/800216' GROUP BY no_rawat;"
echo "=== sik (live) same visit ==="
mysql -uroot -N -e "SELECT no_rawat, COUNT(*) FROM sik.billing WHERE no_rawat='2027/01/07/800216' GROUP BY no_rawat;"
echo "=== full harness log for that date ==="
sed -n '1,60p' results/r5_p1_demo/B3_oracle_run_r5/harness_2027_01_07.log
