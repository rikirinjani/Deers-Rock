set -e
echo "=== harness DB target ==="
grep -n "DriverManager\|jdbc\|getProperty\|System.getenv\|URL\|password\|user" /opt/simrs-khanza/run-env/harness/BilingHarness.java | head -30
echo "=== simrs-khanza config files ==="
ls /opt/simrs-khanza/run-env/
find /opt/simrs-khanza -maxdepth 2 -name "*.properties" 2>/dev/null | head
echo "=== jar DB hardcoding check (classes reading props) ==="
ls /opt/simrs-khanza/dist/ 2>/dev/null
echo "=== disk + dump size estimate ==="
df -h /opt | tail -1
du -sh /var/lib/mysql/sik 2>/dev/null | tail -1
mysql --defaults-file=/root/.mybench.cnf -N -e "SELECT @@innodb_buffer_pool_size/1024/1024; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik';" 2>/dev/null || echo "no defaults file; will rely on benchmark pw path"
