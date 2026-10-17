set -e
cd /opt/dr-benchmark
export DBUTIL_FORCE_ROOT=1
V="2026/10/01/800190"
echo "PRE (before reset): $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik_r5.billing WHERE no_rawat='$V';")"
# reset the visit to unbilled on the clone (the tool's stage-restore equivalent)
mysql -uroot sik_r5 -e "DELETE FROM billing WHERE no_rawat='$V'; UPDATE reg_periksa SET status_bayar='Belum Bayar' WHERE no_rawat='$V';"
echo "AFTER reset: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$V';")"
# harness already points at sik_r5
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
DTE="${V%/*}"
cd /opt/simrs-khanza/run-env
echo "=== bill the freshly-unbilled visit via the FIXED harness ==="
DISPLAY=:99 faketime "$DTE 08:00:00" timeout 120 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$V" 2>&1 | grep -E "VISIT|sukses|reaper|click|payment|DONE"
cd /opt/dr-benchmark
echo "POST: $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik_r5.billing WHERE no_rawat='$V';")"
echo "=== compare POST against the frozen consumer baseline (from r5_p1_demo if present, else recompute) ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing WHERE no_rawat='$V';"
