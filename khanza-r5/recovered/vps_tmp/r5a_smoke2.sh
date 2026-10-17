cd /opt/dr-benchmark
echo "=== 3-visit smoke run log (tail) ==="
tail -20 /tmp/r5a_smoke_run.log 2>/dev/null
echo "=== harness lines: the decisive sukses/akunrows ==="
grep -rE "sukses|akunrows|payment|DONE" /opt/dr-benchmark/results/r5a_smoke/B3_oracle_run_r5/harness_*.log 2>/dev/null | head -12
echo "=== billing rows on clone for the 3 after run ==="
for v in 2026/10/01/800190 2026/10/01/800073 2026/10/01/800085; do
  echo "  $v: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing WHERE no_rawat='$v';")"
done
echo "=== FINAL tally ==="
grep -E "FINAL|ORACLE_DRIFT" /tmp/r5a_smoke_run.log 2>/dev/null
