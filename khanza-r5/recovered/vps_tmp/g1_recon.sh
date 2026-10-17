#!/bin/bash
# Recon for building the G1 oracle-diff tool on the new VPS
set -e
echo "=== dbutil.CONSUMER_CP + helper functions ==="
grep -nE 'CONSUMER_CP|def run_consumer|def run_export|EXPORT_SH|ENCOUNTERS|KHANZA_DIR' /opt/Deers-Rock/tools/dbutil.py | head -20
echo
echo "=== BilingHarness location ==="
ls -la /opt/simrs-khanza/run-env/harness/BilingHarness.java 2>/dev/null
echo "=== harness classpath (how was it run before?) ==="
grep -rnE 'java .*BilingHarness|cp .*harness' /opt/dr-benchmark/results/*/smoke_harness.log /opt/dr-benchmark/DECISIONS.md 2>/dev/null | head -5
echo "=== dr_export.sh head ==="
head -25 /opt/simrs-khanza/consumer/dr_export.sh 2>/dev/null || echo "no dr_export.sh"
echo "=== encounters file ==="
ls -la /tmp/dr_encounters.txt 2>/dev/null || echo "no encounters file yet"
echo "=== sik_bench billing + reg counts ==="
mysql -uroot sik_bench -N -e "SELECT 'billing', COUNT(*) FROM sik_bench.billing" 2>/dev/null
mysql -uroot sik_bench -N -e "SELECT 'reg_DR', COUNT(*) FROM sik_bench.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
echo "=== java + xvfb + faketime present ==="
which java Xvfb faketime 2>/dev/null
echo "=== consumer file ==="
ls -la /opt/simrs-khanza/consumer/KhanzaBillingConsumer.java 2>/dev/null
