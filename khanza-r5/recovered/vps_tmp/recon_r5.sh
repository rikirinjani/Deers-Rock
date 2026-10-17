set -e
cd /opt/Deers-Rock/tools
echo "=== dbutil DB mechanism ==="
grep -n "def \|DB\b\|database\|dsn\|host" dbutil.py | head -40
echo "=== tool DB constant ==="
grep -n "^DB\b\|DR_DB\|DB =\|DB=" sampled_real_form_diff_r5.py 2>/dev/null; grep -n "^DB = " sampled_real_form_diff.py
echo "=== harness DB target mechanism ==="
ls /opt/Deers-Rock/khanza/run-env/ 2>/dev/null || ls /opt/dr-benchmark/khanza/run-env/ 2>/dev/null || true
find /opt -maxdepth 4 -name "*.properties" -path "*khanza*" 2>/dev/null | head
find /opt -maxdepth 4 -name "run-env" -type d 2>/dev/null | head
echo "=== disk + mysql ==="
df -h /opt | tail -1
mysql -uroot --password=''"$DBPW"'' -N -e "SELECT @@innodb_buffer_pool_size/1024/1024, @@long_query_time; SHOW DATABASES LIKE 'sik%';" 2>/dev/null || mysql --defaults-file=/root/.mybench.cnf -N -e "SELECT @@innodb_buffer_pool_size/1024/1024, @@long_query_time;" 2>/dev/null
du -sh /opt/Deers-Rock 2>/dev/null | tail -1
