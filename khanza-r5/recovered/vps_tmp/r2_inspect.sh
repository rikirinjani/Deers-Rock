#!/usr/bin/env bash
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
echo "=== restore long_query_time NOW ==="
mysql -uroot -e "SET GLOBAL long_query_time=10;"
mysql -uroot -N -B -e "SELECT @@long_query_time;"
echo
echo "=== wave2 log: inject + phase rcs ==="
grep -E "PRE-INJECT|POST-INJECT|injected|STATE|gate .*rc=|phase" $OUT/r2_wave2.log
echo
echo "=== three_count under injection ==="
grep -E "GAP|Count |FAIL|no gaps" $OUT/r2_gate_three_count.log | head -12
echo
echo "=== charge_delta under injection ==="
grep -E "unexplained|UNEXPLAINED|FAIL|overall delta" $OUT/r2_gate_charge_delta.log | head -10
echo
echo "=== billed_eq_1 (expect PASS) ==="
cat $OUT/r2_gate_billed_eq_1.log
echo "=== billed_eq_2 (expected FAIL w/ UNBILLED-2026/10) ==="
cat $OUT/r2_gate_billed_eq_2.log
echo "=== post-cleanup gates ==="
grep -E "no gaps|PASS|unexplained-delta count" $OUT/r2_gate_three_count_post.log $OUT/r2_gate_charge_delta_post.log $OUT/r2_gate_billed_eq_post.log | head -8
echo
echo "=== 899002 present during inject? ==="
grep -n "899002" $OUT/r2_wave2.log | head -5
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat IN ('2026/10/05/899001','2026/10/05/899002');"
echo "=== p2_gate_extract.sh gate body ==="
sed -n '1,30p' $OUT/p2_gate_extract.sh
