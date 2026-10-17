set -e
cd /opt/dr-benchmark
echo "re-dump sik -> sik_r5 (fresh)"
mysql -uroot -e "DROP DATABASE IF EXISTS sik_r5; CREATE DATABASE sik_r5;"
t0=$(date +%s)
mysql -uroot sik > /tmp/sik_r5_dump.sql
echo "dump $(($(date +%s)-t0))s size=$(stat -c%s /tmp/sik_r5_dump.sql)"
t1=$(date +%s)
mysql -uroot sik_r5 < /tmp/sik_r5_dump.sql
echo "restore $(($(date +%s)-t1))s"
rm -f /tmp/sik_r5_dump.sql
echo "=== verify ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_r5';"
mysql -uroot -N -e "SELECT 'r5_billing', COUNT(*) FROM sik_r5.billing UNION ALL SELECT 'sik_billing', COUNT(*) FROM sik.billing UNION ALL SELECT 'r5_reg', COUNT(*) FROM sik_r5.reg_periksa;"
echo "CLONE_DONE"
