#!/bin/bash
H=/opt/dr-benchmark/results/test/g1_attempt1/harness_2026-10-03.log
echo "=== harness 2026-10-03 (full) ==="
cat "$H"
echo
echo "=== gl: lines containing 'billing' (first 10) ==="
grep -n 'billing' /opt/dr-benchmark/results/test/g1_attempt1/gl/general_log_G1.2026-10-03 | head -10
echo "=== gl: raw first insert-ish line ==="
grep -n 'insert' /opt/dr-benchmark/results/test/g1_attempt1/gl/general_log_G1.2026-10-03 | head -6
echo "=== nota rows for 2026-10-03 sample visit now ==="
mysql -uroot -e "SELECT * FROM sik.nota_jalan WHERE no_rawat='2026/10/03/000303'"
echo "=== billing rows for that visit ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.billing WHERE no_rawat='2026/10/03/000303'"
echo "=== detail_nota_jalan rows now ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik.detail_nota_jalan WHERE no_rawat='2026/10/03/000303'"
