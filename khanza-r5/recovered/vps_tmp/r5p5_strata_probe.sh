echo "=== STRATA demo: did the 5 STRATA- visits exist in reg_periksa? ==="
echo "(this determines whether tgl was None or a real date)"
for n in STRATA-EMBALASE STRATA-TUSLAH STRATA-HALFPPN STRATA-ZEROFEE STRATA-GT3PROC; do
  c=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat='"'"'$n'"'"';")
  t=$(mysql -uroot -N -e "SELECT tgl_registrasi FROM sik.reg_periksa WHERE no_rawat='"'"'$n'"'"' LIMIT 1;")
  echo "$n reg_count=$c tgl=$t"
done
echo ""
echo "=== harness log for the strata run (what date did faketime use?) ==="
ls /opt/dr-benchmark/results/r5p5_strata/B3_oracle_run_r5/harness_*.log 2>/dev/null
