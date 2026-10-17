echo "=== all r5p5 run dirs + their contents ==="
for d in /opt/dr-benchmark/results/r5p5_strata /opt/dr-benchmark/results/r5p5_drift /opt/dr-benchmark/results/r5p5_clean /opt/dr-benchmark/results/r5p5_gate2 /opt/dr-benchmark/results/r5p5_gate3 /opt/dr-benchmark/results/r5p5_gate4; do
  echo "--- $d ---"
  find "$d" -maxdepth 2 -type f 2>/dev/null | head -20
  echo ""
done
echo "=== harness database.ini history / current ==="
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
