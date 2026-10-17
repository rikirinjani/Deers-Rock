echo "=== is the data load still running? ==="
pgrep -af "mysql -uroot sik_p6" 2>/dev/null | head
echo ""
echo "=== current sik_p6 table counts ==="
for t in reg_periksa billing detail_pemberian_obat databarang rawat_jl_dr pasien nota_jalan piutang_pasien; do
  echo "$t: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.$t;" 2>&1)"
done
