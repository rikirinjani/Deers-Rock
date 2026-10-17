#!/bin/bash
set -e
echo "=== The exact smoke harness invocation that WORKED (from run_all.sh) ==="
grep -nA8 -iE 'smoke|BilingHarness|Xvfb|faketime' /opt/dr-benchmark/run_all.sh 2>/dev/null | head -40
echo
echo "=== How BilingHarness is compiled + its classpath (run-env setup) ==="
grep -rniE 'javac|java -cp|harness' /opt/dr-benchmark/run_all.sh /opt/simrs-khanza/run-env/*.sh 2>/dev/null | head -20
echo "=== check if there's a run script for the harness ==="
ls /opt/simrs-khanza/run-env/ /opt/dr-benchmark/ 2>/dev/null
echo "=== billing table columns (for diff) ==="
mysql -uroot sik -N -B -e "SHOW COLUMNS FROM sik.billing" 2>/dev/null | head -30
echo "=== sample consumer billing rows for a DR visit ==="
mysql -uroot sik -N -B -e "SELECT * FROM sik.billing WHERE no_rawat LIKE '2026/10/%' LIMIT 5" 2>/dev/null | head -10
