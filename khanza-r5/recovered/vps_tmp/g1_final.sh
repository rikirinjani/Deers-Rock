#!/bin/bash
set +e
R=/opt/dr-benchmark/results/20261011T173055Z/g1_validation.md
echo "=== per-visit OK/FAIL count (last col) ==="
grep -E '^[0-9]{4}/10/[0-9]+ \|' "$R" 2>/dev/null | awk -F'|' '{print $(NF)}' | tr -d ' ' | sort | uniq -c
echo
echo "=== per-visit sukses True/False count ==="
grep -E '^[0-9]{4}/10/[0-9]+ \|' "$R" 2>/dev/null | grep -oE 'True|False' | sort | uniq -c
echo
echo "=== VERDICT line ==="
grep 'VERDICT' "$R" 2>/dev/null
echo
echo "=== trace file location ==="
find /opt /root -name 'phase3-g1-tool*' 2>/dev/null | head -3
echo
echo "=== orchestrator parked ==="
cat /opt/dr-benchmark/state/state.json 2>/dev/null | grep -E '"phase"|last_error|percent'
