#!/usr/bin/env bash
# glon.sh — point general_log at /tmp (AppArmor-safe) while B3 sampled diff runs.
set -euo pipefail
rm -f /tmp/general_log_B3.log
touch /tmp/general_log_B3.log
chown mysql:mysql /tmp/general_log_B3.log
mysql -uroot -e "SET GLOBAL general_log_file='/tmp/general_log_B3.log'; SET GLOBAL general_log=ON;"
echo "general_log ON -> /tmp/general_log_B3.log at $(date -u +%H:%M:%S)"
echo "--- sampled diff progress ---"
tail -4 /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3_oracle.log
