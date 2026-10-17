V=2026/10/01/800085
for t in $(mysql -uroot -N -e "SELECT table_name FROM information_schema.columns WHERE table_schema='sik' AND column_name='no_rawat' ORDER BY table_name"); do
  n=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.\`$t\` WHERE no_rawat='$V'" 2>/dev/null)
  [ "${n:-0}" != "0" ] && echo "$t $n ai=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='sik' AND table_name='$t' AND extra LIKE '%auto_increment%'") pk=$(mysql -uroot -N -e "SELECT GROUP_CONCAT(column_name) FROM information_schema.key_column_usage WHERE table_schema='sik' AND table_name='$t' AND constraint_name='PRIMARY'")"
done
echo "tagihan_sadewa(no_nota): $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.tagihan_sadewa WHERE no_nota='$V'")"
mysql -uroot -N -e "SELECT no_rawat, kode_brng, jml, biaya_obat, embalase, tuslah, total, no_batch, no_faktur FROM sik.detail_pemberian_obat WHERE no_rawat='$V'" 2>&1 | head -3
