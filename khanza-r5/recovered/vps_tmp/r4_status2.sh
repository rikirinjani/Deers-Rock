#!/bin/bash
echo "--- processlist ---"
mysql -uroot -e "SHOW FULL PROCESSLIST" 2>/dev/null | head -25
echo "--- r4 procs ---"
ps -o pid,etime,cmd -p 228539 2>/dev/null
ps aux | grep 'mysql -uroot' | grep -v grep | head -5
echo "--- bat1 evidence tail ---"
tail -8 /opt/dr-benchmark/p-chain/a2b_battery_run_20261013T075256Z.md
echo "--- f1 logs ---"
ls -la /tmp/r4_bat_logs/ 2>/dev/null
tail -6 /tmp/r4_bat_logs/f1_detect.log 2>/dev/null
