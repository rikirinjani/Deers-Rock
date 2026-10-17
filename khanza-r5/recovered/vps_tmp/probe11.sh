#!/bin/bash
echo "=== tool process running? ==="
pgrep -af "oracle_diff" | head -5
echo "=== java/Xvfb processes ==="
pgrep -a java | head -5
pgrep -a Xvfb | head -5
echo "=== general_log state ==="
mysql -uroot -N -e "SELECT @@general_log, @@general_log_file"
echo "=== g1_oracle.log tail ==="
tail -12 /opt/dr-benchmark/results/test/g1_oracle.log 2>/dev/null
echo "=== attempt dir ==="
ls -la /opt/dr-benchmark/results/test/g1_attempt1/ 2>/dev/null | head -20
echo "=== harness logs count ==="
ls /opt/dr-benchmark/results/test/g1_attempt1/harness_*.log 2>/dev/null | wc -l
ls /opt/dr-benchmark/results/test/g1_attempt1/gl/ 2>/dev/null | tail -5
echo "=== faketime procs ==="
pgrep -af faketime | head -3
