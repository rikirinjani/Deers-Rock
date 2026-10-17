set -e
cd /opt/dr-benchmark
# enable general_log on the clone so we can see whether the form issued any billing INSERT
mysql -uroot -e "SET GLOBAL general_log=ON; SET GLOBAL log_output='TABLE';"
V="2026/10/01/800190"
mysql -uroot sik_r5 -e "DELETE FROM billing WHERE no_rawat='$V'; UPDATE reg_periksa SET status_bayar='Belum Bayar' WHERE no_rawat='$V';"
DTE="${V%/*}"
# truncate general log of the clone
mysql -uroot -e "TRUNCATE mysql.general_log;"
cd /opt/simrs-khanza/run-env
DISPLAY=:99 faketime "$DTE 08:00:00" timeout 90 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" > /tmp/r5h_full.log 2>&1 || true
echo "=== full harness log ==="
cat /tmp/r5h_full.log
echo "=== clone general_log: any billing/INSERT/UPDATE by the form? ==="
mysql -uroot -N -e "SELECT arg FROM mysql.general_log WHERE arg LIKE '%billing%' AND arg LIKE '%800190%' LIMIT 10;" 2>/dev/null
mysql -uroot -N -e "SELECT arg FROM mysql.general_log WHERE arg LIKE 'INSERT INTO %' AND arg LIKE '%billing%' LIMIT 5;" 2>/dev/null
echo "POST: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik_r5.billing WHERE no_rawat='$V';")"
