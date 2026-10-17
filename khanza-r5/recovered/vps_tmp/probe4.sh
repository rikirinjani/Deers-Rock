#!/bin/bash
echo "=== g1_attempt1 dir ==="
ls -la /opt/dr-benchmark/results/g1test/g1_attempt1/ 2>/dev/null | head -40
echo "=== gl dir ==="
ls -la /opt/dr-benchmark/results/g1test/g1_attempt1/gl/ 2>/dev/null | head -40
echo "=== sukses per harness log ==="
for f in /opt/dr-benchmark/results/g1test/g1_attempt1/harness_*.log; do
  n=$(basename "$f")
  s=$(grep -c "sukses=true" "$f" 2>/dev/null)
  f2=$(grep -c "sukses=false" "$f" 2>/dev/null)
  tot=$(grep -c "DONE sukses=" "$f" 2>/dev/null)
  echo "$n true=$s false=$f2 total_visits=$tot"
done
echo "=== one failing harness log (grep sukses=false context) ==="
for f in /opt/dr-benchmark/results/g1test/g1_attempt1/harness_*.log; do
  if grep -q "sukses=false" "$f" 2>/dev/null; then
    echo "--- $f ---"
    grep -n -B2 -A2 "sukses=false" "$f" | head -30
    break
  fi
done
