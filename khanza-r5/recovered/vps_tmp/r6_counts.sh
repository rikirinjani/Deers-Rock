echo "=== final counts ==="
for t in reg_periksa billing detail_pemberian_obat rawat_jl_dr databarang pasien nota_jalan piutang_pasien; do
  printf "%s: " "$t"
  mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.$t;" 2>&1 | head -1
done
echo "=== check mysql load still running ==="
pgrep -af "mysql -uroot sik_p6" 2>/dev/null
echo "=== verify all 17 tables exist ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema="sik_p6";" 2>/dev/null
