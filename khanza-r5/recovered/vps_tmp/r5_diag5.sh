set -e
cd /opt/dr-benchmark
echo "=== full harness log for a BILLED date ==="
HL=results/r5_p1_demo/B3_oracle_run_r5/harness_2027_01_07.log
echo "--- $HL ---"
cat "$HL" 2>/dev/null | sed -n '30,90p'
echo "=== the Message dialog text (save-path detail) ==="
grep -A3 "Message\|Simpan\|sukses" "$HL" 2>/dev/null | head -30
echo "=== did the form write ANY billing rows on sik_r5? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat LIKE '____/__/__/8_____' AND no_rawat NOT IN (SELECT no_rawat FROM sik.billing);" 2>/dev/null
echo "=== compare: live sik has this visit, sik_r5 after demo ==="
for v in 2027/01/07/800216 2027/01/09/800040; do
  echo "visit $v :"
  echo "  sik_r5 rows=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$v';")"
  echo "  sik    rows=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.billing WHERE no_rawat='$v';")"
done
