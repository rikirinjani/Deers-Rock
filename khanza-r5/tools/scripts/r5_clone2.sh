set -e
PWF=/opt/simrs-khanza/run-env/benchmark_pw
echo "=== root: create + grant sik_r5 ==="
mysql -uroot -N -e "DROP DATABASE IF EXISTS sik_r5; CREATE DATABASE sik_r5; GRANT ALL ON sik_r5.* TO '"'"'benchmark'"'"'@'"'"'localhost'"'"'; FLUSH PRIVILEGES;"
echo "root create+grant OK"
echo "=== clone dump+restore as root ==="
t0=$(date +%s)
mysql -uroot sik > /tmp/sik_r5_dump.sql
echo "dump $(($(date +%s)-t0))s size=$(stat -c%s /tmp/sik_r5_dump.sql)"
t1=$(date +%s)
mysql -uroot sik_r5 < /tmp/sik_r5_dump.sql
echo "restore $(($(date +%s)-t1))s"
rm -f /tmp/sik_r5_dump.sql
echo "=== verify (benchmark now has access) ==="
export MYSQL_PWD=$(cat $PWF)
mysql -ubenchmark -N -e "SELECT '"'"'sik_r5.billing'"'"', COUNT(*) FROM sik_r5.billing; SELECT '"'"'sik.billing'"'"', COUNT(*) FROM sik.billing; SELECT '"'"'sik_r5.reg'"'"', COUNT(*) FROM sik_r5.reg_periksa;"
echo "=== live sik pre-fingerprint (rows, sum totalbiaya) ==="
mysql -ubenchmark -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
