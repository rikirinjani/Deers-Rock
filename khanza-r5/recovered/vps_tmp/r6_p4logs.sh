echo "=== verify P4 STRATA- evidence claims ==="
echo "--- P4 b3 harness log ---"
cat /opt/dr-benchmark/results/r5p4_b3/B3_oracle_run_r5/harness_2026_10_01.log 2>/dev/null | tr -d "\r"
echo ""
echo "--- P4 b3 rebill logs (which ones succeeded?) ---"
for l in /opt/dr-benchmark/results/r5p4_b3/B3_oracle_run_r5/rebill_*.log; do
  echo "## $l"
  cat "$l" 2>/dev/null | head -5
done
