set -e
echo "=== benchmark user: databases ==="
MYSQL_PWD=$(cat /opt/simrs-khanza/run-env/benchmark_pw) mysql -ubenchmark -N -e "SHOW DATABASES;" 2>&1 | head -10
echo "=== ini host/port values (no pass) ==="
grep -E "^(host|port|database|user)=" /opt/simrs-khanza/setting/database.ini
echo "=== jar reads database.ini? (class strings) ==="
cd /opt/simrs-khanza
strings dist/SIMRSKhanza.jar 2>/dev/null | grep -E "^database\.(ini|xml)|setting/database" | sort -u | head -5
echo "=== r4 sample 999 list available? ==="
ls -la /opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv 2>/dev/null
head -3 /opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv 2>/dev/null
echo "=== 4 historical drift visits ==="
grep -o "2027/09/2[38]/800[0-9][0-9][0-9]" /opt/dr-benchmark/p-chain/p1_rootcause.md | sort -u
