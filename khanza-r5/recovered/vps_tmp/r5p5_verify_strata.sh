echo "=== STRATA demo: did the 5 STRATA- no_rawat exist in reg_periksa? ==="
echo "(if NOT, tgl=None -> by_date[None] -> dates=[None] -> d.replace() crashes)"
for n in STRATA-EMBALASE STRATA-TUSLAH STRATA-HALFPPN STRATA-ZEROFEE STRATA-GT3PROC; do
  c=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat='$n';" 2>/dev/null)
  echo "$n reg_count=$c"
done
echo ""
echo "=== actual strata tool log (full) ==="
cat /opt/dr-benchmark/results/r5p5_strata/sampled_real_form_diff_r5.log 2>/dev/null | tr -d "\r" | head -40
echo ""
echo "=== actual strata CSV + MD ==="
cat /opt/dr-benchmark/results/r5p5_strata/B3_sampled_form_diff_r5.csv 2>/dev/null | tr -d "\r"
echo "---MD---"
cat /opt/dr-benchmark/results/r5p5_strata/B3_sampled_form_diff_r5.md 2>/dev/null | tr -d "\r"
echo ""
echo "=== state.json strata ==="
cat /opt/dr-benchmark/results/r5p5_strata/B3_oracle_run_r5/.state.json 2>/dev/null | tr -d "\r"
