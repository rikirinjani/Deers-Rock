set -e
cd /opt/dr-benchmark
# re-clone sik_r5 from live sik (mysqldump has root access)
echo "re-creating sik_r5 ..."
mysql -uroot -e "DROP DATABASE IF EXISTS sik_r5; CREATE DATABASE sik_r5;"
echo "dumping (root, ~180MB)..."
t0=$(date +%s)
mysqldump -uroot sik > /tmp/sik_r5_dump.sql 2>/tmp/sik_r5_dump.err
echo "dump rc=$? $(($(date +%s)-t0))s size=$(stat -c%s /tmp/sik_r5_dump.sql)"
t1=$(date +%s)
mysql -uroot sik_r5 < /tmp/sik_r5_dump.sql 2>/tmp/sik_r5_restore.err
echo "restore rc=$? $(($(date +%s)-t1))s"
rm -f /tmp/sik_r5_dump.sql /tmp/sik_r5_dump.err /tmp/sik_r5_restore.err
echo "=== verify clone has akun_bayar + a fresh never-billed generated visit ==="
mysql -uroot -N -e "SELECT \"r5 akun_bayar\", COUNT(*) FROM sik_r5.akun_bayar; SELECT \"r5 billing rows\", COUNT(*) FROM sik_r5.billing; SELECT \"r5 fresh never-billed DR visits\", COUNT(*) FROM sik_r5.reg_periksa rp LEFT JOIN sik_r5.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE \"____/__/__/8_____\" AND rp.no_rkm_medis LIKE \"DR%\" AND b.no_rawat IS NULL;"
mysql -uroot -N -e "SELECT rp.no_rawat FROM sik_r5.reg_periksa rp LEFT JOIN sik_r5.billing b ON b.no_rawat=rp.no_rawat WHERE rp.no_rawat LIKE \"____/__/__/8_____\" AND rp.no_rkm_medis LIKE \"DR%\" AND b.no_rawat IS NULL ORDER BY rp.no_rawat LIMIT 1;"
