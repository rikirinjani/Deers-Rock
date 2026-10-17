set -e
cd /tmp
# the 225MB data dump was complete (the earlier run's load just didn't finish in view)
echo "data dump bytes: $(wc -c < /tmp/sik_p6_data.sql)"
echo "schema dump bytes: $(wc -c < /tmp/sik_p6_schema.sql 2>/dev/null || echo 0)"
if [ ! -s /tmp/sik_p6_schema.sql ]; then
  mysqldump -uroot -no-data sik > /tmp/sik_p6_schema.sql 2>/dev/null
fi
echo "re-dumped schema bytes: $(wc -c < /tmp/sik_p6_schema.sql)"
# clean rebuild
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p6; CREATE DATABASE sik_p6;"
mysql -uroot sik_p6 < /tmp/sik_p6_schema.sql
echo "schema load rc: $?"
mysql -uroot sik_p6 < /tmp/sik_p6_data.sql
echo "data load rc: $?"
for t in reg_periksa billing detail_pemberian_obat databarang rawat_jl_dr pasien; do
  echo "$t: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.$t;" 2>&1)"
done
