#!/usr/bin/env bash
set -uo pipefail
RES=/opt/dr-benchmark/results/Bseries_20261012T045027Z
echo "=== consumer_B3.log OK lines ==="
grep -E "^OK|Processed|v3" "$RES/consumer_B3.log" | head
echo
echo "=== B3 generation log: days/start/generated ==="
grep -iE "days|start|generat|seed|encounter|wrote|written" "$RES/B3.log" 2>/dev/null | head -10
echo
echo "=== 354 reconciled: Stage A G2 seed vs B3 cohort ==="
echo "run_all.sh G2 text:"
grep -nE "354" /opt/dr-benchmark/run_all.sh | head -5
echo
echo "load_354_dr_visits.py header (what it loads):"
head -20 /opt/Deers-Rock/tools/load_354_dr_visits.py 2>/dev/null
echo
echo "=== B3 encounter file: line count + date range ==="
ls "$RES" | grep -iE "enc|stageB_B3|B3_" | head
for f in "$RES"/stageB_B3*.txt "$RES"/B3_encounters*.txt; do [ -f "$f" ] && echo "-- $f" && wc -l "$f" && head -2 "$f" && tail -2 "$f"; done
echo
echo "=== 34.73B / 34.87B origins ==="
grep -nE "34,?7[0-9]{2}|34\.7[0-9]|34,?8[0-9]{2}|34\.8[0-9]" "$RES/BENCHMARK_REPORT.md" | head -8
echo "--- p2_report.md total ---"
grep -nE "34\.8|total|Rp" /opt/dr-benchmark/p-chain/p2_report.md 2>/dev/null | head -8
echo
echo "=== B3 consumer total vs B2 consumer total ==="
grep -oE "total Rp [0-9,]+" "$RES/consumer_B3.log" | tail -1
grep -oE "total Rp [0-9,]+" "$RES/consumer_B2.log" | tail -1
