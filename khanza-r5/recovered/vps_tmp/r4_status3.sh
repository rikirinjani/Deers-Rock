#!/bin/bash
echo "--- r4 procs ---"
ps aux | grep -E 'r4_bat3|mysql -uroot' | grep -v grep | head -8
echo "--- processlist ---"
mysql -uroot -e "SHOW FULL PROCESSLIST" 2>/dev/null | head -12
echo "--- evidence tail ---"
tail -12 "$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)"
echo "--- billing count ---"
mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing"
echo "--- f7bak exists ---"
mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing_f7bak" 2>/dev/null || echo no_f7bak
