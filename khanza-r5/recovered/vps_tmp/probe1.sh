#!/bin/bash
# probe1.sh - inspect DBs, settings, harness/consumer targets
echo "=== DATABASES ==="
mysql -uroot -N -e "SHOW DATABASES"
echo "=== sik_bench DR visits ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'"
echo "=== sik DR visits ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'"
echo "=== general_log state ==="
mysql -uroot -N -e "SELECT @@general_log, @@general_log_file, @@log_output"
echo "=== run-env settings dir ==="
ls -la /opt/simrs-khanza/run-env/setting/ 2>/dev/null | head -20
echo "=== root setting dir ==="
ls /opt/simrs-khanza/setting/ | head -20
echo "=== consumer class file ==="
ls -la /opt/simrs-khanza/consumer/*.class 2>/dev/null | head -5
echo "=== benchmark user exists ==="
mysql -uroot -N -e "SELECT user, host FROM mysql.user WHERE user='benchmark'"
echo "=== Xvfb / faketime ==="
which Xvfb faketime java python3
echo "=== prior results dirs ==="
ls /opt/dr-benchmark/results/ 2>/dev/null
echo "=== state ==="
cat /opt/dr-benchmark/state/state.json 2>/dev/null
