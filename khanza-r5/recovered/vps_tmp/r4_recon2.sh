#!/bin/bash
# R4 recon2: formats + gate source + tool args
R=/opt/dr-benchmark/results/Bseries_20261012T045027Z
P=/opt/dr-benchmark/p-chain
echo "=== A3 FULL ==="
f=$(ls -1 $P/a3_fullwindow_monthly_*.md 2>/dev/null | head -1); [ -n "$f" ] && cat "$f"
echo "=== CSV HEADERS + LINE COUNTS ==="
for s in B1 B2 B3; do echo "-- $s"; head -3 $R/${s}_sampled_form_diff.csv; wc -l $R/${s}_sampled_form_diff.csv; done
echo "=== CONSUMER OK LINE FORMAT ==="
grep -m 3 "^OK\|OK " $R/consumer_B3.log | head -3
grep -m 2 "OK" $R/consumer_B1.log | head -2
echo "=== CSV COL COUNT ==="
awk -F, 'NR==1{print NF}' $R/B3_sampled_form_diff.csv
echo "=== check_billed_eq_dr SOURCE ==="
sed -n '241,320p' /opt/dr-benchmark/run_all.sh
echo "=== charge_delta UNEXPLAINED + A1 HOOKS ==="
grep -n "UNEXPLAINED\|dr_tariff\|ralan" /opt/Deers-Rock/tools/charge_delta_per_component.py | head -40
echo "=== charge_delta main flow ==="
sed -n '1,60p' /opt/Deers-Rock/tools/charge_delta_per_component.py
echo "=== sampled_diff ARGS ==="
grep -n "add_argument" /opt/Deers-Rock/tools/sampled_real_form_diff.py
echo "=== R2_2 CORRECTED QUERY ==="
f=$(ls -1 $P/r2_2_corrected.md 2>/dev/null | head -1); [ -n "$f" ] && cat "$f"
echo "=== DISK ==="
df -h / /var 2>/dev/null | head -6
echo "=== .sampled_diff_state ==="
cat $R/.sampled_diff_state 2>/dev/null | head -20
