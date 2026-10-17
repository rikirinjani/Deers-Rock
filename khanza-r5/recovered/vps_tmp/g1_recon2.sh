#!/bin/bash
set -e
echo "=== consumer DB (database.ini) ==="
grep -iE 'user|database|host|port' /opt/simrs-khanza/setting/database.ini 2>/dev/null | head
echo "=== sik (prod) billing + reg_DR counts ==="
mysql -uroot sik -N -e "SELECT 'billing', COUNT(*) FROM sik.billing" 2>/dev/null
mysql -uroot sik -N -e "SELECT 'reg_DR', COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
echo "=== how smoke harness was invoked (DECISIONS.md) ==="
grep -niE 'BilingHarness|Xvfb|faketime|java .*-cp|harness' /opt/dr-benchmark/DECISIONS.md 2>/dev/null | head -12
echo "=== run-env contents ==="
ls /opt/simrs-khanza/run-env/ 2>/dev/null
echo "=== harness dir ==="
ls /opt/simrs-khanza/run-env/harness/ 2>/dev/null
echo "=== smoke harness log (how it ran) ==="
head -20 /opt/dr-benchmark/results/*/smoke_harness.log 2>/dev/null | head -25
