#!/usr/bin/env bash
set -uo pipefail
cat /opt/dr-benchmark/p-chain/p5_validation.md
echo "=== consumer OK line ==="
grep -m1 "^OK: Processed" /opt/dr-benchmark/results/p5dx_B1/consumer_p5dx.log
echo
echo "=== safety ==="
systemctl is-active dr-bench 2>/dev/null || echo "dr-bench inactive"
systemctl is-active p-chain 2>/dev/null || echo "p-chain inactive"
pgrep -af "run_all|KhanzaBillingConsumer|pchain" || echo "no stray procs"
echo "--- canonical dir files modified today after 23:00 (expect none):"
find /opt/dr-benchmark/results/Bseries_20261012T045027Z -newermt "2026-10-12 23:00" -type f || echo "none (untouched)"
echo "--- buffer pool (P3 tune still in place):"
mysql -uroot -N -B -e "SELECT @@innodb_buffer_pool_size;"
