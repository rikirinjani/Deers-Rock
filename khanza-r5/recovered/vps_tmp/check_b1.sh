#!/bin/bash
echo "=== B1.log ==="
cat /opt/dr-benchmark/results/Bseries_20261012T041218Z/B1.log 2>/dev/null
echo
echo "=== console around failure ==="
grep -A5 -B5 "stageB_B1\|GATE FAIL\|B1" /opt/dr-benchmark/run_console.log 2>/dev/null | tail -30
echo
echo "=== sik.billing count ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2026/%'" 2>/dev/null
echo
echo "=== results dir ==="
ls -la /opt/dr-benchmark/results/Bseries_20261012T041218Z/ 2>/dev/null
