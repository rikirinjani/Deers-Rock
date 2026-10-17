echo "=== drift demo state.json (batch keys + visit set) ==="
python3 -m json.tool /opt/dr-benchmark/results/r5p5_drift/B3_oracle_run_r5/.state.json 2>/dev/null | grep -E "\"[0-9]{4}-[0-9]{2}-[0-9]{2}|null|visits|status" | head -20
echo ""
echo "=== drift demo tool log (key lines) ==="
grep -aE "ALIGNED|verify-frozen|stage|date |FAILED|BILLED|FINAL|ORACLE_|EXIT|REPAIR|ALLOW" /opt/dr-benchmark/results/r5p5_drift/sampled_real_form_diff_r5.log 2>/dev/null | tr -d "\r"
echo ""
echo "=== strata demo tool log (key lines) ==="
grep -aE "ALIGNED|verify-frozen|stage|date |FAILED|BILLED|FINAL|ORACLE_|EXIT|REPAIR|ALLOW" /opt/dr-benchmark/results/r5p5_strata/sampled_real_form_diff_r5.log 2>/dev/null | tr -d "\r"
echo ""
echo "=== strata harness logs ==="
ls /opt/dr-benchmark/results/r5p5_strata/B3_oracle_run_r5/ 2>/dev/null
