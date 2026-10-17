set -e
echo "=== form-save tables present on sik_p2, with column names ==="
for T in nota_jalan detail_nota_jalan piutang_pasien detail_piutang_pasien; do
  cols=$(mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.columns WHERE table_schema='sik_p2' AND table_name='$T';")
  cnt=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.$T;" 2>/dev/null)
  echo "$T rows=$cnt cols: $cols"
done
echo "=== does the fixture have ANY form save for the 2026-10 DR cohort? (nota_jalan / piutang) ==="
mysql -uroot -N -e "SELECT 'nota', COUNT(*) FROM sik_p2.nota_jalan WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis IS NULL;" 2>/dev/null
mysql -uroot -N -e "SELECT COUNT(DISTINCT nj.no_rawat) FROM sik_p2.nota_jalan nj JOIN sik_p2.reg_periksa rp ON rp.no_rawat=nj.no_rawat WHERE rp.no_rawat LIKE '2026/10/%' AND rp.no_rkm_medis LIKE 'DR%';"
