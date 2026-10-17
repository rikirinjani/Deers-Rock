set -e
cd /opt/simrs-khanza/run-env/harness
javac -cp ".:shim:../../dist/SIMRSKhanza.jar:../../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar" BilingHarness.java 2>&1
echo "compile rc=$?"
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
V="2026/10/01/800190"
mysql -uroot sik_r5 -e "DELETE FROM billing WHERE no_rawat='$V'; UPDATE reg_periksa SET status_bayar='Belum Bayar' WHERE no_rawat='$V';"
DTE="${V%/*}"
cd /opt/simrs-khanza/run-env
DISPLAY=:99 faketime "$DTE 08:00:00" timeout 90 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" 2>&1 | grep -E "VISIT|sukses|reaper|KONFIRMASI|click|payment|DONE"
cd /opt/dr-benchmark
echo "POST: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik_r5.billing WHERE no_rawat='$V';")"
