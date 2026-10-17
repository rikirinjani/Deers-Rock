echo "=== r5p5_strata dir contents ==="
find /opt/dr-benchmark/results/r5p5_strata -maxdepth 3 2>/dev/null
echo ""
echo "=== strata log first 12 lines ==="
head -12 /opt/dr-benchmark/results/r5p5_strata/B3_oracle_run_r5/sampled_real_form_diff_r5.log 2>/dev/null
