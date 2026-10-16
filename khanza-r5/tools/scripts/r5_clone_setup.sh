set -e
cd /opt/dr-benchmark
export PWF=/opt/simrs-khanza/run-env/benchmark_pw
MYSQL_PWD=$(cat $PWF) mysql -ubenchmark -e "DROP DATABASE IF EXISTS sik_r5; CREATE DATABASE sik_r5;"
echo "clone: dumping sik -> sik_r5 ..."
t0=$(date +%s)
MYSQL_PWD=$(cat $PWF) mysqldump -ubenchmark --single-transaction --skip-lock-tables sik > /tmp/sik_r5_dump.sql
echo "dump done $(($(date +%s)-t0))s, size:"; ls -la /tmp/sik_r5_dump.sql | awk "{print \$5}"
t1=$(date +%s)
MYSQL_PWD=$(cat $PWF) mysql -ubenchmark sik_r5 < /tmp/sik_r5_dump.sql
echo "restore done $(($(date +%s)-t1))s"
rm -f /tmp/sik_r5_dump.sql
echo "=== grant benchmark on sik_r5 ==="
mysql -uroot -N -e "GRANT ALL ON sik_r5.* TO '"'"'benchmark'"'"'@'"'"'localhost'"'"'; FLUSH PRIVILEGES;" 2>/dev/null || \
MYSQL_PWD=$(cat $PWF) mysql -ubenchmark -e "SHOW WARNINGS;" 2>&1 | head -3
echo "=== verify clone row counts ==="
MYSQL_PWD=$(cat $PWF) mysql -ubenchmark -N -e "SELECT '"'"'sik_r5'"'"', COUNT(*) FROM sik_r5.billing UNION ALL SELECT '"'"'sik'"'"', COUNT(*) FROM sik.billing UNION ALL SELECT '"'"'sik_r5 reg'"'"', COUNT(*) FROM sik_r5.reg_periksa;"
echo "=== live sik pre-fingerprint ==="
MYSQL_PWD=$(cat $PWF) mysql -ubenchmark -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing WHERE no_rkm_medis IS NULL;" 2>/dev/null || \
MYSQL_PWD=$(cat $PWF) mysql -ubenchmark -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
