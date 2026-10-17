set +e
cd /tmp
mysqldump -uroot --no-data sik > /tmp/sik_p6_schema.sql 2>/tmp/schema_err.txt
echo "schema rc: $? bytes: $(wc -c < /tmp/sik_p6_schema.sql)"
echo "stderr:"; cat /tmp/schema_err.txt
echo "CREATE TABLE count: $(grep -c "CREATE TABLE" /tmp/sik_p6_schema.sql 2>/dev/null)"
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p6; CREATE DATABASE sik_p6;"
mysql -uroot sik_p6 < /tmp/sik_p6_schema.sql
echo "schema load rc: $?"
mysql -uroot sik_p6 < /tmp/sik_p6_data.sql
echo "data load rc: $?"
for t in reg_periksa billing detail_pemberian_obat databarang rawat_jl_dr pasien; do
  echo "$t: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.$t;" 2>&1)"
done
