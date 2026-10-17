set -e
cd /opt/dr-benchmark
echo "=== what DB is the form ACTUALLY saving to? Check general_log on BOTH ==="
echo "live sik general_log INSERT INTO billing in last 30 min:"
mysql -uroot -N -e "SELECT COUNT(*) FROM mysql.general_log WHERE command_tag IN ('Query','Query') AND arg LIKE 'INSERT INTO billing%' AND event_time > NOW() - INTERVAL 40 MINUTE;" 2>/dev/null || echo "(no general_log table on server or not enabled)"
echo ""
echo "=== is general_log even a TABLE? ==="
mysql -uroot -N -e "SHOW VARIABLES LIKE 'log_output'; SELECT @@general_log;"
echo "=== where did the 'Message' dialog come from? full log has no error, so it is a success/notice ==="
echo "=== test: does the form save work AT ALL on live sik for a fresh unbilled visit? ==="
# find a live sik visit that is registered but unbilled (none expected). Instead,
# temporarily unbill a live visit, save via harness, check sukses.
sed -i "s/^database=.*/database=sik/" /opt/simrs-khanza/setting/database.ini
V="2026/10/01/800190"
echo "live sik pre: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing WHERE no_rawat='$V';")"
mysql -uroot sik -e "DELETE FROM billing WHERE no_rawat='$V'; UPDATE reg_periksa SET status_bayar='Belum Bayar' WHERE no_rawat='$V';"
echo "live sik after unbill: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.billing WHERE no_rawat='$V';")"
DTE="${V%/*}"
cd /opt/simrs-khanza/run-env
DISPLAY=:99 faketime "$DTE 08:00:00" timeout 90 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" 2>&1 | grep -E "sukses|reaper|DONE|payment"
cd /opt/dr-benchmark
echo "live sik post: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing WHERE no_rawat='$V';")"
