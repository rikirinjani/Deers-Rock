set -e
cd /opt/dr-benchmark
echo "=== grant benchmark on sik_r5 (root has GRANT) ==="
mysql -uroot -e "GRANT ALL ON sik_r5.* TO '"'"'benchmark'"'"'@'"'"'localhost'"'"'; FLUSH PRIVILEGES;" 2>&1 && echo "GRANT_OK" || echo "GRANT_FAILED"
echo "=== clean stale r5_p1_demo run dir ==="
rm -rf /opt/dr-benchmark/results/r5_p1_demo
echo "=== verify benchmark can read sik_r5 ==="
PWF=/opt/simrs-khanza/run-env/benchmark_pw
export MYSQL_PWD=$(cat $PWF)
mysql -ubenchmark -N -e "SELECT COUNT(*) FROM sik_r5.billing;" 2>&1
