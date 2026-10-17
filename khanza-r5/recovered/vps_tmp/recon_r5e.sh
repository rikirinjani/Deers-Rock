set -e
echo "=== database.ini structure (masked) ==="
sed -E "s/=( *).*=;/= <redacted>;/; s/=( *).*/= <redacted>/" /opt/simrs-khanza/setting/database.ini
echo "=== xml structure (masked, keys only) ==="
grep -oE "<[A-Za-z_]+[^>]*>" /opt/simrs-khanza/setting/database.xml | head -20
echo "=== which file does the jar read? ==="
cd /opt/simrs-khanza
for f in $(command -v unzip || true); do :; done
grep -c "database.ini" dist/SIMRSKhanza.jar 2>/dev/null || true
strings dist/SIMRSKhanza.jar 2>/dev/null | grep -E "database\.(ini|xml)" | sort -u | head
echo "=== benchmark user grants ==="
MYSQL_PWD=$(cat /opt/simrs-khanza/run-env/benchmark_pw) mysql -ubenchmark -N -e "SELECT user,host FROM information_schema.user_privileges WHERE grantee LIKE 'benchmark%'; SHOW DATABASES;" 2>&1 | head -20
