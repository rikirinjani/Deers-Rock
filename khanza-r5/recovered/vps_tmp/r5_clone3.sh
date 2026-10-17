set -e
echo "=== root: create + clone sik_r5 (no grant needed; tool will use root) ==="
mysql -uroot -N -e "DROP DATABASE IF EXISTS sik_r5; CREATE DATABASE sik_r5;"
echo "created sik_r5"
t0=$(date +%s)
mysql -uroot sik > /tmp/sik_r5_dump.sql
echo "dump $(($(date +%s)-t0))s size=$(stat -c%s /tmp/sik_r5_dump.sql)"
t1=$(date +%s)
mysql -uroot sik_r5 < /tmp/sik_r5_dump.sql
echo "restore $(($(date +%s)-t1))s"
rm -f /tmp/sik_r5_dump.sql
echo "=== verify as root ==="
mysql -uroot -N -e "SELECT '"'"'sik_r5.billing'"'"', COUNT(*) FROM sik_r5.billing; SELECT '"'"'sik.billing'"'"', COUNT(*) FROM sik.billing; SELECT '"'"'sik_r5.reg'"'"', COUNT(*) FROM sik_r5.reg_periksa; SELECT '"'"'sik.reg'"'"', COUNT(*) FROM sik.reg_periksa;"
echo "=== live sik pre-fingerprint ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing;"
