set -e
cd /opt/dr-benchmark
echo "=== verify fresh clone state ==="
mysql -uroot -N -e "SELECT \"r5 akun_bayar\", COUNT(*) FROM sik_r5.akun_bayar; SELECT \"r5 fresh never-billed DR visits\", COUNT(*) FROM sik_r5.reg_periksa rp LEFT JOIN sik_r5.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE \"____/__/__/8_____\" AND rp.no_rkm_medis LIKE \"DR%\" AND b.no_rawat IS NULL;"
FRESH=$(mysql -uroot -N -e "SELECT rp.no_rawat FROM sik_r5.reg_periksa rp LEFT JOIN sik_r5.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE \"____/__/__/8_____\" AND rp.no_rkm_medis LIKE \"DR%\" AND b.no_rawat IS NULL ORDER BY rp.no_rawat LIMIT 1;")
echo "FRESH visit: $FRESH"
echo "=== pre: sik_r5 billing rows for $FRESH (expect 0) ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$FRESH';"
echo "=== point harness at clone + run ONE raw-harness smoke ==="
sed -i "s/^database=.*/database=sik_r5/" /opt/simrs-khanza/setting/database.ini
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
cd /opt/simrs-khanza/run-env
DTE="${FRESH%/*}"
DISPLAY=:99 faketime "$DTE 08:00:00" timeout 240 java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" BilingHarness "$FRESH" 2>&1 | grep -E "VISIT|sukses|reaper|tbBilling|payment|login|DONE" | head -15
cd /opt/dr-benchmark
echo "=== post: sik_r5 billing rows for $FRESH ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik_r5.billing WHERE no_rawat='$FRESH';"
