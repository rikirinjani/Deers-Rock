set -e
cd /tmp
TABS="reg_periksa detail_pemberian_obat rawat_jl_dr databarang pasien billing nota_jalan detail_nota_jalan piutang_pasien detail_piutang_pasien tambahan_biaya pengurangan_biaya tagihan_sadewa tagihan_mandiri tagihan_bpd_jateng tagihan_bpd_papua tagihan_bpd_jabar"
echo "=== dump data (USE sik first) ==="
mysqldump -uroot --no-create-info --skip-extended-insert sik $TABS > /tmp/sik_p6_data.sql 2>/tmp/sik_p6_dump.err
echo "dump bytes: $(wc -c < /tmp/sik_p6_data.sql)"
head -3 /tmp/sik_p6_dump.err 2>/dev/null || true
echo ""
echo "=== create sik_p6 schema (all tables, no data), load the 17 table data ==="
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p6; CREATE DATABASE sik_p6;"
mysqldump -uroot -no-data sik > /tmp/sik_p6_schema.sql 2>/dev/null
echo "schema bytes: $(wc -c < /tmp/sik_p6_schema.sql)"
mysql -uroot sik_p6 < /tmp/sik_p6_schema.sql
echo "schema load rc: $?"
mysql -uroot sik_p6 < /tmp/sik_p6_data.sql
echo "data load rc: $?"
echo ""
echo "=== verify ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa;"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.billing;"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.detail_pemberian_obat;"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.databarang;"
