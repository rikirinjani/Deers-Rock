kill 304957 2>/dev/null || true
pkill -f "mysql -uroot sik" 2>/dev/null || true
cd /opt/dr-benchmark
echo "start clean clone $(date -u +%H:%M:%S)"
mysql -uroot -e "DROP DATABASE IF EXISTS sik_r5; CREATE DATABASE sik_r5;" 2>&1
t0=$(date +%s)
mysql -uroot sik > /tmp/sik_r5_dump.sql 2>/tmp/sik_r5_dump.err
echo "dump rc=$? $(($(date +%s)-t0))s size=$(stat -c%s /tmp/sik_r5_dump.sql) err=$(head -c 200 /tmp/sik_r5_dump.err 2>/dev/null)"
t1=$(date +%s)
mysql -uroot sik_r5 < /tmp/sik_r5_dump.sql 2>/tmp/sik_r5_restore.err
echo "restore rc=$? $(($(date +%s)-t1))s rerr=$(head -c 200 /tmp/sik_r5_restore.err 2>/dev/null)"
rm -f /tmp/sik_r5_dump.sql /tmp/sik_r5_dump.err /tmp/sik_r5_restore.err
mysql -uroot -N -e "SELECT 'r5_tables', COUNT(*) FROM information_schema.tables WHERE table_schema='sik_r5';" 2>&1
mysql -uroot -N -e "SELECT 'r5_billing', COUNT(*) FROM sik_r5.billing UNION ALL SELECT 'sik_billing', COUNT(*) FROM sik.billing;" 2>&1
echo "CLONE_OK"
