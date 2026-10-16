cd /opt/dr-benchmark
echo "=== clone run1+resume: rebill (consumer repair) lines ? proof form save FAILED on clone ==="
grep -E "REBILL|CRITICAL" /tmp/r5_run1.log /tmp/r5_resume_final.log 2>/dev/null | head -20
echo "=== count of rebill files written on the clone (one per form-failed visit) ==="
ls /opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/rebill_*.txt 2>/dev/null | wc -l
echo "=== sukses_true tally across all clone harness logs ==="
grep -h "sukses_true=" /opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/harness_*.log 2>/dev/null | sort | uniq -c | head
echo "=== one clone harness log: save-detail ==="
HL=$(ls /opt/dr-benchmark/results/r5_p1_demo/B3_oracle_run_r5/harness_2027_01_07.log 2>/dev/null)
sed -n "/VISIT/,\$p" "$HL" 2>/dev/null | head -20
