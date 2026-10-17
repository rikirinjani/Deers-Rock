set -e
cd /opt/dr-benchmark
echo "=== build scratch fixture: sik_p2 + sik_bench_p2 ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p2; DROP DATABASE IF EXISTS sik_bench_p2; CREATE DATABASE sik_p2; CREATE DATABASE sik_bench_p2;"
t0=$(date +%s)
mysqldump -uroot sik > /tmp/sik_p2.sql
echo "sik dump $(($(date +%s)-t0))s $(stat -c%s /tmp/sik_p2.sql)"
t1=$(date +%s)
mysql -uroot sik_p2 < /tmp/sik_p2.sql
echo "sik_p2 restore $(($(date +%s)-t1))s"
t2=$(date +%s)
mysqldump -uroot sik_bench > /tmp/sik_bench_p2.sql
mysql -uroot sik_bench_p2 < /tmp/sik_bench_p2.sql
echo "sik_bench_p2 done $(($(date +%s)-t2))s"
rm -f /tmp/sik_p2.sql /tmp/sik_bench_p2.sql
echo "=== verify ==="
mysql -uroot -N -e "SELECT \"p2 billing\", COUNT(*) FROM sik_p2.billing; SELECT \"p2 dr_ledger\", COUNT(*) FROM sik_bench_p2.dr_charge_ledger; SELECT \"p2 dr_tariff\", COUNT(*) FROM sik_bench_p2.dr_tariff;"
