#!/bin/bash
# Run on new VPS: verify setup state
echo "=== MySQL version ==="
mysql -uroot -N -e 'SELECT VERSION()' 2>/dev/null || echo "mysql not ready or needs sudo"
echo "=== Databases ==="
mysql -uroot -N -e 'SHOW DATABASES' 2>/dev/null
echo "=== JAR md5 ==="
md5sum /opt/simrs-khanza/dist/SIMRSKhanza.jar 2>/dev/null || echo "JAR not found"
echo "=== sik_bench seed check ==="
mysql -uroot sik_bench -N -e 'SELECT (SELECT COUNT(*) FROM reg_periksa)+(SELECT COUNT(*) FROM billing)+(SELECT COUNT(*) FROM nota_jalan)' 2>/dev/null || echo "sik_bench not ready"
echo "=== benchmark user ==="
mysql -uroot -N -e "SELECT user,host,plugin FROM mysql.user WHERE user='benchmark'" 2>/dev/null || echo "no benchmark user"
echo "=== run_all.sh ==="
ls -la /opt/dr-benchmark/run_all.sh 2>/dev/null || echo "missing"
echo "=== java/faketime/xvfb ==="
java -version 2>&1 | head -1
which faketime xvfb-run Xvfb 2>/dev/null || echo "some tools missing"
