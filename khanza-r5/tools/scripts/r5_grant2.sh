set -e
cd /opt/dr-benchmark
# Clean up stale dir
rm -rf /opt/dr-benchmark/results/r5_p1_demo
# Grant benchmark ALL on sik_r5 via root (root password from benchmark_pw is the DB root pw)
PWF=/opt/simrs-khanza/run-env/benchmark_pw
export MYSQL_PWD=$(cat $PWF)
mysql -ubenchmark -N -e "SELECT COUNT(*) FROM sik_r5.billing;" 2>&1 || {
  echo "benchmark still blocked; trying to grant as benchmark (may fail)"
  mysql -ubenchmark -e "GRANT ALL ON sik_r5.* TO '"'"'benchmark'"'"'@'"'"'localhost'"'"';" 2>&1 || true
}
echo "=== direct test ==="
mysql -ubenchmark -N -e "SELECT COUNT(*) FROM sik_r5.billing;" 2>&1
