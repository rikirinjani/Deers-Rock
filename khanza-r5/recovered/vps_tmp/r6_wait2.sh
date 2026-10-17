i=0
while pgrep -f "mysql -uroot sik_p6 <" >/dev/null 2>&1 || pgrep -f "sik_p6_data" >/dev/null 2>&1; do
  i=$((i+1))
  echo "still loading, check #$i (count billing: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.billing;" 2>/dev/null))"
  [ $i -ge 40 ] && { echo "aborting wait"; break; }
  sleep 60
done
echo "=== final counts ==="
for t in reg_periksa billing detail_pemberian_obat rawat_jl_dr databarang pasien nota_jalan piutang_pasien; do
  echo "$t: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.$t;" 2>&1 | head -1)"
done
