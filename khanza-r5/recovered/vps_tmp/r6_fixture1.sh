set -e
cd /tmp
echo "=== build sik_p6 from live sik (targeted dump: source tables + 12 output tables + needed masters) ==="
TABS="reg_periksa detail_pemberian_obat rawat_jl_dr databarang pasien billing nota_jalan detail_nota_jalan piutang_pasien detail_piutang_pasien tambahan_biaya pengurangan_biaya tagihan_sadewa tagihan_mandiri tagihan_bpd_jateng tagihan_bpd_papua tagihan_bpd_jabar"
mysqldump -uroot --no-create-info --skip-extended-insert --complete-insert --add-drop-table=false \
  $(for t in $TABS; do echo -n "sik.$t "; done) > /tmp/sik_p6_data.sql 2>/tmp/sik_p6_dump.err || true
echo "dump bytes: $(wc -c < /tmp/sik_p6_data.sql)"; echo "dump errors: $(cat /tmp/sik_p6_dump.err | head -3)"
echo ""
echo "=== create sik_p6 with schema, then load data ==="
mysqldump -uroot -no-data sik > /tmp/sik_p6_schema.sql 2>/dev/null
mysql -uroot -e "DROP DATABASE IF EXISTS sik_p6; CREATE DATABASE sik_p6;"
mysql -uroot sik_p6 < /tmp/sik_p6_schema.sql
echo "schema rc: $?"
mysql -uroot sik_p6 < /tmp/sik_p6_data.sql
echo "data rc: $?"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa;"
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.billing;"
